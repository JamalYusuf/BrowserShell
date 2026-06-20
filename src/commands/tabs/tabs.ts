import { defineCommand } from '../define';
import { formatJson, formatTabList } from '@/shell/output';
import { clickableFooter } from '../shared/list-hints';
import { hasFlag } from '../shared/args';
import { ls } from '../builtin/ls';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { tabListItems } from '../shared/tab-utils';

export const tabs = defineCommand({
  name: 'tabs',
  description: 'List tabs in the active shell window (same numbers as tab switch).',
  usage: 'tabs [--all] [--json]',
  examples: ['tabs', 'tabs --all', 'tabs --all --json', 'tab switch 2@2'],
  category: 'tabs',
  seeAlso: ['tab', 'pinned', 'domain', 'ls'],
  handler: async (args, ctx) => {
    if (!hasFlag(args, '--all')) {
      return ls.handler(hasFlag(args, '--json') ? ['--json', '/tabs'] : ['/tabs'], ctx);
    }

    const json = hasFlag(args, '--json');
    const wins = await getAllWindows(ctx.chrome);
    const all: { windowIndex: number; tab: ReturnType<typeof tabListItems>[number] }[] = [];

    for (let i = 0; i < wins.length; i++) {
      const winTabs = await getWindowTabs(ctx.chrome, wins[i]!.id);
      for (const t of tabListItems(winTabs)) {
        all.push({ windowIndex: i + 1, tab: t });
      }
    }

    if (json) {
      const structured = all.map(({ windowIndex, tab }) => ({ ...tab, windowIndex }));
      return { stdout: formatJson(structured), exitCode: 0, structured };
    }

    if (ctx.piped) {
      const lines = all.map(({ windowIndex, tab }) =>
        `W#${windowIndex} #${tab.index}\t${tab.title}\t${tab.url}${tab.active ? '\t*' : ''}${tab.pinned ? '\tP' : ''}`
      );
      return { stdout: lines.join('\n'), exitCode: 0 };
    }

    const blocks = wins.map((_w, i) => {
      const winTabs = all.filter((a) => a.windowIndex === i + 1).map((a) => a.tab);
      return `W#${i + 1}\n${formatTabList(winTabs, ctx.cols, {
        windowIndex: i + 1,
        clickable: true,
      })}`;
    });
    return {
      stdout: blocks.join('\n\n') + clickableFooter('tab switch <#>@<W#> · click URLs to open'),
      exitCode: 0,
    };
  },
});