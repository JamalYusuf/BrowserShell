import { defineCommand } from '../define';
import { error, success, warn } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

function parseSeekArgs(args: string[]): { tabArg?: string; query: string } {
  const parts = filterFlags(args).filter((a) => !['--next', '--prev', '--grep'].includes(a));
  if (parts[0] && /^\d+(@\d+)?$/.test(parts[0]) && parts.length > 1) {
    return { tabArg: parts[0], query: parts.slice(1).join(' ') };
  }
  return { query: parts.join(' ') };
}

export const seek = defineCommand({
  name: 'seek',
  description: 'Find text in the current page (like Ctrl+F). Highlights matches.',
  usage: 'seek <text> [--next|--prev] [--grep] [#]',
  examples: ['seek login', 'seek error --next', 'seek TODO --grep', 'cat /current/content.txt | seek --grep api'],
  category: 'utility',
  seeAlso: ['grep', 'qf', 'links'],
  notes: 'Use --grep to list matching lines without highlighting. Pipe page text in with --grep.',
  handler: async (args, ctx) => {
    const grepMode = hasFlag(args, '--grep');
    const backwards = hasFlag(args, '--prev');
    const { tabArg, query } = parseSeekArgs(args);

    if (grepMode && ctx.stdin.trim()) {
      if (!query) return { stderr: error('Usage: ... | seek --grep <pattern>'), exitCode: 2 };
      const regex = new RegExp(query, 'i');
      const lines = ctx.stdin.split('\n').filter((l) => regex.test(l));
      if (!lines.length) return { stdout: warn(`No lines matching "${query}".`), exitCode: 1 };
      return { stdout: lines.join('\n'), exitCode: 0 };
    }

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };
    if (!query) return { stderr: error('Usage: seek <text> [--next|--prev] [--grep]'), exitCode: 2 };

    if (grepMode) {
      const result = await runPageScript(resolved.ref.id, ctx, 'grepPageText', query, 20);
      if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
      const grep = result as { matches: number; lines: string[] };
      if (!grep.matches) return { stdout: warn(`No matches for "${query}".`), exitCode: 1 };
      const lines = grep.lines.map((l) => l.trim()).filter(Boolean);
      return { stdout: `${grep.matches} match(es):\n${lines.join('\n')}`, exitCode: 0 };
    }

    const result = await runPageScript(resolved.ref.id, ctx, 'seekInPage', query, backwards);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const seek = result as { found: boolean; matches: number };

    if (!seek.found) {
      return {
        stdout: warn(`"${query}" not found on page (${seek.matches} text match${seek.matches === 1 ? '' : 'es'} in body).`),
        exitCode: 1,
      };
    }

    const dir = backwards ? 'previous' : hasFlag(args, '--next') ? 'next' : 'first';
    return {
      stdout: success(`Found ${dir} "${query}" — ${seek.matches} occurrence${seek.matches === 1 ? '' : 's'} on page`),
      exitCode: 0,
    };
  },
});