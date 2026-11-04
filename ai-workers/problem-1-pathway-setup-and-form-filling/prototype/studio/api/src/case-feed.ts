// Which activity lines a firm's staff may read (C6.11 review Major 1; P-278): configuration lines, and their own firm's
// case lines only. A case line names its case as "case <first 8 of its id>" in its words (or is the "case" entity with the
// case id as key). Before this file the rule knew case lines only by a list of entities, and every case entity left off it
// reached every firm (on main 4 Nov: "sign step" and "signed scan", C8.1; "case document", C6.4; "checklist line"; the
// eligibility "assessment" and "assessment_override"). Now a line that names a case is a case line whatever its entity,
// so a new case entity never leaks; the list stays for case lines whose words name no case.
//   tests/check_case_feed.ts checks the rule and that every audit line written with "case <id>" uses a listed entity.

/** The audit entities written by case work (runtime.ts, fill-case.ts, team.ts, sign-steps.ts, case-checklist.ts,
 *  person-checklist.ts, assessments.ts, filing-record.ts). */
export const CASE_ENTITIES: ReadonlySet<string> = new Set([
  "case", "person", "case fact", "row", "group", "section", "form copy", "item", "submission group", "application number" /* C8.2 */,
  "sign step", "signed scan" /* C8.1 */, "case document" /* C6.4 */, "checklist line", "assessment", "assessment_override",
]);

type Line = { entity: string; entityKey: string | null; summary: string };
const NAMED = /\bcase ([0-9a-f]{8})\b/;

/** The case a line belongs to (its first 8 characters), or null for a configuration line. A case-entity line that names
 *  no case comes back as "" (belongs to no firm: never shown to firm staff). */
export function caseOf(e: Line): string | null {
  if (e.entity === "case" && e.entityKey) return e.entityKey.slice(0, 8);
  const named = NAMED.exec(e.summary)?.[1];
  if (named) return named;
  return CASE_ENTITIES.has(e.entity) ? "" : null;
}

/** May staff of a firm whose cases start with `own` read this line? */
export const firmMayRead = (e: Line, own: ReadonlySet<string>) => { const id = caseOf(e); return id === null || (!!id && own.has(id)); };
