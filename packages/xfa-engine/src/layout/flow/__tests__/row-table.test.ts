import { describe, expect, it } from 'vitest';
import { draw, expectBox, featuresOf, named, run, textField } from './helpers.js';

const row = (name: string, cells: string, attrs = ''): string => `<subform name="${name}" layout="row" ${attrs}>${cells}</subform>`;

describe('row: cells left to right, as tall as the tallest', () => {
  it('places the cells side by side and stretches every cell to the height of the tallest', () => {
    const { layout } = run(row('r', `${draw('a', 'w="30pt" h="10pt"')}${draw('b', 'w="40pt" h="25pt"')}${textField('c', 'w="20pt" h="15pt"')}`));
    expectBox(layout, 'a', 0, 0, 30, 25);
    expectBox(layout, 'b', 30, 0, 40, 25);
    expectBox(layout, 'c', 70, 0, 20, 25);
    expectBox(layout, 'r', 0, 0, 90, 25);
  });

  it('a stretched field keeps its caption strip: a top caption stays on top, a bottom one moves down, the widget takes the rest', () => {
    const cell = (name: string, placement: string): string => `<field name="${name}" w="40pt" h="10pt"><ui><textEdit/></ui><caption placement="${placement}" reserve="4pt"/></field>`;
    const { layout } = run(row('r', `${cell('top', 'top')}${cell('bottom', 'bottom')}${draw('tall', 'w="5pt" h="30pt"')}`));
    const top = named(layout, 'top');
    expect(top.rect.heightPt).toBeCloseTo(30, 2);
    expect(top.captionRect?.yPt).toBeCloseTo(0, 2);
    expect(top.captionRect?.heightPt).toBeCloseTo(4, 2);
    expect(top.widgetRect.yPt).toBeCloseTo(4, 2);
    expect(top.widgetRect.heightPt).toBeCloseTo(26, 2);
    const bottom = named(layout, 'bottom');
    expect(bottom.captionRect?.yPt).toBeCloseTo(26, 2);
    expect(bottom.widgetRect.heightPt).toBeCloseTo(26, 2);
  });

  it('a given row h is the floor of the cell height', () => {
    const { layout } = run(row('r', `${draw('a', 'w="30pt" h="10pt"')}`, 'h="40pt"'));
    expectBox(layout, 'a', 0, 0, 30, 40);
    expectBox(layout, 'r', 0, 0, 30, 40);
  });

  it('a hidden cell takes no room and an invisible one does', () => {
    const { layout } = run(row('r', `${draw('a', 'w="30pt" h="10pt"')}${draw('gone', 'w="99pt" h="99pt" presence="hidden"')}${draw('ghost', 'w="20pt" h="10pt" presence="invisible"')}${draw('b', 'w="10pt" h="10pt"')}`));
    expectBox(layout, 'ghost', 30, 0, 20, 10);
    expectBox(layout, 'b', 50, 0, 10, 10);
    expectBox(layout, 'r', 0, 0, 60, 10);
  });

  it('a row outside a table keeps every cell at its own width', () => {
    const { layout } = run(`<subform name="p" layout="tb">${row('r', `${draw('a', 'w="30pt" h="10pt"')}${draw('b', 'w="12pt" h="10pt"')}`)}</subform>`);
    expectBox(layout, 'b', 30, 0, 12, 10);
  });
});

describe('table: rows stacked, cells as wide as their column', () => {
  const table = (columns: string, rows: string): string => `<subform name="t" layout="table" columnWidths="${columns}">${rows}</subform>`;
  const cells = (heights: readonly number[], prefix: string): string => heights.map((h, i) => draw(`${prefix}${i}`, `w="1pt" h="${h}pt"`)).join('');

  it('columnWidths override the width the cells ask for; the cell x offsets are the cumulative widths', () => {
    const { layout } = run(table('30pt 50pt 20pt', `${row('r1', cells([10, 10, 14], 'a'))}${row('r2', cells([8, 20, 6], 'b'))}`));
    expectBox(layout, 'a0', 0, 0, 30, 14);
    expectBox(layout, 'a1', 30, 0, 50, 14);
    expectBox(layout, 'a2', 80, 0, 20, 14);
    expectBox(layout, 'b0', 0, 14, 30, 20);
    expectBox(layout, 'b1', 30, 14, 50, 20);
    expectBox(layout, 'b2', 80, 14, 20, 20);
    expectBox(layout, 'r1', 0, 0, 100, 14);
    expectBox(layout, 'r2', 0, 14, 100, 20);
    expectBox(layout, 't', 0, 0, 100, 34);
  });

  it('columnWidths in other units, and a unit-less entry read as inches (TEMPLATE_LENGTH_UNIT)', () => {
    const { layout } = run(table('10mm 1in 1', row('r', cells([5, 5, 5], 'c'))));
    expectBox(layout, 'c0', 0, 0, 28.3465, 5);
    expectBox(layout, 'c1', 28.3465, 0, 72, 5);
    expectBox(layout, 'c2', 100.3465, 0, 72, 5);
  });

  it('a hidden cell takes no column: the next cell takes its column', () => {
    const { layout } = run(table('30pt 50pt', row('r', `${draw('a', 'w="1pt" h="5pt"')}${draw('gone', 'w="1pt" h="5pt" presence="hidden"')}${draw('b', 'w="1pt" h="5pt"')}`)));
    expectBox(layout, 'b', 30, 0, 50, 5);
  });

  it('a row with more cells than columns keeps the extra cells at their own width and says so', () => {
    const { layout } = run(table('30pt', row('r', `${draw('a', 'w="1pt" h="5pt"')}${draw('b', 'w="9pt" h="5pt"')}`)));
    expectBox(layout, 'a', 0, 0, 30, 5);
    expectBox(layout, 'b', 30, 0, 9, 5);
    expect(featuresOf(layout)).toContain('more cells than columnWidths entries (1; the extra cells keep their own widths)');
  });

  it('a negative column entry leaves that cell its own width, reported', () => {
    const { layout } = run(table('30pt -1 20pt', row('r', cells([5, 5, 5], 'd'))));
    expectBox(layout, 'd0', 0, 0, 30, 5);
    expectBox(layout, 'd1', 30, 0, 1, 5);
    expectBox(layout, 'd2', 31, 0, 20, 5);
    expect(featuresOf(layout)).toContain('columnWidths entry 2 is negative (the cell keeps its own width)');
  });

  it('columnWidths in a unit the engine does not convert are reported and the cells keep their own widths', () => {
    const { layout } = run(table('30px 40px', row('r', `${draw('a', 'w="7pt" h="5pt"')}`)));
    expectBox(layout, 'a', 0, 0, 7, 5);
    expect(featuresOf(layout).some((feature) => feature.startsWith('columnWidths: unit not supported'))).toBe(true);
  });

  it('a negative entry among the columns a cell spans is reported too, not only when every spanned column is negative; the cell takes the widths of the others', () => {
    const { layout } = run(table('30pt -1 20pt', row('r', `${draw('a', 'w="1pt" h="5pt" colSpan="2"')}${draw('b', 'w="1pt" h="5pt"')}`)));
    expectBox(layout, 'a', 0, 0, 30, 5);
    expectBox(layout, 'b', 30, 0, 20, 5);
    expect(featuresOf(layout).filter((feature) => feature.includes('is negative'))).toEqual(['columnWidths entry 2 is negative (that column adds no width; the cell is as wide as the other columns it spans, 30pt)']);
    const wholly = run(table('-1 -2', row('r', draw('a', 'w="9pt" h="5pt" colSpan="2"')))).layout;
    expectBox(wholly, 'a', 0, 0, 9, 5);
    expect(featuresOf(wholly).filter((feature) => feature.includes('is negative'))).toEqual(['columnWidths entry 1 is negative (the cell keeps its own width)']);
  });

  it('a malformed columnWidths is reported once per table, also when the table has no row, only hidden rows, or several rows', () => {
    const reported = (rows: string): string[] => featuresOf(run(table('30px 40px', rows)).layout).filter((feature) => feature.startsWith('columnWidths: unit not supported'));
    expect(reported('')).toHaveLength(1);
    expect(reported(row('gone', draw('a', 'w="1pt" h="5pt"'), 'presence="hidden"'))).toHaveLength(1);
    expect(reported(`${row('r1', draw('a', 'w="1pt" h="5pt"'))}${row('r2', draw('b', 'w="1pt" h="5pt"'))}${row('r3', draw('c', 'w="1pt" h="5pt"'))}`)).toHaveLength(1);
    const { layout } = run(table('30px 40px', ''));
    expect(layout.issues.find((issue) => issue.feature.startsWith('columnWidths'))?.som).toBe('xfa[0].form[0].form1[0].t[0]');
  });

  it('no columnWidths: the cells keep their own widths', () => {
    const { layout } = run(`<subform name="t" layout="table">${row('r', `${draw('a', 'w="7pt" h="5pt"')}${draw('b', 'w="9pt" h="5pt"')}`)}</subform>`);
    expectBox(layout, 'b', 7, 0, 9, 5);
  });

  it('a field cell with a caption it measures itself still gets the column width and its text region follows', () => {
    const cell = `<field name="f" w="1pt" h="20pt"><ui><textEdit/></ui><caption placement="left"><value><text>Name</text></value></caption><value><text>abc</text></value></field>`;
    const { layout } = run(table('100pt', row('r', cell)));
    const box = named(layout, 'f');
    expect(box.rect.widthPt).toBeCloseTo(100, 2);
    expect(box.caption?.reservePt).toBeCloseTo(24, 2);
    expect(box.caption?.auto).toBe(false);
    expect(box.widgetRect.widthPt).toBeCloseTo(76, 2);
  });

  it('a cell the box layer refuses (colSpan) is a placeholder as wide as the columns it spans, and the next cell takes the column after them', () => {
    const { layout } = run(table('30pt 50pt 20pt', row('r', `${draw('a', 'w="1pt" h="5pt" colSpan="2"')}${draw('b', 'w="1pt" h="5pt"')}`)));
    expect(named(layout, 'a').placeholder).toBe('colSpan="2"');
    expectBox(layout, 'a', 0, 0, 80, 5);
    expectBox(layout, 'b', 80, 0, 20, 5);
  });

  it('colSpan -1 spans every remaining column', () => {
    const { layout } = run(table('30pt 50pt 20pt', row('r', `${draw('a', 'w="1pt" h="5pt"')}${draw('rest', 'w="1pt" h="5pt" colSpan="-1"')}`)));
    expectBox(layout, 'rest', 30, 0, 70, 5);
  });

  it('a table with no w is as wide as the sum of its columnWidths even when its rows are shorter, and a given w is not replaced', () => {
    const shortRow = row('r', draw('a', 'w="1pt" h="5pt"'));
    const open = run(table('30pt 50pt 20pt', shortRow)).layout;
    expectBox(open, 'a', 0, 0, 30, 5);
    expectBox(open, 'r', 0, 0, 30, 5);
    expectBox(open, 't', 0, 0, 100, 5);
    const given = run(`<subform name="t" layout="table" w="60pt" columnWidths="30pt 50pt 20pt">${shortRow}</subform>`).layout;
    expectBox(given, 't', 0, 0, 60, 5);
  });

  it('a cell whose content is wider than its column does not push the next cell: the second cell stays at the next column', () => {
    const wide = `<subform name="c1" layout="tb">${draw('big', 'w="40pt" h="10pt"')}</subform>`;
    const { layout } = run(table('30pt 50pt', row('r', `${wide}${draw('c2', 'w="1pt" h="5pt"')}`)));
    expectBox(layout, 'c1', 0, 0, 30, 10);
    expectBox(layout, 'c2', 30, 0, 50, 10);
    expect(featuresOf(layout).some((feature) => feature.startsWith('flowed children reach 10.000pt beyond the given w'))).toBe(true);
  });

  it('a cell that overflows its height makes the row that tall and is stretched to it, so it no longer carries the overflow mark', () => {
    const tall = `<subform name="c1" layout="tb" h="10pt">${draw('big', 'w="1pt" h="20pt"')}</subform>`;
    const { layout } = run(table('30pt 50pt', row('r', `${tall}${draw('c2', 'w="1pt" h="5pt"')}`)));
    expect(named(layout, 'c1').flowHeightPt).toBeUndefined();
    expectBox(layout, 'c1', 0, 0, 30, 20);
    expectBox(layout, 'c2', 30, 0, 50, 20);
    expectBox(layout, 'r', 0, 0, 80, 20);
  });

  it('a colSpan that runs past the last column spans what is left and says so', () => {
    const { layout } = run(table('30pt 50pt', row('r', `${draw('a', 'w="1pt" h="5pt"')}${draw('b', 'w="1pt" h="5pt" colSpan="3"')}`)));
    expectBox(layout, 'b', 30, 0, 50, 5);
    expect(featuresOf(layout)).toContain('colSpan 3 runs past the last column (1 left; the cell spans only those)');
  });
});
