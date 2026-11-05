// Screen 02 slice 2, board view 7 (P-32, P-38, C9.1, BR-12): a new edition of a form already in the library is compared
// with the library's edition form field by form field, with no AI. Unchanged form fields carry their map; new and
// reworded ones are left for a person (K1: mapped, not a fact, or filled by hand). The review lists the shared fields
// and every combination the change touches; nothing changes until a person accepts, and nothing reaches firms until
// release. Open cases stay on the release they started on.
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { manifest } from "../../engine/import.ts";
import { newestEdition } from "../../engine/programs.ts";
import { effective } from "../../engine/snapshot.ts";
import { ACTORS, Audit, Db, fail, need, PY, ROOT, STUDIO, Workspace, type Actor } from "./core.ts";
import { APPROVED_DIR, recordApproval, Sources } from "./sources.ts";
import { costWords } from "../../contracts/start-setup.ts";
import { editionFieldItems, insertEditionFieldItems } from "./field-drafts-routes.ts";
import { QUEUE_TX } from "./proposals.ts";
import { fieldComponentsOf, formCombinations, openCases } from "./where-used.ts";
import { aiLive } from "./sources.ts";
import { liveRunsOf } from "./impact-ai.ts";
import { changedBoxes, compareBoxes, componentsView, impactContext, impactCost, impactPart, impactStep, inventoryFields, IMPACT_AI_WORDS, previousAcceptedUntil, staleRun, writePart, type BoxRow } from "./impact-ai.ts";
import { pairOf, RUNS, runTime, StepRunner, type AiStep, type RoundOut } from "./rounds.ts";
import { replayPattern } from "../../engine/rounds.ts";
import type { FieldMapOutput } from "./field-drafts.ts";

const run = promisify(execFile);
/** C9.1: the AI step's drafting-job kind (one per held edition and comparison). */
export const IMPACT_STEP = "field_map_impact";
/** Round 2 Major A: every paid run of one committed job shares its stem, so the stem alone can pair a draft with an
 *  earlier run's checker. The paid runner records a run's draft, then its checker: the checker of this draft is the one
 *  recorded after it and before the next draft round of the same stem (as form-masters.ts savedRounds). */
function checkerWindow(step: Pick<AiStep, "jobBase">, draftFile: string) {
  const stem = pairOf(step, false, draftFile), after = runTime(draftFile);
  const next = (existsSync(RUNS) ? readdirSync(RUNS) : []).filter((f) => replayPattern(step.jobBase, false).test(f) && pairOf(step, false, f) === stem && runTime(f) > after).map(runTime).sort()[0];
  return { after, before: next ?? "99999999t999999999z" };
}
/** Replay only: a saved run is read, nothing is launched. */
const NO_LAUNCH = { launchOnce: async (): Promise<never> => { throw new Error("A saved AI run is replayed here: no live call is sent."); } };
/** The edition as printed on the form ("IMM 5476 (11-2025)"): the intake keeps it whole; a bare "11-2025" gets its code. */
export const printedOf = (code: string, label: string | null) => (/^[A-Z]+ [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/.test(label ?? "") ? label! : `${code} (${label ?? ""})`);
const costWordsOf = (o: { about_usd: number; at_most_usd: number }) => costWords(o.about_usd, o.at_most_usd);
type Row = BoxRow;

@Injectable()
export class Impact {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {}

  /** The comparison and its impact for one held new edition (no AI, US$0). */
  async review(id: string) {
    const { h, item, def, old } = await this.held(id);
    const inventory = await this.readInventory(item.file, h);
    const fresh = inventoryFields(inventory);
    // The library edition's form fields: its stored inventory, or read from its official file (an edition added through
    // the intake has none stored yet).
    const oldInventory = old?.inventoryFile ?? (old?.officialFile ? await this.readInventory(old.officialFile).catch(() => null) : null);
    const oldFields = oldInventory ? inventoryFields(oldInventory) : [];
    const oldMaps = old ? new Map(effective(await this.db.formFieldMap.findMany({ where: { formEditionId: old.id } }), (m) => m.dataPath, "draft").map((m) => [m.dataPath, m])) : new Map();
    const rows: Row[] = compareBoxes(fresh, oldFields, oldMaps);
    const count = (c: Row["change"]) => rows.filter((r) => r.change === c).length;
    // Impact on the library: the shared fields read by form fields that were removed or reworded.
    const touchedKeys = [...new Set(rows.filter((r) => (r.change === "removed" || r.change === "reworded") && r.field).map((r) => r.field!))];
    const fields = touchedKeys.length ? await this.db.canonicalField.findMany({ where: { workspaceId: h.workspaceId, canonicalFieldKey: { in: touchedKeys } }, orderBy: { version: "desc" }, distinct: ["canonicalFieldKey"], select: { canonicalFieldKey: true, label: true, meaning: true } }) : [];
    // SH2 (P-258): the combinations that file the form now and their open cases, from the one where-used service.
    const combos = (await formCombinations(this.db, h.workspaceId, def.formKey)).sort((x, y) => x.label.localeCompare(y.label));
    // SH2b (qa minor 2 on #504): a database error fails the review loudly, never "0 open cases".
    const cases = await openCases(this.db, combos.map((c) => c.id));
    // P-32: what the removed and reworded boxes touch beyond fields, on the combinations that file the form (SH2).
    const label = new Map(fields.map((f) => [f.canonicalFieldKey, f.label ?? f.canonicalFieldKey]));
    const comboLabel = new Map(combos.map((c) => [c.id, c.label]));
    const uses = await fieldComponentsOf(this.db, h.workspaceId, touchedKeys, combos.map((c) => c.id));
    const components = componentsView(uses, rows, label, comboLabel, h.editionLabel ?? "the new edition");
    const accepted = previousAcceptedUntil(def.formKey);
    const ai = await this.aiOffer(h, def.formKey, inventory, rows);
    return {
      id: h.id, form: def.formKey, title: def.displayName, edition: h.editionLabel, library_edition: old?.editionLabel ?? null, uploaded_by: ACTORS.find((a) => a.id === h.createdBy)?.name ?? "A person", at: h.createdAt,
      counts: { form_fields: fresh.length, unchanged: count("unchanged"), reworded: count("reworded"), new: count("new"), removed: count("removed") },
      rows: rows.filter((r) => r.change !== "unchanged").concat(rows.filter((r) => r.change === "unchanged")),
      library: fields.map((f) => ({ key: f.canonicalFieldKey, label: f.label ?? f.canonicalFieldKey, meaning: f.meaning, form_fields: rows.filter((r) => r.field === f.canonicalFieldKey && r.change !== "unchanged").length })),
      components,
      combinations: combos.map((c) => ({ id: c.id, label: c.label })), open_cases: cases,
      previous_accepted_until: accepted?.until ?? null, previous_accepted_words: accepted?.words ?? null, previous_accepted_source: accepted ? { quote: accepted.quote, url: accepted.url, saved: accepted.saved } : null,
      ai: { used: false, cost_usd: 0, note: "Compared form field by form field without AI. New and reworded form fields are left for a person: map each, or mark it not a fact or filled by hand.", ...ai },
    };
  }

  /** P-138: the AI offer for the new and reworded boxes (never run on opening): its cost in words, whether a saved run of
   *  exactly this comparison is here (Saved, US$0), whether live AI is open, and the proposals of an earlier draft. */
  private async aiOffer(h: { id: string; workspaceId: string; editionLabel: string | null }, code: string, inventory: string, rows: Row[]) {
    const changed = changedBoxes(rows);
    if (!changed.length) return { offer: { boxes: 0, words: IMPACT_AI_WORDS.none, about_usd: 0, at_most_usd: 0 }, saved: false, live: { open: false, why: IMPACT_AI_WORDS.none } };
    const printed = printedOf(code, h.editionLabel);
    const part = impactPart(inventory, changed);
    writePart(part);
    const step = impactStep(printed, changed), cost = impactCost(step, part), ctx = impactContext(printed, part);
    const replay = new StepRunner(NO_LAUNCH);
    const draft = await replay.round<FieldMapOutput>(step, false, { ...ctx, mode: "replay", wanted: async () => false });
    const stale = draft.ok ? null : staleRun(ctx.contextKey, part.sha256);
    const job = await this.db.draftingJob.findFirst({ where: { workspaceId: h.workspaceId, kind: IMPACT_STEP, status: "COMPLETED", detail: { path: ["held"], equals: h.id } }, orderBy: { startedAt: "desc" } });
    const paid = await this.paidBefore(h.workspaceId, part.sha256);
    const liveWhy = !aiLive() ? IMPACT_AI_WORDS.liveOff(cost.words) : draft.ok ? IMPACT_AI_WORDS.savedFirst : paid !== null ? IMPACT_AI_WORDS.paidOnce(paid) : null;
    const proposals = job ? await this.db.proposalItem.findMany({ where: { runId: job.id }, select: { id: true, status: true, work: true } }) : [];
    const boxesOf = (w: unknown) => ((w as { boxes?: { data_path?: string }[] } | null)?.boxes ?? []).map((b) => b.data_path);
    return {
      offer: { boxes: changed.length, words: IMPACT_AI_WORDS.offer(changed.length, cost.words), about_usd: cost.about_usd, at_most_usd: cost.at_most_usd, key: `${part.editionSha256.slice(0, 12)}·${part.boxesSha.slice(0, 12)}` },
      saved: draft.ok, saved_words: draft.ok ? `A saved AI run of this comparison is here: use it at US$0.` : stale ? IMPACT_AI_WORDS.stale : IMPACT_AI_WORDS.noSaved.replace("about US$x · at most US$y", cost.words),
      live: { open: liveWhy === null, why: liveWhy },
      drafted: job ? { job_id: job.id, at: job.startedAt.toISOString(), message: job.message, proposals: proposals.length, waiting: proposals.filter((p) => p.status === "waiting").length,
        boxes: Object.fromEntries(changed.map((dp) => [dp, proposals.filter((p) => boxesOf(p.work).includes(dp)).map((p) => p.id)])) } : null,
    };
  }

  /** Break B1, M1: what an earlier paid attempt at this comparison cost (null: none). A live job with a cost, or with no
   *  recorded cost (stopped by a restart: it may have been sent), or any live run record in p2/runs for this part (kept
   *  across demo resets). A live job refused before any call records US$0 and does not count. */
  private async paidBefore(workspaceId: string, partSha: string): Promise<number | null> {
    const job = await this.db.draftingJob.findFirst({ where: { workspaceId, kind: IMPACT_STEP, mode: "LIVE", status: { not: "RUNNING" }, OR: [{ costUsd: { gt: 0 } }, { costUsd: null }], detail: { path: ["part"], equals: partSha } }, select: { costUsd: true } });
    if (job) return job.costUsd ?? 0;
    const runs = liveRunsOf(partSha);
    return runs.length ? runs.reduce((t, r) => t + r.costUsd, 0) : null;
  }

  /** C9.1 the AI step (P-138: a click): drafts proposals for only the new and reworded boxes of the held edition.
   *  replay: the saved run of exactly this comparison, US$0; another comparison's run is out of date (409).
   *  live: refused in plain words without the live switch (P-175, US$0); with it, the plan's worst case is checked against
   *  what is left of the cap before anything runs, then a draft round and a blind checker round on the shared runner.
   *  Proposals go to To review for a person (P-121); nothing changes the library or a release here. */
  async draftAi(actor: Actor, id: string, body: { mode?: unknown; expected_worst_usd?: unknown }) {
    need(actor, "author");
    const mode = String(body?.mode ?? "");
    if (mode !== "replay" && mode !== "live") fail('Choose how to draft: "replay" (a saved AI run, US$0) or "live" (a paid AI call).');
    const r = await this.review(id);
    const offer = r.ai.offer;
    if (!offer.boxes) fail(IMPACT_AI_WORDS.none, HttpStatus.CONFLICT);
    if (mode === "live" && !aiLive()) fail(IMPACT_AI_WORDS.liveOff(costWordsOf(offer)), HttpStatus.CONFLICT);
    // Break M2: a saved run of this comparison is used at US$0, never paid for again.
    if (mode === "live" && r.ai.saved) fail(IMPACT_AI_WORDS.savedFirst, HttpStatus.CONFLICT);
    if (mode === "live") {
      // The worst case is said first: the click carries the worst case the person saw; a changed plan is looked at again.
      if (typeof body.expected_worst_usd !== "number" || Math.abs(body.expected_worst_usd - offer.at_most_usd) > 0.005) fail(`Look at the cost again: Draft with AI now costs ${costWordsOf(offer)}. Nothing was started.`, HttpStatus.CONFLICT);
      const left = this.sources.ledger().remaining_usd;
      if (offer.at_most_usd > left + 1e-9) fail(IMPACT_AI_WORDS.overCap(offer.at_most_usd, left), HttpStatus.CONFLICT);
    }
    if (mode === "replay" && !r.ai.saved) fail(r.ai.saved_words ?? IMPACT_AI_WORDS.noSaved, HttpStatus.CONFLICT);
    const { h, def } = await this.held(id);
    const inventory = await this.readInventory((await this.held(id)).item.file, h);
    const changed = changedBoxes(r.rows);
    const printed = printedOf(def.formKey, h.editionLabel);
    const part = impactPart(inventory, changed);
    writePart(part);
    const step = impactStep(printed, changed);
    // One AI step per held edition at a time, and one drafted result per comparison (a second click returns the first).
    const job = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`impact-ai:${h.id}`}))`;
      const done = await tx.draftingJob.findFirst({ where: { workspaceId: h.workspaceId, kind: IMPACT_STEP, status: { in: ["COMPLETED", "RUNNING"] }, detail: { path: ["held"], equals: h.id } }, orderBy: { startedAt: "desc" } });
      if (done && (done.detail as { part?: string } | null)?.part === part.sha256) return { done };
      // P-121: one paid attempt per comparison. A live run that cost money and gave nothing usable is not run again from
      // here (the launcher already retried a transient error inside it); a person maps the boxes, or the tech lead
      // decides on another paid run. A run that was refused before any cost (US$0) may be started again.
      if (mode === "live") {
        const paid = await tx.draftingJob.findFirst({ where: { workspaceId: h.workspaceId, kind: IMPACT_STEP, mode: "LIVE", status: { not: "RUNNING" }, OR: [{ costUsd: { gt: 0 } }, { costUsd: null }], detail: { path: ["part"], equals: part.sha256 } }, select: { costUsd: true } });
        if (paid) fail(IMPACT_AI_WORDS.paidOnce(paid.costUsd ?? 0), HttpStatus.CONFLICT);
        const runs = liveRunsOf(part.sha256);
        if (runs.length) fail(IMPACT_AI_WORDS.paidOnce(runs.reduce((t, x) => t + x.costUsd, 0)), HttpStatus.CONFLICT);
      }
      return { job: await tx.draftingJob.create({ data: { workspaceId: h.workspaceId, combinationId: null, kind: IMPACT_STEP, mode: mode === "live" ? "LIVE" : "REPLAY", status: "RUNNING", startedBy: actor.id, message: `Drafting the ${changed.length} new and reworded form fields of ${printed}`,
        detail: { operation: "impact_ai", held: h.id, edition: printed, part: part.sha256, boxes: changed } } }) };
    });
    if ("done" in job && job.done) {
      if (job.done.status === "RUNNING") fail("Draft with AI is already running for this edition. Wait for it to end.", HttpStatus.CONFLICT);
      return { job_id: job.done.id, again: true, proposals: await this.db.proposalItem.count({ where: { runId: job.done.id } }), message: `${printed}'s new and reworded form fields were already drafted: the proposals wait on To review.` };
    }
    const aiJob = job.job!;
    try {
      const runner = new StepRunner(mode === "live" ? this.sources : NO_LAUNCH);
      const ctx = { ...impactContext(printed, part, aiJob.id), mode: mode as "live" | "replay", wanted: async () => true };
      // Review Major 1: a replayed checker round comes from the same saved run as the draft round (its job stem), never
      // another run of the same comparison, so two rounds that agree were one run's two readings.
      const safe = async (isCheck: boolean, pair?: string, window?: { after: string; before: string }): Promise<RoundOut<FieldMapOutput>> => { try { return await runner.round<FieldMapOutput>(step, isCheck, { ...ctx, ...(pair !== undefined ? { replayPair: pair } : {}), ...(window ? { replayWindow: window } : {}) }); } catch (e) {
        // Review minor: a live round that throws may have been sent; it is counted at its share of the worst case (as
        // the ledger reserves it), so the one-paid-run rule still holds. A replay that throws cost nothing.
        console.warn(`impact ai ${aiJob.id}:`, String(e).slice(0, 400));
        return { ok: false, costUsd: mode === "live" ? Math.round((offer.at_most_usd / 2) * 100) / 100 : 0, reason: "The AI step stopped on this computer, so nothing of it is used." }; } };
      const draft = await safe(false);
      // P-121: one attempt per round (the launcher retries only a transient error); no third round. The checker round runs
      // blind on the same part; it is skipped only when the draft round was blocked or stopped.
      // The blind checker round runs only on a usable draft: a failed draft round ends the run, so nothing more is spent.
      const check: RoundOut<FieldMapOutput> = draft.ok ? await safe(true, draft.from === "replay" ? pairOf(step, false, draft.runFile) : undefined, draft.from === "replay" ? checkerWindow(step, draft.runFile) : undefined) : { ok: false, costUsd: 0, reason: "Not started: the draft round gave no usable answer." };
      const spent = draft.costUsd + check.costUsd;
      if (!draft.ok) {
        await this.db.draftingJob.update({ where: { id: aiJob.id }, data: { status: "FAILED", costUsd: spent, finishedAt: new Date(), message: draft.reason.slice(0, 1000) } });
        await this.audit.log(h.workspaceId, actor.id, "failed", "edition impact AI", def.formKey, `${actor.name} drafted ${printed}'s ${changed.length} new and reworded form fields with AI (${mode}, US$${spent.toFixed(2)}): nothing used. ${draft.reason}`.slice(0, 900));
        fail(draft.reason, HttpStatus.CONFLICT);
      }
      const d = draft as Extract<RoundOut<FieldMapOutput>, { ok: true }>;
      const asReading = (x: RoundOut<FieldMapOutput>) => (x.ok ? { output: x.output, from: x.from, runFile: x.runFile, costUsd: x.costUsd } : null);
      const formText = inventoryFields(inventory).filter((f) => changed.includes(f.data_path!)).map((f) => `${f.caption ?? ""} ${f.section ?? ""}`).join(" \n ");
      const out = await this.db.$transaction(async (tx) => {
        const { items, dropped, library } = await editionFieldItems(tx, h.workspaceId, asReading(d)!, asReading(check), { printed, file: (await this.held(id)).item.file ?? h.fileName ?? printed, sha256: h.sha256, formText });
        const made = items.length ? await insertEditionFieldItems(tx, h.workspaceId, items, library, aiJob.id) : 0;
        const message = `${d.from === "replay" ? "Saved AI run (US$0, no AI call)" : `AI run (US$${spent.toFixed(2)})`} for the ${changed.length} new and reworded form fields of ${printed}: ${made} proposal${made === 1 ? "" : "s"} on To review${check.ok ? ", read by both rounds" : ", from the draft round only (each waits as Decide)"}.${dropped.length ? ` Not proposed (failed the rules): ${dropped.length}.` : ""} A person accepts each one.`;
        await tx.draftingJob.update({ where: { id: aiJob.id }, data: { status: made ? "COMPLETED" : "FAILED", costUsd: spent, finishedAt: new Date(), runFile: d.runFile, message: message.slice(0, 1000),
          detail: { operation: "impact_ai", held: h.id, edition: printed, part: part.sha256, boxes: changed, draftRun: d.runFile, checkRun: check.ok ? check.runFile : null, proposals: made, dropped: dropped.slice(0, 50) } } });
        return { made, message, dropped };
      }, QUEUE_TX);
      await this.audit.log(h.workspaceId, actor.id, "started", "edition impact AI", def.formKey, `${actor.name} drafted ${printed}'s ${changed.length} new and reworded form fields with AI (${mode}, US$${spent.toFixed(2)}): ${out.made} proposals for a person`);
      if (!out.made) fail(`No proposal of the AI run passed the rules, so nothing was put on To review.${out.dropped.length ? ` For example: ${[...new Set(out.dropped.map((x) => x.why))].slice(0, 3).join(" ")}` : ""}`.slice(0, 900), HttpStatus.CONFLICT);
      return { job_id: aiJob.id, again: false, proposals: out.made, cost_usd: spent, message: out.message };
    } catch (e) {
      await this.db.draftingJob.updateMany({ where: { id: aiJob.id, status: "RUNNING" }, data: { status: "FAILED", finishedAt: new Date(), message: String((e as Error).message ?? e).slice(0, 1000) } });
      throw e;
    }
  }

  /** Accept (an author): the new edition joins the library with its unchanged form fields' maps carried as draft rows and
   *  the rest left for a person; every combination using the form shows the change in the shared draft until release. */
  async accept(actor: Actor, id: string, body: { expected: number }) {
    need(actor, "author");
    const r = await this.review(id);
    if (body.expected !== r.counts.form_fields) fail("The comparison changed since you opened it. Look at it again, then accept.", HttpStatus.CONFLICT);
    const { h, item, def, old } = await this.held(id);
    const inventory = await this.readInventory(item.file, h);
    const oldMaps = old ? new Map(effective(await this.db.formFieldMap.findMany({ where: { formEditionId: old.id } }), (m) => m.dataPath, "draft").map((m) => [m.dataPath, m])) : new Map();
    const res = await this.db.$transaction(async (tx) => {
      const claimed = await tx.intakeItem.updateMany({ where: { id, status: "HELD", outcome: "new_edition_held" }, data: { status: "DONE", outcome: "added", reason: `Accepted after impact review by ${actor.name}` } });
      if (!claimed.count) fail("Someone decided this edition at the same moment. Refresh to see it.", HttpStatus.CONFLICT);
      const ed = await tx.formEdition.create({ data: { workspaceId: h.workspaceId, govFormDefId: def.id, editionLabel: h.editionLabel!, published: h.published, officialFile: item.file, sha256: h.sha256, storedPath: h.storedPath || null, inventoryFile: inventory, dataBoundBoxes: r.counts.form_fields, ...(item.download ? { origin: "DOWNLOADED", formPageUrl: item.download.formPageUrl, sourceUrl: item.download.sourceUrl, checkedAt: item.download.fetchedAt } : {}) } });
      const data: Prisma.FormFieldMapCreateManyInput[] = r.rows.filter((x) => x.change !== "removed").map((x) => {
        const m = x.change === "unchanged" ? oldMaps.get(x.dataPath) : undefined;
        return m ? { workspaceId: h.workspaceId, formEditionId: ed.id, dataPath: x.dataPath, caption: x.caption, heading: x.section, outcome: m.outcome, person: m.person, row: m.row, canonicalFieldKey: m.canonicalFieldKey, transform: m.transform, condition: m.condition, ...(m.conditionRule ? { conditionRule: m.conditionRule as Prisma.InputJsonValue } : {}), confidence: m.confidence,
          evidenceQuote: `Unchanged from ${old!.editionLabel}`, reason: m.reason, version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, optionMap: m.optionMap === null ? Prisma.DbNull : (m.optionMap as Prisma.InputJsonValue), updatedBy: actor.id }
          : { workspaceId: h.workspaceId, formEditionId: ed.id, dataPath: x.dataPath, caption: x.caption, heading: x.section, outcome: "unresolved", reason: x.change === "reworded" ? `Reworded in ${h.editionLabel}: was "${x.was}"` : `New in ${h.editionLabel}`, version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, updatedBy: actor.id };
      });
      await tx.formFieldMap.createMany({ data });
      return { edition: ed.editionLabel, carried: data.filter((d) => d.outcome !== "unresolved").length, for_a_person: data.filter((d) => d.outcome === "unresolved").length };
    });
    await this.audit.log(h.workspaceId, actor.id, "accepted", "new edition", def.formKey, `${actor.name} accepted ${res.edition} after its impact review: ${res.carried} form fields carried from ${old?.editionLabel ?? "no earlier edition"}, ${res.for_a_person} left for a person; ${r.combinations.length} combinations show the change until release (no AI)`, undefined, h.combinationId ?? undefined);
    return { ...res, combinations: r.combinations };
  }

  private async held(id: string) {
    const h = await this.db.intakeItem.findUnique({ where: { id } }).catch(() => null);
    if (!h) fail("This held edition does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    if (h!.status !== "HELD" || h!.outcome !== "new_edition_held") fail("This file is not a new edition waiting for its impact review.", HttpStatus.CONFLICT);
    const listed = manifest().find((i) => i.sha256 === h!.sha256);
    // S4 (M3): a newer edition the form finder downloaded from canada.ca is reviewed like an official file.
    const download = listed ? null : await this.db.officialDownload.findUnique({ where: { workspaceId_sha256: { workspaceId: h!.workspaceId, sha256: h!.sha256 } } });
    const item: { file: string | null; download: typeof download } | null = listed ? { file: listed.file as string, download: null } : download ? { file: null, download } : null;
    // An edition approved in the product (not on the official manifest) cannot be read field by field yet: the form
    // reader takes official files only. It can be set aside with a reason (break M5), never left stuck.
    if (!item) fail("This edition was approved in the product, not taken from the official library, so its form fields cannot be compared yet. Set it aside with a reason, or keep it held until the official file is in the library.", HttpStatus.CONFLICT);
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: h!.workspaceId, formKey: h!.code! } }, include: { editions: true } });
    if (!def) fail(`${h!.code} is not in the library.`, HttpStatus.NOT_FOUND);
    const old = newestEdition(def!.editions.filter((e) => e.channel === "PDF")) ?? null;
    return { h: h!, item: item!, def: def!, old };
  }

  private async readInventory(file: string | null, h?: { workspaceId: string; sha256: string; storedPath: string }) {
    let args = [file ?? ""];
    if (!file && h) {
      // An official download: its record and PDF go where the reader and the guard check them (sources.ts recordApproval).
      const a = await this.sources.approvedInProduct({ workspaceId: h.workspaceId, sha256: h.sha256, recognised: false });
      if (!a) fail("This edition's source is not verified.", HttpStatus.CONFLICT);
      recordApproval(a!, readFileSync(join(ROOT, h.storedPath)));
      args = ["--approved", APPROVED_DIR(), h.sha256];
    }
    const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form.py"), ...args], { cwd: ROOT, timeout: 120_000 });
    const r = JSON.parse(stdout.trim().split("\n").pop()!);
    if (!r.inventory_file) fail(`The new edition's form fields could not be read: ${r.error ?? r.status}.`, HttpStatus.UNPROCESSABLE_ENTITY);
    return r.inventory_file as string;
  }
}
