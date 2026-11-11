import { XfaPdfError } from '../../pdf/errors.js';
import { ByteView } from './bytes.js';
import { MAX_CMAP_GROUPS, MAX_CMAP_SUBTABLES } from './limits.js';

/** Maps a code point to a glyph id; 0 means "not mapped" (and is also `.notdef`). Never throws. */
export type GlyphLookup = (codePoint: number) => number;

/** FD-38 exemption (correctness constant): the largest Unicode code point, U+10FFFF, defined by the Unicode standard; not a setting. */
const MAX_CODE_POINT = 0x10ffff;

/**
 * Encoding records in the order the reader prefers them, each `platform * 65536 + encoding`: Unicode full repertoire
 * first (Windows 3,10 then Unicode 0,4 and 0,6), then the Basic Multilingual Plane (3,1 then Unicode 0,3 / 0,2 / 0,1 / 0,0).
 * FD-38 exemption (correctness constant): the platform and encoding ids are the OpenType specification's, not settings.
 */
const PREFERRED_ENCODINGS: readonly number[] = [
  3 * 65536 + 10,
  0 * 65536 + 6,
  0 * 65536 + 4,
  3 * 65536 + 1,
  0 * 65536 + 3,
  0 * 65536 + 2,
  0 * 65536 + 1,
  0 * 65536,
];

function malformed(why: string): XfaPdfError {
  return new XfaPdfError('MALFORMED', `Font cmap: ${why}`);
}

/** Format 4 (segment mapping to delta values), read from an independent copy of the subtable. */
function format4(sub: ByteView, glyphCount: number): GlyphLookup {
  const segCountX2 = sub.u16(6);
  if (segCountX2 === 0 || segCountX2 % 2 !== 0) throw malformed('format 4 segment count is zero or odd');
  const n = segCountX2 / 2;
  // header 14 + endCode 2n + reservedPad 2 + startCode 2n + idDelta 2n + idRangeOffset 2n
  if (!sub.has(0, 16 + 8 * n)) throw malformed('format 4 segment arrays run past the subtable');
  const end = new Uint16Array(n);
  const start = new Uint16Array(n);
  const delta = new Uint16Array(n);
  const rangeOffset = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    end[i] = sub.u16(14 + 2 * i);
    start[i] = sub.u16(16 + 2 * n + 2 * i);
    delta[i] = sub.u16(16 + 4 * n + 2 * i);
    rangeOffset[i] = sub.u16(16 + 6 * n + 2 * i);
  }
  return (cp) => {
    if (!Number.isInteger(cp) || cp < 0 || cp > 0xffff) return 0;
    // First segment whose end code is not below cp (end codes ascend in a valid font; a hostile order only yields a wrong glyph).
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((end[mid] ?? 0) < cp) lo = mid + 1;
      else hi = mid;
    }
    const first = start[lo] ?? 0;
    if ((end[lo] ?? 0) < cp || first > cp) return 0;
    const offset = rangeOffset[lo] ?? 0;
    let gid: number;
    if (offset === 0) gid = cp;
    else {
      const raw = sub.tryU16(16 + 6 * n + 2 * lo + offset + 2 * (cp - first));
      if (raw === undefined || raw === 0) return 0;
      gid = raw;
    }
    gid = (gid + (delta[lo] ?? 0)) & 0xffff;
    return gid < glyphCount ? gid : 0;
  };
}

/** Format 12 (segmented coverage, 32-bit): groups must be sorted, disjoint and inside Unicode. */
function format12(sub: ByteView, glyphCount: number): GlyphLookup {
  const groups = sub.u32(12);
  if (groups === 0) throw malformed('format 12 has no groups');
  if (groups > MAX_CMAP_GROUPS) throw malformed(`format 12 declares ${groups} groups (more than ${MAX_CMAP_GROUPS})`);
  if (!sub.has(16, groups * 12)) throw malformed('format 12 groups run past the subtable');
  const start = new Uint32Array(groups);
  const end = new Uint32Array(groups);
  const first = new Uint32Array(groups);
  let previousEnd = -1;
  for (let i = 0; i < groups; i++) {
    const s = sub.u32(16 + 12 * i);
    const e = sub.u32(20 + 12 * i);
    if (e < s || e > MAX_CODE_POINT || s <= previousEnd) throw malformed('format 12 groups are unsorted, overlapping or beyond U+10FFFF');
    start[i] = s;
    end[i] = e;
    first[i] = sub.u32(24 + 12 * i);
    previousEnd = e;
  }
  return (cp) => {
    if (!Number.isInteger(cp) || cp < 0 || cp > MAX_CODE_POINT) return 0;
    let lo = 0;
    let hi = groups - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if ((start[mid] ?? 0) <= cp) lo = mid;
      else hi = mid - 1;
    }
    if ((start[lo] ?? 0) > cp || (end[lo] ?? 0) < cp) return 0;
    const gid = (first[lo] ?? 0) + (cp - (start[lo] ?? 0));
    return gid < glyphCount ? gid : 0;
  };
}

function readSubtable(table: ByteView, offset: number, glyphCount: number): GlyphLookup {
  if (!table.has(offset, 4)) throw malformed('encoding record points outside the table');
  const format = table.u16(offset);
  if (format !== 4 && format !== 12) throw malformed(`format ${format} is not read`);
  // The subtable `length` field is not trusted (real fonts get it wrong); the table end bounds it. Copy: the result owns its bytes.
  const sub = new ByteView(table.copy(offset, table.length - offset));
  return format === 4 ? format4(sub, glyphCount) : format12(sub, glyphCount);
}

/**
 * Reads a `cmap` table (its bytes only) and returns the lookup of the best usable Unicode subtable (formats 4 and 12). A
 * subtable that is malformed or of another format is skipped in favour of the next preferred one; no usable subtable is
 * `MALFORMED`. Never loops: every offset is read once, nothing is followed recursively.
 */
export function readCmap(cmap: Uint8Array, glyphCount: number): GlyphLookup {
  const table = new ByteView(cmap);
  const count = table.u16(2);
  if (count > MAX_CMAP_SUBTABLES) throw malformed(`${count} encoding records (more than ${MAX_CMAP_SUBTABLES})`);
  if (!table.has(4, count * 8)) throw malformed('encoding records run past the table');
  const records = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const key = table.u16(4 + 8 * i) * 65536 + table.u16(6 + 8 * i);
    if (!records.has(key)) records.set(key, table.u32(8 + 8 * i));
  }
  for (const key of PREFERRED_ENCODINGS) {
    const offset = records.get(key);
    if (offset === undefined) continue;
    try {
      return readSubtable(table, offset, glyphCount);
    } catch (error) {
      if (!(error instanceof XfaPdfError)) throw error;
    }
  }
  throw malformed('no usable Unicode subtable (format 4 or 12)');
}
