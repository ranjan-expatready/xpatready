import { describe, expect, it } from 'vitest';
import { dec, enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';
import { readXrefChain } from '../xref.js';
import {
  HEADER,
  PdfOut,
  buildClassicPdf,
  buildHybridPdf,
  buildIncrementalPdf,
  buildXrefStreamPdf,
  writeObj,
  writeTail,
  writeXrefStreamRaw,
} from '../../__tests__/fixtures/build-pdf.js';


const patch = (b: Uint8Array, from: RegExp, to: string): Uint8Array => {
  const s = dec(b);
  if (!from.test(s)) throw new Error('fixture patch did not match');
  return enc(s.replace(from, to));
};

describe('readXrefChain: classic tables', () => {
  it('reads CRLF-terminated 20-byte entries', async () => {
    const chain = await readXrefChain(buildClassicPdf({ style: 'crlf' }));
    expect(chain.entries.get(0)).toEqual({ type: 'free' });
    expect(chain.entries.get(1)).toMatchObject({ type: 'offset', gen: 0 });
    expect(chain.entries.size).toBe(5);
    expect(chain.trailer.get('Size')).toBe(5);
  });

  it('reads space-LF terminated 20-byte entries (writers differ; both must parse)', async () => {
    const a = await readXrefChain(buildClassicPdf({ style: 'crlf' }));
    const b = await readXrefChain(buildClassicPdf({ style: 'space-lf' }));
    expect(b.entries).toEqual(a.entries);
  });

  it('reports the startxref offset it started from', async () => {
    const bytes = buildClassicPdf();
    const chain = await readXrefChain(bytes);
    expect(dec(bytes).slice(chain.startxref, chain.startxref + 4)).toBe('xref');
  });

  it('a stale xref entry count that runs past the table is MALFORMED, not an endless read', async () => {
    const bytes = patch(buildClassicPdf(), /\n0 5\n/, '\n0 500\n');
    await expectMalformed(readXrefChain(bytes));
  });

  it('a garbage entry keyword (not n/f) is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildClassicPdf(), / 00000 n\r\n/, ' 00000 x\r\n')));
  });

  it('a trailer that is not a dictionary is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildClassicPdf(), /trailer\n<<[^>]*>>/, 'trailer\n[1 2]')));
  });
});

describe('readXrefChain: /Prev chain and newest-wins', () => {
  it('a redefined object takes the newest offset and untouched objects keep the old one', async () => {
    const chain = await readXrefChain(buildIncrementalPdf());
    expect(chain.entries.size).toBe(4);
    const e1 = chain.entries.get(1);
    const e2 = chain.entries.get(2);
    const e3 = chain.entries.get(3);
    // appended update object 2 lies after base object 3; base objects keep their original (earlier) offsets
    expect(e1?.type === 'offset' && e2?.type === 'offset' && e3?.type === 'offset' && e2.offset > e3.offset && e3.offset > e1.offset).toBe(true);
  });

  it('the newest trailer wins, so /Prev only contributes entries', async () => {
    const chain = await readXrefChain(buildIncrementalPdf());
    expect(chain.trailer.get('Prev')).toBeTypeOf('number');
  });

  it('a /Prev that points back at the same section is MALFORMED, not an infinite loop', async () => {
    await expectMalformed(readXrefChain(buildIncrementalPdf({ prev: 'self' })));
  }, 1000);

  it('a two-section /Prev cycle (A to B to A) is MALFORMED', async () => {
    await expectMalformed(readXrefChain(buildIncrementalPdf({ prev: 'loop' })));
  }, 1000);

  it('a /Prev past the end of the file is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildIncrementalPdf(), /Prev \d+/, 'Prev 99999999')));
  });

  it('a negative or fractional /Prev is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildIncrementalPdf(), /Prev \d+/, 'Prev -4')));
    await expectMalformed(readXrefChain(patch(buildIncrementalPdf(), /Prev \d+/, 'Prev 4.5')));
  });

  it('newest-wins also holds across xref streams', async () => {
    const chain = await readXrefChain(buildXrefStreamPdf({ update: true }));
    const e4 = chain.entries.get(4);
    expect(e4).toMatchObject({ type: 'offset' });
    expect(chain.entries.get(7)).toMatchObject({ type: 'offset' });
    expect(chain.trailer.get('Size')).toBe(9);
  });

  it('a hybrid /XRefStm contributes the compressed entries the table omits', async () => {
    const chain = await readXrefChain(buildHybridPdf());
    expect(chain.entries.get(2)).toEqual({ type: 'compressed', objStm: 3, index: 0 });
    expect(chain.entries.get(1)).toMatchObject({ type: 'offset' });
  });
});

describe('readXrefChain: xref streams', () => {
  it('decodes /W[1 3 1] rows with PNG predictor into free, offset and compressed entries', async () => {
    const chain = await readXrefChain(buildXrefStreamPdf());
    expect(chain.entries.get(0)).toEqual({ type: 'free' });
    expect(chain.entries.get(1)).toEqual({ type: 'compressed', objStm: 5, index: 0 });
    expect(chain.entries.get(2)).toEqual({ type: 'compressed', objStm: 5, index: 1 });
    expect(chain.entries.get(3)).toMatchObject({ type: 'offset', gen: 0 });
    expect(chain.entries.size).toBe(7);
  });

  it('/Index defaults to [0 Size] and an explicit /Index maps rows onto the right object numbers', async () => {
    const chain = await readXrefChain(buildXrefStreamPdf({ update: true }));
    expect([...chain.entries.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('/W with the wrong arity or a negative width is MALFORMED', async () => {
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[1 3]' })));
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[1 -3 1]' })));
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[1 3 /x]' })));
  });

  it('absurd /W widths are MALFORMED rather than overflowing to an unsafe integer', async () => {
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[1 99999999 1]' })));
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[0 0 0]' })));
  });

  it('/W that disagrees with the data length (rows run out) is MALFORMED', async () => {
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ w: '/W[1 4 1]' })));
  });

  it('an /Index range beyond what the decoded data holds is MALFORMED', async () => {
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ index: [0, 99] })));
  });

  it('an explicit /Index covering more rows than /Size is tolerated (entries are bounded by the decoded data, not /Size)', async () => {
    const chain = await readXrefChain(buildXrefStreamPdf({ size: 3, index: [0, 7] }));
    expect(chain.entries.size).toBe(7);
    expect(chain.entries.get(6)).toMatchObject({ type: 'offset' });
  });

  it('an /Index with an odd element count or a negative start is MALFORMED', async () => {
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ index: [0, 7, 1] })));
    await expectMalformed(readXrefChain(buildXrefStreamPdf({ index: [-1, 7] })));
  });

  it('a startxref that points at an ordinary object, not an XRef stream, is MALFORMED', async () => {
    const bytes = buildXrefStreamPdf();
    const s = dec(bytes);
    const o4 = s.indexOf('4 0 obj');
    await expectMalformed(readXrefChain(enc(s.replace(/startxref\n\d+/, `startxref\n${o4}`))));
  });
});

describe('readXrefChain: startxref', () => {
  it('a file with no startxref is MALFORMED', async () => {
    await expectMalformed(readXrefChain(enc('%PDF-1.7\n1 0 obj\n1\nendobj\n')));
  });

  it('a startxref beyond the end of the file is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildClassicPdf(), /startxref\n\d+/, 'startxref\n99999999')));
  });

  it('a startxref pointing at junk (not xref, not an object) is MALFORMED', async () => {
    await expectMalformed(readXrefChain(patch(buildClassicPdf(), /startxref\n\d+/, 'startxref\n3')));
  });

  it('a startxref with no number after it is MALFORMED', async () => {
    await expectMalformed(readXrefChain(enc('%PDF-1.7\nstartxref\n')));
  });

  it('only the last 1024 bytes are searched, so a long junk tail is rejected instead of scanning the whole file', async () => {
    const bytes = buildClassicPdf();
    const padded = new Uint8Array(bytes.length + 2000);
    padded.set(bytes);
    padded.fill(0x20, bytes.length);
    await expectMalformed(readXrefChain(padded));
  });

  it('empty input is MALFORMED', async () => {
    await expectMalformed(readXrefChain(new Uint8Array(0)));
  });
});

describe('readXrefChain: xref stream field widths and types', () => {
  const be3 = (n: number): number[] => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

  it('W[0]=0 defaults the type to 1 (in-use) and a zero-width generation reads as 0', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    const o2 = writeObj(out, 2, '(two)');
    const o3 = out.length;
    const rows = [...be3(0), ...be3(o1), ...be3(o2), ...be3(o3)];
    writeXrefStreamRaw(out, 3, '/W[0 3 0]', Uint8Array.from(rows), '/Size 4/Root 1 0 R');
    writeTail(out, o3);
    const chain = await readXrefChain(out.toBytes());
    expect(chain.entries.get(1)).toEqual({ type: 'offset', offset: o1, gen: 0 });
    expect(chain.entries.get(2)).toEqual({ type: 'offset', offset: o2, gen: 0 });
  });

  it('a reserved row type (not 0/1/2) is treated as free (null object), not an error or an offset', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    writeObj(out, 2, '(two)');
    const o3 = out.length;
    const rows = [0, 0, 0, 0, 255, 1, ...be3(o1), 0, 7, 0, 0, 0, 0, 1, ...be3(o3), 0];
    writeXrefStreamRaw(out, 3, '/W[1 3 1]', Uint8Array.from(rows), '/Size 4/Root 1 0 R');
    writeTail(out, o3);
    const chain = await readXrefChain(out.toBytes());
    expect(chain.entries.get(2)).toEqual({ type: 'free' });
    expect(chain.entries.get(1)).toEqual({ type: 'offset', offset: o1, gen: 0 });
  });

  it('a hybrid /XRefStm that points back at the section that named it is MALFORMED', async () => {
    const bytes = buildHybridPdf();
    const startxref = Number(/startxref\n(\d+)/.exec(dec(bytes))?.[1]);
    await expectMalformed(readXrefChain(patch(bytes, /XRefStm \d+/, `XRefStm ${startxref}`)));
  }, 1000);
});
