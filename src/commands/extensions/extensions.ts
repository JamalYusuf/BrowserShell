import { defineCommand } from '../define';
import { error, formatJson, formatTable, success } from '@/shell/output';
import { clickableFooter, emptyListHint } from '../shared/list-hints';
import { hasFlag } from '../shared/args';
import { listExtensions, parseExtensionArgs, resolveExtensionTarget } from '../shared/extension-utils';

export const extensions = defineCommand({
  name: 'extensions',
  description: 'List, enable, disable, or open options for browser extensions.',
  usage: 'extensions [query] | extensions <enable|disable|options> <#|id|name>',
  examples: [
    'extensions',
    'extensions shell',
    'extensions disable 2',
    'extensions enable uBlock',
    'extensions options 1',
  ],
  category: 'utility',
  seeAlso: ['config', 'help'],
  notes: 'List first, then act by #. Cannot disable required system extensions.',
  handler: async (args, ctx) => {
    const parsed = parseExtensionArgs(args);
    const json = hasFlag(args, '--json');

    if (parsed.action !== 'list') {
      const cached = ctx.getLastExtensionResults?.() ?? [];
      let pool = cached;
      if (!pool.length) pool = await listExtensions(ctx, '');

      const resolved = resolveExtensionTarget(parsed.target, pool);
      if ('error' in resolved) return { stderr: error(resolved.error), exitCode: 1 };

      try {
        if (parsed.action === 'enable') {
          await ctx.chrome.management.setEnabled(resolved.id, true);
          return { stdout: success(`Enabled ${resolved.name}`), exitCode: 0 };
        }
        if (parsed.action === 'disable') {
          await ctx.chrome.management.setEnabled(resolved.id, false);
          return { stdout: success(`Disabled ${resolved.name}`), exitCode: 0 };
        }
        await ctx.chrome.management.openOptionsPage(resolved.id);
        return { stdout: success(`Opened options for ${resolved.name}`), exitCode: 0 };
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    const items = await listExtensions(ctx, parsed.query);
    ctx.setLastExtensionResults?.(items);

    if (!items.length) {
      return { stdout: emptyListHint('extensions', parsed.query ? `"${parsed.query}"` : undefined), exitCode: 0 };
    }
    if (json) return { stdout: formatJson(items), exitCode: 0 };

    if (ctx.piped) {
      return {
        stdout: items.map((ext, i) => `${i + 1}\t${ext.enabled ? 'on' : 'off'}\t${ext.name}\t${ext.version}`).join('\n'),
        exitCode: 0,
      };
    }

    const rows = items.map((ext, i) => [
      String(i + 1),
      ext.enabled ? 'on' : 'off',
      ext.name.slice(0, 24),
      ext.version,
      ext.type === 'extension' ? 'ext' : ext.type,
    ]);

    return {
      stdout:
        formatTable(['#', 'State', 'Name', 'Version', 'Type'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `extensions options ${n}` },
        }) + clickableFooter('extensions options <#>'),
      exitCode: 0,
      clickableList: {
        count: items.length,
        command: (n) => `extensions options ${n}`,
      },
    };
  },
});