// BK-18 (QA-448, from qa's walk 1 step S8; P-525 (1), P-510 (4), P-154, P-155 (1)): the case's own work record — who
// prepared its filings. Read from what the case holds, never from the case team's membership list: a case officer
// assigned to a case who did nothing is not its preparer, and a representative who did the work and approved it alone is
// recorded "Self-reviewed", never as a second person's review. The rules are engine/runtime/preparers.ts.
// Two reads per case: who opened it, and who typed or confirmed its facts (one grouped row per person, not per answer).
import { preparersOf, type WorkAct } from "../../engine/runtime/preparers.ts";
import { firmByKey } from "./firms.ts";
import type { Db } from "./core.ts";

/** Known limit, said here so the record is read for what it is: a person whose only act on the case was uploading a
 *  document or ticking an online section is not named yet (their work leaves no case-wide author row), and answers
 *  seeded by the demo loader carry no author at all, so such a case names the person who opened it. */
export async function preparersOfCase(db: Db, caseId: string): Promise<string[]> {
  const c = await db.case.findUnique({ where: { id: caseId }, select: { createdBy: true, createdAt: true, firmKey: true } });
  if (!c) return [];
  const typed = await db.$queryRaw<{ actor: string | null; at: Date | null }[]>`
    SELECT a.source_json->>'actor' AS actor, MIN(a.effective_at) AS at
    FROM client_canonical_answer a JOIN case_participant p ON p.subject_id = a.subject_id
    WHERE p.case_id = ${caseId}::uuid AND a.source_json->>'actor' IS NOT NULL GROUP BY 1`;
  const firm = firmByKey(c.firmKey);
  const staff = (id: string) => !!firm?.users.some((u) => u.id === id);
  const acts: WorkAct[] = [{ actor: c.createdBy, at: c.createdAt }, ...typed.map((t) => ({ actor: t.actor ?? "", at: t.at }))];
  return preparersOf(acts, staff);
}
