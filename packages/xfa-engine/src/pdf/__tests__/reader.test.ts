import { describe, expect, it } from 'vitest';
import { PdfReader } from '../reader.js';
import { isPdfString, type PdfDict, type PdfRef, type PdfStream, type PdfValue } from '../types.js';
import { dec, enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';
import { DecodeBudget } from '../filters.js';
import {
  buildClassicPdf,
  buildContainerFilterPdf,
  buildHybridPdf,
  buildIncrementalPdf,
  buildIndirectFilterPdf,
  buildLengthChainPdf,
  buildLengthInObjStmPdf,
  buildXrefStreamPdf,
} from '../../__tests__/fixtures/build-pdf.js';

const ref = (num: number, gen = 0): PdfRef => ({ kind: 'ref', num, gen });
const strValue = (v: PdfValue | PdfStream | undefined): string => {
  if (!isPdfString(v)) throw new Error('not a string value');
  return dec(v.bytes);
};
const dictOf = (v: PdfValue | PdfStream | undefined): PdfDict => {
  if (!(v instanceof Map)) throw new Error('not a dict');
  return v;
};
const type = (v: PdfValue | PdfStream | undefined): PdfValue | undefined => dictOf(v).get('Type');

describe('PdfReader: classic table', () => {
  for (const style of ['crlf', 'space-lf'] as const) {
    it(`resolves dicts, an indirect-Length stream and scalars (${style} entries)`, async () => {
      const r = await PdfReader.open(buildClassicPdf({ style }));
      expect(type(await r.resolve(ref(1)))).toEqual({ kind: 'name', value: 'Catalog' });
      expect(type(await r.get(2))).toEqual({ kind: 'name', value: 'Pages' });
      expect(await r.get(4)).toBe(12);
      const s = (await r.get(3)) as PdfStream;
      expect(dec(s.raw)).toBe('Hello stream');
      expect(r.trailer.get('Root')).toEqual(ref(1));
    });
  }

  it('a stream whose /Length 4 0 R is resolved through the reader keeps its exact bytes (Length not guessed)', async () => {
    const r = await PdfReader.open(buildClassicPdf());
    expect(dec(await r.decodedStream(ref(3)))).toBe('Hello stream');
  });

  it('a reference to a free or nonexistent object is null, per ISO 32000-1 7.3.10, not an exception', async () => {
    const r = await PdfReader.open(buildClassicPdf());
    expect(await r.resolve(ref(0, 65535))).toBeNull();
    expect(await r.resolve(ref(999))).toBeNull();
    expect(await r.get(999)).toBeNull();
  });

  it('a reference whose generation does not match the xref entry is null, not the wrong object', async () => {
    const r = await PdfReader.open(buildClassicPdf());
    expect(await r.resolve(ref(4, 3))).toBeNull();
  });

  it('an xref offset outside the file is MALFORMED when the object is read', async () => {
    const r = await PdfReader.open(buildClassicPdf({ badOffsetOf: 4 }));
    await expectMalformed(r.get(4));
    expect(await r.get(1)).toBeInstanceOf(Map); // other objects stay readable
  });

  it('an xref offset that lands on a different object number is MALFORMED (stale or shifted table)', async () => {
    const bytes = buildClassicPdf();
    const s = dec(bytes);
    // swap the offsets of objects 1 and 2 inside the table
    const m = [...s.matchAll(/(\d{10}) 00000 n/g)];
    const [e1, e2] = [m[0], m[1]];
    if (!e1 || !e2) throw new Error('fixture');
    const swapped = s.replace(e1[1] ?? '', 'AAAAAAAAAA').replace(e2[1] ?? '', e1[1] ?? '').replace('AAAAAAAAAA', e2[1] ?? '');
    const r = await PdfReader.open(enc(swapped));
    await expectMalformed(r.get(1));
  });

  it('a stream whose /Length refers to itself is MALFORMED, not an infinite async recursion', async () => {
    const r = await PdfReader.open(buildClassicPdf({ cyclicLength: true }));
    await expectMalformed(r.get(5));
  }, 1000);

  it('decodedStream on a non-stream object is MALFORMED', async () => {
    const r = await PdfReader.open(buildClassicPdf());
    await expectMalformed(r.decodedStream(ref(4)));
  });
});

describe('PdfReader: xref stream + object stream', () => {
  it('resolves objects held inside an object stream and ordinary objects beside them', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf());
    expect(type(await r.get(1))).toEqual({ kind: 'name', value: 'Catalog' });
    expect(type(await r.resolve(ref(2)))).toEqual({ kind: 'name', value: 'Pages' });
    expect(await r.get(4)).toBe(42);
    expect(r.trailer.get('Root')).toEqual(ref(1));
  });

  it('decodes a Flate stream through decodedStream by reference or by object', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf());
    expect(dec(await r.decodedStream(ref(3)))).toBe('Hello flate');
    const s = (await r.get(3)) as PdfStream;
    expect(dec(await r.decodedStream(s))).toBe('Hello flate');
  });

  it('a compressed object referenced with a non-zero generation is null (objects in streams are gen 0)', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf());
    expect(await r.resolve(ref(1, 2))).toBeNull();
  });

  it('an object-stream index past the end of the stream is MALFORMED', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf({ badObjStmIndex: true }));
    await expectMalformed(r.get(2));
    expect(await r.get(1)).toBeInstanceOf(Map);
  }, 1000);

  it('an object-stream index that holds a different object number is MALFORMED, not the wrong object', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf({ wrongMemberIndex: true }));
    await expectMalformed(r.get(2));
  });

  it('an xref entry that names a non-stream as its object-stream container is MALFORMED', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf({ nonStreamContainer: true }));
    await expectMalformed(r.get(2));
  });
});

describe('PdfReader: incremental updates', () => {
  it('classic: the redefined object returns the NEW value, the untouched one the OLD', async () => {
    const r = await PdfReader.open(buildIncrementalPdf());
    expect(strValue(await r.get(2))).toBe('new');
    expect(strValue(await r.get(3))).toBe('keep');
    expect(type(await r.get(1))).toEqual({ kind: 'name', value: 'Catalog' });
  });

  it('xref streams: the update shadows object 4, adds object 7 and leaves object-stream members readable', async () => {
    const r = await PdfReader.open(buildXrefStreamPdf({ update: true }));
    expect(await r.get(4)).toBe(43);
    expect(strValue(await r.get(7))).toBe('added');
    expect(type(await r.get(2))).toEqual({ kind: 'name', value: 'Pages' });
    expect(dec(await r.decodedStream(ref(3)))).toBe('Hello flate');
  });

  it('hybrid: an object only listed in /XRefStm is readable', async () => {
    const r = await PdfReader.open(buildHybridPdf());
    expect(strValue(await r.get(2))).toBe('hybrid');
  });

  it('a /Prev cycle is MALFORMED at open', async () => {
    await expectMalformed(PdfReader.open(buildIncrementalPdf({ prev: 'self' })));
  }, 1000);
});

describe('PdfReader: /Length resolution', () => {
  it('a 5000-link chain of streams whose /Length is the next stream is MALFORMED, not a stack overflow', async () => {
    const r = await PdfReader.open(buildLengthChainPdf(5000));
    await expectMalformed(r.get(1));
  }, 1000);

  it('a /Length target that is itself a stream is MALFORMED (a length must be a plain integer object)', async () => {
    const r = await PdfReader.open(buildLengthChainPdf(3));
    await expectMalformed(r.get(1));
    expect(dec(((await r.get(3)) as PdfStream).raw)).toBe('x'); // the last link has a direct /Length
  });

  it('a /Length integer stored inside an object stream resolves (allowed for ordinary streams)', async () => {
    const r = await PdfReader.open(buildLengthInObjStmPdf());
    expect(dec(await r.decodedStream(ref(3)))).toBe('Hello flate');
  }, 1000);

  it('an object stream whose own /Length lives inside an object stream is MALFORMED, never a hang (ISO 32000-1 7.5.7)', async () => {
    const r = await PdfReader.open(buildLengthInObjStmPdf(true));
    await expectMalformed(r.get(1));
  }, 1000);
});

describe('PdfReader: indirect /Filter and /DecodeParms', () => {
  it('resolves indirect /Filter and /DecodeParms (and their predictor) before decoding', async () => {
    const r = await PdfReader.open(buildIndirectFilterPdf());
    expect(Array.from(await r.decodedStream(ref(3)))).toEqual([10, 20, 30, 40, 11, 22, 33, 44]);
    const s = (await r.get(3)) as PdfStream;
    expect(Array.from(await r.decodedStream(s))).toEqual([10, 20, 30, 40, 11, 22, 33, 44]);
  });

  it('a /Filter reference that points at a missing object is MALFORMED, not "no filter"', async () => {
    const bytes = enc(dec(buildIndirectFilterPdf()).replace('/Filter 8 0 R', '/Filter 7 0 R'));
    const r = await PdfReader.open(bytes);
    await expectMalformed(r.decodedStream(ref(3)));
  });
});

describe('PdfReader: cumulative decode budget', () => {
  /** Records how much budget was left at each decode call, so a test can place a limit exactly at a decode. */
  class SpyBudget extends DecodeBudget {
    readonly leftAtDecode: number[] = [];
    override async decode(stream: Parameters<DecodeBudget['decode']>[0]): Promise<Uint8Array> {
      this.leftAtDecode.push(this.remainingBytes);
      return super.decode(stream);
    }
  }
  const TOTAL = 1_000_000;

  it('repeatedly decoding streams until the total budget is spent is MALFORMED (earlier decodes succeeded)', async () => {
    const pdf = buildXrefStreamPdf();
    // cost of opening, resolving stream 3 and decoding it once; each further decode adds the decoded size (11 bytes)
    const probe = new DecodeBudget(TOTAL);
    const pr = await PdfReader.open(pdf, probe);
    await pr.decodedStream(ref(3));
    const first = TOTAL - probe.remainingBytes;

    const r = await PdfReader.open(pdf, new DecodeBudget(first + 15));
    let ok = 0;
    await expectMalformed(
      (async () => {
        for (let i = 0; i < 20; i++) {
          await r.decodedStream(ref(3));
          ok += 1;
        }
      })(),
    );
    expect(ok).toBeGreaterThan(0);
    expect(ok).toBeLessThan(20);
  });

  it('object-stream decoding is charged too: a budget that fits everything but the decoded container fails the first compressed read', async () => {
    const pdf = buildXrefStreamPdf();
    const spy = new SpyBudget(TOTAL);
    const probe = await PdfReader.open(pdf, spy);
    const v = await probe.get(1);
    expect(v).not.toBeNull();
    const decodes = spy.leftAtDecode.length;
    const beforeContainerDecode = TOTAL - (spy.leftAtDecode[decodes - 1] ?? 0);

    // everything up to the container's decode fits; only 5 bytes remain for its decoded bytes, which are larger
    const r = await PdfReader.open(pdf, new DecodeBudget(beforeContainerDecode + 5));
    const err = await expectMalformed(r.get(1));
    expect(err.message).toMatch(/exceeds/);
  });
});

describe('PdfReader: free in the newest section', () => {
  it('an object the newest section marks free resolves to null even though an older section defines it', async () => {
    const r = await PdfReader.open(buildIncrementalPdf({ freeObject3: true }));
    expect(await r.get(3)).toBeNull();
    expect(strValue(await r.get(2))).toBe('new');
  });
});

describe('PdfReader: object-stream containers with indirect /Filter', () => {
  it('a container whose /Filter lives inside that same container is MALFORMED, never a deadlock', async () => {
    const r = await PdfReader.open(buildContainerFilterPdf('self'));
    await expectMalformed(r.get(1));
  }, 1000);

  it('two containers whose /Filter refs live in each other are MALFORMED, never a deadlock', async () => {
    const r = await PdfReader.open(buildContainerFilterPdf('mutual'));
    await expectMalformed(Promise.all([r.get(1), r.get(2)]));
  }, 1000);

  it('a container whose /Filter ref points at an ordinary (uncompressed) object still decodes', async () => {
    const r = await PdfReader.open(buildContainerFilterPdf('plain'));
    expect(type(await r.get(1))).toEqual({ kind: 'name', value: 'Catalog' });
  }, 1000);
});
