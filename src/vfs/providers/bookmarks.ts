import type { ChromeAPI, BookmarkNode } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { joinPath, normalizePath } from '../path';

const SYSTEM_FOLDERS = new Set([
  'Bookmarks bar',
  'Other bookmarks',
  'Mobile bookmarks',
  'Bookmarks',
  '',
]);

export function slugifyBookmark(name: string): string {
  const slug = name
    .trim()
    .replace(/[/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w.-]/g, '')
    .slice(0, 48);
  return slug || 'untitled';
}

function isSystemFolder(node: BookmarkNode): boolean {
  return SYSTEM_FOLDERS.has(node.title) || node.id === '0';
}

export class BookmarksProvider implements VFSProvider {
  name = 'bookmarks';
  mountPoint = '/bookmarks';
  private pathMap = new Map<string, BookmarkNode>();

  constructor(private chrome: ChromeAPI) {}

  private async buildPathMap(): Promise<void> {
    this.pathMap.clear();
    const tree = await this.chrome.bookmarks.getTree();

    const walk = (nodes: BookmarkNode[], basePath: string) => {
      for (const node of nodes) {
        if (isSystemFolder(node)) {
          if (node.children?.length) walk(node.children, basePath);
          continue;
        }

        let segment = slugifyBookmark(node.title);
        let nodePath = joinPath(basePath, segment);

        if (this.pathMap.has(nodePath)) {
          nodePath = joinPath(basePath, `${segment}-${node.id}`);
        }

        this.pathMap.set(nodePath, node);
        if (node.children?.length) walk(node.children, nodePath);
      }
    };

    walk(tree, '/bookmarks');
  }

  private listChildren(dirPath: string): VFSEntry[] {
    const normalized = normalizePath(dirPath);
    const entries: VFSEntry[] = [];

    for (const [p, node] of this.pathMap) {
      const parent = p.substring(0, p.lastIndexOf('/')) || '/bookmarks';
      if (parent !== normalized) continue;

      const segment = p.slice(parent.length + 1);
      entries.push({
        name: segment,
        path: p,
        type: node.url ? 'file' : 'directory',
        meta: { id: node.id, url: node.url, title: node.title },
      });
    }

    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      const at = (a.meta?.title as string | undefined) ?? a.name;
      const bt = (b.meta?.title as string | undefined) ?? b.name;
      return at.localeCompare(bt, undefined, { sensitivity: 'base' });
    });
  }

  async readdir(path: string): Promise<VFSEntry[]> {
    await this.buildPathMap();
    const normalized = normalizePath(path.replace(/\/$/, '') || '/bookmarks');
    if (normalized === '/bookmarks' || this.pathMap.has(normalized)) {
      return this.listChildren(normalized === '/bookmarks' ? '/bookmarks' : normalized);
    }
    return [];
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    await this.buildPathMap();
    const node = this.pathMap.get(normalizePath(path));
    if (!node) throw new Error(`Bookmark not found: ${path}`);

    if (path.endsWith('/meta.json') || path.endsWith('meta.json')) {
      const meta = { id: node.id, title: node.title, url: node.url };
      return options?.raw ? JSON.stringify(meta) : JSON.stringify(meta, null, 2);
    }

    if (node.url) {
      if (path.endsWith('/url.txt')) return node.url;
      const meta = { id: node.id, title: node.title, url: node.url };
      return options?.raw ? JSON.stringify(meta) : JSON.stringify(meta, null, 2);
    }

    throw new Error(`${path} is a folder, not a file. Use ls instead.`);
  }

  async stat(path: string): Promise<VFSStat> {
    await this.buildPathMap();
    const normalized = normalizePath(path);
    if (normalized === '/bookmarks') return { path: normalized, type: 'directory' };
    const node = this.pathMap.get(normalized);
    if (!node) throw new Error(`Bookmark not found: ${path}`);
    return {
      path: normalized,
      type: node.url ? 'file' : 'directory',
      meta: { id: node.id, title: node.title, url: node.url },
    };
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: string): Promise<BookmarkNode | undefined> {
    await this.buildPathMap();
    for (const node of this.pathMap.values()) {
      if (node.id === id) return node;
    }
    return undefined;
  }

  async findByPath(path: string): Promise<BookmarkNode | undefined> {
    await this.buildPathMap();
    return this.pathMap.get(normalizePath(path));
  }
}