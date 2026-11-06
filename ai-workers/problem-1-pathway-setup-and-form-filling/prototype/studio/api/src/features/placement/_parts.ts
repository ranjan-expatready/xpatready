// QA-144 (P-158, P-120): what each pass of placeFromFormParts (api/src/form-part-placements.ts) is given, and what they
// add up. A pass is one file of this folder, NN-<feature>.ts, run in its number order (features.ts featureSteps).
import type { Snapshot } from "../../../../engine/snapshot.ts";
import type { Actor, Db } from "../../core.ts";
import type { Studio } from "../../studio.ts";

export type PlacedFromParts = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[]; selected: string[]; unselected: string[] };
/** One run on one combination: its draft as read once at the start (`snapshot`), and the result every pass adds to. */
export type PlacementContext = { db: Db; studio: Studio; author: Actor; combinationId: string; workspaceId: string; snapshot: Snapshot; out: PlacedFromParts };
export type PlacementPass = { run: (ctx: PlacementContext) => Promise<void> };
