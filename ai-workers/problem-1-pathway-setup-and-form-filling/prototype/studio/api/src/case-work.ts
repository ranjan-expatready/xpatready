// BK-18 (QA-448, from qa's walk 1 step S8; P-525 (1), P-510 (4), P-154, P-155 (1)): the case's own work record — who
// prepared its filings. Read from what the case holds, never from the case team's membership list: a case officer
// assigned to a case who did nothing is not its preparer, and a representative who did the work and approved it alone is
// recorded "Self-reviewed", never as a second person's review. The rules are engine/runtime/preparers.ts.
// One read per case (a UNION of the tables that keep who did what, plus the case's audit lines as the catch-all the
// backlog row names), grouped to one row per person with their earliest act, so the result is a handful of rows however
// big the case is. Reading and reviewing are not work: a round of kind `one_step` or `reapprove` is the review itself.
// Opening the case and sending a filing for review come back marked `weak` — not preparing it, but standing behind it
// when the case holds nobody's real work (engine/runtime/preparers.ts; review B1, M1).
import { preparersOf, type WorkAct } from "../../engine/runtime/preparers.ts";
import { firmByKey } from "./firms.ts";
import type { Db } from "./core.ts";

/** Audit actions that are not preparing: reading, the review itself, and lines the product writes rather than a person.
 *  A denylist, never a list of allowed actions: an act added later must count as work, because a record that leaves a
 *  second person out claims one person worked alone, which is the untruth this row exists to stop. */
const NOT_WORK = ["read", "viewed", "reviewed", "self_reviewed", "approved", "sent_back", "withdrawn", "review_stamp_file",
  // the review's own steps; sending for review comes back as a weak act from the round itself, never from here
  "sent_for_review", "review_now", "review_opened", "review_sent_back",
  "ready_to_file_reopened", "loaded", "reset", "seeded", "failed", "cancelled"];

export type CaseWork = { acts: WorkAct[]; staff: (id: string) => boolean };

/** Every act the case holds, with who did it and when they first did it. Known limit: the grain is the case, not the
 *  filing, so a filing names everyone who worked on its case (QA-295, review m2); and work seeded straight into the
 *  database by the demo loader carries no author, so such a case names only the people who worked on it afterwards. */
export async function caseWork(db: Db, caseId: string): Promise<CaseWork> {
  const c = await db.case.findUnique({ where: { id: caseId }, select: { firmKey: true } });
  if (!c) return { acts: [], staff: () => false };
  const rows = await db.$queryRaw<{ actor: string | null; at: Date | null; weak: boolean }[]>`
    SELECT w.actor, w.weak, MIN(w.at) AS at FROM (
      SELECT a.source_json->>'actor' AS actor, a.effective_at AS at, FALSE AS weak FROM client_canonical_answer a JOIN case_participant p ON p.subject_id = a.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT a.verified_by, a.verified_at, FALSE FROM client_canonical_answer a JOIN case_participant p ON p.subject_id = a.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT g.source_json->>'actor', g.effective_at, FALSE FROM client_group_answer g JOIN case_participant p ON p.subject_id = g.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT r.source_json->>'actor', r.effective_at, FALSE FROM client_fact_record r JOIN case_participant p ON p.subject_id = r.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT d.uploaded_by, d.uploaded_at, FALSE FROM case_document d JOIN case_participant p ON p.subject_id = d.subject_id WHERE p.case_id = ${caseId}::uuid
      UNION ALL SELECT e.entered_by, e.entered_at, FALSE FROM entered_section e WHERE e.case_id = ${caseId}::uuid
      UNION ALL SELECT k.opened_by, k.opened_at, FALSE FROM answer_check k WHERE k.case_id = ${caseId}::uuid
      UNION ALL SELECT k.resolved_by, k.resolved_at, FALSE FROM answer_check k WHERE k.case_id = ${caseId}::uuid
      UNION ALL SELECT l.state_by, l.state_at, FALSE FROM checklist_line l WHERE l.case_id = ${caseId}::uuid
      UNION ALL SELECT l.providers_by, l.providers_at, FALSE FROM checklist_line l WHERE l.case_id = ${caseId}::uuid
      UNION ALL SELECT rr.sent_by, rr.sent_at, TRUE FROM review_round rr WHERE rr.case_id = ${caseId}::uuid AND rr.kind IN ('send', 'review_now')
      UNION ALL SELECT k.created_by, k.created_at, TRUE FROM runtime_case k WHERE k.id = ${caseId}::uuid
      UNION ALL SELECT rp.passed_by, rp.passed_at, FALSE FROM readiness_pass rp JOIN filing f ON f.id = rp.filing_id WHERE f.case_id = ${caseId}::uuid
      UNION ALL SELECT ae.actor, ae.at, FALSE FROM audit_event ae WHERE (ae.entity_key = ${caseId} OR ae.detail->>'case' = ${caseId})
        AND NOT (ae.action = 'opened' AND ae.entity = 'case') AND NOT (ae.action = ANY(${NOT_WORK}::text[]))
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
