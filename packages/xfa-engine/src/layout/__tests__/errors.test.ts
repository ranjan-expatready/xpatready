import { describe, expect, expectTypeOf, it } from 'vitest';
import { XfaPdfError, type XfaErrorCode } from '../../pdf/errors.js';
import { XfaLayoutError, type XfaLayoutErrorCode } from '../errors.js';

describe('XfaLayoutError joins the one error family', () => {
  it('is an XfaPdfError with its own name and code, and keeps the cause', () => {
    const cause = new Error('inner');
    const error = new XfaLayoutError('LAYOUT_UNSUPPORTED', 'no px', { cause });
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error.name).toBe('XfaLayoutError');
    expect(error.code).toBe('LAYOUT_UNSUPPORTED');
    expect(error.cause).toBe(cause);
    expect(new XfaPdfError('MALFORMED', 'x')).not.toBeInstanceOf(XfaLayoutError);
  });

  it('its codes are part of the merged XfaErrorCode union and the class keeps the narrower type', () => {
    expectTypeOf<XfaLayoutErrorCode>().toExtend<XfaErrorCode>();
    expectTypeOf<XfaLayoutError['code']>().toEqualTypeOf<XfaLayoutErrorCode>();
  });
});
