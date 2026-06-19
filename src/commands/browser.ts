import type { Command, CommandResult, ExecutionContext } from '@/shared/types';
import { error, formatJson, formatTable, success, warn } from '@/shell/output';
import { filterFlags, getFlagValue, hasFlag } from './args';
import {
  parseTabIndicesFromPipe,
  resolveTabRef,
  tabErrorMessage,
} from './tab-utils';
import {
  getActiveWindowId,
  getAllWindows,
  getWindowTabs,
  resolveWindowRef,
} from './window-utils';
import { createBuiltinCommands } from './builtins';
import { loadConfig, saveConfig } from '@/shared/storage';

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
  const wins = await getAllWindows(ctx.chrome);
  for (const w of wins) {
    const tabs = await getWindowTabs(ctx.chrome, w.id);
    const existing = tabs.find((t) => normalizeUrl(t.url) === normalized || t.url === url);
    if (existing) {
      await ctx.chrome.windows.update(w.id, { focused: true });
      await ctx.chrome.tabs.update(existing.id, { active: true });
      ctx.setActiveWindowId?.(w.id);
      const wIndex = wins.findIndex((x) => x.id === w.id) + 1;
      const tIndex = tabs.findIndex((t) => t.id === existing.id) + 1;
      return { stdout: success(`W#${wIndex} #${tIndex} — ${truncateTitle(existing.title)}`), exitCode: 0 };
    }
  }
  const winId = await getActiveWindowId(ctx);
  const tab = await ctx.chrome.tabs.create({ url, active: true, windowId: winId });
  const all = await getWindowTabs(ctx.chrome, winId);
  const index = all.findIndex((t) => t.id === tab.id) + 1;
  const label = index > 0 ? `Opened tab #${index}` : 'Opened new tab';
  return { stdout: success(`${label} — ${truncateTitle(tab.title || url)}`), exitCode: 0 };
}

export function createBrowserCommands(): Command[] {
  return [
    {
      name: 'tabs',
      description: 'List tabs in the active shell window (same numbers as tab switch).',
      usage: 'tabs [--all] [--json]',
      examples: ['tabs', 'windows', 'window focus 2', 'tabs --all', 'tab switch 2@2'],
      category: 'tabs',
      seeAlso: ['tab', 'ls', 'open'],
      handler: async (args, ctx) => {
        const ls = createBuiltinCommands().find((c) => c.name === 'ls')!;
        return ls.handler(hasFlag(args, '--json') ? ['--json', '/tabs'] : ['/tabs'], ctx);
      },
    },
    {
      name: 'tab',
      description: 'Manage browser tabs: new, close, switch, pin, unpin, duplicate.',
      usage: 'tab <new|close|switch|move|next|prev|pin|unpin|duplicate> [args]',
      examples: ['tab switch 2', 'tab switch 1@2', 'tab move 3 2', 'tab move current new'],
      notes: 'Tab #s match "tabs" in the active window (window focus). Cross-window: tab switch 2@3.',
      category: 'tabs',
      seeAlso: ['tabs', 'open', 'close'],
      handler: async (args, ctx) => {
        const sub = filterFlags(args)[0];
        const rest = filterFlags(args).slice(1);

        if (!sub || sub === '--help') {
          return {
            stderr: error('Usage: tab <new|close|switch|next|prev|pin|unpin|duplicate> [args]\nRun "tabs" first to see tab numbers.'),
            exitCode: 2,
          };
        }

        switch (sub) {
          case 'new': {
            let url = rest[0];
            if (url && !url.startsWith('http')) url = `https://${url}`;
            const winId = await getActiveWindowId(ctx);
            const tab = await ctx.chrome.tabs.create({ url: url || undefined, active: true, windowId: winId });
            const all = await getWindowTabs(ctx.chrome, winId);
            const index = all.findIndex((t) => t.id === tab.id) + 1;
            return { stdout: success(`Opened tab #${index} — ${truncateTitle(tab.title || url || 'New Tab')}`), exitCode: 0 };
          }
          case 'close': {
            const target = rest[0] ?? 'current';
            const force = hasFlag(args, '-f', '--force');

            if (target === 'all-matched' || (ctx.stdin.trim() && !rest[0])) {
              if (!force) {
                return {
                  stderr: error('Pipe matched tabs first, then: tab close all-matched -f\n  Example: tabs | grep youtube | tab close all-matched -f'),
                  exitCode: 1,
                };
              }
              const indices = parseTabIndicesFromPipe(ctx.stdin);
              if (!indices.length) {
                return { stderr: error('No tab numbers found in piped input. Run "tabs" first.'), exitCode: 1 };
              }
              const winId = await getActiveWindowId(ctx);
              const sorted = await getWindowTabs(ctx.chrome, winId);
              const ids = indices.map((i) => sorted[i - 1]?.id).filter((id): id is number => id !== undefined);
              await ctx.chrome.tabs.remove(ids);
              return { stdout: success(`Closed ${ids.length} tab(s): #${indices.join(', #')}`), exitCode: 0 };
            }

            const ref = await resolveTabRef(target, ctx);
            if (!ref) {
              return { stderr: error(await tabErrorMessage(target, ctx)), exitCode: 1 };
            }
            await ctx.chrome.tabs.remove(ref.id);
            return { stdout: success(`Closed #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
          }
          case 'switch': {
            const ref = await resolveTabRef(rest[0], ctx);
            if (!ref) {
              return {
                stderr: error(rest[0] ? await tabErrorMessage(rest[0], ctx) : 'Usage: tab switch <#> or <#>@<W#>'),
                exitCode: 2,
              };
            }
            if (ref.windowIndex) {
              const wins = await getAllWindows(ctx.chrome);
              const win = wins[ref.windowIndex - 1];
              if (win) {
                await ctx.chrome.windows.update(win.id, { focused: true });
                ctx.setActiveWindowId?.(win.id);
              }
            }
            await ctx.chrome.tabs.update(ref.id, { active: true });
            const label = ref.windowIndex ? `W#${ref.windowIndex} #${ref.index}` : `#${ref.index}`;
            return { stdout: success(`${label} — ${truncateTitle(ref.title)}`), exitCode: 0 };
          }
          case 'move': {
            const tabTarget = rest[0] ?? 'current';
            const winTarget = rest[1];
            if (!winTarget) return { stderr: error('Usage: tab move <#> <W#|new>'), exitCode: 2 };
            const ref = await resolveTabRef(tabTarget, ctx);
            if (!ref) return { stderr: error(await tabErrorMessage(tabTarget, ctx)), exitCode: 1 };

            if (winTarget === 'new') {
              const win = await ctx.chrome.windows.create({ tabId: ref.id, focused: true });
              ctx.setActiveWindowId?.(win.id);
              const wins = await getAllWindows(ctx.chrome);
              const wIndex = wins.findIndex((w) => w.id === win.id) + 1;
              return { stdout: success(`Moved #${ref.index} → new W#${wIndex}`), exitCode: 0 };
            }
            const winRef = await resolveWindowRef(winTarget, ctx);
            if (!winRef) return { stderr: error('Invalid window. Run "windows".'), exitCode: 1 };
            await ctx.chrome.tabs.move(ref.id, { windowId: winRef.id, index: -1 });
            await ctx.chrome.windows.update(winRef.id, { focused: true });
            await ctx.chrome.tabs.update(ref.id, { active: true });
            ctx.setActiveWindowId?.(winRef.id);
            return { stdout: success(`Moved #${ref.index} → W#${winRef.index}`), exitCode: 0 };
          }
          case 'next': {
            const winId = await getActiveWindowId(ctx);
            const tabs = await getWindowTabs(ctx.chrome, winId);
            const cur = tabs.findIndex((t) => t.active);
            const next = tabs[(cur + 1) % tabs.length];
            if (!next) return { stderr: error('No tabs.'), exitCode: 1 };
            await ctx.chrome.tabs.update(next.id, { active: true });
            const index = tabs.findIndex((t) => t.id === next.id) + 1;
            return { stdout: success(`#${index} — ${truncateTitle(next.title)}`), exitCode: 0 };
          }
          case 'prev': {
            const winId = await getActiveWindowId(ctx);
            const tabs = await getWindowTabs(ctx.chrome, winId);
            const cur = tabs.findIndex((t) => t.active);
            const prev = tabs[(cur - 1 + tabs.length) % tabs.length];
            if (!prev) return { stderr: error('No tabs.'), exitCode: 1 };
            await ctx.chrome.tabs.update(prev.id, { active: true });
            const index = tabs.findIndex((t) => t.id === prev.id) + 1;
            return { stdout: success(`#${index} — ${truncateTitle(prev.title)}`), exitCode: 0 };
          }
          case 'pin': {
            const ref = await resolveTabRef(rest[0] ?? 'current', ctx);
            if (!ref) return { stderr: error('Invalid tab. Run "tabs" for valid numbers.'), exitCode: 1 };
            await ctx.chrome.tabs.update(ref.id, { pinned: true });
            return { stdout: success(`Pinned #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
          }
          case 'unpin': {
            const ref = await resolveTabRef(rest[0] ?? 'current', ctx);
            if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
            await ctx.chrome.tabs.update(ref.id, { pinned: false });
            return { stdout: success(`Unpinned #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
          }
          case 'duplicate': {
            const ref = await resolveTabRef(rest[0] ?? 'current', ctx);
            if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };
            const dup = await ctx.chrome.tabs.duplicate(ref.id);
            return { stdout: success(`Duplicated #${ref.index} → new tab ${dup?.id}`), exitCode: 0 };
          }
          default:
            return { stderr: error(`Unknown: "${sub}". Try: new, close, switch, move, next, prev, pin, unpin, duplicate`), exitCode: 2 };
        }
      },
      getCompletions: async (partial, ctx) => {
        const parts = partial.trim().split(/\s+/);
        const subs = ['new', 'close', 'switch', 'move', 'next', 'prev', 'pin', 'unpin', 'duplicate'];
        if (parts.length <= 1) return subs.filter((s) => s.startsWith(parts[0] ?? ''));
        const winId = await getActiveWindowId(ctx);
        const tabs = await getWindowTabs(ctx.chrome, winId);
        return tabs.map((_, i) => String(i + 1));
      },
    },
    {
      name: 'bookmarks',
      description: 'List bookmarks (alias for ls /bookmarks).',
      usage: 'bookmarks [--json]',
      examples: ['bookmarks', 'ls /bookmarks'],
      category: 'bookmarks',
      seeAlso: ['bookmark', 'ls', 'open'],
      handler: async (args, ctx) => {
        const ls = createBuiltinCommands().find((c) => c.name === 'ls')!;
        return ls.handler(hasFlag(args, '--json') ? ['--json', '/bookmarks'] : ['/bookmarks'], ctx);
      },
    },
    {
      name: 'bookmark',
      description: 'Add, search, or open bookmarks.',
      usage: 'bookmark <add|search|open> [args]',
      examples: ['bookmark add', 'bookmark add "My Site"', 'bookmark search react', 'bookmark open /bookmarks/Work'],
      category: 'bookmarks',
      seeAlso: ['bookmarks', 'open'],
      handler: async (args, ctx) => {
        const sub = filterFlags(args)[0];
        const rest = filterFlags(args).slice(1);

        if (!sub) return { stderr: error('Usage: bookmark <add|search|open> [args]'), exitCode: 2 };

        switch (sub) {
          case 'add': {
            let title = rest[0];
            let url = rest[1];

            if (!title) {
              const tab = (await ctx.chrome.tabs.query({ active: true, currentWindow: true }))[0];
              title = tab?.title || 'Untitled';
              url = tab?.url;
            } else if (title.startsWith('http') || title.startsWith('/')) {
              url = title.startsWith('/') ? ((await ctx.vfs.read('/current/url.txt')) as string) : title;
              const tab = (await ctx.chrome.tabs.query({ active: true, currentWindow: true }))[0];
              title = tab?.title || 'Untitled';
            }

            if (!url) url = (await ctx.vfs.read('/current/url.txt')) as string;

            const bm = await ctx.chrome.bookmarks.create({ title, url });
            return { stdout: success(`Bookmarked: "${bm.title}" → ${bm.url}`), exitCode: 0 };
          }
          case 'search': {
            const query = rest.join(' ');
            if (!query) return { stderr: error('Usage: bookmark search <query>'), exitCode: 2 };
            const results = await ctx.chrome.bookmarks.search(query);
            ctx.setBookmarkSearchResults?.(results);
            if (!results.length) return { stdout: warn(`No bookmarks matching "${query}".`), exitCode: 0 };
            const rows = results.map((b, i) => [
              String(i + 1),
              b.title?.slice(0, 28) ?? '',
              b.url?.slice(0, 42) ?? '',
              b.id,
            ]);
            return {
              stdout: `(use: bookmark open <#> — numbers match this list)\n${formatTable(['#', 'Title', 'URL', 'ChromeID'], rows, { maxWidth: ctx.cols })}`,
              exitCode: 0,
              structured: { bookmarks: results },
            };
          }
          case 'open': {
            const pathOrId = rest[0];
            if (!pathOrId) return { stderr: error('Usage: bookmark open <#|path|chrome-id>'), exitCode: 2 };

            let url: string | undefined;

            if (pathOrId.startsWith('/')) {
              const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(pathOrId, ctx.cwd));
              url = node?.url;
            } else if (/^\d+$/.test(pathOrId)) {
              const rank = Number(pathOrId);
              const cached = ctx.getBookmarkSearchResults?.() ?? [];
              const byRank = rank >= 1 && rank <= cached.length ? cached[rank - 1] : undefined;
              if (byRank?.url) {
                url = byRank.url;
              } else {
                const nodes = await ctx.chrome.bookmarks.get(pathOrId);
                const node = nodes[0];
                if (node?.url) {
                  url = node.url;
                } else if (node && !node.url) {
                  return {
                    stderr: error(
                      `"${pathOrId}" is a folder. Run bookmark search first, then bookmark open <#>, or use a path like /bookmarks/Work/Project`
                    ),
                    exitCode: 1,
                  };
                }
              }
            }

            if (!url) {
              return {
                stderr: error(
                  `Bookmark not found: ${pathOrId}. Run bookmark search <query> first to use bookmark open <#>.`
                ),
                exitCode: 1,
              };
            }
            return focusOrOpenUrl(url, ctx);
          }
          default:
            return { stderr: error(`Unknown bookmark subcommand: ${sub}`), exitCode: 2 };
        }
      },
    },
    {
      name: 'history',
      description: 'Search or list browsing history.',
      usage: 'history [recent|search] [query] [--limit N]',
      examples: ['history', 'history search terminal', 'history recent --limit 10'],
      category: 'history',
      seeAlso: ['open', 'grep'],
      handler: async (args, ctx) => {
        const positional = filterFlags(args);
        const sub = positional[0];
        const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? '15')));
        const json = hasFlag(args, '--json');

        const isRecent = !sub || sub === 'recent';
        const query = sub === 'search' ? positional.slice(1).join(' ') : isRecent ? '' : positional.join(' ');

        if (isRecent) {
          const items = await ctx.chrome.history.search({ text: '', maxResults: limit });
          if (!items.length) return { stdout: warn('No recent history.'), exitCode: 0 };
          if (json) return { stdout: formatJson(items), exitCode: 0 };
          if (ctx.piped) {
            return {
              stdout: items.map((item, i) => `${i + 1}\t${item.title}\t${item.url}`).join('\n'),
              exitCode: 0,
            };
          }
          const rows = items.map((item, i) => [
            String(i + 1),
            item.title.slice(0, 30),
            item.url.slice(0, 40),
            new Date(item.lastVisitTime).toLocaleDateString(),
          ]);
          return { stdout: formatTable(['#', 'Title', 'URL', 'When'], rows, { maxWidth: ctx.cols }), exitCode: 0 };
        }

        if (!query) return { stderr: error('Usage: history search <query>  or  history <query>'), exitCode: 2 };
        const items = await ctx.chrome.history.search({ text: query, maxResults: limit });
        if (!items.length) return { stdout: warn(`No history for "${query}".`), exitCode: 0 };
        if (json) return { stdout: formatJson(items), exitCode: 0 };
        if (ctx.piped) {
          return {
            stdout: items.map((item, i) => `${i + 1}\t${item.title}\t${item.url}`).join('\n'),
            exitCode: 0,
          };
        }
        const rows = items.map((item, i) => [String(i + 1), item.title.slice(0, 30), item.url.slice(0, 40)]);
        return { stdout: formatTable(['#', 'Title', 'URL'], rows, { maxWidth: ctx.cols }), exitCode: 0 };
      },
    },
    {
      name: 'open',
      description: 'Open or focus a URL, bookmark path, or VFS path.',
      usage: 'open <url|path>',
      examples: ['open github.com', 'open https://example.com', 'open /bookmarks/Work/Project'],
      category: 'navigation',
      seeAlso: ['tab', 'bookmark'],
      handler: async (args, ctx) => {
        const target = filterFlags(args)[0];
        if (!target) return { stderr: error('Usage: open <url|path>'), exitCode: 2 };

        let url = target;

        if (target.startsWith('/')) {
          try {
            if (target.endsWith('url.txt')) {
              url = (await ctx.vfs.read(ctx.vfs.resolve(target, ctx.cwd))) as string;
            } else {
              const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(target, ctx.cwd));
              if (!node?.url) return { stderr: error(`Cannot open: ${target}. Not a bookmark URL.`), exitCode: 1 };
              url = node.url;
            }
          } catch (e) {
            return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
          }
        } else if (!target.startsWith('http')) {
          url = `https://${target}`;
        }

        return focusOrOpenUrl(url, ctx);
      },
    },
    {
      name: 'close',
      description: 'Close a tab by # or remove a bookmark.',
      usage: 'close <#|current|bookmark-path> [-f]',
      examples: ['close 3', 'close current', 'close /bookmarks/Old -f'],
      category: 'navigation',
      seeAlso: ['tab', 'bookmark'],
      handler: async (args, ctx) => {
        const force = hasFlag(args, '-f', '--force');
        const target = filterFlags(args)[0];
        if (!target) return { stderr: error('Usage: close <#|current|path> [-f]'), exitCode: 2 };

        if (target.startsWith('/bookmarks') || (target.startsWith('/') && target !== '/')) {
          if (!force) {
            return { stderr: error(`Removing bookmarks requires -f. Try: close ${target} -f`), exitCode: 1 };
          }
          const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(target, ctx.cwd));
          if (!node) return { stderr: error(`Bookmark not found: ${target}`), exitCode: 1 };
          await ctx.chrome.bookmarks.remove(node.id);
          return { stdout: success(`Removed bookmark: ${node.title}`), exitCode: 0 };
        }

        const ref = await resolveTabRef(target, ctx);
        if (!ref) {
          return { stderr: error(await tabErrorMessage(target, ctx)), exitCode: 1 };
        }
        await ctx.chrome.tabs.remove(ref.id);
        return { stdout: success(`Closed #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
      },
    },
    {
      name: 'config',
      description: 'View or edit shell configuration.',
      usage: 'config <get|set|list> [key] [value]',
      examples: ['config list', 'config get theme', 'config set overlayOpacity 0.9'],
      category: 'utility',
      seeAlso: ['alias', 'export'],
      handler: async (args, _ctx) => {
        const sub = filterFlags(args)[0];

        if (sub === 'list' || (!sub && !filterFlags(args).length)) {
          const config = await loadConfig();
          const keys = ['theme', 'displayMode', 'toggleKey', 'overlayOpacity', 'fontSize', 'fontFamily'] as const;
          return {
            stdout: keys.map((k) => `${k}=${config[k]}`).join('\n'),
            exitCode: 0,
          };
        }

        if (sub === 'get') {
          const key = filterFlags(args)[1];
          const config = await loadConfig();
          if (!key) return { stdout: formatJson(config), exitCode: 0 };
          const value = (config as unknown as Record<string, unknown>)[key];
          if (value === undefined) return { stderr: error(`Unknown key: ${key}`), exitCode: 1 };
          return { stdout: typeof value === 'object' ? JSON.stringify(value) : String(value), exitCode: 0 };
        }

        if (sub === 'set') {
          const key = filterFlags(args)[1];
          const value = filterFlags(args).slice(2).join(' ');
          if (!key || !value) return { stderr: error('Usage: config set <key> <value>'), exitCode: 2 };

          const numericKeys = ['overlayOpacity', 'overlayHeight', 'backdropBlur', 'backdropDim', 'fontSize', 'lineHeight'];
          const boolKeys = ['overlayEnabled', 'cursorBlink', 'firstRunComplete'];
          let parsed: unknown = value;
          if (numericKeys.includes(key)) parsed = Number(value);
          else if (boolKeys.includes(key)) parsed = value === 'true';
          else if (key === 'toggleKey') {
            const k = value === 'Backquote' || value === 'grave' || value === 'backquote' ? '`' : value;
            parsed = k;
          }

          await saveConfig({ [key]: parsed });
          return { stdout: success(`Set ${key}=${value}`), exitCode: 0 };
        }

        return { stderr: error('Usage: config <list|get|set> [args]'), exitCode: 2 };
      },
    },
  ];
}