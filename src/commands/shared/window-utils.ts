import type { ChromeAPI, TabInfo, WindowInfo } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';

export interface WindowRef {
  id: number;
  index: number;
  focused: boolean;
}

export async function getActiveWindowId(ctx: ExecutionContext): Promise<number> {
  if (ctx.getActiveWindowId) return await ctx.getActiveWindowId();
  const tabs = await ctx.chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0]?.windowId ?? 0;
}

/** All normal windows, 1-based index order (left-to-right creation order). */
export async function getAllWindows(chrome: ChromeAPI): Promise<WindowInfo[]> {
  const wins = await chrome.windows.query({ windowTypes: ['normal'], populate: true });
  return wins.sort((a, b) => a.id - b.id);
}

export function windowListItems(windows: WindowInfo[]): {
  id: number;
  index: number;
  focused: boolean;
  tabCount: number;
  title: string;
}[] {
  return windows.map((w, i) => ({
    id: w.id,
    index: i + 1,
    focused: w.focused,
    tabCount: w.tabCount,
    title: w.title || `Window ${w.id}`,
  }));
}

export async function resolveWindowRef(
  arg: string | undefined,
  ctx: ExecutionContext
): Promise<WindowRef | undefined> {
  if (!arg || arg === 'current') {
    const id = await getActiveWindowId(ctx);
    const wins = await getAllWindows(ctx.chrome);
    const index = wins.findIndex((w) => w.id === id) + 1;
    return { id, index: index || 1, focused: true };
  }

  const wins = await getAllWindows(ctx.chrome);
  const num = Number(arg);
  if (!Number.isNaN(num)) {
    if (num >= 1 && num <= wins.length) {
      const w = wins[num - 1]!;
      return { id: w.id, index: num, focused: w.focused };
    }
    const byId = wins.find((w) => w.id === num);
    if (byId) return { id: byId.id, index: wins.indexOf(byId) + 1, focused: byId.focused };
    const remote = await ctx.chrome.windows.get(num);
    if (remote) {
      const index = wins.findIndex((w) => w.id === remote.id) + 1;
      return { id: remote.id, index: index || 0, focused: remote.focused };
    }
  }

  return undefined;
}

export async function getWindowTabs(chrome: ChromeAPI, windowId: number): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ windowId });
  return tabs.sort((a, b) => a.index - b.index);
}

export function parseWindowIndicesFromPipe(text: string): number[] {
  const indices: number[] = [];
  for (const line of text.split('\n')) {
    const w = line.match(/[Ww]#?(\d+)/);
    if (w) indices.push(Number(w[1]));
    const start = line.match(/^\s*[●*]?\s*(\d+)\s/);
    if (start && line.toLowerCase().includes('window')) indices.push(Number(start[1]));
  }
  return [...new Set(indices)];
}

export function windowErrorMessage(arg: string, wins: WindowInfo[]): string {
  if (!wins.length) return 'No browser windows open.';
  const names = wins.slice(0, 4).map((w, i) => `W#${i + 1} (${w.tabCount} tabs)`).join(', ');
  return `Window "${arg}" not found. Run 'windows' — open: ${names}${wins.length > 4 ? '…' : ''}`;
}

/** Parse tab@window refs: "2@3" = tab #2 in window #3 */
export function parseTabWindowRef(arg: string): { tab: string; window: string } | undefined {
  const m = arg.match(/^(\d+(?:@\d+)?)@(\d+)$/);
  if (!m) return undefined;
  return { tab: m[1]!, window: m[2]! };
}