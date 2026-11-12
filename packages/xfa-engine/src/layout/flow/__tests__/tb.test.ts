import { describe, expect, it } from 'vitest';
import { boxOf, draw, expectBox, featuresOf, named, run, sub } from './helpers.js';

describe('tb: children stacked from the top', () => {
  it('stacks children at the left edge in document order and ignores their own x and y', () => {
    const { layout } = run(`<subform name="s" layout="tb" w="100pt">${draw('a', 'x="50pt" y="50pt" w="40pt" h="10pt"')}${draw('b', 'x="7pt" w="60pt" h="20pt"')}</subform>`);
    expectBox(layout, 'a', 0, 0, 40, 10);
    expectBox(layout, 'b', 0, 10, 60, 20);
    expectBox(layout, 's', 0, 0, 100, 30);
  });

  it('a hidden child takes no room, an invisible one keeps its room without being drawn', () => {
    const body = `<subform name="s" layout="tb" w="100pt">${draw('a', 'w="40pt" h="10pt"')}${draw('gone', 'w="30pt" h="50pt" presence="hidden"')}${draw('ghost', 'w="30pt" h="7pt" presence="invisible"')}${draw('e', 'w="30pt" h="4pt"')}</subform>`;
    const { layout } = run(body);
    expectBox(layout, 'gone', 0, 10, 30, 50);
    expect(named(layout, 'gone').occupiesSpace).toBe(false);
    expectBox(layout, 'ghost', 0, 10, 30, 7);
    expect(named(layout, 'ghost').occupiesSpace).toBe(true);
    expect(named(layout, 'ghost').drawn).toBe(false);
    expectBox(layout, 'e', 0, 17, 30, 4);
    expect(sub(layout, 's').rect.heightPt).toBeCloseTo(21, 2);
  });

  it('a hidden container hides its subtree and takes no room for any of it', () => {
    const body = `<subform name="s" layout="tb" w="100pt"><subform name="h" layout="tb" presence="hidden">${draw('inner', 'w="40pt" h="30pt"')}</subform>${draw('after', 'w="10pt" h="5pt"')}</subform>`;
    const { layout } = run(body);
    expect(named(layout, 'inner').occupiesSpace).toBe(false);
    expect(named(layout, 'inner').drawn).toBe(false);
    expectBox(layout, 'after', 0, 0, 10, 5);
  });

  it('a print-only child is not shown on screen and takes no room', () => {
    const { layout } = run(`<subform name="s" layout="tb" w="50pt">${draw('p', 'w="10pt" h="40pt" relevant="print"')}${draw('v', 'w="10pt" h="5pt"')}</subform>`);
    expectBox(layout, 'v', 0, 0, 10, 5);
  });

  it('a container with no w is as wide as its widest child and as tall as the children together, plus its margin', () => {
    const body = `<subform name="s" layout="tb"><margin leftInset="3pt" topInset="2pt" rightInset="5pt" bottomInset="4pt"/>${draw('a', 'w="40pt" h="10pt"')}${draw('b', 'w="60pt" h="20pt"')}</subform>`;
    const { layout } = run(body);
    expectBox(layout, 's', 0, 0, 68, 36);
    expectBox(layout, 'a', 3, 2, 40, 10);
    expectBox(layout, 'b', 3, 12, 60, 20);
  });

  it('a tb container placed by x and y in a position parent carries its children with it, and the position parent grows to reach them', () => {
    const body = `<subform name="p" layout="position"><subform name="s" layout="tb" x="10pt" y="20pt" w="50pt">${draw('a', 'w="40pt" h="10pt"')}${draw('b', 'w="30pt" h="15pt"')}</subform></subform>`;
    const { layout } = run(body);
    expectBox(layout, 's', 10, 20, 50, 25);
    expectBox(layout, 'a', 10, 20, 40, 10);
    expectBox(layout, 'b', 10, 30, 30, 15);
    expectBox(layout, 'p', 0, 0, 60, 45);
  });

  it('a position container inside a tb container is laid out and then placed in the flow, whatever its own x and y', () => {
    const body = `<subform name="s" layout="tb"><subform name="p" x="99pt" y="99pt" layout="position">${draw('in', 'x="4pt" y="6pt" w="10pt" h="10pt"')}</subform>${draw('next', 'w="5pt" h="5pt"')}</subform>`;
    const { layout } = run(body);
    expectBox(layout, 'p', 0, 0, 14, 16);
    expectBox(layout, 'in', 4, 6, 10, 10);
    expectBox(layout, 'next', 0, 16, 5, 5);
  });

  it('nested tb containers sum their heights and take the widest width', () => {
    const body = `<subform name="outer" layout="tb">${draw('a', 'w="20pt" h="10pt"')}<subform name="inner" layout="tb">${draw('b', 'w="70pt" h="10pt"')}${draw('c', 'w="30pt" h="10pt"')}</subform></subform>`;
    const { layout } = run(body);
    expectBox(layout, 'inner', 0, 10, 70, 20);
    expectBox(layout, 'outer', 0, 0, 70, 30);
  });

  it('a flowed child turned a quarter turn is placed by its turned bounding box', () => {
    const { layout } = run(`<subform name="s" layout="tb">${draw('r', 'w="10pt" h="30pt" rotate="90"')}${draw('after', 'w="5pt" h="5pt"')}</subform>`);
    expectBox(layout, 'r', 0, 0, 30, 10);
    expectBox(layout, 'after', 0, 10, 5, 5);
  });

  it('a para on a flowed child is its text alignment and is not looked at; a para hAlign on the flowed container itself is reported once and nothing is aligned', () => {
    const own = `<subform name="s" layout="tb" w="100pt"><subform name="c" layout="position" w="20pt" h="10pt"><para hAlign="center"/></subform></subform>`;
    const child = run(own).layout;
    expectBox(child, 'c', 0, 0, 20, 10);
    expect(featuresOf(child).filter((feature) => feature.startsWith('flowed child alignment'))).toEqual([]);
    const container = run(`<subform name="s" layout="tb" w="100pt"><para hAlign="center"/>${draw('a', 'w="20pt" h="10pt"')}${draw('b', 'w="30pt" h="10pt"')}</subform>`).layout;
    expectBox(container, 'a', 0, 0, 20, 10);
    expectBox(container, 'b', 0, 10, 30, 10);
    expect(featuresOf(container).filter((feature) => feature.startsWith('flowed child alignment'))).toEqual(['flowed child alignment not applied (para hAlign="center")']);
    const inRow = run(`<subform name="r" layout="row"><para hAlign="right"/>${draw('a', 'w="20pt" h="10pt"')}</subform>`).layout;
    expect(featuresOf(inRow)).toContain('flowed child alignment not applied (para hAlign="right")');
    const left = run(`<subform name="s" layout="tb"><para hAlign="left"/>${draw('a', 'w="20pt" h="10pt"')}</subform>`).layout;
    expect(featuresOf(left).filter((feature) => feature.startsWith('flowed child alignment'))).toEqual([]);
  });

  it('a container with a given size keeps it for drawing; children that reach past it are reported', () => {
    const body = `<subform name="s" layout="tb" w="30pt" h="15pt">${draw('a', 'w="50pt" h="20pt"')}</subform>`;
    const { layout } = run(body);
    expectBox(layout, 's', 0, 0, 30, 15);
    expect(featuresOf(layout)).toContain('flowed children reach 5.000pt beyond the given h and 20.000pt beyond the given w (the box keeps the given size; the flow advances by the content height; the content overflows)');
  });

  it('the next sibling of a fixed-h container whose content overflows lands after the content, not on top of it (pdf.js bbox), and the container is still drawn at its given size', () => {
    const body = `<subform name="s" layout="tb" w="100pt"><subform name="inner" layout="tb" w="40pt" h="15pt">${draw('big', 'w="40pt" h="20pt"')}</subform>${draw('next', 'w="10pt" h="5pt"')}</subform>`;
    const { layout } = run(body);
    expectBox(layout, 'inner', 0, 0, 40, 15);
    expect(named(layout, 'inner').flowHeightPt).toBe(20);
    expectBox(layout, 'next', 0, 20, 10, 5);
    expectBox(layout, 's', 0, 0, 100, 25);
  });

  it('an inner container with a given w never widens its parent: the outer tb is as wide as the given w, and the overflow is reported', () => {
    const { layout } = run(`<subform name="outer" layout="tb"><subform name="inner" layout="tb" w="30pt">${draw('big', 'w="50pt" h="10pt"')}</subform></subform>`);
    expectBox(layout, 'inner', 0, 0, 30, 10);
    expectBox(layout, 'outer', 0, 0, 30, 10);
    expect(named(layout, 'inner').flowHeightPt).toBeUndefined();
    expect(featuresOf(layout)).toContain('flowed children reach 20.000pt beyond the given w (the box keeps the given size; the flow advances by the content height; the content overflows)');
  });

  it('a container that is wide enough takes up exactly its given size in the flow, margins included, and one that overflows takes up the content plus its margin', () => {
    const fits = run(`<subform name="s" layout="tb" w="100pt"><subform name="inner" layout="tb" h="30pt">${draw('a', 'w="40pt" h="20pt"')}</subform>${draw('next', 'w="10pt" h="5pt"')}</subform>`).layout;
    expect(named(fits, 'inner').flowHeightPt).toBeUndefined();
    expectBox(fits, 'next', 0, 30, 10, 5);
    const margin = run(`<subform name="s" layout="tb" w="100pt"><subform name="inner" layout="tb" h="15pt"><margin topInset="2pt" bottomInset="3pt" leftInset="0pt" rightInset="0pt"/>${draw('a', 'w="40pt" h="20pt"')}</subform>${draw('next', 'w="10pt" h="5pt"')}</subform>`).layout;
    expect(named(margin, 'inner').flowHeightPt).toBeCloseTo(25, 2);
    expectBox(margin, 'next', 0, 25, 10, 5);
  });

  it('layout lr-tb is still refused with a placeholder and an issue, and the rest of the form lays out', () => {
    const body = `<subform name="s" layout="tb">${draw('a', 'w="20pt" h="10pt"')}<subform name="lr" layout="lr-tb" w="30pt" h="30pt">${draw('x', 'w="5pt" h="5pt"')}</subform>${draw('b', 'w="20pt" h="10pt"')}</subform>`;
    const { layout } = run(body);
    expect(named(layout, 'lr').placeholder).toBe('layout="lr-tb"');
    expectBox(layout, 'b', 0, 40, 20, 10);
    expect(layout.issues.some((issue) => issue.feature === 'layout="lr-tb"')).toBe(true);
  });

  it('an exclusion group laid out in tb stacks its radio fields', () => {
    const radio = (name: string): string => `<field name="${name}" w="12pt" h="12pt"><ui><checkButton/></ui></field>`;
    const { layout } = run(`<exclGroup name="g" layout="tb">${radio('one')}${radio('two')}</exclGroup>`);
    expectBox(layout, 'one', 0, 0, 12, 12);
    expectBox(layout, 'two', 0, 12, 12, 12);
    expectBox(layout, 'g', 0, 0, 12, 24);
  });

  it('text of a flowed draw is laid out in the box the flow gave it', () => {
    const { layout } = run(`<subform name="s" layout="tb" x="5pt" y="9pt">${draw('a', 'w="60pt" h="10pt"', '<value><text>hi</text></value>')}${draw('b', 'w="60pt" h="14pt"', '<value><text>yo</text></value>')}</subform>`);
    const second = layout.texts.find((entry) => entry.box.node.name === 'b');
    const box = boxOf(layout.root, 'draw', 'b');
    expect(box.rect.yPt).toBeCloseTo(19, 2);
    expect(second?.value?.lines[0]?.runs[0]?.text).toBe('yo');
    expect(second?.value?.lines[0]?.xPt).toBe(0);
  });
});
