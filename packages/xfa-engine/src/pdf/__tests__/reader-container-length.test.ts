import { describe, it } from 'vitest';
import {
  HEADER,
  PdfOut,
  writeObjStm,
  writeStreamObj,
  writeTail,
  writeXrefStream,
  type XrefRow,
} from '../../__tests__/fixtures/build-pdf.js';
import { PdfReader } from '../reader.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

/**
 * Object stream 5 has `/Filter 9 0 R`. Object 9 is an ordinary (offset) STREAM whose /Length is the indirect
 * object 10, and object 10 is stored compressed inside object stream 5 itself: resolving 5's filter needs 9's
 * length, which needs 5 to be decoded first.
 */
function buildContainerFilterNeedsOwnLength(): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o5 = writeObjStm(out, 5, [{ num: 1, body: '<</Type/Catalog>>' }, { num: 10, body: '3' }], undefined, '9 0 R');
  const o9 = writeStreamObj(out, 9, '', enc('abc'), '10 0 R');
  const xo = out.length;
  const rows = new Map<number, XrefRow>([
    [0, { type: 0, f2: 0, f3: 255 }],
    [1, { type: 2, f2: 5, f3: 0 }],
    [5, { type: 1, f2: o5, f3: 0 }],
    [9, { type: 1, f2: o9, f3: 0 }],
    [10, { type: 2, f2: 5, f3: 1 }],
    [11, { type: 1, f2: xo, f3: 0 }],
  ]);
  const table: XrefRow[] = [];
  for (let n = 0; n < 12; n++) table.push(rows.get(n) ?? { type: 0, f2: 0, f3: 0 });
  writeXrefStream(out, 11, table, '/Size 12/Root 1 0 R');
  writeTail(out, xo);
  return out.toBytes();
}

describe('PdfReader: object-stream /Filter target whose /Length lives inside that object stream (L2-F1)', () => {
  it('is MALFORMED immediately, never an await-on-itself hang', async () => {
    const r = await PdfReader.open(buildContainerFilterNeedsOwnLength());
    await expectMalformed(r.get(1));
  }, 1000);

  it('a second concurrent reader of another member fails the same way', async () => {
    const r = await PdfReader.open(buildContainerFilterNeedsOwnLength());
    await expectMalformed(Promise.all([r.get(1), r.get(10)]));
  }, 1000);

  it('an ordinary non-container stream with an indirect /Length stored compressed elsewhere still reads', async () => {
    // guards the fix against over-reach: only container-mode filter targets lose the length resolver
    const out = new PdfOut();
    out.push(HEADER);
    const o3 = writeStreamObj(out, 3, '', enc('hello'), '10 0 R');
    const o5 = writeObjStm(out, 5, [{ num: 1, body: '<</Type/Catalog>>' }, { num: 10, body: '5' }]);
    const xo = out.length;
    const rows = new Map<number, XrefRow>([
      [0, { type: 0, f2: 0, f3: 255 }],
      [1, { type: 2, f2: 5, f3: 0 }],
      [3, { type: 1, f2: o3, f3: 0 }],
      [5, { type: 1, f2: o5, f3: 0 }],
      [10, { type: 2, f2: 5, f3: 1 }],
      [11, { type: 1, f2: xo, f3: 0 }],
    ]);
    const table: XrefRow[] = [];
    for (let n = 0; n < 12; n++) table.push(rows.get(n) ?? { type: 0, f2: 0, f3: 0 });
    writeXrefStream(out, 11, table, '/Size 12/Root 1 0 R');
    writeTail(out, xo);
    const r = await PdfReader.open(out.toBytes());
    const s = await r.get(3);
    if (s === null || typeof s !== 'object' || !('raw' in s)) throw new Error('not a stream');
  }, 1000);
});

