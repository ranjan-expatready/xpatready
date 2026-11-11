/**
 * FD-38 exemption (security invariant): longest picture source accepted, in UTF-16 characters. Picture text comes
 * from the form file, so it is bounded before any scan; the longest real picture in the forms measured is under 40
 * characters, and no firm or operator has a reason to vary it.
 */
export const MAX_PICTURE_SOURCE_CHARS = 256;

/**
 * FD-38 exemption (security invariant): most clauses (`a{..}|b{..}`) in one picture. Parse and format try clauses
 * in turn, so the count multiplies the work per field; real pictures carry one to three, and no firm or operator
 * has a reason to vary it.
 */
export const MAX_PICTURE_CLAUSES = 8;

/**
 * FD-38 exemption (security invariant): longest pattern between the braces of one clause, in characters. Bounds the
 * per-field work and the size of the compiled layout; real patterns are under 24 characters, and no firm or
 * operator has a reason to vary it.
 */
export const MAX_PICTURE_PATTERN_CHARS = 64;

/**
 * FD-38 exemption (security invariant): most digit slots (`9` and `z`) in one `num` pattern. Bounds the integer and
 * fraction strings the formatter builds; the widest real number picture has 14 slots, and no firm or operator has
 * a reason to vary it.
 */
export const MAX_NUM_DIGIT_SLOTS = 40;

/** FD-38 exemption (correctness constant): the canonical date range starts at year 0001 (four digits, no year 0000). */
export const MIN_YEAR = 1;

/** FD-38 exemption (correctness constant): the canonical date range ends at year 9999 (the last four-digit year). */
export const MAX_YEAR = 9999;
