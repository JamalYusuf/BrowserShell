import type { ExecutionContext } from '@/shared/types';
import { error, success } from '@/shell/output';
import { filterFlags } from './args';
import { focusOrOpenUrl } from './navigation';
import { isScriptError, resolvePageTab, runPageScript } from './page-utils';
import type { PageImage } from './page-scripts';
import { truncateTitle } from './text';

export type ImageAction = 'open' | 'copy' | 'show';

export interface ParsedImageArgs {
  tabArg?: string;
  action: ImageAction;
  index?: number;
}

const IMAGE_ACTIONS = new Set<ImageAction>(['open', 'copy', 'show']);

export function parseImageArgs(args: string[]): ParsedImageArgs {
  const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
  let tabArg: string | undefined;
  if (parts.length > 1 && /^\d+@\d+$/.test(parts[parts.length - 1]!)) {
    tabArg = parts.pop();
  }

  if (!parts.length) return { action: 'open', tabArg };

  const head = parts[0]!;
  if (IMAGE_ACTIONS.has(head as ImageAction)) {
    const action = head as ImageAction;
    const num = parts[1];
    if (num && /^\d+$/.test(num)) {
      const index = Number(num);
      const trailing = parts[2];
      if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
      return { action, index, tabArg };
    }
    return { action, tabArg };
  }

  if (/^\d+$/.test(head)) {
    const index = Number(head);
    const second = parts[1];
    if (second && IMAGE_ACTIONS.has(second as ImageAction)) {
      const trailing = parts[2];
      if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
      return { action: second as ImageAction, index, tabArg };
    }
    const trailing = parts[1];
    if (trailing && /^\d+$/.test(trailing)) tabArg = trailing;
    return { action: 'open', index, tabArg };
  }

  return { action: 'open', tabArg };
}

export async function fetchPageImages(
  tabId: number,
  ctx: ExecutionContext,
  pattern: string,
  limit: number
): Promise<PageImage[] | { error: string }> {
  const result = await runPageScript(tabId, ctx, 'listPageImages', pattern, limit);
  if (isScriptError(result)) return result;
  return result as PageImage[];
}

async function resolveImageAtIndex(
  ctx: ExecutionContext,
  tabId: number,
  index: number,
  pattern = ''
): Promise<{ image: PageImage } | { error: string }> {
  let list = !pattern ? ctx.getLastImagesResults?.() : undefined;
  if (!list?.length) {
    const fetched = await fetchPageImages(tabId, ctx, pattern, 100);
    if (isScriptError(fetched)) return fetched;
    list = fetched;
    if (!pattern) ctx.setLastImagesResults?.(list);
  }
  const image = list[index - 1];
  if (!image) return { error: `Image #${index} not found. Run images first.` };
  return { image };
}

export async function runImageAction(
  parsed: ParsedImageArgs,
  ctx: ExecutionContext
): Promise<{ stdout?: string; stderr?: string; exitCode: number }> {
  const resolved = await resolvePageTab(parsed.tabArg ? [parsed.tabArg] : [], ctx);
  if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

  if (parsed.index === undefined) {
    return { stderr: error('Usage: image <#> | image <open|copy|show> <#>'), exitCode: 2 };
  }

  const imgResult = await resolveImageAtIndex(ctx, resolved.ref.id, parsed.index);
  if (isScriptError(imgResult)) return { stderr: error(imgResult.error), exitCode: 1 };
  const { image } = imgResult;

  switch (parsed.action) {
    case 'show':
      return { stdout: [`#${parsed.index}`, image.alt, image.src, `${image.width}×${image.height}`].join('\n'), exitCode: 0 };
    case 'copy':
      try {
        await navigator.clipboard.writeText(image.src);
        return { stdout: success(`Copied image URL: ${truncateTitle(image.src)}`), exitCode: 0 };
      } catch {
        return { stderr: error('Clipboard access denied.'), exitCode: 1 };
      }
    case 'open':
    default:
      return focusOrOpenUrl(image.src, ctx);
  }
}