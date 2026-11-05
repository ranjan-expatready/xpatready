// B81 (C10.1 row 9; Lead 10's rulings (a), (c') on #1009): a person marks an answer list's value "not on this form", so
// filling refuses it in words, never a guess. The form's own printed choices decide (AGENTS.md rule 4); Sample,
// Unconfirmed: expert. Offline (no database, no AI): engine/options.ts, engine/form-values.ts. The routes, the group
// save and the validator are checked on an isolated copy by tests/check_forms_b81_routes.ts.
//   tsx studio/tests/check_forms_b81_not_on_form.ts
import { codeForValue, draftOptionMap, notOnFormValue, optionMapProblems, pdfOptions, printedAs } from "../engine/options.ts";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };

const list = [["annulled_marriage", "Annulled Marriage"], ["common_law", "Common-Law"], ["divorced", "Divorced"], ["legally_separated", "Legally Separated"], ["married", "Married"], ["single", "Single"], ["unknown", "Unknown"], ["widowed", "Widowed"]].map(([key, label]) => ({ key, label }));
const keys = list.map((v) => v.key);
const inv = JSON.parse(readFileSync(new URL("../../p1/inventory/imm5645e.inventory.json", import.meta.url), "utf8")) as { fields: { data_path?: string; ui?: string; options?: unknown; options_resolved?: null }[] };
const box = (part: string) => inv.fields.find((f) => (f.data_path ?? "").includes(`${part}[0].ChildMStatus`))!;

// The form's own printed choices come before what an earlier reading wrote in the transform.
const mother = pdfOptions(box("Mother"), "code_list:imm5645.parent_marital_status{Annulled marriage=1}");
ok("B81: a drop-down's printed choices are read from the form itself, whatever the transform's text says (no \"no option map yet\")", mother.length === 7 && mother.find((o) => o.label === "Married")?.code === "5", mother);
const child = pdfOptions(box("SectionB[0].Child"), "code_list:imm5645.marital_status (1=Annulled marriage, 2=Common-law, 3=Divorced)");
ok("B81: the printed codes are the form's (1 to 7), never words from a reversed transform (\"3=Divorced\" gave the code \"Divorced\")", child.find((o) => o.label === "Divorced")?.code === "3", child);
ok("B81: a transform still gives the choices when the form field prints none in its reading", pdfOptions({}, "code_list:x (Married=5, Single=2; note)").length === 2);
ok("B81: a check box's on and off states are never choices", pdfOptions({ ui: "checkButton", options: [["1", "0"], ["1", "0"]] }, null).length === 0);

const d = draftOptionMap(list, mother);
ok("B81: the rules draft all seven printed choices and leave only the value the form does not print", d.unmatched.join() === "unknown" && Object.keys(d.optionMap.map).length === 7 && d.optionMap.map.married === "5" && d.optionMap.map.annulled_marriage === "1", d);

// The two printed married choices (IMM 5645's own Applicant and Spouse boxes).
const applicant = pdfOptions(box("Applicant"), null);
const two = draftOptionMap(list, applicant);
ok("B81 fail: one list value \"Married\" against two printed \"Married-…\" choices stays with a person (never the first one)", !("married" in two.optionMap.map) && two.unmatched.includes("married"), two);
ok("B81 pass: a first word only one printed choice has still matches", draftOptionMap([{ key: "m", label: "Married" }], [{ code: "1", label: "Married-physically present" }, { code: "2", label: "Single" }]).optionMap.map.m === "1");

// The mark.
const marked = { ...d.optionMap, notOnForm: ["unknown"] };
ok("B81 fail: without the mark, a value with no code is a problem (Submit refuses)", optionMapProblems(keys, d.optionMap).length === 1, optionMapProblems(keys, d.optionMap));
ok("B81 pass: with the mark, the option map has no problem", optionMapProblems(keys, marked).length === 0, optionMapProblems(keys, marked));
ok("B81 fail: a mark on a value the list does not have is a problem", /does not have/.test(optionMapProblems(keys, { ...marked, notOnForm: ["unknown", "gone"] }).join()), optionMapProblems(keys, { ...marked, notOnForm: ["unknown", "gone"] }));
ok("B81 fail: a value with a code and a mark is a problem", /has a code and is marked/.test(optionMapProblems(keys, { ...marked, notOnForm: ["unknown", "married"] }).join()));
ok("B81: a marked value has no code at filling (the filler refuses, never the nearest choice)", codeForValue("unknown", marked, list) === null && codeForValue("Unknown", marked, list) === null);
ok("B81: a marked value is named by key or label; an unmarked one is not", notOnFormValue("Unknown", marked, list)?.key === "unknown" && notOnFormValue("unknown", marked, list)?.label === "Unknown" && notOnFormValue("married", marked, list) === null);
ok("B81: a value the form prints in its own words can never be marked; one it does not print can", printedAs({ key: "married", label: "Married" }, mother)?.code === "5" && printedAs({ key: "unknown", label: "Unknown" }, mother) === null);
const again = draftOptionMap(list, mother, ["unknown"]);
ok("B81: a person's mark survives a new draft, and the value is not left open", again.optionMap.notOnForm?.join() === "unknown" && again.unmatched.length === 0, again);
ok("B81: a draft with no mark stores nothing new (older option maps stay byte for byte)", !("notOnForm" in d.optionMap));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
