import { describe, expect, it } from 'vitest';
import { clickableRunCell, formatTable, stripAnsi, styleClickableRow, wrapClickableRow } from '@/shell/output';

describe('clickableRunCell', () => {
  it('embeds bs://run/ OSC-8 hyperlink for single cells', () => {
    const cell = clickableRunCell('link 3', '3');
    expect(cell).toContain('\x1b]8;;bs://run/');
    expect(cell).toContain(encodeURIComponent('link 3'));
    expect(stripAnsi(cell)).toBe('3');
  });
});

describe('clickable row styling', () => {
  it('styles #, title, and detail columns distinctly', () => {
    const styled = styleClickableRow(['1', 'Home', 'https://example.com'], 0);
    expect(stripAnsi(styled[0]!)).toBe('1');
    expect(stripAnsi(styled[1]!)).toBe('Home');
    expect(styled[0]).toContain('\x1b[');
    expect(styled[1]).toContain('\x1b[');
  });

  it('applies subtle zebra backgrounds', () => {
    const line = wrapClickableRow('1  Home', 0);
    expect(line).toContain('\x1b[48;2;');
    expect(line).toContain('\x1b[0m');
  });
});

describe('formatTable clickable rows', () => {
  it('renders styled rows without OSC-8 underlines', () => {
    const out = formatTable(['#', 'Text'], [['1', 'Home']], {
      clickable: { command: (n) => `link ${n}` },
    });
    expect(out).not.toContain('bs://run/');
    expect(stripAnsi(out.split('\n').pop()!)).toContain('Home');
    expect(out).toContain('\x1b[48;2;');
  });
});