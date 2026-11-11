/**
 * Why the layout has two tolerances, and why they are not one value.
 *
 * - `SIZE_EPSILON_PT` (here) and `LINE_HEIGHT_EPSILON_PT` (`text/block.ts`) are 0.001 pt, a millipoint: the resolution of
 *   the template's own numbers and of the renderCache. They answer "are these two numbers the same number?" (a size not
 *   exceeded, a stretch not made, a line height not smaller than the natural one), so anything finer is noise and anything
 *   coarser would call different numbers equal.
 * - `FIT_EPSILON_PT` (`text/wrap.ts`) is 0.01 pt, ten times larger. It answers a different question, "does this text fit the
 *   space?", and is derived from the oracle, not from the number format: Acrobat accepts a line 0.003 pt and 0.001 pt wider than
 *   its space (the renderCache rounds the box and its insets to whole millipoints), while the narrowest overflow it rejects in
 *   the corpus is 0.55 pt (W01-T05 evidence). 0.01 pt sits between the two.
 * Merging them in either direction breaks something: 0.001 would reject the two real lines Acrobat fits, and 0.01 would call
 * sizes that differ by up to ten millipoints equal. Each constant carries its own FD-38 exemption; none is a setting.
 */

/**
 * FD-38 exemption (security invariant): deepest container nesting the box layout will descend; a hostile form must not
 * overflow the call stack. Real forms nest under 10 deep, so this has more than ten times the headroom, and no firm or
 * operator has a reason to vary it.
 */
export const MAX_BOX_DEPTH = 128;

/**
 * FD-38 exemption (correctness constant): the tolerance, in points, below which a size is not called exceeded, and below
 * which a stretch is not made: a millipoint, the resolution of the template's own numbers (and of the renderCache). It is
 * a fact of the number format, not a setting. See the note at the top of this file for why `FIT_EPSILON_PT` is a different value.
 */
export const SIZE_EPSILON_PT = 0.001;
