import type { FormNode } from '../../model/form/index.js';
import { XfaLayoutError } from '../errors.js';
import { sizeAttr } from './attributes.js';
import { borderStyleOf, widgetBorderStyleOf } from './border.js';
import { splitCaption, unresolvedReserve, type CaptionReserveHook } from './caption.js';
import { nominalExtent, placeInParent, type Placement } from './geometry.js';
import type { ContentExtent, ContentExtentHook, FlowArranger, FlowMode, ForcedSize } from './hooks.js';
import { insetsOf, localContentRect } from './insets.js';
import { discardingSink, IssueSink } from './issues.js';
import { MAX_BOX_DEPTH, SIZE_EPSILON_PT } from './limits.js';
import { flagsOf, presenceOf } from './presence.js';
import { translateBox } from './translate.js';
import type { BoxIssue, CaptionLayout, Insets, LayoutBox, LayoutMode, NominalExtent, PresenceState, Rect } from './types.js';
import { CONTAINER_CLASSES, layoutModeOf, unsupportedFeatureOf } from './unsupported.js';

/** The classes that get a box. Properties (`border`, `margin`, `ui`, ...) and master-page elements (`pageSet`, ...) do not. */
const BOXED_CLASSES: ReadonlySet<string> = new Set(['subform', 'exclGroup', 'field', 'draw', 'area']);
const CAPTION_OWNERS: ReadonlySet<string> = new Set(['field', 'exclGroup']);

export interface LayoutOptions {
  /** Supplies the caption reserve when the template gives none (W01-T05). Without it such a caption keeps no space and is reported. */
  readonly captionReserve?: CaptionReserveHook;
  /** Arranges the children of `tb`, `row` and `table` containers (W01-T07). Without it such a container gets a box and its children none, and an issue says so. */
  readonly flow?: FlowArranger;
  /** Sizes a draw or field whose `w` or `h` the template leaves out from its content (W01-T07). Without it such a box keeps its `minW` / `minH` floor. */
  readonly contentExtent?: ContentExtentHook;
}

/** What one layout run shares: where issues go and how an automatic caption reserve is answered. */
export class BoxContext {
  readonly sink = new IssueSink();
  readonly captionReserve: CaptionReserveHook;
  readonly flow: FlowArranger | undefined;
  readonly contentExtent: ContentExtentHook | undefined;

  constructor(options: LayoutOptions = {}) {
    this.captionReserve = options.captionReserve ?? unresolvedReserve;
    this.flow = options.flow;
    this.contentExtent = options.contentExtent;
  }
}

export interface LayoutResult {
  readonly box: LayoutBox;
  readonly issues: readonly BoxIssue[];
}

interface Frame {
  readonly contentRect: Rect;
  readonly captionRect?: Rect;
  readonly widgetRect: Rect;
  readonly caption?: CaptionLayout;
}

const originOf = (rect: Rect): Rect => ({ xPt: rect.xPt, yPt: rect.yPt, widthPt: 0, heightPt: 0 });

/**
 * The caption strip and widget region of `placement`, in the layout frame. A box that is not a field or exclGroup has no
 * caption. `reserve` overrides the context's hook when the caller has already asked it (a growable box asks once, while sizing).
 */
function frameOf(node: FormNode, placement: Placement, insets: Insets, ctx: BoxContext, reserve: CaptionReserveHook = ctx.captionReserve): Frame {
  const local = localContentRect(placement.extent, insets);
  const split = CAPTION_OWNERS.has(node.className) ? splitCaption(node, local, ctx.sink, reserve) : undefined;
  const captionRect = split?.captionRect === undefined ? undefined : placement.toFrame(split.captionRect);
  return {
    contentRect: placement.toFrame(local),
    widgetRect: placement.toFrame(split?.widgetRect ?? local),
    ...(captionRect === undefined ? {} : { captionRect }),
    ...(split === undefined ? {} : { caption: split.layout }),
  };
}

/** A box with no children and no look: the node drawn as a placeholder, with the reason (already reported by the caller). */
function placeholderBox(node: FormNode, placement: Placement, presence: PresenceState, reason: string): LayoutBox {
  return {
    node,
    rect: placement.rect,
    contentRect: placement.rect,
    widgetRect: placement.rect,
    presence,
    ...flagsOf(presence),
    anchorType: placement.anchorType,
    rotation: placement.rotation,
    growableWidth: placement.extent.growableWidth,
    growableHeight: placement.extent.growableHeight,
    placeholder: reason,
    children: [],
  };
}

/** A node whose geometry could not be read: a zero-size placeholder at the parent's content origin. */
function unplaceableBox(node: FormNode, parentContent: Rect, inherited: PresenceState, reason: string): LayoutBox {
  const rect = originOf(parentContent);
  return {
    node,
    rect,
    contentRect: rect,
    widgetRect: rect,
    presence: inherited,
    ...flagsOf(inherited),
    anchorType: 'topLeft',
    rotation: 0,
    growableWidth: false,
    growableHeight: false,
    placeholder: reason,
    children: [],
  };
}

/** The children of a container that get a box, in document order. */
export const boxedChildren = (parent: FormNode): FormNode[] => parent.children.filter((child) => BOXED_CLASSES.has(child.className));

/** The boxes of the children of a container, in document order. */
export function buildChildBoxes(parent: FormNode, frame: Rect, inherited: PresenceState, ctx: BoxContext, depth: number, availableWidthPt?: number): LayoutBox[] {
  return boxedChildren(parent).map((child) => buildBox(child, frame, inherited, ctx, depth, {}, availableWidthPt));
}

function hasBoxedChildren(node: FormNode): boolean {
  return node.children.some((child) => BOXED_CLASSES.has(child.className));
}

/** How far the children that take space reach from `origin`, to the right and down, in points. */
function reachOf(children: readonly LayoutBox[], origin: Rect): { readonly widthPt: number; readonly heightPt: number } {
  let widthPt = 0;
  let heightPt = 0;
  for (const child of children) {
    if (!child.occupiesSpace) continue;
    widthPt = Math.max(widthPt, child.rect.xPt + child.rect.widthPt - origin.xPt);
    heightPt = Math.max(heightPt, child.rect.yPt + child.rect.heightPt - origin.yPt);
  }
  return { widthPt, heightPt };
}

interface Built {
  readonly placement: Placement;
  readonly frame: Frame;
  readonly children: readonly LayoutBox[];
  readonly flowHeightPt?: number;
}

/** The children of a container laid out in a provisional frame whose content origin is `origin`, and how far they reach from it. */
interface Arranged {
  readonly children: readonly LayoutBox[];
  readonly reachWidthPt: number;
  readonly reachHeightPt: number;
}

/** Lays out the children of one container: `origin` is its content origin, the sizes are its content size when `w` / `h` are given, `availableWidthPt` the width an open-width child may use. */
type Arranger = (origin: Rect, contentWidthPt: number | undefined, contentHeightPt: number | undefined, availableWidthPt: number | undefined) => Arranged;

const FLOW_MODES: ReadonlySet<string> = new Set<FlowMode>(['tb', 'row', 'table']);
const isFlowMode = (mode: LayoutMode | undefined): mode is FlowMode => mode !== undefined && FLOW_MODES.has(mode);

/** `value` held to `maxPt` when the template gives one above 0 (the XFA default 0 means no maximum); the second member says it was cut. */
function cappedAt(value: number, maxPt: number | undefined): readonly [number, boolean] {
  return maxPt !== undefined && maxPt > 0 && value > maxPt + SIZE_EPSILON_PT ? [maxPt, true] : [value, false];
}

/**
 * A positioned container whose width or height the template leaves out is as large as its children reach (XFA growable
 * container in position layout), plus its insets and its caption strip, and never below its `minW` / `minH` nor above a
 * `maxW` / `maxH` above 0 (capped, with an issue: the content then overflows the box). A flowed container (`tb`, `row`,
 * `table`; W01-T07) sizes the same way over the flow its arranger produces. One whose size is given keeps it for drawing
 * (its box is the given size) and the children reaching past it are reported; past its given HEIGHT they also make it
 * take up `max(content + margin, given)` of height in its parent's flow (`flowHeightPt`), so the next sibling lands after
 * the overflow, not on top of it. Past its given WIDTH they change nothing else: the flow never sees a width above the given one. The
 * children are laid out once in a provisional frame at the content origin and then moved rigidly to where the final
 * position puts them. `availableWidthPt` is what the parent offers this container's content (undefined when nothing bounds it).
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `Subform[$toHTML]` (template.js) returns the bbox
 * `[x, y, max($extra.width + marginH, w), max($extra.height + marginV, h)]` and sets the style width / height only when
 * `w` / `h` is empty: a given size is drawn as given. The parent's `layout.js addHTML` (`tb` / `table`) advances its height
 * by the bbox height and takes its width as `min(availableSpace.width, max(width, w))`, and the subform offers its children
 * `min(this.w || Infinity, ...)`: so only the height of an overflowing container propagates, never a width above the given. `layout.js addHTML` accumulates the children as `max(x + w)` and `max(y + h)` for `position` and as the sum
 * of heights for `tb` / `table`. The caption strip (which pdf.js does not reserve for a subform) is added on its placement axis.
 */
function growToChildren(node: FormNode, parentContent: Rect, extent: NominalExtent, insets: Insets, ctx: BoxContext, arrange: Arranger, flowed: boolean, inheritedWidthPt: number | undefined): Built {
  const provisional = { xPt: insets.leftPt, yPt: insets.topPt, widthPt: 0, heightPt: 0 };
  const givenW = extent.growableWidth ? undefined : Math.max(0, extent.widthPt - insets.leftPt - insets.rightPt);
  const givenH = extent.growableHeight ? undefined : Math.max(0, extent.heightPt - insets.topPt - insets.bottomPt);
  const availableW = givenW ?? (inheritedWidthPt === undefined ? undefined : Math.max(0, inheritedWidthPt - insets.leftPt - insets.rightPt));
  const arranged = arrange(provisional, givenW, givenH, availableW);
  const children = arranged.children;
  const overflowH = givenH !== undefined ? arranged.reachHeightPt - givenH : 0;
  const overflowW = givenW !== undefined ? arranged.reachWidthPt - givenW : 0;
  const overH = flowed && overflowH > SIZE_EPSILON_PT;
  const overW = flowed && overflowW > SIZE_EPSILON_PT;
  if (overH || overW) {
    const over = [overH ? `${overflowH.toFixed(3)}pt beyond the given h` : '', overW ? `${overflowW.toFixed(3)}pt beyond the given w` : ''].filter((entry) => entry !== '');
    ctx.sink.add(node, `flowed children reach ${over.join(' and ')} (the box keeps the given size; the flow advances by the content height; the content overflows)`);
  }
  const fitted = {
    ...extent,
    widthPt: extent.growableWidth ? Math.max(extent.widthPt, insets.leftPt + arranged.reachWidthPt + insets.rightPt) : extent.widthPt,
    heightPt: extent.growableHeight ? Math.max(extent.heightPt, insets.topPt + arranged.reachHeightPt + insets.bottomPt) : extent.heightPt,
  };
  // The caption strip is carved from the content region, so the box needs the room the caption asks for on top of the children's.
  const probe = CAPTION_OWNERS.has(node.className) ? splitCaption(node, localContentRect(fitted, insets), discardingSink(), ctx.captionReserve) : undefined;
  const horizontal = probe?.layout.placement === 'left' || probe?.layout.placement === 'right';
  const caption = probe?.requestedPt ?? 0;
  const grown = {
    ...fitted,
    widthPt: fitted.widthPt + (extent.growableWidth && horizontal ? caption : 0),
    heightPt: fitted.heightPt + (extent.growableHeight && !horizontal ? caption : 0),
  };
  const [cappedW, cutW] = extent.growableWidth ? cappedAt(grown.widthPt, sizeAttr(node, 'maxW', ctx.sink)) : [grown.widthPt, false];
  const [cappedH, cutH] = extent.growableHeight ? cappedAt(grown.heightPt, sizeAttr(node, 'maxH', ctx.sink)) : [grown.heightPt, false];
  if (cutW) ctx.sink.add(node, `content wider than maxW (capped at ${cappedW}pt; the content overflows)`);
  if (cutH) ctx.sink.add(node, `content taller than maxH (capped at ${cappedH}pt; the content overflows)`);
  const sized = { ...grown, widthPt: cappedW, heightPt: cappedH };
  const placement = placeInParent(node, parentContent, ctx.sink, sized);
  // The hook is asked once: a region-dependent answer (text wrapped to the region) would differ for the grown region and
  // leave the strip a different size from the room just added for it.
  const asked: CaptionReserveHook | undefined = probe === undefined ? undefined : () => (probe.layout.auto ? 'auto' : probe.requestedPt);
  const frame = frameOf(node, placement, insets, ctx, asked);
  const dx = frame.widgetRect.xPt - provisional.xPt;
  const dy = frame.widgetRect.yPt - provisional.yPt;
  const flowHeightPt = overH ? sized.heightPt + overflowH : undefined;
  return { placement, frame, children: children.map((child) => translateBox(child, dx, dy)), ...(flowHeightPt === undefined ? {} : { flowHeightPt }) };
}

function layOut(node: FormNode, parentContent: Rect, placement: Placement, mode: LayoutMode | undefined, insets: Insets, presence: PresenceState, ctx: BoxContext, depth: number, availableWidthPt: number | undefined, asked?: CaptionReserveHook): Built {
  const container = CONTAINER_CLASSES.has(node.className);
  const positioned = container && mode === 'position';
  const flow = ctx.flow;
  if (container && flow !== undefined && isFlowMode(mode)) {
    const arrange: Arranger = (origin, contentWidthPt, contentHeightPt, available) => flow({ node, mode, origin, presence, contentWidthPt, contentHeightPt, availableWidthPt: available, ctx, depth });
    return growToChildren(node, parentContent, placement.extent, insets, ctx, arrange, true, availableWidthPt);
  }
  const grows = positioned && (placement.extent.growableWidth || placement.extent.growableHeight) && hasBoxedChildren(node);
  if (grows) {
    const arrange: Arranger = (origin, _w, _h, available) => {
      const children = buildChildBoxes(node, origin, presence, ctx, depth + 1, available);
      const reach = reachOf(children, origin);
      return { children, reachWidthPt: reach.widthPt, reachHeightPt: reach.heightPt };
    };
    return growToChildren(node, parentContent, placement.extent, insets, ctx, arrange, false, availableWidthPt);
  }
  const frame = frameOf(node, placement, insets, ctx, asked);
  const children = positioned ? buildChildBoxes(node, frame.widgetRect, presence, ctx, depth + 1, frame.widgetRect.widthPt) : [];
  if (mode !== undefined && !positioned) ctx.sink.add(node, `layout="${mode}" (no flow arranger given: the children are not placed)`);
  return { placement, frame, children };
}

/** The reason `node` cannot be laid out here, or undefined: too deep, an unmodelled feature, or a turned container with children. */
function refusalFor(node: FormNode, placement: Placement, depth: number): string | undefined {
  if (depth >= MAX_BOX_DEPTH) return `nesting deeper than ${MAX_BOX_DEPTH} levels`;
  const feature = unsupportedFeatureOf(node);
  if (feature !== undefined) return feature;
  if (CONTAINER_CLASSES.has(node.className) && placement.rotation !== 0 && hasBoxedChildren(node)) return `rotate="${placement.rotation}" on a container with children`;
  return undefined;
}

/** The nominal extent of `node` with the dimensions its container forces on it. */
function forcedExtent(node: FormNode, forced: ForcedSize, ctx: BoxContext): NominalExtent {
  const own = nominalExtent(node, ctx.sink);
  return forced.widthPt === undefined ? own : { ...own, widthPt: forced.widthPt, growableWidth: false };
}

/**
 * A growable draw or field with the size its content asked for: only the growable dimensions are replaced, held to
 * `minW` / `minH` and to a `maxW` / `maxH` above 0 (a `maxW` / `maxH` of 0 or less is no maximum).
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Field[$toHTML]` sizes an open `w` as
 * `min(maxW <= 0 ? Infinity : maxW, minW + 1 < width ? width : minW)` and an open `h` alike; this is the same rule
 * (`minW + 1 < width` is `width` unless it is within a point of the floor, where the floor wins; here the larger of the two).
 */
function grownLeaf(node: FormNode, extent: NominalExtent, measured: ContentExtent, ctx: BoxContext): NominalExtent {
  const [widthPt, cutW] = extent.growableWidth ? cappedAt(Math.max(extent.widthPt, measured.widthPt), sizeAttr(node, 'maxW', ctx.sink)) : [extent.widthPt, false];
  const [heightPt, cutH] = extent.growableHeight ? cappedAt(Math.max(extent.heightPt, measured.heightPt), sizeAttr(node, 'maxH', ctx.sink)) : [extent.heightPt, false];
  if (cutW) ctx.sink.add(node, `content wider than maxW (capped at ${widthPt}pt; the content overflows)`);
  if (cutH) ctx.sink.add(node, `content taller than maxH (capped at ${heightPt}pt; the content overflows)`);
  return { ...extent, widthPt, heightPt };
}

/**
 * The presence `node` will have in a box under a parent of presence `inherited`, without reporting anything; `inherited`
 * when the node's own attributes cannot be read (such a node becomes an unplaceable box with the parent's presence). A
 * flow asks it to count the cells that take room before it builds them.
 */
export function peekPresence(node: FormNode, inherited: PresenceState): PresenceState {
  try {
    return presenceOf(node, inherited, discardingSink()).presence;
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    return inherited;
  }
}

/**
 * Lays out `node` in a parent whose content region is `parentContent` (see `placeInParent`), then its children when
 * `node` is a container: in `position` layout by their own `x` / `y`; in `tb`, `row` or `table` layout by the flow in
 * `ctx.flow` (W01-T07; without one the box is placed, the children are not, and an issue says so). `inherited` is the
 * presence of the parent; `forced` is a size the container of `node` imposes (a table cell's column width);
 * `availableWidthPt` is the width its container offers it (undefined when nothing bounds it). A draw or field with no `w`
 * or `h` takes the size its content asks of `ctx.contentExtent`, wrapping an open width at `availableWidthPt`. A problem with the node's own
 * attributes (an unsupported unit, an angle that is not a quarter turn) or a feature the engine does not model gives a
 * placeholder box and an entry in `ctx.sink`; nothing is skipped silently.
 */
export function buildBox(node: FormNode, parentContent: Rect, inherited: PresenceState, ctx: BoxContext, depth: number, forced: ForcedSize = {}, availableWidthPt?: number): LayoutBox {
  let placement: Placement;
  let presence: PresenceState;
  let relevant: string | undefined;
  try {
    ({ presence, relevant } = presenceOf(node, inherited, ctx.sink));
    placement = placeInParent(node, parentContent, ctx.sink, forcedExtent(node, forced, ctx));
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    ctx.sink.add(node, error.message);
    return unplaceableBox(node, parentContent, inherited, error.message);
  }
  try {
    const refusal = refusalFor(node, placement, depth);
    if (refusal !== undefined) {
      ctx.sink.add(node, refusal);
      return placeholderBox(node, placement, presence, refusal);
    }
    const mode = layoutModeOf(node);
    const insets = insetsOf(node, ctx.sink);
    let asked: CaptionReserveHook | undefined;
    const leaf = node.className === 'draw' || node.className === 'field';
    if (leaf && ctx.contentExtent !== undefined && (placement.extent.growableWidth || placement.extent.growableHeight)) {
      const measured = ctx.contentExtent({ node, extent: placement.extent, insets, availableWidthPt, ctx });
      if (measured !== undefined) {
        placement = placeInParent(node, parentContent, ctx.sink, grownLeaf(node, placement.extent, measured, ctx));
        const reserve = measured.captionReserve;
        if (reserve !== undefined) asked = () => reserve;
      }
    }
    const built = layOut(node, parentContent, placement, mode, insets, presence, ctx, depth, availableWidthPt, asked);
    const border = borderStyleOf(node, ctx.sink);
    const widgetBorder = widgetBorderStyleOf(node, ctx.sink);
    return {
      node,
      rect: built.placement.rect,
      contentRect: built.frame.contentRect,
      widgetRect: built.frame.widgetRect,
      ...(built.frame.captionRect === undefined ? {} : { captionRect: built.frame.captionRect }),
      ...(built.frame.caption === undefined ? {} : { caption: built.frame.caption }),
      presence,
      ...flagsOf(presence),
      ...(relevant === undefined ? {} : { relevant }),
      anchorType: built.placement.anchorType,
      rotation: built.placement.rotation,
      growableWidth: built.placement.extent.growableWidth,
      growableHeight: built.placement.extent.growableHeight,
      ...(mode === undefined ? {} : { layoutMode: mode }),
      ...(border === undefined ? {} : { borderStyle: border }),
      ...(widgetBorder === undefined ? {} : { widgetBorderStyle: widgetBorder }),
      ...(built.flowHeightPt === undefined ? {} : { flowHeightPt: built.flowHeightPt }),
      children: built.children,
    };
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    ctx.sink.add(node, error.message);
    return placeholderBox(node, placement, presence, error.message);
  }
}

/** Lays out `node` and its positioned descendants in `parentContent`; the issues are in the render tree's `issues` shape. */
export function layoutBoxes(node: FormNode, parentContent: Rect, options: LayoutOptions = {}): LayoutResult {
  const ctx = new BoxContext(options);
  const box = buildBox(node, parentContent, 'visible', ctx, 0);
  return { box, issues: ctx.sink.issues };
}
