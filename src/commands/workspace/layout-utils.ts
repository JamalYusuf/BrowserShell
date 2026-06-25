import type { ChromeAPI } from '@/chrome/api';
import {
  computeWindowRects,
  defaultWorkArea,
  parseLayoutRatio,
  rectForSlot,
  type LayoutPreset,
  type WorkArea,
  type WindowRect,
} from '@/shared/window-layout';
import { getAllWindows } from '../shared/window-utils';

async function getWorkArea(chrome: ChromeAPI): Promise<WorkArea> {
  try {
    const displays = await chrome.system?.display?.getInfo?.();
    const primary = displays?.find((d) => d.isPrimary) ?? displays?.[0];
    if (primary?.workArea) {
      return {
        left: primary.workArea.left,
        top: primary.workArea.top,
        width: primary.workArea.width,
        height: primary.workArea.height,
      };
    }
  } catch {
    /* fall through */
  }

  const wins = await getAllWindows(chrome);
  const withBounds = wins.find((w) => w.width && w.height);
  if (withBounds?.width && withBounds.height) {
    return {
      left: withBounds.left ?? 0,
      top: withBounds.top ?? 0,
      width: Math.max(withBounds.width * 2, 1200),
      height: withBounds.height,
    };
  }
  return defaultWorkArea();
}

async function applyRect(chrome: ChromeAPI, windowId: number, rect: WindowRect, focus = false): Promise<void> {
  await chrome.windows.update(windowId, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    state: 'normal',
    focused: focus,
  });
}

export async function applyLayoutToWindows(
  chrome: ChromeAPI,
  preset: LayoutPreset,
  opts: { windowIds?: number[]; ratio?: number; focusIndex?: number } = {},
): Promise<{ windowIds: number[]; preset: LayoutPreset }> {
  const work = await getWorkArea(chrome);
  const ratio = opts.ratio ?? 0.6;
  const [rectA, rectB] = computeWindowRects(preset, work, ratio);

  let wins = await getAllWindows(chrome);
  let ids = opts.windowIds?.length ? opts.windowIds : wins.slice(0, 2).map((w) => w.id);

  if (ids.length < 2) {
    const current = ids[0] ?? wins.find((w) => w.focused)?.id ?? wins[0]?.id;
    if (!current) throw new Error('No browser window available.');
    const created = await chrome.windows.create({
      left: rectB.left,
      top: rectB.top,
      width: rectB.width,
      height: rectB.height,
      focused: true,
      state: 'normal',
      url: 'about:blank',
    });
    ids = [current, created.id];
    await applyRect(chrome, current, rectA, false);
    await applyRect(chrome, created.id, rectB, true);
    return { windowIds: ids, preset };
  }

  await applyRect(chrome, ids[0]!, rectA, opts.focusIndex === 0);
  await applyRect(chrome, ids[1]!, rectB, opts.focusIndex === 1);
  return { windowIds: ids.slice(0, 2), preset };
}

export async function openSplitWindowHorizontal(
  chrome: ChromeAPI,
  url: string,
  side: 'top' | 'bottom' = 'bottom',
): Promise<{ windowId: number; tabId: number }> {
  const work = await getWorkArea(chrome);
  const [topRect, bottomRect] = computeWindowRects('top-bottom', work);
  const wins = await getAllWindows(chrome);
  const current = wins.find((w) => w.focused) ?? wins[0];
  if (current) {
    await applyRect(chrome, current.id, side === 'top' ? bottomRect : topRect, true);
  }

  const rect = side === 'top' ? topRect : bottomRect;
  const win = await chrome.windows.create({
    url,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    focused: true,
    state: 'normal',
  });
  const tabs = await chrome.tabs.query({ windowId: win.id, index: 0 });
  return { windowId: win.id, tabId: tabs[0]?.id ?? 0 };
}

export async function openSplitWindow(
  chrome: ChromeAPI,
  url: string,
  side: 'left' | 'right' = 'right',
): Promise<{ windowId: number; tabId: number }> {
  const work = await getWorkArea(chrome);
  const rect = rectForSlot(side, work);
  const wins = await getAllWindows(chrome);
  const current = wins.find((w) => w.focused) ?? wins[0];
  if (current) {
    const [leftRect, rightRect] = computeWindowRects('side-by-side', work);
    await applyRect(chrome, current.id, side === 'left' ? rightRect : leftRect, true);
  }

  const win = await chrome.windows.create({
    url,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    focused: true,
    state: 'normal',
  });
  const tabs = await chrome.tabs.query({ windowId: win.id, index: 0 });
  return { windowId: win.id, tabId: tabs[0]?.id ?? 0 };
}

export async function positionWindow(
  chrome: ChromeAPI,
  windowId: number,
  slot: 'left' | 'right' | 'top' | 'bottom' | 'full',
  ratio?: number,
): Promise<void> {
  const work = await getWorkArea(chrome);
  const rect = rectForSlot(slot, work, parseLayoutRatio(ratio ? String(ratio) : undefined));
  await applyRect(chrome, windowId, rect, true);
}

export { getWorkArea, parseLayoutRatio };