import { z } from 'zod';
import type { Rect } from '../box/types.js';
import { MAX_FONT_NAME_CHARS } from '../font/limits.js';
import { colourSchema } from '../render-tree.js';

/** The `para hAlign` values of XFA 3.3. `justify`, `justifyAll` and `radix` are laid out as `left` and reported (see `layout.ts`). */
export const hAlignSchema = z.enum(['left', 'center', 'right', 'justify', 'justifyAll', 'radix']);
export type HAlign = z.infer<typeof hAlignSchema>;

export const vAlignSchema = z.enum(['top', 'middle', 'bottom']);
export type VAlign = z.infer<typeof vAlignSchema>;

const finite = z.number().finite();
const nonNegative = finite.min(0);

/**
 * Everything the line layout needs to know about the look of one block of text, in points: the `font` and `para` of the
 * node that owns the text, already read and checked. `typeface` undefined means the XFA default typeface. `lineHeightPt`
 * 0 means the font's own line height. Strict, so a caller that adds a field it expects to matter is told it does not.
 */
export const textStyleSchema = z.strictObject({
  typeface: z.string().max(MAX_FONT_NAME_CHARS).optional(),
  weight: z.enum(['normal', 'bold']),
  posture: z.enum(['normal', 'italic']),
  sizePt: finite.gt(0),
  letterSpacingPt: finite,
  baselineShiftPt: finite,
  colour: colourSchema,
  hAlign: hAlignSchema,
  vAlign: vAlignSchema,
  marginLeftPt: nonNegative,
  marginRightPt: nonNegative,
  textIndentPt: finite,
  spaceAbovePt: nonNegative,
  spaceBelowPt: nonNegative,
  lineHeightPt: nonNegative,
});
export type TextStyle = z.infer<typeof textStyleSchema>;

/** One run of a line: a single font, so a plain-text line has exactly one. */
export interface LaidOutRun {
  /** Hard line end (`\n`) or a wrapped line may end in spaces that hang past the right edge; they are part of `text`. */
  readonly text: string;
  /** The embedded font program's id, or `FALLBACK_FONT_ID` when no program stands behind the typeface (fixed-pitch Courier fallback). */
  readonly fontId: string;
  readonly sizePt: number;
  readonly colour: TextStyle['colour'];
  /** Present only when non-zero. */
  readonly letterSpacingPt?: number;
}

export interface LaidOutLine {
  /** Left end of the line, in the local frame of the box that owns the text (origin at the box's top-left corner). */
  readonly xPt: number;
  /** Baseline, in the same frame, y growing downward. */
  readonly yBaselinePt: number;
  /** Advance width of the whole line, trailing spaces included. */
  readonly widthPt: number;
  /** Advance width without the trailing spaces (the width that had to fit). */
  readonly fitWidthPt: number;
  readonly runs: readonly LaidOutRun[];
}

export interface LaidOutText {
  /** The region the text was laid out in (the draw's inner rectangle: the oracle's `bounds`), in the local frame of the owning box. */
  readonly region: Rect;
  readonly lines: readonly LaidOutLine[];
  /** The widest line (`fitWidthPt`) and the height of the text block (first line top to last line bottom, `spaceAbove`/`spaceBelow` included). */
  readonly extent: { readonly widthPt: number; readonly heightPt: number };
  /** True when a line is wider than the region, or the block is taller than it. The lines are kept; clipping is the drawing's job. */
  readonly overflow: { readonly horizontal: boolean; readonly vertical: boolean };
}

/** The `fontId` of a run whose typeface has no embedded program (the fixed-pitch fallback): no render-tree font resource backs it. */
export const FALLBACK_FONT_ID = 'fallback:Courier';
