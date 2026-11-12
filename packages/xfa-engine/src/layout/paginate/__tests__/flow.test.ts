import { describe, expect, it } from 'vitest';
import { allBoxes, block, boxesOf, featuresOf, namesOf, pages, stackOf } from './helpers.js';

describe('pouring the flow into content areas', () => {
  it('places blocks top to bottom in the first content area and moves on to the next page when one does not fit', () => {
    const { paged } = pages(block('a', 40) + block('b', 40) + block('c', 40));
    expect(namesOf(paged)).toEqual([[['a', 'b']], [['c']]]);
    const [first, second] = paged.pages;
    // Page coordinates: the content area's x/y plus the position in the flow (the area of page 1 is at 10, 20; of page 2 at 5, 15).
    expect(first?.contentAreas[0]?.boxes.map((b) => b.rect)).toEqual([
      { xPt: 10, yPt: 20, widthPt: 50, heightPt: 40 },
      { xPt: 10, yPt: 60, widthPt: 50, heightPt: 40 },
    ]);
    expect(second?.contentAreas[0]?.boxes[0]?.rect).toEqual({ xPt: 5, yPt: 15, widthPt: 50, heightPt: 40 });
    expect([first?.widthPt, first?.heightPt]).toEqual([220, 300]);
    expect(paged.truncated).toBe(false);
  });

  it('the first page is the first page area and the next pages follow the page set (P1 is used once, PN for every page after it)', () => {
    const { paged } = pages(block('a', 90) + block('b', 90) + block('c', 90));
    expect(paged.pages.map((p) => p.pageArea?.name)).toEqual(['P1', 'PN', 'PN']);
  });

  it('a block that overruns what is left by no more than the tolerance still fits (pdf.js: round(height - space) <= 2)', () => {
    expect(namesOf(pages(block('a', 60) + block('b', 42.4)).paged)).toEqual([[['a', 'b']]]);
    expect(namesOf(pages(block('a', 60) + block('b', 42.6)).paged)).toEqual([[['a']], [['b']]]);
  });

  it('a hidden block takes no room and is not placed; an invisible one takes room and is placed but not drawn', () => {
    const { paged } = pages(block('a', 30) + block('gone', 50, 'presence="hidden"') + block('ghost', 30, 'presence="invisible"') + block('b', 30));
    expect(namesOf(paged)).toEqual([[['a', 'ghost', 'b']]]);
    expect(paged.pages[0]?.contentAreas[0]?.boxes.map((b) => [b.drawn, b.rect.yPt])).toEqual([[true, 20], [false, 50], [true, 80]]);
  });

  it('a block taller than an empty content area is placed at its top and reported, never looped; the next block starts a new page', () => {
    const { paged } = pages(block('big', 150) + block('after', 10));
    expect(namesOf(paged)).toEqual([[['big']], [['after']]]);
    expect(featuresOf(paged).some((f) => f.startsWith('taller than an empty content area'))).toBe(true);
  });

  it('a zero-height block always fits, even in a full area', () => {
    expect(namesOf(pages(block('a', 100) + block('z', 0)).paged)).toEqual([[['a', 'z']]]);
  });

  it('a form with an empty flow still has one page', () => {
    const { paged } = pages('');
    expect(paged.pages).toHaveLength(1);
    expect(paged.pages[0]?.pageArea?.name).toBe('P1');
  });
});

describe('splitting containers', () => {
  const nodeNamed = (dom: ReturnType<typeof pages>['dom'], name: string): ReturnType<typeof pages>['dom']['root'] => {
    const found = dom.root.children.find((c) => c.name === name);
    if (found === undefined) throw new Error(`no ${name}`);
    return found;
  };

  it('a tb container is cut between its children: one fragment per content area, each as tall as what it holds', () => {
    const { dom, paged } = pages(block('lead', 30) + stackOf('s', 3, 40));
    const fragments = boxesOf(paged, nodeNamed(dom, 's'));
    expect(fragments.map((f) => [f.page, f.box.rect.yPt, f.box.rect.heightPt, f.box.children.map((c) => c.node.name)])).toEqual([
      [0, 50, 40, ['s1']],
      [1, 15, 80, ['s2', 's3']],
    ]);
    expect(namesOf(paged)).toEqual([[['lead', 's']], [['s']]]);
  });

  it('children of a fragment sit at their place in the content area (x of the area, y after what is above)', () => {
    const { dom, paged } = pages(stackOf('s', 3, 40));
    const [onFirst, onSecond] = boxesOf(paged, nodeNamed(dom, 's'));
    expect(onFirst?.box.children.map((c) => [c.rect.xPt, c.rect.yPt])).toEqual([[10, 20], [10, 60]]);
    expect(onSecond?.box.children.map((c) => [c.rect.xPt, c.rect.yPt])).toEqual([[5, 15]]);
  });

  it('the top margin belongs to the first fragment and the bottom margin to the last; a continuation has neither on the other side', () => {
    const margin = '<margin topInset="6pt" bottomInset="4pt" leftInset="2pt" rightInset="0pt"/>';
    const { dom, paged } = pages(stackOf('s', 3, 40, '', margin));
    const [first, last] = boxesOf(paged, nodeNamed(dom, 's'));
    // Page 1: 6 pt of margin, then s1 (40) and s2 (40) = 86; s3 would end at 126 > 100.
    expect(first?.box.rect).toMatchObject({ yPt: 20, heightPt: 86 });
    expect(first?.box.contentRect).toMatchObject({ yPt: 26, heightPt: 80 });
    expect(first?.box.children.map((c) => c.rect.yPt)).toEqual([26, 66]);
    expect(last?.box.rect).toMatchObject({ yPt: 15, heightPt: 44 });
    expect(last?.box.contentRect).toMatchObject({ yPt: 15, heightPt: 40 });
    expect(last?.box.children.map((c) => c.rect.yPt)).toEqual([15]);
  });

  it('a container with a given height taller than its content keeps that height on its last fragment', () => {
    const { dom, paged } = pages(stackOf('s', 1, 30, 'h="70pt"'));
    expect(boxesOf(paged, nodeNamed(dom, 's'))[0]?.box.rect.heightPt).toBe(70);
  });

  it('a nested tb container is cut too, and every open container continues in the next area', () => {
    const inner = stackOf('inner', 3, 40);
    const { dom, paged } = pages(`<subform name="outer" layout="tb" w="100pt">${inner}</subform>`);
    const outer = nodeNamed(dom, 'outer');
    expect(boxesOf(paged, outer).map((f) => [f.page, f.box.rect.heightPt])).toEqual([[0, 80], [1, 40]]);
    expect(namesOf(paged)).toEqual([[['outer']], [['outer']]]);
  });

  it('a table is cut between rows, and a row is not cut', () => {
    const cell = (name: string, h: number): string => `<draw name="${name}" w="20pt" h="${h}pt"/>`;
    const row = (n: number): string => `<subform name="r${n}" layout="row">${cell(`c${n}a`, 45)}${cell(`c${n}b`, 30)}</subform>`;
    const { dom, paged } = pages(`<subform name="t" layout="table" columnWidths="20pt 20pt">${row(1)}${row(2)}${row(3)}</subform>`);
    expect(boxesOf(paged, nodeNamed(dom, 't')).map((f) => [f.page, f.box.children.map((c) => c.node.name)])).toEqual([
      [0, ['r1', 'r2']],
      [1, ['r3']],
    ]);
  });

  it('a container kept intact (contentArea) moves whole to the next area instead of being cut', () => {
    const keep = '<keep intact="contentArea"/>';
    const { dom, paged } = pages(block('lead', 30) + stackOf('s', 3, 30, '', keep));
    expect(namesOf(paged)).toEqual([[['lead']], [['s']]]);
    const [only] = boxesOf(paged, nodeNamed(dom, 's'));
    expect([only?.page, only?.box.children.length]).toEqual([1, 3]);
  });

  it('a kept-intact container taller than an empty area is placed at its top and reported', () => {
    const { paged } = pages(stackOf('s', 3, 50, '', '<keep intact="contentArea"/>'));
    expect(namesOf(paged)).toEqual([[['s']]]);
    expect(featuresOf(paged).some((f) => f.startsWith('taller than an empty content area'))).toBe(true);
  });

  it('a position container is never cut: it moves whole', () => {
    const body = `<subform name="p" layout="position" w="100pt">${block('x', 40, 'x="0pt" y="0pt"')}${block('y', 40, 'x="0pt" y="45pt"')}</subform>`;
    expect(namesOf(pages(block('lead', 40) + body).paged)).toEqual([[['lead']], [['p']]]);
  });

  it('keep next / previous are not modelled and say so', () => {
    const { paged } = pages(stackOf('s', 1, 10, '', '<keep next="contentArea"/>'));
    expect(featuresOf(paged).some((f) => f.startsWith('keep next="contentArea" is not modelled'))).toBe(true);
  });

  it('a margin-only fragment is never left behind: a container whose first child moves on starts in the next area', () => {
    const { dom, paged } = pages(block('lead', 95) + stackOf('s', 2, 40, '', '<margin topInset="3pt"/>'));
    const fragments = boxesOf(paged, nodeNamed(dom, 's'));
    expect(fragments.map((f) => f.page)).toEqual([1]);
    expect(fragments[0]?.box.rect).toMatchObject({ yPt: 15, heightPt: 83 });
  });

  it('every box of a split container appears once: no content lost or repeated', () => {
    const { paged } = pages(block('lead', 30) + stackOf('s', 5, 40));
    const leaves = paged.pages.flatMap((p) => p.contentAreas.flatMap((a) => a.boxes.flatMap(allBoxes))).filter((b) => b.node.className === 'draw').map((b) => b.node.name);
    expect(leaves.sort()).toEqual(['lead', 's1', 's2', 's3', 's4', 's5']);
  });
});

describe('exclusion groups', () => {
  const group = (inner: string, layout = 'tb'): string => `<exclGroup name="g" layout="${layout}" w="100pt">${inner}</exclGroup>`;
  const parts = (n: number, each: number): string => Array.from({ length: n }, (_, i) => block(`r${i + 1}`, each)).join('');
  const groupNode = (r: ReturnType<typeof pages>): ReturnType<typeof pages>['dom']['root'] => {
    const found = r.dom.root.children.find((c) => c.name === 'g');
    if (found === undefined) throw new Error('no g');
    return found;
  };

  it('a tb exclusion group is cut between its children like a subform (pdf.js ExclGroup[$isSplittable])', () => {
    const r = pages(block('lead', 30) + group(parts(3, 40)));
    expect(boxesOf(r.paged, groupNode(r)).map((f) => [f.page, f.box.rect.yPt, f.box.rect.heightPt, f.box.children.map((c) => c.node.name)])).toEqual([
      [0, 50, 40, ['r1']],
      [1, 15, 80, ['r2', 'r3']],
    ]);
  });

  it('a position exclusion group, or one kept intact, is not cut', () => {
    const stepped = [0, 40, 80].map((y, i) => block(`p${i}`, 40, `y="${y}pt"`)).join('');
    expect(namesOf(pages(block('lead', 30) + group(stepped, 'position')).paged)).toEqual([[['lead']], [['g']]]);
    expect(namesOf(pages(block('lead', 30) + group(parts(3, 30) + '<keep intact="contentArea"/>')).paged)).toEqual([[['lead']], [['g']]]);
  });

  it('a top caption belongs to the first fragment: its strip is above the children there, and a continuation starts at the top of the area', () => {
    const caption = '<caption placement="top" reserve="12pt"><value><text>Q</text></value></caption>';
    const r = pages(group(caption + parts(3, 40)));
    const [first, second] = boxesOf(r.paged, groupNode(r));
    // 12 pt of caption, then r1 (40) and r2 (40) = 92; r3 would end at 132 > 100.
    expect(first?.box.rect).toMatchObject({ yPt: 20, heightPt: 92 });
    expect(first?.box.captionRect).toMatchObject({ yPt: 20, heightPt: 12 });
    expect(first?.box.children.map((c) => c.rect.yPt)).toEqual([32, 72]);
    expect(first?.box.widgetRect).toMatchObject({ yPt: 32, heightPt: 80 });
    expect(second?.box.captionRect).toBeUndefined();
    expect(second?.box.rect).toMatchObject({ yPt: 15, heightPt: 40 });
    expect(second?.box.children.map((c) => c.rect.yPt)).toEqual([15]);
  });

  it('a bottom caption belongs to the last fragment: its strip is below the children there', () => {
    const caption = '<caption placement="bottom" reserve="12pt"><value><text>Q</text></value></caption>';
    const r = pages(group(caption + parts(3, 40)));
    const [first, second] = boxesOf(r.paged, groupNode(r));
    expect(first?.box.rect).toMatchObject({ yPt: 20, heightPt: 80 });
    expect(second?.box.rect).toMatchObject({ yPt: 15, heightPt: 52 });
    expect(second?.box.captionRect).toMatchObject({ yPt: 55, heightPt: 12 });
    expect(second?.box.widgetRect).toMatchObject({ yPt: 15, heightPt: 40 });
    expect(first?.box.captionRect).toBeUndefined();
  });
});
