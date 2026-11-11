/**
 * Graphics (W02-T10): every stroke and fill Acrobat paints, as render-tree items the browser can draw with SVG.
 * Internal to the engine until W02-T12 decides the public surface.
 *
 * - `layoutBoxGraphics(root, sink)` / `graphicsOfBox`: the items of a whole `LayoutBox` tree / of one box, in the layout frame
 *   of their tree (as `layoutBoxTexts` / `toTextItem` give the text), in paint order: container border, then the widget
 *   chrome or the line / rectangle of a draw. A placeholder box is a `placeholder` item; a visible barcode field is a
 *   `placeholder` with reason `barcode`.
 * - `shapeItems(rect, style)`: one border or shape (fill, then one `line` item per stroke band of each visible side, or one
 *   `box` item when a corner is round).
 * - `dashArrayOf`, `strokeParts`: the dash pattern of a broken stroke and the tones of the 3D ones.
 * - `isChecked` / `checkBoxOf` / `markItems`: the check box state, its square and mark, and the vector marks.
 */
export { BARCODE_PLACEHOLDER_REASON, graphicsOfBox, layoutBoxGraphics, type BoxGraphics } from './box-graphics.js';
export { checkBoxOf, isChecked, type CheckBoxGeometry } from './check-button.js';
export { markItems, type MarkKind } from './marks.js';
export { effectiveRadiusPt, shapeItems, type OutlineOptions } from './outline.js';
// `dashArrayOf` is the dash rule for the viewer: W02-T12 exports it publicly.
export { dashArrayOf, darker, lighter, strokeParts, type StrokePart } from './stroke.js';
