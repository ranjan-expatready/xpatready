import { measure } from '../../font/measure.js';
import type { ResolvedFont } from '../../font/resolve.js';
import { verticalMetricsOf, type TextDeps } from '../layout.js';
import { FALLBACK_FONT_ID, type TextStyle } from '../types.js';
import type { CharStyle } from './types.js';

/** What the layout needs to know about one cascaded style: its font, its vertical metrics and a memoised advance per code point. */
export interface StyleInfo {
  readonly style: CharStyle;
  readonly font: ResolvedFont;
  readonly fontId: string;
  /** Two styles with the same key draw identically (same font program, size, letter spacing and colour), so their text is one run. */
  readonly runKey: string;
  readonly ascentPt: number;
  readonly descentPt: number;
  readonly lineGapPt: number;
  /** ascent + descent + line gap: the font's own line pitch. */
  readonly pitchPt: number;
  /** The advance of one code point in points, letter spacing included; a code point the font lacks takes the `.notdef` advance and is noted in `missing`. */
  advance(codePoint: number): number;
}

/**
 * The style information of every cascaded style of a document, resolved through `deps.resolveFont` (so a missing
 * typeface is reported once, by the font resolver). `missing` collects the code points no font maps; the caller reports them.
 */
export function styleInfos(styles: readonly CharStyle[], owner: TextStyle, deps: TextDeps, missing: Set<number>): StyleInfo[] {
  return styles.map((style) => {
    const resolved = deps.resolveFont({
      ...owner,
      ...(style.typeface === undefined ? {} : { typeface: style.typeface }),
      weight: style.weight,
      posture: style.posture,
      sizePt: style.sizePt,
      letterSpacingPt: style.letterSpacingPt,
      colour: style.colour,
    });
    const metrics = resolved.metrics;
    const vertical = verticalMetricsOf(metrics, style.sizePt);
    const memo = new Map<number, number>();
    const fontId = resolved.fontId ?? FALLBACK_FONT_ID;
    return {
      style,
      font: resolved,
      fontId,
      runKey: `${fontId}\u0000${style.sizePt}\u0000${style.letterSpacingPt}\u0000${style.colour.join(',')}`,
      ascentPt: vertical.ascentPt,
      descentPt: vertical.descentPt,
      lineGapPt: vertical.lineGapPt,
      pitchPt: vertical.naturalPitchPt,
      advance(codePoint: number): number {
        let found = memo.get(codePoint);
        if (found === undefined) {
          const m = measure(String.fromCodePoint(codePoint), metrics, style.sizePt, style.letterSpacingPt);
          for (const code of m.missing) missing.add(code);
          found = m.widthPt;
          memo.set(codePoint, found);
        }
        return found;
      },
    };
  });
}
