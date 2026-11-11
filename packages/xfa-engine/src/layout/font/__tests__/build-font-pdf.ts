/** Builds a small XFA PDF whose AcroForm default resources hold the given fonts (test support for `XfaPdf.fonts()`). */
import { HEADER, PdfOut, writeObj, writeStreamObj, writeTail, writeXrefTable, zlib, type TableEntry } from '../../../__tests__/fixtures/build-pdf.js';

export interface FontSpec {
  /** The key in the `/DR /Font` dictionary. */
  readonly name: string;
  /** Extra entries of the font dictionary (default: a simple TrueType font with `/BaseFont /<name>`). */
  readonly fontExtra?: string;
  /** The complete descriptor dictionary body; `undefined` writes the standard one, `null` writes no descriptor. */
  readonly descriptor?: string | null;
  /** Which descriptor key holds the program. */
  readonly file?: 'FontFile' | 'FontFile2' | 'FontFile3' | 'none';
  /** `/Subtype` of the program stream (FontFile3 only). */
  readonly fileSubtype?: string;
  readonly program?: Uint8Array;
  readonly compress?: boolean;
  /** Write the descriptor key's value as this literal instead of a stream reference (hostile shapes). */
  readonly fileValue?: string;
  /** Write `/Widths` as an indirect object. */
  readonly widthsIndirect?: boolean;
}

export interface FontPdfOptions {
  readonly fonts: readonly FontSpec[];
  /** Replaces the whole `/DR` value (hostile shapes). */
  readonly rawDr?: string;
  /** Extra objects, written verbatim: `[number, body]`. */
  readonly extraObjects?: readonly (readonly [number, string])[];
  /** Write `/DR` and `/Font` as indirect objects, and each font entry as a reference. */
  readonly indirect?: boolean;
}

const FIRST_FONT_OBJ = 100;
const OBJECTS_PER_FONT = 5;

export function buildFontPdf(o: FontPdfOptions): Uint8Array {
  const out = new PdfOut();
  out.push(HEADER);
  const entries: TableEntry[] = [{ num: 0, free: true }];
  const add = (num: number, offset: number): void => void entries.push({ num, offset });
  const entry = (name: string, ref: string): string => `/${name} ${ref}`;

  const fontRefs: string[] = [];
  o.fonts.forEach((f, i) => {
    const base = FIRST_FONT_OBJ + i * OBJECTS_PER_FONT;
    const fontNum = base;
    const descNum = base + 1;
    const fileNum = base + 2;
    const widthsNum = base + 3;
    fontRefs.push(entry(f.name, `${fontNum} 0 R`));
    const widths = '[600 612.0 0.0 500]';
    const fontBody = f.fontExtra ?? `/Type/Font/Subtype/TrueType/BaseFont/${f.name}/FirstChar 32/LastChar 35/Widths ${f.widthsIndirect === true ? `${widthsNum} 0 R` : widths}`;
    const withDescriptor = f.descriptor !== null;
    add(fontNum, writeObj(out, fontNum, `<<${fontBody}${withDescriptor ? `/FontDescriptor ${descNum} 0 R` : ''}>>`));
    if (f.widthsIndirect === true) add(widthsNum, writeObj(out, widthsNum, widths));
    const file = f.file ?? 'FontFile2';
    if (withDescriptor) {
      const fileEntry = file === 'none' ? '' : `/${file} ${f.fileValue ?? `${fileNum} 0 R`}`;
      const body = f.descriptor ?? `/Type/FontDescriptor/FontName/${f.name}/FontFamily(Test Family)/Flags 34/FontWeight 700/ItalicAngle -11/Ascent 750/Descent -250`;
      add(descNum, writeObj(out, descNum, `<<${body}${fileEntry}>>`));
    }
    if (file !== 'none' && f.fileValue === undefined && withDescriptor) {
      const data = f.program ?? new Uint8Array([1, 2, 3, 4]);
      const compress = f.compress === true;
      const subtype = f.fileSubtype === undefined ? '' : `/Subtype/${f.fileSubtype}`;
      add(fileNum, writeStreamObj(out, fileNum, `${subtype}${compress ? '/Filter/FlateDecode' : ''}`, compress ? zlib(data) : data));
    }
  });

  const fontDict = `<<${fontRefs.join('')}>>`;
  const dr = o.rawDr ?? (o.indirect === true ? '10 0 R' : `<</Font ${fontDict}>>`);
  add(1, writeObj(out, 1, '<</Type/Catalog/Pages 2 0 R/AcroForm 3 0 R>>'));
  add(2, writeObj(out, 2, '<</Type/Pages/Kids[]/Count 0>>'));
  add(3, writeObj(out, 3, `<</Fields[]/XFA[(template) 4 0 R]${dr === '' ? '' : `/DR ${dr}`}>>`));
  add(4, writeStreamObj(out, 4, '', new Uint8Array([60, 47, 62])));
  if (o.indirect === true) {
    add(10, writeObj(out, 10, '<</Font 11 0 R>>'));
    add(11, writeObj(out, 11, fontDict));
  }
  for (const [num, body] of o.extraObjects ?? []) add(num, writeObj(out, num, body));
  const size = Math.max(...entries.map((e) => e.num)) + 1;
  const x = writeXrefTable(out, entries, `/Size ${size}/Root 1 0 R`);
  writeTail(out, x);
  return out.toBytes();
}
