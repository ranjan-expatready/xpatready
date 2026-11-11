import { z } from 'zod';
import { XfaLayoutError } from '../errors.js';
import { MAX_ISSUES } from '../limits.js';
import { splitFontName, type LoadedFont } from './catalogue.js';
import { MAX_FONT_NAME_CHARS } from './limits.js';
import type { FontMetrics } from './sfnt.js';

/** The XFA default typeface, used when a `font` names none (a field giving only a size). */
export const DEFAULT_TYPEFACE = 'Courier';

/** The font a run is measured with, and the render-tree font resource to draw it with (`undefined` when no program stands behind it). */
export interface ResolvedFont {
  readonly fontId: string | undefined;
  readonly face: LoadedFont | undefined;
  readonly metrics: FontMetrics;
}

export interface FontResolver {
  /** `typeface` undefined or blank means `DEFAULT_TYPEFACE`. Throws `INVALID_ARGUMENT` for a typeface that is not text or is over-long. */
  resolve(typeface: string | undefined, weight: 'normal' | 'bold', posture: 'normal' | 'italic'): ResolvedFont;
  /**
   * The layout issues raised so far (`font.<typeface>`, `font.style.<typeface>.<weight>.<posture>`), each once, in order, at
   * most `MAX_ISSUES` of them. It is the stored list itself, not a copy: a caller that wants only what is new takes the
   * callback of `createFontResolver`.
   */
  issues(): readonly string[];
}

/**
 * Standard-14 Courier: every character advances 600/1000 em. The vertical metrics are the hhea values of the Courier Std
 * program in the two real forms (ascender 627, descender 373, line gap 200: 1.2 em), the only Courier a form embeds.
 * FD-38 exemption (correctness constant): the 600/1000 advance is a property of the Courier typeface itself, not a setting.
 */
const COURIER_ADVANCE = 600;
const COURIER_METRICS: FontMetrics = {
  unitsPerEm: 1000,
  ascent: 627,
  descent: 373,
  lineGap: 200,
  glyphCount: 1,
  notdefAdvance: COURIER_ADVANCE,
  weightClass: undefined,
  macBold: false,
  macItalic: false,
  advance: () => COURIER_ADVANCE,
};

/** The key every Courier-family name starts with (`Courier`, `Courier New`, `CourierStd`). */
const COURIER = 'courier';

const typefaceSchema = z.string().max(MAX_FONT_NAME_CHARS);
const STRIPPED_SUFFIX = /(psmt|std|mt)$/;

/** Lower case with spaces, hyphens, underscores and commas removed: `Myriad Pro` and `MyriadPro` are the same family. */
const keyOf = (name: string): string => name.toLowerCase().replace(/[\s_,-]/g, '');

/** The keys a name answers to: its own, and without a vendor or PostScript suffix (`CourierStd`, `CourierNewPSMT` -> `courier`, `couriernew`). */
function keysOf(name: string): readonly string[] {
  const key = keyOf(name);
  const stripped = key.replace(STRIPPED_SUFFIX, '');
  return stripped === key || stripped === '' ? [key] : [key, stripped];
}

const shares = (a: readonly string[], b: readonly string[]): boolean => a.some((key) => b.includes(key));

/** A family's identity: its shortest key, so `Courier Std` and `CourierStd` are one family and `Courier New` another. */
const idOf = (keys: readonly string[]): string => keys[keys.length - 1] ?? '';

interface Match {
  readonly family: string;
  readonly bold: boolean;
  readonly italic: boolean;
}

/**
 * Resolves typefaces against the embedded faces; see PA-3 for the table and the fallbacks. `onIssue` is told each NEW issue
 * the moment it is raised (once per typeface and style, however often it is met), so the caller never re-reads the list.
 * Only the first `MAX_ISSUES` are stored, and a typeface met after that is not deduplicated (the caller, which owns the
 * overflow accounting, is told each time it is resolved: `TextContext` resolves each distinct typeface once).
 */
export function createFontResolver(faces: readonly LoadedFont[], templateTypefaces: readonly string[], onIssue?: (feature: string) => void): FontResolver {
  const familyKeys = faces.map((face) => keysOf(face.family));
  const familyIds = familyKeys.map(idOf);
  const raised = new Set<string>();
  const issues: string[] = [];
  const raise = (id: string, feature: string): void => {
    if (raised.has(id)) return;
    if (issues.length < MAX_ISSUES) {
      raised.add(id);
      issues.push(feature);
    }
    onIssue?.(feature);
  };

  /** The faces of the family a typeface names, plus the style its name spells (`MyriadPro-Bold`), or `undefined` when none is embedded. */
  const match = (typeface: string): Match | undefined => {
    const whole = keysOf(typeface);
    const named = splitFontName(typeface);
    const candidates: { readonly keys: readonly string[]; readonly bold: boolean; readonly italic: boolean }[] = [
      { keys: whole, bold: false, italic: false },
      { keys: keysOf(named.base), bold: named.bold, italic: named.italic },
    ];
    for (const candidate of candidates) {
      const first = familyKeys.find((keys) => shares(keys, candidate.keys));
      if (first !== undefined) return { family: idOf(first), bold: candidate.bold, italic: candidate.italic };
    }
    return undefined;
  };

  // The most-used embedded typeface of the template: counted per family, ties broken by the order of the document resources.
  const counts = new Map<string, number>();
  for (const typeface of templateTypefaces) {
    const found = match(typeface);
    if (found !== undefined) counts.set(found.family, (counts.get(found.family) ?? 0) + 1);
  }
  let mostUsed: string | undefined;
  for (const id of familyIds) {
    if (mostUsed === undefined || (counts.get(id) ?? 0) > (counts.get(mostUsed) ?? 0)) mostUsed = id;
  }

  // The embedded Courier-family face a Courier name without a program of its own takes: the plain `Courier` family, else the first embedded one.
  const courierFamily = familyIds.includes(COURIER) ? COURIER : familyIds.find((id) => id.startsWith(COURIER));

  const pick = (family: string, weight: 'normal' | 'bold', posture: 'normal' | 'italic'): { face: LoadedFont; exact: boolean } | undefined => {
    let best: LoadedFont | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    faces.forEach((face, index) => {
      if (familyIds[index] !== family) return;
      const score = (face.weight === weight ? 0 : 2) + (face.posture === posture ? 0 : 1);
      if (score < bestScore) {
        best = face;
        bestScore = score;
      }
    });
    return best === undefined ? undefined : { face: best, exact: bestScore === 0 };
  };

  const resolved = (face: LoadedFont | undefined): ResolvedFont => ({ fontId: face?.fontId, face, metrics: face?.metrics ?? COURIER_METRICS });

  return {
    resolve(typeface, weight, posture): ResolvedFont {
      const checked = typefaceSchema.safeParse(typeface ?? '');
      if (!checked.success) throw new XfaLayoutError('INVALID_ARGUMENT', `resolveFont: typeface ${checked.error.issues.map((i) => i.message).join('; ')}`);
      const name = checked.data.trim() === '' ? DEFAULT_TYPEFACE : checked.data.trim();
      const found = match(name);
      if (found !== undefined) {
        const wanted = { weight: found.bold ? 'bold' : weight, posture: found.italic ? 'italic' : posture } as const;
        const chosen = pick(found.family, wanted.weight, wanted.posture);
        if (chosen !== undefined) {
          if (!chosen.exact) raise(`style:${keyOf(name)}:${wanted.weight}:${wanted.posture}`, `font.style.${name}.${wanted.weight}.${wanted.posture}`);
          return resolved(chosen.face);
        }
      }
      if (keyOf(name).startsWith(COURIER)) {
        // A Courier-family name with no program of its own is drawn with the Courier face the document embeds, when it embeds one
        // (every Courier face is 600/1000 per character, so the metrics are those of the fixed-pitch fallback); the fallback
        // font id, which has no font resource behind it, is only for a document with no Courier face at all.
        const chosen = courierFamily === undefined ? undefined : pick(courierFamily, weight, posture);
        const substitute = chosen?.face;
        raise(`typeface:${keyOf(name)}`, substitute === undefined ? `font.${name}` : `font.${name} (${substitute.family} used)`);
        // As for a matched family: a face whose weight or posture is not the one asked for is reported once per typeface and style.
        if (chosen !== undefined && !chosen.exact) raise(`style:${keyOf(name)}:${weight}:${posture}`, `font.style.${name}.${weight}.${posture}`);
        return resolved(substitute);
      }
      raise(`typeface:${keyOf(name)}`, `font.${name}`);
      if (mostUsed === undefined) return resolved(undefined);
      const fallback = pick(mostUsed, weight, posture);
      return resolved(fallback?.face);
    },
    issues: () => issues,
  };
}
