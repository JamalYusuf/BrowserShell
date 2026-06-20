import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import {
  parseTabIndicesFromPipe,
  resolveTabRef,
  tabErrorMessage,
} from '../shared/tab-utils';
import {
  getActiveWindowId,
  getAllWindows,
  getWindowTabs,
  resolveWindowRef,
} from '../shared/window-utils';
import { truncateTitle } from '../shared/text';
import { tabs } from './tabs';

export const tab = defineCommand({
  name: 'tab',
  description: 'Manage browser tabs: list, switch, close, pin, and more.',
  usage: 'tab [#|new|close|switch|move|next|prev|pin|unpin|duplicate] [args]',
  examples: ['tab', 'tab 2', 'tab switch 2', 'tab switch 1@2', 'tab move 3 2', 'tab new github.com'],
  notes: 'No arguments lists tabs. "tab 2" switches to #2. Cross-window: tab switch 2@3.',
  category: 'tabs',
  seeAlso: ['tabs', 'open', 'close'],
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    let sub = parts[0];
    let rest = parts.slice(1);

    if (!sub) {
      return tabs.handler([], ctx);
    }

    if (/^\d+(@\d+)?$/.test(sub)) {
      rest = [sub, ...rest];
      sub = 'switch';
    }

    switch (sub) {
      case 'new': {
        let url = rest[0];
        if (url && !url.startsWith('http')) url = `https://${url}`;
        const winId = await getActiveWindowId(ctx);
        const created = await ctx.chrome.tabs.create({ url: url || undefined, active: true, windowId: winId });
        const all = await getWindowTabs(ctx.chrome, winId);
        const index = all.findIndex((t) => t.id === created.id) + 1;
        return { stdout: success(`Opened tab #${index} — ${truncateTitle(created.title || url || 'New Tab')}`), exitCode: 0 };
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
        const tabList = await getWindowTabs(ctx.chrome, winId);
        const cur = tabList.findIndex((t) => t.active);
        const next = tabList[(cur + 1) % tabList.length];
        if (!next) return { stderr: error('No tabs.'), exitCode: 1 };
        await ctx.chrome.tabs.update(next.id, { active: true });
        const index = tabList.findIndex((t) => t.id === next.id) + 1;
        return { stdout: success(`#${index} — ${truncateTitle(next.title)}`), exitCode: 0 };
      }
      case 'prev': {
        const winId = await getActiveWindowId(ctx);
        const tabList = await getWindowTabs(ctx.chrome, winId);
        const cur = tabList.findIndex((t) => t.active);
        const prev = tabList[(cur - 1 + tabList.length) % tabList.length];
        if (!prev) return { stderr: error('No tabs.'), exitCode: 1 };
        await ctx.chrome.tabs.update(prev.id, { active: true });
        const index = tabList.findIndex((t) => t.id === prev.id) + 1;
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
    const tabList = await getWindowTabs(ctx.chrome, winId);
    return tabList.map((_, i) => String(i + 1));
  },
});