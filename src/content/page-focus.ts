/**
 * Keep the page keyboard-focusable so Vimium-style hotkeys work without an extra click.
 * Browsers only deliver key events to a focused document; after closing the overlay or
 * on fresh navigation the active element is often nothing until the user clicks.
 */

let isOverlayVisible: () => boolean = () => false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const FOCUS_RETRY_MS = [0, 50, 150, 400, 800, 1500];

function focusRoot(): HTMLElement | null {
  return document.body ?? document.documentElement;
}

export function isEditableFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type.toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(type);
  }
  return false;
}

function ensureFocusSentinel(): void {
  const root = focusRoot();
  if (!root || root.hasAttribute('data-bs-focus-sentinel')) return;
  root.setAttribute('tabindex', '-1');
  root.setAttribute('data-bs-focus-sentinel', 'true');
  root.style.outline = 'none';
}

/** Focus the page so global hotkeys receive keydown events. */
export function focusPageForHotkeys(): void {
  if (isOverlayVisible()) return;
  if (document.visibilityState === 'hidden') return;

  const active = document.activeElement;
  if (active && active !== document.body && active !== document.documentElement) {
    if (isEditableFocusTarget(active)) return;
    if (active instanceof HTMLIFrameElement) return;
    if (active.closest('#browsershell-overlay-root')) return;
  }

  const root = focusRoot();
  if (!root) return;
  ensureFocusSentinel();
  try {
    root.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }
}

export function schedulePageFocusRetries(): void {
  if (retryTimer) clearTimeout(retryTimer);
  let i = 0;
  const run = () => {
    focusPageForHotkeys();
    i += 1;
    if (i < FOCUS_RETRY_MS.length) {
      retryTimer = setTimeout(run, FOCUS_RETRY_MS[i]! - FOCUS_RETRY_MS[i - 1]!);
    } else {
      retryTimer = null;
    }
  };
  run();
}

function schedulePageFocus(): void {
  requestAnimationFrame(() => requestAnimationFrame(schedulePageFocusRetries));
}

export function installPageFocus(opts: { isOverlayVisible: () => boolean }): void {
  isOverlayVisible = opts.isOverlayVisible;
  ensureFocusSentinel();

  schedulePageFocus();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedulePageFocus();
  });
  window.addEventListener('pageshow', schedulePageFocus);
  window.addEventListener('focus', schedulePageFocus);

  document.addEventListener(
    'mousedown',
    () => {
      if (!isOverlayVisible()) schedulePageFocus();
    },
    true,
  );
}