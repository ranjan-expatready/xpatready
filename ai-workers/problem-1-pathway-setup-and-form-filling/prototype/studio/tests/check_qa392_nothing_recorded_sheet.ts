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
import { formValues, type Inventory } from "../engine/form-values.ts";
import { runTransform } from "../../p5/transforms.ts";
import type { BoxRow } from "../engine/render.ts";
import type { QuestionnaireView } from "../contracts/runtime.ts";
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
const sheetFor = (boxes: BoxRow[]) => sheetOf(layout, boxes, () => "questionnaire", new Map([[MAP[0].fact, "Country"], [MAP[1].fact, "Name of school"]]), new Map(), () => undefined, () => false);

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

process.exit(summary() ? 1 : 0);
