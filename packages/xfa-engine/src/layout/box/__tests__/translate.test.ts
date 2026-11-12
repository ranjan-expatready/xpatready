import { describe, expect, it } from 'vitest';
import { layoutBoxes } from '../build.js';
import { translateBox } from '../translate.js';
import type { LayoutBox } from '../types.js';
import { build, expectRect, find, ORIGIN, rect } from './helpers.js';

const body =
  '<subform name="s" x="10pt" y="20pt" w="100pt" h="80pt"><margin leftInset="2pt" topInset="3pt"/>' +
  '<field name="a" x="1pt" y="1pt" w="40pt" h="20pt"><ui><textEdit/></ui><caption placement="left" reserve="10pt"/></field>' +
  '<subform name="t" x="50pt" y="30pt" w="20pt" h="20pt"><field name="b" x="2pt" y="2pt" w="5pt" h="5pt"><ui><textEdit/></ui></field></subform></subform>';

const tree = (): LayoutBox => layoutBoxes(find(build(body).dom, 'subform', 's'), ORIGIN).box;

describe('translateBox', () => {
  it('moves the box and everything in it by (dx, dy): rect, content, widget, caption and all descendants', () => {
    const before = tree();
    const moved = translateBox(before, 3, 4);
    expectRect(moved.rect, rect(13, 24, 100, 80));
    expectRect(moved.contentRect, rect(15, 27, 98, 77));
    const a = moved.children[0];
    expectRect(a?.rect, rect(16, 28, 40, 20));
    expectRect(a?.captionRect, rect(16, 28, 10, 20));
    expectRect(a?.widgetRect, rect(26, 28, 30, 20));
    expectRect(moved.children[1]?.children[0]?.rect, rect(67, 59, 5, 5));
  });

  it('keeps sizes, flags, nodes and styles, and leaves the original untouched', () => {
    const before = tree();
    const snapshot = JSON.stringify([before.rect, before.children[0]?.captionRect, before.children[1]?.children[0]?.rect]);
    const moved = translateBox(before, -7, 9);
    expect(JSON.stringify([before.rect, before.children[0]?.captionRect, before.children[1]?.children[0]?.rect])).toBe(snapshot);
    expect(moved.node).toBe(before.node);
    expect(moved.rect.widthPt).toBe(before.rect.widthPt);
    expect(moved.children[0]?.caption).toBe(before.children[0]?.caption);
    expect(moved.presence).toBe(before.presence);
  });

  it('returns the same box when there is nothing to move', () => {
    const before = tree();
    expect(translateBox(before, 0, 0)).toBe(before);
  });

  it('a box with no caption gets none added', () => {
    expect(translateBox(tree(), 1, 1).children[1]?.captionRect).toBeUndefined();
  });
});
