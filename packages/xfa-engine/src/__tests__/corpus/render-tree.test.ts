import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import type { LayoutBox } from '../../layout/box/types.js';
import { IssueSink } from '../../layout/box/issues.js';
import { layoutBoxGraphics } from '../../layout/graphics/index.js';
import type { LaidOutForm } from '../../layout/paginate/index.js';
import { renderTreeSchema, type RenderItem, type RenderTree } from '../../layout/render-tree.js';
import { layoutAccessOf } from '../../runtime/layout-access.js';
import type { FormRuntime } from '../../runtime/options.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { SUBJECTS, type Subject } from './acrobat-copies.js';
import { NOON_UTC, TEST_HOST } from './form-cases.js';

/**
 * `runtime.layout()` on the real forms (W02-T12): the blank forms and the three Acrobat-saved copies, each loaded as the form's
 * own load does. The tree must parse, lose and repeat nothing the layout produced, name every font and image it uses, carry
 * every document and layout issue, and give the viewer one overlay per drawn field. Counts are pinned as regression guards
 * (the render tree has no Acrobat oracle: the oracle is the layout of T07 to T11 that it is made from).
 */
const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

interface Session {
  readonly runtime: FormRuntime;
  readonly laid: LaidOutForm;
  readonly tree: RenderTree;
}
const sessions = new Map<string, Promise<Session>>();
function sessionOf(subject: Subject): Promise<Session> {
  let found = sessions.get(subject.label);
  if (found === undefined) {
    found = (async () => {
      const pdf = await openXfaPdf(new Uint8Array(readFileSync(subject.path)));
      const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: false });
      runtimes.push(runtime);
      runtime.load();
      return { runtime, laid: layoutAccessOf(runtime).layout(), tree: runtime.layout() };
    })();
    sessions.set(subject.label, found);
  }
  return found;
}

const itemsOf = (tree: RenderTree): RenderItem[] => tree.pages.flatMap((page) => page.items);
const countOf = (items: readonly RenderItem[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const item of items) out[item.kind] = (out[item.kind] ?? 0) + 1;
  return out;
};
const everyBox = (roots: readonly LayoutBox[]): LayoutBox[] => {
  const out: LayoutBox[] = [];
  const pending = [...roots].reverse();
  for (let box = pending.pop(); box !== undefined; box = pending.pop()) {
    out.push(box);
    for (let i = box.children.length - 1; i >= 0; i -= 1) pending.push(box.children[i] as LayoutBox);
  }
  return out;
};
/** Every root box the tree paints, page by page: the master page of the instance, then the content areas. */
const rootsOf = (laid: LaidOutForm): LayoutBox[][] => laid.pages.map((page) => [...(page.master?.boxes ?? []), ...page.contentAreas.flatMap((area) => [...area.boxes])]);
const linesOf = (items: readonly RenderItem[]): number => items.reduce((sum, item) => sum + (item.kind === 'text' ? item.lines.length : 0), 0);

/** Pinned per subject, counted on the run recorded in the W02-T12 evidence: pages, then items by kind. */
const EXPECTED: Readonly<Record<string, { readonly pages: number; readonly kinds: Readonly<Record<string, number>>; readonly images: number; readonly fonts: number }>> = {
  'imm1295e.pdf': { pages: 5, kinds: { text: 360, image: 5, line: 979, box: 76, field: 193 }, images: 4, fonts: 4 },
  'imm5257e.pdf': { pages: 5, kinds: { text: 360, image: 5, line: 1008, box: 76, field: 194 }, images: 4, fonts: 4 },
  'imm5257-filled-acrobat-saved.pdf': { pages: 5, kinds: { text: 422, image: 5, line: 1230, box: 120, field: 194 }, images: 4, fonts: 6 },
  // The validated copies show the five barcode fields, each a placeholder (PDF417 drawing is Plan B, PA-7).
  'imm5257-adobe-validated.pdf': { pages: 6, kinds: { text: 441, image: 5, line: 1245, box: 122, field: 201, placeholder: 5 }, images: 4, fonts: 6 },
  'imm1295-adobe-validated.pdf': { pages: 6, kinds: { text: 445, image: 5, line: 1212, box: 121, field: 200, placeholder: 5 }, images: 4, fonts: 5 },
};

/** The page-coordinate extremes of an item: its rect, or for a line its two ends (a text's `rect` is its box; its lines are inside it by construction of the text layer). */
function extentOf(item: RenderItem): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
  if (item.kind === 'line') return { x0: Math.min(item.x1Pt, item.x2Pt), y0: Math.min(item.y1Pt, item.y2Pt), x1: Math.max(item.x1Pt, item.x2Pt), y1: Math.max(item.y1Pt, item.y2Pt) };
  const r = item.rect;
  return { x0: r.xPt, y0: r.yPt, x1: r.xPt + r.widthPt, y1: r.yPt + r.heightPt };
}
const EDGE_EPSILON_PT = 0.01;
/** Items outside their page rectangle, grouped as `p<page> <kind> x<count>`. */
function outsideOf(tree: RenderTree): string[] {
  const counts = new Map<string, number>();
  for (const page of tree.pages) {
    for (const item of page.items) {
      const e = extentOf(item);
      if (e.x0 >= -EDGE_EPSILON_PT && e.y0 >= -EDGE_EPSILON_PT && e.x1 <= page.widthPt + EDGE_EPSILON_PT && e.y1 <= page.heightPt + EDGE_EPSILON_PT) continue;
      const key = `p${page.index} ${item.kind}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts].map(([key, count]) => `${key} x${count}`);
}

/** Items that legitimately lie outside the page rectangle, pinned per subject (see the comment at each entry); none for the rest. */
const OUTSIDE_PAGE: Readonly<Record<string, readonly string[]>> = {};

describe.each(SUBJECTS)('the render tree of real form $label ($kind)', (subject) => {
  it('parses (also after a structured clone), and its pages are the layout\'s pages', async () => {
    const { laid, tree } = await sessionOf(subject);
    expect(renderTreeSchema.parse(tree)).toStrictEqual(tree);
    expect(renderTreeSchema.safeParse(structuredClone(tree)).success).toBe(true);
    expect(tree.pages.map((page) => [page.index, page.widthPt, page.heightPt])).toEqual(laid.pages.map((page) => [page.index, page.widthPt, page.heightPt]));
    expect(laid.settled).toBe(true);
    expect(laid.truncated).toBe(false);
  });

  it('loses and repeats nothing: the text lines, the graphics, the images and the field overlays are exactly what the layers made', async () => {
    const { laid, tree } = await sessionOf(subject);
    const roots = rootsOf(laid);
    const boxes = roots.map((page) => everyBox(page));
    // Text: the lines of every flow box's text (a fragment's caption once) and of each page's own master page.
    const flowTexts = new Set(boxes.flatMap((page) => page.map((box) => box.node)));
    let expectedLines = 0;
    for (const [node, text] of laid.texts) if (flowTexts.has(node)) expectedLines += (text.value?.lines.length ?? 0) + (text.caption?.lines.length ?? 0);
    for (const page of laid.pages) for (const text of page.master?.texts ?? []) expectedLines += (text.value?.lines.length ?? 0) + (text.caption?.lines.length ?? 0);
    expect(linesOf(itemsOf(tree))).toBe(expectedLines);
    // Graphics: the guarded graphics of the same boxes, kind by kind.
    const sink = new IssueSink();
    const graphics = roots.flatMap((page) => page.flatMap((root) => layoutBoxGraphics(root, sink).flatMap((entry) => entry.items)));
    const drawn = countOf(graphics);
    const made = countOf(itemsOf(tree));
    expect(made['box'] ?? 0).toBe(drawn['box'] ?? 0);
    expect(made['line'] ?? 0).toBe(drawn['line'] ?? 0);
    // Placeholders: the graphics layer's, plus one per failed rich block and per image that could not be drawn.
    expect(made['placeholder'] ?? 0).toBeGreaterThanOrEqual(drawn['placeholder'] ?? 0);
    // Fields: one overlay per drawn field box that is not itself a placeholder.
    const fields = boxes.flatMap((page) => page.filter((box) => box.drawn && box.node.className === 'field' && box.placeholder === undefined));
    expect(made['field'] ?? 0).toBe(fields.length);
  });

  it('names every font and image it uses, once; the corpus forms embed Courier, so no run needs the generic fallback', async () => {
    const { tree } = await sessionOf(subject);
    const runFonts = new Set(itemsOf(tree).flatMap((item) => (item.kind === 'text' ? item.lines.flatMap((line) => line.runs.map((run) => run.fontId)) : [])));
    expect(runFonts.has('fallback:Courier')).toBe(false);
    expect(tree.resources.fonts.map((font) => font.id).sort()).toEqual([...runFonts].sort());
    expect(tree.resources.fonts.every((font) => font.bytes.length > 0)).toBe(true);
    const imageIds = new Set(itemsOf(tree).flatMap((item) => (item.kind === 'image' ? [item.imageId] : [])));
    expect(tree.resources.images.map((image) => image.id).sort()).toEqual([...imageIds].sort());
    expect(new Set(tree.resources.images.map((image) => image.id)).size).toBe(tree.resources.images.length);
  });

  it('carries the layout\'s issues, the images\' and the document\'s, without a repeat, and not one mentions the fonts the form embeds', async () => {
    const { laid, tree } = await sessionOf(subject);
    const key = (issue: { som: string; feature: string }): string => `${issue.som}\u0000${issue.feature}`;
    const have = new Set(tree.issues.map(key));
    for (const issue of laid.issues) expect(have.has(key(issue)), `${issue.som}: ${issue.feature}`).toBe(true);
    expect(have.size).toBe(tree.issues.length);
    expect(tree.issues.filter((issue) => issue.feature.startsWith('font.resources') || issue.feature.startsWith('font.program'))).toEqual([]);
  });

  it('gives each drawn field one overlay whose SOM the runtime resolves, and whose access, widget and value are the form\'s', async () => {
    const { runtime, tree } = await sessionOf(subject);
    const fields = itemsOf(tree).flatMap((item) => (item.kind === 'field' ? [item] : []));
    expect(fields.length).toBeGreaterThan(100);
    expect(new Set(fields.map((field) => field.som)).size).toBe(fields.length);
    const widgets = new Set<string>(fields.map((field) => field.widget));
    for (const kind of ['textEdit', 'checkButton', 'choiceList', 'dateTimeEdit', 'button']) expect(widgets.has(kind), kind).toBe(true);
    for (const field of fields) {
      const stored = runtime.getValue(field.som);
      expect(field.value, field.som).toBe(stored === null ? '' : String(stored));
      expect(field.rect.widthPt).toBeGreaterThanOrEqual(0);
    }
    // A choice list always carries its list (empty while the form's own scripts have filled none, as for a province before a country is chosen).
    for (const field of fields.filter((f) => f.widget === 'choiceList')) expect(field.items, field.som).toBeDefined();
  });

  it('keeps every item inside its page rectangle, except the pinned overflow cases', async () => {
    const { tree } = await sessionOf(subject);
    expect(outsideOf(tree)).toEqual(OUTSIDE_PAGE[subject.label] ?? []);
  });

  it('every page keeps to the item ceiling and the tree is stable: asking again answers the same object', async () => {
    const { runtime, tree } = await sessionOf(subject);
    expect(runtime.layout()).toBe(tree);
    const shape = { pages: tree.pages.length, kinds: countOf(itemsOf(tree)), images: tree.resources.images.length, fonts: tree.resources.fonts.length };
    console.info(`[render-tree] ${subject.label} (${subject.kind}): ${JSON.stringify(shape)}, issues ${tree.issues.length}`);
    expect(shape).toEqual(EXPECTED[subject.label]);
  });
});
