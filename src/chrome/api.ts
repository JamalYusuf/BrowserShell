/** Thin, mockable wrapper over chrome.* APIs. */

import { PAGE_SCRIPT_REGISTRY } from '@/commands/shared/page-script-registry';

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  active: boolean;
  pinned: boolean;
  muted?: boolean;
  audible?: boolean;
  windowId: number;
  index: number;
}

export interface WindowInfo {
  id: number;
  focused: boolean;
  tabCount: number;
  title?: string;
  type: string;
  state: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: BookmarkNode[];
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
}

export interface DownloadInfo {
  id: number;
  filename: string;
  url: string;
  state: string;
  bytesReceived: number;
  totalBytes: number;
  startTime: number;
  exists: boolean;
}

export interface CookieDetails {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  session: boolean;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  type: string;
  description?: string;
  homePageUrl?: string;
  optionsUrl?: string;
}

export interface BrowsingDataTypes {
  cache?: boolean;
  cacheStorage?: boolean;
  cookies?: boolean;
  downloads?: boolean;
  fileSystems?: boolean;
  formData?: boolean;
  history?: boolean;
  indexedDB?: boolean;
  localStorage?: boolean;
  passwords?: boolean;
  serviceWorkers?: boolean;
}

export interface RecentlyClosedEntry {
  sessionId: string;
  tab?: { title: string; url?: string };
  window?: { tabs?: { title?: string; url?: string; active?: boolean }[] };
}

export interface ChromeAPI {
  windows: {
    query(query: chrome.windows.QueryOptions): Promise<WindowInfo[]>;
    get(windowId: number): Promise<WindowInfo | undefined>;
    create(props: chrome.windows.CreateData): Promise<WindowInfo>;
    remove(windowId: number): Promise<void>;
    update(windowId: number, props: chrome.windows.UpdateInfo): Promise<WindowInfo | undefined>;
  };
  tabs: {
    query(query: chrome.tabs.QueryInfo): Promise<TabInfo[]>;
    get(tabId: number): Promise<TabInfo | undefined>;
    create(props: chrome.tabs.CreateProperties): Promise<TabInfo>;
    remove(tabIds: number | number[]): Promise<void>;
    update(tabId: number, props: chrome.tabs.UpdateProperties): Promise<TabInfo | undefined>;
    duplicate(tabId: number): Promise<TabInfo | undefined>;
    move(tabId: number, props: { windowId: number; index?: number }): Promise<TabInfo | undefined>;
    reload(tabId: number, options?: { bypassCache?: boolean }): Promise<void>;
    discard(tabId: number): Promise<void>;
    goBack(tabId: number): Promise<void>;
    goForward(tabId: number): Promise<void>;
    getZoom(tabId: number): Promise<number>;
    setZoom(tabId: number, zoomFactor: number): Promise<void>;
    captureVisibleTab(windowId?: number): Promise<string>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
  bookmarks: {
    getTree(): Promise<BookmarkNode[]>;
    search(query: string): Promise<BookmarkNode[]>;
    create(props: { parentId?: string; title?: string; url?: string }): Promise<BookmarkNode>;
    remove(id: string): Promise<void>;
    get(id: string): Promise<BookmarkNode[]>;
  };
  history: {
    search(query: { text: string; maxResults?: number; startTime?: number; endTime?: number }): Promise<HistoryItem[]>;
    deleteUrl(url: string): Promise<void>;
    deleteRange(range: { startTime: number; endTime: number }): Promise<void>;
  };
  browsingData: {
    remove(
      options: { origins?: string[]; since?: number },
      dataToRemove: BrowsingDataTypes
    ): Promise<void>;
  };
  downloads: {
    search(query: chrome.downloads.DownloadQuery): Promise<DownloadInfo[]>;
    open(id: number): Promise<void>;
    show(id: number): Promise<void>;
    erase(query: chrome.downloads.DownloadQuery): Promise<number[]>;
    removeFile(id: number): Promise<void>;
    showDefaultFolder(): Promise<void>;
  };
  cookies: {
    getAll(details: { domain?: string; url?: string }): Promise<CookieDetails[]>;
  };
  management: {
    getAll(): Promise<ExtensionInfo[]>;
    setEnabled(id: string, enabled: boolean): Promise<void>;
    openOptionsPage(id: string): Promise<void>;
  };
  sessions: {
    getRecentlyClosed(maxResults?: number | boolean): Promise<RecentlyClosedEntry[]>;
    restore(sessionId: string): Promise<RecentlyClosedEntry | undefined>;
  };
  contentSettings: {
    get(
      details: { primaryUrl?: string; resourceIdentifier?: { id: string }; incognito?: boolean },
      name: string
    ): Promise<{ setting: string }>;
    set(
      details: { primaryUrl?: string; resourceIdentifier?: { id: string }; incognito?: boolean },
      name: string,
      value: string
    ): Promise<void>;
    clear(details: { scope?: string }, name: string): Promise<void>;
  };
  scripting: {
    executeScript<R>(tabId: number, func: (...args: unknown[]) => R, ...args: unknown[]): Promise<R>;
    executePageScript<R>(tabId: number, scriptName: string, args: unknown[]): Promise<R | undefined>;
    injectContentScript(tabId: number, files: string[]): Promise<void>;
  };
  system?: {
    display: {
      getInfo(): Promise<
        {
          id: string;
          isPrimary?: boolean;
          workArea?: { left: number; top: number; width: number; height: number };
        }[]
      >;
    };
  };
  ai?: {
    summarizer?: {
      available(): Promise<'readily' | 'after-download' | 'no'>;
      create(options?: { type?: string; length?: string }): Promise<SummarizerSession>;
    };
    prompt?: {
      available(): Promise<'readily' | 'after-download' | 'no'>;
      create(options?: { systemPrompt?: string }): Promise<PromptSession>;
    };
  };
}

export interface SummarizerSession {
  summarize(text: string, options?: { context?: string }): Promise<string>;
  destroy(): void;
}

export interface PromptSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

function mapTab(tab: chrome.tabs.Tab): TabInfo {
  return {
    id: tab.id!,
    title: tab.title || '(untitled)',
    url: tab.url || '',
    active: tab.active ?? false,
    pinned: tab.pinned ?? false,
    muted: tab.mutedInfo?.muted,
    audible: tab.audible,
    windowId: tab.windowId!,
    index: tab.index ?? 0,
  };
}

function mapWindow(win: chrome.windows.Window): WindowInfo {
  return {
    id: win.id!,
    focused: win.focused ?? false,
    tabCount: win.tabs?.length ?? 0,
    title: win.tabs?.find((t) => t.active)?.title,
    type: win.type ?? 'normal',
    state: win.state ?? 'normal',
    left: win.left,
    top: win.top,
    width: win.width,
    height: win.height,
  };
}

function mapBookmark(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    parentId: node.parentId,
    children: node.children?.map(mapBookmark),
  };
}

function mapHistory(item: chrome.history.HistoryItem): HistoryItem {
  return {
    id: item.id!,
    url: item.url!,
    title: item.title || item.url!,
    lastVisitTime: item.lastVisitTime ?? 0,
    visitCount: item.visitCount ?? 0,
  };
}

async function invokeDownloadsAction(action: 'open' | 'show', id: number): Promise<void> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'downloads-action', action, id })) as
      | { ok?: boolean; error?: string }
      | undefined;
    if (res?.ok) return;
    if (res?.error) throw new Error(res.error);
  } catch (e) {
    if (e instanceof Error && e.message.includes('Receiving end does not exist')) {
      // Tests or missing background — fall through to direct call
    } else if (e instanceof Error && !e.message.includes('Could not establish connection')) {
      throw e;
    }
  }

  if (action === 'open') {
    chrome.downloads.open(id);
  } else {
    chrome.downloads.show(id);
  }
  const err = chrome.runtime.lastError;
  if (err) throw new Error(err.message);
}

function mapDownload(item: chrome.downloads.DownloadItem): DownloadInfo {
  return {
    id: item.id,
    filename: item.filename || item.url || '(unknown)',
    url: item.url || '',
    state: item.state || 'unknown',
    bytesReceived: item.bytesReceived ?? 0,
    totalBytes: item.totalBytes ?? 0,
    startTime: item.startTime ? new Date(item.startTime).getTime() : 0,
    exists: item.exists ?? false,
  };
}

export function createChromeAPI(): ChromeAPI {
  const ai = (chrome as unknown as { ai?: ChromeAPI['ai'] }).ai;

  return {
    windows: {
      query: async (query) => {
        const wins = await chrome.windows.getAll(query);
        return wins.filter((w) => w.id !== undefined).map(mapWindow);
      },
      get: async (windowId) => {
        try {
          const win = await chrome.windows.get(windowId, { populate: true });
          return mapWindow(win);
        } catch {
          return undefined;
        }
      },
      create: async (props) => mapWindow(await chrome.windows.create(props)),
      remove: (windowId) => chrome.windows.remove(windowId),
      update: async (windowId, props) => {
        const win = await chrome.windows.update(windowId, props);
        return win ? mapWindow(win) : undefined;
      },
    },
    tabs: {
      query: async (query) => {
        const tabs = await chrome.tabs.query(query);
        return tabs.filter((t) => t.id !== undefined).map(mapTab);
      },
      get: async (tabId) => {
        try {
          const tab = await chrome.tabs.get(tabId);
          return mapTab(tab);
        } catch {
          return undefined;
        }
      },
      create: async (props) => mapTab(await chrome.tabs.create(props)),
      remove: async (tabIds) => {
        if (Array.isArray(tabIds)) await chrome.tabs.remove(tabIds);
        else await chrome.tabs.remove(tabIds);
      },
      update: async (tabId, props) => {
        const tab = await chrome.tabs.update(tabId, props);
        return tab ? mapTab(tab) : undefined;
      },
      duplicate: async (tabId) => {
        const tab = await chrome.tabs.duplicate(tabId);
        return tab ? mapTab(tab) : undefined;
      },
      move: async (tabId, props) => {
        const moveProps: chrome.tabs.MoveProperties = { windowId: props.windowId, index: props.index ?? -1 };
        const tab = await chrome.tabs.move(tabId, moveProps);
        const moved = Array.isArray(tab) ? tab[0] : tab;
        return moved ? mapTab(moved) : undefined;
      },
      reload: async (tabId, options) => {
        await chrome.tabs.reload(tabId, options?.bypassCache ? { bypassCache: true } : undefined);
      },
      discard: async (tabId) => {
        await chrome.tabs.discard(tabId);
      },
      goBack: async (tabId) => {
        await chrome.tabs.goBack(tabId);
      },
      goForward: async (tabId) => {
        await chrome.tabs.goForward(tabId);
      },
      getZoom: async (tabId) => chrome.tabs.getZoom(tabId),
      setZoom: async (tabId, zoomFactor) => {
        await chrome.tabs.setZoom(tabId, zoomFactor);
      },
      captureVisibleTab: async (windowId) => {
        if (windowId !== undefined) {
          return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
        }
        return chrome.tabs.captureVisibleTab({ format: 'png' });
      },
      sendMessage: async (tabId, message) => chrome.tabs.sendMessage(tabId, message),
    },
    bookmarks: {
      getTree: async () => {
        const tree = await chrome.bookmarks.getTree();
        return tree.map(mapBookmark);
      },
      search: async (query) => {
        const results = await chrome.bookmarks.search(query);
        return results.map(mapBookmark);
      },
      create: async (props) => mapBookmark(await chrome.bookmarks.create(props)),
      remove: (id) => chrome.bookmarks.remove(id),
      get: async (id) => {
        const nodes = await chrome.bookmarks.get(id);
        return nodes.map(mapBookmark);
      },
    },
    history: {
      search: async (query) => {
        const items = await chrome.history.search(query);
        return items.map(mapHistory);
      },
      deleteUrl: (url) => chrome.history.deleteUrl({ url }),
      deleteRange: (range) => chrome.history.deleteRange(range),
    },
    browsingData: {
      remove: (options, dataToRemove) => chrome.browsingData.remove(options, dataToRemove),
    },
    downloads: {
      search: async (query) => {
        const items = await chrome.downloads.search(query);
        return items.map(mapDownload);
      },
      open: (id) => invokeDownloadsAction('open', id),
      show: (id) => invokeDownloadsAction('show', id),
      erase: (query) => chrome.downloads.erase(query),
      removeFile: (id) => chrome.downloads.removeFile(id),
      showDefaultFolder: () => new Promise((resolve) => {
        chrome.downloads.showDefaultFolder();
        resolve();
      }),
    },
    cookies: {
      getAll: async (details) => {
        const items = await chrome.cookies.getAll(details);
        return items.map((c) => ({
          name: c.name,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          session: c.session,
        }));
      },
    },
    sessions: {
      getRecentlyClosed: async (maxResults) => {
        const sessions = await chrome.sessions.getRecentlyClosed(
          typeof maxResults === 'number' ? { maxResults } : undefined
        );
        return sessions.map((s) => {
          const entry = s as chrome.sessions.Session & { sessionId?: string };
          return {
            sessionId: entry.sessionId ?? '',
            tab: entry.tab ? { title: entry.tab.title ?? '', url: entry.tab.url } : undefined,
            window: entry.window
              ? {
                  tabs: entry.window.tabs?.map((t) => ({
                    title: t.title,
                    url: t.url,
                    active: t.active,
                  })),
                }
              : undefined,
          };
        });
      },
      restore: async (sessionId) => {
        const restored = await chrome.sessions.restore(sessionId);
        if (!restored) return undefined;
        return {
          sessionId,
          tab: restored.tab ? { title: restored.tab.title ?? '', url: restored.tab.url } : undefined,
        };
      },
    },
    contentSettings: {
      get: (details, name) =>
        new Promise((resolve) => {
          const api = (chrome.contentSettings as unknown as Record<string, {
            get: (d: object, cb: (r: { setting?: string }) => void) => void;
          }>)[name];
          if (!api) {
            resolve({ setting: 'default' });
            return;
          }
          api.get(details, (result) => resolve({ setting: String(result.setting ?? 'default') }));
        }),
      set: (details, name, value) =>
        new Promise((resolve) => {
          const api = (chrome.contentSettings as unknown as Record<string, {
            set: (d: object, cb?: () => void) => void;
          }>)[name];
          if (!api) {
            resolve();
            return;
          }
          api.set({ ...details, setting: value }, () => resolve());
        }),
      clear: (details, name) =>
        new Promise((resolve) => {
          const api = (chrome.contentSettings as unknown as Record<string, {
            clear: (d: object, cb?: () => void) => void;
          }>)[name];
          if (!api) {
            resolve();
            return;
          }
          api.clear(details, () => resolve());
        }),
    },
    management: {
      getAll: async () => {
        const items = await chrome.management.getAll();
        return items.map((ext) => ({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          enabled: ext.enabled,
          type: ext.type,
          description: ext.description,
          homePageUrl: ext.homepageUrl,
          optionsUrl: ext.optionsUrl,
        }));
      },
      setEnabled: (id, enabled) => chrome.management.setEnabled(id, enabled),
      openOptionsPage: (id) => new Promise((resolve) => {
        const mgmt = chrome.management as typeof chrome.management & {
          openOptionsPage?: (extensionId: string, callback?: () => void) => void;
        };
        if (mgmt.openOptionsPage) {
          mgmt.openOptionsPage(id, () => resolve());
        } else {
          resolve();
        }
      }),
    },
    scripting: {
      executeScript: async (tabId, func, ...args) => {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: func as (...a: unknown[]) => unknown,
          args,
        });
        return results[0]?.result as never;
      },
      injectContentScript: async (tabId, files) => {
        await chrome.scripting.executeScript({ target: { tabId }, files });
      },
      executePageScript: async (tabId, scriptName, args) => {
        const check = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => typeof (globalThis as { __bsPage_dispatch?: unknown }).__bsPage_dispatch === 'function',
        });
        if (!check[0]?.result) {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['page/inject.js'],
            world: 'MAIN',
          });
        }
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: (name: string, callArgs: unknown[]) =>
            (globalThis as unknown as { __bsPage_dispatch: (n: string, a: unknown[]) => unknown }).__bsPage_dispatch(
              name,
              callArgs
            ),
          args: [scriptName, args],
        });
        return results[0]?.result as never;
      },
    },
    system: chrome.system?.display
      ? {
          display: {
            getInfo: () =>
              new Promise((resolve) => {
                chrome.system.display.getInfo((displays) => {
                  resolve(
                    displays.map((d) => ({
                      id: d.id,
                      isPrimary: d.isPrimary,
                      workArea: d.workArea
                        ? {
                            left: d.workArea.left,
                            top: d.workArea.top,
                            width: d.workArea.width,
                            height: d.workArea.height,
                          }
                        : undefined,
                    })),
                  );
                });
              }),
          },
        }
      : undefined,
    ai: ai
      ? {
          summarizer: ai.summarizer
            ? {
                available: () => ai.summarizer!.available(),
                create: (options) => ai.summarizer!.create(options),
              }
            : undefined,
          prompt: ai.prompt
            ? {
                available: () => ai.prompt!.available(),
                create: (options) => ai.prompt!.create(options),
              }
            : undefined,
        }
      : undefined,
  };
}

/** Mock Chrome API for testing. */
export function createMockChromeAPI(overrides: Partial<ChromeAPI> = {}): ChromeAPI {
  const defaultTabs: TabInfo[] = [
    { id: 1, title: 'Example', url: 'https://example.com', active: true, pinned: false, audible: false, windowId: 1, index: 0 },
    { id: 2, title: 'GitHub', url: 'https://github.com', active: false, pinned: true, audible: true, windowId: 1, index: 1 },
    { id: 3, title: 'Gmail', url: 'https://mail.google.com', active: true, pinned: false, audible: false, windowId: 2, index: 0 },
  ];

  const defaultWindows: WindowInfo[] = [
    { id: 1, focused: true, tabCount: 2, title: 'Example', type: 'normal', state: 'normal' },
    { id: 2, focused: false, tabCount: 1, title: 'Gmail', type: 'normal', state: 'normal' },
  ];

  const base: ChromeAPI = {
    windows: {
      query: async () => defaultWindows,
      get: async (id) => defaultWindows.find((w) => w.id === id),
      create: async (_props) => ({
        id: 99,
        focused: true,
        tabCount: 1,
        title: 'New Window',
        type: 'normal',
        state: 'normal',
      }),
      remove: async () => {},
      update: async (id, props) => {
        const w = defaultWindows.find((x) => x.id === id);
        return w ? { ...w, focused: props.focused ?? w.focused } : undefined;
      },
    },
    tabs: {
      query: async (q) => {
        let tabs = defaultTabs;
        if (q.windowId !== undefined) tabs = tabs.filter((t) => t.windowId === q.windowId);
        if (q.currentWindow) tabs = tabs.filter((t) => t.windowId === 1);
        if (q.active) tabs = tabs.filter((t) => t.active);
        if (q.audible) tabs = tabs.filter((t) => t.audible);
        if (q.pinned) tabs = tabs.filter((t) => t.pinned);
        return tabs;
      },
      get: async (id) => defaultTabs.find((t) => t.id === id),
      create: async (props) => ({
        id: 99,
        title: 'New Tab',
        url: props.url || 'chrome://newtab',
        active: true,
        pinned: false,
        windowId: 1,
        index: 2,
      }),
      remove: async () => {},
      update: async (id, props) => {
        const tab = defaultTabs.find((t) => t.id === id);
        return tab
          ? {
              ...tab,
              url: (props.url as string) ?? tab.url,
              active: props.active ?? tab.active,
              pinned: props.pinned ?? tab.pinned,
              muted: props.muted ?? tab.muted,
            }
          : undefined;
      },
      duplicate: async (id) => {
        const tab = defaultTabs.find((t) => t.id === id);
        return tab ? { ...tab, id: 100 } : undefined;
      },
      move: async (id, props) => {
        const tab = defaultTabs.find((t) => t.id === id);
        if (!tab) return undefined;
        const moved = { ...tab, windowId: props.windowId };
        return moved;
      },
      reload: async () => {},
      discard: async () => {},
      goBack: async () => {},
      goForward: async () => {},
      getZoom: async () => 1,
      setZoom: async () => {},
      captureVisibleTab: async () => 'data:image/png;base64,mock',
      sendMessage: async () => ({}),
    },
    bookmarks: {
      getTree: async () => [
        {
          id: '0',
          title: '',
          children: [
            {
              id: '1',
              title: 'Bookmarks bar',
              children: [
                {
                  id: '10',
                  title: 'Work',
                  children: [
                    { id: '2', title: 'Project', url: 'https://project.com' },
                    { id: '11', title: 'Docs', url: 'https://docs.example.com' },
                  ],
                },
                { id: '12', title: 'Personal', url: 'https://personal.example.com' },
              ],
            },
          ],
        },
      ],
      search: async () => [{ id: '2', title: 'Project', url: 'https://project.com' }],
      create: async (props) => ({ id: '3', title: props.title || 'New', url: props.url }),
      remove: async () => {},
      get: async () => [{ id: '2', title: 'Project', url: 'https://project.com' }],
    },
    history: {
      search: async ({ text, startTime, endTime, maxResults }) => {
        const all = [
          { id: '1', url: 'https://example.com', title: 'Example', lastVisitTime: Date.now(), visitCount: 5 },
          { id: '2', url: 'https://github.com/user', title: 'GitHub', lastVisitTime: Date.now() - 3600000, visitCount: 12 },
          { id: '3', url: 'https://github.com/other', title: 'Other', lastVisitTime: Date.now() - 86400000 * 2, visitCount: 2 },
        ];
        let items = all;
        if (startTime !== undefined) items = items.filter((i) => i.lastVisitTime >= startTime);
        if (endTime !== undefined) items = items.filter((i) => i.lastVisitTime < endTime);
        if (text) {
          const lower = text.toLowerCase();
          items = items.filter((i) => i.title.toLowerCase().includes(lower) || i.url.toLowerCase().includes(lower));
        }
        return items.slice(0, maxResults ?? items.length);
      },
      deleteUrl: async () => {},
      deleteRange: async () => {},
    },
    browsingData: {
      remove: async () => {},
    },
    downloads: {
      search: async () => [
        {
          id: 1,
          filename: 'report.pdf',
          url: 'https://example.com/report.pdf',
          state: 'complete',
          bytesReceived: 1024000,
          totalBytes: 1024000,
          startTime: Date.now() - 3600000,
          exists: true,
        },
        {
          id: 2,
          filename: 'photo.jpg',
          url: 'https://cdn.example.com/photo.jpg',
          state: 'complete',
          bytesReceived: 512000,
          totalBytes: 512000,
          startTime: Date.now() - 7200000,
          exists: true,
        },
      ],
      open: async () => {},
      show: async () => {},
      erase: async () => [1, 2],
      removeFile: async () => {},
      showDefaultFolder: async () => {},
    },
    cookies: {
      getAll: async ({ domain }) => {
        if (!domain || domain.includes('example.com')) {
          return [
            { name: 'session', domain: '.example.com', path: '/', secure: true, httpOnly: true, session: false },
            { name: 'prefs', domain: 'example.com', path: '/', secure: false, httpOnly: false, session: true },
          ];
        }
        return [];
      },
    },
    sessions: {
      getRecentlyClosed: async () => [
        {
          sessionId: 'sess-1',
          tab: { title: 'Example Page', url: 'https://example.com/page' },
        },
        {
          sessionId: 'sess-2',
          window: {
            tabs: [
              { title: 'GitHub', url: 'https://github.com', active: true },
              { title: 'Docs', url: 'https://docs.example.com', active: false },
            ],
          },
        },
      ],
      restore: async (sessionId) => ({
        sessionId,
        tab: { title: 'Restored', url: 'https://example.com' },
      }),
    },
    contentSettings: {
      get: async (_details, name) => ({ setting: name === 'notifications' ? 'ask' : 'allow' }),
      set: async () => {},
      clear: async () => {},
    },
    management: {
      getAll: async () => [
        {
          id: 'abc123',
          name: 'BrowserShell',
          version: '0.1.0',
          enabled: true,
          type: 'extension',
          description: 'A shell for your browser',
          optionsUrl: 'options/index.html',
        },
        {
          id: 'def456',
          name: 'uBlock Origin',
          version: '1.0.0',
          enabled: true,
          type: 'extension',
          description: 'Block ads',
        },
        {
          id: 'ghi789',
          name: 'Dark Reader',
          version: '4.9.0',
          enabled: false,
          type: 'extension',
        },
      ],
      setEnabled: async () => {},
      openOptionsPage: async () => {},
    },
    scripting: {
      executeScript: async (_tabId, func, ...args) => func(...args) as never,
      injectContentScript: async () => {},
      executePageScript: async (_tabId, scriptName, args) => {
        const fn = PAGE_SCRIPT_REGISTRY[scriptName as keyof typeof PAGE_SCRIPT_REGISTRY];
        if (!fn) throw new Error(`Unknown page script: ${scriptName}`);
        return fn(...args) as never;
      },
    },
    system: {
      display: {
        getInfo: async () => [
          {
            id: 'display-1',
            isPrimary: true,
            workArea: { left: 0, top: 25, width: 1440, height: 875 },
          },
        ],
      },
    },
    ai: undefined,
  };

  return {
    ...base,
    ...overrides,
    scripting: {
      ...base.scripting,
      ...overrides.scripting,
    },
  };
}