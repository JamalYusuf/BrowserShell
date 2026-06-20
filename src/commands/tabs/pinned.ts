import { defineCommand } from '../define';
import { formatJson, formatTable } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';

export const pinned = defineCommand({
  name: 'pinned',
  description: 'List all pinned tabs across windows.',
  usage: 'pinned [--json]',
  examples: ['pinned', 'pinned --json', 'pinned | tab switch'],
  category: 'tabs',
  seeAlso: ['tabs', 'tab', 'windows'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const pinnedTabs = await ctx.chrome.tabs.query({ pinned: true });
    if (!pinnedTabs.length) return { stdout: 'No pinned tabs.', exitCode: 0 };

    const wins = await getAllWindows(ctx.chrome);
    const rows: string[][] = [];

    for (const tab of pinnedTabs) {
      const wIndex = wins.findIndex((w) => w.id === tab.windowId) + 1;
      const tabs = await getWindowTabs(ctx.chrome, tab.windowId);
      const tIndex = tabs.findIndex((t) => t.id === tab.id) + 1;
      rows.push([`W#${wIndex} #${tIndex}`, truncateTitle(tab.title, 28), tab.url.slice(0, 42)]);
    }

    if (json) return { stdout: formatJson(pinnedTabs), exitCode: 0, structured: pinnedTabs };

    if (ctx.piped) {
      return {
        stdout: rows.map((r) => r.join('\t')).join('\n'),
        exitCode: 0,
      };
    }

    return { stdout: formatTable(['Tab', 'Title', 'URL'], rows, { maxWidth: ctx.cols }), exitCode: 0 };
  },
});