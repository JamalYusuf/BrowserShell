import { defineCommand } from '../define';
import { appendAuditEntry } from '@/shell/audit-log';
import { error, formatJson, formatTable, success, warn } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun, needsForce } from '../shared/confirm';
import {
  assertDownloadReady,
  formatBytes,
  parseDownloadArgs,
  resolveDownloadTarget,
  searchDownloads,
} from '../shared/download-utils';

export const downloads = defineCommand({
  name: 'downloads',
  description: 'List, open, show, or remove browser downloads.',
  usage: 'downloads [query] | downloads <open|show|delete> <#> | downloads clear -f',
  examples: ['downloads', 'downloads pdf', 'downloads open 1', 'downloads show 2', 'downloads delete 1 -f', 'downloads clear -f'],
  category: 'utility',
  seeAlso: ['open', 'grep'],
  notes: 'List first, then act by #. show reveals in Finder/Explorer; open launches the file. Click row = show.',
  handler: async (args, ctx) => {
    const parsed = parseDownloadArgs(args);
    const json = hasFlag(args, '--json');
    const dryRun = isDryRun(args);
    const force = needsForce(args);

    if (parsed.action === 'clear') {
      if (dryRun) {
        const items = await searchDownloads(ctx, '', 500);
        return dryRunResult('erase download history', `${items.length} entries`, 'downloads clear -f');
      }
      if (!force) return forceRequiredResult('downloads clear -f', 'Erase all download history (files stay on disk).');
      const erased = await ctx.chrome.downloads.erase({});
      await appendAuditEntry(`downloads clear: ${erased.length} entries`);
      return { stdout: success(`Cleared ${erased.length} download entr${erased.length === 1 ? 'y' : 'ies'} from history`), exitCode: 0 };
    }

    if (parsed.action === 'open' || parsed.action === 'show' || parsed.action === 'delete') {
      const cached = ctx.getLastDownloadResults?.() ?? [];
      let pool = cached;
      if (!pool.length) pool = await searchDownloads(ctx, '', parsed.limit);

      const resolved = await resolveDownloadTarget(ctx, parsed.target, pool);
      if ('error' in resolved) return { stderr: error(resolved.error), exitCode: 1 };

      const label = resolved.filename || resolved.url;
      if (dryRun) {
        return dryRunResult(`${parsed.action} download`, `#${pool.indexOf(resolved) + 1} ${label}`, `downloads ${parsed.action} ${parsed.target} -f`);
      }

      try {
        if (parsed.action === 'open' || parsed.action === 'show') {
          const block = assertDownloadReady(resolved, parsed.action);
          if (block) return { stderr: error(block), exitCode: 1 };

          if (parsed.action === 'open') {
            await ctx.chrome.downloads.open(resolved.id);
            return { stdout: success(`Opened ${label}`), exitCode: 0 };
          }
          await ctx.chrome.downloads.show(resolved.id);
          return { stdout: success(`Revealed in folder: ${label}`), exitCode: 0 };
        }
        if (!force) return forceRequiredResult(`downloads delete ${parsed.target} -f`, `Remove file: ${label}`);
        await ctx.chrome.downloads.removeFile(resolved.id);
        await ctx.chrome.downloads.erase({ id: resolved.id });
        await appendAuditEntry(`downloads delete: ${label}`);
        return { stdout: success(`Deleted ${label}`), exitCode: 0 };
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    const items = await searchDownloads(ctx, parsed.query, parsed.limit);
    ctx.setLastDownloadResults?.(items);

    if (!items.length) {
      return { stdout: warn(parsed.query ? `No downloads matching "${parsed.query}".` : 'No recent downloads.'), exitCode: 0 };
    }
    if (json) return { stdout: formatJson(items), exitCode: 0 };

    if (ctx.piped) {
      return {
        stdout: items.map((d, i) => `${i + 1}\t${d.filename}\t${d.state}\t${d.url}`).join('\n'),
        exitCode: 0,
      };
    }

    const rows = items.map((d, i) => [
      String(i + 1),
      d.filename.slice(0, 28),
      d.state,
      formatBytes(d.bytesReceived),
      new Date(d.startTime).toLocaleDateString(),
    ]);

    return {
      stdout: `${formatTable(
        ['#', 'File', 'State', 'Size', 'When'],
        rows,
        { maxWidth: ctx.cols, clickable: { command: (n) => `downloads show ${n}` } }
      )}`,
      exitCode: 0,
      clickableList: {
        count: items.length,
        command: (n) => `downloads show ${n}`,
      },
    };
  },
});