// PA (Track A; P-225, P-227, P-232): the launcher job files of the paid AI runs the Mac paid runner records for Visitor
// visa, made by the app's own code so a result recorded through p2/launch.ts is exactly the saved run the app replays
// (api/src/rounds.ts roundJob: same prompt, same input files, same combination key). No model call, US$0.
//   DATABASE_URL=<an isolated copy after Demo › Reset to the six> tsx --tsconfig studio/api/tsconfig.json studio/tools/track-a-jobs.ts --write
//   tsx --tsconfig studio/api/tsconfig.json studio/tools/track-a-jobs.ts            plan: per job its worst and usual cost, run order, caps
// Worst = what p2/runner.ts reserves (its line 60: the finished request's bytes + 2,000 as input tokens, the job's output
// limit, times its attempts); usual = one attempt at the input tokens per byte measured on 30 Oct over the same guide
// (who-can-be, 2 rounds) and twice that run's larger output
// (picks and conditions write more lines); an estimate, labelled so. The job files are only the launcher's input.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { admitRun } from "../../p2/guard.ts";
import { costUsd, inputTokenBound } from "../../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, RUN_CAP_USD, WAVE1_CAP_USD, WAVE1_START } from "../../p2/policy.ts";
import { buildRequest, type Job } from "../../p2/prompt.ts";
import { PROTOTYPE } from "../api/src/core.ts";
import { roundJob, type AiStep } from "../api/src/rounds.ts";

const JOBS = join(PROTOTYPE, "p2", "jobs"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
/** The batch word in each job id (engine/rounds.ts jobIdFor), so the ids stay the same every time they are made. */
export const BATCH = "track-a";
/** The combination these runs are for: Visitor visa in the six (P-112), as Demo › Reset to the six loads it. */
export const COMBINATION = "vv.single";

/** Measured 30 Oct, guide 5256, who-can-be draft and checker (p2/runs/studio-who-can-be-*-vv-single-*-live-20261030*):
 *  input tokens per request byte, and the larger round's output tokens. Used for "usual" only, never for a cap. */
export const MEASURED = { tokensPerByte: 0, outputTokens: 1029 };

/** C3.4: the form edition whose masters are drafted (Visitor visa's application form; acceptance C3.4.test.ts). */
export const C34_FORM = "imm5257e.pdf";
/** What a job reads: the combination's guide (C4.7, C4.11, C3.4 guide checks) or one form edition of it (C3.4 form). */
export type TrackAJob = { row: string; label: string; step: AiStep; isCheck: boolean; reads: "guide" | "form" };

/** The Track A runs that have a consumer in the app today (C4.7 PQR picks, C4.11 step 5 conditions, C3.4 masters), in run
 *  order: C4.7 first, because C4.11 step 6 replays it (#417 blocker 5). Each step is a draft round then a blind checker round. */
export async function trackAJobs(): Promise<TrackAJob[]> {
  const { PQR_AI: pqr } = await import("../api/src/pqr-drafts.ts");
  const { CONDITIONS_AI: cond } = await import("../api/src/draft-qd.ts");
  const { MASTERS_FORM_AI, MASTERS_GUIDE_AI } = await import("../api/src/form-masters.ts");
  // QA-162: these are the jobs of the runs recorded on 2 Nov (#530, #531): the v1 prompts, the guide only. The steps now
  // draft Live with v2 (the guide and the combination's question list); a v2 paid run gets its own jobs with its Go.
  const PQR_AI: AiStep = { ...pqr, template: "pqr-picks.v1.md", check: "pqr-picks-check.v1.md", schema: "pqr-picks-output.v1.schema.json", replays: undefined };
  const CONDITIONS_AI: AiStep = { ...cond, template: "conditions.v1.md", check: "conditions-check.v1.md", schema: "conditions-output.v1.schema.json", replays: undefined };
  return [
    { row: "C4.7", label: "PQR picks, draft round", step: PQR_AI, isCheck: false, reads: "guide" },
    { row: "C4.7", label: "PQR picks, checker round", step: PQR_AI, isCheck: true, reads: "guide" },
    { row: "C4.11", label: "step 5 conditions, draft round", step: CONDITIONS_AI, isCheck: false, reads: "guide" },
    { row: "C4.11", label: "step 5 conditions, checker round", step: CONDITIONS_AI, isCheck: true, reads: "guide" },
    { row: "C3.4", label: "IMM 5257 checks and document types, draft round", step: MASTERS_FORM_AI, isCheck: false, reads: "form" },
    { row: "C3.4", label: "IMM 5257 checks and document types, checker round", step: MASTERS_FORM_AI, isCheck: true, reads: "form" },
    { row: "C3.4", label: "guide 5256 checks, draft round", step: MASTERS_GUIDE_AI, isCheck: false, reads: "guide" },
    { row: "C3.4", label: "guide 5256 checks, checker round", step: MASTERS_GUIDE_AI, isCheck: true, reads: "guide" },
  ];
}

/** The jobs exactly as the app's live rounds would write them for Visitor visa now (needs the copy's database). */
export async function deriveJobs(): Promise<{ row: string; label: string; job: Job }[]> {
  const { Db } = await import("../api/src/core.ts");
  const { PqrDrafts } = await import("../api/src/pqr-drafts.ts");
  const { FormMasters } = await import("../api/src/form-masters.ts");
  const db = new Db();
  try {
    const c = await db.combination.findFirst({ where: { combinationKey: COMBINATION, retiredAt: null } });
    if (!c) throw new Error(`no ${COMBINATION} combination in this database: run Demo › Reset to the six on the copy first`);
    // The same guide, input and trail the C4.7 and C4.11 steps read (pqr-drafts.ts guide; draft-qd.ts uses it too).
    const g = await new PqrDrafts(db, null as never, null as never).guide(c);
    if (!g.input) throw new Error(`${g.code} is not among the official files the AI may read`);
    const ctx = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], batchId: BATCH };
    // C3.4's form edition: the same target the app's draft-masters reads (form-masters.ts target: its key, trail and input).
    const a = await db.sourceAttachment.findFirst({ where: { combinationId: c.id, fileName: C34_FORM } });
    if (!a) throw new Error(`${COMBINATION} has no ${C34_FORM} among its sources: run Demo › Reset to the six on the copy first`);
    const f = await new FormMasters(db, null as never, null as never, null as never).target(a);
    const form = { trail: f.trail, contextKey: f.contextKey, inputs: [f.input], batchId: BATCH };
    return (await trackAJobs()).map((t) => ({ row: t.row, label: t.label, job: roundJob(t.step, t.isCheck, t.reads === "form" ? form : ctx) as Job }));
  } finally { await db.$disconnect(); }
}

/** C4.7 v2 (QA-162; Lead 3, 3 Nov): the batch word of the v2 PQR-picks pair, so its job ids never collide with the v1 jobs
 *  above (jobIdFor hashes the batch word), while its draft and checker share one stem and so pair (rounds.ts pairOf). */
export const BATCH_V2 = "track-a-v2";

/** The C4.7 v2 pair exactly as the app's live rounds write it now: the current PQR_AI step (v2 prompts) over the guide and
 *  the combination's question list (pqr-drafts.ts inputsOf). Needs a copy where Visitor visa asks its questions
 *  (tests/runtime/setup_visitor_visa.ts); with no question asked it refuses, since the job would be v1's inputs. Also returns
 *  the app's own plan worst case (PqrDrafts.worstUsd, what the Live plan states). */
export async function deriveC47V2Jobs(): Promise<{ jobs: { row: string; label: string; job: Job }[]; planWorstUsd: number }> {
  const { Db } = await import("../api/src/core.ts");
  const { PqrDrafts, PQR_AI, inputsOf } = await import("../api/src/pqr-drafts.ts");
  const db = new Db();
  try {
    const c = await db.combination.findFirst({ where: { combinationKey: COMBINATION, retiredAt: null } });
    if (!c) throw new Error(`no ${COMBINATION} combination in this database: run Demo › Reset to the six on the copy first`);
    const p = new PqrDrafts(db, null as never, null as never), g = await p.guide(c);
    if (!g.input) throw new Error(`${g.code} is not among the official files the AI may read`);
    if (!g.questions) throw new Error(`${COMBINATION} asks no question yet, so a v2 round would read the guide only: run tests/runtime/setup_visitor_visa.ts on the copy first`);
    const ctx = { trail: g.trail, contextKey: c.combinationKey, inputs: inputsOf(g), batchId: BATCH_V2 };
    const jobs = [false, true].map((isCheck) => ({ row: "C4.7", label: `PQR picks v2, ${isCheck ? "checker" : "draft"} round`, job: roundJob(PQR_AI, isCheck, ctx) as Job }));
    return { jobs, planWorstUsd: p.worstUsd(g) };
  } finally { await db.$disconnect(); }
}

export const jobText = (job: Job) => JSON.stringify(job, null, 1) + "\n";

/** One job's costs from the code's own estimators, with no model call: the request it would send is built by the
 *  launcher's own builder (p2/prompt.ts buildRequest over the guard's admitted inputs). */
/** P-296 (3): measured on the four C3.4 v1 rounds of 3 Nov (#669; their run files are kept in p2/runs/unused-2026-11-03/):
 *  the form's inventory is denser than guide text (102,460 input tokens for 230,830 request bytes, 101,800 for 228,674),
 *  and the form's draft stopped at its 8,000 output limit after 15 checks (about 530 tokens a check), while writing the
 *  background page's question 4b. Used for "usual" only, never for a cap (the worst case is the runner's own bound). */
export const MEASURED_C34 = { formTokensPerByte: 0.4446, formDraftOutputTokens: 12_000 };
const isForm = (job: Job) => /^studio-masters-form-/.test(job.job_id);
/** C3.4's usual output (an estimate, never a cap): each check carries a tree and two or three worked examples, so half the
 *  step's output limit rather than twice the who-can-be answer; each of the form's rounds about 1.5 times the 8,000 the
 *  draft wrote before it was cut (#669), the checker too, since v2 asks it to read every page as the draft does. */
const usualOutputOf = (job: Job) => (isForm(job) ? MEASURED_C34.formDraftOutputTokens
  : /^studio-masters-/.test(job.job_id) ? Math.round(Number(job.settings.max_output_tokens) / 2) : MEASURED.outputTokens * 2);

export function costsOf(job: Job) {
  const admitted = admitRun({ inputs: { official_files: job.inputs }, settings: job.settings as never });
  const req = buildRequest(readFileSync(join(PROMPTS, job.template), "utf8"), JSON.parse(readFileSync(join(PROMPTS, job.output_schema), "utf8")), admitted, job.known);
  const bytes = Buffer.byteLength(JSON.stringify(req), "utf8");
  const model = String(job.settings.model), out = Number(job.settings.max_output_tokens), attempts = Number(job.settings.max_attempts);
  const perAttempt = costUsd(model, inputTokenBound(JSON.stringify(req)), out);
  // One attempt; output at twice the measured who-can-be answer (a margin: picks and conditions each carry a quote and a reason).
  const usual = costUsd(model, Math.round(bytes * (isForm(job) ? MEASURED_C34.formTokensPerByte : measuredTokensPerByte())), Math.min(out, usualOutputOf(job)));
  return { request_bytes: bytes, per_attempt_worst_usd: perAttempt, worst_usd: perAttempt * attempts, usual_usd: usual, budget_usd: Number(job.settings.budget_usd), fits_budget: perAttempt * attempts <= Number(job.settings.budget_usd) + 1e-9, under_run_cap: perAttempt * attempts <= RUN_CAP_USD + 1e-9 };
}

/** Input tokens per request byte, from the two 30 Oct live rounds over guide 5256 (their recorded tokens and bytes). */
export function measuredTokensPerByte(): number {
  if (MEASURED.tokensPerByte) return MEASURED.tokensPerByte;
  const dir = join(PROTOTYPE, "p2", "runs", "incident-2026-10-30");
  const files = ["studio-who-can-be-vv-single-2bb827e5-live-20261030t040815119z-e64b14.json", "studio-who-can-be-check-vv-single-1919cd7d-live-20261030t040829154z-2ad193.json"];
  let tokens = 0, bytes = 0;
  for (const f of files) {
    const p = existsSync(join(dir, f)) ? join(dir, f) : join(PROTOTYPE, "p2", "runs", f);
    const r = JSON.parse(readFileSync(p, "utf8"));
    tokens += Number(r.drafting_run.usage.input_tokens); bytes += Number(r.launch_evidence.request_bytes);
  }
  MEASURED.tokensPerByte = tokens / bytes;
  return MEASURED.tokensPerByte;
}

const usd = (n: number) => `US$${n.toFixed(2)}`;

if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes("--c47-v2")) {
  // C4.7 v2:  tsx … track-a-jobs.ts --c47-v2 [--write]   (a copy after Reset to the six and setup_visitor_visa.ts)
  const { jobs, planWorstUsd } = await deriveC47V2Jobs();
  let worst = 0, usual = 0;
  console.log(`\nC4.7 v2 jobs for ${COMBINATION} (guide + question list; no model call; worst = the runner's reservation, usual = estimate):`);
  for (const { label, job } of jobs) {
    if (process.argv.includes("--write")) writeFileSync(join(JOBS, `${job.job_id}.json`), jobText(job));
    const c = costsOf(job);
    worst += c.worst_usd; usual += c.usual_usd;
    console.log(`  C4.7 ${label}: ${job.job_id}${process.argv.includes("--write") ? " (written)" : ""}  worst ${usd(c.worst_usd)} (${job.settings.max_attempts} × ${usd(c.per_attempt_worst_usd)}; request ${c.request_bytes} bytes, output ≤ ${job.settings.max_output_tokens})  usual ~${usd(c.usual_usd)}  budget ${usd(c.budget_usd)}${c.fits_budget ? "" : "  ← ABOVE ITS BUDGET"}`);
  }
  console.log(`  total: worst ${usd(worst)}, usual ~${usd(usual)}; the app's Live plan states worst ${usd(planWorstUsd)} (PqrDrafts.worstUsd)`);
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--write")) {
    for (const { label, job } of await deriveJobs()) {
      writeFileSync(join(JOBS, `${job.job_id}.json`), jobText(job));
      console.log(`wrote p2/jobs/${job.job_id}.json  (${label})`);
    }
  }
  // A job is priced only when it is exactly the app's: for this combination, and its id is the one engine/rounds.ts jobIdFor
  // gives for its own trail and this batch word (never a file merely found by its prefix: another combination's job).
  const { jobIdFor } = await import("../engine/rounds.ts");
  const jobs = await trackAJobs();
  let worst = 0, usual = 0;
  console.log(`\nTrack A jobs for ${COMBINATION} (C3.4's form: its ${C34_FORM}), in run order (no model call; worst = the runner's reservation, usual = estimate):`);
  for (const t of jobs) {
    const prefix = `${t.isCheck ? `${t.step.jobBase}-check` : t.step.jobBase}-`;
    const job = readdirSync(JOBS).filter((x) => x.startsWith(prefix) && x.endsWith(".json")).map((x) => JSON.parse(readFileSync(join(JOBS, x), "utf8")) as Job)
      .find((j) => (t.reads === "form" ? /^edition:IMM 5257:/.test(j.combination) : j.combination === COMBINATION) && j.template === (t.isCheck ? t.step.check : t.step.template) && j.job_id === jobIdFor(t.step.jobBase, t.isCheck, String(j.known?.combination_trail ?? j.known?.form_edition ?? ""), BATCH));
    if (!job) { console.log(`  ${t.row} ${t.label}: no job file yet (run with --write on a copy after Reset to the six)`); continue; }
    const c = costsOf(job);
    worst += c.worst_usd; usual += c.usual_usd;
    console.log(`  ${t.row} ${t.label}: ${job.job_id}  worst ${usd(c.worst_usd)} (${job.settings.max_attempts} × ${usd(c.per_attempt_worst_usd)}; request ${c.request_bytes} bytes, output ≤ ${job.settings.max_output_tokens})  usual ~${usd(c.usual_usd)}  budget ${usd(c.budget_usd)}${c.fits_budget ? "" : "  ← ABOVE ITS BUDGET"}`);
  }
  console.log(`  total: worst ${usd(worst)}, usual ~${usd(usual)}`);
  console.log(`Caps the cost check applies to every start (p2/policy.ts, p2/ledger.ts): run cap ${usd(RUN_CAP_USD)}; experiment ${usd(EXPERIMENT_CAP_USD)} over every run the ledger holds; Wave 1 ${usd(WAVE1_CAP_USD)} counted since ${WAVE1_START.slice(0, 10)}; the real ledger is on the Mac (.tools/p2-ledger).`);
}
