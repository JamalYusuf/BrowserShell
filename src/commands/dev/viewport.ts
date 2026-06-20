import { defineCommand } from '../define';
import { error, formatJson, formatViewport } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { ViewportInfo } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const viewport = defineCommand({
  name: 'viewport',
  aliases: ['vp'],
  description: 'Show viewport size, scroll position, and page dimensions.',
  usage: 'viewport [--json] [#]',
  examples: ['viewport', 'vp', 'viewport --json', 'scroll bottom && viewport'],
  category: 'utility',
  seeAlso: ['scroll', 'audit', 'zoom'],
  handler: async (args, ctx) => {
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getViewportInfo');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const vp = data as ViewportInfo;
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(vp), exitCode: 0, structured: vp };
    }

    return { stdout: formatViewport(vp), exitCode: 0, structured: vp };
  },
});