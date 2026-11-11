import { z } from 'zod';
import { XfaPdfError } from '../../pdf/errors.js';
import type { PdfReader } from '../../pdf/reader.js';
import { latin1 } from '../../pdf/latin1.js';
import { safeText } from '../../pdf/safe-text.js';
import { isPdfName, isPdfStream, isPdfString, type PdfDict, type PdfStream, type PdfValue } from '../../pdf/types.js';
import { MAX_FONT_BYTES, MAX_FONT_RESOURCES } from '../limits.js';
import { MAX_DR_FONT_ENTRIES, MAX_FONT_NAME_CHARS, MAX_FONT_WIDTHS, MAX_TOTAL_FONT_BYTES } from './limits.js';

const name = z.string().min(1).max(MAX_FONT_NAME_CHARS);
const fontUnit = z.number().finite().min(-100_000).max(100_000);

// Each optional value is checked on its own: a wrong one is dropped (the font stays usable), never an error for the document.
const flagsSchema = z.number().int().min(0).max(0xffff_ffff);
const weightSchema = z.number().finite().min(0).max(2_000);
const angleSchema = z.number().finite().min(-360).max(360);
const firstCharSchema = z.number().int().min(0).max(255);
const widthsSchema = z.array(fontUnit).max(MAX_FONT_WIDTHS);

/**
 * One font program embedded in the form's default resources (`/AcroForm /DR /Font`), with the descriptor facts that say
 * which typeface it is. Built only from validated values: every string is length-capped, every number is finite.
 * `program.length === 0` means the font was listed but its program could not be used (missing stream, undecodable, over the
 * per-program ceiling, over the reader budget): `loadFonts` reports it as `font.program.<resourceName>`.
 */
const embeddedFontSchema = z.strictObject({
  /** Stable per embedded program: the resource name is unique within the dictionary and the same on every call. */
  fontId: name,
  /** The key in the `/DR /Font` dictionary (cut to the name ceiling). */
  resourceName: name,
  baseFont: name,
  /** `/FontDescriptor /Flags` (0 when absent or invalid). */
  flags: flagsSchema,
  fontFamily: name.optional(),
  fontWeight: weightSchema.optional(),
  italicAngle: angleSchema.optional(),
  ascent: fontUnit.optional(),
  descent: fontUnit.optional(),
  firstChar: firstCharSchema.optional(),
  /** `/Widths`, in thousandths of an em, indexed from `firstChar`. A cross-check only: `hmtx` is the measure. */
  widths: widthsSchema.optional(),
  program: z.custom<Uint8Array>((value) => value instanceof Uint8Array, { error: 'program must be a Uint8Array' }),
  programKind: z.enum(['opentype', 'truetype']),
});

export type EmbeddedFont = z.infer<typeof embeddedFontSchema>;

/** The reference-following the caller (`xfa-pdf.ts`) already has, with its hop bound: handed in so there is one implementation. */
export interface PdfWalker {
  value(v: PdfValue | undefined): Promise<PdfValue | PdfStream>;
  dict(v: PdfValue | undefined, what: string): Promise<PdfDict | undefined>;
}

/** A name or string as text and a number as itself; absent as `undefined`; any other shape as a marker no schema accepts. */
function scalar(v: PdfValue | PdfStream): unknown {
  if (v === null) return undefined;
  if (typeof v === 'number') return v;
  if (isPdfStream(v)) return { unsupported: true };
  if (isPdfName(v)) return v.value;
  if (isPdfString(v)) return latin1(v.bytes);
  return { unsupported: true };
}

/** The value if it satisfies `schema`, else `undefined`: a bad optional value is dropped, not an error. */
function valid<T>(schema: z.ZodType<T>, v: unknown): T | undefined {
  const parsed = schema.safeParse(v);
  return parsed.success ? parsed.data : undefined;
}

function malformed(why: string): XfaPdfError {
  return new XfaPdfError('MALFORMED', `Embedded fonts: ${why}`);
}

interface ProgramRef {
  readonly stream: PdfStream;
  readonly kind: 'opentype' | 'truetype';
}

/** `/FontFile2` (TrueType) or `/FontFile3` with `/Subtype /OpenType`. Type 1 and bare CFF programs have no `hmtx` and are not measurable. */
async function programOf(walk: PdfWalker, descriptor: PdfDict, label: string): Promise<ProgramRef | undefined> {
  const truetype = await walk.value(descriptor.get('FontFile2'));
  if (isPdfStream(truetype)) return { stream: truetype, kind: 'truetype' };
  if (truetype !== null) throw malformed(`${label} /FontFile2 is not a stream`);
  const open = await walk.value(descriptor.get('FontFile3'));
  if (open === null) return undefined;
  if (!isPdfStream(open)) throw malformed(`${label} /FontFile3 is not a stream`);
  const subtype = open.dict.get('Subtype');
  return isPdfName(subtype) && subtype.value === 'OpenType' ? { stream: open, kind: 'opentype' } : undefined;
}

/** `/Widths` as an array of numbers, or `undefined` when absent, not an array, or holding anything else (a cross-check only). */
async function widthsOf(walk: PdfWalker, font: PdfDict): Promise<number[] | undefined> {
  const widths = await walk.value(font.get('Widths'));
  if (!Array.isArray(widths)) return undefined;
  return valid(widthsSchema, widths.map((w) => (typeof w === 'number' ? w : { unsupported: true })));
}

/** A font that is listed but whose program cannot be used; see `embeddedFontSchema`. */
function unreadable(resourceName: string): EmbeddedFont {
  const shown = resourceName.slice(0, MAX_FONT_NAME_CHARS);
  return { fontId: `font:${shown}`, resourceName: shown, baseFont: shown, flags: 0, program: new Uint8Array(0), programKind: 'truetype' };
}

/** A font entry known to carry a program the engine can measure, before the program is read. */
interface Located {
  readonly font: PdfDict;
  readonly descriptor: PdfDict;
  readonly program: ProgramRef;
  readonly label: string;
}

/**
 * Finds out whether a font entry carries a measurable program, WITHOUT decoding it. `undefined` when it carries none (a
 * standard-14 name, a Type 1 or bare CFF program, no descriptor). Throws on a malformed font or descriptor.
 */
async function locate(walk: PdfWalker, resourceName: string, entry: PdfValue): Promise<Located | undefined> {
  const label = `font ${safeText(resourceName)}`;
  const font = await walk.dict(entry, label);
  const descriptor = font === undefined ? undefined : await walk.dict(font.get('FontDescriptor'), `${label} /FontDescriptor`);
  if (font === undefined || descriptor === undefined) return undefined;
  const program = await programOf(walk, descriptor, label);
  return program === undefined ? undefined : { font, descriptor, program, label };
}

/** Reads the program and the descriptor facts of a located font. Throws on a malformed or oversize program. */
async function readFont(reader: PdfReader, walk: PdfWalker, resourceName: string, located: Located): Promise<EmbeddedFont> {
  const { font, descriptor, program, label } = located;
  if (program.stream.raw.length > MAX_FONT_BYTES) throw malformed(`${label} program exceeds ${MAX_FONT_BYTES} bytes`);
  const bytes = await reader.decodedStream(program.stream);
  if (bytes.length === 0 || bytes.length > MAX_FONT_BYTES) throw malformed(`${label} program is empty or exceeds ${MAX_FONT_BYTES} bytes`);
  const read = async (source: PdfDict, key: string): Promise<unknown> => scalar(await walk.value(source.get(key)));
  const shown = resourceName.slice(0, MAX_FONT_NAME_CHARS);
  return {
    fontId: `font:${shown}`,
    resourceName: shown,
    baseFont: valid(name, await read(font, 'BaseFont')) ?? shown,
    flags: valid(flagsSchema, await read(descriptor, 'Flags')) ?? 0,
    fontFamily: valid(name, await read(descriptor, 'FontFamily')),
    fontWeight: valid(weightSchema, await read(descriptor, 'FontWeight')),
    italicAngle: valid(angleSchema, await read(descriptor, 'ItalicAngle')),
    ascent: valid(fontUnit, await read(descriptor, 'Ascent')),
    descent: valid(fontUnit, await read(descriptor, 'Descent')),
    firstChar: valid(firstCharSchema, await read(font, 'FirstChar')),
    widths: await widthsOf(walk, font),
    program: bytes,
    programKind: program.kind,
  };
}

/** What `readEmbeddedFonts` found: the listed programs, and the `issues` for what was left out (see `readEmbeddedFonts`). */
export interface EmbeddedFonts {
  readonly fonts: readonly EmbeddedFont[];
  /** Layout `issues` features for entries or fonts beyond the ceilings: those were not read. Empty for every real form. */
  readonly issues: readonly string[];
}

const NONE: EmbeddedFonts = { fonts: [], issues: [] };

/**
 * Walks `/AcroForm /DR /Font` and returns the embedded sfnt programs. Reads sequentially through the shared reader, so
 * decryption and the decode budget apply exactly as for the XFA packets. A font with no program (a standard-14 name, a Type 1
 * or bare CFF program) is skipped. One bad font never disables the others: a font whose dictionary, descriptor or program is
 * malformed is listed with an empty program (see `embeddedFontSchema`), and a wrong optional value (widths, weight, angle,
 * family, flags) is dropped. Too many entries in `/Font` (`MAX_DR_FONT_ENTRIES`) or too many embedded fonts
 * (`MAX_FONT_RESOURCES`) lists the first of them and reports the rest in `issues`, so a form with many fonts still opens.
 * Only document-level structure is a `MALFORMED` error: a `/DR` or `/Font` that is not a dictionary, or programs over the
 * total ceiling.
 */
export async function readEmbeddedFonts(reader: PdfReader, acroForm: PdfDict | undefined, walk: PdfWalker): Promise<EmbeddedFonts> {
  const resources = await walk.dict(acroForm?.get('DR'), '/AcroForm /DR');
  const table = await walk.dict(resources?.get('Font'), '/DR /Font');
  if (table === undefined) return NONE;
  const fonts: EmbeddedFont[] = [];
  const issues: string[] = [];
  let total = 0;
  let visited = 0;
  try {
    for (const [resourceName, entry] of table) {
      if (visited >= MAX_DR_FONT_ENTRIES) {
        issues.push(`font.resources: ${table.size} entries in /DR /Font (the first ${MAX_DR_FONT_ENTRIES} are read)`);
        break;
      }
      visited += 1;
      // A font that cannot even be located is still listed (unreadable), so it counts; an entry with no program does not.
      let located: Located | undefined;
      let broken = false;
      try {
        located = await locate(walk, resourceName, entry);
      } catch (error) {
        if (!(error instanceof XfaPdfError)) throw error;
        broken = true;
      }
      if (located === undefined && !broken) continue;
      if (fonts.length >= MAX_FONT_RESOURCES) {
        issues.push(`font.resources: more than ${MAX_FONT_RESOURCES} embedded fonts (the first ${MAX_FONT_RESOURCES} are listed)`);
        break;
      }
      let font: EmbeddedFont;
      try {
        font = located === undefined ? unreadable(resourceName) : await readFont(reader, walk, resourceName, located);
      } catch (error) {
        if (!(error instanceof XfaPdfError)) throw error;
        font = unreadable(resourceName);
      }
      total += font.program.length;
      if (total > MAX_TOTAL_FONT_BYTES) throw malformed(`embedded programs exceed ${MAX_TOTAL_FONT_BYTES} bytes in total`);
      const parsed = embeddedFontSchema.safeParse(font);
      fonts.push(parsed.success ? parsed.data : unreadable(resourceName));
    }
  } finally {
    // The result keeps the programs; the reader's cache of every other object it resolved is not kept alive.
    reader.releaseCache();
  }
  return { fonts, issues };
}
