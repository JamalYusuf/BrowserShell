import { describe, expect, it } from 'vitest';

describe('seek regex parsing', () => {
  function parseRegexQuery(q: string): RegExp | null {
    if (!q.startsWith('/') || q.length < 3) return null;
    const last = q.lastIndexOf('/');
    if (last <= 0) return null;
    const body = q.slice(1, last);
    const flags = q.slice(last + 1);
    try {
      return new RegExp(body, flags.includes('i') ? 'i' : '');
    } catch {
      return null;
    }
  }

  it('parses /foo/i', () => {
    const re = parseRegexQuery('/foo/i');
    expect(re?.source).toBe('foo');
    expect(re?.flags).toContain('i');
  });

  it('parses /bar/', () => {
    const re = parseRegexQuery('/bar/');
    expect(re?.source).toBe('bar');
  });

  it('rejects invalid patterns', () => {
    expect(parseRegexQuery('plain')).toBeNull();
    expect(parseRegexQuery('/[/')).toBeNull();
  });
});