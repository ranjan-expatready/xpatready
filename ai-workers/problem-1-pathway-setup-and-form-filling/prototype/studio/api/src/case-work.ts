// BK-18 (QA-448, from qa's walk 1 step S8; P-525 (1), P-510 (4), P-154, P-155 (1)): the case's own work record — who
// prepared its filings. Read from what the case holds, never from the case team's membership list: a case officer
// assigned to a case who did nothing is not its preparer, and a representative who did the work and approved it alone is
// recorded "Self-reviewed", never as a second person's review. The rules are engine/runtime/preparers.ts.
// One read per case: a UNION of every table that keeps who did what, plus the case's audit lines as the catch-all the
// backlog row names, grouped to one row per person and kind, so the result is a handful of rows however big the case is.
// Reading, reviewing (the review's steps and its findings) and case administration are not work; opening the case and
// sending a filing for review come back marked `weak`, which never names a preparer (review 2 B1, M1; review 3 B1).
import { preparersOf, type WorkAct } from "../../engine/runtime/preparers.ts";
import { firmByKey } from "./firms.ts";
import type { Db } from "./core.ts";

/** Audit actions that are not preparing: reading, the review's own steps, the demo loader's lines, and changes to the
 *  case team or the representative of record, which are administration, not work on the filings (review 2 M3).
 *  A denylist, never a list of allowed actions: an act added later must count as work, because a record that leaves a
 *  second person out claims one person worked alone, which is the untruth this row exists to stop. */
const NOT_WORK = ["read", "viewed", "reviewed", "self_reviewed", "approved", "sent_back", "withdrawn", "review_stamp_file",
  // the review's own steps; sending for review comes back as a weak act from the round itself, never from here
  "sent_for_review", "review_now", "review_opened", "review_sent_back",
  // who may work on the case, not work on it
  "representative_changed", "officer_assigned", "officer_ended",
  // saying the work is done is not doing it (the review stands behind Ready to file, C7.6)
  "ready_to_file", "ready_to_file_reopened",
  "loaded", "reset", "seeded", "failed", "cancelled"];
/** Review findings (C7.10) are the review looking at the work, never the work: added by hand, acknowledged, waived or
 *  dismissed, each logged against the case itself (api/src/findings.ts). Their actions are words other acts use too —
 *  "added" is also a person added to the case — so they are left out by action *and* entity (review 3 B1). */
const NOT_WORK_ON_CASE = ["added", "acknowledged", "waived", "dismissed"];

export type CaseWork = { acts: WorkAct[]; staff: (id: string) => boolean };

/** Every act the case holds, with who did it and when they first did it. Known limit: the grain is the case, not the
 *  filing, so a filing names everyone who worked on its case (QA-295, review m2); and work seeded straight into the
 *  database by the demo loader carries no author, so such a case names only the people who worked on it afterwards. */
export async function caseWork(db: Db, caseId: string): Promise<CaseWork> {
  const c = await db.case.findUnique({ where: { id: caseId }, select: { firmKey: true } });
  if (!c) return { acts: [], staff: () => false };
  const rows = await db.$queryRaw<{ actor: string | null; weak: boolean; at: Date | null }[]>`
    SELECT w.actor, w.weak, MIN(w.at) AS at FROM (
      -- the facts: typed, confirmed, checked against a document, "none apply", rows added
      SELECT a.source_json->>'actor' AS actor, a.effective_at AS at, FALSE AS weak FROM client_canonical_answer a JOIN case_participant p ON p.subject_id = a.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT a.verified_by, a.verified_at, FALSE FROM client_canonical_answer a JOIN case_participant p ON p.subject_id = a.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT g.source_json->>'actor', g.effective_at, FALSE FROM client_group_answer g JOIN case_participant p ON p.subject_id = g.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT g.verified_by, g.verified_at, FALSE FROM client_group_answer g JOIN case_participant p ON p.subject_id = g.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT r.source_json->>'actor', r.effective_at, FALSE FROM client_fact_record r JOIN case_participant p ON p.subject_id = r.subject_id WHERE p.case_id = ${caseId}::uuid
      -- the documents and the checklist
      UNION ALL SELECT d.uploaded_by, d.uploaded_at, FALSE FROM case_document d JOIN case_participant p ON p.subject_id = d.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT dr.read_by, dr.read_at, FALSE FROM document_review dr WHERE dr.case_id = ${caseId}::uuid
      UNION ALL SELECT dr.confirmed_by, dr.confirmed_at, FALSE FROM document_review dr WHERE dr.case_id = ${caseId}::uuid
      UNION ALL SELECT l.state_by, l.state_at, FALSE FROM checklist_line l WHERE l.case_id = ${caseId}::uuid
      UNION ALL SELECT l.providers_by, l.providers_at, FALSE FROM checklist_line l WHERE l.case_id = ${caseId}::uuid
      UNION ALL SELECT k.opened_by, k.opened_at, FALSE FROM answer_check k WHERE k.case_id = ${caseId}::uuid
      UNION ALL SELECT k.resolved_by, k.resolved_at, FALSE FROM answer_check k WHERE k.case_id = ${caseId}::uuid
      UNION ALL SELECT rv.corrected_by, rv.corrected_at, FALSE FROM read_value rv WHERE rv.case_id = ${caseId}::uuid
      -- the forms: copies made and locked, validated copies read back, forms added or removed, signing, fee receipts
      UNION ALL SELECT fi.created_by, fi.created_at, FALSE FROM form_instance fi WHERE fi.case_id = ${caseId}::uuid
      UNION ALL SELECT fi.locked_by, fi.locked_at, FALSE FROM form_instance fi WHERE fi.case_id = ${caseId}::uuid
      UNION ALL SELECT vc.read_by, vc.read_at, FALSE FROM validated_copy vc JOIN form_instance fi ON fi.id = vc.form_instance_id WHERE fi.case_id = ${caseId}::uuid
      UNION ALL SELECT fa.added_by, fa.added_at, FALSE FROM filing_form_addition fa WHERE fa.case_id = ${caseId}::uuid
      UNION ALL SELECT fa.removed_by, fa.removed_at, FALSE FROM filing_form_addition fa WHERE fa.case_id = ${caseId}::uuid
      UNION ALL SELECT ss.done_by, ss.done_at, FALSE FROM sign_step ss WHERE ss.case_id = ${caseId}::uuid
      UNION ALL SELECT sc.uploaded_by, sc.uploaded_at, FALSE FROM signed_scan sc WHERE sc.case_id = ${caseId}::uuid
      UNION ALL SELECT e.entered_by, e.entered_at, FALSE FROM entered_section e WHERE e.case_id = ${caseId}::uuid
      UNION ALL SELECT fr.uploaded_by, fr.uploaded_at, FALSE FROM fee_receipt_file fr WHERE fr.case_id = ${caseId}::uuid
      UNION ALL SELECT fc.changed_by, fc.changed_at, FALSE FROM filing_change fc WHERE fc.case_id = ${caseId}::uuid
      UNION ALL SELECT ct.created_by, ct.created_at, FALSE FROM case_task ct WHERE ct.case_id = ${caseId}::uuid
      UNION ALL SELECT ct.done_by, ct.done_at, FALSE FROM case_task ct WHERE ct.case_id = ${caseId}::uuid
      UNION ALL SELECT rp.passed_by, rp.passed_at, FALSE FROM readiness_pass rp JOIN filing f ON f.id = rp.filing_id WHERE f.case_id = ${caseId}::uuid
      -- everything else a person did on the case that its audit lines hold
      UNION ALL SELECT ae.actor, ae.at, FALSE FROM audit_event ae WHERE (
          ae.entity_key = ${caseId} OR ae.detail->>'case' = ${caseId}
          -- lines a person's act leaves against one of the case's own things (review 3 M1: how a form is filed, a
          -- section unticked, a filing split out) carry that thing's id, never the case's
          OR ae.entity_key IN (SELECT i.id::text FROM filing_item i WHERE i.case_id = ${caseId}::uuid)
          OR ae.entity_key IN (SELECT f.id::text FROM filing f WHERE f.case_id = ${caseId}::uuid)
          OR ae.entity_key IN (SELECT sg.id::text FROM submission_group sg WHERE sg.case_id = ${caseId}::uuid))
        AND NOT (ae.action = 'opened' AND ae.entity = 'case') AND NOT (ae.action = ANY(${NOT_WORK}::text[]))
        AND NOT (ae.entity = 'case' AND ae.action = ANY(${NOT_WORK_ON_CASE}::text[]))
      -- stood behind it without preparing it: opened the case, sent a filing for review
      UNION ALL SELECT rr.sent_by, rr.sent_at, TRUE FROM review_round rr WHERE rr.case_id = ${caseId}::uuid AND rr.kind IN ('send', 'review_now')
      UNION ALL SELECT o.created_by, o.created_at, TRUE FROM runtime_case o WHERE o.id = ${caseId}::uuid
    ) w WHERE w.actor IS NOT NULL GROUP BY w.actor, w.weak`;
  const firm = firmByKey(c.firmKey);
  const staff = (id: string) => !!firm?.users.some((u) => u.id === id);
  return { acts: rows.map((r) => ({ actor: r.actor ?? "", at: r.at, weak: !!r.weak })), staff };
}

/** Who had prepared this case's filings by `until` (the review's own time; now when left out). */
export async function preparersOfCase(db: Db, caseId: string, until?: Date | string | null): Promise<string[]> {
  const w = await caseWork(db, caseId);
  return preparersOf(w.acts, w.staff, until);
}
