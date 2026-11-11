/**
 * Layout ceilings. Each one carries its own FD-38 argument, because a file-level claim does not cover the declarations
 * beneath it. All are security invariants: a hostile template or a hostile script-written attribute must not make the
 * layout, or a render tree handed to a browser, grow without bound. Each is chosen with at least ten times the headroom
 * over the largest value measured on the two real government forms (five pages, about 700 containers, 22 text lines
 * in the longest text, 4 explicit choice items), and no firm or operator has a reason to vary it.
 */

/** FD-38 exemption (security invariant): longest text, in characters, `parseMeasure` will scan; real values are under 12. */
export const MAX_MEASURE_CHARS = 64;

/** FD-38 exemption (security invariant): longest text, in characters, `parseMeasureList` will scan (a `columnWidths` list); real lists are under 100. */
export const MAX_MEASURE_LIST_CHARS = 4096;

/** FD-38 exemption (security invariant): most entries in one measurement list; real tables have fewer than 20 columns. */
export const MAX_MEASURE_LIST_ITEMS = 256;

/** FD-38 exemption (security invariant): most pages in one render tree; real forms have 5. */
export const MAX_PAGES = 500;

/** FD-38 exemption (security invariant): most items on one page; real forms have under 2,100. */
export const MAX_ITEMS_PER_PAGE = 50_000;

/** FD-38 exemption (security invariant): most text lines in one text item; the longest real text has 22. */
export const MAX_LINES_PER_TEXT = 2_000;

/** FD-38 exemption (security invariant): most runs in one text line; real lines have under 6. */
export const MAX_RUNS_PER_LINE = 500;

/** FD-38 exemption (security invariant): most characters in one run, one field value or one label; real runs are under 400 characters, real values a few thousand. */
export const MAX_TEXT_CHARS = 100_000;

/** FD-38 exemption (security invariant): most choice items one field carries into the render tree; real lists have a few hundred. */
export const MAX_FIELD_ITEMS = 20_000;

/** FD-38 exemption (security invariant): most font resources in one render tree; real forms have 6. */
export const MAX_FONT_RESOURCES = 64;

/** FD-38 exemption (security invariant): most image resources in one render tree; real forms have 5. */
export const MAX_IMAGE_RESOURCES = 256;

/** FD-38 exemption (security invariant): largest embedded font program, in bytes; the largest real one is 828,746. */
export const MAX_FONT_BYTES = 16 * 1024 * 1024;

/** FD-38 exemption (security invariant): largest decoded image, in bytes of RGBA or passed-through data; the largest real one is about 1.3 MB. */
export const MAX_IMAGE_BYTES = 64 * 1024 * 1024;

/** FD-38 exemption (security invariant): most `issues` entries (features met but not supported, or fallbacks taken) in one render tree. */
export const MAX_ISSUES = 10_000;

/** FD-38 exemption (security invariant): longest `som`, `fontId`, `imageId` and short label, in characters; equal to the SOM resolver's own ceiling (`MAX_SOM_CHARS`; a test holds the two together). */
export const MAX_SHORT_TEXT_CHARS = 16 * 1024;

/** FD-38 exemption (security invariant): longest single `renderCache` entry, in characters, that the reader will parse; real entries are under 500. */
export const MAX_RENDER_CACHE_ENTRY_CHARS = 16 * 1024;

/** FD-38 exemption (security invariant): most `renderCache` entries read for one node; real nodes have under 60. */
export const MAX_RENDER_CACHE_ENTRIES = 5_000;
