import { z } from 'zod';
import type { Rect } from '../box/types.js';
import { XfaLayoutError } from '../errors.js';
import type { ResolvedFont } from '../font/resolve.js';
import type { FontMetrics } from '../font/sfnt.js';
import { measure } from '../font/measure.js';
import { MAX_LINES_PER_TEXT, MAX_TEXT_CHARS } from '../limits.js';
import { blockTop, glyphIssue, regionSchema, reportJustification } from './block.js';
import { FALLBACK_FONT_ID, textStyleSchema, type LaidOutLine, type LaidOutText, type TextStyle } from './types.js';
import { breakParagraph, FIT_EPSILON_PT, normalizeLineBreaks, withoutTrailingSpaces } from './wrap.js';

/** What the line layout needs from its surroundings: the font behind a typeface, and where to report a fallback. */
export interface TextDeps {
  readonly resolveFont: (style: TextStyle) => ResolvedFont;
  /** `feature` is a layout `issues` entry for the node that owns the text; the caller dedupes. */
  readonly report: (feature: string) => void;
}

export interface LayoutTextInput {
  readonly text: string;
  readonly style: TextStyle;
  /** The region the text fills, in the local frame of the owning box (the draw's inner rectangle). */
  readonly region: Rect;
  /** Wrap at spaces to the region width (draws, captions, `multiLine` fields); false keeps one line per line feed. */
  readonly wrap: boolean;
}

const inputSchema = z.strictObject({ text: z.string(), style: textStyleSchema, region: regionSchema, wrap: z.boolean() });

/** The vertical metrics of a font at a size, in points: what plain and rich text both lay lines out with (PA-3). */
export interface VerticalMetrics {
  readonly ascentPt: number;
  readonly descentPt: number;
  readonly lineGapPt: number;
  /** ascent + descent + line gap: the font's own line pitch (1.2 em for every embedded Adobe face). */
  readonly naturalPitchPt: number;
}

export function verticalMetricsOf(metrics: FontMetrics, sizePt: number): VerticalMetrics {
  const scale = (units: number): number => (units * sizePt) / metrics.unitsPerEm;
  return { ascentPt: scale(metrics.ascent), descentPt: scale(metrics.descent), lineGapPt: scale(metrics.lineGap), naturalPitchPt: scale(metrics.ascent + metrics.descent + metrics.lineGap) };
}

/**
 * Lays out a block of plain text as lines with baselines, exactly as Acrobat does on the two government forms (PA-3):
 * - advances are the font's `hmtx` x size, no kerning; leading and trailing spaces count in a line's width;
 * - the line pitch is (ascender + descender + lineGap) x size, or the explicit `lineHeight` when that is larger;
 * - the first baseline is the top of the block plus the ascender x size, and the block is
 *   (lines - 1) x pitch + (ascender + descender) x size, placed by `vAlign` in the region;
 * - lines wrap at spaces; the spaces after the last word hang past the right edge and stay in the line's text, but a
 *   wrapped line is aligned by the width without them (the oracle's right-aligned two-line title shows it).
 *
 * Origin (PA-4): the break rule is a semantic port of pdf.js v4.10.38 (Apache-2.0) `src/core/xfa/text.js` `TextMeasure.compute`
 * (see `wrap.ts`); the block height `(n - 1) x pitch + (asc + desc) x size` is what pdf.js computes as one `firstLineHeight`
 * (`max(1, lineHeight - lineGap) x size`) plus `n - 1` line heights. Where pdf.js disagrees with the renderCache oracle the
 * oracle wins: pdf.js lets an explicit `lineHeight` replace the natural pitch even when smaller (here the larger of the
 * two is used, as the oracle shows for 8 pt on 7 pt text), and widens every measured width by `WIDTH_FACTOR = 1.02`
 * (here the width is exact). pdf.js floors the pitch at 1.2 em; here it is the font's own hhea sum, which the oracle
 * shows is exactly 1.2 em for every embedded face, so the two agree on the corpus.
 *
 * Overflow is kept and flagged, never clipped. `hAlign` justify, justifyAll and radix are laid out as left and reported;
 * an explicit `lineHeight` below the natural one that changes where the block sits is reported (card W01-T05).
 */
export function layoutText(input: LayoutTextInput, deps: TextDeps): LaidOutText {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new XfaLayoutError('INVALID_ARGUMENT', `layoutText: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const { style, region, wrap } = parsed.data;
  let text = normalizeLineBreaks(parsed.data.text);
  if (text.length > MAX_TEXT_CHARS) {
    deps.report(`text longer than ${MAX_TEXT_CHARS} characters (cut)`);
    text = text.slice(0, MAX_TEXT_CHARS);
  }
  const empty: LaidOutText = { region, lines: [], extent: { widthPt: 0, heightPt: 0 }, overflow: { horizontal: false, vertical: false } };
  if (text === '') return empty;

  const font = deps.resolveFont(style);
  const metrics = font.metrics;
  const { ascentPt, descentPt, lineGapPt, naturalPitchPt } = verticalMetricsOf(metrics, style.sizePt);
  const missing = new Set<number>();
  const widthOf = (s: string): number => {
    const m = measure(s, metrics, style.sizePt, style.letterSpacingPt);
    for (const codePoint of m.missing) missing.add(codePoint);
    return m.widthPt;
  };

  const base = Math.max(0, region.widthPt - style.marginLeftPt - style.marginRightPt);
  const firstRoom = Math.max(0, base - style.textIndentPt);
  const paragraphs = text.split('\n');
  const pieces: { readonly text: string; readonly wrapped: boolean }[] = [];
  let cut = false;
  for (const [index, paragraph] of paragraphs.entries()) {
    if (pieces.length >= MAX_LINES_PER_TEXT) {
      cut = true;
      break;
    }
    const room = index === 0 ? firstRoom : base;
    const broken = breakParagraph(paragraph, widthOf, wrap ? room : Number.POSITIVE_INFINITY, wrap ? base : Number.POSITIVE_INFINITY, wrap, MAX_LINES_PER_TEXT - pieces.length);
    broken.lines.forEach((text, at) => pieces.push({ text, wrapped: at < broken.lines.length - 1 }));
    cut ||= broken.truncated;
  }
  if (cut) deps.report(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
  const lineTexts = pieces.slice(0, MAX_LINES_PER_TEXT);

  const pitchPt = Math.max(naturalPitchPt, style.lineHeightPt);
  const blockPt = style.spaceAbovePt + (lineTexts.length - 1) * pitchPt + ascentPt + descentPt + style.spaceBelowPt;
  const top = blockTop({ vAlign: style.vAlign, lineHeightPt: style.lineHeightPt, blockPt, last: { naturalPitchPt, ascentPt, descentPt, lineGapPt }, region }, deps.report);

  let widest = 0;
  const lines: LaidOutLine[] = lineTexts.map(({ text: lineText, wrapped: wrappedHere }, index) => {
    const widthPt = widthOf(lineText);
    const fitWidthPt = lineText.endsWith(' ') ? widthOf(withoutTrailingSpaces(lineText)) : widthPt;
    widest = Math.max(widest, fitWidthPt);
    const start = region.xPt + style.marginLeftPt + (index === 0 ? style.textIndentPt : 0);
    const room = index === 0 ? firstRoom : base;
    const spare = Math.max(0, room - (wrappedHere ? fitWidthPt : widthPt));
    const xPt = style.hAlign === 'center' ? start + spare / 2 : style.hAlign === 'right' ? start + spare : start;
    const run = {
      text: lineText,
      fontId: font.fontId ?? FALLBACK_FONT_ID,
      sizePt: style.sizePt,
      colour: style.colour,
      ...(style.letterSpacingPt === 0 ? {} : { letterSpacingPt: style.letterSpacingPt }),
    };
    return { xPt, yBaselinePt: top + style.spaceAbovePt + ascentPt + index * pitchPt - style.baselineShiftPt, widthPt, fitWidthPt, runs: [run] };
  });

  for (const codePoint of missing) deps.report(glyphIssue(codePoint));
  reportJustification(style.hAlign, lines.length, deps.report);
  return {
    region,
    lines,
    extent: { widthPt: widest, heightPt: blockPt },
    overflow: { horizontal: widest > base + FIT_EPSILON_PT, vertical: blockPt > region.heightPt + FIT_EPSILON_PT },
  };
}
