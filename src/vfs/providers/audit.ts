import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { clearAuditLog, readAuditLog } from '@/shell/audit-log';

export class AuditProvider implements VFSProvider {
  name = 'audit';
  mountPoint = '/audit';

  async readdir(path: string): Promise<VFSEntry[]> {
    if (path !== '/audit') return [];
    return [{ name: 'log.txt', path: '/audit/log.txt', type: 'file' }];
  }

  async read(path: string): Promise<string> {
    if (path === '/audit/log.txt') {
      const text = await readAuditLog();
      return text || '(no destructive commands logged yet)\n';
    }
    throw new Error(`No such file: ${path}`);
  }

  async write(path: string): Promise<void> {
    if (path === '/audit/log.txt') {
      await clearAuditLog();
      return;
    }
    throw new Error(`Cannot write: ${path}`);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/audit') return { path, type: 'directory' };
    if (path === '/audit/log.txt') return { path, type: 'file' };
    throw new Error(`Path not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    return path === '/audit' || path === '/audit/log.txt';
  }
}