// SH3 (P-258): the resolver, implementing contracts/resolver.ts (rules R1–R10 are written there). Moved, unchanged in
// behaviour, from engine/render.ts (peopleFor, subjectsFor, lineHolders, conditionSubjects, aboutOf, formSigners,
// factsOf, kkey), engine/sources.ts (spouseOf, roleOf), engine/people.ts (the roles a "who" names) and
// api/src/form-lines.ts (the merge chain). Pure: no database or vendor call, no country value (P-249 lift-ready); the
// one store read (R9) comes in as a function. Contract tests: tests/check_sh3_resolver.ts.
import { FILING, MERGE_HOPS, ROLE, type DocumentAbout, WHO_ROLES, factKey, type Known, type ParticipantLine, type PersonOnFiling, type Resolver, type Role, type Scope, type Subject, type Who } from "../contracts/resolver.ts";

export type { Known, PersonOnFiling as Person, Role } from "../contracts/resolver.ts";
/** R8 (kept under its old name for its many callers). */
export const kkey = factKey;

const find = (people: PersonOnFiling[], role: Role) => people.filter((p) => p.role === role);

/** R1 (a line without a label gives people without one: the coverage gate reads ids only). */
export function peopleFor(participants: ParticipantLine[]): PersonOnFiling[] {
  const out: PersonOnFiling[] = [];
  for (const p of participants ?? []) {
    const n = Math.max(p.preview ?? p.min ?? 0, 0);
    for (let i = 0; i < n; i++) out.push({ id: n > 1 || p.role === ROLE.child ? `${p.role}-${i + 1}` : p.role, role: p.role, label: (n > 1 ? `${p.label} ${i + 1}` : p.label) as string, applies: p.applies !== false });
  }
  return out;
}

/** R2 */
export function subjectsFor(people: PersonOnFiling[], who: string, subjectKind?: string): string[] {
  const principal = find(people, ROLE.principal).map((p) => p.id), partner = find(people, ROLE.partner).map((p) => p.id), children = find(people, ROLE.child).map((p) => p.id);
  const applicants = people.filter((p) => p.applies && p.role !== ROLE.representative).map((p) => p.id);
  if (subjectKind === "CASE") return [FILING];
  if (subjectKind === "PRINCIPAL") return principal;
  if (subjectKind === "SPOUSE") return partner;
  if (subjectKind === "DEPENDENT") return children;
  switch (who) {
    case "each_applicant": case "each_adult_18_plus": case "principal_partner_adult_children": return applicants;
    case "principal_applicant": return principal;
    case "spouse_or_partner": case "couple_once": return partner;
    case "each_dependent_child": return children;
    case "each_person": return people.filter((p) => p.role !== ROLE.representative && p.role !== ROLE.sponsor).map((p) => p.id);
    case "representative": return find(people, ROLE.representative).map((p) => p.id);
    case "sponsor": return find(people, ROLE.sponsor).map((p) => p.id); // S5: Sample role, the immigration expert confirms
    case "case": return [FILING];
    default: return [];
  }
}

/** One rule for whose list a document line goes on (BR-3 "conditions on that person's facts"; C6.4 review R3, Q2 on
 *  #325): the line's own "whose document" names its holders, never its condition's subject. A case-level line stays
 *  "case" here; each caller places it (Preview and the Documents tab list it under the case, a case's checklist under
 *  the principal). Used by render (Preview), engine/sources.ts (the Documents tab) and engine/runtime/case-checklist.ts. */
export function lineHolders(people: PersonOnFiling[], who: string): string[] {
  return subjectsFor(people, who);
}

/** R3: on whose answers a line's condition is decided, for one holder. */
export function conditionSubjects(people: PersonOnFiling[], holder: string, kind: string | undefined): string[] | "document" {
  if (kind === "DOCUMENT") return "document";
  if (kind === "CASE") return [FILING];
  const role = kind === "PRINCIPAL" ? ROLE.principal : kind === "SPOUSE" ? ROLE.partner : kind === "DEPENDENT" ? ROLE.child : null;
  if (!role || people.find((p) => p.id === holder)?.role === role) return [holder === FILING ? (people.find((p) => p.role === ROLE.principal)?.id ?? FILING) : holder];
  return find(people, role).map((p) => p.id);
}

/** R5: the scope of a fact as the rules read it today (household is never produced; organisation is held). */
export function scopeOf(fact: string, placement?: { repeats?: string | null } | null): Scope {
  if (placement?.repeats === "once_per_case" || fact.startsWith("case.")) return "filing";
  if (fact.startsWith("organisation.")) return "organisation";
  return "person";
}
/** R5: a filing fact is stored once, on the filing. */
export const isFilingFact = (fact: string, placement?: { repeats?: string | null } | null) => scopeOf(fact, placement) === "filing";
/** R5/R6: the subject an about-key stands for (relatives `${id}/parent_1` are about a person). */
export const subjectOf = (about: string): Subject => (about === FILING ? { scope: "filing", id: FILING } : { scope: "person", id: about });
/** The role of the person an about-key is about; FILING for the filing; the key itself when nobody on the case has it. */
export const roleOf = (people: PersonOnFiling[], about: string) => about === FILING ? FILING : people.find((p) => p.id === about.split("/")[0])?.role ?? about;
/** R4: a principal's partner, or a partner's principal; anyone else has none here. */
export function partnerOf(people: PersonOnFiling[], id: string): string | null {
  const me = people.find((p) => p.id === id);
  if (me?.role === ROLE.principal) return find(people, ROLE.partner)[0]?.id ?? null;
  if (me?.role === ROLE.partner) return find(people, ROLE.principal)[0]?.id ?? null;
  return null;
}

/** R4: whose value a box reads, relative to the form's subject (the AI states it relative to the subject; the case
 *  decides who that is). Returns null when that person is not on the case. */
export function aboutOf(people: PersonOnFiling[], subject: string, entry: { fact?: string; person?: string | null; row?: number | null }, placement?: { repeats?: string | null } | null): string | null {
  const fact: string = entry.fact ?? "";
  const scope = scopeOf(fact, placement);
  if (scope === "filing") return FILING;
  if (scope === "organisation") return subject; // held (P-251): the prospective employer of the form's subject (P5 finding D33)
  switch (entry.person) {
    case "form_subject": return subject;
    case "subject_spouse_or_partner": return partnerOf(people, subject);
    case "subject_child": return find(people, ROLE.child)[entry.row ?? 0]?.id ?? null;
    case "subject_parent_1": case "subject_parent_2": return `${subject}/${entry.person.slice(8)}`;
    case "subject_sibling": return `${subject}/sibling`;
    case "representative": return find(people, ROLE.representative)[0]?.id ?? "representative";
    case "none": case null: case undefined: return FILING;
    default: return null;
  }
}

/** R6: the single facts a subject sees: the filing's and its own; never another person's, never a list row. */
export function factsOf(known: Known, about: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of known) { const [a, f, row] = k.split("|"); if (row === undefined && (a === FILING || a === about)) out[f] = v.value; }
  return out;
}

/** R6b: what counts as an answer: anything but undefined, null or an empty string (0, false and " " are answers). */
export const present = (v: unknown) => v !== undefined && v !== null && v !== "";
/** R6b: whose value a person's fact is read from: their own answer, else the filing's, else by R5's id rule. Moved from
 *  engine/runtime/eligibility.ts (its aboutOf; review M1 on fd26c492: a fact asked once per case of the case subject
 *  read as unanswered, a false Not met). */
export function valueHolder(known: Known, fact: string, person: string): string {
  if (present(known.get(factKey(person, fact))?.value)) return person;
  if (present(known.get(factKey(FILING, fact))?.value)) return FILING;
  return isFilingFact(fact) ? FILING : person;
}

/** R7: who signs a form filed as PDF upload, signed by hand and scanned (C3.11; contracts/workspace.ts SIGNED_BY,
 *  Sample): the one rule for the Documents tab (sources.ts signedScanLines) and Preview (render). Returns each signer's
 *  id with the form rows (person ids, or FILING) they sign for. */
export function formSigners(people: PersonOnFiling[], who: string, signedBy: string | null | undefined, minor?: (id: string) => boolean | undefined): Map<string, string[]> {
  const by = signedBy ?? "person", out = new Map<string, string[]>();
  if (by === "none") return out;
  const principal = people.find((p) => p.role === ROLE.principal)?.id;
  const reps = people.filter((p) => p.role === ROLE.representative).map((p) => p.id);
  for (const row of subjectsFor(people, who)) {
    const about = row === FILING ? principal : row.split("/")[0];
    if (!about) continue;
    // Devin on #617: "for a minor" is decided by age when the caller knows it (an adult dependent child signs their own);
    // a child whose age is not known stays a minor, as before.
    const isChild = people.find((p) => p.id === about)?.role === ROLE.child;
    const signsFor = by === "principal_for_family" || (by === "parent_for_minor" && isChild && (minor?.(about) ?? true)) ? principal : about;
    for (const id of [signsFor, ...(by === "person_and_representative" ? reps : [])]) if (id) out.set(id, [...(out.get(id) ?? []), row]);
  }
  return out;
}
/** True when a signer signs a form for someone other than themselves (the reason's "for the family members it is about"). */
export const signsForOthers = (signer: string, rows: string[]) => rows.some((x) => x !== FILING && x.split("/")[0] !== signer);

/** R9: follow "merged into" redirects (P-65) at most MERGE_HOPS times; a longer chain or a loop answers the asked key. */
export async function canonicalFact(key: string, mergedInto: (key: string) => Promise<string | null | undefined>): Promise<string> {
  for (let i = 0, k = key; i < MERGE_HOPS; i++) {
    const next = await mergedInto(k);
    if (!next) return k;
    k = next;
  }
  return key;
}

/** R10 */
export const rolesNamedBy = (who: string): Role[] => WHO_ROLES[who as Who] ?? [];

/** R11: the about-keys a document's fact is about, for one holder (moved from engine/sources.ts documentFacts). */
export function documentSubjects(people: PersonOnFiling[], holder: string, about: DocumentAbout | string): string[] {
  if (about === "holder") return [holder];
  if (holder === FILING) return [];
  if (about === "holder.spouse") { const p = partnerOf(people, holder); return p ? [p] : []; }
  return [`${holder}/parent_1`, `${holder}/parent_2`];
}
/** R11 per role (moved from engine/sources.ts checklist's other()): parents are relatives, so they have no role here. */
export function documentRole(people: PersonOnFiling[], holder: string, about: DocumentAbout | string): string | null {
  if (about === "holder") return roleOf(people, holder);
  if (about !== "holder.spouse") return null;
  const p = documentSubjects(people, holder, about)[0];
  return p ? roleOf(people, p) : null;
}

/** The contract, satisfied by the functions above (one object for callers that take a resolver). */
export const resolver: Resolver = {
  people: peopleFor, holders: subjectsFor, conditionSubjects, boxOwner: aboutOf, scopeOf, subjectOf, roleOf, partnerOf,
  factsFor: factsOf, valueHolder, signers: formSigners, canonicalFact, rolesNamedBy, documentSubjects, documentRole,
};
