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
//      field sits inside the Yes/No form field's block.
//   R7 (QA-165's last two, tech lead on #1363) the Taiwan PIN and Israel passport form fields are each asked as their own
//      question only for the passport the form's own script names (203 "TWN (Taiwan)", 206 "ISR (Israel)"): the condition
//      is taken only when the script's rule, the map's country form field and the form's own choice all agree, and the map
//      carries the script's words (so the question's condition is confirmed on the form field from the form itself).
//   tsx studio/tests/check_qa165_gate_follow_ups.ts
import { caseView, type Answer, type Participant } from "../engine/runtime/case.ts";
import { blocksLock, formCoverage, markNothingRecorded, readiness, type OnForm } from "../engine/runtime/forms.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formValues } from "../engine/form-values.ts";
import { mandatoryOpen } from "../engine/runtime/mandatory.ts";
import { CODE_WORDS, filingReadiness, isCritical, type FormItem } from "../engine/runtime/readiness.ts";
import { OWN_YES_NO, askedWhenGround, equalsGate, followUpGround, scriptRulesOf, scriptWords, yesGate } from "../api/src/own-yes-no.ts";
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
  const online = filingReadiness({ filing: "f2", forms: [{ ...item0(h.ready), channel: "ONLINE" }], reviewed: true, today: "2026-11-08" });
  // Tech lead on #1318 (P-294): one line per box. A mandatory box the newest copy lists "To write by hand" makes #1331's
  // hand_write line only; a mandatory box with no writer still makes the CRITICAL "would be left empty" line.
  const hand = (boxes: string[]) => filingReadiness({ filing: "f4", forms: [{ ...item0(h.ready), byHand: boxes.map((b) => ({ copy: "copy-1", box: b, label: "A form field", why: "the form's own code list" })) }], reviewed: true, today: "2026-11-08" });
  const both = hand([TAIWAN, ISRAEL]), one = hand([TAIWAN]);
  const lineOf = (x: ReturnType<typeof hand>) => x.warns.filter((w) => w.code === "fields_left_empty" && /would be left empty/.test(w.words));
  ok("C7.6 R2 pass (#1318, P-294): mandatory boxes the copy lists by hand make the hand_write lines only, never also the CRITICAL \"left empty\" line", lineOf(both).length === 0 && both.warns.filter((w) => w.code === "hand_write").length === 2, both.warns.map((w) => `${w.code}: ${w.words}`));
  ok("C7.6 R2 fail (#1318, P-294): a mandatory box with no writer (not in the copy's by-hand list) still makes the CRITICAL line, for that box alone", lineOf(one).length === 1 && /: 1 form field IRCC's form marks mandatory would be left empty/.test(lineOf(one)[0].words) && /Israel Passport Indicator/.test(lineOf(one)[0].words) && one.warns.filter((w) => w.code === "hand_write").length === 1, one.warns.map((w) => `${w.code}: ${w.words}`));
  ok("C7.6 R2 pass (Devin on #1318): a form filed Online (its PDF a copy, not for filing) has no \"left empty\" line on Ready to file for its PDF's boxes", !online.warns.some((w) => /would be left empty/.test(w.words)), online.warns.map((w) => w.words));
  const onlineFix = filingReadiness({ filing: "f3", forms: [{ ...item0(r.ready), channel: "ONLINE" }], reviewed: true, today: "2026-11-08" });
  ok("C7.6 R2 fail guard (Devin on #1318): filed Online, a fact that would be written wrong still stands before Ready to file", onlineFix.warns.some((w) => w.code === "fact_problem" && /is answered No, but/.test(w.words)), onlineFix.warns.map((w) => w.words));
  ok("C7.6 R2 pass: Ready to file says the fix in its own words, and names the mandatory boxes a copy would leave empty", !fr.ready && fr.warns.some((w) => w.code === "fact_problem" && /is not written: .*is answered No, but/.test(w.words)) && fr.warns.some((w) => w.code === "fields_left_empty" && w.severity === "critical" && /2 form fields IRCC's form marks mandatory would be left empty/.test(w.words)), fr.warns.map((w) => w.words));
  // Tech lead on #1318 (option 1): its own CRITICAL code, so "missing facts" stays about facts.
  ok("C7.6 R2 fail guard (#1318 option 1): the empty form fields are never a \"Missing facts\" line", !fr.warns.some((w) => w.code === "missing_facts" && /would be left empty/.test(w.words)) && isCritical("fields_left_empty") && CODE_WORDS.fields_left_empty === "Mandatory form fields left empty", fr.warns.map((w) => `${w.code}: ${w.words.slice(0, 60)}`));
  // Review on #1318 (the date Minor): a line covering a date's parts leaves the count only when every part is by hand.
  const YEAR = "form1[0].Page1[0].Sample[0].DOBYear[0]", MONTH = "form1[0].Page1[0].Sample[0].DOBMonth[0]";
  const dated = (byHand: string[]) => filingReadiness({ filing: "f5", forms: [{ ...item0({ ready: false, missing: [{ fact: `box:${YEAR}`, label: "Date of birth", about: "Client A", reason: "left empty on the form", why: "no question asks it yet: nothing in this release fills it", subject: "p1", boxes: [YEAR, MONTH] }] }), byHand: byHand.map((b) => ({ copy: "copy-1", box: b, label: "Date of birth", why: "the form's own step" })) }], reviewed: true, today: "2026-11-08" });
  ok("C7.6 R2 fail (#1318, the date Minor): a date whose first part only is by hand stays on the CRITICAL line (its other part has no writer)", lineOf(dated([YEAR])).length === 1, dated([YEAR]).warns.map((w) => `${w.code}: ${w.words.slice(0, 80)}`));
  ok("C7.6 R2 pass (#1318, the date Minor): a date whose every part is by hand leaves the CRITICAL line (its hand_write lines say it)", lineOf(dated([YEAR, MONTH])).length === 0 && dated([YEAR, MONTH]).warns.filter((w) => w.code === "hand_write").length === 2, dated([YEAR, MONTH]).warns.map((w) => `${w.code}: ${w.words.slice(0, 80)}`));
}

// ---------------------------------------------------------------- R3: the gate-to-detail pairs are the form's own
{
  const entries = [{ data_path: YESNO, fact: GATE, transform: STEP }, { data_path: NUMBOX, fact: NUM }, { data_path: "form1[0].Page2[0].natID[0].natIDdocs[0].IssueDate[0].IssueDate[0]", fact: "person.national_id_issue_date" }, { data_path: "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].PassportNum[0]", fact: "person.passport_number" }];
  ok("C7.2 R3 pass: a detail the box's own step names is tied to it", /step names it/.test(followUpGround(entries[0], entries, NUM) ?? ""));
  ok("C7.2 R3 pass: a detail whose form field sits inside the Yes/No form field's block (natID[0]) is tied to it", /inside the Yes\/No form field's block form1\[0\]\.Page2\[0\]\.natID\[0\]/.test(followUpGround(entries[0], entries, "person.national_id_issue_date") ?? ""));
  ok("C7.2 R3 fail: a fact elsewhere on the form (the passport number) is never tied to it", followUpGround(entries[0], entries, "person.passport_number") === null && followUpGround(entries[0], entries, "person.not_on_form") === null);
  const alias = { data_path: "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", fact: "person.has_used_other_name", transform: "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N" };
  ok("C7.2 R3 pass: both names in IMM 5257's other-name step are tied to it, and the person's own name is not", !!followUpGround(alias, [alias], "person.other_given_names") && !!followUpGround(alias, [alias], "person.other_family_name") && followUpGround(alias, [alias], "person.family_name") === null);
}
// ---------------------------------------------------------------- R4 (#1318 review M1): a requirement the form's own script makes conditional
{
  const COUNTRY = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].CountryofIssue[0].CountryofIssue[0]";
  const data = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "form-script-requirements.json"), "utf8")) as { basis: string; editions: { inventory: string; fields: { box: string; requiredWhen: { box: string; equals: string[] } }[] }[] };
  const rw = new Map(data.editions.find((e) => e.inventory === "imm5257e.inventory.json")!.fields.map((x) => [x.box, x.requiredWhen]));
  const script = readFileSync(join(import.meta.dirname, "..", "..", "expected", "source-text", "imm5257e.xfa-template.txt"), "utf8");
  const own = (code: string, req: string, unreq: string) => new RegExp(`rawValue == "${code}"\\)[^]*?markRequired\\(${req}\\.No\\)[^]*?markUnRequired\\(${unreq}\\.No\\)`).test(script);
  ok("C7.2 R4 (grounding, P-170): the data is the form's own script: code 203 requires the Taiwan PIN box and not the Israel one, 206 the other way round, any other code neither", rw.get(TAIWAN)?.box === COUNTRY && rw.get(TAIWAN)?.equals.join() === "203" && rw.get(ISRAEL)?.equals.join() === "206" && own("203", "TaiwanPIN", "IsraelPassportIndicator") && own("206", "IsraelPassportIndicator", "TaiwanPIN") && /CR 330212/.test(data.basis), { taiwan: rw.get(TAIWAN), israel: rw.get(ISRAEL) });
  const fields = { fields: [TAIWAN, ISRAEL].map((p) => ({ data_path: p, required: true, ui: "exclGroup", options: yn })) } as never;
  const open = (code: string) => mandatoryOpen(fields, [TAIWAN, ISRAEL].map((p) => ({ data_path: p, outcome: "by_hand", fact: null })) as never, [], { [COUNTRY]: code }, {}, rw).map((o) => o.box);
  ok("C7.2 R4 pass: an Indian passport (the form's code 205): neither box is mandatory, so neither is open", open("205").length === 0, open("205"));
  ok("C7.2 R4 fail: a passport the form codes 203 makes the Taiwan PIN box mandatory (open while empty), not the Israel one", JSON.stringify(open("203")) === JSON.stringify([TAIWAN]), open("203"));
  ok("C7.2 R4 fail: code 206 makes the Israel passport box mandatory, not the Taiwan one", JSON.stringify(open("206")) === JSON.stringify([ISRAEL]), open("206"));
  // Review M1 on the Taiwan/Israel PR: a form field whose question is hidden (B86 "not needed") is still open when the form's
  // own script requires it for the code the copy writes ("isr" writes 206 while the question is asked only for "ISR").
  const hiddenQ = (code: string) => mandatoryOpen(fields, [TAIWAN, ISRAEL].map((p) => ({ data_path: p, outcome: "mapped", fact: p === TAIWAN ? "person.taiwan_pin" : "person.israel_passport" })) as never, [TAIWAN, ISRAEL].map((p) => ({ box: p, coverage: "not needed", result: "not written", detail: "Not needed" })) as never, { [COUNTRY]: code }, {}, rw);
  ok("C7.2 R7 fail (review M1): a hidden question's form field the script requires for the code written (206) stays open, saying to check that answer", JSON.stringify(hiddenQ("206").map((o) => o.box)) === JSON.stringify([ISRAEL]) && /check that answer/.test(hiddenQ("206")[0]?.why ?? ""), hiddenQ("206"));
  ok("C7.2 R7 pass: a hidden question's form field the script does not require for the code written (205) is left empty, not open", hiddenQ("205").length === 0, hiddenQ("205"));
  ok("C7.2 R4 fail guard: without the data the field list's own `required` stands (both open, as before)", mandatoryOpen(fields, [TAIWAN, ISRAEL].map((p) => ({ data_path: p, outcome: "by_hand", fact: null })) as never, [], { [COUNTRY]: "205" }).length === 2);
}
// ---------------------------------------------------------------- R7 (QA-165's last two): asked only for the passport the form's script names
{
  const COUNTRY = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].CountryofIssue[0].CountryofIssue[0]";
  const inv = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: { data_path?: string; options_resolved?: [string, string][] }[] };
  const choices = inv.fields.find((f) => f.data_path === COUNTRY)!.options_resolved!;
  const rules = scriptRulesOf("inventory/imm5257e.inventory.json");
  const entries = [{ data_path: COUNTRY, fact: "person.passport_country_of_issue" }, { data_path: TAIWAN, fact: "person.taiwan_pin" }, { data_path: ISRAEL, fact: "person.israel_passport" }];
  const boxes = OWN_YES_NO["vv.single"].boxes.filter((b) => b.askedWhen);
  ok("C7.2 R7 setup: the data asks IMM 5257's Taiwan PIN only for TWN and its Israel passport only for ISR, both on the checkpoint only (B116), in the form's own words", JSON.stringify(boxes.map((b) => [b.dataPath, b.askedWhen!.equals, b.checkpointOnly])) === JSON.stringify([[TAIWAN, "TWN", true], [ISRAEL, "ISR", true]]) && boxes.every((b) => /\?$/.test(b.question ?? "")), boxes.map((b) => b.question));
  ok("C7.2 R7 pass: the form's own script grounds each (203 is \"TWN (Taiwan)\", 206 is \"ISR (Israel)\" in its country list, read from the map's country form field)",
    /holds 203, the form's choice "TWN \(Taiwan\)"/.test(askedWhenGround(TAIWAN, { fact: "person.passport_country_of_issue", equals: "TWN" }, rules, entries, choices) ?? "") && /holds 206, the form's choice "ISR \(Israel\)"/.test(askedWhenGround(ISRAEL, { fact: "person.passport_country_of_issue", equals: "ISR" }, rules, entries, choices) ?? ""));
  ok("C7.2 R7 fail: a country the script does not name for that form field (Taiwan PIN for ISR, Israel for IND) takes no condition", askedWhenGround(TAIWAN, { fact: "person.passport_country_of_issue", equals: "ISR" }, rules, entries, choices) === null && askedWhenGround(ISRAEL, { fact: "person.passport_country_of_issue", equals: "IND" }, rules, entries, choices) === null);
  ok("C7.2 R7 fail: another fact (the map fills the country form field from it, not from the one named), or a form field with no script rule, takes no condition",
    askedWhenGround(TAIWAN, { fact: "person.citizenship", equals: "TWN" }, rules, entries, choices) === null && askedWhenGround(TAIWAN, { fact: "person.passport_country_of_issue", equals: "TWN" }, rules, entries.map((e) => (e.data_path === COUNTRY ? { ...e, fact: "person.citizenship" } : e)), choices) === null && askedWhenGround(YESNO, { fact: "person.passport_country_of_issue", equals: "TWN" }, rules, entries, choices) === null);
  ok("C7.2 R7 pass: the condition is the screen's own shape, \"show only when the passport's country of issue is TWN\"", JSON.stringify(equalsGate({ fact: "person.passport_country_of_issue", equals: "TWN" })) === JSON.stringify({ subjectKind: "PERSON", op: "eq", field: "person.passport_country_of_issue", value: "TWN" }));
  const reading = new Map(inv.fields.filter((f) => f.data_path).map((f) => [f.data_path!, f]));
  const words = scriptWords(rules.find((r) => r.box === TAIWAN), reading);
  ok("C7.2 R7 pass: the map carries the script's words, naming the country form field by its own name and the form's choice", words === 'Only when CountryofIssue[0] holds 203 ("TWN (Taiwan)"): the form\'s own script requires it only then.', words);
  ok("C7.2 R7 fail: a form field with no script rule gets no words (its map says nothing about when it is filled)", scriptWords(rules.find((r) => r.box === YESNO), reading) === null);
}
// ---------------------------------------------------------------- R6 (#1318 review M2): a box left empty never holds a lock back
ok("C7.2 R6 pass: a mandatory box left empty does not hold a copy's lock back (it is said on the card and on Ready to file)", !blocksLock({ reason: "left empty on the form" }));
ok("C7.2 R6 fail: a fact to answer, to confirm or to fix, or a fired check, holds it back", ["not answered", "not confirmed", "needs a fix", "waits for the client to re-confirm", "a check fired"].every((reason) => blocksLock({ reason })));
process.exitCode = summary() ? 1 : 0;
