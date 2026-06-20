import { defineCommand } from '../define';
import { hasFlag } from '../shared/args';
import { ls } from '../builtin/ls';

export const bookmarks = defineCommand({
  name: 'bookmarks',
  description: 'List bookmarks (alias for ls /bookmarks).',
  usage: 'bookmarks [--json]',
  examples: ['bookmarks', 'ls /bookmarks'],
  category: 'bookmarks',
  seeAlso: ['bookmark', 'ls', 'open'],
  handler: async (args, ctx) => {
    return ls.handler(hasFlag(args, '--json') ? ['--json', '/bookmarks'] : ['/bookmarks'], ctx);
  },
});