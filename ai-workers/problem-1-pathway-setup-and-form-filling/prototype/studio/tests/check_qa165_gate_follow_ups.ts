// QA-165 (C7.2, C7.3; tech lead's brief 8 Nov, diagnosis on #1256): a pass and a fail per rule, on the engine (no server,
// no database, no AI; US$0). Made-up form and answers (Sample) in IMM 5257's own shapes (its paths, its B52 step); the two
// boxes with no writer are IMM 5257's own (TaiwanPIN, IsraelPassportIndicator).
//   R1 (config, cause 1) a Yes/No question's details carry "show only when <the question> is Yes": a No hides them and the
//      form's Yes/No is written N; a Yes requires them and writes Y. Without the condition (main before this) a No leaves
//      them required, so the form could never be ready without typing them.
//   R2 (engine, cause 2; P-71) readiness lists each form field formCoverage refuses with a fix, as "needs a fix" in the
//      fix's own words (a No beside a recorded detail is not ready, and says why), and each field IRCC's form marks
//      mandatory that a copy would leave empty, as "left empty on the form" with why; "Ready" never over an empty one.
//   R3 (config grounding, AGENTS rule 4) a detail is tied to a Yes/No only when the box's own step names it or its form
//      field sits inside the box's block.
//   tsx studio/tests/check_qa165_gate_follow_ups.ts
import { caseView, type Answer, type Participant } from "../engine/runtime/case.ts";
import { formCoverage, markNothingRecorded, readiness, type OnForm } from "../engine/runtime/forms.ts";
import { formValues } from "../engine/form-values.ts";
import { mandatoryOpen } from "../engine/runtime/mandatory.ts";
import { filingReadiness, type FormItem } from "../engine/runtime/readiness.ts";
import { followUpGround, yesGate } from "../api/src/own-yes-no.ts";
import type { BoxRow } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const GATE = "person.has_national_id", NUM = "person.national_id_number", FORM = "Sample form 5257";
const TODAY = new Date("2026-11-08T00:00:00Z");
const YESNO = "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", NUMBOX = "form1[0].Page2[0].natID[0].natIDdocs[0].DocNum[0].DocNum[0]";
const TAIWAN = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]", ISRAEL = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]";
const STEP = `derived:${NUM} recorded -> yes_no_code:Y/N`; // IMM 5257 (09-2023)'s map, as release 2 carries it (B52)
const SHOW = yesGate(GATE);
/** `conditioned`: the detail carries "show only when … is Yes" (this PR's configuration), on the question and its form field
 *  (B86, as the release requires). `byHand`: IMM 5257's two boxes with no writer are on the form. */
const snap = (o: { conditioned: boolean; byHand?: boolean }) => ({
  combination: { combination_key: "sample" },
  canonical_fields: [{ id: GATE, meaning: "Whether the person holds a national identity document", value_type: "yes_no" }, { id: NUM, meaning: "National identity document number", value_type: "text" }],
  sections: [{ id: "nid", title: "National identity document", section_scope: "per_person" }], section_titles: [],
  placements: [
    { lineage: GATE, fact: GATE, section_id: "nid", order: 1, repeats: "none", collected_from: "client_questionnaire", required: true, question_text: "Do you have a national identity document?" },
    { lineage: NUM, fact: NUM, section_id: "nid", order: 2, repeats: "none", collected_from: "client_questionnaire", required: true, ...(o.conditioned ? { condition: SHOW, condition_effect: "SHOW", condition_plain: "Asked only when \"Do you have a national identity document?\" is Yes" } : {}) },
  ],
  forms: [{ form_number: FORM, title: FORM, form_kind: "data_form", who: "each_applicant", status: "always" }],
  field_maps: [{ form_number: FORM, form_edition: `${FORM} (09-2023)`, official_file: "sample5257.pdf", entries: [
    { data_path: YESNO, caption: "Do you have a national identity document?", outcome: "mapped", person: "form_subject", row: null, fact: GATE, transform: STEP, condition: null, origin: "HUMAN" },
    { data_path: NUMBOX, caption: "Document number", outcome: "mapped", person: "form_subject", row: null, fact: NUM, transform: "as_is", condition: "Only when \"Whether the person holds a national identity document\" = Y", origin: "AI_PROPOSAL", ...(o.conditioned ? { condition_rule: SHOW } : {}) },
    ...(o.byHand ? [TAIWAN, ISRAEL].map((p) => ({ data_path: p, caption: "Question 1d. Have you taken a test form a designated testing agency to assess your proficiency in English or French?", outcome: "by_hand", person: "form_subject", row: null, fact: null, transform: null, condition: null, origin: "AI_PROPOSAL" })) : []),
  ] }],
  rules: [], document_requirements: [], document_types: [], derived_fields: [], checks: [],
}) as unknown as Snapshot;
const people: Participant[] = [{ subjectId: "p1", role: "principal" as Participant["role"], label: "Client A", applies: true }, { subjectId: "c1", role: "case", label: "The application", applies: true }];
const say = (field: string, value: unknown): Answer => ({ id: `${field}-${String(value)}`, subjectId: "p1", field, rowKey: null, value, status: "VERIFIED", channel: "questionnaire", actor: "user-P", at: "2026-11-08T00:00:00Z" });
const yn = [["*No", "N"], ["*Yes", "Y"]];
const inv = (byHand: boolean) => ({ fields: [{ data_path: YESNO, required: true, ui: "exclGroup", options: yn }, { data_path: NUMBOX, required: false, ui: "textEdit" }, ...(byHand ? [TAIWAN, ISRAEL].map((p) => ({ data_path: p, required: true, ui: "exclGroup", options: yn, caption: "Question 1d. Have you taken a test form a designated testing agency to assess your proficiency in English or French?" })) : [])] }) as never;
/** What GET …/forms computes for one form and person: the view, the copy's boxes, the values and open fields, readiness. */
const forms = (s: Snapshot, answers: Answer[], byHand = false) => {
  const view = caseView(s, people, answers, [], "agent", TODAY);
  const cov = formCoverage(s, people, answers, [], FORM, "p1", TODAY)!;
  const boxes = markNothingRecorded(cov.boxes as BoxRow[], view, s.placements as never);
  const { boxes: results, values } = formValues(s, s.field_maps[0] as never, inv(byHand), boxes);
  const onForm: OnForm = { boxes, open: mandatoryOpen(inv(byHand), s.field_maps[0].entries as never, results, values, { labelOf: (f) => view.sections.flatMap((x) => x.questions).find((q) => q.fact === f)?.label }) };
  const q = (fact: string) => view.sections.flatMap((x) => x.questions).find((x) => x.fact === fact);
  return { view, values, q, ready: readiness(view, FORM, "p1", onForm), before: readiness(view, FORM, "p1") };
};

// ---------------------------------------------------------------- R1: a No hides the details and writes N; a Yes requires them and writes Y
{
  const r = forms(snap({ conditioned: true }), [say(GATE, false)]);
  ok("C7.2 R1 pass (QA-165 cause 1): a No hides the details (not required), readiness is ready, and the form's Yes/No is written N", !!r.q(NUM)?.hidden && r.ready.ready && r.values[YESNO] === "N" && !r.values[NUMBOX], { hidden: r.q(NUM)?.hidden, ready: r.ready, values: r.values });
  const y = forms(snap({ conditioned: true }), [say(GATE, true)]);
  ok("C7.2 R1 fail: a Yes requires the details: the number is asked and required, and readiness waits for it (\"not answered\")", !y.q(NUM)?.hidden && y.q(NUM)?.required === true && !y.ready.ready && y.ready.missing.some((m) => m.fact === NUM && m.reason === "not answered"), y.ready.missing);
  const yy = forms(snap({ conditioned: true }), [say(GATE, true), say(NUM, "SAMPLE-123")]);
  ok("C7.2 R1 pass: a Yes with the number answered writes Y and the number, and is ready", yy.ready.ready && yy.values[YESNO] === "Y" && yy.values[NUMBOX] === "SAMPLE-123", { ready: yy.ready, values: yy.values });
  const old = forms(snap({ conditioned: false }), [say(GATE, false)]);
  ok("C7.2 R1 fail (main before this PR): with no condition, a No leaves the number asked and required, so readiness waits for a detail the person does not have", !old.q(NUM)?.hidden && old.ready.missing.some((m) => m.fact === NUM && m.reason === "not answered"), old.ready.missing);
}

// ---------------------------------------------------------------- R2: a box refused with a fix, or left empty, holds readiness back
{
  const r = forms(snap({ conditioned: false }), [say(GATE, false), say(NUM, "SAMPLE-123")]);
  const item = r.ready.missing.find((m) => m.fact === GATE);
  ok("C7.3 R2 fail (QA-165 cause 2, P-71): a No beside a recorded number is not ready, and the item says why in the fix's own words", !r.ready.ready && item?.reason === "needs a fix" && /is answered No, but "National identity document number" is recorded/.test(item?.why ?? "") && item?.label === "Do you have a national identity document?" && !r.values[YESNO], { missing: r.ready.missing, written: r.values[YESNO] });
  ok("C7.3 R2 fail guard: before this PR the same answers read \"ready\" (readiness read only the questions) while the form's Yes/No stayed empty", r.before.ready && !r.values[YESNO], r.before);
  const c = forms(snap({ conditioned: true }), [say(GATE, false), say(NUM, "SAMPLE-123")]);
  ok("C7.3 R2 pass: with the detail conditioned, the old number is kept and not used: N is written and the form is ready", c.ready.ready && c.values[YESNO] === "N" && !c.values[NUMBOX], { ready: c.ready, values: c.values });
  const h = forms(snap({ conditioned: true, byHand: true }), [say(GATE, false)], true);
  const empty = h.ready.missing.filter((m) => m.reason === "left empty on the form");
  ok("C7.3 R2 fail (QA-165 section B): IMM 5257's two mandatory boxes with no writer keep the form from being ready, one line each, told apart by the field's own name, with why", !h.ready.ready && empty.length === 2 && empty.some((m) => /Taiwan PIN/.test(m.label)) && empty.some((m) => /Israel Passport Indicator/.test(m.label)) && empty.every((m) => /^no question asks it yet: /.test(m.why ?? "")), empty);
  ok("C7.3 R2 fail guard: before this PR the same case read \"ready\" with two mandatory boxes left empty", h.before.ready && !h.values[TAIWAN] && !h.values[ISRAEL], h.before);
  const y = forms(snap({ conditioned: true }), [say(GATE, true)]);
  ok("C7.3 R2 pass guard: a fact already listed by its question is not listed again for its form field (one line: \"not answered\")", y.ready.missing.filter((m) => m.fact === NUM || m.fact === `box:${NUMBOX}`).length === 1, y.ready.missing);
  // Ready to file's words (engine/runtime/readiness.ts): the fix in its own words; an empty mandatory box on its own line.
  const item0 = (rd: ReturnType<typeof readiness>): FormItem => ({ item: "i1", form: FORM, subject: "p1", person: "Client A", channel: "PDF_UPLOAD", readiness: rd, needsValidate: false, validatedCurrent: true, signature: "NONE", signed: true, signedBy: "none" });
  const fr = filingReadiness({ filing: "f1", forms: [item0(r.ready), item0(h.ready)], reviewed: true, today: "2026-11-08" });
  ok("C7.6 R2 pass: Ready to file says the fix in its own words, and names the mandatory boxes a copy would leave empty", !fr.ready && fr.warns.some((w) => w.code === "fact_problem" && /is not written: .*is answered No, but/.test(w.words)) && fr.warns.some((w) => w.code === "missing_facts" && /2 form fields IRCC's form marks mandatory would be left empty/.test(w.words)), fr.warns.map((w) => w.words));
}

// ---------------------------------------------------------------- R3: the gate-to-detail pairs are the form's own
{
  const entries = [{ data_path: YESNO, fact: GATE, transform: STEP }, { data_path: NUMBOX, fact: NUM }, { data_path: "form1[0].Page2[0].natID[0].natIDdocs[0].IssueDate[0].IssueDate[0]", fact: "person.national_id_issue_date" }, { data_path: "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].PassportNum[0]", fact: "person.passport_number" }];
  ok("C7.2 R3 pass: a detail the box's own step names is tied to it", /step names it/.test(followUpGround(entries[0], entries, NUM) ?? ""));
  ok("C7.2 R3 pass: a detail whose form field sits inside the box's block (natID[0]) is tied to it", /inside the box's block form1\[0\]\.Page2\[0\]\.natID\[0\]/.test(followUpGround(entries[0], entries, "person.national_id_issue_date") ?? ""));
  ok("C7.2 R3 fail: a fact elsewhere on the form (the passport number) is never tied to it", followUpGround(entries[0], entries, "person.passport_number") === null && followUpGround(entries[0], entries, "person.not_on_form") === null);
  const alias = { data_path: "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", fact: "person.has_used_other_name", transform: "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N" };
  ok("C7.2 R3 pass: both names in IMM 5257's other-name step are tied to it, and the person's own name is not", !!followUpGround(alias, [alias], "person.other_given_names") && !!followUpGround(alias, [alias], "person.other_family_name") && followUpGround(alias, [alias], "person.family_name") === null);
}
process.exitCode = summary() ? 1 : 0;
