import { describe, expect, it, vi } from 'vitest';
import { XfaPdfError } from '../../../pdf/errors.js';
import { MAX_FONT_BYTES } from '../../limits.js';
import { ByteView } from '../bytes.js';
import { parseFontMetrics } from '../sfnt.js';
import {
  assembleSfnt,
  cmapFormat12,
  cmapFormat4,
  cmapFormat4Indirect,
  cmapTable,
  headTable,
  hheaTable,
  hmtxTable,
  maxpTable,
  syntheticFont,
  type TableSpec,
} from './build-sfnt.js';

/** The `ByteView` reads a parse makes: counted instead of timed, so a regression is a number that grew, not a slow machine. */
const READS = ['has', 'u16', 'i16', 'u32', 'tryU16', 'tag', 'copy'] as const;

const READS_PER_INPUT_BYTE = 2;
const ADVANCES = [500, 600, 700, 800]; // glyph 0 is .notdef
const MAP = { 65: 1, 66: 2, 67: 3 };
const font = (extra: Partial<Parameters<typeof syntheticFont>[0]> = {}): Uint8Array => syntheticFont({ advances: ADVANCES, cmap: cmapFormat4(MAP), ...extra });

function malformedOf(fn: () => unknown): XfaPdfError {
  try {
    fn();
  } catch (error) {
    expect(error, 'a typed error, never RangeError / TypeError').toBeInstanceOf(XfaPdfError);
    return error as XfaPdfError;
  }
  throw new Error('expected the font to be refused');
}

describe('parseFontMetrics: the bounded sfnt reader (head, hhea, maxp, hmtx, cmap and OS/2)', () => {
  it('reads the design units, the hhea vertical metrics and the advance of a mapped character', () => {
    const m = parseFontMetrics(font({ unitsPerEm: 2048, ascender: 1705, descender: -615, lineGap: 7 }));
    expect(m.unitsPerEm).toBe(2048);
    expect(m.ascent).toBe(1705);
    expect(m.descent).toBe(615);
    expect(m.lineGap).toBe(7);
    expect(m.glyphCount).toBe(4);
    expect([m.advance(65), m.advance(66), m.advance(67)]).toEqual([600, 700, 800]);
    expect(m.notdefAdvance).toBe(500);
  });

  it('answers undefined for an unmapped character, one mapped to glyph 0, and one mapped past the glyph count', () => {
    const m = parseFontMetrics(font({ cmap: cmapFormat4({ 65: 1, 66: 0, 67: 9 }) }));
    expect(m.advance(65)).toBe(600);
    expect(m.advance(66)).toBeUndefined();
    expect(m.advance(67)).toBeUndefined();
    expect(m.advance(68)).toBeUndefined();
    expect(m.advance(0x1f600)).toBeUndefined();
    expect(m.advance(-1)).toBeUndefined();
    expect(m.advance(Number.NaN)).toBeUndefined();
  });

  it('numberOfHMetrics below the glyph count: the trailing glyphs reuse the last advance (Courier Std has 1 for 382 glyphs)', () => {
    const m = parseFontMetrics(syntheticFont({ advances: [600], trailingGlyphs: 5, cmap: cmapFormat4({ 65: 3, 66: 5 }) }));
    expect(m.glyphCount).toBe(6);
    expect(m.advance(65)).toBe(600);
    expect(m.advance(66)).toBe(600);
    expect(m.notdefAdvance).toBe(600);
  });

  it('reads cmap format 12 (a code point above U+FFFF, and a long range)', () => {
    const cmap = cmapFormat12([
      { start: 0x41, end: 0x43, gid: 1 },
      { start: 0x1f600, end: 0x1f601, gid: 3 },
    ]);
    const m = parseFontMetrics(syntheticFont({ advances: ADVANCES, cmap, cmapPlatform: 3, cmapEncoding: 10 }));
    expect(m.advance(0x41)).toBe(600);
    expect(m.advance(0x43)).toBe(800);
    expect(m.advance(0x44)).toBeUndefined();
    expect(m.advance(0x1f600)).toBe(800);
    expect(m.advance(0x1f601)).toBeUndefined(); // gid 4 is past the 4 glyphs
    expect(m.advance(0x1f602)).toBeUndefined();
  });

  it('prefers a full-repertoire format 12 subtable over a BMP format 4 one, whatever their order', () => {
    const bmp = { platform: 3, encoding: 1, subtable: cmapFormat4({ 65: 1 }) };
    const full = { platform: 3, encoding: 10, subtable: cmapFormat12([{ start: 65, end: 65, gid: 2 }]) };
    for (const records of [[bmp, full], [full, bmp]]) {
      const bytes = assembleSfnt([
        { tag: 'head', bytes: headTable() },
        { tag: 'hhea', bytes: hheaTable({ numberOfHMetrics: 4 }) },
        { tag: 'maxp', bytes: maxpTable(4) },
        { tag: 'hmtx', bytes: hmtxTable(ADVANCES) },
        { tag: 'cmap', bytes: cmapTable(records) },
      ]);
      expect(parseFontMetrics(bytes).advance(65)).toBe(700);
    }
  });

  it('follows idRangeOffset into the glyph id array, adding idDelta to a non-zero entry', () => {
    const m = parseFontMetrics(syntheticFont({ advances: ADVANCES, cmap: cmapFormat4Indirect(0x61, [3, 0, 1], 0) }));
    expect(m.advance(0x61)).toBe(800);
    expect(m.advance(0x62)).toBeUndefined();
    expect(m.advance(0x63)).toBe(600);
    const shifted = parseFontMetrics(syntheticFont({ advances: ADVANCES, cmap: cmapFormat4Indirect(0x61, [1, 2], 1) }));
    expect(shifted.advance(0x61)).toBe(700);
    expect(shifted.advance(0x62)).toBe(800);
  });

  it('skips a subtable with a format it does not read and uses the next usable one', () => {
    const odd = new Uint8Array(32);
    odd[1] = 6; // format 6
    const bytes = assembleSfnt([
      { tag: 'head', bytes: headTable() },
      { tag: 'hhea', bytes: hheaTable({ numberOfHMetrics: 4 }) },
      { tag: 'maxp', bytes: maxpTable(4) },
      { tag: 'hmtx', bytes: hmtxTable(ADVANCES) },
      { tag: 'cmap', bytes: cmapTable([{ platform: 3, encoding: 10, subtable: odd }, { platform: 3, encoding: 1, subtable: cmapFormat4(MAP) }]) },
    ]);
    expect(parseFontMetrics(bytes).advance(66)).toBe(700);
  });

  it('exposes the optional OS/2 weight class and the head macStyle bits, and tolerates their absence', () => {
    const m = parseFontMetrics(font({ weightClass: 700, macStyle: 3 }));
    expect(m.weightClass).toBe(700);
    expect(m.macBold).toBe(true);
    expect(m.macItalic).toBe(true);
    const plain = parseFontMetrics(font());
    expect(plain.weightClass).toBeUndefined();
    expect(plain.macBold).toBe(false);
    expect(plain.macItalic).toBe(false);
  });

  it('accepts OpenType-CFF (OTTO) and "true" headers, refuses a collection as unsupported and anything else as malformed', () => {
    const tables: TableSpec[] = [
      { tag: 'head', bytes: headTable() },
      { tag: 'hhea', bytes: hheaTable({ numberOfHMetrics: 4 }) },
      { tag: 'maxp', bytes: maxpTable(4) },
      { tag: 'hmtx', bytes: hmtxTable(ADVANCES) },
      { tag: 'cmap', bytes: cmapTable([{ platform: 3, encoding: 1, subtable: cmapFormat4(MAP) }]) },
    ];
    expect(parseFontMetrics(assembleSfnt(tables, { version: 0x4f54544f })).advance(65)).toBe(600);
    expect(parseFontMetrics(assembleSfnt(tables, { version: 0x74727565 })).advance(65)).toBe(600);
    expect(malformedOf(() => parseFontMetrics(assembleSfnt(tables, { version: 0x74746366 }))).code).toBe('UNSUPPORTED_FEATURE');
    expect(malformedOf(() => parseFontMetrics(assembleSfnt(tables, { version: 0x12345678 }))).code).toBe('MALFORMED');
  });

  it('is independent of the input buffer: a view with a byte offset parses, and a later change to the input changes nothing', () => {
    const bytes = font();
    const padded = new Uint8Array(bytes.length + 7);
    padded.set(bytes, 7);
    const m = parseFontMetrics(padded.subarray(7));
    expect(m.advance(65)).toBe(600);
    padded.fill(0);
    expect(m.advance(65)).toBe(600);
    expect(m.advance(67)).toBe(800);
  });
});

describe('parseFontMetrics: hostile font bytes give a typed error, never a RangeError (A3)', () => {
  const good = (): TableSpec[] => [
    { tag: 'head', bytes: headTable() },
    { tag: 'hhea', bytes: hheaTable({ numberOfHMetrics: 4 }) },
    { tag: 'maxp', bytes: maxpTable(4) },
    { tag: 'hmtx', bytes: hmtxTable(ADVANCES) },
    { tag: 'cmap', bytes: cmapTable([{ platform: 3, encoding: 1, subtable: cmapFormat4(MAP) }]) },
  ];
  const replace = (tag: string, change: Partial<TableSpec>): TableSpec[] => good().map((t) => (t.tag === tag ? { ...t, ...change } : t));
  const refused = (tables: TableSpec[], options = {}): XfaPdfError => malformedOf(() => parseFontMetrics(assembleSfnt(tables, options)));

  it('refuses input that is empty, shorter than a directory, or not bytes', () => {
    expect(malformedOf(() => parseFontMetrics(new Uint8Array(0))).code).toBe('MALFORMED');
    expect(malformedOf(() => parseFontMetrics(new Uint8Array(11))).code).toBe('MALFORMED');
    expect(malformedOf(() => parseFontMetrics('font' as unknown as Uint8Array)).code).toBe('MALFORMED');
  });

  it('refuses a truncated table directory and a table count that cannot fit', () => {
    const bytes = assembleSfnt(good());
    expect(malformedOf(() => parseFontMetrics(bytes.subarray(0, 12 + 16 * 2))).code).toBe('MALFORMED');
    expect(refused(good(), { claimedTables: 65_535 }).code).toBe('MALFORMED');
    expect(refused(good(), { claimedTables: 5_000 }).code).toBe('MALFORMED');
  });

  it('refuses a table whose offset or length runs past the end, or whose offset + length overflows', () => {
    expect(refused(replace('hmtx', { offset: 0x7fff_0000 })).code).toBe('MALFORMED');
    expect(refused(replace('hmtx', { length: 0x7fff_0000 })).code).toBe('MALFORMED');
    expect(refused(replace('cmap', { offset: 0xffff_fff0, length: 0x20 })).code).toBe('MALFORMED');
    expect(refused(replace('head', { length: 10 })).code).toBe('MALFORMED');
    expect(refused(replace('hhea', { length: 20 })).code).toBe('MALFORMED');
  });

  it('refuses a font missing a required table', () => {
    for (const tag of ['head', 'hhea', 'maxp', 'hmtx', 'cmap']) expect(refused(good().filter((t) => t.tag !== tag)).code).toBe('MALFORMED');
  });

  it('refuses design units that are not a valid em, and a font with no vertical extent', () => {
    for (const unitsPerEm of [0, 1, 15, 16_385, 65_535]) {
      expect(refused(replace('head', { bytes: headTable({ unitsPerEm }) })).code).toBe('MALFORMED');
    }
    expect(refused(replace('hhea', { bytes: hheaTable({ numberOfHMetrics: 4, ascender: 0, descender: 0, lineGap: 0 }) })).code).toBe('MALFORMED');
  });

  it('refuses a metric count the hmtx table cannot hold, zero metrics, and more metrics than glyphs', () => {
    expect(refused(replace('hhea', { bytes: hheaTable({ numberOfHMetrics: 65_535 }) })).code).toBe('MALFORMED');
    const huge = good().map((t) => (t.tag === 'hhea' ? { ...t, bytes: hheaTable({ numberOfHMetrics: 65_535 }) } : t.tag === 'maxp' ? { ...t, bytes: maxpTable(65_535) } : t));
    expect(refused(huge).code).toBe('MALFORMED');
    expect(refused(replace('hhea', { bytes: hheaTable({ numberOfHMetrics: 0 }) })).code).toBe('MALFORMED');
    expect(refused(replace('maxp', { bytes: maxpTable(2) })).code).toBe('MALFORMED');
    expect(refused(replace('maxp', { bytes: maxpTable(0) })).code).toBe('MALFORMED');
  });

  it('refuses a format 12 group count of 1e6 that the table cannot hold, and one above the group ceiling that it can', () => {
    const claimed = cmapFormat12([{ start: 65, end: 67, gid: 1 }], 1_000_000);
    expect(refused(replace('cmap', { bytes: cmapTable([{ platform: 3, encoding: 10, subtable: claimed }]) })).code).toBe('MALFORMED');
    const many = Array.from({ length: 65_537 }, (_, i) => ({ start: i * 2, end: i * 2, gid: 1 }));
    expect(refused(replace('cmap', { bytes: cmapTable([{ platform: 3, encoding: 10, subtable: cmapFormat12(many) }]) })).code).toBe('MALFORMED');
  });

  it('refuses format 12 groups that are unsorted, overlapping, inverted or beyond U+10FFFF', () => {
    for (const groups of [
      [{ start: 70, end: 71, gid: 1 }, { start: 65, end: 66, gid: 1 }],
      [{ start: 65, end: 70, gid: 1 }, { start: 70, end: 72, gid: 1 }],
      [{ start: 70, end: 65, gid: 1 }],
      [{ start: 65, end: 0xffff_ffff, gid: 1 }],
    ]) {
      expect(refused(replace('cmap', { bytes: cmapTable([{ platform: 3, encoding: 10, subtable: cmapFormat12(groups) }]) })).code).toBe('MALFORMED');
    }
  });

  it('refuses a format 4 segment count the subtable cannot hold, or an odd one', () => {
    const lie = (segCountX2: number): Uint8Array => {
      const sub = cmapFormat4(MAP).slice();
      new DataView(sub.buffer).setUint16(6, segCountX2);
      return sub;
    };
    for (const n of [0, 3, 0xfffe, 0x4000]) {
      expect(refused(replace('cmap', { bytes: cmapTable([{ platform: 3, encoding: 1, subtable: lie(n) }]) })).code).toBe('MALFORMED');
    }
  });

  it('refuses a cmap whose record offsets point outside the table or back into its own header (a loop)', () => {
    const sub = cmapFormat4(MAP);
    for (const offset of [0, 4, 8, 0x7fff_ffff, 0xffff_ffff]) {
      expect(refused(replace('cmap', { bytes: cmapTable([{ platform: 3, encoding: 1, subtable: sub, offset }]) })).code).toBe('MALFORMED');
    }
    const empty = cmapTable([]);
    expect(refused(replace('cmap', { bytes: empty })).code).toBe('MALFORMED');
    const noUnicode = cmapTable([{ platform: 1, encoding: 0, subtable: sub }]);
    expect(refused(replace('cmap', { bytes: noUnicode })).code).toBe('MALFORMED');
  });

  it('a hostile cmap that cannot be read for a lookup answers "unmapped" instead of throwing', () => {
    const indirect = cmapFormat4Indirect(0x61, [1, 2, 3]).slice();
    // Point idRangeOffset[0] far past the subtable.
    const n = 2;
    new DataView(indirect.buffer).setUint16(16 + n * 6, 0xfff0);
    const m = parseFontMetrics(syntheticFont({ advances: ADVANCES, cmap: indirect }));
    expect(m.advance(0x61)).toBeUndefined();
    expect(m.advance(0x62)).toBeUndefined();
  });

  it('refuses a 50 MB program at once, without scanning it: not one byte of it is read', () => {
    const spies = READS.map((method) => vi.spyOn(ByteView.prototype, method));
    try {
      const error = malformedOf(() => parseFontMetrics(new Uint8Array(50 * 1024 * 1024)));
      expect(error.code).toBe('MALFORMED');
      expect(spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0), 'reads of the program before the refusal').toBe(0);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    expect(50 * 1024 * 1024).toBeGreaterThan(MAX_FONT_BYTES);
  });

  it('survives 3000 random single- and multi-byte mutations of a valid font with only a font result or a typed error, each parse reading a bounded number of bytes', () => {
    const base = assembleSfnt([...good(), { tag: 'OS/2', bytes: new Uint8Array(78) }]);
    let seed = 0x2545f491;
    const next = (): number => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const spies = READS.map((method) => vi.spyOn(ByteView.prototype, method));
    const readsSoFar = (): number => spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0);
    let parsed = 0;
    let mostReads = 0;
    let total = 0;
    try {
      for (let round = 0; round < 3000; round++) {
        const bytes = base.slice();
        for (let k = 0; k < 1 + (round % 4); k++) bytes[next() % bytes.length] = next() & 0xff;
        const cut = round % 7 === 0 ? bytes.subarray(0, next() % bytes.length) : bytes;
        const before = readsSoFar();
        try {
          const m = parseFontMetrics(cut);
          parsed += 1;
          for (const cp of [0, 65, 66, 0xffff, 0x10ffff]) m.advance(cp);
        } catch (error) {
          expect(error).toBeInstanceOf(XfaPdfError);
        }
        const reads = readsSoFar() - before;
        mostReads = Math.max(mostReads, reads);
        total += reads;
      }
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
    console.info(`[sfnt] 3000 mutated parses: ${total} reads, at most ${mostReads} per parse, input ${base.length} bytes (measured)`);
    expect(parsed, 'some mutations survive, so the loop exercises lookups too').toBeGreaterThan(100);
    // Linear in the input: no mutation makes one parse read more than a small constant times the font's own length.
    expect(mostReads).toBeLessThanOrEqual(READS_PER_INPUT_BYTE * base.length);
  });
});
