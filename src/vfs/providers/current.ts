import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';

export class CurrentProvider implements VFSProvider {
  name = 'current';
  mountPoint = '/current';

  constructor(private chrome: ChromeAPI, private tabsProvider: import('./tabs').TabsProvider) {}

  private async getActiveTab() {
    const tabs = await this.chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab) throw new Error('No active tab in current window.');
    return tab;
  }

  async readdir(_path: string): Promise<VFSEntry[]> {
    const tab = await this.getActiveTab();
    return [
      { name: 'meta.json', path: '/current/meta.json', type: 'file' },
      { name: 'url.txt', path: '/current/url.txt', type: 'file' },
      { name: 'title.txt', path: '/current/title.txt', type: 'file' },
      { name: 'content.txt', path: '/current/content.txt', type: 'file' },
      { name: 'tab', path: `/tabs/${tab.id}`, type: 'symlink', meta: { target: `/tabs/${tab.id}` } },
    ];
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const tab = await this.getActiveTab();
    const tabPath = `/tabs/${tab.id}/${path.replace('/current/', '')}`;
    return this.tabsProvider.read(tabPath, options);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/current') return { path, type: 'directory' };
    const tab = await this.getActiveTab();
    return {
      path,
      type: 'file',
      meta: { activeTabId: tab.id, title: tab.title, url: tab.url },
    };
  }

  async exists(path: string): Promise<boolean> {
    return path === '/current' || path.startsWith('/current/');
  }
}