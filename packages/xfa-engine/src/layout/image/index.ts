/**
 * Images (W02-T11): the bounded decoders and the render-tree items for the images of a form (PA-5). Internal to the
 * engine until W02-T12 decides the public surface.
 *
 * - `createImageContext` / `ImageContext`: `draw(box)` gives the `image` or `placeholder` item of a drawn box, `resources` the
 *   deduplicated `RenderTree.resources.images`, `issues` the failures; `startPass` begins a layout pass.
 * - `decodeImage` / `sniffImage`: one encoded file to RGBA (BMP, TIFF) or a passed-through JPEG, or a typed `XfaImageError`.
 * - `placeImage` / `naturalSizeOf`: the `aspect` rules, as numbers.
 * - `ImageLimits` / `DEFAULT_IMAGE_LIMITS`: the FD-38 ceilings (`limits.ts`).
 */
export { aspectSchema, naturalSizeOf, placeImage, type Aspect, type HorizontalPlacement, type NaturalSize, type VerticalPlacement } from './aspect.js';
export { decodeBase64 } from './base64.js';
export { createImageContext, ImageContext, type ImageResource } from './context.js';
export { decodeImage, sniffImage, type ImageKind } from './decode.js';
export { XfaImageError, type ImageFailureReason } from './errors.js';
export { DEFAULT_IMAGE_LIMITS, type ImageLimits } from './limits.js';
export type { DecodedImage, DecodedRaster, PassedThrough } from './types.js';
