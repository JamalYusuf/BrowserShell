import { describe, expect, it } from 'vitest';
import { findUrlsInLine } from '@/shell/url-links';
import { formatTabList, hyperlinkUrl, stripAnsi, tabListClickable } from '@/shell/output';

describe('hyperlinkUrl', () => {
  it('wraps http URLs in OSC-8', () => {
    const cell = hyperlinkUrl('https://example.com', 'https://example.com');
    expect(cell).toContain('\x1b]8;;https://example.com\x1b\\');
    expect(stripAnsi(cell)).toBe('https://example.com');
  });

  it('leaves non-http text dim', () => {
    const cell = hyperlinkUrl('chrome://extensions', 'chrome://extensions');
    expect(cell).not.toContain('\x1b]8;;');
  });
});

describe('findUrlsInLine', () => {
  it('finds URLs in plain lines', () => {
    const hits = findUrlsInLine('  https://github.com/foo  tail');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.url).toBe('https://github.com/foo');
    expect(hits[0]!.xStart).toBe(2);
  });
});

describe('formatTabList', () => {
  it('includes clickable metadata and URL hyperlinks', () => {
    const out = formatTabList(
      [{ id: 1, index: 1, title: 'HN', url: 'https://news.ycombinator.com', active: true, pinned: false }],
      100,
      { clickable: true }
    );
    expect(out).toContain('\x1b]8;;https://news.ycombinator.com');
    expect(out).toContain('\x1b[48;2;');
    const ctx = tabListClickable(
      [{ id: 1, index: 1, title: 'HN', url: 'https://news.ycombinator.com', active: true, pinned: false }]
    );
    expect(ctx.command(1)).toBe('tab switch 1');
  });
});