import { describe, expect, it } from 'vitest';
import { dataToStroke, expandKeyString, KeySequenceEngine, resolveSequenceBindings, scopeUsesLeader } from '@/shared/key-sequence';
import { parseRc } from '@/shared/rc-parser';
import { DEFAULT_RC } from '@/shared/default-rc';
import { bootstrapRuntimeConfig, invalidateConfigCache } from '@/shared/config-service';

describe('key-sequence', () => {
  it('expands gg into two strokes', () => {
    const strokes = expandKeyString('gg');
    expect(strokes).toHaveLength(2);
    expect(strokes[0]?.key).toBe('g');
    expect(strokes[1]?.key).toBe('g');
  });

  it('expands <leader>e into leader + e', () => {
    const strokes = expandKeyString('<leader>e', '<space>');
    expect(strokes).toHaveLength(2);
    expect(strokes[0]?.leader).toBe(true);
    expect(strokes[0]?.key).toBe(' ');
    expect(strokes[1]?.key).toBe('e');
  });

  it('matches <leader>e from default rc', () => {
    const parsed = parseRc(DEFAULT_RC);
    const bindings = resolveSequenceBindings(parsed.binds, '<space>');
    const edit = bindings.find((b) => b.action === 'edit');
    expect(edit?.strokes[0]?.key).toBe(' ');

    const engine = new KeySequenceEngine();
    const m1 = engine.match({ key: ' ', leader: true }, bindings, 'global');
    expect(m1).toBeNull();
    const m2 = engine.match({ key: 'e' }, bindings, 'global');
    expect(m2?.action).toBe('edit');
  });

  it('expands F with shift modifier', () => {
    const strokes = expandKeyString('F');
    expect(strokes[0]?.key).toBe('f');
    expect(strokes[0]?.shift).toBe(true);
  });

  it('expands <c-s> with ctrl', () => {
    const strokes = expandKeyString('<c-s>');
    expect(strokes[0]?.key).toBe('s');
    expect(strokes[0]?.ctrl).toBe(true);
  });

  it('matches gi sequence from default rc', () => {
    const parsed = parseRc(DEFAULT_RC);
    const bindings = resolveSequenceBindings(parsed.binds, '<space>');
    const gi = bindings.find((b) => b.action === 'focus-first-input');
    expect(gi?.strokes).toHaveLength(2);
    expect(gi?.strokes[0]?.key).toBe('g');
    expect(gi?.strokes[1]?.key).toBe('i');

    const engine = new KeySequenceEngine();
    const m1 = engine.match({ key: 'g' }, bindings, 'global');
    expect(m1).toBeNull();
    const m2 = engine.match({ key: 'i' }, bindings, 'global');
    expect(m2?.action).toBe('focus-first-input');
  });

  it('detects leader binds per scope', () => {
    const parsed = parseRc(DEFAULT_RC);
    const bindings = resolveSequenceBindings(parsed.binds, '<space>');
    expect(scopeUsesLeader(bindings, 'global')).toBe(true);
    expect(scopeUsesLeader(bindings, 'terminal')).toBe(false);
  });

  it('maps xterm data to editor strokes', () => {
    expect(dataToStroke('\x13')).toEqual({ key: 's', ctrl: true });
    expect(dataToStroke('\x1b[D')?.key).toBe('h');
    expect(dataToStroke('\x1b')?.key).toBe('Escape');
  });

  it('bootstrap includes f hint bind from default rc', () => {
    invalidateConfigCache();
    const runtime = bootstrapRuntimeConfig();
    const f = runtime.sequences.find((b) => b.action === 'hints-current' && b.scope === 'global');
    expect(f?.strokes[0]?.key).toBe('f');
    expect(runtime.shell.globalHotkeys).toBe(true);
  });
});