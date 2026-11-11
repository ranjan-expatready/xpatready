import { boxedChildren, buildBox, discardingSink, layoutModeOf, peekPresence, translateBox, ZERO_RECT, type FlowArrangement, type FlowArranger, type FlowRequest, type ForcedSize, type LayoutBox } from '../box/index.js';
import { colSpanOf, columnWidthsOf, columnWidthsOfTable, totalWidth } from './columns.js';
import { stretchHeight } from './stretch.js';

/** `box` moved so that its top-left corner is at (xPt, yPt). Children are built at the frame origin and then moved to their slot, so a child's own `x`, `y` and anchor play no part in a flow. */
const placedAt = (box: LayoutBox, xPt: number, yPt: number): LayoutBox => translateBox(box, xPt - box.rect.xPt, yPt - box.rect.yPt);

/** The height `box` takes up in its parent's flow: its own, or more when its content overflows the height it was given (`flowHeightPt`). The width it takes up is always its own. */
const flowHeight = (box: LayoutBox): number => box.flowHeightPt ?? box.rect.heightPt;

/**
 * A `para hAlign` other than `left` on the flowed container itself would align its children in it, which is not applied
 * (pdf.js never aligns flowed children; the corpus has no `para` on any subform). Reported once, on the container. A
 * child's own `para` is its text alignment, the text layer's, and is not looked at here.
 */
function reportContainerAlignment(request: FlowRequest): void {
  const hAlign = request.node.childrenOfClass('para')[0]?.attr('hAlign');
  if (hAlign !== undefined && hAlign !== '' && hAlign !== 'left') request.ctx.sink.add(request.node, `flowed child alignment not applied (para hAlign="${hAlign}")`);
}

/**
 * `tb` and `table`: the children stacked from the top, each at the left edge of the content region, the next below what the
 * last that takes space takes up. A `hidden` child takes none (it is placed at the current position and does not
 * advance), an `invisible` one does; a flowed container whose content overflows its given size takes up the content
 * (`flowHeightPt`), so the next sibling lands after the overflow. A child's own `x` and `y` are ignored. A table with no `w` is
 * at least the sum of its `columnWidths` wide.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `layout.js addHTML` cases `tb` / `table` (height accumulates the child bbox
 * heights, width is the widest) and `getAvailableSpace` (the space left is the container less what is used);
 * `html_utils.js fixDimensions` zeroes a child's `x` / `y` when its parent's layout is not `position` and sets a table's
 * missing `w` to the sum of its `columnWidths`. The XFA 3.3 page for the same rules is uncited (the specification PDF is unreachable).
 */
function stack(request: FlowRequest): FlowArrangement {
  const { node, mode, origin, presence, ctx, depth } = request;
  reportContainerAlignment(request);
  const children: LayoutBox[] = [];
  let yPt = origin.yPt;
  let widest = 0;
  for (const child of boxedChildren(node)) {
    const box = placedAt(buildBox(child, ZERO_RECT, presence, ctx, depth + 1, {}, request.availableWidthPt), origin.xPt, yPt);
    children.push(box);
    if (!box.occupiesSpace) continue;
    yPt += flowHeight(box);
    widest = Math.max(widest, box.rect.widthPt);
  }
  // A table reads its columnWidths once, with the real sink, so a malformed list is reported even when no row ever asks for it.
  const columns = mode === 'table' ? columnWidthsOfTable(node, node, ctx.sink) : undefined;
  return { children, reachWidthPt: Math.max(widest, columns === undefined || request.contentWidthPt !== undefined ? 0 : totalWidth(columns)), reachHeightPt: yPt - origin.yPt };
}

/** The forced width of the cell that spans `span` columns from `column` (undefined: the cell keeps its own width), the columns it uses up, and the 1-based number of the first negative column it spans. */
function columnFor(columns: readonly number[], column: number, span: number): { readonly forced: ForcedSize; readonly used: number; readonly beyond: boolean; readonly negativeEntry: number | undefined; readonly short: boolean } {
  const used = span === -1 ? Math.max(0, columns.length - column) : span;
  const covered = columns.slice(column, column + used);
  if (covered.length === 0) return { forced: {}, used: Math.max(1, used), beyond: true, negativeEntry: undefined, short: false };
  const first = covered.findIndex((width) => width < 0);
  // A negative entry imposes no width: a cell spanning only such columns keeps its own, one spanning others takes theirs.
  const imposes = !covered.every((width) => width < 0);
  return { forced: imposes ? { widthPt: totalWidth(covered) } : {}, used, beyond: false, negativeEntry: first < 0 ? undefined : column + first + 1, short: covered.length < used };
}

/**
 * `row`: the cells left to right, each as wide as the columns it spans (`columnWidths` of the parent table, one column
 * per `colSpan` of each cell that takes space; a `hidden` cell takes none) and all as tall as the tallest, which is the
 * row height (a given row `h` is the floor). A cell with no column (the list is shorter, absent, or the entry negative)
 * keeps its own width. A cell the box layer refuses (`colSpan` other than 1) is a placeholder as wide as the columns it spans.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `layout.js addHTML` case `row` (width is the sum of the cell bbox widths,
 * height the tallest, every cell's style height set to it) and `html_utils.js converters.dimensions` / `fixDimensions` (the cell
 * width is the sum of the `colSpan` columns from the current one, `-1` all the rest; the current column then advances by
 * `colSpan`). A hidden subform returns before pdf.js's `fixDimensions`, so it uses no column; for a hidden field or draw that
 * was not read.
 */
function row(request: FlowRequest): FlowArrangement {
  const { node, origin, presence, ctx, depth } = request;
  reportContainerAlignment(request);
  // A row in a table leaves a malformed list to the table, which reports it once; a row elsewhere reports it itself.
  const columns = columnWidthsOf(node, node.parent !== null && layoutModeOf(node.parent) === 'table' ? discardingSink() : ctx.sink);
  const cells: LayoutBox[] = [];
  let xPt = origin.xPt;
  let column = 0;
  let tallest = 0;
  let beyond = false;
  for (const child of boxedChildren(node)) {
    const next = peekPresence(child, presence);
    const takesRoom = next === 'visible' || next === 'invisible';
    let forced: ForcedSize = {};
    if (takesRoom && columns !== undefined) {
      const spanned = columnFor(columns, column, colSpanOf(child));
      forced = spanned.forced;
      beyond ||= spanned.beyond;
      if (spanned.short) ctx.sink.add(child, `colSpan ${colSpanOf(child)} runs past the last column (${columns.length - column} left; the cell spans only those)`);
      if (spanned.negativeEntry !== undefined) {
        const outcome = spanned.forced.widthPt === undefined ? 'the cell keeps its own width' : `that column adds no width; the cell is as wide as the other columns it spans, ${spanned.forced.widthPt}pt`;
        ctx.sink.add(child, `columnWidths entry ${spanned.negativeEntry} is negative (${outcome})`);
      }
      column += spanned.used;
    }
    const box = placedAt(buildBox(child, ZERO_RECT, presence, ctx, depth + 1, forced), xPt, origin.yPt);
    cells.push(box);
    if (!box.occupiesSpace) continue;
    xPt += box.rect.widthPt;
    tallest = Math.max(tallest, flowHeight(box));
  }
  if (beyond) ctx.sink.add(node, `more cells than columnWidths entries (${columns?.length ?? 0}; the extra cells keep their own widths)`);
  const rowHeight = Math.max(tallest, request.contentHeightPt ?? 0);
  const stretched = cells.map((cell) => (cell.occupiesSpace ? stretchHeight(cell, rowHeight) : cell));
  return { children: stretched, reachWidthPt: xPt - origin.xPt, reachHeightPt: tallest };
}

/** Arranges the children of a `tb`, `row` or `table` container (W01-T07); plugs into `LayoutOptions.flow`. */
export const arrangeFlow: FlowArranger = (request) => (request.mode === 'row' ? row(request) : stack(request));
