// C4.11 acceptance contract, part 4a (forms lane; acceptance/C4.11.test.ts; concept W1-ai-drafting §7): the plan and the
// run of "Draft questions and documents" by its seven step keys, over the same run engine as api/src/draft-qd.ts (whose
// /draft-qd routes stay for the dialog):
//   POST /api/combinations/:id/draft/plan {steps:[{step, mode: "live"|"replay"|"rules"}]}
//     → each step with its mode, its cost {usual, worst} and, for a replayed step, its saved result; plan_sha256.
//   POST /api/combinations/:id/draft {planSha256, idempotencyKey, spendLimitUsd} → {runId}; the same key is the same run.
// Part 5b (P-227): Live runs only when the server's live switch is open; then each Live AI step states its worst case
// before anything runs and the run is refused over the spend limit (BR-12). With the switch closed a live plan is shown
// (costs not invented) but never runs. A plan lives in this server's memory for an hour; after a restart the run asks
// for the plan again (409), never runs a plan nobody saw.
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { actorOf, Db, need, readerOf, type Actor } from "./core.ts";
import { DraftQd } from "./draft-qd.ts";
import { LIVE_WAITING } from "./pqr-drafts.ts";
import { aiLive } from "./sources.ts";
import { savedReading, staleReading } from "./saved-readings.ts";
import type { QdKind } from "../../engine/draft-qd.ts";

/** The contract's step keys, in run order, and the run engine's step each one is. */
export const CONTRACT_STEPS = ["facts", "documents", "document_facts", "comes_from", "conditions", "pqr_picks", "checker"] as const;
export type ContractStep = (typeof CONTRACT_STEPS)[number];
export const KIND_OF: Record<ContractStep, QdKind> = { facts: "qd_facts", documents: "qd_documents", document_facts: "qd_document_facts", comes_from: "qd_sources", conditions: "qd_conditions", pqr_picks: "pqr_picks", checker: "qd_check" };
export const STEP_OF: Record<string, ContractStep> = Object.fromEntries(Object.entries(KIND_OF).map(([k, v]) => [v, k as ContractStep]));
/** Steps whose work is AI's (replayed from a saved answer, or live); the others are worked out by the rules. */
export const AI_STEPS: ReadonlySet<ContractStep> = new Set(["documents", "conditions", "pqr_picks", "checker"]);
/** What each step needs planned before it (its inputs). */
const NEEDS: Record<ContractStep, ContractStep[]> = { facts: [], documents: ["facts"], document_facts: ["documents"], comes_from: ["facts", "document_facts"], conditions: ["facts"], pqr_picks: ["facts"], checker: ["facts"] };
/** A run step's outcome in the contract's words (the run card keeps its own status words). */
export function stepState(status: string): "done" | "nothing_to_do" | "failed" | "stopped" | "waiting" | "running" {
  return status === "COMPLETED" ? "done" : status === "SKIPPED" ? "nothing_to_do" : status === "FAILED" || status === "BLOCKED" ? "failed" : status === "CANCELLED" ? "stopped" : status === "RUNNING" ? "running" : "waiting";
}

const PlanBody = z.object({ steps: z.array(z.object({ step: z.string(), mode: z.enum(["live", "replay", "rules"]) }).strict()).min(1).max(7) }).strict();
const RunBody = z.object({ planSha256: z.string().regex(/^[0-9a-f]{64}$/), idempotencyKey: z.string().min(8).max(100), spendLimitUsd: z.number().min(0).max(100) }).strict();
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
type Planned = { combinationId: string; mode: "rules" | "replay" | "live"; engineSha: string; worst: number | null; at: number };
const PLAN_TTL_MS = 60 * 60_000;

/** What the engine's plan says of the saved runs steps 5 and 6 replay (api/src/draft-qd.ts plan). */
type EngineSaved = { files?: { qd_conditions?: string[]; pqr_picks?: string[] }; why_none?: { qd_conditions?: string | null; pqr_picks?: string | null }; guide?: string | null };

@Injectable()
export class DraftContract {
  private readonly plans = new Map<string, Planned>();
  constructor(@Inject(Db) private readonly db: Db, @Inject(DraftQd) private readonly qd: DraftQd) {}

  /** BR-1: every step, how it runs and what it costs, said before anything runs; refused in words when it cannot run. */
  async plan(id: string, body: unknown) {
    const b = PlanBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Send the steps to plan, each with how it runs: live, replay (a saved answer) or rules.");
    const asked = b.data.steps;
    const unknown = asked.filter((s) => !(CONTRACT_STEPS as readonly string[]).includes(s.step));
    if (unknown.length) throw problem(400, "Check the request", `Not a step of this run: ${unknown.map((s) => s.step).join(", ")}. The steps are ${CONTRACT_STEPS.join(", ")}.`);
    const order = asked.map((s) => CONTRACT_STEPS.indexOf(s.step as ContractStep));
    if (order.some((n, i) => i > 0 && n <= order[i - 1])) throw problem(400, "Steps out of order", `Plan the steps in their order, each once: ${CONTRACT_STEPS.join(", ")}.`);
    const have = new Set(asked.map((s) => s.step));
    const missing = asked.flatMap((s) => NEEDS[s.step as ContractStep].filter((n) => !have.has(n)).map((n) => `${s.step} needs ${n}`));
    if (missing.length) throw problem(400, "A step's inputs are not planned", `${missing.join("; ")}: plan those steps too.`);
    // Part 4a runs the whole run (the engine has no partial run yet): every step is planned.
    if (asked.length !== CONTRACT_STEPS.length) throw problem(400, "Plan every step", `This run drafts all seven steps together for now; plan ${CONTRACT_STEPS.filter((s) => !have.has(s)).join(", ")} too.`);
    // Review M1: a rules step asked for live is first of all a live request: it gets the live answer (409, live not
    // approved), naming the rules steps too, so a person asking for "everything live" learns that AI now waits.
    const liveRules = asked.filter((s) => !AI_STEPS.has(s.step as ContractStep) && s.mode === "live").map((s) => s.step);
    if (liveRules.length && !aiLive()) throw problem(409, "Live is not open yet", `${LIVE_WAITING} Also, ${liveRules.join(", ")} ${liveRules.length === 1 ? "is" : "are"} worked out by the rules (no AI): plan ${liveRules.length === 1 ? "it" : "them"} as rules.`, { live: { approved: false, why: LIVE_WAITING, steps: asked.filter((s) => s.mode === "live").map((s) => s.step) } });
    const ruleWrong = asked.filter((s) => !AI_STEPS.has(s.step as ContractStep) && s.mode !== "rules");
    if (ruleWrong.length) throw problem(400, "Rules steps", `${ruleWrong.map((s) => s.step).join(", ")} ${ruleWrong.length === 1 ? "is" : "are"} worked out by the rules (no AI): plan ${ruleWrong.length === 1 ? "it" : "them"} as rules.`);
    const c = await this.db.combination.findUnique({ where: { id: /^[0-9a-f-]{36}$/i.test(id) ? id : "00000000-0000-0000-0000-000000000000" } });
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const live = asked.filter((s) => s.mode === "live").map((s) => s.step);
    const aiModes = new Set(asked.filter((s) => AI_STEPS.has(s.step as ContractStep)).map((s) => s.mode));
    if (aiModes.size > 1) throw problem(400, "One way for the AI steps", "For now the AI steps of one run all run Live, all replay their saved answers, or all use the rules: choose one.");
    // With the switch closed a live plan is shown (BR-1: the person sees what it would do) but cannot run, and its price is
    // not invented (BR-12 refuses it at the run, before any call). With it open, the engine states each step's worst case.
    const mode: "rules" | "replay" | "live" = aiModes.has("live") ? "live" : aiModes.has("replay") ? "replay" : "rules";
    const open = mode === "live" && aiLive();
    const engine = await this.qd.plan(id, { mode: mode === "live" && !open ? "rules" : mode });
    const checklists = mode === "replay" || open ? await this.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Document checklist", recognised: true }, select: { edition: true, fileName: true, officialFile: true } }) : [];
    const steps = asked.map((s) => {
      const step = s.step as ContractStep, n = CONTRACT_STEPS.indexOf(step) + 1, e = engine.steps.find((x) => x.kind === KIND_OF[step]);
      const cost = s.mode !== "live" ? { usual: 0, worst: 0, currency: "USD" }
        : !open ? { usual: null, worst: null, currency: "USD", why: "Not estimated: Live is not open on this copy." }
        : { usual: null, worst: e?.worst_usd ?? 0, currency: "USD", why: (e?.worst_usd ?? 0) > 0 ? "The most its two AI rounds can reserve; the usual cost is not estimated yet." : step === "documents" ? "US$0: in a Live run this step uses its saved checklist reading (the checklist's Live reading is on its page)." : step === "checker" ? "US$0 here: the blind checker rounds are counted under conditions and pqr_picks; the rest is rules." : "US$0: worked out without an AI call." };
      return { step, n, label: e?.label ?? step, mode: s.mode, uses_ai: AI_STEPS.has(step) && s.mode !== "rules", cost, saved: s.mode === "replay" || (open && step === "documents") ? this.saved(step, checklists, engine.saved) : null };
    });
    const worst = live.length && !open ? null : Math.round(steps.reduce((a, s) => a + (s.cost.worst ?? 0), 0) * 100) / 100;
    const plan_sha256 = sha(JSON.stringify({ engine: engine.plan_sha256, steps: steps.map((s) => [s.step, s.mode]) }));
    this.plans.set(plan_sha256, { combinationId: c.id, mode, engineSha: engine.plan_sha256, worst, at: Date.now() });
    for (const [k, v] of this.plans) if (Date.now() - v.at > PLAN_TTL_MS) this.plans.delete(k);
    return { combination: engine.combination, steps, totals: { usual_usd: open ? null : 0, worst_usd: worst, remaining_usd: engine.totals.remaining_usd }, facts: engine.facts, note: engine.note, live: { approved: aiLive(), why: aiLive() ? null : LIVE_WAITING, steps: live }, plan_sha256 };
  }

  /** A replayed step's saved result, as far as it is known before the run: the documents step reads the saved checklist
   *  readings now; the others are looked up when the step runs (a step with none says so then and proposes nothing). */
  private saved(step: ContractStep, checklists: { edition: string | null; fileName: string; officialFile: string | null }[], engineSaved?: EngineSaved | null) {
    if (step === "documents") {
      const found = checklists.map((a) => ({ a, r: savedReading(a.officialFile) })).filter((x) => x.r);
      // BR-10: a saved reading of an older text of this checklist is out of date: named, never offered as Replay.
      const stale = !found.length ? checklists.map((a) => ({ a, r: staleReading(a.officialFile) })).find((x) => x.r) : undefined;
      if (stale) return { usd: 0, state: "out_of_date", date: null, edition: stale.a.edition ?? stale.a.fileName, run_file: stale.r!.runFile, why: `The saved AI reading was of an earlier text of ${stale.a.edition ?? stale.a.fileName}, so it is not replayed. A new reading is recorded in an approved Live run of the checklist, on its page; meanwhile this step proposes nothing.` };
      if (!found.length) return { usd: 0, state: "none", date: null, edition: null, why: checklists.length ? "No saved AI reading of this combination's checklist yet: it is recorded in an approved Live run of the checklist, on its page." : "No official document checklist among this combination's sources yet." };
      const date = /(\d{8})t/i.exec(found[0].r!.runFile)?.[1];
      return { usd: 0, state: "current", date: date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : null, edition: found[0].a.edition ?? found[0].a.fileName, run_file: found[0].r!.runFile };
    }
    // C4.11 (QA-162 pack): steps 5 and 6 name the saved run they replay (both rounds of one Live run, matched to this
    // combination's guide and prompt now, as the run will); step 7's blind checker is those runs' second rounds plus the rules.
    const files = (k: "qd_conditions" | "pqr_picks") => engineSaved?.files?.[k] ?? [];
    const own = step === "conditions" ? files("qd_conditions") : step === "pqr_picks" ? files("pqr_picks") : step === "checker" ? [...files("qd_conditions").slice(1), ...files("pqr_picks").slice(1)] : [];
    if (engineSaved?.files && own.length) {
      const date = /(\d{8})t/i.exec(own[0])?.[1];
      return { usd: 0, state: "current", date: date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : null, edition: engineSaved.guide ?? null, run_file: own[0], run_files: own,
        ...(step === "checker" ? { why: "The independent checker: the saved second (blind) readings of steps 5 and 6, then the four rules. US$0." } : {}) };
    }
    if (engineSaved?.files) return { usd: 0, state: "none", date: null, edition: engineSaved.guide ?? null, why: (step === "conditions" ? engineSaved.why_none?.qd_conditions : step === "pqr_picks" ? engineSaved.why_none?.pqr_picks : null) ?? "No saved AI answer for this step yet: the step says so when it runs and proposes nothing (US$0)." };
    return { usd: 0, state: "looked_up_at_run", date: null, edition: null, why: "Its saved answer is matched to the exact guide, prompt and combination when the step runs; with none, the step says so and proposes nothing (US$0)." };
  }

  /** Runs a plan that was shown (409 otherwise), once per idempotency key; never over the spend limit (BR-12). */
  async run(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const b = RunBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Send the plan's fingerprint (planSha256), an idempotency key and the spend limit in US$.");
    const p = this.plans.get(b.data.planSha256);
    if (!p || p.combinationId !== id.toLowerCase() || Date.now() - p.at > PLAN_TTL_MS) throw problem(409, "Look at the plan again", "This is not a plan shown for this combination in the last hour (or the forms, people or steps changed): plan again before it runs.");
    if (p.worst === null || (p.mode === "live" && !aiLive())) throw problem(409, "Live is not open yet", `This plan has Live steps: ${LIVE_WAITING} Nothing was called; use saved results or rules only.`, { live: { approved: false } });
    if (p.worst > b.data.spendLimitUsd) throw problem(409, "Over the spend limit", `The worst case, US$${p.worst.toFixed(2)}, is over the limit of US$${b.data.spendLimitUsd.toFixed(2)}: use saved results or rules only, or raise the limit.`);
    const r = await this.qd.run(actor, p.combinationId, { mode: p.mode, planSha256: p.engineSha }, { idempotencyKey: b.data.idempotencyKey });
    return { runId: r.runId, status: r.status, again: "again" in r ? true : undefined };
  }
}

type H = string | undefined;
@Controller("api")
export class DraftContractController {
  constructor(@Inject(DraftContract) private readonly d: DraftContract) {}
  @Post("combinations/:id/draft/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { readerOf(a); return this.d.plan(id, b); }
  @Post("combinations/:id/draft") @HttpCode(201) run(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.d.run(actorOf(a), id, b); }
}
