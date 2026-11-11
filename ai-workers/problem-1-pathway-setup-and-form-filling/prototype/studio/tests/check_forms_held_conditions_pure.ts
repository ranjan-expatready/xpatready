// QA-237, QA-239 (Bake row 6, #1534; P-477); QA-402 (a form field the form writes only under its own gate): a library condition a combination cannot honour is held there (asked every
// time, a warning, engine/held-conditions.ts), never a refusal. But a held condition that is itself broken still refuses
// Submit by name: one that reads a withdrawn field (B83 M5, tech lead's reading on #1534 after the merge queue's failure of
// check_b83_undo_withdraw.ts, 11 Nov) or is not a valid condition. Pure: made-up snapshot, no server, no database; US$0.
//   tsx studio/tests/check_forms_held_conditions_pure.ts
import { conditionsToHold, withHeldConditions } from "../engine/held-conditions.ts";
import { validate, withdrawnFieldLines, type Problem } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const flag = { subjectKind: "PRINCIPAL", op: "eq", field: "person.flag", value: true };
const base: any = {
  contract_version: "combination-config/v0", combination: { key: "row", label: "Row", program: "P", pathway: "Individual", participants: [{ role: "principal", label: "Principal", min: 1, max: 1 }], source_basis: "ILLUSTRATIVE", basis_note: null },
  mode: "draft", canonical_fields: [{ id: "person.a", meaning: "Other name", value_type: "text" }, { id: "person.flag", meaning: "Has another name", value_type: "yes_no" }], sections: [{ id: "s", title: "S" }],
  placements: [
    { lineage: "pa", fact: "person.a", section_id: "s", collected_from: "client_questionnaire", repeats: "per_person", client_visible: true, condition: flag, condition_effect: "SHOW", condition_plain: "Other name is asked only when Has another name is yes" },
    { lineage: "pf", fact: "person.flag", section_id: "s", collected_from: "client_questionnaire", repeats: "per_person", client_visible: true, condition: null, condition_effect: null },
  ],
  // The form applies always and reads the answer whenever it applies: the condition cannot be honoured here.
  forms: [{ form_number: "F", title: "F", who: "principal_applicant", status: "always", condition: null }],
  field_maps: [{ form_number: "F", form_edition: "F-1", entries: [{ data_path: "b", outcome: "mapped", fact: "person.a", person: "form_subject", row: null, transform: "as_is", condition: null }, { data_path: "f", outcome: "mapped", fact: "person.flag", person: "form_subject", row: null, transform: "as_is", condition: null }] }],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {},
};
/** What engine/snapshot.ts builds for a held condition: no condition on the placement, the library's beside it. */
const held = (s: any, why = ["F reads its answer whenever the form applies"]): Snapshot => {
  const out = clone(s), p = out.placements.find((x: any) => x.lineage === "pa");
  out.held_conditions = [{ lineage: "pa", fact: "person.a", condition: p.condition, condition_effect: p.condition_effect, condition_plain: p.condition_plain, why }];
  Object.assign(p, { condition: null, condition_effect: null, condition_plain: null });
  return out;
};
const lib = (s: any) => s.canonical_fields.map((f: any) => ({ key: f.id, valueType: f.value_type }));
const errs = (s: any): Problem[] => validate(s, lib(s), []).filter((p) => p.level === "error");
const warns = (s: any): Problem[] => validate(s, lib(s), []).filter((p) => p.level === "warning");

// ---------------------------------------------------------------- the hold itself (reviewer m3: the reasons, by kind)
const h = conditionsToHold(base);
ok("QA-237 pass: a form that reads the answer whenever it applies holds the condition, saying which form", h.length === 1 && h[0].lineage === "pa" && /^F reads its answer whenever the form applies$/.test(h[0].why[0]), h);
const same = clone(base); same.forms[0] = { ...same.forms[0], status: "conditional", condition: flag };
ok("QA-237 fail (control): a form that applies under the same condition holds nothing", conditionsToHold(same).length === 0, conditionsToHold(same));
const rule = clone(same); rule.rules = [{ id: "r1", when: { subjectKind: "PRINCIPAL", op: "eq", field: "person.a", value: "x" }, then: "R" }];
ok("QA-237 pass: a rule that reads the answer outside the condition holds it, saying which", conditionsToHold(rule).some((x) => x.why.includes("rule r1 reads its answer")), conditionsToHold(rule));
const nobody = clone(same); nobody.placements = nobody.placements.filter((p: any) => p.fact !== "person.flag");
ok("QA-237 pass: a deciding question nobody asks here holds it, by the question's words", conditionsToHold(nobody).some((x) => x.why.some((w) => /depends on "Has another name"/.test(w))), conditionsToHold(nobody));
const undefinedField = clone(same); undefinedField.placements = undefinedField.placements.filter((p: any) => p.fact !== "person.flag"); undefinedField.canonical_fields = undefinedField.canonical_fields.filter((f: any) => f.id !== "person.flag");
ok("QA-237 fail: a deciding fact the library does not define is not a reason to hold; its own error stays", conditionsToHold(undefinedField).length === 0 && errs(undefinedField).some((e) => /Unreachable question/.test(e.message)), errs(undefinedField).map((e) => e.message));

// ---------------------------------------------------------------- held: a warning, never a refusal
const H = held(base);
ok("QA-237 pass: held, the draft has no Hiding error", !errs(H).some((e) => /Hiding a value/.test(e.message)), errs(H).map((e) => e.message));
ok("QA-237 pass: held, one warning in words, with the way to use it", warns(H).filter((w) => /^Condition not used on this combination: the question "Other name" is asked every time here, because F reads its answer whenever the form applies\. To use the condition here, make the form or its form fields apply under the same condition/.test(w.message)).length === 1, warns(H).map((w) => w.message));
ok("QA-237 fail (control): the same condition not held refuses with the rule's words (validate is not relaxed)", errs(base).some((e) => /^Hiding a value a form reads/.test(e.message)));
ok("withHeldConditions puts the library's condition back for the doors", withHeldConditions(H).placements.find((p: any) => p.lineage === "pa")?.condition?.field === "person.flag");

// ---------------------------------------------------------------- a held condition that is broken still refuses (B83 M5)
const gone = new Map([["person.flag", "Has another name"]]);
const named = withdrawnFieldLines(H, gone).filter((p) => p.level === "error" && p.label === `The condition of the question "Other name"`);
ok("B83 M5 pass (#1534 merge queue): a held question's condition that reads a withdrawn field still refuses Submit by name, its name beside it", named.length === 1 && named[0].message.includes(`"Has another name"`) && !/person\./.test(named[0].message), withdrawnFieldLines(H, gone));
ok("B83 M5 fail (control): with nothing withdrawn, the held condition names nothing", withdrawnFieldLines(H, new Map()).length === 0);
const invalid = held(base); invalid.held_conditions![0].condition = { subjectKind: "PRINCIPAL", op: "eq", field: "person.not_in_library", value: true };
ok("pass: a held condition that is not a valid condition (a field the library lacks) still refuses, as it does when not held", errs(invalid).some((e) => e.item === "person.a" && /^Condition /.test(e.message)), errs(invalid).map((e) => e.message));
ok("fail (control): a valid held condition has no condition error", !errs(H).some((e) => /^Condition /.test(e.message)), errs(H).map((e) => e.message));

// Re-review on fb4e565ec (Block): two questions whose conditions decide each other, both held, must still be named as a loop.
const loop = clone(base);
loop.placements[1] = { ...loop.placements[1], condition: { subjectKind: "PRINCIPAL", op: "eq", field: "person.a", value: "x" }, condition_effect: "SHOW", condition_plain: "Has another name is asked only when Other name is x" };
const bothHeld = (() => { const out = clone(loop); out.held_conditions = out.placements.map((p: any) => ({ lineage: p.lineage, fact: p.fact, condition: p.condition, condition_effect: p.condition_effect, condition_plain: p.condition_plain, why: ["F reads its answer whenever the form applies"] })); for (const p of out.placements) Object.assign(p, { condition: null, condition_effect: null, condition_plain: null }); return out as Snapshot; })();
ok("fail (control): the loop not held is an error", errs(loop).some((e) => /in a loop/.test(e.message)), errs(loop).map((e) => e.message));
ok("pass: two held conditions that decide each other are still refused as a loop, by their words", errs(bothHeld).some((e) => /^Questions decide each other in a loop: "(Other name|Has another name)"/.test(e.message)), errs(bothHeld).map((e) => e.message));

// ---------------------------------------------------------------- QA-402: a form field the form writes only under a gate
// IMM 5257's "b) Other" (a question asked once per application) is written only when the purpose is Other: the form's own
// gate (B107, cited data). A question shown under that same condition is never hidden while the form reads it, so the
// condition is in force here; under another condition it is held, saying the form's own words, and the way out does not
// send the author to "Form fields that read this answer" (that door never touches a gate).
const purpose = { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "Other" };
const caseLevel: any = clone(base);
caseLevel.canonical_fields = [{ id: "case.purpose", meaning: "Visit purpose", value_type: "text" }, { id: "case.purpose_other", meaning: "Visit purpose other", value_type: "text" }];
caseLevel.placements = [
  { lineage: "po", fact: "case.purpose_other", section_id: "s", collected_from: "client_questionnaire", repeats: "once_per_case", client_visible: true, condition: purpose, condition_effect: "SHOW", condition_plain: "Visit purpose other is asked only when Visit purpose is Other" },
  { lineage: "pp", fact: "case.purpose", section_id: "s", collected_from: "client_questionnaire", repeats: "once_per_case", client_visible: true, condition: null, condition_effect: null },
];
const gateRule = (gate: unknown) => ({ gate, words: "the purpose of the visit is Other", cite: "Made up for a pure check (Sample, not an IRCC value)." });
caseLevel.field_maps = [{ form_number: "F", form_edition: "F-1", entries: [
  { data_path: "other", outcome: "mapped", fact: "case.purpose_other", person: "none", row: null, transform: "as_is", condition: "Only when purpose = Other", condition_rule: gateRule({ op: "eq", field: "case.purpose", value: "Other" }) },
  { data_path: "purpose", outcome: "mapped", fact: "case.purpose", person: "none", row: null, transform: "as_is", condition: null }] }];
ok("QA-402 pass: a case-level question shown only when the form's own gate holds is not held: the condition is in force", conditionsToHold(caseLevel).length === 0, conditionsToHold(caseLevel));
ok("QA-402 pass: and the draft has neither a Hiding error nor a held warning for it", !errs(caseLevel).some((e) => /Hiding a value/.test(e.message)) && !warns(caseLevel).some((w) => /^Condition not used/.test(w.message)), validate(caseLevel, lib(caseLevel), []).map((e) => e.message));
const noGate = clone(caseLevel); delete noGate.field_maps[0].entries[0].condition_rule;
ok("QA-402 fail (control): the same form field without its gate reads the answer whenever the form applies, so the condition is held", conditionsToHold(noGate).length === 1 && /^F reads its answer whenever the form applies$/.test(conditionsToHold(noGate)[0].why[0]), conditionsToHold(noGate));
const otherGate = clone(caseLevel); otherGate.placements[0].condition = { ...purpose, value: "Business" };
const og = conditionsToHold(otherGate);
ok("QA-402 fail: a condition other than the form's own gate is held, the reason in the form's own words (never \"whenever the form applies\")", og.length === 1 && og[0].why[0] === "F reads its answer only when the purpose of the visit is Other (the form's own condition)", og);
const OG: Snapshot = (() => { const out = clone(otherGate), p = out.placements[0]; out.held_conditions = [{ lineage: "po", fact: "case.purpose_other", condition: p.condition, condition_effect: p.condition_effect, condition_plain: p.condition_plain, why: og[0]?.why ?? [] }]; Object.assign(p, { condition: null, condition_effect: null, condition_plain: null }); return out; })();
const ogWarn = warns(OG).filter((w) => /^Condition not used on this combination/.test(w.message));
ok("QA-402 pass: its warning says how to use it here (the form's own condition) and does not send the author to \"Form fields that read this answer\"", ogWarn.length === 1 && /make it the same as the form's own condition/.test(ogWarn[0].message) && !/Form fields that read this answer/.test(ogWarn[0].message), ogWarn.map((w) => w.message));
const ogErr = errs(otherGate).filter((e) => /^Hiding a value a form reads/.test(e.message));
ok("QA-402 pass: not held (another snapshot), the refusal also says the form's own condition", ogErr.length === 1 && /F reads it only when the purpose of the visit is Other \(the form's own condition\)/.test(ogErr[0].message), ogErr.map((e) => e.message));
const hide = clone(caseLevel); hide.placements[0].condition_effect = "HIDE";
ok("QA-402 fail (control): a HIDE condition is never compatible with a gate (the form writes it exactly when it would be hidden)", conditionsToHold(hide).length === 1, conditionsToHold(hide));

process.exitCode = summary() ? 1 : 0; // B160: a FAIL line fails the suite
