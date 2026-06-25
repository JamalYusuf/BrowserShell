/** Visual, line, and caret selection modes (Vimium v/V/yc). */

import { flashMessage } from './hud';

export type VisualModeKind = 'char' | 'line' | 'caret';

let active = false;
let kind: VisualModeKind = 'char';
let mouseUp: (() => void) | null = null;
let mouseDown: ((e: MouseEvent) => void) | null = null;

export function isVisualModeActive(): boolean {
  return active;
}

export function getVisualModeKind(): VisualModeKind {
  return kind;
}

export function exitVisualMode(): void {
  if (!active) return;
  active = false;
  document.body.style.cursor = '';
  if (mouseUp) {
    document.removeEventListener('mouseup', mouseUp);
    mouseUp = null;
  }
  if (mouseDown) {
    document.removeEventListener('mousedown', mouseDown, true);
    mouseDown = null;
  }
}

function selectLineAt(y: number): void {
  const range = document.caretRangeFromPoint?.(window.innerWidth / 2, y);
  if (!range) return;
  const node = range.startContainer;
  let block: Node | null = node;
  while (block && block.nodeType !== Node.ELEMENT_NODE) block = block.parentNode;
  let el = block as Element | null;
  while (el && !isBlockElement(el)) el = el.parentElement;
  if (!el) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  const r = document.createRange();
  r.selectNodeContents(el);
  sel.addRange(r);
}

function isBlockElement(el: Element): boolean {
  const display = getComputedStyle(el).display;
  return display === 'block' || display === 'list-item' || display.startsWith('table');
}

function selectWordAt(x: number, y: number): void {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
  sel.modify('extend', 'forward', 'word');
  sel.modify('extend', 'backward', 'word');
}

export function enterVisualMode(mode: VisualModeKind = 'char'): void {
  exitVisualMode();
  active = true;
  kind = mode;

  const hints: Record<VisualModeKind, string> = {
    char: 'Visual — select text · y yank · p/P paste-go · Esc exit',
    line: 'Visual line — click a line · y yank · Esc exit',
    caret: 'Caret — click to place caret · y yank · Esc exit',
  };
  flashMessage(hints[mode]);
  document.body.style.cursor = mode === 'line' ? 'cell' : 'crosshair';

  if (mode === 'line' || mode === 'caret') {
    mouseDown = (e: MouseEvent) => {
      e.preventDefault();
      if (mode === 'line') selectLineAt(e.clientY);
      else {
        const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
        if (range) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    };
    document.addEventListener('mousedown', mouseDown, true);
  }

  mouseUp = () => {
    const text = window.getSelection()?.toString() ?? '';
    if (text) void chrome.storage.local.set({ pendingSelection: text });
  };
  document.addEventListener('mouseup', mouseUp);
}

export function enterVisualWordMode(): void {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  selectWordAt(cx, cy);
  enterVisualMode('char');
}

export function toggleVisualKind(next: VisualModeKind): void {
  if (!active) {
    enterVisualMode(next);
    return;
  }
  kind = next;
  flashMessage(`Visual ${next} mode`);
}

export async function yankVisualSelection(): Promise<void> {
  const text = window.getSelection()?.toString() ?? '';
  if (!text) {
    flashMessage('Nothing selected.');
    return;
  }
  await chrome.storage.local.set({ pendingSelection: text });
  try {
    await navigator.clipboard.writeText(text);
    flashMessage(`Yanked ${text.length} chars.`);
  } catch {
    flashMessage(`Yanked ${text.length} chars (clipboard blocked).`);
  }
  exitVisualMode();
}

export async function pasteAndGo(newTab: boolean): Promise<void> {
  let text = window.getSelection()?.toString() ?? '';
  if (!text) {
    const stored = await chrome.storage.local.get('pendingSelection');
    text = (stored.pendingSelection as string | undefined) ?? '';
  }
  const candidate = text.trim().split(/\s+/)[0] ?? '';
  if (!candidate) {
    flashMessage('Nothing to paste.');
    return;
  }
  const url = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  exitVisualMode();
  if (newTab) window.open(url, '_blank', 'noopener');
  else location.assign(url);
}