// C7.3 (QA-392, Major; qa on #1549, master analysis #1532 07b suspect (a)): a Yes/No box the PDF copy writes as No because
// nothing is recorded (a list answered "none apply", or the Yes/No question it is asked under answered No) must read the
// same on the Online answer sheet: the same person, the same fact, the same No. One rule marks those boxes for both paths
// (engine/runtime/forms.ts markNothingRecorded); the copy writes them (engine/form-values.ts formValues), the sheet lays
// them out (engine/runtime/answer-sheet.ts sheetOf). Here both paths run on the same marked boxes of IMM 5257 (09-2023):
// Question 8 A (PCRIndicator) and Education Question 1 (EducationIndicator), with the transforms of the release's field map
// (p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json), and the sheet's value, put through the same transform,
// must give exactly what the PDF wrote. Fail guards: an unanswered "none apply" and an entry recorded give no such line.
// Pure: no database, no server, no model call (US$0).
//   tsx studio/tests/check_qa392_nothing_recorded_sheet.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { markNothingRecorded } from "../engine/runtime/forms.ts";
import { sheetOf } from "../engine/runtime/answer-sheet.ts";
import { formValues, recordedYesNo, type Inventory } from "../engine/form-values.ts";
import { runTransform } from "../../p5/transforms.ts";
import type { BoxRow } from "../engine/render.ts";
import type { QuestionnaireView } from "../contracts/runtime.ts";
import { factChanges } from "../engine/runtime/out-of-date.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const P = "11111111-1111-4111-8111-111111111111";
const inv = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as Inventory & { fields: { data_path?: string; caption?: string }[] };
const caption = (path: string) => inv.fields.find((f) => f.data_path === path)?.caption ?? "";
const PCR = "form1[0].Page1[0].PersonalDetails[0].PCRIndicator[0]", EDU = "form1[0].Page3[0].Education[0].EducationIndicator[0]";
const MAP = [
  { box: PCR, fact: "person.previous_residence_country", transform: "derived:any previous residence in past 5 years, over 6 months, in a country other than citizenship or current residence -> yes_no_code:Y/N" },
  { box: EDU, fact: "person.education_school_name", transform: "derived:any post-secondary education record exists -> yes_no_code:Y/N" },
];
const boxesOf = (): BoxRow[] => MAP.map((m) => ({ box: m.box, caption: caption(m.box), fact: m.fact, meaning: null, about: P, about_label: "Client A", row: null, coverage: "unresolved", detail: "", value: null, transform: m.transform }));
/** A case view where each list is answered as given: "none" (none apply, it fills), "open" (not answered yet) or a number of entries. */
function viewOf(lists: { previous: "none" | "open" | number; education: "none" | "open" | number }): QuestionnaireView {
  const sec = (section: string, title: string, fact: string, label: string, state: "none" | "open" | number) => ({
    section, title, subjectId: P, about_label: "Client A",
    group: { required: true, client: true, rows: typeof state === "number" ? state : 0, none_apply: state === "none" ? { value: true, fills: true, confirmed: true, mark: "confirmed", channel: "questionnaire", answered: { channel: "questionnaire", by: "client", at: "2026-11-11" }, why: "" } : null },
    questions: [{ fact, label, subjectId: P, hidden: false, answer: null, rows: typeof state === "number" ? Array.from({ length: state }, () => ({ answer: { value: "X", confirmed: true, fills: true, mark: "confirmed", why: "" } })) : [], fills: [] }],
  });
  return { sections: [sec("previous_countries_of_residence", "Previous countries of residence", MAP[0].fact, "Country", lists.previous), sec("education_history", "Education", MAP[1].fact, "Name of school", lists.education)], checks: [] } as unknown as QuestionnaireView;
}
const snapshot = { canonical_fields: [] } as unknown as Parameters<typeof formValues>[0];
const layout = { basis: "form_parts" as const, parts: [{ key: "personal", title: "Personal details", named: true, fieldKeys: [PCR] }, { key: "education", title: "Education", named: true, fieldKeys: [EDU] }] };
const ENTRIES = { entries: MAP.map((m) => ({ data_path: m.box, fact: m.fact })) };
// QA-392b: the sheet reads each recorded box's Yes or No from the copy's own value step, as api/src/case-prepare.ts does.
const sheetFor = (boxes: BoxRow[]) => sheetOf(layout, boxes, () => "questionnaire", new Map([[MAP[0].fact, "Country"], [MAP[1].fact, "Name of school"]]), new Map(), () => undefined, () => false, undefined, recordedYesNo(formValues(snapshot, ENTRIES, inv, boxes).boxes));

// Both lists answered "none apply": the one rule marks both boxes; the copy writes N; the sheet carries the same No.
const marked = markNothingRecorded(boxesOf(), viewOf({ previous: "none", education: "none" }));
ok("QA-392 setup: the shared rule marks both Yes/No boxes as \"nothing recorded\" when both lists are answered \"none apply\"", marked.every((b) => b.nothing_recorded), marked.map((b) => [b.box.split(".").pop(), b.nothing_recorded ?? false]));
const pdf = formValues(snapshot, { entries: MAP.map((m) => ({ data_path: m.box, fact: m.fact })) }, inv, marked);
ok("QA-392 setup: the PDF copy writes both boxes as N (the existing fill, unchanged)", MAP.every((m) => pdf.values[m.box] === "N"), MAP.map((m) => pdf.values[m.box]));
const sheet = sheetFor(marked);
const lines = sheet.sections.flatMap((s) => s.answers.map((a) => ({ ...a, section: s.key })));
for (const m of MAP) {
  const line = lines.find((l) => l.subject === P && l.fact === m.fact && l.row === null);
  ok(`QA-392 pass: ${m.box.split(".").pop()} written by the PDF copy has its line on the answer sheet, in the same part of the form`, !!line && line.section === (m.box === PCR ? "personal" : "education"), line ?? lines.map((l) => l.fact));
  const again = line ? runTransform(m.transform, line.value, inv.fields.find((f) => f.data_path === m.box) ?? {}) : null;
  ok(`QA-392 pass: the sheet's value for ${m.box.split(".").pop()}, through the field map's own transform, is exactly what the PDF wrote ("${pdf.values[m.box]}"), and reads "No"`, !!again?.ok && "value" in again && again.value === pdf.values[m.box] && line?.copy_text === "No", { sheet: line?.value, copy: line?.copy_text, again });
  ok(`QA-392 pass: the line is labelled with the form's own question, never the list's column ("${m.fact}")`, !!line && line.label === caption(m.box) && /\?$/.test(line.label), line?.label);
}
ok("QA-392 pass: neither part says \"nothing to type\" any more (each part shows its No)", ["personal", "education"].every((k) => (sheet.sections.find((s) => s.key === k)?.answers.length ?? 0) === 1), sheet.sections.map((s) => [s.key, s.answers.length]));

// Fail guards: a list not answered yet, or one with an entry, is never written as No on either path.
const open = markNothingRecorded(boxesOf(), viewOf({ previous: "open", education: 1 }));
ok("QA-392 fail: a list whose \"none apply\" is not answered, or that holds an entry, is not marked; the PDF does not write it, and the sheet shows no No for it", open.every((b) => !b.nothing_recorded)
  && MAP.every((m) => !formValues(snapshot, { entries: MAP.map((x) => ({ data_path: x.box, fact: x.fact })) }, inv, open).values[m.box])
  && !sheetFor(open).sections.some((s) => s.answers.some((a) => a.value === false)), open.map((b) => b.nothing_recorded ?? false));

// QA-392b (the Yes side): a list with an entry (a confirmed school, a confirmed previous residence) makes the copy write Y;
// the sheet's line for that box is that Yes, in the form's own question, in place of the entry's own value ("SAMPLE").
const withEntries = boxesOf().map((b) => ({ ...b, coverage: "confirmed fact" as const, value: "SAMPLE" }));
const pdfYes = formValues(snapshot, ENTRIES, inv, withEntries), yesLines = sheetFor(withEntries).sections.flatMap((s) => s.answers);
ok("QA-392b setup: with an entry in each list the PDF copy writes both boxes as Y (the existing fill, unchanged)", MAP.every((m) => pdfYes.values[m.box] === "Y"), MAP.map((m) => pdfYes.values[m.box]));
for (const m of MAP) {
  const line = yesLines.find((l) => l.subject === P && l.fact === m.fact && l.row === null);
  ok(`QA-392b pass: ${m.box.split(".").pop()}'s line reads Yes, as the PDF writes Y, in the form's own question, never the entry's value`, !!line && line.value === true && line.copy_text === "Yes" && line.label === caption(m.box) && line.recorded === true, line && [line.label.slice(0, 40), line.copy_text]);
}
ok("QA-392b fail: no line shows the entry's own value under the box's line any more (the second \"Name of school: SAMPLE\")", !yesLines.some((l) => l.row === null && l.copy_text === "SAMPLE"), yesLines.map((l) => [l.label.slice(0, 30), l.copy_text]));
// The one rule reads only what the copy writes: a box the copy leaves to a person (here: refused, not confirmed) has no Yes/No.
const notWritten = recordedYesNo(formValues(snapshot, ENTRIES, inv, boxesOf()).boxes);
ok("QA-392b fail: a recorded box the copy does not write (not confirmed, no \"none apply\") has no Yes or No on the sheet", notWritten.size === 0 && !sheetFor(boxesOf()).sections.some((s) => s.answers.length), [...notWritten]);

// A ticked part's No changes (case-prepare.ts passes a "nothing recorded" line's label, quoted): the change is named by the
// form's question whether the No is taken back or an entry replaces it (review m3 on #1553), else by the fact's words.
const words = { label: (f: string) => (f === MAP[1].fact ? "Name of the school or facility attended" : f), person: () => "Client A", at: () => null };
const q = `\u201c${caption(EDU)}\u201d`, was = [{ fact: MAP[1].fact, about: P, row: null, value: false, label: q }];
const back = factChanges(was, [], words)[0], entry = factChanges(was, [{ fact: MAP[1].fact, about: P, row: null, value: "SAMPLE" }], words)[0];
const plain = factChanges([{ fact: MAP[1].fact, about: P, row: null, value: "A" }], [{ fact: MAP[1].fact, about: P, row: null, value: "B" }], words)[0];
ok("QA-392 pass: a \"nothing recorded\" No taken back, or replaced by an entry, is named by the form's question; any other change keeps the fact's words", back?.label === q && entry?.label === q && plain?.label === "Name of the school or facility attended", [back?.label, entry?.label, plain?.label]);

process.exit(summary() ? 1 : 0);
