import { describe, expect, it } from 'vitest';
import { naturalSizeOf, placeImage, type Aspect } from '../aspect.js';

const region = { xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 };
const place = (natural: [number, number], aspect: Aspect, h: 'left' | 'center' | 'right' = 'left', v: 'top' | 'middle' | 'bottom' = 'top') =>
  placeImage(region, { widthPt: natural[0], heightPt: natural[1] }, aspect, h, v);

describe('naturalSizeOf: pixels and resolution to points', () => {
  it('is pixels x 72 / dpi on each axis', () => {
    expect(naturalSizeOf(96, 48, 96, 96)).toEqual({ widthPt: 72, heightPt: 36 });
    expect(naturalSizeOf(300, 300, 300, 150)).toEqual({ widthPt: 72, heightPt: 144 });
  });
});

describe('placeImage: the five aspect values (pdf.js: stretch for width/height/none, contain for fit and actual)', () => {
  it('fit scales by one factor to the largest size that fits, even upward, and leaves the slack on the right or below', () => {
    expect(place([50, 50], 'fit')).toEqual({ xPt: 10, yPt: 20, widthPt: 50, heightPt: 50 });
    expect(place([400, 100], 'fit')).toEqual({ xPt: 10, yPt: 20, widthPt: 100, heightPt: 25 });
    expect(place([10, 5], 'fit')).toEqual({ xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 });
  });

  it('the picture is placed inside the box by hAlign and vAlign: the slack is shared 0, 1/2 or 1', () => {
    expect(place([50, 50], 'fit', 'center', 'middle')).toEqual({ xPt: 35, yPt: 20, widthPt: 50, heightPt: 50 });
    expect(place([50, 50], 'fit', 'right', 'bottom')).toEqual({ xPt: 60, yPt: 20, widthPt: 50, heightPt: 50 });
    expect(place([100, 20], 'fit', 'left', 'middle')).toEqual({ xPt: 10, yPt: 35, widthPt: 100, heightPt: 20 });
    expect(place([100, 20], 'fit', 'left', 'bottom')).toEqual({ xPt: 10, yPt: 50, widthPt: 100, heightPt: 20 });
    expect(place([40, 30], 'actual', 'center', 'middle')).toEqual({ xPt: 40, yPt: 30, widthPt: 40, heightPt: 30 });
  });

  it('actual keeps the natural size, and a picture larger than the box is scaled by one factor to fit inside it (never outside, never clipped)', () => {
    expect(place([40, 30], 'actual')).toEqual({ xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 });
    expect(place([100, 50], 'actual')).toEqual({ xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 });
    expect(place([200, 100], 'actual')).toEqual({ xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 });
    expect(place([100, 100], 'actual', 'center', 'middle')).toEqual({ xPt: 35, yPt: 20, widthPt: 50, heightPt: 50 });
    expect(place([400, 100], 'actual', 'right', 'bottom')).toEqual({ xPt: 10, yPt: 45, widthPt: 100, heightPt: 25 });
  });

  it('width, height and none stretch to the box, whatever the picture shape, and the alignment has nothing to move', () => {
    for (const aspect of ['width', 'height', 'none'] as const) {
      expect(place([50, 25], aspect)).toEqual(region);
      expect(place([7, 300], aspect, 'right', 'bottom')).toEqual(region);
      expect(place([1000, 1], aspect, 'center', 'middle')).toEqual(region);
    }
  });

  it('never leaves the box, for any aspect, alignment or shape (a sweep of 5 x 9 x 6 cases)', () => {
    const shapes: [number, number][] = [[1, 1], [10, 500], [500, 10], [100, 50], [0.5, 0.2], [3000, 3000]];
    for (const aspect of ['fit', 'actual', 'width', 'height', 'none'] as const) {
      for (const h of ['left', 'center', 'right'] as const) {
        for (const v of ['top', 'middle', 'bottom'] as const) {
          for (const shape of shapes) {
            const r = place(shape, aspect, h, v);
            expect(r.xPt).toBeGreaterThanOrEqual(region.xPt - 1e-9);
            expect(r.yPt).toBeGreaterThanOrEqual(region.yPt - 1e-9);
            expect(r.xPt + r.widthPt).toBeLessThanOrEqual(region.xPt + region.widthPt + 1e-9);
            expect(r.yPt + r.heightPt).toBeLessThanOrEqual(region.yPt + region.heightPt + 1e-9);
          }
        }
      }
    }
  });
});
