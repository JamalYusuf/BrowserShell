import { defineCommand } from '../define';
import { error, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { focusOrOpenUrl } from '../shared/navigation';
import { getActiveWindowId } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';

export const open = defineCommand({
  name: 'open',
  description: 'Open a URL, bookmark path, VFS path, or a new tab when called with no args.',
  usage: 'open [url|path]',
  examples: ['open', 'open github.com', 'open https://example.com', 'open /bookmarks/Work/Project'],
  category: 'navigation',
  seeAlso: ['tab', 'bookmark', 'go'],
  notes: 'No arguments opens a new blank tab (same as tab new).',
  handler: async (args, ctx) => {
    const target = filterFlags(args)[0];
    if (!target) {
      const winId = await getActiveWindowId(ctx);
      const created = await ctx.chrome.tabs.create({ active: true, windowId: winId });
      return { stdout: success(`Opened new tab — ${truncateTitle(created.title || 'New Tab')}`), exitCode: 0 };
    }

    let url = target;

    if (target.startsWith('/')) {
      try {
        if (target.endsWith('url.txt')) {
          url = (await ctx.vfs.read(ctx.vfs.resolve(target, ctx.cwd))) as string;
        } else {
          const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(target, ctx.cwd));
          if (!node?.url) return { stderr: error(`Cannot open: ${target}. Not a bookmark URL.`), exitCode: 1 };
          url = node.url;
        }
      } catch (e) {
        return { stderr: error(e instanceof Error ? e.message : String(e)), exitCode: 1 };
      }
    } else if (!target.startsWith('http')) {
      url = `https://${target}`;
    }

    return focusOrOpenUrl(url, ctx);
  },
});