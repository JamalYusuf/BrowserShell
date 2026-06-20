import { defineCommand } from '../define';
import { filterFlags } from '../shared/args';
import { resolveTabRef } from '../shared/tab-utils';
import { isScriptError, runPageScript } from '../shared/page-utils';
import { truncateTitle } from '../shared/text';
import { error, success, warn } from '@/shell/output';

function parseTitleArgs(args: string[]): { tabArg?: string; newTitle: string } {
  const parts = filterFlags(args);
  if (parts.length > 1 && /^\d+(@\d+)?$/.test(parts[parts.length - 1]!)) {
    const tabArg = parts.pop();
    return { tabArg, newTitle: parts.join(' ').trim() };
  }
  return { newTitle: parts.join(' ').trim() };
}

export const title = defineCommand({
  name: 'title',
  description: 'Rename the current tab by setting the page title.',
  usage: 'title <new-title> [#]',
  examples: ['title "Research Notes"', 'title Inbox', 'title "🔥 Urgent" 2'],
  category: 'tabs',
  seeAlso: ['here', 'tab'],
  notes: 'Sets document.title on the page. May reset if the page navigates or reloads.',
  handler: async (args, ctx) => {
    const { tabArg, newTitle } = parseTitleArgs(args);
    if (!newTitle) return { stderr: error('Usage: title <new-title> [#]'), exitCode: 2 };

    const ref = await resolveTabRef(tabArg ?? 'current', ctx);
    if (!ref) return { stderr: error('Invalid tab.'), exitCode: 1 };

    const applied = await runPageScript(ref.id, ctx, 'setPageTitle', newTitle);
    if (isScriptError(applied)) {
      const hint = applied.error.includes('Cannot access')
        ? ' Cannot set title on chrome:// or restricted pages.'
        : '';
      return { stderr: error(`${applied.error}${hint}`), exitCode: 1 };
    }

    const title = applied as string;
    if (title !== newTitle) {
      return {
        stdout: warn(`#${ref.index} title set to "${truncateTitle(title)}" (page may have modified it)`),
        exitCode: 0,
      };
    }

    return { stdout: success(`#${ref.index} → ${truncateTitle(newTitle)}`), exitCode: 0 };
  },
});