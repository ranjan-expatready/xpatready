// Which activity lines a firm's staff may read (C6.11 review Major 1; P-278; QA-225): their own firm's case lines, and
// configuration lines. Before QA-225 the rule knew case lines only by a list of entities, and every case entity left off
// it reached every firm (on main 4 Nov: "sign step" and "signed scan", C8.1; "case document", C6.4; "checklist line";
// the eligibility "assessment" and "assessment_override"). Now it fails closed:
//   * a line that names cases ("case <first 8 of the id>", any case of letters, or the "case" entity keyed by the case
//     id) is read only when every case it names is the firm's own;
//   * a line that names no case is read only when its entity is a known configuration entity; an entity on neither
//     list (a new one, a typo) is read by no firm's staff until it is listed.
// Configuration people (review duty) read every line; that is decided in studio.ts, not here.
//   tests/check_case_feed.ts checks the rule and sweeps every audit line the API writes: each entity is on one list,
//   and each line whose words name a case uses a case entity.

/** The audit entities written by case work (runtime.ts, fill-case.ts, team.ts, sign-steps.ts, case-checklist.ts,
 *  case-prepare.ts, assessments.ts, filing-record.ts, findings.ts). */
export const CASE_ENTITIES: ReadonlySet<string> = new Set([
  "case", "person", "case fact", "row", "group", "section", "form copy", "item", "submission group", "application number" /* C8.2 */,
  "sign step", "signed scan" /* C8.1 */, "case document" /* C6.4 */, "checklist line", "assessment", "assessment_override",
]);
/** The audit entities written by configuration work. "section" is a case entity too (a case's sections), so it is never
 *  read here without a case: the configuration "section" lines stay with the configuration people. */
export const CONFIG_ENTITIES: ReadonlySet<string> = new Set([
  "AI draft", "AI proposal", "AI work", "PDF", "alias", "answer key", "answer list", "answer-key family", "answer-key tests", "check",
  "checklist draft", "combination", "configuration row", "configuration", "configured checkpoint", "demo story", "demo workspace",
  "document requirement", "document type", "edition impact AI", "eligibility", "fact source", "field draft", "field merge", "field",
  "form field", "form finder", "form library", "form line", "form", "held file", "library batch", "line batch", "list purpose",
  "masters draft", "new edition", "official page", "option map", "option maps", "pack", "people", "placement", "pre-qualification",
  "proposals", "questions and documents", "release", "reviewed release", "rule fact", "rule", "sample inputs", "section selection",
  "source entry", "source", "structure", "upload",
  "pathway", "program", "category", "sub-category" /* structure levels, structure.ts and studio.ts */,
]);
/** A configuration entity: listed, or a library item's ("library field", "library document type", review-proposals.ts). */
export const isConfigEntity = (entity: string) => !CASE_ENTITIES.has(entity) && (CONFIG_ENTITIES.has(entity) || entity.startsWith("library "));

type Line = { entity: string; entityKey: string | null; summary: string };
const NAMED = /\bcase[\s -]+([0-9a-f]{8})\b/gi;

/** Every case a line names (first 8 characters, lower case); none for a configuration line. */
export function casesOf(e: Line): string[] {
  const ids = [...e.summary.matchAll(NAMED)].map((m) => m[1].toLowerCase());
  if (e.entity === "case" && e.entityKey) ids.push(e.entityKey.slice(0, 8).toLowerCase());
  return [...new Set(ids)];
}

/** May staff of a firm whose cases start with `own` read this line? */
export function firmMayRead(e: Line, own: ReadonlySet<string>): boolean {
  const ids = casesOf(e);
  if (ids.length) return ids.every((id) => own.has(id));   // a line that also names another firm's case is not read (break m2)
  return isConfigEntity(e.entity);   // no case named: only a known configuration line (break M1: never fail open)
}
