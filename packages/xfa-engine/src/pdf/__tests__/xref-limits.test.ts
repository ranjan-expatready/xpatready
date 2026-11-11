import { describe, expect, it } from 'vitest';
import { HEADER, PdfOut, writeObj, writeTail, writeXrefStreamRaw } from '../../__tests__/fixtures/build-pdf.js';
import { DecodeBudget } from '../filters.js';
import { MAX_OBJECT_NUMBER, MAX_XREF_ENTRIES } from '../limits.js';
import { PdfReader } from '../reader.js';
import { readXrefChain } from '../xref.js';
import { expectMalformed } from './expect-malformed.js';

const MIB = 1024 * 1024;
const te = new TextEncoder();
const FREE = '0000000000 65535 f \n'; // one 20-byte classic entry

/** `xref` section text: `sections` = [start, count, entriesActuallyWritten]. */
function table(sections: ReadonlyArray<readonly [number, number, number]>, trailer: string): string {
  let s = 'xref\n';
  for (const [start, count, written] of sections) s += `${start} ${count}\n${FREE.repeat(written)}`;
  return `${s}trailer\n<<${trailer}>>\n`;
}

const classic = (sections: ReadonlyArray<readonly [number, number, number]>): Uint8Array => {
  const head = '%PDF-1.7\n';
  return te.encode(`${head}${table(sections, '/Size 2/Root 1 0 R')}startxref\n${head.length}\n%%EOF\n`);
};

/** An xref STREAM whose zero-filled body is `bodyBytes` long (a few KB-to-64 KB of Flate for 64 MiB). */
function xrefStreamPdf(w: string, dictBody: string, bodyBytes: number): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const at = writeXrefStreamRaw(out, 1, w, new Uint8Array(bodyBytes), dictBody);
  writeTail(out, at);
  return out.toBytes();
}

async function timed<T>(p: Promise<T>): Promise<{ ms: number; error: unknown }> {
  const started = performance.now();
  const error = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  return { ms: performance.now() - started, error };
}

describe('xref streams: entry counts are validated BEFORE allocation (L2-F4)', () => {
  it('/W [1 0 0] + /Index [0 67108864] + 64 MiB of zeros is MALFORMED within 2 s, never a RangeError', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', '/Size 67108864/Index[0 67108864]/Root 2 0 R', 64 * MIB);
    const { ms, error } = await timed(readXrefChain(pdf));
    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: string }).code).toBe('MALFORMED');
    expect(ms).toBeLessThan(2000);
  }, 15_000);

  it('the same claim through the default /Index [0 Size] is MALFORMED', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', '/Size 5000000/Root 2 0 R', 5 * MIB);
    await expectMalformed(readXrefChain(pdf));
  }, 15_000);

  it('an /Index range running past the maximum object number is MALFORMED even when few entries are claimed', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', `/Size 10/Index[${MAX_OBJECT_NUMBER - 5} 10]/Root 2 0 R`, 64);
    await expectMalformed(readXrefChain(pdf));
  });

  it('a pair of /Index ranges that together exceed MAX_XREF_ENTRIES is MALFORMED', async () => {
    const half = MAX_XREF_ENTRIES / 2 + 1;
    const pdf = xrefStreamPdf('/W[1 0 0]', `/Size 10/Index[0 ${half} ${half} ${half}]/Root 2 0 R`, 2 * half);
    await expectMalformed(readXrefChain(pdf));
  }, 15_000);

  it('a claim that fits the cap but not the data is still MALFORMED', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', '/Size 100000/Index[0 100000]/Root 2 0 R', 10);
    await expectMalformed(readXrefChain(pdf));
  });

  it('the declared range is rejected before the body is inflated (a 64 MiB body is never materialised)', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', '/Size 67108864/Index[0 67108864]/Root 2 0 R', 64 * MIB);
    const budget = new DecodeBudget(1_000_000);
    await expectMalformed(readXrefChain(pdf, budget));
    // had the body been inflated, the budget error would name the decoded size; the cap error fires first
    expect(budget.remainingBytes).toBeGreaterThan(900_000);
  }, 15_000);
});

describe('classic xref tables: entry counts are validated BEFORE allocation (L2-F4)', () => {
  it('a table with MAX_XREF_ENTRIES + 1 entries is MALFORMED', async () => {
    await expectMalformed(readXrefChain(classic([[0, MAX_XREF_ENTRIES + 1, MAX_XREF_ENTRIES + 1]])));
  }, 15_000);

  it('a header claiming 4 billion entries is MALFORMED at the header, without reading entries', async () => {
    const { ms, error } = await timed(readXrefChain(classic([[0, 4_294_967_295, 3]])));
    expect((error as { code?: string }).code).toBe('MALFORMED');
    expect((error as Error).message).toMatch(/entries|object number/i);
    expect(ms).toBeLessThan(500);
  });

  it('a subsection running past the maximum object number is MALFORMED even with few entries', async () => {
    await expectMalformed(readXrefChain(classic([[MAX_OBJECT_NUMBER - 5, 10, 10]])));
  });

  it('the cap is cumulative over the /Prev chain: two sections of 600,000 are MALFORMED', async () => {
    const head = '%PDF-1.7\n';
    const first = table([[0, 600_000, 600_000]], '/Size 2/Root 1 0 R');
    const secondAt = head.length + first.length;
    const second = table([[600_000, 600_000, 600_000]], `/Size 2/Root 1 0 R/Prev ${head.length}`);
    const pdf = te.encode(`${head}${first}${second}startxref\n${secondAt}\n%%EOF\n`);
    await expectMalformed(readXrefChain(pdf));
  }, 20_000);

  it('exactly MAX_XREF_ENTRIES entries still read (the cap is not off by one)', async () => {
    const chain = await readXrefChain(classic([[0, MAX_XREF_ENTRIES, MAX_XREF_ENTRIES]]));
    expect(chain.entries.size).toBe(MAX_XREF_ENTRIES);
  }, 20_000);

  it('xref entries are charged to the reader budget: a small budget rejects an otherwise valid table', async () => {
    const pdf = classic([[0, 5000, 5000]]);
    const err = await expectMalformed(readXrefChain(pdf, new DecodeBudget(100_000)));
    expect(err.message).toMatch(/budget/i);
    expect((await readXrefChain(pdf, new DecodeBudget(10_000_000))).entries.size).toBe(5000);
  });
});

describe('PdfReader on a valid file is unaffected', () => {
  it('opens a small file with the default budget', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    writeObj(out, 1, '<</Type/Catalog>>');
    const reader = await PdfReader.open(classic([[0, 2, 2]]));
    expect(reader.maxObjectNumber).toBe(1);
  });
});

describe('xref stream /W field widths (L2 sweep)', () => {
  it('a field wider than 8 bytes is MALFORMED at the dictionary, not a 67-million-step loop over zeros', async () => {
    const pdf = xrefStreamPdf('/W[0 67108864 0]', '/Size 1/Index[0 1]/Root 2 0 R', 64 * MIB);
    const { ms, error } = await timed(readXrefChain(pdf));
    expect((error as { code?: string }).code).toBe('MALFORMED');
    expect((error as Error).message).toMatch(/width/i);
    expect(ms).toBeLessThan(1000);
  }, 15_000);

  it('widths up to 8 bytes in total fields still read', async () => {
    const pdf = xrefStreamPdf('/W[1 4 2]', '/Size 3/Index[0 3]/Root 2 0 R', 21);
    expect((await readXrefChain(pdf)).entries.size).toBe(3);
  });
});

describe('the highest object number is MAX_OBJECT_NUMBER, for reader and writer alike (L3-F3)', () => {
  it('a subsection ending exactly at MAX_OBJECT_NUMBER reads; one entry further is MALFORMED', async () => {
    const ok = await readXrefChain(classic([[MAX_OBJECT_NUMBER, 1, 1]]));
    expect(ok.entries.has(MAX_OBJECT_NUMBER)).toBe(true);
    await expectMalformed(readXrefChain(classic([[MAX_OBJECT_NUMBER, 2, 2]])));
    await expectMalformed(readXrefChain(classic([[MAX_OBJECT_NUMBER + 1, 1, 1]])));
  });

  it('an xref-stream /Index ending exactly at MAX_OBJECT_NUMBER reads', async () => {
    const pdf = xrefStreamPdf('/W[1 0 0]', `/Size 10/Index[${MAX_OBJECT_NUMBER} 1]/Root 2 0 R`, 1);
    expect((await readXrefChain(pdf)).entries.has(MAX_OBJECT_NUMBER)).toBe(true);
  });

  it('an empty subsection is not an entry and is not range-checked', async () => {
    expect((await readXrefChain(classic([[5, 0, 0], [0, 2, 2]]))).entries.size).toBe(2);
  });
});
