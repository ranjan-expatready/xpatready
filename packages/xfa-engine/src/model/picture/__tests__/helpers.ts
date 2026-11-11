import { expect } from 'vitest';
import { XfaPdfError, type XfaPdfErrorCode } from '../../../pdf/errors.js';
import { compilePicture, type Picture, type PictureCategory } from '../index.js';

export function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

/** Asserts `fn` throws an XfaPdfError of `code` (never a RangeError/TypeError/hang) and returns it. */
export function expectXfa(fn: () => unknown, code: XfaPdfErrorCode, match?: RegExp): XfaPdfError {
  const e = caught(fn);
  expect(e, 'must throw a typed XfaPdfError').toBeInstanceOf(XfaPdfError);
  const err = e as XfaPdfError;
  expect(err.code).toBe(code);
  if (match !== undefined) expect(err.message).toMatch(match);
  return err;
}

/** The canonical value `source` parses `input` to, or `'FAIL'` when it does not parse. */
export function parsed(source: string, input: string): string | null {
  const r = compilePicture(source).parse(input);
  return r.ok ? r.canonical : 'FAIL';
}

/** The display text `source` formats `canonical` to, or `'FAIL'` when it cannot. */
export function formatted(source: string, canonical: string | null): string {
  const r = compilePicture(source).format(canonical);
  return r.ok ? r.text : 'FAIL';
}

export function categoryOf(picture: Picture, input: string): PictureCategory | undefined {
  const r = picture.parse(input);
  return r.ok ? r.category : undefined;
}

export { compilePicture };
