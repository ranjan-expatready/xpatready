import type { FormNode } from '../../model/form/index.js';
import { lengthAttr } from '../box/attributes.js';
import { discardingSink, splitCaption, type ContentExtent, type ContentExtentHook, type ContentExtentRequest, type Insets } from '../box/index.js';
import { readableInsetsOf } from '../box/insets.js';
import { layoutSource, textStyleOf, valueTextOf, widgetOf, wrapsField, type LaidOutText, type TextContext, type TextStyle } from '../text/index.js';
import { verticalMetricsOf } from '../text/layout.js';

/** FD-38 exemption (correctness constant): the XFA default `size` of a `checkButton`, a fact of the format. */
const DEFAULT_CHECK_SIZE_PT = 10;

const atLeastZero = (n: number): number => Math.max(0, n);

/**
 * The width a box with an open `w` may use for its content: what its container offers (`availableWidthPt`) less the
 * box's own margin; undefined when nothing bounds it, and the text is then not wrapped.
 */
const roomOf = (request: ContentExtentRequest): number | undefined =>
  request.availableWidthPt === undefined ? undefined : atLeastZero(request.availableWidthPt - request.insets.leftPt - request.insets.rightPt);

/** The style measured with left alignment: the width a block needs must not depend on where `hAlign` would put its lines in a wider region. */
const measuredLeft = (style: TextStyle): TextStyle => ({ ...style, hAlign: 'left' });

/** How far the lines of `laid` reach to the right of the region's left edge, plus the right margin of the paragraph: the width the text needs to sit as laid out. */
function neededWidth(laid: LaidOutText | undefined, style: TextStyle): number {
  if (laid === undefined) return 0;
  return laid.lines.reduce((most, line) => Math.max(most, line.xPt - laid.region.xPt + line.fitWidthPt), 0) + style.marginRightPt;
}

/** The height of one empty line of the text style's font: what a growable box with no text is as tall as. */
function emptyLineHeight(node: FormNode, style: TextStyle, text: TextContext): number {
  const metrics = verticalMetricsOf(text.resolve(node, style).metrics, style.sizePt);
  return style.spaceAbovePt + metrics.ascentPt + metrics.descentPt + style.spaceBelowPt;
}

/**
 * A draw's size for its text: the text block plus the draw's `margin`. A given `w` wraps the text to it; an open `w`
 * wraps it to the width the container offers (`availableWidthPt`) and takes the width of the widest line, or does not
 * wrap when nothing bounds it. Laid out again in the box it gets, the text breaks at the same places (every line fits).
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Draw[$toHTML]`: when `w` or `h` is empty the size `layoutNode`
 * measured for the text, within the available space, becomes the draw's `w` / `h`. Differences: pdf.js's 1.02 width factor
 * is not applied (the oracle wins, PA-3); alignment does not widen the box (it is measured left-aligned).
 */
function drawExtent(request: ContentExtentRequest, text: TextContext): ContentExtent {
  const { node, extent, insets } = request;
  const style = textStyleOf(node, text.sink);
  const width = extent.growableWidth ? (roomOf(request) ?? 0) : atLeastZero(extent.widthPt - insets.leftPt - insets.rightPt);
  const laid = layoutSource('value', valueTextOf(node), node, measuredLeft(style), { xPt: 0, yPt: 0, widthPt: width, heightPt: 0 }, width > 0, text).text;
  return { widthPt: neededWidth(laid, style) + insets.leftPt + insets.rightPt, heightPt: (laid?.extent.heightPt ?? 0) + insets.topPt + insets.bottomPt };
}

/** The size of the widget part of a field (`ui` element) for its content, before the field's own margin and caption; `roomPt` is the width its text may use (undefined: unbounded, not wrapped). */
function widgetSize(request: ContentExtentRequest, text: TextContext, roomPt: number | undefined): { readonly widthPt: number; readonly heightPt: number } {
  const { node } = request;
  const widget = node.childrenOfClass('ui')[0]?.oneOfChild;
  const widgetInsets: Insets = widget === undefined ? { topPt: 0, rightPt: 0, bottomPt: 0, leftPt: 0 } : readableInsetsOf(widget, text.sink, 'widget margin');
  const insetW = widgetInsets.leftPt + widgetInsets.rightPt;
  const insetH = widgetInsets.topPt + widgetInsets.bottomPt;
  const style = textStyleOf(node, text.sink);
  if (widgetOf(node) === 'checkButton' && widget !== undefined) {
    const size = lengthAttr(widget, 'size') ?? DEFAULT_CHECK_SIZE_PT;
    return { widthPt: size + insetW, heightPt: size + insetH };
  }
  const source = valueTextOf(node);
  if (source.kind === 'none') return { widthPt: insetW, heightPt: emptyLineHeight(node, style, text) + insetH };
  const room = roomPt === undefined ? 0 : atLeastZero(roomPt - insetW);
  const laid = layoutSource('value', source, node, measuredLeft(style), { xPt: 0, yPt: 0, widthPt: room, heightPt: 0 }, room > 0 && wrapsField(node), text).text;
  const height = laid === undefined ? emptyLineHeight(node, style, text) : laid.extent.heightPt;
  return { widthPt: neededWidth(laid, style) + insetW, heightPt: height + insetH };
}

/**
 * A field's size for its content: the widget (its text wrapped to the widget region when it is a `multiLine` text box of
 * a given or offered width, unwrapped otherwise; a check button its `size`) plus the field's `margin` plus the caption
 * strip on its placement axis. A left or right caption takes width and does not add height, a top or bottom one the
 * reverse; a caption wider than its widget (top, bottom) or taller than it (left, right) does not widen or heighten the
 * field.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Field[$toHTML]` for an open `w` or `h`: the widget content
 * size from `layoutNode` within the available space, plus the border, plus the caption (`width += uiW` for left / right /
 * inline, `height += uiH` for top / bottom), plus the margin, held to `minW` / `maxW` and `minH` / `maxH`. Differences: the
 * caption keeps the larger of the two on the other axis (pdf.js takes the caption's alone), the check button size has no
 * border term, and an empty widget is one line of its font (pdf.js: `lineNoGap`).
 */
function fieldExtent(request: ContentExtentRequest, text: TextContext): ContentExtent {
  const { node, extent, insets, ctx } = request;
  const givenW = extent.growableWidth ? undefined : atLeastZero(extent.widthPt - insets.leftPt - insets.rightPt);
  const givenH = extent.growableHeight ? undefined : atLeastZero(extent.heightPt - insets.topPt - insets.bottomPt);
  const widthBasis = givenW ?? roomOf(request);
  const split = node.childrenOfClass('caption').length === 0 ? undefined : splitCaption(node, { xPt: 0, yPt: 0, widthPt: widthBasis ?? 0, heightPt: givenH ?? 0 }, discardingSink(), ctx.captionReserve);
  const strip = split?.captionRect === undefined ? undefined : split;
  const horizontal = strip?.layout.placement === 'left' || strip?.layout.placement === 'right';
  const reserve = strip?.requestedPt ?? 0;
  const widget = widgetSize(request, text, widthBasis === undefined ? undefined : atLeastZero(widthBasis - (horizontal ? reserve : 0)));
  const widthPt = insets.leftPt + insets.rightPt + widget.widthPt + (horizontal ? reserve : 0);
  const heightPt = insets.topPt + insets.bottomPt + widget.heightPt + (strip !== undefined && !horizontal ? reserve : 0);
  return { widthPt, heightPt, ...(strip === undefined ? {} : { captionReserve: strip.layout.auto ? ('auto' as const) : reserve }) };
}

/**
 * The `ContentExtentHook` over a text context (plug into `LayoutOptions.contentExtent`): the size a draw or field whose
 * `w` or `h` the template leaves out needs for its text. A text block that cannot be laid out (reported by the text
 * layer, drawn as a placeholder) needs nothing. The measure uses the same lines the final text layout produces, so the
 * box is exactly as large as its text.
 */
export function createContentExtent(text: TextContext): ContentExtentHook {
  return (request) => {
    if (request.node.className === 'draw') return drawExtent(request, text);
    if (request.node.className === 'field') return fieldExtent(request, text);
    return undefined;
  };
}
