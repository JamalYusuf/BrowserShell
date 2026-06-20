import { defineCommand } from '../define';
import { error, formatTable } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { clickableFooter, emptyListHint } from '../shared/list-hints';
import { domainHits, parseSearchArgs, unifiedSearch, type SearchHit } from '../shared/search-utils';

export const search = defineCommand({
  name: 'search',
  description: 'Fuzzy search tabs, bookmarks, history, and downloads.',
  usage: 'search <query> | search --tabs|--bookmarks|--history|--downloads <query>',
  examples: ['search github', 'search --tabs mail', 'search --history react', 'search --downloads pdf'],
  category: 'navigation',
  seeAlso: ['go', 'find', 'qf', 'bookmark'],
  notes: 'Click # to run the suggested command. Complements go (direct) with ranked results.',
  handler: async (args, ctx) => {
    const { query, scope } = parseSearchArgs(filterFlags(args));
    if (!query) return { stderr: error('Usage: search [--tabs|--bookmarks|--history|--downloads] <query>'), exitCode: 2 };

    let hits = await unifiedSearch(ctx, query, scope);
    if (!hits.length && scope === 'all' && query.includes('.')) {
      hits = domainHits(ctx, query);
    }
    if (!hits.length) {
      return { stdout: emptyListHint('search', `"${query}"`), exitCode: 0 };
    }

    const rows = hits.map((h: SearchHit, i) => [String(i + 1), h.kind, h.title.slice(0, 28), h.subtitle.slice(0, 36)]);
    return {
      stdout:
        formatTable(['#', 'Type', 'Title', 'Detail'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => hits[n - 1]!.command },
        }) + clickableFooter('runs suggested command'),
      exitCode: 0,
      clickableList: {
        count: hits.length,
        command: (n) => hits[n - 1]!.command,
      },
    };
  },
});