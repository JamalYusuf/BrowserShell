import { describe, expect, it } from 'vitest';
import { charMatchesToggleKey, matchesToggleKey, normalizeToggleKey } from '@/shared/toggle-key';

describe('toggle key', () => {
  it('normalizes backquote aliases', () => {
    expect(normalizeToggleKey('Backquote')).toBe('`');
    expect(normalizeToggleKey('grave')).toBe('`');
  });

  it('matches backtick via keyboard code', () => {
    expect(matchesToggleKey({ key: '`', code: 'Backquote' }, '`')).toBe(true);
    expect(matchesToggleKey({ key: '~', code: 'Backquote', shiftKey: true }, '`')).toBe(false);
  });

  it('matches character input in terminal', () => {
    expect(charMatchesToggleKey('`', '`')).toBe(true);
    expect(charMatchesToggleKey('a', '`')).toBe(false);
  });

  it('matches function keys', () => {
    expect(matchesToggleKey({ key: 'F2', code: 'F2' }, 'F2')).toBe(true);
  });
});