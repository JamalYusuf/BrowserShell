import { defineCommand } from '../define';
import { appendAuditEntry } from '@/shell/audit-log';
import { error, formatJson, formatTable, success, warn } from '@/shell/output';
import { clickableFooter } from '../shared/list-hints';
import { getFlagValue, hasFlag } from '../shared/args';
import { dryRunResult, forceRequiredResult, isDryRun, needsForce } from '../shared/confirm';
import {
  clearHistoryDomain,
  deleteHistoryUrls,
  formatHistoryRange,
  parseHistoryArgs,
  rangeToTimes,
  resolveHistoryTarget,
  searchHistory,
} from '../shared/history-utils';

export const history = defineCommand({
  name: 'history',
  description: 'List, search, delete, or clear browsing history.',
  usage: 'history [query] | history <today|yesterday|this-week> [query] | history delete <#|url|domain> -f | history clear <range|domain> -f',
  examples: [
    'history',
    'history today',
    'history yesterday github',
    'history jamal.dev',
    'history delete 3 -f',
    'history delete jamal.dev -f',
    'history clear day -f',
    'history clear today -f',
    'history clear jamal.dev -f',
  ],
  category: 'history',
  seeAlso: ['forget', 'open', 'grep'],
  notes: 'List first, then delete by #. Use --dry-run to preview. Destructive actions require -f.',
  handler: async (args, ctx) => {
    const parsed = parseHistoryArgs(args);
    const force = needsForce(args);
    const dryRun = isDryRun(args);
    const json = hasFlag(args, '--json');
    const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? String(parsed.limit))));

    if (parsed.action === 'delete') {
      if (!parsed.query) {
        return { stderr: error('Usage: history delete <#|url|domain> -f\nRun history first for row numbers.'), exitCode: 2 };
      }
      try {
        const resolved = await resolveHistoryTarget(ctx, parsed.query);
        if ('error' in resolved) return { stderr: error(resolved.error), exitCode: 1 };

        const detail = `${resolved.urls.length} URL(s): ${resolved.urls.slice(0, 3).join(', ')}${resolved.urls.length > 3 ? '…' : ''}`;
        const confirmCmd = `history delete ${parsed.query} -f`;
        if (dryRun) return dryRunResult('delete history', detail, confirmCmd);
        if (!force) return forceRequiredResult(confirmCmd, detail);

        const count = await deleteHistoryUrls(ctx, resolved.urls);
        const cached = ctx.getLastHistoryResults?.() ?? [];
        ctx.setLastHistoryResults?.(cached.filter((item) => !resolved.urls.includes(item.url)));
        await appendAuditEntry(`history delete: ${count} entries (${parsed.query})`);
        return {
          stdout: success(`Deleted ${count} history entr${count === 1 ? 'y' : 'ies'}`),
          exitCode: 0,
        };
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    if (parsed.action === 'clear') {
      const confirmCmd = parsed.query
        ? `history clear ${parsed.query} -f`
        : `history clear ${parsed.range ?? 'day'} -f`;
      const preview = parsed.query
        ? `all history for ${parsed.query}`
        : `history for ${parsed.range ? formatHistoryRange(parsed.range) : 'last day'}`;

      if (dryRun) return dryRunResult('clear history', preview, confirmCmd);
      if (!force) return forceRequiredResult(confirmCmd, preview);

      try {
        if (parsed.query) {
          const count = await clearHistoryDomain(ctx, parsed.query);
          await appendAuditEntry(`history clear domain: ${parsed.query} (${count} entries)`);
          return {
            stdout: success(`Cleared ${count} history entr${count === 1 ? 'y' : 'ies'} for ${parsed.query}`),
            exitCode: 0,
          };
        }

        const range = parsed.range ?? 'day';
        if (range === 'all') {
          await ctx.chrome.browsingData.remove({ since: 0 }, { history: true });
        } else {
          const { startTime, endTime } = rangeToTimes(range);
          try {
            await ctx.chrome.browsingData.remove({ since: startTime }, { history: true });
          } catch {
            await ctx.chrome.history.deleteRange({ startTime, endTime });
          }
        }

        await appendAuditEntry(`history clear: ${formatHistoryRange(range)}`);
        return { stdout: success(`Cleared history (${formatHistoryRange(range)})`), exitCode: 0 };
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    }

    const items = await searchHistory(ctx, parsed.query, limit, parsed.range);
    ctx.setLastHistoryResults?.(items);

    const rangeLabel = parsed.range ? ` (${formatHistoryRange(parsed.range)})` : '';
    if (!items.length) {
      const target = parsed.query ? `"${parsed.query}"${rangeLabel}` : `recent history${rangeLabel}`;
      return { stdout: warn(`No history for ${target}.`), exitCode: 0 };
    }
    if (json) return { stdout: formatJson(items), exitCode: 0 };

    if (ctx.piped) {
      return {
        stdout: items.map((item, i) => `${i + 1}\t${item.title}\t${item.url}`).join('\n'),
        exitCode: 0,
      };
    }

    const rows = items.map((item, i) => [
      String(i + 1),
      item.title.slice(0, 30),
      item.url.slice(0, 40),
      ...(parsed.query ? [] : [new Date(item.lastVisitTime).toLocaleDateString()]),
    ]);

    const headers = ['#', 'Title', 'URL', 'When'];
    return {
      stdout:
        formatTable(headers, rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `go ${items[n - 1]!.url}` },
          urlColumns: [2],
        }) + clickableFooter(`go URL · history delete <#> -f${rangeLabel}`),
      exitCode: 0,
      clickableList: {
        count: items.length,
        command: (n) => `go ${items[n - 1]!.url}`,
      },
    };
  },
});