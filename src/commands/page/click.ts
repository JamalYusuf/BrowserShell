import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { parseLinkArgs, runLinkAction } from '../shared/link-utils';

function parseClickArgs(args: string[]): { tabArg?: string; target: string } {
  const parts = filterFlags(args);
  if (parts.length > 1 && /^\d+(@\d+)?$/.test(parts[parts.length - 1]!)) {
    const tabArg = parts.pop();
    return { tabArg, target: parts.join(' ').trim() };
  }
  return { target: parts.join(' ').trim() };
}

/** @deprecated Use `link find <text>` — kept as alias for compatibility */
export const click = defineCommand({
  name: 'click',
  description: 'Alias for link find — click/open first matching link or button.',
  usage: 'click <text|selector> [#]',
  examples: ['link find Home', 'click Home', 'click Sign in', 'click "#submit"'],
  category: 'utility',
  seeAlso: ['link', 'links', 'fill'],
  notes: 'Prefer: link find <text>. For numbered links: links → link click <#>',
  handler: async (args, ctx) => {
    const { tabArg, target } = parseClickArgs(args);
    if (!target) return { stderr: error('Usage: click <text|selector> [#]  (prefer: link find <text>)'), exitCode: 2 };

    const parsed = parseLinkArgs(['find', target]);
    if (tabArg) parsed.tabArg = tabArg;
    return runLinkAction(parsed, ctx);
  },
});