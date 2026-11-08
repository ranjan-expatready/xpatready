// C7.5 part 2 The independent AI review of a filled form (runtime lane, M3-E; r5c BR-19; AG-11-69, -70, -71; P-110, P-121,
// P-164 (2), P-227, P-71, P-168; stand-in SI-6). The case officer reviews one person's filled forms before they go out:
//   plan   — POST /api/runtime/cases/:id/review-runs/plan {forms, subject}: the run card, cost first (P-110). Saved (the
//            checked saved run of this form edition and these values, replayed at US$0) and Live (two AI rounds, its usual
//            and worst cost, allowed only with the founder's switch, P-227); the SI-6 stand-in said;
//   run    — POST /api/runtime/cases/:id/review-runs {forms, subject, mode, planSha256}: the findings go into the case's
//            review findings (source AI, part 1's life: acknowledge, waive CRITICAL, dismiss), never into the form;
//   stop   — POST /api/runtime/review-runs/:run/stop: ends the live round running now for that run, and no other.
// What the two rounds read is the form's review sheet (engine/runtime/form-review.ts): its printed edition and what each box
// would print. A Saved run is found by the sheet's checksum and the edition (rounds.ts: same prompt, same input files, same
// edition key), never by the PDF's checksum: the same values give the same sheet. A run whose values differ has no Saved
// run and says so. The draft round and the blind checker round come from one saved live run (pairOf). P-121: High when
// both rounds raise a fact with the same severity and the rules pass (the quote is in that fact's value, AG-11-70), Low
// with both rounds' reasons otherwise. A dismissed AI finding is not raised again (same person, form, fact and quoted
// words); a finding whose quoted words left the form is resolved by the rules at the next run. Findings warn and never
// block Ready to file (P-71, P-168; readiness-inputs.ts). No ai_batch row, no change to any answer; a replay costs US$0.
// Never a live call from a test (P-175): live needs STUDIO_AI_LIVE=approved and the plan's checksum; the one paid run is
// the tech lead's, on the Mac (P-295). STUDIO_MADE_UP_REVIEW_RUNS=1 on an isolated copy (STUDIO_VAR set) reads saved runs
// from that copy's own folder of made-up runs instead of p2/runs, so a test proves the replay path without putting a
// made-up run where the product or a pack would count it; the card then says so on every line.
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { costUsd } from "../../../p2/ledger.ts";
import { editionContextKey, PRINTED_EDITION } from "../../engine/rounds.ts";
import { formCoverage } from "../../engine/runtime/forms.ts";
import { aiFingerprint, findingsFromRounds, reviewSheet, reviewShapeOk, sheetText, stillQuoted, type ReviewAnswer, type ReviewSheet, type ReviewedFinding } from "../../engine/runtime/form-review.ts";
import { actorOf, Audit, CaseRead, Db, fail, PROTOTYPE, VAR_ROOT, type Actor } from "./core.ts";
import { MODEL, pairOf, roundBudgetUsd, RUNS, StepRunner, type AiStep, type RoundContext, type RoundOut } from "./rounds.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { aiLive, Sources } from "./sources.ts";

type H = string | undefined;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
};

/** The AI step: a first round and a blind checker round over the review sheet (p2/prompts/form-review*.v1). */
export const FORM_REVIEW: AiStep = {
  kind: "form_review", jobBase: "studio-form-review", configurationVersion: "c75-form-review",
  template: "form-review.v1.md", check: "form-review-check.v1.md", schema: "form-review-output.v1.schema.json", effort: "medium", max_output_tokens: 8000,
  shapeOk: reviewShapeOk,
  words: {
    noSaved: "No saved review of this form edition with these values yet: it is recorded once, in a Live run the tech lead approves (P-295).",
    badSaved: "The saved review could not be read, so it is not used.",
    nothingUsed: "Nothing of it is added to the findings.",
  },
};
/** The usual output of one round (US$ estimate only; the worst case is the launcher's own budget). Measured on the like job
 *  (the IMM 5257 two-round read of 3 Nov, about 2,500 output tokens a round); revisited after the paid run. */
const USUAL_OUTPUT_TOKENS = 2_500;
/** Tokens a byte of the request is taken for in the usual estimate (JSON and English, about 3.6 bytes a token). */
const BYTES_PER_TOKEN = 3.6;
export const STAND_IN = "SI-6";
export const STAND_IN_WORDS = "Stand-in SI-6: the AI review runs live on the Visitor visa forms only (one trial, P-164 (2)); other form families follow one at a time with their own tests. Severities are Sample until the immigration expert confirms them.";
export const LIVE_WAITING = "Live is off on this copy: a live review is not allowed without the founder's Go, approved by the tech lead with its cost stated first (P-295). Use Saved (US$0).";
export const MADE_UP_WORDS = "Made-up test runs: this isolated test copy reads saved reviews from its own folder of runs a test wrote. Never a real answer; never counted.";
const SHEETS = join(PROTOTYPE, "p2", "review-sheets");

/** STUDIO_MADE_UP_REVIEW_RUNS=1 counts only on an isolated copy (STUDIO_VAR set): never on the demo or the Mac's main copy. */
export const madeUpRuns = () => process.env.STUDIO_MADE_UP_REVIEW_RUNS === "1" && !!process.env.STUDIO_VAR;
export const reviewRunsDir = () => madeUpRuns() ? join(VAR_ROOT, "made-up-review-runs") : RUNS;

export const ReviewRunPlanBody = z.object({
  forms: z.array(z.string({ error: "Choose a form to review." }).trim().min(1, "Choose a form to review.").max(40, "That is too long to be a form number."), { error: "Choose the forms to review." })
    .min(1, "Choose a form to review.").max(3, "Review at most 3 forms in one run."),
  subject: z.string({ error: "Choose the person whose forms are reviewed." }).uuid("Choose the person whose forms are reviewed."),
});
export const ReviewRunBody = ReviewRunPlanBody.extend({
  mode: z.enum(["replay", "live"], { error: "Choose Saved or Live." }),
  planSha256: z.string().regex(/^[0-9a-f]{64}$/, "Look at the run card again.").optional(),
});
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
};

/** One form of the run card. */
export type PlannedForm = { form: string; edition: string; boxes: number; sheet: string; sheet_sha256: string;
  saved: { available: boolean; why: string | null; files: string[]; made_up: boolean }; live_usd: number; live_worst_usd: number };
/** POST …/review-runs/plan → the run card. */
export type ReviewRunPlan = {
  case_id: string; subject: string; person: string; forms: PlannedForm[];
  estimate: { live_usd: number; live_worst_usd: number; replay_usd: 0; remaining_usd: number; job_cap_usd: number };
  stand_in: typeof STAND_IN; stand_in_words: string; live_allowed: boolean; live_why: string | null;
  replay_available: boolean; replay_why: string | null; made_up: boolean; made_up_words: string | null;
  steps: { n: number; label: string; uses_ai: boolean }[]; plan_sha256: string;
};
/** One form's outcome in a run. */
export type RunForm = { form: string; edition: string; from: "live" | "replay" | null; run_files: string[]; cost_usd: number; added: number; kept: number; resolved: number; dropped: { field: string; why: string }[]; note: string | null };
/** POST …/review-runs → what the run did. */
export type ReviewRunResult = { run_id: string; mode: "replay" | "live"; made_up: boolean; cost_usd: number; cancelled: boolean; forms: RunForm[]; added: number; note: string };

const STEPS = [
  { n: 1, label: "Read what each box of the form would print (rules, US$0)", uses_ai: false },
  { n: 2, label: "AI reads the filled form and lists what disagrees, each with its quote", uses_ai: true },
  { n: 3, label: "A second AI round reads it without seeing the first answer", uses_ai: true },
  { n: 4, label: "Rules keep findings that quote the form; High when both rounds agree, Low with both reasons", uses_ai: false },
];
/** The job cap of one review run (P-232): the live run is refused when its worst case is above it. */
export const JOB_CAP_USD = 5;

type Prepared = { form: string; edition: string; sheet: ReviewSheet; ctx: RoundContext };

@Injectable()
export class ReviewRuns {
  private readonly runner: StepRunner;
  /** The runs going now (live rounds): Stop reads this before each live call (P-110). */
  private readonly going = new Map<string, { caseId: string; stopped: boolean }>();
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {
    this.runner = new StepRunner(sources, reviewRunsDir());
  }

  /** The person (never the case itself) and each named form's sheet, as the case's copy of it would read today. */
  private async prepare(c: Reached, subject: string, forms: string[]): Promise<{ person: string; prepared: Prepared[] }> {
    const people = this.r.peopleOf(c);
    const who = people.find((p) => p.subjectId === subject && p.role !== "case");
    if (!who) fail("Choose a person on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    const s = this.r.snapshotOf(c);
    const { answers, rows } = await this.r.state(c);
    const prepared: Prepared[] = [];
    for (const form of [...new Set(forms)]) {
      const cov = formCoverage(s, people, answers, rows, form, subject);
      if (!cov || cov.applies === false) fail(`${form} is not one of ${who!.label}'s forms on this case.`, HttpStatus.UNPROCESSABLE_ENTITY);
      const printed = `${form} (${cov!.edition ?? ""})`;
      if (!PRINTED_EDITION.test(printed)) fail(`${form} has no printed edition in this case's release, so it cannot be reviewed.`, HttpStatus.UNPROCESSABLE_ENTITY);
      const sheet = reviewSheet(printed, cov!.boxes);
      if (!sheet.fields.length) fail(`Nothing is filled on ${form} for ${who!.label} yet: answer and confirm its questions first.`, HttpStatus.UNPROCESSABLE_ENTITY);
      const input = writeSheet(sheet);
      prepared.push({ form, edition: printed, sheet, ctx: { trail: printed, contextKey: editionContextKey(form, cov!.edition!), inputs: [input], mode: "replay", wanted: async () => true } });
    }
    return { person: who!.label, prepared };
  }

  /** The two saved rounds of ONE live run of this sheet: the newest usable checker round, then the first round of the same
   *  run (rounds.ts pairOf). Read-only: a replay reads files and sends nothing. */
  private async savedRounds(ctx: RoundContext): Promise<{ d: RoundOut<ReviewAnswer>; k: RoundOut<ReviewAnswer> | null }> {
    const k = await this.runner.round<ReviewAnswer>(FORM_REVIEW, true, { ...ctx, mode: "replay" });
    if (!k.ok) return { d: k, k: null };
    const d = await this.runner.round<ReviewAnswer>(FORM_REVIEW, false, { ...ctx, mode: "replay", replayPair: pairOf(FORM_REVIEW, true, k.runFile), replayPrompt: k.earlier ?? "" });
    return { d: d.ok ? d : { ok: false, costUsd: 0, reason: "The newest saved checker round has no first round from the same run, so it is not used." }, k };
  }

  private runFile(file: string) { return madeUpRuns() ? `made-up-review-runs/${file.replace(/^.*\//, "")}` : file; }

  async plan(actor: Actor, caseId: string, body: unknown): Promise<ReviewRunPlan> {
    const b = parse(ReviewRunPlanBody, body);
    const c = await this.r.reach(actor, caseId, "officer");
    const { person, prepared } = await this.prepare(c, b.subject, b.forms);
    const forms: PlannedForm[] = [];
    for (const p of prepared) {
      const { d, k } = await this.savedRounds(p.ctx);
      const ok = d.ok && !!k?.ok;
      const chars = sheetText(p.sheet).length, bytes = Buffer.byteLength(sheetText(p.sheet)) + 8_000;
      const usual = [FORM_REVIEW.template, FORM_REVIEW.check].reduce((n, t) => n + costUsd(MODEL, Math.ceil((bytes + promptBytes(t)) / BYTES_PER_TOKEN), USUAL_OUTPUT_TOKENS), 0);
      const worst = roundBudgetUsd(FORM_REVIEW, false, p.ctx.inputs, chars) + roundBudgetUsd(FORM_REVIEW, true, p.ctx.inputs, chars);
      forms.push({ form: p.form, edition: p.edition, boxes: p.sheet.fields.length, sheet: p.ctx.inputs[0].file, sheet_sha256: p.ctx.inputs[0].sha256,
        saved: { available: ok, why: ok ? null : (!d.ok ? d.reason : null) ?? FORM_REVIEW.words.noSaved, files: ok ? [d.ok ? this.runFile(d.runFile) : "", k?.ok ? this.runFile(k.runFile) : ""] : [], made_up: madeUpRuns() && ok },
        live_usd: round2(Math.max(0.01, usual)), live_worst_usd: round2(worst) });
    }
    const live_usd = round2(forms.reduce((n, f) => n + f.live_usd, 0)), live_worst_usd = round2(forms.reduce((n, f) => n + f.live_worst_usd, 0));
    const missing = forms.filter((f) => !f.saved.available);
    const replay_available = !missing.length;
    const plan: Omit<ReviewRunPlan, "plan_sha256"> = { case_id: c.id, subject: b.subject, person, forms,
      estimate: { live_usd, live_worst_usd, replay_usd: 0, remaining_usd: round2(this.sources.ledger().remaining_usd), job_cap_usd: JOB_CAP_USD },
      stand_in: STAND_IN, stand_in_words: STAND_IN_WORDS, live_allowed: aiLive(), live_why: aiLive() ? null : LIVE_WAITING,
      replay_available, replay_why: replay_available ? null : missing.map((f) => `${f.form}: ${f.saved.why}`).join(" "),
      made_up: madeUpRuns(), made_up_words: madeUpRuns() ? MADE_UP_WORDS : null, steps: STEPS };
    // The plan's checksum covers what a run would read and replay and what it could cost (break B4 of C4.7: a run never
    // replays another saved run than the person saw, and a Live run starts only on the cost the person read).
    return { ...plan, plan_sha256: sha(JSON.stringify({ c: c.id, s: b.subject, f: forms.map((f) => [f.form, f.edition, f.sheet_sha256, f.saved.files, f.live_worst_usd]) })) };
  }

  async run(actor: Actor, caseId: string, body: unknown): Promise<ReviewRunResult> {
    const b = parse(ReviewRunBody, body);
    const plan = await this.plan(actor, caseId, { forms: b.forms, subject: b.subject });
    const c = await this.r.reach(actor, caseId, "officer");
    if (b.planSha256 && b.planSha256 !== plan.plan_sha256) problem(409, "Look at the run card again", "The form's values, its saved review or the cost changed since you looked: nothing ran (US$0). Look at the run card again.", { plan });
    if (b.mode === "live") {
      if (!aiLive()) problem(409, "Live is off", LIVE_WAITING);
      if (b.planSha256 !== plan.plan_sha256) problem(409, "Look at the run card again", "A live review starts only from the run card you read (its cost first): nothing ran (US$0).", { plan });
      if (plan.estimate.live_worst_usd > JOB_CAP_USD + 1e-9) problem(409, "Over the job cap", `Not started: the worst case (US$${plan.estimate.live_worst_usd.toFixed(2)}) is above the job cap of US$${JOB_CAP_USD.toFixed(2)} (P-232). Review fewer forms at once.`);
      if (plan.estimate.live_worst_usd > plan.estimate.remaining_usd + 1e-9) problem(409, "Over the spending cap", `Not started: the worst case (US$${plan.estimate.live_worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.estimate.remaining_usd.toFixed(2)}).`);
    } else if (!plan.replay_available) problem(409, "No saved review", `Nothing ran and nothing changed (US$0). ${plan.replay_why ?? FORM_REVIEW.words.noSaved}`, { plan });
    const { prepared } = await this.prepare(c, b.subject, b.forms);
    const runId = randomUUID();
    this.going.set(runId, { caseId: c.id, stopped: false });
    const wanted = async () => !this.going.get(runId)?.stopped;
    const out: RunForm[] = [];
    let cancelled = false;
    try {
      for (const p of prepared) {
        const f: RunForm = { form: p.form, edition: p.edition, from: null, run_files: [], cost_usd: 0, added: 0, kept: 0, resolved: 0, dropped: [], note: null };
        out.push(f);
        if (cancelled) { f.note = "Not run: the run was stopped."; continue; }
        const safe = async (isCheck: boolean): Promise<RoundOut<ReviewAnswer>> => {
          try { return await this.runner.round<ReviewAnswer>(FORM_REVIEW, isCheck, { ...p.ctx, mode: "live", wanted, batchId: runId }); }
          catch (e) { console.warn(`form review ${runId.slice(0, 8)}:`, String(e).slice(0, 400)); return { ok: false, costUsd: 0, reason: "The AI step stopped on this computer, so nothing of it is used." }; }
        };
        let d: RoundOut<ReviewAnswer>, k: RoundOut<ReviewAnswer> | null;
        if (b.mode === "replay") ({ d, k } = await this.savedRounds(p.ctx));
        else { d = await safe(false); k = d.ok ? await safe(true) : null; }
        f.cost_usd = round2(d.costUsd + (k?.costUsd ?? 0));
        f.run_files = [d.ok ? d.runFile : null, k?.ok ? k.runFile : null].filter((x): x is string => !!x).map((x) => this.runFile(x));
        if (!d.ok || !k?.ok) {
          cancelled = cancelled || (!d.ok && !!d.cancelled) || (!!k && !k.ok && !!k.cancelled);
          f.note = (!d.ok ? d.reason : k && !k.ok ? `The first AI round ran, but the checker round did not: ${k.reason.charAt(0).toLowerCase()}${k.reason.slice(1)}` : null) ?? "The AI review did not finish.";
          if (f.cost_usd > 0) f.note = `${f.note.replace(/\.?$/, ".")} This run cost US$${f.cost_usd.toFixed(2)} (counted); nothing of it is used.`;
          continue;
        }
        f.from = d.from === "live" || k.from === "live" ? "live" : "replay";
        const reviewed = findingsFromRounds(p.sheet, d.output, k.output);
        f.dropped = reviewed.dropped;
        Object.assign(f, await this.store(actor, c, b.subject, p, reviewed.findings, f.from === "replay", runId));
      }
    } finally { this.going.delete(runId); }
    const cost = round2(out.reduce((n, f) => n + f.cost_usd, 0)), added = out.reduce((n, f) => n + f.added, 0);
    const how = b.mode === "replay" ? (madeUpRuns() ? "Saved (made-up test run)" : "Saved") : "Live";
    const note = out.some((f) => f.note) && !out.some((f) => f.from) ? out.map((f) => `${f.form}: ${f.note}`).join(" ")
      : `${how}: ${added ? `${added} new finding${added === 1 ? "" : "s"}` : "no new finding"}${out.reduce((n, f) => n + f.kept, 0) ? `, ${out.reduce((n, f) => n + f.kept, 0)} already on the case` : ""}${out.reduce((n, f) => n + f.resolved, 0) ? `, ${out.reduce((n, f) => n + f.resolved, 0)} resolved (the form no longer says what they quoted)` : ""}. US$${cost.toFixed(2)}. Each finding warns; none blocks Ready to file.`;
    // Audit (STANDARDS §5): the case, the forms, the mode, the cost and the counts; never a value, a quote or a reason.
    await this.audit.log(c.workspaceId, actor.id, "reviewed", "case", c.id, `${actor.name} ran the independent review of ${out.map((f) => f.form).join(", ")} on case ${c.id.slice(0, 8)} (${how}, US$${cost.toFixed(2)}): ${added} new finding${added === 1 ? "" : "s"}`,
      { run: runId, mode: b.mode, made_up: madeUpRuns(), forms: out.map((f) => ({ form: f.form, edition: f.edition, from: f.from, run_files: f.run_files, added: f.added, kept: f.kept, resolved: f.resolved, dropped: f.dropped.length })), cost_usd: cost });
    return { run_id: runId, mode: b.mode, made_up: madeUpRuns(), cost_usd: cost, cancelled, forms: out, added, note };
  }

  /** The findings of one form into the case's review findings, under one lock per case so two runs at once never add the
   *  same finding twice: a finding already on the case (open, acknowledged, waived or dismissed: same person, form, fact
   *  and quote) is kept as it is, never raised again; an AI finding of this person and form whose quoted words are no
   *  longer in its fact's value is resolved by the rules. */
  private async store(actor: Actor, c: Reached, subject: string, p: Prepared, findings: ReviewedFinding[], replayed: boolean, runId: string) {
    const people = this.r.peopleOf(c), principal = people.find((x) => x.role === "principal")?.subjectId;
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, active: true }, include: { applicants: true } });
    const filingId = filings.find((f) => f.applicants.some((a) => a.subjectId === subject))?.id ?? filings.find((f) => f.applicants.some((a) => a.subjectId === principal))?.id ?? null;
    let added = 0, kept = 0, resolved = 0;
    await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, `review_run:${c.id}`);
      const mine = await tx.reviewFinding.findMany({ where: { caseId: c.id, source: "ai", subjectId: subject, form: p.form } });
      const gone = mine.filter((x) => ["open", "acknowledged", "waived"].includes(x.state) && !stillQuoted(p.sheet, x.field, x.quote));
      if (gone.length) resolved = (await tx.reviewFinding.updateMany({ where: { id: { in: gone.map((x) => x.id) }, state: { in: ["open", "acknowledged", "waived"] } }, data: { state: "resolved", resolvedBy: "rules", resolvedAt: new Date() } })).count;
      const live = new Set(mine.filter((x) => x.state !== "resolved" && !gone.some((g) => g.id === x.id)).map((x) => x.fingerprint));
      for (const f of findings) {
        const fingerprint = aiFingerprint(subject, p.form, f.field, f.quote);
        if (live.has(fingerprint)) { kept++; continue; }
        live.add(fingerprint);
        await tx.reviewFinding.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId, subjectId: subject, form: p.form, field: f.field, severity: f.severity, source: "ai", fingerprint, quote: f.quote, agreement: f.agreement, reasons: f.reasons, replayed, runId, createdBy: actor.id } });
        added++;
      }
    });
    return { added, kept, resolved };
  }

  /** Stop (P-110): the run's next live call is not sent, and the call running now is ended (rounds.ts liveJob). */
  async stop(actor: Actor, runId: string) {
    const g = /^[0-9a-f-]{36}$/i.test(runId) ? this.going.get(runId) : undefined;
    if (!g) fail("That review is not running (it ended, or it was never started here).", HttpStatus.NOT_FOUND);
    await this.r.reach(actor, g!.caseId, "officer");
    g!.stopped = true;
    const job = this.runner.liveJob(runId);
    if (job) this.sources.stopLaunches((id) => id === job);
    await this.audit.log((await this.r.reach(actor, g!.caseId, "officer")).workspaceId, actor.id, "stopped", "case", g!.caseId, `${actor.name} stopped the independent review on case ${g!.caseId.slice(0, 8)}`, { run: runId });
    return { run_id: runId, stopped: true };
  }
}

/** The sheet's file, written once per content (a temporary file renamed; rewritten when the file there is not this
 *  content): p2/review-sheets/<form edition>-<checksum>.sheet.json, never committed. */
function writeSheet(sheet: ReviewSheet): { file: string; sha256: string } {
  const text = sheetText(sheet), h = sha(text);
  const name = `${sheet.form_edition.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${h.slice(0, 12)}.sheet.json`, file = join(SHEETS, name);
  const current = (() => { try { return sha(readFileSync(file)) === h; } catch { return false; } })();
  if (!current) { mkdirSync(SHEETS, { recursive: true }); const tmp = join(SHEETS, `.${name}.${process.pid}.tmp`); writeFileSync(tmp, text); renameSync(tmp, file); }
  return { file: `prototype/p2/review-sheets/${name}`, sha256: h };
}
const promptBytes = (t: string) => { try { return readFileSync(join(PROTOTYPE, "p2", "prompts", t)).length; } catch { return 0; } };

@CaseRead()
@Controller("api/runtime")
export class ReviewRunsController {
  constructor(@Inject(ReviewRuns) private readonly x: ReviewRuns) {}
  @Post("cases/:id/review-runs/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.plan(actorOf(a), id, b); }
  @Post("cases/:id/review-runs") @HttpCode(201) run(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.run(actorOf(a), id, b); }
  @Post("review-runs/:run/stop") @HttpCode(200) stop(@Headers("x-actor") a: H, @Param("run") run: string) { return this.x.stop(actorOf(a), run); }
}
