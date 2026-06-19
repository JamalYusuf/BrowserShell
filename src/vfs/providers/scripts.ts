import type { VFSEntry, VFSProvider, VFSStat } from '@/shared/types';
import { loadConfig, saveConfig } from '@/shared/storage';

const BUILTIN_SCRIPTS: Record<string, string> = {
  'welcome.sh': '# Welcome script\nhelp\n',
  'intro.sh': 'man intro\n',
};

export class ScriptsProvider implements VFSProvider {
  name = 'scripts';
  mountPoint = '/scripts';

  async readdir(_path: string): Promise<VFSEntry[]> {
    const config = await loadConfig();
    const userScripts = Object.keys(config.env)
      .filter((k) => k.startsWith('SCRIPT_'))
      .map((k) => k.replace('SCRIPT_', ''));

    const all = new Set([...Object.keys(BUILTIN_SCRIPTS), ...userScripts]);
    return [...all].map((name) => ({
      name,
      path: `/scripts/${name}`,
      type: 'file' as const,
    }));
  }

  async read(path: string): Promise<string> {
    const name = path.replace('/scripts/', '');
    if (BUILTIN_SCRIPTS[name]) return BUILTIN_SCRIPTS[name];

    const config = await loadConfig();
    const key = `SCRIPT_${name}`;
    if (config.env[key]) return config.env[key];

    throw new Error(`Script not found: ${name}. Create with: echo 'commands' > /scripts/${name}`);
  }

  async write(path: string, content: string): Promise<void> {
    const name = path.replace('/scripts/', '');
    const config = await loadConfig();
    await saveConfig({ env: { ...config.env, [`SCRIPT_${name}`]: content } });
  }

  async stat(path: string): Promise<VFSStat> {
    if (path === '/scripts') return { path, type: 'directory' };
    const name = path.replace('/scripts/', '');
    if (BUILTIN_SCRIPTS[name] || (await this.exists(path))) {
      return { path, type: 'file' };
    }
    throw new Error(`Script not found: ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    if (path === '/scripts') return true;
    const name = path.replace('/scripts/', '');
    if (BUILTIN_SCRIPTS[name]) return true;
    const config = await loadConfig();
    return `SCRIPT_${name}` in config.env;
  }
}