// Offline checks of the studio engine (no database, no browser, no AI): library comparison, the common renderer,
// draft/release resolution, validation and release differences, on small hand-made inputs plus the real release c1-v3.
//   node --experimental-strip-types studio/tests/check_engine.ts   (or tsx)
import { readFileSync } from "node:fs";
import { join } from "node:path";
// FLOW-FIX TEST ONLY (throwaway branch, never merged; a second draft push): red on a run's first attempt, so "Re-run failed jobs" re-runs one part.
if (process.env.GITHUB_HEAD_REF?.endsWith("-flowtest-code") && process.env.GITHUB_RUN_ATTEMPT === "1") { console.log("FAIL flow-fix test: red on attempt 1 only"); process.exit(1); }
import { normalize, partOf } from "../engine/normalize.ts";
import { aboutOf, kkey, peopleFor, render, type Known } from "../engine/render.ts";
import { effective, type Snapshot } from "../engine/snapshot.ts";
import { checkCondition, diff, validate } from "../engine/validate.ts";
import { sampleFamilyFacts } from "../engine/import.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 160)}` : ""}`); };

// ---------------------------------------------------------------- library comparison
const lib = [
  { key: "person.date_of_birth", meaning: "Person's date of birth", valueType: "date", status: "PUBLISHED" },
  { key: "person.uci", meaning: "Unique client identifier assigned by the immigration authority", valueType: "text", status: "PUBLISHED" },
  { key: "person.mailing_address", meaning: "Person's current mailing address", valueType: "address", status: "PUBLISHED" },
  { key: "person.occupation", meaning: "Person's current occupation", valueType: "text", status: "PUBLISHED" },
  { key: "person.marital_status", meaning: "Person's marital status", valueType: "code", status: "PUBLISHED" },
];
const box = (fact: string, person = "form_subject") => ({ data_path: `f.${fact}.${person}`, outcome: "mapped", person, fact, evidence_quote: fact });
const items = normalize([
  { id: "person.date_of_birth", meaning: "Date of birth of the person", value_type: "date" },
  { id: "person.uci_number", meaning: "Unique client identifier (UCI) number", value_type: "text" },
  { id: "person.mailing_address_city", meaning: "City of the mailing address", value_type: "text" },
  { id: "person.previous_occupation", meaning: "Person's previous occupation", value_type: "text" },
  { id: "person.marital_status", meaning: "Marital status", value_type: "yes_no" },
  { id: "person.unused", meaning: "Defined but read by no box", value_type: "text" },
  { id: "person.visit_purpose", meaning: "Purpose of the person's visit to Canada", value_type: "code" },
], [box("person.date_of_birth"), box("person.date_of_birth", "subject_spouse_or_partner"), box("person.uci_number"), box("person.mailing_address_city"), box("person.previous_occupation"), box("person.marital_status"), box("person.visit_purpose")], lib);
const by = (k: string) => items.find((i) => i.proposedKey === k);
ok("exact key with a compatible type is proposed for reuse; both people's boxes kept", by("person.date_of_birth")?.outcome === "REUSE" && by("person.date_of_birth")!.persons.length === 2);
ok("a near-duplicate key is ambiguous, recommending the existing field", by("person.uci_number")?.outcome === "AMBIGUOUS" && by("person.uci_number")?.recommendation.key === "person.uci");
ok("an address part is ambiguous, recommending the composite field with a part transformation", by("person.mailing_address_city")?.recommendation.key === "person.mailing_address" && by("person.mailing_address_city")?.recommendation.transform === "address_part:city");
ok("previous occupation is never merged into the current occupation", by("person.previous_occupation")?.outcome === "NEW", by("person.previous_occupation")?.reason);
ok("same key with a clashing type is a conflict", by("person.marital_status")?.outcome === "CONFLICT");
ok("a definition no box reads is not proposed", !by("person.unused"));
ok("an unrelated meaning is new", by("person.visit_purpose")?.outcome === "NEW");
// QA-193 order row (P-214): candidates with equal scores rank by key, so the top three never depend on the order the
// library's rows came in (a re-compare in another row order reopened a kept decision and dropped its To review batch).
const tieLib = ["person.country_d", "person.country_a", "person.country_c", "person.country_b", "person.country_e"].map((key) => ({ key, meaning: "Country", valueType: "code", status: "PUBLISHED" }));
const tieOf = (l: typeof tieLib) => normalize([{ id: "person.education_country", meaning: "Country where the person studied", value_type: "code" }], [box("person.education_country")], l, new Map())[0]?.candidates ?? [];
const tieA = tieOf(tieLib), tieB = tieOf([...tieLib].reverse());
ok("equal-score candidates rank by key: the same top three in any library order (QA-193 order row)", tieA.length === 3 && new Set(tieA.map((c) => c.score)).size < 3 && JSON.stringify(tieA.map((c) => c.key)) === JSON.stringify(tieB.map((c) => c.key)) && JSON.stringify(tieA.map((c) => c.key)) === JSON.stringify(["person.country_a", "person.country_b", "person.country_c"]), { a: tieA.map((c) => `${c.key}:${c.score}`), b: tieB.map((c) => c.key) });
ok("partOf only matches composite address fields", partOf("person.mailing_address_city", lib)?.part === "city" && partOf("person.occupation_city", lib) === null);

// ---------------------------------------------------------------- draft/release resolution
const rows = [{ k: "a", version: 1, status: "SUPERSEDED" }, { k: "a", version: 2, status: "PUBLISHED" }, { k: "a", version: 3, status: "DRAFT" }, { k: "b", version: 1, status: "PUBLISHED" }, { k: "b", version: 2, status: "RETIRED" }, { k: "c", version: 1, status: "DRAFT" }];
const d = effective(rows, (r) => r.k, "draft"), pub = effective(rows, (r) => r.k, "published");
ok("draft view takes the newest draft, drops a retired lineage and includes new drafts", d.map((r) => `${r.k}${r.version}`).sort().join() === "a3,c1");
ok("published view ignores drafts; a retired lineage is gone from new releases", pub.map((r) => `${r.k}${r.version}`).sort().join() === "a2");

// ---------------------------------------------------------------- the common renderer on a hand-made snapshot
const snap = {
  contract_version: "combination-config/v0", combination: { key: "t", label: "t", program: "p", pathway: null, participants: [], source_basis: "SOURCE_BACKED", basis_note: null }, mode: "draft",
  canonical_fields: [{ id: "person.family_name", meaning: "Family name", value_type: "text" }, { id: "person.marital_status", meaning: "Marital status", value_type: "code" }, { id: "person.passport_number", meaning: "Passport number", value_type: "text" }, { id: "person.new_field", meaning: "A new field", value_type: "text" }, { id: "person.travelling_alone_to_canada", meaning: "Travelling alone", value_type: "yes_no" }],
  sections: [{ id: "identity", title: "Identity" }],
  placements: [{ lineage: "person.family_name", fact: "person.family_name", section_id: "identity", repeats: "per_person", collected_from: "client_questionnaire" }, { lineage: "person.marital_status", fact: "person.marital_status", section_id: "identity", repeats: "per_person", collected_from: "client_questionnaire" }, { lineage: "person.travelling_alone_to_canada", fact: "person.travelling_alone_to_canada", section_id: "identity", repeats: "per_person", collected_from: "client_questionnaire" }],
  forms: [{ form_number: "F1", title: "Form one", who: "each_applicant", status: "always", condition: null }, { form_number: "F2", title: "Couple form", who: "couple_once", status: "conditional", condition: { subjectKind: "SPOUSE", op: "eq", field: "person.marital_status", value: "common_law" }, condition_plain: "common-law couples" }],
  field_maps: [{ form_number: "F1", form_edition: "F1 (01)", entries: [{ data_path: "a", outcome: "mapped", person: "form_subject", fact: "person.family_name" }, { data_path: "b", outcome: "mapped", person: "subject_spouse_or_partner", fact: "person.family_name" }, { data_path: "c", outcome: "mapped", person: "form_subject", fact: "person.passport_number" }, { data_path: "d", outcome: "mapped", person: "form_subject", fact: "person.new_field" }, { data_path: "e", outcome: "unresolved", unresolved_reason: "unclear" }] }],
  document_requirements: [{ lineage: "x", document_type: "Custody letter", who: "each_dependent_child", base_or_conditional: "conditional", condition: { subjectKind: "DEPENDENT", op: "eq", field: "person.travelling_alone_to_canada", value: true } }, { lineage: "p", document_type: "Passport", document_type_key: "passport", who: "each_applicant", base_or_conditional: "base" } /* W1-15 M3: a document covers a fact only for the people its checklist line names */],
  document_types: [{ key: "passport", name: "Passport", supplies_facts: ["person.passport_number"] }],
  rules: [], derived_fields: [], checks: [], row_versions: {},
} as unknown as Snapshot;
const people = peopleFor([{ role: "principal", label: "Principal", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Partner", min: 0, max: 1, preview: 1 }, { role: "child", label: "Child", min: 0, max: 2, preview: 1, applies: false }]);
const known: Known = new Map([[kkey("principal", "person.family_name"), { value: "EXAMPLE", status: "confirmed", source: "sample" }]]);
let v = render(snap, people, known);
const cov = v.coverage.find((c) => c.form === "F1" && c.person === "principal")!;
const kind = (box: string) => cov.boxes.find((b) => b.box === box)?.coverage;
ok("each applicant gets the form; the child (not filing) does not", v.forms.filter((f) => f.form === "F1").map((f) => f.person).join() === "principal,spouse_or_partner");
ok("a box about the subject's partner reads the partner's value, not the subject's", cov.boxes.find((b) => b.box === "b")?.about === "spouse_or_partner" && kind("b") === "client question" && kind("a") === "confirmed fact");
ok("coverage: document reading, unresolved new field without placement, unresolved box", kind("c") === "document reading" && kind("d") === "unresolved" && /no question placement/.test(cov.boxes.find((b) => b.box === "d")!.detail) && kind("e") === "unresolved");
ok("a conditional form waits for its deciding answer", v.forms.find((f) => f.form === "F2")?.applies === "cannot_tell" && v.deciders.some((x) => x.fact === "person.marital_status" && x.about === "spouse_or_partner"));
ok("the child's conditional document is undecided and its answer is asked as a rule-only question", v.checklist[0].status === "Cannot tell yet" && v.questions.some((q) => q.fact === "person.travelling_alone_to_canada" && q.about === "child-1" && q.rule_only));
known.set(kkey("spouse_or_partner", "person.marital_status"), { value: "common_law", status: "answered", source: "screen" });
known.set(kkey("child-1", "person.travelling_alone_to_canada"), { value: true, status: "answered", source: "screen" });
v = render(snap, people, known);
ok("answers switch the conditional form and document on, without code changes", v.forms.find((f) => f.form === "F2")?.applies === true && v.checklist[0].status === "Needed");
ok("aboutOf: the partner's partner is the principal; a missing child gives nobody", aboutOf(people, "spouse_or_partner", { person: "subject_spouse_or_partner", fact: "person.family_name" }, null) === "principal" && aboutOf(peopleFor([{ role: "principal", label: "P", min: 1, max: 1 }]), "principal", { person: "subject_child", fact: "person.family_name" }, null) === null);

// ---------------------------------------------------------------- validation and differences
const types = new Map([["person.marital_status", "code"], ["person.date_of_birth", "date"]]);
ok("unknown operator, unknown field and an ordered comparison on a code field are rejected", checkCondition({ subjectKind: "CASE", op: "like", field: "x", value: 1 }, types, new Set()).length > 0 && checkCondition({ subjectKind: "CASE", op: "eq", field: "person.nope", value: 1 }, types, new Set()).length > 0 && checkCondition({ subjectKind: "CASE", op: "gt", field: "person.marital_status", value: 1 }, types, new Set()).length > 0);
ok("a valid condition passes", checkCondition({ subjectKind: "EACH_APPLICANT", op: "and", args: [{ op: "eq", field: "person.marital_status", value: "married" }, { op: "gte", field: "person.date_of_birth", value: "2000-01-01" }] }, types, new Set()).length === 0);
const probs = validate(snap, snap.canonical_fields.map((f: any) => ({ key: f.id, valueType: f.value_type })), []);
ok("validation warns that a box reads a field nobody is asked for", probs.some((p) => p.item === "person.new_field" && p.level === "warning"));
const changed = JSON.parse(JSON.stringify(snap)); changed.document_requirements[0].condition_plain = "edited"; changed.rules.push({ id: "R-1", then: "x", when: null, origin: "HUMAN" });
const ch = diff(snap, changed);
ok("differences list a changed requirement and an added rule, both needing the SME duty", ch.some((c) => c.kind === "Document requirement" && c.change === "changed" && c.needs_sme) && ch.some((c) => c.kind === "Rule" && c.change === "added" && c.needs_sme));
ok("an identical draft has no differences", diff(snap, JSON.parse(JSON.stringify(snap))).length === 0);

// ---------------------------------------------------------------- the real release c1-v3 through the same renderer
const PROTO = join(import.meta.dirname, "..", "..");
const c1 = JSON.parse(readFileSync(join(PROTO, "p3", "releases", "c1-v3", "configuration.json"), "utf8"));
const asSnap = { ...c1, forms: c1.forms.filter((f: any) => f.status !== "dismissed").map((f: any) => ({ ...f, status: f.status === "always" ? "always" : "conditional" })), field_maps: c1.field_maps.map((m: any) => ({ ...m, form_number: m.form_edition.split(" (")[0] })), placements: c1.placements.map((p: any) => ({ ...p, lineage: p.fact })), document_types: [] } as Snapshot;
const fam = sampleFamilyFacts();
const k2: Known = new Map(fam.facts.map((f) => [kkey(f.personId, f.key, f.row), { value: f.value, status: "confirmed" as const, source: f.source }]));
const v2 = render(asSnap, peopleFor([{ role: "principal", label: "Client A", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Partner", min: 0, max: 1, preview: 1 }, { role: "child", label: "Child", min: 0, max: 1, preview: 1, applies: false }, { role: "representative", label: "Representative", min: 0, max: 1, preview: 1 }]), k2);
const p1295 = v2.coverage.find((c) => c.form === "IMM 1295" && c.person === "principal")!, s1295 = v2.coverage.find((c) => c.form === "IMM 1295" && c.person === "spouse_or_partner")!;
const jobOf = (c: typeof p1295) => c.boxes.find((b) => b.fact === "person.intended_occupation" || b.fact === "person.intended_job_title")?.value;
ok("c1-v3: IMM 1295 is required for both applicants and most boxes come from the made-up family's confirmed facts", (p1295.counts["confirmed fact"] ?? 0) > 60 && (s1295.counts["confirmed fact"] ?? 0) > 60, { principal: p1295.counts, partner: s1295.counts });
ok("c1-v3: the principal's and partner's forms carry their own values (no cross-person reuse)", p1295.boxes.find((b) => b.fact === "person.given_names" && b.about === "principal")?.value === "CLIENTA" && s1295.boxes.find((b) => b.fact === "person.given_names" && b.about === "spouse_or_partner")?.value === "PARTNER", { jobs: [jobOf(p1295), jobOf(s1295)] });

// ---------------------------------------------------------------- grounding audit findings 2 and 3 (21 Oct)
{
  const clone = (x: any) => JSON.parse(JSON.stringify(x));
  const flag = { subjectKind: "PRINCIPAL", op: "eq", field: "person.flag", value: true };
  const g: any = { contract_version: "combination-config/v0", combination: { key: "row", label: "Row", program: "P", pathway: "Individual", participants: [{ role: "principal", label: "Principal", min: 1, max: 1 }], source_basis: "ILLUSTRATIVE", basis_note: null, path: ["Individual", "P", "C"], client_type: "INDIVIDUAL", allowed_locations: ["outside_canada"] },
    mode: "draft", canonical_fields: [{ id: "person.a", meaning: "A", value_type: "text" }, { id: "person.flag", meaning: "Flag", value_type: "yes_no" }], sections: [{ id: "s", title: "S" }],
    placements: [{ lineage: "pa", fact: "person.a", section_id: "s", collected_from: "client_questionnaire", repeats: "per_person", client_visible: true, condition: flag, condition_effect: "SHOW" }, { lineage: "pf", fact: "person.flag", section_id: "s", collected_from: "client_questionnaire", repeats: "per_person", client_visible: true }],
    forms: [{ form_number: "F", title: "F", who: "principal_applicant", status: "conditional", condition: flag }], field_maps: [{ form_number: "F", form_edition: "F-1", entries: [{ data_path: "b", outcome: "mapped", fact: "person.a", person: "form_subject", row: null }] }],
    document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {} };
  const L = g.canonical_fields.map((f: any) => ({ key: f.id, valueType: f.value_type }));
  const errs = (x: any) => validate(x, L, []).filter((p) => p.level === "error");
  ok("finding 3 positive: a SHOW question read only by a form that applies under the same condition passes", errs(g).length === 0, errs(g));
  const people = peopleFor(g.combination.participants);
  const w = render(g, people, new Map());
  ok("finding 3: the deciding question is asked before the dependent one (no external answer needed)", w.questions.some((q) => q.fact === "person.flag" && q.status === "needs an answer") && w.questions.some((q) => q.fact === "person.a" && q.status === "hidden by a condition"), w.questions.map((q) => [q.fact, q.status]));
  const no = render(g, people, new Map([[kkey("principal", "person.flag"), { value: false, status: "answered" as const, source: "t" }]]));
  ok("finding 3 positive: when the flag is false the form truly does not apply and the question stays hidden", no.forms[0].applies === false && no.questions.find((q) => q.fact === "person.a")?.status === "hidden by a condition");
  // QA-149: once answered, the deciding question still says what it decides (a case asks only questions that fill a box
  // or decide something, engine/runtime/case.ts), so it can be changed back; it no longer counts as "to decide" (review M2).
  const flagQ = no.questions.find((q) => q.fact === "person.flag");
  ok("QA-149 pass: an answered deciding question still decides the form (decides is not empty)", !!flagQ && flagQ.status === "answered" && flagQ.decides.some((d) => /F applies/.test(d)), flagQ);
  ok("QA-149 fail: an answered decider is not counted as a deciding question still open (count 1 before, 0 after)", w.summary.deciding_questions === 1 && no.summary.deciding_questions === 0 && no.deciders.length === 0, [w.summary.deciding_questions, no.summary.deciding_questions]);
  const always = clone(g); always.forms[0] = { ...always.forms[0], status: "always", condition: null };
  ok("finding 3 adverse: SHOW-if on a value an always-applying form reads is an error", errs(always).some((e) => /Hiding a value a form reads/.test(e.message)));
  const hide = clone(g); hide.placements[0].condition_effect = "HIDE";
  ok("finding 3 adverse: HIDE on a value a form reads is an error even under the same condition", errs(hide).some((e) => /Hiding a value a form reads/.test(e.message)));
  const unreachable = clone(g); unreachable.placements = unreachable.placements.filter((p: any) => p.fact !== "person.flag");
  ok("finding 3 adverse: a question decided by a value nobody supplies is unreachable", errs(unreachable).some((e) => /Unreachable question/.test(e.message)));
  const loop = clone(g); loop.placements[1] = { ...loop.placements[1], condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.a", value: "x" }, condition_effect: "SHOW" };
  ok("finding 3 adverse: two questions that decide each other are reported as a loop", errs(loop).some((e) => /in a loop/.test(e.message)));
  const rule = clone(g); rule.rules = [{ id: "R", when: { subjectKind: "PRINCIPAL", op: "eq", field: "person.a", value: "x" }, then: "t", for_whom: "principal_applicant" }];
  ok("finding 3 adverse: a rule reading a value its question can hide is an error", errs(rule).some((e) => /Hiding a value a condition reads/.test(e.message)));
  // C3.8: the validator's reachability problems read in words: each question by its meaning, never a field code.
  const reachMsgs = [always, hide, unreachable, loop, rule].flatMap((x) => errs(x).map((e) => e.message));
  ok("C3.8 pass: every reachability problem names its questions by their meaning (\"A\", \"Flag\")", reachMsgs.length >= 5 && reachMsgs.every((m) => /"(A|Flag)"/.test(m)), reachMsgs);
  ok("C3.8 fail: no reachability problem shows a field code (person.a, person.flag)", reachMsgs.every((m) => !/person\.(a|flag)\b/.test(m)), reachMsgs.find((m) => /person\.(a|flag)\b/.test(m)));
  ok("C3.8 loop in words: the loop reads \"A\" → \"Flag\" → \"A\"", errs(loop).some((e) => /"A" → "Flag" → "A"|"Flag" → "A" → "Flag"/.test(e.message)), errs(loop).map((e) => e.message));
  const unchanged = diff(g, clone(g));
  ok("finding 2 control: an identical draft has no review items", unchanged.length === 0, unchanged);
  for (const [name, mut, kind] of [["people", (x: any) => x.combination.participants.push({ role: "child", label: "Child", min: 0, max: 2 }), "People on this row"], ["document type supplies", (x: any) => { x.document_types = [{ key: "t", name: "T", supplies_facts: ["person.a"] }]; }, "Document type"], ["derived definition", (x: any) => { x.derived_fields = [{ id: "d", calculation: "c", inputs: ["person.a"] }]; }, "Derived definition"], ["allowed locations", (x: any) => { x.combination.allowed_locations = ["inside_canada"]; }, "Row details"]] as const) {
    const after = clone(g); (mut as any)(after); const d = diff(g, after);
    ok(`finding 2: changing ${name} produces a review item that needs the SME duty`, d.some((c) => c.kind === kind && c.needs_sme), d);
  }
  const renamed = clone(g); renamed.combination.label = "Row renamed";
  const rd = diff(g, renamed);
  ok("finding 2: a name-only change is listed, marked as not needing the SME duty", rd.length === 1 && rd[0].kind === "Row details" && !rd[0].needs_sme, rd);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
