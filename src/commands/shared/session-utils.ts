import type { ChromeAPI } from '@/chrome/api';
import type { SavedSession, SavedTab, SavedWindow } from '@/shared/session-store';

const RESTORABLE_URL = /^(https?|file):/i;

export async function captureLiveSession(chrome: ChromeAPI): Promise<SavedWindow[]> {
  const tabs = await chrome.tabs.query({});
  const byWindow = new Map<number, SavedTab[]>();

  for (const tab of tabs) {
    const url = tab.url ?? '';
    if (!RESTORABLE_URL.test(url)) continue;
    const list = byWindow.get(tab.windowId) ?? [];
    list.push({ url, pinned: tab.pinned, active: tab.active });
    byWindow.set(tab.windowId, list);
  }

  return [...byWindow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, winTabs]) => ({
      tabs: winTabs.sort((a, b) => Number(b.active) - Number(a.active)),
    }))
    .filter((w) => w.tabs.length > 0);
}

export async function restoreSavedSession(chrome: ChromeAPI, session: SavedSession): Promise<number> {
  let tabCount = 0;

  for (const win of session.windows) {
    if (!win.tabs.length) continue;
    const [first, ...rest] = win.tabs;
    const created = await chrome.windows.create({
      url: first!.url,
      focused: false,
    });
    tabCount++;
    if (first!.pinned) {
      const tabs = await chrome.tabs.query({ windowId: created.id });
      const t = tabs[0];
      if (t) await chrome.tabs.update(t.id, { pinned: true });
    }

    for (const tab of rest) {
      await chrome.tabs.create({
        windowId: created.id,
        url: tab.url,
        active: false,
        pinned: tab.pinned,
      });
      tabCount++;
    }
  }

  return tabCount;
}

export function sessionSummary(session: SavedSession): string {
  const tabs = session.windows.reduce((n, w) => n + w.tabs.length, 0);
  const when = new Date(session.savedAt).toLocaleString();
  return `${session.name} — ${session.windows.length} window(s), ${tabs} tab(s) — saved ${when}`;
}