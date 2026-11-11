import { expect } from 'vitest';
import { build, find } from '../../../model/form/__tests__/helpers.js';
import { XfaLayoutError, type XfaLayoutErrorCode } from '../../errors.js';
import type { FormNode } from '../../../model/form/index.js';
import type { Rect } from '../types.js';

export { build, find };

/** The form node of the first `<draw name="d">`-style element in a synthetic template body (points throughout). */
export function nodeOf(body: string, className: string, name: string): FormNode {
  return find(build(body).dom, className, name);
}

export const rect = (xPt: number, yPt: number, widthPt: number, heightPt: number): Rect => ({ xPt, yPt, widthPt, heightPt });

/** A parent content region at the frame origin. */
export const ORIGIN = rect(0, 0, 1000, 1000);

/** Asserts a rectangle to 0.01 pt on every side (the card's tolerance). */
export function expectRect(actual: Rect | undefined, expected: Rect): void {
  expect(actual, 'rectangle').toBeDefined();
  const a = actual as Rect;
  expect(a.xPt).toBeCloseTo(expected.xPt, 2);
  expect(a.yPt).toBeCloseTo(expected.yPt, 2);
  expect(a.widthPt).toBeCloseTo(expected.widthPt, 2);
  expect(a.heightPt).toBeCloseTo(expected.heightPt, 2);
}

/**
 * Asserts `fn` throws an `XfaLayoutError` of `code` (and its message matches). The shared `expectXfa` of the form tests
 * types its code as `XfaPdfErrorCode`, which does not include the layout codes, so it cannot be reused for them.
 */
export function expectLayoutError(fn: () => unknown, code: XfaLayoutErrorCode, match?: RegExp): void {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, 'must throw a typed XfaLayoutError').toBeInstanceOf(XfaLayoutError);
  expect((thrown as XfaLayoutError).code).toBe(code);
  if (match !== undefined) expect((thrown as XfaLayoutError).message).toMatch(match);
}

/** A positioned text field of the given geometry, with extra attributes and children. */
export const field = (attrs: string, children = ''): string => `<field name="f" ${attrs}><ui><textEdit/></ui>${children}</field>`;
