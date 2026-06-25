import { defineCommand } from '../define';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';
import { clickableFooter } from '../shared/list-hints';
import type { WorkspaceSnapshot, WorkspaceWindow } from '@/shared/workspace-types';
import type { LayoutPreset } from '@/shared/window-layout';
import { getAllWindows, getWindowTabs, resolveWindowRef } from '../shared/window-utils';
import {
  applyLayoutToWindows,
  openSplitWindow,
  openSplitWindowHorizontal,
  parseLayoutRatio,
  positionWindow,
} from './layout-utils';

function normalizeUrl(url: string): string {
  if (!url || url === 'about:blank') return 'about:blank';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:')) return url;
  return `https://${url}`;
}

function normalizeLayoutPreset(raw: string): LayoutPreset | 'reset' | null {
  const map: Record<string, LayoutPreset | 'reset'> = {
    'side-by-side': 'side-by-side',
    'left-right': 'side-by-side',
    tiled: 'side-by-side',
    'even-horizontal': 'side-by-side',
    vertical: 'side-by-side',
    v: 'side-by-side',
    horizontal: 'top-bottom',
    h: 'top-bottom',
    'top-bottom': 'top-bottom',
    'main-left': 'main-left',
    'main-right': 'main-right',
    left: 'left',
    right: 'right',
    full: 'full',
    reset: 'reset',
  };
  return map[raw] ?? null;
}
async function captureWorkspace(name: string, ctx: import('@/shared/types').ExecutionContext): Promise<WorkspaceSnapshot> {
  const wins = await getAllWindows(ctx.chrome);
  const windows: WorkspaceWindow[] = [];

  for (const w of wins) {
    const tabs = await getWindowTabs(ctx.chrome, w.id);
    windows.push({
      left: w.left,
      top: w.top,
      width: w.width,
      height: w.height,
      state: w.state as WorkspaceWindow['state'],
      activeTabIndex: tabs.findIndex((t) => t.active),
      tabs: tabs.map((t) => ({
        url: t.url,
        active: t.active,
        pinned: t.pinned,
      })),
    });
  }

  return {
    name,
    savedAt: Date.now(),
    windows,
    aliases: { ...ctx.aliases },
    env: { ...ctx.env },
    cwd: ctx.cwd,
  };
}

async function restoreWorkspace(snapshot: WorkspaceSnapshot, ctx: import('@/shared/types').ExecutionContext): Promise<number> {
  let created = 0;
  for (const win of snapshot.windows) {
    const chromeWin = await ctx.chrome.windows.create({
      left: win.left,
      top: win.top,
      width: win.width,
      height: win.height,
      state: win.state,
      focused: created === 0,
      url: win.tabs[0]?.url ?? 'about:blank',
    });
    created++;

    const tabIds: number[] = [];
    const firstTab = await ctx.chrome.tabs.query({ windowId: chromeWin.id, index: 0 });
    if (firstTab[0]) tabIds.push(firstTab[0].id);

    for (let i = 1; i < win.tabs.length; i++) {
      const t = win.tabs[i]!;
      const tab = await ctx.chrome.tabs.create({ windowId: chromeWin.id, url: t.url, active: false, pinned: t.pinned });
      tabIds.push(tab.id);
    }

    const activeIdx = win.activeTabIndex ?? win.tabs.findIndex((t) => t.active);
    if (activeIdx >= 0 && tabIds[activeIdx]) {
      await ctx.chrome.tabs.update(tabIds[activeIdx]!, { active: true });
    }
  }
  return created;
}

export const workspace = defineCommand({
  name: 'workspace',
  description: 'Save, load, list, or delete named multi-window workspaces.',
  usage: 'workspace <save|load|list|delete> <name> [--json] [-f]',
  examples: [
    'workspace list',
    'workspace save research',
    'workspace load research',
    'workspace delete old-setup -f',
  ],
  category: 'workspace',
  seeAlso: ['session', 'sessions', 'recent', 'ps'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const json = hasFlag(args, '--json');
    const force = hasFlag(args, '-f') || hasFlag(args, '--force');
    const sub = words[0];
    const name = words[1]?.toLowerCase();

    const cfg = await loadConfig();
    const workspaces = { ...(cfg.workspaces ?? {}) };

    if (!sub || sub === 'list' || sub === 'ls') {
      const names = Object.keys(workspaces).sort();
      if (!names.length) return { stdout: 'No saved workspaces.', exitCode: 0 };
      if (json) return { stdout: formatJson(names.map((n) => workspaces[n])), exitCode: 0 };
      const lines = names.map((n, i) => {
        const ws = workspaces[n]!;
        const winCount = ws.windows.length;
        const tabCount = ws.windows.reduce((s, w) => s + w.tabs.length, 0);
        return `${String(i + 1).padStart(2)}  ${n.padEnd(16)}  ${winCount} window(s), ${tabCount} tab(s)`;
      });
      return {
        stdout: lines.join('\n') + clickableFooter('workspace load <name>'),
        exitCode: 0,
        clickableList: {
          count: names.length,
          command: (index) => `workspace load ${names[index - 1]}`,
        },
      };
    }

    if (sub === 'save') {
      if (!name) return { stderr: error('Usage: workspace save <name>'), exitCode: 2 };
      workspaces[name] = await captureWorkspace(name, ctx);
      await saveConfig({ workspaces });
      const tabCount = workspaces[name].windows.reduce((s, w) => s + w.tabs.length, 0);
      return { stdout: success(`Saved workspace "${name}" (${workspaces[name].windows.length} windows, ${tabCount} tabs)`), exitCode: 0 };
    }

    if (sub === 'load') {
      if (!name) return { stderr: error('Usage: workspace load <name>'), exitCode: 2 };
      const snap = workspaces[name];
      if (!snap) return { stderr: error(`Unknown workspace: ${name}`), exitCode: 1 };
      const count = await restoreWorkspace(snap, ctx);
      if (snap.aliases) {
        for (const [k, v] of Object.entries(snap.aliases)) ctx.setAlias(k, v);
      }
      if (snap.cwd) ctx.setCwd(snap.cwd);
      return { stdout: success(`Loaded workspace "${name}" (${count} window(s))`), exitCode: 0 };
    }

    if (sub === 'delete' || sub === 'rm') {
      if (!name) return { stderr: error('Usage: workspace delete <name> [-f]'), exitCode: 2 };
      if (!workspaces[name]) return { stderr: error(`Unknown workspace: ${name}`), exitCode: 1 };
      if (!force) return { stderr: error(`Use -f to delete workspace "${name}"`), exitCode: 2 };
      delete workspaces[name];
      await saveConfig({ workspaces });
      return { stdout: success(`Deleted workspace "${name}"`), exitCode: 0 };
    }

    if (/^\d+$/.test(sub)) {
      const names = Object.keys(workspaces).sort();
      const wsName = names[Number(sub) - 1];
      if (!wsName) return { stderr: error(`No workspace at index ${sub}`), exitCode: 1 };
      return workspace.handler([words[1] ?? 'load', wsName, ...args.filter((a) => a.startsWith('-'))], ctx);
    }

    return { stderr: error('Usage: workspace <save|load|list|delete> <name>'), exitCode: 2 };
  },
});

export const split = defineCommand({
  name: 'split',
  description: 'Split view — tile current window and open URL in a second window.',
  usage: 'split <vertical|horizontal> [url] [--side left|right|top|bottom]',
  examples: [
    'split vertical',
    'split vertical https://docs.example.com',
    'split horizontal github.com',
    'split v about:blank --side left',
  ],
  category: 'workspace',
  seeAlso: ['layout', 'window', 'workspace'],
  notes: 'Chrome cannot split one window — this tiles two browser windows using geometry.',
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const direction = words[0];
    const url = normalizeUrl(words[1] ?? 'about:blank');
    const sideEq = args.find((a) => a.startsWith('--side='));
    const sideIdx = args.indexOf('--side');
    const sideFlag = sideEq?.split('=')[1] ?? (sideIdx >= 0 ? args[sideIdx + 1] : undefined);

    if (!direction || !['vertical', 'horizontal', 'v', 'h'].includes(direction)) {
      return { stderr: error('Usage: split <vertical|horizontal> [url] [--side left|right|top|bottom]'), exitCode: 2 };
    }

    const vertical = direction === 'vertical' || direction === 'v';
    if (vertical) {
      const side = sideFlag === 'left' ? 'left' : 'right';
      const { windowId, tabId } = await openSplitWindow(ctx.chrome, url, side);
      return {
        stdout: success(`Split vertical — W#${windowId} tab ${tabId} (${side})${url !== 'about:blank' ? ` — ${url}` : ''}`),
        exitCode: 0,
      };
    }

    const side = sideFlag === 'top' ? 'top' : 'bottom';
    const { windowId, tabId } = await openSplitWindowHorizontal(ctx.chrome, url, side);
    return {
      stdout: success(`Split horizontal — W#${windowId} tab ${tabId} (${side})${url !== 'about:blank' ? ` — ${url}` : ''}`),
      exitCode: 0,
    };
  },
});

export const layout = defineCommand({
  name: 'layout',
  description: 'Tile browser windows using left/top/width/height geometry.',
  usage: 'layout <side-by-side|main-left|main-right|top-bottom|left|right|full|reset> [ratio] [W# W#]',
  examples: [
    'layout side-by-side',
    'layout main-left 60%',
    'layout top-bottom',
    'layout left',
    'layout right 1 2',
    'workspace save research',
  ],
  category: 'workspace',
  seeAlso: ['split', 'window', 'workspace'],
  notes: 'Positions up to two windows. Creates a second window if only one exists (except left/right/full).',
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const presetRaw = words[0];
    if (!presetRaw) {
      return { stderr: error('Usage: layout <preset> [ratio] [W# W#]'), exitCode: 2 };
    }

    const preset = normalizeLayoutPreset(presetRaw);
    if (!preset) {
      return {
        stderr: error('Unknown preset. Try: side-by-side, main-left, main-right, top-bottom, left, right, full, reset'),
        exitCode: 2,
      };
    }

    const ratioArg = words.find((w) => /%$/.test(w) || (/^\d*\.?\d+$/.test(w) && Number(w) > 0 && Number(w) < 1));
    const ratio = parseLayoutRatio(ratioArg);

    const windowNums = words.filter((w) => /^\d+$/.test(w)).map(Number);
    const wins = await getAllWindows(ctx.chrome);
    const windowIds = windowNums.length
      ? windowNums.map((n) => wins[n - 1]?.id).filter((id): id is number => id !== undefined)
      : undefined;

    if (preset === 'reset' || preset === 'full') {
      const ref = await resolveWindowRef(windowNums[0] ? String(windowNums[0]) : 'current', ctx);
      if (!ref) return { stderr: error('No window to position.'), exitCode: 1 };
      await positionWindow(ctx.chrome, ref.id, preset === 'full' ? 'full' : 'full', ratio);
      return { stdout: success(`Layout ${preset} applied to W#${ref.index}`), exitCode: 0 };
    }

    if (preset === 'left' || preset === 'right') {
      const ref = await resolveWindowRef(windowNums[0] ? String(windowNums[0]) : 'current', ctx);
      if (!ref) return { stderr: error('No window to position.'), exitCode: 1 };
      await positionWindow(ctx.chrome, ref.id, preset, ratio);
      return { stdout: success(`Positioned W#${ref.index} on the ${preset}`), exitCode: 0 };
    }

    const result = await applyLayoutToWindows(ctx.chrome, preset, { windowIds, ratio });
    return {
      stdout: success(`Layout "${presetRaw}" applied to windows ${result.windowIds.join(', ')}`),
      exitCode: 0,
    };
  },
});

/** Alias for workspace — save/load multi-window workviews. */
export const workview = defineCommand({
  name: 'workview',
  description: 'Alias for workspace — save and restore multi-window layouts.',
  usage: 'workview <save|load|list|delete> <name>',
  examples: ['workview save coding', 'workview load coding', 'workview list'],
  category: 'workspace',
  seeAlso: ['workspace', 'layout', 'split'],
  handler: (args, ctx) => workspace.handler(args, ctx),
});