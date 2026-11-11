/**
 * Positioned boxes (W01-T04): the geometry of every field, draw, subform, exclGroup and area in `position` layout, from
 * the live form DOM. Internal to the engine until W02-T12 decides the public surface.
 *
 * - `placeInParent` / `nominalExtent`: `x`, `y`, `w`, `h`, `minW`, `minH`, `anchorType` and `rotate` to a rectangle.
 * - `insetsOf` / `localContentRect`: the `margin` insets and the content region.
 * - `splitCaption`: the caption strip by `placement` and an explicit `reserve`; an automatic one goes to the T05 hook.
 * - `borderStyleOf` / `widgetBorderStyleOf`: edges, corners, fill and hand as numbers.
 * - `layoutBoxes` / `buildBox` / `buildChildBoxes`: the `LayoutBox` tree and its `issues`.
 * - `FlowArranger` / `ContentExtentHook` (`hooks.ts`): where the flowed layouts and the growable draws and fields hook in (W01-T07, `layout/flow`).
 */
export { boxedChildren, buildBox, buildChildBoxes, BoxContext, layoutBoxes, peekPresence, type LayoutOptions, type LayoutResult } from './build.js';
export { borderStyleOf, widgetBorderStyleOf } from './border.js';
export { splitCaption, unresolvedReserve, type CaptionReserveHook, type CaptionSplit } from './caption.js';
export type { ContentExtent, ContentExtentHook, ContentExtentRequest, FlowArrangement, FlowArranger, FlowMode, FlowRequest, ForcedSize } from './hooks.js';
export { anchorTypeOf, nominalExtent, placeInParent, rotationOf, type Placement } from './geometry.js';
export { insetsOf, localContentRect } from './insets.js';
export { discardingSink, IssueSink } from './issues.js';
export { MAX_BOX_DEPTH, SIZE_EPSILON_PT } from './limits.js';
export { effectivePresence, flagsOf, ownPresence, presenceOf, relevantOf } from './presence.js';
export { translateBox } from './translate.js';
export * from './types.js';
export { CONTAINER_CLASSES, layoutModeOf, unsupportedFeatureOf } from './unsupported.js';
