/**
 * Key sequence matching for binds like gg, gi, yy, <leader>e, <c-s>, and F.
 */

import { normalizeLeader } from './keybindings';
import type { RcBind } from './rc-parser';

export interface KeyStroke {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  leader?: boolean;
}

export interface SequenceBinding {
  strokes: KeyStroke[];
  action: string;
  scope: RcBind['scope'];
}

const BUFFER_TIMEOUT_MS = 500;
const LEADER_TIMEOUT_MS = 1200;

function normalizeKeyChar(ch: string): string {
  if (ch === '/') return '/';
  return ch.length === 1 ? ch.toLowerCase() : ch;
}

/** Expand a bind keys string into an ordered list of strokes. */
export function expandKeyString(raw: string, leaderSetting?: string): KeyStroke[] {
  const strokes: KeyStroke[] = [];
  let i = 0;
  const input = raw.trim();

  while (i < input.length) {
    if (input.startsWith('<leader>', i)) {
      strokes.push({ key: normalizeLeader(leaderSetting), leader: true });
      i += 8;
      continue;
    }

    const mod = input.slice(i).match(/^<(c|a|s|m)-([^>]+)>/i);
    if (mod) {
      const key = normalizeModKey(mod[2]!);
      const stroke: KeyStroke = { key };
      if (mod[1]!.toLowerCase() === 'c') stroke.ctrl = true;
      if (mod[1]!.toLowerCase() === 'a') stroke.alt = true;
      if (mod[1]!.toLowerCase() === 's') stroke.shift = true;
      if (mod[1]!.toLowerCase() === 'm') stroke.meta = true;
      strokes.push(stroke);
      i += mod[0].length;
      continue;
    }

    const ch = input[i]!;
    const stroke: KeyStroke = { key: normalizeKeyChar(ch) };
    if (ch.length === 1 && ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
      stroke.shift = true;
    }
    strokes.push(stroke);
    i += 1;
  }

  return strokes;
}

function normalizeModKey(key: string): string {
  const k = key.toLowerCase();
  if (k === 'esc' || k === 'escape') return 'Escape';
  if (k === 'space') return ' ';
  if (k.length === 1) return k;
  if (/^f\d{1,2}$/i.test(k)) return k.toLowerCase();
  return key;
}

export function resolveSequenceBindings(binds: RcBind[], leaderSetting?: string): SequenceBinding[] {
  return binds.map((b) => ({
    strokes: expandKeyString(b.keys, leaderSetting),
    action: b.action,
    scope: b.scope,
  }));
}

/** Map raw xterm input to a key stroke for editor bind matching. */
export function dataToStroke(data: string): KeyStroke | null {
  if (!data) return null;

  const arrows: Record<string, KeyStroke> = {
    '\x1b[D': { key: 'h' },
    '\x1b[C': { key: 'l' },
    '\x1b[B': { key: 'j' },
    '\x1b[A': { key: 'k' },
  };
  if (arrows[data]) return arrows[data]!;

  if (data === '\x1b') return { key: 'Escape' };
  if (data === '\x13') return { key: 's', ctrl: true };
  if (data === '\x7f' || data.charCodeAt(0) === 127) return { key: 'Backspace' };

  const ch = data.length === 1 ? data : '';
  if (!ch) return null;
  if (ch.length === 1 && ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
    return { key: ch.toLowerCase(), shift: true };
  }
  return { key: ch.toLowerCase() };
}

export function eventToStroke(e: KeyboardEvent, leaderKey: string): KeyStroke | null {
  if (e.repeat) return null;
  if (e.key === 'Escape') return { key: 'Escape' };

  const leader = normalizeLeader(leaderKey);
  if (
    !e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    !e.shiftKey &&
    (e.key === leader || (e.key === ' ' && leader === ' '))
  ) {
    return { key: leader, leader: true };
  }

  let key = e.key;
  if (key === ' ') key = ' ';
  else if (key.length === 1) key = key.toLowerCase();
  else if (/^F\d{1,2}$/i.test(key)) key = key.toLowerCase();

  return {
    key,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
  };
}

function strokeMatches(a: KeyStroke, b: KeyStroke): boolean {
  if (!!a.leader !== !!b.leader) return false;
  if (a.key !== b.key) return false;
  return (
    !!a.ctrl === !!b.ctrl &&
    !!a.alt === !!b.alt &&
    !!a.shift === !!b.shift &&
    !!a.meta === !!b.meta
  );
}

function sequencesEqual(a: KeyStroke[], b: KeyStroke[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => strokeMatches(s, b[i]!));
}

function isPrefix(prefix: KeyStroke[], full: KeyStroke[]): boolean {
  if (prefix.length > full.length) return false;
  return prefix.every((s, i) => strokeMatches(s, full[i]!));
}

/** True when this scope has binds that start with &lt;leader&gt; (e.g. &lt;leader&gt;e). */
export function scopeUsesLeader(sequences: SequenceBinding[], scope: SequenceBinding['scope']): boolean {
  return sequences.some((b) => b.scope === scope && b.strokes[0]?.leader);
}

export class KeySequenceEngine {
  private buffer: KeyStroke[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  reset(): void {
    this.buffer = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  hasPartialBuffer(): boolean {
    return this.buffer.length > 0;
  }

  match(
    stroke: KeyStroke,
    bindings: SequenceBinding[],
    scope: SequenceBinding['scope'],
  ): { action: string; exact: boolean } | null {
    this.buffer.push(stroke);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reset(), BUFFER_TIMEOUT_MS);

    const scoped = bindings
      .filter((b) => b.scope === scope)
      .sort((a, b) => b.strokes.length - a.strokes.length);

    let partial = false;
    for (const binding of scoped) {
      if (sequencesEqual(this.buffer, binding.strokes)) {
        this.reset();
        return { action: binding.action, exact: true };
      }
      if (isPrefix(this.buffer, binding.strokes)) {
        partial = true;
      }
    }

    if (partial) return null;

    // No match with buffer — retry with only the latest stroke
    if (this.buffer.length > 1) {
      this.buffer = [stroke];
      for (const binding of scoped) {
        if (sequencesEqual(this.buffer, binding.strokes)) {
          this.reset();
          return { action: binding.action, exact: true };
        }
        if (isPrefix(this.buffer, binding.strokes)) {
          return null;
        }
      }
    }

    this.reset();
    return null;
  }
}

export { BUFFER_TIMEOUT_MS, LEADER_TIMEOUT_MS };