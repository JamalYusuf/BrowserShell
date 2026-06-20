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
const OSC8_RE = /\x1b\]8;;[^\x1b]*\x1b\\/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '').replace(OSC8_RE, '');
}

export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

/** OSC-8 hyperlink — xterm linkifier activates bs://run/ URLs on click. */
export function clickableRunCell(command: string, label: string): string {
  const url = `bs://run/${encodeURIComponent(command)}`;
  return `\x1b]8;;${url}\x1b\\${color(label, ANSI.cyan)}\x1b]8;;\x1b\\`;
}

/** OSC-8 hyperlink for http(s) URLs — click opens, drag still selects text. */
export function hyperlinkUrl(url: string, label: string): string {
  if (!/^https?:\/\//i.test(url)) return color(label, ANSI.dim);
  return `\x1b]8;;${url}\x1b\\${color(label, ANSI.blue)}\x1b]8;;\x1b\\`;
}

export function formatUrlCell(url: string, maxWidth: number): string {
  const label = truncate(url, maxWidth);
  return hyperlinkUrl(url, label);
}

/** Subtle alternating backgrounds for scannable clickable lists. */
const CLICK_ROW_BG_EVEN = '\x1b[48;2;22;27;34m';
const CLICK_ROW_BG_ODD = '\x1b[48;2;17;22;29m';

/** Style a clickable list row for readability (no OSC-8 — avoids xterm's forced underline). */
export function styleClickableRow(cells: string[], _rowIndex: number): string[] {
  return cells.map((cell, ci) => {
    if (ci === 0) return color(cell, ANSI.bold + ANSI.cyan);
    if (ci === 1) return color(cell, ANSI.white);
    return color(cell, ANSI.dim);
  });
}

export function wrapClickableRow(paddedLine: string, rowIndex: number): string {
  const bg = rowIndex % 2 === 0 ? CLICK_ROW_BG_EVEN : CLICK_ROW_BG_ODD;
  return `${bg}${paddedLine}${ANSI.reset}`;
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
  options?: {
    colors?: (row: string[], index: number) => string[];
    maxWidth?: number;
    /** Clickable rows — styled for readability; host link provider handles clicks */
    clickable?: { command: (index: number) => string };
    /** Column indexes that render as OSC-8 http(s) hyperlinks */
    urlColumns?: number[];
  }
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

  const urlCols = new Set(options?.urlColumns ?? []);

  const body = plainRows
    .map((row, ri) => {
      let cells = options?.clickable ? styleClickableRow(row, ri) : [...row];
      if (urlCols.size) {
        cells = cells.map((cell, ci) => {
          if (!urlCols.has(ci)) return cell;
          const raw = stripAnsi(row[ci] ?? '');
          return raw ? formatUrlCell(raw, widths[ci]!) : cell;
        });
      }
      const padded = cells.map((c, ci) => padVisible(c, widths[ci]!)).join(gap);
      if (options?.clickable) {
        return wrapClickableRow(padded, ri);
      }
      return padded;
    })
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

export interface TabListFormatOptions {
  windowLabel?: string;
  windowIndex?: number;
  clickable?: boolean;
}

function tabSwitchCommand(index: number, windowIndex?: number): string {
  return windowIndex ? `tab switch ${index}@${windowIndex}` : `tab switch ${index}`;
}

/** Adaptive tab listing with 1-based index for easy switching. */
export function formatTabList(
  tabs: TabListItem[],
  cols: number,
  options: TabListFormatOptions = {}
): string {
  const { windowLabel, windowIndex, clickable = false } = options;
  const scope = windowLabel ? `window ${windowLabel}` : 'active window';
  const switchHint = windowIndex ? `tab switch <#>@${windowIndex}` : 'tab switch <#>';
  const hint = color(`(${scope} — click row · ${switchHint} · URLs clickable)`, ANSI.dim);

  if (cols >= 90) {
    const rows = tabs.map((t) => [
      String(t.index),
      truncate(t.title, 36),
      t.url,
      t.active ? color('●', ANSI.green) : ' ',
      t.pinned ? color('P', ANSI.yellow) : ' ',
      color(String(t.id), ANSI.dim),
    ]);
    return `${hint}\n${formatTable(['#', 'Title', 'URL', 'Act', 'Pin', 'ChromeID'], rows, {
      maxWidth: cols,
      clickable: clickable ? { command: (n) => tabSwitchCommand(n, windowIndex) } : undefined,
      urlColumns: clickable ? [2] : undefined,
      colors: (_row, i) => {
        const t = tabs[i]!;
        return [
          color(String(t.index), ANSI.cyan),
          t.active ? color(truncate(t.title, 36), ANSI.green) : truncate(t.title, 36),
          t.url,
          t.active ? color('●', ANSI.green) : ' ',
          t.pinned ? color('P', ANSI.yellow) : ' ',
          color(String(t.id), ANSI.dim),
        ];
      },
    })}`;
  }

  const body = tabs
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
        const url = formatUrlCell(t.url, Math.max(8, cols - 2));
        const head = `${flags}${flags ? ' ' : ''}${num}  ${t.active ? color(title, ANSI.green) : title}`;
        return `${head}\n  ${url}`;
      })
      .join('\n');

  if (cols < 60) return body;
  return `${hint}\n${body}`;
}

export function tabListClickable(tabs: TabListItem[], windowIndex?: number): {
  count: number;
  command: (index: number) => string;
} {
  return {
    count: tabs.length,
    command: (n) => tabSwitchCommand(n, windowIndex),
  };
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

export function formatBookmarkListing(
  items: BookmarkListItem[],
  cols: number,
  options?: { clickable?: boolean; openCommand?: (index: number) => string }
): string {
  const hint = color('(click row to open bookmark · click URL to open in browser)', ANSI.dim);
  const rows = items.map((item) => [
    item.type === 'directory' ? `${item.name}/` : item.name,
    item.type === 'directory' ? 'folder' : 'link',
    truncate(item.title, 28),
    item.url ?? '',
  ]);

  return `${hint}\n${formatTable(['Name', 'Type', 'Title', 'URL'], rows, {
    maxWidth: cols,
    clickable: options?.clickable
      ? {
          command: (n) => {
            const entry = items[n - 1];
            if (!entry) return 'bookmark open 1';
            if (entry.type === 'directory') return `cd /bookmarks/${entry.name}`;
            return options.openCommand?.(n) ?? `bookmark open ${n}`;
          },
        }
      : undefined,
    urlColumns: options?.clickable ? [3] : undefined,
    colors: (_row, i) => {
      const item = items[i]!;
      return [
        item.type === 'directory' ? color(`${item.name}/`, ANSI.blue) : color(item.name, ANSI.white),
        item.type === 'directory' ? color('folder', ANSI.blue) : color('link', ANSI.green),
        truncate(item.title, 28),
        item.url ?? '',
      ];
    },
  })}`;
}

export interface HistoryListItem {
  index: number;
  title: string;
  url: string;
  when: string;
}

export function formatHistoryListing(
  items: HistoryListItem[],
  cols: number,
  options?: { clickable?: boolean; goCommand?: (index: number) => string }
): string {
  const hint = color('(click row to open · click URL to copy/open — history | grep <term>)', ANSI.dim);
  const rows = items.map((item) => [
    String(item.index),
    truncate(item.title, 30),
    item.url,
    color(item.when, ANSI.dim),
  ]);
  return `${hint}\n${formatTable(['#', 'Title', 'URL', 'Visited'], rows, {
    maxWidth: cols,
    clickable: options?.clickable
      ? { command: (n) => options.goCommand?.(n) ?? `go ${items[n - 1]?.url ?? ''}` }
      : undefined,
    urlColumns: options?.clickable ? [2] : undefined,
    colors: (_row, i) => {
      const item = items[i]!;
      return [
        color(String(item.index), ANSI.cyan),
        truncate(item.title, 30),
        item.url,
        color(item.when, ANSI.dim),
      ];
    },
  })}`;
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

export interface PageMetaItem {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogImage: string;
  author: string;
  keywords: string;
}

const PAGE_META_FIELDS: { key: keyof PageMetaItem; label: string; accent?: string }[] = [
  { key: 'title', label: 'Title', accent: ANSI.cyan },
  { key: 'description', label: 'Description' },
  { key: 'canonical', label: 'Canonical', accent: ANSI.blue },
  { key: 'ogTitle', label: 'OG Title' },
  { key: 'ogImage', label: 'OG Image', accent: ANSI.magenta },
  { key: 'author', label: 'Author' },
  { key: 'keywords', label: 'Keywords', accent: ANSI.dim },
];

export function formatAudit(audit: {
  readyState: string;
  domNodes: number;
  scripts: number;
  stylesheets: number;
  images: number;
  links: number;
  forms: number;
  iframes: number;
  localStorageKeys: number;
  sessionStorageKeys: number;
  cookies: number;
  loadMs: number | null;
  domContentLoadedMs: number | null;
  transferKb: number | null;
  jsHeapMb: number | null;
}, cols: number): string {
  const hint = color('(page health — audit --json for raw)', ANSI.dim);
  const rows = [
    [color('Ready', ANSI.cyan), audit.readyState],
    [color('DOM nodes', ANSI.white), String(audit.domNodes)],
    [color('Scripts', ANSI.white), String(audit.scripts)],
    [color('Stylesheets', ANSI.white), String(audit.stylesheets)],
    [color('Images', ANSI.white), String(audit.images)],
    [color('Links', ANSI.white), String(audit.links)],
    [color('Forms', ANSI.white), String(audit.forms)],
    [color('Iframes', ANSI.white), String(audit.iframes)],
    [color('localStorage', ANSI.yellow), `${audit.localStorageKeys} keys`],
    [color('sessionStorage', ANSI.yellow), `${audit.sessionStorageKeys} keys`],
    [color('Cookies', ANSI.yellow), String(audit.cookies)],
    [color('DOM ready', ANSI.green), audit.domContentLoadedMs !== null ? `${audit.domContentLoadedMs}ms` : '—'],
    [color('Load', ANSI.green), audit.loadMs !== null ? `${audit.loadMs}ms` : '—'],
    [color('Transfer', ANSI.blue), audit.transferKb !== null ? `${audit.transferKb} KB` : '—'],
    [color('JS heap', ANSI.magenta), audit.jsHeapMb !== null ? `${audit.jsHeapMb} MB` : '—'],
  ];
  return `${hint}\n${formatTable(['Metric', 'Value'], rows, { maxWidth: cols })}`;
}

export function formatTech(items: { name: string; detail: string }[], cols: number): string {
  const hint = color('(stack detection — tech --json for raw)', ANSI.dim);
  if (!items.length) return `${hint}\n${color('No known frameworks detected.', ANSI.yellow)}`;
  const rows = items.map((t) => [color(t.name, ANSI.cyan), truncate(t.detail, Math.max(20, cols - 18))]);
  return `${hint}\n${formatTable(['Tech', 'Evidence'], rows, { maxWidth: cols })}`;
}

export function formatStorageList(items: { key: string; bytes: number; preview: string }[], area: string, cols: number): string {
  const hint = color(`(${area}Storage — storage get <key> to read)`, ANSI.dim);
  if (!items.length) return `${hint}\n${color('No keys found.', ANSI.yellow)}`;
  const rows = items.map((i) => [
    color(i.key, ANSI.cyan),
    `${i.bytes}B`,
    truncate(i.preview, Math.max(12, cols - 36)),
  ]);
  return `${hint}\n${formatTable(['Key', 'Size', 'Preview'], rows, { maxWidth: cols })}`;
}

export function formatReqs(items: { name: string; type: string; duration: number; size: number }[], cols: number): string {
  const hint = color('(resource timing — reqs --slow for bottlenecks)', ANSI.dim);
  if (!items.length) return `${hint}\n${color('No resource entries yet. Reload page first.', ANSI.yellow)}`;
  const rows = items.map((r) => {
    const slow = r.duration >= 1000;
    return [
      color(r.type, ANSI.blue),
      truncate(r.name, Math.max(16, cols - 34)),
      slow ? color(`${r.duration}ms`, ANSI.red) : `${r.duration}ms`,
      r.size ? `${Math.round(r.size / 1024)}KB` : '—',
    ];
  });
  return `${hint}\n${formatTable(['Type', 'URL', 'Time', 'Size'], rows, { maxWidth: cols })}`;
}

export function formatViewport(v: {
  innerWidth: number;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
  pageWidth: number;
  pageHeight: number;
  devicePixelRatio: number;
  scrollPercent: number;
}): string {
  const lines = [
    color('Viewport', ANSI.bold + ANSI.cyan),
    `  Window     ${v.innerWidth}×${v.innerHeight} @ ${v.devicePixelRatio}x DPR`,
    `  Page       ${v.pageWidth}×${v.pageHeight}`,
    `  Scroll     ${v.scrollX}, ${v.scrollY} (${v.scrollPercent}% down)`,
  ];
  return lines.join('\n');
}

export function formatFrames(items: { index: number; src: string; id: string; crossOrigin: boolean }[], cols: number): string {
  const hint = color('(embedded iframes on page)', ANSI.dim);
  if (!items.length) return `${hint}\n${color('No iframes found.', ANSI.yellow)}`;
  const rows = items.map((f) => [
    color(String(f.index), ANSI.cyan),
    truncate(f.src, Math.max(20, cols - 28)),
    f.id || '—',
    f.crossOrigin ? color('cross', ANSI.yellow) : color('same', ANSI.green),
  ]);
  return `${hint}\n${formatTable(['#', 'Src', 'Id', 'Origin'], rows, { maxWidth: cols })}`;
}

export function formatCookies(items: { name: string; value: string }[], cols: number): string {
  const hint = color('(document.cookie — httpOnly cookies not visible)', ANSI.dim);
  if (!items.length) return `${hint}\n${color('No cookies on this page.', ANSI.yellow)}`;
  const rows = items.map((c) => [
    color(c.name, ANSI.cyan),
    truncate(c.value, Math.max(16, cols - 20)),
  ]);
  return `${hint}\n${formatTable(['Name', 'Value'], rows, { maxWidth: cols })}`;
}

export function formatEnv(env: Record<string, string>, cols: number): string {
  const keys = Object.keys(env).sort();
  const hint = color('(shell env — export VAR=value to set)', ANSI.dim);
  if (!keys.length) return `${hint}\n${color('No exported variables.', ANSI.yellow)}`;
  const rows = keys.map((k) => [color(k, ANSI.cyan), truncate(env[k]!, Math.max(16, cols - 20))]);
  return `${hint}\n${formatTable(['Var', 'Value'], rows, { maxWidth: cols })}`;
}

export function formatPageMeta(meta: PageMetaItem, cols: number): string {
  const hint = color('(page <head> metadata — meta --json for raw)', ANSI.dim);
  const rows = PAGE_META_FIELDS.filter(({ key }) => meta[key]).map(({ key, label, accent }) => [
    color(label, accent ?? ANSI.white),
    truncate(meta[key], Math.max(24, cols - 22)),
  ]);
  if (!rows.length) return `${hint}\n${color('No metadata found on this page.', ANSI.yellow)}`;
  return `${hint}\n${formatTable(['Field', 'Value'], rows, { maxWidth: cols })}`;
}