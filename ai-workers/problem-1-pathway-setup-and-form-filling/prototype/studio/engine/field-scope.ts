// C3.16 (L-SA4; SA-1B-130; concept screens/C3.16-field-scope/concept.md r4, approved by the tech lead on #1054): the one
// reader of a shared field's stored scope. Pure: no database or vendor call, no country value, no form or combination
// number (P-249, P-319).
//  * Stored values: CLIENT_LEVEL and CASE_LEVEL (built before C3.16) are read as the team's PERSON and FILING (SA-1B-130
//    rule 6 as changed by the tech lead on #1054); HOUSEHOLD and ORGANISATION are new.
//  * Only the two new values carry new meaning (r2 challenge B3): CLIENT_LEVEL keeps R5 (engine/resolver.ts scopeOf),
//    CASE_LEVEL is a `case.` key (Filing is the `case.` keys only, challenge m1).
//  * A release placement whose field has a new value carries `scope` (the mark, engine/snapshot.ts), so every reader of
//    placements (render, Preview, the case, filling) asks it once on the case (engine/resolver.ts isFilingFact, aboutOf).
import { MINOR } from "../contracts/runtime.ts";
import type { Scope } from "../contracts/resolver.ts";

export type StoredScope = "CLIENT_LEVEL" | "CASE_LEVEL" | "HOUSEHOLD" | "ORGANISATION";
export const STORED_SCOPES: readonly StoredScope[] = ["CLIENT_LEVEL", "CASE_LEVEL", "HOUSEHOLD", "ORGANISATION"];
const SCOPE_OF: Record<StoredScope, Scope> = { CLIENT_LEVEL: "person", CASE_LEVEL: "filing", HOUSEHOLD: "household", ORGANISATION: "organisation" };
const STORED_OF: Record<Scope, StoredScope> = { person: "CLIENT_LEVEL", filing: "CASE_LEVEL", household: "HOUSEHOLD", organisation: "ORGANISATION" };

/** The scope a stored value stands for (an unknown value reads as Person, as R5 does today). */
export const scopeOfStored = (stored: string | null | undefined): Scope => SCOPE_OF[stored as StoredScope] ?? "person";
export const storedOfScope = (scope: Scope): StoredScope => STORED_OF[scope];

/** The library's words for each scope ("Asked about"; the team's label is "Scope"), with a Sample example each. */
export const SCOPE_WORDS: Record<Scope, { label: string; short: string; example: string }> = {
  person: { label: "Person", short: "about each person", example: "passport number" },
  filing: { label: "Filing", short: "once for the application", example: "the date you sign this application" },
  household: { label: "Household", short: "once for the household", example: "date of marriage" },
  organisation: { label: "Organisation", short: "once for the employer", example: "employer's legal name" },
};

/** The mark a release placement carries for its field's stored scope: only the two new values (BR-3). */
export type ScopeMark = "household" | "organisation";
export function scopeMark(stored: string | null | undefined): ScopeMark | null {
  return stored === "HOUSEHOLD" ? "household" : stored === "ORGANISATION" ? "organisation" : null;
}
/** The placement part a release adds (empty when no mark, so every snapshot without one stays byte-identical). */
export const markOf = (stored: string | null | undefined): { scope?: ScopeMark } => { const m = scopeMark(stored); return m ? { scope: m } : {}; };

/** Words of the refusals (BR-2; the concept's copy). */
export const SCOPE_WORDS_REFUSED = {
  published: "A published field's scope cannot change. Create a new field.",
  merged: "This field was merged into another: choose whom it is about on the field it was merged into",
  caseKey: "This is about the application: choose Filing, Household or Organisation.",
  filingKey: "Not built: a person's fact asked once for the application. Ask it as an application fact instead.",
  perRow: "A list is asked per person today; a household or employer list is not built.",
  representative: "A representative's part of the form reads this field, so it stays about each person.",
  condition: "A household question cannot depend on one person's answer yet.",
  personOnly: "This fact is about one person and stays about each person.",
  employerHousehold: "This is the employer's fact: choose Organisation, not Household.",
} as const;

/** Facts that are always about one person (challenge m2): the representative's own, date of birth, "has any children",
 *  "is the principal applicant" (QA-400), the kind of their application (QA-415). */
const PERSON_ONLY = new Set<string>([MINOR.birthDateField, "person.has_children", "person.is_principal_applicant" /* QA-400: worked out per person */, "person.application_type" /* QA-415: from the person's own filing */]);

/** What the scope route needs to know about a field to decide (read by api/src/field-scope.ts). */
export type ScopeFacts = {
  key: string;
  /** any PUBLISHED, SUPERSEDED or RETIRED version of the key, or a draft that supersedes one */
  published: boolean;
  /** repeats of each current placement of the key, in any combination */
  placements: { repeats: string; condition: boolean }[];
  /** a form field map entry that reads the key for the representative */
  representativeBox: boolean;
  /** the name of the field it was merged into, when it was (break m4, review m8 on #1054) */
  merged?: string | null;
};

/** BR-2: why this scope cannot be set on this field, or null when it can. The order is the concept's. */
export function scopeRefusal(f: ScopeFacts, scope: Scope): { status: 409 | 422; message: string } | null {
  if (f.merged) return { status: 409, message: `${SCOPE_WORDS_REFUSED.merged}, "${f.merged}".` };
  if (f.published) return { status: 409, message: SCOPE_WORDS_REFUSED.published };
  const caseKey = f.key.startsWith("case.");
  if (scope === "person") return caseKey ? { status: 422, message: SCOPE_WORDS_REFUSED.caseKey } : null;
  if (scope === "filing") return caseKey ? null : { status: 422, message: SCOPE_WORDS_REFUSED.filingKey };
  // household or organisation
  if (f.key.startsWith("representative.") || PERSON_ONLY.has(f.key)) return { status: 422, message: SCOPE_WORDS_REFUSED.personOnly };
  // Break round 2, m3 on #1054: an employer's fact ("organisation.") is never a household's: Household would copy the
  // employer's value onto every adult's forms (the spouse's IMM 5710 read the principal's employer address).
  if (scope === "household" && f.key.startsWith("organisation.")) return { status: 422, message: SCOPE_WORDS_REFUSED.employerHousehold };
  if (f.placements.some((p) => p.repeats === "per_row")) return { status: 422, message: SCOPE_WORDS_REFUSED.perRow };
  if (f.representativeBox) return { status: 422, message: SCOPE_WORDS_REFUSED.representative };
  if (f.placements.some((p) => p.condition)) return { status: 422, message: SCOPE_WORDS_REFUSED.condition };
  return null;
}

/** M3 (and M1 for a condition added later): a placement of a field that already has a new scope must be single and
 *  unconditioned. Null when it may be placed. */
export function placementRefusal(stored: string | null | undefined, p: { repeats: string; condition: unknown }): string | null {
  if (!scopeMark(stored)) return null;
  if (p.repeats === "per_row") return SCOPE_WORDS_REFUSED.perRow;
  if (p.condition) return SCOPE_WORDS_REFUSED.condition;
  return null;
}

/** C3.16 (break 1 on #1054): a merge keeps one field, so both must be asked about the same people (one scope per field,
 *  SA-1B-130 rule 2); otherwise the merged field's boxes would start reading another scope's value. */
export function mergeScopeRefusal(keepName: string, keep: string | null | undefined, goneName: string, gone: string | null | undefined): string | null {
  const a = scopeOfStored(keep), b = scopeOfStored(gone);
  return a === b ? null : `"${goneName}" is asked ${SCOPE_WORDS[b].short} and "${keepName}" ${SCOPE_WORDS[a].short}: fields are merged only when both are asked about the same people.`;
}

/** BR-4: the words of a save refused on a person's record for a fact asked once on the case. */
export const ONCE_WORDS: Record<"filing" | ScopeMark, string> = {
  filing: "This is asked once for the application, not for a person.",
  household: "This is asked once for the household, not for a person.",
  organisation: "This is asked once for the employer, not for a person.",
};
/** The case questionnaire's tag for a question asked once on the case because of its scope. */
export const SCOPE_TAG: Record<ScopeMark, string> = { household: "For the household", organisation: "About the employer" };
