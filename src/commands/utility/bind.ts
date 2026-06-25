import { defineCommand } from '../define';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';
import { formatBindingKeys } from '@/shared/keybindings';
import { clickableFooter } from '../shared/list-hints';
import { loadRuntimeConfig, invalidateConfigCache } from '@/shared/config-service';
import { parseRc, type RcBind } from '@/shared/rc-parser';

async function listBindings(json: boolean) {
  const runtime = await loadRuntimeConfig();
  const binds = runtime.parsed.binds;
  if (!binds.length) {
    return { stdout: 'No keybindings. Edit /config/rc or use bind add.', exitCode: 0 };
  }
  if (json) {
    return { stdout: formatJson(binds), exitCode: 0, structured: binds };
  }
  const lines = binds.map((b, i) =>
    `${String(i + 1).padStart(2)}  ${formatBindingKeys(b.keys).padEnd(16)}  ${b.action}  [${b.scope}]`
  );
  return {
    stdout: lines.join('\n') + clickableFooter('bind remove <keys> · edit /config/rc'),
    exitCode: 0,
    clickableList: {
      count: binds.length,
      command: (index: number) => `bind remove ${binds[index - 1]!.keys}`,
    },
  };
}

function appendBindLine(rc: string, line: string): string {
  const trimmed = rc.trimEnd();
  return `${trimmed}\n${line}\n`;
}

function removeBindLine(rc: string, keys: string, prefix: 'bind' | 'edit-bind'): string {
  const escaped = keys.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${prefix}\\s+${escaped}(\\s+\\S+)?\\s*$`, 'm');
  return rc.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export const bind = defineCommand({
  name: 'bind',
  description: 'List, add, or remove keybindings (stored in ~/.browsershellrc).',
  usage: 'bind [list|add <keys> <action>|remove <keys>] [--json]',
  examples: [
    'bind list',
    'bind add f hints-current',
    'bind add <leader>e edit',
    'bind remove f',
    'edit /config/rc',
  ],
  category: 'config',
  seeAlso: ['config', 'edit-bind', 'edit'],
  handler: async (args) => {
    const words = filterFlags(args);
    const json = hasFlag(args, '--json');
    const sub = words[0] ?? 'list';

    if (sub === 'list' || sub === 'ls') {
      return listBindings(json);
    }

    const cfg = await loadConfig();

    if (sub === 'add') {
      const keys = words[1];
      const action = words.slice(2).join(' ');
      if (!keys || !action) return { stderr: error('Usage: bind add <keys> <action>'), exitCode: 2 };
      const scope = inferScope(action);
      const prefix = scope === 'editor' ? 'edit-bind' : 'bind';
      const line = `${prefix} ${keys} ${action}`;
      await saveConfig({ rc: appendBindLine(cfg.rc, line) });
      invalidateConfigCache();
      return { stdout: success(`Added to /config/rc: ${line}`), exitCode: 0 };
    }

    if (sub === 'remove' || sub === 'rm') {
      const keys = words[1];
      if (!keys) return { stderr: error('Usage: bind remove <keys>'), exitCode: 2 };
      const parsed = parseRc(cfg.rc);
      const hit = parsed.binds.find((b) => b.keys === keys);
      if (!hit) return { stderr: error(`No binding for: ${keys}`), exitCode: 1 };
      const prefix = hit.scope === 'editor' ? 'edit-bind' : 'bind';
      await saveConfig({ rc: removeBindLine(cfg.rc, keys, prefix) });
      invalidateConfigCache();
      return { stdout: success(`Removed binding: ${keys}`), exitCode: 0 };
    }

    return { stderr: error('Usage: bind [list|add|remove]'), exitCode: 2 };
  },
});

function inferScope(action: string): RcBind['scope'] {
  if (/^(cursor-|insert-|normal-|save|undo|redo)/.test(action)) return 'editor';
  if (/^(hints-|scroll-|visual-|yank-|paste-|focus-|history-|tab-|reload|seek|help-overlay|insert-mode|view-source|url-|edit-url|frame-|pagination-|open-url|bookmark-|open-multiple-links|window-|mark-jump)/.test(action)) return 'global';
  return 'terminal';
}

export const editBind = defineCommand({
  name: 'edit-bind',
  description: 'List, add, or remove editor keybindings (in ~/.browsershellrc).',
  usage: 'edit-bind [list|add <keys> <action>|remove <keys>]',
  examples: ['edit-bind list', 'edit-bind add i insert-mode', 'edit /config/rc'],
  category: 'config',
  seeAlso: ['bind', 'edit', 'config'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const sub = words[0] ?? 'list';
    if (sub === 'list' || sub === 'ls') {
      const runtime = await loadRuntimeConfig();
      const binds = runtime.parsed.binds.filter((b) => b.scope === 'editor');
      const lines = binds.map((b, i) =>
        `${String(i + 1).padStart(2)}  ${formatBindingKeys(b.keys).padEnd(16)}  ${b.action}`
      );
      return { stdout: lines.join('\n') || 'No editor bindings.', exitCode: 0 };
    }
    if (sub === 'add') {
      const keys = words[1];
      const action = words.slice(2).join(' ');
      if (!keys || !action) return { stderr: error('Usage: edit-bind add <keys> <action>'), exitCode: 2 };
      const cfg = await loadConfig();
      await saveConfig({ rc: appendBindLine(cfg.rc, `edit-bind ${keys} ${action}`) });
      invalidateConfigCache();
      return { stdout: success(`Added: edit-bind ${keys} ${action}`), exitCode: 0 };
    }
    return bind.handler(args, ctx);
  },
});