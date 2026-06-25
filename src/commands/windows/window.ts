import { defineCommand } from '../define';
import { filterFlags, hasFlag } from '../shared/args';
import { formatTabList } from '@/shell/output';
import { error, success } from '@/shell/output';
import { tabListItems } from '../shared/tab-utils';
import {
  getAllWindows,
  getWindowTabs,
  parseWindowIndicesFromPipe,
  resolveWindowRef,
  windowErrorMessage,
} from '../shared/window-utils';
import { positionWindow, parseLayoutRatio } from '../workspace/layout-utils';
import { windows } from './windows';

export const window = defineCommand({
  name: 'window',
  description: 'List or manage browser windows: focus, new, close, tabs.',
  usage: 'window | window <W#> | window <focus|new|close|tabs|position> [args] [-f]',
  examples: ['window', 'window 2', 'window focus 2', 'window position left', 'window position right 2 40%'],
  notes: 'No args lists windows. window <W#> focuses. window focus sets shell context for tabs.',
  category: 'tabs',
  seeAlso: ['windows', 'tabs', 'tab', 'detach'],
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    let sub = parts[0];
    let rest = parts.slice(1);
    const force = hasFlag(args, '-f', '--force');

    if (!sub) return windows.handler([], ctx);

    if (/^\d+$/.test(sub)) {
      rest = [sub, ...rest];
      sub = 'focus';
    }

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
          stdout: formatTabList(tabListItems(tabs), ctx.cols, {
            windowLabel: `W#${ref.index}`,
            windowIndex: ref.index,
            clickable: true,
          }),
          exitCode: 0,
        };
      }
      case 'position': {
        const slot = rest[0] as 'left' | 'right' | 'top' | 'bottom' | 'full' | undefined;
        if (!slot || !['left', 'right', 'top', 'bottom', 'full'].includes(slot)) {
          return { stderr: error('Usage: window position <left|right|top|bottom|full> [W#] [ratio]'), exitCode: 2 };
        }
        const ratioArg = rest.find((w) => /%$/.test(w) || (/^\d*\.?\d+$/.test(w) && Number(w) > 0 && Number(w) < 1));
        const winArg = rest.find((w) => /^\d+$/.test(w));
        const ref = await resolveWindowRef(winArg ?? 'current', ctx);
        if (!ref) {
          return { stderr: error(windowErrorMessage(winArg ?? '', await getAllWindows(ctx.chrome))), exitCode: 1 };
        }
        await positionWindow(ctx.chrome, ref.id, slot, parseLayoutRatio(ratioArg));
        return { stdout: success(`Positioned W#${ref.index} — ${slot}${ratioArg ? ` (${ratioArg})` : ''}`), exitCode: 0 };
      }
      default:
        return { stderr: error(`Unknown: "${sub}". Try: focus, new, close, tabs, position`), exitCode: 2 };
    }
  },
  getCompletions: async (partial, ctx) => {
    const parts = partial.trim().split(/\s+/);
    const subs = ['focus', 'new', 'close', 'tabs', 'position'];
    if (parts.length <= 1) return subs.filter((s) => s.startsWith(parts[0] ?? ''));
    const wins = await getAllWindows(ctx.chrome);
    return wins.map((_, i) => String(i + 1));
  },
});