import { defineCommand } from '../define';
import {
  ANSI,
  color,
  error,
  formatBookmarkListing,
  formatDirListing,
  formatHistoryListing,
  formatJson,
  formatTabList,
  tabListClickable,
} from '@/shell/output';
import { clickableFooter } from '../shared/list-hints';
import { filterFlags, hasFlag } from '../shared/args';
import { getActiveWindowId, getWindowTabs, tabListItems } from '../shared/tab-utils';
import { bookmarkPlainLine, historyPlainLine } from '../shared/listing';

export const ls = defineCommand({
  name: 'ls',
  description: 'List directory contents in the virtual filesystem.',
  usage: 'ls [path] [-1] [--json]',
  examples: ['ls', 'ls /tabs', 'ls -1 /tabs | grep github', 'ls /bookmarks'],
  category: 'builtin',
  notes: 'Use -1 for plain one-per-line output (ideal for pipes). Bare ls lists the current directory.',
  seeAlso: ['cd', 'cat', 'pwd', 'tabs'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const onePerLine = hasFlag(args, '-1') || ctx.piped;
    const positional = filterFlags(args).filter((a) => a !== '-1');
    const path = ctx.vfs.resolve(positional[0] ?? '.', ctx.cwd);

    try {
      const entries = await ctx.vfs.readdir(path);

      if (path === '/tabs' || path.startsWith('/tabs/')) {
        const winId = await getActiveWindowId(ctx);
        const tabs = await getWindowTabs(ctx.chrome, winId);
        if (json) return { stdout: formatJson(tabs), exitCode: 0, structured: tabs };
        if (onePerLine) {
          const lines = tabListItems(tabs).map((t) =>
            `${t.index}\t${t.title}\t${t.url}${t.active ? '\t*' : ''}${t.pinned ? '\tP' : ''}`
          );
          return { stdout: lines.join('\n'), exitCode: 0 };
        }
        const items = tabListItems(tabs);
        return {
          stdout: formatTabList(items, ctx.cols, { clickable: true }) + clickableFooter('tab switch <#>'),
          exitCode: 0,
          clickableList: tabListClickable(items),
        };
      }

      if (path === '/bookmarks' || path.startsWith('/bookmarks/')) {
        if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };
        if (onePerLine) {
          const lines = entries.map((e) => bookmarkPlainLine(e));
          return { stdout: lines.join('\n'), exitCode: 0 };
        }
        const bookmarkItems = entries.map((e) => ({
          name: e.name,
          title: (e.meta?.title as string) ?? e.name,
          type: e.type === 'directory' ? ('directory' as const) : ('file' as const),
          url: e.meta?.url as string | undefined,
        }));
        const linkCount = bookmarkItems.filter((b) => b.type === 'file' && b.url).length;
        return {
          stdout:
            formatBookmarkListing(bookmarkItems, ctx.cols, { clickable: linkCount > 0 }) +
            clickableFooter('bookmark open <#>'),
          exitCode: 0,
          clickableList:
            linkCount > 0
              ? { count: bookmarkItems.length, command: (n) => `bookmark open ${n}` }
              : undefined,
        };
      }

      if (path === '/history' || path.startsWith('/history/')) {
        if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };
        if (onePerLine) {
          const lines = entries.map((e) => historyPlainLine(e));
          return { stdout: lines.join('\n'), exitCode: 0 };
        }
        const historyItems = entries.map((e) => ({
          index: (e.meta?.index as number) ?? 0,
          title: (e.meta?.title as string) ?? e.name,
          url: (e.meta?.url as string) ?? '',
          when: (e.meta?.when as string) ?? '',
        }));
        return {
          stdout:
            formatHistoryListing(historyItems, ctx.cols, {
              clickable: historyItems.length > 0,
              goCommand: (n) => `go ${historyItems[n - 1]?.url ?? ''}`,
            }) + clickableFooter('go URL'),
          exitCode: 0,
          clickableList:
            historyItems.length > 0
              ? {
                  count: historyItems.length,
                  command: (n) => `go ${historyItems[n - 1]?.url ?? ''}`,
                }
              : undefined,
        };
      }

      if (json) return { stdout: formatJson(entries), exitCode: 0, structured: entries };

      if (onePerLine) {
        const lines = entries.map((e) => (e.type === 'directory' ? `${e.name}/` : e.name));
        return { stdout: lines.join('\n'), exitCode: 0 };
      }

      const listing = formatDirListing(entries.map((e) => ({ name: e.name, type: e.type })), ctx.cols);
      const footer =
        path === '/'
          ? `\n${color('cd <dir> to enter — e.g. cd tabs, cd bookmarks', ANSI.dim)}`
          : `\n${color(`${entries.length} item${entries.length === 1 ? '' : 's'}`, ANSI.dim)}`;
      return { stdout: listing + footer, exitCode: 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { stderr: error(msg), exitCode: 1 };
    }
  },
});