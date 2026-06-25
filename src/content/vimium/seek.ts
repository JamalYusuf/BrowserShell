import { ensurePageUiRoot } from './styles';
import { flashMessage, hideHud } from './hud';
import { saveJumpBack } from './marks';

let seekRoot: HTMLDivElement | null = null;
let seekInput: HTMLInputElement | null = null;
let lastQuery = '';
let regexState: { regex: RegExp; walker: TreeWalker | null; lastNode: Node | null } | null = null;

function runFind(query: string, backward = false): boolean {
  const re = parseRegexQuery(query);
  if (re) {
    return regexFind(re, backward);
  }
  regexState = null;
  const findFn = (
    window as Window & {
      find?: (
        s: string,
        cs: boolean,
        back: boolean,
        wrap: boolean,
        whole: boolean,
        frames: boolean,
        dialog: boolean,
      ) => boolean;
    }
  ).find;
  if (typeof findFn !== 'function') return false;
  return findFn(query, false, backward, true, false, true, false);
}

function parseRegexQuery(q: string): RegExp | null {
  if (!q.startsWith('/') || q.length < 3) return null;
  const last = q.lastIndexOf('/');
  if (last <= 0) return null;
  const body = q.slice(1, last);
  const flags = q.slice(last + 1);
  try {
    return new RegExp(body, flags.includes('i') ? 'i' : '');
  } catch {
    return null;
  }
}

function regexFind(re: RegExp, backward: boolean): boolean {
  const body = document.body;
  if (!body) return false;

  if (!regexState || regexState.regex.source !== re.source || regexState.regex.flags !== re.flags) {
    regexState = {
      regex: re,
      walker: document.createTreeWalker(body, NodeFilter.SHOW_TEXT),
      lastNode: null,
    };
  }

  const { walker, regex } = regexState;
  if (!walker) return false;

  const nodes: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    if (n instanceof Text && n.data.trim()) nodes.push(n);
    n = walker.nextNode();
  }

  if (!nodes.length) return false;

  let startIdx = 0;
  if (regexState.lastNode) {
    const idx = nodes.indexOf(regexState.lastNode as Text);
    if (idx >= 0) startIdx = backward ? idx - 1 : idx + 1;
  }

  const range = document.createRange();
  const sel = window.getSelection();

  const tryNode = (textNode: Text): boolean => {
    const text = textNode.data;
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (!match) return false;
    const start = match.index;
    const end = start + match[0].length;
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    sel?.removeAllRanges();
    sel?.addRange(range);
    const rect = range.getBoundingClientRect();
    if (rect) {
      window.scrollTo({
        top: window.scrollY + rect.top - window.innerHeight / 3,
        behavior: 'auto',
      });
    }
    regexState!.lastNode = textNode;
    return true;
  };

  if (backward) {
    for (let i = startIdx < 0 ? nodes.length - 1 : startIdx; i >= 0; i--) {
      if (tryNode(nodes[i]!)) return true;
    }
    for (let i = nodes.length - 1; i > (startIdx < 0 ? nodes.length - 1 : startIdx); i--) {
      if (tryNode(nodes[i]!)) return true;
    }
  } else {
    for (let i = Math.max(0, startIdx); i < nodes.length; i++) {
      if (tryNode(nodes[i]!)) return true;
    }
    for (let i = 0; i < Math.max(0, startIdx); i++) {
      if (tryNode(nodes[i]!)) return true;
    }
  }
  return false;
}

function updateStatus(text: string): void {
  const status = seekRoot?.querySelector('[data-bs-seek-status]');
  if (status) status.textContent = text;
}

function syncInputDisplay(): void {
  if (!seekInput) return;
  seekInput.value = lastQuery;
  seekInput.setSelectionRange(lastQuery.length, lastQuery.length);
}

function refocusInput(): void {
  if (!seekInput) return;
  seekInput.focus({ preventScroll: true });
}

function setQuery(query: string, find = true): void {
  lastQuery = query;
  regexState = null;
  syncInputDisplay();
  if (!lastQuery) {
    updateStatus('Type to search… (/regex/ for regex)');
    refocusInput();
    return;
  }
  if (find) {
    saveJumpBack();
    runFind(lastQuery, false);
  }
  const hint = parseRegexQuery(lastQuery) ? 'regex' : 'text';
  updateStatus(find ? `Searching (${hint}) "${lastQuery}"…` : `"${lastQuery}"`);
  refocusInput();
}

function stepFind(backward = false): void {
  if (!lastQuery) return;
  const ok = runFind(lastQuery, backward);
  updateStatus(ok ? `${backward ? '↑' : '↓'} "${lastQuery}"` : `Not found: ${lastQuery}`);
  if (!ok) flashMessage(`Not found: ${lastQuery}`, 1200);
  refocusInput();
}

function insertChar(ch: string): void {
  setQuery(lastQuery + ch, true);
}

function deleteChar(): void {
  if (!lastQuery.length) {
    refocusInput();
    return;
  }
  setQuery(lastQuery.slice(0, -1), lastQuery.length > 1);
}

export function isSeekActive(): boolean {
  return !!seekRoot;
}

export function closeSeek(): void {
  seekRoot?.remove();
  seekRoot = null;
  seekInput = null;
  regexState = null;
  hideHud();
}

/** Find next/prev match using the last query (works after seek bar closes). */
export function findNext(backward = false): boolean {
  if (!lastQuery) {
    flashMessage('No search query. Press / to search.');
    return false;
  }
  const ok = runFind(lastQuery, backward);
  if (!ok) flashMessage(`Not found: ${lastQuery}`, 1200);
  return ok;
}

export function openSeek(seed = ''): void {
  closeSeek();
  const root = ensurePageUiRoot();

  seekRoot = document.createElement('div');
  seekRoot.className = 'bs-seek-bar';
  seekRoot.setAttribute('data-bs-seek', 'active');
  seekRoot.innerHTML = `
    <label>/</label>
    <input type="text" placeholder="Find on page… (/pat/ regex)" autocomplete="off" spellcheck="false" readonly tabindex="0" aria-label="Find on page" />
    <span class="bs-seek-hint" data-bs-seek-status>Enter ↵ find · /regex/ · Esc close</span>
  `;
  root.appendChild(seekRoot);

  seekInput = seekRoot.querySelector('input');
  lastQuery = seed;
  syncInputDisplay();
  updateStatus('Type to search… (/regex/ for regex)');
  refocusInput();
}

function isPrintableKey(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'Unidentified' || e.key === 'Dead') return null;
  if (e.key.length !== 1) return null;
  return e.key;
}

/**
 * Capture-phase handler — runs before all global Vimium binds.
 * All typing goes through here (input is readonly) so single-key binds cannot steal characters.
 */
export function handleSeekKeydown(e: KeyboardEvent): boolean {
  if (!seekRoot || !seekInput) return false;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (e.isComposing || e.key === 'Process') return true;

  if (e.key === 'Escape') {
    closeSeek();
    return true;
  }

  if (e.key === 'Enter') {
    if (lastQuery) stepFind(e.shiftKey);
    return true;
  }

  if (e.key === 'Backspace') {
    deleteChar();
    return true;
  }

  const ch = isPrintableKey(e);
  if (ch) {
    insertChar(ch);
    return true;
  }

  return true;
}