import { describe, expect, it } from 'vitest';
import { IssueSink } from '../../layout/box/index.js';
import { layoutFlow, type FlowLayout } from '../../layout/flow/index.js';
import { layoutBoxGraphics, type BoxGraphics } from '../../layout/graphics/index.js';
import { RENDER_TREE_VERSION, renderTreeSchema, type RenderItem } from '../../layout/render-tree.js';
import { createTextContext, templateTypefacesOf, type TextContext } from '../../layout/text/index.js';
import type { FormDom, FormNode } from '../../model/form/index.js';
import { layoutAccessOf } from '../../runtime/layout-access.js';
import { blankSession, filledOutcome, FORM_CASES, type FormCase } from './form-cases.js';
import { load, nodesOf, type Loaded } from './text-corpus.js';

const textFor = (loaded: Loaded, dom: FormDom): TextContext => createTextContext(loaded.faces, templateTypefacesOf(loaded.model), dom);

/** Every drawn box's graphics: the flow tree and the master pages. */
function paintAll(flow: FlowLayout, sink: IssueSink): BoxGraphics[] {
  return [...layoutBoxGraphics(flow.root, sink), ...flow.masterPages.flatMap((page) => page.boxes.flatMap((box) => layoutBoxGraphics(box, sink)))];
}

// ---- expectations computed from the form DOM's own attributes, not from the graphics module ----------------------------------

const presenceOf = (n: FormNode): string => n.attr('presence') ?? 'visible';
/** A node is drawn when it and every ancestor is `visible` (no `relevant` print-only element exists in the corpus). */
function shown(node: FormNode): boolean {
  for (let n: FormNode | null = node; n !== null; n = n.parent) if (presenceOf(n) !== 'visible') return false;
  return true;
}
const hasThickness = (edge: FormNode | undefined): boolean => parseFloat(edge?.attr('thickness') ?? '0.5pt') > 0;

/** The strokes a border-like node paints: its visible sides (one to four written edges, the last repeating; none written = the default edge) with a thickness. */
function strokesOf(owner: FormNode | undefined): number {
  if (owner === undefined || presenceOf(owner) !== 'visible') return 0;
  const written = owner.childrenOfClass('edge').slice(0, 4);
  let n = 0;
  for (let side = 0; side < 4; side += 1) {
    const edge = written.length === 0 ? undefined : written[Math.min(side, written.length - 1)];
    if (edge !== undefined && (presenceOf(edge) !== 'visible' || !hasThickness(edge))) continue;
    n += 1;
  }
  return n;
}
const fillsOf = (owner: FormNode | undefined): number => (owner === undefined || presenceOf(owner) !== 'visible' ? 0 : owner.childrenOfClass('fill').filter((f) => presenceOf(f) === 'visible').length);
const paintOf = (owner: FormNode | undefined): number => strokesOf(owner) + fillsOf(owner);

/** A line paints one stroke from its first edge (the default edge when it writes none) unless that edge is hidden or has no thickness. */
function lineStroke(line: FormNode): number {
  const edge = line.childrenOfClass('edge')[0];
  return edge === undefined || (presenceOf(edge) === 'visible' && hasThickness(edge)) ? 1 : 0;
}

const widgetOf = (field: FormNode): FormNode | undefined => field.childrenOfClass('ui')[0]?.oneOfChild;
const valueOf = (draw: FormNode): FormNode | undefined => draw.childrenOfClass('value')[0]?.oneOfChild;

/** How many items the box at `node` should paint, for a node whose box is drawn and not a checkButton (those are checked separately). */
function expectedItems(node: FormNode): number {
  let n = paintOf(node.childrenOfClass('border')[0]);
  if (node.className === 'draw') {
    const shape = valueOf(node);
    if (shape?.className === 'line') n += lineStroke(shape);
    if (shape?.className === 'rectangle') n += paintOf(shape);
  }
  if (node.className === 'field') {
    const widget = widgetOf(node);
    n += paintOf(widget?.childrenOfClass('border')[0]);
    if (widget?.className === 'barcode') n += 1;
  }
  return n;
}

const isCheck = (node: FormNode): boolean => node.className === 'field' && widgetOf(node)?.className === 'checkButton';

interface Expected {
  /** Boxes that paint something, and the line and box items they paint, after load() on the blank form. */
  readonly boxes: number;
  readonly lineItems: number;
  readonly boxItems: number;
  /** Visible draws whose value is a line / a rectangle (the template has 28 / 26 line draws and 2 / 3 rectangles; the rest are hidden or in hidden containers). */
  readonly lineDraws: number;
  readonly rectangles: number;
  readonly checkBoxes: number;
  /** Check boxes that hold their on value on the form filled with the synthetic-person fixture. */
  readonly markedAfterFixture: number;
  /** Lowered and raised borders in the template, and how many are shown after load(): the tones are exercised by unit tests only. */
  readonly tonalBorders: number;
  readonly tonalShown: number;
  /** The barcode placeholders after the Validate that passes, every one this size. */
  readonly barcodes: number;
  readonly barcodeSizePt: readonly [number, number];
}

/** Pinned per corpus file, counted on the run recorded in the W02-T10 evidence. These pins are regression guards, not Acrobat oracles. */
const EXPECTED: Readonly<Record<string, Expected>> = {
  'imm1295e.pdf': { boxes: 316, lineItems: 967, boxItems: 76, lineDraws: 25, rectangles: 2, checkBoxes: 48, markedAfterFixture: 20, tonalBorders: 34, tonalShown: 0, barcodes: 5, barcodeSizePt: [270, 138] },
  'imm5257e.pdf': { boxes: 320, lineItems: 996, boxItems: 76, lineDraws: 23, rectangles: 2, checkBoxes: 48, markedAfterFixture: 20, tonalBorders: 33, tonalShown: 0, barcodes: 5, barcodeSizePt: [270, 138] },
};
const expectedFor = (file: string): Expected => {
  const found = EXPECTED[file];
  if (found === undefined) throw new Error(`no pinned counts for ${file}`);
  return found;
};

// A2 is a SELF-CONSISTENCY check, not an oracle: the expectations are counted from the form DOM's own attributes. The renderCache
// has no stroke or fill record for borders, lines or rectangles (its only `line` records are link underlines, pinned in render-cache.test.ts).
describe.each(FORM_CASES)('graphics self-consistency of the real form $file after load()', (c: FormCase) => {
  async function loadedLayout(): Promise<{ flow: FlowLayout; dom: FormDom; loaded: Loaded; entries: BoxGraphics[]; sink: IssueSink }> {
    const loaded = await load(c.file);
    const { runtime } = await blankSession(c);
    const { dom } = layoutAccessOf(runtime);
    try {
      const flow = layoutFlow(dom, textFor(loaded, dom));
      const sink = new IssueSink();
      return { flow, dom, loaded, entries: paintAll(flow, sink), sink };
    } finally {
      runtime.dispose();
    }
  }

  it('A2 (self-consistency): every drawn box paints exactly the strokes and fills its border, widget border, line or rectangle write, and the totals are the visible inventory', async () => {
    const { dom, entries } = await loadedLayout();
    const byNode = new Map(entries.map((e) => [e.box.node, e]));
    const drawn = [...nodesOf(dom, 'subform'), ...nodesOf(dom, 'exclGroup'), ...nodesOf(dom, 'field'), ...nodesOf(dom, 'draw')].filter(shown);
    let strokes = 0;
    let boxes = 0;
    for (const node of drawn) {
      if (isCheck(node)) continue;
      const items = byNode.get(node)?.items ?? [];
      expect(items.length, `${node.className} ${node.name}`).toBe(expectedItems(node));
    }
    for (const entry of entries) {
      strokes += entry.items.filter((i) => i.kind === 'line').length;
      boxes += entry.items.filter((i) => i.kind === 'box').length;
    }
    const lines = drawn.filter((n) => n.className === 'draw' && valueOf(n)?.className === 'line');
    const rects = drawn.filter((n) => n.className === 'draw' && valueOf(n)?.className === 'rectangle');
    const checks = drawn.filter(isCheck);
    console.info(`[graphics] ${c.file}: ${entries.length} boxes paint ${strokes} line items and ${boxes} box items; draws with a line ${lines.length}, with a rectangle ${rects.length}, visible check boxes ${checks.length}`);
    const want = expectedFor(c.file);
    expect({ boxes: entries.length, lineItems: strokes, boxItems: boxes, lineDraws: lines.length, rectangles: rects.length, checkBoxes: checks.length }).toEqual({
      boxes: want.boxes,
      lineItems: want.lineItems,
      boxItems: want.boxItems,
      lineDraws: want.lineDraws,
      rectangles: want.rectangles,
      checkBoxes: want.checkBoxes,
    });
  });

  it('A2: no corner of the form is a round join, so every border is straight strokes (the rounded-box path is not met); no 5.08 mm rectangle is rounded', async () => {
    const { dom } = await loadedLayout();
    expect(nodesOf(dom, 'corner').filter((corner) => (corner.attr('join') ?? 'square') === 'round')).toEqual([]);
    const rects = nodesOf(dom, 'rectangle').filter((r) => r.childrenOfClass('corner').some((corner) => corner.attr('radius') === '5.08mm'));
    expect(rects.length).toBeGreaterThan(0);
  });

  it('A2: each visible check button is one 10 pt box with its fill and four strokes; the blank form has no mark', async () => {
    const { dom, entries } = await loadedLayout();
    const checks = nodesOf(dom, 'field').filter((f) => isCheck(f) && shown(f));
    expect(checks.length).toBeGreaterThan(0);
    const byNode = new Map(entries.map((e) => [e.box.node, e]));
    for (const field of checks) {
      const items = byNode.get(field)?.items ?? [];
      const widgetBorder = widgetOf(field)?.childrenOfClass('border')[0];
      expect(items.length, field.name).toBe(paintOf(widgetBorder));
      const fill = items[0];
      expect(fill?.kind === 'box' ? [fill.rect.widthPt, fill.rect.heightPt] : undefined, field.name).toEqual([10, 10]);
    }
  });

  it('no lowered or raised border is shown after load(): the two-tone strokes are exercised by unit tests only, not by the corpus', async () => {
    const { dom, entries } = await loadedLayout();
    const tonal = [...nodesOf(dom, 'border')].filter((b) => b.childrenOfClass('edge').some((e) => ['lowered', 'raised', 'etched', 'embossed'].includes(e.attr('stroke') ?? 'solid')));
    const shownTonal = tonal.filter((b) => shown(b) && b.parent !== null && shown(b.parent) && presenceOf(b) === 'visible');
    expect({ tonalBorders: tonal.length, tonalShown: shownTonal.length }).toEqual({ tonalBorders: expectedFor(c.file).tonalBorders, tonalShown: expectedFor(c.file).tonalShown });
    // The tone of a black edge is a mid grey (the light tone); nothing of the corpus paints one.
    expect(entries.flatMap((e) => e.items).filter((i) => i.kind === 'line' && i.colour.join() === '128,128,128')).toEqual([]);
  });

  it('the paint of the form, with the graphics issues, makes a valid render tree page', async () => {
    const { entries, sink } = await loadedLayout();
    const items: RenderItem[] = entries.flatMap((e) => e.items);
    const tree = { version: RENDER_TREE_VERSION, pages: [{ index: 0, widthPt: 612, heightPt: 792, items }], resources: { fonts: [], images: [] }, issues: sink.issues };
    const parsed = renderTreeSchema.safeParse(tree);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
    expect(sink.issues).toEqual([]);
  });

  it('boxes are painted once and the work is bounded by the box count: each box paints at most 40 items', async () => {
    const { entries } = await loadedLayout();
    expect(new Set(entries.map((e) => e.box)).size).toBe(entries.length);
    for (const entry of entries) expect(entry.items.length).toBeLessThanOrEqual(40);
  });
});

describe.each(FORM_CASES)('barcode placeholders on the real form $file', (c: FormCase) => {
  const placeholders = (flow: FlowLayout): Extract<RenderItem, { kind: 'placeholder' }>[] =>
    paintAll(flow, new IssueSink())
      .flatMap((e) => e.items)
      .filter((i): i is Extract<RenderItem, { kind: 'placeholder' }> => i.kind === 'placeholder' && i.reason === 'barcode');

  it(`A2: the 5 barcode fields are hidden by load() (an ancestor is hidden; the field itself is visible in the template), so none is painted; a Validate that fails leaves them hidden; the Validate that passes shows 5 placeholders`, async () => {
    const loaded = await load(c.file);
    const barcodes = nodesOf(loaded.dom, 'field').filter((f) => widgetOf(f)?.className === 'barcode');
    expect(barcodes).toHaveLength(expectedFor(c.file).barcodes);

    const blank = await blankSession(c);
    try {
      const { dom } = layoutAccessOf(blank.runtime);
      expect(nodesOf(dom, 'field').filter((f) => widgetOf(f)?.className === 'barcode').map(shown)).toEqual(Array.from({ length: expectedFor(c.file).barcodes }, () => false));
      expect(placeholders(layoutFlow(dom, textFor(loaded, dom)))).toEqual([]);
      const verdict = blank.runtime.validate(blank.pack);
      expect(verdict.complete).toBe(false);
      expect(placeholders(layoutFlow(dom, textFor(loaded, dom)))).toEqual([]);
    } finally {
      blank.runtime.dispose();
    }

    const outcome = await filledOutcome(c);
    try {
      const { dom } = layoutAccessOf(outcome.session.runtime);
      expect(outcome.validated.complete).toBe(true);
      const found = placeholders(layoutFlow(dom, textFor(loaded, dom)));
      const want = expectedFor(c.file);
      expect(found).toHaveLength(want.barcodes);
      for (const p of found) {
        expect(p.rect.widthPt).toBeCloseTo(want.barcodeSizePt[0], 3);
        expect(p.rect.heightPt).toBeCloseTo(want.barcodeSizePt[1], 3);
      }
      console.info(`[graphics] ${c.file}: ${found.length} barcode placeholders after Validate, sizes ${found.map((p) => `${p.rect.widthPt.toFixed(1)}x${p.rect.heightPt.toFixed(1)}`).join(' ')}`);
    } finally {
      outcome.session.runtime.dispose();
    }
  });

  it('a filled form: a check box that holds its on value has the mark, and only those', async () => {
    const loaded = await load(c.file);
    const outcome = await filledOutcome(c);
    try {
      const { dom } = layoutAccessOf(outcome.session.runtime);
      const flow = layoutFlow(dom, textFor(loaded, dom));
      const byNode = new Map(paintAll(flow, new IssueSink()).map((e) => [e.box.node, e]));
      const checks = nodesOf(dom, 'field').filter((f) => isCheck(f) && shown(f));
      let marked = 0;
      for (const field of checks) {
        const on = field.childrenOfClass('items')[0]?.children[0]?.plainText ?? 'on';
        const raw = field.rawValue;
        const checked = (raw === null || String(raw) === '' ? 'off' : String(raw)) === on;
        // Structural: the box paints its widget border (fill + strokes), and a checked box adds the two strokes of the tick after it.
        const painted = byNode.get(field)?.items ?? [];
        const border = paintOf(widgetOf(field)?.childrenOfClass('border')[0]);
        expect(painted.length - border, `${field.name} (value ${String(raw)}, on ${String(on)})`).toBe(checked ? 2 : 0);
        if (checked) marked += 1;
      }
      console.info(`[graphics] ${c.file}: filled form, ${marked} of ${checks.length} visible check boxes carry the mark`);
      expect(marked).toBe(expectedFor(c.file).markedAfterFixture);
    } finally {
      outcome.session.runtime.dispose();
    }
  });
});

// The oracle's only `line` records (3, IMM5257) are link underlines that this module does not draw; they are pinned in corpus/render-cache.test.ts (EXPECTED_COUNTS) and listed as an open item on the T10 card.
