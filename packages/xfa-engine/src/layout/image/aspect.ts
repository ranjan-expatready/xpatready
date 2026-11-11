import { z } from 'zod';
import type { Rect } from '../box/types.js';

/** The `image` `aspect` values of XFA 3.3, in the render tree's own enumeration. */
export const aspectSchema = z.enum(['fit', 'actual', 'height', 'none', 'width']);
export type Aspect = z.infer<typeof aspectSchema>;

export type HorizontalPlacement = 'left' | 'center' | 'right';
export type VerticalPlacement = 'top' | 'middle' | 'bottom';

/** The picture's own size in points, from its pixels and resolution. */
export interface NaturalSize {
  readonly widthPt: number;
  readonly heightPt: number;
}

const PT_PER_INCH = 72;

/** The natural size of `widthPx x heightPx` pixels at the given resolution. */
export const naturalSizeOf = (widthPx: number, heightPx: number, dpiX: number, dpiY: number): NaturalSize => ({
  widthPt: (widthPx * PT_PER_INCH) / dpiX,
  heightPt: (heightPx * PT_PER_INCH) / dpiY,
});

const SHARE_OF_SLACK = { left: 0, top: 0, center: 0.5, middle: 0.5, right: 1, bottom: 1 } as const;

/**
 * Where an image is drawn inside the content `region` of its draw, by `aspect`; the picture never leaves the region:
 * - `fit` (the default): scaled by one factor to the largest size that fits entirely inside the region (CSS `contain`);
 * - `actual`: its own size (`naturalSizeOf`), scaled down by one factor when that would not fit (also `contain`);
 * - `width`, `height`, `none`: stretched to the region, whatever that does to its shape (CSS `object-fit: fill`).
 * A picture smaller than the region sits where the draw's `para` puts it (`hAlign`, `vAlign`; left and top by default).
 *
 * Origin (PA-4): semantic port of pdf.js v4.10.38 (Apache-2.0) `src/core/xfa/template.js` `Image[$toHTML]`, which gives
 * the `img` the class `xfaImage` and, for `height`, `none` and `width`, an inline `object-fit: fill` (the class sets
 * `width` and `height` to 100%, so all three stretch), and nothing for `fit` and `actual`; and of `web/xfa_layer_builder.css`
 * `.xfaImage` (`width: 100%; height: 100%; object-fit: contain; object-position: left top`), which makes `fit` and `actual`
 * a scaled-to-contain picture at the top left. pdf.js's own TODO says `actual` is treated as `fit`; here `actual` keeps the
 * natural size when it fits (the corpus case: 41 x 36 pixels at 96 dpi, 30.75 x 27 pt, equals its 10.848 x 9.525 mm box to
 * a hundredth of a point) and otherwise contains, which is what pdf.js draws. The `para` alignment is NOT pdf.js (it uses
 * left and top): one corpus logo carries `para hAlign="center" vAlign="middle"` (a 0.24 pt shift there), and Adobe's
 * treatment is for the W02-T13 side-by-side. The XFA 3.3 text for `aspect` and image alignment was not read (the
 * specification PDF is unreachable from the session that wrote this), so no page is cited.
 */
export function placeImage(region: Rect, natural: NaturalSize, aspect: Aspect, hAlign: HorizontalPlacement, vAlign: VerticalPlacement): Rect {
  if (aspect === 'width' || aspect === 'height' || aspect === 'none') return region;
  const contain = Math.min(region.widthPt / natural.widthPt, region.heightPt / natural.heightPt);
  const scale = aspect === 'actual' ? Math.min(1, contain) : contain;
  const widthPt = natural.widthPt * scale;
  const heightPt = natural.heightPt * scale;
  return {
    xPt: region.xPt + (region.widthPt - widthPt) * SHARE_OF_SLACK[hAlign],
    yPt: region.yPt + (region.heightPt - heightPt) * SHARE_OF_SLACK[vAlign],
    widthPt,
    heightPt,
  };
}
