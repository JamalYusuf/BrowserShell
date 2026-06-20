import { defineCommand } from '../define';
import { error, formatTable, success } from '@/shell/output';
import { filterFlags } from '../shared/args';
import { clickableFooter, emptyListHint } from '../shared/list-hints';

export const recent = defineCommand({
  name: 'recent',
  description: 'List and restore recently closed tabs or windows.',
  usage: 'recent | recent restore <#>',
  examples: ['recent', 'recent restore 1'],
  category: 'tabs',
  seeAlso: ['session', 'tabs', 'open'],
  notes: 'Uses Chrome recently closed sessions. Click # to restore.',
  handler: async (args, ctx) => {
    const parts = filterFlags(args);
    const sub = parts[0];

    const sessions = await ctx.chrome.sessions.getRecentlyClosed(true);
    const entries = sessions
      .map((s, i) => {
        if (s.tab) {
          return {
            index: i + 1,
            type: 'tab' as const,
            title: s.tab.title,
            detail: s.tab.url ?? '',
            sessionId: s.sessionId,
          };
        }
        if (s.window?.tabs?.length) {
          const t = s.window.tabs.find((x) => x.active) ?? s.window.tabs[0]!;
          return {
            index: i + 1,
            type: 'window' as const,
            title: `${s.window.tabs.length} tabs`,
            detail: t.title ?? t.url ?? '',
            sessionId: s.sessionId,
          };
        }
        return null;
      })
      .filter((e): e is NonNullable<typeof e> => !!e);

    if (sub === 'restore') {
      const target = parts[1];
      if (!target || !/^\d+$/.test(target)) {
        return { stderr: error('Usage: recent restore <#>'), exitCode: 2 };
      }
      const entry = entries[Number(target) - 1];
      if (!entry) return { stderr: error(`Recent #${target} not found. Run recent first.`), exitCode: 1 };
      await ctx.chrome.sessions.restore(entry.sessionId);
      return { stdout: success(`Restored ${entry.type}: ${entry.title}`), exitCode: 0 };
    }

    if (sub && sub !== 'restore') {
      return { stderr: error('Usage: recent | recent restore <#>'), exitCode: 2 };
    }

    if (!entries.length) {
      return { stdout: emptyListHint('recent'), exitCode: 0 };
    }

    const rows = entries.map((e) => [String(e.index), e.type, e.title.slice(0, 28), e.detail.slice(0, 36)]);
    return {
      stdout:
        formatTable(['#', 'Type', 'Title', 'Detail'], rows, {
          maxWidth: ctx.cols,
          clickable: { command: (n) => `recent restore ${n}` },
        }) + clickableFooter('recent restore <#>'),
      exitCode: 0,
      clickableList: {
        count: entries.length,
        command: (n) => `recent restore ${n}`,
      },
    };
  },
});