import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { joinPath } from '../path';

export class TabsProvider implements VFSProvider {
  name = 'tabs';
  mountPoint = '/tabs';

  constructor(private chrome: ChromeAPI) {}

  async readdir(path: string): Promise<VFSEntry[]> {
    if (path === '/tabs' || path === '/tabs/') {
      const tabs = await this.chrome.tabs.query({});
      return tabs.map((tab) => ({
        name: String(tab.id),
        path: `/tabs/${tab.id}`,
        type: 'directory' as const,
        meta: { title: tab.title, url: tab.url, active: tab.active, pinned: tab.pinned },
      }));
    }
    return [];
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const match = path.match(/^\/tabs\/(\d+)\/(.+)$/);
    if (!match) throw new Error(`Invalid tab path: ${path}`);

    const tabId = Number(match[1]);
    const file = match[2];
    const tab = await this.chrome.tabs.get(tabId);
    if (!tab) throw new Error(`Tab ${tabId} not found`);

    if (file === 'meta.json') {
      const meta = {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.active,
        pinned: tab.pinned,
        windowId: tab.windowId,
        index: tab.index,
      };
      return options?.raw ? JSON.stringify(meta) : JSON.stringify(meta, null, 2);
    }

    if (file === 'url.txt') return tab.url;
    if (file === 'title.txt') return tab.title;

    if (file === 'content.txt') {
      try {
        return await this.chrome.scripting.executeScript(tabId, () => document.body?.innerText ?? '');
      } catch {
        throw new Error(`Cannot read content of tab ${tabId}. Try activating the tab first.`);
      }
    }

    throw new Error(`Unknown file: ${file}. Available: meta.json, url.txt, title.txt, content.txt`);
  }

  async stat(path: string): Promise<VFSStat> {
    const tabMatch = path.match(/^\/tabs\/(\d+)$/);
    if (tabMatch) {
      const tab = await this.chrome.tabs.get(Number(tabMatch[1]));
      if (!tab) throw new Error(`Tab ${tabMatch[1]} not found`);
      return {
        path,
        type: 'directory',
        meta: { title: tab.title, url: tab.url, active: tab.active },
      };
    }

    const fileMatch = path.match(/^\/tabs\/(\d+)\/(.+)$/);
    if (fileMatch) {
      return { path, type: 'file', size: 0 };
    }

    if (path === '/tabs') return { path, type: 'directory' };
    throw new Error(`Path not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  tabPath(id: number, file?: string): string {
    return file ? joinPath('/tabs', String(id), file) : joinPath('/tabs', String(id));
  }
}