import { defineCommand } from '../define';
import { formatJson, formatTable, warn } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';

export const audible = defineCommand({
  name: 'audible',
  description: 'List tabs currently playing audio across all windows.',
  usage: 'audible [--json]',
  examples: ['audible', 'audible --json', 'audible | tab switch'],
  category: 'utility',
  seeAlso: ['mute', 'volume', 'find'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const noisy = await ctx.chrome.tabs.query({ audible: true });
    if (!noisy.length) return { stdout: warn('No tabs playing audio.'), exitCode: 0 };

    const wins = await getAllWindows(ctx.chrome);
    const rows: string[][] = [];

    for (const tab of noisy) {
      const wIndex = wins.findIndex((w) => w.id === tab.windowId) + 1;
      const tabs = await getWindowTabs(ctx.chrome, tab.windowId);
      const tIndex = tabs.findIndex((t) => t.id === tab.id) + 1;
      rows.push([
        `W#${wIndex} #${tIndex}`,
        truncateTitle(tab.title, 28),
        tab.muted ? 'muted' : 'playing',
        tab.url.slice(0, 40),
      ]);
    }

    if (json) return { stdout: formatJson(noisy), exitCode: 0, structured: noisy };

    const table = formatTable(['Tab', 'Title', 'Audio', 'URL'], rows, { maxWidth: ctx.cols });
    return {
      stdout: `${noisy.length} tab(s) with audio:\n${table}\n${warn('Tip: mute 2  or  mute on 2@1')}`,
      exitCode: 0,
    };
  },
});