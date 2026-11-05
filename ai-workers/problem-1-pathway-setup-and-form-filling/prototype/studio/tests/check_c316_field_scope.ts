// C3.16 (L-SA4; SA-1B-130, SA-1B-134; concept product/screens/C3.16-field-scope/concept.md r4, approved on #1054): the
// one scope reader (engine/field-scope.ts) and how the resolver asks and reads a field with a new scope. Pure: no
// database, no server (US$0). Each rule has a passing and a failing case. The live route and a real case are proven by
// acceptance/C3.16.test.ts (six part and case part).
//   tsx studio/tests/check_c316_field_scope.ts
import { FILING, type PersonOnFiling } from "../contracts/resolver.ts";
import { markOf, ONCE_WORDS, placementRefusal, SCOPE_TAG, SCOPE_WORDS_REFUSED, scopeMark, scopeOfStored, scopeRefusal, storedOfScope, type ScopeFacts } from "../engine/field-scope.ts";
import * as R from "../engine/resolver.ts";
import { documentFacts } from "../engine/sources.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const P = (id: string, role: string): PersonOnFiling => ({ id, role, label: id, applies: true });
const family = [P("principal", "principal"), P("spouse_or_partner", "spouse_or_partner"), P("child-1", "child"), P("representative", "representative")];
const alone = [P("principal", "principal")];
const facts = (o: Partial<ScopeFacts> = {}): ScopeFacts => ({ key: "relationship.union_date", published: false, placements: [{ repeats: "per_person", condition: false }], representativeBox: false, ...o });

// ---- the stored values (SA-1B-130 rule 6 as changed, #1054 Q4)
ok("C3.16: CLIENT_LEVEL reads as Person and CASE_LEVEL as Filing; the two new values as themselves", scopeOfStored("CLIENT_LEVEL") === "person" && scopeOfStored("CASE_LEVEL") === "filing" && scopeOfStored("HOUSEHOLD") === "household" && scopeOfStored("ORGANISATION") === "organisation");
ok("C3.16 (fail): an unknown stored value reads as Person (as R5 does today), and each scope stores back", scopeOfStored("SOMETHING") === "person" && storedOfScope("person") === "CLIENT_LEVEL" && storedOfScope("household") === "HOUSEHOLD");
ok("C3.16: only Household and Organisation give a release mark", scopeMark("HOUSEHOLD") === "household" && scopeMark("ORGANISATION") === "organisation" && JSON.stringify(markOf("HOUSEHOLD")) === '{"scope":"household"}');
ok("C3.16-7 (fail): CLIENT_LEVEL and CASE_LEVEL give no mark, so every snapshot without a new scope is unchanged", scopeMark("CLIENT_LEVEL") === null && scopeMark("CASE_LEVEL") === null && JSON.stringify(markOf("CLIENT_LEVEL")) === "{}" && JSON.stringify(markOf(undefined)) === "{}");

// ---- BR-2: the refusals
ok("C3.16-2 pass: Household and Organisation on an unpublished single person field", scopeRefusal(facts(), "household") === null && scopeRefusal(facts(), "organisation") === null);
ok("C3.16-2 fail: a published field (or a draft that supersedes one) refuses any change, 409", scopeRefusal(facts({ published: true }), "household")?.status === 409 && scopeRefusal(facts({ published: true }), "person")?.message === SCOPE_WORDS_REFUSED.published);
ok("C3.16-2 fail: Person on a case. field is 422; Filing on a case. field is allowed", scopeRefusal(facts({ key: "case.applied_for" }), "person")?.message === SCOPE_WORDS_REFUSED.caseKey && scopeRefusal(facts({ key: "case.applied_for" }), "filing") === null);
ok("C3.16-2 fail (m1): Filing on a person's fact is 422", scopeRefusal(facts(), "filing")?.message === SCOPE_WORDS_REFUSED.filingKey);
ok("C3.16-2 fail: a field placed per row refuses Household (a household list is not built)", scopeRefusal(facts({ placements: [{ repeats: "per_row", condition: false }] }), "household")?.message === SCOPE_WORDS_REFUSED.perRow);
ok("C3.16-2 fail (M2, QA-152): a field a representative's box reads refuses Organisation", scopeRefusal(facts({ representativeBox: true }), "organisation")?.message === SCOPE_WORDS_REFUSED.representative);
ok("C3.16-2 fail (M1): a placement with a condition refuses Household", scopeRefusal(facts({ placements: [{ repeats: "per_person", condition: true }] }), "household")?.message === SCOPE_WORDS_REFUSED.condition);
ok("C3.16-2 fail (m2): representative facts, date of birth and has-children stay about each person", ["representative.family_name", "person.date_of_birth", "person.has_children"].every((key) => scopeRefusal(facts({ key }), "household")?.message === SCOPE_WORDS_REFUSED.personOnly));
ok("C3.16-2 (#1054 M3): a marked field cannot be placed per row or with a condition; an unmarked one can", placementRefusal("HOUSEHOLD", { repeats: "per_row", condition: null }) === SCOPE_WORDS_REFUSED.perRow && placementRefusal("ORGANISATION", { repeats: "per_person", condition: { op: "eq" } }) === SCOPE_WORDS_REFUSED.condition && placementRefusal("CLIENT_LEVEL", { repeats: "per_row", condition: { op: "eq" } }) === null && placementRefusal("HOUSEHOLD", { repeats: "per_person", condition: null }) === null);

// ---- the resolver (R5 with the mark)
const hh = { repeats: "per_person", scope: "household" }, org = { repeats: "per_person", scope: "organisation" }, plain = { repeats: "per_person" };
ok("C3.16 BR-4: a marked household or organisation fact is asked once on the case; an unmarked organisation. fact is not", R.isFilingFact("relationship.union_date", hh) && R.isFilingFact("organisation.employer_name", org) && !R.isFilingFact("organisation.employer_name", plain) && !R.isFilingFact("person.family_name", plain));
ok("C3.16 (fail): R5 is unchanged without a mark (case. and once-per-case are filing; organisation. is organisation; else person)", R.scopeOf("case.x", plain) === "filing" && R.scopeOf("person.x", { repeats: "once_per_case" }) === "filing" && R.scopeOf("organisation.x", plain) === "organisation" && R.scopeOf("person.x", plain) === "person");
const box = (person: string) => ({ fact: "relationship.union_date", person });
ok("C3.16-3 pass: each partner's box \"date of the union, read through the partner\" reads the one value on the case", R.aboutOf(family, "principal", box("subject_spouse_or_partner"), hh) === FILING && R.aboutOf(family, "spouse_or_partner", box("subject_spouse_or_partner"), hh) === FILING);
ok("C3.16-3 fail (B2): a child's box finds no spouse, so it stays blank (never the parents' date)", R.aboutOf(family, "child-1", box("subject_spouse_or_partner"), hh) === null);
ok("C3.16-3 fail: a married applicant whose partner is not on the case: the box stays blank, so nothing is asked", R.aboutOf(alone, "principal", box("subject_spouse_or_partner"), hh) === null);
ok("C3.16-3: a household box about the form's subject or about nobody reads the case; a relative's reading is kept", R.aboutOf(family, "spouse_or_partner", box("form_subject"), hh) === FILING && R.aboutOf(family, "principal", box("none"), hh) === FILING && R.aboutOf(family, "principal", box("subject_parent_1"), hh) === "principal/parent_1");
const emp = (person: string) => ({ fact: "organisation.employer_name", person });
ok("C3.16-5 pass: a marked employer fact fills the principal's form from the case", R.aboutOf(family, "principal", emp("none"), org) === FILING && R.aboutOf(family, "principal", emp("form_subject"), org) === FILING);
ok("C3.16-5 fail: it never fills another person's form (one employer per case: the principal's)", R.aboutOf(family, "spouse_or_partner", emp("none"), org) === null && R.aboutOf(family, "child-1", emp("form_subject"), org) === null);
ok("C3.16-5 (fail): unmarked, an organisation. fact is read on the form's subject as before", R.aboutOf(family, "spouse_or_partner", emp("none"), plain) === "spouse_or_partner");

// ---- documents still supply a marked fact (challenge M4)
const snap = (scope?: string) => ({
  placements: [{ fact: "organisation.employer_name", section_id: "work", repeats: "per_person", ...(scope ? { scope } : {}) }, { fact: "relationship.union_date", section_id: "family", repeats: "per_person", ...(scope ? { scope: "household" } : {}) }],
  document_types: [{ key: "offer", name: "Job offer letter (Sample)", supplies_facts: ["organisation.employer_name"] }, { key: "marriage", name: "Marriage certificate (Sample)", supplies_facts: ["relationship.union_date"] }],
  document_requirements: [{ document_type_key: "offer", document_type: "Job offer letter (Sample)", who: "principal_applicant", base_or_conditional: "base" }, { document_type_key: "marriage", document_type: "Marriage certificate (Sample)", who: "spouse_or_partner", base_or_conditional: "base" }],
}) as unknown as Snapshot;
const docs = documentFacts(snap("organisation"), family);
ok("C3.16 (M4) pass: the principal's job offer letter still supplies the employer name, now on the case", (docs.get(FILING)?.get("organisation.employer_name") ?? []).some((x) => x.key === "offer"));
ok("C3.16 (M4) pass: a member's marriage certificate supplies the household date on the case", (docs.get(FILING)?.get("relationship.union_date") ?? []).some((x) => x.key === "marriage"));
ok("C3.16 (M4, fail): unmarked, nothing is added on the case", !documentFacts(snap(), family).get(FILING));

// ---- words
ok("C3.16 BR-4: the save refusals and the tags in words", ONCE_WORDS.household === "This is asked once for the household, not for a person." && ONCE_WORDS.organisation === "This is asked once for the employer, not for a person." && SCOPE_TAG.household === "For the household" && SCOPE_TAG.organisation === "About the employer");

process.exit(summary() ? 1 : 0);
