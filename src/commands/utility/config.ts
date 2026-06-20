import { defineCommand } from '../define';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';

export const config = defineCommand({
  name: 'config',
  description: 'View or edit shell configuration.',
  usage: 'config <get|set|list> [key] [value]',
  examples: ['config list', 'config get theme', 'config set overlayOpacity 0.9'],
  category: 'utility',
  seeAlso: ['alias', 'export'],
  handler: async (args, _ctx) => {
    const sub = filterFlags(args)[0];

    if (sub === 'list' || (!sub && !filterFlags(args).length)) {
      const cfg = await loadConfig();
      const keys = [
        'username', 'welcomeEnabled', 'theme', 'toggleKey', 'overlayOpacity', 'fontSize',
        'fontFamily', 'cursorStyle', 'letterSpacing', 'lineHeight', 'cursorBlink', 'prompt',
      ] as const;
      return {
        stdout: keys.map((k) => `${k}=${cfg[k]}`).join('\n'),
        exitCode: 0,
      };
    }

    if (sub === 'get') {
      const key = filterFlags(args)[1];
      const cfg = await loadConfig();
      if (!key) return { stdout: formatJson(cfg), exitCode: 0 };
      const value = (cfg as unknown as Record<string, unknown>)[key];
      if (value === undefined) return { stderr: error(`Unknown key: ${key}`), exitCode: 1 };
      return { stdout: typeof value === 'object' ? JSON.stringify(value) : String(value), exitCode: 0 };
    }

    if (sub === 'set') {
      const key = filterFlags(args)[1];
      const value = filterFlags(args).slice(2).join(' ');
      if (!key || !value) return { stderr: error('Usage: config set <key> <value>'), exitCode: 2 };

      const numericKeys = [
        'overlayOpacity', 'overlayHeight', 'backdropBlur', 'backdropDim',
        'fontSize', 'lineHeight', 'letterSpacing',
      ];
      const boolKeys = ['overlayEnabled', 'cursorBlink', 'firstRunComplete', 'welcomeEnabled'];
      let parsed: unknown = value;
      if (numericKeys.includes(key)) parsed = Number(value);
      else if (boolKeys.includes(key)) parsed = value === 'true';
      else if (key === 'toggleKey') {
        const k = value === 'Backquote' || value === 'grave' || value === 'backquote' ? '`' : value;
        parsed = k;
      } else if (key === 'username') {
        parsed = value.trim().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user';
      }

      if (key === 'username') {
        const cfg = await loadConfig();
        await saveConfig({ username: parsed as string, env: { ...cfg.env, USER: parsed as string } });
      } else {
        await saveConfig({ [key]: parsed });
      }
      return { stdout: success(`Set ${key}=${value}`), exitCode: 0 };
    }

    return { stderr: error('Usage: config <list|get|set> [args]'), exitCode: 2 };
  },
});