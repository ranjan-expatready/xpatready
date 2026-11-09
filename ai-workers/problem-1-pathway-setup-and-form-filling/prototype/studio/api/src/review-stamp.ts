// C8.3 Representative review, QA-345 (screens lane, B144 follow-up; the tech lead's ruling (a), 9 Nov 18:35 IST): an
// approval stamps the file it approved. When an approval stamped no validated copy (no file, or the generated copy), the
// first validated copy read back for the facts it approved is stamped to it, in the read-back's own transaction
// (api/src/fill-case.ts validated); an approval not stamped so is asked again where that copy counts for filing
// (engine/runtime/review.ts fileStampCurrent). Its own module: fill-case.ts cannot import review-rounds.ts (that reads
// case-prepare.ts, which reads fill-case.ts). Legal points: Unconfirmed: no counsel.
import { readBackStamps } from "../../engine/runtime/review.ts";
import type { Actor, Db } from "./core.ts";

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

/** QA-345 (the tech lead's ruling (a), 9 Nov: an approval stamps the file it approved): inside a validated copy's
 *  read-back transaction (api/src/fill-case.ts validated), each approval of that form whose stamp holds no validated
 *  copy is stamped, once, with the copy read back, when readBackStamps allows it, with an audit line. An approval it
 *  does not stamp is asked again where that copy counts for filing (fileStampCurrent). The database allows only this
 *  one change to a written stamp (migration 20261109190000_qa345_stamp_read_back). */
export async function stampReadBack(tx: Tx, x: { workspaceId: string; caseId: string; subjectId: string; formNumber: string; readFacts: string; sha256: string; actor: Actor }) {
  const rows = await tx.reviewRoundForm.findMany({ where: { caseId: x.caseId, subjectId: x.subjectId, formNumber: x.formNumber, stampedAt: { not: null }, stampFileKind: { in: ["none", "generated_copy"] } },
    select: { id: true, filingId: true, stampFileKind: true, stampSnapshot: { select: { inputHash: true } }, round: { select: { id: true, number: true } }, row: { select: { filingRound: true, status: true, representative: true } } } });
  if (!rows.length) return [];
  const rep = (await tx.caseTeamMember.findFirst({ where: { caseId: x.caseId, role: "LEAD_REPRESENTATIVE", endedAt: null }, select: { userId: true } }))?.userId ?? null;
  const stamped: string[] = [];
  for (const f of rows) {
    const latest = !(await tx.reviewRoundFiling.findFirst({ where: { filingId: f.filingId, filingRound: { gt: f.row.filingRound } }, select: { id: true } }));
    if (!readBackStamps({ stampKind: f.stampFileKind, approved: f.row.status === "approved", latest, by: f.row.representative, representative: rep, stampedFacts: f.stampSnapshot?.inputHash ?? null, readFacts: x.readFacts })) continue;
    await tx.reviewRoundForm.update({ where: { id: f.id }, data: { stampFileKind: "validated_copy", stampFileSha256: x.sha256 } });
    await tx.auditEvent.create({ data: { workspaceId: x.workspaceId, actor: x.actor.id, action: "review_stamp_file", entity: "review round", entityKey: f.round.id,
      summary: `${x.actor.name} read back the validated copy of ${x.formNumber} on case ${x.caseId.slice(0, 8)}: stamped to the approval of round ${f.round.number}, which stamped ${f.stampFileKind === "none" ? "no file" : "the copy made from these facts"} (QA-345)`.slice(0, 600),
      detail: { case: x.caseId, form: x.formNumber, subject: x.subjectId, round_form: f.id, was: f.stampFileKind, file_kind: "validated_copy", file_sha256: x.sha256 } } });
    stamped.push(f.id);
  }
  return stamped;
}
