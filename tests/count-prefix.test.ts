import { describe, expect, it } from 'vitest';
import { CountPrefix } from '@/shared/count-prefix';
import { KeySequenceEngine, resolveSequenceBindings } from '@/shared/key-sequence';
import { parseRc } from '@/shared/rc-parser';
import { DEFAULT_RC } from '@/shared/default-rc';

describe('count-prefix', () => {
  it('accumulates multi-digit counts', () => {
    const cp = new CountPrefix();
    expect(cp.feedDigit('5')).toBe(true);
    expect(cp.feedDigit('2')).toBe(true);
    expect(cp.peek()).toBe(52);
    expect(cp.consume()).toBe(52);
    expect(cp.peek()).toBe(1);
  });

  it('defaults to 1 when no prefix', () => {
    const cp = new CountPrefix();
    expect(cp.consume()).toBe(1);
  });

  it('g0 sequence does not conflict with count digit after reset', () => {
    const parsed = parseRc(DEFAULT_RC);
    const bindings = resolveSequenceBindings(parsed.binds, '<space>');
    const engine = new KeySequenceEngine();
    const cp = new CountPrefix();

    cp.feedDigit('5');
    expect(cp.peek()).toBe(5);

    const g = engine.match({ key: 'g' }, bindings, 'global');
    expect(g).toBeNull();
    expect(engine.hasPartialBuffer()).toBe(true);

    const zero = engine.match({ key: '0' }, bindings, 'global');
    expect(zero?.action).toBe('tab-first');
    expect(cp.peek()).toBe(5);
  });
});