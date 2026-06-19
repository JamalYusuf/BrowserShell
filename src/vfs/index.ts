import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { basename, isChildPath, normalizePath } from './path';
import { BookmarksProvider } from './providers/bookmarks';
import { ConfigProvider } from './providers/config';
import { CurrentProvider } from './providers/current';
import { HistoryProvider } from './providers/history';
import { ScriptsProvider } from './providers/scripts';
import { TabsProvider } from './providers/tabs';

export { TabsProvider, BookmarksProvider, HistoryProvider, CurrentProvider, ConfigProvider, ScriptsProvider };
export * from './path';

const ROOT_ENTRIES: VFSEntry[] = [
  { name: 'tabs', path: '/tabs', type: 'directory' },
  { name: 'bookmarks', path: '/bookmarks', type: 'directory' },
  { name: 'history', path: '/history', type: 'directory' },
  { name: 'current', path: '/current', type: 'symlink', meta: { target: 'active tab' } },
  { name: 'config', path: '/config', type: 'directory' },
  { name: 'scripts', path: '/scripts', type: 'directory' },
];

export class VirtualFileSystem {
  private providers: VFSProvider[];
  readonly tabs: TabsProvider;
  readonly bookmarks: BookmarksProvider;
  readonly scripts: ScriptsProvider;

  constructor(chrome: ChromeAPI) {
    this.tabs = new TabsProvider(chrome);
    this.bookmarks = new BookmarksProvider(chrome);
    this.scripts = new ScriptsProvider();
    const history = new HistoryProvider(chrome);
    const config = new ConfigProvider();
    const current = new CurrentProvider(chrome, this.tabs);
    this.providers = [this.tabs, this.bookmarks, history, config, current, this.scripts];
  }

  private findProvider(path: string): VFSProvider | undefined {
    const normalized = normalizePath(path);
    return this.providers.find((p) => isChildPath(p.mountPoint, normalized) || normalized === p.mountPoint);
  }

  async readdir(path: string): Promise<VFSEntry[]> {
    const normalized = normalizePath(path);
    if (normalized === '/') return ROOT_ENTRIES;
    const provider = this.findProvider(normalized);
    if (!provider) throw new Error(`No such directory: ${path}`);
    return provider.readdir(normalized);
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const normalized = normalizePath(path);
    if (normalized.startsWith('/current/')) {
      const current = this.providers.find((p) => p.name === 'current');
      if (current) return current.read(normalized, options);
    }
    const provider = this.findProvider(normalized);
    if (!provider) throw new Error(`No such file: ${path}`);
    return provider.read(normalized, options);
  }

  async stat(path: string): Promise<VFSStat> {
    const normalized = normalizePath(path);
    if (normalized === '/') return { path: '/', type: 'directory' };
    const provider = this.findProvider(normalized);
    if (!provider) throw new Error(`Path not found: ${path}`);
    return provider.stat(normalized);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  resolve(path: string, cwd: string): string {
    return normalizePath(path, cwd);
  }

  isDirectory(path: string): boolean {
    const name = basename(path);
    return !name.includes('.') || path.endsWith('/');
  }
}