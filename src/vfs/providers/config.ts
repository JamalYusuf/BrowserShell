import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { loadConfig, saveConfig } from '@/shared/storage';

export class ConfigProvider implements VFSProvider {
  name = 'config';
  mountPoint = '/config';

  async readdir(_path: string): Promise<VFSEntry[]> {
    const config = await loadConfig();
    const entries: VFSEntry[] = [
      { name: 'rc', path: '/config/rc', type: 'file' },
      { name: 'aliases.json', path: '/config/aliases.json', type: 'file' },
      { name: 'settings.json', path: '/config/settings.json', type: 'file' },
      { name: 'bangs.json', path: '/config/bangs.json', type: 'file' },
      { name: 'bangs', path: '/config/bangs', type: 'directory' },
    ];
    for (const name of Object.keys(config.bangs ?? {})) {
      entries.push({ name: `${name}.txt`, path: `/config/bangs/${name}.txt`, type: 'file' });
    }
    return entries;
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
        leader: config.leader,
        globalHotkeys: config.globalHotkeys,
      };
      return options?.raw ? JSON.stringify(settings) : JSON.stringify(settings, null, 2);
    }

    if (path === '/config/bangs.json') {
      const bangs = config.bangs ?? {};
      return options?.raw ? JSON.stringify(bangs) : JSON.stringify(bangs, null, 2);
    }

    if (path.startsWith('/config/bangs/')) {
      const name = path.replace('/config/bangs/', '').replace(/\.txt$/, '');
      const bang = config.bangs?.[name];
      if (!bang) throw new Error(`Bang not found: ${name}`);
      return bang.description ? `${bang.url}\n# ${bang.description}` : bang.url;
    }

    throw new Error(`Unknown config file: ${path}`);
  }

  async write(path: string, content: string): Promise<void> {
    if (path === '/config/rc') {
      await saveConfig({ rc: content });
      const { applyRcToStorage } = await import('@/commands/utility/config');
      await applyRcToStorage(content);
      return;
    }

    if (!path.startsWith('/config/bangs/')) {
      throw new Error(`Cannot write to: ${path}`);
    }
    const name = path.replace('/config/bangs/', '').replace(/\.txt$/, '');
    const lines = content.split('\n');
    const url = lines[0]?.trim() ?? '';
    const desc = lines.find((l) => l.startsWith('#'))?.replace(/^#\s*/, '');
    const config = await loadConfig();
    await saveConfig({
      bangs: { ...(config.bangs ?? {}), [name]: { url, description: desc } },
    });
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/config') return { path, type: 'directory' };
    if (path === '/config/bangs') return { path, type: 'directory' };
    if (['/config/rc', '/config/aliases.json', '/config/settings.json', '/config/bangs.json'].includes(path)) {
      return { path, type: 'file' };
    }
    if (path.startsWith('/config/bangs/')) return { path, type: 'file' };
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

  async unlink(path: string): Promise<void> {
    if (!path.startsWith('/config/bangs/')) {
      throw new Error(`Cannot remove: ${path}`);
    }
    const name = path.replace('/config/bangs/', '').replace(/\.txt$/, '');
    const config = await loadConfig();
    if (!config.bangs?.[name]) throw new Error(`Bang not found: ${name}`);
    const bangs = { ...(config.bangs ?? {}) };
    delete bangs[name];
    await saveConfig({ bangs });
  }
}