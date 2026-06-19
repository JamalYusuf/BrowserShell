import { describe, expect, it } from 'vitest';
import { ANSI, color, formatDirListing, formatTabList, formatTable, stripAnsi, visibleLength } from '@/shell/output';
import { toTerminalOutput } from '@/shell/terminal-write';

describe('output formatting', () => {
  it('strips ANSI codes for width calculation', () => {
    const colored = color('d', ANSI.blue);
    expect(stripAnsi(colored)).toBe('d');
    expect(visibleLength(colored)).toBe(1);
  });

  it('aligns tables with colored cells', () => {
    const rows = [
      [color('d', ANSI.blue), 'tabs', 'directory'],
      [color('d', ANSI.blue), 'bookmarks', 'directory'],
    ];
    const table = formatTable(['', 'Name', 'Type'], rows, { maxWidth: 80 });
    const lines = table.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const dataLines = lines.slice(2);
    const nameCols = dataLines.map((l) => (l.indexOf('tabs') >= 0 ? l.indexOf('tabs') : l.indexOf('bookmarks')));
    expect(nameCols[0]).toBe(nameCols[1]);
  });

  it('formats directory listings within width', () => {
    const out = formatDirListing(
      [
        { name: 'tabs', type: 'directory' },
        { name: 'current', type: 'symlink' },
      ],
      40
    );
    expect(out).toContain('tabs/');
    expect(out).toContain('current@');
    expect(visibleLength(out.split('\n')[0]!)).toBeLessThanOrEqual(40);
  });

  it('uses compact tab layout for narrow terminals', () => {
    const out = formatTabList(
      [
        { id: 1442819417, index: 1, title: 'Example Tab With Long Title', url: 'https://example.com/path', active: true, pinned: false },
        { id: 1442819667, index: 2, title: 'GitHub', url: 'https://github.com', active: false, pinned: true },
      ],
      45
    );
    expect(out).toContain('#1');
    expect(out).toContain('#2');
    const lines = out.split('\n');
    expect(lines.length).toBeGreaterThan(2);
    expect(visibleLength(lines[0]!)).toBeLessThanOrEqual(45);
  });

  it('converts LF to CRLF for terminal output', () => {
    expect(toTerminalOutput('a\nb')).toBe('a\r\nb');
    expect(toTerminalOutput('line\n')).toBe('line\r\n');
  });
});