// C4.11 "Draft questions and documents" (P-130, P-131, P-121, P-123; W1-questions-and-documents concept §4; W1-ai-drafting
// plan §1; forms lane, swarm builder B4b): one run of seven steps on one combination, shown on the shared run card
// (/api/runs/:id, with Stop), each step's items going into the one review queue (insertProposals) for a person to accept.
// Part 1 (this file): the run, its plan and card; steps 1, 3, 4 and 7 by rules (engine/draft-qd.ts), step 6 by the C4.7
// producer (pqr-drafts.ts: rules only or its saved AI answers). Steps 2 (documents, from the saved checklist readings of
// C2.6) and 5 (conditions, new prompts) say plainly that they are not available yet; they come in the next parts.
// Only US$0 ways run here (rules only, saved AI answers): AI now waits for the founder's live trial (P-131).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { checkWords, documentFacts, factsPerRole, qdChecks, QD_OPERATION, QD_RULES, QD_STEPS, sourceCounts, sourceWords, type QdFinding, type QdKind } from "../../engine/draft-qd.ts";
import { actorOf, Audit, Db, need, type Actor } from "./core.ts";
import { PqrDrafts } from "./pqr-drafts.ts";

type H = string | undefined;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

export const QD_LIVE_WAITING = "AI now for this run waits for the founder's Go for the live trial (P-131). Use rules only, or saved AI answers, meanwhile (US$0).";
/** Steps 2 and 5 are built in the next parts of C4.11; until then they say so on the card (never a pretend result). */
export const NOT_YET: Partial<Record<QdKind, string>> = {
  qd_documents: "Not available in this run yet: replaying the saved checklist readings (C2.6) comes in the next part. Meanwhile the checklist's saved reading is replayed from the combination's Sources.",
  qd_conditions: "Not available in this run yet: AI reading the forms' \"if yes, give details\" questions and the guide's conditions comes in the next part. Meanwhile a person adds conditions on the Questions tab.",
};
/** Tests only (the check's usage line): STUDIO_SLOW_QD_STEP=<ms> waits that long in each step, so Stop can be tested. */
const slowForTest = async () => { const ms = Number(process.env.STUDIO_SLOW_QD_STEP ?? 0); if (ms > 0) await new Promise((r) => setTimeout(r, ms)); };
export const QdBody = z.object({ mode: z.enum(["rules", "replay", "live"]), planSha256: z.string().regex(/^[0-9a-f]{64}$/).optional() }).strict();

@Injectable()
export class DraftQd {
  constructor(@Inject(Db) private readonly db: Db, @Inject(PqrDrafts) private readonly pqr: PqrDrafts, @Inject(Audit) private readonly audit: Audit) {}

  /** A run left running by a stopped server can never finish: it says so, and no longer blocks a new run (as people-ai does). */
  async onModuleInit() {
    for (const b of await this.db.aiBatch.findMany({ where: { operation: QD_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } })) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped during this run; the steps already done stand. Draft again." } });
    }
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
      how: NOT_YET[s.kind] ? "not_yet" : s.kind === "pqr_picks" ? (mode === "replay" ? "saved" : "rules") : "rules",
      uses_ai: s.kind === "pqr_picks" && mode === "replay" }));
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
    const running = await tx.aiBatch.findFirst({ where: { workspaceId: c.workspaceId, operation: QD_OPERATION, plan: { path: ["combination", "id"], equals: c.id }, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    if (running) throw problem(409, "Already running", `"${c.label}" is being drafted already: its run card shows each step.`, { runId: running.id });
    return tx.aiBatch.create({ data: { workspaceId: c.workspaceId, idempotencyKey: `qd-${plan.plan_sha256.slice(0, 16)}-${Date.now()}`, operation: QD_OPERATION, scopeKind: "combination", scopeLabel: c.label,
      mode: plan.mode === "rules" ? "LOCAL" : "REPLAY", status: "RUNNING", planSha256: plan.plan_sha256,
      plan: { operation: QD_OPERATION, operation_label: "Draft questions and documents", combination: { id: c.id }, mode: plan.mode, steps: plan.steps.map((s) => ({ kind: s.kind, uses_ai: s.uses_ai, how: s.how })) }, spendLimitUsd: 0, worstCaseUsd: 0, expectedUsd: 0, startedBy: actor.id, message: "Drafting questions and documents" } });
    });
    await this.db.draftingJob.createMany({ data: QD_STEPS.map((s, i) => ({ workspaceId: c.workspaceId, combinationId: c.id, batchId: batch.id, kind: s.kind, mode: plan.mode === "rules" ? "LOCAL" : "REPLAY", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
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
        if (s.kind === "qd_facts") {
          const f = factsPerRole(snapshot);
          await end(s.kind, "COMPLETED", `${f.total} fact${f.total === 1 ? "" : "s"} the forms need: ${f.roles.map((r) => `${r.label} ${r.facts}`).join(" · ")}`, { roles: f.roles });
        } else if (s.kind === "qd_document_facts") {
          const d = documentFacts(snapshot);
          await end(s.kind, "COMPLETED", d.documents.length ? `${d.documents.length} document${d.documents.length === 1 ? "" : "s"} on the checklist${d.noFacts.length ? `; the library says no facts for ${d.noFacts.join(", ")} yet (reading a new type's facts is later AI work, C3.4)` : ", each with the facts the library says it supplies"}` : "No documents on the checklist yet: every answer is asked of a person.", { documents: d.documents, no_facts: d.noFacts });
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
      out.note = `${out.proposed} item${out.proposed === 1 ? "" : "s"} for To review; ${checkWords(out.findings)}${notYet ? ` ${notYet} step${notYet === 1 ? " is" : "s are"} not available yet.` : ""}`;
      await this.db.aiBatch.update({ where: { id: batch.id }, data: { status: failed ? "PARTIAL" : "COMPLETED", finishedAt: new Date(), message: out.note } });
    }
    await this.audit.log(c.workspaceId, actor.id, "proposed", "questions and documents", c.combinationKey, `${actor.name} drafted questions and documents for "${c.label}" (${plan.mode === "rules" ? "rules only" : "saved AI answers"}, US$${out.usd.toFixed(2)}): ${out.proposed} to review, ${out.findings.length} finding${out.findings.length === 1 ? "" : "s"}`, { runId: batch.id, mode: plan.mode }, c.id);
    return out;
  }
}

@Controller("api")
export class DraftQdController {
  constructor(@Inject(DraftQd) private readonly q: DraftQd) {}
  @Post("combinations/:id/draft-qd/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { actorOf(a); return this.q.plan(id, b); }
  @Post("combinations/:id/draft-qd") @HttpCode(201) run(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.q.run(actorOf(a), id, b); }
}
