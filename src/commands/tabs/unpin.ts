import { defineCommand } from '../define';
import { tab } from './tab';

export const unpin = defineCommand({
  name: 'unpin',
  description: 'Unpin the current tab (shortcut for tab unpin).',
  usage: 'unpin [#]',
  examples: ['unpin', 'unpin 1'],
  category: 'tabs',
  seeAlso: ['pin', 'tab', 'pinned'],
  handler: async (args, ctx) => tab.handler(['unpin', ...args], ctx),
});