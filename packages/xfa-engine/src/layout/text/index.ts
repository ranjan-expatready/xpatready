/**
 * Plain text layout (W01-T05): the lines, baselines and positions of the text of draws, fields and captions, and the
 * caption auto-reserve. Internal to the engine until W02-T12 decides the public surface.
 *
 * - `layoutText`: one block of text to lines in a region (`font`, `para`, wrapping, alignment).
 * - `textStyleOf`: the `font` and `para` of a draw, field or caption, from the form DOM.
 * - `valueTextOf` / `captionTextOf`: the text a node shows (a field's display value, never its raw value).
 * - `createTextContext` / `createCaptionReserve`: the font resolver and the `CaptionReserveHook` to pass to `LayoutOptions`.
 * - `layoutBoxTexts` / `toTextItem` / `toPlaceholderItem`: the text of a whole `LayoutBox` tree, and its render-tree `text` and `placeholder` items.
 * - `rich/`: exData rich text and `xfa:embed` (W01-T06).
 */
export { layoutBoxTexts, layoutOwnTexts, layoutSource, toPlaceholderItem, toTextItem, type BoxText, type Laid, type TextFailure } from './box-text.js';
export { createCaptionReserve } from './caption-reserve.js';
export { createTextContext, OnceIssueSink, TextContext, templateTypefacesOf } from './context.js';
export { layoutText, type LayoutTextInput, type TextDeps } from './layout.js';
export { DEFAULT_TEXT_STYLE, textStyleOf } from './style.js';
export * from './types.js';
export { captionTextOf, insetRect, valueTextOf, widgetOf, widgetTextRect, wrapsField, type TextSource } from './value.js';
export * from './rich/index.js';
export { breakParagraph, breakRanges, FIT_EPSILON_PT, normalizeLineBreaks, withoutTrailingSpaces } from './wrap.js';
