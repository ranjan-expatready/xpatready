import { describe, expect, it } from 'vitest';
import { FIXED_METRICS } from '../../__tests__/helpers.js';
import { XfaPdfError } from '../../../../pdf/errors.js';
import { MAX_LINES_PER_TEXT, MAX_RUNS_PER_LINE, MAX_TEXT_CHARS } from '../../../limits.js';
import { itemSchema } from '../../../render-tree.js';
import type { TextDeps } from '../../layout.js';
import { layoutRich } from '../layout.js';
import { MAX_RICH_MARKUP_CHARS } from '../limits.js';
import { body, regionOf, styled } from './helpers.js';

/** Counts the advance lookups the font is asked for: the work bound is by counts, not by the clock. */
function countingDeps(): { deps: TextDeps; advances: () => number; fonts: () => number } {
  let advances = 0;
  let fonts = 0;
  const metrics = { ...FIXED_METRICS, advance: (codePoint: number) => (advances += 1, FIXED_METRICS.advance(codePoint)) };
  return {
    deps: {
      resolveFont: (style) => (fonts += 1, { fontId: `f:${style.weight}:${style.posture}`, face: undefined, metrics }),
      report: () => undefined,
    },
    advances: () => advances,
    fonts: () => fonts,
  };
}

const WORDS = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu';
const sentence = (length: number): string => {
  let out = '';
  while (out.length < length) out += `${WORDS} `;
  return out.slice(0, length);
};
const timed = <T>(label: string, run: () => T): T => {
  const start = performance.now();
  const result = run();
  console.info(`[rich-text] ${label}: ${(performance.now() - start).toFixed(1)} ms (measured, not asserted)`);
  return result;
};
const run = (markup: string, deps: TextDeps, reports: string[] = []): ReturnType<typeof layoutRich> =>
  layoutRich({ markup, style: styled(), region: regionOf(200, 100), wrap: true }, { ...deps, report: (f) => void reports.push(f) });

describe('hostile rich text stays bounded (A4)', () => {
  it('the longest real block (2.5 k characters over three styles) lays out within the render-tree caps', () => {
    const { deps, advances } = countingDeps();
    const markup = body(`<p>${sentence(900)}<span style="font-weight:bold">${sentence(800)}</span><span style="font-style:italic">${sentence(800)}</span></p>`);
    const out = timed('2.5 k-character block', () => run(markup, deps));
    expect(out.lines.length).toBeGreaterThan(10);
    expect(out.lines.length).toBeLessThanOrEqual(MAX_LINES_PER_TEXT);
    expect(advances()).toBeLessThanOrEqual(3 * 128);
    expect(() => out.lines.forEach((line) => itemSchema.parse({ kind: 'text', rect: out.region, lines: [{ xPt: line.xPt, yBaselinePt: line.yBaselinePt, runs: line.runs.map((r) => ({ ...r })) }] }))).not.toThrow();
  });

  it('a 1 MB block of text is cut at the character ceiling and the line ceiling, reported, and valid in the render tree', () => {
    const { deps, advances, fonts } = countingDeps();
    const reports: string[] = [];
    const markup = body(`<p>${sentence(1_000_000)}</p>`);
    expect(markup.length).toBeGreaterThan(1_000_000);
    const out = timed('1 MB text block', () => run(markup, deps, reports));
    expect(out.lines).toHaveLength(MAX_LINES_PER_TEXT);
    expect(reports).toContain(`text longer than ${MAX_TEXT_CHARS} characters (cut)`);
    expect(reports).toContain(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
    // Work is bounded by counts: one font per style and one advance per distinct character, however long the text.
    expect(fonts()).toBe(1);
    expect(advances()).toBeLessThanOrEqual(128);
    const item = { kind: 'text' as const, rect: out.region, lines: out.lines.map((l) => ({ xPt: l.xPt, yBaselinePt: l.yBaselinePt, runs: l.runs.map((r) => ({ ...r })) })) };
    expect(() => itemSchema.parse(item)).not.toThrow();
  });

  it('a 1 MB block of many small spans in alternating styles is bounded the same way', () => {
    const { deps, advances, fonts } = countingDeps();
    const span = (i: number): string => `<span style="font-weight:${i % 2 === 0 ? 'bold' : 'normal'}">ab </span>`;
    let spans = '';
    for (let i = 0; spans.length < 1_000_000; i += 1) spans += span(i);
    const out = timed('1 MB of alternating spans', () => run(body(`<p>${spans}</p>`), deps));
    expect(out.lines.length).toBeLessThanOrEqual(MAX_LINES_PER_TEXT);
    expect(out.lines.reduce((sum, line) => sum + line.runs.reduce((n, r) => n + r.text.length, 0), 0)).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(fonts()).toBe(2);
    expect(advances()).toBeLessThanOrEqual(2 * 128);
    for (const line of out.lines) expect(line.runs.length).toBeLessThanOrEqual(500);
  });

  it('a 1 MB block of paragraphs is cut at the line ceiling', () => {
    const { deps } = countingDeps();
    const reports: string[] = [];
    const out = timed('1 MB of paragraphs', () => run(body('<p>a</p>'.repeat(130_000)), deps, reports));
    expect(out.lines.length).toBeLessThanOrEqual(MAX_LINES_PER_TEXT);
    expect(reports).toContain(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
  });

  it('markup over the markup ceiling, nesting over the parser\'s depth ceiling and an element flood fail with a typed error', () => {
    const { deps } = countingDeps();
    expect(() => run(body(`<p>${'x'.repeat(MAX_RICH_MARKUP_CHARS)}</p>`), deps)).toThrow(/at most/);
    expect(() => run(body(`${'<span>'.repeat(300)}x${'</span>'.repeat(300)}`), deps)).toThrow(XfaPdfError);
    expect(() => run(body(`<p>${'<span/>'.repeat(250_000)}</p>`), deps)).toThrow(XfaPdfError);
  });

  it('a tab flood cannot push a text item past MAX_LINES_PER_TEXT: a tab starts a render line, so the cut counts emitted lines (one tab per paragraph, then tabs in one line)', () => {
    const { deps } = countingDeps();
    const reports: string[] = [];
    const out = run(body('<p style="margin-left:5pt"><span style="xfa-tab-count:1">x</span>a</p>'.repeat(1001)), deps, reports);
    expect(out.lines.length).toBeLessThanOrEqual(MAX_LINES_PER_TEXT);
    expect(out.lines).toHaveLength(MAX_LINES_PER_TEXT);
    expect(reports).toContain(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
    expect(() => itemSchema.parse({ kind: 'text', rect: out.region, lines: out.lines.map((l) => ({ xPt: l.xPt, yBaselinePt: l.yBaselinePt, runs: l.runs.map((r) => ({ ...r })) })) })).not.toThrow();
    // Every 256-tab element adds 256 render lines to one visual line: past the ceiling the block fails typed.
    const flood = `<p>${'<span style="xfa-tab-count:256">x</span>'.repeat(9)}</p>`;
    expect(() => layoutRich({ markup: body(flood), style: styled(), region: regionOf(200_000, 100), wrap: true }, deps)).toThrow(/more than 2000 render lines/);
  });

  it('a line of more runs than a render-tree line may hold is cut at MAX_RUNS_PER_LINE and reported, like the other caps, not thrown', () => {
    const { deps } = countingDeps();
    const reports: string[] = [];
    const spans = Array.from({ length: MAX_RUNS_PER_LINE + 100 }, (_, i) => `<span style="font-weight:${i % 2 === 0 ? 'bold' : 'normal'}">a</span>`).join('');
    const out = layoutRich({ markup: body(`<p>${spans}</p>`), style: styled(), region: regionOf(100_000, 100), wrap: false }, { ...deps, report: (f) => void reports.push(f) });
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0]?.runs).toHaveLength(MAX_RUNS_PER_LINE);
    expect(reports).toContain(`rich text line has more than ${MAX_RUNS_PER_LINE} runs (cut)`);
    expect(out.lines[0]?.widthPt).toBeGreaterThan(0);
    expect(() => itemSchema.parse({ kind: 'text', rect: out.region, lines: out.lines.map((l) => ({ xPt: l.xPt, yBaselinePt: l.yBaselinePt, runs: l.runs.map((r) => ({ ...r })) })) })).not.toThrow();
  });

  it('a style flood on one element and a tab flood are bounded', () => {
    const { deps } = countingDeps();
    const reports: string[] = [];
    const out = run(body(`<p><span style="xfa-tab-count:256">x</span><span style="${'a:b;'.repeat(5000)}">y</span></p>`), deps, reports);
    expect(out.lines.reduce((sum, line) => sum + line.runs.length, 0)).toBeLessThanOrEqual(260);
    expect(reports.some((r) => r.includes('style longer than'))).toBe(true);
  });
});
