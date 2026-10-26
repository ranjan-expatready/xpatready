// P2 drafting policy, fixed in code (AIW-D260 content limits, AIW-D261 route). The runner reads only
// these constants; a run record cannot widen them. Changing a value here needs the founder's decision.
import { join, relative, resolve, sep } from "node:path";

export const PROTOTYPE = join(import.meta.dirname, "..");
export const ROOT = join(PROTOTYPE, "..", "..", "..");
export const SOLUTION = join(PROTOTYPE, "..");
export const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
export const INVENTORY = join(PROTOTYPE, "p1", "inventory");
export const KEY_FILE = join(ROOT, ".tools", "solution-1-prototype", "secrets", "anthropic.env");
/** Spend ledger for the whole experiment: kept in the project (evidence, backed up), append-only. The
 *  trusted entry path (launch.ts -> draft.ts) always uses this directory and EXPERIMENT_CAP_USD; a paid
 *  caller refuses any other ledger (runner.ts). */
export const LEDGER_DIR = join(PROTOTYPE, "p2", "ledger");
/** Maker-written prompt templates. The launcher screens every file it uses from here before a run. */
export const PROMPTS_DIR = join(PROTOTYPE, "p2", "prompts");
/** Job files: which official inputs, which template, which settings. Read by the launcher and the child. */
export const JOBS_DIR = join(PROTOTYPE, "p2", "jobs");
/** F1 slice 2 (A4): parts of an admitted inventory, one per group of form sections, so a form is drafted in smaller
 *  calls and the AI sees only the form fields the library could not fill. The guard admits a part only as an exact
 *  subset of its admitted parent. Written by the Studio, regenerated deterministically, never committed. */
export const PARTS_DIR = join(PROTOTYPE, "p2", "parts");
/** F1 slice 2: approved portal screen inventories (P-66 portal twins) for the screen_map job. The guard admits one only
 *  when a second person approved it and its fingerprint is the one recomputed from its structure. */
export const SCREEN_INVENTORIES = join(PROTOTYPE, "p2", "screen-inventories");
/** P-80: forms a second person approved in the product (held, not on the official manifest). At approval the Studio
 *  writes, per copy and per workspace, the approval record, the approved PDF and (on "read the form") its inventory into
 *  <studio working folder>/workspaces/demo/approved-sources, so a demo reset clears them with the database row and test
 *  copies never share one. The guard sees no database: it admits such an inventory only from a folder of exactly this
 *  shape that the launcher names, and only after checking the record (guard.ts admitApproved). */
export const STUDIO_VAR_DIR = join(PROTOTYPE, "studio", "var");
export function approvedSourcesDirOk(dir: unknown): dir is string {
  if (typeof dir !== "string" || resolve(dir) !== dir) return false;
  return /^(isolated-[a-z0-9_]+\/)?workspaces\/demo\/approved-sources$/.test(relative(STUDIO_VAR_DIR, dir).split(sep).join("/"));
}
/** Run records and stub-pass records, written only by the launcher (the isolated child cannot write here). */
export const RUNS_DIR = join(PROTOTYPE, "p2", "runs");
/** Salted-hash screening digest written by the launcher before every run and read by the drafting process,
 *  which screens its own template, schema, draft inputs and request with it (R4-M1). Not writable by the child. */
export const SCREENING_DIR = join(PROTOTYPE, "p2", "screening");
export const DIGEST_FILE = join(SCREENING_DIR, "canary-digest.json");
/** F1 slice 2: each launch's ticket is also written under its own run id, and the drafting process reads only that one,
 *  so two launches at the same moment (the parts of one form, two forms in the queue) no longer overwrite each other's
 *  ticket ("launch ticket is for another start"). Still single-use, bound to the run, and not writable by the child. */
export const TICKETS_DIR = join(SCREENING_DIR, "tickets");
export const ticketFile = (runId: string) => join(TICKETS_DIR, `${runId}.json`);
/** R4-R2-M1: the digest is also a single-use launch ticket for one run. The drafting process refuses a ticket
 *  older than this, or one already used; it records each used ticket here (inside the ledger folder, the only
 *  place it may write). A digest left behind by an earlier launch therefore cannot screen a later start. */
export const LAUNCH_TICKET_TTL_MS = 120_000;
export const USED_TICKETS_DIR = join(LEDGER_DIR, "used-launch-tickets");
/** The one script a paid call may run in: started by launch.ts under the Node permission model. */
export const DRAFT_ENTRY = join(PROTOTYPE, "p2", "draft.ts");

/** The only route a P2 drafting call may use: the Anthropic API under the prototype-only exception. */
export const ROUTE_ID = "anthropic-api/aiw-d261-prototype-exception-aiw-d260";
export const BASE_URL = "https://api.anthropic.com";
export const MODELS = ["claude-opus-5-5"] as const;

/** US$ per million tokens. Source: Anthropic model table as cached 2026-10-06 in the claude-api skill
 *  (Claude Opus 5.5: $4 input, $20 output); the reviewer re-checked the official pricing page on 20 Oct 2026
 *  (unchanged). Re-check before paid runs; a model without a price is refused. */
export const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
};

/** Spend caps. AIW-D261: about US$15-40 for the comparison, US$5 cap per run. The experiment cap covers every
 *  attempt and retry of every run, failed or not. AIW-D282 (founder, 21 Oct 2026): total raised from US$40 to US$100
 *  for the remaining real-model work; per-run cap, route, inputs, ledger and stub-pass rules unchanged. */
export const EXPERIMENT_CAP_USD = 100;
export const RUN_CAP_USD = 5;
export const MAX_ATTEMPTS = 2;

/** Label every screen and record of drafted output carries (AIW-D260, verbatim). */
export const LABEL = "AI-drafted under a prototype-only exception to the AI-processing rule; not the product's provider route";

/** Files the drafting process may never read: answer keys, the made-up family's values, test outputs.
 *  Listed for refusal messages and the isolation test; the allowlist below is what actually admits a file. */
export const FORBIDDEN = [
  join(PROTOTYPE, "expected"),
  join(PROTOTYPE, "p1", "e5-family-values.json"),
  join(PROTOTYPE, "p1", "adobe-complete-1295-values.json"),
  join(PROTOTYPE, "p1", "adobe-test"),
  join(PROTOTYPE, "p1", "runs"),
];
