import { z } from 'zod';
import { parseMeasure } from '../../units.js';
import { MAX_FONT_NAME_CHARS } from '../../font/limits.js';
import { safeText } from '../../../pdf/safe-text.js';
import { hAlignSchema } from '../types.js';
import { MAX_STYLE_CHARS, MAX_STYLE_DECLARATIONS, MAX_TAB_COUNT } from './limits.js';

const finite = z.number().finite();

/**
 * What one `style` attribute of the supported subset says (corpus inventory, OVERVIEW): every key is optional and only the
 * ones the attribute wrote are present. Strict, so a property added to the reader without the schema is a type error.
 */
export const cssDeclarationSchema = z.strictObject({
  fontSizePt: finite.gt(0).optional(),
  weight: z.enum(['normal', 'bold']).optional(),
  posture: z.enum(['normal', 'italic']).optional(),
  typeface: z.string().min(1).max(MAX_FONT_NAME_CHARS).optional(),
  letterSpacingPt: finite.optional(),
  textAlign: hAlignSchema.optional(),
  marginLeftPt: finite.min(0).optional(),
  textIndentPt: finite.optional(),
  spaceRun: z.boolean().optional(),
  tabCount: z.int().min(1).max(MAX_TAB_COUNT).optional(),
});
export type CssDeclaration = z.infer<typeof cssDeclarationSchema>;

const QUOTES = /^["']|["']$/g;
const FIRST_FAMILY = /^[^,]*/;

/** CSS `text-align` values the template can write, mapped to the `para hAlign` they mean. */
const ALIGN: Readonly<Record<string, z.infer<typeof hAlignSchema>>> = { left: 'left', center: 'center', right: 'right', justify: 'justify' };

const PROPERTIES: ReadonlySet<string> = new Set(['font-size', 'font-weight', 'font-style', 'font-family', 'letter-spacing', 'text-align', 'margin-left', 'text-indent', 'xfa-spacerun', 'xfa-tab-count']);

function weightOf(value: string): 'normal' | 'bold' | undefined {
  if (value === 'normal' || value === 'lighter') return 'normal';
  if (value === 'bold' || value === 'bolder') return 'bold';
  if (/^\d{1,4}$/.test(value)) return Number(value) >= 600 ? 'bold' : 'normal';
  return undefined;
}

/** One value of one property, or `undefined` when the value is not understood (the caller reports it). */
function valueOf(name: string, value: string): CssDeclaration | undefined {
  const length = (): number | undefined => {
    try {
      return parseMeasure(value, 'pt', name);
    } catch {
      return undefined;
    }
  };
  switch (name) {
    case 'font-size': {
      const size = length();
      return size === undefined || !(size > 0) ? undefined : { fontSizePt: size };
    }
    case 'font-weight': {
      const weight = weightOf(value);
      return weight === undefined ? undefined : { weight };
    }
    case 'font-style':
      return value === 'normal' ? { posture: 'normal' } : value === 'italic' || value === 'oblique' ? { posture: 'italic' } : undefined;
    case 'font-family': {
      const family = (FIRST_FAMILY.exec(value)?.[0] ?? '').trim().replace(QUOTES, '').trim();
      return family === '' || family.length > MAX_FONT_NAME_CHARS ? undefined : { typeface: family };
    }
    case 'letter-spacing': {
      if (value === 'normal') return { letterSpacingPt: 0 };
      const spacing = length();
      return spacing === undefined ? undefined : { letterSpacingPt: spacing };
    }
    case 'text-align': {
      const align = ALIGN[value];
      return align === undefined ? undefined : { textAlign: align };
    }
    case 'margin-left': {
      const margin = length();
      return margin === undefined || margin < 0 ? undefined : { marginLeftPt: margin };
    }
    case 'text-indent': {
      const indent = length();
      return indent === undefined ? undefined : { textIndentPt: indent };
    }
    case 'xfa-spacerun':
      return value === 'yes' ? { spaceRun: true } : value === 'no' ? { spaceRun: false } : undefined;
    case 'xfa-tab-count': {
      const count = /^\d{1,4}$/.test(value) ? Number(value) : Number.NaN;
      return count >= 1 && count <= MAX_TAB_COUNT ? { tabCount: count } : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Reads a `style` attribute (`name:value;name:value`) of the supported subset. Names are case-insensitive, a later
 * declaration of a name wins. Anything outside the subset (an unknown property, a value that is not understood, a
 * declaration with no colon, more than `MAX_STYLE_DECLARATIONS`, or a longer attribute than `MAX_STYLE_CHARS`) is
 * reported through `report` and skipped; the rest of the attribute still applies. A result that fails the schema is
 * dropped whole and reported too (`checkedDeclaration`). Never throws.
 */
export function parseStyleAttribute(style: string | undefined, report: (feature: string) => void): CssDeclaration {
  if (style === undefined || style.trim() === '') return {};
  if (style.length > MAX_STYLE_CHARS) {
    report(`rich.css: style longer than ${MAX_STYLE_CHARS} characters (ignored)`);
    return {};
  }
  let merged: CssDeclaration = {};
  const parts = style.split(';');
  if (parts.length > MAX_STYLE_DECLARATIONS) report(`rich.css: more than ${MAX_STYLE_DECLARATIONS} declarations (the rest are ignored)`);
  for (const part of parts.slice(0, MAX_STYLE_DECLARATIONS)) {
    if (part.trim() === '') continue;
    const colon = part.indexOf(':');
    if (colon < 0) {
      report(`rich.css: declaration without a colon (${safeText(part.trim(), 40)})`);
      continue;
    }
    const name = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (!PROPERTIES.has(name)) {
      report(`rich.css.${safeText(name, 40)}`);
      continue;
    }
    const read = valueOf(name, name === 'font-family' ? value : value.toLowerCase());
    if (read === undefined) {
      report(`rich.css.${name}: value not understood (${safeText(value, 40)})`);
      continue;
    }
    merged = { ...merged, ...read };
  }
  return checkedDeclaration(merged, report);
}

/**
 * `merged` held to the declaration schema: what a reader that already checked each value should never fail, kept as the
 * boundary check. A declaration that fails it is dropped WHOLE and reported (`rich.css: style not valid`, with the first
 * reason), never silently.
 */
export function checkedDeclaration(merged: unknown, report: (feature: string) => void): CssDeclaration {
  const checked = cssDeclarationSchema.safeParse(merged);
  if (checked.success) return checked.data;
  report(`rich.css: style not valid (ignored): ${safeText(checked.error.issues[0]?.message ?? 'unknown', 60)}`);
  return {};
}
