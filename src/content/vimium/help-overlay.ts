/** In-page help dialog (? key) — lists common Vimium-style bindings. */

import { ensurePageUiRoot } from './styles';

const HELP_LINES = [
  'Navigating the page',
  '  h/j/k/l     scroll left/down/up/right',
  '  gg / G      top / bottom',
  '  d / u       half page down / up',
  '  zH / zL     scroll all the way left / right',
  '  f / F       link hints (current / new tab)',
  '  yf          copy link URL via hints',
  '  /           find on page (/pat/ regex · n/N)',
  '  gi          focus first input',
  '  i           insert mode (Esc to exit)',
  '  v / V / yc  visual / line / word mode',
  '  y / p / P   yank · paste-go (new tab)',
  '  r           reload',
  '  gs          view source',
  '  yy          copy page URL',
  '  gf / gF     next frame / main frame',
  '  gu / gU     up one URL level / root',
  '  ge / gE     edit URL (current / new tab)',
  '  o / O       omnibar (URL · bookmark · history)',
  '  b / B       bookmark omnibar',
  '  m{a-z}      set mark · `{a-z} jump · `` back',
  '  5t          count prefix repeats command',
  '  H / L       back / forward',
  '  ]] / [[     next / prev pagination link',
  '',
  'Tabs & windows',
  '  t / x       new / close tab',
  '  yt          duplicate tab',
  '  J / K       next / prev tab',
  '  gt / gT     next / prev tab',
  '  g0 / g$     first / last tab',
  '  ^           previous tab',
  '  X           restore closed tab',
  '  W           move tab to new window',
  '  <a-p>       pin / unpin tab',
  '  T           tab search omnibar',
  '',
  'Shell',
  '  <leader>e   open BrowserShell',
  '  layout      tile windows side-by-side',
  '  split       open URL in split window',
  '  workspace   save/load multi-window layouts',
];

let overlayEl: HTMLDivElement | null = null;

export function isHelpOverlayActive(): boolean {
  return !!overlayEl;
}

export function toggleHelpOverlay(): void {
  if (overlayEl) {
    closeHelpOverlay();
    return;
  }
  const root = ensurePageUiRoot();
  overlayEl = document.createElement('div');
  overlayEl.id = 'bs-help-overlay';
  overlayEl.innerHTML = `
    <div class="bs-help-panel" role="dialog" aria-label="BrowserShell key help">
      <div class="bs-help-header">
        <strong>BrowserShell — page keys</strong>
        <span class="bs-help-hint">? or Esc to close</span>
      </div>
      <pre class="bs-help-body">${HELP_LINES.join('\n')}</pre>
    </div>
  `;
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeHelpOverlay();
  });
  root.appendChild(overlayEl);
}

export function closeHelpOverlay(): void {
  overlayEl?.remove();
  overlayEl = null;
}

export function handleHelpOverlayKeydown(e: KeyboardEvent): boolean {
  if (!overlayEl) return false;
  if (e.key === 'Escape' || e.key === '?') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeHelpOverlay();
    return true;
  }
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return true;
}