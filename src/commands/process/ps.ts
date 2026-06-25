import { defineCommand } from '../define';
import { formatJson } from '@/shell/output';
import { hasFlag } from '../shared/args';
import { clickableFooter } from '../shared/list-hints';
import { getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';

interface ProcessRow {
  pid: number;
  windowIndex: number;
  tabIndex: number;
  title: string;
  url: string;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  discarded: boolean;
}

export const ps = defineCommand({
  name: 'ps',
  description: 'List open tabs as processes (PID = tab ID).',
  usage: 'ps [aux] [--json] [--limit N]',
  examples: ['ps', 'ps aux', 'ps --json', 'kill 7', 'pkill youtube'],
  category: 'process',
  seeAlso: ['top', 'kill', 'pkill', 'tabs', 'tab'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const verbose = hasFlag(args, 'aux') || args.includes('aux');
    const limitMatch = args.find((a) => a.startsWith('--limit'));
    const limit = limitMatch ? Number(limitMatch.split('=')[1] ?? args[args.indexOf('--limit') + 1]) : 0;

    const wins = await getAllWindows(ctx.chrome);
    const rows: ProcessRow[] = [];

    for (let wi = 0; wi < wins.length; wi++) {
      const tabs = await getWindowTabs(ctx.chrome, wins[wi]!.id);
      for (let ti = 0; ti < tabs.length; ti++) {
        const t = tabs[ti]!;
        rows.push({
          pid: t.id,
          windowIndex: wi + 1,
          tabIndex: ti + 1,
          title: t.title,
          url: t.url,
          active: !!t.active,
          pinned: !!t.pinned,
          audible: !!t.audible,
          discarded: !!(t as { discarded?: boolean }).discarded,
        });
      }
    }

    const shown = limit > 0 ? rows.slice(0, limit) : rows;

    if (json) {
      return { stdout: formatJson(shown), exitCode: 0, structured: shown };
    }

    const header = verbose
      ? '  PID  W  #  STAT        TITLE'
      : '  PID  W  #  TITLE';
    const lines = shown.map((r, i) => {
      const stat = [
        r.active ? 'A' : '-',
        r.pinned ? 'P' : '-',
        r.audible ? 'S' : '-',
        r.discarded ? 'D' : '-',
      ].join('');
      const title = truncateTitle(r.title, ctx.cols - 30);
      return verbose
        ? `${String(i + 1).padStart(4)}  ${String(r.pid).padStart(5)}  ${r.windowIndex}  ${r.tabIndex}  ${stat.padEnd(10)}  ${title}`
        : `${String(i + 1).padStart(4)}  ${String(r.pid).padStart(5)}  ${r.windowIndex}  ${r.tabIndex}  ${title}`;
    });

    return {
      stdout: [header, ...lines].join('\n') + clickableFooter('kill <#> · kill <PID>'),
      exitCode: 0,
      clickableList: {
        count: shown.length,
        command: (index) => `kill ${shown[index - 1]!.pid}`,
      },
    };
  },
});