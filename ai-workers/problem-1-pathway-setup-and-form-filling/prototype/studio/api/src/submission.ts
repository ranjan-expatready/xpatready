// C8.2 Record the submission (runtime lane, M3-F; M3-CONTRACT C8.2; r5c BR-11, BR-15, BR-16, BR-21; AV-6, P-155, P-168):
//   PATCH /api/runtime/groups/:gid/record   one action records the whole submission group: per filing our reference, the
//     date it was submitted (not after today), IRCC's application number (required) and the fee receipt; a UCI per person.
//     Refused while a filing of the group is not Ready to file (C7.6; read from the Prepare view, so a filing that is no
//     longer ready is never recorded) and a second time (BR-15). Recording makes the filings read-only (C8.2-9).
//   POST /api/runtime/filings/:id/record/corrections   "Correct a number": the old number stays in the history with the
//     reason, who and when.
//   POST /api/runtime/filings/:id/record/fee-receipt   (B149, P-408; board agent-view frame 7) the fee receipt's evidence:
//     IRCC's "Transaction Approved" page as one PDF, JPEG or PNG (judged by its bytes), on a recorded filing only, by
//     staff of the case's firm. Stored with its sha256 and never changed (fee_receipt_file, append-only): a wrong file
//     is followed by a new upload, and the earlier one stays in the history. The typed receipt number stays optional.
// Prepared by is the case officer who records; Reviewed by is the representative of record (P-155). The number's pattern
// is Sample data (samples/filing-numbers.json, as slice 1). Government identifiers never go in an audit summary. US$0.
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { cleanName, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, MEDIA, mediaOf } from "../../contracts/documents.ts";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { CorrectNumber, RecordSubmission } from "../../contracts/submission-record.ts";
import { checkApplicationNumber, duplicateWarning, type NumberRule } from "../../engine/runtime/filing-record.ts";
import { recordedPeople, coverageProblem, duplicateInGroup, submittedOnProblem } from "../../engine/runtime/submission-record.ts";
import { behindOf, preparersOf, reviewRecordOf } from "../../engine/runtime/preparers.ts";
import { caseWork } from "./case-work.ts"; // BK-18 (QA-448): who really prepared the filing
import { checkValue } from "../../engine/runtime/case.ts";
import { formCoverage } from "../../engine/runtime/forms.ts";
import { currentValues } from "../../engine/runtime/submission-record.ts";
import { actorOf, Audit, CaseRead, Db, fail, STUDIO, VAR, WORKSPACE_KEY, type Actor } from "./core.ts";
import { liveParticipants } from "./stage-scope.ts"; // C6.17
import { CaseActorGuard, utf8Name } from "./case-checklist.ts";
import { Runtime } from "./runtime.ts";
import { CasePrepare, storedVersion } from "./case-prepare.ts";
import type { FiledForm } from "./submission-record.ts";
import { caseName } from "../../contracts/runtime.ts"; // A24-1: the reference, else the case number

type H = string | undefined;
type Upload = { fieldname?: string; originalname?: string; buffer?: Buffer; size?: number };
const RECEIPTS = () => VAR(WORKSPACE_KEY);
type Reached = Awaited<ReturnType<Runtime["reach"]>>;
/** The case's people as one key: who, in which role, travelling or not (break R2-M1). */
const peopleKey = (ps: { subjectId: string; role: string; applies: boolean }[]) => ps.map((p) => `${p.subjectId}:${p.role}:${p.applies}`).sort().join("|");
const RULES = JSON.parse(readFileSync(join(STUDIO, "samples", "filing-numbers.json"), "utf8")) as { applicationNumber: NumberRule };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);
/** 400, Problem Details naming the field. */
const refuse = (field: string, detail: string, status = HttpStatus.BAD_REQUEST): never => {
  const conflict = status === HttpStatus.CONFLICT; // review m6: a 409 is a conflict, never a validation problem
  throw new HttpException({ type: `https://expatready.local/problems/${conflict ? "conflict" : "validation"}`, title: conflict ? "Not now" : "Some details need fixing", status, detail, errors: [{ field, message: detail }] }, status);
};
const stale = (): never => refuse("version", "This application changed since you read it. Reload, then record the submission again.", HttpStatus.CONFLICT);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
/** The application number as stored (slice 1's rule), or why it is refused: blank, or the wrong shape. */
const numberCheck = (raw: string): { value: string } | { error: string } => {
  const checked = checkApplicationNumber(raw, RULES.applicationNumber);
  if ("error" in checked) return checked;
  return checked.value ? { value: checked.value } : { error: "Give the application number IRCC gave this filing: it is required to record the submission." };
};
const numberOf = (raw: string, field: string): string => { const n = numberCheck(raw); return "value" in n ? n.value : refuse(field, n.error); };
/** Break M3 on #924: a UCI in the release's own shape for the person's UCI (its `person.uci` checks; spaces and hyphens
 *  as people type them are allowed), never free text. Nothing in code says what a UCI looks like. */
const UCI_FACT = "person.uci";
const uciProblem = (s: ReturnType<Runtime["snapshotOf"]>, raw: string): string | null => {
  const bare = raw.replace(/[\s-]+/g, "");
  if (!/[0-9]/.test(bare)) return "Give the UCI as IRCC wrote it (its digits).";
  const p = checkValue(s, UCI_FACT, bare);
  return p.length ? `UCI: ${p.join(" ")}` : null;
};
const STATUS_WORDS: Record<string, string> = { not_started: "not started", ready_to_file: "Ready to file", submitted: "recorded as submitted" };
type View = Awaited<ReturnType<CasePrepare["view"]>>;
type ViewFiling = View["filings"][number] & { label?: string };

/** B152 (break M3, review M2): every answer of the case's people, as a row count per answer table. The three are
 *  append-only (a trigger refuses any other change), so any answer given after a read adds a row and changes the key. */
type AnswerTables = Pick<Db, "clientCanonicalAnswer" | "clientFactRecord" | "clientGroupAnswer">;
export async function answersKey(q: AnswerTables, subjects: string[]) {
  const where = { where: { subjectId: { in: subjects } } };
  const [a, f, g] = await Promise.all([q.clientCanonicalAnswer.count(where), q.clientFactRecord.count(where), q.clientGroupAnswer.count(where)]);
  return `${a}|${f}|${g}`;
}

/** B152 (FQ-7): what a group is recorded with, from the prepare view the record read: its line totals, its total, the
 *  fee lines of its filings, whether fees were worked out, when, and each filing's label (BK-17). Read back by api/src/case-prepare.ts and
 *  api/src/case-filings.ts. */
export function recordedFeesOf(view: { groups: { id: string; totals?: unknown[]; total_cents?: number | null }[]; fees?: { filing: string }[]; fees_worked_out?: boolean; fees_why?: string | null; filings?: { id: string; label: string }[] }, groupId: string, filings: string[]) {
  const group = view.groups.find((x) => x.id === groupId);
  // BK-17: and each filing's label as recorded (the document it applies for), read back by keepRecorded (submission-record.ts).
  return { at: new Date().toISOString(), totals: group?.totals ?? [], total_cents: group?.total_cents ?? null, fees: (view.fees ?? []).filter((f) => filings.includes(f.filing)), fees_worked_out: view.fees_worked_out ?? true, fees_why: view.fees_why ?? null,
    labels: Object.fromEntries((view.filings ?? []).filter((f) => filings.includes(f.id)).map((f) => [f.id, f.label])) };
}

@Injectable()
export class Submission {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(CasePrepare) private readonly prepare: CasePrepare) {}

  async record(actor: Actor, groupId: string, body: unknown) {
    const g = UUID.test(groupId) ? await this.db.submissionGroup.findUnique({ where: { id: groupId } }) : null;
    if (!g) fail("No such submission group.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, g!.caseId, "officer"); // a client or configuration person: 403
    const b = parse(RecordSubmission, body);
    // B152 (break M3): the answers as read before the view; checked again under the lock, so the fees frozen and the
    // facts filed are read from the same answers (a date of birth given meanwhile: stale, nothing recorded).
    const subjects = c.participants.map((p) => p.subjectId), answersRead = await answersKey(this.db, subjects);
    const view = await this.prepare.view(actor, c.id);
    const group = view.groups.find((x) => x.id === g!.id);
    if (!group) fail("This submission group has no filing on the application now: Reload.", HttpStatus.CONFLICT);
    const want = group!.filings as string[];
    const cover = coverageProblem(want, b.filings.map((f) => f.filing));
    if (cover) refuse("filings", cover);
    // Every field's problem at once (break m on #924: one at a time made a person resubmit for each), each on its field.
    const problems: { field: string; message: string }[] = [];
    const lines = b.filings.map((f, i) => {
      const date = submittedOnProblem(f.submitted_on); // break R2-m3: an earlier submission (a case taken over) is allowed
      if (date) problems.push({ field: `filings.${i}.submitted_on`, message: date });
      const n = numberCheck(f.application_number);
      if ("error" in n) problems.push({ field: `filings.${i}.application_number`, message: n.error });
      return { ...f, application_number: "value" in n ? n.value : "", fee_receipt: f.fee_receipt || null };
    });
    // A UCI for each person applying on the group's filings at most once, in the release's own shape for a UCI.
    const filings = view.filings.filter((f) => want.includes(f.id)) as ViewFiling[];
    const filingOfSubject = new Map(filings.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => [a.subject, f.id] as const)));
    const seen = new Set<string>(), snap = this.r.snapshotOf(c);
    b.ucis.forEach((u, i) => {
      if (!filingOfSubject.has(u.subject)) problems.push({ field: `ucis.${i}.subject`, message: "This person is not applying on this submission group's filings." });
      else if (seen.has(u.subject)) problems.push({ field: `ucis.${i}.subject`, message: "This person's UCI is listed twice." });
      const bad = uciProblem(snap, u.uci);
      if (bad) problems.push({ field: `ucis.${i}.uci`, message: bad });
      seen.add(u.subject);
    });
    if (!problems.length && duplicateInGroup(lines.map((l) => l.application_number))) problems.push({ field: "filings", message: "Two filings of this submission have the same application number: IRCC gives each filing its own." });
    if (problems.length) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: problems.map((x) => x.message).join(" "), errors: problems }, HttpStatus.BAD_REQUEST);
    // BR-15: once only. Then the version read, then Ready to file (BR-11, P-168).
    if (await this.db.filingRecord.count({ where: { filingId: { in: want } } })) refuse("filings", "This submission is already recorded: it is read-only. A wrong application number is fixed with \"Correct a number\".", HttpStatus.CONFLICT);
    if (String(b.version) !== String(view.version)) stale();
    const label = new Map(this.r.peopleOf(c).map((p) => [p.subjectId, p.label]));
    const notReady = filings.filter((f) => (f.status as string) !== "ready_to_file"); // the view says "ready_to_file" from the stored status (C7.6)
    if (notReady.length) refuse("filings", `Record the submission once every filing of this group is Ready to file: ${notReady.map((f) => `${label.get(f.applicants[0]?.subject ?? "") ?? "a person"}'s filing is ${STATUS_WORDS[String(f.status).toLowerCase()] ?? String(f.status).toLowerCase().replace(/_/g, " ")}`).join("; ")}. Nothing was recorded.`, HttpStatus.CONFLICT);
    // B152 (break M2, review M1): a fee still waiting for a fact (a date of birth) would be frozen as waiting for good:
    // the record waits until every fee of the group is worked out.
    const waits = (view.fees ?? []).filter((x) => want.includes(x.filing) && (x as { waiting?: string }).waiting);
    if (waits.length) refuse("filings", `Record the submission once every fee of this group is worked out: ${waits.map((x) => x.reason).join(" ")}`, HttpStatus.CONFLICT);

    // The facts each form is filed with (BR-12), read as the view reads them.
    const s = this.r.snapshotOf(c), people = this.r.peopleOf(c);
    const { answers, rows } = await this.r.state(c);
    // C9 (QA-246, review m1): a form not yet known (in `waiting`, apart from the forms to fill) is recorded as filed too, as before.
    const formsOf = (filing: string): FiledForm[] => ([...view.items, ...((view as { waiting?: unknown[] }).waiting ?? [])] as { id: string; kind: string; filing: string; subject: string; form?: string }[])
      .filter((i) => i.kind === "form" && i.filing === filing && i.form).map((i) => ({ item: i.id, form: i.form!, subject: i.subject, facts: currentValues(formCoverage(s, people, answers, rows, i.form!, i.subject)?.boxes ?? []) }));
    // Break R2-M2: what each form is filed with is read the way "now" is read later (currentValues: the answers as given,
    // confirmed or not), so an answer left unconfirmed at filing never reads as added after it.
    // Break R2-M1: who is on the case and who is travelling, as the view above read them: checked again under the lock.
    const peopleRead = peopleKey(c.participants);
    const portal = (view as { portal?: string | null }).portal ?? null;
    const reviewOf = new Map(((view as { readiness?: { filing: string; reviewed: { by: string; kind: string; at: string } | null }[] }).readiness ?? []).map((x) => [x.filing, x.reviewed]));
    // BK-18 (QA-448): the case's own work record, read once before the lock (never a second connection under it).
    const work = await caseWork(this.db, c.id);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) stale();
      if (peopleKey(await tx.caseParticipant.findMany({ where: liveParticipants(c.id), select: { subjectId: true, role: true, applies: true } })) !== peopleRead) stale();
      if (await answersKey(tx as unknown as AnswerTables, subjects) !== answersRead) stale(); // B152 (break M3)
      if (await tx.filingRecord.count({ where: { filingId: { in: want } } })) refuse("filings", "This submission is already recorded: it is read-only.", HttpStatus.CONFLICT);
      // Only while still Ready to file: a filing changed meanwhile leaves nothing recorded.
      const n = await tx.filing.updateMany({ where: { id: { in: want }, status: "READY_TO_FILE", active: true }, data: { status: "SUBMITTED" } });
      if (n.count !== want.length) refuse("filings", "A filing of this group is no longer Ready to file: Reload. Nothing was recorded.", HttpStatus.CONFLICT);
      // QA-295 (P-155 (1)): who prepared and who reviewed are the ones the filing's review saw, whoever records it.
      const team = await tx.caseTeamMember.findMany({ where: { caseId: c.id }, select: { userId: true, role: true, assignedAt: true, endedAt: true, id: true } });
      for (const l of lines) {
        // The review that counts for Ready to file, as the view read it (review m1: never a stale or earlier one).
        const rv = reviewOf.get(l.filing) ?? null;
        // BK-18 (QA-448, breaker B4): the preparer is the one the case's work record names, as at that review, so this
        // record and Ready to file's never disagree; the case team stands in only when the case holds nobody's work.
        // BK-18 (review 2): a self-review the work record itself shows (the reviewer alone, or nobody's work and the
        // reviewer stood behind it) is recorded as one person's, whatever the stored kind says.
        const prep = preparersOf(work.acts, work.staff, rv?.at ?? null);
        const rec = rv ? reviewRecordOf({ preparers: prep, behind: behindOf(work.acts, work.staff, rv.at), reviewedBy: rv.by, kind: rv.kind }) : null;
        const who = rec?.self ? { preparedBy: rv!.by, reviewedBy: rv!.by } : recordedPeople(rv, team, actor.id, new Date(), prep);
        await tx.filing.update({ where: { id: l.filing }, data: { applicationNumber: l.application_number } });
        await tx.filingRecord.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId: l.filing, submissionGroupId: g!.id, portal, ourReference: l.our_reference, submittedOn: new Date(`${l.submitted_on}T00:00:00Z`),
          applicationNumber: l.application_number, feeReceipt: l.fee_receipt, preparedBy: who.preparedBy, reviewedBy: who.reviewedBy, recordedBy: actor.id, filedFacts: formsOf(l.filing) as object } });
      }
      // B152 (FQ-7): the group's fees as this view showed them, frozen with the record; /prepare reads them back.
      await tx.submissionGroup.update({ where: { id: g!.id }, data: { recordedFees: recordedFeesOf(view, g!.id, want) as object } });
      if (b.ucis.length) await tx.filingPersonRecord.createMany({ data: b.ucis.map((u) => ({ workspaceId: c.workspaceId, filingId: filingOfSubject.get(u.subject)!, subjectId: u.subject, uci: u.uci, recordedBy: actor.id })) });
      // AG-7-95 safety: no application number or UCI in the summary; the detail says which filings.
      await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, "recorded", "submission group", g!.id,
        `On case ${short(c.id)} (${caseName(c)}): ${actor.name} recorded the submission of ${want.length} filing${want.length === 1 ? "" : "s"} to IRCC`, { filings: want, ucis: b.ucis.length });
    }, { timeout: 15_000, maxWait: 10_000 });
    const others = await this.db.filing.findMany({ where: { workspaceId: c.workspaceId, applicationNumber: { in: lines.map((l) => l.application_number) }, NOT: { id: { in: want } }, case: { firmKey: c.firmKey } }, select: { case: { select: { reference: true, caseNumber: true } } } });
    const after = await this.prepare.view(actor, c.id);
    return { group: g!.id, recorded: want, warning: duplicateWarning(others.map((o) => ({ reference: caseName(o.case) }))), filings: after.filings.filter((f) => want.includes(f.id)), version: after.version };
  }

  async correct(actor: Actor, filingId: string, body: unknown) {
    const f = UUID.test(filingId) ? await this.db.filing.findUnique({ where: { id: filingId }, include: { record: true } }) : null;
    if (!f) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    const b = parse(CorrectNumber, body);
    if (!f!.record) refuse("filing", "This filing is not recorded as submitted yet: its number is set on the filing record. Nothing was changed.", HttpStatus.CONFLICT);
    if (b.uci) return this.correctUci(actor, c, f!, b.uci, b.reason);
    const value = numberOf(b.application_number!, "application_number");
    const before = f!.record!.applicationNumber;
    if (value === before) refuse("application_number", "That is the number already recorded: nothing to correct.");
    // Review M2: the rule of recording holds for a correction too: two filings of one submission never share a number.
    const sameGroup = () => this.db.filingRecord.count({ where: { submissionGroupId: f!.record!.submissionGroupId, applicationNumber: value, NOT: { filingId: f!.id } } });
    if (await sameGroup()) refuse("application_number", "Another filing of this submission has that application number: IRCC gives each filing its own.");
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      // The number read is the lock: a correction made meanwhile leaves this one unsaved (409), never overwritten.
      if (await tx.filingRecord.count({ where: { submissionGroupId: f!.record!.submissionGroupId, applicationNumber: value, NOT: { filingId: f!.id } } })) refuse("application_number", "Another filing of this submission has that application number: IRCC gives each filing its own.");
      const n = await tx.filingRecord.updateMany({ where: { filingId: f!.id, applicationNumber: before }, data: { applicationNumber: value } });
      if (n.count !== 1) refuse("application_number", "Someone corrected this number after you read it: Reload, then try again. Nothing was changed.", HttpStatus.CONFLICT);
      await tx.filing.update({ where: { id: f!.id }, data: { applicationNumber: value } });
      await tx.filingRecordCorrection.create({ data: { workspaceId: c.workspaceId, filingId: f!.id, before, after: value, reason: b.reason, correctedBy: actor.id } });
      const person = this.r.peopleOf(c).find((p) => p.subjectId === f!.subjectId)?.label ?? "a person";
      await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, "corrected", "application number", f!.id,
        `On case ${short(c.id)} (${caseName(c)}): ${actor.name} corrected the application number on ${person}'s recorded filing (reason given)`, { before, after: value });
    });
    // Review M2 (EXPERIENCE 8): the same number on another case of the firm warns, as recording and slice 1 do.
    const others = await this.db.filing.findMany({ where: { workspaceId: c.workspaceId, applicationNumber: value, NOT: { id: f!.id }, case: { firmKey: c.firmKey } }, select: { case: { select: { reference: true, caseNumber: true } } } });
    const after = await this.prepare.view(actor, c.id);
    return { filing: after.filings.find((x) => x.id === f!.id), warning: duplicateWarning(others.map((o) => ({ reference: caseName(o.case) }))), version: after.version };
  }

  /** Break M3 on #924: a person's UCI on a recorded filing, added later or corrected, kept with the reason (the old one
   *  in the history). The person must be applying on this filing; the UCI is in the release's shape for a UCI. */
  /** B149: POST /runtime/filings/:id/record/fee-receipt. The fee receipt's evidence (IRCC's "Transaction Approved" page)
   *  on a recorded filing. The bytes decide the kind, never the name; nothing is stored on any refusal. */
  async feeReceipt(actor: Actor, filingId: string, files: Upload[] | undefined) {
    const f = UUID.test(filingId) ? await this.db.filing.findUnique({ where: { id: filingId }, include: { record: true } }) : null;
    if (!f) fail("No such filing.", HttpStatus.NOT_FOUND);
    // A client: 403. Another firm: the same 404 as a filing that does not exist (break m2: never "No such case." for a real one).
    const c = await this.r.reach(actor, f!.caseId, "officer").catch((e: unknown) => { if (e instanceof HttpException && e.getStatus() === HttpStatus.NOT_FOUND) fail("No such filing.", HttpStatus.NOT_FOUND); throw e; });
    if (!f!.record) refuse("filing", "Record the submission first: the fee receipt is kept on the filing's record. Nothing was stored.", HttpStatus.CONFLICT);
    const x = (files ?? []).filter((u) => u.buffer);
    if (x.length !== 1 || x[0].fieldname !== "file") refuse("file", 'Send one file, in the field "file". Nothing was stored.');
    const bytes = x[0].buffer!;
    if (!bytes.length) refuse("file", "The file is empty. Nothing was stored.");
    if (bytes.length > MAX_DOCUMENT_BYTES) refuse("file", `The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const media = mediaOf(bytes);
    if (!media) refuse("file", "Send IRCC's \"Transaction Approved\" page as a PDF, JPEG or PNG (judged by the file itself, not its name). Nothing was stored.", HttpStatus.UNPROCESSABLE_ENTITY);
    const id = randomUUID(), sha256 = createHash("sha256").update(bytes).digest("hex");
    const rel = join("cases", c.id, "fee-receipts", `${id}.${MEDIA[media!]}`), abs = join(RECEIPTS(), rel);
    try {
      mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
      await this.db.feeReceiptFile.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, filingId: f!.id, fileName: cleanName(utf8Name(x[0].originalname)), mediaType: media!, sizeBytes: bytes.length, sha256, path: rel, uploadedBy: actor.id } });
    } catch (e) { rmSync(abs, { force: true }); throw e; } // a refused upload leaves no file behind
    // No receipt number or file name in the summary (AG-7-95 safety, as the record's own line).
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "fee receipt", id, `${actor.name} uploaded the fee receipt (IRCC's Transaction Approved page) of a recorded filing on case ${short(c.id)} (${MEDIA[media!].toUpperCase()}, ${bytes.length} bytes)`, { filing: f!.id });
    const after = await this.prepare.view(actor, c.id);
    return { filing: after.filings.find((y) => y.id === f!.id), version: after.version };
  }

  private async correctUci(actor: Actor, c: Reached, f: { id: string }, u: { subject: string; uci: string }, reason: string) {
    const on = await this.db.filingApplicant.findFirst({ where: { filingId: f.id, subjectId: UUID.test(u.subject) ? u.subject : "00000000-0000-0000-0000-000000000000", mode: "applying" } });
    if (!on) refuse("uci.subject", "This person is not applying on this filing.");
    const bad = uciProblem(this.r.snapshotOf(c), u.uci);
    if (bad) refuse("uci.uci", bad);
    const value = u.uci.trim();
    const was = await this.db.filingPersonRecord.findUnique({ where: { filingId_subjectId: { filingId: f.id, subjectId: u.subject } } });
    if (was && was.uci.replace(/[\s-]+/g, "") === value.replace(/[\s-]+/g, "")) refuse("uci.uci", "That is the UCI already recorded (only spaces or hyphens differ): nothing to correct.");
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      // The UCI read is the lock: a correction made meanwhile leaves this one unsaved (409).
      if (was) { const n = await tx.filingPersonRecord.updateMany({ where: { id: was.id, uci: was.uci }, data: { uci: value } }); if (n.count !== 1) refuse("uci.uci", "Someone corrected this UCI after you read it: Reload, then try again. Nothing was changed.", HttpStatus.CONFLICT); }
      else await tx.filingPersonRecord.create({ data: { workspaceId: c.workspaceId, filingId: f.id, subjectId: u.subject, uci: value, recordedBy: actor.id } }); // unique (filing, person): a second add at once fails
      await tx.filingRecordCorrection.create({ data: { workspaceId: c.workspaceId, filingId: f.id, field: "uci", subjectId: u.subject, before: was?.uci ?? null, after: value, reason, correctedBy: actor.id } });
      const person = this.r.peopleOf(c).find((p) => p.subjectId === u.subject)?.label ?? "a person";
      // Break R2-B1: a case entity ("person"), so the activity feed shows it only to this case's firm (studio.ts
      // CASE_ENTITIES), and no UCI in the line or its detail: the values are kept in filing_record_correction only.
      await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, was ? "corrected" : "added", "person", f.id,
        `On case ${short(c.id)} (${caseName(c)}): ${actor.name} ${was ? "corrected" : "added"} ${person}'s UCI on a recorded filing (reason given)`, { field: "uci", subject: u.subject });
    });
    const after = await this.prepare.view(actor, c.id);
    return { filing: after.filings.find((x) => x.id === f.id), warning: null, version: after.version };
  }
}

@CaseRead()
@Controller("api/runtime")
export class SubmissionController {
  constructor(@Inject(Submission) private readonly x: Submission) {}
  @Patch("groups/:gid/record") record(@Headers("x-actor") a: H, @Param("gid") gid: string, @Body() b: unknown) { return this.x.record(actorOf(a), gid, b); }
  // One byte over 20 MB so a file of exactly 20 MB is taken (as C6.4, C8.1); the route's own check refuses more.
  @Post("filings/:id/record/fee-receipt") @HttpCode(HttpStatus.OK) @UseGuards(CaseActorGuard) @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_DOCUMENT_BYTES + 1, files: 1 } }))
  feeReceipt(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[]) { return this.x.feeReceipt(actorOf(a), id, files); }
  @Post("filings/:id/record/corrections") @HttpCode(HttpStatus.OK) correct(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.correct(actorOf(a), id, b); }
}
