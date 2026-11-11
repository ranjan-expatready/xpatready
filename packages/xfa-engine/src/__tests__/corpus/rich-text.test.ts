import { describe, expect, it } from 'vitest';
import { layoutBoxes, type Rect } from '../../layout/box/index.js';
import { readRenderCache } from '../../layout/render-cache.js';
import { FALLBACK_FONT_ID, layoutBoxTexts, layoutOwnTexts, valueTextOf, type BoxText } from '../../layout/text/index.js';
import type { FormNode } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { causesOf, files, MILLIPOINT_PT, linesOf, load, nodesOf, partsOf, placedRuns, positionedBoxes, sameFamily, textContext, type Loaded } from './text-corpus.js';

/**
 * Per known corpus file, counted from the renderCache records alone: the rich `textRun` records (T06) and the plain ones
 * (T05, matched 122 and 125 there), whose sum is the 184 / 209 of the OVERVIEW survey; and the `xfa:embed` spans (9 per form).
 */
const EXPECTED: Readonly<Record<string, { readonly plainRuns: number; readonly richRuns: number; readonly richDraws: number; readonly embeds: number; readonly richBoxes: number; readonly richLines: number; readonly boxes: number; readonly lines: number; readonly issueKinds: Readonly<Record<string, number>>; readonly fallbackLines: number; readonly fallbackRuns: number; readonly oracleFallbackLines: number; readonly oracleFallbackRuns: number; readonly oracleCourierSubstituteRuns: number }>> = {
  'imm1295e.pdf': { plainRuns: 122, richRuns: 62, richDraws: 29, embeds: 9, richBoxes: 49, richLines: 139, boxes: 729, lines: 825, issueKinds: { 'font.Courier New': 1, 'hAlign="justify"': 1 }, fallbackLines: 0, fallbackRuns: 0, oracleFallbackLines: 0, oracleFallbackRuns: 0, oracleCourierSubstituteRuns: 3 },
  'imm5257e.pdf': { plainRuns: 125, richRuns: 84, richDraws: 29, embeds: 9, richBoxes: 62, richLines: 131, boxes: 769, lines: 846, issueKinds: {}, fallbackLines: 0, fallbackRuns: 0, oracleFallbackLines: 0, oracleFallbackRuns: 0, oracleCourierSubstituteRuns: 0 },
};
const SURVEY: Readonly<Record<string, number>> = { 'imm1295e.pdf': 184, 'imm5257e.pdf': 209 };

const FRAME: Rect = { xPt: 0, yPt: 0, widthPt: 0, heightPt: 0 };

/** Draws that carry renderCache records and show exData markup. */
const richDraws = (l: Loaded): FormNode[] => nodesOf(l.dom, 'draw').filter((n) => n.template.renderCache.length > 0 && n.template.firstChild('value')?.firstChild('exData') !== undefined);

describe.each(files)('rich text against the renderCache oracle of %s', (file) => {
  it('every textRun of a rich draw matches our run: text, face, weight, size, colour and position within 1 pt (A3); with T05 all 184 / 209 are accounted for', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const draws = richDraws(loaded);
    let total = 0;
    let matched = 0;
    let worst = 0;
    let fallbackLines = 0;
    let fallbackRuns = 0;
    let substituteRuns = 0;
    const unmatched: string[] = [];
    for (const node of draws) {
      const oracle = readRenderCache(node.template.renderCache).textRuns;
      const { box } = layoutBoxes(node, FRAME);
      const laid = layoutOwnTexts(box, ctx).value;
      const runs = laid === undefined ? [] : placedRuns(laid, loaded);
      for (const line of laid?.lines ?? []) {
        const inFallback = line.runs.filter((run) => run.fontId === FALLBACK_FONT_ID).length;
        fallbackRuns += inFallback;
        if (inFallback > 0) fallbackLines += 1;
      }
      const where = somExpressionOf(node);
      if (runs.length !== oracle.length) unmatched.push(`${where}: ${runs.length} runs, oracle ${oracle.length}`);
      oracle.forEach((want, i) => {
        total += 1;
        const run = runs[i];
        if (run === undefined) return;
        if (/^courier new$/i.test(want.typeface) && !sameFamily(run.family, want.typeface)) substituteRuns += 1;
        const dx = Math.abs(run.xPt - want.xPt);
        const dy = Math.abs(run.baselinePt - want.baselineYPt);
        const causes = causesOf(want, run);
        if (causes.length === 0) {
          matched += 1;
          worst = Math.max(worst, dx, dy);
        } else {
          unmatched.push(`${where} run ${i}: ${causes.join('; ')}`);
        }
      });
    }
    console.info(`[rich-text] ${file}: A3 ${matched}/${total} textRun records of ${draws.length} rich draws matched, worst position deviation ${worst.toFixed(4)} pt; unmatched: ${JSON.stringify(unmatched)}`);
    console.info(`[rich-text] ${file}: fallback font id in the oracle draws: ${fallbackLines} lines, ${fallbackRuns} runs; Courier New runs drawn with another embedded Courier face: ${substituteRuns}`);
    expect(unmatched, 'zero unexplained mismatches').toEqual([]);
    expect(matched).toBe(total);
    const known = EXPECTED[file];
    if (known !== undefined) {
      expect(draws.length).toBe(known.richDraws);
      expect(total).toBe(known.richRuns);
      expect(matched + known.plainRuns, 'combined with T05 every textRun of the survey is accounted for').toBe(SURVEY[file]);
      // IMM1295 names Courier New in the three runs of JavaScriptMessage but embeds only Courier Std: they were the fixed-pitch fallback
      // (2 lines, 3 runs); since SF-5 they take the embedded Courier Std, so a render-tree font resource backs them (same 600/1000 metrics,
      // same positions: worst deviation unchanged at 0.3076 pt). The fallback font id remains only for a document with no Courier face.
      expect({ lines: fallbackLines, runs: fallbackRuns }, 'lines / runs of the oracle draws in the fixed-pitch fallback id (no font resource behind it)').toEqual({ lines: known.oracleFallbackLines, runs: known.oracleFallbackRuns });
      expect(substituteRuns, 'Courier New runs of the oracle drawn with the embedded Courier Std').toBe(known.oracleCourierSubstituteRuns);
    } else {
      expect(total).toBeGreaterThan(0);
    }
  });

  it('the text region of every rich draw with a renderCache is the oracle bounds (inner size, left and top inset)', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    let worst = 0;
    for (const node of richDraws(loaded)) {
      const bounds = readRenderCache(node.template.renderCache).bounds;
      expect(bounds, somExpressionOf(node)).toBeDefined();
      if (bounds === undefined) continue;
      const text = layoutOwnTexts(layoutBoxes(node, FRAME).box, ctx).value;
      expect(text, somExpressionOf(node)).toBeDefined();
      if (text === undefined) continue;
      worst = Math.max(worst, ...[text.region.widthPt - bounds.widthPt, text.region.heightPt - bounds.heightPt, text.region.xPt - bounds.leftInsetPt, text.region.yPt - bounds.topInsetPt].map(Math.abs));
    }
    console.info(`[rich-text] ${file}: text region vs bounds worst deviation ${worst.toExponential(2)} pt`);
    expect(worst).toBeLessThanOrEqual(MILLIPOINT_PT);
  });

  it('every xfa:embed of the form resolves to a field of the template (A2): none is reported missing, and the values they show are recorded', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const embedding = nodesOf(loaded.dom, 'draw').filter((n) => /xfa:embed=/.test((valueTextOf(n) as { markup?: string }).markup ?? ''));
    const counted = embedding.reduce((sum, n) => sum + ((valueTextOf(n) as { markup?: string }).markup ?? '').split('xfa:embed=').length - 1, 0);
    const shown: string[] = [];
    for (const node of embedding) {
      const text = layoutOwnTexts(layoutBoxes(node, FRAME).box, ctx).value;
      shown.push(`${node.name}: ${JSON.stringify(text?.lines.map((l) => l.runs.map((r) => r.text).join('')) ?? [])}`);
    }
    const missing = ctx.sink.issues.filter((i) => i.feature.startsWith('rich.embed'));
    console.info(`[rich-text] ${file}: A2 ${counted} xfa:embed spans in ${embedding.length} draws, ${missing.length} missing; shown ${JSON.stringify(shown)}`);
    expect(missing).toEqual([]);
    const known = EXPECTED[file];
    if (known !== undefined) expect(counted).toBe(known.embeds);
  });

  it('the whole form lays out with no rich block failing, and the text layer raises only the issue kinds listed here', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    let blocks = 0;
    let failures = 0;
    loaded.dom.walk((n) => {
      if (n.className !== 'draw' && n.className !== 'field') return;
      if (valueTextOf(n).kind === 'rich') {
        blocks += 1;
        const texts = layoutBoxTexts(layoutBoxes(n, FRAME).box, ctx);
        failures += texts.reduce((sum, t) => sum + (t.failures?.length ?? 0), 0);
      }
    });
    const kinds: Record<string, number> = {};
    for (const issue of ctx.sink.issues) {
      const kind = issue.feature.replace(/\d+(\.\d+)?pt/g, 'Npt').replace(/\(.*\)/, '').trim();
      kinds[kind] = (kinds[kind] ?? 0) + 1;
    }
    console.info(`[rich-text] ${file}: ${blocks} rich draws/fields laid out, ${failures} failed; issue kinds ${JSON.stringify(kinds)}`);
    expect(failures).toBe(0);
    const known = EXPECTED[file];
    if (known !== undefined) expect(kinds, 'exactly these issue kinds, with these counts').toEqual(known.issueKinds);
  });

  it('wiring rich text in adds its boxes and lines to the positioned containers: T05\'s 680 / 686 and 707 / 715 plain boxes / lines plus these (A3 of T05 unchanged)', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const all: BoxText[] = positionedBoxes(loaded, ctx).boxes.flatMap((b) => layoutBoxTexts(b, ctx));
    const rich = all.filter((t) => partsOf(t, 'rich').length > 0);
    const plain = all.filter((t) => partsOf(t, 'text').length > 0);
    const richLines = rich.reduce((sum, t) => sum + linesOf(partsOf(t, 'rich')), 0);
    const plainLines = plain.reduce((sum, t) => sum + linesOf(partsOf(t, 'text')), 0);
    const failed = all.reduce((sum, t) => sum + (t.failures?.length ?? 0), 0);
    // Runs of rich text drawn in the fixed-pitch fallback (no embedded program behind the typeface): W02-T12 must give them a font resource.
    const fallbackLines = rich.flatMap((t) => partsOf(t, 'rich').flatMap((p) => p.lines)).filter((line) => line.runs.some((run) => run.fontId === FALLBACK_FONT_ID));
    const fallbackRuns = fallbackLines.reduce((sum, line) => sum + line.runs.filter((run) => run.fontId === FALLBACK_FONT_ID).length, 0);
    console.info(`[rich-text] ${file}: fallback font id in rich text: ${fallbackLines.length} lines, ${fallbackRuns} runs`);
    console.info(`[rich-text] ${file}: positioned containers: ${rich.length} boxes / ${richLines} lines of rich text (draws and captions), ${plain.length} / ${plainLines} of plain text, ${all.length} boxes with text in all; ${failed} failed`);
    expect(failed).toBe(0);
    const known = EXPECTED[file];
    if (known !== undefined) {
      expect(rich.length).toBe(known.richBoxes);
      expect(richLines).toBe(known.richLines);
      expect(all.length).toBe(known.boxes);
      expect(plainLines + richLines).toBe(known.lines);
      expect(fallbackLines.length, 'rich lines with a fallback-font run').toBe(known.fallbackLines);
      expect(fallbackRuns, 'rich runs in the fallback font').toBe(known.fallbackRuns);
    }
  });
});
