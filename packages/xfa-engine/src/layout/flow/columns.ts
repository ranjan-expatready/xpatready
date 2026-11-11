import type { FormNode } from '../../model/form/index.js';
import type { IssueSink } from '../box/issues.js';
import { XfaLayoutError } from '../errors.js';
import { parseMeasureList, TEMPLATE_LENGTH_UNIT } from '../units.js';

/**
 * The `columnWidths` list of `table` in points, or undefined when it gives none or the list cannot be read (reported
 * against `owner` in `sink`; the cells then keep their own widths). A negative entry means no width is imposed on that
 * column (the cell keeps its own); it is kept as written so the caller can report it.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `html_utils.js fixDimensions` / `converters.dimensions` take the cell width
 * from the subform parent's `columnWidths` (the sum of the columns from the current one for `colSpan` columns, `-1` all the
 * rest), and `fixDimensions` gives a table with no `w` the sum of its `columnWidths`; `layout.js getAvailableSpace` offers a
 * row's cell the columns from the current one on. The XFA 3.3 page for `columnWidths` is uncited (the specification PDF is
 * unreachable); a unit-less entry is read in `TEMPLATE_LENGTH_UNIT` like every template length.
 */
export function columnWidthsOfTable(table: FormNode | null, owner: FormNode, sink: IssueSink): readonly number[] | undefined {
  const text = table?.attr('columnWidths');
  if (table === null || text === undefined || text.trim() === '') return undefined;
  try {
    return parseMeasureList(text, TEMPLATE_LENGTH_UNIT, 'columnWidths');
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    sink.add(owner, `${error.message} (the cells keep their own widths)`);
    return undefined;
  }
}

/** The column widths a row's cells take: the `columnWidths` of the row's parent (the table). */
export const columnWidthsOf = (row: FormNode, sink: IssueSink): readonly number[] | undefined => columnWidthsOfTable(row.parent, row, sink);

/** The sum of the entries that impose a width (a negative entry imposes none). */
export const totalWidth = (columns: readonly number[]): number => columns.reduce((sum, width) => sum + Math.max(0, width), 0);

/**
 * How many columns a cell spans: its `colSpan` (1 when absent or not a whole number), or -1 for "all the rest".
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `html_utils.js converters.dimensions`: `colSpan === -1` takes every column from the current one.
 */
export function colSpanOf(cell: FormNode): number {
  const text = cell.attr('colSpan')?.trim();
  if (text === undefined || !/^-?\d{1,4}$/.test(text)) return 1;
  const span = Number(text);
  return span === -1 || span >= 1 ? span : 1;
}
