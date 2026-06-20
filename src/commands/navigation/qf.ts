import { defineCommand } from '../define';
import { filterFlags, hasFlag } from '../shared/args';
import { getActiveWindowId, getWindowTabs } from '../shared/tab-utils';
import { getAllWindows } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

export const qf = defineCommand({
  name: 'qf',
  description: 'Quick-find: switch to the first tab matching a pattern.',
  usage: 'qf <pattern> [--all]',
  examples: ['qf github', 'qf mail', 'qf youtube --all'],
  category: 'tabs',
  seeAlso: ['go', 'find', 'tabs'],
  notes: 'Searches active window by default. --all searches every window.',
  handler: async (args, ctx) => {
    const allWindows = hasFlag(args, '--all');
    const pattern = filterFlags(args).join(' ').trim();
    if (!pattern) return { stderr: error('Usage: qf <pattern> [--all]'), exitCode: 2 };

    try {
      const regex = new RegExp(pattern, 'i');

      if (allWindows) {
        const wins = await getAllWindows(ctx.chrome);
        for (let i = 0; i < wins.length; i++) {
          const tabs = await getWindowTabs(ctx.chrome, wins[i]!.id);
          const hit = tabs.find((t) => regex.test(t.title) || regex.test(t.url));
          if (hit) {
            await ctx.chrome.windows.update(wins[i]!.id, { focused: true });
            await ctx.chrome.tabs.update(hit.id, { active: true });
            ctx.setActiveWindowId?.(wins[i]!.id);
            const tIndex = tabs.findIndex((t) => t.id === hit.id) + 1;
            return { stdout: success(`W#${i + 1} #${tIndex} — ${truncateTitle(hit.title)}`), exitCode: 0 };
          }
        }
        return { stderr: error(`No tab matching /${pattern}/ in any window.`), exitCode: 1 };
      }

      const winId = await getActiveWindowId(ctx);
      const tabs = await getWindowTabs(ctx.chrome, winId);
      const hit = tabs.find((t) => regex.test(t.title) || regex.test(t.url));
      if (!hit) return { stderr: error(`No tab matching /${pattern}/. Try qf ${pattern} --all`), exitCode: 1 };

      await ctx.chrome.tabs.update(hit.id, { active: true });
      const index = tabs.findIndex((t) => t.id === hit.id) + 1;
      return { stdout: success(`#${index} — ${truncateTitle(hit.title)}`), exitCode: 0 };
    } catch {
      return { stderr: error(`Invalid pattern: ${pattern}`), exitCode: 2 };
    }
  },
});