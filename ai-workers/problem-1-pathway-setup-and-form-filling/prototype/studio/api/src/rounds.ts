// One step runner for every AI step (P-121; W1-10 slice 0, challenge A2), taken out of the S4 form finder unchanged so
// later producers (W1-10's drafting steps, S6's field drafts, S5's "Who can be") run their rounds the same way:
//  - a round is either a replay of the newest saved real run of exactly this job (same files, same prompt, same
//    combination; engine/rounds.ts) at US$0, or a guarded live call (p2/launch.ts: stub pass first, ledger, run cap);
//  - a wrong-shape or unreadable answer is never used; the step says why in plain words;
//  - the job file is only the launcher's input and is removed after the round (the run record keeps it);
//  - Stop ends the round running now for that run, and no other.
// Comparing the two rounds stays engine/agreement.ts compareRounds; each producer keeps its own steps and rules.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { MAX_ATTEMPTS, MAX_PAID_ATTEMPTS_PER_FORM, RUN_CAP_USD } from "../../../p2/policy.ts";
import { costBesideLimit, isProviderLimit } from "../../engine/ai-run.ts";
import { editionOfContextKey, isFinishedRun, isSameSavedRun, jobIdFor, LIVE_RUN, newestFirst, promptOfRun, replayPattern, type SavedRun } from "../../engine/rounds.ts";
import { PROTOTYPE, SOLUTION } from "./core.ts";
import type { Sources } from "./sources.ts";

export { LIVE_RUN, newestFirst, type SavedRun };
export const ROUTE = "anthropic-api/aiw-d261-prototype-exception-aiw-d260", MODEL = "claude-opus-5-5";
const JOBS = join(PROTOTYPE, "p2", "jobs"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
export const RUNS = join(PROTOTYPE, "p2", "runs");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** One AI step: its prompts (draft and blind checker), output schema, model settings, the shape an answer must have, and
 *  the plain words its reasons use. */
export type AiStep = {
  kind: string; jobBase: string; configurationVersion: string;
  template: string; check: string; schema: string; effort: "low" | "medium" | "high"; max_output_tokens: number;
  shapeOk: (o: unknown) => boolean;
  /** Optional per step: the run cap of one round (US$) and its time limit (ms). Without them a round's cap is sized from
   *  its measured input so one retry fits (QA-87; never below US$1, never above the run cap), and it gets 300 000 ms. */
  budget_usd?: number; timeout_ms?: number;
  /** W1-10 slice 1 (plan §4): earlier prompt versions whose saved runs this step still replays, each with the words a
   *  person sees ("saved before channels"); any other version is never replayed. */
  replays?: { template: string; check: string; label: string; /** QA-162: how many of the round's inputs that version read (the first n; all when unset) */ inputs?: number }[];
  /** Saved runs made before job keys existed, by file name → combination key (reviewed list). */
  legacyKeys?: Record<string, string>;
  words: { noSaved: string; badSaved: string; nothingUsed: string };
};
/** One AI round's outcome: an answer (live or replayed) or a plain reason it has none. */
export type RoundOut<T> = { ok: true; output: T; costUsd: number; from: "live" | "replay"; runFile: string; /** an earlier prompt's label when replayed from it */ earlier?: string } | { ok: false; reason: string; costUsd: number; blocked?: boolean; cancelled?: boolean; details?: string };
/** One round's context. `contextKey` is what its saved answer belongs to: a combination's key, or a form edition
 *  (`edition:<code>:<edition>`, engine/rounds.ts editionContextKey). `trail` is the plain place name the job carries. */
export type RoundContext = { trail: string; contextKey: string; inputs: { file: string; sha256: string }[]; mode: "live" | "replay" | "rules"; wanted: () => Promise<boolean>; batchId?: string;
  /** P-179: the person's Continue this run was started with; passed to each live call (the ledger checks it). */
  override?: { id: string; run_key: string };
  /** C4.7 break B1 (2 Nov): replay only a saved run of this job stem (pairOf), so a draft and its checker round come from
   *  the same live run, never two runs mixed. Unset: the newest usable run, as before. */
  replayPair?: string;
  /** QA-162 break M2: replay only answers to this prompt version (its replays label; "" for the current one), so a
   *  draft round is never paired with a checker round of another prompt version. Unset: any replayable version. */
  replayPrompt?: string;
  /** C3.4 break B1 (3 Nov): every run of one committed job shares its stem, so the stem alone can pair a checker with a
   *  later run's draft. When set, only a saved run stamped after `after` and before `before` ("-live-<time>") is replayed. */
  replayWindow?: { after: string; before: string } };

/** A saved run file's time stamp ("20261102t130134336z"), as named by the launcher; "" when it has none. */
export const runTime = (file: string) => /-live-(\d{8}t\d{9}z)-[a-z0-9]+\.json$/.exec(file)?.[1] ?? "";

/** The job stem a saved run file shares with the other round of the same live run: the file name without its round base
 *  ("<jobBase>-" or "<jobBase>-check-") and without its "-live-<time>-<suffix>.json" tail. */
export const pairOf = (step: Pick<AiStep, "jobBase">, isCheck: boolean, file: string) =>
  file.replace(/^.*\//, "").replace(new RegExp(`^${step.jobBase}-${isCheck ? "check-" : ""}`), "").replace(/-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/, "");

/** Lead 29 Oct (G4): may a form's run number `attempt` be retried? A live form has one budget of paid attempts across its
 *  runs (p2/policy.ts), each run counted at the most it could use; a stub run costs nothing and is never counted. */
export const paidRetryAllowed = (mode: string, attempt: number) => mode !== "LIVE" || (attempt + 1) * MAX_ATTEMPTS <= MAX_PAID_ATTEMPTS_PER_FORM;

/** Outside review 29 Oct: the budget holds per form across batches, not only for retries inside one. The live field-map
 *  runs of one form (its file) that may have used paid attempts: a run with a cost (its own or reserved at its worst case),
 *  or one still running. A run that sent nothing (a stub refusal, nothing to draft, all at US$0) is not counted. */
export const paidRunsOf = (jobs: { kind: string; mode: string; status: string; costUsd: number | null }[]) =>
  jobs.filter((j) => j.kind === "field_map" && j.mode === "LIVE" && ((j.costUsd ?? 0) > 0 || (j.costUsd === null && j.status === "RUNNING"))).length;
/** May a form that already used `paidRuns` live runs start one more? */
export const paidRunAllowed = (paidRuns: number) => (paidRuns + 1) * MAX_ATTEMPTS <= MAX_PAID_ATTEMPTS_PER_FORM;

/** QA-87: a round's run cap when the step names none: both attempts of its worst case fit (inputs and prompt measured in
 *  bytes, as the ledger bounds them), at least US$1, at most the run cap. */
export function sizedBudgetUsd(step: Pick<AiStep, "max_output_tokens" | "budget_usd">, requestBytes: number): number {
  if (step.budget_usd !== undefined) return step.budget_usd;
  const perAttempt = costUsd(MODEL, requestBytes + 2_000, step.max_output_tokens);
  return Math.max(1, Math.min(RUN_CAP_USD, Math.ceil(perAttempt * MAX_ATTEMPTS * 100) / 100));
}

/** A round's worst case as the ledger reserves it: inputs bounded by characters, both attempts, never above the run cap. */
export const worstRoundUsd = (step: AiStep, inputChars: number) => Math.min(RUN_CAP_USD, costUsd(MODEL, inputTokenBound("x".repeat(inputChars)), step.max_output_tokens) * 2);

/** C4.11 review m1: the most one round can reserve, as the launcher's job carries it (sizedBudgetUsd over the whole request
 *  in bytes, both attempts); never below worstRoundUsd. What a plan states as its worst case. */
export const roundBudgetUsd = (step: AiStep, isCheck: boolean, inputs: { file: string }[], inputChars: number) =>
  Math.max(worstRoundUsd(step, inputChars), sizedBudgetUsd(step, requestBytesOf(isCheck ? step.check : step.template, inputs)));

/** The bytes a round sends: its prompt and its input files (paths are the solution's), plus room for the schema and wrapper. */
const requestBytesOf = (template: string, inputs: { file: string }[]) =>
  inputs.reduce((n, i) => { try { return n + statSync(join(SOLUTION, i.file)).size; } catch { return n; } }, 0) + (() => { try { return statSync(join(PROMPTS, template)).size; } catch { return 0; } })() + 8_000;

/** The launcher job of one live round, exactly as `round` writes it (PA: the paid runner's committed job files are made
 *  with this, so a result recorded on the Mac through p2/launch.ts is the run this round's replay finds). */
export function roundJob(step: AiStep, isCheck: boolean, ctx: Pick<RoundContext, "trail" | "contextKey" | "inputs" | "batchId">) {
  const template = isCheck ? step.check : step.template;
  // The launcher admits one known fact (p2/launch.ts knownOk): a combination's trail, or a printed form edition.
  const edition = editionOfContextKey(ctx.contextKey);
  return { job_id: jobIdFor(step.jobBase, isCheck, ctx.trail, ctx.batchId), kind: step.kind, combination: ctx.contextKey, configuration_version: step.configurationVersion, template, output_schema: step.schema, inputs: ctx.inputs,
    settings: { provider_route: ROUTE, model: MODEL, effort: step.effort, timeout_ms: step.timeout_ms ?? 300_000, max_attempts: MAX_ATTEMPTS, budget_usd: sizedBudgetUsd(step, requestBytesOf(template, ctx.inputs)), max_output_tokens: step.max_output_tokens },
    known: edition ? { form_edition: `${edition.code} (${edition.edition})` } : { combination_trail: ctx.trail } };
}

const readRun = (f: string): SavedRun | null => { try { return { ...JSON.parse(readFileSync(join(RUNS, f), "utf8")), file: f }; } catch { return null; } };

export class StepRunner {
  constructor(private readonly launcher: Pick<Sources, "launchOnce">) {}

  /** The job running now for each run (its exact launcher job id), so Stop ends that call and no other. */
  private liveJobs = new Map<string, string>();
  liveJob(batchId: string) { return this.liveJobs.get(batchId); }

  /** Saved live runs of exactly this job prefix ("<prefix>-live-…"), newest first by name. */
  savedRuns(prefix: string): SavedRun[] {
    if (!existsSync(RUNS)) return [];
    return readdirSync(RUNS).filter((f) => f.startsWith(`${prefix}-live-`) && f.endsWith(".json")).sort().reverse().map(readRun).filter((r): r is SavedRun => !!r);
  }
  /** Saved live runs whose job id starts with this prefix and has the trail fingerprint after it, newest first by time. */
  savedRunsLike(prefix: string): SavedRun[] {
    if (!existsSync(RUNS)) return [];
    return readdirSync(RUNS).filter((f) => f.startsWith(`${prefix}-`) && LIVE_RUN.test(f)).sort(newestFirst).map(readRun).filter((r): r is SavedRun => !!r);
  }

  /** One AI round: replay the newest saved real run of exactly this job (same files, same prompt), or a guarded live call. */
  async round<T>(step: AiStep, isCheck: boolean, ctx: RoundContext): Promise<RoundOut<T>> {
    const template = isCheck ? step.check : step.template;
    const jobId = jobIdFor(step.jobBase, isCheck, ctx.trail, ctx.batchId);
    const want = { templateSha256: sha(readFileSync(join(PROMPTS, template))), inputs: ctx.inputs, contextKey: ctx.contextKey, legacy: step.legacyKeys ?? {} };
    if (ctx.mode === "replay") {
      // Round 2 m-a: an unreadable or wrong-shape answer is skipped and an older good one is used.
      const mine = replayPattern(step.jobBase, isCheck);
      // The current prompt's answer first; else one of an earlier version the step still replays (plan §4), labelled.
      const prompts = [{ sha256: want.templateSha256, label: "", inputs: undefined as number | undefined }, ...(step.replays ?? []).map((v) => ({ sha256: sha(readFileSync(join(PROMPTS, isCheck ? v.check : v.template))), label: v.label, inputs: v.inputs }))];
      const runs = (existsSync(RUNS) ? readdirSync(RUNS).filter((f) => mine.test(f) && (ctx.replayPair === undefined || pairOf(step, isCheck, f) === ctx.replayPair)
        && (!ctx.replayWindow || (runTime(f) > ctx.replayWindow.after && runTime(f) < ctx.replayWindow.before))).sort(newestFirst) : []).map(readRun);
      const usable = (x: SavedRun | null, p: { sha256: string; inputs?: number }): x is SavedRun => !!x && isSameSavedRun(x, { ...want, templateSha256: p.sha256, inputs: p.inputs === undefined ? want.inputs : want.inputs.slice(0, p.inputs) }) && (() => { try { return step.shapeOk(JSON.parse(String(x.raw_output))); } catch { return false; } })();
      let r: SavedRun | undefined, label = "";
      for (const p of prompts.filter((x) => ctx.replayPrompt === undefined || x.label === ctx.replayPrompt)) { r = runs.find((x): x is SavedRun => usable(x, p)); if (r) { label = promptOfRun(r, prompts) ?? ""; break; } }
      if (!r) return { ok: false, costUsd: 0, reason: step.words.noSaved };
      const saved = JSON.parse(String(r.raw_output)) as T;
      if (!step.shapeOk(saved)) return { ok: false, costUsd: 0, reason: step.words.badSaved };
      return { ok: true, output: saved, costUsd: 0, from: "replay", runFile: `prototype/p2/runs/${r.file}`, ...(label ? { earlier: label } : {}) };
    }
    const job = roundJob(step, isCheck, ctx);
    mkdirSync(JOBS, { recursive: true });
    writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    if (ctx.batchId) this.liveJobs.set(ctx.batchId, jobId);
    try { return await this.launch<T>(step, jobId, ctx.wanted, ctx.override); } finally {
      // Review major 7: the job file is only the launcher's input; the run record keeps it. Nothing is left in the source tree.
      if (ctx.batchId) this.liveJobs.delete(ctx.batchId);
      rmSync(join(JOBS, `${jobId}.json`), { force: true });
    }
  }

  private async launch<T>(step: AiStep, jobId: string, wanted: () => Promise<boolean>, override?: { id: string; run_key: string }): Promise<RoundOut<T>> {
    const nothing = step.words.nothingUsed;
    const last = (out: string) => { for (const l of out.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    const stub = await this.launcher.launchOnce(jobId, "stub");
    const sj = last(stub.out);
    if (stub.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped during the free stub pass: nothing was sent." };
    // S3 early look (1): the launcher's own words (a stack, an error code, a server path) go to the server log only.
    if (stub.code !== 0) { console.warn(`${step.kind} ${jobId}: stub refused:`, String(sj?.refused ?? stub.err).trim().slice(-600) || `exit ${stub.code}`); return { ok: false, costUsd: 0, reason: "The AI step could not start on this computer, so nothing was sent and nothing was charged" }; }
    const live = await this.launcher.launchOnce(jobId, "live", wanted, override);
    if (live.cancelled) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped before the AI call was sent: nothing was charged." };
    if (live.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped while the AI call ran: the call was ended. It stays counted at its reserved worst case (the provider may still bill it); nothing of it is used." };
    const lj = last(live.out);
    if (lj?.live_off) return { ok: false, costUsd: 0, reason: lj.refused };
    if (!lj?.run_file) {
      const why = String(lj?.refused ?? lj?.error ?? live.err.split("\n").filter(Boolean).slice(-2).join(" ")).trim() || `the launcher stopped (exit ${live.code})`;
      const limit = /usage limit/i.test(why + live.err);
      if (!limit) console.warn(`${step.kind} ${jobId}: live call did not run:`, why.slice(0, 600));
      return { ok: false, blocked: limit, costUsd: 0, reason: limit ? "The AI provider's usage limit refused the call before any processing: nothing was charged. Use saved AI answers or rules only, or try later." : "The AI step did not run, so nothing was charged" };
    }
    const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
    const cost = Number(rec.drafting_run?.usage?.cost_usd ?? 0);
    // Demo 29 Oct: the AI service refused the request itself (our setup error, e.g. a schema keyword it does not accept):
    // nothing was processed or charged; its own words go to the server log only.
    const attempts = (rec.drafting_run?.attempts ?? []) as { outcome?: string; error?: string }[];
    // Lead 29 Oct (G5): the request was above the step size cap, refused before any call.
    if (attempts.some((a) => a.outcome === "refused_input_too_large")) return { ok: false, costUsd: 0, reason: "The pages are too large for one AI call, so nothing was sent and nothing was charged" };
    const details = attempts.map((a) => (a as { request_id?: string }).request_id).filter(Boolean).pop();
    const withDetails = details ? { details: `Request ${details}` } : {};
    // Audit 29 Oct: a refused or busy attempt costs US$0, but an earlier attempt of the same run (a timeout, a dropped
    // connection) stays counted at its worst case; then the run's recorded cost is shown, never "nothing was charged".
    const charged = cost > 0 ? `; an earlier attempt stays counted at US$${cost.toFixed(2)}` : "";
    // Outside review 29 Oct: the usage limit is a 400 too, so it is found before "our setup error"; only the refused
    // attempt is free, an earlier one counted at its worst case stays counted.
    if (!isFinishedRun(rec.drafting_run?.status) && isProviderLimit(rec)) {
      const kept = costBesideLimit(rec);
      return { ok: false, blocked: true, costUsd: kept, reason: `The AI provider's usage limit refused the call before any processing${kept > 0 ? `; an earlier attempt stays counted at US$${kept.toFixed(2)}` : ": nothing was charged"}. Use saved AI answers or rules only, or try later`, ...withDetails };
    }
    if (!isFinishedRun(rec.drafting_run?.status) && attempts.some((a) => a.outcome === "refused_by_provider")) {
      console.warn(`${step.kind} ${jobId}: the AI service refused the request:`, attempts.map((a) => a.error ?? "").join(" | ").slice(0, 600));
      return { ok: false, costUsd: cost, reason: `The AI service refused the request (our setup error)${charged || "; nothing was charged"}`, ...withDetails };
    }
    // QA-87, QA-88: busy, or no answer in time, said plainly; the service's own words to the server log only.
    if (!isFinishedRun(rec.drafting_run?.status) && attempts.some((a) => a.outcome === "busy")) {
      console.warn(`${step.kind} ${jobId}: the AI service was busy:`, attempts.map((a) => a.error ?? "").join(" | ").slice(0, 600));
      return { ok: false, costUsd: cost, reason: charged ? `The AI service was busy${charged}. Try again in a few minutes` : "The AI service was busy, so nothing was charged. Try again in a few minutes", ...withDetails };
    }
    if (rec.drafting_run?.status === "timed_out") {
      return { ok: false, costUsd: cost, reason: "The AI service did not answer in time; nothing was used", ...withDetails };
    }
    if (!isFinishedRun(rec.drafting_run?.status) || rec.contract_valid !== true || typeof rec.raw_output !== "string") {
      const limit = /usage limit/i.test(JSON.stringify(rec.drafting_run?.attempts ?? []));
      const kept = limit ? costBesideLimit(rec) : cost;
      return { ok: false, blocked: limit, costUsd: kept, reason: limit ? `The AI provider's usage limit refused the call before any processing${kept > 0 ? `; an earlier attempt stays counted at US$${kept.toFixed(2)}.` : ": nothing was charged."}` : `The AI answer could not be used (${rec.drafting_run?.status ?? "no status"}${rec.output_errors ? ": it did not match the expected shape" : ""}). ${nothing}` };
    }
    let output: T; try { output = JSON.parse(rec.raw_output); } catch { return { ok: false, costUsd: cost, reason: `The AI answer was not readable. ${nothing}` }; }
    if (!step.shapeOk(output)) return { ok: false, costUsd: cost, reason: `The AI answer did not have the expected shape. ${nothing}` };
    return { ok: true, output, costUsd: cost, from: "live", runFile: String(lj.run_file).replace(`${SOLUTION}/`, "") };
  }
}
