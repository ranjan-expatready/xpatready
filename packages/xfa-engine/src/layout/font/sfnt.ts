import { z } from 'zod';
import { XfaPdfError } from '../../pdf/errors.js';
import { MAX_FONT_BYTES } from '../limits.js';
import { ByteView } from './bytes.js';
import { readCmap } from './cmap.js';
import { MAX_SFNT_TABLES, MAX_UNITS_PER_EM, MIN_UNITS_PER_EM } from './limits.js';

/**
 * What the layout needs of one font program, read once from its `head`, `hhea`, `maxp`, `hmtx`, `cmap` and (optional)
 * `OS/2` tables. Everything is in font design units; `measure` scales by `size / unitsPerEm`. The object owns its data
 * (nothing aliases the bytes it was parsed from) and is immutable, so it can be shared between calls and workers.
 */
export interface FontMetrics {
  readonly unitsPerEm: number;
  /** `hhea.ascender`: the distance from the baseline to the top of a line, above the baseline. */
  readonly ascent: number;
  /** `-hhea.descender`: the distance below the baseline, positive for a normal font. */
  readonly descent: number;
  /** `hhea.lineGap`: the extra leading between lines. */
  readonly lineGap: number;
  readonly glyphCount: number;
  /** Advance of glyph 0, which stands in for a character the font does not map. */
  readonly notdefAdvance: number;
  /** `OS/2.usWeightClass` when the table is present. */
  readonly weightClass: number | undefined;
  /** `head.macStyle` bit 0. */
  readonly macBold: boolean;
  /** `head.macStyle` bit 1. */
  readonly macItalic: boolean;
  /** Advance width of the character in design units, or `undefined` when the font does not map it. */
  advance(codePoint: number): number | undefined;
}

const fontBytesSchema = z
  .instanceof(Uint8Array, { error: 'Font program must be a Uint8Array' })
  .refine((bytes) => bytes.length >= 12, { error: 'Font program is shorter than an sfnt header' })
  .refine((bytes) => bytes.length <= MAX_FONT_BYTES, { error: `Font program exceeds ${MAX_FONT_BYTES} bytes` });

/** FD-38 exemption (correctness constant): the sfnt version tags of the OpenType specification (TrueType outlines, CFF outlines, Apple "true"), and the collection tag. */
const VERSION_TRUETYPE = 0x00010000;
const VERSION_CFF = 0x4f54544f;
const VERSION_APPLE = 0x74727565;
const VERSION_COLLECTION = 0x74746366;

/** FD-38 exemption (correctness constant): the byte length of the `head` table fixed by the OpenType specification; not a setting. */
const HEAD_MIN = 54;
/** FD-38 exemption (correctness constant): the byte length of the `hhea` table fixed by the OpenType specification; not a setting. */
const HHEA_MIN = 36;
/** FD-38 exemption (correctness constant): the shortest `maxp` table (version 0.5) that holds `numGlyphs`, fixed by the OpenType specification; not a setting. */
const MAXP_MIN = 6;
/** FD-38 exemption (correctness constant): the shortest `OS/2` table that holds `usWeightClass`, fixed by the OpenType specification; not a setting. */
const OS2_MIN = 6;
/** FD-38 exemption (correctness constant): the byte length of the sfnt offset table before the table records, fixed by the OpenType specification; not a setting. */
const DIRECTORY_HEADER = 12;
/** FD-38 exemption (correctness constant): the byte length of one table record in the sfnt directory, fixed by the OpenType specification; not a setting. */
const RECORD = 16;

function malformed(why: string): XfaPdfError {
  return new XfaPdfError('MALFORMED', `Font program: ${why}`);
}

interface TableRef {
  readonly offset: number;
  readonly length: number;
}

/** The directory: the first record of each tag, every record read inside the directory and none trusted until `slice`. */
function readDirectory(view: ByteView): Map<string, TableRef> {
  const version = view.u32(0);
  if (version === VERSION_COLLECTION) throw new XfaPdfError('UNSUPPORTED_FEATURE', 'Font program: font collections are not supported');
  if (version !== VERSION_TRUETYPE && version !== VERSION_CFF && version !== VERSION_APPLE) throw malformed('not an sfnt font (unknown version tag)');
  const count = view.u16(4);
  if (count === 0 || count > MAX_SFNT_TABLES) throw malformed(`${count} tables (expected 1 to ${MAX_SFNT_TABLES})`);
  if (!view.has(DIRECTORY_HEADER, count * RECORD)) throw malformed('table directory is truncated');
  const tables = new Map<string, TableRef>();
  for (let i = 0; i < count; i++) {
    const at = DIRECTORY_HEADER + i * RECORD;
    const tag = view.tag(at);
    if (!tables.has(tag)) tables.set(tag, { offset: view.u32(at + 8), length: view.u32(at + 12) });
  }
  return tables;
}

/** An independent copy of a required table, after its record has been checked against the font and `minimum` length. */
function required(view: ByteView, tables: Map<string, TableRef>, tag: string, minimum: number): Uint8Array {
  const ref = tables.get(tag);
  if (ref === undefined) throw malformed(`missing the ${tag} table`);
  if (ref.length < minimum) throw malformed(`the ${tag} table is shorter than ${minimum} bytes`);
  if (!view.has(ref.offset, ref.length)) throw malformed(`the ${tag} table lies outside the font`);
  return view.copy(ref.offset, ref.length);
}

/**
 * Parses a TrueType / OpenType program (an sfnt) into `FontMetrics`. Hostile bytes are expected: the program is capped at
 * `MAX_FONT_BYTES`, the directory at `MAX_SFNT_TABLES`, every offset and length is checked against the buffer before it is
 * used, and every failure is an `XfaPdfError` (`MALFORMED`; `UNSUPPORTED_FEATURE` for a font collection), never a
 * `RangeError`. CFF outlines are not parsed: advances come from `hmtx`, which an OpenType-CFF program carries too, and no
 * kerning table is read (Acrobat applies none; see PA-3).
 */
export function parseFontMetrics(program: Uint8Array): FontMetrics {
  const checked = fontBytesSchema.safeParse(program);
  if (!checked.success) throw malformed(checked.error.issues.map((i) => i.message).join('; '));
  const view = new ByteView(program);
  const tables = readDirectory(view);

  const head = new ByteView(required(view, tables, 'head', HEAD_MIN));
  const unitsPerEm = head.u16(18);
  if (unitsPerEm < MIN_UNITS_PER_EM || unitsPerEm > MAX_UNITS_PER_EM) throw malformed(`unitsPerEm ${unitsPerEm} is outside ${MIN_UNITS_PER_EM}..${MAX_UNITS_PER_EM}`);
  const macStyle = head.u16(44);

  const hhea = new ByteView(required(view, tables, 'hhea', HHEA_MIN));
  const ascent = hhea.i16(4);
  const descent = -hhea.i16(6);
  const lineGap = hhea.i16(8);
  const metricCount = hhea.u16(34);
  if (ascent + descent + lineGap <= 0) throw malformed('the font has no vertical extent');

  const glyphCount = new ByteView(required(view, tables, 'maxp', MAXP_MIN)).u16(4);
  if (glyphCount === 0) throw malformed('the font has no glyphs');
  if (metricCount === 0 || metricCount > glyphCount) throw malformed(`${metricCount} long metrics for ${glyphCount} glyphs`);

  const hmtx = new ByteView(required(view, tables, 'hmtx', metricCount * 4));
  const advances = new Uint16Array(metricCount);
  for (let i = 0; i < metricCount; i++) advances[i] = hmtx.u16(i * 4);
  const lookup = readCmap(required(view, tables, 'cmap', 4), glyphCount);

  const os2Ref = tables.get('OS/2');
  const weightClass = os2Ref !== undefined && os2Ref.length >= OS2_MIN && view.has(os2Ref.offset, os2Ref.length) ? view.u16(os2Ref.offset + 4) : undefined;
  // Glyphs past the last long metric reuse its advance.
  const advanceOf = (glyph: number): number => advances[Math.min(glyph, metricCount - 1)] ?? 0;

  return {
    unitsPerEm,
    ascent,
    descent,
    lineGap,
    glyphCount,
    notdefAdvance: advanceOf(0),
    weightClass,
    macBold: (macStyle & 1) !== 0,
    macItalic: (macStyle & 2) !== 0,
    advance(codePoint: number): number | undefined {
      const glyph = lookup(codePoint);
      return glyph === 0 ? undefined : advanceOf(glyph);
    },
  };
}
