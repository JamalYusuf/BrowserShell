import { defineCommand } from '../define';
import { expandVariables } from '@/shell/parser';

export const echo = defineCommand({
  name: 'echo',
  description: 'Print arguments to stdout (supports $VAR expansion).',
  usage: 'echo [text...]',
  examples: ['echo Hello', 'echo $HOME', 'echo $USER'],
  category: 'builtin',
  handler: async (args, ctx) => ({
    stdout: expandVariables(args.join(' '), ctx.env),
    exitCode: 0,
  }),
});