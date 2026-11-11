import { z } from 'zod';
import type { VAlign } from './types.js';

/**
 * What plain text (`layout.ts`) and rich text (`rich/layout.ts`) decide in the same way, written once: the region they are
 * given, where a finished block sits in it, and what each reports when it lays text out as left.
 */

/** A text region: finite, with a size that is never negative. */
export const regionSchema = z.strictObject({
  xPt: z.number().finite(),
  yPt: z.number().finite(),
  widthPt: z.number().finite().min(0),
  heightPt: z.number().finite().min(0),
});

/**
 * FD-38 exemption (correctness constant): the tolerance, in points, for calling an explicit `lineHeight` smaller than the
 * font's natural one: a millipoint, the resolution of the renderCache oracle. It is not a setting. It is not `FIT_EPSILON_PT`
 * (0.01 pt, a fit tolerance): see the note at the top of `box/limits.ts`.
 */
export const LINE_HEIGHT_EPSILON_PT = 0.001;

const hex = (codePoint: number): string => codePoint.toString(16).toUpperCase().padStart(4, '0');

/** The `glyph.U+XXXX` layout issue of a code point no font maps. */
export const glyphIssue = (codePoint: number): string => `glyph.U+${hex(codePoint)}`;

/** The last line of a block, as the placement rule needs it: the font metrics of its tallest run, in points. */
export interface LastLine {
  /** The font's own line pitch (ascent + descent + line gap) at the size of the line. */
  readonly naturalPitchPt: number;
  readonly ascentPt: number;
  readonly descentPt: number;
  readonly lineGapPt: number;
}

export interface BlockPlacement {
  readonly vAlign: VAlign;
  /** The explicit `para lineHeight`; 0 means the font's own. */
  readonly lineHeightPt: number;
  /** The height of the whole block, `spaceAbove` / `spaceBelow` included. */
  readonly blockPt: number;
  /** The last line of the block; absent when there is none (nothing is then shrunk). */
  readonly last: LastLine | undefined;
  readonly region: { readonly yPt: number; readonly heightPt: number };
}

/**
 * The y of the top of a block of text in its region, by `vAlign`.
 *
 * An explicit lineHeight below the natural one leaves the pitch, the extent and the overflow alone but shrinks the last
 * line of the block that vAlign middle or bottom places to lineHeight - lineGap (less than ascent + descent exactly when
 * lineHeight is below the natural pitch). Fitted to the 11 renderCache draws that show it (two sizes, middle-aligned,
 * single line); not confirmed for bottom alignment or several lines, so it is reported. Top alignment is not moved by it.
 */
export function blockTop(placement: BlockPlacement, report: (feature: string) => void): number {
  const { vAlign, lineHeightPt, blockPt, last, region } = placement;
  const shrunk = last !== undefined && lineHeightPt > 0 && lineHeightPt < last.naturalPitchPt - LINE_HEIGHT_EPSILON_PT;
  const moved = shrunk && vAlign !== 'top';
  const placedPt = moved ? blockPt - (last.ascentPt + last.descentPt) + Math.max(0, lineHeightPt - last.lineGapPt) : blockPt;
  if (moved) {
    report(`lineHeight ${lineHeightPt}pt is below the natural ${last.naturalPitchPt}pt: text block placed by lineHeight minus line gap (fitted to 11 renderCache draws, unverified for other cases)`);
  }
  if (vAlign === 'top') return region.yPt;
  return vAlign === 'middle' ? region.yPt + (region.heightPt - placedPt) / 2 : region.yPt + region.heightPt - placedPt;
}

/** Reports a `justify` (of more than one line), `justifyAll` or `radix` paragraph, which is laid out as left. */
export function reportJustification(hAlign: string, lines: number, report: (feature: string) => void): void {
  if (hAlign === 'justifyAll' || hAlign === 'radix' || (hAlign === 'justify' && lines > 1)) report(`hAlign="${hAlign}" (laid out as left)`);
}
