import { describe, expect, it, vi } from 'vitest';
import {
  HEADER,
  PdfOut,
  writeObj,
  writeObjStm,
  writeStreamObj,
  writeTail,
  writeXrefStream,
  zlib,
  type XrefRow,
} from '../../__tests__/fixtures/build-pdf.js';
import { PdfReader } from '../reader.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

vi.mock('../flate.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../flate.js')>();
  return { ...actual, inflate: vi.fn(actual.inflate) };
});
const { inflate } = await import('../flate.js');
const actualFlate = await vi.importActual<typeof import('../flate.js')>('../flate.js');

/**
 * Stream 3 has `/Filter [9 0 R 10 0 R]`; object 9 lives in object stream 5 and object 10 in object stream 6, so
 * resolving the filter array forces two different object-stream decodes.
 */
function buildFilterRefsInTwoObjStms(): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o1 = writeObj(out, 1, '<</Type/Catalog>>');
  const o3 = writeStreamObj(out, 3, '/Filter[9 0 R 10 0 R]', zlib(enc('x')));
  const o5 = writeObjStm(out, 5, [{ num: 9, body: '/FlateDecode' }, { num: 2, body: '(two)' }]);
  const o6 = writeObjStm(out, 6, [{ num: 10, body: '/FlateDecode' }, { num: 4, body: '(four)' }]);
  const xo = out.length;
  const rows: XrefRow[] = [
    { type: 0, f2: 0, f3: 255 },
    { type: 1, f2: o1, f3: 0 },
    { type: 2, f2: 5, f3: 1 },
    { type: 1, f2: o3, f3: 0 },
    { type: 2, f2: 6, f3: 1 },
    { type: 1, f2: o5, f3: 0 },
    { type: 1, f2: o6, f3: 0 },
    { type: 1, f2: xo, f3: 0 },
    { type: 0, f2: 0, f3: 0 },
    { type: 2, f2: 5, f3: 0 },
    { type: 2, f2: 6, f3: 0 },
  ];
  writeXrefStream(out, 7, rows, '/Size 11/Root 1 0 R');
  writeTail(out, xo);
  return out.toBytes();
}

describe('PdfReader decodes sequentially', () => {
  it('resolving a /Filter array whose refs sit in different object streams never runs two inflates at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(inflate).mockReset();
    vi.mocked(inflate).mockImplementation(async (bytes, limit) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return await actualFlate.inflate(bytes, limit);
      } finally {
        inFlight -= 1;
      }
    });

    const reader = await PdfReader.open(buildFilterRefsInTwoObjStms());
    const opened = vi.mocked(inflate).mock.calls.length; // the xref stream
    const stream = await reader.get(3);
    // two FlateDecode entries are an unsupported chain, but only AFTER both refs were resolved
    await expectMalformed(reader.decodedStream(stream as never));

    expect(vi.mocked(inflate).mock.calls.length - opened).toBe(2); // both object streams were decoded
    expect(maxInFlight).toBe(1);
  });
});
