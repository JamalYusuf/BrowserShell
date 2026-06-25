import { describe, expect, it } from 'vitest';
import { computeMarkerPosition } from '@/content/vimium/marker-placement';

describe('computeMarkerPosition', () => {
  it('places marker below links near the top of the page', () => {
    const pos = computeMarkerPosition(new DOMRect(40, 20, 120, 24), 52);
    expect(pos.top).toBeGreaterThan(44);
  });

  it('avoids the bottom status bar zone', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { value: vh, configurable: true });
    const rect = new DOMRect(40, vh - 100, 120, 24);
    const pos = computeMarkerPosition(rect, 52);
    expect(pos.top).toBeLessThan(vh - 52 - 20);
  });
});