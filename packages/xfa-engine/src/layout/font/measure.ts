import { z } from 'zod';
import { XfaLayoutError } from '../errors.js';
import { MAX_TEXT_CHARS } from '../limits.js';
import type { FontMetrics } from './sfnt.js';

/** The size of one run of text in one font, in points. */
export interface TextMeasure {
  /** Sum of the advances of every code point (leading and trailing spaces included) plus the letter spacing. */
  readonly widthPt: number;
  /** `hhea.ascender` at this size: the first baseline sits this far below the top of the line. */
  readonly ascentPt: number;
  /** `-hhea.descender` at this size. */
  readonly descentPt: number;
  readonly lineGapPt: number;
  /** The line pitch: ascent + descent + line gap (1.2 em for every embedded Adobe face; see PA-3). */
  readonly lineHeightPt: number;
  /** Distinct code points the font does not map, in order of first appearance; each was measured with the `.notdef` advance. */
  readonly missing: readonly number[];
}

const argsSchema = z.object({
  text: z.string().max(MAX_TEXT_CHARS),
  sizePt: z.number().finite().gt(0),
  letterSpacingPt: z.number().finite(),
});

/**
 * Measures `text` in `font` at `sizePt`, deterministically: the advances are summed in whole design units and scaled by a
 * single multiplication and division, so the result is the same number in Node and in a browser worker. No kerning
 * and no shaping (Acrobat applies none; PA-3), and no canvas. The text is one run: line breaking is the caller's, and
 * a tab or line feed is measured as an ordinary (usually unmapped) character. `letterSpacingPt` is added after every code
 * point, the last included. The caller turns each entry of `missing` into a `glyph.U+XXXX` layout issue.
 */
export function measure(text: string, font: FontMetrics, sizePt: number, letterSpacingPt = 0): TextMeasure {
  const checked = argsSchema.safeParse({ text, sizePt, letterSpacingPt });
  if (!checked.success) throw new XfaLayoutError('INVALID_ARGUMENT', `measure: ${checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  let units = 0;
  let count = 0;
  const missing = new Set<number>();
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    const advance = font.advance(codePoint);
    if (advance === undefined) {
      missing.add(codePoint);
      units += font.notdefAdvance;
    } else {
      units += advance;
    }
    count += 1;
  }
  const scale = (designUnits: number): number => (designUnits * sizePt) / font.unitsPerEm;
  const widthPt = scale(units) + letterSpacingPt * count;
  const lineHeightPt = scale(font.ascent + font.descent + font.lineGap);
  if (!Number.isFinite(widthPt) || !Number.isFinite(lineHeightPt)) throw new XfaLayoutError('INVALID_ARGUMENT', 'measure: the result is not a finite length');
  return { widthPt, ascentPt: scale(font.ascent), descentPt: scale(font.descent), lineGapPt: scale(font.lineGap), lineHeightPt, missing: [...missing] };
}
