/**
 * Virtual filesystem — exposes browser resources as navigable paths.
 *
 * Providers mount at `/tabs`, `/bookmarks`, `/history`, etc.
 */
import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { basename, isChildPath, normalizePath } from './path';
import { BookmarksProvider } from './providers/bookmarks';
import { ConfigProvider } from './providers/config';
import { CurrentProvider } from './providers/current';
import { DownloadsProvider } from './providers/downloads';
import { HistoryProvider } from './providers/history';
import { ScriptsProvider } from './providers/scripts';
import { TabsProvider } from './providers/tabs';
import { TranscriptProvider } from './providers/transcript';
import { NotesProvider } from './providers/notes';
import { AuditProvider } from './providers/audit';

export {
  TabsProvider,
  BookmarksProvider,
  HistoryProvider,
  DownloadsProvider,
  CurrentProvider,
  ConfigProvider,
  ScriptsProvider,
};
export * from './path';

const ROOT_ENTRIES: VFSEntry[] = [
  { name: 'tabs', path: '/tabs', type: 'directory' },
  { name: 'bookmarks', path: '/bookmarks', type: 'directory' },
  { name: 'history', path: '/history', type: 'directory' },
  { name: 'downloads', path: '/downloads', type: 'directory' },
  { name: 'current', path: '/current', type: 'symlink', meta: { target: 'active tab' } },
  { name: 'config', path: '/config', type: 'directory' },
  { name: 'scripts', path: '/scripts', type: 'directory' },
  { name: 'transcript', path: '/transcript', type: 'directory' },
  { name: 'notes', path: '/notes', type: 'directory' },
  { name: 'audit', path: '/audit', type: 'directory' },
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
    const downloads = new DownloadsProvider(chrome);
    const config = new ConfigProvider();
    const current = new CurrentProvider(chrome, this.tabs);
    const transcript = new TranscriptProvider();
    const notes = new NotesProvider();
    const audit = new AuditProvider();
    this.providers = [this.tabs, this.bookmarks, history, downloads, config, current, this.scripts, transcript, notes, audit];
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

  async write(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    const provider = this.findProvider(normalized) as VFSProvider & { write?: (p: string, c: string) => Promise<void> };
    if (!provider?.write) throw new Error(`Cannot write to: ${path}`);
    await provider.write(normalized, content);
  }

  resolve(path: string, cwd: string): string {
    return normalizePath(path, cwd);
  }

  isDirectory(path: string): boolean {
    const name = basename(path);
    return !name.includes('.') || path.endsWith('/');
  }
}