// C4.7 (P-76, P-121, P-130 step 6, P-149 one door; forms lane, swarm builder B4): "Draft pre-qualification picks" for
// one combination, into the one review queue, where a person accepts or removes each pick (proposals.ts decide: the
// pqr_pick lander writes the tick through fact-sources.ts acceptPqrPick, with Undo). A person sees two ways (P-227: Live
// or Saved, nothing else); "rules" stays an API path for tests and C4.11's rules run, never offered on a screen. Each way
// is said with its cost before it runs (STANDARDS: cost first), and the plan says whether a Saved result exists:
//   rules  — (API only) the rules' stand-in producer (engine/sources.ts pqrPicksByRules): facts a rule of the combination reads (US$0);
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
import { pairOf, StepRunner, worstRoundUsd, type AiStep, type RoundContext, type RoundOut } from "./rounds.ts";
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
    noSaved: "No saved AI answer for this guide, prompt and combination yet: it is recorded once in an approved Live run.",
    badSaved: "The saved AI answer could not be read, so it is not used.",
    nothingUsed: "Nothing of it is proposed.",
  },
};
export const LIVE_WAITING = "Live is not open yet: each paid run is approved first, with its cost stated.";
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
/** P-227: whether a Saved result exists for this combination's guide (both rounds, readable, this prompt), and if not, why. */
export type SavedState = { available: boolean; why: string | null; files: string[] };
/** Break B3 (2 Nov): a pre-qualification draft of a combination that started this long ago and is still RUNNING is taken
 *  as stopped (a server restart), so it never blocks the next draft forever. Two live rounds fit well inside it. */
const RUNNING_FOR_MS = 15 * 60_000;
const NOTHING_CHARGED = /[,:;]? *(so )?nothing (was|is) (sent and nothing was )?charged\.?/i;

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
  async guide(c: { id: string; workspaceId: string; label: string }): Promise<Guide> {
    const shas = (await this.db.sourceAttachment.findMany({ where: { combinationId: c.id }, select: { sha256: true } })).map((a) => a.sha256);
    const ed = shas.length ? await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: { in: shas }, form: { formKind: "guide" } }, include: { form: true } }) : null;
    if (!ed?.form.formPageUrl) throw problem(409, "No guide yet", `"${c.label}" has no IRCC guide among its sources yet: finding its forms (Start setup) reads and links it. Then draft its pre-qualification.`);
    const input = inventoryFor(ed.form.formPageUrl);
    let text = "";
    if (input) { try { text = String(JSON.parse(readFileSync(join(SOLUTION, input.file), "utf8")).text ?? ""); } catch { text = ""; } }
    if (!text) throw problem(409, "Guide not readable", `${ed.form.formKey}'s text is not on this computer yet, so it cannot be read here. Find the forms again to read it.`);
    return { code: ed.form.formKey, title: ed.form.displayName, text, input, trail: await whoCanBeTrail(this.db, c.id) };
  }

  /** The two saved rounds of ONE live run (break B1): the newest usable checker round, then the first round of the same
   *  run (same job stem, rounds.ts pairOf). A live run whose checker round failed left no checker file, so an earlier
   *  complete run is used instead of its lone first round. Read-only: a replay round reads files and sends nothing. */
  private async savedRounds(c: { combinationKey: string }, g: Guide & { input: { file: string; sha256: string } }): Promise<{ d: RoundOut<PqrAnswer>; k: RoundOut<PqrAnswer> | null }> {
    const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], mode: "replay", wanted: async () => true };
    const k = await this.runner.round<PqrAnswer>(PQR_AI, true, ctx);
    if (!k.ok) return { d: k, k: null };
    const d = await this.runner.round<PqrAnswer>(PQR_AI, false, { ...ctx, replayPair: pairOf(PQR_AI, true, k.runFile) });
    return { d: d.ok ? d : { ok: false, costUsd: 0, reason: "The newest saved checker reading has no first reading from the same run, so it is not used." }, k };
  }

  /** P-227: is there a Saved result for both rounds of one run? Saved means saved in this copy's p2/runs (committed results
   *  are what the tech lead and qa checked; a marked "checked" list is a shared follow-up, see the PR). */
  async saved(c: { combinationKey: string }, g: Guide): Promise<SavedState> {
    if (!g.input) return { available: false, why: `${g.code} is not among the official files the AI may read, so it has no Saved result.`, files: [] };
    const { d, k } = await this.savedRounds(c, { ...g, input: g.input });
    return d.ok && k?.ok ? { available: true, why: null, files: [d.runFile, k.runFile] } : { available: false, why: (!d.ok ? d.reason : null) ?? PQR_AI.words.noSaved, files: [] };
  }

  /** What would run, and the most it can cost, said before anything runs. */
  async plan(id: string, body: unknown) {
    const b = PqrDraftBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose Live or Saved.", { errors: [{ field: "mode", message: "Choose Live or Saved." }] });
    const c = await this.combination(id);
    const mode = b.data.mode;
    if (mode === "live" && !aiLive()) throw problem(409, "AI now is not approved yet", LIVE_WAITING);
    const g = mode === "rules" ? null : await this.guide(c);
    const worst = mode === "live" && g ? round2(2 * worstRoundUsd(PQR_AI, g.text.length)) : 0;
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const candidates = pqrCandidates(snapshot).length;
    const remaining = this.sources.ledger().remaining_usd;
    const saved = g ? await this.saved(c, g) : null;
    const note = mode === "rules" ? "No AI: the rules propose the facts this combination's rules read. Each pick goes to To review for a person to accept or remove."
      : mode === "replay" ? "Saved: both AI rounds of one earlier Live run for this exact guide and prompt, replayed through the same steps (US$0)."
      : "Two AI rounds read the guide; a pick is Ready only when both make it, with its sentence in the guide.";
    return { mode, combination: { id: c.id, label: c.label }, guide: g ? { code: g.code, title: g.title, file: g.input?.file ?? null } : null, steps: mode === "rules" ? STEPS.rules : STEPS.ai, candidates,
      totals: { worst_usd: worst, remaining_usd: remaining }, note, live: { approved: aiLive(), why: aiLive() ? null : LIVE_WAITING }, saved,
      // Break B4: the Saved result looked at is part of the plan, so a run never replays another one than the person saw.
      plan_sha256: sha(JSON.stringify({ id: c.id, mode, guide: g?.input?.sha256 ?? null, worst, candidates, ...(mode === "replay" ? { saved: saved?.files ?? [] } : {}) })) };
  }

  /** Runs the plan: picks go into the one review queue (never ticked here). */
  /** `opts.jobId` (C4.11): the step of a "Draft questions and documents" run this draft writes, instead of its own job. */
  async draft(actor: Actor, id: string, body: unknown, opts: { jobId?: string } = {}) {
    need(actor, "author");
    const plan = await this.plan(id, body);
    const b = PqrDraftBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The guide, the questions or the cost changed since you looked: check the plan again before it runs.", { plan });
    if (plan.mode === "live" && plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `Not started: the worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}). Nothing was started.`);
    const c = await this.combination(id);
    const snapshot = (await buildSnapshot(this.db, c.workspaceId, c.id, "draft")).snapshot;
    const jobData = { mode: plan.mode === "rules" ? "LOCAL" : plan.mode.toUpperCase(), status: "RUNNING", message: "Drafting pre-qualification picks" };
    // Break B3: one pre-qualification draft at a time per combination (a reload and a second Live start never run two paid
    // rounds side by side). The check and the new job are made under one lock per combination.
    const job = opts.jobId ? await this.db.draftingJob.update({ where: { id: opts.jobId }, data: jobData })
      : await this.db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `pqr_picks_run:${c.id}`);
        const going = await tx.draftingJob.findFirst({ where: { combinationId: c.id, kind: PQR_STEP, status: "RUNNING", startedAt: { gte: new Date(Date.now() - RUNNING_FOR_MS) } }, select: { id: true } });
        if (going) throw problem(409, "Already drafting", "Pre-qualification picks are already being drafted for this combination. Wait for that run to end, then look at To review.", { runId: going.id });
        return tx.draftingJob.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, kind: PQR_STEP, startedBy: actor.id, ...jobData } });
      });
    const out = { runId: job.id, mode: plan.mode, from: plan.mode === "rules" ? "rules" as string | null : null, offer_saved: false, proposed: 0, ready: 0, decide: 0, check: 0, already: 0, removed: 0, dropped: [] as { role: string; asks: string; why: string }[], unresolved: [] as { passage: string; reason: string }[], usd: 0, run_files: [] as string[], note: "" };
    let items: ReturnType<typeof pqrPicksFromRounds>["items"] = [];
    if (plan.mode === "rules") {
      items = pqrPicksByRules(snapshot, c.id, job.id, randomUUID).map(({ id: _i, status: _s, decision: _d, ...x }) => x);
    } else {
      const g = await this.guide(c);
      if (!g.input) { out.note = `${g.code} is not among the official files the AI may read, so its picks cannot be drafted with Live or Saved.`; }
      else {
        const ctx: RoundContext = { trail: g.trail, contextKey: c.combinationKey, inputs: [g.input], mode: plan.mode, wanted: async () => true, batchId: job.id };
        // Review minor (#282): a round that throws ends this job as FAILED, never left running.
        const safe = async (isCheck: boolean) => { try { return await this.runner.round<PqrAnswer>(PQR_AI, isCheck, ctx); } catch (e) { console.warn(`pqr picks ${job.id}:`, String(e).slice(0, 400)); return { ok: false as const, costUsd: 0, reason: "The AI step stopped on this computer, so nothing of it is used." }; } };
        // Saved: both rounds of one saved run (break B1). Live: a first round, then a blind checker round.
        let d: RoundOut<PqrAnswer>, k: RoundOut<PqrAnswer> | null;
        if (plan.mode === "replay") ({ d, k } = await this.savedRounds(c, { ...g, input: g.input }).catch((e) => { console.warn(`pqr picks ${job.id}:`, String(e).slice(0, 400)); return { d: { ok: false as const, costUsd: 0, reason: "The AI step stopped on this computer, so nothing of it is used." }, k: null }; }));
        else { d = await safe(false); k = d.ok ? await safe(true) : null; }
        out.usd = round2(d.costUsd + (k?.costUsd ?? 0));
        out.run_files = [d.ok ? d.runFile : null, k?.ok ? k.runFile : null].filter((x): x is string => !!x);
        if (!d.ok || !k?.ok) {
          out.note = (!d.ok ? d.reason : k && !k.ok ? k.reason : null) ?? "The AI step did not finish.";
          // Break B2: a round that did run stays charged; the note never says "nothing was charged" then.
          if (out.usd > 0) out.note = `${out.note.replace(NOTHING_CHARGED, "").replace(/\.?$/, ".")} This run cost US$${out.usd.toFixed(2)} (counted); nothing of it is used.`;
          // P-227 (D2 part 4): a failed Live run offers Saved when a Saved result exists; a failed Saved run never does.
          if (plan.mode === "live" && (await this.saved(c, g)).available) { out.offer_saved = true; out.note = `${out.note.replace(/\.?$/, ".")} A Saved result exists for this guide: use Saved (US$0).`; }
        }
        else {
          out.from = d.from === "live" || k.from === "live" ? "live" : "replay";
          const r = (x: typeof d & { ok: true }): Round => ({ output: x.output, from: x.from, runFile: x.runFile, costUsd: x.costUsd });
          const res = pqrPicksFromRounds(snapshot, { draft: r(d), check: r(k) }, { ...g.input, text: g.text, code: g.code }, { runId: job.id, combinationId: c.id });
          items = res.items; out.dropped = res.dropped; out.unresolved = res.unresolved;
        }
      }
    }
    // One item per person and fact on the queue (break B1): the check and the insert run in one transaction under a lock
    // per combination, so two drafts at the same moment never both add the same pick. A pick a person removed is not
    // proposed again by the same producer (break B3): its removal and reason stand; an AI reading of that question (with the
    // guide's sentence) is new evidence and may still be proposed after a rules pick was removed, and the other way round.
    let fresh: typeof items = [];
    await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `pqr_picks:${c.id}`);
      const seen = await tx.proposalItem.findMany({ where: { workspaceId: c.workspaceId, combinationId: c.id, kind: "pqr_pick", status: { in: ["waiting", "rejected"] } }, select: { identityKey: true, status: true, origin: true } });
      const waiting = new Set(seen.filter((x) => x.status === "waiting").map((x) => x.identityKey)), removed = new Set(seen.filter((x) => x.status === "rejected").map((x) => `${x.origin}|${x.identityKey}`));
      const gone = (x: (typeof items)[number]) => removed.has(`${x.origin}|${x.identity.key}`);
      fresh = items.filter((x) => !waiting.has(x.identity.key) && !gone(x));
      out.already = items.filter((x) => waiting.has(x.identity.key)).length;
      out.removed = items.filter((x) => !waiting.has(x.identity.key) && gone(x)).length;
      await insertProposals(tx, c.workspaceId, fresh);
      await tx.draftingJob.update({ where: { id: job.id }, data: { status: out.note && !items.length ? "FAILED" : "COMPLETED", costUsd: out.usd, finishedAt: new Date(), runFile: out.run_files[0] ?? null, message: out.note || `${fresh.length} pick${fresh.length === 1 ? "" : "s"} proposed`, detail: { dropped: out.dropped, unresolved: out.unresolved, run_files: out.run_files } } });
    });
    out.proposed = fresh.length;
    out.ready = fresh.filter((x) => x.confidence === "ready").length; out.check = fresh.filter((x) => x.confidence === "check").length; out.decide = fresh.filter((x) => x.confidence === "decide").length;
    const how = plan.mode === "rules" ? "rules only" : plan.mode === "replay" ? "Saved" : "Live";
    out.note = out.note || `${fresh.length} pick${fresh.length === 1 ? "" : "s"} for To review${out.already ? ` (${out.already} already waiting there)` : ""}${out.removed ? `; ${out.removed} a person removed before are not proposed again` : ""}${out.dropped.length ? `, ${out.dropped.length} left out with the reason` : ""}. Nothing is asked until a person accepts a pick. Sample until the immigration expert confirms.`;
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
