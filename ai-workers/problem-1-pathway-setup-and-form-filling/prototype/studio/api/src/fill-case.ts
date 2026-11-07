// Case forms (runtime lane, R1d, plan §8 RT-13…RT-17): IMM 5257 and the case's other PDF forms filled from the case's
// confirmed facts only (P-72), through the shared filler (fill.ts writeForm: each value in the form field's own format,
// signatures never typed, append-only writer, read back, signatures checked). Never overwrite (P-65 d): each copy is a
// new row with the facts it read frozen beside it; a later answer makes a copy "out of date" (a locked one "stale") and
// never changes it; a new copy is made only when the officer asks. Generation runs as a queued job (STANDARDS §3:
// never inside the web request): one at a time, status kept, a restart resumes queued copies and fails running ones.
// Audit lines name the form, the person's role and the case by its short id: never a value or a typed name (RT-17).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query, Res, UploadedFiles, UseInterceptors, type OnModuleInit } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { GenerateCopy, LockCopy, LOCK_KINDS, notReady, type CaseForm, type CaseOnlineForm, type FormCopy } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { pdfMapInUse } from "../../engine/programs.ts";
import { caseView } from "../../engine/runtime/case.ts";
import { changedFacts, changedGroups, copyOnlyForms, formCoverage, groupFacts, gateOf, inputHash, isGateFact, markNothingRecorded, pdfForms, readiness, releaseForms, type FormFact, type GatePlacement, type GroupFact } from "../../engine/runtime/forms.ts";
import { answerSheetOnly, CHANNEL_WORDS, isBarcodeForm, NOT_FOR_FILING, type Channel } from "../../contracts/forms.ts";
import { lineOf } from "../../engine/channels.ts";
import type { BoxRow } from "../../engine/render.ts";
import { actorOf, Audit, CaseRead, Db, fail, PROTOTYPE, PY, ROOT, VAR, VAR_ROOT, type Actor } from "./core.ts";
import { keptOnMacWords } from "./sample-validated.ts";
import { busyWords } from "./busy.ts";
import { formValues, notOnFormLines, type Inventory } from "../../engine/form-values.ts";
import { mandatoryOpen, type CaseWords, type OpenField } from "../../engine/runtime/mandatory.ts";
import { solutionFile, writeForm } from "./fill.ts";
import { trialFor, type EditionMap } from "./fill-trials.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
/** `channel` (C11.6, Devin on #1056): the person's channel when the copy was asked for, frozen with its facts. */
type Stored = { facts: FormFact[]; boxes: BoxRow[]; groups?: GroupFact[]; channel?: Channel };
const short = (id: string) => id.slice(0, 8);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const conflict = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const ROLE: Record<string, string> = { principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A malformed id in the URL is "not found", never a database error. */
const idOf = (id: string, what: string) => (UUID.test(id) ? id : fail(`No such ${what}.`, HttpStatus.NOT_FOUND));
/** QA-235: a form number exactly as the case's release writes it ("IMM 5257", "IMM 5257 SCH1", "IMM 0008 DEP"); anything
 *  else is "not found", never echoed back (break m6). */
const formOf = (s: Parameters<typeof releaseForms>[0], form: string) => (releaseForms(s).has(form) ? form : fail("No such form.", HttpStatus.NOT_FOUND));
/** At most this many copies of one case wait or run at once (break m6): one case cannot hold up every other. */
const ACTIVE_PER_CASE = 5;
const run = promisify(execFile);
/** C-9: a validated copy is one PDF, at most this size. */
export const MAX_VALIDATED_BYTES = 20 * 1024 * 1024, MAX_VALIDATED_MB = MAX_VALIDATED_BYTES / 1024 / 1024;
type Snap = ReturnType<Runtime["snapshotOf"]>;
/** P-143: a form's channel in the case's release (an older release's spelling read as today's, C-8). */
const channelIn = (s: Snap, form: string): Channel => lineOf((s.forms as { form_number: string; channel?: string; signature?: string }[]).find((f) => f.form_number === form) ?? {}).channel;
/** C11.6: the channel each person's form item was moved to on the case (`filing_item.channel`), by "subject|form"; a
 *  form with no entry follows its release line. The forms list, copies, locks and Validate read the same channel as
 *  /prepare, so a change made on the case is never contradicted below it (review M2 on #1056). */
type ItemChannels = Map<string, Channel>;
const chosen = (s: Snap, items: ItemChannels, form: string, subject: string): Channel => items.get(`${subject}|${form}`) ?? channelIn(s, form);
/** Row C3 (founder Q3): whether a copy is "Copy, not for filing" follows the channel of that person's form when the copy
 *  was made (its stamp, `result_json.not_for_filing`; else the channel frozen with its facts), never the release line's
 *  alone: a person moved to Paper gets a filing copy on a line released Online. Only a copy made before either was
 *  recorded falls back to its release line. */
export const copyNotForFiling = (s: Snap, x: { formNumber: string; resultJson: unknown; snapshot: { factsJson: unknown } }): boolean =>
  (x.resultJson as { not_for_filing?: boolean } | null)?.not_for_filing ?? ((x.snapshot.factsJson as { channel?: Channel } | null)?.channel ?? channelIn(s, x.formNumber)) === "ONLINE";
/** QA-127: the values that differ after a read-back, by the form's own words for each field (its caption or the fact's
 *  meaning, never a field path) with what the copy wrote and what the file holds, so the person can put them back.
 *  At most three are named; the rest are counted (`total`: all that differ; the reader lists at most ten). */
export function differing(boxes: { box: string; caption?: string | null; meaning?: string | null }[] | undefined, mismatches: unknown, total?: number): string {
  const bad = (Array.isArray(mismatches) ? mismatches : []) as { path?: string; wrote?: unknown; read?: unknown }[];
  if (!bad.length) return "";
  const all = Math.max(total ?? bad.length, bad.length);
  const byPath = new Map((boxes ?? []).map((b) => [b.box, b]));
  const said = (v: unknown) => (v === null || v === undefined || v === "" ? "nothing" : `"${String(v).slice(0, 60)}"`);
  const name = (p: string) => { const b = byPath.get(p); const w = (b?.caption || b?.meaning || "").trim(); return w ? `"${w.slice(0, 80)}"` : "a field the product filled"; };
  const shown = bad.slice(0, 3).map((m) => `${name(String(m.path ?? ""))} should say ${said(m.wrote)} but says ${said(m.read)}`);
  return ` ${all === 1 ? "The value that differs" : "The values that differ"}: ${shown.join("; ")}${all > shown.length ? `; and ${all - shown.length} more` : ""}.`;
}

/** G24 (QA-139, C7.7): why a box is left to write by hand, in plain words: the filler's own step names (for example
 *  "derive_inverse:…", "phone_part:…") never reach a person. */
export function plainWhy(why: string | null | undefined): string {
  const w = (why ?? "").trim();
  if (/is not in the executable set/.test(w)) return "The product cannot work this form field out from the case's answers yet: write it by hand.";
  return w.replace(/\b(derived?|derive_inverse|phone_part|address_part|date_part|code_list|yes_no_code|select):[^\s,;]*/g, "a calculation").replace(/[a-z]+\.[a-z_]+\([^)]*\)/g, "a calculation");
}

/** C-9 (P-144): a barcode form filed by PDF upload or on paper needs a current validated copy before it is filed. */
/** QA-165 (P-144, P-237): a validated copy counts only when the form's own Validate result had passed when it was read
 *  back (read_validated.py form_validation, kept in its read-back). A row recorded before QA-165 has no such result: it
 *  never counts as validated, and the person sends the validated file again (the copy view, `lock` and `file` alike). */
export const formPassed = (v: { readBack: unknown } | undefined) => (v?.readBack as { validation?: { passed?: boolean } } | null)?.validation?.passed === true;
const NOT_FORM_CHECKED = "Read back before the form's own Validate result was checked: send the file you validated in Adobe again";
/** QA-165 part 2: a form's field list, read once per file (the release's field map names it). */
const inventories = new Map<string, { at: number; inv: Inventory }>();
const inventoryOf = (file: string): Inventory | null => {
  const abs = solutionFile(file); // never outside the solution folder (Devin on #592)
  if (!abs) return null;
  // Break m-5 on #592: a file that is not a field list (no `fields` array) is no field list; never a 500 for the case.
  // Review m-4 on #592: read again when the file changed, so the list and a copy (writeForm reads it fresh) agree.
  let at = 0; try { at = statSync(abs).mtimeMs; } catch { return null; }
  const hit = inventories.get(abs);
  if (hit && hit.at === at) return hit.inv;
  try { const inv = JSON.parse(readFileSync(abs, "utf8")) as Inventory; if (!Array.isArray(inv?.fields)) return null; inventories.set(abs, { at, inv }); return inv; } catch { return null; }
};
/** QA-165 part 2 (P-237, P-238): the mandatory form fields a copy made now would leave empty, with why (engine/runtime/
 *  mandatory.ts), from the same value step a copy runs. Empty when the form has no PDF map or field list. */
export function fieldsOpen(s: Snap, form: string, boxes: BoxRow[], words: CaseWords = {}): OpenField[] {
  const map = pdfMapInUse(s.field_maps as { form_number: string; form_edition?: string; channel?: string; inventory_file?: string; entries: { data_path: string; fact?: string | null; outcome?: string | null }[] }[], form); // P-32: the edition in use
  const inv = map?.inventory_file ? inventoryOf(map.inventory_file) : null;
  if (!map || !inv) return [];
  const { boxes: results, values } = formValues(s as unknown as Parameters<typeof formValues>[0], map, inv, boxes);
  return mandatoryOpen(inv, map.entries, results, values, words);
}
const needsValidate = (form: string, channel: Channel) => isBarcodeForm(form) && ["PDF_UPLOAD", "PAPER"].includes(channel);
const OUT_OF_DATE = "Out of date: validate again";
/** QA-285: each person on the case named by their name (the saved read-backs name people, never ids). */
const nameOfPeople = (people: { subjectId: string; label: string }[]) => (about: string) => about === "case" ? "case" : people.find((p) => p.subjectId === about)?.label ?? about;
/** What a file check names in its refusal: the generated copy, or the validated copy read back (C-9). */
const COPY_FILE = { name: "This copy's file", made: "made", again: "generate a new copy" };
const VALIDATED_FILE = { name: "This copy's validated file", made: "read back", again: "validate the copy again and read it back" };

/** P-65 (a), review M1, S2 (SA-1B-174): a form's fill trial counts for one form edition and one field map version
 *  (api/src/fill-trials.ts, the register samples/fill-trials.json, the verdict in evidence-lane/E1/<form>/STATUS.md).
 *  Not proven for this edition and map: copies are "Checked copy, not for filing" and cannot be locked. */
export const trialOf = (s: Snap, form: string) => trialFor(pdfMapInUse(s.field_maps as EditionMap[], form)); // P-32: the trial of the edition in use

@Injectable()
export class CaseForms implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime, @Inject(Audit) private readonly audit: Audit) {}
  private queue: string[] = [];
  private running = false;

  /** Restart recovery: a queued copy never started, so it resumes; a running one was cut off, so it failed (its partial
   *  file, if any, is never handed over). */
  async onModuleInit() {
    await this.db.formInstance.updateMany({ where: { status: "RUNNING" }, data: { status: "FAILED", error: "Interrupted by a restart; generate a new copy.", finishedAt: new Date() } });
    const queued = await this.db.formInstance.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } });
    this.enqueue(queued.map((q) => q.id));
  }

  private officerCase(actor: Actor, caseId: string) { return this.runtime.reach(actor, idOf(caseId, "case"), "officer"); }

  private async itemChannels(caseId: string): Promise<ItemChannels> {
    const rows = await this.db.filingItem.findMany({ where: { caseId, kind: "form", active: true, channel: { not: null } }, select: { subjectId: true, itemKey: true, channel: true } });
    return new Map(rows.map((r) => [`${r.subjectId}|${r.itemKey}`, r.channel as Channel]));
  }

  /** Every PDF form that applies to someone on the case: the draft (what a copy made now would write), readiness and
   *  the copies made, each with out of date / stale and the facts that changed. One read of the case. */
  async list(actor: Actor, caseId: string): Promise<{ forms: CaseForm[]; online: CaseOnlineForm[] }> {
    const c = await this.officerCase(actor, caseId);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const { answers, rows, groups } = await this.runtime.state(c);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const pdf = new Set([...pdfForms(s), ...copyOnlyForms(s)]); // P-145: an Online form with IRCC's PDF gets a copy not for filing
    const titles = new Map((s.forms as { form_number: string; title?: string }[]).map((f) => [f.form_number, f.title ?? f.form_number]));
    const copies = await this.db.formInstance.findMany({ where: { caseId }, orderBy: { createdAt: "desc" }, include: { snapshot: true, validated: { orderBy: { readAt: "desc" }, take: 1 } } });
    const labels = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    // QA-165 part 2 (review M-1, M-2 on #592): the case's own question words, and the groups settled as "none apply".
    const noneApply = new Map(view.sections.filter((x) => !!x.group && x.group.rows === 0 && !!x.group.none_apply?.value && x.group.none_apply.confirmed)
      .flatMap((x) => x.questions.map((q) => [`${x.subjectId}|${q.fact}`, `"${x.title}"`] as [string, string])));
    const caseWords: CaseWords = { labelOf: (fact) => labels.get(fact), noneApply, gateOf: (fact) => { const g = gateOf(s.placements as GatePlacement[], fact); return g ? labels.get(g) ?? g : undefined; } };
    const items = await this.itemChannels(c.id), nameOf = { caseReference: c.reference, of: nameOfPeople(people) };
    const forms: CaseForm[] = [];
    for (const p of people.filter((x) => x.role !== "case")) {
      for (const form of [...pdf].sort()) {
        const cov = formCoverage(s, people, answers, rows, form, p.subjectId);
        const applies = !!cov && cov.applies !== false;
        const mine = copies.filter((x) => x.formNumber === form && x.subjectId === p.subjectId);
        if (!applies && !mine.length) continue; // a form that stops applying keeps its copies in view (break M4)
        if (chosen(s, items, form, p.subjectId) === "NOT_NEEDED" && !mine.length) continue; // C11.6 (Devin on #1056): nothing to fill or file
        const channel = chosen(s, items, form, p.subjectId);
        forms.push({ form, title: titles.get(form) ?? form, subject_id: p.subjectId, person: p.label, applies, trial_passed: trialOf(s, form).passed, trial_why: trialOf(s, form).why, channel, for_filing: channel !== "ONLINE" && channel !== "NOT_NEEDED", needs_validate: needsValidate(form, channel),
          draft: { written_now: cov?.facts.filter((x) => !isGateFact(x)).length ?? 0, mapped: cov?.mapped ?? 0, unconfirmed: cov?.boxes.filter((b) => b.coverage === "answered on screen").length ?? 0 },
          readiness: readiness(view, form, p.subjectId), fields_open: cov ? fieldsOpen(s, form, markNothingRecorded(cov.boxes, view, s.placements as GatePlacement[]), caseWords) : [], copies: mine.map((x) => this.copyOf(x, cov?.facts ?? [], labels, groupFacts(view, form, p.subjectId), copyNotForFiling(s, x), nameOf)) });
      }
    }
    // QA-40: a form filed Online is listed too (no PDF copy is made), with the people it applies to (P-113: the case
    // officer types it into the portal from the answer sheet; the browser extension fills it in a later wave).
    // C11.6 (Devin on #1056): the release's Online lines, plus any form a person's item was moved to Online; each lists
    // the people whose own channel is Online now (by person, not by name).
    const movedOnline = new Set([...items].filter(([, ch]) => ch === "ONLINE").map(([k]) => k.slice(k.indexOf("|") + 1)));
    const hasPdf = (form: string) => copyOnlyForms(s).has(form) || pdfForms(s).has(form);
    const online = (s.forms as { form_number: string; title?: string; channel?: string }[]).filter((f) => f.channel === "ONLINE" || movedOnline.has(f.form_number)).map((f) => ({
      form: f.form_number, title: f.title ?? f.form_number,
      people: people.filter((p) => p.role !== "case" && chosen(s, items, f.form_number, p.subjectId) === "ONLINE" && view.forms.some((x) => x.form === f.form_number && x.person === p.label && x.applies !== false)).map((p) => p.label),
      pdf_copy: hasPdf(f.form_number),
      why_no_copy: hasPdf(f.form_number) ? null : answerSheetOnly(f.form_number, s.combination.portal) ? "Express Entry: the answer sheet only, no PDF copy." : "IRCC's PDF of this form is not in this case's release.",
    })).filter((f) => f.people.length);
    return { forms, online };
  }

  /** A copy with its state today; changed facts are named by their question (labels), never by their keys. */
  /** `notForFiling`: whether the copy is "Copy, not for filing" (copyNotForFiling, the same rule as `lock` and `validated`). */
  private copyOf(x: Awaited<ReturnType<Db["formInstance"]["findMany"]>>[number] & { snapshot: { factsJson: unknown; inputHash: string }; validated?: { readAt: Date; readBy: string; factsHash: string; readBack: unknown }[] }, today: FormFact[], labels = new Map<string, string>(), todayGroups: GroupFact[] = [], notForFiling = false, nameOf?: { caseReference: string; of: (about: string) => string }): FormCopy {
    // C-10: a validated copy is current while the form's facts are what they were when it was read back.
    const v = x.validated?.[0], vrb = v?.readBack as { written?: number; read_back_equal?: number } | undefined, current = !!v && formPassed(v) && v.factsHash === inputHash(today);
    // QA-285: a validated file kept elsewhere (the checkpoint's Sample, kept on the Mac: api/src/sample-validated.ts) is
    // named in words while the form's facts are the ones validated; it is never a validated copy here (nothing to lock,
    // file or download as validated).
    const keptElsewhere = !current && nameOf && x.status === "GENERATED" && x.snapshot.inputHash === inputHash(today) ? keptOnMacWords(x, nameOf.caseReference, nameOf.of) : null;
    const stored = x.snapshot.factsJson as Stored, then = stored.facts;
    const changed = x.status === "GENERATED" ? [...changedFacts(then, today).map((f) => labels.get(f) ?? f), ...changedGroups(stored.groups, todayGroups)] : [];
    const result = x.resultJson as { counts?: FormCopy["counts"]; intact?: boolean; person_steps?: string[]; boxes?: { fact: string | null; about_label?: string; result: string; why: string | null }[] } | null;
    const byHand = (result?.boxes ?? []).filter((b) => b.result === "by hand").map((b) => ({ label: (b.fact && labels.get(b.fact)) || "A form field", why: plainWhy(b.why) }));
    // B81 (challenge M1): apart from "by hand": the form has no such choice to write by hand; it names whose answer it is.
    const notOnForm = notOnFormLines(result?.boxes ?? [], (f) => labels.get(f));
    return { id: x.id, status: x.status as FormCopy["status"], created_at: x.createdAt.toISOString(), created_by: x.createdBy, finished_at: x.finishedAt?.toISOString() ?? null, error: x.error,
      locked: x.lockedAt ? { kind: x.lockedKind as keyof typeof LOCK_KINDS, at: x.lockedAt.toISOString(), by: x.lockedBy! } : null,
      out_of_date: changed.length > 0, stale: !!x.lockedAt && changed.length > 0, changed, counts: result?.counts ?? null, intact: result?.intact ?? null, person_steps: result?.person_steps ?? [], copy_not_for_filing: notForFiling, source: "ircc_pdf",
      by_hand: byHand, not_on_form: notOnForm, file_ok: x.status === "GENERATED" && !!x.path && existsSync(join(ROOT, x.path)),
      validated: v ? { at: v.readAt.toISOString(), by: v.readBy, current, words: !formPassed(v) ? NOT_FORM_CHECKED : current ? "Validated copy read back" : OUT_OF_DATE, read_back: { written: vrb?.written ?? 0, equal: vrb?.read_back_equal ?? 0 } } : null,
      validated_elsewhere: keptElsewhere };
  }

  /** RT-13: a new copy of one form for one person, from the confirmed facts as they are now (frozen with the copy).
   *  Missing facts are listed on the copy, not refused (P-71 blocks filing, not generating). Idempotent by key. */
  async generate(actor: Actor, caseId: string, formIn: string, subjectId: string, body: unknown) {
    const c = await this.officerCase(actor, caseId), s = this.runtime.snapshotOf(c), form = formOf(s, formIn);
    const b = parse(GenerateCopy, body);
    const who = c.participants.find((p) => p.subjectId === idOf(subjectId, "person") && p.role !== "case");
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    if (b.idempotencyKey) { const again = await this.db.formInstance.findFirst({ where: { caseId, idempotencyKey: b.idempotencyKey } }); if (again) return this.answerFor(again, form, subjectId); }
    const people = this.runtime.peopleOf(c);
    const { answers, rows, groups } = await this.runtime.state(c);
    const channel = chosen(s, await this.itemChannels(c.id), form, idOf(subjectId, "person"));
    if (channel === "NOT_NEEDED") fail(`${form} is Not needed in this case's release: the IRCC account asks it itself, so nothing is filled.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (answerSheetOnly(form, s.combination.portal)) fail(`${form} is filed Online through the IRCC secure account: its answers go on the answer sheet only, with no PDF copy.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!pdfForms(s).has(form) && !copyOnlyForms(s).has(form)) fail(channel === "ONLINE" ? `${form} is filed Online and IRCC's PDF of it is not in this case's release: its answers go on the answer sheet.` : `${form} has no PDF to fill in this case's release.`, channel === "ONLINE" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.NOT_FOUND);
    const cov = formCoverage(s, people, answers, rows, form, subjectId);
    if (!cov || cov.applies === false) fail(`${form} does not apply to that person on this case.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const stored: Stored = { facts: cov!.facts, boxes: markNothingRecorded(cov!.boxes, view, s.placements as GatePlacement[]), groups: groupFacts(view, form, subjectId) };
    let copy;
    try {
      // C9.5 (breaker R2-m1): a long wait for the case's row lock (a move holding it) answers a worded 503, never a 500.
      copy = await busyWords(() => this.db.$transaction(async (tx) => {
        // The cap is counted under a lock on the case row, so simultaneous requests are counted one after another (PR #12 review 3).
        await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR UPDATE`;
        // C9.5 (BR-7, challenge M2): the pin was read before this lock; a move to another release made meanwhile (it takes
        // the same lock) is seen here, so no copy is ever made on the release the case just left.
        const newest = await tx.packWorkPin.findFirst({ where: { caseId }, orderBy: { revision: "desc" }, select: { revision: true } });
        if (newest?.revision !== c.pins[0].revision) throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Changed by someone else", status: 409, detail: "This case moved to another release while you pressed Fill: nothing was made. Press Fill again to make the copy on the case's release now." }, HttpStatus.CONFLICT);
        const active = await tx.formInstance.count({ where: { caseId, status: { in: ["QUEUED", "RUNNING"] } } });
        if (active >= ACTIVE_PER_CASE) throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Busy", status: 429, detail: `${active} copies of this case are being generated; wait for them, then ask again.` }, HttpStatus.TOO_MANY_REQUESTS);
        // C11.6: the person's channel read under the same lock the channel change takes, and frozen with the facts.
        const it = await tx.filingItem.findFirst({ where: { caseId, subjectId, itemKey: form, kind: "form", active: true }, select: { channel: true } });
        const frozen = (it?.channel as Channel | null | undefined) ?? channelIn(s, form);
        if (frozen === "NOT_NEEDED") throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Not needed", status: 422, detail: `${form} is Not needed for this person: the IRCC account asks it itself, so nothing is filled.` }, HttpStatus.UNPROCESSABLE_ENTITY);
        const snap = await tx.answerSnapshot.create({ data: { workspaceId: c.workspaceId, caseId, subjectId, formNumber: form, inputHash: inputHash(cov!.facts), factsJson: { ...stored, channel: frozen } as object } });
        return tx.formInstance.create({ data: { workspaceId: c.workspaceId, caseId, subjectId, formNumber: form, configReleaseId: c.pins[0].configReleaseId, snapshotId: snap.id, idempotencyKey: b.idempotencyKey ?? null, createdBy: actor.id } });
      }));
    } catch (e) {
      if (!unique(e) || !b.idempotencyKey) throw e;
      const again = await this.db.formInstance.findFirst({ where: { caseId, idempotencyKey: b.idempotencyKey } }); // a simultaneous press won
      return this.answerFor(again!, form, subjectId);
    }
    await this.audit.log(c.workspaceId, actor.id, "queued", "form copy", form, `${actor.name} asked for a new copy of ${form} for the ${ROLE[who!.role] ?? who!.role} on case ${short(caseId)} (${cov!.facts.filter((x) => !isGateFact(x)).length} confirmed facts)`);
    this.enqueue([copy.id]);
    return { id: copy.id, status: copy.status, created: true };
  }

  private answerFor(x: { id: string; formNumber: string; subjectId: string; status: string }, form: string, subjectId: string) {
    if (x.formNumber !== form || x.subjectId !== subjectId) conflict("This idempotency key was already used for another form or person; nothing was generated. Use a new key.");
    return { id: x.id, status: x.status, created: false };
  }

  private enqueue(ids: string[]) { this.queue.push(...ids); void this.drain(); }
  private async drain() {
    if (this.running) return;
    this.running = true;
    // A failing job never ends the server (break M7): each one is caught and its copy marked failed where it still exists.
    try { for (let id = this.queue.shift(); id; id = this.queue.shift()) { try { await this.run(id); } catch (e) { console.error(`form copy ${short(id)}: ${(e as Error).message.slice(0, 200)}`); } } } finally { this.running = false; }
  }

  /** The job: writes exactly the facts frozen with the copy (not today's), so a copy is what was asked for. */
  private async run(id: string) {
    const x = await this.db.formInstance.findUnique({ where: { id }, include: { snapshot: true, case: { include: { pins: { include: { release: true } } } } } });
    if (!x || x.status !== "QUEUED") return;
    const started = await this.db.formInstance.updateMany({ where: { id, status: "QUEUED" }, data: { status: "RUNNING" } });
    if (started.count !== 1) return;
    try {
      const stored = x.snapshot.factsJson as Stored;
      const snapshot = x.case.pins.find((p) => p.configReleaseId === x.configReleaseId)!.release.snapshot as Parameters<typeof writeForm>[0];
      const dir = join(VAR("demo"), "cases", x.caseId); mkdirSync(dir, { recursive: true });
      const base = `${x.formNumber.replace(/\s+/g, "")}-${short(x.subjectId)}-${id}`;
      // P-145, C11.6: stamped "Copy, not for filing" when this person's form is filed Online now; recorded with the copy,
      // so a stamped copy is never locked as filed after the channel changes.
      const channel = stored.channel ?? chosen(snapshot as Snap, await this.itemChannels(x.caseId), x.formNumber, x.subjectId), notForFiling = channel === "ONLINE";
      const r = await writeForm(snapshot, { boxes: stored.boxes }, x.formNumber, dir, base, { notForFiling, channel });
      if (!r.report.intact) throw new Error("the filled file did not pass its checks (read back, signatures, unchanged parts); it is not handed over");
      const by = (k: string) => r.boxes.filter((b: { result: string }) => b.result === k).length;
      const counts = { written: by("written"), by_hand: by("by hand"), not_on_form: by("not on this form"), blank: by("blank"), not_written: by("not written"), by_a_person: by("by a person") };
      await this.db.formInstance.update({ where: { id }, data: { status: "GENERATED", path: r.out.replace(`${ROOT}/`, ""), sha256: createHash("sha256").update(readFileSync(r.out)).digest("hex"), finishedAt: new Date(),
        resultJson: { not_for_filing: notForFiling, counts, intact: r.report.intact, read_back_equal: r.report.read_back_equal, written: r.report.written, signatures: r.report.signatures, person_steps: r.steps.map((p) => p.say), report_file: r.reportFile,
          boxes: r.boxes.map((b: { box: string; fact: string | null; about_label?: string; result: string; why?: string; nothing_recorded?: true }) => ({ box: b.box, fact: b.fact, result: b.result, why: b.why ?? null, ...(b.result === "not on this form" ? { about_label: b.about_label } : {}), ...(b.nothing_recorded ? { nothing_recorded: true } : {}) })) } } });
      await this.audit.log(x.workspaceId, x.createdBy, "generated", "form copy", x.formNumber, `Copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)} generated: ${counts.written} form fields written, read back ${r.report.read_back_equal}/${r.report.written}, intact`);
    } catch (e) {
      const why = e instanceof HttpException ? String((e.getResponse() as { detail?: string; message?: string }).detail ?? e.message) : (e as Error).message;
      // The case may be gone (a demo reset during the job): then there is nothing left to mark.
      const n = await this.db.formInstance.updateMany({ where: { id, status: "RUNNING" }, data: { status: "FAILED", error: `Not generated: ${why}`.slice(0, 500), finishedAt: new Date() } });
      if (n.count) await this.audit.log(x.workspaceId, x.createdBy, "failed", "form copy", x.formNumber, `Copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)} failed`);
    }
  }

  private async copyFor(actor: Actor, id: string) {
    const x = await this.db.formInstance.findUnique({ where: { id: idOf(id, "copy") }, include: { snapshot: true, validated: { orderBy: { readAt: "desc" }, take: 1 } } });
    if (!x) fail("No such copy.", HttpStatus.NOT_FOUND);
    const c: Reached = await this.officerCase(actor, x!.caseId); // the officer of the copy's workspace only; others are refused there
    return { x: x!, c };
  }

  async copy(actor: Actor, id: string) {
    const { x, c } = await this.copyFor(actor, id);
    const { answers, rows, groups } = await this.runtime.state(c);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const cov = formCoverage(s, people, answers, rows, x.formNumber, x.subjectId);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const labels = new Map(view.sections.flatMap((v) => v.questions).map((q) => [q.fact, q.label]));
    return this.copyOf(x, cov?.facts ?? [], labels, groupFacts(view, x.formNumber, x.subjectId), copyNotForFiling(s, x), { caseReference: c.reference, of: nameOfPeople(people) });
  }

  /** RT-16: lock a generated, up-to-date copy once ("validated copy uploaded back" or "filed"). The officer only; an out
   *  of date copy is refused (make a new copy first). After this the database refuses any change to it. */
  async lock(actor: Actor, id: string, body: unknown) {
    const { x, c } = await this.copyFor(actor, id); // who may lock is checked before what was sent (break m4)
    const b = parse(LockCopy, body);
    if (x.status !== "GENERATED") conflict("Only a generated copy can be locked.");
    if (x.lockedAt) conflict(`This copy is already locked (${LOCK_KINDS[x.lockedKind as keyof typeof LOCK_KINDS]}); a locked copy never changes.`);
    // P-145: a copy of a form filed Online is never filed or uploaded.
    const channel = chosen(this.runtime.snapshotOf(c), await this.itemChannels(c.id), x.formNumber, x.subjectId);
    if (channel === "ONLINE") conflict(`${x.formNumber} is filed Online: this PDF is a ${NOT_FOR_FILING.toLowerCase()}. Type the answers into the IRCC account from the answer sheet.`);
    // C11.6, row C3: a copy made while the form was filed Online for this person carries "Copy, not for filing" on its pages.
    if (copyNotForFiling(this.runtime.snapshotOf(c), x))
      conflict(`This copy of ${x.formNumber} was made while it was filed Online, so it is stamped "${NOT_FOR_FILING}". Generate a new copy and lock that one.`);
    const { answers, rows, groups } = await this.runtime.state(c);
    const cov = formCoverage(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, x.formNumber, x.subjectId);
    const lockView = caseView(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, "agent", new Date(), groups);
    const changed = [...changedFacts((x.snapshot.factsJson as Stored).facts, cov?.facts ?? []), ...changedGroups((x.snapshot.factsJson as Stored).groups, groupFacts(lockView, x.formNumber, x.subjectId))];
    if (changed.length) conflict(`This copy is out of date (${changed.length} change${changed.length === 1 ? "" : "s"} since it was made); generate a new copy and lock that one.`);
    // P-71 (Lead, R1d early look): a copy is filed or uploaded back only when its form is ready to file.
    const ready = readiness(lockView, x.formNumber, x.subjectId);
    if (!ready.ready) conflict(notReady(ready.missing.length));
    const trial = trialOf(this.runtime.snapshotOf(c), x.formNumber);
    if (!trial.passed) conflict(trial.why!);
    // Only the file that was made is ever locked: it must still be there with the bytes recorded (PR #12 review 2), since
    // a locked copy can never be corrected afterwards.
    this.checkedFile(x, HttpStatus.CONFLICT);
    const s = this.runtime.snapshotOf(c);
    // C-9, C-10 (P-144, P-171 (1)): a barcode form on a PDF upload or Paper line is filed only with a current validated copy.
    if (needsValidate(x.formNumber, channel)) {
      const v = x.validated[0];
      if (!v) conflict(`${x.formNumber} is a barcode form filed as ${CHANNEL_WORDS[channel]}: Validate it in Adobe, save it and read the validated copy back here before it is filed (IRCC returns it unprocessed otherwise).`);
      if (!formPassed(v)) conflict(`${x.formNumber}'s validated copy was read back before the form's own Validate result was checked, so it does not show that Validate passed. Send the file you validated in Adobe again, then lock it.`);
      if (v!.factsHash !== inputHash(cov?.facts ?? [])) conflict(`${x.formNumber}'s validated copy is out of date: a fact on the form changed after it was validated. Make a new copy, validate it again and read it back.`);
    }
    // C11.6 (Devin on #1056): the channel is read again under the case row lock the channel change takes, so a change
    // made while this lock was being checked is never locked over.
    const n = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${x.caseId}::uuid FOR NO KEY UPDATE`;
      const it = await tx.filingItem.findFirst({ where: { caseId: x.caseId, subjectId: x.subjectId, itemKey: x.formNumber, kind: "form", active: true }, select: { channel: true } });
      if (((it?.channel as Channel | null | undefined) ?? channelIn(s, x.formNumber)) !== channel) return -1;
      return (await tx.formInstance.updateMany({ where: { id, status: "GENERATED", lockedAt: null }, data: { lockedKind: b.kind, lockedAt: new Date(), lockedBy: actor.id } })).count;
    });
    if (n === -1) conflict(`How ${x.formNumber} is filed for this person changed while this copy was being locked. Reload, then lock it again if it is still to be filed.`);
    if (n !== 1) conflict("Someone locked this copy at the same moment.");
    await this.audit.log(c.workspaceId, actor.id, "locked", "form copy", x.formNumber, `${actor.name} locked copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)}: ${LOCK_KINDS[b.kind]}`);
    return this.copy(actor, id);
  }

  /** C-9 (P-144, P-171 (1)): the person's validated copy of a generated, up-to-date copy, read back into the case with
   *  the proven E5 reader (studio/tools/read_validated.py): every value the product wrote must read back equal. Kept
   *  with its checksum and the fingerprint of the form's facts at that moment (C-10), insert-only. */
  async validated(actor: Actor, id: string, files: { originalname?: string; buffer?: Buffer; size?: number }[] | undefined) {
    const { x, c } = await this.copyFor(actor, id);
    const f = (files ?? [])[0];
    if (!f?.buffer?.length || (files ?? []).length !== 1) fail("Send the one validated PDF you saved from Adobe.", HttpStatus.BAD_REQUEST);
    if (f!.buffer!.length > MAX_VALIDATED_BYTES) fail(`The file is larger than ${MAX_VALIDATED_MB} MB: send the validated PDF of this form. Nothing was recorded.`, HttpStatus.PAYLOAD_TOO_LARGE);
    if (x.status !== "GENERATED" || !x.path) conflict("Only a generated copy can be validated and read back.");
    if (chosen(this.runtime.snapshotOf(c), await this.itemChannels(c.id), x.formNumber, x.subjectId) === "ONLINE") conflict(`${x.formNumber} is filed Online: its PDF is a ${NOT_FOR_FILING.toLowerCase()}, so there is nothing to validate.`);
    // Row C3: a copy made while the form was filed Online stays "Copy, not for filing" after a switch to Paper or PDF
    // upload, so its read-back would never be filed (`lock` refuses it): refused here too, before anything is kept.
    if (copyNotForFiling(this.runtime.snapshotOf(c), x)) conflict(`This copy of ${x.formNumber} was made while it was filed Online, so it is stamped "${NOT_FOR_FILING}" and is not validated. Make a new copy, validate that one and read it back.`);
    const { answers, rows, groups } = await this.runtime.state(c);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const cov = formCoverage(s, people, answers, rows, x.formNumber, x.subjectId);
    const changed = [...changedFacts((x.snapshot.factsJson as Stored).facts, cov?.facts ?? []), ...changedGroups((x.snapshot.factsJson as Stored).groups, groupFacts(caseView(s, people, answers, rows, "agent", new Date(), groups), x.formNumber, x.subjectId))];
    if (changed.length) conflict(`This copy is out of date (${changed.length} change${changed.length === 1 ? "" : "s"} since it was made): make a new copy, validate that one and read it back.`);
    this.checkedFile(x, HttpStatus.CONFLICT);
    const sha = createHash("sha256").update(f!.buffer!).digest("hex");
    // Break M1: Adobe's Validate adds the barcode, so a validated copy never has the bytes the product wrote. The copy
    // sent back unchanged was never validated: refused, and nothing is kept.
    if (sha === x.sha256) fail(`This is the copy the product made, unchanged: it was not validated. Open it in Adobe, press Validate, save it and send the saved file. Nothing was recorded.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const dir = join(VAR("demo"), "cases", x.caseId, "validated"); mkdirSync(dir, { recursive: true });
    const path = join(dir, `${x.formNumber.replace(/\s+/g, "")}-${short(x.id)}-${sha.slice(0, 12)}.pdf`);
    // Break M2 on #572: the upload is read from its own pending name and takes the checksum name only when it is recorded,
    // so a refused or repeated send never removes the file a kept row points to (same bytes, same name).
    const pending = `${path}.${randomUUID()}.pending`;
    writeFileSync(pending, f!.buffer!);
    const request = join(ROOT, x.path!.replace(/\.pdf$/, ".request.json"));
    let rb: { ok: boolean; why: string | null; written?: number; read_back_equal?: number; mismatches?: unknown[]; validation?: { kept_by_form: boolean; flag: string | null; date_last_validated: string | null; passed: boolean } };
    try { const { stdout } = await run(PY, ["-I", join(PROTOTYPE, "studio", "tools", "read_validated.py"), pending, join(ROOT, x.path!), request], { cwd: ROOT, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }); rb = JSON.parse(stdout.trim().split("\n").pop()!); }
    catch { rb = { ok: false, why: "The file could not be read back." }; }
    // QA-165 (P-144, P-237): "validated" only from the form's own Validate result kept in the file (its validated flag
    // Yes and its date last validated set, tools/read_validated.py form_validation), never from an upload alone.
    const passed = rb.ok && rb.validation?.passed === true;
    // Refused uploads are not left in the working files (break minor).
    if (!passed) rmSync(pending, { force: true });
    if (!rb.ok) fail(`Not read back: ${rb.why ?? "the file does not hold the values this copy wrote."}${differing((x.snapshot.factsJson as Stored).boxes, rb.mismatches, rb.written !== undefined && rb.read_back_equal !== undefined ? rb.written - rb.read_back_equal : undefined)} Nothing was recorded; validate this copy in Adobe, save it and send it again.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!rb.validation?.passed) fail(rb.validation?.kept_by_form === false
      ? `${x.formNumber} keeps no record of its own Validate in the file, so this file cannot show that Validate passed. Nothing was recorded.`
      : ["Yes", "Oui"].includes(rb.validation?.flag ?? "") && !rb.validation?.date_last_validated
        // Review m-2 on #572: the mark passed but the date its Validate sets with it is missing, so Validate did not finish.
        ? `Adobe's Validate has not finished on this file: the form's own mark says "${rb.validation!.flag}" but it kept no date last validated (its Validate sets both). In Adobe, press Validate again, save, and send that file. Nothing was recorded.`
        : `Adobe's Validate has not passed on this file: the form's own mark says ${rb.validation?.flag ? `"${rb.validation.flag.slice(0, 60)}"` : "nothing"}. In Adobe, press Validate, fix what it marks red until it says the form is complete, save, and send that file. Nothing was recorded.`, HttpStatus.UNPROCESSABLE_ENTITY);
    // QA-128 (P-65: kept once): the same validated file sent twice at once (a double click) is kept once. The copy's row is
    // locked, so the second send waits for the first and then finds its line.
    const v = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM form_instance WHERE id = ${x.id}::uuid FOR UPDATE`;
      // Break M1 on #572: only a kept row that itself passed is "already read back". The same file kept before QA-165 (no
      // result of the form's own) is read back again and recorded, as its words ask ("send the file … again").
      const kept = (await tx.validatedCopy.findMany({ where: { formInstanceId: x.id, sha256: sha }, select: { id: true, readBack: true } })).find(formPassed);
      if (kept) { rmSync(pending, { force: true }); throw new HttpException({ type: "https://expatready.local/problems/validated-copy", title: "Already read back", status: 409, detail: `This validated file is already read back and kept for this copy of ${x.formNumber}; nothing was added.`, existingId: kept.id }, HttpStatus.CONFLICT); }
      // Review m-4 on #572: the row first, then the file takes its name; a failed rename rolls the row back.
      const row = await tx.validatedCopy.create({ data: { workspaceId: c.workspaceId, formInstanceId: x.id, path: path.replace(`${ROOT}/`, ""), sha256: sha, factsHash: inputHash(cov?.facts ?? []), readBack: rb as object, readBy: actor.id } });
      renameSync(pending, path);
      return row;
    }).finally(() => rmSync(pending, { force: true })); // a pending file left by any failure is removed (renamed when kept)
    await this.audit.log(c.workspaceId, actor.id, "validated", "form copy", x.formNumber, `${actor.name} read back a validated copy of ${x.formNumber} (copy ${short(x.id)}) on case ${short(x.caseId)}: ${rb.read_back_equal}/${rb.written} values equal`);
    return { id: v.id, copy: await this.copy(actor, id) };
  }

  /** The copy's file as it was made: present (else `missing`, 404 to download, 409 to lock), inside the working files,
   *  and with the hash recorded. One read: the bytes checked are the bytes used. */
  private checkedFile(x: { path: string | null; sha256: string | null }, missing: HttpStatus, what = COPY_FILE) {
    const path = join(ROOT, x.path ?? "");
    if (!x.path || !existsSync(path)) fail(`${what.name} is missing from the working files; ${what.again}.`, missing);
    if (!realpathSync(path).startsWith(realpathSync(VAR_ROOT) + "/")) fail(`${what.name} is not in the working files; it is not handed over.`, HttpStatus.CONFLICT);
    const bytes = readFileSync(path);
    if (createHash("sha256").update(bytes).digest("hex") !== x.sha256) fail(`${what.name} changed on disk since it was ${what.made}; ${what.again}.`, HttpStatus.CONFLICT);
    return bytes;
  }

  /** The copy's bytes, checked against the hash recorded when it was made, and those same bytes are what is sent (break
   *  M1: one read). The file must lie in the working files (break m5) and still exist (break m1).
   *  C-9 (P-144, a reviewer on PR #121): a barcode form with a current validated copy downloads that validated file (the one
   *  with Adobe's barcode, the one that is filed), checked the same way against its own recorded checksum; a failed
   *  check is refused, never answered with the unbarcoded copy. `original` asks for the copy as the product made it. */
  async file(actor: Actor, id: string, original = false) {
    const { x, c } = await this.copyFor(actor, id);
    if (x.status !== "GENERATED" || !x.path) fail("This copy has no file.", HttpStatus.NOT_FOUND);
    const form = x.formNumber.replace(/\s+/g, ""), s = this.runtime.snapshotOf(c);
    const v = x.validated[0], channel = chosen(s, await this.itemChannels(c.id), x.formNumber, x.subjectId);
    const elsewhere = v && formPassed(v) ? null : keptOnMacWords(x, c.reference, nameOfPeople(this.runtime.peopleOf(c)));
    if (!original && ((v && formPassed(v)) || elsewhere) && needsValidate(x.formNumber, channel)) { // the same rule as `lock` (a barcode form on PDF upload or paper; QA-165)
      const { answers, rows } = await this.runtime.state(c);
      const cov = formCoverage(s, this.runtime.peopleOf(c), answers, rows, x.formNumber, x.subjectId), now = inputHash(cov?.facts ?? []);
      // C-10: current while the form's facts are what they were when it was read back (as `copyOf` shows it).
      if (v && formPassed(v) && v.factsHash === now) return { bytes: this.checkedFile(v, HttpStatus.NOT_FOUND, VALIDATED_FILE), name: `${form}-validated-${short(x.id)}.pdf` };
      // QA-285: the validated file is kept elsewhere (the Mac): said in words, and the unvalidated copy is not handed over in its place.
      if (elsewhere && x.snapshot.inputHash === now) fail(`${elsewhere}. It is not downloaded here, and the copy as the product made it (not validated) is not handed over in its place.`, HttpStatus.CONFLICT);
    }
    const bytes = this.checkedFile(x, HttpStatus.NOT_FOUND);
    // P-145: a copy of a form filed Online is named for what it is.
    const online = copyNotForFiling(s, x);
    return { bytes, name: `${form}-${online ? "copy-not-for-filing" : "copy"}-${short(x.id)}.pdf` };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseFormsController {
  constructor(@Inject(CaseForms) private readonly f: CaseForms) {}
  @Get("cases/:id/forms") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
  @Post("cases/:id/forms/:form/:subject/generate") @HttpCode(HttpStatus.ACCEPTED) generate(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Param("subject") s: string, @Body() b: unknown) { return this.f.generate(actorOf(a), id, form, s, b); }
  @Get("form-copies/:id") copy(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.copy(actorOf(a), id); }
  @Post("form-copies/:id/validated") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_VALIDATED_BYTES, files: 1 } })) validated(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: { originalname?: string; buffer?: Buffer }[]) { return this.f.validated(actorOf(a), id, files); }
  @Post("form-copies/:id/lock") lock(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.lock(actorOf(a), id, b); }
  @Get("form-copies/:id/file") async file(@Headers("x-actor") a: H, @Param("id") id: string, @Query("original") o: string | undefined, @Res() res: Response) { const d = await this.f.file(actorOf(a), id, o === "1"); res.setHeader("content-type", "application/pdf"); res.setHeader("content-disposition", `attachment; filename="${d.name}"`); res.end(d.bytes); }
}

