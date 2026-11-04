// C8.2 Record the submission (runtime lane, M3-F; M3-CONTRACT C8.2; r5c BR-11, BR-15, BR-16, BR-21; AV-6, P-155, P-168):
//   PATCH /api/runtime/groups/:gid/record   one action records the whole submission group: per filing our reference, the
//     date it was submitted (not after today), IRCC's application number (required) and the fee receipt; a UCI per person.
//     Refused while a filing of the group is not Ready to file (C7.6; read from the Prepare view, so a filing that is no
//     longer ready is never recorded) and a second time (BR-15). Recording makes the filings read-only (C8.2-9).
//   POST /api/runtime/filings/:id/record/corrections   "Correct a number": the old number stays in the history with the
//     reason, who and when.
// Prepared by is the case officer who records; Reviewed by is the representative of record (P-155). The number's pattern
// is Sample data (samples/filing-numbers.json, as slice 1). Government identifiers never go in an audit summary. US$0.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { CorrectNumber, RecordSubmission } from "../../contracts/submission-record.ts";
import { checkApplicationNumber, duplicateWarning, type NumberRule } from "../../engine/runtime/filing-record.ts";
import { coverageProblem, duplicateInGroup, submittedOnProblem } from "../../engine/runtime/submission-record.ts";
import { formCoverage } from "../../engine/runtime/forms.ts";
import { actorOf, Audit, CaseRead, Db, fail, STUDIO, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";
import { CasePrepare, storedVersion } from "./case-prepare.ts";
import type { FiledForm } from "./submission-record.ts";

type H = string | undefined;
const RULES = JSON.parse(readFileSync(join(STUDIO, "samples", "filing-numbers.json"), "utf8")) as { applicationNumber: NumberRule };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);
/** 400, Problem Details naming the field. */
const refuse = (field: string, detail: string, status = HttpStatus.BAD_REQUEST): never => {
  throw new HttpException({ type: "https://expatready.local/problems/validation", title: status === HttpStatus.CONFLICT ? "Not now" : "Some details need fixing", status, detail, errors: [{ field, message: detail }] }, status);
};
const stale = (): never => refuse("version", "This application changed since you read it. Reload, then record the submission again.", HttpStatus.CONFLICT);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
/** The application number as stored (slice 1's rule); blank or the wrong shape is refused on its field. */
const numberOf = (raw: string, field: string): string => {
  const checked = checkApplicationNumber(raw, RULES.applicationNumber);
  if ("error" in checked) return refuse(field, checked.error);
  return checked.value ?? refuse(field, "Give the application number IRCC gave this filing: it is required to record the submission.");
};
const STATUS_WORDS: Record<string, string> = { not_started: "not started", ready_to_file: "Ready to file", submitted: "recorded as submitted" };
type View = Awaited<ReturnType<CasePrepare["view"]>>;
type ViewFiling = View["filings"][number] & { label?: string };

@Injectable()
export class Submission {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(CasePrepare) private readonly prepare: CasePrepare) {}

  async record(actor: Actor, groupId: string, body: unknown) {
    const g = UUID.test(groupId) ? await this.db.submissionGroup.findUnique({ where: { id: groupId } }) : null;
    if (!g) fail("No such submission group.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, g!.caseId, "officer"); // a client or configuration person: 403
    const b = parse(RecordSubmission, body);
    const view = await this.prepare.view(actor, c.id);
    const group = view.groups.find((x) => x.id === g!.id);
    if (!group) fail("This submission group has no filing on the application now: Reload.", HttpStatus.CONFLICT);
    const want = group!.filings as string[];
    const cover = coverageProblem(want, b.filings.map((f) => f.filing));
    if (cover) refuse("filings", cover);
    const lines = b.filings.map((f, i) => {
      const problem = submittedOnProblem(f.submitted_on);
      if (problem) refuse(`filings.${i}.submitted_on`, problem);
      return { ...f, application_number: numberOf(f.application_number, `filings.${i}.application_number`), fee_receipt: f.fee_receipt || null };
    });
    if (duplicateInGroup(lines.map((l) => l.application_number))) refuse("filings", "Two filings of this submission have the same application number: IRCC gives each filing its own.");
    // A UCI for each person on the group's filings at most once.
    const filings = view.filings.filter((f) => want.includes(f.id)) as ViewFiling[];
    const filingOfSubject = new Map(filings.flatMap((f) => f.applicants.map((a) => [a.subject, f.id] as const)));
    const seen = new Set<string>();
    b.ucis.forEach((u, i) => {
      if (!filingOfSubject.has(u.subject)) refuse(`ucis.${i}.subject`, "This person is not on this submission group's filings.");
      if (seen.has(u.subject)) refuse(`ucis.${i}.subject`, "This person's UCI is listed twice.");
      seen.add(u.subject);
    });
    // BR-15: once only. Then the version read, then Ready to file (BR-11, P-168).
    if (await this.db.filingRecord.count({ where: { filingId: { in: want } } })) refuse("filings", "This submission is already recorded: it is read-only. A wrong application number is fixed with \"Correct a number\".", HttpStatus.CONFLICT);
    if (String(b.version) !== String(view.version)) stale();
    const label = new Map(this.r.peopleOf(c).map((p) => [p.subjectId, p.label]));
    const notReady = filings.filter((f) => (f.status as string) !== "ready_to_file"); // the view says "ready_to_file" from the stored status (C7.6)
    if (notReady.length) refuse("filings", `Record the submission once every filing of this group is Ready to file: ${notReady.map((f) => `${label.get(f.applicants[0]?.subject ?? "") ?? "a person"}'s filing is ${STATUS_WORDS[String(f.status).toLowerCase()] ?? String(f.status).toLowerCase().replace(/_/g, " ")}`).join("; ")}. Nothing was recorded.`, HttpStatus.CONFLICT);

    // The facts each form is filed with (BR-12), read as the view reads them.
    const s = this.r.snapshotOf(c), people = this.r.peopleOf(c);
    const { answers, rows } = await this.r.state(c);
    const formsOf = (filing: string): FiledForm[] => (view.items as { id: string; kind: string; filing: string; subject: string; form?: string }[])
      .filter((i) => i.kind === "form" && i.filing === filing && i.form).map((i) => ({ item: i.id, form: i.form!, subject: i.subject, facts: formCoverage(s, people, answers, rows, i.form!, i.subject)?.facts ?? [] }));
    const portal = (view as { portal?: string | null }).portal ?? null;
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) stale();
      if (await tx.filingRecord.count({ where: { filingId: { in: want } } })) refuse("filings", "This submission is already recorded: it is read-only.", HttpStatus.CONFLICT);
      // Only while still Ready to file: a filing changed meanwhile leaves nothing recorded.
      const n = await tx.filing.updateMany({ where: { id: { in: want }, status: "READY_TO_FILE", active: true }, data: { status: "SUBMITTED" } });
      if (n.count !== want.length) refuse("filings", "A filing of this group is no longer Ready to file: Reload. Nothing was recorded.", HttpStatus.CONFLICT);
      const rep = await tx.caseTeamMember.findFirst({ where: { caseId: c.id, role: "LEAD_REPRESENTATIVE", endedAt: null }, orderBy: [{ assignedAt: "desc" }, { id: "asc" }] });
      for (const l of lines) {
        await tx.filing.update({ where: { id: l.filing }, data: { applicationNumber: l.application_number } });
        await tx.filingRecord.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId: l.filing, submissionGroupId: g!.id, portal, ourReference: l.our_reference, submittedOn: new Date(`${l.submitted_on}T00:00:00Z`),
          applicationNumber: l.application_number, feeReceipt: l.fee_receipt, preparedBy: actor.id, reviewedBy: rep?.userId ?? null, recordedBy: actor.id, filedFacts: formsOf(l.filing) as object } });
      }
      if (b.ucis.length) await tx.filingPersonRecord.createMany({ data: b.ucis.map((u) => ({ workspaceId: c.workspaceId, filingId: filingOfSubject.get(u.subject)!, subjectId: u.subject, uci: u.uci, recordedBy: actor.id })) });
      // AG-7-95 safety: no application number or UCI in the summary; the detail says which filings.
      await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, "recorded", "submission group", g!.id,
        `On case ${short(c.id)} (${c.reference}): ${actor.name} recorded the submission of ${want.length} filing${want.length === 1 ? "" : "s"} to IRCC`, { filings: want, ucis: b.ucis.length });
    }, { timeout: 15_000, maxWait: 10_000 });
    const others = await this.db.filing.findMany({ where: { workspaceId: c.workspaceId, applicationNumber: { in: lines.map((l) => l.application_number) }, NOT: { id: { in: want } }, case: { firmKey: c.firmKey } }, select: { case: { select: { reference: true } } } });
    const after = await this.prepare.view(actor, c.id);
    return { group: g!.id, recorded: want, warning: duplicateWarning(others.map((o) => o.case)), filings: after.filings.filter((f) => want.includes(f.id)), version: after.version };
  }

  async correct(actor: Actor, filingId: string, body: unknown) {
    const f = UUID.test(filingId) ? await this.db.filing.findUnique({ where: { id: filingId }, include: { record: true } }) : null;
    if (!f) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    const b = parse(CorrectNumber, body);
    if (!f!.record) refuse("filing", "This filing is not recorded as submitted yet: its number is set on the filing record. Nothing was changed.", HttpStatus.CONFLICT);
    const value = numberOf(b.application_number, "application_number");
    const before = f!.record!.applicationNumber;
    if (value === before) refuse("application_number", "That is the number already recorded: nothing to correct.");
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      // The number read is the lock: a correction made meanwhile leaves this one unsaved (409), never overwritten.
      const n = await tx.filingRecord.updateMany({ where: { filingId: f!.id, applicationNumber: before }, data: { applicationNumber: value } });
      if (n.count !== 1) refuse("application_number", "Someone corrected this number after you read it: Reload, then try again. Nothing was changed.", HttpStatus.CONFLICT);
      await tx.filing.update({ where: { id: f!.id }, data: { applicationNumber: value } });
      await tx.filingRecordCorrection.create({ data: { workspaceId: c.workspaceId, filingId: f!.id, before, after: value, reason: b.reason, correctedBy: actor.id } });
      const person = this.r.peopleOf(c).find((p) => p.subjectId === f!.subjectId)?.label ?? "a person";
      await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, "corrected", "application number", f!.id,
        `On case ${short(c.id)} (${c.reference}): ${actor.name} corrected the application number on ${person}'s recorded filing (reason given)`, { before, after: value });
    });
    const after = await this.prepare.view(actor, c.id);
    return { filing: after.filings.find((x) => x.id === f!.id), version: after.version };
  }
}

@CaseRead()
@Controller("api/runtime")
export class SubmissionController {
  constructor(@Inject(Submission) private readonly x: Submission) {}
  @Patch("groups/:gid/record") record(@Headers("x-actor") a: H, @Param("gid") gid: string, @Body() b: unknown) { return this.x.record(actorOf(a), gid, b); }
  @Post("filings/:id/record/corrections") @HttpCode(HttpStatus.OK) correct(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.correct(actorOf(a), id, b); }
}
