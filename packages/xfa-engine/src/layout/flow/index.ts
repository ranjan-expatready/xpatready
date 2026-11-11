/**
 * Flowed layouts (W01-T07): `tb`, `row` and `table` containers, growable heights and widths, and the whole form in one
 * unbounded content area. Internal to the engine until W02-T12 decides the public surface.
 *
 * - `layoutFlow(dom, text)`: the root subform's `LayoutBox` tree, the text of every drawn box and the issues.
 * - `createFlowContext` / `layoutMasterPage`: one master page laid out on its own (W02-T09: once per page instance, after that instance's scripts ran).
 * - `arrangeFlow` / `createContentExtent`: the two hooks `layoutFlow` gives `LayoutOptions` (`flow`, `contentExtent`), for a
 *   caller that lays out a part of a form with `layoutBoxes`.
 */
export { arrangeFlow } from './arrange.js';
export { columnWidthsOf } from './columns.js';
export { createContentExtent } from './content-extent.js';
export { createFlowContext, layoutFlow, layoutMasterPage, type FlowLayout, type MasterPageLayout } from './layout-flow.js';
export { stretchHeight } from './stretch.js';
