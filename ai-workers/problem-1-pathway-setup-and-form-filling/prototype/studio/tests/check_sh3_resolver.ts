// SH3 resolver contract tests (P-258; runtime lane): contracts/resolver.ts rules R1–R11, each with a passing and a failing
// (or "nobody") case, against engine/resolver.ts. They pin today's behaviour: SH3 moved the rules into one place and
// changed none. Also: the C3.16 scope shape (person and filing built, household and organisation held, P-251), the
// four places call the resolver, and the engine part stays lift-ready (P-249: no database, vendor or framework import).
// No database (US$0).
//   tsx studio/tests/check_sh3_resolver.ts
import { readFileSync } from "node:fs";
import { BUILT_SCOPES, FILING, MERGE_HOPS, SCOPE_RULES, SCOPES, WHO_HOLDERS, WHO_ROLES, factKey, sourceKey, type Known, type PersonOnFiling, type Who } from "../contracts/resolver.ts";
import * as R from "../engine/resolver.ts";
import * as render from "../engine/render.ts";
import { linesNamingRemoved, rolesNamedBy } from "../engine/people.ts";
import { documentFacts } from "../engine/sources.ts";
import { resolveKey } from "../api/src/form-lines.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import * as eligibility from "../engine/runtime/eligibility.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const same = (a: unknown, b: unknown) => JSON.stringify(a instanceof Map ? [...a] : a) === JSON.stringify(b instanceof Map ? [...b] : b);
const P = (id: string, role: string, applies = true): PersonOnFiling => ({ id, role, label: id, applies });
// A family: principal A, partner B, two children, a representative and a sponsor (who applies on nothing).
const fam = [P("A", "principal"), P("B", "spouse_or_partner"), P("child-1", "child"), P("child-2", "child"), P("R", "representative", false), P("S", "sponsor", false)];
const single = [P("A", "principal")];

// ---- R1 people on a filing
ok("SH3 R1: one person keeps the role as id; a child is always numbered; several are numbered and labelled", same(
  R.peopleFor([{ role: "principal", label: "Principal", min: 1 }, { role: "child", label: "Child", preview: 1 }, { role: "spouse_or_partner", label: "Parent", min: 2, applies: false }]),
  [{ id: "principal", role: "principal", label: "Principal", applies: true }, { id: "child-1", role: "child", label: "Child", applies: true },
   { id: "spouse_or_partner-1", role: "spouse_or_partner", label: "Parent 1", applies: false }, { id: "spouse_or_partner-2", role: "spouse_or_partner", label: "Parent 2", applies: false }]));
ok("SH3 R1 (fail): a line of 0, or a negative preview, gives nobody; preview wins over min", R.peopleFor([{ role: "child", label: "C", min: 0 }, { role: "x", label: "X", preview: -1, min: 3 }, { role: "y", label: "Y", preview: 0, min: 2 }]).length === 0);
ok("SH3 R1: filing-scope values sit on one subject per case, \"case\", read by every filing on it (no filing id yet)", FILING === "case" && R.subjectOf(FILING).id === FILING);

// ---- R2 line holders
const holders = (who: string, kind?: string) => R.subjectsFor(fam, who, kind);
ok("SH3 R2: each_applicant (and each_adult_18_plus) = every applicant except the representative", same(holders("each_applicant"), ["A", "B", "child-1", "child-2"]) && same(holders("each_adult_18_plus"), holders("each_applicant")));
ok("SH3 R2: each_person leaves out the representative and the sponsor, applicant or not", same(holders("each_person"), ["A", "B", "child-1", "child-2"]) && same(R.subjectsFor([P("A", "principal"), P("S", "sponsor", true)], "each_person"), ["A"]));
ok("SH3 R2: principal, partner (couple_once too), children, representative, sponsor, case", same(holders("principal_applicant"), ["A"]) && same(holders("couple_once"), ["B"]) && same(holders("spouse_or_partner"), ["B"]) && same(holders("each_dependent_child"), ["child-1", "child-2"]) && same(holders("representative"), ["R"]) && same(holders("sponsor"), ["S"]) && same(holders("case"), [FILING]));
ok("SH3 R2: a subject kind wins over the who (CASE → the filing; SPOUSE on a principal's line → the partner)", same(holders("principal_applicant", "CASE"), [FILING]) && same(holders("principal_applicant", "SPOUSE"), ["B"]) && same(holders("each_person", "DEPENDENT"), ["child-1", "child-2"]) && same(holders("case", "PRINCIPAL"), ["A"]));
ok("SH3 R2 (fail): an unknown who, or a role nobody on the case has, names nobody", holders("cousin").length === 0 && R.subjectsFor(single, "spouse_or_partner").length === 0 && R.subjectsFor(single, "each_dependent_child", undefined).length === 0);
ok("SH3 R2: the condition's subject never moves a line's holders (lineHolders = the who alone)", same(R.lineHolders(fam, "principal_applicant"), ["A"]));
// Review m3: the studio's own list, read from its source (importing studio.ts would start its services).
const studioWho = JSON.parse(/export const WHO = (\[[^\]]*\])/.exec(readFileSync(new URL("../api/src/studio.ts", import.meta.url), "utf8"))![1]) as string[];
// QA-221 (ruling C): a form line may also name the principal, a spouse or partner and each child 18 or older (FORM_WHO).
const formWho = /export const FORM_WHO = \[\.\.\.WHO, "([a-z_]+)"\]/.exec(readFileSync(new URL("../api/src/studio.ts", import.meta.url), "utf8"))?.[1];
ok("SH3 R2: the contract's who values are the studio's list plus each_adult_18_plus (release data and the runtime only) and the form lines' principal_partner_adult_children (QA-221)", formWho === "principal_partner_adult_children" && same([...studioWho, "each_adult_18_plus", formWho].sort(), Object.keys(WHO_HOLDERS).sort()));
ok("SH3 R2 (fail): each_adult_18_plus is not offered in the studio's list, and the form lines' value is not offered for documents or rules", !studioWho.includes("each_adult_18_plus") && !studioWho.includes("principal_partner_adult_children"));
ok("SH3 R2 (QA-221): principal_partner_adult_children holds every applicant (the line's minimum age then gates children only)", same(holders("principal_partner_adult_children"), holders("each_applicant")));

// ---- R3 condition subjects
const cs = (holder: string, kind?: string) => R.conditionSubjects(fam, holder, kind);
ok("SH3 R3: DOCUMENT → a document decides; CASE → the filing", cs("A", "DOCUMENT") === "document" && same(cs("child-1", "CASE"), [FILING]));
ok("SH3 R3: no kind, EACH_APPLICANT or EACH_PERSON → the holder; the filing as holder → the principal", same(cs("B"), ["B"]) && same(cs("B", "EACH_PERSON"), ["B"]) && same(cs("child-2", "EACH_APPLICANT"), ["child-2"]) && same(cs(FILING), ["A"]) && same(R.conditionSubjects([], FILING, undefined), [FILING]));
ok("SH3 R3: DEPENDENT on a child's line → that child; on the principal's line → every child", same(cs("child-2", "DEPENDENT"), ["child-2"]) && same(cs("A", "DEPENDENT"), ["child-1", "child-2"]));
ok("SH3 R3 (fail): SPOUSE with nobody of that role → nobody, so the line is not needed", same(R.conditionSubjects(single, "A", "SPOUSE"), []));
ok("SH3 R3: lineCondition decides on the subjects (any one is enough), and says nobody when none", (() => {
  const s = { derived_fields: [] } as never, tree = { subjectKind: "DEPENDENT", op: "eq", field: "person.student", value: true };
  const k: Known = new Map([["child-2|person.student", { value: true, status: "answered", source: "t" }], ["child-1|person.student", { value: false, status: "answered", source: "t" }]]);
  return render.lineCondition(s, k, fam, "A", tree).applies === true && render.lineCondition(s, k, single, "A", tree).applies === false && render.lineCondition(s, k, single, "A", tree).nobody === "children";
})());

// ---- R4 box owner, R5 scope
const box = (subject: string, person: string | null | undefined, fact = "person.name", row?: number, placement?: { repeats?: string }) => R.aboutOf(fam, subject, { fact, person, row }, placement);
ok("SH3 R4: form_subject → the subject; partner of a principal is the partner and the other way round", box("child-1", "form_subject") === "child-1" && box("A", "subject_spouse_or_partner") === "B" && box("B", "subject_spouse_or_partner") === "A");
ok("SH3 R4 (fail): a child's partner, or a single principal's, is nobody (null)", box("child-1", "subject_spouse_or_partner") === null && R.aboutOf(single, "A", { fact: "person.name", person: "subject_spouse_or_partner" }) === null);
ok("SH3 R4: subject_child reads the case's child of the row (0 when unset), or nobody", box("A", "subject_child") === "child-1" && box("B", "subject_child", "person.name", 1) === "child-2" && box("A", "subject_child", "person.name", 2) === null);
ok("SH3 R4: parents and siblings are relatives of the subject, not people on the case", box("B", "subject_parent_1") === "B/parent_1" && box("B", "subject_parent_2") === "B/parent_2" && box("A", "subject_sibling") === "A/sibling");
ok("SH3 R4: representative → the case's representative, or the literal \"representative\" when none", box("A", "representative") === "R" && R.aboutOf(single, "A", { fact: "x", person: "representative" }) === "representative");
ok("SH3 R4: no person → the filing; an unknown person → nobody", box("A", "none") === FILING && box("A", null) === FILING && box("A", undefined) === FILING && box("A", "neighbour") === null);
ok("SH3 R5: a case. fact or a once-per-case placement is a filing fact, whoever the box names", box("B", "form_subject", "case.purpose") === FILING && box("B", "subject_spouse_or_partner", "person.name", undefined, { repeats: "once_per_case" }) === FILING && R.scopeOf("case.purpose") === "filing" && R.isFilingFact("person.x", { repeats: "once_per_case" }));
ok("SH3 R5: an organisation. fact is organisation-scoped (held) and read on the form's subject", R.scopeOf("organisation.legal_name") === "organisation" && box("B", "subject_spouse_or_partner", "organisation.legal_name") === "B");
ok("SH3 R5 (fail): any other fact is a person fact; nothing is household-scoped yet", R.scopeOf("person.date_of_birth") === "person" && R.scopeOf("") === "person" && R.scopeOf("household.marriage_date") === "person");

// ---- R6 facts a subject sees
const known: Known = new Map(Object.entries({ "A|person.name": "principal-name", "B|person.name": "partner-name", "case|case.purpose": "visit", "A|person.job|0": "row", "A/parent_1|person.name": "parent-name" }).map(([k, value]) => [k, { value, status: "answered" as const, source: "t" }]));
ok("SH3 R6: a person sees their own facts and the filing's", same(R.factsOf(known, "A"), { "person.name": "principal-name", "case.purpose": "visit" }));
ok("SH3 R6 (fail): never another person's, never a list row; a relative sees only their own and the filing's", R.factsOf(known, "B")["person.name"] === "partner-name" && !("person.job" in R.factsOf(known, "A")) && same(R.factsOf(known, "A/parent_1"), { "case.purpose": "visit", "person.name": "parent-name" }) && same(R.factsOf(known, FILING), { "case.purpose": "visit" }));

// ---- R6b whose value a person's fact is read from (SH3 follow-up d1: engine/runtime/eligibility.ts aboutOf)
const kv = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "t" }]));
ok("SH3 R6b: the person's own answer first, else the filing's (a fact asked once per case)", R.valueHolder(kv({ "A|person.x": 1, "case|person.x": 2 }), "person.x", "A") === "A" && R.valueHolder(kv({ "case|relationship.start_date": "2020-01-01" }), "relationship.start_date", "A") === FILING);
ok("SH3 R6b (fail): unanswered → by the id rule (case. → the filing, else the person); an empty or null answer is no answer", R.valueHolder(kv({}), "case.purpose", "A") === FILING && R.valueHolder(kv({}), "person.x", "A") === "A" && R.valueHolder(kv({ "A|person.x": "", "case|person.x": null }), "person.x", "A") === "A" && R.valueHolder(kv({ "A|case.p": "" }), "case.p", "A") === FILING);
ok("SH3 d1: eligibility's aboutOf is the resolver's R6b", eligibility.aboutOf === R.valueHolder && R.resolver.valueHolder === R.valueHolder);

// ---- R7 signers
const sign = (who: string, by: string | null | undefined, people = fam) => R.formSigners(people, who, by);
ok("SH3 R7: unset or person → each person the form is about signs their own", same(sign("each_applicant", undefined), sign("each_applicant", "person")) && same(sign("principal_applicant", null), new Map([["A", ["A"]]])));
ok("SH3 R7: parent_for_minor → the principal signs for a child; principal_for_family → the principal signs for all", same(sign("each_dependent_child", "parent_for_minor"), new Map([["A", ["child-1", "child-2"]]])) && same(sign("each_applicant", "principal_for_family"), new Map([["A", ["A", "B", "child-1", "child-2"]]])));
ok("SH3 R7: person_and_representative adds each representative; a case form is signed by the principal", same(sign("spouse_or_partner", "person_and_representative"), new Map([["B", ["B"]], ["R", ["B"]]])) && same(sign("case", "person"), new Map([["A", [FILING]]])));
ok("SH3 R7 (fail): none → nobody; a case form with no principal → nobody", sign("each_applicant", "none").size === 0 && sign("case", "person", [P("B", "spouse_or_partner")]).size === 0);
ok("SH3 R7: signs for others only when a row is someone else's (the filing never counts)", R.signsForOthers("A", ["A", "child-1"]) && !R.signsForOthers("A", ["A", FILING]));

// ---- R8 keys
ok("SH3 R8: a value's key is about|fact, plus |row for a list row (0 is a row)", factKey("A", "person.name") === "A|person.name" && factKey("A", "x", 0) === "A|x|0" && factKey("A", "x", null) === "A|x" && R.kkey === factKey && render.kkey === factKey);
ok("SH3 R8: where an answer comes from is chosen per role and fact (every child shares one choice)", sourceKey("child", "person.name") === "child|person.name" && R.roleOf(fam, "child-2") === "child" && R.roleOf(fam, "child-1") === "child");
ok("SH3 R8 (fail): a relative's role is its person's; nobody on the case keeps the key; the filing is the filing", R.roleOf(fam, "B/parent_1") === "spouse_or_partner" && R.roleOf(fam, "ghost") === "ghost" && R.roleOf(fam, FILING) === FILING);

// ---- R9 canonical fact id
const store = (m: Record<string, string>) => async (k: string) => m[k] ?? null;
const chain = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`f${i}`, `f${i + 1}`]));
ok("SH3 R9: an unmerged key answers itself; a merge redirects, along a chain", await R.canonicalFact("a", store({})) === "a" && await R.canonicalFact("a", store({ a: "b", b: "c" })) === "c");
ok(`SH3 R9: a chain of ${MERGE_HOPS - 1} hops is followed to its end`, await R.canonicalFact("f0", store(chain(MERGE_HOPS - 1))) === `f${MERGE_HOPS - 1}`);
ok(`SH3 R9 (fail): a chain of ${MERGE_HOPS} or more hops, or a loop, answers the key asked`, await R.canonicalFact("f0", store(chain(MERGE_HOPS))) === "f0" && await R.canonicalFact("a", store({ a: "b", b: "a" })) === "a");
ok("SH3 R9: MERGE_HOPS is 5 (the store is asked at most 5 times, so at most 4 redirects are followed)", MERGE_HOPS === 5);
ok("SH3 R9: form-lines.ts resolveKey asks the newest version of each field, through canonicalFact", await (async () => {
  const asked: unknown[] = [];
  const rows: Record<string, string | null> = { "person.old": "person.mid", "person.mid": "person.new", "person.new": null };
  const db = { canonicalField: { findFirst: async (q: { where: { workspaceId: string; canonicalFieldKey: string }; orderBy: unknown }) => { asked.push(q); return { mergedIntoKey: rows[q.where.canonicalFieldKey] ?? null }; } } };
  const got = await resolveKey(db as never, "w1", "person.old");
  return got === "person.new" && asked.length === 3 && same(asked[0], { where: { workspaceId: "w1", canonicalFieldKey: "person.old" }, orderBy: { version: "desc" } });
})());
ok("SH3 R9: the store is asked one hop at a time, at most MERGE_HOPS times", await (async () => { let asks = 0; await R.canonicalFact("a", async () => { asks++; return "a"; }); return asks === MERGE_HOPS; })());

// ---- R10 roles a who names, agreeing with R2
ok("SH3 R10: partner, couple, children, representative and sponsor lines name their role; the others none", same(rolesNamedBy("spouse_or_partner"), ["spouse_or_partner"]) && same(rolesNamedBy("couple_once"), ["spouse_or_partner"]) && same(rolesNamedBy("each_dependent_child"), ["child"]) && same(rolesNamedBy("representative"), ["representative"]) && same(rolesNamedBy("sponsor"), ["sponsor"]) && ["each_applicant", "principal_applicant", "each_person", "case", "each_adult_18_plus", "nonsense"].every((w) => rolesNamedBy(w).length === 0));
ok("SH3 R10: removing the only partner warns on a partner's line, not on the principal's", same(linesNamingRemoved([{ role: "spouse_or_partner", max: 1 }], [{ role: "spouse_or_partner", max: 0 }], [{ form: "IMM 5409", who: "couple_once" }, { form: "IMM 5257", who: "principal_applicant" }]), [{ form: "IMM 5409", who: "couple_once", roles: ["spouse_or_partner"] }]));
ok("SH3 R10 agrees with R2: a who that names roles holds exactly the people of those roles", (Object.keys(WHO_HOLDERS) as Who[]).every((w) => {
  const roles = WHO_ROLES[w]; if (!roles) return true;
  const ids = R.subjectsFor(fam, w); return ids.length > 0 && ids.every((id) => roles.includes(fam.find((p) => p.id === id)!.role)) && fam.filter((p) => roles.includes(p.role)).every((p) => ids.includes(p.id));
}));

// ---- C3.16 shape and scopes (#1054)
ok("SH3 C3.16: the four scopes, all built (#1054)", same(SCOPES, ["person", "filing", "household", "organisation"]) && same(BUILT_SCOPES, ["person", "filing", "household", "organisation"]));
ok("SH3 C3.16: each scope maps to the team's FieldScope value (SA-1B-130 §7)", same(SCOPES.map((s) => SCOPE_RULES[s].team), ["PERSON", "FILING", "HOUSEHOLD", "ORGANISATION"]));
ok("SH3 C3.16 (fail): no about-key resolves to a household or organisation subject: their values sit on the filing record", ["A", "B/parent_1", FILING, "organisation"].every((a) => ["person", "filing"].includes(R.subjectOf(a).scope)) && R.subjectOf(FILING).scope === "filing");

// ---- Review m2: the call sites, pinned by what they answer (not only by their source)
ok("SH3 sources.ts: a document's holder.spouse facts are the partner's (R4 partnerOf), a child's none, a parent's the relatives'", (() => {
  const S = { document_requirements: [{ document_type_key: "mc", document_type: "Marriage certificate", who: "each_applicant", base_or_conditional: "base" }],
    document_types: [{ key: "mc", name: "Marriage certificate", supplies_facts: ["person.name", "person.birth_place"], supplies_about: { "person.name": "holder.spouse", "person.birth_place": "holder.parent" } }] } as unknown as Snapshot;
  const d = documentFacts(S, fam);
  return !!d.get("B")?.get("person.name") && !!d.get("A")?.get("person.name") && !d.get("child-1")?.get("person.name") && !!d.get("A/parent_1")?.get("person.birth_place") && !!d.get("child-2/parent_2")?.get("person.birth_place");
})());
ok("C7.7 render (c) pass: an unanswered deciding fact is asked where R5 with its placement says: once per case → on the filing; case.* on the filing", (() => {
  const S = { combination: { key: "t", participants: [] }, canonical_fields: [{ id: "person.flag", value_type: "yes_no" }, { id: "case.mode", value_type: "code" }], derived_fields: [], field_maps: [], checks: [], rules: [], document_types: [], document_requirements: [],
    sections: [{ id: "s1", title: "S" }], placements: [{ fact: "person.flag", section_id: "s1", repeats: "once_per_case", collected_from: "client_questionnaire" }, { fact: "case.mode", section_id: "s1", repeats: "once", collected_from: "client_questionnaire" }],
    forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { op: "and", args: [{ op: "eq", field: "person.flag", value: true }, { op: "eq", field: "case.mode", value: "x" }] } }] } as unknown as Snapshot;
  const r = render.render(S, single, new Map());
  const about = (f: string) => r.deciders.filter((x) => x.fact === f).map((x) => x.about);
  return same(about("person.flag"), [FILING]) && same(about("case.mode"), [FILING]);
})());
ok("C7.7 render (c) fail: a person fact placed once (not once per case) is still asked of the person, never on the filing", (() => {
  const S = { combination: { key: "t", participants: [] }, canonical_fields: [{ id: "person.flag", value_type: "yes_no" }], derived_fields: [], field_maps: [], checks: [], rules: [], document_types: [], document_requirements: [],
    sections: [{ id: "s1", title: "S" }], placements: [{ fact: "person.flag", section_id: "s1", repeats: "once", collected_from: "client_questionnaire" }],
    forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { op: "eq", field: "person.flag", value: true } }] } as unknown as Snapshot;
  return same(render.render(S, single, new Map()).deciders.filter((x) => x.fact === "person.flag").map((x) => x.about), ["A"]);
})());

ok("SH3 render (review r2-m1): an answered deciding fact placed once per case stays on the person; the placement asks it once on the filing too", (() => {
  const S = { combination: { key: "t", participants: [] }, canonical_fields: [{ id: "person.flag", value_type: "yes_no" }], derived_fields: [], field_maps: [], checks: [], rules: [], document_types: [], document_requirements: [],
    sections: [{ id: "s1", title: "S" }], placements: [{ fact: "person.flag", section_id: "s1", repeats: "once_per_case", collected_from: "client_questionnaire" }],
    forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { op: "eq", field: "person.flag", value: true } }] } as unknown as Snapshot;
  const k: Known = new Map([["A|person.flag", { value: true, status: "answered", source: "t" }]]);
  const abouts = render.render(S, single, k).questions.filter((q) => q.fact === "person.flag").map((q) => q.about).sort();
  return same(abouts, ["A", FILING]);
})());
// Review r4-m4: r3-m1 in its own check, so a failure names its own rule.
ok("SH3 render (review r3-m1): an answered case.* deciding fact is kept on the filing (render.ts:156; rule-only, so only that path asks it)", (() => {
  const S = { combination: { key: "t", participants: [] }, canonical_fields: [{ id: "person.flag", value_type: "yes_no" }], derived_fields: [], field_maps: [], checks: [], rules: [], document_types: [], document_requirements: [],
    sections: [{ id: "s1", title: "S" }], placements: [{ fact: "person.flag", section_id: "s1", repeats: "once_per_case", collected_from: "client_questionnaire" }],
    forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { op: "eq", field: "person.flag", value: true } }] } as unknown as Snapshot;
  const S2 = { ...S, canonical_fields: [{ id: "case.mode", value_type: "code" }], placements: [{ fact: "case.mode", section_id: "s1", repeats: "once", collected_from: "client_questionnaire", rule_only: true }], forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { op: "eq", field: "case.mode", value: "x" } }] } as unknown as Snapshot;
  const k2: Known = new Map([["case|case.mode", { value: "x", status: "answered", source: "t" }]]);
  const r2 = render.render(S2, single, k2).questions.filter((q) => q.fact === "case.mode").map((q) => q.about);
  return same(r2, [FILING]);
})());

// ---- C7.7 (contract item (a)): form and check conditions are decided by R3, like a document line's
{
  const base = { combination: { key: "t", participants: [] }, canonical_fields: [{ id: "person.employed", value_type: "yes_no" }], derived_fields: [], field_maps: [], rules: [], document_types: [], document_requirements: [],
    sections: [{ id: "s1", title: "S" }], placements: [{ fact: "person.employed", section_id: "s1", repeats: "once", collected_from: "client_questionnaire" }] };
  const spouseForm = { ...base, checks: [], forms: [{ form_number: "F1", who: "principal_applicant", status: "conditional", condition: { subjectKind: "SPOUSE", op: "eq", field: "person.employed", value: true } }] } as unknown as Snapshot;
  const k = (entries: [string, unknown][]): Known => new Map(entries.map(([key, value]) => [key, { value, status: "answered" as const, source: "t" }]));
  const f1 = (people: PersonOnFiling[], known: Known) => render.render(spouseForm, people, known).forms.find((x) => x.form === "F1" && x.person === "A");
  ok("C7.7 R3 form pass: a principal's form whose condition is about the spouse is decided on the spouse's answer (spouse employed → needed, though the principal is not)", f1(fam, k([["B|person.employed", true], ["A|person.employed", false]]))?.applies === true);
  ok("C7.7 R3 form fail: the principal's own Yes does not decide a spouse condition (spouse not employed → not needed)", f1(fam, k([["B|person.employed", false], ["A|person.employed", true]]))?.applies === false);
  ok("C7.7 R3 form fail: with no spouse on the case the form is not needed (R3: none → not needed), never decided on the principal", f1(single, k([["A|person.employed", true]]))?.applies === false);
  ok("C7.7 R3 form: unanswered, the deciding question is asked of the spouse, not the principal", same(render.render(spouseForm, fam, new Map()).deciders.filter((x) => x.fact === "person.employed").map((x) => x.about), ["B"]));
  const check = (kind: string | undefined) => ({ ...base, forms: [], checks: [{ id: "c1", group: "section", severity: "warning", applies_to: "x", message: "m", condition: { ...(kind ? { subjectKind: kind } : {}), op: "eq", field: "person.employed", value: true } }] }) as unknown as Snapshot;
  const fired = (kind: string | undefined, people: PersonOnFiling[], known: Known) => render.render(check(kind), people, known).checks.filter((x) => x.id === "c1").map((x) => x.person).sort();
  const allYes = k([["A|person.employed", true], ["B|person.employed", true], ["child-1|person.employed", true], ["R|person.employed", true]]);
  const withRep = [P("A", "principal"), P("B", "spouse_or_partner"), P("child-1", "child"), P("R", "representative", true)];
  ok("C7.7 R3 check pass: a principal check fires once, on the principal, though the spouse and the child answered the same", same(fired("PRINCIPAL", withRep, allYes), ["A"]));
  ok("C7.7 R3 check fail: a spouse check never fires for the principal or a child (before: it read each person's own answer)", same(fired("SPOUSE", withRep, allYes), ["B"]));
  ok("C7.7 R3 check fail: a check with no subject kind fires for each applicant, never for an applying representative (R2 each_applicant)", same(fired(undefined, withRep, allYes), ["A", "B", "child-1"]));
  ok("C7.7 R3 check fail: a DOCUMENT check is decided on a document's contents, never on answers", same(fired("DOCUMENT", withRep, allYes), []));
  const agedForm = { ...base, canonical_fields: [...base.canonical_fields, { id: "person.date_of_birth", value_type: "date" }], checks: [], forms: [{ form_number: "F2", who: "each_applicant", status: "conditional", min_age: 18, condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.employed", value: true } }] } as unknown as Snapshot;
  const f2 = (known: Known) => render.render(agedForm, fam, known, { today: new Date("2026-11-03") });
  const f2b = f2(k([["A|person.employed", true]]));
  ok("C7.7 R3 form with a minimum age: the role condition is the principal's, the age the holder's: the spouse's row waits for the spouse's date of birth only", f2b.forms.find((x) => x.form === "F2" && x.person === "B")?.applies === "cannot_tell" && same(f2b.deciders.filter((d) => /F2 applies to B\b/.test([...d.decides].join())).map((d) => `${d.about}|${d.fact}`), ["B|person.date_of_birth"]));
  ok("C7.7 R3 form with a minimum age (fail): the principal not employed → not needed for anyone, whatever their age", f2(k([["A|person.employed", false], ["B|person.date_of_birth", "1980-01-01"]])).forms.filter((x) => x.form === "F2").every((x) => x.applies === false));
  ok("C7.7 R3 check with no applicant (only a representative, applying): a check with no kind is decided on the filing, never on the representative", same(fired(undefined, [P("R", "representative", true)], k([["R|person.employed", true]])), []) && same(render.render(check(undefined), [P("R", "representative", true)], k([["case|person.employed", true]])).checks.map((x) => x.person), [FILING]));
  ok("C7.7 R3 check pass: a CASE check is decided once, on the filing", same(render.render(check("CASE"), withRep, k([["case|person.employed", true]])).checks.map((x) => x.person), [FILING]));
}

// ---- The four places call the resolver; the engine part is lift-ready
const src = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
// ---- R11 whom a document's facts are about (C6.5 part 1; was "Not yet" (b))
ok("SH3 R11: holder → the holder; holder.spouse → the partner (either way round); holder.parent → both parents (relatives)", same(R.documentSubjects(fam, "A", "holder"), ["A"]) && same(R.documentSubjects(fam, "A", "holder.spouse"), ["B"]) && same(R.documentSubjects(fam, "B", "holder.spouse"), ["A"]) && same(R.documentSubjects(fam, "child-1", "holder.parent"), ["child-1/parent_1", "child-1/parent_2"]));
ok("SH3 R11 (fail): no partner, a child's spouse, or the filing as holder → nobody for spouse and parents; the filing keeps its own facts", same(R.documentSubjects(single, "A", "holder.spouse"), []) && same(R.documentSubjects(fam, "child-1", "holder.spouse"), []) && same(R.documentSubjects(fam, FILING, "holder.spouse"), []) && same(R.documentSubjects(fam, FILING, "holder.parent"), []) && same(R.documentSubjects(fam, FILING, "holder"), [FILING]));
ok("SH3 R11 per role: the holder's role, the partner's role, nobody for parents or a missing partner", R.documentRole(fam, "A", "holder") === "principal" && R.documentRole(fam, "A", "holder.spouse") === "spouse_or_partner" && R.documentRole(fam, "B", "holder.spouse") === "principal" && R.documentRole(fam, "A", "holder.parent") === null && R.documentRole(single, "A", "holder.spouse") === null && R.documentRole(fam, FILING, "holder") === FILING);
ok("SH3 R11: a two-person document (a marriage certificate, Sample) on the principal's line supplies the principal's and the spouse's facts, each to its own person", (() => {
  const S = { combination: { key: "t", participants: [] }, document_types: [{ key: "marriage_certificate", name: "Marriage certificate (Sample)", supplies_facts: ["relationship.start_date", "person.family_name_at_birth"], supplies_about: { "person.family_name_at_birth": "holder.spouse" } }],
    document_requirements: [{ document_type_key: "marriage_certificate", document_type: "Marriage certificate (Sample)", who: "principal_applicant", base_or_conditional: "base" }] } as unknown as Snapshot;
  const d = documentFacts(S, fam);
  return same([...(d.get("A")?.keys() ?? [])], ["relationship.start_date"]) && same([...(d.get("B")?.keys() ?? [])], ["person.family_name_at_birth"]) && !d.get("A")?.has("person.family_name_at_birth");
})());
ok("SH3 R11 (fail): the same document with no spouse on the case supplies nobody's spouse fact (never the holder's)", (() => {
  const S = { combination: { key: "t", participants: [] }, document_types: [{ key: "m", name: "M", supplies_facts: ["person.family_name_at_birth"], supplies_about: { "person.family_name_at_birth": "holder.spouse" } }], document_requirements: [{ document_type_key: "m", document_type: "M", who: "principal_applicant", base_or_conditional: "base" }] } as unknown as Snapshot;
  return documentFacts(S, single).size === 0;
})());
ok("SH3 R11: sources.ts keeps no copy of the rule (documentSubjects and documentRole, no inline parent_1/parent_2 or partnerOf)", /documentSubjects\(/.test(src("engine/sources.ts")) && /documentRole\(/.test(src("engine/sources.ts")) && !/parent_1/.test(src("engine/sources.ts")) && !/partnerOf\(/.test(src("engine/sources.ts")));

ok("SH3: render.ts re-exports the resolver's functions (no copy left)", render.aboutOf === R.aboutOf && render.subjectsFor === R.subjectsFor && render.peopleFor === R.peopleFor && render.formSigners === R.formSigners && render.conditionSubjects === R.conditionSubjects && render.lineHolders === R.lineHolders && !/function (aboutOf|subjectsFor|peopleFor|formSigners|factsOf)\b/.test(src("engine/render.ts")));
// M1 (P-291 (6)): render.ts keeps no inline copy of R2's each_applicant and no "case" literal for the filing (FILING).
const copyInRender = (t: string) => /\.applies && \w+\.role !== "representative"/.test(t) || /"case"/.test(t);
ok("SH3 M1: render.ts takes each_applicant and the filing from the resolver (no inline copy, no \"case\" literal)", !copyInRender(src("engine/render.ts")));
ok("SH3 M1 (failing case): the check catches the copy and the literal it guards against", copyInRender('const applicants = people.filter((x) => x.applies && x.role !== "representative")') && copyInRender('if (about === "case") return'));
ok("SH3: people.ts, sources.ts, fact-sources.ts and form-lines.ts call the resolver and keep no copy", /from "\.\/resolver\.ts"/.test(src("engine/people.ts")) && !/const NAMES\b/.test(src("engine/people.ts"))
  && /from "\.\/resolver\.ts"/.test(src("engine/sources.ts")) && !/const (spouseOf|roleOf)\b/.test(src("engine/sources.ts"))
  && /sourceKey/.test(src("api/src/fact-sources.ts")) && !/`\$\{\w*\.?role\}\|\$\{\w*\.?fact\}`/.test(src("api/src/fact-sources.ts"))
  && /canonicalFact\(/.test(src("api/src/form-lines.ts")) && !/i < 5/.test(src("api/src/form-lines.ts")));
// Review m5: every static import or re-export, on one line or several, and any dynamic import or require.
const imports = (t: string) => [...t.matchAll(/\bfrom\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4]);
ok("SH3 (P-249): the contract imports nothing; the engine resolver imports only the contract", imports(src("contracts/resolver.ts")).length === 0 && imports(src("engine/resolver.ts")).length > 0 && imports(src("engine/resolver.ts")).every((m) => m === "../contracts/resolver.ts"));
ok("SH3 (P-249) (fail): the import check sees a multi-line import and a dynamic one", same(imports('import {\n a,\n b } from "pg";\nconst x = await import("@prisma/client");'), ["pg", "@prisma/client"]));
ok("SH3 d1/d2: eligibility.ts, case-checklist.ts and programs.ts read R5/R6b from the resolver and keep no copy", ["engine/runtime/eligibility.ts", "engine/runtime/case-checklist.ts", "engine/programs.ts"].every((f) => /from "\.\.?\/resolver\.ts"/.test(src(f)) && !/startsWith\("case\."\)/.test(src(f))));
ok("SH3 tidy-up: preview.ts, validate.ts, pqr-picks.ts and coverage.ts key choices with sourceKey and keep no role|fact template", ["engine/runtime/preview.ts", "engine/validate.ts", "engine/pqr-picks.ts", "engine/coverage.ts"].every((f) => /sourceKey\(/.test(src(f)) && !/\$\{[^}]*role[^}]*\}\|\$\{/.test(src(f))));
ok("SH3 tidy-up (r4-m3): eligibility reads \"is answered\" from the resolver (R6b present) and keeps no copy", R.present("") === false && R.present(null) === false && R.present(undefined) === false && R.present(0) && R.present(false) && R.present(" ") && /import \{ present, valueHolder \} from "\.\.\/resolver\.ts"/.test(src("engine/runtime/eligibility.ts")) && !/const present =/.test(src("engine/runtime/eligibility.ts")));
ok("SH3 tidy-up: coverage.ts names a gap's person by the resolver's roleOf (the filing in words, \"the application\")", /resolvedRole\(people, about\)/.test(src("engine/coverage.ts")) && /about === FILING \? "the application"/.test(src("engine/coverage.ts")));
ok("SH3 (P-249): the resolver satisfies the contract's interface (one object)", R.resolver.boxOwner === R.aboutOf && R.resolver.holders === R.subjectsFor && R.resolver.factsFor === R.factsOf && R.resolver.canonicalFact === R.canonicalFact && R.resolver.documentSubjects === R.documentSubjects && R.resolver.documentRole === R.documentRole);

process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
