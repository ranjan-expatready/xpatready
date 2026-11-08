// C7.5 part 2 The review-run answers (api/src/review-runs.ts, which re-exports them): types only, no import, so the
// Review page (web/src/runtime/review.tsx) reads the same shapes without pulling in the server.
/** One form of the run card. */
export type PlannedForm = { form: string; edition: string; boxes: number; sheet: string; sheet_sha256: string;
  saved: { available: boolean; why: string | null; files: string[]; made_up: boolean }; live_usd: number; live_worst_usd: number;
  /** What the two rounds read, box by box (the Review page's source panel: each AI finding's quoted line shown in it). */
  lines: { box: string; caption: string; fact: string | null; value: string }[] };
/** POST …/review-runs/plan → the run card. */
export type ReviewRunPlan = {
  case_id: string; subject: string; person: string; forms: PlannedForm[];
  estimate: { live_usd: number; live_worst_usd: number; replay_usd: 0; remaining_usd: number; job_cap_usd: number };
  stand_in: "SI-6"; stand_in_words: string; live_allowed: boolean; live_why: string | null;
  replay_available: boolean; replay_why: string | null; made_up: boolean; made_up_words: string | null;
  steps: { n: number; label: string; uses_ai: boolean }[]; plan_sha256: string;
};
/** One form's outcome in a run. */
export type RunForm = { form: string; edition: string; from: "live" | "replay" | null; run_files: string[]; cost_usd: number; added: number; kept: number; resolved: number; dropped: { field: string; why: string }[];
  /** AG-11-70: boxes a round could not judge, with why (never guessed). */
  unreadable: { box: string; why: string; round: string }[]; note: string | null };
/** POST …/review-runs → what the run did. */
export type ReviewRunResult = { run_id: string; mode: "replay" | "live"; made_up: boolean; cost_usd: number; cancelled: boolean; forms: RunForm[]; added: number; note: string };

