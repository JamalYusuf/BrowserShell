import { defineCommand } from '../define';

export const pwd = defineCommand({
  name: 'pwd',
  description: 'Print the current working directory.',
  usage: 'pwd',
  examples: ['pwd', 'cd /tabs && pwd'],
  category: 'navigation',
  seeAlso: ['cd', 'ls'],
  handler: async (_args, ctx) => ({ stdout: ctx.cwd, exitCode: 0 }),
});