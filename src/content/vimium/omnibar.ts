/** In-page omnibar — open URL, bookmark, history, or tab (Vimium o/O/b/B/T). */

import { flashMessage } from './hud';
import { ensurePageUiRoot } from './styles';

export type OmnibarSource = 'all' | 'bookmarks' | 'tabs';

export interface OmnibarItem {
  id: string;
  type: 'tab' | 'bookmark' | 'history' | 'url';
  title: string;
  url: string;
  tabId?: number;
  windowId?: number;
}

let omnibarRoot: HTMLDivElement | null = null;
let omnibarInput: HTMLInputElement | null = null;
let resultsEl: HTMLUListElement | null = null;
let items: OmnibarItem[] = [];
let selected = 0;
let newTab = false;
let source: OmnibarSource = 'all';
let queryTimer: ReturnType<typeof setTimeout> | null = null;

export function isOmnibarActive(): boolean {
  return !!omnibarRoot;
}

export function closeOmnibar(): void {
  if (queryTimer) clearTimeout(queryTimer);
  queryTimer = null;
  omnibarRoot?.remove();
  omnibarRoot = null;
  omnibarInput = null;
  resultsEl = null;
  items = [];
  selected = 0;
}

async function fetchResults(q: string): Promise<OmnibarItem[]> {
  const res = (await chrome.runtime.sendMessage({
    type: 'omnibar-search',
    query: q,
    source,
    limit: 12,
  })) as { items?: OmnibarItem[] } | undefined;
  return res?.items ?? [];
}

function renderResults(): void {
  if (!resultsEl) return;
  resultsEl.innerHTML = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const li = document.createElement('li');
    li.className = `bs-omnibar-item${i === selected ? ' bs-omnibar-selected' : ''}`;
    const badge = item.type === 'tab' ? 'tab' : item.type === 'bookmark' ? '★' : item.type === 'history' ? '⏱' : '↗';
    li.innerHTML = `<span class="bs-omnibar-badge">${badge}</span><span class="bs-omnibar-title">${escapeHtml(item.title || item.url)}</span><span class="bs-omnibar-url">${escapeHtml(shortUrl(item.url))}</span>`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selected = i;
      void activateSelected();
    });
    resultsEl.appendChild(li);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 40);
  } catch {
    return url.slice(0, 60);
  }
}

async function activateSelected(): Promise<void> {
  const item = items[selected];
  if (!item) {
    if (omnibarInput?.value.trim()) {
      const raw = omnibarInput.value.trim();
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      closeOmnibar();
      if (newTab) window.open(url, '_blank', 'noopener');
      else location.assign(url);
      return;
    }
    flashMessage('No selection.');
    return;
  }

  closeOmnibar();

  if (item.type === 'tab' && item.tabId) {
    await chrome.runtime.sendMessage({
      type: 'tab-activate',
      tabId: item.tabId,
      windowId: item.windowId,
    });
    return;
  }

  if (newTab) window.open(item.url, '_blank', 'noopener');
  else location.assign(item.url);
}

function scheduleSearch(): void {
  if (queryTimer) clearTimeout(queryTimer);
  queryTimer = setTimeout(() => {
    void (async () => {
      const q = omnibarInput?.value ?? '';
      items = await fetchResults(q);
      selected = 0;
      renderResults();
    })();
  }, 120);
}

export function openOmnibar(opts: { newTab?: boolean; source?: OmnibarSource; seed?: string } = {}): void {
  closeOmnibar();
  newTab = !!opts.newTab;
  source = opts.source ?? 'all';

  const root = ensurePageUiRoot();
  omnibarRoot = document.createElement('div');
  omnibarRoot.className = 'bs-omnibar';
  omnibarRoot.setAttribute('data-bs-omnibar', 'active');

  const label = source === 'tabs' ? 'T' : source === 'bookmarks' ? 'b' : newTab ? 'O' : 'o';
  omnibarRoot.innerHTML = `
    <div class="bs-omnibar-bar">
      <label>${label}</label>
      <input type="text" placeholder="${placeholderFor(source)}" autocomplete="off" spellcheck="false" />
    </div>
    <ul class="bs-omnibar-results"></ul>
    <div class="bs-omnibar-hint">↑↓ select · Enter open${newTab ? ' (new tab)' : ''} · Esc cancel</div>
  `;
  root.appendChild(omnibarRoot);

  omnibarInput = omnibarRoot.querySelector('input');
  resultsEl = omnibarRoot.querySelector('.bs-omnibar-results');

  if (opts.seed && omnibarInput) omnibarInput.value = opts.seed;
  omnibarInput?.addEventListener('input', scheduleSearch);
  omnibarInput?.focus();
  scheduleSearch();
}

function placeholderFor(src: OmnibarSource): string {
  if (src === 'tabs') return 'Search open tabs…';
  if (src === 'bookmarks') return 'Search bookmarks…';
  return 'URL, bookmark, or history…';
}

/** Returns true when the event was fully handled (caller should stop propagation). */
export function handleOmnibarKeydown(e: KeyboardEvent): boolean {
  if (!omnibarRoot || !omnibarInput) return false;

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeOmnibar();
    return true;
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.key === 'ArrowDown') {
      selected = Math.min(selected + 1, Math.max(0, items.length - 1));
      renderResults();
    } else if (e.key === 'ArrowUp') {
      selected = Math.max(selected - 1, 0);
      renderResults();
    } else {
      void activateSelected();
    }
    return true;
  }

  // Typing — let the input handle it; block other global binds.
  if (e.key.length === 1 || e.key === 'Backspace') {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return true;
}