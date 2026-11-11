import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefTable, type TableEntry } from '../../__tests__/fixtures/build-pdf.js';
import { DecodeBudget } from '../filters.js';
import { parseIndirectAt } from '../object-parser.js';
import { PdfReader } from '../reader.js';
import { readXrefChain } from '../xref.js';
import { isPdfStream, type PdfStream } from '../types.js';
import { dec } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const BASE = 10;

/** `count` DISTINCT unfiltered streams (objects 10..), each `size` bytes. */
function buildStreams(count: number, size: number): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const entries: TableEntry[] = [{ num: 0, free: true }, { num: 1, offset: writeObj(out, 1, '<</Type/Catalog>>') }];
  for (let i = 0; i < count; i++) {
    entries.push({ num: BASE + i, offset: writeStreamObj(out, BASE + i, '', new Uint8Array(size).fill(65)) });
  }
  writeTail(out, writeXrefTable(out, entries, `/Size ${BASE + count}/Root 1 0 R`));
  return out.toBytes();
}

const asStream = (v: unknown): PdfStream => {
  if (!isPdfStream(v as never)) throw new Error('not a stream');
  return v as PdfStream;
};

/** What opening a file costs against a budget, and what then resolving object `num` costs (bytes and parsed nodes). */
async function costs(bytes: Uint8Array, num: number): Promise<{ open: number; object: number }> {
  const total = 1_000_000_000;
  const budget = new DecodeBudget(total);
  const reader = await PdfReader.open(bytes, budget);
  const open = total - budget.remainingBytes;
  await reader.get(num);
  return { open, object: total - budget.remainingBytes - open };
}

describe('PdfReader charges every stream it materialises to the decode budget (F2a)', () => {
  it('many DISTINCT unfiltered streams whose total exceeds the budget are MALFORMED', async () => {
    const pdf = buildStreams(10, 1000);
    const { open, object } = await costs(pdf, BASE);
    expect(object).toBeGreaterThanOrEqual(1000);
    const reader = await PdfReader.open(pdf, new DecodeBudget(open + 2 * object + 100));
    expect(asStream(await reader.get(BASE)).raw.length).toBe(1000);
    expect(asStream(await reader.get(BASE + 1)).raw.length).toBe(1000);
    await expectMalformed(reader.get(BASE + 2));
  });

  it('an unfiltered stream is charged once (raw bytes plus its parsed dictionary), and decoding it does not charge again', async () => {
    const budget = new DecodeBudget(1_000_000);
    const reader = await PdfReader.open(buildStreams(1, 1000), budget);
    const before = budget.remainingBytes;
    const s = asStream(await reader.get(BASE));
    const charged = before - budget.remainingBytes;
    expect(charged).toBeGreaterThanOrEqual(1000);
    expect(charged).toBeLessThan(1000 + 1000); // the dictionary nodes are a few hundred bytes, not another copy
    await reader.decodedStream(s);
    await reader.decodedStream({ kind: 'ref', num: BASE, gen: 0 });
    expect(before - budget.remainingBytes).toBe(charged);
  });

  it('encrypted unfiltered streams are charged for the raw slice AND the decrypted copy', async () => {
    const pdf = new Uint8Array(readFileSync(new URL('../../__tests__/fixtures/aesv2-sample.pdf', import.meta.url)));
    const finder = await PdfReader.open(pdf);
    const size = finder.trailer.get('Size');
    if (typeof size !== 'number') throw new Error('fixture has no /Size');
    let target = 0;
    for (let n = 1; n < size && target === 0; n++) {
      const v = await finder.get(n);
      if (isPdfStream(v) && v.dict.get('Filter') === undefined && v.dict.get('Type') === undefined && dec(v.raw).startsWith('RawPlain')) target = n;
    }
    expect(target).toBeGreaterThan(0);

    // What parsing this object costs, measured independently of the reader: replay the parse with a counting callback.
    const chain = await readXrefChain(pdf);
    const entry = chain.entries.get(target);
    if (entry?.type !== 'offset') throw new Error('fixture: target is not a top-level object');
    let parseCost = 0;
    const raw = parseIndirectAt(pdf, entry.offset, undefined, (n) => {
      parseCost += n;
    }).value;
    const cipherLength = asStream(raw).raw.length;

    const budget = new DecodeBudget(1_000_000);
    const reader = await PdfReader.open(pdf, budget);
    const before = budget.remainingBytes;
    const decrypted = asStream(await reader.get(target)).raw;
    // ciphertext = IV(16) + PKCS#7-padded blocks, so it is longer than the plaintext it decrypts to
    expect(cipherLength).toBeGreaterThan(decrypted.length);
    // exactly: parsed structure + the raw (encrypted) slice + the decrypted copy; dropping either copy's charge changes this
    expect(before - budget.remainingBytes).toBe(parseCost + cipherLength + decrypted.length);
  });
});

describe('PdfReader memoises resolved objects per reader (F2b)', () => {
  it('resolving the same reference repeatedly returns the same object and charges the budget once', async () => {
    const pdf = buildStreams(1, 1000);
    const { open, object } = await costs(pdf, BASE);
    const budget = new DecodeBudget(open + object + 10);
    const reader = await PdfReader.open(pdf, budget);
    const first = await reader.get(BASE);
    for (let i = 0; i < 1000; i++) {
      expect(await reader.resolve({ kind: 'ref', num: BASE, gen: 0 })).toBe(first);
    }
    expect(budget.remainingBytes).toBe(10);
  });

  it('a generation mismatch is still null even when the object is cached', async () => {
    const reader = await PdfReader.open(buildStreams(1, 10));
    await reader.get(BASE);
    expect(await reader.resolve({ kind: 'ref', num: BASE, gen: 7 })).toBeNull();
  });
});

describe('PdfReader.releaseCache (L2-F3)', () => {
  it('drops cached objects: the next resolve re-parses (new object, charged again) and still works', async () => {
    const budget = new DecodeBudget(1_000_000);
    const reader = await PdfReader.open(buildStreams(1, 100), budget);
    const first = await reader.get(BASE);
    expect(reader.cacheSize).toBeGreaterThan(0);
    reader.releaseCache();
    expect(reader.cacheSize).toBe(0);
    const again = await reader.get(BASE);
    expect(again).not.toBe(first);
    expect(asStream(again).raw).toEqual(asStream(first).raw);
  });
});
