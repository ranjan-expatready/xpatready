// B120 (P-376 (3)): what every step of the configured checkpoint (C10.1, Demo › Load the configured checkpoint) is given.
// The runner is Demo's loadConfigured (api/src/demo.ts): it loads the six, builds this context, runs each step of this
// folder in its file-name order (features.ts featureSteps), then sorts the rows and writes the one audit line. A step
// reads and writes the data only through the screens' own services (ctx.get(Service)), as the people who hold each duty
// (author, sme, approver), and says its row with ctx.row. State a later step reads belongs to the step that makes it
// (features.ts stateOf), so adding a step adds a file and edits no shared line here.
import type { Actor, Audit, Db } from "../../core.ts";

/** C10.1: one DEMO.md row of the configured checkpoint, as the Demo menu shows it. */
export type CheckpointRow = { row: string; title: string; status: "done" | "partial" | "waiting" | "not built yet" | "out"; shows: string; why: string | null };
/** What the steps read of Load sample "six"'s result (Demo's loadSix), which the checkpoint loads first. */
export type SixLoaded = {
  combinations: { id: string; label: string; files: number }[];
  drafts: { waiting_for_draft_with_ai: string[] };
  lines_by_hand: { combination: string; combination_id: string; documents: { name: string; who: string; quote: string; status: string }[] }[];
  timings: Record<string, number>;
};
/** Before the six load: a step may change which official file a combination's line reads (row 17's IMM 5476 2021). */
export type Prepared = { swap?: Record<string, string> } | void;
export type CheckpointContext = {
  actor: Actor; workspaceId: string; t0: number; log: string[];
  db: Db; audit: Audit;
  /** A service of the app (the same instance the screens use), e.g. ctx.get(Forms). */
  get: <T>(cls: new (...a: never[]) => T) => T;
  /** Waits for a background run (form finder or AI batch) to end (Demo.settled). */
  settled: (batchId: string) => Promise<{ status: string; message: string }>;
  // Set once the six are loaded, before the first run():
  six: SixLoaded;
  author: Actor; sme: Actor; approver: Actor;
  /** Each combination's key, by its id, as loaded by the six. */
  keyOf: Map<string, string>;
  /** The Visitor visa ("vv.single"), when the six loaded it. */
  vvId: string | undefined;
  /** Times a step under its name; the seconds are summed per name into the result's timings. */
  timed: <T>(step: string, f: () => Promise<T>) => Promise<T>;
  /** A refusal in a service's own words (its problem detail), cut to 400 characters. */
  said: (e: unknown) => string;
  /** Adds a DEMO.md row and its log line. */
  row: (r: CheckpointRow) => void;
  /** Fields the result carries beside the rows (release 1's `released`). */
  result: Record<string, unknown>;
  /** C10.2: "finished" when Demo › Load the finished story runs this checkpoint (its steps 125 and 200 run only then). */
  story?: "finished";
};
export type CheckpointStep = {
  /** Before the six load; only actor, workspaceId, t0, log, db, audit, get and settled are set. */
  prepare?: (ctx: CheckpointContext) => Promise<Prepared> | Prepared;
  run: (ctx: CheckpointContext) => Promise<void>;
  init?: () => Promise<void>;
};
