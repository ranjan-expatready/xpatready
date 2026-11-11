/**
 * Rich text layout (W01-T06): exData XHTML subset to lines of styled runs, and `xfa:embed`. Internal to the engine.
 *
 * - `layoutRich`: exData markup to `LaidOutText` (mixed runs on the T05 breaker `breakRanges`).
 * - `layoutRichSource`: the same for a draw, field or caption, with a malformed block caught per draw.
 * - `parseRich` / `parseStyleAttribute`: the markup and the `style` attribute readers.
 * - `createEmbedResolver`: `xfa:embed="#id"` against the template ids and the current form values.
 */
export { parseStyleAttribute, cssDeclarationSchema, type CssDeclaration } from './css.js';
export { createEmbedResolver } from './embed.js';
export { layoutRich, type LayoutRichInput } from './layout.js';
export * from './limits.js';
export { parseRich } from './parse.js';
export { layoutRichSource, type RichOutcome } from './source.js';
export type { CharStyle, EmbeddedValue, EmbedResolver, RichAtom, RichDocument, RichParagraph } from './types.js';
