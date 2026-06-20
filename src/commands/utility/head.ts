import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { getFlagValue } from '../shared/args';

export const head = defineCommand({
  name: 'head',
  description: 'Output the first N lines of input.',
  usage: 'head [-n N]',
  examples: ['tabs | head -n 5', 'history | head -n 3'],
  category: 'utility',
  seeAlso: ['tail', 'grep', 'wc'],
  handler: async (args, ctx) => {
    const n = Math.max(1, Number(getFlagValue(args, '-n') ?? '10'));
    if (!ctx.stdin.trim()) return { stderr: error('head: no input. Pipe data in.'), exitCode: 1 };
    const lines = ctx.stdin.split('\n').slice(0, n);
    return { stdout: lines.join('\n'), exitCode: 0 };
  },
});