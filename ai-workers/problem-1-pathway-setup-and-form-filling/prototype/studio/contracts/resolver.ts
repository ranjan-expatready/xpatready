// SH3 resolver contract (P-258; BACKLOG "Shared services"; runtime lane). The one written answer to "which fact applies
// to which person on which filing". Before SH3 it was spread over engine/people.ts, engine/render.ts,
// engine/sources.ts (behind api/src/fact-sources.ts) and api/src/form-lines.ts; the implementation is now
// engine/resolver.ts and those places call it. Contract tests: tests/check_sh3_resolver.ts (they pin today's behaviour;
// SH3 changes none). Pure: types and constants only, no database, no vendor, no country value (P-249 lift-ready).
// Shape: the four scopes of C3.16 / SA-1B-130 (person · filing · household · organisation); person and filing are
// built, household and organisation are a held design (P-251) and nothing produces them yet.
//
// The rules (each has a passing and a failing check in tests/check_sh3_resolver.ts):
//  R1  People on a filing. Each participant line of the combination gives n = max(preview ?? min ?? 0, 0) people. One
//      person keeps the role as id (a child is always numbered: "child-1"); several are `${role}-${i}`, labelled
//      "<label> <i>". A person is an applicant unless the line says applies: false. One case is one filing today, so the
//      filing's subject id is FILING ("case"); several filings per case is a held design (P-251).
//  R2  Line holders: whose list a form, document or question line goes on comes from the line's own "who" (WHO), never
//      from its condition's subject. A subject kind given with it wins (CASE → the filing; PRINCIPAL, SPOUSE, DEPENDENT →
//      that role's people). WHO_HOLDERS says, in words, who each value names.
//  R3  Condition subjects: a line's condition is decided on DOCUMENT → a document's contents; CASE → the filing;
//      PRINCIPAL / SPOUSE / DEPENDENT → the holder when the holder has that role, else every person with it (any one is
//      enough; none → the line is not needed); EACH_APPLICANT, EACH_PERSON or none → the holder (the filing as holder →
//      the principal).
//  R4  Box owner: whose value a form box reads, relative to the form's subject (BOX_PERSON). A filing fact (R5) → the
//      filing; form_subject → the subject; subject_spouse_or_partner → the partner of a principal or the principal of a
//      partner, else nobody; subject_child → the case's child of the box's row (row 0 when unset; the subject's own children are not told apart),
//      else nobody; parents and siblings →
//      `${subject}/parent_1`, `/parent_2`, `/sibling` (relatives, not people on the case); representative → the case's
//      representative, or the literal "representative" when none; none → the filing; anything else → nobody (null).
//  R5  Scope of a fact: a fact whose id starts "case." or whose placement repeats once_per_case is a filing fact; one that
//      starts "organisation." is an organisation fact, held (P-251): until the organisation subject exists it is read on
//      the form's subject; any other fact is a person fact. No fact is a household fact yet.
//  R6  Facts a subject sees: its own person facts plus the filing's facts; never another person's; a value stored per
//      list row (`|<row>`) is not a single fact and is left out.
//  R7  Signers (C3.11, SIGNED_BY): each row the form's "who" names (R2) is about a person (the filing → the principal);
//      person or unset → that person; parent_for_minor → the principal for a child, else the person;
//      principal_for_family → the principal; person_and_representative → the person and each representative; none →
//      nobody.
//  R8  Keys: a known value is stored under factKey(about, fact, row?) = `${about}|${fact}` (+ `|${row}`); where a fact's
//      answer comes from is chosen per role, sourceKey(role, fact) = `${role}|${fact}` (so every child shares one choice).
//  R9  Canonical fact id: a field merged into another redirects to it (P-65), followed at most MERGE_HOPS times; a chain
//      longer than that, or a loop, answers the key that was asked.
//  R10 Roles a "who" names (WHO_ROLES): removing every person of those roles leaves the line with nobody (M4 warning,
//      X2b BR-C1). It agrees with R2 (checked).

/** C3.16 / SA-1B-130 rule 1: the four scopes a shared field may carry. */
export const SCOPES = ["person", "filing", "household", "organisation"] as const;
export type Scope = (typeof SCOPES)[number];
/** Built now; the other two are a held design (P-251: household and filing scopes, organisation subject). */
export const BUILT_SCOPES = ["person", "filing"] as const satisfies readonly Scope[];
export const HELD_SCOPES = {
  household: "Held (P-251): household scope is a design sent to the product owner; no fact is household-scoped yet.",
  organisation: "Held (P-251): the organisation subject is a design sent to the product owner; until then an organisation fact is read on the form's subject (R5).",
} as const satisfies Record<Exclude<Scope, (typeof BUILT_SCOPES)[number]>, string>;
/** Where a value of each scope lives (SA-1B-130 rule 3) and the team's enum value it maps to (SA-1B-130 §7: FieldScope
 *  becomes PERSON | HOUSEHOLD | FILING | ORGANISATION; built CLIENT_LEVEL → PERSON, CASE_LEVEL → FILING, rule 6). */
export const SCOPE_RULES: Record<Scope, { team: "PERSON" | "HOUSEHOLD" | "FILING" | "ORGANISATION"; lives: string }> = {
  person: { team: "PERSON", lives: "on the person's facts, reused on the person's later filings" },
  filing: { team: "FILING", lives: "on that filing only; a later filing asks again" },
  household: { team: "HOUSEHOLD", lives: "once for the household, read by every member" },
  organisation: { team: "ORGANISATION", lives: "on the employer's facts; never in a worker's file unless marked shareable" },
};

/** R1: the filing's own subject id (one case = one filing today). */
export const FILING = "case";

/** A subject a fact is resolved for. `id` is a person id (R1), a relative `${person}/parent_1|parent_2|sibling` (R4), or
 *  FILING. Household and organisation subjects are part of the shape only (held). */
export type Subject =
  | { scope: "person"; id: string }
  | { scope: "filing"; id: typeof FILING }
  | { scope: "household"; id: string }
  | { scope: "organisation"; id: string };

/** A person role key from the shared library's person roles (S5). These five keep their meaning in the rules. */
export type Role = string;
export const ROLE = { principal: "principal", partner: "spouse_or_partner", child: "child", representative: "representative", sponsor: "sponsor" } as const;
export type PersonOnFiling = { id: string; role: Role; label: string; applies: boolean };
/** A participant line of a combination as R1 reads it (contracts/workspace.ts PeopleLine has more). */
export type ParticipantLine = { role: string; label?: string; min?: number | null; max?: number | null; preview?: number | null; applies?: boolean | null; [more: string]: unknown };
/** Known values (R8 keys). status: confirmed (existing record or staff-verified) or answered (typed on screen). */
export type Known = Map<string, { value: unknown; status: "confirmed" | "answered"; source: string }>;

/** R2: the "who" vocabulary of a form, document or question line, and who it names. */
export const WHO_HOLDERS = {
  each_applicant: "every applicant (applies) except the representative",
  each_adult_18_plus: "as each_applicant (the age is applied by the line's minimum age, not here)",
  principal_applicant: "the principal",
  spouse_or_partner: "the spouse or partner",
  couple_once: "the spouse or partner",
  each_dependent_child: "each child",
  each_person: "everyone except the representative and the sponsor",
  case: "the filing",
  representative: "the representative",
  sponsor: "the sponsor (Sample role, the immigration expert confirms)",
} as const;
export type Who = keyof typeof WHO_HOLDERS;
/** R2: a subject kind on a line or its condition. */
export const SUBJECT_KINDS = ["CASE", "PRINCIPAL", "SPOUSE", "DEPENDENT", "EACH_APPLICANT", "EACH_PERSON", "DOCUMENT"] as const;
/** R10: the roles a "who" names by role (each_applicant, principal_applicant, each_person and case name none). */
export const WHO_ROLES: Partial<Record<Who, Role[]>> = { spouse_or_partner: [ROLE.partner], couple_once: [ROLE.partner], each_dependent_child: [ROLE.child], representative: [ROLE.representative], sponsor: [ROLE.sponsor] };
/** R4: whose value a box reads, relative to the form's subject. */
export const BOX_PERSON = ["form_subject", "subject_spouse_or_partner", "subject_child", "subject_parent_1", "subject_parent_2", "subject_sibling", "representative", "none"] as const;
/** R7: who signs (keys of contracts/workspace.ts SIGNED_BY). */
export const SIGNERS = ["person", "parent_for_minor", "principal_for_family", "person_and_representative", "none"] as const;
/** R9. */
export const MERGE_HOPS = 5;

/** R8: the key a known value is stored under. */
export const factKey = (about: string, fact: string, row?: number | null) => `${about}|${fact}${row === undefined || row === null ? "" : `|${row}`}`;
/** R8: the key a choice of where a fact's answer comes from is stored under (FactSource.lineageKey). */
export const sourceKey = (role: string, fact: string) => `${role}|${fact}`;

/** The resolver's questions; engine/resolver.ts implements them. */
export interface Resolver {
  /** R1 */ people(participants: ParticipantLine[]): PersonOnFiling[];
  /** R2: person ids (or FILING) a line with this "who" goes to. */ holders(people: PersonOnFiling[], who: string, subjectKind?: string): string[];
  /** R3 */ conditionSubjects(people: PersonOnFiling[], holder: string, subjectKind: string | undefined): string[] | "document";
  /** R4 */ boxOwner(people: PersonOnFiling[], formSubject: string, entry: { fact?: string; person?: string | null; row?: number | null }, placement?: { repeats?: string | null } | null): string | null;
  /** R5 */ scopeOf(fact: string, placement?: { repeats?: string | null } | null): Scope;
  /** R5/R6: the subject an about-key stands for. */ subjectOf(about: string): Subject;
  /** R4/R6: the role of the person an about-key is about (FILING for the filing). */ roleOf(people: PersonOnFiling[], about: string): string;
  /** R4: a principal's partner or a partner's principal. */ partnerOf(people: PersonOnFiling[], id: string): string | null;
  /** R6 */ factsFor(known: Known, about: string): Record<string, unknown>;
  /** R7: signer id → the rows (person ids or FILING) they sign for. */ signers(people: PersonOnFiling[], who: string, signedBy: string | null | undefined): Map<string, string[]>;
  /** R9: the database (or any store) answers one hop; the resolver follows the chain. */ canonicalFact(key: string, mergedInto: (key: string) => Promise<string | null | undefined>): Promise<string>;
  /** R10 */ rolesNamedBy(who: string): Role[];
}
