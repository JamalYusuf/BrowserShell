import type { CommandResult, ExecutionContext } from '@/shared/types';
import { success } from '@/shell/output';
import { getActiveWindowId, getWindowTabs } from './tab-utils';
import { getAllWindows } from './window-utils';
import { truncateTitle } from './text';

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, '') + u.search;
  } catch {
    return url;
  }
}

export async function currentTab(ctx: ExecutionContext) {
  const hostId = ctx.getHostTabId?.();
  if (hostId !== undefined) {
    const tab = await ctx.chrome.tabs.get(hostId);
    if (tab) return tab;
  }
  const tabs = await ctx.chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

export async function focusOrOpenUrl(url: string, ctx: ExecutionContext): Promise<CommandResult> {
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