function isScrollable(el: Element): boolean {
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  if (!['auto', 'scroll', 'overlay'].includes(oy)) return false;
  return el.scrollHeight > el.clientHeight + 2;
}

/** Prefer the scrollable region under the cursor / focus (Vimium-style). */
export function getScrollElement(): Element {
  const active = document.activeElement;
  if (active instanceof Element && isScrollable(active)) return active;

  const cx = Math.floor(window.innerWidth / 2);
  const cy = Math.floor(window.innerHeight / 2);
  let node = document.elementFromPoint(cx, cy);
  while (node) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }

  return document.scrollingElement ?? document.documentElement;
}

export function scrollPage(action: string, stepRatio = 0.8): void {
  const el = getScrollElement();
  const h = el === document.documentElement || el === document.body
    ? window.innerHeight
    : el.clientHeight;

  const scrollBy = (delta: number) => {
    if (el === document.documentElement || el === document.body || el === document.scrollingElement) {
      window.scrollBy({ top: delta, behavior: 'auto' });
    } else {
      (el as HTMLElement).scrollTop += delta;
    }
  };

  const scrollTo = (top: number) => {
    if (el === document.documentElement || el === document.body || el === document.scrollingElement) {
      window.scrollTo({ top, behavior: 'auto' });
    } else {
      (el as HTMLElement).scrollTop = top;
    }
  };

  const scrollHorizontal = (delta: number) => {
    if (el === document.documentElement || el === document.body || el === document.scrollingElement) {
      window.scrollBy({ left: delta, behavior: 'auto' });
    } else {
      (el as HTMLElement).scrollLeft += delta;
    }
  };

  const scrollHorizontalTo = (left: number) => {
    if (el === document.documentElement || el === document.body || el === document.scrollingElement) {
      window.scrollTo({ left, behavior: 'auto' });
    } else {
      (el as HTMLElement).scrollLeft = left;
    }
  };

  switch (action) {
    case 'scroll-top':
      scrollTo(0);
      break;
    case 'scroll-bottom':
      scrollTo(el.scrollHeight);
      break;
    case 'scroll-down':
      scrollBy(Math.round(h * stepRatio));
      break;
    case 'scroll-up':
      scrollBy(-Math.round(h * stepRatio));
      break;
    case 'scroll-half-down':
      scrollBy(Math.round(h * 0.5));
      break;
    case 'scroll-half-up':
      scrollBy(-Math.round(h * 0.5));
      break;
    case 'scroll-left':
      scrollHorizontal(-Math.round(h * 0.25));
      break;
    case 'scroll-right':
      scrollHorizontal(Math.round(h * 0.25));
      break;
    case 'scroll-edge-left':
      scrollHorizontalTo(0);
      break;
    case 'scroll-edge-right':
      scrollHorizontalTo(el.scrollWidth);
      break;
  }
}