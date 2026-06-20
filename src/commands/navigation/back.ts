import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { error, success } from '@/shell/output';

export const back = defineCommand({
  name: 'back',
  description: 'Go back in the current tab history.',
  usage: 'back [#]',
  examples: ['back', 'back 2'],
  category: 'navigation',
  handler: async (args, ctx) => {
    const target = filterFlags(args)[0] ?? 'current';
    const ref = await resolveTabRef(target, ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
    await ctx.chrome.tabs.goBack(ref.id);
    return { stdout: success(`Back on #${ref.index}`), exitCode: 0 };
  },
});