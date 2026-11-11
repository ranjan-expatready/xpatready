import { describe, expect, it } from 'vitest';
import { find } from '../../../model/form/__tests__/helpers.js';
import { IssueSink } from '../../box/issues.js';
import type { LayoutBox } from '../../box/types.js';
import { layoutFlow } from '../../flow/index.js';
import { draw, run } from '../../flow/__tests__/helpers.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { RENDER_TREE_VERSION, renderTreeSchema, type RenderItem } from '../../render-tree.js';
import { graphicsOfBox, layoutBoxGraphics } from '../box-graphics.js';
import { expectLine, expectValid, linesOf } from './helpers.js';

function paint(body: string): { items: RenderItem[]; sink: IssueSink; root: LayoutBox } {
  const { layout } = run(body);
  const sink = new IssueSink();
  const items = layoutBoxGraphics(layout.root, sink).flatMap((entry) => entry.items);
  expectValid(items);
  return { items, sink, root: layout.root };
}

const sub = (attrs: string, inner: string): string => `<subform name="s" ${attrs}>${inner}</subform>`;
const geometry = 'x="10pt" y="20pt" w="100pt" h="50pt"';
const checkBox = (value: string, ui = '<checkButton/>', attrs = 'x="0pt" y="0pt" w="30pt" h="14pt"'): string =>
  `<field name="c" ${attrs}><ui>${ui}</ui><para hAlign="left" vAlign="middle"/><items><text>Y</text><text>N</text></items>${value === '' ? '' : `<value><text>${value}</text></value>`}</field>`;
const boxBorder = '<border><edge thickness="1pt"/><fill><color value="255,255,255"/></fill></border>';

describe('container border: the box and the border element', () => {
  it('a border is the fill then four strokes around the whole box', () => {
    const { items } = paint(sub(geometry, '<border><edge thickness="2pt"/><fill><color value="10,20,30"/></fill></border>'));
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({ kind: 'box', rect: { xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 }, fill: [10, 20, 30] });
    expectLine(items[1], 9, 20, 111, 20, 2);
    expectLine(items[2], 110, 21, 110, 69, 2);
  });

  it('the border element\'s own margin pulls the reference rectangle in', () => {
    const { items } = paint(sub(geometry, '<border><margin leftInset="4pt" topInset="2pt" rightInset="6pt" bottomInset="0pt"/><edge thickness="2pt"/></border>'));
    // Reference rectangle: x 14, y 22, to x 104, y 70.
    expectLine(items[0], 13, 22, 105, 22, 2);
    expectLine(items[3], 14, 23, 14, 69, 2);
  });

  it('hand on the border element moves the stroke', () => {
    const { items } = paint(sub(geometry, '<border hand="right"><edge thickness="2pt"/></border>'));
    expectLine(items[0], 10, 21, 110, 21, 2);
  });

  it('a hidden border, a hidden edge and an invisible box paint nothing; nor does anything inside an invisible box', () => {
    expect(paint(sub(geometry, '<border presence="hidden"><edge thickness="2pt"/></border>')).items).toEqual([]);
    expect(paint(sub(`${geometry} presence="hidden"`, `<border><edge/></border>${draw('d', 'x="0pt" y="0pt" w="10pt" h="10pt"', '<border><edge/></border>')}`)).items).toEqual([]);
    expect(paint(sub(`${geometry} presence="invisible"`, `<border><edge/></border>`)).items).toEqual([]);
  });

  it('a border with no edge element draws the default edge: 0.5 pt, black, solid, on all four sides', () => {
    const { items } = paint(sub(geometry, '<border/>'));
    expect(linesOf(items)).toHaveLength(4);
    expect(linesOf(items).every((l) => l.thicknessPt === 0.5 && l.colour.join() === '0,0,0' && l.stroke === 'solid')).toBe(true);
  });

  it('a stroke colour the script wrote is what the next layout draws', () => {
    const { layout, dom } = run(sub(geometry, '<border><edge thickness="2pt"><color value="0,0,0"/></edge><fill><color value="255,255,255"/></fill></border>'));
    const before = layoutBoxGraphics(layout.root, new IssueSink()).flatMap((e) => e.items);
    expect(linesOf(before)[0]?.colour).toEqual([0, 0, 0]);
    const fillColour = find(dom, 'subform', 's').childrenOfClass('border')[0]?.childrenOfClass('fill')[0]?.childrenOfClass('color')[0];
    const edgeColour = find(dom, 'subform', 's').childrenOfClass('border')[0]?.childrenOfClass('edge')[0]?.childrenOfClass('color')[0];
    fillColour?.setAttr('value', '255,0,0');
    edgeColour?.setAttr('value', '200,0,0');
    const after = layoutBoxGraphics(layoutFlow(dom, emptyTextContext()).root, new IssueSink()).flatMap((e) => e.items);
    expect(after[0]).toMatchObject({ kind: 'box', fill: [255, 0, 0] });
    expect(linesOf(after)[0]?.colour).toEqual([200, 0, 0]);
  });

  it('a border on a turned box is drawn unrotated and reported', () => {
    const { items, sink } = paint(`<draw name="r" x="0pt" y="0pt" w="40pt" h="10pt" rotate="90"><border><edge thickness="1pt"/></border></draw>`);
    expect(linesOf(items)).toHaveLength(4);
    expect(sink.issues.map((i) => i.feature)).toEqual(['border on a box rotated 90 degrees (drawn unrotated)']);
  });
});

describe('draws: line', () => {
  const line = (attrs: string, inner = '<edge thickness="1pt"/>', slope = ''): string => draw('l', attrs, `<value><line ${slope}>${inner}</line></value>`);
  const only = (body: string): RenderItem[] => paint(body).items;

  it('a draw no wider than its stroke is a vertical line down its middle, full height', () => {
    expectLine(only(line('x="10pt" y="20pt" w="0pt" h="30pt"'))[0], 10, 20, 10, 50, 1);
    expectLine(only(line('x="10pt" y="20pt" w="1pt" h="30pt"'))[0], 10.5, 20, 10.5, 50, 1);
  });

  it('a draw no taller than its stroke is a horizontal line along its middle', () => {
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="0pt"'))[0], 10, 20, 50, 20, 1);
  });

  it('backslash runs top left to bottom right and is the default; slash runs bottom left to top right', () => {
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt"', '<edge thickness="1pt"/>', 'slope="\\"'))[0], 10, 20, 50, 50, 1);
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt"'))[0], 10, 20, 50, 50, 1);
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt"', '<edge thickness="1pt"/>', 'slope="/"'))[0], 10, 50, 50, 20, 1);
  });

  it('a quarter turn turns the slope with it; a half turn does not', () => {
    // Turned 90 degrees about its top left corner the 40 x 30 box covers x 10 to 40, y -20 to 20.
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt" rotate="90"', '<edge thickness="1pt"/>', 'slope="/"'))[0], 10, -20, 40, 20, 1);
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt" rotate="90"', '<edge thickness="1pt"/>', 'slope="\\"'))[0], 10, 20, 40, -20, 1);
    // Turned 180 degrees the box covers x -30 to 10, y -10 to 20, and the slope stays.
    expectLine(only(line('x="10pt" y="20pt" w="40pt" h="30pt" rotate="180"', '<edge thickness="1pt"/>', 'slope="/"'))[0], -30, 20, 10, -10, 1);
  });

  it('a horizontal line turned a quarter turn is a vertical line of the same length', () => {
    const item = only(line('x="10pt" y="20pt" w="40pt" h="0pt" rotate="90"'))[0];
    expect(item?.kind === 'line' ? item.x1Pt === item.x2Pt : false).toBe(true);
    expect(item?.kind === 'line' ? Math.abs(item.y2Pt - item.y1Pt) : 0).toBeCloseTo(40, 3);
  });

  it('colour, thickness and a broken stroke come from the edge; a 3D stroke is a plain one; a line with no edge is the default edge', () => {
    const item = only(line('x="0pt" y="0pt" w="40pt" h="0pt"', '<edge thickness="3pt" stroke="dotted"><color value="1,2,3"/></edge>'))[0];
    expect(item).toMatchObject({ thicknessPt: 3, colour: [1, 2, 3], stroke: 'dotted' });
    expect(only(line('x="0pt" y="0pt" w="40pt" h="0pt"', '<edge stroke="raised"/>'))[0]).toMatchObject({ stroke: 'solid' });
    expect(only(line('x="0pt" y="0pt" w="40pt" h="0pt"', ''))[0]).toMatchObject({ thicknessPt: 0.5, colour: [0, 0, 0] });
  });

  it('a hidden edge draws nothing; a hand other than even is reported, not applied', () => {
    expect(only(line('x="0pt" y="0pt" w="40pt" h="0pt"', '<edge presence="hidden"/>'))).toEqual([]);
    const { sink } = paint(draw('l', 'x="0pt" y="0pt" w="40pt" h="0pt"', '<value><line hand="left"><edge/></line></value>'));
    expect(sink.issues.map((i) => i.feature)).toEqual(['line hand="left" (drawn centred on the line)']);
  });
});

describe('draws: rectangle', () => {
  const rect = (inner: string, attrs = 'x="10pt" y="20pt" w="40pt" h="30pt"'): RenderItem[] => paint(draw('r', attrs, `<value><rectangle>${inner}</rectangle></value>`)).items;

  it('is four strokes on the draw\'s rectangle, one edge for all sides, and a fill only when the fill is visible', () => {
    const items = rect('<edge thickness="2pt"/><fill><color value="7,8,9"/></fill>');
    expect(items[0]).toEqual({ kind: 'box', rect: { xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 }, fill: [7, 8, 9] });
    expectLine(items[1], 9, 20, 51, 20, 2);
    expect(rect('<edge thickness="2pt"/>')).toHaveLength(4);
    expect(rect('<edge thickness="2pt"/><fill presence="hidden"><color value="7,8,9"/></fill>')).toHaveLength(4);
  });

  it('a radius with the default square join stays square (the real forms\' case); a round join makes one box with round corners', () => {
    expect(rect('<edge thickness="1pt"/><corner radius="5.08mm"/>').every((i) => i.kind === 'line')).toBe(true);
    const [box] = rect('<edge thickness="1pt"/><corner radius="4pt" join="round"/>');
    expect(box?.kind === 'box' ? box.corners?.map((c) => c.radiusPt) : undefined).toEqual([4, 4, 4, 4]);
    expect(box?.kind === 'box' ? box.rect : undefined).toEqual({ xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 });
  });

  it('an invisible rectangle draws nothing', () => {
    expect(rect('<edge/>', 'x="10pt" y="20pt" w="40pt" h="30pt" presence="invisible"')).toEqual([]);
  });
});

describe('check buttons', () => {
  it('the box is the size square, placed by the field\'s para (left, middle here), with the widget border and fill around it', () => {
    const { items } = paint(checkBox('', `<checkButton size="10pt">${boxBorder}</checkButton>`));
    expect(items[0]).toEqual({ kind: 'box', rect: { xPt: 0, yPt: 2, widthPt: 10, heightPt: 10 }, fill: [255, 255, 255] });
    expectLine(items[1], -0.5, 2, 10.5, 2, 1);
    expect(items).toHaveLength(5);
  });

  it('with the on value the mark is drawn, and a script that writes the value toggles it', () => {
    const body = checkBox('', `<checkButton size="10pt">${boxBorder}</checkButton>`);
    const { layout, dom } = run(body);
    const count = (): number => layoutBoxGraphics(layout.root, new IssueSink()).flatMap((e) => e.items).length;
    expect(count()).toBe(5);
    const unchecked = layoutBoxGraphics(layout.root, new IssueSink()).flatMap((e) => e.items);
    find(dom, 'field', 'c').rawValue = 'Y';
    const marked = layoutBoxGraphics(layoutFlow(dom, emptyTextContext()).root, new IssueSink()).flatMap((e) => e.items);
    expect(marked).toHaveLength(7);
    // Structural: the unchecked paint comes first and unchanged, the mark's two strokes follow it.
    expect(marked.slice(0, 5)).toEqual(unchecked);
    expect(marked.slice(5).map((i) => i.kind)).toEqual(['line', 'line']);
    find(dom, 'field', 'c').rawValue = 'N';
    expect(layoutBoxGraphics(layoutFlow(dom, emptyTextContext()).root, new IssueSink()).flatMap((e) => e.items)).toHaveLength(5);
  });

  it('checked means the field holds the first item; a field with no items is checked only by the value "on" (pdf.js)', () => {
    expect(paint(checkBox('Y', `<checkButton size="10pt">${boxBorder}</checkButton>`)).items).toHaveLength(7);
    expect(paint(checkBox('N', `<checkButton size="10pt">${boxBorder}</checkButton>`)).items).toHaveLength(5);
    expect(paint(`<field name="c" x="0pt" y="0pt" w="30pt" h="14pt"><ui><checkButton>${boxBorder}</checkButton></ui><value><text>Y</text></value></field>`).items).toHaveLength(5);
  });

  it('a box with no border is just its mark', () => {
    expect(paint(checkBox('Y', '<checkButton size="10pt"/>')).items).toHaveLength(2);
    expect(paint(checkBox('N', '<checkButton size="10pt"/>')).items).toEqual([]);
  });

  it('the size defaults to 10 pt and is cut to the room; the para aligns it right and bottom', () => {
    expect(paint(checkBox('', `<checkButton>${boxBorder}</checkButton>`)).items[0]).toMatchObject({ rect: { widthPt: 10, heightPt: 10 } });
    expect(paint(checkBox('', `<checkButton size="40pt">${boxBorder}</checkButton>`)).items[0]).toMatchObject({ rect: { xPt: 0, yPt: 0, widthPt: 14, heightPt: 14 } });
    const aligned = checkBox('', `<checkButton size="10pt">${boxBorder}</checkButton>`).replace('hAlign="left" vAlign="middle"', 'hAlign="right" vAlign="bottom"');
    expect(paint(aligned).items[0]).toMatchObject({ rect: { xPt: 20, yPt: 4 } });
  });

  it('a round box is one box item with round corners; each mark kind is drawn inside it', () => {
    const round = paint(checkBox('', `<checkButton shape="round" size="10pt">${boxBorder}</checkButton>`)).items;
    expect(round).toHaveLength(1);
    expect(round[0]?.kind === 'box' ? round[0].corners?.map((c) => c.radiusPt) : undefined).toEqual([5, 5, 5, 5]);
    for (const [mark, count] of [['check', 2], ['cross', 2], ['square', 1], ['circle', 1], ['diamond', 4], ['star', 10], ['default', 2]] as const) {
      expect(paint(checkBox('Y', `<checkButton mark="${mark}" size="10pt"/>`)).items, mark).toHaveLength(count);
    }
    const markOnly = paint(checkBox('Y', '<checkButton shape="round" size="10pt"/>')).items;
    // A round box's default mark is the circle: one filled box with round corners.
    expect(markOnly).toHaveLength(1);
    expect(markOnly[0]?.kind === 'box' ? markOnly[0].corners?.map((c) => c.join) : undefined).toEqual(['round', 'round', 'round', 'round']);
  });

  it('a radio button in an exclusion group is checked when the group holds its on value', () => {
    const radio = (on: string): string => `<field name="${on}" x="0pt" y="0pt" w="30pt" h="14pt"><ui><checkButton size="10pt"/></ui><items><text>${on}</text></items></field>`;
    const { items } = paint(`<exclGroup name="g" x="0pt" y="0pt" w="60pt" h="14pt">${radio('A')}${radio('B')}<value><text>B</text></value></exclGroup>`);
    expect(items).toHaveLength(2);
  });

  it('allowNeutral is reported', () => {
    expect(paint(checkBox('', '<checkButton allowNeutral="1"/>')).sink.issues.map((i) => i.feature)).toEqual(['checkButton allowNeutral="1" (the neutral state is drawn as unchecked)']);
  });
});

describe('widget chrome', () => {
  it('a text box\'s border is drawn around the widget region, not under the caption', () => {
    const field = '<field name="f" x="0pt" y="0pt" w="100pt" h="20pt"><caption placement="left" reserve="30pt"><value><text>Name</text></value></caption><ui><textEdit><border><edge thickness="1pt"/></border></textEdit></ui></field>';
    const { items } = paint(field);
    expect(items).toHaveLength(4);
    expectLine(items[0], 29.5, 0, 100.5, 0, 1);
    expectLine(items[3], 30, 0.5, 30, 19.5, 1);
  });

  it('a lowered border is two tones; a widget with no border and a field with no ui draw nothing', () => {
    const lowered = paint('<field name="f" x="0pt" y="0pt" w="50pt" h="20pt"><ui><textEdit><border><edge stroke="lowered"><color value="100,100,100"/></edge></border></textEdit></ui></field>').items;
    expect(linesOf(lowered).map((l) => l.colour[0])).toEqual([50, 178, 178, 50]);
    expect(paint('<field name="f" x="0pt" y="0pt" w="50pt" h="20pt"><ui><textEdit/></ui></field>').items).toEqual([]);
    expect(paint('<field name="f" x="0pt" y="0pt" w="50pt" h="20pt"/>').items).toEqual([]);
  });

  it('a hidden widget border draws nothing', () => {
    expect(paint('<field name="f" x="0pt" y="0pt" w="50pt" h="20pt"><ui><textEdit><border presence="hidden"><edge/></border></textEdit></ui></field>').items).toEqual([]);
  });

  it('a button face is its container border, the hand inside', () => {
    const { items } = paint('<field name="b" x="0pt" y="0pt" w="60pt" h="20pt"><ui><button highlight="inverted"/></ui><border hand="right"><edge/><fill><color value="11,83,141"/></fill></border></field>');
    expect(items[0]).toMatchObject({ kind: 'box', fill: [11, 83, 141] });
    expectLine(items[1], 0, 0.25, 60, 0.25, 0.5);
  });
});

describe('barcode and placeholders', () => {
  const barcode = (presence: string): string => `<field name="bc" x="0pt" y="0pt" w="100pt" h="40pt" presence="${presence}"><ui><barcode type="pdf417"/></ui></field>`;

  it('a visible barcode field is a placeholder with reason barcode over its widget region; a hidden or invisible one is nothing', () => {
    expect(paint(barcode('visible')).items).toEqual([{ kind: 'placeholder', rect: { xPt: 0, yPt: 0, widthPt: 100, heightPt: 40 }, reason: 'barcode' }]);
    expect(paint(barcode('hidden')).items).toEqual([]);
    expect(paint(barcode('invisible')).items).toEqual([]);
  });

  it('a presence the script writes shows the placeholder on the next layout', () => {
    const { layout, dom } = run(barcode('hidden'));
    expect(layoutBoxGraphics(layout.root, new IssueSink())).toEqual([]);
    find(dom, 'field', 'bc').presence = 'visible';
    expect(layoutBoxGraphics(layoutFlow(dom, emptyTextContext()).root, new IssueSink()).flatMap((e) => e.items)).toHaveLength(1);
  });

  it('a box the layout could not place is a placeholder with the layout\'s reason, and its children are not painted', () => {
    const { items } = paint(sub(`${geometry} layout="lr-tb"`, '<border><edge/></border>'));
    expect(items).toHaveLength(1);
    const placeholder = items[0];
    expect(placeholder).toMatchObject({ kind: 'placeholder', rect: { xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 } });
    expect(placeholder?.kind === 'placeholder' ? placeholder.reason : '').toContain('lr-tb');
  });

  it('graphicsOfBox is empty for a box that is not drawn', () => {
    const { layout } = run(sub(`${geometry} presence="invisible"`, '<border><edge/></border>'));
    const box = layout.root.children[0];
    expect(box).toBeDefined();
    expect(graphicsOfBox(box as LayoutBox, new IssueSink())).toEqual([]);
  });
});

describe('the paint of a whole tree', () => {
  it('lists boxes parents first, in document order, and the items make a valid render tree page', () => {
    const body = sub(geometry, `<border><edge/></border>${draw('l', 'x="0pt" y="10pt" w="40pt" h="0pt"', '<value><line><edge/></line></value>')}`);
    const { layout } = run(body);
    const entries = layoutBoxGraphics(layout.root, new IssueSink());
    expect(entries.map((e) => e.box.node.name)).toEqual(['s', 'l']);
    const tree = { version: RENDER_TREE_VERSION, pages: [{ index: 0, widthPt: 612, heightPt: 792, items: entries.flatMap((e) => e.items) }], resources: { fonts: [], images: [] }, issues: [] };
    expect(renderTreeSchema.safeParse(tree).success).toBe(true);
  });
});

describe('T10-F1: a rectangle that writes no edge, and one box failing', () => {
  const rect = (inner: string, attrs = 'x="10pt" y="20pt" w="40pt" h="30pt"'): RenderItem[] => paint(draw('r', attrs, `<value><rectangle>${inner}</rectangle></value>`)).items;

  it('a rectangle with only a fill draws the fill and the default outline: four 0.5 pt black strokes (pdf.js Rectangle $toHTML: no edge = new Edge)', () => {
    const items = rect('<fill><color value="7,8,9"/></fill>');
    expect(items[0]).toEqual({ kind: 'box', rect: { xPt: 10, yPt: 20, widthPt: 40, heightPt: 30 }, fill: [7, 8, 9] });
    expect(linesOf(items)).toHaveLength(4);
    expectLine(items[1], 9.75, 20, 50.25, 20, 0.5);
    expect(linesOf(items).every((l) => l.colour.join() === '0,0,0' && l.stroke === 'solid')).toBe(true);
  });

  it('a rectangle with nothing inside it is the default outline alone, and a rectangle that writes an edge but no corner keeps its edge', () => {
    expect(linesOf(rect(''))).toHaveLength(4);
    expectLine(rect('<edge thickness="2pt"/>')[0], 9, 20, 51, 20, 2);
  });

  it('one box whose graphics fail is one placeholder with the reason and an issue, and the rest of the form still draws', () => {
    const { layout } = run(`${sub('x="0pt" y="0pt" w="50pt" h="20pt"', '<border><edge/></border>')}${sub('x="0pt" y="30pt" w="50pt" h="20pt"', '<border><edge/></border>')}`);
    const [first, second] = layout.root.children;
    if (first === undefined || second === undefined || first.borderStyle === undefined) throw new Error('two bordered boxes expected');
    const broken: LayoutBox = { ...first, borderStyle: { ...first.borderStyle, edges: first.borderStyle.edges.slice(0, 3) } };
    const sink = new IssueSink();
    const entries = layoutBoxGraphics({ ...layout.root, children: [broken, second] }, sink);
    const items = entries.flatMap((e) => e.items);
    expect(items.filter((i) => i.kind === 'placeholder')).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'placeholder', rect: { xPt: 0, yPt: 0, widthPt: 50, heightPt: 20 } });
    expect(linesOf(items)).toHaveLength(4);
    expect(sink.issues).toHaveLength(1);
    expect(sink.issues[0]?.feature).toContain('graphics could not be drawn');
    expectValid(items);
  });
});

describe('T10-F2: the on value, pdf.js CheckButton', () => {
  const noItems = (value: string): string => `<field name="c" x="0pt" y="0pt" w="30pt" h="14pt"><ui><checkButton size="10pt"/></ui><value><text>${value}</text></value></field>`;

  it('a field with no items has the on value "on": a value of "on" is marked, any other is not', () => {
    expect(paint(noItems('on')).items).toHaveLength(2);
    expect(paint(noItems('off')).items).toEqual([]);
    expect(paint(noItems('1')).items).toEqual([]);
    expect(paint(noItems('')).items).toEqual([]);
  });

  it('with items the first is the on value; the second is only the off value', () => {
    expect(paint(checkBox('Y', '<checkButton size="10pt"/>')).items).toHaveLength(2);
    expect(paint(checkBox('N', '<checkButton size="10pt"/>')).items).toEqual([]);
  });
});

describe('T10-F10: more shapes', () => {
  it('a rectangle with four distinct edges strokes each side with its own thickness and colour', () => {
    const edges = [1, 2, 3, 4].map((t, i) => `<edge thickness="${t}pt"><color value="${i * 10},0,0"/></edge>`).join('');
    const items = paint(draw('r', 'x="10pt" y="20pt" w="40pt" h="30pt"', `<value><rectangle>${edges}</rectangle></value>`)).items;
    expect(items).toHaveLength(4);
    expectLine(items[0], 8, 20, 51, 20, 1);
    expectLine(items[1], 50, 20.5, 50, 48.5, 2);
    expectLine(items[2], 8, 50, 51, 50, 3);
    expectLine(items[3], 10, 20.5, 10, 48.5, 4);
    expect(linesOf(items).map((l) => l.colour[0])).toEqual([0, 10, 20, 30]);
  });

  it('hand on a widget border moves the stroke the same way as on a container border', () => {
    const field = (hand: string): string => `<field name="f" x="0pt" y="0pt" w="50pt" h="20pt"><ui><textEdit><border hand="${hand}"><edge thickness="2pt"/></border></textEdit></ui></field>`;
    expectLine(paint(field('right')).items[0], 0, 1, 50, 1, 2);
    expectLine(paint(field('left')).items[0], -2, -1, 52, -1, 2);
    expectLine(paint(field('even')).items[0], -1, 0, 51, 0, 2);
  });

  it('an inactive box paints nothing, like a hidden one', () => {
    expect(paint(sub(`${geometry} presence="inactive"`, '<border><edge/></border>')).items).toEqual([]);
  });

  it('a check box of size 0 draws no box (pdf.js sets width and height to the size), is reported, and is not promoted to 10 pt', () => {
    const { items, sink } = paint(checkBox('Y', `<checkButton size="0pt">${boxBorder}</checkButton>`));
    expect(items).toEqual([]);
    expect(sink.issues.map((i) => i.feature)).toEqual(['checkButton size 0pt (a box of no size is not drawn)']);
  });
});
