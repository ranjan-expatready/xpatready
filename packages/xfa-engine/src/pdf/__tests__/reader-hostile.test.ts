import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../errors.js';
import { PdfReader } from '../reader.js';
import {
  buildClassicPdf,
  buildHybridPdf,
  buildIncrementalPdf,
  buildXrefStreamPdf,
} from '../../__tests__/fixtures/build-pdf.js';

/** Opens the file and touches every object; resolves to the error class name, or 'ok'. */
async function exercise(bytes: Uint8Array): Promise<string> {
  try {
    const reader = await PdfReader.open(bytes);
    for (let n = 0; n < 12; n++) {
      const v = await reader.get(n);
      if (v !== null && typeof v === 'object' && 'raw' in v) await reader.decodedStream(v);
    }
    return 'ok';
  } catch (e) {
    if (e instanceof XfaPdfError) return e.code;
    return `LEAK ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`;
  }
}

describe('PdfReader on hostile input', () => {
  const fixtures: Array<[string, Uint8Array]> = [
    ['classic', buildClassicPdf()],
    ['incremental', buildIncrementalPdf()],
    ['xref stream + objstm', buildXrefStreamPdf({ update: true })],
    ['hybrid', buildHybridPdf()],
  ];

  it('random byte flips and truncations only ever fail with XfaPdfError, never RangeError/TypeError/hang', async () => {
    let seed = 12345;
    const rnd = (n: number): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed % n;
    };
    const leaks: string[] = [];
    let succeeded = 0;
    let rejected = 0;
    for (const [label, original] of fixtures) {
      for (let i = 0; i < 400; i++) {
        const copy = original.slice();
        for (let k = 0, flips = 1 + rnd(4); k < flips; k++) copy[rnd(copy.length)] = rnd(256);
        const bytes = i % 5 === 0 ? copy.subarray(0, rnd(copy.length)) : copy;
        const outcome = await exercise(bytes);
        if (outcome === 'ok') succeeded += 1;
        else if (outcome === 'MALFORMED') rejected += 1;
        else leaks.push(`${label}#${i}: ${outcome}`); // any other code or a non-XfaPdfError
      }
    }
    expect(leaks).toEqual([]);
    // guard against a vacuous pass: mutations must both break some files and leave others readable
    expect(rejected).toBeGreaterThan(50);
    expect(succeeded).toBeGreaterThan(50);
  }, 30000);
});
