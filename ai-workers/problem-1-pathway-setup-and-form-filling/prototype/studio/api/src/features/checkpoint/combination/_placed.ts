// What the placement step (200) did on one combination, for the steps after it (210, 220, and any later one).
import { stateOf } from "../../../features.ts";
import type { PlacedFromParts } from "../../../form-part-placements.ts";

/** Keyed by the combination's context: placeFromFormParts' result on it. */
export const placed = stateOf(() => ({ p: null as PlacedFromParts | null }));
