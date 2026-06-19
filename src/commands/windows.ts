import type { Command } from '@/shared/types';
import { ANSI, color, error, formatJson, success, warn } from '@/shell/output';
import { formatTabList, formatWindowList } from '@/shell/output';
import { filterFlags, hasFlag } from './args';
import { tabListItems } from './tab-utils';
import {
  getActiveWindowId,
  getAllWindows,
  getWindowTabs,
  parseWindowIndicesFromPipe,
  resolveWindowRef,
  windowErrorMessage,
  windowListItems,
} from './window-utils';

function truncateTitle(title: string): string {
  return title.length > 40 ? title.slice(0, 39) + '…' : title;
}

export function createWindowCommands(): Command[] {
  return [
    {
      name: 'windows',
      description: 'List browser windows (W#). Sets context for tabs/tab commands.',
      usage: 'windows [--json]',
      examples: ['windows', 'window focus 2', 'tabs', 'tab switch 1@2'],
      category: 'tabs',
      seeAlso: ['window', 'tabs', 'sessions'],
      handler: async (args, ctx) => {
        const json = hasFlag(args, '--json');
        const wins = await getAllWindows(ctx.chrome);
        if (!wins.length) return { stdout: warn('No windows open.'), exitCode: 0 };
        if (json) return { stdout: formatJson(wins), exitCode: 0 };

        const activeId = await getActiveWindowId(ctx);
        return {
          stdout: formatWindowList(windowListItems(wins), activeId, ctx.cols),
          exitCode: 0,
        };
      },
    },
    {
      name: 'window',
      description: 'Manage browser windows: focus, new, close, tabs.',
      usage: 'window <focus|new|close|tabs> [args] [-f]',
      examples: ['window focus 2', 'window new github.com', 'window tabs 1', 'window close 2 -f'],
      notes: 'window focus sets shell context. Cross-window: tab switch 2@3 (tab 2 in W#3).',
      category: 'tabs',
      seeAlso: ['windows', 'tabs', 'tab', 'detach'],
      handler: async (args, ctx) => {
        const sub = filterFlags(args)[0];
        const rest = filterFlags(args).slice(1);
        const force = hasFlag(args, '-f', '--force');

        if (!sub) return { stderr: error('Usage: window <focus|new|close|tabs> [args]'), exitCode: 2 };

        switch (sub) {
          case 'focus': {
            const ref = await resolveWindowRef(rest[0] ?? 'current', ctx);
            if (!ref) {
              return { stderr: error(windowErrorMessage(rest[0] ?? '', await getAllWindows(ctx.chrome))), exitCode: 1 };
            }
            await ctx.chrome.windows.update(ref.id, { focused: true });
            ctx.setActiveWindowId?.(ref.id);
            return { stdout: success(`Focused W#${ref.index} — tabs/tab commands now target this window`), exitCode: 0 };
          }
          case 'new': {
            let url = rest[0];
            if (url && !url.startsWith('http')) url = `https://${url}`;
            const win = await ctx.chrome.windows.create({ url: url || undefined, focused: true });
            ctx.setActiveWindowId?.(win.id);
            const wins = await getAllWindows(ctx.chrome);
            const index = wins.findIndex((w) => w.id === win.id) + 1;
            return { stdout: success(`Opened W#${index}${url ? ` — ${url}` : ''}`), exitCode: 0 };
          }
          case 'close': {
            const target = rest[0] ?? 'current';

            if (target === 'all-matched' || (ctx.stdin.trim() && !rest[0])) {
              if (!force) {
                return { stderr: error('Pipe first: windows | grep … | window close all-matched -f'), exitCode: 1 };
              }
              const indices = parseWindowIndicesFromPipe(ctx.stdin);
              const wins = await getAllWindows(ctx.chrome);
              const ids = indices.map((i) => wins[i - 1]?.id).filter((id): id is number => id !== undefined);
              for (const id of ids) await ctx.chrome.windows.remove(id);
              return { stdout: success(`Closed ${ids.length} window(s)`), exitCode: 0 };
            }

            const ref = await resolveWindowRef(target, ctx);
            if (!ref) {
              return { stderr: error(windowErrorMessage(target, await getAllWindows(ctx.chrome))), exitCode: 1 };
            }
            const win = await ctx.chrome.windows.get(ref.id);
            if (!force && (win?.tabCount ?? 0) > 1) {
              return { stderr: error(`W#${ref.index} has ${win?.tabCount} tabs. Use: window close ${target} -f`), exitCode: 1 };
            }
            await ctx.chrome.windows.remove(ref.id);
            return { stdout: success(`Closed W#${ref.index}`), exitCode: 0 };
          }
          case 'tabs': {
            const ref = await resolveWindowRef(rest[0] ?? 'current', ctx);
            if (!ref) {
              return { stderr: error(windowErrorMessage(rest[0] ?? '', await getAllWindows(ctx.chrome))), exitCode: 1 };
            }
            const tabs = await getWindowTabs(ctx.chrome, ref.id);
            return {
              stdout: formatTabList(tabListItems(tabs), ctx.cols, `W#${ref.index}`),
              exitCode: 0,
            };
          }
          default:
            return { stderr: error(`Unknown: "${sub}". Try: focus, new, close, tabs`), exitCode: 2 };
        }
      },
    },
    {
      name: 'sessions',
      description: 'Tree view of all windows and their tabs.',
      usage: 'sessions [--json]',
      examples: ['sessions', 'sessions | grep github', 'find mail'],
      category: 'tabs',
      seeAlso: ['windows', 'tabs', 'find'],
      handler: async (args, ctx) => {
        const json = hasFlag(args, '--json');
        const wins = await getAllWindows(ctx.chrome);
        const activeWin = await getActiveWindowId(ctx);

        const data = [];
        for (const w of wins) {
          const tabs = await getWindowTabs(ctx.chrome, w.id);
          const wIndex = wins.findIndex((x) => x.id === w.id) + 1;
          data.push({
            window: wIndex,
            windowId: w.id,
            focused: w.focused,
            context: w.id === activeWin,
            tabs: tabs.map((t, i) => ({ index: i + 1, id: t.id, title: t.title, url: t.url, active: t.active })),
          });
        }

        if (json) return { stdout: formatJson(data), exitCode: 0 };

        const lines: string[] = [color('(use: tab switch <#>@<W#>  or  window focus <W#>)', ANSI.dim)];
        for (const s of data) {
          const ctxMark = s.context ? color('*', ANSI.yellow) : ' ';
          const foc = s.focused ? color('●', ANSI.green) : ' ';
          lines.push(`${foc}${ctxMark} ${color(`W#${s.window}`, ANSI.cyan)}  ${s.tabs.length} tab(s)`);
          for (const t of s.tabs) {
            const title = t.active ? color(truncateTitle(t.title), ANSI.green) : truncateTitle(t.title);
            lines.push(`      ${t.active ? '●' : ' '} #${t.index}  ${title}`);
            lines.push(`        ${color(t.url.slice(0, 64), ANSI.dim)}`);
          }
        }
        return { stdout: lines.join('\n'), exitCode: 0 };
      },
    },
    {
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
    },
    {
      name: 'mute',
      description: 'Mute or unmute tab audio.',
      usage: 'mute [on|off|toggle] [#]',
      examples: ['mute', 'mute off', 'mute on 2'],
      category: 'utility',
      seeAlso: ['tab', 'here'],
      handler: async (args, ctx) => {
        const { resolveTabRef } = await import('./tab-utils');
        const parts = filterFlags(args);
        const mode = parts[0] && ['on', 'off', 'toggle'].includes(parts[0]) ? parts[0] : 'toggle';
        const tabArg = parts[0] && !['on', 'off', 'toggle'].includes(parts[0]) ? parts[0] : parts[1] ?? 'current';
        const ref = await resolveTabRef(tabArg === mode ? 'current' : tabArg, ctx);
        if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

        const tab = await ctx.chrome.tabs.get(ref.id);
        let muted = tab?.muted ?? false;
        if (mode === 'on') muted = true;
        else if (mode === 'off') muted = false;
        else muted = !muted;

        await ctx.chrome.tabs.update(ref.id, { muted });
        return { stdout: success(`#${ref.index} ${muted ? 'muted' : 'unmuted'}`), exitCode: 0 };
      },
    },
    {
      name: 'detach',
      description: 'Move current tab (or #) into a new window.',
      usage: 'detach [#]',
      examples: ['detach', 'detach 3', 'tab move 2 new'],
      category: 'tabs',
      seeAlso: ['tab', 'window'],
      handler: async (args, ctx) => {
        const { resolveTabRef } = await import('./tab-utils');
        const ref = await resolveTabRef(filterFlags(args)[0] ?? 'current', ctx);
        if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

        const win = await ctx.chrome.windows.create({ tabId: ref.id, focused: true });
        ctx.setActiveWindowId?.(win.id);
        const wins = await getAllWindows(ctx.chrome);
        const wIndex = wins.findIndex((w) => w.id === win.id) + 1;
        return { stdout: success(`Detached #${ref.index} → new W#${wIndex}`), exitCode: 0 };
      },
    },
  ];
}