// One step runner for every AI step (P-121; W1-10 slice 0, challenge A2): the pure parts every producer shares, taken
// out of the S4 form finder unchanged. Which saved real run may be replayed, and the job id of a round. No I/O.
//  - a saved answer is found by what the AI was given (the same files, the same prompt) and by the combination's key,
//    never by a file name or names; another combination's answer is never reused (S4 break M7, round 2 N4, round 3 R3-2);
//  - a stub pass is never replayed as the AI's answer, even when a place's name holds the word "live" (break R5-1).
import { createHash } from "node:crypto";
import { slug } from "./import.ts";

/** A saved real run ends "-live-<time>-<id>.json"; a stub pass ends "-stub-…". */
export const LIVE_RUN = /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
/** Saved run files, newest first by the time in their name (after "-live-"), whatever the job id before it. */
export const newestFirst = (a: string, b: string) => b.slice(b.lastIndexOf("-live-")).localeCompare(a.slice(a.lastIndexOf("-live-")));

/** A saved run record of the guarded launcher, read loosely (only what replay compares). */
export type SavedRun = { file: string; caller?: string; drafting_run?: { status?: string; usage?: { cost_usd?: number }; inputs?: { official_files?: unknown; combination?: string } }; contract_valid?: boolean; launch_evidence?: { template_sha256?: string; known?: { combination_trail?: string } }; raw_output?: unknown };

/** A round's context key (`contextKey`): what a saved answer belongs to. A combination's key (the finder, W1-10), or a
 *  form edition, `edition:<code>:<edition>` (S6 drafts once per edition and every combination reuses it; screens N1). */
export const editionContextKey = (code: string, edition: string) => `edition:${code}:${edition}`;
/** The form and edition of an edition context key; null for a combination's key or anything malformed. */
export function editionOfContextKey(key: string): { code: string; edition: string } | null {
  const m = /^edition:([A-Za-z][A-Za-z0-9 ]{1,30}):([0-9]{2}-[0-9]{4})$/.exec(key);
  return m ? { code: m[1], edition: m[2] } : null;
}

/** The context a saved run belongs to: its job's key, or (runs made before keys) the reviewed list of legacy runs. A
 *  trail written with " › " is a name, not a key, so it never counts. */
export function savedRunKey(r: SavedRun, legacy: Record<string, string>): string | null {
  const c = r.drafting_run?.inputs?.combination;
  return c && !c.includes(" › ") ? c : legacy[r.file] ?? null;
}

/** A finished run's statuses: a field-map run (its checker rounds too) is recorded "completed_with_unresolved" when any form
 *  field is left to a person (p2/convert.ts), which is still a finished answer to replay (C11.14, tech lead 3 Nov). */
export const FINISHED_RUN = new Set(["completed", "completed_with_unresolved"]);
/** Whether a recorded status is a finished run's: a plain string in FINISHED_RUN only (break m1 on #693: String(["completed"])
 *  would read an array as "completed"). */
export const isFinishedRun = (status: unknown): boolean => typeof status === "string" && FINISHED_RUN.has(status);
/** A saved run may stand in for this round: a finished (FINISHED_RUN), valid live answer of the same prompt, the same
 *  input files (in order) and the same context (combination or form edition). */
export function isSameSavedRun(r: SavedRun, want: { templateSha256: string; inputs: { file: string; sha256: string }[]; contextKey: string; legacy: Record<string, string> }): boolean {
  return r?.caller === "live" && isFinishedRun(r?.drafting_run?.status) && r.contract_valid === true && r.launch_evidence?.template_sha256 === want.templateSha256
    && JSON.stringify(r.drafting_run?.inputs?.official_files) === JSON.stringify(want.inputs) && savedRunKey(r, want.legacy) === want.contextKey && typeof r.raw_output === "string";
}

/** W1-10 slice 1 (plan §4): which prompt a saved run answered, among the step's current prompt and the earlier versions
 *  it names as still replayable (by their checksums); null for any other prompt, which is never replayed. */
export function promptOfRun(r: SavedRun, prompts: { sha256: string; label: string }[]): string | null {
  return prompts.find((p) => p.sha256 === r?.launch_evidence?.template_sha256)?.label ?? null;
}

/** A round's job base: the step's own, with "-check" for the checker round. */
export const roundBase = (jobBase: string, isCheck: boolean) => `${jobBase}${isCheck ? "-check" : ""}`;
/** The saved run files of one round: the checker's carry "-check"; the draft's never do. */
export const replayPattern = (jobBase: string, isCheck: boolean) => new RegExp(`^${roundBase(jobBase, isCheck)}-${isCheck ? "" : "(?!check-)"}.+-live-\\d{8}t\\d{9}z-[a-z0-9]+\\.json$`);
/** Demo 29 Oct (P-153: code is the guard): the AI service refuses maxItems in a schema, so "at most 5 other pages from
 *  each guide round" is kept here; anything that is not a title is dropped. */
export const MAX_OTHER_PAGES = 5;
export const otherPages = (others: unknown): string[] => (Array.isArray(others) ? others.filter((t): t is string => typeof t === "string") : []).slice(0, MAX_OTHER_PAGES);
/** A round's job id: unique to the trail and to this run (S4 break M5, round 2 N3), so Stop ends only this run's call. */
export function jobIdFor(jobBase: string, isCheck: boolean, trail: string, batchId?: string): string {
  return `${roundBase(jobBase, isCheck)}-${slug(trail).slice(0, 40).replace(/_/g, "-")}-${createHash("sha256").update(`${batchId ?? ""}|${trail}`).digest("hex").slice(0, 8)}`;
}
