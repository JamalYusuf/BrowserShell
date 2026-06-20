import { defineCommand } from '../define';
import { error, formatJson, formatPageMeta, type PageMetaItem } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const meta = defineCommand({
  name: 'meta',
  description: 'Show page metadata (title, description, OG tags, canonical).',
  usage: 'meta [--json] [#]',
  examples: ['meta', 'meta --json', 'clip md', 'here'],
  category: 'utility',
  seeAlso: ['here', 'read', 'clip'],
  handler: async (args, ctx) => {
    const tabArg = filterFlags(args).find((a) => /^\d+(@\d+)?$/.test(a));
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getPageMeta');
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const meta = data as PageMetaItem;
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(meta), exitCode: 0, structured: meta };
    }

    return { stdout: formatPageMeta(meta, ctx.cols), exitCode: 0, structured: meta };
  },
});