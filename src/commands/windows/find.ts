import { defineCommand } from '../define';
import { filterFlags, hasFlag } from '../shared/args';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

export const find = defineCommand({
  name: 'find',
  description: 'Find a tab across all windows and switch to it.',
  usage: 'find [-i] <pattern>',
  examples: ['find github', 'find -i mail', 'find youtube'],
  category: 'tabs',
  seeAlso: ['qf', 'go', 'sessions'],
  handler: async (args, ctx) => {
    const ignoreCase = hasFlag(args, '-i');
    const pattern = filterFlags(args).filter((a) => a !== '-i').join(' ').trim();
    if (!pattern) return { stderr: error('Usage: find [-i] <pattern>'), exitCode: 2 };

    try {
      const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
      const wins = await getAllWindows(ctx.chrome);
      for (const w of wins) {
        const tabs = await getWindowTabs(ctx.chrome, w.id);
        const wIndex = wins.findIndex((x) => x.id === w.id) + 1;
        const hit = tabs.find((t) => regex.test(t.title) || regex.test(t.url));
        if (hit) {
          await ctx.chrome.windows.update(w.id, { focused: true });
          await ctx.chrome.tabs.update(hit.id, { active: true });
          ctx.setActiveWindowId?.(w.id);
          const tIndex = tabs.findIndex((t) => t.id === hit.id) + 1;
          return { stdout: success(`W#${wIndex} #${tIndex} — ${truncateTitle(hit.title)}`), exitCode: 0 };
        }
      }
      return { stderr: error(`No tab matching /${pattern}/ in any window.`), exitCode: 1 };
    } catch {
      return { stderr: error(`Invalid pattern: ${pattern}`), exitCode: 2 };
    }
  },
});