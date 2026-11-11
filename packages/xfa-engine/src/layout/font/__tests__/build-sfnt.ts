/**
 * Builds small synthetic sfnt (TrueType / OpenType) font programs for tests. Each table builder is exported on its own,
 * so a hostile test can assemble a font whose one table (or one directory record) is wrong.
 */

export interface TableSpec {
  readonly tag: string;
  readonly bytes: Uint8Array;
  /** Replaces the directory record's offset / length (a lying record). */
  readonly offset?: number;
  readonly length?: number;
}

function writer(size: number): { bytes: Uint8Array; u16: (at: number, v: number) => void; i16: (at: number, v: number) => void; u32: (at: number, v: number) => void } {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  return {
    bytes,
    u16: (at, v) => view.setUint16(at, v),
    i16: (at, v) => view.setInt16(at, v),
    u32: (at, v) => view.setUint32(at, v),
  };
}

export interface HeadOptions {
  readonly unitsPerEm?: number;
  readonly macStyle?: number;
}

export function headTable(o: HeadOptions = {}): Uint8Array {
  const w = writer(54);
  w.u32(0, 0x00010000);
  w.u32(12, 0x5f0f3cf5);
  w.u16(18, o.unitsPerEm ?? 1000);
  w.u16(44, o.macStyle ?? 0);
  return w.bytes;
}

export interface HheaOptions {
  readonly ascender?: number;
  readonly descender?: number;
  readonly lineGap?: number;
  readonly numberOfHMetrics: number;
}

export function hheaTable(o: HheaOptions): Uint8Array {
  const w = writer(36);
  w.u32(0, 0x00010000);
  w.i16(4, o.ascender ?? 750);
  w.i16(6, o.descender ?? -250);
  w.i16(8, o.lineGap ?? 200);
  w.u16(34, o.numberOfHMetrics);
  return w.bytes;
}

export function maxpTable(numGlyphs: number): Uint8Array {
  const w = writer(6);
  w.u32(0, 0x00005000);
  w.u16(4, numGlyphs);
  return w.bytes;
}

/** `advances` are the long metrics; `trailingGlyphs` more glyphs carry only a left side bearing (they reuse the last advance). */
export function hmtxTable(advances: readonly number[], trailingGlyphs = 0): Uint8Array {
  const w = writer(advances.length * 4 + trailingGlyphs * 2);
  advances.forEach((advance, i) => {
    w.u16(i * 4, advance);
    w.i16(i * 4 + 2, 5);
  });
  return w.bytes;
}

export function os2Table(weightClass: number): Uint8Array {
  const w = writer(78);
  w.u16(0, 3);
  w.u16(4, weightClass);
  return w.bytes;
}

/** A format 4 subtable with one segment per mapped code point (simple, valid, and large enough to exercise the search). */
export function cmapFormat4(map: Readonly<Record<number, number>>): Uint8Array {
  const entries = Object.entries(map)
    .map(([cp, gid]) => [Number(cp), gid] as const)
    .sort((a, b) => a[0] - b[0]);
  const segs = [...entries.map(([cp, gid]) => ({ start: cp, end: cp, delta: (gid - cp) & 0xffff })), { start: 0xffff, end: 0xffff, delta: 1 }];
  const n = segs.length;
  const w = writer(16 + 8 * n);
  w.u16(0, 4);
  w.u16(2, 16 + 8 * n);
  w.u16(6, n * 2);
  segs.forEach((s, i) => {
    w.u16(14 + i * 2, s.end);
    w.u16(16 + n * 2 + i * 2, s.start);
    w.u16(16 + n * 4 + i * 2, s.delta);
  });
  return w.bytes;
}

/** A format 4 subtable that maps `start..start+glyphs.length-1` through `glyphIdArray` (idRangeOffset indirection). */
export function cmapFormat4Indirect(start: number, glyphs: readonly number[], idDelta = 0): Uint8Array {
  const n = 2;
  const w = writer(16 + 8 * n + glyphs.length * 2);
  w.u16(0, 4);
  w.u16(2, w.bytes.length);
  w.u16(6, n * 2);
  w.u16(14, start + glyphs.length - 1);
  w.u16(14 + 2, 0xffff);
  w.u16(16 + n * 2, start);
  w.u16(16 + n * 2 + 2, 0xffff);
  w.u16(16 + n * 4, idDelta);
  w.u16(16 + n * 4 + 2, 1);
  // idRangeOffset[0] points at glyphIdArray[0]: from its own address (16 + 6n) to the array start (16 + 8n) is 2n bytes.
  w.u16(16 + n * 6, n * 2);
  glyphs.forEach((g, i) => w.u16(16 + n * 8 + i * 2, g));
  return w.bytes;
}

export interface Group {
  readonly start: number;
  readonly end: number;
  readonly gid: number;
}

export function cmapFormat12(groups: readonly Group[], claimedGroups = groups.length): Uint8Array {
  const w = writer(16 + groups.length * 12);
  w.u16(0, 12);
  w.u32(4, w.bytes.length);
  w.u32(12, claimedGroups);
  groups.forEach((g, i) => {
    w.u32(16 + i * 12, g.start);
    w.u32(16 + i * 12 + 4, g.end);
    w.u32(16 + i * 12 + 8, g.gid);
  });
  return w.bytes;
}

export interface CmapRecord {
  readonly platform: number;
  readonly encoding: number;
  readonly subtable: Uint8Array;
  /** Replaces the record's offset (default: right after the records). */
  readonly offset?: number;
}

export function cmapTable(records: readonly CmapRecord[]): Uint8Array {
  const head = 4 + records.length * 8;
  let at = head;
  const placed = records.map((r) => {
    const offset = r.offset ?? at;
    at += r.subtable.length;
    return { r, offset };
  });
  const w = writer(at);
  w.u16(2, records.length);
  placed.forEach(({ r, offset }, i) => {
    w.u16(4 + i * 8, r.platform);
    w.u16(6 + i * 8, r.encoding);
    w.u32(8 + i * 8, offset);
  });
  let pos = head;
  for (const r of records) {
    w.bytes.set(r.subtable, pos);
    pos += r.subtable.length;
  }
  return w.bytes;
}

export interface AssembleOptions {
  /** Default 0x00010000 (TrueType outlines). */
  readonly version?: number;
  /** Replaces the directory's numTables. */
  readonly claimedTables?: number;
}

/** Writes the directory and the tables (4-byte aligned) into one program. */
export function assembleSfnt(tables: readonly TableSpec[], o: AssembleOptions = {}): Uint8Array {
  const dir = 12 + tables.length * 16;
  let at = dir;
  const placed = tables.map((t) => {
    const offset = at;
    at += Math.ceil(t.bytes.length / 4) * 4;
    return { t, offset };
  });
  const w = writer(at);
  w.u32(0, o.version ?? 0x00010000);
  w.u16(4, o.claimedTables ?? tables.length);
  placed.forEach(({ t, offset }, i) => {
    const rec = 12 + i * 16;
    for (let k = 0; k < 4; k++) w.bytes[rec + k] = t.tag.charCodeAt(k);
    w.u32(rec + 8, t.offset ?? offset);
    w.u32(rec + 12, t.length ?? t.bytes.length);
    w.bytes.set(t.bytes, offset);
  });
  return w.bytes;
}

export interface SyntheticFont {
  readonly unitsPerEm?: number;
  readonly ascender?: number;
  readonly descender?: number;
  readonly lineGap?: number;
  /** Advance of each glyph with a long metric; glyph 0 is `.notdef`. */
  readonly advances: readonly number[];
  /** Extra glyphs after the long metrics (they reuse the last advance). */
  readonly trailingGlyphs?: number;
  readonly cmap: Uint8Array;
  readonly cmapPlatform?: number;
  readonly cmapEncoding?: number;
  readonly weightClass?: number;
  readonly macStyle?: number;
}

/** A valid font: tables head, hhea, maxp, hmtx, cmap and (when `weightClass` is given) OS/2. */
export function syntheticFont(o: SyntheticFont): Uint8Array {
  const glyphs = o.advances.length + (o.trailingGlyphs ?? 0);
  const tables: TableSpec[] = [
    { tag: 'head', bytes: headTable({ ...(o.unitsPerEm === undefined ? {} : { unitsPerEm: o.unitsPerEm }), ...(o.macStyle === undefined ? {} : { macStyle: o.macStyle }) }) },
    {
      tag: 'hhea',
      bytes: hheaTable({
        numberOfHMetrics: o.advances.length,
        ...(o.ascender === undefined ? {} : { ascender: o.ascender }),
        ...(o.descender === undefined ? {} : { descender: o.descender }),
        ...(o.lineGap === undefined ? {} : { lineGap: o.lineGap }),
      }),
    },
    { tag: 'maxp', bytes: maxpTable(glyphs) },
    { tag: 'hmtx', bytes: hmtxTable(o.advances, o.trailingGlyphs ?? 0) },
    { tag: 'cmap', bytes: cmapTable([{ platform: o.cmapPlatform ?? 3, encoding: o.cmapEncoding ?? 1, subtable: o.cmap }]) },
  ];
  if (o.weightClass !== undefined) tables.push({ tag: 'OS/2', bytes: os2Table(o.weightClass) });
  return assembleSfnt(tables);
}
