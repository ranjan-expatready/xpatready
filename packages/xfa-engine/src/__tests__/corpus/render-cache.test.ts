import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readRenderCache, type RenderCache } from '../../layout/render-cache.js';
import { parseMeasure, TEMPLATE_LENGTH_UNIT } from '../../layout/units.js';
import { attrWithDefault, loadTemplate, type TemplateModel, type TemplateNode } from '../../model/template/index.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { openXfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

/** The renderCache record counts of each known corpus file (planner discovery 2026-10-18, re-counted through the model here). */
const EXPECTED_COUNTS: Readonly<Record<string, { readonly bounds: number; readonly textRun: number; readonly line: number; readonly subset: number }>> = {
  'imm1295e.pdf': { bounds: 150, textRun: 184, line: 0, subset: 6 },
  'imm5257e.pdf': { bounds: 150, textRun: 209, line: 3, subset: 7 },
};

/** Millipoint rounding in the records plus the template's own mm rounding: well under a thousandth of a point per field. */
const TOLERANCE_PT = 0.01;

interface Owned {
  readonly node: TemplateNode;
  readonly cache: RenderCache;
}

async function modelOf(file: string): Promise<TemplateModel> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
  return loadTemplate(pdf.packet('template').text());
}

const ownersOf = (model: TemplateModel): Owned[] =>
  model.nodes.filter((n) => n.renderCache.length > 0).map((node) => ({ node, cache: readRenderCache(node.renderCache) }));

const attrPt = (node: TemplateNode, name: string): number => parseMeasure(must(attrWithDefault(node, name), `${node.className}.${name}`), TEMPLATE_LENGTH_UNIT, name);
const childOf = (node: TemplateNode, className: string): TemplateNode | undefined => node.firstChild(className);

/** A draw's insets in points; a missing `<margin>` is the all-zero default. */
function insetsOf(draw: TemplateNode): { left: number; right: number; top: number; bottom: number } {
  const margin = childOf(draw, 'margin');
  if (margin === undefined) return { left: 0, right: 0, top: 0, bottom: 0 };
  return { left: attrPt(margin, 'leftInset'), right: attrPt(margin, 'rightInset'), top: attrPt(margin, 'topInset'), bottom: attrPt(margin, 'bottomInset') };
}

/** The text a draw shows when it is plain `<text>` (rich `exData` draws are measured separately). */
const isPlainText = (draw: TemplateNode): boolean => childOf(childOf(draw, 'value') ?? draw, 'text') !== undefined && childOf(draw, 'value')?.firstChild('exData') === undefined;

for (const file of files) {
  describe(`renderCache of ${file}`, () => {
    it('is exposed by the model: record counts match the known corpus (A3)', async () => {
      const owners = ownersOf(await modelOf(file));
      const count = (pick: (c: RenderCache) => number): number => owners.reduce((sum, o) => sum + pick(o.cache), 0);
      const seen = {
        bounds: count((c) => (c.bounds === undefined ? 0 : 1)),
        textRun: count((c) => c.textRuns.length),
        line: count((c) => c.lines.length),
        subset: count((c) => c.subsets.length),
      };
      const expected = EXPECTED_COUNTS[file];
      if (expected !== undefined) expect(seen).toEqual(expected);
      else expect(seen.bounds + seen.textRun + seen.line + seen.subset, 'unknown corpus file: parsed without error').toBeGreaterThanOrEqual(0);
      expect(count((c) => c.unrecognised.length)).toBe(0);
    });

    it('bounds fields 0, 1, 4, 5 are the draw width and height less insets, and the left and top inset (confirmed on every draw that has one)', async () => {
      const draws = ownersOf(await modelOf(file)).filter((o) => o.cache.bounds !== undefined);
      expect(draws.length).toBeGreaterThanOrEqual(3);
      const worst = { width: 0, height: 0, left: 0, top: 0 };
      for (const { node, cache } of draws) {
        const bounds = must(cache.bounds);
        expect(node.className, 'bounds belong to draws').toBe('draw');
        const inset = insetsOf(node);
        worst.width = Math.max(worst.width, Math.abs(bounds.widthPt - (attrPt(node, 'w') - inset.left - inset.right)));
        worst.height = Math.max(worst.height, Math.abs(bounds.heightPt - (attrPt(node, 'h') - inset.top - inset.bottom)));
        worst.left = Math.max(worst.left, Math.abs(bounds.leftInsetPt - inset.left));
        worst.top = Math.max(worst.top, Math.abs(bounds.topInsetPt - inset.top));
        expect(bounds.rawMp.slice(2, 4).concat(bounds.rawMp.slice(6)), 'fields 2, 3, 6, 7 are unconfirmed and 0 in every record').toEqual([0, 0, 0, 0]);
      }
      expect(worst.width).toBeLessThanOrEqual(TOLERANCE_PT);
      expect(worst.height).toBeLessThanOrEqual(TOLERANCE_PT);
      expect(worst.left).toBeLessThanOrEqual(TOLERANCE_PT);
      expect(worst.top).toBeLessThanOrEqual(TOLERANCE_PT);
    });

    it('textRun face, bold flag, size and colour equal the draw font on every plain-text draw; x is the left inset for left-aligned text', async () => {
      const plain = ownersOf(await modelOf(file)).filter((o) => o.node.className === 'draw' && o.cache.textRuns.length > 0 && isPlainText(o.node));
      expect(plain.length).toBeGreaterThanOrEqual(3);
      let leftAligned = 0;
      for (const { node, cache } of plain) {
        const font = childOf(node, 'font');
        if (font === undefined) continue;
        const para = childOf(node, 'para');
        for (const run of cache.textRuns) {
          expect(run.typeface).toBe(attrWithDefault(font, 'typeface'));
          expect(run.bold).toBe(attrWithDefault(font, 'weight') === 'bold');
          expect(Math.abs(run.sizePt - attrPt(font, 'size'))).toBeLessThanOrEqual(TOLERANCE_PT);
          const fill = childOf(font, 'fill')?.firstChild('color')?.attr('value') ?? '0,0,0';
          expect(run.colour.join(',')).toBe(fill.replace(/\s/g, ''));
        }
        const hAlign = para === undefined ? 'left' : (attrWithDefault(para, 'hAlign') ?? 'left');
        const indent = para === undefined ? 0 : attrPt(para, 'textIndent') + attrPt(para, 'marginLeft');
        const first = cache.textRuns[0];
        if (hAlign === 'left' && indent === 0 && first !== undefined) {
          leftAligned += 1;
          expect(Math.abs(first.xPt - insetsOf(node).left), `${node.name}: x of a left-aligned run is the left inset`).toBeLessThanOrEqual(TOLERANCE_PT + 0.002);
        }
      }
      expect(leftAligned).toBeGreaterThanOrEqual(3);
    });

    it('textRun baselineY is measured down from the draw top edge: top-aligned single-line text sits 0.75 em below the top inset, bottom-aligned 0.25 em above the bottom inset', async () => {
      const single = ownersOf(await modelOf(file)).filter((o) => o.node.className === 'draw' && o.cache.textRuns.length === 1 && isPlainText(o.node));
      const seen = { top: 0, bottom: 0 };
      for (const { node, cache } of single) {
        const run = must(cache.textRuns[0]);
        const para = childOf(node, 'para');
        const vAlign = para === undefined ? 'top' : (attrWithDefault(para, 'vAlign') ?? 'top');
        const inset = insetsOf(node);
        if (vAlign === 'top') {
          seen.top += 1;
          expect(Math.abs(run.baselineYPt - inset.top - 0.75 * run.sizePt), `${node.name} (top)`).toBeLessThanOrEqual(0.002 * run.sizePt + TOLERANCE_PT);
        } else if (vAlign === 'bottom') {
          seen.bottom += 1;
          expect(Math.abs(attrPt(node, 'h') - inset.bottom - run.baselineYPt - 0.25 * run.sizePt), `${node.name} (bottom)`).toBeLessThanOrEqual(0.002 * run.sizePt + TOLERANCE_PT);
        }
      }
      expect(seen.top).toBeGreaterThanOrEqual(3);
      expect(seen.bottom).toBeGreaterThanOrEqual(3);
    });

    it('a line record is a horizontal rule just under a run: it starts where that run starts, ends inside the box (at the next run when there is one), and takes the colour of the run it underlines', async () => {
      const withLines = ownersOf(await modelOf(file)).filter((o) => o.cache.lines.length > 0);
      for (const { node, cache } of withLines) {
        for (const line of cache.lines) {
          expect(line.y1Pt, `${node.name}: horizontal`).toBe(line.y2Pt);
          const under = must(cache.textRuns.find((run) => Math.abs(run.xPt - line.x1Pt) <= TOLERANCE_PT && line.y1Pt > run.baselineYPt && line.y1Pt - run.baselineYPt < run.sizePt), `${node.name}: a run starts at the line start, just above it`);
          expect(under.colour).toEqual(line.colour);
          const bounds = must(cache.bounds);
          expect(line.x2Pt).toBeGreaterThan(line.x1Pt);
          expect(line.x2Pt, `${node.name}: the line ends inside the box`).toBeLessThanOrEqual(bounds.leftInsetPt + bounds.widthPt + TOLERANCE_PT);
          if (cache.textRuns.some((run) => run.xPt > line.x2Pt - TOLERANCE_PT && Math.abs(run.baselineYPt - under.baselineYPt) <= TOLERANCE_PT)) {
            expect(cache.textRuns.some((run) => Math.abs(run.xPt - line.x2Pt) <= TOLERANCE_PT), `${node.name}: the next run on the line starts where the rule ends`).toBe(true);
          }
        }
      }
      expect(withLines.flatMap((o) => o.cache.lines).length).toBe(EXPECTED_COUNTS[file]?.line ?? withLines.flatMap((o) => o.cache.lines).length);
    });

    it('every run keeps its encoding and unconfirmed flags as the corpus shows them (0 leading flag, 0 italic flag), so a form that changes them is noticed', async () => {
      const runs = ownersOf(await modelOf(file)).flatMap((o) => o.cache.textRuns);
      expect(runs.length).toBeGreaterThan(0);
      expect(new Set(runs.map((r) => r.rawLeadingFlag))).toEqual(new Set([0]));
      expect(new Set(runs.map((r) => r.rawItalicFlag))).toEqual(new Set([0]));
      expect(new Set(runs.map((r) => r.encoding))).toEqual(new Set(['ISO-8859-1']));
    });
  });
}
