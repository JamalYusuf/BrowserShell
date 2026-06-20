import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { getAllWindows } from '../shared/window-utils';
import { error, success } from '@/shell/output';

export const detach = defineCommand({
  name: 'detach',
  description: 'Move current tab (or #) into a new window.',
  usage: 'detach [#]',
  examples: ['detach', 'detach 3', 'tab move 2 new'],
  category: 'tabs',
  seeAlso: ['tab', 'window'],
  handler: async (args, ctx) => {
    const ref = await resolveTabRef(filterFlags(args)[0] ?? 'current', ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

    const win = await ctx.chrome.windows.create({ tabId: ref.id, focused: true });
    ctx.setActiveWindowId?.(win.id);
    const wins = await getAllWindows(ctx.chrome);
    const wIndex = wins.findIndex((w) => w.id === win.id) + 1;
    return { stdout: success(`Detached #${ref.index} → new W#${wIndex}`), exitCode: 0 };
  },
});