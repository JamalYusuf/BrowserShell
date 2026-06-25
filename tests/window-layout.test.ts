import { describe, expect, it } from 'vitest';
import {
  computeWindowRects,
  defaultWorkArea,
  parseLayoutRatio,
  rectForSlot,
} from '@/shared/window-layout';

describe('window-layout', () => {
  const work = { left: 100, top: 50, width: 1200, height: 800 };

  it('parses layout ratios', () => {
    expect(parseLayoutRatio('60%')).toBeCloseTo(0.6);
    expect(parseLayoutRatio('0.7')).toBeCloseTo(0.7);
    expect(parseLayoutRatio('bad')).toBe(0.6);
    expect(parseLayoutRatio(undefined, 0.55)).toBe(0.55);
  });

  it('computes side-by-side rectangles', () => {
    const [left, right] = computeWindowRects('side-by-side', work);
    expect(left).toEqual({ left: 100, top: 50, width: 600, height: 800 });
    expect(right).toEqual({ left: 700, top: 50, width: 600, height: 800 });
  });

  it('computes main-left with ratio', () => {
    const [main, side] = computeWindowRects('main-left', work, 0.6);
    expect(main.width).toBe(720);
    expect(side.width).toBe(480);
    expect(main.left).toBe(100);
    expect(side.left).toBe(820);
  });

  it('computes top-bottom rectangles', () => {
    const [top, bottom] = computeWindowRects('top-bottom', work);
    expect(top.height).toBe(400);
    expect(bottom.top).toBe(450);
    expect(bottom.height).toBe(400);
  });

  it('returns slot rectangles', () => {
    expect(rectForSlot('left', work).width).toBe(600);
    expect(rectForSlot('full', work)).toEqual(work);
  });

  it('default work area has sensible dimensions', () => {
    const area = defaultWorkArea();
    expect(area.width).toBeGreaterThan(0);
    expect(area.height).toBeGreaterThan(0);
  });
});