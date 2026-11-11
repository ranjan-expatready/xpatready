import { malformed, XfaPdfError } from './errors.js';
import { DecodeBudget } from './filters.js';
import { PdfLexer } from './lexer.js';
import { MAX_OBJECT_NUMBER, MAX_XREF_ENTRIES, MAX_XREF_FIELD_WIDTH } from './limits.js';
import { PARSE_NODE_COST, parseIndirectAt, parseValue, tokenIndex } from './object-parser.js';
import { safeText } from './safe-text.js';
import { asNonNegInt, isPdfName, isPdfStream, type PdfDict, type PdfValue } from './types.js';

export type XrefEntry =
  | { readonly type: 'free' }
  | { readonly type: 'offset'; readonly offset: number; readonly gen: number }
  | { readonly type: 'compressed'; readonly objStm: number; readonly index: number };

export interface XrefChain {
  readonly entries: Map<number, XrefEntry>;
  /** Trailer (or xref-stream dictionary) of the NEWEST section. */
  readonly trailer: PdfDict;
  readonly startxref: number;
}

interface Section {
  readonly entries: Map<number, XrefEntry>;
  readonly trailer: PdfDict;
}

/** What one read of a /Prev chain shares across its sections: the reader's budget and the running entry count. */
interface ChainState {
  readonly budget: DecodeBudget;
  entries: number;
}

/**
 * Admits `count` entries starting at object `start` BEFORE any is allocated: the range must stay inside the
 * object-number space, the chain total inside MAX_XREF_ENTRIES, and each entry is charged to the reader budget.
 */
function reserveEntries(state: ChainState, start: number, count: number, at: number): void {
  // The highest valid object number IS MAX_OBJECT_NUMBER (the writer may number its xref stream with it).
  if (count > 0 && start + count - 1 > MAX_OBJECT_NUMBER) throw malformed(`Xref range ${start} + ${count} passes the maximum object number`, at);
  state.entries += count;
  if (state.entries > MAX_XREF_ENTRIES) throw malformed(`Xref claims more than ${MAX_XREF_ENTRIES} entries`, at);
  state.budget.charge(count * PARSE_NODE_COST);
}

const STARTXREF = 'startxref';
/** ISO 32000-1 §7.5.5: `startxref` sits in the last 1024 bytes of the file. */
const TAIL_WINDOW = 1024;

function lastIndexOfAscii(bytes: Uint8Array, word: string, from: number): number {
  for (let i = bytes.length - word.length; i >= from; i--) {
    let hit = true;
    for (let k = 0; k < word.length && hit; k++) hit = bytes[i + k] === word.charCodeAt(k);
    if (hit) return i;
  }
  return -1;
}

function findStartXref(bytes: Uint8Array): number {
  const at = lastIndexOfAscii(bytes, STARTXREF, Math.max(0, bytes.length - TAIL_WINDOW));
  if (at < 0) throw malformed('No startxref in the last 1024 bytes', bytes.length);
  const lexer = new PdfLexer(bytes, at + STARTXREF.length);
  const offset = tokenIndex(lexer.nextToken());
  if (offset === undefined) throw malformed('startxref is not followed by an offset', at);
  if (offset >= bytes.length) throw malformed('startxref offset is outside the file', at);
  return offset;
}

/** Optional non-negative integer entry (/Prev, /XRefStm); must point inside the file. */
function offsetEntry(trailer: PdfDict, key: string, fileLength: number): number | undefined {
  const v = trailer.get(key);
  if (v === undefined) return undefined;
  const offset = asNonNegInt(v);
  if (offset === undefined || offset >= fileLength) {
    throw new XfaPdfError('MALFORMED', `Trailer /${key} is not an offset inside the file`);
  }
  return offset;
}

function intOf(v: PdfValue | undefined, what: string): number {
  const n = asNonNegInt(v);
  if (n === undefined) throw new XfaPdfError('MALFORMED', `${what} must be a non-negative integer`);
  return n;
}

/** Merge a section into the accumulated entries; entries already present are NEWER and win. */
function mergeOlder(into: Map<number, XrefEntry>, older: Map<number, XrefEntry>): void {
  for (const [num, entry] of older) if (!into.has(num)) into.set(num, entry);
}

export async function readXrefChain(bytes: Uint8Array, budget: DecodeBudget = new DecodeBudget()): Promise<XrefChain> {
  const startxref = findStartXref(bytes);
  const state: ChainState = { budget, entries: 0 };
  const entries = new Map<number, XrefEntry>();
  const seen = new Set<number>(); // every section is visited at most once, so the loop is bounded by the file size
  let trailer: PdfDict | undefined;
  let next: number | undefined = startxref;
  while (next !== undefined) {
    if (seen.has(next)) throw malformed('Cycle in the xref /Prev chain', next);
    seen.add(next);
    const section = await readSection(bytes, next, state);
    mergeOlder(entries, section.entries);
    const hybrid = offsetEntry(section.trailer, 'XRefStm', bytes.length);
    if (hybrid !== undefined) {
      if (seen.has(hybrid)) throw malformed('Cycle in the xref /XRefStm chain', hybrid);
      seen.add(hybrid);
      mergeOlder(entries, (await readXrefStreamAt(bytes, hybrid, state)).entries);
    }
    trailer ??= section.trailer;
    next = offsetEntry(section.trailer, 'Prev', bytes.length);
  }
  if (trailer === undefined) throw malformed('No xref section', startxref);
  return { entries, trailer, startxref };
}

async function readSection(bytes: Uint8Array, offset: number, state: ChainState): Promise<Section> {
  const lexer = new PdfLexer(bytes, offset);
  const first = lexer.nextToken();
  if (first.kind === 'keyword' && first.value === 'xref') return readTable(lexer, state);
  return readXrefStreamAt(bytes, offset, state);
}

function readTable(lexer: PdfLexer, state: ChainState): Section {
  const entries = new Map<number, XrefEntry>();
  for (;;) {
    const at = lexer.pos;
    const head = lexer.nextToken();
    if (head.kind === 'keyword' && head.value === 'trailer') break;
    const start = tokenIndex(head);
    const count = tokenIndex(lexer.nextToken());
    if (start === undefined || count === undefined) throw malformed('Bad xref subsection header', at);
    reserveEntries(state, start, count, at);
    for (let i = 0; i < count; i++) {
      // Token-based, so both `\r\n` and ` \n` 20-byte entry terminators parse.
      const eAt = lexer.pos;
      const offset = tokenIndex(lexer.nextToken());
      const gen = tokenIndex(lexer.nextToken());
      const kind = lexer.nextToken();
      if (offset === undefined || gen === undefined || kind.kind !== 'keyword') throw malformed('Bad xref entry', eAt);
      let entry: XrefEntry;
      if (kind.value === 'n') entry = { type: 'offset', offset, gen };
      else if (kind.value === 'f') entry = { type: 'free' };
      else throw malformed(`Bad xref entry type "${safeText(kind.value)}"`, eAt);
      if (!entries.has(start + i)) entries.set(start + i, entry);
    }
  }
  const at = lexer.pos;
  const trailer = parseValue(lexer, (n) => state.budget.charge(n));
  if (!(trailer instanceof Map)) throw malformed('Trailer is not a dictionary', at);
  return { entries, trailer };
}

function readWidths(dict: PdfDict, at: number): [number, number, number] {
  const w = dict.get('W');
  if (!Array.isArray(w) || w.length !== 3) throw malformed('Xref stream /W must be an array of 3 integers', at);
  const [a, b, c] = w.map((v) => intOf(v, 'Xref stream /W width'));
  if (Math.max(a ?? 0, b ?? 0, c ?? 0) > MAX_XREF_FIELD_WIDTH) throw malformed(`Xref stream /W width exceeds ${MAX_XREF_FIELD_WIDTH} bytes`, at);
  return [a ?? 0, b ?? 0, c ?? 0];
}

/** `/Index` pairs, default `[0 Size]`. The claimed ranges are bounded by MAX_XREF_ENTRIES and the object-number space (see reserveEntries), not by /Size. */
function readIndex(dict: PdfDict, at: number): number[] {
  const idx = dict.get('Index');
  if (idx === undefined) return [0, intOf(dict.get('Size'), 'Xref stream /Size')];
  if (!Array.isArray(idx) || idx.length % 2 !== 0) throw malformed('Xref stream /Index must be an even-length array', at);
  return idx.map((v) => intOf(v, 'Xref stream /Index element'));
}

function field(data: Uint8Array, pos: number, width: number, at: number): number {
  let v = 0;
  for (let k = 0; k < width; k++) v = v * 256 + (data[pos + k] ?? 0);
  if (!Number.isSafeInteger(v)) throw malformed('Xref stream field exceeds 2^53', at);
  return v;
}

async function readXrefStreamAt(bytes: Uint8Array, offset: number, state: ChainState): Promise<Section> {
  const { budget } = state;
  // Xref streams cannot use indirect /Length (the xref is not loaded yet): no resolver is passed.
  const obj = parseIndirectAt(bytes, offset, undefined, (n) => budget.charge(n));
  if (!isPdfStream(obj.value)) throw malformed('Expected an xref stream', offset);
  const dict = obj.value.dict;
  const type = dict.get('Type');
  if (!isPdfName(type) || type.value !== 'XRef') throw malformed('Stream is not /Type /XRef', offset);
  const [w0, w1, w2] = readWidths(dict, offset);
  const rowLen = w0 + w1 + w2;
  if (!Number.isSafeInteger(rowLen) || rowLen <= 0) throw malformed('Xref stream /W widths are invalid', offset);
  const index = readIndex(dict, offset);
  // Validate the claimed ranges from the dictionary alone: a few KB of Flate can inflate to 64 MiB of zeros.
  let rows = 0;
  for (let i = 0; i < index.length; i += 2) {
    reserveEntries(state, index[i] ?? 0, index[i + 1] ?? 0, offset);
    rows += index[i + 1] ?? 0;
  }
  budget.charge(obj.value.raw.length);
  const data = await budget.decode(obj.value);
  if (rows * rowLen > data.length) throw malformed('Xref stream data is shorter than /Index and /W require', offset);

  const entries = new Map<number, XrefEntry>();
  let pos = 0;
  for (let i = 0; i < index.length; i += 2) {
    const start = index[i] ?? 0;
    const count = index[i + 1] ?? 0;
    for (let n = 0; n < count; n++) {
      const type = w0 === 0 ? 1 : field(data, pos, w0, offset);
      const f2 = field(data, pos + w0, w1, offset);
      const f3 = field(data, pos + w0 + w1, w2, offset);
      pos += rowLen;
      let entry: XrefEntry;
      if (type === 1) entry = { type: 'offset', offset: f2, gen: f3 };
      else if (type === 2) entry = { type: 'compressed', objStm: f2, index: f3 };
      else entry = { type: 'free' }; // type 0, and reserved types (null object per ISO 32000-1 §7.5.8.3)
      if (!entries.has(start + n)) entries.set(start + n, entry);
    }
  }
  return { entries, trailer: dict };
}
