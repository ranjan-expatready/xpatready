import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BoxContext, buildChildBoxes, IssueSink, layoutBoxes, layoutModeOf, nominalExtent, type LayoutBox, type Rect } from '../../layout/box/index.js';
import { parseMeasure, TEMPLATE_LENGTH_UNIT } from '../../layout/units.js';
import { createFormDom, type FormDom, type FormNode } from '../../model/form/index.js';
import { loadTemplate, type TemplateNode } from '../../model/template/index.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Running this file directly without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (files.length === 0) throw new Error(`NOT EXECUTED: no *.pdf files in ${dir}`);

/** Positioned children (fields, draws, subforms, exclGroups, areas) of containers in position layout, per known corpus file (counted from the template and re-counted through the layout). */
const EXPECTED_POSITIONED: Readonly<Record<string, number>> = { 'imm1295e.pdf': 577, 'imm5257e.pdf': 569 };

/** Millipoint rounding of the template's mm values: far below a hundredth of a point. */
const TOLERANCE_PT = 0.01;

const CONTAINER_FRAME: Rect = { xPt: 0, yPt: 0, widthPt: 0, heightPt: 0 };

async function load(file: string): Promise<FormDom> {
  const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
  return createFormDom(loadTemplate(pdf.packet('template').text()), parseXml(pdf.packet('datasets').text()));
}

const positionedParents = (dom: FormDom): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (layoutModeOf(n) === 'position') out.push(n);
  });
  return out;
};

const pt = (node: FormNode, name: string): number | undefined => {
  const text = node.attr(name);
  return text === undefined ? undefined : parseMeasure(text, TEMPLATE_LENGTH_UNIT, name);
};

interface Placed {
  readonly parent: FormNode;
  readonly box: LayoutBox;
}

/** Lays out the children of every position-layout container in its own frame (origin 0, 0): positions are then the template's own x and y. */
function placeAll(dom: FormDom): { readonly placed: Placed[]; readonly ctx: BoxContext } {
  const ctx = new BoxContext();
  const placed: Placed[] = [];
  for (const parent of positionedParents(dom)) {
    for (const box of buildChildBoxes(parent, CONTAINER_FRAME, 'visible', ctx, 0)) placed.push({ parent, box });
  }
  return { placed, ctx };
}

function finite(rect: Rect): boolean {
  return [rect.xPt, rect.yPt, rect.widthPt, rect.heightPt].every(Number.isFinite);
}

/** A visible box may be flat when it is a ruled line (a `line` draw) or when a growable dimension has no content to grow to. */
function flatCause(box: LayoutBox): string | undefined {
  const flatWidth = box.rect.widthPt === 0;
  const flatHeight = box.rect.heightPt === 0;
  if (!flatWidth && !flatHeight) return 'not flat';
  const isLine = box.node.className === 'draw' && box.node.children.some((c) => c.className === 'value' && c.children.some((v) => v.className === 'line'));
  if (isLine) return 'line';
  if ((flatWidth ? box.growableWidth : true) && (flatHeight ? box.growableHeight : true)) return 'growable';
  return undefined;
}

/** A template length in points, 0 when absent (the template is read here directly, not through the layout). */
const templatePt = (node: TemplateNode, name: string): number => {
  const text = node.attr(name);
  return text === undefined ? 0 : parseMeasure(text, TEMPLATE_LENGTH_UNIT, name);
};

const isPlainPositioned = (node: TemplateNode): boolean =>
  ['subform', 'exclGroup', 'area'].includes(node.className) && (node.attr('layout') ?? 'position') === 'position' && ['topLeft', undefined].includes(node.attr('anchorType')) && node.attr('rotate') === undefined;

/** The ancestors of `node` (nearest last) that are unrotated, topLeft-anchored containers in position layout, up to the first that is not. */
function positionedChain(node: TemplateNode): TemplateNode[] {
  const chain: TemplateNode[] = [];
  for (let up = node.parent; up !== null && isPlainPositioned(up); up = up.parent) chain.unshift(up);
  return chain;
}

const findBox = (box: LayoutBox, target: FormNode): LayoutBox | undefined =>
  box.node === target ? box : box.children.map((c) => findBox(c, target)).find((found) => found !== undefined);

describe.each(files)('positioned boxes on real form %s', (file) => {
  it('a nested field lands at the sum of its ancestors x, y and margins, computed from the template alone (nested oracle)', async () => {
    const dom = await load(file);
    // The deepest field whose whole chain up to the topmost positioned ancestor is positioned, unrotated and topLeft. (No container margin in such a chain is non-zero in either form, so the margin term here is 0; margins under nesting are proven by the unit tests.)
    const candidates = dom.model.nodes
      .filter((n) => n.className === 'field' && n.attr('anchorType') === undefined && n.attr('rotate') === undefined)
      .map((field) => ({ field, chain: positionedChain(field) }))
      .filter(({ chain }) => chain.length >= 3 && chain.reduce((sum, a) => sum + templatePt(a, 'x'), 0) > 0)
      .sort((a, b) => b.chain.length - a.chain.length);
    const pick = candidates[0];
    expect(pick, 'a nested field exists').toBeDefined();
    if (pick === undefined) return;
    const { field, chain } = pick;
    const insetOf = (a: TemplateNode, name: string): number => templatePt(a.children.find((c) => c.className === 'margin') ?? a, name);
    const expectedX = [...chain, field].reduce((sum, n) => sum + templatePt(n, 'x'), 0) + chain.reduce((sum, a) => sum + insetOf(a, 'leftInset'), 0);
    const expectedY = [...chain, field].reduce((sum, n) => sum + templatePt(n, 'y'), 0) + chain.reduce((sum, a) => sum + insetOf(a, 'topInset'), 0);
    let rootForm: FormNode | undefined;
    let fieldForm: FormNode | undefined;
    dom.walk((n) => {
      if (n.template === chain[0]) rootForm = n;
      if (n.template === field) fieldForm = n;
    });
    expect(rootForm).toBeDefined();
    expect(fieldForm).toBeDefined();
    if (rootForm === undefined || fieldForm === undefined) return;
    const { box } = layoutBoxes(rootForm, CONTAINER_FRAME);
    const found = findBox(box, fieldForm);
    expect(found, 'the field is in the tree laid out from the page root').toBeDefined();
    expect(found?.rect.xPt).toBeCloseTo(expectedX, 2);
    expect(found?.rect.yPt).toBeCloseTo(expectedY, 2);
    expect(expectedX, 'the ancestors really shift it').not.toBeCloseTo(templatePt(field, 'x'), 2);
    console.info(`[positioned-boxes] ${file}: nested oracle ${chain.length} ancestors (${chain.map((a) => a.name).join('>')}) > ${field.name} at (${expectedX.toFixed(2)}, ${expectedY.toFixed(2)}) pt`);
  });

  it('every positioned child with x, y, w and h written gets exactly that rectangle in its parent (A2)', async () => {
    const { placed } = placeAll(await load(file));
    let checked = 0;
    let worst = 0;
    for (const { box } of placed) {
      const node = box.node;
      if (node.className !== 'field' && node.className !== 'draw') continue;
      const [x, y, w, h] = [pt(node, 'x'), pt(node, 'y'), pt(node, 'w'), pt(node, 'h')];
      if (x === undefined || y === undefined || w === undefined || h === undefined) continue;
      if (box.anchorType !== 'topLeft' || box.rotation !== 0) continue;
      checked += 1;
      for (const [got, want] of [[box.rect.xPt, x], [box.rect.yPt, y], [box.rect.widthPt, w], [box.rect.heightPt, h]] as const) worst = Math.max(worst, Math.abs(got - want));
    }
    expect(checked, 'fields and draws with all four written, topLeft, unrotated').toBeGreaterThan(100);
    expect(worst).toBeLessThanOrEqual(TOLERANCE_PT);
    console.info(`[positioned-boxes] ${file}: ${checked} fields and draws with x, y, w, h written matched, worst deviation ${worst.toExponential(2)} pt`);
  });

  it('a missing x or y is 0, and w and h come from the template alone for every positioned field and draw', async () => {
    const { placed } = placeAll(await load(file));
    for (const { box } of placed) {
      if ((box.node.className !== 'field' && box.node.className !== 'draw') || box.anchorType !== 'topLeft' || box.rotation !== 0) continue;
      expect(Math.abs(box.rect.xPt - (pt(box.node, 'x') ?? 0)), box.node.name).toBeLessThanOrEqual(TOLERANCE_PT);
      expect(Math.abs(box.rect.yPt - (pt(box.node, 'y') ?? 0)), box.node.name).toBeLessThanOrEqual(TOLERANCE_PT);
      const extent = nominalExtent(box.node, new IssueSink());
      expect(box.rect.widthPt).toBeCloseTo(extent.widthPt, 2);
      expect(box.rect.heightPt).toBeCloseTo(extent.heightPt, 2);
    }
  });

  it('counts the positioned nodes and finds no placeholder, NaN, negative size or unexplained flat visible box', async () => {
    const dom = await load(file);
    const { placed, ctx } = placeAll(dom);
    const flat: string[] = [];
    for (const { box } of placed) {
      expect(finite(box.rect), box.node.name).toBe(true);
      expect(finite(box.contentRect), box.node.name).toBe(true);
      expect(box.rect.widthPt, box.node.name).toBeGreaterThanOrEqual(0);
      expect(box.rect.heightPt, box.node.name).toBeGreaterThanOrEqual(0);
      expect(box.placeholder, `${box.node.className} ${box.node.name}`).toBeUndefined();
      if (box.drawn && flatCause(box) === undefined) flat.push(`${box.node.className}:${box.node.name}`);
    }
    expect(flat).toEqual([]);
    // Counted a second way, straight from the template: boxed nodes whose parent places by position (an absent `layout` is `position`).
    const BOXED = new Set(['field', 'draw', 'subform', 'exclGroup', 'area']);
    const fromTemplate = dom.model.nodes.filter((n) => BOXED.has(n.className) && n.parent !== null && ['subform', 'exclGroup', 'area'].includes(n.parent.className) && (n.parent.className === 'area' || (n.parent.attr('layout') ?? 'position') === 'position')).length;
    expect(placed.length).toBe(fromTemplate);
    const known = EXPECTED_POSITIONED[file];
    if (known !== undefined) expect(placed.length).toBe(known);
    else expect(placed.length).toBeGreaterThan(0);
    console.info(`[positioned-boxes] ${file}: ${placed.length} positioned nodes (${placed.filter((p) => p.box.node.className === 'field').length} fields, ${placed.filter((p) => p.box.node.className === 'draw').length} draws), ${ctx.sink.issues.length} issues`);
  });

  it('a rotated draw turns about its anchor into a box of swapped size that stays in front of the parent origin', async () => {
    const { placed } = placeAll(await load(file));
    const turned = placed.filter((p) => p.box.rotation !== 0);
    expect(turned.length).toBeGreaterThanOrEqual(9);
    for (const { box } of turned) {
      expect(box.rotation).toBe(90);
      const extent = nominalExtent(box.node, new IssueSink());
      expect(box.rect.widthPt).toBeCloseTo(extent.heightPt, 2);
      expect(box.rect.heightPt).toBeCloseTo(extent.widthPt, 2);
      expect(box.rect.xPt).toBeGreaterThanOrEqual(0);
      expect(box.rect.yPt).toBeGreaterThanOrEqual(0);
    }
  });

  it('a middleCenter anchor puts the middle of the box on (x, y) (the corpus has one such field, in an exclGroup)', async () => {
    const { placed } = placeAll(await load(file));
    const anchored = placed.filter((p) => p.box.anchorType === 'middleCenter' && p.box.node.className === 'field');
    expect(anchored.length).toBeGreaterThanOrEqual(1);
    for (const { box } of anchored) {
      expect(box.rect.xPt + box.rect.widthPt / 2).toBeCloseTo(pt(box.node, 'x') ?? 0, 2);
      expect(box.rect.yPt + box.rect.heightPt / 2).toBeCloseTo(pt(box.node, 'y') ?? 0, 2);
    }
  });

  it('presence: hidden boxes take no space, invisible ones do, and relevant -print boxes are still drawn', async () => {
    const { placed } = placeAll(await load(file));
    const withPrint = placed.filter((p) => p.box.relevant === '-print');
    expect(withPrint.length).toBeGreaterThanOrEqual(8);
    for (const { box } of withPrint) if (box.presence === 'visible') expect(box.drawn).toBe(true);
    expect(placed.some((p) => p.box.presence === 'hidden' && !p.box.occupiesSpace)).toBe(true);
    expect(placed.some((p) => p.box.presence === 'invisible' && p.box.occupiesSpace && !p.box.drawn)).toBe(true);
  });

  it('every issue it raises is a deferral to a named task or a caption left automatic, listed here so a new kind is noticed', async () => {
    const { ctx } = placeAll(await load(file));
    const kinds = new Map<string, number>();
    for (const issue of ctx.sink.issues) {
      const kind = issue.feature.replace(/="[^"]*"/g, '="…"').replace(/\(.*\)/, '').trim();
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    }
    console.info(`[positioned-boxes] ${file} issue kinds: ${JSON.stringify([...kinds])}`);
    for (const kind of kinds.keys()) expect(kind).toMatch(/^(layout="…"|caption reserve is automatic)/);
  });
});
