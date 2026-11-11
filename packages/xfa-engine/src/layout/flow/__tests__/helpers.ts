import { expect } from 'vitest';
import type { FormDom } from '../../../model/form/index.js';
import type { LayoutBox } from '../../box/types.js';
import { build, expectRect, rect } from '../../box/__tests__/helpers.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { layoutFlow, type FlowLayout } from '../layout-flow.js';

export { expectRect, rect };

/**
 * Without embedded fonts every typeface is the fixed-pitch Courier fallback: at 10 pt a character advances 6 pt, the
 * ascent is 6.27, the descent 3.73 and the line pitch 12, so a block of n lines is (n - 1) x 12 + 10 pt high.
 */
export interface Run {
  readonly dom: FormDom;
  readonly layout: FlowLayout;
}

/** Lays the synthetic form `body` (inside the root subform `form1`, layout `position`) out as one unbounded content area. */
export function run(body: string, data = '<form1/>'): Run {
  const { dom } = build(body, data);
  return { dom, layout: layoutFlow(dom, emptyTextContext()) };
}

/** The first box under `root` (itself included), in document order, for which `matches` holds. */
export function findBox(root: LayoutBox, matches: (box: LayoutBox) => boolean): LayoutBox {
  const stack: LayoutBox[] = [root];
  while (stack.length > 0) {
    const box = stack.shift();
    if (box === undefined) break;
    if (matches(box)) return box;
    stack.unshift(...box.children);
  }
  throw new Error('no box matches');
}

/** The first box of `className` called `name` in the tree, in document order. */
export const boxOf = (root: LayoutBox, className: string, name: string): LayoutBox => findBox(root, (box) => box.node.className === className && box.node.name === name);

export const sub = (layout: FlowLayout, name: string): LayoutBox => boxOf(layout.root, 'subform', name);
export const named = (layout: FlowLayout, name: string): LayoutBox => findBox(layout.root, (box) => box.node.name === name);

export const featuresOf = (layout: FlowLayout): string[] => layout.issues.map((issue) => issue.feature);

/** Asserts the rectangle of the box named `name` (0.01 pt). */
export function expectBox(layout: FlowLayout, name: string, x: number, y: number, w: number, h: number): void {
  const box = named(layout, name);
  expect(box.rect.xPt, `${name} x`).toBeCloseTo(x, 2);
  expect(box.rect.yPt, `${name} y`).toBeCloseTo(y, 2);
  expect(box.rect.widthPt, `${name} w`).toBeCloseTo(w, 2);
  expect(box.rect.heightPt, `${name} h`).toBeCloseTo(h, 2);
}

export const draw = (name: string, attrs: string, inner = ''): string => `<draw name="${name}" ${attrs}>${inner}</draw>`;
export const text = (value: string): string => `<value><text>${value}</text></value>`;
export const textField = (name: string, attrs: string, inner = '', ui = '<textEdit/>'): string => `<field name="${name}" ${attrs}><ui>${ui}</ui>${inner}</field>`;
