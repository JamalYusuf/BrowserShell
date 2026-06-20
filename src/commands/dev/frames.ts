import { defineCommand } from '../define';
import { error, formatFrames, formatJson } from '@/shell/output';
import { getFlagValue, hasFlag } from '../shared/args';
import { parseTabArg } from '../shared/dev-args';
import type { FrameInfo } from '../shared/dev-scripts';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const frames = defineCommand({
  name: 'frames',
  description: 'List iframes embedded on the page.',
  usage: 'frames [--limit N] [--json] [#]',
  examples: ['frames', 'frames --json', 'audit && frames'],
  category: 'utility',
  seeAlso: ['audit', 'links', 'tech'],
  handler: async (args, ctx) => {
    const limit = Math.min(50, Math.max(1, Number(getFlagValue(args, '--limit') ?? '20')));
    const { tabArg } = parseTabArg(args);
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const data = await runPageScript(resolved.ref.id, ctx, 'listFrames', limit);
    if (isScriptError(data)) return { stderr: error(data.error), exitCode: 1 };

    const items = data as FrameInfo[];
    if (hasFlag(args, '--json')) {
      return { stdout: formatJson(items), exitCode: 0, structured: items };
    }

    return { stdout: formatFrames(items, ctx.cols), exitCode: 0, structured: items };
  },
});