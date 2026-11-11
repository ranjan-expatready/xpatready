import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { cornerJoinSchema } from '../../model/form/attributes.js';
import { cornerSideSchema, edgeSideSchema, strokeSchema, type RenderItem } from '../render-tree.js';

/** A rectangle in points, y growing downward: the render tree's own rectangle, so a box converts without reshaping. */
export type Rect = Extract<RenderItem, { kind: 'box' }>['rect'];

/** The zero-size rectangle at the frame origin: where a child is built before a flow moves it to its slot. */
export const ZERO_RECT: Rect = { xPt: 0, yPt: 0, widthPt: 0, heightPt: 0 };

export const ANCHOR_TYPES = ['topLeft', 'topCenter', 'topRight', 'middleLeft', 'middleCenter', 'middleRight', 'bottomLeft', 'bottomCenter', 'bottomRight'] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

/** Counter-clockwise quarter turns of a container about its anchor point, in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

export const PRESENCE_STATES = ['visible', 'invisible', 'hidden', 'inactive'] as const;
/** The one `presence` enumeration of the box layout (node, caption, border, edge, corner and fill all share it). */
export const presenceSchema = z.enum(PRESENCE_STATES);
export type PresenceState = z.infer<typeof presenceSchema>;

/** The `layout` values of a container. `position` is the default and the only one this module lays out. */
export const LAYOUT_MODES = ['position', 'tb', 'lr-tb', 'rl-tb', 'row', 'rl-row', 'table'] as const;
export type LayoutMode = (typeof LAYOUT_MODES)[number];

export type CaptionPlacement = 'top' | 'bottom' | 'left' | 'right';

export type EdgeSide = z.infer<typeof edgeSideSchema>;
export type CornerSide = z.infer<typeof cornerSideSchema>;
export type StrokeStyle = z.infer<typeof strokeSchema>;
export type RgbColour = readonly [number, number, number];

export interface Insets {
  readonly topPt: number;
  readonly rightPt: number;
  readonly bottomPt: number;
  readonly leftPt: number;
}

/**
 * The size a container asks for before it is placed. A dimension the template does not give (`w` / `h` absent) is
 * growable: it takes its content, which only the flowed layout (W01-T07) and the text measure (W01-T05) can answer, so
 * here it is the `minW` / `minH` floor (0 when none) and the flag says the number is not final.
 */
export interface NominalExtent {
  readonly widthPt: number;
  readonly heightPt: number;
  readonly growableWidth: boolean;
  readonly growableHeight: boolean;
}

export interface BorderEdge {
  readonly side: EdgeSide;
  /** False for an edge the template hides (`presence` other than `visible`). */
  readonly visible: boolean;
  readonly thicknessPt: number;
  readonly colour: RgbColour;
  readonly stroke: StrokeStyle;
}

export interface BorderCorner {
  readonly corner: CornerSide;
  readonly visible: boolean;
  readonly radiusPt: number;
  readonly inverted: boolean;
  readonly join: z.infer<typeof cornerJoinSchema>;
  readonly thicknessPt: number;
  readonly colour: RgbColour;
  readonly stroke: BorderEdge['stroke'];
}

/**
 * How a `border` is drawn, as numbers for the drawing task (W02-T10). `edges` always holds the four sides in the order
 * top, right, bottom, left, and `corners` the four corners clockwise from the top left, after the repeat rule.
 */
export interface BorderStyle {
  readonly edges: readonly BorderEdge[];
  readonly corners: readonly BorderCorner[];
  /** The solid fill colour; absent when the border has no visible fill. */
  readonly fill?: RgbColour;
  /** Which side of the edge line the stroke falls on: -1 `left`, 0 `even`, 1 `right`. Recorded only; W02-T10 gives it geometry. */
  readonly hand: -1 | 0 | 1;
}

export interface CaptionLayout {
  readonly placement: CaptionPlacement;
  /** The space set aside along the placement axis, in points; 0 while `auto` is true. */
  readonly reservePt: number;
  /** True when the template gave no reserve (absent or negative) and the text measure (W01-T05) has not supplied one. */
  readonly auto: boolean;
  /** True when the reserve asked for more than the content region has and was cut to fit. */
  readonly clamped: boolean;
  readonly presence: PresenceState;
}

export interface LayoutBox {
  readonly node: FormNode;
  /** The nominal extent in the frame of the layout (the parent's frame, parent content origin added), after anchor and rotation. */
  readonly rect: Rect;
  /** `rect` less the container's `margin` insets: where the caption, the widget and the children go. */
  readonly contentRect: Rect;
  /** The caption strip, present when the container has a caption that takes space. */
  readonly captionRect?: Rect;
  /** What is left of `contentRect` for the widget once the caption strip is taken (equal to `contentRect` without a caption). */
  readonly widgetRect: Rect;
  readonly caption?: CaptionLayout;
  /** Effective presence: the node's own (print-only `relevant` counts as hidden), made at least as hidden as its parent's. */
  readonly presence: PresenceState;
  /** True for `visible`, `invisible`: the box takes room in a flow. */
  readonly occupiesSpace: boolean;
  /** True only for `visible`. */
  readonly drawn: boolean;
  /** The `relevant` attribute as written, kept for a later print path. */
  readonly relevant?: string;
  readonly anchorType: AnchorType;
  readonly rotation: Rotation;
  readonly growableWidth: boolean;
  readonly growableHeight: boolean;
  /**
   * Present only on a flowed container whose given height its children overflow: the height it takes up in its parent's
   * flow, `max(content + margin, given)` (the box itself keeps the given height). pdf.js `Subform[$toHTML]` returns that
   * as the bbox height the parent advances by, while the box style keeps the given `h`. Height only: the parent's `tb` /
   * `table` bbox width is `min(available, max(width, w))`, so a given `w` never widens what the flow sees.
   */
  readonly flowHeightPt?: number;
  /** How a subform, exclGroup or area places its children; absent for a field or draw. */
  readonly layoutMode?: LayoutMode;
  /** The container's own `border` (absent when the template writes none or hides it). */
  readonly borderStyle?: BorderStyle;
  /** The widget's border (`ui.<widget>.border`), separate from the container's. */
  readonly widgetBorderStyle?: BorderStyle;
  /** Set when the node is drawn as a placeholder, with why. */
  readonly placeholder?: string;
  readonly children: readonly LayoutBox[];
}

/** A layout feature met but not supported, or a fallback taken: the render tree's `issues` entry. */
export interface BoxIssue {
  readonly som: string;
  readonly feature: string;
}
