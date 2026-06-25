/**
 * Global/page-level keybinding layer — Vimium-style hints, scroll, visual mode.
 * Single window capture listener — seek and hints take priority over normal binds.
 */

import {
  bootstrapRuntimeConfig,
  getCachedRuntimeConfig,
  invalidateConfigCache,
  preloadRuntimeConfig,
} from '@/shared/config-service';
import { CountPrefix } from '@/shared/count-prefix';
import { KeySequenceEngine, eventToStroke, type KeyStroke } from '@/shared/key-sequence';
import { LinkHints } from './vimium/link-hints';
import { flashMessage } from './vimium/hud';
import { scrollPage } from './vimium/scroll';
import { findNext, handleSeekKeydown, isSeekActive, openSeek } from './vimium/seek';
import {
  handleHelpOverlayKeydown,
  isHelpOverlayActive,
  toggleHelpOverlay,
} from './vimium/help-overlay';
import {
  focusMainFrame,
  focusNextFrame,
  followPagination,
  navigateUrlRoot,
  navigateUrlUp,
  openMultipleLinksInNewTabs,
  viewPageSource,
} from './vimium/page-actions';
import { handleOmnibarKeydown, isOmnibarActive, openOmnibar } from './vimium/omnibar';
import { jumpBackMark, jumpToMark, saveJumpBack, setMark } from './vimium/marks';
import {
  enterVisualMode,
  enterVisualWordMode,
  exitVisualMode,
  isVisualModeActive,
  pasteAndGo,
  toggleVisualKind,
  yankVisualSelection,
} from './vimium/visual-mode';

export interface GlobalHotkeyCallbacks {
  isOverlayVisible: () => boolean;
  showOverlay: () => void;
  matchesToggleKey?: (e: KeyboardEvent) => boolean;
  onToggleOverlay?: () => void;
}

let callbacks: GlobalHotkeyCallbacks | null = null;
const keyEngine = new KeySequenceEngine();
const countPrefix = new CountPrefix();
const linkHints = new LinkHints();
let insertModeManual = false;
let pendingMark = false;
let pendingBacktick = false;
let markTimer: ReturnType<typeof setTimeout> | null = null;

function resetKeyState(): void {
  keyEngine.reset();
  pendingMark = false;
  pendingBacktick = false;
  if (markTimer) clearTimeout(markTimer);
  markTimer = null;
}

function stripSettingQuotes(value: string): string {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[data-bs-seek="active"]')) return false;
  if (target.closest('[data-bs-omnibar="active"]')) return false;
  if (target.closest('#bs-hint-container')) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type.toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image'].includes(type);
  }
  return false;
}

function hostMatchesException(host: string, patterns: string[] = []): boolean {
  for (const p of patterns) {
    const pat = p.replace(/\./g, '\\.').replace(/\*/g, '.*');
    if (new RegExp(`^${pat}$`, 'i').test(host)) return true;
  }
  return false;
}

function hintCharsFromSettings(settings: Record<string, string>): string | undefined {
  const raw = settings['hint-chars'];
  if (!raw) return undefined;
  const stripped = stripSettingQuotes(raw).replace(/\s+/g, '');
  return stripped || undefined;
}

function scrollStepFromSettings(settings: Record<string, string>): number {
  const raw = settings['scroll-step']?.trim();
  const n = raw ? parseFloat(raw) : 0.8;
  return Number.isFinite(n) && n > 0.1 && n <= 1 ? n : 0.8;
}

function maxHintsFromSettings(settings: Record<string, string>): number {
  const raw = settings['hint-max']?.trim();
  const n = raw ? parseInt(raw, 10) : 220;
  return Number.isFinite(n) && n >= 20 && n <= 500 ? n : 220;
}

function focusFirstInput(): void {
  const candidates = [
    ...document.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
    ),
  ] as HTMLElement[];

  const visible = candidates.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });

  const el = visible ?? candidates[0];
  if (el) {
    el.focus();
    el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  } else {
    flashMessage('No focusable input found.');
  }
}

async function tabAction(action: string, extra?: { index?: number }): Promise<void> {
  await chrome.runtime.sendMessage({ type: action, ...extra });
}

function openShellWith(command: string): void {
  void chrome.storage.local.set({ pendingCommand: command }).then(() => callbacks?.showOverlay());
}

function startHints(settings: Record<string, string>, opts: { newTab?: boolean; copyOnly?: boolean } = {}): void {
  resetKeyState();
  linkHints.start({
    newTab: opts.newTab,
    copyOnly: opts.copyOnly,
    hintChars: hintCharsFromSettings(settings),
    maxHints: maxHintsFromSettings(settings),
  });
}

function handleMarkStroke(stroke: KeyStroke): boolean {
  if (pendingMark) {
    pendingMark = false;
    if (markTimer) clearTimeout(markTimer);
    if (stroke.key.length === 1 && /[a-z]/i.test(stroke.key)) {
      const global = !!stroke.shift || stroke.key === stroke.key.toUpperCase();
      void setMark(stroke.key.toLowerCase(), global);
      return true;
    }
    flashMessage('Mark cancelled.');
    return true;
  }

  if (pendingBacktick) {
    pendingBacktick = false;
    if (markTimer) clearTimeout(markTimer);
    if (stroke.key === '`') {
      void jumpBackMark();
      return true;
    }
    if (stroke.key.length === 1 && /[a-z]/i.test(stroke.key)) {
      const global = !!stroke.shift || stroke.key === stroke.key.toUpperCase();
      void jumpToMark(stroke.key.toLowerCase(), global);
      return true;
    }
    flashMessage('Mark jump cancelled.');
    return true;
  }

  if (stroke.key === 'm' && !stroke.ctrl && !stroke.alt && !stroke.meta && !stroke.shift) {
    pendingMark = true;
    markTimer = setTimeout(() => {
      pendingMark = false;
    }, 600);
    return true;
  }

  if (stroke.key === '`' && !stroke.ctrl && !stroke.alt && !stroke.meta) {
    pendingBacktick = true;
    markTimer = setTimeout(() => {
      pendingBacktick = false;
    }, 600);
    return true;
  }

  return false;
}

const REPEATABLE = new Set([
  'tab-new', 't', 'tab-close', 'x', 'tab-duplicate', 'yt',
  'scroll-down', 'scroll-up', 'scroll-left', 'scroll-right',
  'scroll-half-down', 'scroll-half-up', 'history-back', 'history-forward',
]);

function runGlobalAction(action: string, settings: Record<string, string>, count = 1): void {
  const repeat = (fn: () => void) => {
    for (let i = 0; i < count; i++) fn();
  };

  if (action === 'hints-current' || action === 'hints' || action === 'hints-multi') {
    startHints(settings, { newTab: false });
    return;
  }
  if (action === 'hints-newtab') {
    startHints(settings, { newTab: true });
    return;
  }
  if (action === 'hints-copy' || action === 'yf') {
    startHints(settings, { copyOnly: true });
    return;
  }
  if (action.startsWith('scroll-')) {
    repeat(() => scrollPage(action, scrollStepFromSettings(settings)));
    return;
  }
  if (action === 'focus-first-input' || action === 'gi') focusFirstInput();
  else if (action === 'insert-mode' || action === 'i') {
    insertModeManual = true;
    flashMessage('Insert mode — Esc to exit');
  }
  else if (action === 'visual-mode' || action === 'v') enterVisualMode('char');
  else if (action === 'visual-line' || action === 'V') enterVisualMode('line');
  else if (action === 'visual-word' || action === 'yc') enterVisualWordMode();
  else if (action === 'history-back') repeat(() => history.back());
  else if (action === 'history-forward') repeat(() => history.forward());
  else if (action === 'reload' || action === 'reload-page') location.reload();
  else if (action === 'view-source' || action === 'gs') viewPageSource();
  else if (action === 'url-up' || action === 'gu') navigateUrlUp(1);
  else if (action === 'url-root' || action === 'gU') navigateUrlRoot();
  else if (action === 'edit-url' || action === 'ge') openShellWith(`go ${location.href}`);
  else if (action === 'edit-url-newtab' || action === 'gE') openShellWith(`tab new ${location.href}`);
  else if (action === 'open-url' || action === 'o') openOmnibar({ newTab: false });
  else if (action === 'open-url-newtab' || action === 'O') openOmnibar({ newTab: true });
  else if (action === 'bookmark-open' || action === 'b') openOmnibar({ source: 'bookmarks', newTab: false });
  else if (action === 'bookmark-newtab' || action === 'B') openOmnibar({ source: 'bookmarks', newTab: true });
  else if (action === 'frame-next' || action === 'gf') focusNextFrame();
  else if (action === 'frame-main' || action === 'gF') focusMainFrame();
  else if (action === 'pagination-next' || action === ']]') followPagination('next');
  else if (action === 'pagination-prev' || action === '[[') followPagination('prev');
  else if (action === 'open-multiple-links' || action === '<a-f>') void openMultipleLinksInNewTabs();
  else if (action === 'help-overlay' || action === '?') toggleHelpOverlay();
  else if (action === 'mark-jump-back') void jumpBackMark();
  else if (action === 'tab-new' || action === 't') repeat(() => void tabAction('tab-new'));
  else if (action === 'tab-close' || action === 'x') repeat(() => void tabAction('tab-close'));
  else if (action === 'tab-next' || action === 'J' || action === 'gt') void tabAction('tab-next');
  else if (action === 'tab-prev' || action === 'K' || action === 'gT') void tabAction('tab-prev');
  else if (action === 'tab-first' || action === 'g0') {
    if (count > 1) void tabAction('tab-goto', { index: count });
    else void tabAction('tab-first');
  }
  else if (action === 'tab-last' || action === 'g$') void tabAction('tab-last');
  else if (action === 'tab-previous' || action === '^') void tabAction('tab-previous');
  else if (action === 'tab-restore' || action === 'X') repeat(() => void tabAction('tab-restore'));
  else if (action === 'tab-search' || action === 'T') openOmnibar({ source: 'tabs' });
  else if (action === 'tab-move-window' || action === 'W') void tabAction('tab-move-window');
  else if (action === 'tab-pin-toggle' || action === '<a-p>') void tabAction('tab-pin-toggle');
  else if (action === 'tab-duplicate' || action === 'yt') repeat(() => void tabAction('tab-duplicate'));
  else if (action === 'window-next') void tabAction('window-next');
  else if (action === 'window-prev') void tabAction('window-prev');
  else if (action === 'yank-url' || action === 'yy') {
    void navigator.clipboard.writeText(location.href);
    flashMessage('URL copied to clipboard.');
  } else if (action === 'yank-selection' || action === 'y') void yankVisualSelection();
  else if (action === 'paste-go' || action === 'p') void pasteAndGo(false);
  else if (action === 'paste-go-newtab' || action === 'P') void pasteAndGo(true);
  else if (action === 'visual-caret' || action === 'c') toggleVisualKind('caret');
  else if (action === 'save-selection') void saveSelection();
  else if (action === 'edit') {
    void chrome.storage.local.set({ pendingCommand: 'edit' }).then(() => callbacks?.showOverlay());
  } else if (action === 'seek' || action === '/') {
    resetKeyState();
    openSeek();
  } else if (action === 'seek-next') {
    saveJumpBack();
    findNext(false);
  } else if (action === 'seek-prev') {
    saveJumpBack();
    findNext(true);
  } else if (!REPEATABLE.has(action)) {
    flashMessage(`Unknown action: ${action}`);
  }
}

async function saveSelection(): Promise<void> {
  const text = window.getSelection()?.toString() ?? '';
  if (!text) {
    flashMessage('No text selected.');
    return;
  }
  await chrome.storage.local.set({ pendingSelection: text });
  try {
    await navigator.clipboard.writeText(text);
    flashMessage(`Selection saved (${text.length} chars) — copied to clipboard.`);
  } catch {
    flashMessage(`Selection saved (${text.length} chars).`);
  }
}

function handleVisualKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    exitVisualMode();
    flashMessage('Visual mode exited.');
    return;
  }

  const runtime = getCachedRuntimeConfig() ?? bootstrapRuntimeConfig();
  const stroke = eventToStroke(e, runtime.shell.leader ?? '<space>');
  if (!stroke) return;

  const result = keyEngine.match(stroke, runtime.sequences, 'global');
  if (!result) return;

  const action = result.action;
  if (['y', 'yank-selection', 'p', 'paste-go', 'P', 'paste-go-newtab', 'v', 'visual-mode', 'V', 'visual-line', 'c', 'visual-caret'].includes(action)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    runGlobalAction(action, runtime.parsed.settings);
    return;
  }

  e.stopPropagation();
  e.stopImmediatePropagation();
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  if (isSeekActive()) {
    handleSeekKeydown(e);
    return;
  }

  if (isOmnibarActive()) {
    handleOmnibarKeydown(e);
    return;
  }

  if (isHelpOverlayActive()) {
    handleHelpOverlayKeydown(e);
    return;
  }

  if (callbacks?.matchesToggleKey?.(e) && !e.repeat) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    callbacks.onToggleOverlay?.();
    return;
  }

  if (e.repeat) return;

  if (linkHints.isActive()) {
    if (linkHints.onKeyDown(e)) return;
  }

  if (isVisualModeActive()) {
    handleVisualKeydown(e);
    return;
  }

  if (insertModeManual) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      insertModeManual = false;
      flashMessage('Insert mode exited.');
    }
    return;
  }

  const runtime = getCachedRuntimeConfig() ?? bootstrapRuntimeConfig();
  const cfg = runtime.shell;
  if (!cfg.globalHotkeys) return;
  if (callbacks?.isOverlayVisible()) return;
  if (cfg.insertModeAuto !== false && isEditableTarget(e.target)) return;
  if (hostMatchesException(location.hostname, cfg.globalHotkeysExceptions)) return;

  const leader = cfg.leader ?? runtime.parsed.settings.leader;
  const stroke = eventToStroke(e, leader ?? '<space>');
  if (!stroke) return;

  if (handleMarkStroke(stroke)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }

  const result = keyEngine.match(stroke, runtime.sequences, 'global');

  if (!result) {
    if (keyEngine.hasPartialBuffer()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (/^[0-9]$/.test(stroke.key) && !stroke.ctrl && !stroke.alt && !stroke.meta) {
      if (countPrefix.feedDigit(stroke.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (stroke.leader) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (e.key === 'Escape') {
      countPrefix.reset();
      resetKeyState();
    }
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const count = countPrefix.consume();
  if (result.action === 'scroll-top' || result.action === 'gg') saveJumpBack();
  if (result.action === 'scroll-bottom' || result.action === 'G') saveJumpBack();

  runGlobalAction(result.action, runtime.parsed.settings, count);
}

export function installGlobalHotkeys(cbs: GlobalHotkeyCallbacks): void {
  callbacks = cbs;
  bootstrapRuntimeConfig();
  void preloadRuntimeConfig();

  window.addEventListener('keydown', handleGlobalKeydown, true);

  window.addEventListener('browsershell-hints', ((ev: CustomEvent<{ newTab?: boolean }>) => {
    const runtime = getCachedRuntimeConfig() ?? bootstrapRuntimeConfig();
    startHints(runtime.parsed.settings, { newTab: !!ev.detail?.newTab });
  }) as EventListener);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.config) {
      invalidateConfigCache();
      void preloadRuntimeConfig();
    }
  });
}

export function isPageModeActive(): boolean {
  return (
    linkHints.isActive() ||
    isSeekActive() ||
    isOmnibarActive() ||
    isVisualModeActive() ||
    insertModeManual ||
    isHelpOverlayActive()
  );
}