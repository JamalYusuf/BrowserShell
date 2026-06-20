/**
 * Full-screen Quake-style overlay — self-contained content script.
 * Must not use ES imports (Chrome injects this as a classic script).
 */

interface OverlayConfig {
  toggleKey: string;
  overlayEnabled: boolean;
  overlayHeight: number;
  overlayOpacity: number;
  backdropBlur: number;
  backdropDim: number;
}

const DEFAULT_CONFIG: OverlayConfig = {
  toggleKey: '`',
  overlayEnabled: true,
  overlayHeight: 100,
  overlayOpacity: 0.88,
  backdropBlur: 6,
  backdropDim: 0.25,
};

const OVERLAY_ID = 'browsershell-overlay-root';
const TOGGLE_DEBOUNCE_MS = 200;
let config: OverlayConfig = { ...DEFAULT_CONFIG };
let visible = false;
let lastToggleAt = 0;
let iframe: HTMLIFrameElement | null = null;
let backdrop: HTMLDivElement | null = null;
let shellContainer: HTMLDivElement | null = null;
let hostTabId: number | undefined;

function notifyHostTab(): void {
  if (!iframe?.contentWindow || hostTabId === undefined) return;
  iframe.contentWindow.postMessage({ type: 'browsershell-host-tab', tabId: hostTabId }, '*');
}

function resolveHostTabId(): void {
  chrome.runtime.sendMessage({ type: 'get-host-tab-id' }, (response) => {
    const id = (response as { tabId?: number } | undefined)?.tabId;
    if (typeof id === 'number') {
      hostTabId = id;
      notifyHostTab();
    }
  });
}

async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get('config');
  const stored = result.config as Partial<OverlayConfig> | undefined;
  config = { ...DEFAULT_CONFIG, ...stored };
  applyStyles();
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function clampHeight(percent: number | undefined): number {
  const n = Number(percent);
  if (!Number.isFinite(n)) return 100;
  return Math.min(100, Math.max(20, Math.round(n)));
}

function applyShellGeometry(): void {
  if (!shellContainer) return;
  const heightPct = clampHeight(config.overlayHeight);
  if (heightPct >= 99) {
    shellContainer.style.top = '0';
    shellContainer.style.bottom = '0';
    shellContainer.style.height = '100%';
    shellContainer.style.borderRadius = '0';
  } else {
    shellContainer.style.top = 'auto';
    shellContainer.style.bottom = '0';
    shellContainer.style.height = `${heightPct}%`;
    shellContainer.style.borderRadius = '0';
  }
}

function applyStyles(): void {
  if (!shellContainer || !backdrop) return;

  applyShellGeometry();
  shellContainer.style.opacity = visible ? String(config.overlayOpacity) : '0';
  shellContainer.style.pointerEvents = visible ? 'auto' : 'none';
  shellContainer.style.background = `rgba(0, 0, 0, ${config.overlayOpacity})`;
  shellContainer.style.backdropFilter = `blur(${config.backdropBlur}px)`;
  shellContainer.style.setProperty('-webkit-backdrop-filter', `blur(${config.backdropBlur}px)`);

  backdrop.style.opacity = visible ? '1' : '0';
  backdrop.style.pointerEvents = visible ? 'auto' : 'none';
  backdrop.style.background = `rgba(0, 0, 0, ${config.backdropDim})`;
  backdrop.style.backdropFilter = `blur(${Math.max(0, config.backdropBlur - 2)}px)`;
}

function createOverlay(): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483646;pointer-events:none;display:flex;flex-direction:column;';

  backdrop = document.createElement('div');
  backdrop.style.cssText =
    'position:absolute;inset:0;opacity:0;transition:opacity 0.18s ease;pointer-events:none;';
  backdrop.addEventListener('click', () => hide());

  shellContainer = document.createElement('div');
  shellContainer.style.cssText = [
    'position:absolute;left:0;right:0;',
    'display:flex;flex-direction:column;',
    'opacity:0;',
    'transition:opacity 0.18s ease,height 0.18s ease;',
    'pointer-events:none;',
    'overflow:hidden;',
    'box-shadow:0 -8px 32px rgba(0,0,0,0.35);',
  ].join('');

  const header = document.createElement('div');
  header.style.cssText =
    'height:3px;flex-shrink:0;background:#ff0000;';
  shellContainer.appendChild(header);

  iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('overlay/index.html');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText = 'flex:1;width:100%;border:none;display:block;background:transparent;';
  iframe.allow = 'clipboard-read; clipboard-write';
  shellContainer.appendChild(iframe);

  root.appendChild(backdrop);
  root.appendChild(shellContainer);
  document.documentElement.appendChild(root);

  applyStyles();
  resolveHostTabId();

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'browsershell-close') hide();
    if (e.data?.type === 'browsershell-show') show();
    if (e.data?.type === 'browsershell-toggle') toggle();
    if (e.data?.type === 'browsershell-request-host-tab') notifyHostTab();
  });
}

function releaseFocus(): void {
  if (iframe) iframe.blur();
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  try {
    window.focus();
  } catch {
    /* ignore */
  }
}

function show(): void {
  if (!config.overlayEnabled) return;

  createOverlay();
  visible = true;
  setRootPointerEvents(true);
  document.documentElement.style.overflow = 'hidden';
  applyStyles();

  requestAnimationFrame(() => {
    notifyHostTab();
    iframe?.contentWindow?.postMessage({ type: 'browsershell-focus' }, '*');
  });
}

function hide(): void {
  visible = false;
  setRootPointerEvents(false);
  document.documentElement.style.overflow = '';
  applyStyles();
  releaseFocus();
}

function toggle(): void {
  const now = Date.now();
  if (now - lastToggleAt < TOGGLE_DEBOUNCE_MS) return;
  lastToggleAt = now;
  if (visible) hide();
  else show();
}

function setRootPointerEvents(on: boolean): void {
  const root = document.getElementById(OVERLAY_ID);
  if (root) root.style.pointerEvents = on ? 'auto' : 'none';
}

function normalizeToggleKey(key: string | undefined): string {
  const k = (key ?? '`').trim();
  if (!k || k === 'grave' || k === 'backquote' || k === 'Backquote') return '`';
  return k;
}

function matchesToggleKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const configured = normalizeToggleKey(config.toggleKey);

  if (configured === '`') {
    return e.code === 'Backquote' && !e.shiftKey;
  }
  if (/^F\d{1,2}$/i.test(configured)) {
    return e.key.toUpperCase() === configured.toUpperCase();
  }
  return e.key === configured;
}

function handleKeydown(e: KeyboardEvent): void {
  if (!config.overlayEnabled) return;

  const isToggle = matchesToggleKey(e);

  // Toggle key always works (even in inputs) so you can reopen after closing
  if (isToggle) {
    // Ignore auto-repeat while key is held — one press = one toggle
    if (e.repeat) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    toggle();
    return;
  }

  if (isEditableTarget(e.target)) return;

  if (e.key === 'Escape' && visible) {
    e.preventDefault();
    hide();
  }
}

// Bootstrap
loadSettings().then(() => createOverlay());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.config?.newValue) {
    config = { ...DEFAULT_CONFIG, ...(changes.config.newValue as Partial<OverlayConfig>) };
    applyStyles();
    if (!config.overlayEnabled && visible) hide();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'overlay-show') show();
  if (msg.type === 'overlay-hide') hide();
  if (msg.type === 'overlay-toggle' || msg.type === 'toggle-overlay') toggle();
  if (msg.type === 'config-updated') {
    config = { ...DEFAULT_CONFIG, ...msg.config };
    applyStyles();
  }
});

// Single listener only — window + document both fired per keypress, causing instant show+hide
window.addEventListener('keydown', handleKeydown, true);