import { defineCommand } from '../define';
import { error, formatJson, formatStorageList, success } from '@/shell/output';
import { filterFlags, getFlagValue, hasFlag } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun, needsForce } from '../shared/confirm';
import { parseStorageArgs } from '../shared/dev-args';
import type { StorageEntry } from '../shared/dev-scripts';
import { clearPageStorageNow, forgetOrigin, resolveForgetOrigin } from '../shared/privacy-utils';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';
import { tabDomain } from '../shared/url';

export const storage = defineCommand({
  name: 'storage',
  description: 'List, read, or clear localStorage / sessionStorage on the page.',
  usage: 'storage [local|session] [pattern] | storage get <key> | storage clear [local|session] -f',
  examples: ['storage', 'storage session', 'storage auth', 'storage get token', 'storage clear -f', 'storage clear session -f'],
  category: 'utility',
  seeAlso: ['cookies', 'forget', 'audit'],
  notes: 'clear wipes page storage + indexedDB for the site origin.',
  handler: async (args, ctx) => {
    const positional = filterFlags(args);
    const dryRun = isDryRun(args);
    const force = needsForce(args);

    if (positional[0] === 'clear') {
      const area = positional[1] === 'session' || positional[1] === 'local' ? positional[1] : 'both';
      const origin = await resolveForgetOrigin(ctx);
      if (!origin) return { stderr: error('No page to clear storage for. Open an http(s) tab.'), exitCode: 1 };
      const domain = tabDomain(origin);

      const detail = area === 'both' ? `local+session storage + indexedDB for ${domain}` : `${area}Storage for ${domain}`;
      if (dryRun) return dryRunResult('clear storage', detail, area === 'session' ? 'storage clear session -f' : 'storage clear -f');
      if (!force) return forceRequiredResult(area === 'session' ? 'storage clear session -f' : 'storage clear -f', `Clear ${detail}.`);

      if (area === 'both' || area === 'local') {
        await forgetOrigin(ctx.chrome, origin, 'storage');
      }
      const resolved = await resolvePageTab([], ctx);
      if (resolved.ref) {
        await clearPageStorageNow(ctx, resolved.ref.id);
      }

      return { stdout: success(`Cleared storage for ${domain}`), exitCode: 0 };
    }

    const limit = Math.min(200, Math.max(1, Number(getFlagValue(args, '--limit') ?? '50')));
    const parsed = parseStorageArgs(args);
    const resolved = await resolvePageTab(parsed.tabArg ? [parsed.tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    if (parsed.action === 'get') {
      if (!parsed.key) return { stderr: error('Usage: storage get <key> [local|session]'), exitCode: 2 };
      const item = await runPageScript(resolved.ref.id, ctx, 'getStorageItem', parsed.area, parsed.key);
      if (isScriptError(item)) return { stderr: error(item.error), exitCode: 1 };
      if (!item) return { stderr: error(`Key "${parsed.key}" not found in ${parsed.area}Storage.`), exitCode: 1 };
      const entry = item as { key: string; value: string };
      if (hasFlag(args, '--json')) return { stdout: formatJson(entry), exitCode: 0, structured: entry };
      return { stdout: `${entry.key}\n${entry.value}`, exitCode: 0, structured: entry };
    }

    const list = await runPageScript(resolved.ref.id, ctx, 'listStorage', parsed.area, parsed.pattern, limit);
    if (isScriptError(list)) return { stderr: error(list.error), exitCode: 1 };
    const items = list as StorageEntry[];

    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(items), exitCode: 0, structured: items };
    }

    if (ctx.piped) {
      return {
        stdout: items.map((i) => `${i.key}\t${i.bytes}\t${i.preview}`).join('\n'),
        exitCode: 0,
      };
    }

    return {
      stdout: formatStorageList(items, parsed.area, ctx.cols),
      exitCode: 0,
      structured: items,
    };
  },
});