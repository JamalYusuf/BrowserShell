export interface ClickableTarget {
  element: HTMLElement;
  rect: DOMRect;
  pageX: number;
  pageY: number;
  href?: string;
  label: string;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH']);

function pageCoords(rect: DOMRect): { pageX: number; pageY: number } {
  return {
    pageX: rect.left + window.scrollX,
    pageY: rect.top + window.scrollY,
  };
}

function isInViewport(rect: DOMRect): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;
}

function isVisible(el: HTMLElement, viewportOnly = false): boolean {
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  if (parseFloat(style.opacity) === 0) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const rect = el.getBoundingClientRect();
  const w = rect.width || el.offsetWidth;
  const h = rect.height || el.offsetHeight;
  if (w < 2 || h < 2) return false;

  if (viewportOnly && !isInViewport(rect)) return false;

  return true;
}

function labelFor(el: HTMLElement): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 48);
  const aria = el.getAttribute('aria-label') ?? el.getAttribute('title') ?? '';
  if (aria) return aria.slice(0, 48);
  if (el instanceof HTMLInputElement) return el.value || el.placeholder || el.type;
  return el.tagName.toLowerCase();
}

function hrefFor(el: HTMLElement): string | undefined {
  if (el instanceof HTMLAnchorElement) return el.href || undefined;
  const href = el.getAttribute('href');
  if (href && !href.startsWith('javascript:')) return href;
  return undefined;
}

function addCandidate(
  list: ClickableTarget[],
  el: HTMLElement,
  seen: WeakSet<HTMLElement>,
  viewportOnly: boolean,
): void {
  if (seen.has(el) || SKIP_TAGS.has(el.tagName)) return;
  if (!isVisible(el, viewportOnly)) return;

  const rect = el.getBoundingClientRect();
  const w = rect.width || el.offsetWidth;
  const h = rect.height || el.offsetHeight;
  if (w < 2 || h < 2) return;

  const href = hrefFor(el);
  if (href?.startsWith('javascript:')) return;

  seen.add(el);
  const { pageX, pageY } = pageCoords(rect);
  list.push({
    element: el,
    rect,
    pageX,
    pageY,
    href,
    label: labelFor(el),
  });
}

export interface CollectClickablesOptions {
  max?: number;
  /** When true, only elements intersecting the current viewport are included. */
  viewportOnly?: boolean;
}

/** Collect visible clickables — links, buttons, roles, and common interactive elements. */
export function collectClickables(maxOrOpts: number | CollectClickablesOptions = 220): ClickableTarget[] {
  const opts = typeof maxOrOpts === 'number' ? { max: maxOrOpts } : maxOrOpts;
  const max = opts.max ?? 220;
  const viewportOnly = opts.viewportOnly ?? true;

  const seen = new WeakSet<HTMLElement>();
  const out: ClickableTarget[] = [];

  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input[type="button"]:not([disabled])',
    'input[type="submit"]:not([disabled])',
    'summary',
    'area[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
  ];

  for (const sel of selectors) {
    for (const node of document.querySelectorAll(sel)) {
      if (!(node instanceof HTMLElement)) continue;
      addCandidate(out, node, seen, viewportOnly);
      if (out.length >= max) return sortClickables(out);
    }
  }

  return sortClickables(out);
}

export function sortClickables(targets: ClickableTarget[]): ClickableTarget[] {
  return [...targets].sort((a, b) => {
    if (a.pageY !== b.pageY) return a.pageY - b.pageY;
    return a.pageX - b.pageX;
  });
}

/** Drop elements fully contained by a larger clickable (reduces nested link noise). */
export function dedupeNested(targets: ClickableTarget[]): ClickableTarget[] {
  return targets.filter((t, i) => {
    for (let j = 0; j < targets.length; j++) {
      if (i === j) continue;
      const o = targets[j]!;
      const tRect = t.element.getBoundingClientRect();
      const oRect = o.element.getBoundingClientRect();
      if (
        tRect.left >= oRect.left &&
        tRect.top >= oRect.top &&
        tRect.right <= oRect.right &&
        tRect.bottom <= oRect.bottom &&
        oRect.width * oRect.height > tRect.width * tRect.height * 1.2
      ) {
        return false;
      }
    }
    return true;
  });
}