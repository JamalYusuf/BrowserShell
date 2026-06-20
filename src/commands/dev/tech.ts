import { defineCommand } from '../define';
import { error, formatJson, formatTech } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { TechSignal } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const tech = defineCommand({
  name: 'tech',
  description: 'Detect frameworks, CMS, and third-party scripts on the page.',
  usage: 'tech [--json] [#]',
  examples: ['tech', 'tech --json', 'open site.com && wait 1000 && tech'],
  category: 'utility',
  seeAlso: ['audit', 'reqs', 'meta'],
  notes: 'Heuristic stack detection (React, Next.js, WordPress, Shopify, etc.).',
  handler: async (args, ctx) => {
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'detectTech');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const items = data as TechSignal[];
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(items), exitCode: 0, structured: items };
    }

    return { stdout: formatTech(items, ctx.cols), exitCode: 0, structured: items };
  },
});