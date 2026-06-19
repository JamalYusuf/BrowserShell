import type { Command, CommandResult, ExecutionContext } from '@/shared/types';
import { error, success } from '@/shell/output';
import { filterFlags } from './args';
import { getActiveWindowId, getWindowTabs, resolveTabRef } from './tab-utils';

function truncateTitle(title: string): string {
  return title.length > 40 ? title.slice(0, 39) + '…' : title;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, '') + u.search;
  } catch {
    return url;
  }
}

async function focusOrOpenUrl(url: string, ctx: ExecutionContext): Promise<CommandResult> {
  const normalized = normalizeUrl(url);
  const winId = await getActiveWindowId(ctx);
  const tabs = await getWindowTabs(ctx.chrome, winId);
  const existing = tabs.find((t) => normalizeUrl(t.url) === normalized || t.url === url);
  if (existing) {
    await ctx.chrome.tabs.update(existing.id, { active: true });
    const index = tabs.findIndex((t) => t.id === existing.id) + 1;
    return { stdout: success(`#${index} — ${truncateTitle(existing.title)}`), exitCode: 0 };
  }
  const tab = await ctx.chrome.tabs.create({ url, active: true, windowId: winId });
  const all = await getWindowTabs(ctx.chrome, winId);
  const index = all.findIndex((t) => t.id === tab.id) + 1;
  return {
    stdout: success(`${index > 0 ? `#${index}` : 'new tab'} — ${truncateTitle(tab.title || url)}`),
    exitCode: 0,
  };
}

async function currentTab(ctx: ExecutionContext) {
  const tabs = await ctx.chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

export function createQuickCommands(): Command[] {
  return [
    {
      name: 'go',
      description: 'Smart go: switch tab, open bookmark/URL/history, or search.',
      usage: 'go <query|url>',
      examples: ['go github', 'go gmail.com', 'go react docs', 'go https://example.com'],
      category: 'navigation',
      notes: 'Tries: open tab → bookmark → URL → history → Google search.',
      seeAlso: ['qf', 'open', 'tab'],
      handler: async (args, ctx) => {
        const query = filterFlags(args).join(' ').trim();
        if (!query) return { stderr: error('Usage: go <query|url>'), exitCode: 2 };

        const q = query.toLowerCase();
        const winId = await getActiveWindowId(ctx);
        const tabs = await getWindowTabs(ctx.chrome, winId);
        const tabHit = tabs.find(
          (t) => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
        );
        if (tabHit) {
          await ctx.chrome.tabs.update(tabHit.id, { active: true });
          const index = tabs.findIndex((t) => t.id === tabHit.id) + 1;
          return { stdout: success(`Switched to #${index} — ${truncateTitle(tabHit.title)}`), exitCode: 0 };
        }

        const bookmarks = await ctx.chrome.bookmarks.search(query);
        const bm = bookmarks.find((b) => b.url);
        if (bm?.url) return focusOrOpenUrl(bm.url, ctx);

        let url = query;
        if (!url.startsWith('http') && (url.includes('.') || url.includes('/'))) {
          url = `https://${url}`;
        } else if (!url.startsWith('http')) {
          const hist = await ctx.chrome.history.search({ text: query, maxResults: 3 });
          const hit = hist.find((h) => h.title.toLowerCase().includes(q) || h.url.toLowerCase().includes(q));
          if (hit) return focusOrOpenUrl(hit.url, ctx);
          url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }

        return focusOrOpenUrl(url, ctx);
      },
    },
    {
      name: 'qf',
      description: 'Quick-find: switch to the first tab matching a pattern.',
      usage: 'qf <pattern>',
      examples: ['qf github', 'qf mail', 'qf youtube'],
      category: 'tabs',
      seeAlso: ['go', 'tabs', 'tab'],
      handler: async (args, ctx) => {
        const pattern = filterFlags(args).join(' ').trim();
        if (!pattern) return { stderr: error('Usage: qf <pattern>'), exitCode: 2 };

        try {
          const regex = new RegExp(pattern, 'i');
          const winId = await getActiveWindowId(ctx);
          const tabs = await getWindowTabs(ctx.chrome, winId);
          const hit = tabs.find((t) => regex.test(t.title) || regex.test(t.url));
          if (!hit) return { stderr: error(`No tab matching /${pattern}/`), exitCode: 1 };

          await ctx.chrome.tabs.update(hit.id, { active: true });
          const index = tabs.findIndex((t) => t.id === hit.id) + 1;
          return { stdout: success(`#${index} — ${truncateTitle(hit.title)}`), exitCode: 0 };
        } catch {
          return { stderr: error(`Invalid pattern: ${pattern}`), exitCode: 2 };
        }
      },
    },
    {
      name: 'here',
      description: 'Show the current tab (title, url, #).',
      usage: 'here',
      examples: ['here', 'clip url', 'go $(here)'],
      category: 'navigation',
      seeAlso: ['tabs', 'clip'],
      handler: async (_args, ctx) => {
        const tab = await currentTab(ctx);
        if (!tab) return { stderr: error('No active tab.'), exitCode: 1 };
        const winId = await getActiveWindowId(ctx);
        const tabs = await getWindowTabs(ctx.chrome, winId);
        const index = tabs.findIndex((t) => t.id === tab.id) + 1;
        return {
          stdout: `#${index}\t${tab.title}\t${tab.url}`,
          exitCode: 0,
          structured: { index, title: tab.title, url: tab.url, id: tab.id },
        };
      },
    },
    {
      name: 'reload',
      description: 'Reload the current tab (or tab #).',
      usage: 'reload [#]',
      examples: ['reload', 'reload 2'],
      category: 'navigation',
      seeAlso: ['tab', 'back', 'forward'],
      handler: async (args, ctx) => {
        const target = filterFlags(args)[0] ?? 'current';
        const ref = await resolveTabRef(target, ctx);
        if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
        await ctx.chrome.tabs.reload(ref.id);
        return { stdout: success(`Reloaded #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
      },
    },
    {
      name: 'back',
      description: 'Go back in the current tab history.',
      usage: 'back [#]',
      examples: ['back', 'back 2'],
      category: 'navigation',
      handler: async (args, ctx) => {
        const target = filterFlags(args)[0] ?? 'current';
        const ref = await resolveTabRef(target, ctx);
        if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
        await ctx.chrome.tabs.goBack(ref.id);
        return { stdout: success(`Back on #${ref.index}`), exitCode: 0 };
      },
    },
    {
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
    },
    {
      name: 'clip',
      description: 'Copy current tab URL or title to clipboard.',
      usage: 'clip [url|title]',
      examples: ['clip', 'clip url', 'clip title'],
      category: 'utility',
      seeAlso: ['here'],
      handler: async (args, ctx) => {
        const what = filterFlags(args)[0] ?? 'url';
        const tab = await currentTab(ctx);
        if (!tab) return { stderr: error('No active tab.'), exitCode: 1 };

        const text = what === 'title' ? tab.title : tab.url;
        try {
          await navigator.clipboard.writeText(text);
          return { stdout: success(`Copied ${what}: ${truncateTitle(text)}`), exitCode: 0 };
        } catch {
          return { stderr: error('Clipboard access denied.'), exitCode: 1 };
        }
      },
    },
    {
      name: 'quick',
      description: 'Cheat sheet of power-user shortcuts and workflows.',
      usage: 'quick',
      examples: ['quick'],
      category: 'utility',
      handler: async () => ({
        stdout: [
          'Power workflows (type quick anytime):',
          '',
          '  go github        smart switch/open/search',
          '  qf mail          jump to first matching tab',
          '  tab next|prev    cycle tabs',
          '  reload / back / forward',
          '  here / clip url  current tab info',
          '  !!               repeat last command',
          '  !g rust docs     bang search (Google)',
          '',
          'One-letter aliases (in rc):',
          '  g  → go    n → tab next    p → tab prev',
          '  k  → close current tab    b → bookmark add',
          '  r  → reload   . → qf       h → tabs | head -n 8',
          '',
          'Pipelines:',
          '  tabs | grep -i youtube | tab close all-matched -f',
          '  tabs | grep -v pinned | wc -l',
        ].join('\n'),
        exitCode: 0,
      }),
    },
  ];
}