import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

export const discard = defineCommand({
  name: 'discard',
  description: 'Unload a tab from memory (keeps tab, frees RAM). Reload to restore.',
  usage: 'discard [#]',
  examples: ['discard', 'discard 3', 'tabs | grep old | discard'],
  category: 'tabs',
  seeAlso: ['tab', 'reload', 'close'],
  handler: async (args, ctx) => {
    const target = filterFlags(args)[0] ?? 'current';
    const ref = await resolveTabRef(target, ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

    try {
      await ctx.chrome.tabs.discard(ref.id);
      return { stdout: success(`Discarded #${ref.index} — ${truncateTitle(ref.title)} (reload to restore)`), exitCode: 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { stderr: error(`Cannot discard: ${msg}`), exitCode: 1 };
    }
  },
});