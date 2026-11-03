// C11.13 "Draft fields" (S6 plan slice 1b item 6, P-138, P-120; forms lane): the route and the Form library's button for
// the one AI step of field-drafts.ts. A form's current edition is drafted once: a saved draft (both rounds, or the draft
// round alone) replays at once at US$0 and its fields wait on To review › Proposals, matched "reuse" or "new", for a
// person to accept and a second person to approve. With no saved draft the form says so with the cost of a live run;
// a live run is not opened in this build (live AI is off; the recording pass waits for the founder's go, plan §6 Q1).
//   GET  /api/library/forms/:code/draft-fields   what Draft fields would do now (saved or not, cost, the earlier draft)
//   POST /api/library/forms/:code/draft-fields   { mode: "replay" } puts the saved draft's fields on the review queue
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { costWords } from "../../contracts/start-setup.ts";
import { normaliseCode } from "../../contracts/form-library.ts";
import { actorOf, Audit, Db, fail, need, readerOf, SOLUTION, Workspace, type Actor } from "./core.ts";
import { draftEdition, editionKey, roundCost, sampleEditions, FIELD_DRAFT_WORDS, type EditionSource } from "./field-drafts.ts";
import { DRAFT_FIELDS_STEP, fieldItems, uniqueLabel, type EditionFacts, type ReadingOf } from "./field-draft-items.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { FormLibrary } from "./form-library.ts";
import { insertProposals, QUEUE_TX, sameInLibrary, type NewProposal, type Work } from "./proposals.ts";
import { StepRunner } from "./rounds.ts";
import type { LibraryField } from "../../engine/normalize.ts";

type H = string | undefined;
/** Replay only: this route never sends a live call (a launch here is a bug, refused before anything is sent). */
const NO_LAUNCH = { launchOnce: async (): Promise<never> => { throw new Error("Draft fields replays saved drafts only: no live call is sent from this route."); } };

export const DRAFT_FIELDS_WORDS = {
  liveOffShort: "Greyed: live AI is off on this copy, so a live run is not open. Use a saved AI draft (US$0), or a person maps the boxes.",
  liveOff: (cost: string) => `A live Draft fields run (${cost}) is not open on this copy: live AI is off. Use a saved AI draft (US$0), or a person maps the boxes.`,
  noEdition: (code: string) => `${code} has no approved edition in the library yet: add its PDF first.`,
  notRead: (edition: string) => `${edition} has no box reading of exactly this file on this computer, so there is nothing to draft: read the form first.`,
  notForm: (code: string) => `${code} is not a form with boxes: only forms are drafted into fields (a checklist is drafted into document lines).`,
  noSaved: (cost: string) => FIELD_DRAFT_WORDS.noSaved.replace("about US$x · at most US$y", cost),
  nothingPassed: (edition: string, why: string[]) => `No field of the saved AI draft of ${edition} passed the rules, so nothing was put on To review and the edition is not marked drafted.${why.length ? ` For example: ${why.slice(0, 3).join(" ")}` : ""}`.slice(0, 900),
  tooMany: (edition: string, n: number, max: number) => `The saved AI draft of ${edition} names ${n} fields for a form of far fewer boxes (at most ${max} are read), so it was not used: a person maps the boxes.`,
};
/** At most this many fields are read from one draft of a form (break m4: one draft never holds the queue's lock for long). */
export const maxFields = (boxes: number) => Math.max(50, boxes * 2);

type Resolved = { workspaceId: string; code: string; edition: EditionSource; file: string; sha256: string };

@Injectable()
export class FieldDrafts {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace, @Inject(FormLibrary) private readonly lib: FormLibrary) {}
  private runner = new StepRunner(NO_LAUNCH);

  /** The form's current approved edition with a box reading of exactly that file (field-drafts.ts sampleEditions). */
  private async resolve(code: string): Promise<Resolved> {
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findFirst({ where: { workspaceId, formKey: code }, select: { formKind: true, displayName: true } });
    if (!def) fail(`${code} is not in the form library.`, HttpStatus.NOT_FOUND);
    const current = await this.lib.currentOf(code);
    if (!current) fail(DRAFT_FIELDS_WORDS.noEdition(code), HttpStatus.CONFLICT);
    const edition = sampleEditions().find((e) => e.printed === current!.edition && this.inventorySha(e) === current!.sha256);
    if (!edition) {
      if (/guide|checklist/i.test(`${def!.formKind} ${def!.displayName}`)) fail(DRAFT_FIELDS_WORDS.notForm(code), HttpStatus.CONFLICT);
      fail(DRAFT_FIELDS_WORDS.notRead(current!.edition), HttpStatus.CONFLICT);
    }
    const row = await this.db.formEdition.findFirst({ where: { workspaceId, editionLabel: current!.edition, sha256: current!.sha256 }, select: { officialFile: true } });
    return { workspaceId, code, edition: edition!, file: (row?.officialFile ?? `${code} (${edition!.edition}).pdf`).split("/").pop()!, sha256: current!.sha256 };
  }
  /** The official file a box reading was made from (its own summary checksum). */
  private inventorySha(e: EditionSource): string | null {
    try { return (JSON.parse(readFileSync(join(SOLUTION, e.inventory), "utf8")) as { summary?: { sha256?: string } }).summary?.sha256 ?? null; } catch { return null; }
  }
  private costOf(e: EditionSource) {
    const c = roundCost(e);
    return { about_usd: c.attemptUsd * 2, at_most_usd: c.worstUsd * 2, words: costWords(c.attemptUsd * 2, c.worstUsd * 2) };
  }
  private earlier(workspaceId: string, printed: string) {
    return this.db.draftingJob.findFirst({ where: { workspaceId, kind: DRAFT_FIELDS_STEP, status: "COMPLETED", detail: { path: ["edition"], equals: printed } }, orderBy: { startedAt: "desc" } });
  }
  private async view(r: Resolved, job: Awaited<ReturnType<FieldDrafts["earlier"]>>) {
    const waiting = job ? await this.db.proposalItem.count({ where: { runId: job.id, status: "waiting" } }) : 0;
    const made = job ? await this.db.proposalItem.count({ where: { runId: job.id } }) : 0;
    return job ? { job_id: job.id, at: job.startedAt.toISOString(), proposals: made, waiting, group: `edition:${r.edition.printed}`, message: job.message } : null;
  }

  /** What Draft fields would do now, at US$0 (only saved files are read). */
  async plan(code: string) {
    // Review minor: "not read", "a checklist", "no edition" are ordinary states of a form, answered in words (200), not errors.
    let r: Resolved;
    try { r = await this.resolve(code); } catch (e) {
      if (e instanceof HttpException && e.getStatus() === HttpStatus.CONFLICT) return { code, edition: null, state: "cannot" as const, words: String(e.message) };
      throw e;
    }
    const cost = this.costOf(r.edition);
    const rounds = await draftEdition(this.runner, r.edition, "replay", async () => false);
    const drafted = await this.view(r, await this.earlier(r.workspaceId, r.edition.printed));
    const saved = { draft: rounds.draft.ok, check: rounds.check.ok };
    const state = drafted ? "drafted" : saved.draft ? "saved" : "no_saved";
    const words = drafted ? `Drafted once from the saved AI draft (US$0): ${drafted.proposals} field${drafted.proposals === 1 ? "" : "s"}, ${drafted.waiting} still waiting on To review.`
      : saved.draft ? `A saved AI draft of ${r.edition.printed} is here${saved.check ? " with its checker round" : " (the draft round only: every field waits as Decide)"}: Draft fields uses it at US$0.`
      : DRAFT_FIELDS_WORDS.noSaved(cost.words);
    return { code, edition: r.edition.printed, key: editionKey(r.edition), boxes: r.edition.fields, state, words, saved, cost, live: { open: false, why: DRAFT_FIELDS_WORDS.liveOffShort }, drafted };
  }

  /** Puts the saved draft's fields on the review queue, once per edition (a second click returns the first draft). */
  async draft(actor: Actor, code: string, body: { mode?: unknown }) {
    need(actor, "author");
    const mode = String(body?.mode ?? "replay");
    if (!["replay", "live"].includes(mode)) fail('Choose how to draft this form\'s fields: "replay" (a saved AI draft, US$0) or "live" (a paid AI call).');
    const r = await this.resolve(code);
    const cost = this.costOf(r.edition);
    if (mode === "live") fail(DRAFT_FIELDS_WORDS.liveOff(cost.words), HttpStatus.CONFLICT);
    const rounds = await draftEdition(this.runner, r.edition, "replay", async () => false);
    if (!rounds.draft.ok) fail(rounds.draft.reason === FIELD_DRAFT_WORDS.noSaved ? DRAFT_FIELDS_WORDS.noSaved(cost.words) : rounds.draft.reason, HttpStatus.CONFLICT);
    const asReading = (x: typeof rounds.draft): ReadingOf | null => (x.ok ? { output: x.output, from: x.from, runFile: x.runFile, costUsd: 0 } : null);
    let formText = "";
    try { formText = ((JSON.parse(readFileSync(join(SOLUTION, r.edition.inventory), "utf8")) as { fields?: { caption?: string | null; heading?: string | null; tooltip?: string | null }[] }).fields ?? []).map((f) => `${f.caption ?? ""} ${f.heading ?? ""} ${f.tooltip ?? ""}`).join(" \n "); } catch { /* no words: every quote is Decide */ }
    const printed = r.edition.printed;
    const max = maxFields(r.edition.fields);
    for (const x of [rounds.draft, rounds.check]) if (x.ok && x.output.canonical_fields.length > max) fail(DRAFT_FIELDS_WORDS.tooMany(printed, x.output.canonical_fields.length, max), HttpStatus.CONFLICT);
    const out = await this.db.$transaction(async (tx) => {
      // P-138: one draft per edition, looked up and written under one lock, so two clicks at once share one draft.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`draft-fields:${r.workspaceId}:${printed}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { workspaceId: r.workspaceId, kind: DRAFT_FIELDS_STEP, status: "COMPLETED", detail: { path: ["edition"], equals: printed } }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: 0, again: true };
      const { items, dropped, library } = await editionFieldItems(tx, r.workspaceId, asReading(rounds.draft)!, asReading(rounds.check), { printed, file: r.file, sha256: r.sha256, formText });
      // Break m1: a draft with no usable field does not use up the edition's one draft; the reasons are said.
      if (!items.length) fail(DRAFT_FIELDS_WORDS.nothingPassed(printed, [...new Set(dropped.map((x) => x.why))]), HttpStatus.CONFLICT);
      const job = await tx.draftingJob.create({ data: { workspaceId: r.workspaceId, combinationId: null, kind: DRAFT_FIELDS_STEP, mode: "REPLAY", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        runFile: rounds.draft.ok ? rounds.draft.runFile : null,
        message: `Saved AI draft of ${printed} (US$0, no AI call): ${items.length} field${items.length === 1 ? "" : "s"} proposed on To review${rounds.check.ok ? ", read by both rounds" : ", from the draft round only (each waits as Decide)"}.${dropped.length ? ` Not proposed (failed the rules): ${dropped.length}.` : ""}`.slice(0, 1000),
        detail: { operation: "draft_fields", edition: printed, key: editionKey(r.edition), mode: "replay", draftRun: rounds.draft.ok ? rounds.draft.runFile : null, checkRun: rounds.check.ok ? rounds.check.runFile : null, proposals: items.length, dropped: dropped.slice(0, 50) } } });
      const made = await insertEditionFieldItems(tx, r.workspaceId, items, library, job.id);
      return { job, made, again: false };
    }, QUEUE_TX);
    if (!out.again) await this.audit.log(r.workspaceId, actor.id, "started", "field draft", printed, `${actor.name} drafted ${printed}'s fields from the saved AI draft (${out.made} proposals, US$0)`);
    return { job_id: out.job.id, edition: printed, proposals: out.again ? await this.db.proposalItem.count({ where: { runId: out.job.id } }) : out.made, again: out.again, group: `edition:${printed}`,
      message: out.again ? `${printed} was already drafted from its saved AI draft: its fields wait on To review.` : out.job.message };
  }
}

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
/** C11.13, shared with C9.1's impact AI step (impact.ts): the readings of one edition (or of its changed boxes) turned into
 *  `field` items against the current library (merged fields redirect, retired ones are left out). */
export async function editionFieldItems(tx: Tx, workspaceId: string, draft: ReadingOf, check: ReadingOf | null, facts: EditionFacts) {
  const rows = await tx.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
  const seen = new Set<string>(), library: LibraryField[] = [], redirects = new Map<string, string>();
  for (const x of rows) if (!seen.has(x.canonicalFieldKey)) { seen.add(x.canonicalFieldKey); if (x.mergedIntoKey) redirects.set(x.canonicalFieldKey, x.mergedIntoKey); else if (x.status !== "RETIRED") library.push({ key: x.canonicalFieldKey, meaning: x.meaning, valueType: x.valueType, status: x.status, aliases: x.aliases }); }
  const { items, dropped } = fieldItems(draft, check, facts, library, redirects);
  return { items, dropped, library };
}

/** C11.13, shared with C9.1: puts the items on the one review queue under the run `runId`; returns how many were put. */
export async function insertEditionFieldItems(tx: Tx, workspaceId: string, items: ReturnType<typeof fieldItems>["items"], library: LibraryField[], runId: string) {
  // An exact name already in the library (insertProposals refuses a "new" twin, break M3): the same field only when
  // its area and its value type are the same, proposed as its reuse; otherwise the new field is named apart (its area,
  // then a number) so it stays new and never lands on another area's field.
  const byKey = new Map(library.map((l) => [l.key, l]));
  const taken = new Set(items.map((x) => x.identity.key));
  const ready: (NewProposal & Work)[] = [];
  for (const it of items) {
    if (it.reuse.match !== "new" || it.payload.kind !== "field") { ready.push({ ...it, runId }); continue; }
    const proposed = String((it.work as { proposedKey?: string }).proposedKey ?? "");
    let payload = it.payload, twin = await sameInLibrary(tx, workspaceId, payload);
    const same = (k: string) => k.split(".")[0] === proposed.split(".")[0] && byKey.get(k)?.valueType === payload.valueType;
    while (twin && !same(twin)) {
      taken.delete(normalizeLabel(payload.label));
      const label = uniqueLabel(proposed, new Set([...taken, normalizeLabel(payload.label)]), payload.label);
      payload = { ...payload, label }; taken.add(normalizeLabel(label));
      twin = await sameInLibrary(tx, workspaceId, payload);
    }
    const parts = (it.work as { whyParts?: { round: string | null; quote: string | null } }).whyParts;
    if (twin) ready.push({ ...it, runId, reuse: { match: "reuse", existingKey: twin }, identity: { ...it.identity, near: [], nearReason: null }, confidence: it.confidence === "ready" ? "check" : it.confidence,
      reason: [`Same name, area and type as the library field ${twin}: reuse it.`, parts?.round, parts?.quote].filter(Boolean).join(" ").slice(0, 500) });
    else ready.push({ ...it, runId, payload, identity: { ...it.identity, key: normalizeLabel(payload.label) }, rounds: { draft: it.rounds.draft && { ...it.rounds.draft, payload }, check: it.rounds.check && { ...it.rounds.check, payload } } });
  }
  await insertProposals(tx, workspaceId, ready);
  return ready.length;
}

@Controller("api")
export class FieldDraftsController {
  constructor(@Inject(FieldDrafts) private readonly f: FieldDrafts) {}
  @Get("library/forms/:code/draft-fields") plan(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string) { readerOf(a); return this.f.plan(code); }
  @Post("library/forms/:code/draft-fields") draft(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.f.draft(actorOf(a), code, (b ?? {}) as { mode?: unknown }); }
}
