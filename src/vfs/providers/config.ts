import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { loadConfig } from '@/shared/storage';

export class ConfigProvider implements VFSProvider {
  name = 'config';
  mountPoint = '/config';

  async readdir(_path: string): Promise<VFSEntry[]> {
    return [
      { name: 'rc', path: '/config/rc', type: 'file' },
      { name: 'aliases.json', path: '/config/aliases.json', type: 'file' },
      { name: 'settings.json', path: '/config/settings.json', type: 'file' },
    ];
  }

  async read(path: string, options?: { raw?: boolean }): Promise<string | Uint8Array> {
    const config = await loadConfig();

    if (path === '/config/rc') return config.rc;
    if (path === '/config/aliases.json') {
      const content = JSON.stringify(config.aliases, null, 2);
      return options?.raw ? JSON.stringify(config.aliases) : content;
    }
    if (path === '/config/settings.json') {
      const settings = {
        theme: config.theme,
        prompt: config.prompt,
        hotkey: config.hotkey,
        env: config.env,
      };
      return options?.raw ? JSON.stringify(settings) : JSON.stringify(settings, null, 2);
    }

    throw new Error(`Unknown config file: ${path}`);
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/config') return { path, type: 'directory' };
    if (['/config/rc', '/config/aliases.json', '/config/settings.json'].includes(path)) {
      return { path, type: 'file' };
    }
    throw new Error(`Config path not found: ${path}`);
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