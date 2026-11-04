// C8.2 Record the submission (runtime lane, M3-F; r5c BR-12, BR-15, BR-21; P-142 D7, P-155, P-168): what the Prepare
// view and the other case writes read of a recorded submission. No routes here (api/src/submission.ts has them), so
// case-prepare.ts, filing-record.ts and submission.ts can all import it without a cycle.
//   * recordedOverlay: a recorded filing reads "submitted" with its number and its record (Prepared by · Reviewed by,
//     UCIs, corrections); a form filed with a fact that changed since reads "Filed with an earlier value" and opens one
//     `after_filing_change` task (BR-12; Unconfirmed: no counsel). Before C7.6 (#861) is on main, a filing whose stored
//     status is READY_TO_FILE reads "ready_to_file" here (C7.6's own view does the same once merged).
//   * refuseIfRecorded: the read-only lock (C8.2-9): a recorded filing is never changed (channel, split, entered, number).
import { HttpException, HttpStatus } from "@nestjs/common";
import { RUNTIME_ACTORS, type Db } from "./core.ts";
import type { CaseTaskView, FilingRecordView } from "../../contracts/submission-record.ts";
import type { FormFact } from "../../engine/runtime/forms.ts";
import { changedSince, filedEarlierWords } from "../../engine/runtime/submission-record.ts";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
/** One form as it was filed (filing_record.filed_facts). */
export type FiledForm = { item: string; form: string; subject: string; facts: FormFact[] };

export const nameOf = (id: string | null | undefined) => (id ? RUNTIME_ACTORS.find((a) => a.id === id)?.name ?? id : null);
const day = (d: Date) => d.toISOString().slice(0, 10);

/** C8.2-9: 409 when any of these filings is recorded as submitted (it is read-only; a number is changed by a correction). */
export async function refuseIfRecorded(q: Db | Tx, filingIds: string[], what: string) {
  if (!filingIds.length) return;
  const n = await q.filingRecord.count({ where: { filingId: { in: filingIds } } });
  if (n) throw new HttpException({ type: "https://expatready.local/problems/recorded", title: "Recorded as submitted", status: 409,
    detail: `This application is recorded as submitted to IRCC, so it is read-only: ${what} is not changed. A wrong application number is fixed with "Correct a number".`, errors: [{ field: "filing", message: "Recorded as submitted: read-only." }] }, HttpStatus.CONFLICT);
}

type ViewFiling = { id: string; status: string; number?: string | null; applicants: { subject: string }[] };
type ViewItem = { id: string; kind: string; filing: string; subject: string; form?: string; state: string; reason?: string };

/** Adds each recorded filing's record to the Prepare view (in place), marks forms filed with an earlier value, opens
 *  their tasks once, and returns the case's tasks. `factsOf` is the form's facts now (formCoverage, as at recording). */
export async function recordedOverlay(db: Db, a: { workspaceId: string; caseId: string; actor: string; filings: ViewFiling[]; items: ViewItem[]; label: Map<string, string>;
  factsOf: (form: string, subject: string) => FormFact[] }): Promise<CaseTaskView[]> {
  const ids = a.filings.map((f) => f.id);
  // One read, no transaction (C6.12 break B1: 120 reads of one case at once must all answer; a second transaction per
  // read ran the pool out): each filing with its status, record, UCIs and corrections.
  const stored = ids.length ? await db.filing.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, record: true,
    personRecords: { orderBy: [{ recordedAt: "asc" }, { id: "asc" }] }, corrections: { orderBy: [{ correctedAt: "asc" }, { id: "asc" }] } } }) : [];
  const statusOf = new Map(stored.map((f) => [f.id, f.status]));
  const records = stored.flatMap((f) => (f.record ? [f.record] : [])), ucis = stored.flatMap((f) => f.personRecords), corrections = stored.flatMap((f) => f.corrections);
  const changed: { filing: string; item: string; words: string }[] = [];
  for (const f of a.filings) {
    const rec = records.find((r) => r.filingId === f.id);
    if (!rec) { if (statusOf.get(f.id) === "READY_TO_FILE") f.status = "ready_to_file"; continue; }
    const view: FilingRecordView = {
      portal: rec.portal, our_reference: rec.ourReference, submitted_on: day(rec.submittedOn), application_number: rec.applicationNumber, fee_receipt: rec.feeReceipt,
      prepared_by: { id: rec.preparedBy, name: nameOf(rec.preparedBy)! }, reviewed_by: rec.reviewedBy ? { id: rec.reviewedBy, name: nameOf(rec.reviewedBy)! } : null,
      recorded_by: nameOf(rec.recordedBy)!, recorded_at: rec.recordedAt.toISOString(),
      ucis: ucis.filter((u) => u.filingId === f.id).map((u) => ({ subject: u.subjectId, person: a.label.get(u.subjectId) ?? "", uci: u.uci })),
      corrections: corrections.filter((x) => x.filingId === f.id).map((x) => ({ before: x.before, after: x.after, reason: x.reason, by: nameOf(x.correctedBy)!, at: x.correctedAt.toISOString() })),
    };
    Object.assign(f, { status: "submitted", number: rec.applicationNumber, record: view, read_only: true });
    // BR-12 (P-142 D7): each form filed with this filing, against its facts now.
    for (const filed of (rec.filedFacts as unknown as FiledForm[])) {
      const item = a.items.find((i) => i.id === filed.item);
      if (!item) continue;
      const facts = changedSince(filed.facts, a.factsOf(filed.form, filed.subject));
      Object.assign(item, { filed: { on: day(rec.submittedOn), current: !facts.length } });
      if (!facts.length) continue;
      const words = filedEarlierWords(filed.form, a.label.get(filed.subject) ?? "a person", facts.map((x) => ({ fact: x.fact, person: a.label.get(x.about.split("/")[0]) ?? "a person" })), day(rec.submittedOn));
      Object.assign(item, { state: "out_of_date", reason: words, changed_facts: facts.map((x) => ({ fact: x.fact, subject: x.about.split("/")[0] })) });
      changed.push({ filing: f.id, item: item.id, words });
    }
  }
  // One open task per form and kind (a partial unique index): a read that finds the change again adds nothing.
  if (changed.length) await db.caseTask.createMany({ data: changed.map((x) => ({ workspaceId: a.workspaceId, caseId: a.caseId, filingId: x.filing, itemId: x.item, kind: "after_filing_change", words: x.words, createdBy: a.actor })), skipDuplicates: true });
  const tasks = await db.caseTask.findMany({ where: { caseId: a.caseId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return tasks.map((t) => ({ id: t.id, kind: t.kind as "after_filing_change", filing: t.filingId, item: t.itemId, words: t.words, state: t.state as "open" | "done", created_at: t.createdAt.toISOString() }));
}
