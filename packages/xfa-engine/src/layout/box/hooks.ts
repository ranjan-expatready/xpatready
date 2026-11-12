import type { FormNode } from '../../model/form/index.js';
import type { BoxContext } from './build.js';
import type { Insets, LayoutBox, NominalExtent, PresenceState, Rect } from './types.js';

/** The flowed layouts (W01-T07). `lr-tb`, `rl-tb` and `rl-row` are not modelled; `position` is laid out by `build.ts` itself. */
export type FlowMode = 'tb' | 'row' | 'table';

/** What a flowed layout is asked to arrange: the children of one container, in a provisional frame. */
export interface FlowRequest {
  readonly node: FormNode;
  readonly mode: FlowMode;
  /** The top-left of the container's content region in the provisional frame (the margin insets); a zero-size rectangle. */
  readonly origin: Rect;
  /** The container's effective presence, which its children inherit. */
  readonly presence: PresenceState;
  /** The content width in points when the container's `w` is given, undefined while it grows to its children. */
  readonly contentWidthPt: number | undefined;
  /** The content height in points when the container's `h` is given, undefined while it grows to its children. */
  readonly contentHeightPt: number | undefined;
  /**
   * The content width the children may use: `contentWidthPt` when the container's `w` is given, else what its own parent
   * offers less its margins, else undefined (nothing bounds it). A child with an open width wraps its text at it.
   */
  readonly availableWidthPt: number | undefined;
  readonly ctx: BoxContext;
  readonly depth: number;
}

/** The arranged children, in the provisional frame, and how far they reach from `origin` to the right and down. */
export interface FlowArrangement {
  readonly children: readonly LayoutBox[];
  readonly reachWidthPt: number;
  readonly reachHeightPt: number;
}

/** Places the children of a `tb`, `row` or `table` container (W01-T07). */
export type FlowArranger = (request: FlowRequest) => FlowArrangement;

/** A draw or field whose `w` or `h` the template leaves out, asked for the size its content needs (W01-T07). */
export interface ContentExtentRequest {
  readonly node: FormNode;
  /** The nominal extent: a given dimension, or the `minW` / `minH` floor with its growable flag. */
  readonly extent: NominalExtent;
  /** The node's own `margin` insets. */
  readonly insets: Insets;
  /** The width the container offers a child with an open width (see `FlowRequest.availableWidthPt`), or undefined when nothing bounds it: the text is then not wrapped. */
  readonly availableWidthPt: number | undefined;
  readonly ctx: BoxContext;
}

/**
 * The outer size the content needs (margin insets and caption included), and the caption reserve it used so the final
 * split does not ask again. Only the growable dimensions of `extent` are taken from it.
 */
export interface ContentExtent {
  readonly widthPt: number;
  readonly heightPt: number;
  readonly captionReserve?: number | 'auto';
}

export type ContentExtentHook = (request: ContentExtentRequest) => ContentExtent | undefined;

/** A size forced on a box by its container (a cell's column width): the box is not growable in that dimension. */
export interface ForcedSize {
  readonly widthPt?: number;
}
