import { z } from 'zod';
import { concatBytes } from './concat-bytes.js';
import { XfaPdfError } from './errors.js';
import { deflate } from './flate.js';
import { MAX_OBJECT_NUMBER } from './limits.js';
import type { PdfReader } from './reader.js';
import { encryptStrings, isCleartextMetadata } from './security/encrypt-object.js';
import { serializeValue } from './serialize.js';
import { asNonNegInt, type PdfDict, type PdfRef, type PdfValue } from './types.js';

/** One stream object to redefine: same object number and generation, new content. */
export interface Replacement {
  readonly ref: PdfRef;
  /**
   * The stream dictionary as read (strings already decrypted). Every key is kept except /Length, /Filter,
   * /DecodeParms and its abbreviation /DP, which describe the old encoding; an existing /DL (decoded length) is recomputed.
   */
  readonly dict: PdfDict;
  /** The final, unfiltered stream content. */
  readonly plaintext: Uint8Array;
}

/** FD-38 exemption (correctness constant): a generation number is 16 bits in the xref stream (`/W [1 4 2]`) and the file format. */
const MAX_GENERATION = 0xffff;
/** Xref stream layout `/W [1 4 2]`: type byte, 4-byte offset, 2-byte generation. */
const ENTRY_BYTES = 7;
/** FD-38 exemption (correctness constant): the largest offset the 4-byte xref field of `/W [1 4 2]` can hold. */
const MAX_OFFSET = 0xffffffff;
const DROPPED_KEYS: ReadonlySet<string> = new Set(['Length', 'Filter', 'DecodeParms', 'DP']);
/** Trailer entries carried into the new xref stream unchanged. */
const COPIED_TRAILER_KEYS = ['Root', 'Info', 'Encrypt', 'ID'] as const;

const inputSchema = z.object({
  source: z.instanceof(Uint8Array, { error: 'source must be a Uint8Array' }).refine((b) => b.length > 0, { error: 'source is empty' }),
  replacements: z
    .array(
      z.object({
        ref: z.object({
          kind: z.literal('ref'),
          num: z.number().int().min(1).max(MAX_OBJECT_NUMBER),
          gen: z.number().int().min(0).max(MAX_GENERATION),
        }),
        dict: z.instanceof(Map, { error: 'dict must be a Map' }),
        plaintext: z.instanceof(Uint8Array, { error: 'plaintext must be a Uint8Array' }),
      }),
    )
    .min(1, { error: 'at least one replacement is required' }),
});

const fail = (message: string): XfaPdfError => new XfaPdfError('MALFORMED', message);
const name = (value: string): PdfValue => ({ kind: 'name', value });
const ascii = (s: string): Uint8Array => new TextEncoder().encode(s);

function streamObject(header: string, dict: PdfDict, content: Uint8Array): Uint8Array {
  return concatBytes([ascii(`${header} obj\n${serializeValue(dict)}\nstream\n`), content, ascii('\nendstream\nendobj\n')]);
}

/** Flate, then (for an encrypted document) AES with the object's own key; strings kept in the dictionary are re-encrypted too. */
async function replacementObject(r: Replacement, reader: PdfReader): Promise<Uint8Array> {
  const security = reader.securityHandler;
  const deflated = await deflate(r.plaintext);
  const encrypted = security !== undefined && !isCleartextMetadata(security, r.dict);
  const content = encrypted ? await security.encryptStream(r.ref.num, r.ref.gen, deflated) : deflated;

  const kept: PdfDict = new Map();
  for (const [key, value] of r.dict) if (!DROPPED_KEYS.has(key)) kept.set(key, value);
  const withStrings = security === undefined ? kept : await encryptStrings(security, r.ref.num, r.ref.gen, kept);
  if (!(withStrings instanceof Map)) throw fail('Stream dictionary changed shape while encrypting its strings');
  const dict: PdfDict = new Map(withStrings);
  if (r.dict.has('DL')) dict.set('DL', r.plaintext.length);
  dict.set('Filter', name('FlateDecode'));
  dict.set('Length', content.length);
  return streamObject(`${r.ref.num} ${r.ref.gen}`, dict, content);
}

interface XrefRow {
  readonly num: number;
  readonly offset: number;
  readonly gen: number;
}

async function xrefStreamObject(rows: readonly XrefRow[], xrefNum: number, reader: PdfReader): Promise<Uint8Array> {
  const table = new Uint8Array(rows.length * ENTRY_BYTES);
  const view = new DataView(table.buffer);
  rows.forEach((row, i) => {
    if (row.offset > MAX_OFFSET) throw fail('File is too large for a 4-byte xref offset');
    const at = i * ENTRY_BYTES;
    view.setUint8(at, 1);
    view.setUint32(at + 1, row.offset);
    view.setUint16(at + 5, row.gen);
  });
  const content = await deflate(table);

  const index: PdfValue[] = [];
  for (const row of rows) index.push(row.num, 1);
  const dict: PdfDict = new Map<string, PdfValue>([
    ['Type', name('XRef')],
    ['Size', xrefNum + 1],
    ['W', [1, 4, 2]],
    ['Index', index],
    ['Prev', reader.startxref],
  ]);
  for (const key of COPIED_TRAILER_KEYS) {
    const value = reader.trailer.get(key);
    if (value !== undefined) dict.set(key, value);
  }
  dict.set('Filter', name('FlateDecode'));
  dict.set('Length', content.length);
  return streamObject(`${xrefNum} 0`, dict, content);
}

/**
 * Appends one incremental update (ISO 32000-1 §7.5.6) that redefines the given stream objects: the original
 * bytes stay an exact prefix of the result (signature byte ranges and usage rights are untouched), followed by
 * the new objects, an xref STREAM (never encrypted, /Prev = the file's newest xref section, /Root /Info /Encrypt
 * /ID copied from its trailer) and `startxref`/`%%EOF`. Output is deterministic for a given input and runtime.
 * `source` must be the exact bytes `reader` was opened on, and must not change while this runs.
 */
export async function appendIncrementalUpdate(source: Uint8Array, reader: PdfReader, replacements: readonly Replacement[]): Promise<Uint8Array> {
  const checked = inputSchema.safeParse({ source, replacements });
  if (!checked.success) throw fail(checked.error.issues.map((i) => i.message).join('; '));
  const sorted = [...replacements].sort((a, b) => a.ref.num - b.ref.num);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]?.ref.num === sorted[i - 1]?.ref.num) throw fail(`Object ${sorted[i]?.ref.num ?? 0} is replaced twice`);
  }
  const previousSize = asNonNegInt(reader.trailer.get('Size'));
  if (previousSize === undefined) throw fail('Trailer has no valid /Size');
  if (reader.trailer.get('Root') === undefined) throw fail('Trailer has no /Root');
  const highest = sorted[sorted.length - 1]?.ref.num ?? 0;
  // The xref stream takes a number nothing else uses: the old /Size, but also past every xref entry (a /Size that
  // under-reports would otherwise make the new xref stream overwrite a live object) and past the replaced numbers.
  const xrefNum = Math.max(previousSize, reader.maxObjectNumber + 1, highest + 1);
  if (xrefNum > MAX_OBJECT_NUMBER) throw fail('Object numbers are exhausted');

  const last = source[source.length - 1];
  const eol = last === 0x0a || last === 0x0d ? new Uint8Array(0) : Uint8Array.of(0x0a);
  const parts: Uint8Array[] = [source, eol];
  let pos = source.length + eol.length;
  const rows: XrefRow[] = [];
  for (const r of sorted) {
    const built = await replacementObject(r, reader);
    rows.push({ num: r.ref.num, offset: pos, gen: r.ref.gen });
    parts.push(built);
    pos += built.length;
  }
  const xrefOffset = pos;
  rows.push({ num: xrefNum, offset: xrefOffset, gen: 0 });
  const xref = await xrefStreamObject(rows, xrefNum, reader);
  parts.push(xref, ascii(`startxref\n${xrefOffset}\n%%EOF\n`));

  return concatBytes(parts);
}
