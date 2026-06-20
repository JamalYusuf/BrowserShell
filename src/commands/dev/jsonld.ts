import { defineCommand } from '../define';
import { error, formatJson, heading } from '@/shell/output';
import { getFlagValue, hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const jsonld = defineCommand({
  name: 'jsonld',
  description: 'Extract JSON-LD structured data blocks from the page.',
  usage: 'jsonld [--limit N] [--json] [#]',
  examples: ['jsonld', 'jsonld --json', 'jsonld | head -n 20', 'meta && jsonld'],
  category: 'utility',
  seeAlso: ['meta', 'read', 'tech'],
  notes: 'Useful for SEO debugging and schema inspection.',
  handler: async (args, ctx) => {
    const limit = Math.min(20, Math.max(1, Number(getFlagValue(args, '--limit') ?? '5')));
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'getJsonLd', limit);
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const blocks = data as { index: number; type: string; raw: string }[];
    if (!blocks.length) {
      return { stdout: 'No JSON-LD blocks found.', exitCode: 0 };
    }

    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(blocks), exitCode: 0, structured: blocks };
    }

    const lines = blocks.flatMap((b) => [
      heading(`#${b.index} ${b.type}`),
      b.raw,
      '',
    ]);
    return { stdout: lines.join('\n').trimEnd(), exitCode: 0, structured: blocks };
  },
});