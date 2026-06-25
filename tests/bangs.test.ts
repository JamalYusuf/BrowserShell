import { describe, expect, it } from 'vitest';
import { bangToCommand, parseBangInvocation, resolveBangUrl, mergeBangs } from '@/shared/bangs';
import { expandBangAsync } from '@/shell/history-expand';

describe('bangs', () => {
  it('resolves built-in gh bang', () => {
    const cmd = bangToCommand('gh', 'BrowserShell');
    expect(cmd).toBe('go https://github.com/search?q=BrowserShell');
  });

  it('parses go !bang invocations', () => {
    const parsed = parseBangInvocation('go !yt lo-fi beats');
    expect(parsed).toEqual({ name: 'yt', query: 'lo-fi beats' });
  });

  it('encodes query in url template', () => {
    const url = resolveBangUrl('https://example.com?q=%s', 'hello world');
    expect(url).toBe('https://example.com?q=hello%20world');
  });

  it('merges custom bangs over builtins', () => {
    const all = mergeBangs({ gh: { url: 'https://custom.example/%s' } });
    const gh = all.find((b) => b.name === 'gh');
    expect(gh?.url).toBe('https://custom.example/%s');
  });

  it('expands bang invocations via expandBangAsync', async () => {
    const expanded = await expandBangAsync('!gh BrowserShell');
    expect(expanded).toBe('go https://github.com/search?q=BrowserShell');
  });

  it('parses standalone bang invocations', () => {
    const parsed = parseBangInvocation('!yt jazz');
    expect(parsed).toEqual({ name: 'yt', query: 'jazz' });
  });
});