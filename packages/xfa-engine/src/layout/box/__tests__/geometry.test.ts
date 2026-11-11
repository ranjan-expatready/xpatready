import { describe, expect, it } from 'vitest';
import { nominalExtent as nominalExtentWith, placeInParent as placeWith } from '../geometry.js';
import { IssueSink } from '../issues.js';
import type { NominalExtent, Rect } from '../types.js';
import { ANCHOR_TYPES, type AnchorType } from '../types.js';
import type { FormNode } from '../../../model/form/index.js';
import { expectLayoutError, expectRect, field, nodeOf, rect } from './helpers.js';

const parent = rect(5, 7, 500, 500);
const nominalExtent = (node: FormNode): NominalExtent => nominalExtentWith(node, new IssueSink());
const placeInParent = (node: FormNode, content: Rect, extent?: NominalExtent): ReturnType<typeof placeWith> => placeWith(node, content, new IssueSink(), extent);
const at = (attrs: string): ReturnType<typeof nodeOf> => nodeOf(field(attrs), 'field', 'f');

describe('nominalExtent', () => {
  it('reads w and h in points and marks neither dimension growable', () => {
    expect(nominalExtent(at('w="20pt" h="10pt"'))).toEqual({ widthPt: 20, heightPt: 10, growableWidth: false, growableHeight: false });
  });

  it('converts mm and in with the unit table', () => {
    const e = nominalExtent(at('w="25.4mm" h="1in"'));
    expect(e.widthPt).toBeCloseTo(72, 6);
    expect(e.heightPt).toBeCloseTo(72, 6);
  });

  it('an absent h is growable and starts at the minH floor, an absent w at the minW floor', () => {
    expect(nominalExtent(at('w="20pt" minH="12pt"'))).toEqual({ widthPt: 20, heightPt: 12, growableWidth: false, growableHeight: true });
    expect(nominalExtent(at('h="10pt" minW="30pt"'))).toEqual({ widthPt: 30, heightPt: 10, growableWidth: true, growableHeight: false });
    expect(nominalExtent(at(''))).toEqual({ widthPt: 0, heightPt: 0, growableWidth: true, growableHeight: true });
  });

  it('minH and minW are floors for a given h and w too', () => {
    const e = nominalExtent(at('w="20pt" h="10pt" minW="25pt" minH="4pt"'));
    expect(e.widthPt).toBe(25);
    expect(e.heightPt).toBe(10);
    expect(e.growableWidth).toBe(false);
  });

  it('an h of 0 is a given height (a hairline), not growable', () => {
    expect(nominalExtent(at('w="20pt" h="0pt"')).growableHeight).toBe(false);
  });

  it('reads the effective value: a script-set h wins over the template', () => {
    const node = at('w="20pt" h="10pt"');
    node.setAttr('h', '33pt');
    expect(nominalExtent(node).heightPt).toBe(33);
  });

  it('a negative w, h, minW or minH is reported and read as 0, never used', () => {
    const sink = new IssueSink();
    const e = nominalExtentWith(at('w="-5pt" h="-6pt" minW="-1pt" minH="-1pt"'), sink);
    expect(e).toEqual({ widthPt: 0, heightPt: 0, growableWidth: false, growableHeight: false });
    expect(sink.issues.map((i) => i.feature)).toEqual(['w is negative (read as 0)', 'h is negative (read as 0)', 'minW is negative (read as 0)', 'minH is negative (read as 0)']);
  });

  it('refuses an unsupported unit or a malformed length with a typed error naming the attribute', () => {
    expectLayoutError(() => nominalExtent(at('w="3px" h="1pt"')), 'LAYOUT_UNSUPPORTED', /w:/);
    expectLayoutError(() => nominalExtent(at('w="1pt" h="abc"')), 'INVALID_ARGUMENT', /h:/);
  });
});

describe('placeInParent anchorType', () => {
  // w=20 h=10 at x=100 y=50 inside a parent whose content origin is (5, 7): the anchor lands on (105, 57).
  const fractions: Record<AnchorType, readonly [number, number]> = {
    topLeft: [0, 0],
    topCenter: [0.5, 0],
    topRight: [1, 0],
    middleLeft: [0, 0.5],
    middleCenter: [0.5, 0.5],
    middleRight: [1, 0.5],
    bottomLeft: [0, 1],
    bottomCenter: [0.5, 1],
    bottomRight: [1, 1],
  };

  it.each(ANCHOR_TYPES)('%s puts that point of the box on (x, y)', (anchor) => {
    const [fx, fy] = fractions[anchor];
    const placed = placeInParent(at(`x="100pt" y="50pt" w="20pt" h="10pt" anchorType="${anchor}"`), parent);
    expectRect(placed.rect, rect(105 - 20 * fx, 57 - 10 * fy, 20, 10));
    expect(placed.anchorType).toBe(anchor);
    expect(placed.rotation).toBe(0);
  });

  it('defaults to topLeft, and to x = y = 0 when they are absent', () => {
    const placed = placeInParent(at('w="20pt" h="10pt"'), parent);
    expectRect(placed.rect, rect(5, 7, 20, 10));
    expect(placed.anchorType).toBe('topLeft');
  });

  it('reads a negative x and y', () => {
    expectRect(placeInParent(at('x="-3pt" y="-4pt" w="2pt" h="2pt"'), parent).rect, rect(2, 3, 2, 2));
  });

  it('refuses an anchorType that is not one of the nine', () => {
    expectLayoutError(() => placeInParent(at('w="2pt" h="2pt" anchorType="centre"'), parent), 'LAYOUT_UNSUPPORTED', /anchorType/);
  });

  it('places with an extent handed in (a growable box whose size the flow has settled)', () => {
    const node = at('x="100pt" y="50pt" anchorType="bottomRight"');
    const placed = placeInParent(node, parent, { widthPt: 20, heightPt: 30, growableWidth: false, growableHeight: false });
    expectRect(placed.rect, rect(85, 27, 20, 30));
  });
});

describe('placeInParent rotate (counter-clockwise about the anchor point)', () => {
  const rotated = (rotate: string, anchor = 'topLeft'): ReturnType<typeof placeInParent> =>
    placeInParent(at(`x="100pt" y="50pt" w="20pt" h="10pt" rotate="${rotate}" anchorType="${anchor}"`), parent);

  it('90 turns the box up from the anchor: width and height swap', () => {
    const placed = rotated('90');
    expectRect(placed.rect, rect(105, 37, 10, 20));
    expect(placed.rotation).toBe(90);
  });

  it('90 about the centre stays centred on the anchor', () => {
    expectRect(rotated('90', 'middleCenter').rect, rect(100, 47, 10, 20));
  });

  it('180 puts a bottomRight-anchored box down and to the right of the anchor', () => {
    expectRect(rotated('180', 'bottomRight').rect, rect(105, 57, 20, 10));
  });

  it('270 and -90 are the same turn: the box goes down and to the left of a topLeft anchor', () => {
    expectRect(rotated('270').rect, rect(95, 57, 10, 20));
    expectRect(rotated('-90').rect, rect(95, 57, 10, 20));
  });

  it('0, 360 and -360 are no turn', () => {
    for (const r of ['0', '360', '-360']) expectRect(rotated(r).rect, rect(105, 57, 20, 10));
  });

  it('a turn that is not a multiple of 90 is LAYOUT_UNSUPPORTED, and text that is not an integer is refused', () => {
    expectLayoutError(() => rotated('45'), 'LAYOUT_UNSUPPORTED', /rotate/);
    expectLayoutError(() => rotated('90deg'), 'LAYOUT_UNSUPPORTED', /rotate/);
  });

  it('maps a local rectangle (origin at the unrotated top-left) through the same turn', () => {
    // Content inset left 2, top 3, right 4, bottom 5 on the 20 x 10 box: after a 90 turn the old top inset is the new left one.
    const placed = rotated('90');
    expectRect(placed.toFrame(rect(2, 3, 14, 2)), rect(108, 41, 2, 14));
  });

  it('maps a local rectangle unchanged when there is no turn', () => {
    expectRect(placeInParent(at('x="100pt" y="50pt" w="20pt" h="10pt"'), parent).toFrame(rect(2, 3, 14, 2)), rect(107, 60, 14, 2));
  });
});
