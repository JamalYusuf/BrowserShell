/** Injected into page context via chrome.scripting — no imports allowed. */

export function seekInPage(query: string, backwards: boolean): { found: boolean; matches: number } {
  const text = document.body?.innerText ?? '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = escaped ? (text.match(new RegExp(escaped, 'gi')) ?? []).length : 0;
  const findFn = (window as Window & { find?: (s: string, cs: boolean, back: boolean, wrap: boolean, whole: boolean, frames: boolean, dialog: boolean) => boolean }).find;
  const found = query && typeof findFn === 'function'
    ? findFn(query, false, backwards, true, false, true, false)
    : matches > 0;
  return { found, matches };
}

export function scrollPage(action: string, amount: number): { y: number; max: number } {
  const max = document.documentElement.scrollHeight;
  switch (action) {
    case 'top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'bottom':
      window.scrollTo({ top: max, behavior: 'smooth' });
      break;
    case 'up':
      window.scrollBy({ top: -amount, behavior: 'smooth' });
      break;
    case 'down':
      window.scrollBy({ top: amount, behavior: 'smooth' });
      break;
    default:
      window.scrollBy({ top: amount, behavior: 'smooth' });
  }
  return { y: window.scrollY, max };
}

export interface PageVolumeResult {
  media: number;
  volume: number | null;
  muted: boolean;
}

export function setPageVolume(action: string, value: number): PageVolumeResult {
  const media = [...document.querySelectorAll('video, audio')] as HTMLMediaElement[];
  if (!media.length) return { media: 0, volume: null, muted: false };

  const playing = media.find((m) => !m.paused) ?? media[0]!;
  let volume = playing.volume;
  let muted = playing.muted;

  switch (action) {
    case 'mute':
      media.forEach((m) => { m.muted = true; });
      muted = true;
      break;
    case 'unmute':
      media.forEach((m) => { m.muted = false; });
      muted = false;
      break;
    case 'set':
      volume = Math.max(0, Math.min(1, value / 100));
      media.forEach((m) => {
        m.volume = volume;
        m.muted = volume === 0;
      });
      muted = volume === 0;
      break;
    case 'up':
      volume = Math.min(1, playing.volume + value / 100);
      media.forEach((m) => { m.volume = volume; m.muted = false; });
      muted = false;
      break;
    case 'down':
      volume = Math.max(0, playing.volume - value / 100);
      media.forEach((m) => {
        m.volume = volume;
        m.muted = volume === 0;
      });
      muted = volume === 0;
      break;
    case 'status':
      volume = playing.volume;
      muted = playing.muted;
      break;
  }

  return { media: media.length, volume, muted };
}

export function grepPageText(query: string, maxLines: number): { matches: number; lines: string[] } {
  const text = document.body?.innerText ?? '';
  const lower = query.toLowerCase();
  const lines = text.split('\n').filter((l) => l.toLowerCase().includes(lower));
  return { matches: lines.length, lines: lines.slice(0, maxLines) };
}

export interface PageLink {
  text: string;
  href: string;
}

export function listPageLinks(pattern: string, limit: number): PageLink[] {
  const links = [...document.querySelectorAll('a[href]')] as HTMLAnchorElement[];
  const regex = pattern ? new RegExp(pattern, 'i') : null;
  const results: PageLink[] = [];

  for (const link of links) {
    const text = (link.innerText || link.title || '').trim().replace(/\s+/g, ' ');
    const href = link.href;
    if (!href || href.startsWith('javascript:')) continue;
    if (regex && !regex.test(text) && !regex.test(href)) continue;
    results.push({ text: text.slice(0, 80) || href, href });
    if (results.length >= limit) break;
  }

  return results;
}

export interface ClickResult {
  clicked: boolean;
  tag: string;
  match: string;
  method: string;
  href?: string;
}

function elementLabel(el: Element): string {
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  const aria = el.getAttribute('aria-label') || '';
  const title = el.getAttribute('title') || '';
  const value = el instanceof HTMLInputElement ? (el.value || el.getAttribute('value') || '') : '';
  const placeholder = el instanceof HTMLInputElement ? (el.placeholder || '') : '';
  return text || aria || title || value || placeholder;
}

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(html);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = html.getBoundingClientRect?.();
  if (!rect) return true;
  if (rect.width > 0 || rect.height > 0) return true;
  return style.opacity !== '0' && html.offsetParent !== null;
}

function looksLikeSelector(target: string): boolean {
  return /^[#.[]/.test(target) || /^[a-z][a-z0-9-]*(\[|\.|#|:|>|\+|~)/i.test(target);
}

function linkMatches(label: string, href: string, query: string): boolean {
  const lower = query.toLowerCase();
  return label.toLowerCase().includes(lower) || href.toLowerCase().includes(lower);
}

/** Find first link or button by text; returns href for anchors (navigate via tabs.update). */
export function clickTarget(target: string): ClickResult {
  const trimmed = target.trim();
  if (!trimmed) return { clicked: false, tag: '', match: '', method: '' };

  if (looksLikeSelector(trimmed)) {
    try {
      const el = document.querySelector(trimmed);
      if (el instanceof HTMLAnchorElement && el.href && !el.href.startsWith('javascript:')) {
        const label = elementLabel(el);
        return { clicked: true, tag: 'a', match: label || el.href, method: 'selector', href: el.href };
      }
      if (el instanceof HTMLElement) {
        el.click();
        return { clicked: true, tag: el.tagName.toLowerCase(), match: elementLabel(el), method: 'selector' };
      }
    } catch {
      // invalid selector — fall through to text match
    }
  }

  const lower = trimmed.toLowerCase();

  for (const el of document.querySelectorAll('a[href]')) {
    const a = el as HTMLAnchorElement;
    if (!isVisible(a)) continue;
    if (!a.href || a.href.startsWith('javascript:')) continue;
    const label = elementLabel(a);
    if (linkMatches(label, a.href, lower)) {
      return { clicked: true, tag: 'a', match: label || a.href, method: 'link', href: a.href };
    }
  }

  const buttonSelector = 'button, [role="button"], input[type="submit"], input[type="button"], summary';
  for (const el of document.querySelectorAll(buttonSelector)) {
    if (!isVisible(el)) continue;
    const label = elementLabel(el);
    if (!label.toLowerCase().includes(lower)) continue;
    (el as HTMLElement).click();
    return { clicked: true, tag: el.tagName.toLowerCase(), match: label, method: 'button' };
  }

  return { clicked: false, tag: '', match: '', method: '' };
}

/** Click the nth visible link from listPageLinks ordering (1-based). */
export function clickLinkAtIndex(index: number, pattern: string): ClickResult {
  const links = listPageLinks(pattern, 1000);
  const target = links[index - 1];
  if (!target) return { clicked: false, tag: '', match: '', method: '' };

  for (const el of document.querySelectorAll('a[href]')) {
    const a = el as HTMLAnchorElement;
    if (!a.href || a.href.startsWith('javascript:')) continue;
    if (!isVisible(a)) continue;
    const label = elementLabel(a);
    const text = (label || a.href).trim().replace(/\s+/g, ' ').slice(0, 80) || a.href;
    if (a.href !== target.href && text !== target.text) continue;

    const isHash = a.getAttribute('href')?.startsWith('#') || a.href.replace(location.origin + location.pathname, '').startsWith('#');
    if (isHash) {
      a.click();
      return { clicked: true, tag: 'a', match: target.text, method: 'index-click' };
    }
    return { clicked: true, tag: 'a', match: target.text, method: 'index', href: a.href };
  }

  return { clicked: false, tag: '', match: '', method: '' };
}

export function setPageTitle(newTitle: string): string {
  document.title = newTitle;
  return document.title;
}

export function fillElement(selector: string, value: string): { filled: boolean; tag: string } {
  const el = document.querySelector(selector);
  if (!el || !(el instanceof HTMLElement)) return { filled: false, tag: '' };
  setEditableText(el, value);
  return { filled: true, tag: el.tagName.toLowerCase() };
}

export function getSelectionText(): string {
  return window.getSelection()?.toString() ?? '';
}

export function extractReadableText(maxLen: number): string {
  const main = document.querySelector('main, article, [role="main"], .post, .article, #content');
  const root = main ?? document.body;
  const text = ((root as HTMLElement | null)?.innerText ?? '').replace(/\n{3,}/g, '\n\n').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

export interface PageInput {
  label: string;
  type: string;
  name: string;
  placeholder: string;
}

const INPUT_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="textbox"]',
].join(', ');

function queryAllDeep(selector: string, root: ParentNode = document): Element[] {
  const results: Element[] = [];
  root.querySelectorAll(selector).forEach((el) => results.push(el));
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) results.push(...queryAllDeep(selector, el.shadowRoot));
  });
  return results;
}

function inputLabel(el: Element): string {
  const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const id = html.id;
  if (id) {
    const label = queryAllDeep(`label[for="${CSS.escape(id)}"]`).find((l) => l.textContent?.trim());
    if (label?.textContent?.trim()) return label.textContent.trim().replace(/\s+/g, ' ');
  }
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => queryAllDeep(`#${CSS.escape(id)}`)[0]?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (text) return text.replace(/\s+/g, ' ');
  }
  const aria = el.getAttribute('aria-label') || el.getAttribute('aria-placeholder') || '';
  const placeholder = html instanceof HTMLInputElement || html instanceof HTMLTextAreaElement ? html.placeholder : '';
  const name = html.getAttribute('name') || '';
  const role = el.getAttribute('role') || '';
  return aria || placeholder || name || role || el.tagName.toLowerCase();
}

function inputType(el: Element): string {
  const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (html instanceof HTMLSelectElement) return 'select';
  if ((el as HTMLElement).isContentEditable) return 'contenteditable';
  const role = el.getAttribute('role');
  if (role === 'searchbox' || role === 'combobox' || role === 'textbox') return role;
  return (html as HTMLInputElement).type || html.tagName.toLowerCase();
}

function inputMatchesPattern(el: Element, regex: RegExp | null): boolean {
  if (!regex) return true;
  const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const placeholder = html instanceof HTMLInputElement || html instanceof HTMLTextAreaElement ? html.placeholder : '';
  const name = html.getAttribute('name') || '';
  const label = inputLabel(el);
  const type = inputType(el);
  return regex.test(label) || regex.test(name) || regex.test(placeholder) || regex.test(type);
}

function collectInputs(): HTMLElement[] {
  const seen = new Set<Element>();
  const results: HTMLElement[] = [];
  for (const el of queryAllDeep(INPUT_SELECTOR)) {
    if (seen.has(el)) continue;
    seen.add(el);
    if (!isVisible(el)) continue;
    results.push(el as HTMLElement);
  }
  return results;
}

function collectFilteredInputs(pattern: string, limit: number): HTMLElement[] {
  const regex = pattern ? new RegExp(pattern, 'i') : null;
  const results: HTMLElement[] = [];
  for (const el of collectInputs()) {
    if (!inputMatchesPattern(el, regex)) continue;
    results.push(el);
    if (results.length >= limit) break;
  }
  return results;
}

export function listPageInputs(pattern: string, limit: number): PageInput[] {
  return collectFilteredInputs(pattern, limit).map((el) => {
    const html = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const placeholder = html instanceof HTMLInputElement || html instanceof HTMLTextAreaElement ? html.placeholder : '';
    return {
      label: inputLabel(el).slice(0, 60),
      type: inputType(el),
      name: html.getAttribute('name') || '',
      placeholder: placeholder.slice(0, 40),
    };
  });
}

function inputAtIndex(index: number, pattern: string): HTMLElement | undefined {
  return collectFilteredInputs(pattern, 1000)[index - 1];
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setEditableText(el: HTMLElement, value: string): void {
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, value);
    return;
  }
  if (el instanceof HTMLSelectElement) {
    const opt = [...el.options].find((o) => o.text.includes(value) || o.value === value);
    if (opt) el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (el.isContentEditable || el.getAttribute('role') === 'textbox' || el.getAttribute('role') === 'searchbox' || el.getAttribute('role') === 'combobox') {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function focusInputAtIndex(index: number, pattern: string): { ok: boolean; label: string } {
  const el = inputAtIndex(index, pattern);
  if (!el) return { ok: false, label: '' };
  el.focus();
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return { ok: true, label: inputLabel(el) };
}

export function fillInputAtIndex(index: number, value: string, pattern: string): { ok: boolean; label: string } {
  const el = inputAtIndex(index, pattern);
  if (!el) return { ok: false, label: '' };
  setEditableText(el, value);
  return { ok: true, label: inputLabel(el) };
}

export function clearInputAtIndex(index: number, pattern: string): { ok: boolean; label: string } {
  return fillInputAtIndex(index, '', pattern);
}

const KEY_MAP: Record<string, string> = {
  enter: 'Enter', return: 'Enter', tab: 'Tab', escape: 'Escape', esc: 'Escape',
  space: ' ', backspace: 'Backspace', delete: 'Delete', up: 'ArrowUp', down: 'ArrowDown',
  left: 'ArrowLeft', right: 'ArrowRight', home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown',
};

export function pressKey(key: string): { pressed: boolean; key: string } {
  const normalized = KEY_MAP[key.toLowerCase().replace(/\s+/g, '')] ?? key;
  const target = (document.activeElement as HTMLElement) ?? document.body;
  const opts: KeyboardEventInit = { key: normalized, bubbles: true, cancelable: true };
  if (normalized === 'Enter') opts.code = 'Enter';
  if (normalized === 'Tab') opts.code = 'Tab';
  target.dispatchEvent(new KeyboardEvent('keydown', opts));
  target.dispatchEvent(new KeyboardEvent('keyup', opts));
  if (normalized === 'Enter' && target instanceof HTMLInputElement) {
    target.form?.requestSubmit?.();
  }
  return { pressed: true, key: normalized };
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogImage: string;
  author: string;
  keywords: string;
}

export function getPageMeta(): PageMeta {
  const meta = (name: string) =>
    document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content') ?? '';
  const link = (rel: string) => document.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') ?? '';
  return {
    title: document.title,
    description: meta('description') || meta('og:description'),
    canonical: link('canonical'),
    ogTitle: meta('og:title'),
    ogImage: meta('og:image'),
    author: meta('author'),
    keywords: meta('keywords'),
  };
}

export interface PageImage {
  alt: string;
  src: string;
  width: number;
  height: number;
}

export function listPageImages(pattern: string, limit: number): PageImage[] {
  const regex = pattern ? new RegExp(pattern, 'i') : null;
  const results: PageImage[] = [];
  for (const img of document.querySelectorAll('img[src]')) {
    const el = img as HTMLImageElement;
    if (!isVisible(el)) continue;
    const src = el.currentSrc || el.src;
    if (!src || src.startsWith('data:image/svg')) continue;
    const alt = (el.alt || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (regex && !regex.test(alt) && !regex.test(src)) continue;
    results.push({ alt: alt || src.split('/').pop()?.slice(0, 40) || 'image', src, width: el.naturalWidth || el.width, height: el.naturalHeight || el.height });
    if (results.length >= limit) break;
  }
  return results;
}