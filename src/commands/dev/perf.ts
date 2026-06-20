import { defineCommand } from '../define';
import { error, formatJson, formatTable } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { PageAudit } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const perf = defineCommand({
  name: 'perf',
  description: 'Page performance snapshot: load time, transfer size, heap.',
  usage: 'perf [--json] [#]',
  examples: ['perf', 'perf --json', 'reload --hard && perf'],
  category: 'utility',
  seeAlso: ['audit', 'reqs', 'reload'],
  notes: 'Uses Navigation Timing + memory APIs. Reload for fresh metrics.',
  handler: async (args, ctx) => {
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getPageAudit');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const audit = data as PageAudit;
    const json = hasFlag(args, '--json');

    const metrics: [string, string][] = [
      ['load', audit.loadMs != null ? `${audit.loadMs}ms` : 'n/a'],
      ['DOM ready', audit.domContentLoadedMs != null ? `${audit.domContentLoadedMs}ms` : 'n/a'],
      ['transfer', audit.transferKb != null ? `${audit.transferKb} KB` : 'n/a'],
      ['JS heap', audit.jsHeapMb != null ? `${audit.jsHeapMb} MB` : 'n/a'],
      ['DOM nodes', String(audit.domNodes)],
      ['scripts', String(audit.scripts)],
      ['images', String(audit.images)],
      ['readyState', audit.readyState],
    ];

    if (json) {
      return {
        stdout: formatJson({
          url: audit.url,
          loadMs: audit.loadMs,
          domContentLoadedMs: audit.domContentLoadedMs,
          transferKb: audit.transferKb,
          jsHeapMb: audit.jsHeapMb,
          domNodes: audit.domNodes,
        }),
        exitCode: 0,
      };
    }

    const rows = metrics.map(([k, v]) => [k, v]);
    return {
      stdout: `${audit.url}\n${formatTable(['Metric', 'Value'], rows, { maxWidth: ctx.cols })}`,
      exitCode: 0,
    };
  },
});