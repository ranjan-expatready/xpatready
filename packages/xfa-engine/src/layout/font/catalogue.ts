import { XfaPdfError } from '../../pdf/errors.js';
import type { EmbeddedFont } from './embedded.js';
import { parseFontMetrics, type FontMetrics } from './sfnt.js';

/** An embedded font program that parsed: what the render tree's `resources.fonts` needs, plus the metrics the layout measures with. */
export interface LoadedFont {
  readonly fontId: string;
  readonly family: string;
  readonly weight: 'normal' | 'bold';
  readonly posture: 'normal' | 'italic';
  readonly format: 'opentype' | 'truetype';
  readonly bytes: Uint8Array;
  readonly metrics: FontMetrics;
}

/** FD-38 exemption (correctness constant): the `/FontDescriptor /FontWeight` from which a face is bold (CSS and OpenType: 400 regular, 700 bold; Adobe's "500" regular Courier stays regular); not a setting. */
const BOLD_FROM_WEIGHT = 600;
/** `/FontDescriptor /Flags` bit 7 (Italic) and bit 19 (ForceBold), ISO 32000-1 table 123. */
const FLAG_ITALIC = 1 << 6;
const FLAG_FORCE_BOLD = 1 << 18;

const SUBSET_PREFIX = /^[A-Z]{6}\+/;
/** Microsoft's PostScript name endings (`CourierNewPSMT`, `CourierNewPS-BoldMT`, `ArialMT`), dropped from the family part. */
const MICROSOFT_SUFFIX = /(?<=[a-z])(?:PSMT|PS|MT)$/;
const BOLD_WORDS = /bold|black|heavy|demi|bd/;
const ITALIC_WORDS = /ital|obl|(?:^|bold|bd|semi|demi|black|heavy|light|regular|reg|medium)it$/;

/** The base and style suffix of a PostScript-style name (`MyriadPro-BoldIt` -> `MyriadPro`, `bold it`); a subset prefix is dropped. */
export function splitFontName(name: string): { readonly base: string; readonly bold: boolean; readonly italic: boolean } {
  const plain = name.replace(SUBSET_PREFIX, '');
  const cut = plain.search(/[-,]/);
  const base = (cut < 0 ? plain : plain.slice(0, cut)).replace(MICROSOFT_SUFFIX, '');
  const suffix = (cut < 0 ? '' : plain.slice(cut + 1)).toLowerCase().replace(/[\s,-]/g, '');
  return { base, bold: BOLD_WORDS.test(suffix), italic: ITALIC_WORDS.test(suffix) };
}

/** Every source is positive evidence only: a descriptor saying "weight 400" or "angle 0" is the producer's default, not proof against a `-Bold` name, a flag or the program's own tables. */
function weightOf(font: EmbeddedFont, metrics: FontMetrics, named: boolean): 'normal' | 'bold' {
  const bold = (font.fontWeight ?? 0) >= BOLD_FROM_WEIGHT || named || (font.flags & FLAG_FORCE_BOLD) !== 0 || (metrics.weightClass ?? 0) >= BOLD_FROM_WEIGHT || metrics.macBold;
  return bold ? 'bold' : 'normal';
}

function postureOf(font: EmbeddedFont, metrics: FontMetrics, named: boolean): 'normal' | 'italic' {
  const italic = (font.italicAngle ?? 0) !== 0 || named || (font.flags & FLAG_ITALIC) !== 0 || metrics.macItalic;
  return italic ? 'italic' : 'normal';
}

/** `CourierNew` -> `Courier New`: a family spelt as a PostScript name, with a space before each capital that follows a lower-case letter. */
const spaced = (family: string): string => family.replace(/(?<=[a-z])(?=[A-Z])/g, ' ');

/**
 * Parses each embedded program. A program the reader refuses does not stop the others: it yields no face, and one
 * `font.program.<resourceName>` issue, so a typeface that needed it falls back like any other missing typeface. The family comes
 * from the descriptor (`/FontFamily`), else the base font name; weight and posture from the descriptor, then the name, then
 * the flags, then the program's own `OS/2` and `head` tables.
 */
export function loadFonts(fonts: readonly EmbeddedFont[]): { readonly faces: readonly LoadedFont[]; readonly issues: readonly string[] } {
  const faces: LoadedFont[] = [];
  const issues: string[] = [];
  for (const font of fonts) {
    let metrics: FontMetrics;
    try {
      metrics = parseFontMetrics(font.program);
    } catch (error) {
      if (!(error instanceof XfaPdfError)) throw error;
      issues.push(`font.program.${font.resourceName}`);
      continue;
    }
    const name = splitFontName(font.baseFont);
    faces.push({
      fontId: font.fontId,
      family: font.fontFamily ?? spaced(name.base),
      weight: weightOf(font, metrics, name.bold),
      posture: postureOf(font, metrics, name.italic),
      format: font.programKind,
      bytes: font.program,
      metrics,
    });
  }
  return { faces, issues };
}
