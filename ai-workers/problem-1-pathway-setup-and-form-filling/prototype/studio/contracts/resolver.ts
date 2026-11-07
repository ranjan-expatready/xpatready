// SH3 resolver contract (P-258; BACKLOG "Shared services"; runtime lane). The one written answer to "which fact applies
// to which person on which filing". Before SH3 it was spread over engine/people.ts, engine/render.ts,
// engine/sources.ts (behind api/src/fact-sources.ts) and api/src/form-lines.ts; the implementation is now
// engine/resolver.ts and those places call it. Contract tests: tests/check_sh3_resolver.ts (they pin today's behaviour;
// SH3 changes none). Pure: types and constants only, no database, no vendor, no country value (P-249 lift-ready).
// Shape: the four scopes of C3.16 / SA-1B-130 (person · filing · household · organisation), all built (C3.16, #1054): a
// field's stored scope is read in one place (engine/field-scope.ts) and a release marks a household or organisation
// placement, which is then asked and stored once on the case's own record (FILING), see R5.
//
// The rules (each has a passing and a failing check in tests/check_sh3_resolver.ts):
//  R1  People on a filing. Each participant line of the combination gives n = max(preview ?? min ?? 0, 0) people. One
//      person keeps the role as id (a child is always numbered: "child-1"); several are `${role}-${i}`, labelled
//      "<label> <i>". A person is an applicant unless the line says applies: false. A case may hold several filings
//      (engine/filing-modes.ts filingPlan, engine/runtime/filings.ts, C6.12), but a filing-scope value is stored once per
//      case today, on the subject FILING ("case"), and every filing on the case reads it. A value per filing (a filing id
//      here, SA-1B-215 "one subject on one filing") comes with the held filing-scope design (P-251) and SH4 (pin per filing).
//  R2  Line holders: whose list a form or document line goes on comes from the line's own "who" (WHO), never from its
//      condition's subject (lineHolders passes no subject kind). Only a rule passes one: its condition's subject kind
//      (CASE → the filing; PRINCIPAL, SPOUSE, DEPENDENT → that role's people) wins over its "for whom" (render.ts rules).
//      WHO_HOLDERS says, in words, who each value names.
//  R3  Condition subjects (document lines, forms and checks, C7.7; rules and questions: see "Not yet through the
//      resolver" (a)): a line's condition is decided on DOCUMENT → a document's contents; CASE → the filing;
//      PRINCIPAL / SPOUSE / DEPENDENT → the holder when the holder has that role, else every person with it (any one is
//      enough; none → the line is not needed); EACH_APPLICANT, EACH_PERSON or none → the holder (the filing as holder →
//      the principal). A form's holders are its "who" (R2); a check's are each applicant (R2), its subjects merged, and a
//      DOCUMENT check never fires on answers. Before C7.7 a form's was decided on its own person (CASE → the filing) and
//      a check's on everyone who applies, an applying representative included, each on their own answers.
//  R4  Box owner: whose value a form box reads, relative to the form's subject (BOX_PERSON). A filing fact (R5) → the
//      filing; form_subject → the subject; subject_spouse_or_partner → the partner of a principal or the principal of a
//      partner, else nobody; subject_child → the case's child of the box's row (row 0 when unset; the subject's own children are not told apart),
//      else nobody; parents and siblings →
//      `${subject}/parent_1`, `/parent_2`, `/sibling` (relatives, not people on the case); representative → the case's
//      representative, or the literal "representative" when none; none → the filing; anything else → nobody (null).
//  R5  Scope of a fact: a fact whose id starts "case." or whose placement repeats once_per_case is a filing fact (stored
//      once per case, R1; render's deciders and the case checklist pass the placement since C7.7, see (c)); one that
//      starts "organisation." is an organisation fact, read on the form's subject unless marked; any other fact is a
//      person fact. C3.16: a placement marked "household" or "organisation" (the field's stored scope) is asked and
//      stored once on the filing record; a household box reads it only where its person reading finds someone on the
//      case, an organisation box only on the principal's forms.
//  R6  Facts a subject sees: its own person facts plus the filing's facts; never another person's; a value stored per
//      list row (`|<row>`) is not a single fact and is left out.
//  R6b Whose value a person's fact is read from (one fact, as R6 reads it): the person's own answer; else the filing's
//      (a fact asked once per case, such as relationship.start_date or representative.*, is answered on the filing);
//      unanswered, by R5's id rule (a "case." fact → the filing, any other → the person). An empty string is no answer.
//  R7  Signers (C3.11, SIGNED_BY): each row the form's "who" names (R2) is about a person (the filing → the principal);
//      person or unset → that person; parent_for_minor → the principal for a child under 18, else the person (C8.1,
//      Devin on #617: the caller's minor(id) decides by the child's date of birth; unknown → a minor, as before);
//      principal_for_family → the principal; person_and_representative → the person and each representative; none →
//      nobody.
//  R8  Keys: a known value is stored under factKey(about, fact, row?) = `${about}|${fact}` (+ `|${row}`); where a fact's
//      answer comes from is chosen per role, sourceKey(role, fact) = `${role}|${fact}` (so every child shares one choice).
//  R9  Canonical fact id: a field merged into another redirects to it (P-65). The store is asked at most MERGE_HOPS times,
//      so at most MERGE_HOPS - 1 redirects are followed; a chain of MERGE_HOPS redirects or more, or a loop, answers the
//      key that was asked.
//  R10 Roles a "who" names (WHO_ROLES): removing every person of those roles leaves the line with nobody (M4 warning,
//      X2b BR-C1). It agrees with R2 (checked).
//  R11 Whom a document's facts are about (C6.5; was "Not yet" (b)): a document type says per fact whom it is about,
//      relative to the person whose checklist line holds it (DOCUMENT_ABOUTS). holder → the holder (the filing when the
//      line is the case's); holder.spouse → the holder's partner (R4 partnerOf), nobody when none or when the holder is
//      the filing; holder.parent → both parents, `${holder}/parent_1` and `/parent_2` (relatives, R4), nobody for the
//      filing. Any other value is read as holder.parent (the library offers only the three; today's behaviour of
//      engine/sources.ts kept). The same rule per role (documentRole): the holder's role, the partner's role, and
//      nobody for parents (they are relatives, not people on the case). The document reader (engine/runtime/mrz.ts)
//      states its values about "holder"; a document naming two people is not attributed by the reader (its rule M5).
//
// Not yet through the resolver (file:line on the SH3 tidy-up's base, main 4cc6d2be):
//  (a) Conditions of other line types (engine/render.ts): a rule's holders from its condition's subject kind (R2's rule
//      case); a question's on the person the answer is about. Forms and checks came into R3 with C7.7 (3 Nov); render's
//      `applicants` copy of R2 and its "case" literals came from the resolver with M1 (#659).
//  (b) Done with C6.5 part 1 (3 Nov): whom a document's facts are about is R11 (engine/sources.ts documentFacts and
//      checklist call it). Still local in engine/sources.ts: isAgentFact, WHO_OF_ROLE (the reverse of WHO_ROLES).
//  (c) Done with C7.7 (3 Nov): render's deciders and engine/runtime/case-checklist.ts pass the placement, so an unanswered
//      fact placed once_per_case is asked once, on the filing; an answered one is kept where its answer is stored (on
//      the person when it was saved before its placement became once per case, review r2-m1).
//  (d) Copies still outside the resolver: R5 in api/src/runtime.ts:269 (with the placement) and :310 (prefix only), and
//      the sourceKey template in engine/runtime/case.ts:378 (both files belong to runtime lane L1 until its S4 merges);
//      R5 by prefix in engine/answer-keys.ts:105; field scope by prefix in engine/import.ts:41, api/src/proposals.ts:214
//      and engine/snapshot.ts:37 (subjectKindOf), which wait for L-SA4 (C3.16's four scopes). Moved in the SH3
//      follow-ups: eligibility.ts, case-checklist.ts, programs.ts (R5, R6b), coverage.ts (roleOf), and the sourceKey
//      template in runtime/preview.ts (the map and both readers), validate.ts, pqr-picks.ts and coverage.ts. Still local
//      and keyed on a case's subject ids (the runtime's people, not the resolver's Person): roleOf and partnerOf in
//      engine/runtime/preview.ts:71, :73 and roleOf in engine/runtime/case.ts:379; they move with SH4's filing id.
//  (e) "Is answered" (R6b present) is written again in contracts/runtime.ts:76 (a save refuses an empty value) and
//      engine/runtime/team.ts:89 (empty settings are dropped): same test, other purposes; left as they are.

/** C3.16 / SA-1B-130 rule 1: the four scopes a shared field may carry. */
export const SCOPES = ["person", "filing", "household", "organisation"] as const;
export type Scope = (typeof SCOPES)[number];
/** All four are built (C3.16, #1054; P-316 (2) lifted P-251's hold). Household and organisation values are held on the
 *  case's own record (one household and one employer per case: named stand-ins until PartyRelationship membership and
 *  the employer link, L-SA5). */
export const BUILT_SCOPES = ["person", "filing", "household", "organisation"] as const satisfies readonly Scope[];
/** Where a value of each scope lives: the SA-1B-130 rule 3 TARGET, not what is built (built: person on the person,
 *  filing once per case, R1), and the team's enum value it maps to (SA-1B-130 §7: FieldScope
 *  becomes PERSON | HOUSEHOLD | FILING | ORGANISATION; built CLIENT_LEVEL → PERSON, CASE_LEVEL → FILING, rule 6). */
export const SCOPE_RULES: Record<Scope, { team: "PERSON" | "HOUSEHOLD" | "FILING" | "ORGANISATION"; lives: string }> = {
  person: { team: "PERSON", lives: "on the person's facts, reused on the person's later filings" },
  filing: { team: "FILING", lives: "on that filing only; a later filing asks again" },
  household: { team: "HOUSEHOLD", lives: "once for the household, read by every member" },
  organisation: { team: "ORGANISATION", lives: "on the employer's facts; never in a worker's file unless marked shareable" },
};

/** R1: the subject that holds filing-scope values, once per case (every filing on the case reads them). */
export const FILING = "case";

/** A subject a fact is resolved for. `id` is a person id (R1), a relative `${person}/parent_1|parent_2|sibling` (R4), or
 *  FILING. Household and organisation subjects are part of the shape only: their values sit on FILING (C3.16). */
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
  // QA-221 (tech lead's ruling C, 4 Nov): a form whose own words name the principal applicant and a spouse or partner at
  // any age, and dependent children from an age (IMM 5257 SCH1 (09-2023) p. 1). Named here like each_applicant; the
  // line's minimum age then gates dependent children only (engine/render.ts ageGate).
  principal_partner_adult_children: "as each_applicant; the line's minimum age applies to dependent children only (the principal applicant and a spouse or partner always fill it)",
  each_adult_18_plus: "as each_applicant (the age is applied by the line's minimum age, not here); read from release data and the runtime (case-checklist.ts), not offered in the studio's list (api/src/studio.ts WHO)",
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
/** R11: whom a document type's supplied fact is about, relative to the line's holder. */
export const DOCUMENT_ABOUTS = ["holder", "holder.spouse", "holder.parent"] as const;
export type DocumentAbout = (typeof DOCUMENT_ABOUTS)[number];

/** R8: the key a known value is stored under. */
export const factKey = (about: string, fact: string, row?: number | null) => `${about}|${fact}${row === undefined || row === null ? "" : `|${row}`}`;
/** R8: the key a choice of where a fact's answer comes from is stored under (FactSource.lineageKey). */
export const sourceKey = (role: string, fact: string) => `${role}|${fact}`;

/** The resolver's questions; engine/resolver.ts implements them. No question takes a filing id yet (R1). */
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
  /** R6b: the about-key a person's value of one fact is read from. */ valueHolder(known: Known, fact: string, person: string): string;
  /** R7: signer id → the rows (person ids or FILING) they sign for. */ signers(people: PersonOnFiling[], who: string, signedBy: string | null | undefined, minor?: (id: string) => boolean | undefined): Map<string, string[]>;
  /** R9: the database (or any store) answers one hop; the resolver follows the chain. */ canonicalFact(key: string, mergedInto: (key: string) => Promise<string | null | undefined>): Promise<string>;
  /** R10 */ rolesNamedBy(who: string): Role[];
  /** R11: the about-keys (person ids, relatives or FILING) a document's fact is about, for one holder. */ documentSubjects(people: PersonOnFiling[], holder: string, about: string): string[];
  /** R11 per role: the role a document's fact is about, for one holder; null for nobody or for relatives. */ documentRole(people: PersonOnFiling[], holder: string, about: string): string | null;
}
