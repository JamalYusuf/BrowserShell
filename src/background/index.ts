/** Service worker — Quake-style overlay toggle + tab/window actions for global hotkeys. */

import { DEFAULT_CONFIG, ensureRcDefaults, loadConfig } from '@/shared/storage';
import { fetchWeatherLine } from '@/shared/weather';

function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:')
  );
}

/** Per-window previous active tab for ^ (tab-previous). */
const lastActiveTab = new Map<number, number>();
const previousTabByWindow = new Map<number, number>();

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  const prev = lastActiveTab.get(windowId);
  if (prev !== undefined && prev !== tabId) {
    previousTabByWindow.set(windowId, prev);
  }
  lastActiveTab.set(windowId, tabId);
});

async function sendToActiveTab(message: Record<string, unknown>): Promise<boolean> {
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.id || isRestrictedUrl(tab.url)) return false;
  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/overlay.js'],
      });
      await chrome.tabs.sendMessage(tab.id, message);
      return true;
    } catch {
      return false;
    }
  }
}

async function toggleOverlay(tabId?: number): Promise<void> {
  const config = await loadConfig();
  if (!config.overlayEnabled) return;

  const id =
    tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

  if (!id) return;

  const tab = await chrome.tabs.get(id);
  if (isRestrictedUrl(tab.url)) return;

  try {
    await chrome.tabs.sendMessage(id, { type: 'toggle-overlay' });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: id },
        files: ['content/overlay.js'],
      });
      await chrome.tabs.sendMessage(id, { type: 'toggle-overlay' });
    } catch {
      // Overlay unavailable on this page
    }
  }
}

function requestPageFocus(tabId: number): void {
  const delays = [0, 80, 200, 500, 1000];
  for (const delay of delays) {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'focus-page' }).catch(() => {
        if (delay === 0) {
          chrome.scripting
            .executeScript({ target: { tabId }, files: ['content/overlay.js'] })
            .then(() => chrome.tabs.sendMessage(tabId, { type: 'focus-page' }))
            .catch(() => {});
        }
      });
    }, delay);
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  requestPageFocus(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    requestPageFocus(tabId);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) toggleOverlay(tab.id).catch(() => {});
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel' || command === 'toggle-overlay') {
    toggleOverlay().catch(() => {});
  }
});

function downloadsAction(action: 'open' | 'show', id: number): { ok: boolean; error?: string } {
  if (action === 'open') {
    chrome.downloads.open(id);
  } else {
    chrome.downloads.show(id);
  }
  const err = chrome.runtime.lastError;
  if (err) return { ok: false, error: err.message };
  return { ok: true };
}

interface OmnibarItem {
  id: string;
  type: 'tab' | 'bookmark' | 'history' | 'url';
  title: string;
  url: string;
  tabId?: number;
  windowId?: number;
}

async function flattenBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  const out: chrome.bookmarks.BookmarkTreeNode[] = [];
  const walk = (list: chrome.bookmarks.BookmarkTreeNode[]) => {
    for (const n of list) {
      if (n.url) out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0;
  let ti = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx < 0) return 0;
    score += 5;
    ti = idx + 1;
  }
  return score;
}

async function omnibarSearch(
  query: string,
  source: 'all' | 'bookmarks' | 'tabs',
  limit = 12,
): Promise<OmnibarItem[]> {
  const items: OmnibarItem[] = [];
  const q = query.trim();

  if (source === 'all' || source === 'tabs') {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      const title = tab.title || tab.url;
      const score = fuzzyScore(`${title} ${tab.url}`, q);
      if (!q || score > 0) {
        items.push({
          id: `tab-${tab.id}`,
          type: 'tab',
          title,
          url: tab.url,
          tabId: tab.id,
          windowId: tab.windowId,
        });
      }
    }
  }

  if (source === 'all' || source === 'bookmarks') {
    const bookmarks = q
      ? await chrome.bookmarks.search(q)
      : await flattenBookmarks(await chrome.bookmarks.getTree());
    for (const bm of bookmarks.slice(0, 40)) {
      if (!bm.url) continue;
      items.push({
        id: `bm-${bm.id}`,
        type: 'bookmark',
        title: bm.title || bm.url,
        url: bm.url,
      });
    }
  }

  if (source === 'all' && q) {
    const history = await chrome.history.search({ text: q, maxResults: 20 });
    for (const h of history) {
      if (!h.url) continue;
      items.push({
        id: `hist-${h.id}`,
        type: 'history',
        title: h.title || h.url,
        url: h.url,
      });
    }
  }

  if (q && /^[\w.-]+\.[a-z]{2,}/i.test(q) && !q.includes(' ')) {
    const url = q.startsWith('http') ? q : `https://${q}`;
    items.unshift({ id: 'typed-url', type: 'url', title: `Open ${url}`, url });
  }

  const ranked = items
    .map((item) => ({
      item,
      score: fuzzyScore(`${item.title} ${item.url}`, q),
    }))
    .filter((x) => !q || x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);

  return ranked;
}

async function handleTabMessage(
  type: string,
  sender: chrome.runtime.MessageSender,
  extra?: { url?: string; index?: number; tabId?: number; windowId?: number },
): Promise<{ ok: boolean }> {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;

  switch (type) {
    case 'tab-new': {
      await chrome.tabs.create({ url: extra?.url ?? 'about:blank', active: true });
      return { ok: true };
    }
    case 'tab-new-url': {
      if (!extra?.url) return { ok: false };
      await chrome.tabs.create({ url: extra.url, active: true });
      return { ok: true };
    }
    case 'tab-close': {
      if (tabId) await chrome.tabs.remove(tabId);
      return { ok: !!tabId };
    }
    case 'tab-next':
    case 'tab-prev': {
      if (!tabId || windowId === undefined) return { ok: false };
      const tabs = await chrome.tabs.query({ windowId });
      const idx = tabs.findIndex((t) => t.id === tabId);
      const next = type === 'tab-next' ? idx + 1 : idx - 1;
      const target = tabs[next];
      if (target?.id) await chrome.tabs.update(target.id, { active: true });
      return { ok: !!target?.id };
    }
    case 'tab-first':
    case 'tab-goto': {
      if (windowId === undefined) return { ok: false };
      const tabs = await chrome.tabs.query({ windowId });
      const idx = type === 'tab-goto' ? (extra?.index ?? 1) - 1 : 0;
      const target = tabs[idx];
      if (target?.id) await chrome.tabs.update(target.id, { active: true });
      return { ok: !!target?.id };
    }
    case 'tab-activate': {
      const { tabId: tid, windowId: wid } = extra ?? {};
      if (!tid) return { ok: false };
      if (wid) await chrome.windows.update(wid, { focused: true });
      await chrome.tabs.update(tid, { active: true });
      return { ok: true };
    }
    case 'tab-last': {
      if (windowId === undefined) return { ok: false };
      const tabs = await chrome.tabs.query({ windowId });
      const last = tabs[tabs.length - 1];
      if (last?.id) await chrome.tabs.update(last.id, { active: true });
      return { ok: !!last?.id };
    }
    case 'tab-previous': {
      if (windowId === undefined) return { ok: false };
      const prev = previousTabByWindow.get(windowId);
      if (prev) {
        await chrome.tabs.update(prev, { active: true });
        return { ok: true };
      }
      return { ok: false };
    }
    case 'tab-restore': {
      const closed = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
      const entry = closed[0] as (chrome.sessions.Session & { sessionId?: string }) | undefined;
      const sessionId = entry?.sessionId;
      if (sessionId) {
        await chrome.sessions.restore(sessionId);
        return { ok: true };
      }
      return { ok: false };
    }
    case 'tab-duplicate': {
      if (!tabId) return { ok: false };
      await chrome.tabs.duplicate(tabId);
      return { ok: true };
    }
    case 'tab-pin-toggle': {
      if (!tabId) return { ok: false };
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { pinned: !tab.pinned });
      return { ok: true };
    }
    case 'tab-move-window': {
      if (!tabId) return { ok: false };
      await chrome.windows.create({ tabId, focused: true });
      return { ok: true };
    }
    case 'window-next':
    case 'window-prev': {
      const wins = await chrome.windows.getAll({ windowTypes: ['normal'] });
      const focused = wins.find((w) => w.focused) ?? wins[0];
      if (!focused?.id) return { ok: false };
      const idx = wins.findIndex((w) => w.id === focused.id);
      const nextIdx = type === 'window-next'
        ? (idx + 1) % wins.length
        : (idx - 1 + wins.length) % wins.length;
      const target = wins[nextIdx];
      if (target?.id) await chrome.windows.update(target.id, { focused: true });
      return { ok: !!target?.id };
    }
    default:
      return { ok: false };
  }
}

const TAB_ACTIONS = new Set([
  'tab-new',
  'tab-new-url',
  'tab-close',
  'tab-next',
  'tab-prev',
  'tab-first',
  'tab-goto',
  'tab-last',
  'tab-previous',
  'tab-restore',
  'tab-duplicate',
  'tab-pin-toggle',
  'tab-move-window',
  'tab-activate',
  'window-next',
  'window-prev',
]);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-host-tab-id') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }
  if (msg.type === 'welcome-weather') {
    fetchWeatherLine()
      .then((weather) => sendResponse({ weather }))
      .catch(() => sendResponse({ weather: null }));
    return true;
  }
  if (msg.type === 'downloads-action' && typeof msg.id === 'number') {
    const action = msg.action === 'show' ? 'show' : 'open';
    sendResponse(downloadsAction(action, msg.id));
    return true;
  }
  if (typeof msg.type === 'string' && TAB_ACTIONS.has(msg.type)) {
    handleTabMessage(msg.type, sender, {
      url: msg.url,
      index: msg.index,
      tabId: msg.tabId,
      windowId: msg.windowId,
    }).then((res) => sendResponse(res));
    return true;
  }
  if (msg.type === 'omnibar-search') {
    omnibarSearch(msg.query ?? '', msg.source ?? 'all', msg.limit ?? 12)
      .then((items) => sendResponse({ items }))
      .catch(() => sendResponse({ items: [] }));
    return true;
  }
  if (msg.type === 'overlay-show') {
    sendToActiveTab({ type: 'overlay-show' }).then((ok) => sendResponse({ ok }));
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    const existing = await chrome.storage.local.get('config');
    const stored = existing.config as typeof DEFAULT_CONFIG | undefined;
    await chrome.storage.local.set({
      config: ensureRcDefaults({
        ...DEFAULT_CONFIG,
        ...stored,
      }),
    });
  }
});