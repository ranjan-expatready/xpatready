import { describe, expect, it } from 'vitest';
import type { LayoutBox } from '../../layout/box/index.js';
import { layoutFlow, type FlowLayout } from '../../layout/flow/index.js';
import { createTextContext, templateTypefacesOf, type TextContext } from '../../layout/text/index.js';
import type { FormDom, FormNode } from '../../model/form/index.js';
import { somExpressionOf } from '../../model/som/index.js';
import { layoutAccessOf } from '../../runtime/layout-access.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { findBox } from '../../layout/flow/__tests__/helpers.js';
import { corpusPdf, FORM_CASES, NOON_UTC, TEST_HOST } from './form-cases.js';
import { files, load, nodesOf, textContext, type Loaded } from './text-corpus.js';

/** Per known corpus file, counted from the template alone (card A2: 3 tables of 5 columns; OVERVIEW survey: tb 9 / 5, row 7 / 7, table 3 / 3) and pinned. */
const LINEHEIGHT = 'lineHeight Npt is below the natural Npt: text block placed by lineHeight minus line gap';
const WIDER = 'flowed children reach Npt beyond the given w';
const EXPECTED: Readonly<Record<string, { readonly tb: number; readonly rows: number; readonly tables: number; readonly flowedChildren: number; readonly flowedContainers: number; readonly tbSubforms: number; readonly rowCaptions: number; readonly issueKinds: Readonly<Record<string, number>> }>> = {
  'imm1295e.pdf': { tb: 9, rows: 7, tables: 3, flowedChildren: 80, flowedContainers: 43, tbSubforms: 36, rowCaptions: 0, issueKinds: { [WIDER]: 3, 'font.Courier New': 1, 'hAlign="justify"': 1, [LINEHEIGHT]: 6 } },
  'imm5257e.pdf': { tb: 5, rows: 7, tables: 3, flowedChildren: 75, flowedContainers: 37, tbSubforms: 30, rowCaptions: 2, issueKinds: { [WIDER]: 2, [LINEHEIGHT]: 6 } },
};

const EPSILON_PT = 0.01;
const MM_PER_PT = 25.4 / 72;
const flowedModes = ['tb', 'row', 'table'];

/** A template length in points, read here on its own: the corpus writes only millimetres in the tables (`58.42mm`). */
function mmToPt(text: string | undefined): number {
  const match = /^(\d+(?:\.\d+)?)mm$/.exec(text ?? '');
  if (match === null) throw new Error(`expected a length in mm, got ${String(text)}`);
  return Number(match[1]) / MM_PER_PT;
}

interface Subject {
  readonly loaded: Loaded;
  readonly flow: FlowLayout;
  readonly boxes: Map<FormNode, LayoutBox>;
}
const subjects = new Map<string, Promise<Subject>>();
function subjectOf(file: string): Promise<Subject> {
  let found = subjects.get(file);
  if (found === undefined) {
    found = (async () => {
      const loaded = await load(file);
      const flow = layoutFlow(loaded.dom, textContext(loaded));
      const boxes = new Map<FormNode, LayoutBox>();
      const visit = (box: LayoutBox): void => {
        boxes.set(box.node, box);
        box.children.forEach(visit);
      };
      visit(flow.root);
      return { loaded, flow, boxes };
    })();
    subjects.set(file, found);
  }
  return found;
}

const layoutOf = (node: FormNode): string => node.attr('layout') ?? 'position';
const containersOf = (loaded: Loaded, mode: string): FormNode[] => [...nodesOf(loaded.dom, 'subform'), ...nodesOf(loaded.dom, 'exclGroup')].filter((n) => layoutOf(n) === mode);
const boxedChildrenOf = (box: LayoutBox): LayoutBox[] => box.children.filter((c) => ['subform', 'exclGroup', 'field', 'draw', 'area'].includes(c.node.className));
const occupying = (boxes: readonly LayoutBox[]): LayoutBox[] => boxes.filter((b) => b.occupiesSpace);

describe.each(files)('flowed layouts on real form %s', (file) => {
  it('counts the tb, row and table containers from the template (OVERVIEW survey 9 / 5, 7 / 7, 3 / 3) and lays every one out with its children', async () => {
    const s = await subjectOf(file);
    const counts = Object.fromEntries(flowedModes.map((mode) => [mode, containersOf(s.loaded, mode).length]));
    const known = EXPECTED[file];
    if (known !== undefined) expect(counts).toEqual({ tb: known.tb, row: known.rows, table: known.tables });
    let children = 0;
    let containers = 0;
    let tbSubforms = 0;
    for (const mode of flowedModes) {
      for (const node of containersOf(s.loaded, mode)) {
        const box = s.boxes.get(node);
        expect(box, somExpressionOf(node)).toBeDefined();
        expect(box?.placeholder, somExpressionOf(node)).toBeUndefined();
        const expectedKids = node.children.filter((c) => ['subform', 'exclGroup', 'field', 'draw', 'area'].includes(c.className)).length;
        expect(box?.children.length, `${somExpressionOf(node)} children laid out`).toBe(expectedKids);
        children += expectedKids;
        const subforms = node.children.filter((c) => ['subform', 'exclGroup'].includes(c.className)).length;
        containers += subforms;
        if (mode === 'tb') tbSubforms += subforms;
      }
    }
    console.info(`[flow-layout] ${file}: ${JSON.stringify(counts)} flowed containers, ${children} flowed children (${containers} of them subforms or exclusion groups, ${tbSubforms} in tb containers), all laid out`);
    if (known !== undefined) {
      expect(children).toBe(known.flowedChildren);
      expect(containers).toBe(known.flowedContainers);
      expect(tbSubforms, 'subforms laid out in tb containers (the 36 / 30 flowed children of the card)').toBe(known.tbSubforms);
    }
    expect(s.flow.issues.some((i) => i.feature.includes('no flow arranger given'))).toBe(false);
  });

  it('the 3 tables: every cell sits at the cumulative columnWidths offset with the column width, every cell of a row has the height of the tallest, rows stack without gaps (A2)', async () => {
    const s = await subjectOf(file);
    const tables = containersOf(s.loaded, 'table');
    expect(tables).toHaveLength(3);
    const report: string[] = [];
    for (const table of tables) {
      const tableBox = s.boxes.get(table);
      if (tableBox === undefined) throw new Error('table has no box');
      const columns = (table.attr('columnWidths') ?? '').split(/\s+/).filter((c) => c !== '').map(mmToPt);
      expect(columns).toHaveLength(5);
      let y = tableBox.rect.yPt;
      let worst = 0;
      const rows = boxedChildrenOf(tableBox);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const cells = occupying(boxedChildrenOf(row));
        expect(cells, `${row.node.name} cells`).toHaveLength(columns.length);
        const tallest = Math.max(...cells.map((c) => mmToPt(c.node.template.attr('h'))));
        let x = tableBox.rect.xPt;
        cells.forEach((cell, i) => {
          const want = columns[i] ?? 0;
          worst = Math.max(worst, Math.abs(cell.rect.xPt - x), Math.abs(cell.rect.widthPt - want), Math.abs(cell.rect.heightPt - tallest), Math.abs(cell.rect.yPt - y));
          x += want;
        });
        worst = Math.max(worst, Math.abs(row.rect.heightPt - tallest), Math.abs(row.rect.yPt - y), Math.abs(row.rect.xPt - tableBox.rect.xPt));
        expect(new Set(cells.map((c) => c.rect.heightPt.toFixed(3))).size, `${somExpressionOf(row.node)} one height per row`).toBe(1);
        y += tallest;
      }
      const total = columns.reduce((sum, c) => sum + c, 0);
      worst = Math.max(worst, Math.abs(tableBox.rect.widthPt - total), Math.abs(tableBox.rect.heightPt - (y - tableBox.rect.yPt)));
      expect(worst, `${somExpressionOf(table)}`).toBeLessThanOrEqual(EPSILON_PT);
      report.push(`${table.name}: ${rows.length} rows x ${columns.length} columns, x offsets ${columns.reduce<number[]>((acc, c) => [...acc, (acc.at(-1) ?? 0) + c], [0]).slice(0, -1).map((v) => v.toFixed(2)).join('/')} pt, row heights ${rows.map((r) => r.rect.heightPt.toFixed(2)).join('/')} pt, worst deviation ${worst.toExponential(2)} pt`);
    }
    console.info(`[flow-layout] ${file}: A2 tables: ${report.join(' | ')}`);
  });

  it('flowed children land without overlapping their siblings: a tb or table stacks them top to bottom, a row left to right (A2)', async () => {
    const s = await subjectOf(file);
    let pairs = 0;
    for (const mode of flowedModes) {
      for (const node of containersOf(s.loaded, mode)) {
        const box = s.boxes.get(node);
        if (box === undefined) continue;
        const kids = occupying(boxedChildrenOf(box));
        kids.slice(1).forEach((kid, i) => {
          const prev = kids[i];
          if (prev === undefined) return;
          pairs += 1;
          if (mode === 'row') expect(kid.rect.xPt, `${somExpressionOf(kid.node)} right of its left sibling`).toBeGreaterThanOrEqual(prev.rect.xPt + prev.rect.widthPt - EPSILON_PT);
          else expect(kid.rect.yPt, `${somExpressionOf(kid.node)} below its upper sibling`).toBeGreaterThanOrEqual(prev.rect.yPt + prev.rect.heightPt - EPSILON_PT);
        });
        // Every child lies inside the content of a container whose size is given by its children (growable on both axes), or is reported as overflowing.
        if (box.growableWidth && box.growableHeight) for (const kid of kids) expect(kid.rect.xPt + kid.rect.widthPt, somExpressionOf(kid.node)).toBeLessThanOrEqual(box.rect.xPt + box.rect.widthPt + EPSILON_PT);
      }
    }
    expect(pairs).toBeGreaterThan(50);
    console.info(`[flow-layout] ${file}: ${pairs} sibling pairs checked, none overlaps`);
  });

  it('the captions without a reserve that sit in table rows (T05 handoff) are measured and placed inside their cell', async () => {
    const s = await subjectOf(file);
    const inRows = nodesOf(s.loaded.dom, 'field').filter((f) => {
      const caption = f.childrenOfClass('caption')[0];
      const reserve = caption?.attr('reserve');
      return caption !== undefined && (reserve === undefined || !(Number.parseFloat(reserve) > 0)) && f.parent?.attr('layout') === 'row';
    });
    const known = EXPECTED[file];
    if (known !== undefined) expect(inRows.length).toBe(known.rowCaptions);
    for (const field of inRows) {
      const box = s.boxes.get(field);
      expect(box?.caption?.auto, somExpressionOf(field)).toBe(false);
      expect(box?.caption?.reservePt ?? 0, somExpressionOf(field)).toBeGreaterThan(0);
      const strip = box?.captionRect;
      expect(strip, somExpressionOf(field)).toBeDefined();
      if (strip !== undefined && box !== undefined) {
        expect(strip.xPt).toBeGreaterThanOrEqual(box.rect.xPt - EPSILON_PT);
        expect(strip.xPt + strip.widthPt).toBeLessThanOrEqual(box.rect.xPt + box.rect.widthPt + EPSILON_PT);
      }
    }
    console.info(`[flow-layout] ${file}: ${inRows.length} table-row captions without a reserve, placed`);
  });

  it('the layout raises only these issue kinds, with these counts: flowed children wider than a given w, and the text layer\'s', async () => {
    const s = await subjectOf(file);
    const kinds: Record<string, number> = {};
    for (const issue of s.flow.issues) {
      const kind = issue.feature.replace(/\d+(\.\d+)?pt/g, 'Npt').replace(/\(.*\)/, '').trim();
      kinds[kind] = (kinds[kind] ?? 0) + 1;
    }
    console.info(`[flow-layout] ${file}: issue kinds ${JSON.stringify(kinds)}`);
    expect(s.flow.droppedIssues).toBe(0);
    const known = EXPECTED[file];
    if (known !== undefined) expect(kinds).toEqual(known.issueKinds);
  });
});

describe.each(FORM_CASES)('A4: what the form\'s own scripts changed is what is laid out, on real form $file', (c) => {
  /** A runtime over the blank form, its form DOM (through the runtime's layout access), and a text context over that DOM. */
  async function session(): Promise<{ runtime: Awaited<ReturnType<typeof createFormRuntime>>; dom: FormDom; text: () => TextContext }> {
    const loaded = await load(c.file);
    const runtime = await createFormRuntime(await corpusPdf(c.file), { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: true });
    const { dom } = layoutAccessOf(runtime);
    return { runtime, dom, text: () => createTextContext(loaded.faces, templateTypefacesOf(loaded.model), dom) };
  }
  const boxNamed = (layout: FlowLayout, parent: string, name: string): LayoutBox => findBox(layout.root, (box) => box.node.name === name && box.node.parent?.name === parent);

  it('Office Use Only: its initialize script sets h on the subform and on Text6, and hides the JavaScript message; the layout is the template state before load() and the script state after, and Page 1 and everything below follow', async () => {
    const { runtime, dom, text } = await session();
    try {
      const page = (layout: FlowLayout, name: string): LayoutBox => layout.root.children.find((b) => b.node.name === name) ?? (undefined as never);
      const before = layoutFlow(dom, text());
      const officeBefore = boxNamed(before, 'Page1', 'OfficeUseOnly');
      const messageBefore = boxNamed(before, 'Page1', 'JavaScriptMessage');
      const templateH = mmToPt(officeBefore.node.template.attr('h'));
      expect(officeBefore.rect.heightPt).toBeCloseTo(templateH, 2);
      expect(messageBefore.occupiesSpace).toBe(true);
      runtime.load();
      const after = layoutFlow(dom, text());
      const officeAfter = boxNamed(after, 'Page1', 'OfficeUseOnly');
      const scriptH = 1.3071 * 72;
      expect(officeAfter.rect.heightPt).toBeCloseTo(scriptH, 2);
      expect(boxNamed(after, 'OfficeUseOnly', 'Text6').rect.heightPt).toBeCloseTo(scriptH, 2);
      // The same load hides the "JavaScript required" message, which then gives its room back.
      const messageAfter = boxNamed(after, 'Page1', 'JavaScriptMessage');
      expect(messageAfter.presence).toBe('hidden');
      expect(messageAfter.occupiesSpace).toBe(false);
      const delta = scriptH - templateH - messageBefore.rect.heightPt;
      expect(page(after, 'Page1').rect.heightPt - page(before, 'Page1').rect.heightPt).toBeCloseTo(delta, 2);
      expect(page(after, 'Page2').rect.yPt - page(before, 'Page2').rect.yPt).toBeCloseTo(delta, 2);
      expect(after.root.rect.heightPt - before.root.rect.heightPt).toBeCloseTo(delta, 2);
      console.info(`[flow-layout] ${c.file}: A4 OfficeUseOnly h ${templateH.toFixed(3)} -> ${officeAfter.rect.heightPt.toFixed(3)} pt and the ${messageBefore.rect.heightPt.toFixed(3)} pt JavaScript message hidden after load(): Page 1 and Page 2 moved by ${delta.toFixed(3)} pt`);
    } finally {
      runtime.dispose();
    }
  });

  it('multiLine: the form\'s own makeMultiLine runs during load() and turns it on for text fields; a long value then wraps in such a field and stays on one line in one the script did not touch', async () => {
    const { runtime, dom, text } = await session();
    try {
      const widgetOf = (f: FormNode): FormNode | undefined => f.childrenOfClass('ui')[0]?.oneOfChild;
      const turnedOn = (): FormNode[] => nodesOf(dom, 'field').filter((f) => widgetOf(f)?.className === 'textEdit' && widgetOf(f)?.template.attr('multiLine') !== '1' && widgetOf(f)?.attr('multiLine') === '1');
      expect(turnedOn(), 'the template alone turns nothing on').toEqual([]);
      runtime.load();
      const fields = turnedOn();
      expect(fields.length).toBeGreaterThan(0);
      const field = fields.find((f) => f.attr('w') !== undefined);
      if (field === undefined) throw new Error('no turned-on field has a width');
      runtime.setValue(somExpressionOf(field), 'word '.repeat(60));
      const entry = layoutFlow(dom, text()).texts.find((t) => t.box.node === field);
      expect(entry?.value?.lines.length, `${somExpressionOf(field)} wraps once the script made it multiLine`).toBeGreaterThan(1);
      // A drawn text field the script left single-line keeps one line however long its value.
      const drawnSingle = layoutFlow(dom, text()).texts.map((t) => t.box).find((b) => b.node.className === 'field' && widgetOf(b.node)?.className === 'textEdit' && widgetOf(b.node)?.attr('multiLine') !== '1' && b.rect.widthPt > 20);
      expect(drawnSingle, 'a drawn text field the script left single-line').toBeDefined();
      if (drawnSingle !== undefined) {
        runtime.setValue(somExpressionOf(drawnSingle.node), 'word '.repeat(60));
        const again = layoutFlow(dom, text()).texts.find((t) => t.box.node === drawnSingle.node);
        expect(again?.value?.lines.length).toBe(1);
      }
      console.info(`[flow-layout] ${c.file}: A4 load() turned multiLine on for ${fields.length} text fields; ${somExpressionOf(field)} wraps to ${entry?.value?.lines.length} lines`);
    } finally {
      runtime.dispose();
    }
  });
});
