// C4.11 "Draft questions and documents" (P-130, P-131, P-121, P-123; W1-questions-and-documents concept §4; W1-ai-drafting
// plan §1; forms lane, swarm builder B4b): one run of seven steps on one combination, shown on the shared run card
// (/api/runs/:id, with Stop), each step's items going into the one review queue (insertProposals) for a person to accept.
// Part 1 (this file): the run, its plan and card; steps 1, 3, 4 and 7 by rules (engine/draft-qd.ts), step 6 by the C4.7
// producer (pqr-drafts.ts: rules only or its saved AI answers). Steps 2 (documents, from the saved checklist readings of
// C2.6) and 5 (conditions, new prompts) say plainly that they are not available yet; they come in the next parts.
// C4.11 live wiring (Track B, P-227; part 5a): a person chooses Live or Saved. Live runs steps 5 and 6 as real AI rounds
// (a first round and a blind checker round each) only when the server's live switch is open, with the worst case said
// first and kept inside the AI spending cap; Saved replays both rounds of one saved run (rounds.ts pairOf). Step 2 reads
// its saved checklist reading in both (its Live reading is C2.6's, on the checklist page). A failed Live AI step offers
// Saved when one exists. "rules" stays an API path (tests, the acceptance contract), never offered to a person.
import { Body, Controller, Get, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { checkWords, documentFacts, factsPerRole, qdChecks, QD_OPERATION, QD_RULES, QD_STEPS, sourceCounts, sourceWords, type QdFinding, type QdKind } from "../../engine/draft-qd.ts";
import { actorOf, Audit, Db, need, readerOf, type Actor } from "./core.ts";
import { charsOf, factNames, inputsOf, LIVE_WAITING, PqrDrafts, PQR_AI, type SavedState } from "./pqr-drafts.ts";
import { Checklists } from "./checklist.ts";
import { linesOf, savedReading, staleReading } from "./saved-readings.ts";
import { insertProposals } from "./proposals.ts";
import { pairOf, roundBudgetUsd, StepRunner, type AiStep, type RoundContext, type RoundOut } from "./rounds.ts";
import { aiLive, Sources } from "./sources.ts";
import { conditionsFromRounds, conditionsShapeOk, CONDITIONS_STEP, type CondAnswer, type CondRound } from "../../engine/qd-conditions.ts";

/** Step 5's AI step (C4.11 part 2b): a draft round and a blind checker round on the shared step runner, replayed from
 *  saved real answers (US$0); or live on the guarded launcher (live wiring 5a). Prompts: p2/prompts/conditions{,-check}.v1.md. */
export const CONDITIONS_AI: AiStep = {
  kind: CONDITIONS_STEP, jobBase: "studio-qd-conditions", configurationVersion: "c411-conditions",
  // QA-162: v2 gives the rounds the combination's question list and asks for its keys; #531's v1 answers (guide only) still replay.
  template: "conditions.v2.md", check: "conditions-check.v2.md", schema: "conditions-output.v2.schema.json", effort: "low", max_output_tokens: 6000,
  replays: [{ template: "conditions.v1.md", check: "conditions-check.v1.md", label: "Saved before the question list", inputs: 1 }],
  shapeOk: conditionsShapeOk,
  words: {
    noSaved: "No saved AI answer for this guide, prompt and combination yet: it is recorded once in an approved Live run. Meanwhile a person adds conditions on the Questions tab.",
    badSaved: "The saved AI answer could not be read, so it is not used. Meanwhile a person adds conditions on the Questions tab.",
    nothingUsed: "Nothing of it is proposed.",
  },
};

type H = string | undefined;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

/** Steps 2 and 5 are built in the next parts of C4.11; until then they say so on the card (never a pretend result). */
export const NOT_YET: Partial<Record<QdKind, string>> = {
};
/** Tests only (the check's usage line): STUDIO_SLOW_QD_STEP=<ms> waits that long in each step, so Stop can be tested. */
const slowForTest = async () => { const ms = Number(process.env.STUDIO_SLOW_QD_STEP ?? 0); if (ms > 0) await new Promise((r) => setTimeout(r, ms)); };
/** A run of seven rules steps takes about a second; one still running after ten minutes has stopped moving. */
const STALE_MS = 10 * 60_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const NOTHING_CHARGED = /[,:;]? *(so )?nothing (was|is) (sent and nothing was )?charged\.?/i;
type Guide = Awaited<ReturnType<PqrDrafts["guide"]>>;
type StepOut = { status: string; message: string; proposed: number; detail: Record<string, unknown>; usd?: number; offerSaved?: boolean };
/** QA-162 (C4.11 step 5): what the run card lists under the step, one line each: every condition left out with its reason,
 *  then every passage of the guide the AI did not turn into one condition, with its reason (a person sets those by hand). */
export function conditionDetails(res: { dropped: { asks: string; why: string }[]; unresolved: { passage: string; reason: string }[] }): string | null {
  const lines = [...res.dropped.map((x) => `Left out: ${x.asks}: ${x.why}`), ...res.unresolved.map((u) => `Not one condition in the guide: "${u.passage.trim().slice(0, 160)}" ${u.reason.trim()} A person sets it by hand if it is needed.`)];
  return lines.length ? lines.join("\n") : null;
}

export const QdBody = z.object({ mode: z.enum(["rules", "replay", "live"]), planSha256: z.string().regex(/^[0-9a-f]{64}$/).optional() }).strict();

@Injectable()
export class DraftQd {
  /** One step runner for step 5's rounds, so Stop can find the live call running now for a run (review M1). */
  private readonly runner: StepRunner;
  constructor(@Inject(Db) private readonly db: Db, @Inject(PqrDrafts) private readonly pqr: PqrDrafts, @Inject(Checklists) private readonly checklists: Checklists, @Inject(Sources) private readonly sources: Sources, @Inject(Audit) private readonly audit: Audit) { this.runner = new StepRunner(sources); }

  /** A run left running by a stopped server can never finish: it says so, and no longer blocks a new run (as people-ai does). */
  async onModuleInit() {
    for (const b of await this.db.aiBatch.findMany({ where: { operation: QD_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } })) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped during this run; the steps already done stand. Draft again." } });
    }
  }

  /** Stop (runs.ts; break M1): only an author stops a run, and the activity log says who. The run checks it between steps. */
  async stop(actor: Actor, id: string) {
    need(actor, "author");
    const b = await this.db.aiBatch.update({ where: { id }, data: { cancelRequested: true, message: "Stopping" } });
    // Review M1: a live call running now for this run (step 5's, or step 6's through C4.7's producer) is ended too, as the
    // finder's and the AI work page's Stop do; the round then says it was stopped and keeps its cost counted.
    const pqrJob = (await this.db.draftingJob.findFirst({ where: { batchId: id, kind: "pqr_picks" }, select: { id: true } }))?.id;
    const live = [this.runner.liveJob(id), pqrJob ? this.pqr.liveJob(pqrJob) : undefined].filter((x): x is string => !!x);
    if (live.length) this.sources.stopLaunches((jobId) => live.includes(jobId));
    await this.audit.log(b.workspaceId, actor.id, "stopped", "questions and documents", id, `${actor.name} stopped drafting questions and documents for "${b.scopeLabel}"`);
  }

  /** Step 2 (C2.6's replay, unchanged; P-121): each official checklist of the combination with a saved real AI reading of
   *  its exact text is replayed into requirement lines, decided one by one on To review (QA-157: the one door).
   *  Rules only reads no checklist: reading one is AI work, so the step says so and is not run. In a Live run this step
   *  uses the saved reading too (live wiring 5a): a checklist's Live reading is C2.6's own step, on the checklist page. */
  private async documents(actor: Actor, c: { id: string }, mode: string): Promise<{ status: string; message: string; proposed: number; detail: Record<string, unknown> }> {
    if (mode === "rules") return { status: "SKIPPED", message: "Not run without AI: reading IRCC's checklist is AI work. Choose Live or Saved.", proposed: 0, detail: {} };
    const atts = await this.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Document checklist", recognised: true }, orderBy: { edition: "asc" } });
    if (!atts.length) return { status: "FAILED", message: "No official document checklist among this combination's sources yet: attach it under Sources, then draft again.", proposed: 0, detail: {} };
    let proposed = 0; const said: string[] = [], jobs: string[] = [];
    for (const a of atts) {
      const name = a.edition ?? a.fileName, r = savedReading(a.officialFile);
      // #397 m2 (BR-10): a reading of an earlier text is named as out of date, as the plan says, and is not replayed.
      if (!r) { said.push(staleReading(a.officialFile) ? `${name}: its saved AI reading is of an earlier text, so it is out of date and not replayed (a new reading is recorded in an approved Live run of the checklist, on its page)` : `${name}: no saved AI reading yet (it is recorded in an approved Live run of the checklist, on its page)`); continue; }
      // Review m4 (part 2): "replayed before" only when the replay hands back an earlier draft, not because one was applied.
      const prior = new Set((await this.db.draftingJob.findMany({ where: { attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY" }, select: { id: true } })).map((j) => j.id));
      const job = await this.checklists.replay(actor, a);
      jobs.push(job.id);
      const d = (job.detail ?? {}) as { proposed?: number; dropped?: string[]; facts?: string[] };
      const before = prior.has(job.id);
      const n = before ? 0 : d.proposed ?? linesOf(r, name).lines.length;
      proposed += n;
      said.push(before ? `${name}: replayed before; its ${d.proposed ?? 0} document requirement${d.proposed === 1 ? "" : "s"} wait on To review` : `${name}: ${n} document requirement${n === 1 ? "" : "s"}${d.facts?.length ? ` and ${d.facts.length} fact${d.facts.length === 1 ? "" : "s"} their conditions read` : ""} for To review${d.dropped?.length ? `, ${d.dropped.length} left out with the reason` : ""}`);
    }
    const message = `${said.join("; ")}. Saved AI reading, US$0; each line quotes the checklist. They are decided one by one on To review; accepting one writes it to the draft.`;
    return { status: jobs.length ? "COMPLETED" : "FAILED", message, proposed, detail: { checklist_jobs: jobs } };
  }

  /** Step 5 (part 2b): conditional questions from the guide, two rounds replayed from saved answers, the rules of
   *  engine/qd-conditions.ts on each, items of kind `condition` through insertProposals, one per question and deciding
   *  question (under a lock; a removed one is not proposed again). Accepting one on the queue comes with its lander. */
  /** Step 5's two saved rounds of ONE run (C4.7 break B1): the newest checker round, then the first round of that run. */
  private async savedConditionRounds(c: { combinationKey: string }, g: Guide & { input: { file: string; sha256: string } }, batchId?: string): Promise<{ d: RoundOut<CondAnswer>; k: RoundOut<CondAnswer> | null }> {
    const runner = new StepRunner(this.sources);
    const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: inputsOf(g), mode: "replay", wanted: async () => true, batchId };
    const k = await runner.round<CondAnswer>(CONDITIONS_AI, true, ctx);
    if (!k.ok) return { d: k, k: null };
    const d = await runner.round<CondAnswer>(CONDITIONS_AI, false, { ...ctx, replayPair: pairOf(CONDITIONS_AI, true, k.runFile), replayPrompt: k.earlier ?? "" });
    return { d: d.ok ? d : { ok: false, costUsd: 0, reason: "The newest saved checker reading has no first reading from the same run, so it is not used." }, k };
  }

  /** P-227: is there a Saved result of step 5 (both rounds of one run) for this combination's guide? Read-only. */
  async conditionsSaved(c: { combinationKey: string }, g: Guide): Promise<SavedState> {
    if (!g.input) return { available: false, why: `${g.code} is not among the official files the AI may read, so it has no Saved result.`, files: [] };
    const { d, k } = await this.savedConditionRounds(c, { ...g, input: g.input });
    return d.ok && k?.ok ? { available: true, why: null, files: [d.runFile, k.runFile] } : { available: false, why: (!d.ok ? d.reason : null) ?? CONDITIONS_AI.words.noSaved, files: [] };
  }

  /** Step 5 (C4.11 part 2b; live wiring 5a): the guide's conditions from two AI rounds, Saved (both rounds of one saved run,
   *  US$0) or Live (a first round, then a blind checker round, on the guarded launcher; Stop is checked before each call),
   *  through engine/qd-conditions.ts, items of kind `condition` through insertProposals, one per question and deciding
   *  question (under a lock; a removed one is not proposed again). Accepting one on the queue comes with its lander. */
  private async conditions(c: { id: string; workspaceId: string; label: string; combinationKey: string }, mode: string, batchId: string, jobId: string, snapshot: Parameters<typeof conditionsFromRounds>[0], stopped: () => Promise<boolean>): Promise<StepOut> {
    if (mode === "rules") return { status: "SKIPPED", message: "Not run without AI: reading the guide's conditions is AI work. Choose Live or Saved.", proposed: 0, detail: {} };
    let g: Guide;
    try { g = await this.pqr.guide(c); } catch (e) { if (e instanceof HttpException) return { status: "FAILED", message: String((e.getResponse() as { detail?: string }).detail ?? e.message), proposed: 0, detail: {} }; throw e; }
    if (!g.input) return { status: "FAILED", message: `${g.code} is not among the official files the AI may read, so its conditions are not drafted here.`, proposed: 0, detail: {} };
    let d: RoundOut<CondAnswer>, k: RoundOut<CondAnswer> | null;
    if (mode === "replay") ({ d, k } = await this.savedConditionRounds(c, { ...g, input: g.input }, batchId));
    else {
      const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: inputsOf(g), mode: "live", wanted: async () => !(await stopped()), batchId };
      // Break L3: a round that throws ends as a failed round, so a paid first round's cost is still counted and said.
      const safe = async (isCheck: boolean): Promise<RoundOut<CondAnswer>> => { try { return await this.runner.round<CondAnswer>(CONDITIONS_AI, isCheck, ctx); } catch (e) { console.warn(`[draft-qd] conditions ${batchId}:`, String(e).slice(0, 300)); return { ok: false, costUsd: 0, reason: "The AI step stopped on this computer." }; } };
      d = await safe(false);
      k = d.ok && !(await stopped()) ? await safe(true) : d.ok ? { ok: false, cancelled: true, costUsd: 0, reason: "Stopped before the checker round was sent: nothing more was charged." } : null;
    }
    const usd = round2(d.costUsd + (k?.costUsd ?? 0));
    if (!d.ok || !k?.ok) {
      let message = (!d.ok ? d.reason : k && !k.ok ? `The first AI round ran, but the checker round did not: ${k.reason.charAt(0).toLowerCase()}${k.reason.slice(1)}` : null) ?? "The AI step did not finish.";
      // C4.7 break B2: a round that ran stays charged; never "nothing was charged" then.
      if (usd > 0) message = `${message.replace(NOTHING_CHARGED, "").replace(/\.?$/, ".")} This step cost US$${usd.toFixed(2)} (counted); nothing of it is used.`;
      // P-227: a failed Live step offers Saved when this step has a Saved result; a failed Saved step never does.
      const stop = (x: RoundOut<CondAnswer> | null) => !!x && !x.ok && !!x.cancelled, wasStopped = stop(d) || stop(k);
      const offerSaved = mode === "live" && !wasStopped && (await this.conditionsSaved(c, g)).available;
      if (offerSaved) message = `${message.replace(/\.?$/, ".")} A Saved result exists for this step: use Saved (US$0).`;
      return { status: wasStopped ? "CANCELLED" : "FAILED", message, proposed: 0, detail: {}, usd, offerSaved };
    }
    const r = (x: typeof d & { ok: true }): CondRound => ({ output: x.output, from: x.from, runFile: x.runFile, costUsd: x.costUsd });
    // QA-162: the forms library, so a condition that names a form (not a question) is left out saying which form it is.
    const library = (await this.db.govFormDef.findMany({ where: { workspaceId: c.workspaceId, retiredAt: null, formKind: "data_form" }, select: { formKey: true, displayName: true } })).map((f) => ({ form_number: f.formKey, title: f.displayName }));
    const res = conditionsFromRounds(snapshot, { draft: r(d), check: r(k) }, { ...g.input, text: g.text, code: g.code }, { runId: jobId, combinationId: c.id }, await factNames(this.db, c.workspaceId, snapshot), library);
    let fresh: typeof res.items = [], already = 0, removed = 0;
    await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `qd_conditions:${c.id}`);
      const seen = await tx.proposalItem.findMany({ where: { workspaceId: c.workspaceId, combinationId: c.id, kind: "condition", status: { in: ["waiting", "rejected", "accepted", "edited"] } }, select: { identityKey: true, status: true } });
      // Part 3: an accepted condition (its library change waits or is approved) is not proposed again either.
      const waiting = new Set(seen.filter((x) => x.status === "waiting").map((x) => x.identityKey)), gone = new Set(seen.filter((x) => x.status !== "waiting").map((x) => x.identityKey));
      fresh = res.items.filter((x) => !waiting.has(x.identity.key) && !gone.has(x.identity.key));
      already = res.items.filter((x) => waiting.has(x.identity.key)).length; removed = res.items.filter((x) => gone.has(x.identity.key) && !waiting.has(x.identity.key)).length;
      await insertProposals(tx, c.workspaceId, fresh);
    });
    const ready = fresh.filter((x) => x.confidence === "ready").length;
    const message = `${fresh.length} condition${fresh.length === 1 ? "" : "s"} for To review (Ready ${ready} · Check ${fresh.filter((x) => x.confidence === "check").length} · Decide ${fresh.filter((x) => x.confidence === "decide").length})${already ? `; ${already} already waiting there` : ""}${removed ? `; ${removed} a person removed or accepted before are not proposed again` : ""}${res.dropped.length ? `; ${res.dropped.length} left out with the reason` : ""}. ${mode === "live" ? `Live, US$${usd.toFixed(2)}` : "Saved, US$0"}.`;
    return { status: "COMPLETED", message, proposed: fresh.length, usd, detail: { dropped: res.dropped, unresolved: res.unresolved, run_files: [d.runFile, k.runFile], details: conditionDetails(res) } };
  }

  private async combination(id: string) {
    const c = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    if (c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its questions and documents are not drafted. Restore it on Structure first.`);
    return c;
  }

  /** The steps, how each runs and the cost, said before anything runs (BR-1); for Live, the worst case of its four AI
   *  rounds (steps 5 and 6) inside what is left of the AI spending cap; for both, which AI steps have a Saved result. */
  async plan(id: string, body: unknown) {
    const b = QdBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose Live or Saved.", { errors: [{ field: "mode", message: "Choose Live or Saved." }] });
    const c = await this.combination(id);
    const mode = b.data.mode;
    if (mode === "live" && !aiLive()) throw problem(409, "Live is not open yet", LIVE_WAITING);
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const facts = factsPerRole(snapshot);
    if (!facts.total) throw problem(409, "No forms yet", `"${c.label}" has no form fields mapped to facts yet, so there is nothing to draft. Find its forms (Start setup) first.`);
    // The guide steps 5 and 6 read: Live needs it to state its cost (a missing guide is said here, before anything runs).
    let g: Guide | null = null, guideWhy: string | null = null;
    if (mode !== "rules") { try { g = await this.pqr.guide(c); } catch (e) { if (!(e instanceof HttpException)) throw e; guideWhy = String((e.getResponse() as { detail?: string }).detail ?? e.message); if (mode === "live") throw e; } }
    const docs = mode === "rules" ? false : (await this.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Document checklist", recognised: true }, select: { officialFile: true } })).some((a) => !!savedReading(a.officialFile));
    const none = { available: false, why: guideWhy, files: [] as string[] };
    const saved = mode === "rules" ? null : { qd_documents: docs, qd_conditions: g ? await this.conditionsSaved(c, g) : none, pqr_picks: g ? await this.pqr.saved(c, g) : none };
    const anySaved = !!saved && (saved.qd_documents || saved.qd_conditions.available || saved.pqr_picks.available);
    const worst = mode === "live" && g?.input ? round2(roundBudgetUsd(CONDITIONS_AI, false, inputsOf(g), charsOf(g)) + roundBudgetUsd(CONDITIONS_AI, true, inputsOf(g), charsOf(g)) + this.pqr.worstUsd(g)) : 0;
    const remaining = this.sources.ledger().remaining_usd;
    const live = (k: string) => k === "qd_conditions" || k === "pqr_picks";
    const steps = QD_STEPS.map((s, i) => ({ n: i + 1, kind: s.kind, label: s.label,
      how: NOT_YET[s.kind] ? "not_yet" : mode === "rules" ? (s.kind === "pqr_picks" ? "rules" : s.ai ? "ai_only" : "rules") : s.ai ? (mode === "live" && live(s.kind) ? "live" : "saved") : "rules",
      uses_ai: s.ai && mode !== "rules",
      // Part 5b: each Live AI step's own worst case (the acceptance contract states it per step).
      worst_usd: mode === "live" && g?.input ? (s.kind === "qd_conditions" ? round2(roundBudgetUsd(CONDITIONS_AI, false, inputsOf(g), charsOf(g)) + roundBudgetUsd(CONDITIONS_AI, true, inputsOf(g), charsOf(g))) : s.kind === "pqr_picks" ? round2(this.pqr.worstUsd(g)) : 0) : 0 }));
    const fingerprint = JSON.stringify({ id: c.id, mode, questions: g?.questions?.sha256 ?? null, facts: facts.total, roles: facts.roles.map((r) => `${r.role}:${r.facts}`), steps: steps.map((s) => s.how), worst, saved: mode === "replay" && saved ? [saved.qd_documents, ...saved.qd_conditions.files, ...saved.pqr_picks.files] : null });
    return { mode, combination: { id: c.id, label: c.label }, steps, facts, totals: { worst_usd: worst, remaining_usd: remaining },
      note: mode === "rules" ? "No AI: rules work out each step; what needs a person goes to To review."
        : mode === "replay" ? "Saved: each AI step replays both rounds of one earlier Live run for this guide (US$0); a step with none saved says so and proposes nothing. The other steps are worked out by the rules."
        : "Live: steps 5 and 6 each run a first AI round and a blind checker round now; step 2 uses its saved checklist reading. The other steps are worked out by the rules.",
      live: { approved: aiLive(), why: aiLive() ? null : LIVE_WAITING },
      saved: saved ? { available: anySaved, why: anySaved ? null : saved.qd_conditions.why ?? saved.pqr_picks.why ?? "No saved AI answer for this combination yet.", steps: { qd_documents: saved.qd_documents, qd_conditions: saved.qd_conditions.available, pqr_picks: saved.pqr_picks.available },
        // C4.11 (QA-162 pack): which saved runs steps 5 and 6 replay (their first and checker rounds), and the guide they read.
        files: { qd_conditions: saved.qd_conditions.files, pqr_picks: saved.pqr_picks.files }, why_none: { qd_conditions: saved.qd_conditions.why, pqr_picks: saved.pqr_picks.why }, guide: g ? g.code : null } : null,
      plan_sha256: sha(fingerprint) };
  }

  /** Runs the plan as one run (an AiBatch with its seven steps), step by step; Stop is honoured between steps. */
  /** `opts.idempotencyKey` (C4.11 contract, api/src/draft-contract.ts): the same key on the same combination returns the
   *  run it started, checked under the same lock as the new run, so a double click is one run. */
  async run(actor: Actor, id: string, body: unknown, opts: { idempotencyKey?: string } = {}) {
    need(actor, "author");
    const plan = await this.plan(id, body);
    const b = QdBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The forms, the people, the steps or the Saved results changed since you looked: check the plan again before it runs.", { plan });
    if (plan.mode === "live" && plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `Not started: the worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}). Nothing was started.`);
    const c = await this.combination(id);
    // One run per combination at a time: the check and the new run are one transaction under a lock per combination,
    // so two clicks at the same moment never both start.
    const batch = await this.db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `draft_qd:${c.id}`);
    const keyed = opts.idempotencyKey ? `qd-key-${c.id}-${opts.idempotencyKey}` : null;
    const same = keyed ? await tx.aiBatch.findFirst({ where: { workspaceId: c.workspaceId, idempotencyKey: keyed }, select: { id: true, planSha256: true, status: true } }) : null;
    // Review m2: a key already used for another plan is a mistake, never a quiet return of the other run.
    if (same && same.planSha256 !== plan.plan_sha256) throw problem(409, "Key used for another plan", "This idempotency key started a run of another plan: use a new key for this plan.", { runId: same.id });
    if (same) return { again: same.id, status: same.status };
    const running = await tx.aiBatch.findFirst({ where: { workspaceId: c.workspaceId, operation: QD_OPERATION, plan: { path: ["combination", "id"], equals: c.id }, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true, startedAt: true } });
    // A run that has not moved for STALE_MS (its server stopped mid-run and was not restarted cleanly) ends as Failed
    // instead of blocking this combination for good (review M3; onModuleInit does the same at start).
    if (running && Date.now() - running.startedAt.getTime() > STALE_MS) {
      await tx.draftingJob.updateMany({ where: { batchId: running.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The run stopped moving before this step ended." } });
      await tx.aiBatch.update({ where: { id: running.id }, data: { status: "FAILED", finishedAt: new Date(), message: "This run stopped moving (the studio server may have stopped); the steps already done stand." } });
    } else if (running) throw problem(409, "Already running", `"${c.label}" is being drafted already: its run card shows each step.`, { runId: running.id });
    return tx.aiBatch.create({ data: { workspaceId: c.workspaceId, idempotencyKey: keyed ?? `qd-${plan.plan_sha256.slice(0, 16)}-${Date.now()}`, operation: QD_OPERATION, scopeKind: "combination", scopeLabel: c.label,
      mode: plan.mode === "rules" ? "LOCAL" : plan.mode.toUpperCase(), status: "RUNNING", planSha256: plan.plan_sha256,
      plan: { operation: QD_OPERATION, operation_label: "Draft questions and documents", combination: { id: c.id }, mode: plan.mode, steps: plan.steps.map((s) => ({ kind: s.kind, uses_ai: s.uses_ai, how: s.how })) }, spendLimitUsd: plan.totals.worst_usd, worstCaseUsd: plan.totals.worst_usd, expectedUsd: 0, startedBy: actor.id, message: "Drafting questions and documents" } });
    });
    if ("again" in batch) return { runId: batch.again, status: ["QUEUED", "RUNNING"].includes(batch.status) ? "running" : batch.status.toLowerCase(), again: true };
    await this.db.draftingJob.createMany({ data: QD_STEPS.map((s, i) => ({ workspaceId: c.workspaceId, combinationId: c.id, batchId: batch.id, kind: s.kind, mode: plan.mode === "rules" || !s.ai ? "LOCAL" : plan.mode === "live" && (s.kind === "qd_conditions" || s.kind === "pqr_picks") ? "LIVE" : "REPLAY", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
    // Break/review M1: the steps run in the background, so the run card (with Stop) shows at once where it was started.
    void this.execute(batch.id, actor, c, plan).catch((e) => console.warn(`[draft-qd] run ${batch.id}: ${String((e as Error).message ?? e).slice(0, 300)}`));
    return { runId: batch.id, status: "running" };
  }

  /** The result of a finished run (proposed, findings, note), for the dialog once its run card says it ended. */
  async result(id: string, runId: string) {
    const b = /^[0-9a-f-]{36}$/i.test(runId) ? await this.db.aiBatch.findUnique({ where: { id: runId } }) : null;
    const p = (b?.plan ?? {}) as { combination?: { id?: string }; result?: unknown };
    if (!b || b.operation !== QD_OPERATION || p.combination?.id !== id) throw problem(404, "Not found", "This run no longer exists (the demo workspace may have been reset).");
    if (!p.result) throw problem(409, "Not finished", b.status === "FAILED" ? (b.message ?? "This run stopped before it finished.") : "This run is still going: its card shows each step.", { runId });
    return p.result;
  }

  private async execute(batchId: string, actor: Actor, c: { id: string; workspaceId: string; label: string; combinationKey: string }, plan: Awaited<ReturnType<DraftQd["plan"]>>) {
    const batch = { id: batchId };
    const jobs = new Map((await this.db.draftingJob.findMany({ where: { batchId: batch.id }, select: { id: true, kind: true } })).map((j) => [j.kind, j.id]));
    const end = (kind: QdKind, status: string, message: string, detail: Record<string, unknown> = {}, usd = 0) =>
      this.db.draftingJob.update({ where: { id: jobs.get(kind)! }, data: { status, message, detail: detail as object, costUsd: usd, finishedAt: new Date() } });
    const start = (kind: QdKind) => this.db.draftingJob.update({ where: { id: jobs.get(kind)! }, data: { status: "RUNNING", startedAt: new Date(), message: null } });
    const stopped = async () => !!(await this.db.aiBatch.findUnique({ where: { id: batch.id }, select: { cancelRequested: true } }))?.cancelRequested;

    const out = { runId: batch.id, mode: plan.mode, status: "done" as string, usd: 0, offer_saved: false, proposed: 0, findings: [] as QdFinding[], rules: QD_RULES, steps: [] as { kind: string; status: string; message: string }[], note: "" };
    try {
      for (const s of QD_STEPS) {
        if (await stopped()) {
          await this.db.draftingJob.updateMany({ where: { batchId: batch.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Not run: the run was stopped." } });
          await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Stopped by a person; the steps already done stand." } });
          out.status = "stopped";
          // Break L6: a stopped run says so, with what it spent.
          out.note = `Stopped by a person; the steps already done stand.${out.usd > 0 ? ` This run cost US$${out.usd.toFixed(2)} (counted).` : ""}`;
          break;
        }
        await start(s.kind);
        await slowForTest();
        // Each step reads the draft as it is now: an earlier step may have changed what is waiting, never the draft itself.
        const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
        if (NOT_YET[s.kind]) { await end(s.kind, "NOT_YET", NOT_YET[s.kind]!); continue; }
        if (s.kind === "qd_documents") {
          const r = await this.documents(actor, c, plan.mode);
          out.proposed += r.proposed;
          await end(s.kind, r.status, r.message, r.detail);
        } else if (s.kind === "qd_conditions") {
          // Round 2 M2: whatever goes wrong in this step fails this step only, never the whole run.
          const r: StepOut = await this.conditions(c, plan.mode, batch.id, jobs.get("qd_conditions")!, snapshot, stopped).catch((e) => { console.warn(`[draft-qd] conditions ${batch.id}: ${String((e as Error).message ?? e).slice(0, 300)}`); return { status: "FAILED", message: "This step stopped on this computer, so nothing of it is proposed; the other steps ran.", proposed: 0, detail: {} }; });
          out.proposed += r.proposed; out.usd = round2(out.usd + (r.usd ?? 0)); out.offer_saved ||= !!r.offerSaved;
          await end(s.kind, r.status, r.message, r.detail, r.usd ?? 0);
        } else if (s.kind === "qd_facts") {
          const f = factsPerRole(snapshot);
          await end(s.kind, "COMPLETED", `${f.total} fact${f.total === 1 ? "" : "s"} the forms need: ${f.roles.map((r) => `${r.label} ${r.facts}`).join(" · ")}`, { roles: f.roles });
        } else if (s.kind === "qd_document_facts") {
          const d = documentFacts(snapshot);
          await end(s.kind, "COMPLETED", d.documents.length ? `${d.documents.length} document${d.documents.length === 1 ? "" : "s"} on the checklist${d.noFacts.length ? `; the library says no facts for ${d.noFacts.length > 4 ? `${d.noFacts.slice(0, 4).join(", ")} and ${d.noFacts.length - 4} more` : d.noFacts.join(", ")} yet (reading a new type's facts is later AI work, C3.4)` : ", each with the facts the library says it supplies"}` : "No documents on the checklist yet: every answer is asked of a person.", { documents: d.documents, no_facts: d.noFacts });
        } else if (s.kind === "qd_sources") {
          const k = sourceCounts(snapshot);
          await end(s.kind, "COMPLETED", `${sourceWords(k)}. The rules' choice applies until a person changes it on the Questions tab.`, { counts: k.counts, changed_by_person: k.changedByPerson });
        } else if (s.kind === "pqr_picks") {
          // C4.7's producer, unchanged: its rules, its dedupe under a lock and its queue items; it writes this step's job.
          try {
            const pp = await this.pqr.plan(c.id, { mode: plan.mode });
            const r = await this.pqr.draft(actor, c.id, { mode: plan.mode, planSha256: pp.plan_sha256 }, { jobId: jobs.get("pqr_picks")!, stopped });
            out.proposed += r.proposed; out.usd = round2(out.usd + r.usd); out.offer_saved ||= r.offer_saved;
          } catch (e) {
            if (!(e instanceof HttpException)) throw e;
            await end(s.kind, "FAILED", String((e.getResponse() as { detail?: string }).detail ?? e.message));
          }
        } else if (s.kind === "qd_check") {
          const f = qdChecks(snapshot);
          out.findings = f;
          await end(s.kind, "COMPLETED", checkWords(f), { findings: f, details: f.length ? f.map((x) => `${QD_RULES[x.rule]}: ${x.message}`).join("\n") : null });
        }
      }
    } catch (e) {
      console.warn(`[draft-qd] run ${batch.id} stopped: ${String((e as Error).message ?? e).slice(0, 300)}`);
      await this.db.draftingJob.updateMany({ where: { batchId: batch.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Not run: the step before it stopped." } });
      await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: "FAILED", finishedAt: new Date(), message: e instanceof HttpException ? String((e.getResponse() as { detail?: string }).detail ?? e.message) : "A step stopped on this computer; the steps already done stand. Run it again." } });
      out.status = "failed";
    }
    const order = QD_STEPS.map((s) => s.kind as string);
    const done = (await this.db.draftingJob.findMany({ where: { batchId: batch.id }, select: { kind: true, status: true, message: true } })).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    out.steps = done.map((j) => ({ kind: j.kind, status: j.status, message: j.message ?? "" }));
    const notYet = done.filter((j) => j.status === "NOT_YET").length, failed = done.filter((j) => j.status === "FAILED").length;
    if (out.status === "done") {
      const late = await stopped();
      if (failed) out.status = "done_with_problems";
      const bad = done.filter((j) => j.status === "FAILED").map((j) => `${QD_STEPS.find((x) => x.kind === j.kind)?.label ?? j.kind}: ${(j.message ?? "it did not finish").replace(/\.?$/, ".")}`);
      out.note = `${out.proposed} item${out.proposed === 1 ? "" : "s"} for To review; ${checkWords(out.findings).replace(/^./, (x) => x.toLowerCase())}${notYet ? ` ${notYet} step${notYet === 1 ? " is" : "s are"} not available yet.` : ""}${bad.length ? ` Not done: ${bad.join(" ")}` : ""}${late ? " Stop came after the last step had started, so every step finished." : ""}${plan.mode === "live" ? ` Live, US$${out.usd.toFixed(2)}.` : plan.mode === "replay" ? " Saved, US$0." : ""}${out.offer_saved ? " A Saved result exists for a step that failed: use Saved (US$0)." : ""}`;
      await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: failed ? "PARTIAL" : "COMPLETED", finishedAt: new Date(), message: out.note } });
    }
    await this.audit.log(c.workspaceId, actor.id, "proposed", "questions and documents", c.combinationKey, `${actor.name} drafted questions and documents for "${c.label}" (${plan.mode === "rules" ? "rules only" : plan.mode === "replay" ? "Saved" : "Live"}, US$${out.usd.toFixed(2)}): ${out.proposed} to review, ${out.findings.length} finding${out.findings.length === 1 ? "" : "s"}`, { runId: batch.id, mode: plan.mode }, c.id);
    const prev = (await this.db.aiBatch.findUnique({ where: { id: batch.id }, select: { plan: true } }))?.plan as Record<string, unknown>;
    await this.db.aiBatch.update({ where: { id: batch.id }, data: { plan: { ...prev, result: out } as object } });
  }
}

@Controller("api")
export class DraftQdController {
  constructor(@Inject(DraftQd) private readonly q: DraftQd) {}
  @Post("combinations/:id/draft-qd/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { readerOf(a); return this.q.plan(id, b); }
  @Get("combinations/:id/draft-qd/:runId") result(@Headers("x-actor") a: H, @Param("id") id: string, @Param("runId") runId: string) { readerOf(a); return this.q.result(id, runId); }
  @Post("combinations/:id/draft-qd") @HttpCode(201) run(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.q.run(actorOf(a), id, b); }
}
