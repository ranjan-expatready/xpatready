import { describe, expect, it } from 'vitest';
import type { LayoutBox } from '../../layout/box/index.js';
import { layoutFlow, type FlowLayout } from '../../layout/flow/index.js';
import { readRenderCache, type RenderCache } from '../../layout/render-cache.js';
import { layoutOwnTexts, type BoxText, type LaidOutText, type TextContext } from '../../layout/text/index.js';
import type { FormNode } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { causesOf, files, load, MILLIPOINT_PT, nodesOf, placedRuns, textContext, TOLERANCE_PT, type Loaded, type PlacedRun } from './text-corpus.js';

/**
 * The integrated W01 oracle (W01-T07 A3). The whole form is laid out ONCE, in one unbounded content area, by `layoutFlow`;
 * every record of every renderCache on the form is then looked up in THAT tree and compared with the renderCache itself
 * (`readRenderCache`, which nothing under test reads): `bounds` of a draw against the draw's text region, `textRun`
 * against our placed runs, `line` against what the text layer draws. A record is either matched within 1 pt or listed with
 * a cause the test derives (never typed in); anything else fails the run. T05/T06 proved the same records on each draw
 * laid out alone; what is new here is that they hold for the draw as the flow placed it.
 *
 * Per known corpus file, counted from the renderCache records alone (OVERVIEW survey: bounds 150/150, textRun 184 / 209,
 * line 0 / 3):
 */
// textBoxes / textLines are 331 / 376 for BOTH forms. That is a coincidence of totals, checked by hand against each form's own
// tree (not a shared constant): IMM1295 has 156 draws and 175 fields with text (200 value lines + 176 caption lines), IMM5257 155
// and 176 (199 + 177), and 141 of the 331 boxes with text differ by SOM. valueLines / captionLines pin that split.
const EXPECTED: Readonly<Record<string, { readonly draws: number; readonly bounds: number; readonly boundsMatched: number; readonly runs: number; readonly runsMatched: number; readonly lines: number; readonly boxes: number; readonly rowDraws: number; readonly notDrawn: number; readonly rootWidthPt: number; readonly textBoxes: number; readonly textLines: number; readonly valueLines: number; readonly captionLines: number; readonly masterBoxes: number }>> = {
  'imm1295e.pdf': { draws: 150, bounds: 150, boundsMatched: 150, runs: 184, runsMatched: 184, lines: 0, boxes: 681, rowDraws: 0, notDrawn: 0, rootWidthPt: 569.28, textBoxes: 331, textLines: 376, valueLines: 200, captionLines: 176, masterBoxes: 23 },
  'imm5257e.pdf': { draws: 150, bounds: 150, boundsMatched: 150, runs: 209, runsMatched: 209, lines: 3, boxes: 668, rowDraws: 0, notDrawn: 0, rootWidthPt: 569.4, textBoxes: 331, textLines: 376, valueLines: 199, captionLines: 177, masterBoxes: 23 },
};


interface Subject {
  readonly loaded: Loaded;
  readonly text: TextContext;
  readonly flow: FlowLayout;
  readonly boxes: ReadonlyMap<FormNode, LayoutBox>;
  readonly texts: ReadonlyMap<FormNode, BoxText>;
}

const subjects = new Map<string, Promise<Subject>>();
function subjectOf(file: string): Promise<Subject> {
  let found = subjects.get(file);
  if (found === undefined) {
    found = (async () => {
      const loaded = await load(file);
      const text = textContext(loaded);
      const flow = layoutFlow(loaded.dom, text);
      const boxes = new Map<FormNode, LayoutBox>();
      const visit = (box: LayoutBox): void => {
        boxes.set(box.node, box);
        box.children.forEach(visit);
      };
      visit(flow.root);
      flow.masterPages.forEach((page) => page.boxes.forEach(visit));
      const texts = [...flow.texts, ...flow.masterPages.flatMap((page) => page.texts)];
      return { loaded, text, flow, boxes, texts: new Map(texts.map((entry) => [entry.box.node, entry])) };
    })();
    subjects.set(file, found);
  }
  return found;
}

/** Draws that carry renderCache records. */
const oracleDraws = (s: Subject): FormNode[] => nodesOf(s.loaded.dom, 'draw').filter((n) => n.template.renderCache.length > 0);

/** The boxed nodes of the form (master pages included), counted from the form DOM alone: every ancestor up to the form is a container or a master page element. */
function boxedNodes(s: Subject): FormNode[] {
  const out: FormNode[] = [];
  s.loaded.dom.walk((n) => {
    if (!['subform', 'exclGroup', 'area', 'field', 'draw'].includes(n.className)) return;
    for (let up = n.parent; up !== null && up.className !== 'form'; up = up.parent) if (!['subform', 'exclGroup', 'area', 'pageSet', 'pageArea'].includes(up.className)) return;
    out.push(n);
  });
  return out;
}

/** The text of `node` as the integrated tree lays it out: the flow's own result for a drawn box, the same function for one that is not drawn (hidden, invisible, print-only). */
function textOf(s: Subject, node: FormNode): { readonly text: LaidOutText | undefined; readonly drawn: boolean } {
  const entry = s.texts.get(node);
  if (entry !== undefined) return { text: entry.value, drawn: true };
  const box = s.boxes.get(node);
  return { text: box === undefined ? undefined : layoutOwnTexts(box, s.text).value, drawn: false };
}

const boundsCauses = (oracle: NonNullable<RenderCache['bounds']>, box: LayoutBox): string[] => {
  const local = { x: box.contentRect.xPt - box.rect.xPt, y: box.contentRect.yPt - box.rect.yPt, w: box.contentRect.widthPt, h: box.contentRect.heightPt };
  return [
    ['width', local.w, oracle.widthPt],
    ['height', local.h, oracle.heightPt],
    ['left inset', local.x, oracle.leftInsetPt],
    ['top inset', local.y, oracle.topInsetPt],
  ].flatMap(([what, got, want]) => (Math.abs(Number(got) - Number(want)) > TOLERANCE_PT ? [`${String(what)} ${Number(got).toFixed(3)} vs ${Number(want).toFixed(3)}`] : []));
};

interface Report {
  readonly bounds: { total: number; matched: number };
  readonly textRun: { total: number; matched: number };
  /** `line` records are never matched (the text layer draws no decoration); each is listed with the derivation of its cause. */
  readonly line: { total: number; listed: string[] };
  readonly unexplained: string[];
  worst: number;
  notDrawn: number;
}

/**
 * The underline decoration the `line` records describe: the one link-coloured run of ours that starts at the record's
 * left end, within 1 pt, and ends at its right end within 1 pt (the run's own advance width, measured with the font), on
 * one level. Found by geometry, not by position in a list.
 */
const underlinedRun = (want: RenderCache['lines'][number], runs: readonly PlacedRun[]): PlacedRun | undefined =>
  runs.find((run) => run.colour === '0,0,255' && Math.abs(run.xPt - want.x1Pt) <= TOLERANCE_PT && Math.abs(run.xPt + run.widthPt - want.x2Pt) <= TOLERANCE_PT) ;

/** The level of the underline below the baseline, in em, FITTED to the three records of the corpus (0.77 pt at 7 pt); no specification text or other record supports it. */
const FITTED_UNDERLINE_EM = 0.11;

describe.each(files)('the integrated W01 oracle on real form %s', (file) => {
  it('every renderCache bounds, textRun and line record is matched within 1 pt or listed with a cause the test derives; zero unexplained', async () => {
    const s = await subjectOf(file);
    const report: Report = { bounds: { total: 0, matched: 0 }, textRun: { total: 0, matched: 0 }, line: { total: 0, listed: [] }, unexplained: [], worst: 0, notDrawn: 0 };
    const draws = oracleDraws(s);
    let rowDraws = 0;
    for (const node of draws) {
      const where = somExpressionOf(node);
      const oracle = readRenderCache(node.template.renderCache);
      const box = s.boxes.get(node);
      if (box === undefined) {
        report.unexplained.push(`${where}: no box in the flow tree`);
        continue;
      }
      const { text, drawn } = textOf(s, node);
      if (!drawn) report.notDrawn += 1;
      if (node.parent?.attr('layout') === 'row') rowDraws += 1;

      if (oracle.bounds !== undefined) {
        report.bounds.total += 1;
        const causes = boundsCauses(oracle.bounds, box);
        if (causes.length === 0) report.bounds.matched += 1;
        else report.unexplained.push(`${where}: bounds ${causes.join(', ')}`);
      }

      const placed = text === undefined ? [] : placedRuns(text, s.loaded);
      oracle.textRuns.forEach((want, i) => {
        report.textRun.total += 1;
        const causes = causesOf(want, placed[i]);
        if (causes.length === 0) {
          report.textRun.matched += 1;
          report.worst = Math.max(report.worst, Math.abs((placed[i]?.xPt ?? 0) - want.xPt), Math.abs((placed[i]?.baselinePt ?? 0) - want.baselineYPt));
        } else {
          report.unexplained.push(`${where} run ${i}: ${causes.join('; ')}`);
        }
      });

      // `line` records are the underlines Acrobat draws under the links of a rich block. The text layer draws links as
      // coloured text only (T06), so none can match; each is listed, and the cause is derived from OUR runs: the link-coloured
      // run that starts at its left end and ends at its right end (measured advance, within 1 pt), with the line on one level
      // at the baseline plus the fitted underline offset.
      oracle.lines.forEach((want, i) => {
        report.line.total += 1;
        const link = underlinedRun(want, placed);
        const level = link === undefined ? Number.NaN : Math.abs(want.y1Pt - (link.baselinePt + FITTED_UNDERLINE_EM * link.sizePt));
        if (link !== undefined && level <= MILLIPOINT_PT / 2 && want.y1Pt === want.y2Pt) {
          report.line.listed.push(`${where}: link underline ${want.x1Pt}..${want.x2Pt} at y ${want.y1Pt} under "${link.text}" (run ${link.xPt.toFixed(3)}..${(link.xPt + link.widthPt).toFixed(3)}; the text layer draws links as coloured text, no decoration: W02-T10)`);
        } else {
          report.unexplained.push(`${where} line ${i}: no link run of ours explains it`);
        }
      });
    }
    console.info(`[layout-oracle] ${file}: bounds ${report.bounds.matched}/${report.bounds.total}, textRun ${report.textRun.matched}/${report.textRun.total} (worst ${report.worst.toFixed(4)} pt), line 0/${report.line.total} (${report.line.listed.length} listed with a cause); unexplained ${report.unexplained.length}; ${report.notDrawn} oracle draws not drawn; ${rowDraws} in rows`);
    for (const entry of report.line.listed) console.info(`[layout-oracle] ${file}: listed: ${entry}`);
    expect(report.unexplained, 'zero unexplained records').toEqual([]);
    expect(report.bounds.matched).toBe(report.bounds.total);
    expect(report.textRun.matched).toBe(report.textRun.total);
    expect(report.line.listed).toHaveLength(report.line.total);
    expect(report.worst).toBeLessThanOrEqual(0.6);
    const known = EXPECTED[file];
    if (known !== undefined) {
      expect(draws.length).toBe(known.draws);
      expect(report.bounds.total).toBe(known.bounds);
      expect(report.bounds.matched).toBe(known.boundsMatched);
      expect(report.textRun.total).toBe(known.runs);
      expect(report.textRun.matched).toBe(known.runsMatched);
      expect(report.line.total).toBe(known.lines);
      expect(rowDraws).toBe(known.rowDraws);
      expect(report.notDrawn).toBe(known.notDrawn);
    }
  });

  it('every subform, exclusion group, field and draw of the form has a finite box (in the flow tree, or on its master page), none is a placeholder, and the root is the form', async () => {
    const s = await subjectOf(file);
    const expected = boxedNodes(s);
    const bad: string[] = [];
    for (const node of expected) {
      const box = s.boxes.get(node);
      if (box === undefined) {
        bad.push(`${somExpressionOf(node)}: no box`);
        continue;
      }
      const finite = [box.rect, box.contentRect, box.widgetRect].every((r) => [r.xPt, r.yPt, r.widthPt, r.heightPt].every(Number.isFinite) && r.widthPt >= 0 && r.heightPt >= 0);
      if (!finite) bad.push(`${somExpressionOf(node)}: not finite`);
      if (box.placeholder !== undefined) bad.push(`${somExpressionOf(node)}: placeholder ${box.placeholder}`);
    }
    expect(bad).toEqual([]);
    expect(s.boxes.size, 'the trees hold exactly those boxes').toBe(expected.length);
    expect(s.flow.root.node).toBe(s.loaded.dom.root);
    const known = EXPECTED[file];
    const valueLines = s.flow.texts.reduce((sum, entry) => sum + (entry.value?.lines.length ?? 0), 0);
    const captionLines = s.flow.texts.reduce((sum, entry) => sum + (entry.caption?.lines.length ?? 0), 0);
    const lines = valueLines + captionLines;
    const masterBoxes = s.flow.masterPages.reduce((sum, page) => sum + page.boxes.length, 0);
    console.info(`[layout-oracle] ${file}: ${s.boxes.size} boxes, ${s.flow.texts.length} boxes with text (${lines} lines), ${s.flow.masterPages.length} master pages with ${masterBoxes} top-level boxes, ${s.flow.issues.length} issues, ${s.flow.failedBlocks.length} failed rich blocks; root ${s.flow.root.rect.widthPt.toFixed(2)} x ${s.flow.root.rect.heightPt.toFixed(2)} pt`);
    if (known !== undefined) {
      expect(s.boxes.size).toBe(known.boxes);
      expect(s.flow.root.rect.widthPt, 'root width: no given w is ever exceeded in the flow').toBeCloseTo(known.rootWidthPt, 2);
      expect(s.flow.texts.length, 'boxes of the flow tree with text').toBe(known.textBoxes);
      expect(lines, 'lines of that text').toBe(known.textLines);
      expect({ valueLines, captionLines }, 'the split of those lines between values and captions differs between the two forms').toEqual({ valueLines: known.valueLines, captionLines: known.captionLines });
      expect(masterBoxes, 'top-level boxes of the master pages').toBe(known.masterBoxes);
    }
  });
});
