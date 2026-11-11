import { describe, expect, it } from 'vitest';
import { layoutBoxes, type LayoutBox, type Rect } from '../../layout/box/index.js';
import { readRenderCache } from '../../layout/render-cache.js';
import { createCaptionReserve, FALLBACK_FONT_ID, layoutBoxTexts, layoutOwnTexts, valueTextOf, type BoxText, type LaidOutLine } from '../../layout/text/index.js';
import type { FormDom, FormNode } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { files, linesOf, load, nodesOf, partsOf, positionedBoxes, sameFamily, som, textContext } from './text-corpus.js';

/**
 * Per known corpus file, counted from the renderCache records alone (W01-T01 evidence, re-counted here): the `textRun`
 * records of draws whose value is plain `<text>` (laid out here) and of draws whose value is exData markup (W01-T06), and
 * the captions that carry no reserve (OVERVIEW survey: 11 and 13), 2 of the 13 of IMM5257 sitting in table rows (W01-T07).
 */
/**
 * The issue kinds the text layer raises over all DRAWN boxes of the positioned containers, with counts, pinned exactly so
 * that a regression of plain text cannot hide among them. T05 raised the `lineHeight` kind only (6 SOMs per form, plain
 * draws). Since T06 the same pass also lays the exData blocks out: IMM1295 adds one `hAlign="justify"` (the justified `Text1`
 * block, rich); IMM5257 adds nothing. (`font.Courier New` of the hidden `JavaScriptMessage` is not drawn here; rich-text.test.ts pins it.)
 */
const LINEHEIGHT = 'lineHeight Npt is below the natural Npt: text block placed by lineHeight minus line gap';
const LINE_HEIGHT_KINDS_1295 = { [LINEHEIGHT]: 6, 'hAlign="justify"': 1 };
const LINE_HEIGHT_KINDS_5257 = { [LINEHEIGHT]: 6 };

const EXPECTED: Readonly<Record<string, { readonly plainDraws: number; readonly plainRuns: number; readonly richRuns: number; readonly autoCaptions: number; readonly autoCaptionsInPositioned: number; readonly overflowing: readonly string[]; readonly boxesWithText: number; readonly lines: number; readonly issueKinds: Readonly<Record<string, number>> }>> = {
  'imm1295e.pdf': { plainDraws: 121, plainRuns: 122, richRuns: 62, autoCaptions: 11, autoCaptionsInPositioned: 11, overflowing: ['xfa[0].form[0].form1[0].Page3[0].DetailsOfWorkCont[0].details[0].EducationText[0]'], boxesWithText: 680, lines: 686, issueKinds: LINE_HEIGHT_KINDS_1295 },
  'imm5257e.pdf': { plainDraws: 121, plainRuns: 125, richRuns: 84, autoCaptions: 13, autoCaptionsInPositioned: 11, overflowing: [], boxesWithText: 707, lines: 715, issueKinds: LINE_HEIGHT_KINDS_5257 },
};

/** The card's tolerance (A2, A3): 1 pt. */
const TOLERANCE_PT = 1;
/** What the corpus achieves: the oracle is whole millipoints, and Acrobat rounds the box and insets to them too. */
const MILLIPOINT_PT = 0.01;

const FRAME: Rect = { xPt: 0, yPt: 0, widthPt: 0, heightPt: 0 };

/** Draws that carry renderCache records and show plain `<text>` (decided from the template alone). */
const plainDraws = (dom: FormDom): FormNode[] =>
  nodesOf(dom, 'draw').filter((n) => n.template.renderCache.length > 0 && n.template.firstChild('value')?.firstChild('text') !== undefined);

const richDraws = (dom: FormDom): FormNode[] =>
  nodesOf(dom, 'draw').filter((n) => n.template.renderCache.length > 0 && n.template.firstChild('value')?.firstChild('exData') !== undefined);

describe.each(files)('plain text against the renderCache oracle of %s', (file) => {
  it('every textRun of a plain-text draw matches our run: text, face, weight, size, colour and position within 1 pt (A2)', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const draws = plainDraws(loaded.dom);
    let total = 0;
    let matched = 0;
    let worst = 0;
    const mismatches: string[] = [];
    for (const node of draws) {
      const oracle = readRenderCache(node.template.renderCache).textRuns;
      const { box } = layoutBoxes(node, FRAME);
      const lines: readonly LaidOutLine[] = layoutOwnTexts(box, ctx).value?.lines ?? [];
      if (lines.length !== oracle.length) mismatches.push(`${som(node)}: ${lines.length} lines, oracle ${oracle.length} runs`);
      oracle.forEach((want, i) => {
        total += 1;
        const line = lines[i];
        const run = line?.runs[0];
        if (line === undefined || run === undefined) return;
        const face = loaded.faces.find((f) => f.fontId === run.fontId);
        const dx = Math.abs(line.xPt - want.xPt);
        const dy = Math.abs(line.yBaselinePt - want.baselineYPt);
        const causes = [
          run.text !== want.text ? `text "${run.text}" vs "${want.text}"` : '',
          face === undefined || !sameFamily(face.family, want.typeface) ? `face ${face?.family} vs ${want.typeface}` : '',
          face?.weight !== (want.bold ? 'bold' : 'normal') ? `weight ${face?.weight} vs bold=${want.bold}` : '',
          Math.abs(run.sizePt - want.sizePt) > MILLIPOINT_PT ? `size ${run.sizePt} vs ${want.sizePt}` : '',
          run.colour.join(',') !== want.colour.join(',') ? `colour ${run.colour.join(',')} vs ${want.colour.join(',')}` : '',
          dx > TOLERANCE_PT ? `x off by ${dx.toFixed(3)} pt` : '',
          dy > TOLERANCE_PT ? `baseline off by ${dy.toFixed(3)} pt` : '',
        ].filter((c) => c !== '');
        if (causes.length === 0) {
          matched += 1;
          worst = Math.max(worst, dx, dy);
        } else {
          mismatches.push(`${som(node)} run ${i}: ${causes.join('; ')}`);
        }
      });
    }
    console.info(`[plain-text] ${file}: A2 ${matched}/${total} textRun records of ${draws.length} plain-text draws matched, worst position deviation ${worst.toFixed(4)} pt; mismatches: ${JSON.stringify(mismatches)}`);
    expect(mismatches, 'zero unexplained mismatches').toEqual([]);
    expect(matched).toBe(total);
    expect(worst).toBeLessThanOrEqual(MILLIPOINT_PT);
    const known = EXPECTED[file];
    if (known !== undefined) {
      expect(draws.length).toBe(known.plainDraws);
      expect(total).toBe(known.plainRuns);
      const richRuns = richDraws(loaded.dom).reduce((sum, n) => sum + readRenderCache(n.template.renderCache).textRuns.length, 0);
      expect(richRuns, 'rich-text runs are W01-T06').toBe(known.richRuns);
    } else {
      expect(total).toBeGreaterThan(0);
    }
  });

  it('our value text of each plain-text draw is the draw text, and the draws the template marks rich are left to W01-T06', async () => {
    const { dom } = await load(file);
    for (const node of plainDraws(dom)) expect(valueTextOf(node).kind, som(node)).toBe('text');
    for (const node of richDraws(dom)) expect(valueTextOf(node).kind, som(node)).toBe('rich');
  });

  it('the text region of every plain-text draw is the oracle bounds (inner size, left and top inset) and the text fits it, except a draw shorter than its line (A3)', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    let worst = 0;
    const overflowing: string[] = [];
    for (const node of plainDraws(loaded.dom)) {
      const bounds = readRenderCache(node.template.renderCache).bounds;
      expect(bounds, som(node)).toBeDefined();
      if (bounds === undefined) continue;
      const { box } = layoutBoxes(node, FRAME);
      const text = layoutOwnTexts(box, ctx).value;
      expect(text, som(node)).toBeDefined();
      if (text === undefined) continue;
      const deviations = [text.region.widthPt - bounds.widthPt, text.region.heightPt - bounds.heightPt, text.region.xPt - bounds.leftInsetPt, text.region.yPt - bounds.topInsetPt].map(Math.abs);
      worst = Math.max(worst, ...deviations);
      if (text.overflow.horizontal || text.overflow.vertical) overflowing.push(`${somExpressionOf(node)} ${JSON.stringify(text.overflow)} extent ${text.extent.widthPt.toFixed(2)} x ${text.extent.heightPt.toFixed(2)} in ${text.region.widthPt.toFixed(2)} x ${text.region.heightPt.toFixed(2)}`);
      else {
        expect(text.extent.widthPt, `${som(node)} width`).toBeLessThanOrEqual(bounds.widthPt + TOLERANCE_PT);
        expect(text.extent.heightPt, `${som(node)} height`).toBeLessThanOrEqual(bounds.heightPt + TOLERANCE_PT);
      }
    }
    console.info(`[plain-text] ${file}: A3 text region vs bounds worst deviation ${worst.toExponential(2)} pt; overflowing draws: ${JSON.stringify(overflowing)}`);
    expect(worst).toBeLessThanOrEqual(MILLIPOINT_PT);
    const known = EXPECTED[file];
    if (known !== undefined) expect(overflowing.map((entry) => entry.split(' ')[0])).toEqual(known.overflowing);
  });
});

const isAutoCaption = (field: FormNode): boolean => {
  const reserve = field.childrenOfClass('caption')[0]?.attr('reserve');
  return reserve === undefined || Number.parseFloat(reserve) <= 0 || Number.isNaN(Number.parseFloat(reserve));
};

/** Whether a line's ink box (baseline - ascent .. baseline + descent) crosses `rect`. */
function inkCrosses(line: LaidOutLine, origin: Rect, ascent: number, descent: number, rect: Rect): boolean {
  const left = origin.xPt + line.xPt;
  const top = origin.yPt + line.yBaselinePt - ascent;
  const eps = 1e-6;
  return left < rect.xPt + rect.widthPt - eps && left + line.fitWidthPt > rect.xPt + eps && top < rect.yPt + rect.heightPt - eps && top + ascent + descent > rect.yPt + eps;
}

describe.each(files)('caption auto-reserve on %s', (file) => {
  it('every caption without a reserve in a positioned container gets a reserve above 0, and no caption text crosses its widget rectangle (A4)', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const { boxes, box } = positionedBoxes(loaded, ctx);
    const all: LayoutBox[] = [];
    const collect = (b: LayoutBox): void => {
      all.push(b);
      b.children.forEach(collect);
    };
    boxes.forEach(collect);
    const captioned = all.filter((b) => b.node.className === 'field' && b.node.childrenOfClass('caption').length > 0 && isAutoCaption(b.node));
    const known = EXPECTED[file];
    if (known !== undefined) expect(captioned.length).toBe(known.autoCaptionsInPositioned);
    expect(captioned.length).toBeGreaterThan(0);
    const metricsOf = (fontId: string): { ascent: number; descent: number } => {
      const m = loaded.faces.find((f) => f.fontId === fontId)?.metrics;
      return m === undefined ? { ascent: 0.627, descent: 0.373 } : { ascent: m.ascent / m.unitsPerEm, descent: m.descent / m.unitsPerEm };
    };
    for (const b of captioned) {
      const label = som(b.node);
      expect(b.caption?.auto, `${label} is resolved`).toBe(false);
      expect(b.caption?.reservePt, `${label} reserve`).toBeGreaterThan(0);
      expect(b.caption?.clamped, `${label} not cut to fit`).toBe(false);
      const text = layoutOwnTexts(b, ctx).caption;
      expect(text, `${label} caption text`).toBeDefined();
      for (const line of text?.lines ?? []) {
        const run = line.runs[0];
        const m = metricsOf(run?.fontId ?? '');
        const size = run?.sizePt ?? 0;
        expect(inkCrosses(line, b.rect, m.ascent * size, m.descent * size, b.widgetRect), `${label} caption text overlaps its widget`).toBe(false);
        expect(inkCrosses(line, b.rect, m.ascent * size, m.descent * size, b.captionRect ?? b.rect), `${label} caption text inside its strip`).toBe(true);
      }
    }
    expect(box.sink.issues.filter((i) => i.feature.startsWith('caption')), 'no caption left automatic or cut').toEqual([]);
    console.info(`[plain-text] ${file}: A4 ${captioned.length} auto-reserve captions in positioned containers, reserves ${captioned.map((b) => b.caption?.reservePt.toFixed(2)).join(' ')} pt, no overlap`);
  });

  it('the captions without a reserve in table rows (not laid out until W01-T07) also get a reserve above 0 from the hook', async () => {
    const loaded = await load(file);
    const hook = createCaptionReserve(textContext(loaded));
    const fields = nodesOf(loaded.dom, 'field').filter((f) => f.childrenOfClass('caption').length > 0 && isAutoCaption(f));
    const known = EXPECTED[file];
    if (known !== undefined) expect(fields.length).toBe(known.autoCaptions);
    for (const field of fields) {
      const answer = hook(field, 'left', { xPt: 0, yPt: 0, widthPt: 200, heightPt: 40 });
      expect(answer, som(field)).not.toBe('auto');
      expect(Number(answer), som(field)).toBeGreaterThan(0);
    }
  });
});

describe.each(files)('text layout of the whole form %s', (file) => {
  it('lays out every plain drawn text of the positioned containers; the text layer raises only the issue kinds listed here', async () => {
    const loaded = await load(file);
    const ctx = textContext(loaded);
    const { boxes } = positionedBoxes(loaded, ctx);
    const all: BoxText[] = boxes.flatMap((b) => layoutBoxTexts(b, ctx));
    // The pinned counts are those of plain text (T05). The exData contribution is pinned by rich-text.test.ts.
    const texts = all.filter((t) => partsOf(t, 'text').length > 0);
    const lines = texts.reduce((sum, t) => sum + linesOf(partsOf(t, 'text')), 0);
    const kinds: Record<string, number> = {};
    for (const issue of ctx.sink.issues) {
      const kind = issue.feature.replace(/\d+(\.\d+)?pt/g, 'Npt').replace(/\(.*\)/, '').trim();
      kinds[kind] = (kinds[kind] ?? 0) + 1;
    }
    // Every typeface the two forms name has an embedded program, so no run of plain text takes the fixed-pitch fallback id.
    const fallbackRuns = texts.reduce((sum, t) => sum + partsOf(t, 'text').flatMap((p) => p.lines).filter((line) => line.runs.some((run) => run.fontId === FALLBACK_FONT_ID)).length, 0);
    console.info(`[plain-text] ${file}: ${fallbackRuns} lines with the fallback font id; ${texts.length} boxes with text, ${lines} lines; text issue kinds ${JSON.stringify(kinds)}`);
    expect(lines).toBeGreaterThan(100);
    expect(fallbackRuns, 'no run of plain text in the corpus uses the fallback font id').toBe(0);
    const known = EXPECTED[file];
    if (known !== undefined) {
      expect(texts.length).toBe(known.boxesWithText);
      expect(lines).toBe(known.lines);
      expect(kinds, 'exactly these issue kinds, with these counts').toEqual(known.issueKinds);
    }
  });
});
