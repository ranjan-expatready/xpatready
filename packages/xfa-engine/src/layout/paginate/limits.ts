/**
 * Pagination ceilings and tolerances. Each carries its own FD-38 argument. The page ceiling itself is `MAX_PAGES`
 * (`layout/limits.ts`), the render tree's own.
 */

/**
 * FD-38 exemption (security invariant): most empty pages in a row that the layout itself makes (a page area with no content area, a block that fits nowhere) before pagination gives up; a loop of them must end. Pages left empty by an explicit break do not count: each break element is decided once, so a chain of breaks is finite. Real forms make none, so 3 has headroom (pdf.js v4.10.38 (Apache-2.0) `Template[$toPages]` stops on a `MAX_EMPTY_PAGES` of empty pages in a row; its value was not read, this one is ours); no firm or
 * operator has a reason to vary it.
 */
export const MAX_EMPTY_PAGES = 3;

/**
 * FD-38 exemption (correctness constant): the room, in points, by which a block may overrun what is left of a content
 * area and still be placed in it (pdf.js v4.10.38 (Apache-2.0) `layout.js checkDimensions`: `ERROR = 2`, compared as `Math.round(height - space) <= ERROR`). It absorbs the
 * rounding of the producer's own geometry: IMM5257's validated page is 0.078 mm (0.22 pt) taller than its overflow page
 * and Acrobat still puts it on one page.
 */
export const FIT_TOLERANCE_PT = 2;

/** FD-38 exemption (security invariant): deepest `pageSet` nesting that is read; real forms have one level, none nested. */
export const MAX_PAGE_SET_DEPTH = 16;

/** FD-38 exemption (security invariant): most page areas read from a form (counted form-wide) and, separately, most content areas read from any one page area; real forms have 2 page areas and 1 content area each. */
export const MAX_PAGE_AREAS = 1_000;
