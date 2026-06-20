import { defineCommand } from '../define';
import { error, formatTable } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { currentTab } from '../shared/navigation';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { tabDomain } from '../shared/url';
import { truncateTitle } from '../shared/text';

export const domain = defineCommand({
  name: 'domain',
  description: 'Show current domain or list tabs matching a domain.',
  usage: 'domain [hostname]',
  examples: ['domain', 'domain github.com', 'domain google'],
  category: 'tabs',
  seeAlso: ['here', 'tabs', 'qf'],
  handler: async (args, ctx) => {
    const query = filterFlags(args).join(' ').trim().toLowerCase();

    if (!query) {
      const tab = await currentTab(ctx);
      if (!tab) return { stderr: error('No active tab.'), exitCode: 1 };
      return { stdout: tabDomain(tab.url), exitCode: 0 };
    }

    const wins = await getAllWindows(ctx.chrome);
    const rows: string[][] = [];

    for (let i = 0; i < wins.length; i++) {
      const tabs = await getWindowTabs(ctx.chrome, wins[i]!.id);
      for (const t of tabs) {
        const host = tabDomain(t.url).toLowerCase();
        if (host.includes(query)) {
          const tIndex = tabs.findIndex((x) => x.id === t.id) + 1;
          rows.push([`W#${i + 1} #${tIndex}`, host, truncateTitle(t.title, 24)]);
        }
      }
    }

    if (!rows.length) return { stderr: error(`No tabs on domain matching "${query}".`), exitCode: 1 };

    if (ctx.piped) {
      return { stdout: rows.map((r) => r.join('\t')).join('\n'), exitCode: 0 };
    }

    return {
      stdout: `${rows.length} tab(s) on "${query}":\n${formatTable(['Tab', 'Domain', 'Title'], rows, { maxWidth: ctx.cols })}`,
      exitCode: 0,
    };
  },
});