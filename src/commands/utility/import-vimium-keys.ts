import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { loadConfig, saveConfig } from '@/shared/storage';
import { invalidateConfigCache } from '@/shared/config-service';
import { parseRc } from '@/shared/rc-parser';

/** Common Vimium / vimium-c bindings mapped to BrowserShell actions. */
const VIMIUM_BINDS: { keys: string; action: string }[] = [
  { keys: 'f', action: 'hints-current' },
  { keys: 'F', action: 'hints-newtab' },
  { keys: 'yf', action: 'hints-copy' },
  { keys: 'j', action: 'scroll-down' },
  { keys: 'k', action: 'scroll-up' },
  { keys: 'h', action: 'scroll-left' },
  { keys: 'l', action: 'scroll-right' },
  { keys: 'gg', action: 'scroll-top' },
  { keys: 'G', action: 'scroll-bottom' },
  { keys: 'd', action: 'scroll-half-down' },
  { keys: 'u', action: 'scroll-half-up' },
  { keys: 'zH', action: 'scroll-edge-left' },
  { keys: 'zL', action: 'scroll-edge-right' },
  { keys: 'H', action: 'history-back' },
  { keys: 'L', action: 'history-forward' },
  { keys: 'gi', action: 'focus-first-input' },
  { keys: 'i', action: 'insert-mode' },
  { keys: '/', action: 'seek' },
  { keys: 'n', action: 'seek-next' },
  { keys: 'N', action: 'seek-prev' },
  { keys: 'v', action: 'visual-mode' },
  { keys: 'V', action: 'visual-line' },
  { keys: 'yc', action: 'visual-word' },
  { keys: 'y', action: 'yank-selection' },
  { keys: 'p', action: 'paste-go' },
  { keys: 'P', action: 'paste-go-newtab' },
  { keys: 'yy', action: 'yank-url' },
  { keys: 'r', action: 'reload-page' },
  { keys: 'gs', action: 'view-source' },
  { keys: 'gf', action: 'frame-next' },
  { keys: 'gF', action: 'frame-main' },
  { keys: 'gu', action: 'url-up' },
  { keys: 'gU', action: 'url-root' },
  { keys: 'ge', action: 'edit-url' },
  { keys: 'gE', action: 'edit-url-newtab' },
  { keys: 'o', action: 'open-url' },
  { keys: 'O', action: 'open-url-newtab' },
  { keys: 'b', action: 'bookmark-open' },
  { keys: 'B', action: 'bookmark-newtab' },
  { keys: '?', action: 'help-overlay' },
  { keys: '``', action: 'mark-jump-back' },
  { keys: 't', action: 'tab-new' },
  { keys: 'x', action: 'tab-close' },
  { keys: 'yt', action: 'tab-duplicate' },
  { keys: 'J', action: 'tab-next' },
  { keys: 'K', action: 'tab-prev' },
  { keys: 'gt', action: 'tab-next' },
  { keys: 'gT', action: 'tab-prev' },
  { keys: 'g0', action: 'tab-first' },
  { keys: 'g$', action: 'tab-last' },
  { keys: '^', action: 'tab-previous' },
  { keys: 'X', action: 'tab-restore' },
  { keys: 'W', action: 'tab-move-window' },
  { keys: '<a-p>', action: 'tab-pin-toggle' },
  { keys: 'T', action: 'tab-search' },
  { keys: '<leader>e', action: 'edit' },
  { keys: ']]', action: 'pagination-next' },
  { keys: '[[', action: 'pagination-prev' },
  { keys: '<a-f>', action: 'open-multiple-links' },
];

function bindKey(bind: { keys: string; scope: string }): string {
  return `${bind.scope}:${bind.keys}`;
}

function appendMissingBinds(rc: string, dryRun: boolean): { rc: string; added: string[] } {
  const parsed = parseRc(rc);
  const seen = new Set(parsed.binds.map(bindKey));
  const added: string[] = [];
  let next = rc.trimEnd();

  for (const { keys, action } of VIMIUM_BINDS) {
    const key = bindKey({ keys, scope: 'global' });
    if (seen.has(key)) continue;
    const line = `bind ${keys} ${action}`;
    added.push(line);
    if (!dryRun) next = `${next}\n${line}`;
    seen.add(key);
  }

  if (!dryRun && added.length) next = `${next}\n`;
  return { rc: next, added };
}

export const importVimiumKeys = defineCommand({
  name: 'import-vimium-keys',
  description: 'Import common Vimium-style global keybindings into ~/.browsershellrc.',
  usage: 'import-vimium-keys [--dry-run]',
  examples: ['import-vimium-keys', 'import-vimium-keys --dry-run', 'config reload'],
  category: 'config',
  seeAlso: ['bind', 'config', 'edit'],
  notes: 'Adds missing binds only — does not overwrite existing bindings.',
  handler: async (args) => {
    const dryRun = hasFlag(args, '--dry-run');
    const words = filterFlags(args);
    if (words.length) {
      return { stderr: error('Usage: import-vimium-keys [--dry-run]'), exitCode: 2 };
    }

    const cfg = await loadConfig();
    const { rc, added } = appendMissingBinds(cfg.rc, dryRun);

    if (!added.length) {
      return { stdout: 'All Vimium-style bindings are already present.', exitCode: 0 };
    }

    if (dryRun) {
      return {
        stdout: `Would add ${added.length} binding(s):\n${added.join('\n')}`,
        exitCode: 0,
        structured: { added },
      };
    }

    await saveConfig({ rc });
    invalidateConfigCache();
    return {
      stdout: success(`Added ${added.length} Vimium-style binding(s). Run config reload to apply.`),
      exitCode: 0,
      structured: { added, reload: true },
    };
  },
});