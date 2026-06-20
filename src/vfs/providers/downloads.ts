import type { ChromeAPI } from '@/chrome/api';
import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { formatBytes } from '@/commands/shared/download-utils';

function slugifyFilename(filename: string): string {
  const base = filename
    .trim()
    .replace(/[/\\?#&]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w.-]/g, '')
    .slice(0, 36);
  return base || 'file';
}

function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

export class DownloadsProvider implements VFSProvider {
  name = 'downloads';
  mountPoint = '/downloads';

  constructor(private chrome: ChromeAPI) {}

  private async getItems(limit = 50) {
    return this.chrome.downloads.search({ limit, orderBy: ['-startTime'] });
  }

  async readdir(_path: string): Promise<VFSEntry[]> {
    const items = await this.getItems(50);
    return items.map((item, i) => {
      const slug = slugifyFilename(item.filename);
      return {
        name: `${String(i + 1).padStart(3, '0')}-${slug}`,
        path: `/downloads/${item.id}`,
        type: 'file' as const,
        modified: item.startTime,
        meta: {
          id: item.id,
          index: i + 1,
          filename: item.filename,
          url: item.url,
          state: item.state,
          size: formatBytes(item.bytesReceived),
          when: formatWhen(item.startTime),
        },
      };
    });
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const match = path.match(/^\/downloads\/(\d+)$/);
    if (!match) throw new Error(`Invalid downloads path: ${path}`);

    const id = Number(match[1]);
    const items = await this.getItems(200);
    const item = items.find((d) => d.id === id);
    if (!item) throw new Error(`Download ${id} not found`);

    const meta = {
      id: item.id,
      filename: item.filename,
      url: item.url,
      state: item.state,
      bytesReceived: item.bytesReceived,
      totalBytes: item.totalBytes,
      startTime: new Date(item.startTime).toISOString(),
      exists: item.exists,
    };
    return options?.raw ? JSON.stringify(meta) : JSON.stringify(meta, null, 2);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/downloads') return { path, type: 'directory' };
    const match = path.match(/^\/downloads\/(\d+)$/);
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