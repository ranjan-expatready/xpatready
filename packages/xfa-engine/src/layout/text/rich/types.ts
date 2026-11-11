import { z } from 'zod';
import { MAX_FONT_NAME_CHARS } from '../../font/limits.js';
import { colourSchema } from '../../render-tree.js';
import { hAlignSchema } from '../types.js';

/** The look of a stretch of rich text after the cascade (container `font`, then body, p and span): everything that changes how a run is measured. */
export const charStyleSchema = z.strictObject({
  typeface: z.string().max(MAX_FONT_NAME_CHARS).optional(),
  weight: z.enum(['normal', 'bold']),
  posture: z.enum(['normal', 'italic']),
  sizePt: z.number().finite().gt(0),
  letterSpacingPt: z.number().finite(),
  colour: colourSchema,
});
export type CharStyle = z.infer<typeof charStyleSchema>;

/** The pieces a paragraph is made of; `style` is an index into `RichDocument.styles`. */
export type RichAtom =
  | { readonly kind: 'text'; readonly text: string; readonly style: number }
  | { readonly kind: 'tab'; readonly style: number }
  | { readonly kind: 'embed'; readonly id: string; readonly mode: 'raw' | 'formatted' | undefined; readonly style: number }
  | { readonly kind: 'break'; readonly style: number };

export interface RichParagraph {
  readonly atoms: readonly RichAtom[];
  /** The style of a paragraph with nothing in it (it still holds a blank line). */
  readonly style: number;
  readonly hAlign: z.infer<typeof hAlignSchema>;
  readonly marginLeftPt: number;
  readonly textIndentPt: number;
}

export interface RichDocument {
  readonly styles: readonly CharStyle[];
  readonly paragraphs: readonly RichParagraph[];
}

/** The text an embedded field contributes: `raw` is its value as stored, `formatted` as its picture shows it. */
export interface EmbeddedValue {
  readonly raw: string;
  readonly formatted: string;
}

/** Resolves the `#id` of an `xfa:embed` to the field it names; `undefined` when no field has that id. */
export type EmbedResolver = (id: string) => EmbeddedValue | undefined;
