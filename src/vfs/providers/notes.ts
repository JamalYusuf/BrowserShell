import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { loadConfig, saveConfig } from '@/shared/storage';

const NOTE_PREFIX = 'NOTE_';

function noteKey(name: string): string {
  return `${NOTE_PREFIX}${name}`;
}

export class NotesProvider implements VFSProvider {
  name = 'notes';
  mountPoint = '/notes';

  async readdir(_path: string): Promise<VFSEntry[]> {
    const config = await loadConfig();
    return Object.keys(config.env)
      .filter((k) => k.startsWith(NOTE_PREFIX))
      .map((k) => {
        const name = k.slice(NOTE_PREFIX.length);
        return { name, path: `/notes/${name}`, type: 'file' as const };
      });
  }

  async read(path: string): Promise<string> {
    const name = path.replace('/notes/', '');
    const config = await loadConfig();
    const content = config.env[noteKey(name)];
    if (content === undefined) throw new Error(`Note not found: ${name}`);
    return content;
  }

  async write(path: string, content: string): Promise<void> {
    const name = path.replace('/notes/', '');
    const config = await loadConfig();
    await saveConfig({ env: { ...config.env, [noteKey(name)]: content } });
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/notes') return { path, type: 'directory' };
    const name = path.replace('/notes/', '');
    const config = await loadConfig();
    if (config.env[noteKey(name)] !== undefined) return { path, type: 'file' };
    throw new Error(`Note not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    if (path === '/notes') return true;
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}