// P2 drafting policy, fixed in code (AIW-D260 content limits, AIW-D261 route). The runner reads only
// these constants; a run record cannot widen them. Changing a value here needs the founder's decision.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const PROTOTYPE = join(import.meta.dirname, "..");
export const ROOT = join(PROTOTYPE, "..", "..", "..");
export const SOLUTION = join(PROTOTYPE, "..");
export const OFFICIAL = join(SOLUTION, "official-sources", "ircc");
export const INVENTORY = join(PROTOTYPE, "p1", "inventory");
export const KEY_FILE = join(ROOT, ".tools", "solution-1-prototype", "secrets", "anthropic.env");
/** Spend ledger for the whole experiment: kept in the project (evidence, backed up), append-only. The
 *  trusted entry path (launch.ts -> draft.ts) always uses this directory and EXPERIMENT_CAP_USD; a paid
 *  caller refuses any other ledger (runner.ts). */
export const LEDGER_DIR = ledgerDirFrom(process.env.P2_LEDGER_DIR);
/** QA-90: one ledger for every copy. P2_LEDGER_DIR, when set, names it (run-suites: a scratch folder per run; launch.ts
 *  always passes it to the drafting process, whose environment is otherwise cut). Unset, the main copy's .tools/p2-ledger
 *  when the main copy has a .tools folder (the Mac: the demo and every lane copy find the same one through git), else
 *  the project's own p2/ledger as before (CI, cloud). Only an absolute path is taken, so a copy can never resolve it
 *  against its own folder by mistake. */
export function ledgerDirFrom(v: string | undefined, root: string = ROOT): string {
  if (v === undefined || v === "") return sharedLedgerDir(root) ?? join(PROTOTYPE, "p2", "ledger");
  if (resolve(v) !== v) throw new Error(`P2_LEDGER_DIR must be an absolute path without . or .. parts (got ${v})`);
  return v;
}
/** The main copy's .tools/p2-ledger, or null. A copy's .git is a folder in the main copy and a file
 *  "gitdir: <main>/.git/worktrees/<name>" in a lane copy. */
export function sharedLedgerDir(root: string): string | null {
  try {
    const g = join(root, ".git");
    const gitdir = statSync(g).isDirectory() ? null : /^gitdir:\s*(.+)$/m.exec(readFileSync(g, "utf8"))?.[1].trim();
    const main = gitdir === null ? root : gitdir ? dirname(dirname(dirname(gitdir))) : null;
    return main && existsSync(join(main, ".tools")) ? join(main, ".tools", "p2-ledger") : null;
  } catch { return null; }
}
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
/** QA-162: a combination's question list (role, key and label of each question it asks), written by the studio so an AI
 *  round names a question by its key instead of inventing a name (p2/guard.ts admitQuestionList). */
export const QUESTION_LISTS = join(PROTOTYPE, "p2", "question-lists");
/** C7.5 part 2: a filled form's review sheet (its printed edition and, box by box, caption, fact and value), written by the
 *  studio so the independent AI review reads exactly what the form says (p2/guard.ts admitReviewSheet); never committed. */
export const REVIEW_SHEETS = join(PROTOTYPE, "p2", "review-sheets");
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
 *  for the remaining real-model work; per-run cap, route, inputs, ledger and stub-pass rules unchanged. P-139 (founder,
 *  29 Oct): raised to US$120 for the W1-10 live trial; the Wave 1 cap stays US$60. */
export const EXPERIMENT_CAP_USD = 120;
export const RUN_CAP_USD = 5;
/** P-179 (founder, 30 Oct; Lead answers Q1-Q3): a cost limit warns before anything is spent, and a person may click
 *  Continue past it for that one run's worst case. Clicks may take total spend past the experiment cap by at most 10%;
 *  past this ceiling there is no Continue, only "the founder must raise the cap". */
export const OVERRIDE_CEILING_USD = Math.round(EXPERIMENT_CAP_USD * 1.1 * 100) / 100;
/** An override is used to start its run within this time of the click, once (P-179). */
export const OVERRIDE_TTL_MS = 10 * 60_000;
/** P-110 (founder, 26 Oct; raised from US$40 to US$60 on 27 Oct, Lead PR #52): what Wave 1's live AI tests may spend,
 *  counted from the wave's start inside the experiment cap. The ledger refuses a reservation above it. */
export const WAVE1_CAP_USD = 60;
export const WAVE1_START = "2026-10-26T00:00:00.000Z";
export const MAX_ATTEMPTS = 2;
/** Lead 29 Oct (research G4): the paid AI attempts one form may use in all, its first run and any retry together
 *  (MAX_ATTEMPTS per run, so one paid retry). Before, batch retries × runner attempts allowed 6. Stub runs cost nothing
 *  and are not counted. */
export const MAX_PAID_ATTEMPTS_PER_FORM = 4;
/** Lead 29 Oct (research G5): the largest request one AI step may send, in bytes of the serialized request (the ledger's
 *  input bound counts about one token per byte). The largest real request so far was about 152 K input tokens (checks,
 *  20 Oct); a larger one is refused before any call, at US$0, and is split or read another way. */
export const MAX_REQUEST_BYTES = 800_000;
/** QA-87: a busy service (429, 529, 503) is retried only after the wait it names (retry-after), and only when that wait is
 *  at most this many seconds; with no wait named, the call stops and the person tries again later. */
export const MAX_RETRY_AFTER_S = 30;

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
