// PA (Track A; P-225, P-227, P-232): the launcher job files of the paid AI runs the Mac paid runner records for Visitor
// visa, made by the app's own code so a result recorded through p2/launch.ts is exactly the saved run the app replays
// (api/src/rounds.ts roundJob: same prompt, same input files, same combination key). No model call, US$0.
//   DATABASE_URL=<an isolated copy after Demo › Reset to the six> tsx --tsconfig studio/api/tsconfig.json studio/tools/track-a-jobs.ts --write
//   tsx --tsconfig studio/api/tsconfig.json studio/tools/track-a-jobs.ts            plan: per job its worst and usual cost, run order, caps
// Worst = what p2/runner.ts reserves (its line 60: the finished request's bytes + 2,000 as input tokens, the job's output
// limit, times its attempts); usual = one attempt at the input tokens per byte and the output measured on 30 Oct over the
// same guide (who-can-be, 2 rounds); an estimate, labelled so. The job files are only the launcher's input.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

export type TrackAJob = { row: string; label: string; step: AiStep; isCheck: boolean };

/** The Track A runs that have a consumer in the app today (C4.7 PQR picks, C4.11 step 5 conditions), in run order: C4.7
 *  first, because C4.11 step 6 replays it (#417 blocker 5). Each step is a draft round then a blind checker round. */
export async function trackAJobs(): Promise<TrackAJob[]> {
  const { PQR_AI } = await import("../api/src/pqr-drafts.ts");
  const { CONDITIONS_AI } = await import("../api/src/draft-qd.ts");
  return [
    { row: "C4.7", label: "PQR picks, draft round", step: PQR_AI, isCheck: false },
    { row: "C4.7", label: "PQR picks, checker round", step: PQR_AI, isCheck: true },
    { row: "C4.11", label: "step 5 conditions, draft round", step: CONDITIONS_AI, isCheck: false },
    { row: "C4.11", label: "step 5 conditions, checker round", step: CONDITIONS_AI, isCheck: true },
  ];
}

/** The jobs exactly as the app's live rounds would write them for Visitor visa now (needs the copy's database). */
export async function deriveJobs(): Promise<{ row: string; label: string; job: Job }[]> {
  const { Db } = await import("../api/src/core.ts");
  const { PqrDrafts } = await import("../api/src/pqr-drafts.ts");
  const db = new Db();
  try {
    const c = await db.combination.findFirst({ where: { combinationKey: COMBINATION, retiredAt: null } });
    if (!c) throw new Error(`no ${COMBINATION} combination in this database: run Demo › Reset to the six on the copy first`);
    // The same guide, input and trail the C4.7 and C4.11 steps read (pqr-drafts.ts guide; draft-qd.ts uses it too).
    const g = await new PqrDrafts(db, null as never, null as never).guide(c);
    if (!g.input) throw new Error(`${g.code} is not among the official files the AI may read`);
    const ctx = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], batchId: BATCH };
    return (await trackAJobs()).map((t) => ({ row: t.row, label: t.label, job: roundJob(t.step, t.isCheck, ctx) as Job }));
  } finally { await db.$disconnect(); }
}

export const jobText = (job: Job) => JSON.stringify(job, null, 1) + "\n";

/** One job's costs from the code's own estimators, with no model call: the request it would send is built by the
 *  launcher's own builder (p2/prompt.ts buildRequest over the guard's admitted inputs). */
export function costsOf(job: Job) {
  const admitted = admitRun({ inputs: { official_files: job.inputs }, settings: job.settings as never });
  const req = buildRequest(readFileSync(join(PROMPTS, job.template), "utf8"), JSON.parse(readFileSync(join(PROMPTS, job.output_schema), "utf8")), admitted, job.known);
  const bytes = Buffer.byteLength(JSON.stringify(req), "utf8");
  const model = String(job.settings.model), out = Number(job.settings.max_output_tokens), attempts = Number(job.settings.max_attempts);
  const perAttempt = costUsd(model, inputTokenBound(JSON.stringify(req)), out);
  const usual = costUsd(model, Math.round(bytes * measuredTokensPerByte()), MEASURED.outputTokens * 2);
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--write")) {
    for (const { label, job } of await deriveJobs()) {
      writeFileSync(join(JOBS, `${job.job_id}.json`), jobText(job));
      console.log(`wrote p2/jobs/${job.job_id}.json  (${label})`);
    }
  }
  const jobs = await trackAJobs();
  const files = (await import("node:fs")).readdirSync(JOBS);
  let worst = 0, usual = 0;
  console.log(`\nTrack A jobs for ${COMBINATION}, in run order (no model call; worst = the runner's reservation, usual = estimate):`);
  for (const t of jobs) {
    const prefix = `${t.isCheck ? `${t.step.jobBase}-check` : t.step.jobBase}-`;
    const f = files.find((x) => x.startsWith(prefix) && x.endsWith(`.json`) && (t.isCheck || !x.startsWith(`${t.step.jobBase}-check-`)));
    if (!f) { console.log(`  ${t.row} ${t.label}: no job file yet (run with --write)`); continue; }
    const job = JSON.parse(readFileSync(join(JOBS, f), "utf8")) as Job, c = costsOf(job);
    worst += c.worst_usd; usual += c.usual_usd;
    console.log(`  ${t.row} ${t.label}: ${job.job_id}  worst ${usd(c.worst_usd)} (${job.settings.max_attempts} × ${usd(c.per_attempt_worst_usd)}; request ${c.request_bytes} bytes, output ≤ ${job.settings.max_output_tokens})  usual ~${usd(c.usual_usd)}  budget ${usd(c.budget_usd)}${c.fits_budget ? "" : "  ← ABOVE ITS BUDGET"}`);
  }
  console.log(`  total: worst ${usd(worst)}, usual ~${usd(usual)}`);
  console.log(`Caps the cost check applies to every start (p2/policy.ts, p2/ledger.ts): run cap ${usd(RUN_CAP_USD)}; experiment ${usd(EXPERIMENT_CAP_USD)} and Wave 1 ${usd(WAVE1_CAP_USD)}, both counted since ${WAVE1_START.slice(0, 10)}; the real ledger is on the Mac (.tools/p2-ledger).`);
}
