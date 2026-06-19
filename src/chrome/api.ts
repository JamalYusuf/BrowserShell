/** Thin, mockable wrapper over chrome.* APIs. */

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  active: boolean;
  pinned: boolean;
  muted?: boolean;
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
    reload(tabId: number): Promise<void>;
    goBack(tabId: number): Promise<void>;
    goForward(tabId: number): Promise<void>;
  };
  bookmarks: {
    getTree(): Promise<BookmarkNode[]>;
    search(query: string): Promise<BookmarkNode[]>;
    create(props: { parentId?: string; title?: string; url?: string }): Promise<BookmarkNode>;
    remove(id: string): Promise<void>;
    get(id: string): Promise<BookmarkNode[]>;
  };
  history: {
    search(query: { text: string; maxResults?: number; startTime?: number }): Promise<HistoryItem[]>;
  };
  scripting: {
    executeScript(tabId: number, func: () => string): Promise<string>;
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
      reload: async (tabId) => {
        await chrome.tabs.reload(tabId);
      },
      goBack: async (tabId) => {
        await chrome.tabs.goBack(tabId);
      },
      goForward: async (tabId) => {
        await chrome.tabs.goForward(tabId);
      },
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
    },
    scripting: {
      executeScript: async (tabId, func) => {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func,
        });
        return (results[0]?.result as string) ?? '';
      },
    },
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
    { id: 1, title: 'Example', url: 'https://example.com', active: true, pinned: false, windowId: 1, index: 0 },
    { id: 2, title: 'GitHub', url: 'https://github.com', active: false, pinned: false, windowId: 1, index: 1 },
    { id: 3, title: 'Gmail', url: 'https://mail.google.com', active: true, pinned: false, windowId: 2, index: 0 },
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
        if (q.windowId !== undefined) return defaultTabs.filter((t) => t.windowId === q.windowId);
        if (q.currentWindow) return defaultTabs.filter((t) => t.windowId === 1);
        if (q.active) return defaultTabs.filter((t) => t.active);
        return defaultTabs;
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
        return tab ? { ...tab, url: (props.url as string) ?? tab.url, active: props.active ?? tab.active, pinned: props.pinned ?? tab.pinned } : undefined;
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
      goBack: async () => {},
      goForward: async () => {},
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
      search: async () => [
        { id: '1', url: 'https://example.com', title: 'Example', lastVisitTime: Date.now(), visitCount: 5 },
      ],
    },
    scripting: {
      executeScript: async () => 'Page content for testing.',
    },
    ai: undefined,
  };

  return { ...base, ...overrides };
}