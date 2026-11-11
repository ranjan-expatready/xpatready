/**
 * In-memory PDF assembler for tests. Uses node:zlib (NOT the engine's own
 * inflate/deflate) and its own predictor encoder, so the engine is checked
 * against an independent implementation.
 */
import { deflateSync } from 'node:zlib';
import { dec, enc } from '../../pdf/__tests__/bytes.js';

export const HEADER = '%PDF-1.7\n%âãÏÓ\n';

export class PdfOut {
  private readonly parts: Uint8Array[] = [];
  length = 0;

  /** Appends data and returns the offset it starts at. */
  push(data: string | Uint8Array): number {
    const bytes = typeof data === 'string' ? enc(data) : data;
    const at = this.length;
    this.parts.push(bytes);
    this.length += bytes.length;
    return at;
  }

  toBytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let pos = 0;
    for (const p of this.parts) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }
}

export const zlib = (data: Uint8Array): Uint8Array => new Uint8Array(deflateSync(data));

export function writeObj(out: PdfOut, num: number, body: string, gen = 0): number {
  return out.push(`${num} ${gen} obj\n${body}\nendobj\n`);
}

export function writeStreamObj(out: PdfOut, num: number, dictBody: string, data: Uint8Array, lengthText?: string): number {
  const at = out.push(`${num} 0 obj\n<<${dictBody}/Length ${lengthText ?? String(data.length)}>>\nstream\n`);
  out.push(data);
  out.push('\nendstream\nendobj\n');
  return at;
}

export function writeTail(out: PdfOut, xrefOffset: number): void {
  out.push(`startxref\n${xrefOffset}\n%%EOF\n`);
}

export type EntryStyle = 'crlf' | 'space-lf';
export type TableEntry = { readonly num: number } & ({ readonly free: true } | { readonly offset: number; readonly gen?: number });

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Writes `xref … trailer <<…>>` (no startxref) and returns the offset of the `xref` keyword. */
export function writeXrefTable(out: PdfOut, entries: readonly TableEntry[], trailerBody: string, style: EntryStyle = 'crlf'): number {
  const at = out.push('xref\n');
  const eol = style === 'crlf' ? '\r\n' : ' \n';
  const sorted = [...entries].sort((a, b) => a.num - b.num);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && (sorted[j + 1]?.num ?? -1) === (sorted[j]?.num ?? -2) + 1) j += 1;
    out.push(`${sorted[i]?.num ?? 0} ${j - i + 1}\n`);
    for (let k = i; k <= j; k++) {
      const e = sorted[k];
      if (!e) continue;
      out.push('free' in e ? `0000000000 65535 f${eol}` : `${pad(e.offset, 10)} ${pad(e.gen ?? 0, 5)} n${eol}`);
    }
    i = j + 1;
  }
  out.push(`trailer\n<<${trailerBody}>>\n`);
  return at;
}

export interface XrefRow {
  readonly type: 0 | 1 | 2;
  readonly f2: number;
  readonly f3: number;
}

export interface XrefStreamOverrides {
  /** Replaces the `/W[1 3 1]` entry text. */
  readonly w?: string;
  /** Explicit `/Index` pairs (default: omitted, i.e. [0 Size]). */
  readonly index?: readonly number[];
}

/** Writes a Flate + PNG-Up (Predictor 12, Columns 5) xref stream with /W[1 3 1]. Returns its offset. */
export function writeXrefStream(out: PdfOut, num: number, rows: readonly XrefRow[], dictBody: string, o: XrefStreamOverrides = {}): number {
  const rowBytes = rows.map((r) => {
    if (r.f3 > 255) throw new Error('fixture: f3 must fit /W[1 3 1]');
    return [r.type, (r.f2 >> 16) & 255, (r.f2 >> 8) & 255, r.f2 & 255, r.f3];
  });
  const predicted: number[] = [];
  let prev: number[] = [0, 0, 0, 0, 0];
  for (const row of rowBytes) {
    predicted.push(2);
    row.forEach((b, i) => predicted.push((b - (prev[i] ?? 0)) & 255));
    prev = row;
  }
  const index = o.index ? `/Index[${o.index.join(' ')}]` : '';
  const dict = `/Type/XRef${o.w ?? '/W[1 3 1]'}/Filter/FlateDecode/DecodeParms<</Columns 5/Predictor 12>>${index}${dictBody}`;
  return writeStreamObj(out, num, dict, zlib(Uint8Array.from(predicted)));
}

/** Writes a Flate xref stream from caller-supplied row bytes (no predictor) with an explicit /W entry. */
export function writeXrefStreamRaw(out: PdfOut, num: number, w: string, rowBytes: Uint8Array, dictBody: string): number {
  return writeStreamObj(out, num, `/Type/XRef${w}/Filter/FlateDecode${dictBody}`, zlib(rowBytes));
}

export interface ObjStmMember {
  readonly num: number;
  readonly body: string;
}

export function writeObjStm(out: PdfOut, num: number, members: readonly ObjStmMember[], lengthText?: string, filterText = '/FlateDecode'): number {
  let body = '';
  const header: string[] = [];
  for (const m of members) {
    header.push(`${m.num} ${body.length}`);
    body += `${m.body}\n`;
  }
  const head = `${header.join(' ')}\n`;
  const data = zlib(enc(head + body));
  return writeStreamObj(out, num, `/Type/ObjStm/N ${members.length}/First ${head.length}/Filter ${filterText}`, data, lengthText);
}

export interface ClassicOptions {
  readonly style?: EntryStyle;
  /** Write an offset far outside the file for this object number. */
  readonly badOffsetOf?: number;
  /** Add object 5: a stream whose /Length points at itself. */
  readonly cyclicLength?: boolean;
}

/** Objects: 1 catalog dict, 2 pages dict, 3 stream "Hello stream" with indirect /Length 4 0 R, 4 = 12. */
export function buildClassicPdf(opts: ClassicOptions = {}): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const offs = new Map<number, number>();
  offs.set(1, writeObj(out, 1, '<</Type/Catalog/Pages 2 0 R>>'));
  offs.set(2, writeObj(out, 2, '<</Type/Pages/Kids[]/Count 0>>'));
  offs.set(3, writeStreamObj(out, 3, '', enc('Hello stream'), '4 0 R'));
  offs.set(4, writeObj(out, 4, '12'));
  if (opts.cyclicLength) offs.set(5, writeStreamObj(out, 5, '', enc('x'), '5 0 R'));
  const entries: TableEntry[] = [{ num: 0, free: true }];
  for (const [num, offset] of offs) entries.push({ num, offset: opts.badOffsetOf === num ? 99999999 : offset });
  const x = writeXrefTable(out, entries, `/Size ${opts.cyclicLength ? 6 : 5}/Root 1 0 R`, opts.style);
  writeTail(out, x);
  return out.toBytes();
}

export interface IncrementalOptions {
  /** `self`: the update's /Prev points at its own xref. `loop`: additionally the base section's /Prev points at the update. */
  readonly prev?: 'normal' | 'self' | 'loop';
  /** The update also marks object 3 free. */
  readonly freeObject3?: boolean;
}

/** Base: 1 catalog, 2 = (old), 3 = (keep). Update: 2 = (new), with /Prev. */
export function buildIncrementalPdf(opts: IncrementalOptions = {}): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o1 = writeObj(out, 1, '<</Type/Catalog>>');
  const o2 = writeObj(out, 2, '(old)');
  const o3 = writeObj(out, 3, '(keep)');
  const x1 = writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 2, offset: o2 }, { num: 3, offset: o3 }], `/Size 4/Root 1 0 R${opts.prev === 'loop' ? '/Prev 0000000000' : ''}`);
  writeTail(out, x1);
  const o2new = writeObj(out, 2, '(new)');
  const x2 = out.length;
  const updated: TableEntry[] = [{ num: 2, offset: o2new }];
  if (opts.freeObject3) updated.push({ num: 3, free: true });
  writeXrefTable(out, updated, `/Size 4/Root 1 0 R/Prev ${opts.prev === 'self' ? x2 : x1}`);
  writeTail(out, x2);
  const bytes = out.toBytes();
  if (opts.prev === 'loop') {
    const text = dec(bytes);
    const at = text.indexOf('/Prev 0000000000') + '/Prev '.length;
    bytes.set(enc(pad(x2, 10)), at);
  }
  return bytes;
}

export interface XrefStreamPdfOptions extends XrefStreamOverrides {
  /** Row for object 2 points past the end of object stream 5. */
  readonly badObjStmIndex?: boolean;
  /** Row for object 2 names ordinary object 4 (not a stream) as its container. */
  readonly nonStreamContainer?: boolean;
  /** Row for object 2 points at the member that holds object 1. */
  readonly wrongMemberIndex?: boolean;
  /** Overrides the xref stream's /Size (default 7). */
  readonly size?: number;
  /** Append an incremental update: redefine 4 = 43, add 7 = (added), xref stream 8 with /Prev. */
  readonly update?: boolean;
}

/**
 * Objects: 1 catalog + 2 pages dict inside ObjStm 5, 3 Flate stream "Hello flate",
 * 4 = 42, xref stream 6 (Size 7). With `update`: 4 = 43, 7 = (added), xref stream 8.
 */
export function buildXrefStreamPdf(opts: XrefStreamPdfOptions = {}): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o3 = writeStreamObj(out, 3, '/Filter/FlateDecode', zlib(enc('Hello flate')));
  const o4 = writeObj(out, 4, '42');
  const o5 = writeObjStm(out, 5, [
    { num: 1, body: '<</Type/Catalog/Pages 2 0 R>>' },
    { num: 2, body: '<</Type/Pages/Kids[]/Count 0>>' },
  ]);
  const o6 = out.length;
  const idx2 = opts.badObjStmIndex ? 7 : opts.wrongMemberIndex ? 0 : 1;
  const rows: XrefRow[] = [
    { type: 0, f2: 0, f3: 255 },
    { type: 2, f2: 5, f3: 0 },
    { type: 2, f2: opts.nonStreamContainer ? 4 : 5, f3: idx2 },
    { type: 1, f2: o3, f3: 0 },
    { type: 1, f2: o4, f3: 0 },
    { type: 1, f2: o5, f3: 0 },
    { type: 1, f2: o6, f3: 0 },
  ];
  writeXrefStream(out, 6, rows, `/Size ${opts.size ?? 7}/Root 1 0 R`, opts);
  writeTail(out, o6);
  if (opts.update) {
    const o4new = writeObj(out, 4, '43');
    const o7 = writeObj(out, 7, '(added)');
    const o8 = out.length;
    writeXrefStream(
      out,
      8,
      [{ type: 1, f2: o4new, f3: 0 }, { type: 1, f2: o7, f3: 0 }, { type: 1, f2: o8, f3: 0 }],
      `/Size 9/Root 1 0 R/Prev ${o6}`,
      { index: [4, 1, 7, 2] },
    );
    writeTail(out, o8);
  }
  return out.toBytes();
}

/** Hybrid file: table lists 0,1,3,4; /XRefStm (object 4) supplies object 2, held in ObjStm 3. */
export function buildHybridPdf(): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o1 = writeObj(out, 1, '<</Type/Catalog>>');
  const o3 = writeObjStm(out, 3, [{ num: 2, body: '(hybrid)' }]);
  const o4 = out.length;
  writeXrefStream(out, 4, [{ type: 2, f2: 3, f3: 0 }], '/Size 5', { index: [2, 1] });
  const x = writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 3, offset: o3 }, { num: 4, offset: o4 }], `/Size 5/Root 1 0 R/XRefStm ${o4}`);
  writeTail(out, x);
  return out.toBytes();
}

export interface LargePdf {
  readonly bytes: Uint8Array;
  readonly memberNums: readonly number[];
  readonly objStmCount: number;
  readonly memberBody: (num: number) => string;
}

/** ~1.2 MB: 1200 string objects (2 KB pseudo-random hex each) spread over 6 object streams. */
export function buildLargePdf(): LargePdf {
  const perStm = 200;
  const stmCount = 6;
  let seed = 0x9e3779b9;
  const next = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const bodies = new Map<number, string>();
  for (let n = 1; n <= perStm * stmCount; n++) {
    let hex = '';
    while (hex.length < 2000) hex += next().toString(16).padStart(8, '0');
    bodies.set(n, `<${hex.slice(0, 2000)}>`);
  }
  const out = new PdfOut();
  out.push(HEADER);
  const rows: XrefRow[] = [{ type: 0, f2: 0, f3: 255 }];
  for (let n = 1; n <= perStm * stmCount; n++) {
    rows.push({ type: 2, f2: perStm * stmCount + 1 + Math.floor((n - 1) / perStm), f3: (n - 1) % perStm });
  }
  for (let k = 0; k < stmCount; k++) {
    const members: ObjStmMember[] = [];
    for (let i = 1; i <= perStm; i++) {
      const num = k * perStm + i;
      members.push({ num, body: bodies.get(num) ?? '' });
    }
    rows.push({ type: 1, f2: writeObjStm(out, perStm * stmCount + 1 + k, members), f3: 0 });
  }
  const xrefNum = perStm * stmCount + stmCount + 1;
  const xo = out.length;
  rows.push({ type: 1, f2: xo, f3: 0 });
  writeXrefStream(out, xrefNum, rows, `/Size ${xrefNum + 1}/Root 1 0 R`);
  writeTail(out, xo);
  return {
    bytes: out.toBytes(),
    memberNums: [...bodies.keys()],
    objStmCount: stmCount,
    memberBody: (num) => bodies.get(num) ?? '',
  };
}

/** Classic file of `n` streams where stream k has `/Length (k+1) 0 R` (the last has a direct /Length). */
export function buildLengthChainPdf(n: number): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const entries: TableEntry[] = [{ num: 0, free: true }];
  for (let k = 1; k <= n; k++) {
    entries.push({ num: k, offset: writeStreamObj(out, k, '', enc('x'), k < n ? `${k + 1} 0 R` : undefined) });
  }
  const x = writeXrefTable(out, entries, `/Size ${n + 1}/Root 1 0 R`);
  writeTail(out, x);
  return out.toBytes();
}

/**
 * Xref-stream file where stream 3 ("Hello flate") has `/Length 7 0 R` and object 7
 * (its length) lives inside ObjStm 5. With `selfLength`, ObjStm 5's OWN /Length is `7 0 R`
 * (ISO 32000-1 §7.5.7 forbids that: the length of an object stream cannot be compressed).
 */
export function buildLengthInObjStmPdf(selfLength = false): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const packed = zlib(enc('Hello flate'));
  const o3 = writeStreamObj(out, 3, '/Filter/FlateDecode', packed, '7 0 R');
  const o5 = writeObjStm(
    out,
    5,
    [{ num: 1, body: '<</Type/Catalog>>' }, { num: 7, body: selfLength ? '5' : String(packed.length) }],
    selfLength ? '7 0 R' : undefined,
  );
  const o6 = out.length;
  const rows: XrefRow[] = [
    { type: 0, f2: 0, f3: 255 },
    { type: 2, f2: 5, f3: 0 },
    { type: 0, f2: 0, f3: 0 },
    { type: 1, f2: o3, f3: 0 },
    { type: 0, f2: 0, f3: 0 },
    { type: 1, f2: o5, f3: 0 },
    { type: 1, f2: o6, f3: 0 },
    { type: 2, f2: 5, f3: 1 },
  ];
  writeXrefStream(out, 6, rows, '/Size 8/Root 1 0 R');
  writeTail(out, o6);
  return out.toBytes();
}

/** Classic file: stream 3 has `/Filter 8 0 R /DecodeParms 9 0 R` (both indirect); decodes to [10,20,30,40,11,22,33,44]. */
export function buildIndirectFilterPdf(): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const o1 = writeObj(out, 1, '<</Type/Catalog>>');
  const rows = Uint8Array.from([0, 10, 20, 30, 40, 2, 1, 2, 3, 4]);
  const o3 = writeStreamObj(out, 3, '/Filter 8 0 R/DecodeParms 9 0 R', zlib(rows));
  const o8 = writeObj(out, 8, '/FlateDecode');
  const o9 = writeObj(out, 9, '<</Predictor 12/Columns 4>>');
  const x = writeXrefTable(
    out,
    [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 3, offset: o3 }, { num: 8, offset: o8 }, { num: 9, offset: o9 }],
    '/Size 10/Root 1 0 R',
  );
  writeTail(out, x);
  return out.toBytes();
}

/**
 * Object streams whose own /Filter is an indirect reference.
 * - `self`: ObjStm 5's /Filter is object 9, which is a member of ObjStm 5.
 * - `mutual`: ObjStm 5's /Filter is member 10 of ObjStm 6, and ObjStm 6's /Filter is member 9 of ObjStm 5.
 * - `plain`: ObjStm 5's /Filter is object 9, an ordinary (uncompressed) object.
 */
export function buildContainerFilterPdf(variant: 'self' | 'mutual' | 'plain'): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const catalog = { num: 1, body: '<</Type/Catalog>>' };
  const flate = (num: number): ObjStmMember => ({ num, body: '/FlateDecode' });
  const rows = new Map<number, XrefRow>([[1, { type: 2, f2: 5, f3: 0 }]]);
  let xrefNum = 6;
  if (variant === 'self') {
    rows.set(5, { type: 1, f2: writeObjStm(out, 5, [catalog, flate(9)], undefined, '9 0 R'), f3: 0 });
    rows.set(9, { type: 2, f2: 5, f3: 1 });
  } else if (variant === 'mutual') {
    xrefNum = 7;
    rows.set(2, { type: 2, f2: 6, f3: 0 });
    rows.set(5, { type: 1, f2: writeObjStm(out, 5, [catalog, flate(9)], undefined, '10 0 R'), f3: 0 });
    rows.set(6, { type: 1, f2: writeObjStm(out, 6, [{ num: 2, body: '(two)' }, flate(10)], undefined, '9 0 R'), f3: 0 });
    rows.set(9, { type: 2, f2: 5, f3: 1 });
    rows.set(10, { type: 2, f2: 6, f3: 1 });
  } else {
    rows.set(9, { type: 1, f2: writeObj(out, 9, '/FlateDecode'), f3: 0 });
    rows.set(5, { type: 1, f2: writeObjStm(out, 5, [catalog], undefined, '9 0 R'), f3: 0 });
  }
  const xo = out.length;
  rows.set(xrefNum, { type: 1, f2: xo, f3: 0 });
  const size = Math.max(...rows.keys()) + 1;
  const table: XrefRow[] = [];
  for (let n = 0; n < size; n++) table.push(rows.get(n) ?? { type: 0, f2: 0, f3: n === 0 ? 255 : 0 });
  writeXrefStream(out, xrefNum, table, `/Size ${size}/Root 1 0 R`);
  writeTail(out, xo);
  return out.toBytes();
}
