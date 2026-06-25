const MARKER_EST_W = 28;
const MARKER_EST_H = 20;

export interface MarkerPoint {
  left: number;
  top: number;
}

/** Place hint badge near a link without covering it or the status bar. */
export function computeMarkerPosition(rect: DOMRect, reservedBottom = 0): MarkerPoint {
  let left = rect.left - 3;
  let top = rect.top - MARKER_EST_H + 4;

  // Links near top of page — put marker below the link
  if (rect.top < 64) {
    top = rect.bottom + 3;
  }

  // Avoid bottom status bar / seek bar
  const floor = window.innerHeight - reservedBottom - MARKER_EST_H - 6;
  if (top > floor) {
    top = rect.top - MARKER_EST_H + 2;
  }
  if (top > floor) {
    top = Math.max(6, rect.top + Math.round(rect.height / 2) - MARKER_EST_H / 2);
  }

  // Keep inside viewport horizontally
  if (left + MARKER_EST_W > window.innerWidth - 6) {
    left = rect.right - MARKER_EST_W;
  }
  left = Math.max(6, Math.min(left, window.innerWidth - MARKER_EST_W - 6));
  top = Math.max(6, Math.min(top, window.innerHeight - MARKER_EST_H - 6));

  return { left: Math.round(left), top: Math.round(top) };
}