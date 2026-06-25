/**
 * Unified keybinding engine — terminal, global/page, and editor layers.
 */

import type { RcBind } from './rc-parser';

export interface ParsedKeyChord {
  keys: string[];
  modifiers: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean };
  leader: boolean;
}

export interface ResolvedBinding {
  chord: ParsedKeyChord;
  action: string;
  scope: 'terminal' | 'global' | 'editor';
}

export interface LeaderState {
  active: boolean;
  at: number;
}

const LEADER_TIMEOUT_MS = 1200;

export function normalizeLeader(value: string | undefined): string {
  const v = (value ?? '<space>').trim().toLowerCase();
  if (v === '<space>' || v === 'space') return ' ';
  if (v.startsWith('<') && v.endsWith('>')) return v.slice(1, -1);
  return v;
}

export function parseKeyChord(raw: string, leaderKey: string): ParsedKeyChord {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const keys: string[] = [];
  const modifiers = { ctrl: false, alt: false, shift: false, meta: false };
  let leader = false;

  for (const token of tokens) {
    const t = token.toLowerCase();
    if (t === '<leader>') {
      leader = true;
      continue;
    }
    if (t === '<c-*>' || t === '<c-s>') {
      modifiers.ctrl = true;
      keys.push('s');
      continue;
    }
    const modMatch = t.match(/^<(c|a|s|m)-(.+)>$/);
    if (modMatch) {
      const mod = modMatch[1]!;
      const key = modMatch[2]!;
      if (mod === 'c') modifiers.ctrl = true;
      if (mod === 'a') modifiers.alt = true;
      if (mod === 's') modifiers.shift = true;
      if (mod === 'm') modifiers.meta = true;
      keys.push(normalizeKeyName(key));
      continue;
    }
    if (t.startsWith('<') && t.endsWith('>')) {
      keys.push(normalizeKeyName(t.slice(1, -1)));
      continue;
    }
    keys.push(normalizeKeyName(t));
  }

  if (leader && keys.length === 0 && leaderKey) {
    keys.push(leaderKey);
  }

  return { keys, modifiers, leader };
}

function normalizeKeyName(key: string): string {
  const k = key.toLowerCase();
  if (k === 'esc' || k === 'escape') return 'Escape';
  if (k === 'space') return ' ';
  if (k === 'enter' || k === 'return') return 'Enter';
  if (k === 'tab') return 'Tab';
  if (k === 'backspace') return 'Backspace';
  if (k.length === 1) return k;
  if (/^f\d{1,2}$/i.test(k)) return k.toUpperCase();
  return key;
}

export function resolveBindings(binds: RcBind[], leaderSetting?: string): ResolvedBinding[] {
  const leaderKey = normalizeLeader(leaderSetting);
  return binds.map((b) => ({
    chord: parseKeyChord(b.keys, leaderKey),
    action: b.action,
    scope: b.scope,
  }));
}

function eventKey(e: KeyboardEvent): string {
  if (e.key === ' ') return ' ';
  if (e.key.length === 1) return e.key;
  return e.key;
}

function modifiersMatch(e: KeyboardEvent, chord: ParsedKeyChord): boolean {
  return (
    e.ctrlKey === chord.modifiers.ctrl &&
    e.altKey === chord.modifiers.alt &&
    e.shiftKey === chord.modifiers.shift &&
    e.metaKey === chord.modifiers.meta
  );
}

function chordMatchesEvent(chord: ParsedKeyChord, e: KeyboardEvent, leaderState: LeaderState): boolean {
  if (chord.leader) {
    if (!leaderState.active) return false;
    if (Date.now() - leaderState.at > LEADER_TIMEOUT_MS) return false;
  }

  const key = eventKey(e);
  const expected = chord.keys[chord.keys.length - 1];
  if (!expected) return false;
  if (key !== expected && key.toLowerCase() !== expected.toLowerCase()) return false;
  return modifiersMatch(e, chord);
}

export function matchBinding(
  e: KeyboardEvent,
  bindings: ResolvedBinding[],
  scope: ResolvedBinding['scope'],
  leaderState: LeaderState,
  _leaderSetting?: string,
): string | null {
  const scoped = bindings.filter((b) => b.scope === scope);

  for (const binding of scoped) {
    if (chordMatchesEvent(binding.chord, e, leaderState)) {
      return binding.action;
    }
  }
  return null;
}

export function isLeaderKey(e: KeyboardEvent, leaderSetting?: string): boolean {
  const leaderKey = normalizeLeader(leaderSetting);
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  return eventKey(e) === leaderKey;
}

export function formatBindingKeys(raw: string): string {
  return raw.replace(/<leader>/gi, '␣').replace(/<c-/gi, 'Ctrl+').replace(/>/g, '');
}