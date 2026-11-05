// C1.3 + C11.5 (P-106, stand-in SI-10): the Sample employer cases (samples/employer-cases.json, an import file,
// STANDARDS §3.1) and the link a worker's case keeps to one of them. The link is not a table (tech lead's ruling on
// #1051, Q3): it is the "relied on employer case" audit event written with the copies, in the team's CaseLink words
// (AG-7-53 §7: from case, to case, kind, status, created by and at), so AG-07's record can replace it one for one.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EmployerCase } from "../../engine/runtime/employer.ts";
import { STUDIO, type Db } from "./core.ts";

export const EMPLOYER_CASES = (JSON.parse(readFileSync(join(STUDIO, "samples", "employer-cases.json"), "utf8")) as { employerCases: EmployerCase[] }).employerCases;
/** BR-7: a firm's own employer cases only. */
export const employerCasesOf = (firmKey: string) => EMPLOYER_CASES.filter((e) => e.firm === firmKey);

/** The audit action of a link; the team's event is "opened from linked file" (SA-1B-283 §9). */
export const RELIED_ON = "relied on employer case";
export type Linked = { from_case: string; to_case: string; label: string; kind: "worker_permit"; status: "ACTIVE"; created_by: string; created_at: string; facts: string[] };

/** The case's link, if it has one (created once, then read-only: SA-1B-283 §6). */
export async function linkedOf(db: Pick<Db, "auditEvent">, workspaceId: string, caseId: string): Promise<Linked | null> {
  const e = await db.auditEvent.findFirst({ where: { workspaceId, entity: "case", entityKey: caseId, action: RELIED_ON }, orderBy: { at: "asc" } });
  return e ? (e.detail as unknown as Linked) : null;
}
