import type { ResolvedFont } from '../../../font/resolve.js';
import type { TextDeps } from '../../layout.js';
import { FIXED_METRICS, regionOf, styled } from '../../__tests__/helpers.js';
import { layoutRich } from '../layout.js';
import type { EmbedResolver } from '../types.js';

export { regionOf, styled };

export const BODY_OPEN = '<body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/">';
/** Wraps paragraphs in a body, as the template stores them. */
export const body = (inner: string): string => `${BODY_OPEN}${inner}</body>`;

/**
 * Deps over the synthetic font (character 5 pt, space 2.5 pt at 10 pt; ascent 7.5, descent 2.5, pitch 12) where the font id
 * names the weight and posture, so a test can see which style a run was drawn in.
 */
export function styleDeps(reports: string[] = []): TextDeps {
  return {
    resolveFont: (style): ResolvedFont => ({ fontId: `f:${style.weight}:${style.posture}`, face: undefined, metrics: FIXED_METRICS }),
    report: (feature) => void reports.push(feature),
  };
}

/** Lays out `inner` paragraphs at 10 pt in a 200 x 100 region unless told otherwise. */
export function rich(inner: string, over: Parameters<typeof styled>[0] = {}, region = regionOf(200, 100), embed?: EmbedResolver, tabIntervalPt?: number): { out: ReturnType<typeof layoutRich>; reports: string[] } {
  const reports: string[] = [];
  const out = layoutRich({ markup: body(inner), style: styled(over), region, wrap: true, ...(tabIntervalPt === undefined ? {} : { tabIntervalPt }) }, styleDeps(reports), embed);
  return { out, reports };
}

/** Every line as its runs: `fontId:text`. */
export const runsOf = (out: ReturnType<typeof layoutRich>): string[][] => out.lines.map((line) => line.runs.map((run) => `${run.fontId.slice(2)}|${run.text}`));
export const textsOf = (out: ReturnType<typeof layoutRich>): string[] => out.lines.map((line) => line.runs.map((run) => run.text).join(''));
