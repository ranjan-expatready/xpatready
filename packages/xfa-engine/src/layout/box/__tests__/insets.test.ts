import { describe, expect, it } from 'vitest';
import { placeInParent as placeWith } from '../geometry.js';
import { insetsOf as insetsWith, localContentRect } from '../insets.js';
import { IssueSink } from '../issues.js';
import { expectLayoutError, expectRect, field, nodeOf, rect } from './helpers.js';

const margin = '<margin topInset="3pt" rightInset="4pt" bottomInset="5pt" leftInset="2pt"/>';
const insetsOf = (node: ReturnType<typeof nodeOf>): ReturnType<typeof insetsWith> => insetsWith(node, new IssueSink());
const placeInParent = (node: ReturnType<typeof nodeOf>, content: ReturnType<typeof rect>): ReturnType<typeof placeWith> => placeWith(node, content, new IssueSink());
const at = (attrs: string, children = ''): ReturnType<typeof nodeOf> => nodeOf(field(attrs, children), 'field', 'f');

describe('insetsOf', () => {
  it('is all zero without a margin', () => {
    expect(insetsOf(at('w="20pt" h="10pt"'))).toEqual({ topPt: 0, rightPt: 0, bottomPt: 0, leftPt: 0 });
  });

  it('reads the four insets, each defaulting to 0 when only some are written', () => {
    expect(insetsOf(at('w="20pt" h="10pt"', margin))).toEqual({ topPt: 3, rightPt: 4, bottomPt: 5, leftPt: 2 });
    expect(insetsOf(at('w="20pt" h="10pt"', '<margin leftInset="1mm"/>'))).toEqual({ topPt: 0, rightPt: 0, bottomPt: 0, leftPt: (72 / 25.4) });
  });

  it('reads a script-set inset', () => {
    const node = at('w="20pt" h="10pt"', margin);
    node.property('margin')?.setAttr('topInset', '6pt');
    expect(insetsOf(node).topPt).toBe(6);
  });

  it('a negative inset is reported against the margin and read as 0', () => {
    const sink = new IssueSink();
    const insets = insetsWith(at('w="20pt" h="10pt"', '<margin topInset="-3pt" leftInset="2pt"/>'), sink);
    expect(insets).toEqual({ topPt: 0, rightPt: 0, bottomPt: 0, leftPt: 2 });
    expect(sink.issues).toHaveLength(1);
    expect(sink.issues[0]?.feature).toBe('topInset is negative (read as 0)');
    expect(sink.issues[0]?.som).toContain('margin');
  });

  it('refuses an inset in an unsupported unit', () => {
    expectLayoutError(() => insetsOf(at('w="20pt" h="10pt"', '<margin topInset="2em"/>')), 'LAYOUT_UNSUPPORTED', /topInset/);
  });
});

describe('localContentRect', () => {
  it('is the box less the insets, in the box own frame', () => {
    expectRect(localContentRect({ widthPt: 20, heightPt: 10 }, { topPt: 3, rightPt: 4, bottomPt: 5, leftPt: 2 }), rect(2, 3, 14, 2));
  });

  it('never goes negative when the insets are larger than the box', () => {
    expectRect(localContentRect({ widthPt: 4, heightPt: 4 }, { topPt: 3, rightPt: 3, bottomPt: 3, leftPt: 3 }), rect(3, 3, 0, 0));
  });

  it('through placeInParent the content of a box at (100, 50) is inset on every side', () => {
    const node = at('x="100pt" y="50pt" w="20pt" h="10pt"', margin);
    const placed = placeInParent(node, rect(0, 0, 500, 500));
    expectRect(placed.toFrame(localContentRect(placed.extent, insetsOf(node))), rect(102, 53, 14, 2));
  });
});
