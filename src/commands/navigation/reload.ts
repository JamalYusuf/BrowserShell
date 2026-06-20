import { defineCommand } from '../define';
import { filterFlags, hasFlag } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

export const reload = defineCommand({
  name: 'reload',
  description: 'Reload the current tab (or tab #). Use --hard to bypass cache.',
  usage: 'reload [#] [--hard]',
  examples: ['reload', 'reload 2', 'reload --hard', 'reload 3 --hard'],
  category: 'navigation',
  seeAlso: ['tab', 'back', 'forward', 'hard'],
  handler: async (args, ctx) => {
    const hard = hasFlag(args, '--hard');
    const target = filterFlags(args)[0] ?? 'current';
    const ref = await resolveTabRef(target, ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
    await ctx.chrome.tabs.reload(ref.id, { bypassCache: hard });
    const mode = hard ? 'Hard reloaded' : 'Reloaded';
    return { stdout: success(`${mode} #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
  },
});