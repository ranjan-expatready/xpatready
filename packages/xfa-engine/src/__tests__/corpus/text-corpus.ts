import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';
import { BoxContext, buildChildBoxes, layoutModeOf, type LayoutBox, type Rect } from '../../layout/box/index.js';
import type { RenderCacheTextRun } from '../../layout/render-cache.js';
import { loadFonts, type LoadedFont } from '../../layout/font/catalogue.js';
import { measure } from '../../layout/font/measure.js';
import { captionTextOf, createCaptionReserve, createTextContext, FALLBACK_FONT_ID, templateTypefacesOf, valueTextOf, type BoxText, type LaidOutText, type TextContext } from '../../layout/text/index.js';
import { createFormDom, type FormDom, type FormNode } from '../../model/form/index.js';
import { loadTemplate, type TemplateModel } from '../../model/template/index.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';

/** Shared by the text corpus tests (plain text W01-T05, rich text W01-T06): the forms of `XFA_CORPUS_DIR`, loaded once. */

// Set by scripts/run-corpus.mjs (absolute path). Running a test file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const corpusDir: string = dir;
export const files = readdirSync(corpusDir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${corpusDir}`);

export interface Loaded {
  readonly model: TemplateModel;
  readonly dom: FormDom;
  readonly faces: readonly LoadedFont[];
}

const cache = new Map<string, Promise<Loaded>>();
export function load(file: string): Promise<Loaded> {
  let found = cache.get(file);
  if (found === undefined) {
    found = (async () => {
      const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(corpusDir, file))));
      const model = loadTemplate(pdf.packet('template').text());
      const dom = createFormDom(model, parseXml(pdf.packet('datasets').text()));
      const loaded = loadFonts((await pdf.fonts()).fonts);
      expect(loaded.issues).toEqual([]);
      return { model, dom, faces: loaded.faces };
    })();
    cache.set(file, found);
  }
  return found;
}

/** A text context over the form: its embedded faces, its typefaces, and its field values for `xfa:embed`. */
export const textContext = (l: Loaded): TextContext => createTextContext(l.faces, templateTypefacesOf(l.model), l.dom);

export const nodesOf = (dom: FormDom, className: string): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (n.className === className) out.push(n);
  });
  return out;
};

export const sameFamily = (a: string, b: string): boolean => a.replace(/\s/g, '').toLowerCase() === b.replace(/\s/g, '').toLowerCase();
export const som = (node: FormNode): string => `${node.className}:${node.name}`;

const FRAME: Rect = { xPt: 0, yPt: 0, widthPt: 0, heightPt: 0 };

/** Boxes of every positioned container of the form, laid out with the caption auto-reserve. */
export function positionedBoxes(l: Loaded, ctx: TextContext): { readonly boxes: LayoutBox[]; readonly box: BoxContext } {
  const box = new BoxContext({ captionReserve: createCaptionReserve(ctx) });
  const boxes: LayoutBox[] = [];
  l.dom.walk((n) => {
    if (layoutModeOf(n) === 'position') boxes.push(...buildChildBoxes(n, FRAME, 'visible', box, 0));
  });
  return { boxes, box };
}

/** The laid-out value and caption of a box that came from plain `<text>` (T05) or from exData markup (T06). */
export function partsOf(text: BoxText, kind: 'text' | 'rich'): readonly LaidOutText[] {
  const captionNode = text.box.node.childrenOfClass('caption')[0];
  const parts: LaidOutText[] = [];
  if (text.value !== undefined && valueTextOf(text.box.node).kind === kind) parts.push(text.value);
  if (text.caption !== undefined && captionNode !== undefined && captionTextOf(captionNode).kind === kind) parts.push(text.caption);
  return parts;
}

export const linesOf = (parts: readonly LaidOutText[]): number => parts.reduce((sum, part) => sum + part.lines.length, 0);

export interface PlacedRun {
  readonly text: string;
  readonly xPt: number;
  readonly baselinePt: number;
  readonly family: string;
  readonly bold: boolean;
  readonly sizePt: number;
  readonly colour: string;
  /** The advance width of the run. */
  readonly widthPt: number;
}

/** The runs of a laid-out text with their own x: a line starts at its `xPt` and its runs follow one another by their advance. */
export function placedRuns(text: LaidOutText, l: Loaded): PlacedRun[] {
  const out: PlacedRun[] = [];
  for (const line of text.lines) {
    let x = line.xPt;
    for (const run of line.runs) {
      const face = l.faces.find((f) => f.fontId === run.fontId);
      const width = face === undefined ? run.text.length * 0.6 * run.sizePt : measure(run.text, face.metrics, run.sizePt, run.letterSpacingPt ?? 0).widthPt;
      out.push({ text: run.text, xPt: x, baselinePt: line.yBaselinePt, family: face?.family ?? (run.fontId === FALLBACK_FONT_ID ? 'Courier' : '?'), bold: face?.weight === 'bold', sizePt: run.sizePt, colour: run.colour.join(','), widthPt: width });
      x += width;
    }
  }
  return out;
}

/** The card's tolerance for a position: 1 pt. */
export const TOLERANCE_PT = 1;
/** What the corpus achieves for a size: the oracle is whole millipoints. */
export const MILLIPOINT_PT = 0.01;

const isCourier = (family: string): boolean => /courier/i.test(family);

/** Why `got` is not the oracle's run `want`, empty when it is: text, face, weight, size, colour and position within 1 pt. A Courier-family run matches a Courier-family oracle face: the embedded Courier stands in for Courier New (SF-5). */
export function causesOf(want: RenderCacheTextRun, got: PlacedRun | undefined): string[] {
  if (got === undefined) return ['no run'];
  const dx = Math.abs(got.xPt - want.xPt);
  const dy = Math.abs(got.baselinePt - want.baselineYPt);
  return [
    got.text !== want.text ? `text "${got.text}" vs "${want.text}"` : '',
    !sameFamily(got.family, want.typeface) && !(isCourier(got.family) && isCourier(want.typeface)) ? `face ${got.family} vs ${want.typeface}` : '',
    got.bold !== want.bold && got.family !== 'Courier' ? `bold ${got.bold} vs ${want.bold}` : '',
    Math.abs(got.sizePt - want.sizePt) > MILLIPOINT_PT ? `size ${got.sizePt} vs ${want.sizePt}` : '',
    got.colour !== want.colour.join(',') ? `colour ${got.colour} vs ${want.colour.join(',')}` : '',
    dx > TOLERANCE_PT ? `x off by ${dx.toFixed(3)} pt` : '',
    dy > TOLERANCE_PT ? `baseline off by ${dy.toFixed(3)} pt` : '',
  ].filter((cause) => cause !== '');
}
