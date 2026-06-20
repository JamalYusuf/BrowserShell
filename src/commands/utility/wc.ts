import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';

export const wc = defineCommand({
  name: 'wc',
  description: 'Count lines, words, or characters in input.',
  usage: 'wc [-l] [-w] [path]',
  examples: ['tabs | wc -l', 'history | wc -l', 'wc -l /config/rc'],
  category: 'utility',
  seeAlso: ['grep', 'head'],
  handler: async (args, ctx) => {
    const countLines = hasFlag(args, '-l') || (!hasFlag(args, '-w') && !hasFlag(args, '-c'));
    const countWords = hasFlag(args, '-w');
    const path = filterFlags(args).find((a) => !a.startsWith('-'));

    let text = ctx.stdin;
    if (path) {
      try {
        text = (await ctx.vfs.read(ctx.vfs.resolve(path, ctx.cwd))) as string;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { stderr: error(msg), exitCode: 1 };
      }
    }

    if (!text && !path) return { stderr: error('wc: no input. Pipe data or specify a path.'), exitCode: 1 };

    const parts: string[] = [];
    if (countLines) parts.push(String(text.split('\n').filter((l) => l.trim()).length));
    if (countWords) parts.push(String(text.split(/\s+/).filter(Boolean).length));

    return { stdout: parts.join('\t'), exitCode: 0 };
  },
});