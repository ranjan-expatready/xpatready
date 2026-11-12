import { z } from 'zod';
import { borderHandSchema, cornerJoinSchema } from '../../model/form/attributes.js';
import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaLayoutError } from '../errors.js';
import { colourSchema, cornerSideSchema, edgeSideSchema, strokeSchema } from '../render-tree.js';
import { enumAttr, sizeAttr } from './attributes.js';
import type { IssueSink } from './issues.js';
import { presenceSchema, type BorderCorner, type BorderEdge, type BorderStyle, type CornerSide, type EdgeSide, type RgbColour } from './types.js';

/** The text of a colour, `r,g,b` with spaces allowed, checked into the render tree's own colour tuple (integer channels 0 to 255). */
const colourTextSchema = z
  .string()
  .regex(/^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/)
  .transform((text) => text.split(',').map(Number))
  .pipe(colourSchema);

/** The sides of a box in XFA edge order, clockwise from the top (the render tree's own enumeration). */
export const EDGE_SIDES: readonly EdgeSide[] = edgeSideSchema.options;
/** The corners of a box in XFA corner order, clockwise from the top left (the render tree's own enumeration). */
export const CORNER_SIDES: readonly CornerSide[] = cornerSideSchema.options;
/** FD-38 exemption (correctness constant): the value of the `hand` property as a number, a fact of the format. */
const HAND: Readonly<Record<z.infer<typeof borderHandSchema>, -1 | 0 | 1>> = { left: -1, even: 0, right: 1 };

const BLACK: RgbColour = [0, 0, 0];

/** Runs `read`; a value the engine does not model is reported against `node` and `fallback` is used instead. */
export function guarded<T>(node: FormNode, sink: IssueSink, what: string, read: () => T, fallback: T): T {
  try {
    return read();
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    sink.add(node, `${what}: ${error.message}`);
    return fallback;
  }
}

/** The `r,g,b` text of a colour; anything else is `LAYOUT_UNSUPPORTED`. */
export function parseColour(text: string): RgbColour {
  const parsed = colourTextSchema.safeParse(text);
  if (!parsed.success) throw new XfaLayoutError('LAYOUT_UNSUPPORTED', `colour not supported (${safeText(text)})`);
  return parsed.data;
}

/** The `value` of the `color` child of `owner` (a written one, else the XFA default for the class); black when there is none. */
function colourOf(owner: FormNode, sink: IssueSink, fallback: RgbColour): RgbColour {
  const text = owner.property('color')?.attr('value');
  return text === undefined ? fallback : guarded(owner, sink, 'colour', () => parseColour(text), fallback);
}

/**
 * Fills the four slots from the 1 to 4 elements a border writes by repeating the LAST one: `[a]` is all four sides,
 * `[a, b]` is `[a, b, b, b]`, `[a, b, c]` is `[a, b, c, c]`. This is pdf.js `Border[$getExtra]` for edges
 * (`edges.at(-1)`) and `Border[$toStyle]` for corners (`cornerStyles.at(-1)`), adopted per plan decision PA-4. The
 * XFA 3.3 text for the rule was not read (the specification PDF is unreachable from this session), so no page is cited.
 * Neither real form writes 2 or 3 edges or corners; they write 0, 1 or 4.
 */
function repeatToFour<T>(items: readonly T[]): readonly T[] {
  const last = items.at(-1);
  if (last === undefined) return [];
  return [0, 1, 2, 3].map((i) => items[i] ?? last);
}

function stroke(node: FormNode, sink: IssueSink): BorderEdge['stroke'] {
  return guarded(node, sink, 'stroke', () => enumAttr(node, 'stroke', strokeSchema, 'solid'), 'solid');
}

function readEdge(node: FormNode, side: EdgeSide, sink: IssueSink): BorderEdge {
  const presence = guarded(node, sink, 'edge presence', () => enumAttr(node, 'presence', presenceSchema, 'visible'), 'visible');
  return {
    side,
    visible: presence === 'visible',
    thicknessPt: guarded(node, sink, 'edge thickness', () => sizeAttr(node, 'thickness', sink) ?? 0, 0),
    colour: colourOf(node, sink, BLACK),
    stroke: stroke(node, sink),
  };
}

function readCorner(node: FormNode, corner: CornerSide, sink: IssueSink): BorderCorner {
  const presence = guarded(node, sink, 'corner presence', () => enumAttr(node, 'presence', presenceSchema, 'visible'), 'visible');
  return {
    corner,
    visible: presence === 'visible',
    radiusPt: guarded(node, sink, 'corner radius', () => sizeAttr(node, 'radius', sink) ?? 0, 0),
    inverted: node.attr('inverted') === '1',
    join: guarded(node, sink, 'corner join', () => enumAttr(node, 'join', cornerJoinSchema, 'square'), 'square'),
    thicknessPt: guarded(node, sink, 'corner thickness', () => sizeAttr(node, 'thickness', sink) ?? 0, 0),
    colour: colourOf(node, sink, BLACK),
    stroke: stroke(node, sink),
  };
}

/** The written children of `className`, or the one XFA default when the border writes none. */
function sourcesOf(border: FormNode, className: 'edge' | 'corner', sink: IssueSink): readonly FormNode[] {
  const all = border.childrenOfClass(className);
  if (all.length > EDGE_SIDES.length) sink.add(border, `${all.length} ${className} elements (only the first ${EDGE_SIDES.length} are used)`);
  const written = all.slice(0, EDGE_SIDES.length);
  if (written.length > 0) return written;
  const fallback = border.element(className, 0);
  return fallback === undefined ? [] : [fallback];
}

const SOLID_ALTERNATIVES: ReadonlySet<string> = new Set(['linear', 'radial', 'pattern', 'stipple']);

/** The solid colour of a visible fill; a gradient or pattern is drawn as the fill's colour and reported. */
function fillOf(border: FormNode, sink: IssueSink): RgbColour | undefined {
  const fill = border.childrenOfClass('fill')[0];
  if (fill === undefined) return undefined;
  const presence = guarded(fill, sink, 'fill presence', () => enumAttr(fill, 'presence', presenceSchema, 'visible'), 'visible');
  if (presence !== 'visible') return undefined;
  const other = fill.children.find((child) => SOLID_ALTERNATIVES.has(child.className));
  if (other !== undefined) sink.add(fill, `fill ${other.className} (drawn as the fill colour)`);
  return colourOf(fill, sink, [255, 255, 255]);
}

function styleOf(border: FormNode | undefined, sink: IssueSink): BorderStyle | undefined {
  if (border === undefined) return undefined;
  const presence = guarded(border, sink, 'border presence', () => enumAttr(border, 'presence', presenceSchema, 'visible'), 'visible');
  if (presence !== 'visible') return undefined;
  const edges = repeatToFour(sourcesOf(border, 'edge', sink).map((node, i) => readEdge(node, EDGE_SIDES[i] ?? 'top', sink)));
  const corners = repeatToFour(sourcesOf(border, 'corner', sink).map((node, i) => readCorner(node, CORNER_SIDES[i] ?? 'topLeft', sink)));
  const fill = fillOf(border, sink);
  const hand = HAND[guarded(border, sink, 'border hand', () => enumAttr(border, 'hand', borderHandSchema, 'even'), 'even')];
  return {
    edges: edges.map((edge, i) => ({ ...edge, side: EDGE_SIDES[i] ?? edge.side })),
    corners: corners.map((corner, i) => ({ ...corner, corner: CORNER_SIDES[i] ?? corner.corner })),
    ...(fill === undefined ? {} : { fill }),
    hand,
  };
}

/**
 * How the container's own `border` is drawn, or `undefined` when the template writes none or hides it. A border the
 * template does not write is NOT the XFA default border node (that node answers script reads; it draws nothing). A
 * value the engine does not model (an odd stroke, colour or presence) falls back to the XFA default and is reported
 * against the node in `sink`. `hand` is recorded as -1, 0 or 1 for W02-T10.
 */
export function borderStyleOf(node: FormNode, sink: IssueSink): BorderStyle | undefined {
  return styleOf(node.childrenOfClass('border')[0], sink);
}

/** The border of the field's widget (`ui.<widget>.border`), kept apart from the container border. */
export function widgetBorderStyleOf(node: FormNode, sink: IssueSink): BorderStyle | undefined {
  const widget = node.childrenOfClass('ui')[0]?.oneOfChild;
  return widget === undefined ? undefined : styleOf(widget.childrenOfClass('border')[0], sink);
}

/**
 * The same reading for any node that carries `edge` / `corner` / `fill` children and a `hand`: a `line`, a `rectangle`
 * (W02-T10 draws them). It adds a name for the existing reader; nothing about `borderStyleOf` changes.
 */
export { styleOf as shapeStyleOf };
