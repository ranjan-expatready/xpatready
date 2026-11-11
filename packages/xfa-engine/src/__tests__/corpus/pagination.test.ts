import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { boxesOf, placedBoxes } from '../../layout/paginate/__tests__/helpers.js';
import { loadFonts } from '../../layout/font/catalogue.js';
import { FIT_TOLERANCE_PT, layoutPages, type PagedLayout } from '../../layout/paginate/index.js';
import { createTextContext, templateTypefacesOf, type TextContext } from '../../layout/text/index.js';
import type { FormDom, FormNode } from '../../model/form/index.js';
import { createFormDom } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { loadTemplate } from '../../model/template/index.js';
import { layoutAccessOf } from '../../runtime/layout-access.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { FormRuntime } from '../../runtime/options.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';
import { packetPageAreas, SUBJECTS, type Subject } from './acrobat-copies.js';
import { NOON_UTC, TEST_HOST } from './form-cases.js';

/**
 * Pagination of the real forms (W02-T08). The tests paginate the form DOM the form's own scripts have run on, reached through
 * the runtime's layout access (W02-T09 retired the old `createFormDom` mock), with their own text context, as `flow-layout.test.ts` does.
 *
 * The oracle is the PDF itself: the `form` packet Acrobat saved lists one `pageArea` element per page it laid out, and the
 * test counts them from the packet. Nothing under test produces an expectation. A1 needs `XFA_ACROBAT_DIR`
 * (Acrobat-saved copies of the forms); without it the run says NOT EXECUTED instead of skipping.
 */
interface Result {
  readonly pdf: XfaPdf;
  readonly dom: FormDom;
  readonly paged: PagedLayout;
  readonly text: TextContext;
  /** The names of the `pageArea` instances in the `form` packet, in order: the oracle. */
  readonly packetPages: readonly string[];
}

const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

const results = new Map<string, Promise<Result>>();
function resultOf(subject: Subject): Promise<Result> {
  let found = results.get(subject.label);
  if (found === undefined) {
    found = (async () => {
      const pdf = await openXfaPdf(new Uint8Array(readFileSync(subject.path)));
      const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: false });
      runtimes.push(runtime);
      const { dom } = layoutAccessOf(runtime);
      runtime.load();
      const loaded = loadFonts((await pdf.fonts()).fonts);
      expect(loaded.issues).toEqual([]);
      const model = loadTemplate(pdf.packet('template').text());
      const text = createTextContext(loaded.faces, templateTypefacesOf(model), dom);
      return { pdf, dom, paged: layoutPages(dom, text), text, packetPages: packetPageAreas(pdf) };
    })();
    results.set(subject.label, found);
  }
  return found;
}

/** The visible-by-presence test, read from the form DOM alone: the node and every ancestor up to the root are `visible`. */
function presentOnPage(node: FormNode): boolean {
  for (let up: FormNode | null = node; up !== null && up.className !== 'form'; up = up.parent) {
    if (['pageSet', 'pageArea'].includes(up.className)) return false;
    if ((up.attr('presence') ?? 'visible') !== 'visible') return false;
  }
  return true;
}

const fieldsOf = (dom: FormDom): FormNode[] => {
  const out: FormNode[] = [];
  dom.walk((n) => {
    if (n.className === 'field') out.push(n);
  });
  return out;
};

describe.each(SUBJECTS)('pagination of the real form $label ($kind)', (subject) => {
  it('A1: the page count and the page areas are those of the form packet Acrobat saved', async () => {
    const { paged, packetPages } = await resultOf(subject);
    expect(packetPages.length).toBeGreaterThan(0);
    expect(paged.pages.map((p) => p.pageArea?.name)).toEqual(packetPages);
    expect(paged.pages).toHaveLength(packetPages.length);
    expect(paged.truncated).toBe(false);
    console.info(`[pagination] ${subject.label} (${subject.kind}): ${paged.pages.length} pages, form packet lists ${packetPages.length} (${packetPages.join(', ')})`);
  });

  it('A2: every breakBefore startNew subform is the first flowed content of its page, and every keep-intact container is whole on one page', async () => {
    const { dom, paged } = await resultOf(subject);
    const starters: FormNode[] = [];
    const kept: FormNode[] = [];
    dom.walk((n) => {
      if (n.className !== 'subform' || !presentOnPage(n)) return;
      if (n.childrenOfClass('breakBefore').some((b) => b.attr('startNew') === '1')) starters.push(n);
      if (n.childrenOfClass('keep').some((k) => k.attr('intact') === 'contentArea')) kept.push(n);
    });
    for (const node of starters) {
      const first = boxesOf(paged, node)[0];
      if (first === undefined) throw new Error(`${somExpressionOf(node)} is not placed`);
      const page = paged.pages[first.page];
      const areaIndex = page?.contentAreas.findIndex((a) => a.boxes.includes(first.box)) ?? -1;
      expect(areaIndex, `${somExpressionOf(node)} is a top-level box of the first content area of its page`).toBe(0);
      const area = page?.contentAreas[areaIndex];
      expect(area?.boxes[0]).toBe(first.box);
      expect(first.box.rect.yPt).toBeCloseTo(area?.rect.yPt ?? Number.NaN, 6);
    }
    for (const node of kept) {
      const pieces = boxesOf(paged, node);
      expect(new Set(pieces.map((entry) => entry.page)).size, `${somExpressionOf(node)} is on one page`).toBe(1);
      expect(pieces, `${somExpressionOf(node)} is in one piece`).toHaveLength(1);
    }
    console.info(`[pagination] ${subject.label}: ${starters.length} breakBefore startNew subforms (${starters.map((n) => n.name).join(', ')}), each first on its page; ${kept.length} keep-intact containers, each whole on one page`);
  });

  it('A3: no content lost or repeated: the laid-out fields are exactly the visible fields of the form DOM', async () => {
    const { dom, paged } = await resultOf(subject);
    const expected = new Map<string, number>();
    for (const field of fieldsOf(dom).filter(presentOnPage)) expected.set(somExpressionOf(field), (expected.get(somExpressionOf(field)) ?? 0) + 1);
    const laid = new Map<string, number>();
    for (const entry of placedBoxes(paged)) {
      if (entry.box.node.className === 'field' && entry.box.drawn) laid.set(somExpressionOf(entry.box.node), (laid.get(somExpressionOf(entry.box.node)) ?? 0) + 1);
    }
    expect(laid.size).toBe(expected.size);
    expect([...laid.entries()].sort()).toEqual([...expected.entries()].sort());
    expect([...laid.values()].every((n) => n === 1)).toBe(true);
    console.info(`[pagination] ${subject.label}: ${laid.size} visible fields in the form DOM, ${laid.size} laid out once each`);
  });

  it('every top-level piece of content ends inside its content area (within the fit tolerance), and the pagination raises none of its own issues', async () => {
    const { paged } = await resultOf(subject);
    let worst = 0;
    for (const page of paged.pages) {
      for (const area of page.contentAreas) {
        for (const box of area.boxes) {
          worst = Math.max(worst, box.rect.yPt + box.rect.heightPt - (area.rect.yPt + area.rect.heightPt));
          expect(box.rect.yPt, `${box.node.name} starts in its area`).toBeGreaterThanOrEqual(area.rect.yPt - 1e-6);
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(FIT_TOLERANCE_PT + 0.5);
    const own = paged.issues.filter((i) => /taller than an empty content area|break inside|keep |names no page area|not modelled|no pageSet|has no usable medium|has no height|pages in a row|page set has no/.test(i.feature));
    expect(own).toEqual([]);
    console.info(`[pagination] ${subject.label}: worst overrun of a content area ${worst.toFixed(3)} pt (tolerance ${FIT_TOLERANCE_PT} pt), no pagination issues`);
  });

  it('is deterministic: the same flow cut twice gives the same boxes on the same pages', async () => {
    const { dom, paged, text } = await resultOf(subject);
    const again = layoutPages(dom, text);
    const shape = (p: PagedLayout): string[][] => p.pages.map((page) => page.contentAreas.flatMap((a) => a.boxes.map((b) => `${b.node.name}@${b.rect.yPt.toFixed(3)}+${b.rect.heightPt.toFixed(3)}`)));
    expect(shape(again)).toEqual(shape(paged));
  });
});

describe.each(SUBJECTS)('regression pin for $label ($kind): the minH decision behind the page count', (subject) => {
  it('the Office Use Only box is on page 1 and the page-1 sections take their content height (Page1.MaritalStatus has minH 58.274 mm, content 26.67 mm; a floor would push the box to a page of its own)', async () => {
    const { dom, paged } = await resultOf(subject);
    const page1 = dom.root.children.find((c) => c.name === 'Page1' && c.className === 'subform');
    const office = page1?.children.find((c) => c.name === 'OfficeUseOnly');
    const marital = page1?.children.find((c) => c.name === 'MaritalStatus');
    expect(office).toBeDefined();
    const placed = placedBoxes(paged);
    expect(placed.find((e) => e.box.node === office)?.page).toBe(0);
    const box = placed.find((e) => e.box.node === marital)?.box;
    const sectionA = marital?.children.find((c) => c.name === 'SectionA');
    expect(box?.rect.heightPt).toBeCloseTo(((Number.parseFloat(sectionA?.attr('h') ?? 'NaN')) / 25.4) * 72, 2);
  });
});

describe('the validated copies have one page more than the blank forms: the barcode page', () => {
  it.each(SUBJECTS.filter((s) => s.kind === 'validated'))('$label: the last page starts with the Barcodes subform', async (subject) => {
    const { paged, dom } = await resultOf(subject);
    const barcodes = dom.root.children.find((c) => c.name === 'Barcodes');
    expect(barcodes?.attr('presence')).toBe('visible');
    const last = paged.pages[paged.pages.length - 1];
    expect(last?.contentAreas[0]?.boxes[0]?.node).toBe(barcodes);
    const blank = SUBJECTS.find((s) => s.kind === 'blank' && s.label.startsWith(subject.label.slice(0, 7)));
    if (blank !== undefined) expect(paged.pages.length).toBe((await resultOf(blank)).paged.pages.length + 1);
  });
});

describe.each(SUBJECTS.filter((s) => s.kind === 'blank'))('the template state of $label (no script has run)', (subject) => {
  it('is also cut into the pages the form packet lists: the box the scripts later enlarge and the message they later hide cancel out', async () => {
    const { pdf, packetPages } = await resultOf(subject);
    const loaded = loadFonts((await pdf.fonts()).fonts);
    const model = loadTemplate(pdf.packet('template').text());
    const dom = createFormDom(model, parseXml(pdf.packet('datasets').text()));
    const paged = layoutPages(dom, createTextContext(loaded.faces, templateTypefacesOf(model), dom));
    expect(paged.pages.map((p) => p.pageArea?.name)).toEqual(packetPages);
  });
});
