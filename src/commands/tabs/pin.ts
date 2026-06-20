import { defineCommand } from '../define';
import { tab } from './tab';

export const pin = defineCommand({
  name: 'pin',
  description: 'Pin the current tab (shortcut for tab pin).',
  usage: 'pin [#]',
  examples: ['pin', 'pin 2'],
  category: 'tabs',
  seeAlso: ['unpin', 'tab', 'pinned'],
  handler: async (args, ctx) => tab.handler(['pin', ...args], ctx),
});