import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { isScriptError, resolvePageTab, runPageScript } from '../shared/page-utils';

const KEYS = ['enter', 'tab', 'escape', 'esc', 'space', 'backspace', 'up', 'down', 'left', 'right'];

export const press = defineCommand({
  name: 'press',
  description: 'Send a keyboard key to the focused page element.',
  usage: 'press <key> [#]',
  examples: ['press enter', 'press tab', 'input fill 1 "query" && press enter', 'press escape'],
  category: 'utility',
  seeAlso: ['input', 'fill', 'link'],
  notes: 'Sends keydown/keyup to active element. Use after input fill to submit forms.',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    let tabArg: string | undefined;
    if (parts.length > 1 && /^\d+(@\d+)?$/.test(parts[parts.length - 1]!)) tabArg = parts.pop();
    const key = parts[0];
    if (!key) {
      return { stderr: error(`Usage: press <${KEYS.slice(0, 5).join('|')}|...> [#]`), exitCode: 2 };
    }

    const resolved = await resolvePageTab(tabArg ? [tabArg] : [], ctx);
    if (!resolved.ref) return { stderr: resolved.error!, exitCode: 1 };

    const result = await runPageScript(resolved.ref.id, ctx, 'pressKey', key);
    if (isScriptError(result)) return { stderr: error(result.error), exitCode: 1 };

    return { stdout: success(`Pressed ${(result as { key: string }).key}`), exitCode: 0 };
  },
});