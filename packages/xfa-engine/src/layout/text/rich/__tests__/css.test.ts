import { describe, expect, it } from 'vitest';
import { checkedDeclaration, parseStyleAttribute } from '../css.js';
import { MAX_STYLE_CHARS, MAX_STYLE_DECLARATIONS } from '../limits.js';

const read = (style: string | undefined): { decl: ReturnType<typeof parseStyleAttribute>; reports: string[] } => {
  const reports: string[] = [];
  return { decl: parseStyleAttribute(style, (f) => void reports.push(f)), reports };
};

describe('parseStyleAttribute', () => {
  it('reads every property of the subset, in points', () => {
    const { decl, reports } = read("font-size:8pt; font-weight:bold; font-style:italic; font-family:'Myriad Pro', serif; letter-spacing:0.5mm; text-align:center; margin-left:1in; text-indent:-18pt; xfa-spacerun:yes; xfa-tab-count:2");
    expect(decl).toEqual({
      fontSizePt: 8,
      weight: 'bold',
      posture: 'italic',
      typeface: 'Myriad Pro',
      letterSpacingPt: (0.5 * 72) / 25.4,
      textAlign: 'center',
      marginLeftPt: 72,
      textIndentPt: -18,
      spaceRun: true,
      tabCount: 2,
    });
    expect(reports).toEqual([]);
  });

  it('a unit-less length is points, names and keywords are case-insensitive, numeric weights above 599 are bold', () => {
    expect(read('FONT-SIZE:9; Font-Weight:700').decl).toEqual({ fontSizePt: 9, weight: 'bold' });
    expect(read('font-weight:400').decl).toEqual({ weight: 'normal' });
  });

  it('a later declaration of a name wins; nothing at all is nothing', () => {
    expect(read('font-size:8pt;font-size:9pt').decl).toEqual({ fontSizePt: 9 });
    expect(read(undefined).decl).toEqual({});
    expect(read('  ').decl).toEqual({});
  });

  it('reports what is outside the subset and keeps the rest', () => {
    const { decl, reports } = read('color:red;font-size:abc;font-size:0pt;text-align:justify-all;nonsense;xfa-tab-count:0;margin-left:-3pt;font-weight:bold');
    expect(decl).toEqual({ weight: 'bold' });
    expect(reports).toEqual([
      'rich.css.color',
      'rich.css.font-size: value not understood (abc)',
      'rich.css.font-size: value not understood (0pt)',
      'rich.css.text-align: value not understood (justify-all)',
      'rich.css: declaration without a colon (nonsense)',
      'rich.css.xfa-tab-count: value not understood (0)',
      'rich.css.margin-left: value not understood (-3pt)',
    ]);
  });

  it('refuses a unit it does not convert instead of reading it as points', () => {
    const { decl, reports } = read('font-size:2em');
    expect(decl).toEqual({});
    expect(reports).toEqual(['rich.css.font-size: value not understood (2em)']);
  });

  it('is bounded: a style over the character ceiling is ignored, one over the declaration ceiling is cut', () => {
    expect(read(`font-size:${'9'.repeat(MAX_STYLE_CHARS)}pt`).reports).toEqual([`rich.css: style longer than ${MAX_STYLE_CHARS} characters (ignored)`]);
    const many = Array.from({ length: MAX_STYLE_DECLARATIONS + 5 }, () => 'a:b').join(';');
    const { reports } = read(many);
    expect(reports[0]).toBe(`rich.css: more than ${MAX_STYLE_DECLARATIONS} declarations (the rest are ignored)`);
    expect(reports).toHaveLength(1 + MAX_STYLE_DECLARATIONS);
  });

  it('a tab count above the ceiling is not understood', () => {
    expect(read('xfa-tab-count:100000').decl).toEqual({});
  });

  it('a declaration the schema refuses is dropped whole and reported, never silently', () => {
    const reports: string[] = [];
    expect(checkedDeclaration({ fontSizePt: -1, weight: 'bold' }, (f) => void reports.push(f))).toEqual({});
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatch(/^rich\.css: style not valid \(ignored\): /);
    expect(checkedDeclaration({ weight: 'bold' }, (f) => void reports.push(f))).toEqual({ weight: 'bold' });
    expect(reports).toHaveLength(1);
  });
});
