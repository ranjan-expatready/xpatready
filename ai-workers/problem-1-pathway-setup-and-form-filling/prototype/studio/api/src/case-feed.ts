// Which activity lines a firm's staff may read (C6.11 review Major 1; P-278; QA-225): their own firm's case lines, and
// configuration lines. Before QA-225 the rule knew case lines only by a list of entities, and every case entity left off
// it reached every firm (on main 4 Nov: "sign step" and "signed scan", C8.1; "case document", C6.4; "checklist line";
// the eligibility "assessment" and "assessment_override"). Now it fails closed:
//   * a line that names a case — the "case" entity keyed by the case id, else the first "case <first 8 of the id>" in its
//     words (any case of letters, "case-" or a no-break space too) — is read only by that case's firm. The first marker
//     wins, as decided on #553 (filing-record.ts writes it first, so a typed name such as "Sample case ffffffff" after it
//     is never taken for it);
//   * a line that names no case is read only when its entity is a known configuration entity; an entity on neither
//     list (a new one, a typo) is read by no firm's staff until it is listed.
// Configuration people (review duty) read every line; that is decided in studio.ts, not here.
//   tests/check_case_feed.ts checks the rule and sweeps every audit line the API writes: each entity is on one list,
//   and each line whose words name a case uses a case entity.

/** The audit entities written by case work (runtime.ts, fill-case.ts, team.ts, sign-steps.ts, case-checklist.ts,
 *  case-prepare.ts, readiness.ts, assessments.ts, filing-record.ts, findings.ts). */
export const CASE_ENTITIES: ReadonlySet<string> = new Set([
  "case", "person", "case fact", "row", "group", "section", "form copy", "item", "submission group", "application number" /* C8.2 */, "fee receipt" /* C8.2 B149 */,
  "sign step", "signed scan" /* C8.1 */, "case document" /* C6.4 */, "answer check" /* C6.5: a typed-versus-document check */, "checklist line", "assessment", "assessment_override",
  "filing" /* C7.6 readiness and review, readiness.ts and case-prepare.ts (#861) */,
  "person link" /* C6.16: an adult's own link (send, code, take back, privacy), person-link.ts */,
  "filing form" /* C7.8 a library form added to one filing, or removed: form-additions.ts */,
  "review round" /* C8.3 representative review, review-rounds.ts: each line names its case */,
]);
/** The audit entities written by configuration work. "section" is a case entity too (a case's sections), so it is never
 *  read here without a case: the configuration "section" lines stay with the configuration people. */
export const CONFIG_ENTITIES: ReadonlySet<string> = new Set([
  "AI draft", "AI proposal", "AI work", "PDF", "alias", "answer key", "answer list", "answer-key family", "answer-key tests", "check",
  "checklist draft", "combination", "configuration row", "configuration", "configured checkpoint", "finished story", "demo story", "demo workspace",
  "document requirement", "document type", "shared field", "edition impact AI", "eligibility", "fact source", "field draft", "field merge", "field",
  "form field", "form finder", "form library", "form line", "form", "held file", "library batch", "line batch", "list purpose",
  "masters draft", "new edition", "official page", "option map", "option maps", "pack", "people", "placement", "pre-qualification",
  "proposals", "questions and documents", "release", "reviewed release", "rule fact", "rule", "sample inputs", "section selection",
  "source entry", "source", "structure", "upload",
  "form edition" /* C7.6 accepted-until date of an edition, readiness.ts (#861) */,
  "placement step" /* placing a form's parts into sections, form-part-placements.ts (#936) */,
  "worked-out value" /* B102 (A6): a fact worked out from library dates instead of asked, worked-out.ts */,
  "pathway", "program", "category", "sub-category" /* structure levels, structure.ts and studio.ts */,
]);
/** The audit entities written by the platform (PF-3 onwards: a firm's settings, later its staff and plan). A platform line
 *  names a firm, never a case, so no firm's case feed reads it (firmMayRead: not a case line, not a configuration line;
 *  on CONFIG_ENTITIES every firm would read another firm's setting changes). The platform's own timeline reads these by
 *  firm (AUD-1's firm_id; front office's activity view, contracts §7). */
export const PLATFORM_ENTITIES: ReadonlySet<string> = new Set([
  "platform_firm_setting" /* PF-3 a firm's setting changed, platform/settings.ts */,
  "platform_staff", "platform_invitation" /* PF-4 staff, roles, licence records, sessions, invitations, platform/identity/audit.ts (Lead 43 OK on #1744) */,
]);
/** A configuration entity: listed, or a library change's ("library field", "library document_type", "library section" …;
 *  review-proposals.ts, screen02.ts). */
export const isConfigEntity = (entity: string) => !CASE_ENTITIES.has(entity) && (CONFIG_ENTITIES.has(entity) || entity.startsWith("library "));

type Line = { entity: string; entityKey: string | null; summary: string };
const NAMED = /\bcase[\s -]+([0-9a-f]{8})\b/i;

/** The case a line belongs to (first 8 characters, lower case), or null when it names none. */
export function caseOf(e: Line): string | null {
  if (e.entity === "case" && e.entityKey) return e.entityKey.slice(0, 8).toLowerCase();
  return NAMED.exec(e.summary)?.[1].toLowerCase() ?? null;
}

/** May staff of a firm whose cases start with `own` read this line? */
export function firmMayRead(e: Line, own: ReadonlySet<string>): boolean {
  if (PLATFORM_ENTITIES.has(e.entity)) return false;   // PF-3 review m11: never read as a case line, even if its words look like one
  const id = caseOf(e);
  if (id !== null) return own.has(id);
  return isConfigEntity(e.entity);   // no case named: only a known configuration line (break M1: never fail open)
}
