import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { error, success } from '@/shell/output';

export const forward = defineCommand({
  name: 'forward',
  description: 'Go forward in the current tab history.',
  usage: 'forward [#]',
  examples: ['forward', 'forward 2'],
  category: 'navigation',
  handler: async (args, ctx) => {
    const target = filterFlags(args)[0] ?? 'current';
    const ref = await resolveTabRef(target, ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
    await ctx.chrome.tabs.goForward(ref.id);
    return { stdout: success(`Forward on #${ref.index}`), exitCode: 0 };
  },
});