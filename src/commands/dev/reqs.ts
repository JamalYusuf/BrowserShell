import { defineCommand } from '../define';
import { error, formatJson, formatReqs } from '@/shell/output';
import { getFlagValue, hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { ResourceEntry } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const reqs = defineCommand({
  name: 'reqs',
  description: 'Show network resource timing (slowest first).',
  usage: 'reqs [pattern] [--slow] [--limit N] [--json] [#]',
  examples: ['reqs', 'reqs --slow', 'reqs js', 'reqs api --limit 30', 'audit && reqs --slow'],
  category: 'utility',
  seeAlso: ['audit', 'tech', 'reload'],
  notes: 'Uses Performance API. Reload page for full resource list.',
  handler: async (args, ctx) => {
    const limit = Math.min(100, Math.max(1, Number(getFlagValue(args, '--limit') ?? '25')));
    const slowMs = hasFlag(args, '--slow') ? 1000 : 0;
    const { tabArg, rest } = parseTabArg(args);
    const pattern = rest.join(' ').trim();

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getPageRequests', pattern, limit, slowMs);
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const items = data as ResourceEntry[];
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(items), exitCode: 0, structured: items };
    }

    return { stdout: formatReqs(items, ctx.cols), exitCode: 0, structured: items };
  },
});