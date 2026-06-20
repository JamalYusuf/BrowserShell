import type { ExecutionContext } from '@/shared/types';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from './args';
import { isScriptError, resolvePageTab, runPageScript } from './page-utils';
import type { PageLink } from './page-scripts';
import { truncateTitle } from './text';

export type LinkAction = 'open' | 'new' | 'click' | 'copy' | 'show' | 'find';

export interface ParsedLinkArgs {
  tabArg?: string;
  action: LinkAction;
  index?: number;
  query?: string;
  newTab: boolean;
  markdown: boolean;
}

const LINK_ACTIONS = new Set<LinkAction>(['open', 'new', 'click', 'copy', 'show', 'find']);

function takeCrossWindowTabRef(parts: string[]): { tabArg?: string; parts: string[] } {
  const next = [...parts];
  if (next.length > 1 && /^\d+@\d+$/.test(next[next.length - 1]!)) {
    return { tabArg: next.pop(), parts: next };
  }
  return { parts: next };
}

export function parseLinkArgs(args: string[]): ParsedLinkArgs {
  const newTab = hasFlag(args, '-n') || hasFlag(args, '--new');
  const markdown = hasFlag(args, '--md') || hasFlag(args, '--markdown');
  let { tabArg, parts } = takeCrossWindowTabRef(filterFlags(args).filter((a) => !a.startsWith('--')));

  if (!parts.length) {
    return { action: 'open', newTab, markdown, tabArg };
  }

  const head = parts[0]!;

  if (LINK_ACTIONS.has(head as LinkAction)) {
    const action = head as LinkAction;
    const rest = parts.slice(1);

    if (action === 'find') {
      return { action, query: rest.join(' ').trim(), newTab, markdown, tabArg };
    }

    const num = rest[0];
    if (num && /^\d+$/.test(num)) {
      const index = Number(num);
      const trailing = rest[1];
      // link open 3 2 — link #3 on tab #2 (not link #32)
      if (trailing && /^\d+$/.test(trailing)) {
        tabArg = trailing;
      }
      return { action, index, newTab: newTab || action === 'new', markdown, tabArg };
    }

    return { action, newTab, markdown, tabArg };
  }

  if (/^\d+$/.test(head)) {
    const index = Number(head);
    const second = parts[1];
    if (second && LINK_ACTIONS.has(second as LinkAction) && second !== 'find') {
      const trailing = parts[2];
      if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
      return {
        action: second as LinkAction,
        index,
        newTab: newTab || second === 'new',
        markdown,
        tabArg,
      };
    }
    const trailing = parts[1];
    if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
    return { action: 'open', index, newTab, markdown, tabArg };
  }

  return { action: 'find', query: parts.join(' ').trim(), newTab, markdown, tabArg };
}

export async function fetchPageLinks(
  tabId: number,
  ctx: ExecutionContext,
  pattern: string,
  limit: number
): Promise<PageLink[] | { error: string }> {
  const result = await runPageScript(tabId, ctx, 'listPageLinks', pattern, limit);
  if (isScriptError(result)) return result;
  return result as PageLink[];
}

export async function resolveLinkAtIndex(
  ctx: ExecutionContext,
  tabId: number,
  index: number,
  pattern = ''
): Promise<{ link: PageLink } | { error: string }> {
  let list = !pattern ? ctx.getLastLinksResults?.() : undefined;
  if (!list?.length) {
    const fetched = await fetchPageLinks(tabId, ctx, pattern, 100);
    if (isScriptError(fetched)) return fetched;
    list = fetched;
    if (!pattern) ctx.setLastLinksResults?.(list);
  }

  if (!list.length) {
    return { error: pattern ? `No links matching "${pattern}".` : 'No links on page. Run links first.' };
  }

  const link = list[index - 1];
  if (!link) {
    return { error: `Link #${index} not found. List has ${list.length} link(s). Run links first.` };
  }

  return { link };
}

async function copyLinkText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    return { stdout: success(`Copied ${label}: ${truncateTitle(text)}`), exitCode: 0 };
  } catch {
    return { stderr: error('Clipboard access denied.'), exitCode: 1 };
  }
}

export async function runLinkAction(
  parsed: ParsedLinkArgs,
  ctx: ExecutionContext
): Promise<{ stdout?: string; stderr?: string; exitCode: number }> {
  const resolved = await resolvePageTab(parsed.tabArg ? [parsed.tabArg] : [], ctx);
  if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

  if (parsed.action === 'find') {
    if (!parsed.query) return { stderr: error('Usage: link find <text>'), exitCode: 2 };
    const result = await runPageScript(resolved.ref.id, ctx, 'clickTarget', parsed.query);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const click = result as { clicked: boolean; href?: string; match: string; tag: string };
    if (!click.clicked) {
      return {
        stderr: error(`No link matching "${parsed.query}". Try: links ${parsed.query.split(/\s+/)[0]}`),
        exitCode: 1,
      };
    }
    if (click.href) {
      if (parsed.newTab) {
        const winId = await ctx.getActiveWindowId?.();
        await ctx.chrome.tabs.create({ url: click.href, active: true, windowId: winId || undefined });
        return { stdout: success(`Opened new tab: "${click.match}"`), exitCode: 0 };
      }
      await ctx.chrome.tabs.update(resolved.ref.id, { url: click.href });
      return { stdout: success(`Opened link "${click.match}"`), exitCode: 0 };
    }
    return { stdout: success(`Clicked <${click.tag}> "${click.match}"`), exitCode: 0 };
  }

  if (parsed.index === undefined) {
    return { stderr: error('Usage: link <#> | link <open|new|click|copy|show> <#>'), exitCode: 2 };
  }

  const linkResult = await resolveLinkAtIndex(ctx, resolved.ref.id, parsed.index);
  if (isScriptError(linkResult)) return { stderr: error(linkResult.error), exitCode: 1 };
  const { link } = linkResult;

  switch (parsed.action) {
    case 'show':
      return {
        stdout: [`#${parsed.index}`, link.text, link.href].join('\n'),
        exitCode: 0,
      };

    case 'copy': {
      const text = parsed.markdown ? `[${link.text}](${link.href})` : link.href;
      return copyLinkText(text, parsed.markdown ? 'markdown link' : 'URL');
    }

    case 'click': {
      const result = await runPageScript(resolved.ref.id, ctx, 'clickLinkAtIndex', parsed.index, '');
      if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
      const click = result as { clicked: boolean; href?: string };
      if (!click.clicked) return { stderr: error(`Could not click link #${parsed.index}.`), exitCode: 1 };
      if (click.href && !click.href.startsWith('#')) {
        await ctx.chrome.tabs.update(resolved.ref.id, { url: click.href });
        return { stdout: success(`Opened #${parsed.index} "${link.text}"`), exitCode: 0 };
      }
      return { stdout: success(`Clicked #${parsed.index} "${link.text}"`), exitCode: 0 };
    }

    case 'new': {
      const winId = await ctx.getActiveWindowId?.();
      await ctx.chrome.tabs.create({ url: link.href, active: true, windowId: winId || undefined });
      return { stdout: success(`New tab #${parsed.index} "${link.text}"`), exitCode: 0 };
    }

    case 'open':
    default: {
      if (parsed.newTab) {
        const winId = await ctx.getActiveWindowId?.();
        await ctx.chrome.tabs.create({ url: link.href, active: true, windowId: winId || undefined });
        return { stdout: success(`New tab #${parsed.index} "${link.text}"`), exitCode: 0 };
      }
      await ctx.chrome.tabs.update(resolved.ref.id, { url: link.href });
      return { stdout: success(`Opened #${parsed.index} "${link.text}"`), exitCode: 0 };
    }
  }
}