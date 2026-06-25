/** Local and global scroll marks (Vimium ma / `a / ``). */

import { flashMessage } from './hud';

interface MarkPosition {
  url: string;
  scrollX: number;
  scrollY: number;
}

const LOCAL_KEY = 'bs-marks-local';
const GLOBAL_KEY = 'bs-marks-global';
let jumpBack: MarkPosition | null = null;

function pageKey(): string {
  return `${location.origin}${location.pathname}${location.search}`;
}

async function loadLocal(): Promise<Record<string, MarkPosition>> {
  const raw = sessionStorage.getItem(LOCAL_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, MarkPosition>;
  } catch {
    return {};
  }
}

async function saveLocal(marks: Record<string, MarkPosition>): Promise<void> {
  sessionStorage.setItem(LOCAL_KEY, JSON.stringify(marks));
}

async function loadGlobal(): Promise<Record<string, MarkPosition>> {
  const stored = await chrome.storage.local.get(GLOBAL_KEY);
  return (stored[GLOBAL_KEY] as Record<string, MarkPosition> | undefined) ?? {};
}

async function saveGlobal(marks: Record<string, MarkPosition>): Promise<void> {
  await chrome.storage.local.set({ [GLOBAL_KEY]: marks });
}

function currentPosition(): MarkPosition {
  return {
    url: location.href,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function saveJumpBack(): void {
  jumpBack = currentPosition();
}

export async function setMark(name: string, global: boolean): Promise<void> {
  const pos = currentPosition();
  if (global) {
    const marks = await loadGlobal();
    marks[name] = pos;
    await saveGlobal(marks);
    flashMessage(`Global mark '${name}' set.`);
  } else {
    const marks = await loadLocal();
    marks[name] = { ...pos, url: pageKey() };
    await saveLocal(marks);
    flashMessage(`Local mark '${name}' set.`);
  }
}

async function jumpTo(pos: MarkPosition): Promise<void> {
  saveJumpBack();
  if (pos.url !== location.href && !pos.url.startsWith(location.origin)) {
    location.assign(pos.url);
    await new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener('load', done);
        resolve();
      };
      window.addEventListener('load', done);
      setTimeout(resolve, 500);
    });
  } else if (pos.url !== location.href) {
    location.assign(pos.url);
    return;
  }
  window.scrollTo(pos.scrollX, pos.scrollY);
}

export async function jumpToMark(name: string, global: boolean): Promise<void> {
  if (global) {
    const marks = await loadGlobal();
    const pos = marks[name];
    if (!pos) {
      flashMessage(`Global mark '${name}' not set.`);
      return;
    }
    await jumpTo(pos);
    flashMessage(`Jumped to global mark '${name}'.`);
    return;
  }

  const marks = await loadLocal();
  const pos = marks[name];
  if (!pos) {
    flashMessage(`Local mark '${name}' not set.`);
    return;
  }
  if (pos.url !== pageKey()) {
    flashMessage(`Local mark '${name}' is on another page.`);
    return;
  }
  saveJumpBack();
  window.scrollTo(pos.scrollX, pos.scrollY);
  flashMessage(`Jumped to mark '${name}'.`);
}

export async function jumpBackMark(): Promise<void> {
  if (!jumpBack) {
    flashMessage('No previous jump position.');
    return;
  }
  const target = jumpBack;
  jumpBack = currentPosition();
  await jumpTo(target);
  flashMessage('Jumped back.');
}