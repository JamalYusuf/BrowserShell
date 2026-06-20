import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { clearTranscript, getTranscript } from '@/shell/transcript';

export class TranscriptProvider implements VFSProvider {
  name = 'transcript';
  mountPoint = '/transcript';

  async readdir(path: string): Promise<VFSEntry[]> {
    if (path !== '/transcript') return [];
    return [
      { name: 'session.txt', path: '/transcript/session.txt', type: 'file' },
      { name: 'live.txt', path: '/transcript/live.txt', type: 'file' },
    ];
  }

  async read(path: string): Promise<string> {
    if (path === '/transcript/session.txt' || path === '/transcript/live.txt') {
      const text = getTranscript().trimEnd();
      return text || '(empty session — run a few commands first)\n';
    }
    throw new Error(`No such file: ${path}`);
  }

  async write(path: string, _content: string): Promise<void> {
    if (path === '/transcript/session.txt' || path === '/transcript/live.txt') {
      await clearTranscript();
      return;
    }
    throw new Error(`Cannot write: ${path}`);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/transcript') return { path, type: 'directory' };
    if (path.startsWith('/transcript/')) return { path, type: 'file' };
    throw new Error(`Path not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    return path === '/transcript' || path.startsWith('/transcript/');
  }
}