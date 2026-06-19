import type { TabInfo } from '@/chrome/api';
import type { ExecutionContext } from '@/shared/types';
import {
  getActiveWindowId,
  getWindowTabs,
  resolveWindowRef,
} from './window-utils';

export { getWindowTabs, getActiveWindowId } from './window-utils';

export interface TabRef {
  id: number;
  index: number;
  title: string;
  windowIndex?: number;
}

export function tabListItems(tabs: TabInfo[]): { id: number; index: number; title: string; url: string; active: boolean; pinned: boolean }[] {
  const sorted = [...tabs].sort((a, b) => a.index - b.index);
  return sorted.map((t, i) => ({
    id: t.id,
    index: i + 1,
    title: t.title,
    url: t.url,
    active: t.active,
    pinned: t.pinned,
  }));
}

/**
 * Resolve tab by # in active window, Chrome ID, "current", or cross-window "2@3".
 */
export async function resolveTabRef(
  arg: string | undefined,
  ctx: ExecutionContext
): Promise<TabRef | undefined> {
  if (!arg || arg === 'current') {
    const tabs = await ctx.chrome.tabs.query({ active: true, currentWindow: true });
    const t = tabs[0];
    if (!t?.id) return undefined;
    const winId = await getActiveWindowId(ctx);
    const all = await getWindowTabs(ctx.chrome, winId);
    const index = all.findIndex((tab) => tab.id === t.id) + 1;
    return { id: t.id, index: index || 1, title: t.title };
  }

  const cross = arg.match(/^(\d+)@(\d+)$/);
  if (cross) {
    const winRef = await resolveWindowRef(cross[2], ctx);
    if (!winRef) return undefined;
    const sorted = await getWindowTabs(ctx.chrome, winRef.id);
    const num = Number(cross[1]);
    if (num >= 1 && num <= sorted.length) {
      const t = sorted[num - 1]!;
      return { id: t.id, index: num, title: t.title, windowIndex: winRef.index };
    }
    return undefined;
  }

  const winId = await getActiveWindowId(ctx);
  const sorted = await getWindowTabs(ctx.chrome, winId);
  const num = Number(arg);
  if (!Number.isNaN(num)) {
    if (num >= 1 && num <= sorted.length) {
      const t = sorted[num - 1]!;
      return { id: t.id, index: num, title: t.title };
    }
    const inWindow = sorted.find((t) => t.id === num);
    if (inWindow) {
      return { id: inWindow.id, index: sorted.indexOf(inWindow) + 1, title: inWindow.title };
    }
    const remote = await ctx.chrome.tabs.get(num);
    if (remote) {
      const remoteTabs = await getWindowTabs(ctx.chrome, remote.windowId);
      const index = remoteTabs.findIndex((t) => t.id === remote.id) + 1;
      return { id: remote.id, index: index || 0, title: remote.title };
    }
  }

  return undefined;
}

/** Parse tab # numbers from piped `tabs` output. */
export function parseTabIndicesFromPipe(text: string): number[] {
  const indices: number[] = [];
  for (const line of text.split('\n')) {
    const hash = line.match(/#(\d+)/);
    if (hash) {
      indices.push(Number(hash[1]));
      continue;
    }
    const start = line.match(/^\s*[●P]?\s*(\d+)\s/);
    if (start) indices.push(Number(start[1]));
  }
  return [...new Set(indices)];
}

export async function tabErrorMessage(arg: string, ctx: ExecutionContext): Promise<string> {
  const winId = await getActiveWindowId(ctx);
  const sorted = await getWindowTabs(ctx.chrome, winId);
  if (sorted.length === 0) return 'No tabs in this window.';
  const names = sorted.slice(0, 5).map((t, i) => `#${i + 1} ${t.title.slice(0, 20)}`).join(', ');
  return `Tab "${arg}" not found. Run 'tabs' — this window has ${sorted.length} tab(s): ${names}${sorted.length > 5 ? '…' : ''}`;
}

/** Legacy sync helper — prefer tabErrorMessage(ctx). */
export function tabErrorMessageSync(arg: string, sorted: TabInfo[]): string {
  if (sorted.length === 0) return 'No tabs in this window.';
  const names = sorted.slice(0, 5).map((t, i) => `#${i + 1} ${t.title.slice(0, 20)}`).join(', ');
  return `Tab "${arg}" not found. Run 'tabs' — this window has ${sorted.length} tab(s): ${names}${sorted.length > 5 ? '…' : ''}`;
}