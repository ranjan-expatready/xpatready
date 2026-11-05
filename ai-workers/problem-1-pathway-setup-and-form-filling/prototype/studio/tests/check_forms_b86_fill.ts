// B86 (QA-237, C4.11; concept BR-1b, BR-4, BR-5, BR-5b): a form field that holds its question's condition, in a form the
// rule can read: the rule stays as strict, and the form really obeys it. Pure: no server, no database, no AI; US$0. Made-up
// form and answers (Sample).
//   tsx studio/tests/check_forms_b86_fill.ts
import { formCoverage, factsOf, inputHash } from "../engine/runtime/forms.ts";
import { answerSheet } from "../engine/runtime/answer-sheet.ts";
import { mandatoryOpen } from "../engine/runtime/mandatory.ts";
import { formValues } from "../engine/form-values.ts";
import { plainWords, ruleInForce } from "../engine/form-field-condition.ts";
import { render, type BoxRow } from "../engine/render.ts";
import { askedInOrder } from "../engine/validate.ts";
import { diff } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { Answer, Participant } from "../engine/runtime/case.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const GATE = "person.has_used_other_name", NAME = "person.other_family_name", FORM = "Sample form 1", OTHER = "Sample form 2";
const SHOW = { subjectKind: "person", op: "eq", field: GATE, value: true };
const ANOTHER = { subjectKind: "person", op: "eq", field: "person.has_national_id", value: true };
const WORDS = "Only when the indicator = Y";
const nameBox = (rule?: unknown) => ({ data_path: "form1[0].Name[0]", caption: "Family name", outcome: "mapped", person: "form_subject", row: null, fact: NAME, transform: "as_is", condition: WORDS, origin: "AI_PROPOSAL", ...(rule ? { condition_rule: rule } : {}) });
const yesNoBox = { data_path: "form1[0].Indicator[0]", caption: "Have you used another name?", outcome: "mapped", person: "form_subject", row: null, fact: GATE, transform: `derived:any(${NAME}) recorded -> yes_no_code:Y/N`, condition: null, origin: "AI_PROPOSAL" };
const snap = (o: { rule?: unknown; effect?: string | null; condition?: unknown; second?: unknown } = {}) => ({
  combination: { combination_key: "sample" }, canonical_fields: [{ id: GATE, meaning: "Has used another name", value_type: "yes_no" }, { id: NAME, meaning: "Other family name", value_type: "text" }, { id: "person.has_national_id", meaning: "Has a national identity document", value_type: "yes_no" }],
  sections: [{ id: "s1", title: "About you", section_scope: "per_person" }], section_titles: [],
  placements: [
    { lineage: GATE, fact: GATE, section_id: "s1", order: 1, repeats: "none", collected_from: "client_questionnaire", required: true },
    { lineage: NAME, fact: NAME, section_id: "s1", order: 2, repeats: "none", collected_from: "client_questionnaire", required: true, condition: o.condition === undefined ? SHOW : o.condition, condition_effect: o.effect === undefined ? "SHOW" : o.effect, condition_plain: "Has used another name is Yes" },
    { lineage: "person.has_national_id", fact: "person.has_national_id", section_id: "s1", order: 3, repeats: "none", collected_from: "client_questionnaire", required: true },
  ],
  forms: [{ form_number: FORM, title: FORM, form_kind: "data_form", who: "each_applicant", status: "always" }, ...(o.second !== undefined ? [{ form_number: OTHER, title: OTHER, form_kind: "data_form", who: "each_applicant", status: "always" }] : [])],
  field_maps: [{ form_number: FORM, form_edition: `${FORM} (01-2000)`, official_file: "sample1.pdf", entries: [nameBox(o.rule), yesNoBox] }, ...(o.second !== undefined ? [{ form_number: OTHER, form_edition: `${OTHER} (01-2000)`, official_file: "sample2.pdf", entries: [{ ...nameBox(o.second || undefined), data_path: "form2[0].Name[0]" }] }] : [])],
  rules: [], document_requirements: [], document_types: [], derived_fields: [], checks: [],
}) as unknown as Snapshot;
const people: Participant[] = [{ subjectId: "p1", role: "principal" as Participant["role"], label: "Client A", applies: true }, { subjectId: "c1", role: "case", label: "The application", applies: true }];
const say = (field: string, value: unknown): Answer => ({ id: `${field}-${String(value)}`, subjectId: "p1", field, rowKey: null, value, status: "VERIFIED", channel: "questionnaire", actor: "user-P", at: "2026-11-05T00:00:00Z" });
const cover = (s: Snapshot, answers: Answer[], form = FORM) => formCoverage(s, people, answers, [], form, "p1", new Date("2026-11-05T00:00:00Z"))!;
const box = (c: ReturnType<typeof cover>, path: string) => c.boxes.find((b) => b.box === path) as BoxRow & { fix?: string };
const hides = (s: Snapshot) => askedInOrder(s).filter((p) => /^Hiding a value a form reads/.test(p.message)).map((p) => p.message);
const NAMEBOX = "form1[0].Name[0]", YESNO = "form1[0].Indicator[0]";
const inv = { fields: [{ data_path: NAMEBOX, required: true, ui: "text" }, { data_path: YESNO, required: true, ui: "radio" }] } as never;
const valuesOf = (s: Snapshot, c: ReturnType<typeof cover>) => formValues(s, s.field_maps[0] as never, inv, c.boxes as BoxRow[]);

// ---------------------------------------------------------------- BR-5: the form obeys
const on = snap({ rule: SHOW });
let c = cover(on, [say(GATE, false), say(NAME, "OLD NAME")]);
ok("BR-5 fail guard: Yes, a typed name, then No: the name is not written (not needed, the value dropped)", box(c, NAMEBOX).coverage === "not needed" && box(c, NAMEBOX).value === undefined, box(c, NAMEBOX));
ok("BR-5 words: it says why, in the deciding question's words, with no field code", /^Not needed: "Has used another name" is No/.test(box(c, NAMEBOX).detail) && !/person\./.test(box(c, NAMEBOX).detail), box(c, NAMEBOX).detail);
ok("BR-5: its fact is not among what the copy writes", !factsOf(c.boxes as BoxRow[]).some((f) => f.fact === NAME));
c = cover(on, [say(GATE, true), say(NAME, "OLD NAME")]);
ok("BR-5 pass: with Yes the box is filled", box(c, NAMEBOX).coverage === "confirmed fact" && box(c, NAMEBOX).value === "OLD NAME", box(c, NAMEBOX).coverage);
const hashYes = inputHash(c.facts);
const backNo = cover(on, [say(GATE, false), say(NAME, "OLD NAME")]);
ok("BR-5: changing the deciding answer changes what a copy read (a copy goes out of date)", inputHash(backNo.facts) !== hashYes);
c = cover(on, [say(NAME, "OLD NAME")]);
ok("BR-5 words: unanswered is not called No; it waits for the deciding question", box(c, NAMEBOX).coverage === "not needed" && /^Waiting for "Has used another name"/.test(box(c, NAMEBOX).detail), box(c, NAMEBOX).detail);
c = cover(on, [say(GATE, false)]);
ok("Done when 5: with No and nothing typed the box stays empty", box(c, NAMEBOX).coverage === "not needed");

// ---------------------------------------------------------------- BR-1b: in force only while it matches its question
for (const [what, s] of [["a different condition on the box", snap({ rule: ANOTHER })], ["the question has no condition (a rejected card, or removed)", snap({ rule: SHOW, condition: null, effect: null })], ["the question's condition is REQUIRE", snap({ rule: SHOW, effect: "REQUIRE" })], ["the question's condition is HIDE", snap({ rule: SHOW, effect: "HIDE" })]] as [string, Snapshot][]) {
  const x = cover(s, [say(GATE, false), say(NAME, "OLD NAME")]);
  ok(`BR-1b: ${what}: the rule is not in force, so the box behaves as on main and blanks nothing`, box(x, NAMEBOX).coverage === "confirmed fact" && box(x, NAMEBOX).value === "OLD NAME", box(x, NAMEBOX).coverage);
}

// ---------------------------------------------------------------- BR-5b: the Yes/No box does not get stuck
c = cover(on, [say(GATE, false), say(NAME, "OLD NAME")]);
let v = valuesOf(on, c);
ok("BR-5b fail guard: Yes, a typed name, then No: the Yes/No writes N, with no instruction nobody can carry out", v.values[YESNO] === "N" && !box(c, YESNO).fix, { written: v.values[YESNO], fix: box(c, YESNO).fix });
ok("Done when 5: the name is never written with that No", !v.values[NAMEBOX], v.values);
c = cover(on, [say(GATE, true), say(NAME, "OLD NAME")]);
v = valuesOf(on, c);
ok("Done when 5: with Yes the form writes Y and the name", v.values[YESNO] === "Y" && v.values[NAMEBOX] === "OLD NAME", v.values);
const reads = snap({ rule: SHOW }); (reads.field_maps[0] as unknown as { entries: unknown[] }).entries[1] = { ...yesNoBox, fact: NAME };
c = cover(reads, [say(GATE, false), say(NAME, "OLD NAME")]);
ok("review m2: a worked-out Yes/No reading the hidden answer itself is never written Y from it", /answered No, but/.test(box(c, YESNO).fix ?? "") && !valuesOf(reads, c).values[YESNO], { fix: box(c, YESNO).fix, written: valuesOf(reads, c).values[YESNO] });
const req = snap({ effect: "REQUIRE" });
c = cover(req, [say(GATE, false), say(NAME, "OLD NAME")]);
ok("QA-165 unchanged: under REQUIRE (the question stays visible) a No with a name recorded is still never written", /answered No, but/.test(box(c, YESNO).fix ?? ""), box(c, YESNO).fix);

// ---------------------------------------------------------------- review m3: a question placed twice
const twice = snap({ rule: SHOW }); (twice.placements as unknown[]).unshift({ lineage: `${NAME}:2`, fact: NAME, section_id: "s1", order: 0, repeats: "none", collected_from: "client_questionnaire", required: true });
ok("review m3: with an unconditioned twin first, the rule is still in force, as the guard reads it", ruleInForce(twice.placements as never, NAME, SHOW) && hides(twice).length === 0);
const worded = (w: string) => plainWords(w, [{ data_path: "form1[0].natIDIndicator[0]", outcome: "mapped", fact: GATE }], () => "Has used another name", NAME);
ok("no field codes: a form field's own name reads as its question", worded("Only when natIDIndicator = Y; max 20 characters").text === 'Only when "Has used another name" = Y; max 20 characters');
ok("no field codes: other codes read \"another form field\", plain words stay", worded("Only when PCRIndicator = Y and representative.is_compensated = yes and uncompensated[0] = 4 and RadioButtonList[0] = 1, purpose Other (03), 3a, IDs").text === "Only when another form field = Y and another form field = yes and another form field = 4 and another form field = 1, purpose Other (03), 3a, IDs", worded("Only when PCRIndicator = Y and representative.is_compensated = yes and uncompensated[0] = 4 and RadioButtonList[0] = 1, purpose Other (03), 3a, IDs").text);
// ---------------------------------------------------------------- the readers that must not list it
const noVal = cover(on, [say(GATE, false), say(NAME, "OLD NAME")]);
const nv = valuesOf(on, noVal);
const open = mandatoryOpen(inv, on.field_maps[0].entries as never, nv.boxes as never, nv.values);
ok("BR-5: a box that is not needed is not on the mandatory list", !open.some((o) => o.box === NAMEBOX), open);
const unanswered = cover(on, [say(GATE, false)]);
const nu = valuesOf(on, unanswered);
ok("BR-5: nor with nothing stored", !mandatoryOpen(inv, on.field_maps[0].entries as never, nu.boxes as never, nu.values).some((o) => o.box === NAMEBOX));
const sheet = answerSheet({ Name: "Names" }, noVal.boxes as BoxRow[], () => "questionnaire", new Map(), new Map());
ok("BR-5: the portal's answer sheet does not list it as waiting", !sheet.sections.some((x) => x.waiting.some((w) => w.fact === NAME) || x.answers.some((a) => a.fact === NAME)), sheet.sections);

// ---------------------------------------------------------------- render is left alone (the question list, Preview, fills)
const asPeople = [{ id: "p1", role: "principal", label: "Client A", applies: true }] as never;
const rows = (s: Snapshot) => JSON.stringify(render(s, asPeople, new Map(), { today: new Date("2026-11-05T00:00:00Z") }).coverage.flatMap((x) => x.boxes.map((b) => [b.box, b.fact, b.coverage, b.detail])));
ok("M2: the preview's coverage is the same with and without a rule, so the question list cannot move", rows(snap({ rule: SHOW })) === rows(snap()));

// ---------------------------------------------------------------- BR-4: the rule stays as strict (Done when 2)
ok("Done when 2 fail: not confirmed: refused, in today's words", hides(snap()).length === 1 && /Make the form or its form fields apply under the same condition, or remove the question's condition\.$/.test(hides(snap())[0]), hides(snap()));
ok("Done when 2 fail: text on a box is never read, however close its words", hides(snap({ rule: undefined })).length === 1);
ok("Done when 2 fail: a different condition on the box: refused", hides(snap({ rule: ANOTHER })).length === 1);
ok("Done when 2 fail: a second form whose box is not confirmed: refused, naming that form", hides(snap({ rule: SHOW, second: null })).length === 1 && hides(snap({ rule: SHOW, second: null }))[0].includes(OTHER));
ok("Done when 2 fail: a HIDE condition with the same rule on the box: refused", hides(snap({ rule: SHOW, effect: "HIDE" })).length === 1);
ok("Done when 1 pass: the same condition on the box: not refused", hides(snap({ rule: SHOW })).length === 0, hides(snap({ rule: SHOW })));
ok("Done when 1 pass: on both forms: not refused", hides(snap({ rule: SHOW, second: SHOW })).length === 0);

// ---------------------------------------------------------------- BR-8: a rule change is listed at release
const changes = diff(snap(), snap({ rule: SHOW })).filter((x) => x.kind === "Form field condition");
ok("BR-8: a rule change is listed in the release's change summary, in words", changes.length === 1 && changes[0].change === "added" && changes[0].label.includes("Family name") && changes[0].needs_sme, changes);
ok("BR-8: nothing is listed when no rule changed", diff(snap({ rule: SHOW }), snap({ rule: SHOW })).length === 0, diff(snap({ rule: SHOW }), snap({ rule: SHOW })));
ok("BR-8: an un-confirmed box is listed as removed", diff(snap({ rule: SHOW }), snap()).some((x) => x.kind === "Form field condition" && x.change === "removed"));

process.exit(summary() ? 1 : 0);
