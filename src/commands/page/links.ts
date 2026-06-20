import { defineCommand } from '../define';
import { error, formatTable, success, warn } from '@/shell/output';
import { filterFlags, getFlagValue } from '../shared/args';
import { fetchPageLinks } from '../shared/link-utils';
import { isScriptError, resolvePageTab } from '../shared/page-utils';

function parseLinksArgs(args: string[]): { tabArg?: string; pattern: string } {
  const parts = filterFlags(args).filter((a) => !a.startsWith('--'));
  let remaining = [...parts];
  let tabArg: string | undefined;

  if (remaining.length > 1 && /^\d+@\d+$/.test(remaining[remaining.length - 1]!)) {
    tabArg = remaining.pop();
  }

  return { tabArg, pattern: remaining.join(' ').trim() };
}

export const links = defineCommand({
  name: 'links',
  description: 'List links on the current page.',
  usage: 'links [pattern] [--limit N] [#]',
  examples: ['links', 'links home', 'links github', 'links | head -n 5', 'links && link 1'],
  category: 'utility',
  seeAlso: ['link', 'open', 'go'],
  notes: 'Numbers match link <#>. Workflow: links → link 1',
  handler: async (args, ctx) => {
    const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? '50')));
    const { tabArg, pattern } = parseLinksArgs(args);

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await fetchPageLinks(resolved.ref.id, ctx, pattern, limit);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    if (!result.length) {
      return { stdout: warn(pattern ? `No links matching "${pattern}".` : 'No links on page.'), exitCode: 0 };
    }

    ctx.setLastLinksResults?.(result);

    if (ctx.piped) {
      return {
        stdout: result.map((l, i) => `${i + 1}\t${l.text}\t${l.href}`).join('\n'),
        exitCode: 0,
      };
    }

    const hint = `\n${success('Open: link 1  |  Click row to run  |  Copy: link 1 copy  |  Find: link Sign in')}`;
    const rows = result.map((l, i) => [String(i + 1), l.text.slice(0, 32), l.href.slice(0, 42)]);
    return {
      stdout:
        formatTable(['#', 'Text', 'URL'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `link ${n}` },
          urlColumns: [2],
        }) + hint,
      exitCode: 0,
      clickableList: {
        count: result.length,
        command: (n) => `link ${n}`,
      },
    };
  },
});