import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';

export const grep = defineCommand({
  name: 'grep',
  description: 'Filter lines matching a pattern from stdin or a file.',
  usage: 'grep [-i] [-v] <pattern> [path]',
  examples: ['tabs | grep -i youtube', 'history | grep github', 'tabs | grep -v example'],
  category: 'utility',
  seeAlso: ['cat', 'tabs', 'head', 'wc'],
  handler: async (args, ctx) => {
    const ignoreCase = hasFlag(args, '-i');
    const invert = hasFlag(args, '-v');
    const positional = filterFlags(args).filter((a) => a !== '-i' && a !== '-v');
    const pattern = positional[0];
    const path = positional[1];

    if (!pattern) return { stderr: error('Usage: grep [-i] [-v] <pattern> [path]'), exitCode: 2 };

    let text = ctx.stdin;
    if (path) {
      try {
        text = (await ctx.vfs.read(ctx.vfs.resolve(path, ctx.cwd))) as string;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { stderr: error(msg), exitCode: 1 };
      }
    }

    if (!text.trim()) return { stderr: error('grep: no input. Pipe data or specify a path.'), exitCode: 1 };

    try {
      const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
      const lines = text.split('\n').filter((l) => {
        const matches = regex.test(l);
        return invert ? !matches : matches;
      });
      return { stdout: lines.join('\n'), exitCode: lines.length ? 0 : 1 };
    } catch {
      return { stderr: error(`grep: invalid pattern: ${pattern}`), exitCode: 2 };
    }
  },
});