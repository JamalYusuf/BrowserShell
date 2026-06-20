import { defineCommand } from '../define';
import { error, warn } from '@/shell/output';
import { filterFlags, getFlagValue } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const read = defineCommand({
  name: 'read',
  description: 'Extract readable article text from the page (main content).',
  usage: 'read [--limit N] [#]',
  examples: ['read', 'read --limit 2000', 'read | head -n 20', 'read | ai summarize'],
  category: 'utility',
  seeAlso: ['cat', 'ai', 'pick'],
  handler: async (args, ctx) => {
    const limit = Math.min(50_000, Math.max(100, Number(getFlagValue(args, '--limit') ?? '8000')));
    const tabArg = filterFlags(args).find((a) => /^\d+(@\d+)?$/.test(a));

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const text = await runPageScript(resolved.ref.id, ctx, 'extractReadableText', limit);
    if (isScriptError(text)) return { stderr: error(text.error), exitCode: 1 };
    const content = text as string;
    if (!content.trim()) return { stdout: warn('No readable content found.'), exitCode: 0 };

    return { stdout: content, exitCode: 0 };
  },
});