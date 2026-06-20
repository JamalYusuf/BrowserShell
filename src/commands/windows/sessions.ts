import { defineCommand } from '../define';
import { hasFlag } from '../shared/args';
import { getActiveWindowId, getAllWindows, getWindowTabs } from '../shared/window-utils';
import { truncateTitle } from '../shared/text';
import { ANSI, color, formatJson } from '@/shell/output';

export const sessions = defineCommand({
  name: 'sessions',
  description: 'Tree view of all windows and their tabs.',
  usage: 'sessions [--json]',
  examples: ['sessions', 'sessions | grep github', 'find mail'],
  category: 'tabs',
  seeAlso: ['windows', 'tabs', 'find'],
  handler: async (args, ctx) => {
    const json = hasFlag(args, '--json');
    const wins = await getAllWindows(ctx.chrome);
    const activeWin = await getActiveWindowId(ctx);

    const data = [];
    for (const w of wins) {
      const tabs = await getWindowTabs(ctx.chrome, w.id);
      const wIndex = wins.findIndex((x) => x.id === w.id) + 1;
      data.push({
        window: wIndex,
        windowId: w.id,
        focused: w.focused,
        context: w.id === activeWin,
        tabs: tabs.map((t, i) => ({ index: i + 1, id: t.id, title: t.title, url: t.url, active: t.active })),
      });
    }

    if (json) return { stdout: formatJson(data), exitCode: 0 };

    const lines: string[] = [color('(use: tab switch <#>@<W#>  or  window focus <W#>)', ANSI.dim)];
    for (const s of data) {
      const ctxMark = s.context ? color('*', ANSI.yellow) : ' ';
      const foc = s.focused ? color('●', ANSI.green) : ' ';
      lines.push(`${foc}${ctxMark} ${color(`W#${s.window}`, ANSI.cyan)}  ${s.tabs.length} tab(s)`);
      for (const t of s.tabs) {
        const title = t.active ? color(truncateTitle(t.title), ANSI.green) : truncateTitle(t.title);
        lines.push(`      ${t.active ? '●' : ' '} #${t.index}  ${title}`);
        lines.push(`        ${color(t.url.slice(0, 64), ANSI.dim)}`);
      }
    }
    return { stdout: lines.join('\n'), exitCode: 0 };
  },
});