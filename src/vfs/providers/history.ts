import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';

function slugifyTitle(title: string, url: string): string {
  const base = (title || url)
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/[/\\?#&]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w.-]/g, '')
    .slice(0, 36);
  return base || 'page';
}

function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

export class HistoryProvider implements VFSProvider {
  name = 'history';
  mountPoint = '/history';

  constructor(private chrome: ChromeAPI) {}

  private async getItems(limit = 50) {
    return this.chrome.history.search({ text: '', maxResults: limit });
  }

  async readdir(_path: string): Promise<VFSEntry[]> {
    const items = await this.getItems(50);
    return items.map((item, i) => {
      const slug = slugifyTitle(item.title, item.url);
      return {
        name: `${String(i + 1).padStart(3, '0')}-${slug}`,
        path: `/history/${item.id}`,
        type: 'file' as const,
        modified: item.lastVisitTime,
        meta: {
          id: item.id,
          index: i + 1,
          url: item.url,
          title: item.title,
          lastVisitTime: item.lastVisitTime,
          visitCount: item.visitCount,
          when: formatWhen(item.lastVisitTime),
        },
      };
    });
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const match = path.match(/^\/history\/(.+)$/);
    if (!match) throw new Error(`Invalid history path: ${path}`);

    const id = match[1]!;
    const items = await this.chrome.history.search({ text: '', maxResults: 1000 });
    const item = items.find((i) => i.id === id);
    if (!item) throw new Error(`History item ${id} not found`);

    const meta = {
      id: item.id,
      url: item.url,
      title: item.title,
      lastVisitTime: new Date(item.lastVisitTime).toISOString(),
      visitCount: item.visitCount,
    };
    return options?.raw ? JSON.stringify(meta) : JSON.stringify(meta, null, 2);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/history') return { path, type: 'directory' };
    const match = path.match(/^\/history\/(.+)$/);
    if (!match) throw new Error(`Path not found: ${path}`);
    return { path, type: 'file' };
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}