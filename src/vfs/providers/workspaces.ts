import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { loadConfig } from '@/shared/storage';

export class WorkspacesProvider implements VFSProvider {
  name = 'workspaces';
  mountPoint = '/workspaces';

  async readdir(_path: string): Promise<VFSEntry[]> {
    const cfg = await loadConfig();
    return Object.keys(cfg.workspaces ?? {}).map((name) => ({
      name: `${name}.json`,
      path: `/workspaces/${name}.json`,
      type: 'file' as const,
    }));
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string> {
    const name = path.replace('/workspaces/', '').replace(/\.json$/, '');
    const cfg = await loadConfig();
    const ws = cfg.workspaces?.[name];
    if (!ws) throw new Error(`Workspace not found: ${name}`);
    return options?.raw ? JSON.stringify(ws) : JSON.stringify(ws, null, 2);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/workspaces') return { path, type: 'directory' };
    const name = path.replace('/workspaces/', '').replace(/\.json$/, '');
    const cfg = await loadConfig();
    if (cfg.workspaces?.[name]) return { path, type: 'file' };
    throw new Error(`Workspace not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    if (path === '/workspaces') return true;
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}