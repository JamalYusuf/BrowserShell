import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

export const fill = defineCommand({
  name: 'fill',
  description: 'Fill an input or textarea on the page by CSS selector.',
  usage: 'fill <selector> <text> [#]',
  examples: ['fill "#search" "react hooks"', 'fill input[name=q] browsershell'],
  category: 'utility',
  seeAlso: ['click', 'seek'],
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const maybeTab = parts.length > 2 && /^\d+(@\d+)?$/.test(parts[parts.length - 1]!) ? parts.pop() : undefined;
    if (parts.length < 2) return { stderr: error('Usage: fill <selector> <text> [#]'), exitCode: 2 };

    const selector = parts[0]!;
    const value = parts.slice(1).join(' ');

    const resolved = await resolvePageTab(maybeTab ? [maybeTab] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await runPageScript(resolved.ref.id, ctx, 'fillElement', selector, value);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };
    const filled = result as { filled: boolean; tag: string };
    if (!filled.filled) return { stderr: error(`Cannot fill: ${selector}`), exitCode: 1 };

    return { stdout: success(`Filled <${filled.tag}> ${selector}`), exitCode: 0 };
  },
});