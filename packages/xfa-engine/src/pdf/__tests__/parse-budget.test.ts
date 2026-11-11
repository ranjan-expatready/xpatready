import { describe, expect, it } from 'vitest';
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefStream, writeXrefTable, zlib, type TableEntry, type XrefRow } from '../../__tests__/fixtures/build-pdf.js';
import { DecodeBudget } from '../filters.js';
import { PdfLexer } from '../lexer.js';
import { PARSE_NODE_COST, parseIndirectAt, parseValue } from '../object-parser.js';
import { PdfReader } from '../reader.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const te = new TextEncoder();
const MIB = 1024 * 1024;

describe('parseValue charges every parsed node (L2-F5)', () => {
  const charged = (text: string): number => {
    let total = 0;
    parseValue(new PdfLexer(enc(text)), (n) => {
      total += n;
    });
    return total;
  };

  it('one node per scalar, array element, dictionary value and dictionary key, plus the container itself', () => {
    expect(charged('7')).toBe(PARSE_NODE_COST);
    expect(charged('[1 2 3]')).toBe(4 * PARSE_NODE_COST);
    expect(charged('1 0 R')).toBe(PARSE_NODE_COST);
    expect(charged('<</A 1/B [2]>>')).toBe(6 * PARSE_NODE_COST + 2); // dict, A, 1, B, array, 2 (+ key bytes)
  });

  it('strings and names also pay for their bytes (many members may re-parse one large string)', () => {
    expect(charged('(abcd)')).toBe(PARSE_NODE_COST + 4);
    expect(charged('/Name')).toBe(PARSE_NODE_COST + 4);
  });

  it('is optional: with no callback the parser behaves as before', () => {
    expect(parseValue(new PdfLexer(enc('[1 2]')))).toEqual([1, 2]);
  });

  it('a callback that throws stops a 2M-element array early, as MALFORMED', () => {
    const text = `[${'1 0 R '.repeat(2_000_000)}]`;
    const budget = new DecodeBudget(8 * MIB);
    const started = performance.now();
    let caught: unknown;
    try {
      parseValue(new PdfLexer(te.encode(text)), (n) => budget.charge(n));
    } catch (e) {
      caught = e;
    }
    expect((caught as { code?: string }).code).toBe('MALFORMED');
    expect(performance.now() - started).toBeLessThan(2000);
  }, 15_000);

  it('parseIndirectAt passes the callback through to the object body', () => {
    let total = 0;
    parseIndirectAt(enc('3 0 obj\n[1 2]\nendobj\n'), 0, undefined, (n) => {
      total += n;
    });
    expect(total).toBe(3 * PARSE_NODE_COST);
  });
});

describe('PdfReader charges parsed structure to its budget (L2-F5)', () => {
  const refs = (n: number): string => '1 0 R '.repeat(n);

  function classicWith(body: string): Uint8Array {
    const out = new PdfOut();
    out.push(HEADER);
    const entries: TableEntry[] = [{ num: 0, free: true }, { num: 1, offset: writeObj(out, 1, '<</Type/Catalog>>') }];
    entries.push({ num: 2, offset: writeObj(out, 2, body) });
    writeTail(out, writeXrefTable(out, entries, '/Size 3/Root 1 0 R'));
    return out.toBytes();
  }

  it('a top-level array of 2,000,000 references is MALFORMED under a small budget, quickly', async () => {
    const reader = await PdfReader.open(classicWith(`[${refs(2_000_000)}]`), new DecodeBudget(8 * MIB));
    const started = performance.now();
    const err = await expectMalformed(reader.get(2));
    expect(err.message).toMatch(/budget/i);
    expect(performance.now() - started).toBeLessThan(2000);
  }, 15_000);

  it('the same array parses under the default budget (2M nodes is well inside ~4M)', async () => {
    const reader = await PdfReader.open(classicWith(`[${refs(2_000_000)}]`));
    const v = await reader.get(2);
    expect(Array.isArray(v) && v.length).toBe(2_000_000);
  }, 30_000);

  it('nodes are charged per reader, however they are split across objects', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const entries: TableEntry[] = [{ num: 0, free: true }, { num: 1, offset: writeObj(out, 1, '<</Type/Catalog>>') }];
    for (let i = 0; i < 20; i++) entries.push({ num: 2 + i, offset: writeObj(out, 2 + i, `[${refs(5000)}]`) });
    writeTail(out, writeXrefTable(out, entries, '/Size 22/Root 1 0 R'));
    const bytes = out.toBytes();
    // each array costs 5001 nodes x 64 = ~320 KB; 20 of them need ~6.4 MB
    const reader = await PdfReader.open(bytes, new DecodeBudget(2 * MIB));
    let parsed = 0;
    const err = await (async () => {
      for (let n = 2; n < 22; n++) {
        await reader.get(n);
        parsed += 1;
      }
    })().then(
      () => undefined,
      (e: unknown) => e,
    );
    expect((err as { code?: string }).code).toBe('MALFORMED');
    expect(parsed).toBeGreaterThan(0);
    expect(parsed).toBeLessThan(20);
  }, 15_000);

  /** Classic-free layout: catalog 1, object stream 5 holding member 2, and an xref STREAM (object 6) that maps 2 into 5. */
  function objStmFile(dictBody: string, data: string): Uint8Array {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    const o5 = writeStreamObj(out, 5, `/Type/ObjStm/${dictBody}/Filter/FlateDecode`, zlib(te.encode(data)));
    const xo = out.length;
    const rows: XrefRow[] = [
      { type: 0, f2: 0, f3: 255 },
      { type: 1, f2: o1, f3: 0 },
      { type: 2, f2: 5, f3: 0 },
      { type: 0, f2: 0, f3: 0 },
      { type: 0, f2: 0, f3: 0 },
      { type: 1, f2: o5, f3: 0 },
      { type: 1, f2: xo, f3: 0 },
    ];
    writeXrefStream(out, 6, rows, '/Size 7/Root 1 0 R');
    writeTail(out, xo);
    return out.toBytes();
  }

  it('a member of an object stream holding 2,000,000 references is MALFORMED under a small budget', async () => {
    const head = '2 0 ';
    const bytes = objStmFile(`N 1/First ${head.length}`, `${head}[${refs(2_000_000)}]`);
    const reader = await PdfReader.open(bytes, new DecodeBudget(40 * MIB));
    const err = await expectMalformed(reader.get(2));
    expect(err.message).toMatch(/budget/i);
  }, 15_000);

  it('the same member parses under the default budget', async () => {
    const head = '2 0 ';
    const reader = await PdfReader.open(objStmFile(`N 1/First ${head.length}`, `${head}[${refs(100_000)}]`));
    const v = await reader.get(2);
    expect(Array.isArray(v) && v.length).toBe(100_000);
  }, 15_000);

  it('an object-stream header claiming 5,000,000 members is charged before its tables are built', async () => {
    const header = '1 0 '.repeat(5_000_000);
    const bytes = objStmFile(`N 5000000/First ${header.length}`, `${header}null`);
    const reader = await PdfReader.open(bytes, new DecodeBudget(64 * MIB));
    const err = await expectMalformed(reader.get(2));
    expect(err.message).toMatch(/budget/i);
  }, 15_000);
});
