import { defineCommand } from '../define';
import { error, formatAudit, formatJson } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { PageAudit } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const audit = defineCommand({
  name: 'audit',
  description: 'Page health snapshot: DOM size, load timing, storage, memory.',
  usage: 'audit [--json] [#]',
  examples: ['audit', 'audit --json', 'here && audit', 'audit 2'],
  category: 'utility',
  seeAlso: ['tech', 'reqs', 'meta', 'viewport'],
  notes: 'Quick Lighthouse-style overview in the terminal. Reload page for fresh timing.',
  handler: async (args, ctx) => {
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getPageAudit');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const auditData = data as PageAudit;
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(auditData), exitCode: 0, structured: auditData };
    }

    return { stdout: formatAudit(auditData, ctx.cols), exitCode: 0, structured: auditData };
  },
});