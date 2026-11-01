// C4.11 "Draft questions and documents" (P-130, P-131, P-121, P-123; W1-questions-and-documents concept §4; W1-ai-drafting
// plan §1; forms lane, swarm builder B4b): one run of seven steps on one combination, shown on the shared run card
// (/api/runs/:id, with Stop), each step's items going into the one review queue (insertProposals) for a person to accept.
// Part 1 (this file): the run, its plan and card; steps 1, 3, 4 and 7 by rules (engine/draft-qd.ts), step 6 by the C4.7
// producer (pqr-drafts.ts: rules only or its saved AI answers). Steps 2 (documents, from the saved checklist readings of
// C2.6) and 5 (conditions, new prompts) say plainly that they are not available yet; they come in the next parts.
// Only US$0 ways run here (rules only, saved AI answers): AI now waits for the founder's live trial (P-131).
import { Body, Controller, Get, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { checkWords, documentFacts, factsPerRole, qdChecks, QD_OPERATION, QD_RULES, QD_STEPS, sourceCounts, sourceWords, type QdFinding, type QdKind } from "../../engine/draft-qd.ts";
import { actorOf, Audit, Db, need, readerOf, type Actor } from "./core.ts";
import { PqrDrafts } from "./pqr-drafts.ts";
import { Checklists } from "./checklist.ts";
import { linesOf, savedReading } from "./saved-readings.ts";
import { insertProposals } from "./proposals.ts";
import { StepRunner, type AiStep, type RoundContext } from "./rounds.ts";
import { Sources } from "./sources.ts";
import { conditionsFromRounds, conditionsShapeOk, CONDITIONS_STEP, type CondAnswer, type CondRound } from "../../engine/qd-conditions.ts";

/** Step 5's AI step (C4.11 part 2b): a draft round and a blind checker round on the shared step runner, replayed from
 *  saved real answers (US$0); live waits for the founder's trial (P-131). Prompts: p2/prompts/conditions{,-check}.v1.md. */
export const CONDITIONS_AI: AiStep = {
  kind: CONDITIONS_STEP, jobBase: "studio-qd-conditions", configurationVersion: "c411-conditions",
  template: "conditions.v1.md", check: "conditions-check.v1.md", schema: "conditions-output.v1.schema.json", effort: "low", max_output_tokens: 6000,
  shapeOk: conditionsShapeOk,
  words: {
    noSaved: "No saved AI answer for this guide, prompt and combination yet: it is recorded once in the founder-approved live trial (P-131). Meanwhile a person adds conditions on the Questions tab.",
    badSaved: "The saved AI answer could not be read, so it is not used. Meanwhile a person adds conditions on the Questions tab.",
    nothingUsed: "Nothing of it is proposed.",
  },
};

type H = string | undefined;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

export const QD_LIVE_WAITING = "AI now for this run waits for the founder's Go for the live trial (P-131). Use rules only, or saved AI answers, meanwhile (US$0).";
/** Steps 2 and 5 are built in the next parts of C4.11; until then they say so on the card (never a pretend result). */
export const NOT_YET: Partial<Record<QdKind, string>> = {
};
/** Tests only (the check's usage line): STUDIO_SLOW_QD_STEP=<ms> waits that long in each step, so Stop can be tested. */
const slowForTest = async () => { const ms = Number(process.env.STUDIO_SLOW_QD_STEP ?? 0); if (ms > 0) await new Promise((r) => setTimeout(r, ms)); };
/** A run of seven rules steps takes about a second; one still running after ten minutes has stopped moving. */
const STALE_MS = 10 * 60_000;
export const QdBody = z.object({ mode: z.enum(["rules", "replay", "live"]), planSha256: z.string().regex(/^[0-9a-f]{64}$/).optional() }).strict();

@Injectable()
export class DraftQd {
  constructor(@Inject(Db) private readonly db: Db, @Inject(PqrDrafts) private readonly pqr: PqrDrafts, @Inject(Checklists) private readonly checklists: Checklists, @Inject(Sources) private readonly sources: Sources, @Inject(Audit) private readonly audit: Audit) {}

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
    await this.audit.log(b.workspaceId, actor.id, "stopped", "questions and documents", id, `${actor.name} stopped drafting questions and documents for "${b.scopeLabel}"`);
  }

  /** Step 2 (C2.6's replay, unchanged; P-121): each official checklist of the combination with a saved real AI reading of
   *  its exact text is replayed into requirement lines (listed on To review; decided and applied on the checklist's page).
   *  Rules only reads no checklist: reading one is AI work, so the step says so and is not run. */
  private async documents(actor: Actor, c: { id: string }, mode: string): Promise<{ status: string; message: string; proposed: number; detail: Record<string, unknown> }> {
    if (mode !== "replay") return { status: "SKIPPED", message: "Not run with rules only: reading IRCC's checklist is AI work. Choose saved AI answers to replay its saved reading (US$0).", proposed: 0, detail: {} };
    const atts = await this.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Document checklist", recognised: true }, orderBy: { edition: "asc" } });
    if (!atts.length) return { status: "FAILED", message: "No official document checklist among this combination's sources yet: attach it under Sources, then draft again.", proposed: 0, detail: {} };
    let proposed = 0; const said: string[] = [], jobs: string[] = [];
    for (const a of atts) {
      const name = a.edition ?? a.fileName, r = savedReading(a.officialFile);
      if (!r) { said.push(`${name}: no saved AI reading yet (it is recorded in the founder-approved live trial, P-131)`); continue; }
      // Review m4 (part 2): "replayed before" only when the replay hands back an earlier draft, not because one was applied.
      const prior = new Set((await this.db.draftingJob.findMany({ where: { attachmentId: a.id, kind: "checklist_draft", mode: "REPLAY" }, select: { id: true } })).map((j) => j.id));
      const job = await this.checklists.replay(actor, a);
      jobs.push(job.id);
      const d = (job.detail ?? {}) as { proposed?: number; dropped?: string[] };
      const before = prior.has(job.id);
      const n = before ? 0 : d.proposed ?? linesOf(r, name).lines.length;
      proposed += n;
      said.push(before ? `${name}: replayed before; its ${d.proposed ?? 0} document requirement${d.proposed === 1 ? "" : "s"} are on To review or applied` : `${name}: ${n} document requirement${n === 1 ? "" : "s"} for To review${d.dropped?.length ? `, ${d.dropped.length} left out with the reason` : ""}`);
    }
    const message = `${said.join("; ")}. Saved AI reading, US$0; each line quotes the checklist. They are listed on To review, which opens the checklist's page, where they are decided and applied together.`;
    return { status: jobs.length ? "COMPLETED" : "FAILED", message, proposed, detail: { checklist_jobs: jobs } };
  }

  /** Step 5 (part 2b): conditional questions from the guide, two rounds replayed from saved answers, the rules of
   *  engine/qd-conditions.ts on each, items of kind `condition` through insertProposals, one per question and deciding
   *  question (under a lock; a removed one is not proposed again). Accepting one on the queue comes with its lander. */
  private async conditions(c: { id: string; workspaceId: string; label: string; combinationKey: string }, mode: string, batchId: string, jobId: string, snapshot: Parameters<typeof conditionsFromRounds>[0]) {
    if (mode !== "replay") return { status: "SKIPPED", message: "Not run with rules only: reading the guide's conditions is AI work. Choose saved AI answers to replay them (US$0).", proposed: 0, detail: {} };
    let g: Awaited<ReturnType<PqrDrafts["guide"]>>;
    try { g = await this.pqr.guide(c); } catch (e) { if (e instanceof HttpException) return { status: "FAILED", message: String((e.getResponse() as { detail?: string }).detail ?? e.message), proposed: 0, detail: {} }; throw e; }
    if (!g.input) return { status: "FAILED", message: `${g.code} is not among the official files the AI may read, so its conditions are not drafted here.`, proposed: 0, detail: {} };
    const runner = new StepRunner(this.sources);
    const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], mode: "replay", wanted: async () => true, batchId };
    const d = await runner.round<CondAnswer>(CONDITIONS_AI, false, ctx);
    const k = d.ok ? await runner.round<CondAnswer>(CONDITIONS_AI, true, ctx) : null;
    if (!d.ok || !k?.ok) return { status: "FAILED", message: (!d.ok ? d.reason : k && !k.ok ? k.reason : null) ?? "The AI step did not finish.", proposed: 0, detail: {} };
    const r = (x: typeof d & { ok: true }): CondRound => ({ output: x.output, from: x.from, runFile: x.runFile, costUsd: x.costUsd });
    const res = conditionsFromRounds(snapshot, { draft: r(d), check: r(k) }, { ...g.input, text: g.text, code: g.code }, { runId: jobId, combinationId: c.id });
    let fresh: typeof res.items = [], already = 0, removed = 0;
    await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `qd_conditions:${c.id}`);
      const seen = await tx.proposalItem.findMany({ where: { workspaceId: c.workspaceId, combinationId: c.id, kind: "condition", status: { in: ["waiting", "rejected"] } }, select: { identityKey: true, status: true } });
      const waiting = new Set(seen.filter((x) => x.status === "waiting").map((x) => x.identityKey)), gone = new Set(seen.filter((x) => x.status === "rejected").map((x) => x.identityKey));
      fresh = res.items.filter((x) => !waiting.has(x.identity.key) && !gone.has(x.identity.key));
      already = res.items.filter((x) => waiting.has(x.identity.key)).length; removed = res.items.filter((x) => gone.has(x.identity.key) && !waiting.has(x.identity.key)).length;
      await insertProposals(tx, c.workspaceId, fresh);
    });
    const ready = fresh.filter((x) => x.confidence === "ready").length;
    const message = `${fresh.length} condition${fresh.length === 1 ? "" : "s"} for To review (Ready ${ready} · Check ${fresh.filter((x) => x.confidence === "check").length} · Decide ${fresh.filter((x) => x.confidence === "decide").length})${already ? `; ${already} already waiting there` : ""}${removed ? `; ${removed} a person removed before are not proposed again` : ""}${res.dropped.length ? `; ${res.dropped.length} left out with the reason` : ""}. Saved AI answers, US$0.`;
    return { status: "COMPLETED", message, proposed: fresh.length, detail: { dropped: res.dropped, unresolved: res.unresolved, run_files: [d.runFile, k.runFile], details: res.dropped.length ? res.dropped.map((x) => `${x.asks}: ${x.why}`).join("\n") : null } };
  }

  private async combination(id: string) {
    const c = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    if (c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its questions and documents are not drafted. Restore it on Structure first.`);
    return c;
  }

  /** The steps, how each runs and the cost, said before anything runs (BR-1). */
  async plan(id: string, body: unknown) {
    const b = QdBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose rules only or saved AI answers.", { errors: [{ field: "mode", message: "Choose how to draft." }] });
    const c = await this.combination(id);
    if (b.data.mode === "live") throw problem(409, "AI now is not approved yet", QD_LIVE_WAITING);
    const mode = b.data.mode;
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const facts = factsPerRole(snapshot);
    if (!facts.total) throw problem(409, "No forms yet", `"${c.label}" has no form fields mapped to facts yet, so there is nothing to draft. Find its forms (Start setup) first.`);
    const steps = QD_STEPS.map((s, i) => ({ n: i + 1, kind: s.kind, label: s.label,
      how: NOT_YET[s.kind] ? "not_yet" : s.kind === "pqr_picks" ? (mode === "replay" ? "saved" : "rules") : (s.kind === "qd_documents" || s.kind === "qd_conditions") ? (mode === "replay" ? "saved" : "ai_only") : "rules",
      uses_ai: (s.kind === "pqr_picks" || s.kind === "qd_documents" || s.kind === "qd_conditions") && mode === "replay" }));
    const fingerprint = JSON.stringify({ id: c.id, mode, facts: facts.total, roles: facts.roles.map((r) => `${r.role}:${r.facts}`), steps: steps.map((s) => s.how) });
    return { mode, combination: { id: c.id, label: c.label }, steps, facts, totals: { worst_usd: 0 },
      note: mode === "rules" ? "No AI: rules work out each step; what needs a person goes to To review." : "Replays the answers AI gave before for this exact guide, prompt and combination (US$0); a step with none saved says so and proposes nothing.",
      live: { approved: false, why: QD_LIVE_WAITING }, plan_sha256: sha(fingerprint) };
  }

  /** Runs the plan as one run (an AiBatch with its seven steps), step by step; Stop is honoured between steps. */
  async run(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const plan = await this.plan(id, body);
    const b = QdBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The forms, the people or the steps changed since you looked: check the plan again before it runs.", { plan });
    const c = await this.combination(id);
    // One run per combination at a time: the check and the new run are one transaction under a lock per combination,
    // so two clicks at the same moment never both start.
    const batch = await this.db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `draft_qd:${c.id}`);
    const running = await tx.aiBatch.findFirst({ where: { workspaceId: c.workspaceId, operation: QD_OPERATION, plan: { path: ["combination", "id"], equals: c.id }, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true, startedAt: true } });
    // A run that has not moved for STALE_MS (its server stopped mid-run and was not restarted cleanly) ends as Failed
    // instead of blocking this combination for good (review M3; onModuleInit does the same at start).
    if (running && Date.now() - running.startedAt.getTime() > STALE_MS) {
      await tx.draftingJob.updateMany({ where: { batchId: running.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The run stopped moving before this step ended." } });
      await tx.aiBatch.update({ where: { id: running.id }, data: { status: "FAILED", finishedAt: new Date(), message: "This run stopped moving (the studio server may have stopped); the steps already done stand." } });
    } else if (running) throw problem(409, "Already running", `"${c.label}" is being drafted already: its run card shows each step.`, { runId: running.id });
    return tx.aiBatch.create({ data: { workspaceId: c.workspaceId, idempotencyKey: `qd-${plan.plan_sha256.slice(0, 16)}-${Date.now()}`, operation: QD_OPERATION, scopeKind: "combination", scopeLabel: c.label,
      mode: plan.mode === "rules" ? "LOCAL" : "REPLAY", status: "RUNNING", planSha256: plan.plan_sha256,
      plan: { operation: QD_OPERATION, operation_label: "Draft questions and documents", combination: { id: c.id }, mode: plan.mode, steps: plan.steps.map((s) => ({ kind: s.kind, uses_ai: s.uses_ai, how: s.how })) }, spendLimitUsd: 0, worstCaseUsd: 0, expectedUsd: 0, startedBy: actor.id, message: "Drafting questions and documents" } });
    });
    await this.db.draftingJob.createMany({ data: QD_STEPS.map((s, i) => ({ workspaceId: c.workspaceId, combinationId: c.id, batchId: batch.id, kind: s.kind, mode: plan.mode === "rules" ? "LOCAL" : "REPLAY", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
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

    const out = { runId: batch.id, mode: plan.mode, status: "done" as string, usd: 0, proposed: 0, findings: [] as QdFinding[], rules: QD_RULES, steps: [] as { kind: string; status: string; message: string }[], note: "" };
    try {
      for (const s of QD_STEPS) {
        if (await stopped()) {
          await this.db.draftingJob.updateMany({ where: { batchId: batch.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Not run: the run was stopped." } });
          await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Stopped by a person; the steps already done stand." } });
          out.status = "stopped"; break;
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
          const r = await this.conditions(c, plan.mode, batch.id, jobs.get("qd_conditions")!, snapshot).catch((e) => { console.warn(`[draft-qd] conditions ${batch.id}: ${String((e as Error).message ?? e).slice(0, 300)}`); return { status: "FAILED", message: "This step stopped on this computer, so nothing of it is proposed; the other steps ran.", proposed: 0, detail: {} }; });
          out.proposed += r.proposed;
          await end(s.kind, r.status, r.message, r.detail);
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
            const r = await this.pqr.draft(actor, c.id, { mode: plan.mode, planSha256: pp.plan_sha256 }, { jobId: jobs.get("pqr_picks")! });
            out.proposed += r.proposed; out.usd += r.usd;
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
      const bad = done.filter((j) => j.status === "FAILED").map((j) => `${QD_STEPS.find((x) => x.kind === j.kind)?.label ?? j.kind}: ${j.message ?? "it did not finish"}`);
      out.note = `${out.proposed} item${out.proposed === 1 ? "" : "s"} for To review; ${checkWords(out.findings).replace(/^./, (x) => x.toLowerCase())}${notYet ? ` ${notYet} step${notYet === 1 ? " is" : "s are"} not available yet.` : ""}${bad.length ? ` Not done: ${bad.join(" ")}` : ""}${late ? " Stop came after the last step had started, so every step finished." : ""}`;
      await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: failed ? "PARTIAL" : "COMPLETED", finishedAt: new Date(), message: out.note } });
    }
    await this.audit.log(c.workspaceId, actor.id, "proposed", "questions and documents", c.combinationKey, `${actor.name} drafted questions and documents for "${c.label}" (${plan.mode === "rules" ? "rules only" : "saved AI answers"}, US$${out.usd.toFixed(2)}): ${out.proposed} to review, ${out.findings.length} finding${out.findings.length === 1 ? "" : "s"}`, { runId: batch.id, mode: plan.mode }, c.id);
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
