import { defineCommand } from '../define';
import { parseLinkArgs, runLinkAction } from '../shared/link-utils';
import { links } from './links';

export const link = defineCommand({
  name: 'link',
  description: 'List or interact with page links by number or text.',
  usage: 'link | link <#> [open|copy|show|click|new] | link <action> <#> | link <text>',
  examples: [
    'link',
    'link 1',
    'link 1 copy',
    'link copy 1 --md',
    'link Sign in',
    'link click 4',
  ],
  category: 'utility',
  seeAlso: ['links', 'open', 'clip'],
  notes: 'No args lists links. link <#> opens. Bare text finds by label. link 1 copy works either order.',
  handler: async (args, ctx) => {
    const parsed = parseLinkArgs(args);
    if (parsed.action === 'open' && parsed.index === undefined && !parsed.query) {
      return links.handler(args, ctx);
    }
    return runLinkAction(parsed, ctx);
  },
});