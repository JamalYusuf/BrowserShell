import { defineCommand } from '../define';
import { error, formatJson } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { currentTab } from '../shared/navigation';
import { getActiveWindowId, getWindowTabs } from '../shared/tab-utils';
import { tabDomain } from '../shared/url';

export const here = defineCommand({
  name: 'here',
  description: 'Show the current tab (title, url, #, domain, status).',
  usage: 'here [--json]',
  examples: ['here', 'here --json', 'clip url', 'domain'],
  category: 'navigation',
  seeAlso: ['tabs', 'clip', 'domain'],
  handler: async (args, ctx) => {
    const tab = await currentTab(ctx);
    if (!tab) return { stderr: error('No active tab.'), exitCode: 1 };

    const winId = await getActiveWindowId(ctx);
    const winTabs = await getWindowTabs(ctx.chrome, winId);
    const index = winTabs.findIndex((t) => t.id === tab.id) + 1;
    const zoom = await ctx.chrome.tabs.getZoom(tab.id);
    const domain = tabDomain(tab.url);
    const flags = [
      tab.pinned ? 'pinned' : null,
      tab.muted ? 'muted' : null,
      tab.audible ? 'audible' : null,
    ].filter(Boolean);

    const info = {
      index,
      id: tab.id,
      title: tab.title,
      url: tab.url,
      domain,
      zoom: Math.round(zoom * 100),
      flags,
      windowId: tab.windowId,
    };

    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(info), exitCode: 0, structured: info };
    }

    const status = flags.length ? ` [${flags.join(', ')}]` : '';
    return {
      stdout: `#${index}\t${tab.title}\t${tab.url}\n${domain} · zoom ${info.zoom}%${status}`,
      exitCode: 0,
      structured: info,
    };
  },
});