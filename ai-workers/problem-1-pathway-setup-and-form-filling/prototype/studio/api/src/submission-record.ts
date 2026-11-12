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
  // C6.17 (review M1): only a record on the case's current stage: an ended stage's record never freezes the next application.
  if (await q.filingRecord.count({ where: { caseId, filing: { stage: { state: "CURRENT" } } } })) throw new HttpException({ type: "https://expatready.local/problems/recorded", title: "Recorded as submitted", status: 409,
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

/** A filing row kept as stored (BK-17): one recorded as submitted (status SUBMITTED), with its people as stored and its
 *  label as recorded (null for a record made before BK-17, which stored none); or (`recorded: false`, label null) the
 *  unrecorded application a person is on when a later answer would move them onto a recorded one, which takes nobody. */
export type RecordedRow = { id: string; subjectId: string; submissionGroupId: string; mode: string; label: string | null; recorded?: boolean; applicants: { subjectId: string; role: string; mode: string }[] };
type Derived = { id: string; combination: string; label: string; mode: string; owner?: { subject: string; label: string; role: string }; applicants: { subject: string; label: string; role: string; mode: string }[]; group: string; status: string; number: string | null };
type Group = { id: string; kind: "family" | "separate"; label: string; filings: string[]; splittable: boolean; why: string; totals: unknown[]; total_cents: number | null };

/** The people on kept rows (their owners and applicants): the ones a derivation never moves (BK-17). */
export const heldBy = (rows: RecordedRow[]) => new Set(rows.flatMap((r) => [r.subjectId, ...r.applicants.map((x) => x.subjectId)]));

/** The labels "Record the submission" stores with a group (recorded_fees.labels, BK-17), by stored filing id. */
export const recordedLabels = (groups: { recordedFees: unknown }[]) => new Map(groups.flatMap((g) => Object.entries(((g.recordedFees ?? {}) as { labels?: Record<string, string> }).labels ?? {})));

/** BK-17 (BK-15 breaker M3): a filing recorded as submitted reads as it was recorded, whatever the answers say now: its
 *  label, its mode, its group and its people (applying or declared only) are the stored ones. A person on a recorded
 *  filing stays on it: no other filing gains them and none is made for them. A recorded filing the derivation no longer
 *  makes (an answer moved its owner onto another application) is still listed. Filings match by their owner, as they are
 *  stored. `idOf` gives a filing the derivation does not make its id in the caller's ids; groups follow the filings. */
export function keepRecorded<F extends Derived, G extends Group>(d: { filings: F[]; groups: G[] }, recorded: RecordedRow[], a: { labelOf: (subject: string) => string; combination: string; combinationLabel: string; idOf: (row: RecordedRow) => string; kindOf: (group: string) => "family" | "separate" }): { filings: F[]; groups: G[] } {
  if (!recorded.length) return d;
  const byOwner = new Map(recorded.map((r) => [r.subjectId, r]));
  const held = new Set(recorded.flatMap((r) => [r.subjectId, ...r.applicants.map((x) => x.subjectId)]));
  const asRecorded = (r: RecordedRow, f?: F): F => ({ ...(f ?? { status: "NOT_STARTED", number: null }), id: f?.id ?? a.idOf(r), combination: f?.combination ?? a.combination,
    // Break re-check: a kept unrecorded application the derivation no longer makes has no document decided by today's
    // answers: it says so (never the combination's name as if it were its document).
    label: r.label ?? f?.label ?? (r.recorded === false ? `Application kept as prepared: ${a.labelOf(r.subjectId)}` : `${a.combinationLabel}: ${a.labelOf(r.subjectId)}`), mode: r.mode, group: r.submissionGroupId,
    owner: { subject: r.subjectId, label: a.labelOf(r.subjectId), role: r.applicants.find((x) => x.subjectId === r.subjectId)?.role ?? f?.owner?.role ?? "principal" },
    applicants: r.applicants.map((x) => ({ subject: x.subjectId, label: a.labelOf(x.subjectId), role: x.role, mode: x.mode })) }) as F;
  const filings = d.filings.flatMap((f) => { const r = byOwner.get(f.owner?.subject ?? ""); return r ? [asRecorded(r, f)] : held.has(f.owner?.subject ?? "") ? [] : [{ ...f, applicants: f.applicants.filter((x) => !held.has(x.subject)) }]; });
  for (const r of recorded) if (!d.filings.some((f) => f.owner?.subject === r.subjectId)) filings.push(asRecorded(r));
  const groups = [...d.groups, ...[...new Set(recorded.map((r) => r.submissionGroupId))].filter((g) => !d.groups.some((x) => x.id === g))
    .map((id) => ({ id, kind: a.kindOf(id), label: "One submission", filings: [], splittable: false, why: KEPT_WHY, totals: [], total_cents: null }) as unknown as G)];
  // Break B3, review m1: a group with a recorded filing, or whose people differ from the derivation's (someone kept on a
  // recorded filing taken off it), is named by the people applying on its filings as kept; a recorded one says it reads
  // as recorded (never the derived group's count or reason, which follow today's answers).
  const recordedIds = new Set(recorded.filter((r) => r.recorded !== false).map((r) => r.subjectId));
  const applyingOn = (fs: { applicants: { subject: string; mode: string }[] }[]) => new Set(fs.flatMap((f) => f.applicants.filter((x) => x.mode === "applying").map((x) => x.subject)));
  return { filings, groups: groups.map((g) => {
    const mine = filings.filter((f) => f.group === g.id), applying = applyingOn(mine), derived = applyingOn(d.filings.filter((f) => g.filings.includes(f.id)));
    const isRecorded = mine.some((f) => recordedIds.has(f.owner?.subject ?? "")), differs = applying.size !== derived.size || [...applying].some((x) => !derived.has(x));
    const label = applying.size <= 1 ? "One submission" : `One submission for ${applying.size} people applying`;
    return { ...g, filings: mine.map((f) => f.id), ...(isRecorded ? { label, why: RECORDED_WHY } : differs ? { label } : {}) };
  }).filter((g) => g.filings.length) };
}
const RECORDED_WHY = "Recorded as submitted to IRCC: it reads as it was recorded.";
const KEPT_WHY = "Kept as prepared: an answer would move its applicant onto an application already recorded as submitted, which takes nobody.";

/** BK-17 (break B4, review m3): a derived fee line is shown only on a filing its person is on in the view (its owner or
 *  an applicant). When a person is kept on a recorded filing but the derivation charges them on another, unrecorded
 *  group, that group's lines and totals counted them (a family maximum, who pays it): its fees are not worked out here,
 *  in words, never a wrong total (BR-10, nothing is guessed). Recorded groups read their frozen fees (B152) as before. */
export function feesOnTheirFilings<L, G extends { id: string; filings: string[]; totals: unknown[]; total_cents: number | null; why: string }>(lines: L[], groups: G[], filings: { id: string; owner?: { subject: string }; applicants: { subject: string }[] }[],
  a: { filing: (l: L) => string; person: (l: L) => string; frozen: (group: string) => boolean; labelOf: (subject: string) => string; held: Set<string> }): { lines: L[]; groups: G[] } {
  const on = (l: L) => { const f = filings.find((x) => x.id === a.filing(l)); return !!f && (f.owner?.subject === a.person(l) || f.applicants.some((x) => x.subject === a.person(l))); };
  // Only a person kept on a recorded filing is "off" (break re-check): with nothing recorded the derived lines stand.
  const off = lines.filter((l) => filings.some((f) => f.id === a.filing(l)) && !on(l) && a.held.has(a.person(l)));
  const hit = new Map<string, string[]>();
  for (const l of off) { const g = groups.find((x) => x.filings.includes(a.filing(l))); if (g && !a.frozen(g.id)) hit.set(g.id, [...new Set([...(hit.get(g.id) ?? []), a.labelOf(a.person(l))])]); }
  if (!off.length) return { lines: lines.filter((l) => filings.some((f) => f.id === a.filing(l))), groups };
  return { lines: lines.filter((l) => { const f = filings.find((x) => x.id === a.filing(l)); if (!f) return false; const g = groups.find((x) => x.filings.includes(f.id)); return !off.includes(l) && !(g && hit.has(g.id)); }),
    groups: groups.map((g) => hit.has(g.id) ? { ...g, totals: [], total_cents: null, why: `Fees not worked out here: ${hit.get(g.id)!.join(" and ")} ${hit.get(g.id)!.length > 1 ? "are" : "is"} on an application already recorded as submitted, so this submission's fees cannot be counted with them; nothing is guessed.` } : g) };
}

type StoredRow = { id: string; subjectId: string; submissionGroupId: string; mode: string; status: string; active?: boolean; applicants: { subjectId: string; role: string; mode: string }[] };
const rowOf = (r: StoredRow, label: string | null, recorded: boolean): RecordedRow => ({ id: r.id, subjectId: r.subjectId, submissionGroupId: r.submissionGroupId, mode: r.mode, label, recorded, applicants: r.applicants.map((x) => ({ subjectId: x.subjectId, role: x.role, mode: x.mode })) });

/** The recorded rows among a case's stored filing rows, each with its label as recorded (BK-17). */
export const recordedRowsOf = (rows: StoredRow[], groups: { recordedFees: unknown }[]): RecordedRow[] => {
  const labels = recordedLabels(groups);
  return rows.filter((r) => r.status === "SUBMITTED").map((r) => rowOf(r, labels.get(r.id) ?? null, true));
};

/** BK-17: the stored rows a derivation never changes: the recorded ones, and (break B1) the unrecorded application each
 *  person stays on whom the derivation would put on a recorded filing they are not on (a submitted application takes
 *  nobody), so nobody is left on no filing and the stage still names that application as not recorded. One reading for
 *  the stored rows (case-prepare.ts sync), GET …/prepare and GET …/filings. */
export function keptRowsOf(derived: { owner?: { subject: string }; applicants: { subject: string; mode: string }[] }[], rows: StoredRow[], groups: { recordedFees: unknown }[]): RecordedRow[] {
  const rec = recordedRowsOf(rows, groups);
  if (!rec.length) return rec;
  const owners = new Set(rec.map((r) => r.subjectId)), held = new Set(rec.flatMap((r) => [r.subjectId, ...r.applicants.map((x) => x.subjectId)]));
  const moved = new Set(derived.filter((f) => owners.has(f.owner?.subject ?? "")).flatMap((f) => f.applicants.filter((a) => a.mode === "applying" && !held.has(a.subject)).map((a) => a.subject)));
  const stay = rows.filter((r) => r.status !== "SUBMITTED" && r.active !== false && !held.has(r.subjectId) && r.applicants.some((a) => a.mode === "applying" && moved.has(a.subjectId)));
  return [...rec, ...stay.map((r) => rowOf(r, null, false))];
}
