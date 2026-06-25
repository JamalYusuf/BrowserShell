/** Page-level actions for Vimium-style global hotkeys. */

import { flashMessage } from './hud';

export function scrollHorizontal(direction: 'left' | 'right', amount = 80): void {
  const el = document.scrollingElement ?? document.documentElement;
  const delta = direction === 'left' ? -amount : amount;
  if (el === document.documentElement || el === document.body) {
    window.scrollBy({ left: delta, behavior: 'auto' });
  } else {
    (el as HTMLElement).scrollLeft += delta;
  }
}

export function scrollHorizontalEdge(side: 'left' | 'right'): void {
  const el = document.scrollingElement ?? document.documentElement;
  const left = side === 'left' ? 0 : el.scrollWidth;
  if (el === document.documentElement || el === document.body) {
    window.scrollTo({ left, behavior: 'auto' });
  } else {
    (el as HTMLElement).scrollLeft = left;
  }
}

export function viewPageSource(): void {
  const url = `view-source:${location.href}`;
  window.open(url, '_blank', 'noopener');
  flashMessage('Opened page source.');
}

export function navigateUrlUp(levels = 1): void {
  try {
    const u = new URL(location.href);
    const parts = u.pathname.split('/').filter(Boolean);
    for (let i = 0; i < levels && parts.length; i++) parts.pop();
    u.pathname = parts.length ? `/${parts.join('/')}/` : '/';
    u.search = '';
    u.hash = '';
    location.assign(u.toString());
  } catch {
    flashMessage('Cannot navigate up — invalid URL.');
  }
}

export function navigateUrlRoot(): void {
  try {
    const u = new URL(location.href);
    location.assign(`${u.origin}/`);
  } catch {
    flashMessage('Cannot navigate to root — invalid URL.');
  }
}

let frameIndex = 0;

function listFrames(): HTMLIFrameElement[] {
  return [...document.querySelectorAll('iframe')].filter((f) => {
    const r = f.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) as HTMLIFrameElement[];
}

export function focusNextFrame(): void {
  const frames = listFrames();
  if (!frames.length) {
    flashMessage('No frames on this page.');
    return;
  }
  frameIndex = (frameIndex + 1) % (frames.length + 1);
  if (frameIndex === 0) {
    window.focus();
    flashMessage('Focused main frame.');
    return;
  }
  const frame = frames[frameIndex - 1]!;
  try {
    frame.focus();
    flashMessage(`Focused frame ${frameIndex}/${frames.length}.`);
  } catch {
    flashMessage('Cannot focus frame (cross-origin).');
  }
}

export function focusMainFrame(): void {
  frameIndex = 0;
  window.focus();
  flashMessage('Focused main frame.');
}

export function followPagination(direction: 'next' | 'prev'): void {
  const rel = direction === 'next' ? 'next' : 'prev';
  const byRel = document.querySelector<HTMLAnchorElement>(`a[rel~="${rel}" i]`);
  if (byRel?.href) {
    location.assign(byRel.href);
    return;
  }
  const labels = direction === 'next' ? ['next', '>', '»', 'older', 'more'] : ['prev', 'previous', '<', '«', 'newer'];
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
  const match = links.find((a) => {
    const text = (a.textContent ?? '').trim().toLowerCase();
    const aria = (a.getAttribute('aria-label') ?? '').toLowerCase();
    return labels.some((l) => text === l || text.startsWith(`${l} `) || aria.includes(l));
  });
  if (match?.href) {
    location.assign(match.href);
    return;
  }
  flashMessage(`No "${direction}" pagination link found.`);
}

export async function openMultipleLinksInNewTabs(): Promise<void> {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) => {
    const r = a.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !a.href.startsWith('javascript:');
  });
  if (!links.length) {
    flashMessage('No links found.');
    return;
  }
  const pick = links.slice(0, 8);
  for (const a of pick) {
    await chrome.runtime.sendMessage({ type: 'tab-new-url', url: a.href });
  }
  flashMessage(`Opened ${pick.length} link(s) in new tabs.`);
}