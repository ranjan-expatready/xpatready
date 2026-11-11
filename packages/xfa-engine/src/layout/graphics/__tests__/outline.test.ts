import { describe, expect, it } from 'vitest';
import { effectiveRadiusPt, shapeItems } from '../outline.js';
import { cornerOf, expectLine, expectValid, linesOf, rectOf, styleOf } from './helpers.js';

const R = rectOf(10, 20, 100, 50);

describe('shapeItems: a square box, four 2 pt edges, by hand', () => {
  it('even: each stroke is centred on its edge line, top and bottom claim the corner squares, left and right run between them', () => {
    const items = shapeItems(R, styleOf({ hand: 0 }));
    expect(items).toHaveLength(4);
    const [top, right, bottom, left] = items;
    expectLine(top, 9, 20, 111, 20, 2);
    expectLine(right, 110, 21, 110, 69, 2);
    expectLine(bottom, 9, 70, 111, 70, 2);
    expectLine(left, 10, 21, 10, 69, 2);
    expectValid(items);
  });

  it('right: the stroke lies wholly inside the edge lines', () => {
    const [top, right, bottom, left] = shapeItems(R, styleOf({ hand: 1 }));
    expectLine(top, 10, 21, 110, 21, 2);
    expectLine(right, 109, 22, 109, 68, 2);
    expectLine(bottom, 10, 69, 110, 69, 2);
    expectLine(left, 11, 22, 11, 68, 2);
  });

  it('left: the stroke lies wholly outside the edge lines', () => {
    const [top, right, bottom, left] = shapeItems(R, styleOf({ hand: -1 }));
    expectLine(top, 8, 19, 112, 19, 2);
    expectLine(right, 111, 20, 111, 70, 2);
    expectLine(bottom, 8, 71, 112, 71, 2);
    expectLine(left, 9, 20, 9, 70, 2);
  });

  it('the three hands paint the same area for a one-point stroke: inside, centred and outside differ only by half and whole thicknesses', () => {
    const top = (hand: -1 | 0 | 1): number => linesOf(shapeItems(R, styleOf({ hand }, {}, {}, { thicknessPt: 1 })))[0]?.y1Pt ?? Number.NaN;
    expect(top(1)).toBeCloseTo(20.5, 3);
    expect(top(0)).toBeCloseTo(20, 3);
    expect(top(-1)).toBeCloseTo(19.5, 3);
  });
});

describe('shapeItems: sides and corners', () => {
  it('a hidden edge and an edge of zero thickness are not drawn', () => {
    const items = shapeItems(R, styleOf({}, { 0: { visible: false }, 2: { thicknessPt: 0 } }));
    expect(items).toHaveLength(2);
    expect(linesOf(items).map((l) => l.x1Pt === l.x2Pt)).toEqual([true, true]);
  });

  it('a lone visible edge runs the whole side between the edge lines of the box', () => {
    const only = styleOf({}, { 0: { visible: false }, 1: { visible: false }, 3: { visible: false } });
    expectLine(shapeItems(R, only)[0], 10, 70, 110, 70, 2);
  });

  it('strokes of different thickness join with a square corner: the thicker horizontal claims the whole vertical band', () => {
    const [top, right, bottom, left] = shapeItems(R, styleOf({}, { 0: { thicknessPt: 4 }, 3: { thicknessPt: 6 } }));
    expectLine(top, 7, 20, 111, 20, 4);
    expectLine(right, 110, 22, 110, 69, 2);
    expectLine(bottom, 7, 70, 111, 70, 2);
    expectLine(left, 10, 22, 10, 69, 6);
  });

  it('a hidden corner does not break the join: only the edges decide where strokes end (pdf.js Border $toStyle), a hidden edge does', () => {
    const [top, , , left] = shapeItems(R, styleOf({}, {}, { 0: { visible: false } }));
    expectLine(top, 9, 20, 111, 20, 2);
    expectLine(left, 10, 21, 10, 69, 2);
    const [topOnly] = shapeItems(R, styleOf({}, { 3: { visible: false } }));
    expectLine(topOnly, 10, 20, 111, 20, 2);
  });

  it('a visible fill is a box item over the reference rectangle, painted before the strokes', () => {
    const items = shapeItems(R, styleOf({ fill: [1, 2, 3] }));
    expect(items[0]).toEqual({ kind: 'box', rect: { xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 }, fill: [1, 2, 3] });
    expect(items).toHaveLength(5);
  });

  it('a fill with no visible edge is the fill alone', () => {
    const hidden = { visible: false };
    expect(shapeItems(R, styleOf({ fill: [9, 9, 9] }, { 0: hidden, 1: hidden, 2: hidden, 3: hidden }))).toHaveLength(1);
  });
});

describe('shapeItems: stroke styles', () => {
  it('a dashed stroke keeps its name for the viewer to dash', () => {
    expect(linesOf(shapeItems(R, styleOf({}, {}, {}, { stroke: 'dashed' }))).map((l) => l.stroke)).toEqual(['dashed', 'dashed', 'dashed', 'dashed']);
  });

  it('lowered gives the top and left their dark tone and the bottom and right their light one, as plain strokes', () => {
    const items = linesOf(shapeItems(R, styleOf({}, {}, {}, { stroke: 'lowered', colour: [100, 100, 100] })));
    expect(items.map((l) => l.colour)).toEqual([[50, 50, 50], [178, 178, 178], [178, 178, 178], [50, 50, 50]]);
    expect(items.map((l) => l.stroke)).toEqual(['solid', 'solid', 'solid', 'solid']);
  });

  it('etched splits each side into two half-thickness strokes, outermost first, each at its own offset', () => {
    const items = shapeItems(R, styleOf({}, {}, {}, { stroke: 'etched', colour: [100, 100, 100] }));
    expect(items).toHaveLength(8);
    const [topOuter, topInner, , , bottomOuter, bottomInner] = linesOf(items);
    expectLine(topOuter, 9, 19.5, 111, 19.5, 1);
    expectLine(topInner, 9, 20.5, 111, 20.5, 1);
    expect(topOuter?.colour).toEqual([50, 50, 50]);
    expect(topInner?.colour).toEqual([178, 178, 178]);
    expectLine(bottomOuter, 9, 70.5, 111, 70.5, 1);
    expectLine(bottomInner, 9, 69.5, 111, 69.5, 1);
    expect(bottomOuter?.colour).toEqual([178, 178, 178]);
  });
});

describe('shapeItems: rounded corners', () => {
  const round = { 0: { join: 'round' as const, radiusPt: 5 }, 1: { join: 'round' as const, radiusPt: 5 }, 2: { join: 'round' as const, radiusPt: 5 }, 3: { join: 'round' as const, radiusPt: 5 } };

  it('the radius counts only for a round join: a square join with a radius is a square corner (pdf.js Corner $toStyle)', () => {
    expect(effectiveRadiusPt(cornerOf('topLeft', { radiusPt: 5.08, join: 'square' }))).toBe(0);
    expect(effectiveRadiusPt(cornerOf('topLeft', { radiusPt: 5.08, join: 'round' }))).toBe(5.08);
    // pdf.js ignores corner presence: a hidden round corner keeps its radius.
    expect(effectiveRadiusPt(cornerOf('topLeft', { radiusPt: 5, join: 'round', visible: false }))).toBe(5);
    const squareJoin = shapeItems(R, styleOf({}, {}, { 0: { radiusPt: 5.08 } }));
    expect(squareJoin.every((item) => item.kind === 'line')).toBe(true);
  });

  it('a round corner makes the whole border one box item: the centre line of the strokes, fill, edges and corners', () => {
    const items = shapeItems(R, styleOf({ fill: [5, 6, 7] }, {}, round));
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      kind: 'box',
      rect: { xPt: 10, yPt: 20, widthPt: 100, heightPt: 50 },
      fill: [5, 6, 7],
      edges: [
        { side: 'top', thicknessPt: 2, colour: [0, 0, 0], stroke: 'solid' },
        { side: 'right', thicknessPt: 2, colour: [0, 0, 0], stroke: 'solid' },
        { side: 'bottom', thicknessPt: 2, colour: [0, 0, 0], stroke: 'solid' },
        { side: 'left', thicknessPt: 2, colour: [0, 0, 0], stroke: 'solid' },
      ],
      corners: ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map((corner) => ({ corner, radiusPt: 5, inverted: false, join: 'round' })),
    });
    expectValid(items);
  });

  it('the centre line follows hand: inside strokes pull the rectangle in by half a thickness', () => {
    const [box] = shapeItems(R, styleOf({ hand: 1 }, {}, round));
    expect(box?.kind === 'box' ? box.rect : undefined).toEqual({ xPt: 11, yPt: 21, widthPt: 98, heightPt: 48 });
  });

  it('a hidden side is left out of the box item\'s edges; an inverted corner is passed on', () => {
    const [box] = shapeItems(R, styleOf({}, { 1: { visible: false } }, { 0: { join: 'round', radiusPt: 4, inverted: true } }));
    expect(box?.kind === 'box' ? box.edges?.map((e) => e.side) : undefined).toEqual(['top', 'bottom', 'left']);
    expect(box?.kind === 'box' ? box.corners?.[0] : undefined).toEqual({ corner: 'topLeft', radiusPt: 4, inverted: true, join: 'round' });
  });

  it('forcing a radius (a round check box) rounds all four corners whatever the corners say', () => {
    const [box] = shapeItems(rectOf(0, 0, 10, 10), styleOf({}, {}, {}, { thicknessPt: 1 }), { roundRadiusPt: 5 });
    expect(box?.kind === 'box' ? box.corners?.map((c) => c.radiusPt) : undefined).toEqual([5, 5, 5, 5]);
  });

  it('etched and embossed edges on a round box keep their name for the viewer, which draws the grooves', () => {
    for (const stroke of ['etched', 'embossed'] as const) {
      const [box] = shapeItems(R, styleOf({}, {}, round, { stroke }));
      expect(box?.kind === 'box' ? box.edges?.map((e) => e.stroke) : undefined).toEqual([stroke, stroke, stroke, stroke]);
    }
  });

  it('nothing at all is drawn for round corners with no fill and no visible edge', () => {
    const hidden = { visible: false };
    expect(shapeItems(R, styleOf({}, { 0: hidden, 1: hidden, 2: hidden, 3: hidden }, round))).toEqual([]);
  });
});
