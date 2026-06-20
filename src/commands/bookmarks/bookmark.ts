import { defineCommand } from '../define';
import { error, formatTable, success } from '@/shell/output';
import { clickableFooter, emptyListHint } from '../shared/list-hints';
import { filterFlags } from '../shared/args';
import { currentTab, focusOrOpenUrl } from '../shared/navigation';

const BOOKMARK_SUBS = new Set(['add', 'search', 'open']);

export const bookmark = defineCommand({
  name: 'bookmark',
  description: 'Bookmark the current page, search, or open bookmarks.',
  usage: 'bookmark | bookmark <query> | bookmark <#> | bookmark <add|search|open> [args]',
  examples: ['bookmark', 'bookmark react', 'bookmark 1', 'bookmark open 1', 'bookmark add "My Site"'],
  category: 'bookmarks',
  seeAlso: ['bookmarks', 'open'],
  notes: 'No args bookmarks current page. Query searches. bookmark <#> opens from last search.',
  handler: async (args, ctx) => {
    let sub = filterFlags(args)[0];
    let rest = filterFlags(args).slice(1);

    if (!sub) {
      sub = 'add';
      rest = [];
    } else if (/^\d+$/.test(sub) && !rest.length) {
      rest = [sub];
      sub = 'open';
    } else if (!BOOKMARK_SUBS.has(sub)) {
      rest = [sub, ...rest];
      sub = 'search';
    }

    switch (sub) {
      case 'add': {
        let title = rest[0];
        let url = rest[1];

        if (!title) {
          const tab = await currentTab(ctx);
          title = tab?.title || 'Untitled';
          url = tab?.url;
        } else if (title.startsWith('http') || title.startsWith('/')) {
          url = title.startsWith('/') ? ((await ctx.vfs.read('/current/url.txt')) as string) : title;
          const tab = await currentTab(ctx);
          title = tab?.title || 'Untitled';
        }

        if (!url) url = (await ctx.vfs.read('/current/url.txt')) as string;

        const bm = await ctx.chrome.bookmarks.create({ title, url });
        return { stdout: success(`Bookmarked: "${bm.title}" → ${bm.url}`), exitCode: 0 };
      }
      case 'search': {
        const query = rest.join(' ');
        if (!query) return { stderr: error('Usage: bookmark search <query>'), exitCode: 2 };
        const results = await ctx.chrome.bookmarks.search(query);
        ctx.setBookmarkSearchResults?.(results);
        if (!results.length) return { stdout: emptyListHint('bookmark', `"${query}"`), exitCode: 0 };
        const rows = results.map((b, i) => [
          String(i + 1),
          b.title?.slice(0, 28) ?? '',
          b.url?.slice(0, 42) ?? '',
          b.id,
        ]);
        return {
          stdout:
            formatTable(['#', 'Title', 'URL', 'ChromeID'], rows, {
              maxWidth: ctx.cols,
              clickable: { command: (n) => `bookmark open ${n}` },
            }) + clickableFooter('bookmark open <#>'),
          exitCode: 0,
          structured: { bookmarks: results },
          clickableList: {
            count: results.length,
            command: (n) => `bookmark open ${n}`,
          },
        };
      }
      case 'open': {
        const pathOrId = rest[0];
        if (!pathOrId) return { stderr: error('Usage: bookmark open <#|path|chrome-id>'), exitCode: 2 };

        let url: string | undefined;

        if (pathOrId.startsWith('/')) {
          const node = await ctx.vfs.bookmarks.findByPath(ctx.vfs.resolve(pathOrId, ctx.cwd));
          url = node?.url;
        } else if (/^\d+$/.test(pathOrId)) {
          const rank = Number(pathOrId);
          const cached = ctx.getBookmarkSearchResults?.() ?? [];
          const byRank = rank >= 1 && rank <= cached.length ? cached[rank - 1] : undefined;
          if (byRank?.url) {
            url = byRank.url;
          } else {
            const nodes = await ctx.chrome.bookmarks.get(pathOrId);
            const node = nodes[0];
            if (node?.url) {
              url = node.url;
            } else if (node && !node.url) {
              return {
                stderr: error(
                  `"${pathOrId}" is a folder. Run bookmark search first, then bookmark open <#>, or use a path like /bookmarks/Work/Project`
                ),
                exitCode: 1,
              };
            }
          }
        }

        if (!url) {
          return {
            stderr: error(
              `Bookmark not found: ${pathOrId}. Run bookmark search <query> first to use bookmark open <#>.`
            ),
            exitCode: 1,
          };
        }
        return focusOrOpenUrl(url, ctx);
      }
      default:
        return { stderr: error(`Unknown bookmark subcommand: ${sub}`), exitCode: 2 };
    }
  },
});