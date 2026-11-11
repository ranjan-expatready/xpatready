import { describe, expect, it } from 'vitest';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefTable, zlib, type TableEntry } from '../../__tests__/fixtures/build-pdf.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { openXfaPdfInternal } from '../../xfa-pdf.js';
import { DecodeBudget } from '../filters.js';
import { MAX_FILTER_CHAIN } from '../limits.js';
import { PdfReader } from '../reader.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const ref = (num: number) => ({ kind: 'ref' as const, num, gen: 0 });

/** Object 3 is an unfiltered-body stream with `streamDict`; `extra` objects (numbered from 5) are written as given. */
function buildWith(streamDict: string, extra: readonly string[], body: Uint8Array = enc('payload')): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const entries: TableEntry[] = [{ num: 0, free: true }, { num: 1, offset: writeObj(out, 1, '<</Type/Catalog>>') }];
  entries.push({ num: 3, offset: writeStreamObj(out, 3, streamDict, body) });
  extra.forEach((text, i) => entries.push({ num: 5 + i, offset: writeObj(out, 5 + i, text) }));
  writeTail(out, writeXrefTable(out, entries, `/Size ${5 + extra.length}/Root 1 0 R`));
  return out.toBytes();
}

const names = (n: number): string => `[${'/A '.repeat(n)}]`;
const dictOf = (n: number, valueRef: string): string => `<<${Array.from({ length: n }, (_, i) => `/K${i} ${valueRef}`).join('')}>>`;

async function rejects(bytes: Uint8Array, budget?: DecodeBudget): Promise<{ ms: number; message: string }> {
  const reader = await PdfReader.open(bytes, budget);
  const started = performance.now();
  const err = await expectMalformed(reader.decodedStream(ref(3)));
  return { ms: performance.now() - started, message: err.message };
}

describe('stream /Filter and /DecodeParms: shape is validated before anything is copied (L3-F1)', () => {
  it('/Filter [5 0 R x20000] where object 5 is a 20,000-name array (the n x m amplification) is MALFORMED fast', async () => {
    const refs = '5 0 R '.repeat(20_000);
    const { ms } = await rejects(buildWith(`/Filter[${refs}]`, [names(20_000)]));
    expect(ms).toBeLessThan(2000);
  }, 20_000);

  it('/Filter [5 0 R 5 0 R] where object 5 is a 20,000-name array is MALFORMED without copying it', async () => {
    const { ms } = await rejects(buildWith('/Filter[5 0 R 5 0 R]', [names(20_000)]));
    expect(ms).toBeLessThan(2000);
  });

  it('/Filter referencing a 20,000-name array is MALFORMED', async () => {
    const { ms, message } = await rejects(buildWith('/Filter 5 0 R', [names(20_000)]));
    expect(ms).toBeLessThan(2000);
    expect(message).toMatch(/Filter/);
  });

  it('the nested variant: /DecodeParms 5 0 R, a dictionary of 20,000 entries each pointing at a 20,000-name array', async () => {
    const { ms } = await rejects(buildWith('/Filter/FlateDecode/DecodeParms 5 0 R', [dictOf(20_000, '6 0 R'), names(20_000)]));
    expect(ms).toBeLessThan(2000);
  }, 20_000);

  it('/DP and /DecodeParms arrays are bounded the same way', async () => {
    await rejects(buildWith(`/DP[${'<<>> '.repeat(MAX_FILTER_CHAIN + 1)}]`, []));
    await rejects(buildWith(`/DecodeParms[${'null '.repeat(MAX_FILTER_CHAIN + 1)}]`, []));
  });

  it('other shapes are MALFORMED: /Filter as a dictionary, string or number; /DecodeParms as a name', async () => {
    for (const dict of ['/Filter<<>>', '/Filter(Flate)', '/Filter 7', '/DecodeParms/Name', '/Filter[<<>>]', '/Filter[[/A]]']) {
      await rejects(buildWith(dict, []));
    }
  });

  it('a parameter dictionary whose values are not scalars is MALFORMED', async () => {
    await rejects(buildWith('/Filter/FlateDecode/DecodeParms<</Predictor[1 2]>>', []));
    await rejects(buildWith('/Filter/FlateDecode/DecodeParms<</Predictor 5 0 R>>', ['[1 2]']));
  });

  it('MAX_FILTER_CHAIN is 2', () => {
    expect(MAX_FILTER_CHAIN).toBe(2);
  });

  it('every visited node is charged: resolving 20,000 indirect parameter values costs at least one node each, and a budget below that is MALFORMED', async () => {
    const entries = 20_000;
    const pdf = buildWith(`/Filter/FlateDecode/DecodeParms ${dictOf(entries, '5 0 R')}`, ['7'], zlib(enc('hello')));
    const total = 1_000_000_000;
    const probe = new DecodeBudget(total);
    const reader = await PdfReader.open(pdf, probe);
    await reader.get(3);
    const parsed = total - probe.remainingBytes;
    await reader.decodedStream(ref(3));
    const decodeCost = total - probe.remainingBytes - parsed;
    expect(decodeCost).toBeGreaterThanOrEqual(entries * 64);

    const tight = await PdfReader.open(pdf, new DecodeBudget(parsed + (entries * 64) / 2));
    const err = await expectMalformed(tight.decodedStream(ref(3)));
    expect(err.message).toMatch(/budget/i);
  }, 20_000);

  it('legitimate shapes still decode: name, name array, indirect filter and parameters, null and array parameters', async () => {
    const body = zlib(Uint8Array.from([0, 10, 20, 30, 40, 2, 1, 2, 3, 4]));
    const cases: Array<[string, string[]]> = [
      ['/Filter/FlateDecode/DecodeParms<</Predictor 12/Columns 4>>', []],
      ['/Filter[/FlateDecode]/DecodeParms[<</Predictor 12/Columns 4>>]', []],
      ['/Filter 5 0 R/DecodeParms 6 0 R', ['/FlateDecode', '<</Predictor 12/Columns 4>>']],
      ['/Filter[5 0 R]/DecodeParms[6 0 R]', ['/FlateDecode', '<</Predictor 12/Columns 4>>']],
      ['/Filter/FlateDecode/DecodeParms<</Predictor 7 0 R/Columns 4>>', ['null', 'null', '12']],
      ['/Filter/FlateDecode/DP<</Predictor 12/Columns 4>>', []],
    ];
    for (const [dict, extra] of cases) {
      const reader = await PdfReader.open(buildWith(dict, extra, body));
      expect(Array.from(await reader.decodedStream(ref(3))), dict).toEqual([10, 20, 30, 40, 11, 22, 33, 44]);
    }
    const none = await PdfReader.open(buildWith('/Filter null', [], enc('plain')));
    expect(new TextDecoder().decode(await none.decodedStream(ref(3)))).toBe('plain');
    // Producers write [null] for a parameterless filter chain: it must mean "no predictor", not a rejection.
    const nullParms = await PdfReader.open(buildWith('/Filter[/FlateDecode]/DecodeParms[null]', [], zlib(enc('plain'))));
    expect(new TextDecoder().decode(await nullParms.decodedStream(ref(3)))).toBe('plain');
  });

  it('the attack through openXfaPdf (a packet stream) is MALFORMED, not an out-of-memory crash', async () => {
    const pdf = buildXfaPdf({ packets: [packet('datasets', 'x', false, `/Filter[${'4 0 R '.repeat(5000)}]`)] });
    const err = await expectMalformed(openXfaPdfInternal(pdf, {}));
    expect(err.message).toMatch(/Filter/);
  });
});
