import { defineCommand } from '../define';
import { error } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const pick = defineCommand({
  name: 'pick',
  description: 'Print highlighted/selected text from the page.',
  usage: 'pick [#]',
  examples: ['pick', 'pick | wc -w', 'pick | clip'],
  category: 'utility',
  seeAlso: ['clip', 'seek', 'read'],
  handler: async (args, ctx) => {
    const tabArg = filterFlags(args).find((a) => /^\d+(@\d+)?$/.test(a));
    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const text = await runPageScript(resolved.ref.id, ctx, 'getSelectionText');
    if (isScriptError(text)) return { stderr: error(text.error), exitCode: 1 };
    const selection = text as string;
    if (!selection.trim()) return { stderr: error('No text selected. Highlight text on the page first.'), exitCode: 1 };

    return { stdout: selection, exitCode: 0 };
  },
});