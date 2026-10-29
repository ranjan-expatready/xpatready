// One step runner for every AI step (P-121; W1-10 slice 0, challenge A2), taken out of the S4 form finder unchanged so
// later producers (W1-10's drafting steps, S6's field drafts, S5's "Who can be") run their rounds the same way:
//  - a round is either a replay of the newest saved real run of exactly this job (same files, same prompt, same
//    combination; engine/rounds.ts) at US$0, or a guarded live call (p2/launch.ts: stub pass first, ledger, run cap);
//  - a wrong-shape or unreadable answer is never used; the step says why in plain words;
//  - the job file is only the launcher's input and is removed after the round (the run record keeps it);
//  - Stop ends the round running now for that run, and no other.
// Comparing the two rounds stays engine/agreement.ts compareRounds; each producer keeps its own steps and rules.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { RUN_CAP_USD } from "../../../p2/policy.ts";
import { editionOfContextKey, isSameSavedRun, jobIdFor, LIVE_RUN, newestFirst, replayPattern, type SavedRun } from "../../engine/rounds.ts";
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
  /** Saved runs made before job keys existed, by file name → combination key (reviewed list). */
  legacyKeys?: Record<string, string>;
  words: { noSaved: string; badSaved: string; nothingUsed: string };
};
/** One AI round's outcome: an answer (live or replayed) or a plain reason it has none. */
export type RoundOut<T> = { ok: true; output: T; costUsd: number; from: "live" | "replay"; runFile: string } | { ok: false; reason: string; costUsd: number; blocked?: boolean; cancelled?: boolean };
/** One round's context. `contextKey` is what its saved answer belongs to: a combination's key, or a form edition
 *  (`edition:<code>:<edition>`, engine/rounds.ts editionContextKey). `trail` is the plain place name the job carries. */
export type RoundContext = { trail: string; contextKey: string; inputs: { file: string; sha256: string }[]; mode: "live" | "replay" | "rules"; wanted: () => Promise<boolean>; batchId?: string };

/** A round's worst case as the ledger reserves it: inputs bounded by characters, both attempts, never above the run cap. */
export const worstRoundUsd = (step: AiStep, inputChars: number) => Math.min(RUN_CAP_USD, costUsd(MODEL, inputTokenBound("x".repeat(inputChars)), step.max_output_tokens) * 2);

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
      const r = (existsSync(RUNS) ? readdirSync(RUNS).filter((f) => mine.test(f)).sort(newestFirst) : []).map(readRun)
        .find((x): x is SavedRun => !!x && isSameSavedRun(x, want) && (() => { try { return step.shapeOk(JSON.parse(String(x.raw_output))); } catch { return false; } })());
      if (!r) return { ok: false, costUsd: 0, reason: step.words.noSaved };
      const saved = JSON.parse(String(r.raw_output)) as T;
      if (!step.shapeOk(saved)) return { ok: false, costUsd: 0, reason: step.words.badSaved };
      return { ok: true, output: saved, costUsd: 0, from: "replay", runFile: `prototype/p2/runs/${r.file}` };
    }
    // The launcher admits one known fact (p2/launch.ts knownOk): a combination's trail, or a printed form edition.
    const edition = editionOfContextKey(ctx.contextKey);
    const job = { job_id: jobId, kind: step.kind, combination: ctx.contextKey, configuration_version: step.configurationVersion, template, output_schema: step.schema, inputs: ctx.inputs,
      settings: { provider_route: ROUTE, model: MODEL, effort: step.effort, timeout_ms: 300_000, max_attempts: 2, budget_usd: 1, max_output_tokens: step.max_output_tokens },
      known: edition ? { form_edition: `${edition.code} (${edition.edition})` } : { combination_trail: ctx.trail } };
    mkdirSync(JOBS, { recursive: true });
    writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    if (ctx.batchId) this.liveJobs.set(ctx.batchId, jobId);
    try { return await this.launch<T>(step, jobId, ctx.wanted); } finally {
      // Review major 7: the job file is only the launcher's input; the run record keeps it. Nothing is left in the source tree.
      if (ctx.batchId) this.liveJobs.delete(ctx.batchId);
      rmSync(join(JOBS, `${jobId}.json`), { force: true });
    }
  }

  private async launch<T>(step: AiStep, jobId: string, wanted: () => Promise<boolean>): Promise<RoundOut<T>> {
    const nothing = step.words.nothingUsed;
    const last = (out: string) => { for (const l of out.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
    const stub = await this.launcher.launchOnce(jobId, "stub");
    const sj = last(stub.out);
    if (stub.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped during the free stub pass: nothing was sent." };
    // S3 early look (1): the launcher's own words (a stack, an error code, a server path) go to the server log only.
    if (stub.code !== 0) { console.warn(`${step.kind} ${jobId}: stub refused:`, String(sj?.refused ?? stub.err).trim().slice(-600) || `exit ${stub.code}`); return { ok: false, costUsd: 0, reason: "The AI step could not start on this computer, so nothing was sent and nothing was charged" }; }
    const live = await this.launcher.launchOnce(jobId, "live", wanted);
    if (live.cancelled) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped before the AI call was sent: nothing was charged." };
    if (live.stopped) return { ok: false, cancelled: true, costUsd: 0, reason: "Stopped while the AI call ran: the call was ended. It stays counted at its reserved worst case (the provider may still bill it); nothing of it is used." };
    const lj = last(live.out);
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
    if (rec.drafting_run?.status !== "completed" && attempts.some((a) => a.outcome === "refused_by_provider")) {
      console.warn(`${step.kind} ${jobId}: the AI service refused the request:`, attempts.map((a) => a.error ?? "").join(" | ").slice(0, 600));
      return { ok: false, costUsd: 0, reason: "The AI service refused the request (our setup error); nothing was charged" };
    }
    if (rec.drafting_run?.status !== "completed" || rec.contract_valid !== true || typeof rec.raw_output !== "string") {
      const limit = /usage limit/i.test(JSON.stringify(rec.drafting_run?.attempts ?? []));
      return { ok: false, blocked: limit, costUsd: limit ? 0 : cost, reason: limit ? "The AI provider's usage limit refused the call before any processing: nothing was charged." : `The AI answer could not be used (${rec.drafting_run?.status ?? "no status"}${rec.output_errors ? ": it did not match the expected shape" : ""}). ${nothing}` };
    }
    let output: T; try { output = JSON.parse(rec.raw_output); } catch { return { ok: false, costUsd: cost, reason: `The AI answer was not readable. ${nothing}` }; }
    if (!step.shapeOk(output)) return { ok: false, costUsd: cost, reason: `The AI answer did not have the expected shape. ${nothing}` };
    return { ok: true, output, costUsd: cost, from: "live", runFile: String(lj.run_file).replace(`${SOLUTION}/`, "") };
  }
}
