import { ensurePageUiRoot } from './styles';

export type HudPlacement = 'top' | 'bottom';

let hudEl: HTMLDivElement | null = null;
let hintStatusEl: HTMLDivElement | null = null;
let hudTimer: ReturnType<typeof setTimeout> | null = null;

/** Bottom status bar used during link-hint mode — stays out of the way of markers. */
export function showHintStatus(html: string): void {
  const root = ensurePageUiRoot();
  if (!hintStatusEl) {
    hintStatusEl = document.createElement('div');
    hintStatusEl.className = 'bs-hint-status';
    root.appendChild(hintStatusEl);
  }
  hintStatusEl.innerHTML = html;
}

export function hideHintStatus(): void {
  hintStatusEl?.remove();
  hintStatusEl = null;
}

export function showHud(html: string, ms = 2200, placement: HudPlacement = 'bottom'): void {
  const root = ensurePageUiRoot();
  hudEl?.remove();
  if (hudTimer) clearTimeout(hudTimer);

  hudEl = document.createElement('div');
  hudEl.className = placement === 'bottom' ? 'bs-hud bs-hud-bottom' : 'bs-hud';
  hudEl.innerHTML = html;
  root.appendChild(hudEl);

  if (ms > 0) {
    hudTimer = setTimeout(() => {
      hudEl?.remove();
      hudEl = null;
    }, ms);
  }
}

export function hideHud(): void {
  if (hudTimer) clearTimeout(hudTimer);
  hudEl?.remove();
  hudEl = null;
}

export function flashMessage(text: string, ms = 1800): void {
  showHud(text.replace(/</g, '&lt;'), ms, 'bottom');
}

/** Height reserved at bottom during hint mode so markers avoid the status bar. */
export function hintStatusReservedHeight(): number {
  return hintStatusEl?.offsetHeight ?? 52;
}