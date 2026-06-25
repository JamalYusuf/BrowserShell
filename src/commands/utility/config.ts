import { defineCommand } from '../define';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';
import { loadRuntimeConfig, reloadConfig } from '@/shared/config-service';
import { parseRc } from '@/shared/rc-parser';

export const config = defineCommand({
  name: 'config',
  description: 'View or edit shell configuration.',
  usage: 'config <list|get|set|show|reload> [key] [value]',
  examples: ['config list', 'config show', 'config reload', 'config get theme', 'config set overlayOpacity 0.9'],
  category: 'config',
  seeAlso: ['alias', 'export', 'bind', 'user'],
  handler: async (args, _ctx) => {
    const sub = filterFlags(args)[0];

    if (sub === 'reload') {
      const cfg = await loadConfig();
      await applyRcToStorage(cfg.rc);
      await reloadConfig();
      return {
        stdout: success('Configuration reloaded from ~/.browsershellrc.'),
        exitCode: 0,
        structured: { reload: true },
      };
    }

    if (sub === 'show') {
      const runtime = await loadRuntimeConfig();
      const summary = {
        binds: runtime.parsed.binds.length,
        bangs: Object.keys(runtime.bangs).length,
        workspaces: runtime.parsed.workspaces.length,
        aliases: Object.keys(runtime.parsed.aliases).length,
        leader: runtime.shell.leader ?? runtime.parsed.settings.leader ?? '<space>',
        globalHotkeys: runtime.shell.globalHotkeys ?? false,
      };
      return { stdout: formatJson(summary), exitCode: 0, structured: summary };
    }

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
      const boolKeys = ['overlayEnabled', 'cursorBlink', 'firstRunComplete', 'welcomeEnabled', 'globalHotkeys', 'insertModeAuto'];
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

    return { stderr: error('Usage: config <list|get|set|show|reload> [args]'), exitCode: 2 };
  },
});

function parseStringList(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"')) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* fall through */
    }
  }
  return trimmed.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

export async function applyRcToStorage(rc: string): Promise<void> {
  const parsed = parseRc(rc);
  const cfg = await loadConfig();
  const rcBangs = Object.fromEntries(
    parsed.bangs.map((b) => [b.name, { url: b.url, description: b.description }]),
  );
  await saveConfig({
    aliases: { ...parsed.aliases, ...cfg.aliases },
    bangs: { ...rcBangs, ...(cfg.bangs ?? {}) },
    leader: parsed.settings.leader ?? cfg.leader,
    globalHotkeys: parsed.settings['global-hotkeys'] !== 'false',
    globalHotkeysExceptions: parsed.settings['global-hotkeys-exceptions']
      ? parseStringList(parsed.settings['global-hotkeys-exceptions'])
      : cfg.globalHotkeysExceptions,
  });
  const { invalidateConfigCache, preloadRuntimeConfig } = await import('@/shared/config-service');
  invalidateConfigCache();
  await preloadRuntimeConfig();
}