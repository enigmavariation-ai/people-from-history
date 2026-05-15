import { describe, it, expect } from 'vitest';

import { getCropBounds } from '@/lib/crop';

describe('getCropBounds', () => {
  it('returns a startSize-sized square at revealPct=10', () => {
    const bounds = getCropBounds({ x: 0.5, y: 0.5 }, 0.2, 10);
    expect(bounds.right - bounds.left).toBeCloseTo(0.2);
    expect(bounds.bottom - bounds.top).toBeCloseTo(0.2);
  });

  it('returns the full image at revealPct=100', () => {
    const bounds = getCropBounds({ x: 0.5, y: 0.5 }, 0.2, 100);
    expect(bounds).toEqual({ left: 0, right: 1, top: 0, bottom: 1 });
  });

  it('grows linearly between revealPct=10 and revealPct=100', () => {
    const start = getCropBounds({ x: 0.5, y: 0.5 }, 0.2, 10);
    const mid = getCropBounds({ x: 0.5, y: 0.5 }, 0.2, 55);
    const end = getCropBounds({ x: 0.5, y: 0.5 }, 0.2, 100);

    const startSize = start.right - start.left;
    const midSize = mid.right - mid.left;
    const endSize = end.right - end.left;

    expect(midSize).toBeCloseTo((startSize + endSize) / 2);
  });

  it('clamps to image boundaries when focal point is near an edge', () => {
    const bounds = getCropBounds({ x: 0.02, y: 0.5 }, 0.2, 10);
    expect(bounds.left).toBe(0);
    expect(bounds.right).toBeCloseTo(0.12);
  });

  it('clamps both axes independently', () => {
    const bounds = getCropBounds({ x: 1, y: 0 }, 0.2, 10);
    expect(bounds.left).toBeCloseTo(0.9);
    expect(bounds.right).toBe(1);
    expect(bounds.top).toBe(0);
    expect(bounds.bottom).toBeCloseTo(0.1);
  });
});
