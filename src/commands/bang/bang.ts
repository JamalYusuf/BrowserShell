import { defineCommand } from '../define';
import { error, formatJson, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { listAllBangs, persistBang, removeBang } from '@/shared/config-service';
import { loadConfig } from '@/shared/storage';
import { clickableFooter } from '../shared/list-hints';
import { resolveBangUrl } from '@/shared/bangs';

export const bang = defineCommand({
  name: 'bang',
  description: 'Manage site shortcut bangs (!gh, !yt, etc.).',
  usage: 'bang <list|add|edit|remove> [args] [--json] [-f]',
  examples: [
    'bang list',
    'bang add mywiki https://wiki.example.com/search?q=%s',
    'bang edit gh',
    '!gh BrowserShell',
    'go !yt lo-fi beats',
  ],
  category: 'navigation',
  seeAlso: ['go', 'search', 'config'],
  handler: async (args, ctx) => {
    const words = filterFlags(args);
    const json = hasFlag(args, '--json');
    const force = hasFlag(args, '-f') || hasFlag(args, '--force');
    const sub = words[0];

    if (!sub || sub === 'list' || sub === 'ls') {
      const cfg = await loadConfig();
      const all = listAllBangs(cfg.bangs);
      if (json) return { stdout: formatJson(all), exitCode: 0, structured: all };
      const lines = all.map((b, i) => {
        const tag = b.builtin ? 'builtin' : 'custom';
        const desc = b.description ? ` — ${b.description}` : '';
        return `${String(i + 1).padStart(2)}  !${b.name.padEnd(8)}  ${b.url.slice(0, 50)}${desc}  [${tag}]`;
      });
      return {
        stdout: lines.join('\n') + clickableFooter('!name query · bang edit <#>'),
        exitCode: 0,
        clickableList: {
          count: all.length,
          command: (index) => {
            const name = all[index - 1]!.name;
            return `bang edit ${name}`;
          },
        },
      };
    }

    if (sub === 'add') {
      const name = words[1]?.toLowerCase();
      const url = words[2];
      const desc = words.slice(3).join(' ').replace(/^--description\s+/, '').trim() || undefined;
      if (!name || !url) return { stderr: error('Usage: bang add <name> <url-template> [--description text]'), exitCode: 2 };
      await persistBang({ name, url, description: desc });
      return { stdout: success(`Bang !${name} added. Try: !${name} your query`), exitCode: 0 };
    }

    if (sub === 'edit') {
      const name = words[1]?.toLowerCase();
      if (!name) return { stderr: error('Usage: bang edit <name>'), exitCode: 2 };
      const cfg = await loadConfig();
      const def = listAllBangs(cfg.bangs).find((b) => b.name === name);
      if (!def) return { stderr: error(`Unknown bang: ${name}`), exitCode: 1 };
      const path = `/config/bangs/${name}.txt`;
      const content = def.description ? `${def.url}\n# ${def.description}` : def.url;
      return {
        stdout: success(`Opening editor: ${path}`),
        exitCode: 0,
        structured: { editor: true, path, content },
      };
    }

    if (sub === 'remove' || sub === 'rm' || sub === 'delete') {
      const name = words[1]?.toLowerCase();
      if (!name) return { stderr: error('Usage: bang remove <name> [-f]'), exitCode: 2 };
      if (!force) {
        return { stderr: error(`Use -f to remove bang !${name}`), exitCode: 2 };
      }
      await removeBang(name);
      return { stdout: success(`Removed bang !${name}`), exitCode: 0 };
    }

    if (/^\d+$/.test(sub)) {
      const cfg = await loadConfig();
      const all = listAllBangs(cfg.bangs);
      const entry = all[Number(sub) - 1];
      if (!entry) return { stderr: error(`No bang at index ${sub}`), exitCode: 1 };
      const action = words[1];
      if (action === 'edit') {
        return bang.handler(['edit', entry.name], ctx);
      }
      if (action === 'remove') {
        return bang.handler(['remove', entry.name, '-f'], ctx);
      }
    }

    return { stderr: error('Usage: bang <list|add|edit|remove>'), exitCode: 2 };
  },
});

/** Standalone !name query command — registered as alias-style handler via executor */
export async function runBangQuery(name: string, query: string): Promise<{ url: string; command: string } | null> {
  const cfg = await loadConfig();
  const all = listAllBangs(cfg.bangs);
  const def = all.find((b) => b.name === name.toLowerCase());
  if (!def) return null;
  if (def.url.startsWith('bookmark:')) {
    return { url: '', command: `bookmark ${query}` };
  }
  const url = resolveBangUrl(def.url, query);
  return { url, command: `go ${url}` };
}