import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../errors.js';
import { MAX_ISSUES } from '../../limits.js';
import { loadFonts } from '../catalogue.js';
import type { EmbeddedFont } from '../embedded.js';
import { createFontResolver, DEFAULT_TYPEFACE } from '../resolve.js';
import { cmapFormat4, syntheticFont } from './build-sfnt.js';

const program = (advance: number, extra: Partial<Parameters<typeof syntheticFont>[0]> = {}): Uint8Array =>
  syntheticFont({ advances: [advance, advance], cmap: cmapFormat4({ 65: 1 }), ...extra });

function embedded(resourceName: string, fields: Partial<EmbeddedFont> & { advance?: number } = {}): EmbeddedFont {
  const { advance, ...rest } = fields;
  return {
    fontId: `font:${resourceName}`,
    resourceName,
    baseFont: resourceName,
    flags: 32,
    program: program(advance ?? 500),
    programKind: 'opentype',
    ...rest,
  };
}

// The five Adobe programs plus Courier New, as the two real forms embed them (advance differs per program so a pick is visible).
const FONTS: EmbeddedFont[] = [
  embedded('CourierNewPSMT', { advance: 601, programKind: 'truetype', fontFamily: 'Courier New', fontWeight: 400, italicAngle: 0 }),
  embedded('CourierStd', { advance: 600, fontFamily: 'Courier Std', fontWeight: 500, italicAngle: 0 }),
  embedded('CourierStd-Bold', { advance: 602, fontFamily: 'Courier Std', fontWeight: 700, italicAngle: 0 }),
  embedded('MyriadPro-Bold', { advance: 701, fontFamily: 'Myriad Pro', fontWeight: 700, italicAngle: 0 }),
  embedded('MyriadPro-It', { advance: 702, fontFamily: 'Myriad Pro', fontWeight: 400, italicAngle: -11, flags: 96 }),
  embedded('MyriadPro-Regular', { advance: 700, fontFamily: 'Myriad Pro', fontWeight: 400, italicAngle: 0 }),
];

const advanceOf = (resolved: { metrics: { advance(cp: number): number | undefined } }): number | undefined => resolved.metrics.advance(65);

describe('loadFonts: embedded programs as faces with a family, weight and posture', () => {
  it('reads the family, weight and posture from the descriptor (weight 500 is regular, 600 and over bold; a negative italic angle is italic)', () => {
    const { faces, issues } = loadFonts(FONTS);
    expect(issues).toEqual([]);
    expect(faces.map((f) => [f.fontId, f.family, f.weight, f.posture, f.format])).toEqual([
      ['font:CourierNewPSMT', 'Courier New', 'normal', 'normal', 'truetype'],
      ['font:CourierStd', 'Courier Std', 'normal', 'normal', 'opentype'],
      ['font:CourierStd-Bold', 'Courier Std', 'bold', 'normal', 'opentype'],
      ['font:MyriadPro-Bold', 'Myriad Pro', 'bold', 'normal', 'opentype'],
      ['font:MyriadPro-It', 'Myriad Pro', 'normal', 'italic', 'opentype'],
      ['font:MyriadPro-Regular', 'Myriad Pro', 'normal', 'normal', 'opentype'],
    ]);
    expect(faces[0]?.bytes).toBe(FONTS[0]?.program);
    expect(faces[0]?.metrics.advance(65)).toBe(601);
  });

  it('without a descriptor family or weight, reads them from the base font name, then the ForceBold and Italic flags, then the font program', () => {
    const { faces } = loadFonts([
      embedded('A', { baseFont: 'ABCDEF+Acme-BoldItalic' }),
      embedded('B', { baseFont: 'Acme', flags: 32 + 64 + 0x40000 }),
      embedded('C', { baseFont: 'Acme', program: program(500, { weightClass: 700, macStyle: 2 }) }),
      embedded('D', { baseFont: 'Acme-Semibold' }),
      embedded('E', { baseFont: 'Acme-It' }),
    ]);
    expect(faces.map((f) => [f.family, f.weight, f.posture])).toEqual([
      ['Acme', 'bold', 'italic'],
      ['Acme', 'bold', 'italic'],
      ['Acme', 'bold', 'italic'],
      ['Acme', 'bold', 'normal'],
      ['Acme', 'normal', 'italic'],
    ]);
  });

  it('keeps going past a program it cannot read, with one issue naming the resource', () => {
    const { faces, issues } = loadFonts([embedded('Bad', { program: new Uint8Array(40) }), embedded('Good', { fontFamily: 'Good' })]);
    expect(faces.map((f) => f.fontId)).toEqual(['font:Good']);
    expect(issues).toEqual(['font.program.Bad']);
  });
});

describe('createFontResolver: typeface resolution and fallback (PA-3)', () => {
  const { faces } = loadFonts(FONTS);
  const resolver = (typefaces: string[] = ['Myriad Pro']) => createFontResolver(faces, typefaces);

  it('resolves Myriad Pro regular, bold and italic to their programs, however the typeface is spelt', () => {
    const r = resolver();
    expect(r.resolve('Myriad Pro', 'normal', 'normal').fontId).toBe('font:MyriadPro-Regular');
    expect(r.resolve('Myriad Pro', 'bold', 'normal').fontId).toBe('font:MyriadPro-Bold');
    expect(r.resolve('Myriad Pro', 'normal', 'italic').fontId).toBe('font:MyriadPro-It');
    expect(r.resolve('MyriadPro-Regular', 'normal', 'normal').fontId).toBe('font:MyriadPro-Regular');
    expect(r.resolve('MyriadPro-Bold', 'normal', 'normal').fontId).toBe('font:MyriadPro-Bold');
    expect(r.resolve('MyriadPro-It', 'normal', 'normal').fontId).toBe('font:MyriadPro-It');
    expect(r.resolve('  myriad PRO ', 'bold', 'normal').fontId).toBe('font:MyriadPro-Bold');
    expect(r.issues()).toEqual([]);
  });

  it('resolves the default typeface (none given, or Courier) to the Courier program, not Courier New, and Courier New to CourierNewPSMT', () => {
    const r = resolver();
    expect(DEFAULT_TYPEFACE).toBe('Courier');
    expect(r.resolve(undefined, 'normal', 'normal').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier', 'normal', 'normal').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier', 'bold', 'normal').fontId).toBe('font:CourierStd-Bold');
    expect(r.resolve('Courier New', 'normal', 'normal').fontId).toBe('font:CourierNewPSMT');
    expect(advanceOf(r.resolve('Courier New', 'normal', 'normal'))).toBe(601);
    expect(r.issues()).toEqual([]);
  });

  it('an unknown typeface takes the most-used embedded typeface, with one issue per typeface however often it is met', () => {
    const r = resolver(['Courier', 'Myriad Pro', 'Myriad Pro', 'Arial', 'Arial']);
    const first = r.resolve('Arial', 'normal', 'normal');
    expect(first.fontId).toBe('font:MyriadPro-Regular');
    expect(r.resolve('Arial', 'bold', 'normal').fontId).toBe('font:MyriadPro-Bold');
    expect(r.resolve('arial', 'normal', 'normal').fontId).toBe('font:MyriadPro-Regular');
    expect(r.resolve('Verdana', 'normal', 'normal').fontId).toBe('font:MyriadPro-Regular');
    expect(r.issues()).toEqual(['font.Arial', 'font.Verdana']);
  });

  it('breaks a tie between typefaces by the order of the document resources, and ignores names that are not embedded when counting', () => {
    const r = createFontResolver(faces, ['Courier New', 'Myriad Pro', 'Zapf', 'Zapf', 'Zapf']);
    expect(r.resolve('Unknown', 'normal', 'normal').fontId).toBe('font:CourierNewPSMT');
  });

  it('a Courier-family typeface that is not embedded measures 600/1000 per character, with an issue and no font resource', () => {
    const only = createFontResolver(loadFonts([FONTS[3] as EmbeddedFont]).faces, ['Myriad Pro']);
    const r = only.resolve('Courier New', 'normal', 'normal');
    expect(r.fontId).toBeUndefined();
    expect(r.metrics.unitsPerEm).toBe(1000);
    expect(r.metrics.advance(65)).toBe(600);
    expect(r.metrics.advance(0x20ac)).toBe(600);
    expect(r.metrics.notdefAdvance).toBe(600);
    expect(r.metrics.ascent + r.metrics.descent + r.metrics.lineGap).toBe(1200);
    expect(only.issues()).toEqual(['font.Courier New']);
  });

  it('a Courier-family typeface that is not embedded takes the embedded Courier face, in the style asked for, and the issue names the face used (SF-5)', () => {
    const courier = createFontResolver(loadFonts([FONTS[1] as EmbeddedFont, FONTS[2] as EmbeddedFont, FONTS[3] as EmbeddedFont]).faces, ['Courier New', 'Myriad Pro']);
    const regular = courier.resolve('Courier New', 'normal', 'normal');
    expect(regular.fontId, 'a font resource backs it, not the fallback id').toBe('font:CourierStd');
    expect(regular.metrics.advance(65)).toBe(600);
    expect(courier.resolve('Courier New', 'bold', 'normal').fontId).toBe('font:CourierStd-Bold');
    expect(courier.resolve('courier  new', 'normal', 'normal').fontId).toBe('font:CourierStd');
    expect(courier.issues()).toEqual(['font.Courier New (Courier Std used)']);
    // A name that is not Courier-family still takes the most-used typeface (here Myriad Pro, whose only face is the bold one), not the Courier face.
    expect(courier.resolve('Arial', 'normal', 'normal').fontId).toBe('font:MyriadPro-Bold');
  });

  it('a Courier substitute whose weight or posture is not the one asked for also raises the font.style issue, once per typeface and style (R8)', () => {
    const r = createFontResolver(loadFonts([FONTS[1] as EmbeddedFont, FONTS[2] as EmbeddedFont]).faces, []);
    expect(r.resolve('Courier New', 'normal', 'italic').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier New', 'normal', 'italic').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier New', 'bold', 'normal').fontId).toBe('font:CourierStd-Bold');
    expect(r.issues()).toEqual(['font.Courier New (Courier Std used)', 'font.style.Courier New.normal.italic']);
  });

  it('with several embedded Courier families, a missing Courier name takes the plain Courier one', () => {
    const r = createFontResolver(loadFonts([FONTS[0] as EmbeddedFont, FONTS[1] as EmbeddedFont]).faces, []);
    expect(r.resolve('Courier Narrow', 'normal', 'normal').fontId).toBe('font:CourierStd');
    expect(r.issues()).toEqual(['font.Courier Narrow (Courier Std used)']);
    const onlyNew = createFontResolver(loadFonts([FONTS[0] as EmbeddedFont]).faces, []);
    expect(onlyNew.resolve('Courier Narrow', 'normal', 'normal').fontId).toBe('font:CourierNewPSMT');
  });

  it('with no embedded font at all, every typeface falls back to the fixed-pitch Courier metrics with an issue', () => {
    const none = createFontResolver([], []);
    expect(none.resolve('Myriad Pro', 'normal', 'normal').fontId).toBeUndefined();
    expect(none.resolve(undefined, 'bold', 'normal').metrics.advance(65)).toBe(600);
    expect(none.issues()).toEqual(['font.Myriad Pro', 'font.Courier']);
  });

  it('a style the family lacks takes the nearest face and reports it once per typeface and style', () => {
    const r = resolver();
    expect(r.resolve('Courier', 'normal', 'italic').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier', 'normal', 'italic').fontId).toBe('font:CourierStd');
    expect(r.resolve('Courier', 'bold', 'italic').fontId).toBe('font:CourierStd-Bold');
    expect(r.issues()).toEqual(['font.style.Courier.normal.italic', 'font.style.Courier.bold.italic']);
  });

  it('refuses a typeface that is not text or is absurdly long', () => {
    const r = resolver();
    for (const bad of [5 as unknown as string, 'x'.repeat(300)]) {
      expect(() => r.resolve(bad, 'normal', 'normal')).toThrow(XfaLayoutError);
    }
    expect(r.resolve('', 'normal', 'normal').fontId).toBe('font:CourierStd');
  });
});

describe('loadFonts and createFontResolver: names and descriptors (F1, F2)', () => {
  const named = (baseFont: string, advance: number, extra: Partial<EmbeddedFont> = {}): EmbeddedFont => embedded(baseFont, { baseFont, advance, ...extra });

  it('Microsoft PostScript names without /FontFamily resolve to their family with the right weight and no style issue (F1)', () => {
    const { faces } = loadFonts([
      named('CourierNewPSMT', 601),
      named('CourierNewPS-BoldMT', 602),
      named('TimesNewRomanPSMT', 611),
      named('TimesNewRomanPS-BoldMT', 612),
      named('TimesNewRomanPS-ItalicMT', 613),
      named('ArialMT', 621),
      named('Arial-BoldMT', 622),
      named('ABCDEF+Arial-BoldItalicMT', 623),
    ]);
    const r = createFontResolver(faces, []);
    const adv = (typeface: string, weight: 'normal' | 'bold', posture: 'normal' | 'italic' = 'normal'): number | undefined => r.resolve(typeface, weight, posture).metrics.advance(65);
    expect([adv('Courier New', 'normal'), adv('Courier New', 'bold')]).toEqual([601, 602]);
    expect([adv('Times New Roman', 'normal'), adv('Times New Roman', 'bold'), adv('Times New Roman', 'normal', 'italic')]).toEqual([611, 612, 613]);
    expect([adv('Arial', 'normal'), adv('Arial', 'bold'), adv('Arial', 'bold', 'italic')]).toEqual([621, 622, 623]);
    expect(adv('CourierNewPS-BoldMT', 'normal')).toBe(602);
    expect(adv('Arial-BoldMT', 'normal')).toBe(622);
    expect(adv('CourierNewPSMT', 'normal')).toBe(601);
    expect(r.issues()).toEqual([]);
    expect(faces.map((f) => [f.family, f.weight, f.posture])).toEqual([
      ['Courier New', 'normal', 'normal'],
      ['Courier New', 'bold', 'normal'],
      ['Times New Roman', 'normal', 'normal'],
      ['Times New Roman', 'bold', 'normal'],
      ['Times New Roman', 'normal', 'italic'],
      ['Arial', 'normal', 'normal'],
      ['Arial', 'bold', 'normal'],
      ['Arial', 'bold', 'italic'],
    ]);
  });

  it('a descriptor value is positive evidence only: ItalicAngle 0 does not undo an italic name, flag or macStyle, nor FontWeight 400 a bold name (F2)', () => {
    const { faces } = loadFonts([
      named('MyriadPro-It', 1, { fontFamily: 'Myriad Pro', italicAngle: 0, fontWeight: 400 }),
      named('MyriadPro-Bold', 2, { fontFamily: 'Myriad Pro', italicAngle: 0, fontWeight: 400 }),
      named('Plain', 3, { italicAngle: 0, fontWeight: 400, flags: 32 + 64 + 0x40000 }),
      named('Mac', 4, { italicAngle: 0, fontWeight: 400, program: program(500, { macStyle: 3 }) }),
      named('Regular', 5, { italicAngle: 0, fontWeight: 400 }),
      named('Angled', 6, { italicAngle: -11, fontWeight: 700 }),
    ]);
    expect(faces.map((f) => [f.weight, f.posture])).toEqual([
      ['normal', 'italic'],
      ['bold', 'normal'],
      ['bold', 'italic'],
      ['bold', 'italic'],
      ['normal', 'normal'],
      ['bold', 'italic'],
    ]);
  });
});

describe('createFontResolver: issues are handed over once and bounded (SF-2)', () => {
  const unknown = (count: number): string[] => Array.from({ length: count }, (_, i) => `Unknown${i}`);

  it('reports each new issue to the callback once, in order, as it is raised', () => {
    const seen: string[] = [];
    const r = createFontResolver([], [], (feature) => void seen.push(feature));
    r.resolve('Arial', 'normal', 'normal');
    r.resolve('Arial', 'bold', 'normal');
    r.resolve('Verdana', 'normal', 'normal');
    expect(seen).toEqual(['font.Arial', 'font.Verdana']);
  });

  it('20,000 distinct unknown typefaces: one callback each, a stored list capped at MAX_ISSUES, and issues() is the stored list itself (nothing copied per call)', () => {
    const names = unknown(20_000);
    let calls = 0;
    const r = createFontResolver([], [], () => void (calls += 1));
    const stored = r.issues();
    for (const name of names) r.resolve(name, 'normal', 'normal');
    // Linear work: the callback ran once per distinct typeface, and the view handed out before the run is the one after it.
    expect(calls).toBe(names.length);
    expect(r.issues()).toBe(stored);
    expect(r.issues()).toHaveLength(MAX_ISSUES);
    expect(r.issues()[0]).toBe('font.Unknown0');
    expect(r.issues()[MAX_ISSUES - 1]).toBe(`font.Unknown${MAX_ISSUES - 1}`);
  });
});
