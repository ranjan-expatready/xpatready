import { describe, expect, it, vi } from 'vitest';
import { expectMalformed } from '../../../pdf/__tests__/expect-malformed.js';
import { DecodeBudget } from '../../../pdf/filters.js';
import { PdfReader } from '../../../pdf/reader.js';
import { openXfaPdf, openXfaPdfInternal } from '../../../xfa-pdf.js';
import { MAX_FONT_BYTES, MAX_FONT_RESOURCES } from '../../limits.js';
import { loadFonts } from '../catalogue.js';
import type { EmbeddedFont } from '../embedded.js';
import { MAX_DR_FONT_ENTRIES, MAX_FONT_WIDTHS } from '../limits.js';
import { cmapFormat4, syntheticFont } from './build-sfnt.js';
import { buildFontPdf, type FontSpec } from './build-font-pdf.js';

const bytesOf = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('XfaPdf.fonts(): the embedded font programs of /AcroForm /DR /Font', () => {
  it('returns every embedded program with the descriptor facts the resolver needs, in dictionary order', async () => {
    const pdf = await openXfaPdf(
      buildFontPdf({
        fonts: [
          { name: 'Alpha', file: 'FontFile2', program: bytesOf(1, 2, 3) },
          { name: 'Beta', file: 'FontFile3', fileSubtype: 'OpenType', program: bytesOf(4, 5), compress: true },
        ],
      }),
    );
    const { fonts } = await pdf.fonts();
    expect(fonts.map((f) => f.resourceName)).toEqual(['Alpha', 'Beta']);
    expect(fonts.map((f) => f.programKind)).toEqual(['truetype', 'opentype']);
    expect([...(fonts[0]?.program ?? [])]).toEqual([1, 2, 3]);
    expect([...(fonts[1]?.program ?? [])]).toEqual([4, 5]);
    expect(fonts[0]).toMatchObject({
      fontId: 'font:Alpha',
      baseFont: 'Alpha',
      flags: 34,
      fontFamily: 'Test Family',
      fontWeight: 700,
      italicAngle: -11,
      ascent: 750,
      descent: -250,
      firstChar: 32,
      widths: [600, 612, 0, 500],
    });
  });

  it('follows an indirect /DR, /Font dictionary and /Widths array', async () => {
    const pdf = await openXfaPdf(buildFontPdf({ indirect: true, fonts: [{ name: 'Alpha', widthsIndirect: true }] }));
    const [font] = (await pdf.fonts()).fonts;
    expect(font?.widths).toEqual([600, 612, 0, 500]);
  });

  it('skips a font that carries no program the engine can measure (no descriptor, Type 1, bare CFF) without an error', async () => {
    const pdf = await openXfaPdf(
      buildFontPdf({
        fonts: [
          { name: 'Helv', descriptor: null, file: 'none', fontExtra: '/Type/Font/Subtype/Type1/BaseFont/Helvetica' },
          { name: 'T1', file: 'FontFile' },
          { name: 'Cff', file: 'FontFile3', fileSubtype: 'Type1C' },
          { name: 'NoFile', file: 'none' },
          { name: 'Kept', file: 'FontFile2' },
        ],
      }),
    );
    expect((await pdf.fonts()).fonts.map((f) => f.resourceName)).toEqual(['Kept']);
  });

  it('answers an empty list when the form has no default resources, or none for fonts', async () => {
    expect(await (await openXfaPdf(buildFontPdf({ fonts: [], rawDr: '' }))).fonts()).toEqual({ fonts: [], issues: [] });
    expect(await (await openXfaPdf(buildFontPdf({ fonts: [], rawDr: '<</XObject<<>>>>' }))).fonts()).toEqual({ fonts: [], issues: [] });
    expect(await (await openXfaPdf(buildFontPdf({ fonts: [] }))).fonts()).toEqual({ fonts: [], issues: [] });
  });

  it('reads the program once: a second call returns the same list and costs no more of the reader budget', async () => {
    const program = new Uint8Array(1000);
    const bytes = buildFontPdf({ fonts: [{ name: 'Alpha', program }] });
    const budget = new DecodeBudget(100_000);
    const pdf = await openXfaPdfInternal(bytes, { budget });
    const first = await pdf.fonts();
    const remaining = budget.remainingBytes;
    expect(await pdf.fonts()).toBe(first);
    expect(budget.remainingBytes).toBe(remaining);
  });

  it('charges the programs to the reader budget: a budget too small for one leaves that font unreadable (empty program), not the call failed', async () => {
    const bytes = buildFontPdf({ fonts: [{ name: 'Alpha', program: new Uint8Array(150_000) }] });
    const pdf = await openXfaPdfInternal(bytes, { budget: new DecodeBudget(120_000) });
    const [degraded] = (await pdf.fonts()).fonts;
    expect(degraded?.resourceName).toBe('Alpha');
    expect(degraded?.program.length).toBe(0);
    expect((await (await openXfaPdf(bytes)).fonts()).fonts[0]?.program.length).toBe(150_000);
  });
});

describe('XfaPdf.fonts(): one bad font or one bad optional value never disables the document fonts (F3)', () => {
  const fontsOf = async (fonts: FontSpec[], extra: { rawDr?: string; extraObjects?: readonly (readonly [number, string])[] } = {}) =>
    (await (await openXfaPdf(buildFontPdf({ fonts, ...extra }))).fonts()).fonts;
  const good: FontSpec = { name: 'Good', program: bytesOf(9, 9, 9) };
  const desc = (extra: string): string => `/Type/FontDescriptor${extra}`;
  const unreadable = (font: { resourceName: string; program: Uint8Array } | undefined, name: string): void => {
    expect(font?.resourceName).toBe(name);
    expect(font?.program.length, `${name}: an unreadable program is listed with an empty one, so the catalogue raises font.program.${name}`).toBe(0);
  };

  it('drops an optional descriptor value that is wrong or out of range and keeps the font', async () => {
    const cases: [string, keyof EmbeddedFont][] = [
      ['/Flags 34/FontWeight(heavy)', 'fontWeight'],
      ['/Flags 34/FontWeight 99999', 'fontWeight'],
      ['/Flags 34/ItalicAngle 99999', 'italicAngle'],
      ['/Flags 34/ItalicAngle /up', 'italicAngle'],
      [`/Flags 34/FontFamily(${'x'.repeat(300)})`, 'fontFamily'],
      ['/Flags 34/Ascent(tall)', 'ascent'],
    ];
    for (const [extra, key] of cases) {
      const [font, other] = await fontsOf([{ name: 'A', descriptor: desc(extra) }, good]);
      expect(font?.resourceName).toBe('A');
      expect(font?.[key], extra).toBeUndefined();
      expect(font?.program.length).toBe(4);
      expect(other?.resourceName, 'the next font is still listed').toBe('Good');
    }
  });

  it('reads Flags as 0 when it is missing, fractional or negative, and a long or absent base font name as the resource name', async () => {
    for (const flags of ['', '/Flags 1.5', '/Flags -1', '/Flags(x)']) {
      expect((await fontsOf([{ name: 'A', descriptor: desc(flags) }]))[0]?.flags, flags).toBe(0);
    }
    const [long] = await fontsOf([{ name: 'A', fontExtra: `/Type/Font/Subtype/TrueType/BaseFont/${'B'.repeat(300)}` }]);
    expect(long?.baseFont).toBe('A');
  });

  it('drops a /Widths array that is too long, not an array, or holds a non-number, and keeps the font and its other values', async () => {
    const long = `[${'500 '.repeat(MAX_FONT_WIDTHS + 1)}]`;
    for (const widths of [long, '[500 /x 500]', '5', '(w)']) {
      const [font] = await fontsOf([{ name: 'A', fontExtra: `/Type/Font/Subtype/TrueType/BaseFont/A/FirstChar 32/Widths ${widths}` }]);
      expect(font?.widths, widths).toBeUndefined();
      expect(font?.firstChar).toBe(32);
      expect(font?.fontWeight).toBe(700);
    }
  });

  it('lists a font whose program cannot be used with an empty program, and still lists the others', async () => {
    unreadable((await fontsOf([{ name: 'A', fileValue: '7' }, good]))[0], 'A');
    unreadable((await fontsOf([{ name: 'A', fileValue: '(not a stream)' }, good]))[0], 'A');
    unreadable((await fontsOf([{ name: 'A', fileValue: '61 0 R' }, good], { extraObjects: [[61, '<</Length 3/Filter/DCTDecode>>\nstream\nabc\nendstream']] }))[0], 'A');
    unreadable((await fontsOf([{ name: 'A', fontExtra: '/Type/Font/Subtype/TrueType/BaseFont/A/FontDescriptor 7', descriptor: null, file: 'none' }, good]))[0], 'A');
    const withGood = await fontsOf([{ name: 'A', fileValue: '7' }, good]);
    expect(withGood.map((f) => f.resourceName)).toEqual(['A', 'Good']);
    expect(withGood[1]?.program.length).toBe(3);
  });

  it('a font entry that is not a dictionary, or loops, is listed unreadable and the rest survive', async () => {
    const [a, b] = await fontsOf([], { rawDr: '<</Font<</F1 7/F2 50 0 R>>>>', extraObjects: [[50, '50 0 R']] });
    unreadable(a, 'F1');
    unreadable(b, 'F2');
  });

  it('a program over the per-program ceiling is listed unreadable without failing the call, and no more than the ceiling (plus the byte that proves it) is decoded', async () => {
    const budget = new DecodeBudget();
    const bytes = buildFontPdf({ fonts: [{ name: 'Big', program: new Uint8Array(MAX_FONT_BYTES + 1), compress: true }, good] });
    const pdf = await openXfaPdfInternal(bytes, { budget });
    const opened = budget.remainingBytes;
    const [big, ok] = (await pdf.fonts()).fonts;
    unreadable(big, 'Big');
    expect(ok?.program.length).toBe(3);
    // Bytes decoded, not seconds: the budget is charged for what the reader materialised.
    expect(opened - budget.remainingBytes).toBeLessThanOrEqual(MAX_FONT_BYTES + 1 + 64 * 1024); // the decoded program, plus the compressed stream and the parsed objects
  });

  it('a resource name over the name ceiling is listed under a truncated name', async () => {
    const [font] = await fontsOf([{ name: 'N'.repeat(300) }]);
    expect(font?.resourceName).toHaveLength(256);
    expect(font?.fontId.length).toBeLessThanOrEqual(261);
  });

  it('through the catalogue, an unreadable font raises font.program.<name> and the others load', async () => {
    const fonts = await fontsOf([{ name: 'A', fileValue: '7' }, { name: 'B', program: syntheticFont({ advances: [500, 600], cmap: cmapFormat4({ 65: 1 }) }) }]);
    const { faces, issues } = loadFonts(fonts);
    expect(faces.map((f) => f.fontId)).toEqual(['font:B']);
    expect(issues).toEqual(['font.program.A']);
  });
});

describe('XfaPdf.fonts(): hostile document structure is a typed MALFORMED error, or a short list with an issue (A3)', () => {
  const fontsOf = async (fonts: FontSpec[], extra: { rawDr?: string; extraObjects?: readonly (readonly [number, string])[] } = {}) =>
    (await (await openXfaPdf(buildFontPdf({ fonts, ...extra }))).fonts()).fonts;
  const good: FontSpec = { name: 'Good', program: bytesOf(9, 9, 9) };

  it('a /DR that is not a dictionary, or a /Font that is not a dictionary', async () => {
    await expectMalformed(fontsOf([], { rawDr: '5' }));
    await expectMalformed(fontsOf([], { rawDr: '<</Font 5>>' }));
  });

  it('a self-referencing /DR or /Font object stops at the hop bound', async () => {
    await expectMalformed(fontsOf([], { rawDr: '50 0 R', extraObjects: [[50, '50 0 R']] }));
    await expectMalformed(fontsOf([], { rawDr: '<</Font 50 0 R>>', extraObjects: [[50, '51 0 R'], [51, '50 0 R']] }));
  });

  it('more default-resource entries than the ceiling: the first MAX_DR_FONT_ENTRIES are read (and no more), the call still answers, and an issue says the rest were left out', async () => {
    const entries = Array.from({ length: MAX_DR_FONT_ENTRIES * 3 }, (_, i) => `/F${i} 50 0 R`).join('');
    const pdf = await openXfaPdf(buildFontPdf({ fonts: [], rawDr: `<</Font<<${entries}>>>>`, extraObjects: [[50, '<</Type/Font>>']] }));
    const resolve = vi.spyOn(PdfReader.prototype, 'resolve');
    try {
      expect((await pdf.fonts()).fonts).toEqual([]);
      // One resolve per entry read (plus the /DR and /Font dictionaries): bounded by the ceiling, not by what the file declares.
      expect(resolve.mock.calls.length).toBeLessThanOrEqual(MAX_DR_FONT_ENTRIES + 4);
    } finally {
      resolve.mockRestore();
    }
    expect((await pdf.fonts()).issues).toEqual([`font.resources: ${MAX_DR_FONT_ENTRIES * 3} entries in /DR /Font (the first ${MAX_DR_FONT_ENTRIES} are read)`]);
  });

  it('more embedded fonts than a render tree may hold: the first MAX_FONT_RESOURCES are listed, only those programs are decoded, and an issue says so', async () => {
    const names = Array.from({ length: MAX_FONT_RESOURCES + 3 }, (_, i) => `F${i}`);
    const pdf = await openXfaPdf(buildFontPdf({ fonts: names.map((name) => ({ name, compress: true })) }));
    const decoded = vi.spyOn(PdfReader.prototype, 'decodedStream');
    try {
      const { fonts } = await pdf.fonts();
      expect(fonts.map((f) => f.resourceName)).toEqual(names.slice(0, MAX_FONT_RESOURCES));
      expect(decoded.mock.calls.length).toBeLessThanOrEqual(MAX_FONT_RESOURCES);
    } finally {
      decoded.mockRestore();
    }
    expect((await pdf.fonts()).issues).toEqual([`font.resources: more than ${MAX_FONT_RESOURCES} embedded fonts (the first ${MAX_FONT_RESOURCES} are listed)`]);
  });

  it('exactly MAX_FONT_RESOURCES program fonts followed by an entry with no program (a standard-14 /Helv) raise no issue; a further program font does', async () => {
    const programs = Array.from({ length: MAX_FONT_RESOURCES }, (_, i) => ({ name: `F${i}` }));
    const helv: FontSpec = { name: 'Helv', fontExtra: '/Type/Font/Subtype/Type1/BaseFont/Helvetica', descriptor: null, file: 'none' };
    const exact = await (await openXfaPdf(buildFontPdf({ fonts: [...programs, helv] }))).fonts();
    expect(exact.fonts).toHaveLength(MAX_FONT_RESOURCES);
    expect(exact.issues).toEqual([]);
    const over = await (await openXfaPdf(buildFontPdf({ fonts: [...programs, helv, { name: 'Extra' }] }))).fonts();
    expect(over.fonts).toHaveLength(MAX_FONT_RESOURCES);
    expect(over.issues).toEqual([`font.resources: more than ${MAX_FONT_RESOURCES} embedded fonts (the first ${MAX_FONT_RESOURCES} are listed)`]);
  });

  it('a form within the ceilings raises no font issue', async () => {
    expect((await (await openXfaPdf(buildFontPdf({ fonts: [good] }))).fonts()).issues).toEqual([]);
  });

  it('programs whose total passes the total ceiling are refused though each is under the per-program one, at the program that crosses it', async () => {
    const each = new Uint8Array(MAX_FONT_BYTES - 1024);
    const pdf = await openXfaPdf(buildFontPdf({ fonts: Array.from({ length: 5 }, (_, i) => ({ name: `F${i}`, program: each, compress: true })) }));
    const decoded = vi.spyOn(PdfReader.prototype, 'decodedStream');
    try {
      await expectMalformed(pdf.fonts());
      // Four programs fit (4 x 16 MB - 4 KB); the fifth crosses 64 MB and the walk stops there: five decodes, not one per declared font.
      expect(decoded.mock.calls.length).toBe(5);
    } finally {
      decoded.mockRestore();
    }
  });

  it('a MALFORMED verdict is remembered (it is a fact of the document): the second call replays it without reading again', async () => {
    const each = new Uint8Array(MAX_FONT_BYTES - 1024);
    const refused = await openXfaPdf(buildFontPdf({ fonts: Array.from({ length: 5 }, (_, i) => ({ name: `F${i}`, program: each, compress: true })) }));
    const decoded = vi.spyOn(PdfReader.prototype, 'decodedStream');
    try {
      await expectMalformed(refused.fonts());
      const afterFirst = decoded.mock.calls.length;
      await expectMalformed(refused.fonts());
      expect(decoded.mock.calls.length, 'no second decode: the rejection was kept').toBe(afterFirst);
    } finally {
      decoded.mockRestore();
    }
  });

  it('a failure that is not MALFORMED is not remembered: the next call reads again and can succeed; a read that stands is remembered', async () => {
    const pdf = await openXfaPdf(buildFontPdf({ fonts: [good] }));
    const decoded = vi.spyOn(PdfReader.prototype, 'decodedStream').mockRejectedValueOnce(new Error('interrupted'));
    try {
      await expect(pdf.fonts()).rejects.toThrow('interrupted');
      const fonts = await pdf.fonts();
      expect(fonts.fonts.map((f) => f.resourceName)).toEqual(['Good']);
      expect(await pdf.fonts()).toBe(fonts);
      expect(decoded.mock.calls.length, 'one failed decode, one good one, and none for the repeat call').toBe(2);
    } finally {
      decoded.mockRestore();
    }
  });

  it('a program key that names a missing object counts as no program', async () => {
    expect(await fontsOf([{ name: 'A', fileValue: '60 0 R' }])).toEqual([]);
  });
});
