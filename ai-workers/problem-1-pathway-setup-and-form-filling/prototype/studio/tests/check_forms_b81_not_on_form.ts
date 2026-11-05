// B81 (C10.1 row 9; Lead 10's rulings (a), (c') on #1009): a person marks an answer list's value "not on this form", so
// filling refuses it in words, never a guess. The form's own printed choices decide (AGENTS.md rule 4); Sample,
// Unconfirmed: expert. Offline (no database, no AI): engine/options.ts, engine/form-values.ts. The routes, the group
// save and the validator are checked on an isolated copy by tests/check_forms_b81_routes.ts.
//   tsx studio/tests/check_forms_b81_not_on_form.ts
import { asksMore, carriedOptionMap, choiceEditionsOf, choiceRows, codeForValue, draftOptionMap, notOnFormValue, optionMapProblems, pdfOptions, printedNear, samePrintedChoices } from "../engine/options.ts";
import { askedChoiceProblems, channelProblems } from "../engine/channels.ts";
import { formValues, notOnFormLines } from "../engine/form-values.ts";
import { optionsOf } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";
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
const married = { key: "married", label: "Married" }, unknownV = { key: "unknown", label: "Unknown" }, sep = { key: "legally_separated", label: "Legally Separated" };
ok("B81 pass: only a value the form prints nothing for can be marked", printedNear(unknownV, mother).length === 0 && printedNear(unknownV, applicant).length === 0);
ok("B81 fail (challenge B1): a value printed in its own words, or as a shorter ending, or as two longer choices is on the form, so it cannot be marked", printedNear(married, mother)[0]?.code === "5" && printedNear(married, applicant).length === 2 && printedNear(sep, [{ code: "05", label: "Separated" }]).length === 1);
ok("B81: an unrelated choice sharing only a first word is not this value", printedNear({ key: "uae", label: "United Arab Emirates" }, [{ code: "1", label: "United States" }]).length === 0);
ok("B81 fail (challenge B1): two printed choices that start with the value ask a further fact; one printed in its own words does not", asksMore(married, applicant) && !asksMore(married, mother) && !asksMore(unknownV, applicant));
const again = draftOptionMap(list, mother, { ...d.optionMap, map: { ...d.optionMap.map, single: "5", married: "6" }, notOnForm: ["unknown"] });
ok("B81 (challenge M6): a person's mark and codes survive a new draft; only the open values are drafted", again.optionMap.notOnForm?.join() === "unknown" && again.unmatched.length === 0 && again.optionMap.map.married === "6", again);
const stale = draftOptionMap(list, child, { map: { divorced: "Divorced", married: "5" }, unused: [], codes: [] });
ok("B81 (challenge M6): a saved code the form does not print (\"Divorced\") is drafted again from the form's own codes", stale.optionMap.map.divorced === "3" && stale.optionMap.map.married === "5", stale);
ok("B81 (challenge M2): the same printed choices carry a map to a new edition; a changed or added choice does not", samePrintedChoices(box("Mother"), box("Father")) && !samePrintedChoices(box("Mother"), box("Applicant")));
ok("B81: a draft with no mark stores nothing new (older option maps stay byte for byte)", !("notOnForm" in d.optionMap));

// B79a (#1050) marks IMM 0008 DEP through the same door: its marital status box stores its choices the other way (resolved).
const dep = JSON.parse(readFileSync(new URL("../../p1/inventory/imm0008depe.inventory.json", import.meta.url), "utf8")) as { fields: { data_path?: string; ui?: string; options_resolved?: [string, string][] | null }[] };
const depOpts = pdfOptions(dep.fields.find((f) => /MaritalStatus\[0\]\.MaritalStatus\[0\]$/.test(f.data_path ?? ""))!, null), depDraft = draftOptionMap(list, depOpts);
ok("B81 (IMM 0008 DEP, B79a): the door is general: its seven printed choices draft, only Unknown is open, and Unknown can be marked", depOpts.length === 7 && depDraft.unmatched.join() === "unknown" && depDraft.optionMap.map.married === "01" && printedNear(unknownV, depOpts).length === 0 && optionMapProblems(keys, { ...depDraft.optionMap, notOnForm: ["unknown"] }).length === 0, depDraft);

// Break M4: a mark is held against the choices the form printed when it was made.
const relabelled = { ...d.optionMap, notOnForm: ["unknown"], printed: mother };
ok("B81 fail (break M4): a marked value reworded into a printed choice blocks: the mark no longer holds", /is marked not on this form, but the form prints "Single"/.test(optionMapProblems(keys, relabelled, list.map((v) => (v.key === "unknown" ? { key: "unknown", label: "Single" } : v))).join()), optionMapProblems(keys, relabelled));
ok("B81 pass: a mark that still holds has no problem, with its printed choices kept", optionMapProblems(keys, relabelled, list).length === 0 && draftOptionMap(list, mother, relabelled).optionMap.printed?.length === 7);
// Break M5: an answer with two printed choices.
const guessed = draftOptionMap(list, applicant, { map: { married: "5" }, unused: [], codes: [] });
ok("B81 fail (break M5): a new draft drops a code kept on an answer with two printed choices", !("married" in guessed.optionMap.map) && guessed.unmatched.includes("married"), guessed);
// Break m6: a key that is also an object's own word.
ok("B81 fail (break m6): \"constructor\" as an answer is an open answer, never taken as already having a code", /no code for "constructor"/.test(optionMapProblems(["constructor"], { map: {}, unused: [], codes: [] }).join()));
// Review R2-M1: the editions the step offers.
const eds = [{ form_number: "F", form_edition: "F (old)", channel: "PDF" }, { form_number: "F", form_edition: "F (new)" }, { form_number: "F", form_edition: "F (online)", channel: "ONLINE" }, { form_number: "G", form_edition: "G (1)" }];
const shownEds = choiceEditionsOf(eds, "F", "F (new)", (e) => (e === "F (old)" ? "id-old" : e === "F (new)" ? "id-new" : "id-online"));
ok("B81 (review R2-M1): the step offers every PDF edition the release check reads, the one in use first, never an online map or another form's", shownEds.map((e) => e.label).join("|") === "F (new)|F (old)" && shownEds[0].id === "id-new", shownEds);
ok("B81 (review R2-M1): a line filed Online (no edition in use) still gets its PDF editions", choiceEditionsOf(eds, "F", null, (e) => e).length === 2);

// Review R3-M3: the step's own reading of a saved map.
const legacy = { map: { married: "5" }, unused: [], codes: [] };
const legacyRows = choiceRows(list, legacy, applicant, true);
ok("B81 fail (review R3-M3): a code saved on an answer with two printed choices shows open and is named as blocking", legacyRows.values.find((v) => v.key === "married")?.code === null && legacyRows.values.find((v) => v.key === "married")?.asks_more === true && legacyRows.problems.some((p) => /"Married" has a code, but the form prints two or more/.test(p)), legacyRows);
const goneRows = choiceRows(list, { ...d.optionMap, notOnForm: ["gone"] }, mother, true);
ok("B81 fail (review R3-M3): a mark on a value gone from the list is named as a problem", goneRows.problems.some((p) => /"gone" not on this form/.test(p)), goneRows.problems);
const unsavedRows = choiceRows(list, null, mother, true);
ok("B81: nothing saved on a form field with codes blocks in Submit's words; on one without, it does not", unsavedRows.problems.join() === "it has no option map yet" && choiceRows(list, null, mother, false).problems.length === 0 && unsavedRows.values.find((v) => v.key === "single")?.code === "6");
// Review R3-M2: Submit and the fill read the same rule.
const legacyPath = box("Applicant").data_path!, legacyEntry = { data_path: legacyPath, outcome: "mapped", fact: "person.marital_status", transform: "option_map", caption: "Marital status:", option_map: { map: { married: "5", single: "7" }, unused: [], codes: [] } };
const legacySnap = { canonical_fields: [{ id: "person.marital_status", answer_list: { values: list } }], forms: [], field_maps: [{ form_number: "IMM 5645", form_edition: "IMM 5645 (01-2021)", channel: "PDF", entries: [legacyEntry] }] } as unknown as Snapshot;
const asks = askedChoiceProblems(legacySnap, () => [box("Applicant")]);
ok("B81 fail (review R3-M2): Submit blocks a code saved on an answer with two printed choices; a one-choice answer on the same form field passes", asks.length === 1 && asks[0].level === "error" && /"Married" has a code, but the form prints "Married-physically present" and "Married-not physically present"/.test(asks[0].message), asks);
const legacyFill = formValues(legacySnap, { entries: [legacyEntry] }, { fields: [box("Applicant")] }, [{ box: legacyPath, coverage: "confirmed fact", fact: "person.marital_status", value: "married", transform: "option_map", about: "form_subject" } as never]);
ok("B81 fail (review R3-M2): a fill never writes a code saved on such an answer: nothing written, and it says the expert decides", legacyFill.boxes[0].result === "by hand" && !(legacyPath in legacyFill.values) && /the immigration expert decides/.test(legacyFill.boxes[0].why ?? ""), legacyFill.boxes[0]);
const singleFill = formValues(legacySnap, { entries: [legacyEntry] }, { fields: [box("Applicant")] }, [{ box: legacyPath, coverage: "confirmed fact", fact: "person.marital_status", value: "single", transform: "option_map", about: "form_subject" } as never]);
ok("B81 pass: a one-choice answer on that form field is written", singleFill.boxes[0].result === "written" && singleFill.values[legacyPath] === "7", singleFill.boxes[0]);

// Filling and the release check, as a fill and Submit run them.
const path = box("Mother").data_path!, entry = { data_path: path, outcome: "mapped", fact: "person.marital_status", transform: "option_map", caption: "Marital status:", option_map: marked };
const snapshot = { canonical_fields: [{ id: "person.marital_status", answer_list: { values: list } }], forms: [], field_maps: [{ form_number: "IMM 5645", form_edition: "IMM 5645 (01-2021)", channel: "PDF", entries: [entry, { ...entry, data_path: "second" }] }] } as unknown as Snapshot;
const fill = (value: string) => formValues(snapshot, { entries: [entry] }, { fields: [box("Mother")] }, [{ box: path, coverage: "confirmed fact", fact: "person.marital_status", value, transform: "option_map", about: "subject_parent_1" } as never]);
const refused = fill("unknown"), written = fill("married");
ok("B81 fail: a fill with a marked value writes nothing and says why in words, naming the answer; never a code or a nearest choice", refused.boxes[0].result === "not on this form" && !(path in refused.values) && /no choice for "Unknown"/.test(refused.boxes[0].why ?? "") && /nothing is guessed/.test(refused.boxes[0].why ?? "") && /leave it blank or change the answer/.test(refused.boxes[0].why ?? "") && !/option_map|person\.marital/.test(refused.boxes[0].why ?? ""), refused.boxes[0]);
ok("B81 pass: a printed value on the same form field is written as the form's own code", written.boxes[0].result === "written" && written.values[path] === "5", written.boxes[0]);
const lines = notOnFormLines([{ fact: "person.marital_status", about_label: "Mother (Sample)", result: "not on this form", why: refused.boxes[0].why ?? null }, { fact: "person.sex", result: "by hand", why: "x" }], (f) => (f === "person.marital_status" ? "Marital status" : undefined));
ok("B81 (review M7): the officer's line names the answer and whose it is, apart from what is written by hand", lines.length === 1 && lines[0].label === "Marital status" && lines[0].person === "Mother (Sample)" && /leave it blank or change the answer/.test(lines[0].why), lines);
const mapOld = { map: { married: "5" }, unused: [], codes: ["5"] };
ok("B81 (review M7): a new edition carries the map only when the form prints the same choices; else nothing, so \"no option map yet\" blocks", carriedOptionMap(mapOld, box("Mother"), box("Father")) === mapOld && carriedOptionMap(mapOld, box("Mother"), box("Applicant")) === null && carriedOptionMap(null, box("Mother"), box("Father")) === null);
const asked = optionsOf(snapshot, "person.marital_status");
ok("B81 (review M7): a case's question keeps every answer and the list's own words: a mark takes nothing off it", asked?.length === list.length && asked?.find((o) => o.key === "unknown")?.label === "Unknown" && asked?.find((o) => o.key === "married")?.label === "Married", asked);
const probs = channelProblems(snapshot), marks = probs.filter((p) => /not on this form/.test(p.message));
ok("B81: the release check blocks nothing for a marked value and warns once per form and value, in the answer's words", !probs.some((p) => p.level === "error") && marks.length === 1 && marks[0].level === "warning" && /"Unknown" is marked not on this form on 2 form fields/.test(marks[0].message), probs);
const unmarked = { ...snapshot, field_maps: [{ form_number: "IMM 5645", form_edition: "IMM 5645 (01-2021)", channel: "PDF", entries: [{ ...entry, option_map: d.optionMap }] }] } as unknown as Snapshot;
ok("B81 fail: the same form field without the mark blocks release", channelProblems(unmarked).some((p) => p.level === "error" && /no code for "unknown"/.test(p.message)), channelProblems(unmarked));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
