import { expect } from 'vitest';
import { XfaPdfError, type XfaPdfErrorCode } from '../errors.js';

/** Asserts the promise rejects with an XfaPdfError (of `code`, if given), never a RangeError/TypeError/DOMException/hang. */
export async function expectXfaError(p: Promise<unknown>, code?: XfaPdfErrorCode): Promise<XfaPdfError> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(XfaPdfError);
  const err = e as XfaPdfError;
  if (code !== undefined) expect(err.code).toBe(code);
  return err;
}

/** Asserts the promise rejects with XfaPdfError code MALFORMED (not a RangeError/TypeError/hang). */
export const expectMalformed = (p: Promise<unknown>): Promise<XfaPdfError> => expectXfaError(p, 'MALFORMED');
