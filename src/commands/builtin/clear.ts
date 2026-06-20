import { defineCommand } from '../define';

export const clear = defineCommand({
  name: 'clear',
  description: 'Clear the terminal screen.',
  usage: 'clear',
  examples: ['clear'],
  category: 'builtin',
  handler: async () => ({ stdout: '\x1b[2J\x1b[H', exitCode: 0 }),
});