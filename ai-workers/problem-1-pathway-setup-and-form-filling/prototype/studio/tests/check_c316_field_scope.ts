// C3.16 (L-SA4; SA-1B-130, SA-1B-134; concept product/screens/C3.16-field-scope/concept.md r4, approved on #1054): the
// one scope reader (engine/field-scope.ts) and how the resolver asks and reads a field with a new scope. Pure: no
// database, no server (US$0). Each rule has a passing and a failing case. The live route and a real case are proven by
// acceptance/C3.16.test.ts (six part and case part).
//   tsx studio/tests/check_c316_field_scope.ts
import { FILING, type PersonOnFiling } from "../contracts/resolver.ts";
import { markOf, mergeScopeRefusal, ONCE_WORDS, placementRefusal, SCOPE_TAG, SCOPE_WORDS_REFUSED, scopeMark, scopeOfStored, scopeRefusal, storedOfScope, type ScopeFacts } from "../engine/field-scope.ts";
import * as R from "../engine/resolver.ts";
import { caseSuppliers, documentFacts } from "../engine/sources.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";
import { carriedFacts } from "../engine/runtime/employer.ts";

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
ok("C3.16-2 fail (break round 2, m3): Household on an employer fact (organisation.) is 422 in words; Organisation is allowed", scopeRefusal(facts({ key: "organisation.employer_address" }), "household")?.status === 422 && scopeRefusal(facts({ key: "organisation.employer_address" }), "household")?.message === SCOPE_WORDS_REFUSED.employerHousehold && scopeRefusal(facts({ key: "organisation.employer_address" }), "organisation") === null);
ok("C3.16-2 fail: Person on a case. field is 422; Filing on a case. field is allowed", scopeRefusal(facts({ key: "case.applied_for" }), "person")?.message === SCOPE_WORDS_REFUSED.caseKey && scopeRefusal(facts({ key: "case.applied_for" }), "filing") === null);
ok("C3.16-2 fail (m1): Filing on a person's fact is 422", scopeRefusal(facts(), "filing")?.message === SCOPE_WORDS_REFUSED.filingKey);
ok("C3.16-2 fail: a field placed per row refuses Household (a household list is not built)", scopeRefusal(facts({ placements: [{ repeats: "per_row", condition: false }] }), "household")?.message === SCOPE_WORDS_REFUSED.perRow);
ok("C3.16-2 fail (M2, QA-152): a field a representative's box reads refuses Organisation", scopeRefusal(facts({ representativeBox: true }), "organisation")?.message === SCOPE_WORDS_REFUSED.representative);
ok("C3.16-2 fail (M1): a placement with a condition refuses Household", scopeRefusal(facts({ placements: [{ repeats: "per_person", condition: true }] }), "household")?.message === SCOPE_WORDS_REFUSED.condition);
ok("C3.16-2 fail (m2): representative facts, date of birth and has-children stay about each person", ["representative.family_name", "person.date_of_birth", "person.has_children"].every((key) => scopeRefusal(facts({ key }), "household")?.message === SCOPE_WORDS_REFUSED.personOnly));
ok("C3.16-2 (#1054 M3): a marked field cannot be placed per row or with a condition; an unmarked one can", placementRefusal("HOUSEHOLD", { repeats: "per_row", condition: null }) === SCOPE_WORDS_REFUSED.perRow && placementRefusal("ORGANISATION", { repeats: "per_person", condition: { op: "eq" } }) === SCOPE_WORDS_REFUSED.condition && placementRefusal("CLIENT_LEVEL", { repeats: "per_row", condition: { op: "eq" } }) === null && placementRefusal("HOUSEHOLD", { repeats: "per_person", condition: null }) === null);

ok("C3.16-2 fail (break m4): a merged field refuses with its own words, naming the field it went into", scopeRefusal(facts({ merged: "Kept name" }), "household")?.message === `${SCOPE_WORDS_REFUSED.merged}, "Kept name".` && !/[a-z]+\.[a-z_]+/.test(scopeRefusal(facts({ merged: "Kept name" }), "household")!.message));
ok("C3.16 (break 1): a merge of two scopes is refused in words; the same scope merges", /merged only when both are asked about the same people/.test(mergeScopeRefusal("Employer name", "ORGANISATION", "Firm name", "CLIENT_LEVEL") ?? "") && mergeScopeRefusal("A", "CLIENT_LEVEL", "B", "CLIENT_LEVEL") === null);

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
ok("C3.16-5 fail (review M1): on the principal's own form, an employer box about anyone else reads nothing (partner, child, parent, sibling)", ["subject_spouse_or_partner", "subject_child", "subject_parent_1", "subject_sibling"].every((p) => R.aboutOf(family, "principal", emp(p), org) === null) && R.aboutOf(alone, "principal", emp("subject_spouse_or_partner"), org) === null);
ok("C3.16 fail (review M1, QA-152): a representative's box keeps its own reading for a marked employer or household fact", R.aboutOf(family, "principal", emp("representative"), org) === "representative" && R.aboutOf(family, "principal", box("representative"), hh) === "representative" && R.aboutOf(alone, "principal", emp("representative"), org) === "representative");
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
ok("C3.16 (break round 3, M1) pass: the household fact's suppliers are every member; the employer fact's the principal only", caseSuppliers(snap("organisation"), family, "relationship.union_date").join(",") === family.map((p) => p.id).join(",") && caseSuppliers(snap("organisation"), family, "organisation.employer_name").join(",") === "principal");
ok("C3.16 (break round 3, M1, fail): an unmarked fact has no case suppliers (Preview keeps each person's own document line)", caseSuppliers(snap(), family, "relationship.union_date").length === 0 && caseSuppliers(snap(), family, "organisation.employer_name").length === 0);

// ---- second lander with #1051 (tech lead on #1054, comment 6650232198): an employer copy goes where the one reader reads
// it. carriedFacts writes on the case's own record exactly when the placement is stored once (isFilingFact): with C3.16,
// a field marked Organisation (or Household) too; an unmarked "organisation." fact stays on the principal.
{
  const snap = (scope: string | null) => ({ combination: { label: "Sample work permit", client_type: "RETAIL" },
    field_maps: [{ entries: [{ fact: "organisation.employer_name", outcome: "mapped", person: "form_subject", data_path: "IMM_5710[0].Employer[0]" }] }],
    placements: [{ fact: "organisation.employer_name", repeats: "per_person", ...(scope ? { scope } : {}), order: 1 }],
    canonical_fields: [{ id: "organisation.employer_name", label: "Employer name" }] });
  const ec = { key: "sample-employer", firm: "sample-firm", label: "Sample Employer Ltd (Sample)", facts: { "organisation.employer_name": "Sample Employer Ltd (Sample)" } };
  const marked = carriedFacts(snap("organisation") as never, ec), unmarked = carriedFacts(snap(null) as never, ec), household = carriedFacts(snap("household") as never, ec);
  ok("C3.16 x #1051 pass: carriedFacts with { repeats: \"per_person\", scope: \"organisation\" } writes on the case (on: \"case\")", marked.length === 1 && marked[0].on === "case", marked);
  // Break round 2, m3: Household is refused on an employer fact (scopeRefusal), so an employer copy never carries it; the
  // reader would still put a marked fact on the case, which is why the refusal is the guard.
  ok("C3.16 x #1051 fail (break round 2, m3): Household cannot be set on the employer's fact (the refusal is the guard; a copy marked Household by other means would still go on the case)", scopeRefusal(facts({ key: "organisation.employer_name" }), "household")?.status === 422 && household.length === 1 && household[0].on === "case");
  ok("C3.16 x #1051 fail: an unmarked organisation. fact stays on the principal (as before C3.16)", unmarked.length === 1 && unmarked[0].on === "principal", unmarked);
}

// ---- words
ok("C3.16 BR-4: the save refusals and the tags in words", ONCE_WORDS.household === "This is asked once for the household, not for a person." && ONCE_WORDS.organisation === "This is asked once for the employer, not for a person." && SCOPE_TAG.household === "For the household" && SCOPE_TAG.organisation === "About the employer");

process.exit(summary() ? 1 : 0);
