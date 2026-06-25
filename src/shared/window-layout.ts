/** Window geometry presets — Chrome cannot split a single window; we tile multiple windows. */

export interface WindowRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorkArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type LayoutPreset =
  | 'side-by-side'
  | 'left-right'
  | 'right-left'
  | 'main-left'
  | 'main-right'
  | 'top-bottom'
  | 'left'
  | 'right'
  | 'full';

export function parseLayoutRatio(input?: string, fallback = 0.6): number {
  if (!input) return fallback;
  const pct = input.endsWith('%') ? parseFloat(input) / 100 : parseFloat(input);
  if (!Number.isFinite(pct) || pct <= 0.1 || pct >= 0.9) return fallback;
  return pct;
}

export function defaultWorkArea(): WorkArea {
  return {
    left: 0,
    top: 0,
    width: typeof screen !== 'undefined' ? screen.availWidth : 1440,
    height: typeof screen !== 'undefined' ? screen.availHeight : 900,
  };
}

/** Compute window rectangles for a layout preset (2-window focus by default). */
export function computeWindowRects(
  preset: LayoutPreset,
  work: WorkArea,
  ratio = 0.6,
): [WindowRect, WindowRect] {
  const { left, top, width, height } = work;
  const half = Math.floor(width / 2);

  switch (preset) {
    case 'main-left': {
      const mainW = Math.floor(width * ratio);
      return [
        { left, top, width: mainW, height },
        { left: left + mainW, top, width: width - mainW, height },
      ];
    }
    case 'main-right': {
      const sideW = Math.floor(width * (1 - ratio));
      return [
        { left, top, width: sideW, height },
        { left: left + sideW, top, width: width - sideW, height },
      ];
    }
    case 'top-bottom': {
      const halfH = Math.floor(height / 2);
      return [
        { left, top, width, height: halfH },
        { left, top: top + halfH, width, height: height - halfH },
      ];
    }
    case 'right-left':
      return [
        { left: left + half, top, width: half, height },
        { left, top, width: half, height },
      ];
    case 'left':
      return [
        { left, top, width: half, height },
        { left: left + half, top, width: half, height },
      ];
    case 'right':
      return [
        { left: left + half, top, width: half, height },
        { left, top, width: half, height },
      ];
    case 'full':
      return [
        { left, top, width, height },
        { left, top, width, height },
      ];
    case 'side-by-side':
    case 'left-right':
    default:
      return [
        { left, top, width: half, height },
        { left: left + half, top, width: half, height },
      ];
  }
}

export function rectForSlot(
  slot: 'left' | 'right' | 'top' | 'bottom' | 'full',
  work: WorkArea,
  ratio = 0.5,
): WindowRect {
  const [leftRect, rightRect] = computeWindowRects('side-by-side', work, ratio);
  const [topRect, bottomRect] = computeWindowRects('top-bottom', work, ratio);
  if (slot === 'left') return leftRect;
  if (slot === 'right') return rightRect;
  if (slot === 'top') return topRect;
  if (slot === 'bottom') return bottomRect;
  return { left: work.left, top: work.top, width: work.width, height: work.height };
}