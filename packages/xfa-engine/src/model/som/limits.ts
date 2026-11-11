import { MAX_SOM_CHARS } from '../../wire-limits.js';

/** Declared in `wire-limits.ts` (the protocol's schemas need it without the model); the argument for the ceiling is there. */
export { MAX_SOM_CHARS };

/**
 * FD-38 exemption (security invariant): most segments in one SOM expression. Template nesting is capped at 256 levels
 * (`MAX_XML_DEPTH`), so the absolute path of any legal node, with the `xfa` and model segments in front, always fits;
 * the real forms nest 13 deep. No firm or operator has a reason to vary it.
 */
export const MAX_SOM_SEGMENTS = 512;

/**
 * FD-38 exemption (security invariant): longest name in one segment, in characters. Equal to the longest data element
 * name the form DOM writes (`MAX_NAME_CHARS`); longer template names are addressed by `#class[n]` instead. The real
 * forms' longest name is under 40 characters. No firm or operator has a reason to vary it.
 */
export const MAX_SOM_NAME_CHARS = 256;

/**
 * FD-38 exemption (correctness constant): most digits in a `[n]` index. Nine digits cover any sibling count the form
 * ceiling (one million nodes) allows and keep the value an exact integer.
 */
export const MAX_SOM_INDEX_DIGITS = 9;

/**
 * FD-38 exemption (security invariant): most nodes one resolution may return or carry between segments. `a[*].b[*]`
 * over a hostile form would otherwise build a list as large as the form; this equals the per-list item ceiling of the
 * form DOM (`MAX_ITEMS_PER_LIST`). The real forms' widest wildcard returns about 9,000 data nodes (a lookup list). No
 * firm or operator has a reason to vary it.
 */
export const MAX_SOM_RESULTS = 100_000;
