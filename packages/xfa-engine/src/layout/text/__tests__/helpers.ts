import type { FormNode } from '../../../model/form/index.js';
import type { FontMetrics } from '../../font/sfnt.js';
import type { ResolvedFont } from '../../font/resolve.js';
import { createTextContext, type TextContext } from '../context.js';
import type { TextDeps } from '../layout.js';
import { DEFAULT_TEXT_STYLE } from '../style.js';
import type { TextStyle } from '../types.js';
import { build, find, rect } from '../../box/__tests__/helpers.js';

export { build, find, rect };

/**
 * A synthetic font with round numbers: every printable ASCII character advances 500/1000 em (a space 250), ascender 750,
 * descender 250, line gap 200, so at 10 pt a character is 5 pt, a space 2.5 pt, ascent 7.5, descent 2.5, natural pitch 12.
 * Characters above U+007E are not mapped.
 */
export const FIXED_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascent: 750,
  descent: 250,
  lineGap: 200,
  glyphCount: 100,
  notdefAdvance: 500,
  weightClass: undefined,
  macBold: false,
  macItalic: false,
  advance: (codePoint) => (codePoint === 0x20 ? 250 : codePoint > 0x20 && codePoint < 0x7f ? 500 : undefined),
};

export const FIXED_FONT: ResolvedFont = { fontId: 'font:Fixed', face: undefined, metrics: FIXED_METRICS };

/** Text dependencies over the synthetic font, collecting what is reported. */
export function fixedDeps(reports: string[] = []): TextDeps {
  return { resolveFont: () => FIXED_FONT, report: (feature) => void reports.push(feature) };
}

/** The default style at 10 pt with overrides. */
export const styled = (over: Partial<TextStyle> = {}): TextStyle => ({ ...DEFAULT_TEXT_STYLE, ...over });

/** A region at the origin, 100 x 50 pt unless given. */
export const regionOf = (widthPt = 100, heightPt = 50, xPt = 0, yPt = 0): ReturnType<typeof rect> => rect(xPt, yPt, widthPt, heightPt);

/** A text context with no embedded fonts: every typeface takes the fixed-pitch Courier fallback (6 pt per character at 10 pt). */
export const emptyTextContext = (): TextContext => createTextContext([], []);

/** The draw / field of a synthetic template body. */
export const nodeOf = (body: string, className: string, name: string): FormNode => find(build(body).dom, className, name);
