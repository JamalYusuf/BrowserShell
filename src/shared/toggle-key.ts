/** Shared toggle-key matching for overlay content script and terminal host. */

export function normalizeToggleKey(key: string | undefined): string {
  const k = (key ?? '`').trim();
  if (!k || k === 'grave' || k === 'backquote' || k === 'Backquote') return '`';
  return k;
}

export interface ToggleKeyEvent {
  key: string;
  code: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export function matchesToggleKey(event: ToggleKeyEvent, toggleKey: string | undefined): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;

  const configured = normalizeToggleKey(toggleKey);

  if (configured === '`') {
    return event.code === 'Backquote' && !event.shiftKey;
  }

  if (/^F\d{1,2}$/i.test(configured)) {
    return event.key.toUpperCase() === configured.toUpperCase();
  }

  return event.key === configured;
}

export function charMatchesToggleKey(char: string, toggleKey: string | undefined): boolean {
  const configured = normalizeToggleKey(toggleKey);
  if (configured === '`') return char === '`';
  if (/^F\d{1,2}$/i.test(configured)) return false;
  return char === configured;
}

export function toggleKeyLabel(toggleKey: string | undefined): string {
  const k = normalizeToggleKey(toggleKey);
  return k === '`' ? '` (backtick)' : k;
}