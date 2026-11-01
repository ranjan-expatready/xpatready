// C4.7 (P-76, P-121, P-130 step 6, P-149 one door; forms lane, swarm builder B4): "Draft pre-qualification picks" for
// one combination, into the one review queue, where a person accepts or removes each pick (proposals.ts decide: the
// pqr_pick lander writes the tick through fact-sources.ts acceptPqrPick, with Undo). Three ways, each said with its cost
// before it runs (STANDARDS: cost first):
//   rules  — the rules' stand-in producer (engine/sources.ts pqrPicksByRules): facts a rule of the combination reads (US$0);
//   replay — the saved real answers of the two AI rounds for this exact guide, prompt and combination (US$0);
//   live   — a draft round and a blind checker round on the shared step runner (rounds.ts), only with STUDIO_AI_LIVE=approved
//            (the founder's live trial, P-131); the worst case is stated first and must fit what is left of the cap.
// The rules on every AI pick are engine/pqr-picks.ts (PQR ⊂ SQR, quote in the guide, a reason, both rounds agree for
// Ready). Every pick is Sample until the immigration expert confirms it at release (AGENTS rule 4).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { pqrPicksByRules } from "../../engine/sources.ts";
import { pqrCandidates, pqrPicksFromRounds, pqrShapeOk, PQR_STEP, type PqrAnswer, type Round } from "../../engine/pqr-picks.ts";
import { actorOf, Audit, Db, need, SOLUTION, type Actor } from "./core.ts";
import { inventoryFor } from "./finder.ts";
import { whoCanBeTrail } from "./people-ai.ts";
import { insertProposals } from "./proposals.ts";
import { StepRunner, worstRoundUsd, type AiStep, type RoundContext } from "./rounds.ts";
import { aiLive, Sources } from "./sources.ts";

type H = string | undefined;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

export const PQR_AI: AiStep = {
  kind: "pqr_picks", jobBase: "studio-pqr-picks", configurationVersion: "c47-pqr-picks",
  template: "pqr-picks.v1.md", check: "pqr-picks-check.v1.md", schema: "pqr-picks-output.v1.schema.json", effort: "low", max_output_tokens: 4000,
  shapeOk: pqrShapeOk,
  words: {
    noSaved: "No saved AI answer for this guide, prompt and combination yet: it is recorded once in the founder-approved live trial (P-131). Use rules only meanwhile.",
    badSaved: "The saved AI answer could not be read, so it is not used. Use rules only meanwhile.",
    nothingUsed: "Nothing of it is proposed.",
  },
};
export const LIVE_WAITING = "AI now waits for the founder's Go for the live trial (P-110, P-131). Use rules only, or saved AI answers, meanwhile.";
const STEPS = {
  rules: [{ n: 1, label: "Find the facts this combination's rules read (rules)", uses_ai: false }, { n: 2, label: "Keep those a prospect can answer and a question asks (rules)", uses_ai: false }],
  ai: [
    { n: 1, label: "Read the combination's guide (rules)", uses_ai: false },
    { n: 2, label: "AI picks the facts the guide's eligibility tests, each with its sentence", uses_ai: true },
    { n: 3, label: "A second AI round picks them without seeing the first answer", uses_ai: true },
    { n: 4, label: "Rules keep picks a question asks, a prospect can answer, with the sentence in the guide; Ready when both rounds agree", uses_ai: false },
  ],
};
export const PqrDraftBody = z.object({ mode: z.enum(["rules", "replay", "live"]), planSha256: z.string().regex(/^[0-9a-f]{64}$/).optional() }).strict();
type Guide = { code: string; title: string; text: string; input: { file: string; sha256: string } | null; trail: string };

@Injectable()
export class PqrDrafts {
  private readonly runner: StepRunner;
  constructor(@Inject(Db) private readonly db: Db, @Inject(Sources) private readonly sources: Sources, @Inject(Audit) private readonly audit: Audit) { this.runner = new StepRunner(sources); }

  private async combination(id: string) {
    const c = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    if (c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its pre-qualification is not drafted. Restore it on Structure first.`);
    return c;
  }

  /** The combination's guide: the one linked as its source (the finder read it, or Load sample linked it), as people-ai reads it. */
  private async guide(c: { id: string; workspaceId: string; label: string }): Promise<Guide> {
    const shas = (await this.db.sourceAttachment.findMany({ where: { combinationId: c.id }, select: { sha256: true } })).map((a) => a.sha256);
    const ed = shas.length ? await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: { in: shas }, form: { formKind: "guide" } }, include: { form: true } }) : null;
    if (!ed?.form.formPageUrl) throw problem(409, "No guide yet", `"${c.label}" has no IRCC guide among its sources yet: finding its forms (Start setup) reads and links it. Then draft its pre-qualification.`);
    const input = inventoryFor(ed.form.formPageUrl);
    let text = "";
    if (input) { try { text = String(JSON.parse(readFileSync(join(SOLUTION, input.file), "utf8")).text ?? ""); } catch { text = ""; } }
    if (!text) throw problem(409, "Guide not readable", `${ed.form.formKey}'s text is not on this computer yet, so it cannot be read here. Find the forms again to read it.`);
    return { code: ed.form.formKey, title: ed.form.displayName, text, input, trail: await whoCanBeTrail(this.db, c.id) };
  }

  /** What would run, and the most it can cost, said before anything runs. */
  async plan(id: string, body: unknown) {
    const b = PqrDraftBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose rules only, saved AI answers or AI now.", { errors: [{ field: "mode", message: "Choose how to draft the picks." }] });
    const c = await this.combination(id);
    const mode = b.data.mode;
    if (mode === "live" && !aiLive()) throw problem(409, "AI now is not approved yet", LIVE_WAITING);
    const g = mode === "rules" ? null : await this.guide(c);
    const worst = mode === "live" && g ? round2(2 * worstRoundUsd(PQR_AI, g.text.length)) : 0;
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const candidates = pqrCandidates(snapshot).length;
    const remaining = this.sources.ledger().remaining_usd;
    const note = mode === "rules" ? "No AI: the rules propose the facts this combination's rules read. Each pick goes to To review for a person to accept or remove."
      : mode === "replay" ? "Uses the answers AI gave for this exact guide and prompt before (US$0); with none saved yet, it says so and nothing is proposed."
      : "Two AI rounds read the guide; a pick is Ready only when both make it, with its sentence in the guide.";
    return { mode, combination: { id: c.id, label: c.label }, guide: g ? { code: g.code, title: g.title, file: g.input?.file ?? null } : null, steps: mode === "rules" ? STEPS.rules : STEPS.ai, candidates,
      totals: { worst_usd: worst, remaining_usd: remaining }, note, live: { approved: aiLive(), why: aiLive() ? null : LIVE_WAITING },
      plan_sha256: sha(JSON.stringify({ id: c.id, mode, guide: g?.input?.sha256 ?? null, worst, candidates })) };
  }

  /** Runs the plan: picks go into the one review queue (never ticked here). */
  async draft(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    const plan = await this.plan(id, body);
    const b = PqrDraftBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The guide, the questions or the cost changed since you looked: check the plan again before it runs.", { plan });
    if (plan.mode === "live" && plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `Not started: the worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}). Use saved AI answers or rules only.`);
    const c = await this.combination(id);
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const job = await this.db.draftingJob.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, kind: PQR_STEP, mode: plan.mode === "rules" ? "LOCAL" : plan.mode.toUpperCase(), status: "RUNNING", startedBy: actor.id, message: "Drafting pre-qualification picks" } });
    const out = { runId: job.id, mode: plan.mode, from: plan.mode === "rules" ? "rules" as string | null : null, proposed: 0, ready: 0, decide: 0, check: 0, already: 0, dropped: [] as { role: string; asks: string; why: string }[], unresolved: [] as { passage: string; reason: string }[], usd: 0, run_files: [] as string[], note: "" };
    let items: ReturnType<typeof pqrPicksFromRounds>["items"] = [];
    if (plan.mode === "rules") {
      items = pqrPicksByRules(snapshot, c.id, job.id, randomUUID).map(({ id: _i, status: _s, decision: _d, ...x }) => x);
    } else {
      const g = await this.guide(c);
      if (!g.input) { out.note = `${g.code} is not among the official files the AI may read, so only rules can draft these.`; }
      else {
        const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], mode: plan.mode, wanted: async () => true, batchId: job.id };
        const d = await this.runner.round<PqrAnswer>(PQR_AI, false, ctx);
        const k = d.ok ? await this.runner.round<PqrAnswer>(PQR_AI, true, ctx) : null;
        out.usd = round2(d.costUsd + (k?.costUsd ?? 0));
        out.run_files = [d.ok ? d.runFile : null, k?.ok ? k.runFile : null].filter((x): x is string => !!x);
        if (!d.ok || !k?.ok) out.note = (!d.ok ? d.reason : k && !k.ok ? k.reason : null) ?? "The AI step did not finish.";
        else {
          out.from = d.from === "live" || k.from === "live" ? "live" : "replay";
          const r = (x: typeof d & { ok: true }): Round => ({ output: x.output, from: x.from, runFile: x.runFile, costUsd: x.costUsd });
          const res = pqrPicksFromRounds(snapshot, { draft: r(d), check: r(k) }, { ...g.input, text: g.text, code: g.code }, { runId: job.id, combinationId: c.id });
          items = res.items; out.dropped = res.dropped; out.unresolved = res.unresolved;
        }
      }
    }
    // One item per person and fact on the queue: a pick already waiting there is not proposed twice.
    const waiting = new Set((await this.db.proposalItem.findMany({ where: { workspaceId: c.workspaceId, combinationId: c.id, kind: "pqr_pick", status: "waiting" }, select: { identityKey: true } })).map((x) => x.identityKey));
    const fresh = items.filter((x) => !waiting.has(x.identity.key));
    out.already = items.length - fresh.length;
    await this.db.$transaction(async (tx) => {
      await insertProposals(tx, c.workspaceId, fresh);
      await tx.draftingJob.update({ where: { id: job.id }, data: { status: out.note && !items.length ? "FAILED" : "COMPLETED", costUsd: out.usd, finishedAt: new Date(), runFile: out.run_files[0] ?? null, message: out.note || `${fresh.length} pick${fresh.length === 1 ? "" : "s"} proposed`, detail: { dropped: out.dropped, unresolved: out.unresolved, run_files: out.run_files } } });
    });
    out.proposed = fresh.length;
    out.ready = fresh.filter((x) => x.confidence === "ready").length; out.check = fresh.filter((x) => x.confidence === "check").length; out.decide = fresh.filter((x) => x.confidence === "decide").length;
    const how = plan.mode === "rules" ? "rules only" : plan.mode === "replay" ? "saved AI answers" : "AI now";
    out.note = out.note || `${fresh.length} pick${fresh.length === 1 ? "" : "s"} for To review${out.already ? ` (${out.already} already waiting there)` : ""}${out.dropped.length ? `, ${out.dropped.length} left out with the reason` : ""}. Nothing is asked until a person accepts a pick. Sample until the immigration expert confirms.`;
    await this.audit.log(c.workspaceId, actor.id, "proposed", "pre-qualification", c.combinationKey, `${actor.name} drafted pre-qualification picks for "${c.label}" (${how}, US$${out.usd.toFixed(2)}): ${fresh.length} to review`, { runId: job.id, mode: plan.mode, run_files: out.run_files }, c.id);
    return out;
  }
}

@Controller("api")
export class PqrDraftsController {
  constructor(@Inject(PqrDrafts) private readonly p: PqrDrafts) {}
  @Post("combinations/:id/pqr-picks/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { actorOf(a); return this.p.plan(id, b); }
  @Post("combinations/:id/pqr-picks/draft") @HttpCode(201) draft(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.p.draft(actorOf(a), id, b); }
}
