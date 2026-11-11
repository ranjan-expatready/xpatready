import { deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../errors.js';
import { decodeStream, deflate, inflate, undoPngPredictor } from '../filters.js';
import { DecodeBudget, MAX_TOTAL_DECODED_BYTES } from '../filters.js';
import { MAX_INFLATED_BYTES } from '../flate.js';
import type { PdfStream, PdfValue } from '../types.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const name = (value: string): PdfValue => ({ kind: 'name', value });
const stream = (entries: Record<string, PdfValue>, raw: Uint8Array): PdfStream => ({
  dict: new Map(Object.entries(entries)),
  raw,
});
const bytes = (...n: number[]): Uint8Array => Uint8Array.from(n);

describe('inflate / deflate', () => {
  it('inflate reads what an independent zlib wrote, so real-world Flate streams decode', async () => {
    const plain = enc('The quick brown fox '.repeat(200));
    expect(Array.from(await inflate(new Uint8Array(deflateSync(plain))))).toEqual(Array.from(plain));
  });

  it('deflate output is a zlib stream an independent inflater accepts (writer round-trip)', async () => {
    const plain = enc('datasets '.repeat(100));
    const packed = await deflate(plain);
    expect(Array.from(new Uint8Array(inflateSync(packed)))).toEqual(Array.from(plain));
  });

  it('corrupt Flate data is MALFORMED with the stream error as cause, not a leaked TypeError', async () => {
    const err = await expectMalformed(inflate(enc('this is not zlib data at all')));
    expect(err.cause).toBeDefined();
  });

  it('truncated Flate data is MALFORMED instead of silently returning a short buffer', async () => {
    const packed = new Uint8Array(deflateSync(enc('x'.repeat(5000))));
    await expectMalformed(inflate(packed.subarray(0, packed.length - 4)));
  });

  it('empty input is MALFORMED, not an empty success', async () => {
    await expectMalformed(inflate(new Uint8Array(0)));
  });
});

describe('inflate output cap (decompression bombs)', () => {
  const zeros = (n: number): Uint8Array => new Uint8Array(deflateSync(Buffer.alloc(n)));

  it('output past the cap is MALFORMED instead of being buffered whole (injected small cap)', async () => {
    const err = await expectMalformed(inflate(zeros(100_000), 1000));
    expect(err.message).toContain('exceeds');
  });

  it('output exactly at the cap is allowed', async () => {
    expect((await inflate(zeros(1000), 1000)).length).toBe(1000);
  });

  it('the default per-stream cap is 64 MiB and total budget 256 MiB', () => {
    expect(MAX_INFLATED_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_TOTAL_DECODED_BYTES).toBe(256 * 1024 * 1024);
  });

  it('a 65 MiB zero stream (a few KB on the wire) is rejected at the default cap, quickly', async () => {
    const bomb = zeros(65 * 1024 * 1024);
    expect(bomb.length).toBeLessThan(200_000);
    await expectMalformed(inflate(bomb));
  }, 2000);

  it('decodeStream passes the cap through, so a bomb cannot sneak in via a stream dictionary', async () => {
    const s = stream({ Filter: name('FlateDecode') }, zeros(100_000));
    await expectMalformed(decodeStream(s, 1000));
  });
});

describe('DecodeBudget (cumulative decode ceiling)', () => {
  const flateStream = (text: string): PdfStream => stream({ Filter: name('FlateDecode') }, new Uint8Array(deflateSync(enc(text))));

  it('many streams each under the per-stream cap but over the total are MALFORMED', async () => {
    const budget = new DecodeBudget(25);
    expect((await budget.decode(flateStream('0123456789'))).length).toBe(10);
    expect((await budget.decode(flateStream('0123456789'))).length).toBe(10);
    await expectMalformed(budget.decode(flateStream('0123456789')));
  });

  it('a failed decode does not silently refill the budget', async () => {
    const budget = new DecodeBudget(15);
    await budget.decode(flateStream('0123456789'));
    await expectMalformed(budget.decode(flateStream('0123456789')));
    await expectMalformed(budget.decode(flateStream('0123456789')));
  });

  it('streams with no filter cost nothing (their bytes are already in the file)', async () => {
    const budget = new DecodeBudget(1);
    const raw = enc('x'.repeat(1000));
    expect(await budget.decode(stream({}, raw))).toBe(raw);
    expect(await budget.decode(stream({}, raw))).toBe(raw);
  });
});

describe('Flate trailing bytes (identical on every runtime)', () => {
  const payload = enc('trailing bytes test');
  const packed = new Uint8Array(deflateSync(payload));
  const withTail = (tail: string): Uint8Array => Uint8Array.from([...packed, ...enc(tail)]);
  const flate = (raw: Uint8Array): PdfStream => stream({ Filter: name('FlateDecode') }, raw);

  it('a stream whose /Length includes a trailing CRLF (or LF, CR, space) decodes', async () => {
    for (const tail of ['\r\n', '\n', '\r', ' ', '\r\n\r\n']) {
      expect(Array.from(await decodeStream(flate(withTail(tail))))).toEqual(Array.from(payload));
    }
  });

  it('trailing NON-whitespace junk is still MALFORMED (not silently ignored)', async () => {
    await expectMalformed(decodeStream(flate(withTail('junk'))));
  });

  it('a zlib trailer whose last Adler-32 byte is itself a whitespace byte is not truncated (no naive stripping)', async () => {
    const ws = new Set([0, 9, 10, 12, 13, 32]);
    let found: Uint8Array | undefined;
    for (let i = 0; i < 5000 && !found; i++) {
      const candidate = new Uint8Array(deflateSync(enc(`probe ${i}`)));
      if (ws.has(candidate[candidate.length - 1] ?? -1)) found = candidate;
    }
    if (!found) throw new Error('fixture: no whitespace-terminated zlib stream found');
    const expected = Array.from(await inflate(found));
    expect(Array.from(await decodeStream(flate(found)))).toEqual(expected);
    expect(Array.from(await decodeStream(flate(Uint8Array.from([...found, 13, 10]))))).toEqual(expected);
  });
});

describe('undoPngPredictor', () => {
  const none = [0, 10, 20, 30, 40];

  it('Sub: each byte adds the byte to its left, so a delta-coded row is restored', () => {
    expect(Array.from(undoPngPredictor(bytes(1, 10, 10, 10, 10), 4))).toEqual([10, 20, 30, 40]);
  });

  it('Up: each byte adds the byte above, so a row delta-coded against the previous row is restored', () => {
    expect(Array.from(undoPngPredictor(bytes(...none, 2, 1, 2, 3, 4), 4))).toEqual([10, 20, 30, 40, 11, 22, 33, 44]);
  });

  it('Average: uses floor((left+up)/2) (hand vector 15,25,28,50 over 10,20,30,40)', () => {
    expect(Array.from(undoPngPredictor(bytes(...none, 3, 10, 8, 1, 16), 4))).toEqual([10, 20, 30, 40, 15, 25, 28, 50]);
  });

  it('Paeth: picks the nearest of left/up/upper-left (hand vector 12,22,33,41 over 10,20,30,40)', () => {
    expect(Array.from(undoPngPredictor(bytes(...none, 4, 2, 2, 3, 1), 4))).toEqual([10, 20, 30, 40, 12, 22, 33, 41]);
  });

  it('Paeth picks the upper-left byte when it is nearest (a=10, b=50, c=30)', () => {
    // row 1 (None) = [30, 50]; row 2 (Paeth): i=0 a=0,b=30,c=0 -> b=30, so raw 236 -> 10; i=1 a=10,b=50,c=30 -> c=30, raw 10 -> 40
    expect(Array.from(undoPngPredictor(bytes(0, 30, 50, 4, 236, 10), 2))).toEqual([30, 50, 10, 40]);
  });

  it('None leaves the row unchanged and each row may use a different tag', () => {
    const packed = bytes(0, 1, 2, 3, 4, 1, 1, 1, 1, 1, 2, 5, 5, 5, 5);
    expect(Array.from(undoPngPredictor(packed, 4))).toEqual([1, 2, 3, 4, 1, 2, 3, 4, 6, 7, 8, 9]);
  });

  it('with 3 colours the "left" byte is one PIXEL back (3 bytes), not one byte', () => {
    expect(Array.from(undoPngPredictor(bytes(1, 1, 2, 3, 1, 1, 1), 2, 3))).toEqual([1, 2, 3, 2, 3, 4]);
  });

  it('empty input decodes to empty output', () => {
    expect(undoPngPredictor(new Uint8Array(0), 4).length).toBe(0);
  });

  it('a row tag outside 0-4 is MALFORMED', () => {
    expect(() => undoPngPredictor(bytes(9, 1, 2, 3, 4), 4)).toThrow(XfaPdfError);
  });

  it('a length that is not a whole number of rows is MALFORMED, not a short last row', () => {
    expect(() => undoPngPredictor(bytes(0, 1, 2, 3, 4, 0, 1), 4)).toThrow(XfaPdfError);
  });

  it('nonsense Columns/Colors/BitsPerComponent are MALFORMED, not a divide-by-zero or NaN', () => {
    expect(() => undoPngPredictor(bytes(0, 1), 0)).toThrow(XfaPdfError);
    expect(() => undoPngPredictor(bytes(0, 1), 1, 0)).toThrow(XfaPdfError);
    expect(() => undoPngPredictor(bytes(0, 1), 1, 1, 3)).toThrow(XfaPdfError);
    expect(() => undoPngPredictor(bytes(0, 1), 1.5)).toThrow(XfaPdfError);
    expect(() => undoPngPredictor(bytes(0, 1), Number.MAX_SAFE_INTEGER)).toThrow(XfaPdfError);
  });
});

describe('decodeStream', () => {
  const flate = new Uint8Array(deflateSync(enc('payload')));

  it('no /Filter returns the raw bytes untouched', async () => {
    const raw = enc('plain');
    expect(await decodeStream(stream({}, raw))).toBe(raw);
  });

  it('/FlateDecode inflates', async () => {
    expect(Array.from(await decodeStream(stream({ Filter: name('FlateDecode') }, flate)))).toEqual(Array.from(enc('payload')));
  });

  it('a one-element /Filter array is accepted like the bare name', async () => {
    const s = stream({ Filter: [name('FlateDecode')] }, flate);
    expect(Array.from(await decodeStream(s))).toEqual(Array.from(enc('payload')));
  });

  it('/Predictor 12 with /Columns undoes the PNG predictor after inflating', async () => {
    const parms = new Map<string, PdfValue>([['Predictor', 12], ['Columns', 4]]);
    const packed = new Uint8Array(deflateSync(bytes(0, 10, 20, 30, 40, 2, 1, 2, 3, 4)));
    const s = stream({ Filter: name('FlateDecode'), DecodeParms: parms }, packed);
    expect(Array.from(await decodeStream(s))).toEqual([10, 20, 30, 40, 11, 22, 33, 44]);
  });

  it('/Predictor 1 means no predictor and DecodeParms may be a one-element array', async () => {
    const parms = new Map<string, PdfValue>([['Predictor', 1]]);
    const s = stream({ Filter: name('FlateDecode'), DecodeParms: [parms] }, flate);
    expect(Array.from(await decodeStream(s))).toEqual(Array.from(enc('payload')));
  });

  it('an unsupported filter is MALFORMED and names the filter so the cause is diagnosable', async () => {
    const err = await expectMalformed(decodeStream(stream({ Filter: name('LZWDecode') }, enc('x'))));
    expect(err.message).toContain('LZWDecode');
  });

  it('a filter chain of two is MALFORMED rather than silently decoding only the first', async () => {
    await expectMalformed(decodeStream(stream({ Filter: [name('ASCII85Decode'), name('FlateDecode')] }, flate)));
  });

  it('the TIFF predictor (2) and out-of-range predictors are MALFORMED, not skipped', async () => {
    for (const p of [2, 7, 16]) {
      const parms = new Map<string, PdfValue>([['Predictor', p]]);
      await expectMalformed(decodeStream(stream({ Filter: name('FlateDecode'), DecodeParms: parms }, flate)));
    }
  });

  it('a /Filter that is not a name or name array (e.g. an unresolved reference) is MALFORMED', async () => {
    await expectMalformed(decodeStream(stream({ Filter: { kind: 'ref', num: 9, gen: 0 } }, flate)));
    await expectMalformed(decodeStream(stream({ Filter: 5 }, flate)));
  });

  it('a non-integer /Columns is MALFORMED', async () => {
    const parms = new Map<string, PdfValue>([['Predictor', 12], ['Columns', name('x')]]);
    await expectMalformed(decodeStream(stream({ Filter: name('FlateDecode'), DecodeParms: parms }, flate)));
  });
});
