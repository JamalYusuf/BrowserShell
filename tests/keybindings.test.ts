import { describe, expect, it } from 'vitest';
import { parseKeyChord, resolveBindings, normalizeLeader } from '@/shared/keybindings';
import type { RcBind } from '@/shared/rc-parser';

describe('keybindings', () => {
  it('parses modifier chords', () => {
    const chord = parseKeyChord('<c-s>', '<space>');
    expect(chord.modifiers.ctrl).toBe(true);
    expect(chord.keys).toContain('s');
  });

  it('parses leader sequences', () => {
    const chord = parseKeyChord('<leader> e', '<space>');
    expect(chord.leader).toBe(true);
    expect(chord.keys).toContain('e');
  });

  it('resolves bindings from rc binds', () => {
    const binds: RcBind[] = [{ keys: 'f', action: 'hints-current', scope: 'global' }];
    const resolved = resolveBindings(binds, normalizeLeader('<space>'));
    expect(resolved[0]?.action).toBe('hints-current');
  });
});