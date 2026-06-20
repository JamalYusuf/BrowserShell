import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { focusOrOpenUrl } from '../shared/navigation';
import { getWindowTabs } from '../shared/tab-utils';
import { getAllWindows } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';
import { error, success } from '@/shell/output';

export const go = defineCommand({
  name: 'go',
  description: 'Smart go: switch tab, open bookmark/URL/history, or search.',
  usage: 'go <query|url>',
  examples: ['go github', 'go gmail.com', 'go react docs', 'go https://example.com'],
  category: 'navigation',
  notes: 'Tries: open tab (any window) → bookmark → URL → history → Google search.',
  seeAlso: ['qf', 'open', 'tab', 'find'],
  handler: async (args, ctx) => {
    const query = filterFlags(args).join(' ').trim();
    if (!query) return { stderr: error('Usage: go <query|url>'), exitCode: 2 };

    const q = query.toLowerCase();
    const wins = await getAllWindows(ctx.chrome);
    for (const w of wins) {
      const tabs = await getWindowTabs(ctx.chrome, w.id);
      const tabHit = tabs.find((t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
      if (tabHit) {
        await ctx.chrome.windows.update(w.id, { focused: true });
        await ctx.chrome.tabs.update(tabHit.id, { active: true });
        ctx.setActiveWindowId?.(w.id);
        const wIndex = wins.findIndex((x) => x.id === w.id) + 1;
        const tIndex = tabs.findIndex((t) => t.id === tabHit.id) + 1;
        return { stdout: success(`Tab W#${wIndex} #${tIndex} — ${truncateTitle(tabHit.title)}`), exitCode: 0 };
      }
    }

    const bookmarks = await ctx.chrome.bookmarks.search(query);
    const bm = bookmarks.find((b) => b.url);
    if (bm?.url) {
      const result = await focusOrOpenUrl(bm.url, ctx);
      return { ...result, stdout: success(`Bookmark — ${truncateTitle(bm.title)}`) };
    }

    let url = query;
    const looksLikeUrl = url.startsWith('http') || url.includes('.') || url.includes('/');
    if (!looksLikeUrl) {
      const hist = await ctx.chrome.history.search({ text: query, maxResults: 5 });
      const hit = hist.find((h) => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q));
      if (hit) {
        const result = await focusOrOpenUrl(hit.url, ctx);
        return { ...result, stdout: success(`History — ${truncateTitle(hit.title)}`) };
      }
      url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const result = await focusOrOpenUrl(url, ctx);
      return { ...result, stdout: success(`Google — ${query}`) };
    }

    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    const result = await focusOrOpenUrl(url, ctx);
    return { ...result, stdout: success(`URL — ${truncateTitle(url)}`) };
  },
});