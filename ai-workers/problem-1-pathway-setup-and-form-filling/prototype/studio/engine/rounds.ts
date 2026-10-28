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

/** The combination a saved run belongs to: its job's key, or (runs made before keys) the reviewed list of legacy runs. A
 *  trail written with " › " is a name, not a key, so it never counts. */
export function savedRunKey(r: SavedRun, legacy: Record<string, string>): string | null {
  const c = r.drafting_run?.inputs?.combination;
  return c && !c.includes(" › ") ? c : legacy[r.file] ?? null;
}

/** A saved run may stand in for this round: a completed, valid live answer of the same prompt, the same input files (in
 *  order) and the same combination. */
export function isSameSavedRun(r: SavedRun, want: { templateSha256: string; inputs: { file: string; sha256: string }[]; combinationKey: string; legacy: Record<string, string> }): boolean {
  return r?.caller === "live" && r?.drafting_run?.status === "completed" && r.contract_valid === true && r.launch_evidence?.template_sha256 === want.templateSha256
    && JSON.stringify(r.drafting_run?.inputs?.official_files) === JSON.stringify(want.inputs) && savedRunKey(r, want.legacy) === want.combinationKey && typeof r.raw_output === "string";
}

/** A round's job base: the step's own, with "-check" for the checker round. */
export const roundBase = (jobBase: string, isCheck: boolean) => `${jobBase}${isCheck ? "-check" : ""}`;
/** The saved run files of one round: the checker's carry "-check"; the draft's never do. */
export const replayPattern = (jobBase: string, isCheck: boolean) => new RegExp(`^${roundBase(jobBase, isCheck)}-${isCheck ? "" : "(?!check-)"}.+-live-\\d{8}t\\d{9}z-[a-z0-9]+\\.json$`);
/** A round's job id: unique to the trail and to this run (S4 break M5, round 2 N3), so Stop ends only this run's call. */
export function jobIdFor(jobBase: string, isCheck: boolean, trail: string, batchId?: string): string {
  return `${roundBase(jobBase, isCheck)}-${slug(trail).slice(0, 40).replace(/_/g, "-")}-${createHash("sha256").update(`${batchId ?? ""}|${trail}`).digest("hex").slice(0, 8)}`;
}
