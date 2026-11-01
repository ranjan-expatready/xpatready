// S5 slice 3 (runtime lane; challenge slice plan 3, P-119, P-121, P-123; Lead 28 Oct): "Who can be in this application"
// filled from the combination's IRCC guide. The guide is the one the form finder read and linked as a source
// (guide-sources.ts); its text inventory is the input. Three ways, each said with its cost before it runs:
//   rules  — words in the guide name a spouse, children, a sponsor or representative (US$0, no AI);
//   replay — the saved real answers of the two AI rounds for this exact guide and prompt (US$0);
//   live   — a draft round and an independent checker round through the guarded launcher (worst case shown first;
//            only inside the founder-approved live trials, P-110 amended).
// Every line keeps a quote that must be found in the guide text; with AI, only lines both rounds agree on are proposed,
// the rest are "to decide". Nothing is saved here: the person accepts the proposal into the editor and saves it, where
// the rules on Save apply (studio.savePeople). Which people apply is Sample until the immigration expert confirms.
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { MAX_ATTEMPTS, RUN_CAP_USD } from "../../../p2/policy.ts";
import { slug } from "../../engine/import.ts";
import { AI_FAILED, checkCounts } from "../../engine/people.ts";
import { ProposePeopleBody, type PeoplePlan, type PeopleProposal, type ProposedPerson } from "../../contracts/workspace.ts";
import { Audit, Db, need, PROTOTYPE, SOLUTION, type Actor } from "./core.ts";
import { inventoryFor, trailOf } from "./finder.ts";
import { GUIDE_SOURCE_KIND } from "./guide-sources.ts";
import { Sources, aiLive, usesFakeLauncher } from "./sources.ts";
import { Studio } from "./studio.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const RUNS = join(PROTOTYPE, "p2", "runs"), JOBS = join(PROTOTYPE, "p2", "jobs"), PROMPTS = join(PROTOTYPE, "p2", "prompts");
const ROUTE = "anthropic-api/aiw-d261-prototype-exception-aiw-d260", MODEL = "claude-opus-5-5";
const AI = { template: "who-can-be.v1.md", check: "who-can-be-check.v1.md", schema: "who-can-be-output.v1.schema.json", effort: "low", max_output_tokens: 3000 } as const;
/** Lead check L2: on only when the founder approved a live trial for Who can be (set by the Lead for that trial). */
// Lead 30 Oct (after the US$0.17 incident) and 31 Oct (PR #113 review M1): the server's live switch (P-175,
// STUDIO_AI_LIVE) is the one door and comes first. Behind it, AI now opens for the founder's approved trial, or on a
// check copy whose launches go to the fake launcher (its usage line pairs the switch with the fixture, P-192), so the run
// path is tested with no model call. The fake launcher alone never opens it.
export const whoCanBeLiveOpen = (env: NodeJS.ProcessEnv, fakeLauncher: boolean) => env.STUDIO_AI_LIVE === "approved" && (env.STUDIO_PEOPLE_AI_LIVE === "approved" || fakeLauncher);
const LIVE_APPROVED = () => aiLive() && whoCanBeLiveOpen(process.env, usesFakeLauncher());
export const LIVE_WAITING = "AI now waits for the founder's Go for a live trial (P-110). Use rules only, or saved AI answers, meanwhile.";
const LIVE_RUN = /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const STEPS_AI = [
  { n: 1, label: "Read the combination's guide (rules)", uses_ai: false },
  { n: 2, label: "AI lists who the guide lets this application include", uses_ai: true },
  { n: 3, label: "A second AI round checks it without seeing the first answer", uses_ai: true },
  { n: 4, label: "Rules keep only lines whose quote is in the guide and both rounds agree on", uses_ai: false },
];
const STEPS_RULES = [{ n: 1, label: "Read the combination's guide (rules)", uses_ai: false }, { n: 2, label: "Rules find the people the guide names, each with its sentence", uses_ai: false }];
/** QA-91 (C11.12, P-110): AI now runs in the background as a run (the shared run card, progress, Stop; runs.ts). */
export const WHO_OPERATION = "who_can_be";
export const WHO_STEPS = [
  { kind: "who_guide", label: STEPS_AI[0].label, uses_ai: false },
  { kind: "who_draft", label: STEPS_AI[1].label, uses_ai: true },
  { kind: "who_check", label: STEPS_AI[2].label, uses_ai: true },
  { kind: "who_keep", label: STEPS_AI[3].label, uses_ai: false },
] as const;
type WhoKind = (typeof WHO_STEPS)[number]["kind"];
/** What a background run reports per step: a step starts, ends, and is asked whether it is still wanted (Stop). */
type Track = { start: (k: WhoKind) => Promise<boolean>; end: (k: WhoKind, status: string, message: string, usd?: number) => Promise<void>; wanted: () => Promise<boolean> };

type Answer = { people: { role: string; min: number; max: number; applies: boolean; quote: string; why: string | null }[]; unresolved: { passage: string; reason: string }[] };
type Round = { ok: boolean; output?: Answer; costUsd: number; from?: "replay" | "live"; runFile?: string; reason?: string };
type Guide = { code: string; title: string; url: string; text: string; input: { file: string; sha256: string } | null; trail: string };

/** Rules only: the guide's sentences that name each kind of person (the first that also speaks of including or
 *  accompanying wins). How many is a Sample default a person sets; a sponsor or representative never applies. */
const RULES: { role: string; re: RegExp; prefer: RegExp; min: number; max: number; applies: boolean }[] = [
  { role: "spouse_or_partner", re: /\b(spouse|common-law partner)\b/i, prefer: /\b(accompan|famil|includ|travel)/i, min: 0, max: 1, applies: true },
  { role: "child", re: /\bdependent child(ren)?\b/i, prefer: /\b(accompan|famil|includ|travel)/i, min: 0, max: 4, applies: true },
  { role: "sponsor", re: /\b(your sponsor|a sponsor)\b/i, prefer: /\b(support|sponsor)/i, min: 0, max: 1, applies: false },
  { role: "representative", re: /\brepresentative\b/i, prefer: /\b(use|appoint|authoriz)/i, min: 0, max: 1, applies: false },
];
export function rulesReading(text: string): Answer {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 20 && s.length < 400);
  const principal = sentences.find((s) => /\b(you|applicant)\b/i.test(s) && /\bappl(y|ication)\b/i.test(s)) ?? sentences[0] ?? "";
  const people: Answer["people"] = principal ? [{ role: "principal", min: 1, max: 1, applies: true, quote: principal, why: "Rules: the guide is written to the person applying." }] : [];
  for (const r of RULES) {
    const hits = sentences.filter((s) => r.re.test(s));
    const quote = hits.find((s) => r.prefer.test(s)) ?? hits[0];
    if (quote) people.push({ role: r.role, min: r.min, max: r.max, applies: r.applies, quote, why: `Rules: the guide names this person; how many is a Sample default (${r.min} to ${r.max}).` });
  }
  return { people, unresolved: [] };
}

/** QA-99: the job's one known fact. The launcher admits only a full trail of names joined by " › " (p2/launch.ts
 *  knownOk), the same one the finder sends (Pathway › Program › Category …); the combination's label alone is refused
 *  before any call, so AI now could never run. */
export async function whoCanBeTrail(db: Db, combinationId: string): Promise<string> {
  return (await trailOf(db, combinationId)).trail.join(" › ");
}

@Injectable()
export class PeopleFromGuide implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Sources) private readonly sources: Sources, @Inject(Studio) private readonly studio: Studio, @Inject(Audit) private readonly audit: Audit) {}

  /** The combination's guide: the one linked as its source (the finder read it, or Load sample linked it). */
  private async guide(combinationId: string): Promise<Guide> {
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const shas = (await this.db.sourceAttachment.findMany({ where: { combinationId }, select: { sha256: true } })).map((a) => a.sha256);
    const ed = shas.length ? await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, sha256: { in: shas }, form: { formKind: "guide" } }, include: { form: true } }) : null;
    if (!ed?.form.formPageUrl) throw problem(409, "No guide yet", `"${c.label}" has no IRCC guide among its sources yet: finding its forms (Start setup) reads and links it. Then fill this from the guide.`);
    const input = inventoryFor(ed.form.formPageUrl);
    let text = "";
    // The official text inventory (inventoryFor: "prototype/p1/inventory/…", under the solution folder) is what AI may read.
    if (input) { try { text = String(JSON.parse(readFileSync(join(SOLUTION, input.file), "utf8")).text ?? ""); } catch { text = ""; } }
    if (!text) throw problem(409, "Guide not readable", `${ed.form.formKey}'s text is not on this computer yet, so it cannot be read here. Find the forms again to read it.`);
    return { code: ed.form.formKey, title: ed.form.displayName, url: ed.form.formPageUrl, text, input, trail: await whoCanBeTrail(this.db, combinationId) };
  }

  /** The plan: the steps and the most it can cost, said before anything runs (STANDARDS: cost first). */
  async plan(combinationId: string, body: unknown): Promise<PeoplePlan> {
    const b = ProposePeopleBody.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Check the request", "Choose rules only, saved AI answers or AI now.", { errors: [{ field: "mode", message: "Choose how to fill it." }] });
    // Lead check L2: AI now was not in the slice 3 Go; it stays off until the founder approves a live trial (P-110 plan).
    if (b.data.mode === "live" && !LIVE_APPROVED()) throw problem(409, "AI now is not approved yet", LIVE_WAITING);
    const g = await this.guide(combinationId);
    const worst = b.data.mode === "live" ? round2(2 * Math.min(RUN_CAP_USD, costUsd(MODEL, inputTokenBound(g.text), AI.max_output_tokens) * 2)) : 0;
    const steps = b.data.mode === "rules" ? STEPS_RULES : STEPS_AI;
    const note = b.data.mode === "replay" ? "Uses the answers AI gave for this exact guide and prompt before (US$0); with none saved yet, it says so and nothing changes." : b.data.mode === "rules" ? "No AI: rules find the sentences that name each person. How many is a Sample default you check." : "Two AI rounds read the guide; only lines both agree on, with their sentence in the guide, are proposed.";
    const ledger = this.sources.ledger();
    return { mode: b.data.mode, guide: { code: g.code, title: g.title, url: g.url }, steps, totals: { worst_usd: worst, remaining_usd: ledger.remaining_usd }, note, live: { approved: LIVE_APPROVED(), why: LIVE_APPROVED() ? null : LIVE_WAITING }, plan_sha256: sha(JSON.stringify({ combinationId, mode: b.data.mode, guide: g.input?.sha256 ?? sha(g.text), worst })) };
  }

  /** A run left running by a stopped server can never finish: it says so (as Upload PDF does). */
  async onModuleInit() {
    for (const b of await this.db.aiBatch.findMany({ where: { operation: WHO_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } })) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped while AI read the guide. Fill it again." } });
    }
  }

  /** Runs the plan. Rules only and saved AI answers return the proposal at once; AI now starts a run and answers with
   *  its id (QA-91): the card follows it, Stop ends it, and the proposal is read when it is done (never saved here). */
  async propose(actor: Actor, combinationId: string, body: unknown): Promise<PeopleProposal | { runId: string }> {
    need(actor, "author");
    const plan = await this.plan(combinationId, body);
    const b = ProposePeopleBody.parse(body);
    if (b.planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The guide or the cost changed since you looked: check the plan again before it runs.", { plan });
    if (plan.mode === "live" && plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `The worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}).`);
    if (plan.mode !== "live") return this.build(actor, combinationId, plan);
    const c = (await this.db.combination.findUnique({ where: { id: combinationId } }))!;
    const batch = await this.db.aiBatch.create({ data: { workspaceId: c.workspaceId, idempotencyKey: `who-${plan.plan_sha256.slice(0, 16)}-${Date.now()}`, operation: WHO_OPERATION, scopeKind: "combination", scopeLabel: c.label, mode: "LIVE", status: "QUEUED", planSha256: plan.plan_sha256,
      plan: { operation: WHO_OPERATION, combination: { id: c.id }, steps: WHO_STEPS.map((s) => ({ kind: s.kind, uses_ai: s.uses_ai })), totals: { worst_usd: plan.totals.worst_usd, expected_usd: plan.totals.worst_usd } }, spendLimitUsd: Math.max(plan.totals.worst_usd, 0.01), worstCaseUsd: plan.totals.worst_usd, expectedUsd: plan.totals.worst_usd, startedBy: actor.id, message: "AI reads the guide" } });
    await this.db.draftingJob.createMany({ data: WHO_STEPS.map((s, i) => ({ workspaceId: c.workspaceId, combinationId, batchId: batch.id, kind: s.kind, mode: s.uses_ai ? "LIVE" : "LOCAL", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
    void this.execute(batch.id, actor, combinationId, plan).catch(async (e) => {
      console.warn(`[who-can-be] run ${batch.id} stopped: ${(e as Error).message.slice(0, 300)}`);
      await this.db.draftingJob.updateMany({ where: { batchId: batch.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Not run: the step before it stopped." } });
      await this.db.aiBatch.updateMany({ where: { id: batch.id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "FAILED", finishedAt: new Date(), message: "The run stopped on this computer; what it spent is on this card. Fill it again, or use rules only." } });
    });
    return { runId: batch.id };
  }

  /** The background run: each step on the card, Stop asked before each step and right before each AI call. */
  private async execute(batchId: string, actor: Actor, combinationId: string, plan: PeoplePlan) {
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status: "RUNNING" } });
    const job = (k: WhoKind) => this.db.draftingJob.findFirst({ where: { batchId, kind: k } });
    const wanted = async () => !(await this.db.aiBatch.findUnique({ where: { id: batchId } }))?.cancelRequested;
    const track: Track = {
      wanted,
      start: async (k) => {
        if (!(await wanted())) return false;
        const j = await job(k); if (j) await this.db.draftingJob.update({ where: { id: j.id }, data: { status: "RUNNING", startedAt: new Date(), message: "Running" } });
        return true;
      },
      end: async (k, status, message, usd = 0) => { const j = await job(k); if (j) await this.db.draftingJob.update({ where: { id: j.id }, data: { status, message, costUsd: usd, finishedAt: new Date() } }); },
    };
    const out = await this.build(actor, combinationId, plan, track);
    const stopped = !(await wanted());
    await this.db.draftingJob.updateMany({ where: { batchId, status: { in: ["WAITING", "RUNNING"] } }, data: { status: stopped ? "CANCELLED" : "SKIPPED", finishedAt: new Date(), message: stopped ? "Stopped before it started." : "Not needed after the step before it." } });
    const done = !stopped && !!out.from;
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status: stopped ? "CANCELLED" : done ? "COMPLETED" : "FAILED", finishedAt: new Date(), message: stopped ? `Stopped by a person. Spent US$${out.usd.toFixed(2)}; nothing was proposed.` : out.note, plan: { ...((b?.plan ?? {}) as object), ...(stopped ? {} : { result: out }) } } }); // a stopped run proposes nothing
  }

  /** Stop (runs.ts): no step or AI call starts after it, and a running AI call is ended. */
  async stop(actor: Actor, id: string) {
    need(actor, "author");
    const b = await this.db.aiBatch.update({ where: { id }, data: { cancelRequested: true, message: "Stopping" } });
    this.sources.stopLaunches((jobId) => jobId.startsWith("studio-who-can-be"));
    await this.audit.log(b.workspaceId, actor.id, "stopped", "people", id, `${actor.name} stopped filling "Who can be" from the guide (${b.scopeLabel})`);
  }

  /** The proposal of a finished run, for the editor (never saved here). */
  async result(combinationId: string, runId: string): Promise<PeopleProposal> {
    const b = /^[0-9a-f-]{36}$/i.test(runId) ? await this.db.aiBatch.findUnique({ where: { id: runId } }) : null;
    const plan = (b?.plan ?? {}) as { combination?: { id?: string }; result?: PeopleProposal };
    if (!b || b.operation !== WHO_OPERATION || plan.combination?.id !== combinationId) throw problem(404, "Not found", "This run no longer exists (the demo workspace may have been reset).");
    if (!plan.result) throw problem(409, "Not finished", b.status === "CANCELLED" ? "This run was stopped before it proposed anything." : "This run is still going: its card shows each step.");
    return plan.result;
  }

  private async build(actor: Actor, combinationId: string, plan: PeoplePlan, track?: Track): Promise<PeopleProposal> {
    const c = (await this.db.combination.findUnique({ where: { id: combinationId } }))!;
    if (track && !(await track.start("who_guide"))) return { mode: plan.mode, guide: plan.guide, people: [], to_decide: [], dropped: [], usd: 0, from: null, run_files: [], note: "Stopped before it started." };
    const g = await this.guide(combinationId);
    await track?.end("who_guide", "COMPLETED", `Read ${g.code} on this computer (no AI).`);
    const roles = new Map((await this.studio.personRoles(c.workspaceId)).filter((r) => r.takesPartInCase && !r.retired).map((r) => [r.key, r]));
    const inGuide = (q: string) => !!q && sameText(g.text).includes(sameText(q));
    const out: PeopleProposal = { mode: plan.mode, guide: plan.guide, people: [], to_decide: [], dropped: [], usd: 0, from: plan.mode === "rules" ? "rules" : null, run_files: [], note: "" };
    const keep = (p: Answer["people"][number], agreed: boolean): ProposedPerson | null => {
      const r = roles.get(p.role);
      if (!r) { out.dropped.push({ role: p.role, why: "Not a person role in the library that takes part in a case (Shared library › Person roles)." }); return null; }
      if (!inGuide(p.quote)) { out.dropped.push({ role: p.role, why: "Its sentence is not in the guide text, so it is not proposed." }); return null; }
      // The 0–9 range is kept in code: the provider's structured outputs refuse minimum and maximum in the schema (P-153: code is the guard).
      if (![p.min, p.max].every((n) => Number.isInteger(n) && n >= 0 && n <= 9)) { out.dropped.push({ role: p.role, why: "Its number of people is not a whole number from 0 to 9, so it is not proposed." }); return null; }
      const applies = r.mayBeApplicant ? p.applies : false;
      return { role: p.role, label: r.label, min: p.role === "principal" ? 1 : Math.min(p.min, p.max), max: p.role === "principal" ? 1 : p.max, applies, quote: p.quote.slice(0, 400), why: p.why ?? null, agreed };
    };
    if (plan.mode === "rules") {
      for (const p of rulesReading(g.text).people) { const k = keep(p, true); if (k) out.people.push(k); }
    } else {
      const said = (r: Round) => (r.ok ? `Answered (US$${r.costUsd.toFixed(2)}).` : r.reason ?? "The AI step did not finish.");
      const stopped: Round = { ok: false, costUsd: 0, reason: "Stopped before it started." };
      const draft = track && !(await track.start("who_draft")) ? stopped : await this.round(false, c.combinationKey, g, plan.mode, track?.wanted);
      if (track && draft !== stopped) await track.end("who_draft", draft.ok ? "COMPLETED" : (await track.wanted()) ? "FAILED" : "CANCELLED", said(draft), draft.costUsd);
      const check = !draft.ok ? null : track && !(await track.start("who_check")) ? stopped : await this.round(true, c.combinationKey, g, plan.mode, track?.wanted);
      if (track && check && check !== stopped) await track.end("who_check", check.ok ? "COMPLETED" : (await track.wanted()) ? "FAILED" : "CANCELLED", said(check), check.costUsd);
      out.usd = round2((draft.costUsd ?? 0) + (check?.costUsd ?? 0));
      out.run_files = [draft.runFile, check?.runFile].filter((x): x is string => !!x);
      if (!draft.ok || !check?.ok) { out.note = (!draft.ok ? draft.reason : check?.reason) ?? "The AI step did not finish."; out.from = null; return out; }
      if (track && !(await track.start("who_keep"))) { out.note = "Stopped before the rules kept the agreed lines."; out.from = null; return out; }
      out.from = draft.from === "live" || check.from === "live" ? "live" : "replay";
      const d = checkCounts(draft.output!), k = checkCounts(check.output!);
      out.dropped.push(...d.dropped, ...k.dropped.filter((x) => !d.dropped.some((y) => y.role === x.role)));
      const outside = new Set([...d.dropped, ...k.dropped].map((x) => x.role));
      draft.output!.people = d.kept.filter((p) => !outside.has(p.role)); check.output!.people = k.kept.filter((p) => !outside.has(p.role));
      const two = new Map(check.output!.people.map((p) => [p.role, p]));
      for (const p of draft.output!.people) {
        const q = two.get(p.role);
        if (q && q.min === p.min && q.max === p.max && q.applies === p.applies) { const k = keep(p, true); if (k) out.people.push(k); }
        else out.to_decide.push({ role: p.role, draft: `${p.min} to ${p.max}${p.applies ? ", applies" : ""}`, check: q ? `${q.min} to ${q.max}${q.applies ? ", applies" : ""}` : "not named", why: q ? "The two rounds read it differently." : "Only one round named this person." });
      }
      for (const q of check.output!.people) if (!draft.output!.people.some((p) => p.role === q.role)) out.to_decide.push({ role: q.role, draft: "not named", check: `${q.min} to ${q.max}${q.applies ? ", applies" : ""}`, why: "Only one round named this person." });
      await track?.end("who_keep", "COMPLETED", `Kept ${out.people.length} line${out.people.length === 1 ? "" : "s"} both rounds agree on; ${out.to_decide.length} to decide (no AI).`);
    }
    if (!out.people.some((p) => p.role === "principal")) out.to_decide.push({ role: "principal", draft: "—", check: "—", why: "The guide sentence for the person applying was not found; the principal stays as it is." });
    out.note = out.note || `${out.people.length} line${out.people.length === 1 ? "" : "s"} proposed from ${g.code}${out.to_decide.length ? `, ${out.to_decide.length} to decide` : ""}. Nothing is saved until you accept and save. Sample until the immigration expert confirms.`;
    await this.audit.log(c.workspaceId, actor.id, "proposed", "people", c.combinationKey, `${actor.name} filled "Who can be" for "${c.label}" from ${g.code} (${plan.mode === "rules" ? "rules only" : plan.mode === "replay" ? "saved AI answers" : "AI now"}, US$${out.usd.toFixed(2)}): ${out.people.map((p) => p.role).join(", ") || "nothing proposed"}`, { mode: plan.mode, run_files: out.run_files }, combinationId);
    return out;
  }

  /** One AI round: the newest saved real run of exactly this job (same guide, same prompt, this combination), or a
   *  guarded live call through the launcher (stub pass first), as the form finder does. */
  private async round(isCheck: boolean, combinationKey: string, g: Guide, mode: "replay" | "live", wanted?: () => Promise<boolean>): Promise<Round> {
    if (!g.input) return { ok: false, costUsd: 0, reason: `${g.code} is not among the official files the AI may read, so only rules can fill this.` };
    const template = isCheck ? AI.check : AI.template, base = `studio-who-can-be${isCheck ? "-check" : ""}`;
    const tsha = sha(readFileSync(join(PROMPTS, template)));
    const inputs = [g.input];
    if (mode === "replay") {
      const mine = new RegExp(`^${base}-${isCheck ? "" : "(?!check-)"}.+-live-\\d{8}t\\d{9}z-[a-z0-9]+\\.json$`);
      const files = existsSync(RUNS) ? readdirSync(RUNS).filter((f) => mine.test(f) && LIVE_RUN.test(f)).sort((a, b) => b.slice(b.lastIndexOf("-live-")).localeCompare(a.slice(a.lastIndexOf("-live-")))) : [];
      for (const f of files) {
        try {
          const r = JSON.parse(readFileSync(join(RUNS, f), "utf8"));
          if (r.caller !== "live" || r.drafting_run?.status !== "completed" || r.contract_valid !== true || r.launch_evidence?.template_sha256 !== tsha || JSON.stringify(r.drafting_run?.inputs?.official_files) !== JSON.stringify(inputs) || r.drafting_run?.inputs?.combination !== combinationKey) continue;
          const o = JSON.parse(String(r.raw_output)) as Answer;
          if (Array.isArray(o?.people)) return { ok: true, output: o, costUsd: 0, from: "replay", runFile: `prototype/p2/runs/${f}` };
        } catch { /* unreadable: an older one may do */ }
      }
      return { ok: false, costUsd: 0, reason: `No saved AI answer for ${g.code} and this prompt yet: it is recorded once in a founder-approved live trial. Use rules only meanwhile.` };
    }
    const jobId = `${base}-${slug(combinationKey).slice(0, 30).replace(/_/g, "-")}-${sha(`${combinationKey}|${g.input.sha256}|${Date.now()}`).slice(0, 8)}`;
    const job = { job_id: jobId, kind: "who_can_be", combination: combinationKey, configuration_version: "s5-who-can-be", template, output_schema: AI.schema, inputs,
      settings: { provider_route: ROUTE, model: MODEL, effort: AI.effort, timeout_ms: 300_000, max_attempts: MAX_ATTEMPTS, budget_usd: 1, max_output_tokens: AI.max_output_tokens }, known: { combination_trail: g.trail } };
    mkdirSync(JOBS, { recursive: true });
    writeFileSync(join(JOBS, `${jobId}.json`), JSON.stringify(job, null, 1) + "\n");
    try {
      const last = (o: string) => { for (const l of o.trim().split("\n").reverse()) { try { return JSON.parse(l); } catch { /* not JSON */ } } return null; };
      // QA-88: the launcher's and the provider's own text go to the server log, never to the person.
      const stub = await this.sources.launchOnce(jobId, "stub");
      if (stub.code !== 0) { console.warn(`[who-can-be] stub pass refused ${jobId}: ${String(last(stub.out)?.refused ?? stub.err).trim().slice(-300)}`); return { ok: false, costUsd: 0, reason: AI_FAILED.refused }; }
      const live = await this.sources.launchOnce(jobId, "live", wanted);
      if (live.cancelled || live.stopped) return { ok: false, costUsd: 0, reason: "Stopped by a person before AI answered." };
      const lj = last(live.out);
      if (!lj?.run_file) { console.warn(`[who-can-be] live call did not run ${jobId}: ${String(lj?.refused ?? lj?.error ?? live.err).trim().slice(-300)}`); return { ok: false, costUsd: 0, reason: AI_FAILED.notRun }; }
      const rec = JSON.parse(readFileSync(lj.run_file, "utf8"));
      const cost = Number(rec.drafting_run?.usage?.cost_usd ?? 0);
      const spent = ` Cost US$${cost.toFixed(2)}.`;
      if (rec.drafting_run?.status !== "completed") return { ok: false, costUsd: cost, reason: AI_FAILED.notRun + spent };
      if (rec.contract_valid !== true) return { ok: false, costUsd: cost, reason: AI_FAILED.unusable + spent };
      const o = JSON.parse(String(rec.raw_output)) as Answer;
      return Array.isArray(o?.people) ? { ok: true, output: o, costUsd: cost, from: "live", runFile: String(lj.run_file).replace(`${SOLUTION}/`, "") } : { ok: false, costUsd: cost, reason: AI_FAILED.unusable + spent };
    } finally { rmSync(join(JOBS, `${jobId}.json`), { force: true }); }
  }
}
