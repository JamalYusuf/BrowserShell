import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags, hasFlag } from '../shared/args';
import { resolveTabRef, tabErrorMessage } from '../shared/tab-utils';
import { truncateTitle } from '../shared/text';

export const close = defineCommand({
  name: 'close',
  description: 'Close the current tab, a tab by #, or remove a bookmark.',
  usage: 'close [#|bookmark-path] [-f]',
  examples: ['close', 'close 3', 'close /bookmarks/Old -f'],
  category: 'navigation',
  seeAlso: ['tab', 'bookmark'],
  notes: 'No arguments closes the current (host) tab.',
  handler: async (args, ctx) => {
    const force = hasFlag(args, '-f', '--force');
    const target = filterFlags(args)[0] ?? 'current';

    if (target.startsWith('/bookmarks') || (target.startsWith('/') && target !== '/')) {
      if (!force) {
        return { stderr: error(`Removing bookmarks requires -f. Try: close ${target} -f`), exitCode: 1 };
      }
      const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(target, ctx.cwd));
      if (!node) return { stderr: error(`Bookmark not found: ${target}`), exitCode: 1 };
      await ctx.chrome.bookmarks.remove(node.id);
      return { stdout: success(`Removed bookmark: ${node.title}`), exitCode: 0 };
    }

    const ref = await resolveTabRef(target, ctx);
    if (!ref) {
      return { stderr: error(await tabErrorMessage(target, ctx)), exitCode: 1 };
    }
    await ctx.chrome.tabs.remove(ref.id);
    return { stdout: success(`Closed #${ref.index} — ${truncateTitle(ref.title)}`), exitCode: 0 };
  },
});