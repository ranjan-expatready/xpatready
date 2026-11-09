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
import type { CaseTaskView } from "../../contracts/submission-record.ts";
import type { RecordWithReceipts } from "../../contracts/fee-receipt.ts";
import type { FormFact } from "../../engine/runtime/forms.ts";
import { changedSince, filedEarlierWords } from "../../engine/runtime/submission-record.ts";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
/** One form as it was filed (filing_record.filed_facts). */
export type FiledForm = { item: string; form: string; subject: string; facts: Pick<FormFact, "box" | "fact" | "about" | "value">[] };

export const nameOf = (id: string | null | undefined) => (id ? RUNTIME_ACTORS.find((a) => a.id === id)?.name ?? id : null);
const day = (d: Date) => d.toISOString().slice(0, 10);

/** C8.2-9: 409 when any of these filings is recorded as submitted (it is read-only; a number is changed by a correction). */
export async function refuseIfRecorded(q: Db | Tx, filingIds: string[], what: string) {
  if (!filingIds.length) return;
  const n = await q.filingRecord.count({ where: { filingId: { in: filingIds } } });
  if (n) throw new HttpException({ type: "https://expatready.local/problems/recorded", title: "Recorded as submitted", status: 409,
    detail: `This application is recorded as submitted to IRCC, so it is read-only: ${what} is not changed. A wrong application number is fixed with "Correct a number".`, errors: [{ field: "filing", message: "Recorded as submitted: read-only." }] }, HttpStatus.CONFLICT);
}

/** C8.2-9 (review M1): once any filing of a case is recorded, its people are not changed (added, or marked travelling or
 *  not): either would add a filing to a recorded submission or drop a recorded one from the view. */
export async function refuseIfCaseRecorded(q: Db | Tx, caseId: string, what: string) {
  if (await q.filingRecord.count({ where: { caseId } })) throw new HttpException({ type: "https://expatready.local/problems/recorded", title: "Recorded as submitted", status: 409,
    detail: `This application is recorded as submitted to IRCC, so its people are not changed: ${what}. A new applicant goes on a new case.`, errors: [{ field: "case", message: "Recorded as submitted: read-only." }] }, HttpStatus.CONFLICT);
}

type ViewFiling = { id: string; status: string; number?: string | null; applicants: { subject: string; mode?: string }[] };
type ViewItem = { id: string; kind: string; filing: string; subject: string; form?: string; state: string; reason?: string };
type Fact = { box: string; fact: string; about: string; value: unknown };

/** Adds each recorded filing's record to the Prepare view (in place), marks forms filed with an earlier value, keeps their
 *  tasks in step (one open task per form: opened, its words updated, closed when the form is current again), and returns
 *  the case's tasks. `nowOf` is the form's boxes as answered now (currentValues); `labelOf` a fact's question words. */
export async function recordedOverlay(db: Db, a: { workspaceId: string; caseId: string; actor: string; filings: ViewFiling[]; items: ViewItem[]; label: Map<string, string>;
  nowOf: (form: string, subject: string) => Fact[]; labelOf: (fact: string) => string }): Promise<CaseTaskView[]> {
  const ids = a.filings.map((f) => f.id);
  // One read, no transaction (C6.12 break B1: 120 reads of one case at once must all answer; a second transaction per
  // read ran the pool out): each filing with its status, record, UCIs and corrections.
  const stored = ids.length ? await db.filing.findMany({ where: { id: { in: ids } }, select: { id: true, status: true,
    // B149: each record with its fee receipt uploads, oldest first (the newest is the receipt).
    record: { include: { feeReceipts: { orderBy: [{ uploadedAt: "asc" }, { id: "asc" }], select: { id: true, fileName: true, mediaType: true, sizeBytes: true, uploadedBy: true, uploadedAt: true } } } },
    personRecords: { orderBy: [{ recordedAt: "asc" }, { id: "asc" }] }, corrections: { orderBy: [{ correctedAt: "asc" }, { id: "asc" }] } } }) : [];
  const changed = new Map<string, { filing: string; words: string }>(), current = new Set<string>();
  for (const f of a.filings) {
    const row = stored.find((x) => x.id === f.id), rec = row?.record;
    if (!rec) { if (row?.status === "READY_TO_FILE") f.status = "ready_to_file"; continue; }
    const person = (s: string | null) => (s ? a.label.get(s) ?? "a person" : null);
    const applying = f.applicants.filter((x) => (x.mode ?? "applying") === "applying").map((x) => x.subject);
    const view: RecordWithReceipts = {
      portal: rec.portal, our_reference: rec.ourReference, submitted_on: day(rec.submittedOn), application_number: rec.applicationNumber, fee_receipt: rec.feeReceipt,
      fee_receipt_files: rec.feeReceipts.map((x) => ({ id: x.id, file_name: x.fileName, media_type: x.mediaType, size_bytes: x.sizeBytes, uploaded_by: nameOf(x.uploadedBy)!, uploaded_at: x.uploadedAt.toISOString() })),
      prepared_by: { id: rec.preparedBy, name: nameOf(rec.preparedBy)! },
      // P-155: the solo firm's one person reviews their own filing: "Self-reviewed".
      reviewed_by: rec.reviewedBy ? { id: rec.reviewedBy, name: nameOf(rec.reviewedBy)!, self: rec.reviewedBy === rec.preparedBy } : null,
      recorded_by: nameOf(rec.recordedBy)!, recorded_at: rec.recordedAt.toISOString(),
      ucis: [...new Set([...applying, ...row!.personRecords.map((u) => u.subjectId)])].map((subject) => ({ subject, person: a.label.get(subject) ?? "", uci: row!.personRecords.find((u) => u.subjectId === subject)?.uci ?? null })),
      corrections: row!.corrections.map((x) => ({ field: x.field as "application_number" | "uci", person: person(x.subjectId), before: x.before, after: x.after, reason: x.reason, by: nameOf(x.correctedBy)!, at: x.correctedAt.toISOString() })),
    };
    Object.assign(f, { status: "submitted", number: rec.applicationNumber, record: view, read_only: true });
    // BR-12 (P-142 D7): each form filed with this filing, against its answers now.
    for (const filed of (rec.filedFacts as unknown as FiledForm[])) {
      const item = a.items.find((i) => i.id === filed.item);
      if (!item) continue;
      const facts = changedSince(filed.facts, a.nowOf(filed.form, filed.subject));
      Object.assign(item, { filed: { on: day(rec.submittedOn), current: !facts.length } });
      if (!facts.length) { current.add(item.id); continue; }
      const words = filedEarlierWords(filed.form, a.label.get(filed.subject) ?? "a person", facts.map((x) => ({ label: a.labelOf(x.fact), person: a.label.get(x.about.split("/")[0]) ?? "a person" })), day(rec.submittedOn));
      Object.assign(item, { state: "out_of_date", reason: words, changed_facts: facts.map((x) => ({ fact: x.fact, subject: x.about.split("/")[0] })) });
      changed.set(item.id, { filing: f.id, words });
    }
  }
  if (changed.size || current.size) {
    const open = await db.caseTask.findMany({ where: { caseId: a.caseId, stage: { state: "CURRENT" }, kind: "after_filing_change", state: "open" } });
    // One open task per form and kind (a partial unique index): a read that finds the change again adds nothing.
    const fresh = [...changed].filter(([item]) => !open.some((t) => t.itemId === item));
    // C6.17 (challenge M3): a task belongs to the stage current when it is made (a write on an ended stage is refused).
    const stageId = fresh.length ? (await db.caseStage.findFirst({ where: { caseId: a.caseId, state: "CURRENT" }, select: { id: true } }))?.id : undefined;
    if (fresh.length && stageId) await db.caseTask.createMany({ data: fresh.map(([item, x]) => ({ workspaceId: a.workspaceId, caseId: a.caseId, stageId, filingId: x.filing, itemId: item, kind: "after_filing_change", words: x.words, createdBy: a.actor })), skipDuplicates: true });
    // Break M4 on #924: an open task says the change as it stands now, and closes itself when the form is current again.
    for (const t of open) {
      const now = changed.get(t.itemId ?? "");
      if (now && now.words !== t.words) await db.caseTask.updateMany({ where: { id: t.id, state: "open" }, data: { words: now.words } });
      if (!now && t.itemId && current.has(t.itemId)) await db.caseTask.updateMany({ where: { id: t.id, state: "open" }, data: { state: "done", doneBy: "rules", doneAt: new Date() } });
    }
  }
  const tasks = await db.caseTask.findMany({ where: { caseId: a.caseId, stage: { state: "CURRENT" } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return tasks.map((t) => ({ id: t.id, kind: t.kind as "after_filing_change", filing: t.filingId, item: t.itemId, words: t.words, state: t.state as "open" | "done", created_at: t.createdAt.toISOString(), done: t.doneAt ? { by: t.doneBy === "rules" ? "Closed by itself: the form's answers are as filed again" : nameOf(t.doneBy) ?? "", at: t.doneAt.toISOString() } : null }));
}
