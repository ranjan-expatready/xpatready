/**
 * The render tree of a laid-out form (W02-T12). Internal to the engine: the package exports only the tree's schema and types
 * (`src/index.ts`); `runtime.layout()` is the one caller.
 *
 * - `buildRenderTree(input, limits?)`: the `RenderTree` of a `LaidOutForm`, with its resources and merged issues.
 */
export { buildRenderTree, type TreeInput, type TreeLimits } from './build.js';
