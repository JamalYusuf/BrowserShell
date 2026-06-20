import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { getFlagValue } from '../shared/args';

export const tail = defineCommand({
  name: 'tail',
  description: 'Output the last N lines of input.',
  usage: 'tail [-n N]',
  examples: ['history | tail -n 5', 'tabs | tail -n 3'],
  category: 'utility',
  seeAlso: ['head', 'grep'],
  handler: async (args, ctx) => {
    const n = Math.max(1, Number(getFlagValue(args, '-n') ?? '10'));
    if (!ctx.stdin.trim()) return { stderr: error('tail: no input. Pipe data in.'), exitCode: 1 };
    const lines = ctx.stdin.split('\n');
    return { stdout: lines.slice(-n).join('\n'), exitCode: 0 };
  },
});