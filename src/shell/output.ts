/** ANSI output helpers and table formatting. */

import { truncate } from './terminal-write';

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

export function color(text: string, colorCode: string): string {
  return `${colorCode}${text}${ANSI.reset}`;
}

export function error(text: string): string {
  return color(text, ANSI.red);
}

export function success(text: string): string {
  return color(text, ANSI.green);
}

export function warn(text: string): string {
  return color(text, ANSI.yellow);
}

export function heading(text: string): string {
  return color(text, ANSI.bold + ANSI.cyan);
}

function padVisible(text: string, width: number): string {
  const pad = Math.max(0, width - visibleLength(text));
  return text + ' '.repeat(pad);
}

export function formatTable(
  headers: string[],
  rows: string[][],
  options?: { colors?: (row: string[], index: number) => string[]; maxWidth?: number }
): string {
  const maxWidth = options?.maxWidth ?? 120;
  const plainRows = rows.map((row, idx) => options?.colors?.(row, idx) ?? row);

  let widths = headers.map((h, i) =>
    Math.max(visibleLength(h), ...plainRows.map((r) => visibleLength(r[i] ?? '')))
  );

  const gap = '  ';
  const gapLen = gap.length;
  let total = widths.reduce((a, w) => a + w, 0) + gapLen * (widths.length - 1);

  if (total > maxWidth && widths.length > 1) {
    const excess = total - maxWidth;
    const flexSum = widths.slice(1).reduce((a, b) => a + b, 0) || 1;
    widths = widths.map((w, i) => {
      if (i === 0) return w;
      const shrink = Math.floor((excess * w) / flexSum);
      return Math.max(4, w - shrink);
    });

    plainRows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (ci > 0 && visibleLength(cell) > widths[ci]!) {
          const plain = stripAnsi(cell);
          const truncated = truncate(plain, widths[ci]!);
          plainRows[ri]![ci] = cell.includes('\x1b') ? cell.replace(plain, truncated) : truncated;
        }
      });
    });
  }

  const headerLine = headers.map((h, i) => padVisible(truncate(h, widths[i]!), widths[i]!)).join(gap);
  const divider = widths.map((w) => '─'.repeat(w)).join(gap);

  const body = plainRows
    .map((row) => row.map((c, i) => padVisible(c, widths[i]!)).join(gap))
    .join('\n');

  return `${color(headerLine, ANSI.bold)}\n${color(divider, ANSI.gray)}\n${body}`;
}

export interface TabListItem {
  id: number;
  index: number;
  title: string;
  url: string;
  active: boolean;
  pinned: boolean;
}

export interface WindowListItem {
  id: number;
  index: number;
  focused: boolean;
  tabCount: number;
  title: string;
}

export function formatWindowList(windows: WindowListItem[], activeId: number, cols: number): string {
  const hint = color('(use: window focus <W#> — tabs then lists that window)', ANSI.dim);
  const rows = windows.map((w) => [
    color(`W#${w.index}`, ANSI.cyan),
    w.focused ? color('●', ANSI.green) : ' ',
    w.id === activeId ? color('*', ANSI.yellow) : ' ',
    String(w.tabCount),
    truncate(w.title, Math.max(12, cols - 36)),
    color(String(w.id), ANSI.dim),
  ]);
  return `${hint}\n${formatTable(['Win', 'Foc', 'Ctx', 'Tabs', 'Title', 'ChromeID'], rows, { maxWidth: cols })}`;
}

/** Adaptive tab listing with 1-based index for easy switching. */
export function formatTabList(tabs: TabListItem[], cols: number, windowLabel?: string): string {
  const scope = windowLabel ? `window ${windowLabel}` : 'active window';
  const hint = color(`(${scope} — tab switch <#> or <#>@<W#>)`, ANSI.dim);

  if (cols >= 90) {
    const rows = tabs.map((t) => [
      color(String(t.index), ANSI.cyan),
      truncate(t.title, 36),
      truncate(t.url, 40),
      t.active ? color('●', ANSI.green) : ' ',
      t.pinned ? color('P', ANSI.yellow) : ' ',
      color(String(t.id), ANSI.dim),
    ]);
    return `${hint}\n${formatTable(['#', 'Title', 'URL', 'Act', 'Pin', 'ChromeID'], rows, {
      maxWidth: cols,
      colors: (row, i) => (tabs[i]!.active ? row.map((c, ci) => (ci === 5 ? c : color(stripAnsi(c), ANSI.green))) : row),
    })}`;
  }

  return (
    hint +
    '\n' +
    tabs
      .map((t) => {
        const flags = [
          t.active ? color('●', ANSI.green) : ' ',
          t.pinned ? color('P', ANSI.yellow) : ' ',
        ]
          .filter((f) => f.trim())
          .join('');
        const num = color(`#${t.index}`, ANSI.cyan);
        const titleBudget = Math.max(8, cols - 8 - flags.length);
        const title = truncate(t.title, titleBudget);
        const url = truncate(t.url, Math.max(8, cols - 2));
        const head = `${flags}${flags ? ' ' : ''}${num}  ${t.active ? color(title, ANSI.green) : title}`;
        return `${head}\n  ${color(url, ANSI.dim)}`;
      })
      .join('\n')
  );
}

export function formatDirListing(
  entries: { name: string; type: string }[],
  cols = 80
): string {
  const items = entries.map((e) => {
    if (e.type === 'directory') return color(`${e.name}/`, ANSI.blue);
    if (e.type === 'symlink') return color(`${e.name}@`, ANSI.magenta);
    return e.name;
  });

  const maxWidth = Math.max(24, cols);
  let line = '';
  const lines: string[] = [];

  for (const item of items) {
    const itemLen = visibleLength(item) + 2;
    if (line.length > 0 && visibleLength(line) + itemLen > maxWidth) {
      lines.push(line.trimEnd());
      line = '';
    }
    line += item + '  ';
  }
  if (line.trim()) lines.push(line.trimEnd());

  return lines.join('\n');
}

export interface BookmarkListItem {
  name: string;
  title: string;
  type: 'file' | 'directory';
  url?: string;
}

export function formatBookmarkListing(items: BookmarkListItem[], cols: number): string {
  const hint = color('(cd <folder>/ to browse — cat <link> or open <path>)', ANSI.dim);
  const rows = items.map((item) => [
    item.type === 'directory' ? color(`${item.name}/`, ANSI.blue) : color(item.name, ANSI.white),
    item.type === 'directory' ? color('folder', ANSI.blue) : color('link', ANSI.green),
    truncate(item.title, 28),
    item.url ? truncate(item.url, Math.max(12, cols - 50)) : '',
  ]);
  return `${hint}\n${formatTable(['Name', 'Type', 'Title', 'URL'], rows, { maxWidth: cols })}`;
}

export interface HistoryListItem {
  index: number;
  title: string;
  url: string;
  when: string;
}

export function formatHistoryListing(items: HistoryListItem[], cols: number): string {
  const hint = color('(cat /history/<entry> for details — or: history | grep <term>)', ANSI.dim);
  const rows = items.map((item) => [
    color(String(item.index), ANSI.cyan),
    truncate(item.title, 30),
    truncate(item.url, Math.max(16, cols - 44)),
    color(item.when, ANSI.dim),
  ]);
  return `${hint}\n${formatTable(['#', 'Title', 'URL', 'Visited'], rows, { maxWidth: cols })}`;
}

export function formatManPage(
  name: string,
  sections: { heading: string; content: string }[]
): string {
  const lines: string[] = [heading(`${name.toUpperCase()}(1)`), ''];
  for (const section of sections) {
    lines.push(heading(section.heading));
    lines.push(section.content);
    lines.push('');
  }
  return lines.join('\n');
}

export function suggestCommand(input: string, candidates: string[]): string | undefined {
  if (candidates.includes(input)) return undefined;
  const lower = input.toLowerCase();
  const match = candidates.find(
    (c) => c.toLowerCase().startsWith(lower) || c.toLowerCase().includes(lower)
  );
  return match ? `Did you mean "${match}"?` : undefined;
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}