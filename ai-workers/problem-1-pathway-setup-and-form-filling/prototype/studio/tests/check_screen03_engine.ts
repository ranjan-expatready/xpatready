// Screen 03 slice S1 (runtime lane): offline checks of the workspace's pure parts — the question order the studio preview
// and a case share (F-R1c-1), Preview by person read through the runtime's caseView (BR-15), a form line's minimum age,
// the Sample families a combination allows, the tabs (BR-1) and the form line edit. No database, no AI (US$0).
//   tsx studio/tests/check_screen03_engine.ts
import { render } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { caseView } from "../engine/runtime/case.ts";
import { familiesFor, familyPeople, previewFamily, tweakAnswers } from "../engine/runtime/preview.ts";
import { FormLineEdit, tabOf } from "../contracts/workspace.ts";
import { coverageGaps } from "../engine/coverage.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 200)}` : ""}`); };
const TODAY = new Date("2026-10-25T12:00:00Z");

// A small configuration: a visit section whose placement order is "started on" before "ends on" (labels sort the other
// way), a yes/no question that decides a document and a form, and a form for children from age 18.
const S = {
  contract_version: "combination-config/v0", mode: "draft", row_versions: {},
  combination: { key: "t", label: "Test", program: "p", pathway: null, source_basis: "ILLUSTRATIVE", basis_note: null, participants: [
    { role: "principal", label: "Principal applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1 }, { role: "child", label: "Child", min: 0, max: 3 }] },
  canonical_fields: [
    { id: "person.status_start", meaning: "That status started on", value_type: "date" },
    { id: "person.status_end", meaning: "That status ends on", value_type: "date" },
    { id: "person.date_of_birth", meaning: "Date of birth", value_type: "date" },
    { id: "person.previously_married", meaning: "Was previously married", value_type: "yes_no" },
    { id: "person.family_name", meaning: "Family name", value_type: "text" },
  ],
  sections: [{ id: "status", title: "Status in the country" }, { id: "personal", title: "Personal" }],
  placements: [
    { fact: "person.status_start", section_id: "status", order: 1, repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.status_end", section_id: "status", order: 2, repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.date_of_birth", section_id: "personal", order: 1, repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.previously_married", section_id: "personal", order: 2, repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.family_name", section_id: "personal", order: 3, repeats: "per_person", collected_from: "client_questionnaire" },
  ],
  forms: [
    { form_number: "F 1", title: "Main form", who: "each_applicant", status: "always" },
    { form_number: "F 2", title: "Previous marriage", who: "each_applicant", status: "conditional", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.previously_married", value: true }, condition_plain: "Was previously married is Yes", channel: "ONLINE" },
    { form_number: "F 3", title: "Adult child's form", who: "each_dependent_child", status: "always", min_age: 18 },
  ],
  field_maps: [
    { form_number: "F 1", form_edition: "F 1 (2026)", entries: ["person.status_start", "person.status_end", "person.date_of_birth", "person.family_name"].map((fact, i) => ({ data_path: `b${i}`, outcome: "mapped", fact, person: "form_subject", row: null })) },
    { form_number: "F 3", form_edition: "F 3 (2026)", entries: [{ data_path: "c", outcome: "mapped", fact: "person.family_name", person: "form_subject", row: null }] },
  ],
  document_requirements: [{ lineage: "d1", document_type: "Divorce certificate", who: "each_applicant", base_or_conditional: "conditional", provided_by: "client", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.previously_married", value: true }, condition_plain: "Was previously married is Yes" }],
  document_types: [], rules: [], derived_fields: [], checks: [],
} as unknown as Snapshot;

// ── F-R1c-1: the common renderer lists a section's questions in placement order, as a case does
{
  const people = familyPeople(S.combination.participants, "single");
  const r = render(S, [{ id: "principal", role: "principal", label: "Principal applicant", applies: true }], new Map(), { today: TODAY });
  const studio = r.questions.filter((q) => q.section === "status").map((q) => q.fact);
  ok("C4.3: F-R1c-1 pass: the studio renderer asks \"started on\" before \"ends on\" (placement order, not the labels)", studio.join() === "person.status_start,person.status_end", studio);
  const runtime = caseView(S, people, [], [], "agent", TODAY).sections.find((x) => x.section === "status")!.questions.map((q) => q.fact);
  ok("C4.3: F-R1c-1 pass: the studio renderer and a case list the section in the same order", studio.join() === runtime.join(), { studio, runtime });
  const unordered = { ...S, placements: S.placements.map((p: { order?: number }) => ({ ...p, order: undefined })) } as unknown as Snapshot;
  const byLabel = render(unordered, [{ id: "principal", role: "principal", label: "P", applies: true }], new Map(), { today: TODAY }).questions.filter((q) => q.section === "status").map((q) => q.fact);
  ok("C4.3: F-R1c-1 fail-guard: without placement orders the label decides (\"ends on\" first), so the order above comes from the placements", byLabel[0] === "person.status_end", byLabel);
}

// ── BR-15: Preview by person is the runtime's caseView of the same family, unchanged
{
  for (const fam of ["single", "couple", "family2"] as const) for (const mode of ["sqr", "agent"] as const) {
    const p = previewFamily(S, fam, "principal", mode, { "principal|person.previously_married": true }, TODAY);
    const same = caseView(S, familyPeople(S.combination.participants, fam), tweakAnswers({ "principal|person.previously_married": true }, TODAY), [], mode, TODAY);
    ok(`C4.3: BR-15 pass: the preview of family "${fam}" (${mode}) is exactly the case view of the same people and answers`, JSON.stringify(p.questionnaire) === JSON.stringify(same));
  }
  const yes = previewFamily(S, "single", "principal", "agent", { "principal|person.previously_married": true }, TODAY);
  const no = previewFamily(S, "single", "principal", "agent", { "principal|person.previously_married": false }, TODAY);
  const none = previewFamily(S, "single", "principal", "agent", {}, TODAY);
  ok("C4.3: BR-15 pass: a Yes tweak adds the form and the document it decides, each saying why", yes.forms.some((f) => f.form === "F 2" && f.channelWords === "Online") && yes.documents.some((d) => d.requirement === "Divorce certificate" && d.status === "Needed" && /previously married/i.test(d.why)));
  ok("C4.3: BR-15 fail: a No tweak removes them; with no answer they show as cannot tell, never as needed", !no.forms.some((f) => f.form === "F 2") && !no.documents.length && none.documents[0]?.status === "Cannot tell yet");
  ok("C4.3: BR-15 pass: the tweak stays offered after it is answered (it comes from the family before any answer)", yes.tweaks.some((t) => t.fact === "person.previously_married" && t.value === true) && none.tweaks.some((t) => t.fact === "person.previously_married" && t.value === null));
  ok("C4.3: BR-15 fail: a tweak for someone not in the family is ignored", JSON.stringify(previewFamily(S, "single", "principal", "agent", { "spouse|person.previously_married": true }, TODAY).questionnaire) === JSON.stringify(none.questionnaire));
  const sqr = previewFamily(S, "single", "principal", "sqr", {}, TODAY);
  ok("C4.3: BR-15 pass: per-person counts match the questionnaire the person gets", sqr.people[0].questions === sqr.questionnaire.sections.reduce((n, x) => n + x.questions.length, 0), sqr.people);
}

// ── Form line minimum age (Screen 03 S1)
{
  const people = familyPeople(S.combination.participants, "family1");
  const ans = (dob: string) => [{ id: "a", subjectId: "child-1", field: "person.date_of_birth", rowKey: null, value: dob, status: "VERIFIED" as const, channel: "questionnaire", actor: "x", at: TODAY.toISOString() }];
  const f3 = (answers: ReturnType<typeof ans> | []) => caseView(S, people, answers, [], "agent", TODAY).forms.find((f) => f.form === "F 3");
  ok("C1.8 (proposed): min age pass: a child who is 18 or older gets the line", f3(ans("2008-10-25"))?.applies === true, f3(ans("2008-10-25")));
  ok("C1.8 (proposed): min age fail: a child who is 17 does not (one day short)", f3(ans("2008-10-26"))?.applies === false, f3(ans("2008-10-26")));
  ok("C1.8 (proposed): min age: with no date of birth it cannot be told, and the date of birth is asked as a deciding question", f3([])?.applies === "cannot_tell" && caseView(S, people, [], [], "agent", TODAY).sections.some((x) => x.subjectId === "child-1" && x.questions.some((q) => q.fact === "person.date_of_birth")));
  ok("C1.8 (proposed): min age: the line says why (\"from age 18\")", /from age 18/.test(render(S, [{ id: "c", role: "child", label: "C", applies: true }], new Map(), { today: TODAY }).forms.find((f) => f.form === "F 3")!.why));
}

// ── Sample families the combination allows (P-37)
ok("C4.3: families pass: a combination with an optional spouse and up to 3 children offers all four families", familiesFor(S.combination.participants).length === 4);
ok("C4.3: families fail: no spouse role → only the single family; a required spouse → no single family", familiesFor([{ role: "principal", min: 1, max: 1 }]).map((f) => f.key).join() === "single" && !familiesFor([{ role: "principal", min: 1, max: 1 }, { role: "spouse_or_partner", min: 1, max: 1 }]).some((f) => f.key === "single"));
ok("C4.3: families: an unknown family falls back to one the combination allows", previewFamily(S, "nope" as never, "principal", "sqr", {}, TODAY).family === "single");

// ── BR-1 tabs, and the form line edit
ok("C1.4: BR-1 pass: a known tab is itself; the old Configuration tab opens SQR", tabOf("forms") === "forms" && tabOf("preview") === "preview" && tabOf("configuration") === "sqr");
ok("C1.4: BR-1 fail: an unknown tab is Overview", tabOf("nope") === "overview" && tabOf(undefined) === "overview" && tabOf("__proto__") === "overview");
ok("C1.8 (proposed): line edit pass: copies 2, minimum age 18 and a signer from the list are accepted; empty minimum age clears it", FormLineEdit.safeParse({ copies: 2, minAge: 18, signedBy: "parent_for_minor" }).success && FormLineEdit.safeParse({ minAge: null }).success);
const bad = [{ copies: 0 }, { copies: 10 }, { copies: 1.5 }, { minAge: 0 }, { minAge: 120 }, { signedBy: "the cat" }, { copies: "2" }].map((b) => FormLineEdit.safeParse(b));
ok("C1.8 (proposed): line edit fail: copies outside 1–9, a fraction, an age outside 1–99, a signer not on the list and text numbers are refused, each with a plain message", bad.every((r) => !r.success && r.error.issues[0].message.length > 10), bad.map((r) => (r.success ? "accepted" : r.error.issues[0].message)));

// ── BR-7 needed-fact coverage (run over every Sample combination in S1; blocks release from S2)
{
  ok("C4.1: BR-7 pass: every fact a form field needs is placed, so there is no gap", coverageGaps(S).length === 0, coverageGaps(S));
  const unplaced = { ...S, placements: S.placements.filter((p: { fact: string }) => p.fact !== "person.status_end") } as unknown as Snapshot;
  const g = coverageGaps(unplaced);
  ok("C4.1: BR-7 fail: a fact F 1 needs with no question is a gap for each role, naming the form and why", g.length === 3 && g.every((x) => x.fact === "person.status_end" && x.forms.join() === "F 1" && x.why === "nobody is asked for it") && g.map((x) => x.role).join() === "child,principal,spouse_or_partner", g);
  const notInLibrary = { ...S, canonical_fields: S.canonical_fields.filter((f: { id: string }) => f.id !== "person.family_name") } as unknown as Snapshot;
  ok("C4.1: BR-7 fail: a form field reading a fact not in the library is a gap (F 1 and F 3 named)", coverageGaps(notInLibrary).some((x) => x.fact === "person.family_name" && x.forms.join() === "F 1,F 3"));
  const officer = { ...S, placements: S.placements.map((p: { fact: string }) => p.fact === "person.family_name" ? { ...p, collected_from: "verified_document" } : p) } as unknown as Snapshot;
  ok("C4.1: BR-7 pass: a fact the officer takes from a document is covered, even when no document type supplies it yet", coverageGaps(officer).length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
