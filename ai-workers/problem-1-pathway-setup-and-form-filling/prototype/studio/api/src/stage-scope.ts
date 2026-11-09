// C6.17 A multi-stage case (B139; concept BR-9, BR-10; challenge B1, B3, M3, M4): the few shared reads that keep every
// case route on the case's CURRENT stage. A case reads only its current stage's pins and its own application subject
// (Runtime.reach); rows a stage owns (filings, groups, checklist lines, findings, tasks) are read by stage; writes that
// re-check the pin under the case's row lock also re-check the stage (a "Start next stage" moves the case's combination).
import type { Db } from "./core.ts";

type Tx = Pick<Db, "case" | "packWorkPin">;

/** The case's people as stored, without the application subjects of stages that are not current (challenge B3): each
 *  worked stage has its own "The application" participant; only the current one is on the case now. */
export const liveParticipants = (caseId: string) => ({ caseId, OR: [{ role: { not: "case" } }, { subject: { stage: { state: "CURRENT" } } }] });

/** The newest pin revision of the case's current stage, read again (under the caller's lock): null when the case moved to
 *  another stage since `combinationId` was read, so a re-check comparing revisions refuses the write (BR-10). */
export async function newestPin(tx: Tx, caseId: string, combinationId: string): Promise<{ revision: number } | null> {
  const k = await tx.case.findUnique({ where: { id: caseId }, select: { combinationId: true } });
  if (k?.combinationId !== combinationId) return null;
  return tx.packWorkPin.findFirst({ where: { caseId, combinationId }, orderBy: { revision: "desc" }, select: { revision: true } });
}
