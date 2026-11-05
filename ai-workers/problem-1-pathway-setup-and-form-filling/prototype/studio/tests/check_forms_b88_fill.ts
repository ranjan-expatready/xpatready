// B88 (QA-239, C4.11; concept BR-1, BR-2, BR-4 to BR-6): a worked-out Yes/No asked as its condition's deciding question.
// The rule stays as strict (P-303): the error clears only because the form field no longer reads the hidden answer. The form
// writes the person's own Yes/No and never the hidden detail. Pure: no server, no database, no AI; US$0. Made-up form and
// answers (Sample); the options and printed questions checked are the forms' own readings (p1/inventory).
//   tsx studio/tests/check_forms_b88_fill.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formCoverage, factsOf } from "../engine/runtime/forms.ts";
import { formValues } from "../engine/form-values.ts";
import { askedInOrder, diff } from "../engine/validate.ts";
import { askedStep, blockFacts, decidingYes, yesNoStep } from "../engine/form-field-condition.ts";
import { printedQuestion } from "../api/src/own-yes-no.ts";
import type { BoxRow } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { Answer, Participant } from "../engine/runtime/case.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const GATE = "person.has_used_other_name", NAME = "person.other_family_name", NOTE = "person.alias_note", FORM = "Sample form 1";
const SHOW = { subjectKind: "person", op: "eq", field: GATE, value: true };
const NAMEBOX = "form1[0].Name[0]", YESNO = "form1[0].Indicator[0]";
const WORKED = "derive: Y if any other family or given name is recorded, else N; yes_no_code:Y/N"; // IMM 1294's map, as the AI wrote it
const nameBox = (rule: unknown) => ({ data_path: NAMEBOX, caption: "Family name", outcome: "mapped", person: "form_subject", row: null, fact: NAME, transform: "as_is", condition: "only when another form field = Y", origin: "AI_PROPOSAL", ...(rule ? { condition_rule: rule } : {}) });
const yesNo = (asked: boolean, facts = [NAME]) => ({ data_path: YESNO, caption: "Have you ever used any other name?", outcome: "mapped", person: "form_subject", row: null, fact: asked ? GATE : NAME, transform: asked ? askedStep(facts, "yes_no_code:Y/N") : WORKED, condition: null, origin: asked ? "HUMAN" : "AI_PROPOSAL" });
const noteBox = { data_path: "form1[0].Note[0]", caption: "Note", outcome: "mapped", person: "form_subject", row: null, fact: NOTE, transform: "as_is", condition: null, origin: "AI_PROPOSAL" };
const snap = (o: { asked: boolean; rule?: unknown; note?: boolean }) => ({
  combination: { combination_key: "sample" }, canonical_fields: [{ id: GATE, meaning: "Has used another name", value_type: "yes_no" }, { id: NAME, meaning: "Other family name", value_type: "text" }, { id: NOTE, meaning: "A note about the other name", value_type: "text" }],
  sections: [{ id: "s1", title: "About you", section_scope: "per_person" }], section_titles: [],
  placements: [
    { lineage: GATE, fact: GATE, section_id: "s1", order: 1, repeats: "none", collected_from: "client_questionnaire", required: true },
    { lineage: NAME, fact: NAME, section_id: "s1", order: 2, repeats: "none", collected_from: "client_questionnaire", required: true, condition: SHOW, condition_effect: "SHOW", condition_plain: "asked only when Has used another name is Yes" },
    ...(o.note ? [{ lineage: NOTE, fact: NOTE, section_id: "s1", order: 3, repeats: "none", collected_from: "client_questionnaire", required: false }] : []),
  ],
  forms: [{ form_number: FORM, title: FORM, form_kind: "data_form", who: "each_applicant", status: "always" }],
  field_maps: [{ form_number: FORM, form_edition: `${FORM} (01-2000)`, official_file: "sample1.pdf", entries: [nameBox(o.rule === undefined ? SHOW : o.rule), yesNo(o.asked, o.note ? [NAME, NOTE] : [NAME]), ...(o.note ? [noteBox] : [])] }],
  rules: [], document_requirements: [], document_types: [], derived_fields: [], checks: [],
}) as unknown as Snapshot;
const people: Participant[] = [{ subjectId: "p1", role: "principal" as Participant["role"], label: "Client A", applies: true }, { subjectId: "c1", role: "case", label: "The application", applies: true }];
const say = (field: string, value: unknown): Answer => ({ id: `${field}-${String(value)}`, subjectId: "p1", field, rowKey: null, value, status: "VERIFIED", channel: "questionnaire", actor: "user-P", at: "2026-11-05T00:00:00Z" });
const inv = { fields: [{ data_path: NAMEBOX, required: true, ui: "text" }, { data_path: YESNO, required: true, ui: "radio", options: [["*No", "N"], ["*Yes", "Y"]] }] } as never;
const fill = (s: Snapshot, answers: Answer[]) => { const c = formCoverage(s, people, answers, [], FORM, "p1", new Date("2026-11-05T00:00:00Z"))!; return { c, v: formValues(s, s.field_maps[0] as never, inv, c.boxes as BoxRow[]) }; };
const hiding = (s: Snapshot) => askedInOrder(s).filter((p) => p.level === "error" && p.item === NAME && /^Hiding a value a form reads/.test(p.message));

// ---------------------------------------------------------------- BR-5: the rule stays as strict
ok("C4.11 BR-5 fail (QA-239): the worked-out Yes/No reads the hidden name, so the name's form field holding the condition is not enough", hiding(snap({ asked: false })).length === 1, hiding(snap({ asked: false })).map((p) => p.message));
ok("C4.11 BR-5 pass: asked as the deciding question, with the name's form field holding the condition, nothing on this form reads the hidden answer", hiding(snap({ asked: true })).length === 0, hiding(snap({ asked: true })).map((p) => p.message));
ok("C4.11 BR-5 fail: asked as the deciding question, but the name's form field not confirmed: still refused (no field relaxed, P-303)", hiding(snap({ asked: true, rule: null })).length === 1);

// ---------------------------------------------------------------- BR-6: the form writes the person's own answer
const s = snap({ asked: true });
let r = fill(s, [say(GATE, false), say(NAME, "OLD NAME")]);
ok("C4.11 BR-6 pass: Yes, a typed name, then No: the Yes/No writes N and the name is never written", r.v.values[YESNO] === "N" && !r.v.values[NAMEBOX] && !factsOf(r.c.boxes as BoxRow[]).some((f) => f.fact === NAME), r.v.values);
r = fill(s, [say(GATE, true), say(NAME, "OLD NAME")]);
ok("C4.11 BR-6 pass: Yes writes Y and the name", r.v.values[YESNO] === "Y" && r.v.values[NAMEBOX] === "OLD NAME", r.v.values);
r = fill(s, [say(GATE, false)]);
ok("C4.11 BR-6 pass: No with nothing typed writes N (it no longer waits for a person to say nothing is recorded)", r.v.values[YESNO] === "N" && !r.v.values[NAMEBOX], r.v.values);
r = fill(s, [say(NAME, "OLD NAME")]);
ok("C4.11 BR-6 fail guard: the deciding question unanswered: the Yes/No is not guessed from the name", !r.v.values[YESNO] && !r.v.values[NAMEBOX], r.v.values);
// Challenge M1 (QA-165 kept): a detail in the same block that no condition hides, recorded with a No, is never written as No.
const noted = snap({ asked: true, note: true });
r = fill(noted, [say(GATE, false), say(NOTE, "kept a note")]);
const yn = r.c.boxes.find((b) => b.box === YESNO) as BoxRow & { fix?: string };
ok("C4.11 BR-4 fail guard (QA-165): No while a detail of its block is still recorded: the Yes/No is not written, and says which to correct", !r.v.values[YESNO] && /answered No, but/.test(yn?.fix ?? ""), { written: r.v.values[YESNO], fix: yn?.fix });
const before = fill(snap({ asked: false }), [say(GATE, true), say(NAME, "OLD NAME")]);
ok("C4.11 BR-6: before, the AI's free-text step is not one the filler runs, so that Yes/No was never written by itself", !before.v.values[YESNO], before.v.values);

// ---------------------------------------------------------------- BR-1, BR-2: what the door takes, from the forms' own readings
ok("C4.11 BR-1 pass: \"X is Yes\" gives its deciding question", decidingYes(SHOW) === GATE);
for (const [what, t] of [["No", { op: "eq", field: GATE, value: false }], ["a value", { op: "eq", field: GATE, value: "03" }], ["all of", { op: "all", args: [SHOW] }], ["none", null]] as const)
  ok(`C4.11 BR-1 fail: a condition decided by ${what} is not taken`, decidingYes(t) === null);
ok("C4.11 BR-2 fail: options without exactly one Yes and one No give no step", yesNoStep([["Yes", "Y"]]) === null && yesNoStep([["Maybe", "M"], ["No", "N"]]) === null && yesNoStep("Y/N") === null && yesNoStep([["Yes", "Y/1"], ["No", "N"]]) === null);
const INV = join(import.meta.dirname, "..", "..", "p1", "inventory");
const NINE: [string, string, RegExp][] = [
  ["imm1294e", "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", /used any other name/],
  ["imm1294e", "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", /national identity document\?$/],
  ["imm5710e", "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", /used any other name/],
  ["imm5710e", "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", /national identity document\?$/],
  ["imm5710e", "form1[0].Page2[0].USCard[0].q1[0].usCardIndicator[0]", /lawful Permanent Resident of the United States/],
  ["imm1344e", "form1[0].Part1[0].CoSigner[0].CosignDetails[0].q2[0].AliasNameIndicator[0].AliasNameIndicator[0]", /used any other name/],
  ["imm1344e", "form1[0].Part1[0].SponsorDetails[0].q2[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", /used any other name/],
  ["imm0008depe", "form1[0].Page1[0].AddDependant[0].personalDetails[0].q2[0].AliasNameIndicator[0].AliasNameIndicator[0]", /used any other name/],
  ["imm0008depe", "form1[0].Page1[0].AddDependant[0].natID[0].q1[0].natIDIndicator[0]", /national identity document\?$/],
];
// Challenge M3 (BR-8): the release's change summary names it once, in words, for the immigration expert.
const line = diff(snap({ asked: false }), snap({ asked: true })).find((c) => c.kind === "Form field question");
ok("C4.11 BR-8 pass: the change summary has a \"Form field question\" line for the expert, in words, no field code", !!line && line.needs_sme && /reads "Has used another name", was "Other family name"/.test(line.label) && !/person\./.test(line.label), line);
ok("C4.11 BR-8 (review minor): a form field whose only change is its question is not counted again in its form's \"Field map\" line", !diff(snap({ asked: false }), snap({ asked: true })).some((c) => c.kind === "Field map"));
ok("C4.11 BR-8: an unchanged form field adds no such line", !diff(snap({ asked: true }), snap({ asked: true })).some((c) => c.kind === "Form field question"));
// The block a Yes/No vouches for, by data path only (IMM 1294's and IMM 1344's own paths).
const e = (data_path: string, fact: string) => ({ data_path, fact, outcome: "mapped" });
const p1294 = [e("form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", NAME), e("form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasFamilyName[0]", NAME), e("form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasGivenName[0]", "person.other_given_names"), e("form1[0].Page1[0].PersonalDetails[0].Name[0].FamilyName[0]", "person.family_name"),
  e("form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", "person.national_id_number"), e("form1[0].Page2[0].natID[0].natIDdocs[0].DocNum[0].DocNum[0]", "person.national_id_number"), e("form1[0].Page2[0].natID[0].natIDdocs[0].CountryofIssue[0].CountryofIssue[0]", "person.national_id_country_of_issue")];
ok("C4.11 BR-4: the other-name Yes/No vouches for its block's names only, never the person's own name", JSON.stringify(blockFacts(p1294, p1294[0].data_path, GATE)) === JSON.stringify([NAME, "person.other_given_names"]), blockFacts(p1294, p1294[0].data_path, GATE));
ok("C4.11 BR-4: the national ID Yes/No vouches for the document's details, found one level up", JSON.stringify(blockFacts(p1294, p1294[4].data_path, "person.has_national_id")) === JSON.stringify(["person.national_id_country_of_issue", "person.national_id_number"]), blockFacts(p1294, p1294[4].data_path, "person.has_national_id"));
ok("C4.11 BR-4 fail: a Yes/No alone on its page holds no block: nothing to vouch for", blockFacts([e("form1[0].Page3[0].Alone[0]", NAME)], "form1[0].Page3[0].Alone[0]", GATE).length === 0);
ok("C4.11 BR-4: the step is B52's shape, which the filler and QA-165 read", askedStep([NAME, "person.other_given_names"], "yes_no_code:Y/N") === `derived:any(${NAME}, person.other_given_names) recorded -> yes_no_code:Y/N`);
for (const [file, path, asks] of NINE) {
  const box = (JSON.parse(readFileSync(join(INV, `${file}.inventory.json`), "utf8")) as { fields: { data_path: string; options?: unknown }[] }).fields.find((f) => f.data_path === path);
  ok(`C4.11 BR-2 pass: ${file} ${path.split(".").at(-1)} prints its deciding question and has one Yes and one No (step yes_no_code:Y/N)`, !!box && asks.test(printedQuestion(box as never) ?? "") && yesNoStep(box.options) === "yes_no_code:Y/N", { printed: printedQuestion(box as never), step: yesNoStep(box?.options) });
}
summary();
