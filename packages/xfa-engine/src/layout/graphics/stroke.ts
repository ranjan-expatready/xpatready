import { z } from 'zod';
import type { EdgeSide, RgbColour, StrokeStyle } from '../box/types.js';
import { XfaLayoutError } from '../errors.js';
import { strokeSchema } from '../render-tree.js';

/**
 * Stroke looks: the parts a stroke is painted in, and the dash pattern of a broken one.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Edge[$toStyle]` maps the nine XFA stroke names to CSS border
 * styles: `solid` solid; `dashed`, `dashDot`, `dashDotDot` dashed; `dotted` dotted; `embossed` ridge; `etched` groove;
 * `lowered` inset; `raised` outset. The browser then shades the two tones itself. This module does the same job without a
 * browser: `lowered` / `raised` are one band painted in one of two tones by side, `etched` / `embossed` two half bands.
 */

/**
 * FD-38 exemption (correctness constant): how far toward black (the dark tone) or toward white (the light tone) the two
 * tones of a lowered, raised, etched or embossed stroke lie from the edge colour. A fact of the drawing rule, not a
 * setting. UNCONFIRMED against Acrobat (no corpus form paints the grooved styles and the XFA 3.3 text was not
 * reachable): W02-T13 checks the two real cases (`lowered` text boxes, `raised` buttons) side by side.
 */
const SHADE_RATIO = 0.5;

export const darker = (colour: RgbColour): RgbColour => [Math.round(colour[0] * (1 - SHADE_RATIO)), Math.round(colour[1] * (1 - SHADE_RATIO)), Math.round(colour[2] * (1 - SHADE_RATIO))];

export const lighter = (colour: RgbColour): RgbColour => [
  Math.round(colour[0] + (255 - colour[0]) * SHADE_RATIO),
  Math.round(colour[1] + (255 - colour[1]) * SHADE_RATIO),
  Math.round(colour[2] + (255 - colour[2]) * SHADE_RATIO),
];

/** A colour as the render tree's own mutable `[r, g, b]` tuple (the one conversion of this module). */
export const toColour = (colour: RgbColour): [number, number, number] => [colour[0], colour[1], colour[2]];

/** One band of a stroke: `share` of the stroke's thickness, painted `colour` in `stroke` (never a 3D style: those become two tones). Listed outermost first. */
export interface StrokePart {
  readonly colour: RgbColour;
  readonly stroke: Exclude<StrokeStyle, 'embossed' | 'etched' | 'lowered' | 'raised'>;
  readonly share: number;
}

/** The top and left sides catch the shadow of a sunken stroke; the bottom and right sides catch its light. */
const LEADING_SIDES: ReadonlySet<EdgeSide> = new Set<EdgeSide>(['top', 'left']);

/**
 * The parts a stroke of `stroke` on `side` is painted in. A plain or broken stroke is one part of the edge colour.
 * `lowered` is one part, dark on the top and left, light on the bottom and right; `raised` the reverse. `etched` is two
 * half-thickness parts, the outer one dark and the inner one light on the top and left and the opposite on the bottom and
 * right; `embossed` the reverse of `etched`.
 */
export function strokeParts(stroke: StrokeStyle, side: EdgeSide, colour: RgbColour): readonly StrokePart[] {
  const leading = LEADING_SIDES.has(side);
  switch (stroke) {
    case 'lowered':
      return [{ colour: leading ? darker(colour) : lighter(colour), stroke: 'solid', share: 1 }];
    case 'raised':
      return [{ colour: leading ? lighter(colour) : darker(colour), stroke: 'solid', share: 1 }];
    case 'etched':
      return leading
        ? [{ colour: darker(colour), stroke: 'solid', share: 0.5 }, { colour: lighter(colour), stroke: 'solid', share: 0.5 }]
        : [{ colour: lighter(colour), stroke: 'solid', share: 0.5 }, { colour: darker(colour), stroke: 'solid', share: 0.5 }];
    case 'embossed':
      return leading
        ? [{ colour: lighter(colour), stroke: 'solid', share: 0.5 }, { colour: darker(colour), stroke: 'solid', share: 0.5 }]
        : [{ colour: darker(colour), stroke: 'solid', share: 0.5 }, { colour: lighter(colour), stroke: 'solid', share: 0.5 }];
    default:
      return [{ colour, stroke, share: 1 }];
  }
}

/**
 * FD-38 exemption (correctness constant): the lengths, in multiples of the stroke thickness, of the dashes (even
 * positions) and gaps (odd positions) of each broken stroke. Presentation proportions in the manner of a browser's dashed
 * and dotted borders; UNCONFIRMED against Acrobat (no corpus form draws a broken stroke).
 */
const DASH_UNITS: Readonly<Record<'dashed' | 'dotted' | 'dashDot' | 'dashDotDot', readonly number[]>> = {
  dashed: [3, 2],
  dotted: [1, 1],
  dashDot: [3, 2, 1, 2],
  dashDotDot: [3, 2, 1, 2, 1, 2],
};

const dashArgumentsSchema = z.object({ stroke: strokeSchema, thicknessPt: z.number().finite().nonnegative() }).strict();

/**
 * The dash pattern of a stroke in points (an SVG `stroke-dasharray`), the rule a viewer applies to the `stroke` name of a
 * `line` item (public API, W02-T12). Empty for a solid stroke, and for the 3D styles: the tree carries those as solid bands
 * in two tones (`strokeParts`), so an item never asks for a pattern of them. A stroke name the tree does not have, or a
 * thickness that is not a finite number of at least 0, throws `XfaLayoutError('INVALID_ARGUMENT')`.
 */
export function dashArrayOf(stroke: StrokeStyle, thicknessPt: number): readonly number[] {
  const parsed = dashArgumentsSchema.safeParse({ stroke, thicknessPt });
  if (!parsed.success) throw new XfaLayoutError('INVALID_ARGUMENT', `dashArrayOf: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  if (stroke !== 'dashed' && stroke !== 'dotted' && stroke !== 'dashDot' && stroke !== 'dashDotDot') return [];
  return DASH_UNITS[stroke].map((unit) => unit * thicknessPt);
}
