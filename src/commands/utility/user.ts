import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';

function sanitizeUsername(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24);
  return cleaned || 'user';
}

export const userCmd = defineCommand({
  name: 'user',
  description: 'Show or set the prompt username (\\u in PS1).',
  usage: 'user [set <name>]',
  examples: ['user', 'user set jamal', 'user set dev'],
  category: 'utility',
  seeAlso: ['config', 'export', 'options'],
  handler: async (args) => {
    const words = filterFlags(args);
    const sub = words[0];

    if (sub === 'set') {
      const name = words.slice(1).join(' ');
      if (!name) return { stderr: error('Usage: user set <name>'), exitCode: 2 };
      const username = sanitizeUsername(name);
      const cfg = await loadConfig();
      await saveConfig({ username, env: { ...cfg.env, USER: username } });
      return { stdout: success(`Username set to ${username}. Reopen the terminal or run a command to refresh the prompt.`), exitCode: 0 };
    }

    if (sub && sub !== 'get') {
      return { stderr: error('Usage: user [set <name>]'), exitCode: 2 };
    }

    const cfg = await loadConfig();
    const username = cfg.username || cfg.env.USER || 'user';
    return { stdout: username, exitCode: 0 };
  },
});