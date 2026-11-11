import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../../pdf/errors.js';
import { ByteView } from '../bytes.js';

describe('ByteView: one bounds-checked reader for fonts (big-endian) and images (either order)', () => {
  const data = Uint8Array.of(0x01, 0x02, 0x03, 0x04, 0xff, 0xff, 0xff, 0xfe);

  it('reads big-endian by default and little-endian when asked, with u8 and i32', () => {
    const big = new ByteView(data);
    expect([big.u8(0), big.u16(0), big.u32(0), big.i32(4)]).toEqual([1, 0x0102, 0x01020304, -2]);
    const little = new ByteView(data, { littleEndian: true });
    expect([little.u16(0), little.u32(0), little.i32(4)]).toEqual([0x0201, 0x04030201, -16777217]);
    expect(little.bytes).toBe(data);
  });

  it('keeps the font error by default: an XfaPdfError MALFORMED naming font data', () => {
    let thrown: unknown;
    try {
      new ByteView(data).u32(6);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(XfaPdfError);
    expect((thrown as XfaPdfError).code).toBe('MALFORMED');
    expect((thrown as XfaPdfError).message).toBe('Font data ends before byte 10 (read of 4 at 6)');
  });

  it('raises the error of the supplied factory, with what was being read, and never reads past the end', () => {
    const view = new ByteView(data, { fail: (at, length, what) => new RangeError(`${what}@${at}+${length}`) });
    expect(() => view.u16(7)).toThrow(new RangeError('data@7+2'));
    expect(() => view.need(0, 99, 'palette')).toThrow(new RangeError('palette@0+99'));
    expect(view.has(0, 8)).toBe(true);
    expect(view.has(1, 8)).toBe(false);
  });
});
