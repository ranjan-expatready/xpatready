// C8.2 filing record, slice 1 (runtime lane, M3-F; the team's AG-07 AG-7-95; tech lead on #509 Q4 and #541): the case
// officer reads a case's filing record (our reference, each filing's application number, each applicant's UCI) and
// sets, changes or clears a filing's application number. The UCI is the person's own `person.uci` answer (the person's
// facts, SH3 R5 person scope; versioned with its history): it is read here, never copied. No migration
// (`Filing.applicationNumber` exists). The pattern is Sample data (samples/filing-numbers.json). Recording the submission
// per group (AG-7-31, pack 4's C8.2 test) waits for Ready to file (L-SA3, held). US$0.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Put } from "@nestjs/common";
import { SetApplicationNumber as SetNumber } from "../../contracts/filing-record.ts";
import { checkApplicationNumber, duplicateWarning, normaliseNumber, type NumberRule } from "../../engine/runtime/filing-record.ts";
import { actorOf, Audit, CaseRead, Db, fail, STUDIO, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";
import { refuseIfRecorded } from "./submission-record.ts";
import { caseName } from "../../contracts/runtime.ts"; // A24-1: the reference, else the case number

type H = string | undefined;
const RULES = JSON.parse(readFileSync(join(STUDIO, "samples", "filing-numbers.json"), "utf8")) as { basis: string; applicationNumber: NumberRule };
const UCI = "person.uci";

@Injectable()
export class FilingRecord {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** GET /runtime/cases/:id/filing-record: our reference, each active filing with its number and its applicants' UCIs. */
  async read(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    const label = new Map(this.r.peopleOf(c).map((p) => [p.subjectId, p.label]));
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id, active: true }, include: { applicants: true }, orderBy: { createdAt: "asc" } });
    const subjects = [...new Set(filings.flatMap((f) => f.applicants.map((a) => a.subjectId)))];
    const ucis = subjects.length ? await this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: UCI, supersededById: null, rowKey: null } }) : [];
    const uciOf = new Map(ucis.map((u) => [u.subjectId, typeof u.valueJson === "string" ? u.valueJson : null]));
    return {
      case_id: c.id, our_reference: caseName(c), basis: RULES.basis, number_shape: { words: RULES.applicationNumber.words, example: RULES.applicationNumber.example },
      filings: filings.map((f) => ({ id: f.id, person: label.get(f.subjectId) ?? "", application_number: f.applicationNumber,
        applicants: f.applicants.map((a) => ({ subject: a.subjectId, person: label.get(a.subjectId) ?? "", uci: uciOf.get(a.subjectId) ?? null })) })),
      ...(filings.length ? {} : { note: "No filings are worked out yet: open Prepare application first." }),
    };
  }

  /** PUT /runtime/filings/:id/application-number { value, before }: set, change or clear (AG-7-95 rules 1, 4, 7). */
  async setNumber(actor: Actor, filingId: string, body: unknown) {
    const f = /^[0-9a-f-]{36}$/i.test(filingId) ? await this.db.filing.findUnique({ where: { id: filingId } }) : null;
    if (!f) fail("No such filing.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, f!.caseId, "officer");
    if (!f!.active) fail("This filing is not on the application now (the person is not applying), so its number is not changed.", HttpStatus.CONFLICT);
    const parsed = SetNumber.safeParse(body);
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Send { value, before }.");
    const checked = checkApplicationNumber(parsed.data!.value, RULES.applicationNumber);
    if ("error" in checked) fail(checked.error, HttpStatus.UNPROCESSABLE_ENTITY);
    const value = (checked as { value: string | null }).value;
    // Breaker m3 on #553: "before" is read as the number is stored (blank = none; case, spaces and hyphens ignored).
    const before = parsed.data!.before ? normaliseNumber(parsed.data!.before) || null : null; // "-" or " - " is no number too
    if (before !== (f!.applicationNumber ?? null)) fail("Someone changed this filing's application number after you read it: read the filing record again, then try again. Nothing was saved.", HttpStatus.CONFLICT);
    const others = value ? await this.db.filing.findMany({ where: { workspaceId: f!.workspaceId, applicationNumber: value, NOT: { id: f!.id }, case: { firmKey: c.firmKey } }, select: { caseId: true, case: { select: { reference: true, caseNumber: true } } } }) : [];
    if (value !== (f!.applicationNumber ?? null)) {
      const person = this.r.peopleOf(c).find((p) => p.subjectId === f!.subjectId)?.label ?? "a person";
      const did = value ? (f!.applicationNumber ? "changed" : "added") : "cleared";
      // The number and its audit line are one change (Devin on #553): both or neither.
      await this.db.$transaction(async (tx) => {
        // The old value is the lock: a change made meanwhile leaves nothing updated (409), never overwritten.
        // C8.2-9: once the submission is recorded, the number changes only through "Correct a number" (kept with its reason).
        // Devin on #924: under the case's row lock, as recording takes it, so a record committed meanwhile is always seen.
        await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
        await refuseIfRecorded(tx as unknown as Db, [f!.id], "the application number (use Correct a number)");
        const n = await tx.filing.updateMany({ where: { id: f!.id, applicationNumber: f!.applicationNumber }, data: { applicationNumber: value } });
        if (n.count !== 1) fail("Someone changed this filing's application number after you read it: read the filing record again, then try again. Nothing was saved.", HttpStatus.CONFLICT);
        // Government identifiers stay out of the summary line (AG-7-95 safety); the audit detail keeps before and after.
        // "case <first 8 of its id>" lets the activity feed show the line to this firm only (case-feed.ts). It
        // comes first, before any name a person typed, so a name that reads "case 1234abcd" cannot be taken for it (Devin).
        await new Audit(tx as unknown as Db).log(c.workspaceId, actor.id, did, "application number", f!.id,
          `On case ${c.id.slice(0, 8)} (${caseName(c)}): ${actor.name} ${did} the application number on ${person}'s filing`, { before: f!.applicationNumber, after: value });
      });
    }
    // Breaker m2 on #553: the same number on this case's own other filing says so, never "Already on case <this case>".
    const sameCase = others.some((o) => o.caseId === c.id), elsewhere = others.filter((o) => o.caseId !== c.id).map((o) => ({ reference: caseName(o.case) }));
    const warning = [sameCase ? "Already on another filing of this case." : null, duplicateWarning(elsewhere)].filter(Boolean).join(" ") || null;
    return { ...(await this.read(actor, c.id)), warning };
  }
}

@CaseRead()
@Controller("api/runtime")
export class FilingRecordController {
  constructor(@Inject(FilingRecord) private readonly x: FilingRecord) {}
  @Get("cases/:id/filing-record") read(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.read(actorOf(a), id); }
  @Put("filings/:id/application-number") setNumber(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.setNumber(actorOf(a), id, b); }
}
