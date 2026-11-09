// Case engine checks (runtime lane, R1a FIX, review Major 7): unit and property tests of engine/runtime/case.ts on a
// small synthetic release (no database, no server). Each rule has a passing and a failing case; properties run on many
// generated households, answers and values.
//   tsx studio/tests/runtime/check_case_engine.ts
import fc from "fast-check";
import { ageOn, caseView, HAS_CHILDREN, hasChildrenOf, checkValue, confirmation, judgingMaps, optionsOf, knownOf, shapeOf, type Answer, type GroupAnswer, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { changedFacts, changedGroups, factsOf, formCoverage, groupFacts, inputHash, readiness, type FormFact } from "../../engine/runtime/forms.ts";
import { render } from "../../engine/render.ts";
import { inSentence } from "../../contracts/runtime.ts";
import { recorder } from "./api.ts";
import { isCodeRange, namesNoValues, spellOutCodeRange } from "../../engine/options.ts";
import { withAdditions, type Addition } from "../../engine/runtime/added-forms.ts";
import { codeFor } from "../../../p5/transforms.ts";

const { ok, summary } = recorder();
/** A property over many generated cases: a failure prints the smallest counterexample instead of stopping the run. */
const prop = (name: string, p: fc.IProperty<never> | fc.IPropertyWithHooks<never>, numRuns: number) => { try { fc.assert(p as fc.IProperty<unknown>, { numRuns }); ok(name, true); } catch (e) { ok(name, false, String((e as Error).message).slice(0, 400)); } };
const TODAY = new Date("2026-10-23T12:00:00Z");

/** A tiny release: one form for each applicant with a name, a birth date, a yes/no with its details, a month-only date in
 *  a two-row group, money, a phone, a choice with a list, a choice coded in the map, and one placed question no form reads. */
const S = {
  contract_version: "combination-config/v0", mode: "release",
  combination: { key: "t", label: "Test", program: "p", pathway: null, participants: [{ role: "principal", min: 1, max: 1 }, { role: "spouse_or_partner", min: 0, max: 1 }, { role: "child", min: 0, max: 4 }], source_basis: "SOURCE_BACKED", basis_note: null },
  canonical_fields: [
    { id: "person.family_name", meaning: "Family name", value_type: "text" },
    { id: "person.date_of_birth", meaning: "Birth date", value_type: "date" },
    { id: "person.criminal_history", meaning: "Criminal history", value_type: "yes_no" },
    { id: "person.criminal_history_details", meaning: "Details", value_type: "text" },
    { id: "person.job_from", meaning: "Job from", value_type: "date" },
    { id: "case.funds", meaning: "Funds", value_type: "number" },
    { id: "person.phone", meaning: "Phone", value_type: "text" },
    { id: "person.marital_status", meaning: "Marital status", value_type: "code", answer_list: { key: "marital_status", values: [{ key: "married", label: "Married" }, { key: "single", label: "Single" }] } },
    { id: "case.visa_type", meaning: "Visa type", value_type: "code" },
    { id: "person.unused", meaning: "Asked by the section, read by no form", value_type: "text" },
    { id: "representative.membership_id", meaning: "Representative's licence", value_type: "text" },
  ],
  sections: [{ id: "personal", title: "Personal" }, { id: "jobs", title: "Jobs" }, { id: "visit", title: "Visit" }],
  placements: [
    { fact: "person.family_name", section_id: "personal", repeats: "per_person", collected_from: "verified_document" },
    { fact: "person.date_of_birth", section_id: "personal", repeats: "per_person", collected_from: "verified_document" },
    { fact: "person.criminal_history", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.criminal_history_details", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: "person.criminal_history", value: true }, condition_effect: "REQUIRE" },
    { fact: "person.job_from", section_id: "jobs", repeats: "per_row", collected_from: "client_questionnaire" },
    { fact: "case.funds", section_id: "visit", repeats: "once_per_case", collected_from: "client_questionnaire" },
    { fact: "person.phone", section_id: "personal", repeats: "per_person", collected_from: "profile_record", condition_effect: "OPTIONAL" },
    { fact: "person.marital_status", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "case.visa_type", section_id: "visit", repeats: "once_per_case", collected_from: "client_questionnaire" },
    { fact: "person.unused", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "representative.membership_id", section_id: "personal", repeats: "per_person", collected_from: "profile_record" },
  ],
  forms: [{ form_number: "F 1", title: "Form", who: "each_applicant", status: "always" }],
  field_maps: [{ form_number: "F 1", form_edition: "F 1 (01-2026)", entries: [
    { data_path: "a", outcome: "mapped", fact: "person.family_name", person: "form_subject", row: null, transform: "as_is (max 20 characters)" },
    { data_path: "a2", outcome: "mapped", fact: "person.family_name", person: "subject_spouse_or_partner", row: null, transform: "as_is" },
    { data_path: "b", outcome: "mapped", fact: "person.date_of_birth", person: "form_subject", row: null, transform: "date:YYYY-MM-DD" },
    { data_path: "c", outcome: "mapped", fact: "person.criminal_history", person: "form_subject", row: null, transform: "yes_no_code:Y/N" },
    { data_path: "d", outcome: "mapped", fact: "person.criminal_history_details", person: "form_subject", row: null, transform: "as_is (max 200 characters)" },
    { data_path: "e0", outcome: "mapped", fact: "person.job_from", person: "form_subject", row: 0, transform: "date_part:MM->date_part:YYYY" },
    { data_path: "e1", outcome: "mapped", fact: "person.job_from", person: "form_subject", row: 1, transform: "date_part:MM->date_part:YYYY" },
    { data_path: "f", outcome: "mapped", fact: "case.funds", person: "none", row: null, transform: "number_as_text (CAD, max 12 characters)" },
    { data_path: "g", outcome: "mapped", fact: "person.phone", person: "form_subject", row: null, transform: "phone_part:national_number" },
    { data_path: "h", outcome: "mapped", fact: "person.marital_status", person: "form_subject", row: null, transform: "code_list:t.marital" },
    { data_path: "i", outcome: "mapped", fact: "case.visa_type", person: "none", row: null, transform: "code_list:t.visa_type (VisitorVisa, Transit)" },
  ] }],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [],
} as unknown as Snapshot;

const household = (spouse: boolean, children: number): Participant[] => [
  { subjectId: "case", role: "case", label: "The application", applies: true },
  { subjectId: "p", role: "principal", label: "Applicant", applies: true },
  ...(spouse ? [{ subjectId: "s", role: "spouse_or_partner" as const, label: "Spouse", applies: true }] : []),
  ...Array.from({ length: children }, (_, i) => ({ subjectId: `c${i}`, role: "child" as const, label: `Child ${i + 1}`, applies: true })),
];
let n = 0;
const ans = (subjectId: string, field: string, value: unknown, over: Partial<Answer> = {}): Answer => ({ id: `a${++n}`, subjectId, field, rowKey: null, value, status: "DECLARED", channel: "questionnaire", actor: "user-P", at: TODAY.toISOString(), ...over });
const qs = (v: ReturnType<typeof caseView>) => v.sections.flatMap((x) => x.questions);

// ── asked once and needed only (P-62), for any household
prop("property: in any household each person is asked each fact once, and only facts a form reads (no unused question)", fc.property(fc.boolean(), fc.integer({ min: 0, max: 4 }), (spouse, kids) => {
  const v = qs(caseView(S, household(spouse, kids), [], [], "agent", TODAY));
  const keys = v.map((q) => `${q.subjectId}|${q.fact}`);
  return new Set(keys).size === keys.length && v.every((q) => q.fills.length > 0) && !v.some((q) => q.fact === "person.unused");
}), 60);
const people = household(true, 1);
let v = qs(caseView(S, people, [], [], "agent", TODAY));
ok("pass: the spouse's family name is one question that fills the principal's and the spouse's own form", (() => { const q = v.find((x) => x.subjectId === "s" && x.fact === "person.family_name")!; return q.fills.length === 2; })(), v.find((x) => x.subjectId === "s" && x.fact === "person.family_name")?.fills);
ok("fail: a question placed in a selected section that no form reads is not asked (counted as not asked)", caseView(S, people, [], [], "agent", TODAY).summary.not_asked > 0 && !v.some((q) => q.fact === "person.unused"));
const sqr = qs(caseView(S, people, [], [], "sqr", TODAY));
ok("pass and fail: the client's questionnaire has the client's fields, never documents' or the representative's facts", sqr.some((q) => q.fact === "person.phone") && !sqr.some((q) => q.fact === "person.family_name" || q.fact.startsWith("representative.")));

// ── REQUIRE rule: details required only after yes
const req = (answers: Answer[]) => qs(caseView(S, people, answers, [], "agent", TODAY)).find((q) => q.subjectId === "p" && q.fact === "person.criminal_history_details")!.required;
ok("pass and fail: details are optional after no and required after yes (rule read from the release)", req([ans("p", "person.criminal_history", false)]) === false && req([ans("p", "person.criminal_history", true)]) === true && req([]) === false);
const missing = (answers: Answer[]) => caseView(S, people, answers, [], "agent", TODAY).sections.find((x) => x.subjectId === "p" && x.section === "personal")!.missing;
ok("pass: after no, the details are not missing; fail: after yes, they are", !missing([ans("p", "person.criminal_history", false)]).includes("Details") && missing([ans("p", "person.criminal_history", true)]).includes("Details"));

ok("pass and fail: a question marked optional with no condition is optional; one with no effect is required", (() => { const q = qs(caseView(S, people, [], [], "agent", TODAY)); return q.find((x) => x.subjectId === "p" && x.fact === "person.phone")!.required === false && q.find((x) => x.subjectId === "p" && x.fact === "person.marital_status")!.required === true; })());

// ── confirmation (P-72 + founder question 1 default)
const who = (id: string) => people.find((p) => p.subjectId === id);
prop("property: confirmed = officer-verified, or the client's own typed answer for the principal, the application or a child under 18", fc.property(fc.constantFrom("p", "s", "c0", "case"), fc.constantFrom("questionnaire", "agent_view", "confirm_section"), fc.constantFrom("DECLARED", "VERIFIED"), fc.date({ min: new Date("1950-01-01"), max: new Date("2026-10-22") }), (subject, channel, status, birth) => {
  const field = subject === "case" ? "case.funds" : "person.criminal_history";
  const c = confirmation(S, ans(subject, field, true, { channel, status: status as Answer["status"] }), who(subject), birth.toISOString().slice(0, 10), TODAY);
  const age = (TODAY.getTime() - birth.getTime()) / (365.2425 * 864e5);
  const expected = status === "VERIFIED" || (channel === "questionnaire" && (subject === "p" || subject === "case" || (subject === "c0" && age < 17.99)));
  return age > 17.99 && age < 18.01 ? true : c.confirmed === expected;
}), 300);
ok("fail: a client's answer for a fact the officer takes from a document never counts as confirmed", !confirmation(S, ans("p", "person.family_name", "X"), who("p"), null, TODAY).confirmed);
ok("fail: the representative's facts are never the client's own", !confirmation(S, ans("p", "representative.membership_id", "X", { channel: "questionnaire" }), who("p"), null, TODAY).confirmed);
// ── R1c: questions follow the release's placement order within a section (not the labels' alphabetical order)
{
  const ordered = { ...S, placements: S.placements.map((p) => ({ ...p, order: p.fact === "person.marital_status" ? 1 : p.fact === "person.family_name" ? 3 : 2 })) } as unknown as Snapshot;
  const facts = (snap: Snapshot) => caseView(snap, people, [], [], "agent", TODAY).sections.find((x) => x.subjectId === "p" && x.section === "personal")!.questions.map((q) => q.fact);
  const got = facts(ordered);
  ok("R1c pass: a section asks its questions in the release's placement order", got[0] === "person.marital_status" && got[got.length - 1] === "person.family_name", got);
  ok("R1c fail-guard: without placement orders the order is the common renderer's (by label), so the order above comes from the placements", facts(S)[0] !== "person.marital_status", facts(S));
}
// ── R1c (Lead, early look): answers carry the field map's labels; checks the answers trigger land on their question
{
  const mapped = { ...S, field_maps: S.field_maps.map((m) => ({ ...m, entries: m.entries.map((e) => e.fact === "person.marital_status" ? { ...e, transform: "code_list:t.marital (Married person=01, Never married=02)", option_map: { map: { married: "01", single: "02" } } } : e) })) } as unknown as Snapshot;
  ok("R1c labels pass: a map's \"Label=code\" names the answer through its option map, and joined words read as words", JSON.stringify(optionsOf(mapped, "person.marital_status")?.map((o) => o.label)) === '["Married person","Never married"]' && optionsOf(S, "case.visa_type")?.[0].label === "Visitor visa" && optionsOf(S, "case.visa_type")?.[0].key === "VisitorVisa");
  ok("R1c labels fail-guard: without a map label the answer list's own label stays; the stored key never changes", optionsOf(S, "person.marital_status")?.[0].label === "Married" && optionsOf(mapped, "person.marital_status")?.[0].key === "married");
  const withCheck = { ...S, derived_fields: [{ id: "case.stay_days", calculation: "days_until", inputs: ["case.funds"], reference: "case.visa_type", executable: true }], checks: [{ id: "T_FUNDS", group: "section_check", applies_to: "case.funds", condition: { subjectKind: "CASE", op: "lte", field: "case.funds", value: 0 }, severity: "warn", message: "No money", illustrative: true }] } as unknown as Snapshot;
  const caseSubject = people.find((p) => p.role === "case")!.subjectId;
  const at = (v: unknown) => caseView(withCheck, people, v === undefined ? [] : [ans(caseSubject, "case.funds", v)], [], "sqr", TODAY).checks;
  const hit = at(0);
  ok("R1c checks pass: a triggered check is placed on its question and the application's section, in the client's view too", hit.length === 1 && hit[0].fact === "case.funds" && hit[0].section === "visit" && hit[0].subjectId === caseSubject, hit);
  ok("R1c checks fail-guard: a passing value or a missing answer triggers nothing", at(5000).length === 0 && at(undefined).length === 0, [at(5000), at(undefined)]);
}
// ── R1d (RT-13…RT-15): a copy reads every declared or confirmed answer (P-242, P-411; was confirmed only, P-72); its hash and what changed since
{
  const ppl = household(false, 0);
  const declared = ans("p", "person.family_name", "SAMPLE"), verified = ans("p", "person.family_name", "SAMPLE", { status: "VERIFIED", channel: "confirm_section" });
  const declaredCov = formCoverage(S, ppl, [declared], [], "F 1", "p", TODAY)!, confirmed = formCoverage(S, ppl, [verified], [], "F 1", "p", TODAY)!;
  const officerTyped = formCoverage(S, ppl, [{ ...declared, channel: "agent_view", actor: "user-O" }], [], "F 1", "p", TODAY)!, unanswered = formCoverage(S, ppl, [], [], "F 1", "p", TODAY)!;
  ok("RT-13 pass (P-242, P-411, row B150; was P-72's fail case): a declared answer not confirmed yet, the client's or the officer's, is among the facts a copy writes", [declaredCov, officerTyped].every((c) => c.facts.some((f) => f.fact === "person.family_name" && f.value === "SAMPLE" && f.about === "p") && !c.boxes.some((b) => b.fact === "person.family_name" && b.coverage === "answered on screen")), [declaredCov.facts, officerTyped.facts]);
  ok("RT-13 fail: with no answer, nothing is among the facts a copy writes", unanswered.facts.length === 0, unanswered.facts);
  ok("RT-13 pass: a confirmed answer is, with its form field and value", confirmed.facts.some((f) => f.fact === "person.family_name" && f.value === "SAMPLE" && f.about === "p"), confirmed.facts);
  const fact = fc.record({ box: fc.stringMatching(/^[a-z]{1,6}$/), fact: fc.constantFrom("person.a", "person.b", "case.c"), about: fc.constantFrom("p", "case"), row: fc.constantFrom(null, 0, 1), value: fc.oneof(fc.string(), fc.integer(), fc.boolean()) });
  const facts = fc.uniqueArray(fact, { selector: (f) => f.box, maxLength: 12 });
  prop("RT-15 property: the input hash does not depend on the order facts are read in, and changes with any value", fc.property(facts, fc.integer(), (fs, seed) => {
    const shuffled = [...fs].sort((a, b) => ((a.box.charCodeAt(0) * seed) % 7) - ((b.box.charCodeAt(0) * seed) % 7));
    if (inputHash(fs as FormFact[]) !== inputHash(shuffled as FormFact[])) return false;
    if (!fs.length) return true;
    const changed = fs.map((f, i) => (i === 0 ? { ...f, value: `${String(f.value)}x` } : f));
    return inputHash(changed as FormFact[]) !== inputHash(fs as FormFact[]);
  }), 200);
  prop("RT-15 property: nothing changed → no changed facts; one value changed, added or no longer confirmed → exactly that fact named", fc.property(facts, (fs) => {
    if (changedFacts(fs as FormFact[], fs as FormFact[]).length) return false;
    if (!fs.length) return true;
    const [first, ...rest] = fs as FormFact[];
    const others = new Set(rest.map((f) => f.fact));
    const named = (xs: string[]) => xs.includes(first.fact) && xs.every((x) => x === first.fact || others.has(x) === false || x === first.fact);
    return named(changedFacts(fs as FormFact[], [{ ...first, value: "other" }, ...rest])) && named(changedFacts(rest, fs as FormFact[])) && named(changedFacts(fs as FormFact[], rest));
  }), 200);
  ok("RT-15 fail-guard: factsOf keeps only confirmed facts with a field, in form-field order", JSON.stringify(factsOf([{ box: "b", caption: "", fact: "x", meaning: null, about: "p", about_label: "", row: null, coverage: "confirmed fact", detail: "", value: 1 }, { box: "a", caption: "", fact: "y", meaning: null, about: "p", about_label: "", row: null, coverage: "confirmed fact", detail: "", value: 2 }, { box: "c", caption: "", fact: "z", meaning: null, about: "p", about_label: "", row: null, coverage: "answered on screen", detail: "", value: 3 }]).map((f) => f.box)) === '["a","b"]');
  const view = caseView(S, ppl, [], [], "agent", TODAY);
  const need = readiness(view, "F 1", "p");
  ok("RT-14 fail: a form with a required fact unconfirmed is not ready to file, and names it (P-71)", !need.ready && need.missing.some((m) => m.fact === "person.family_name"), need.missing.map((m) => m.fact));
  const all = qs(view).filter((q) => q.required && !q.hidden && q.fills.some((f) => f.form === "F 1" && f.subject === "p")).map((q) => ans(q.subjectId, q.fact, q.options?.length ? q.options[0].key : q.value_type === "yes_no" ? false : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "1990-01" : "1990-01-01") : q.value_type === "number" ? "1000" : "X", { status: "VERIFIED", channel: "confirm_section" }));
  // Lead, break M3: a required repeating group with no entries blocks until "none apply" is answered and confirmed.
  const none = (over: Partial<GroupAnswer> = {}): GroupAnswer => ({ id: `g${++n}`, subjectId: "p", group: "jobs", noneApply: true, status: "DECLARED", channel: "questionnaire", actor: "user-P", at: TODAY.toISOString(), ...over });
  const noJobs = readiness(caseView(S, ppl, all, [], "agent", TODAY), "F 1", "p");
  ok("M3 fail: every other required fact confirmed, but the required group Jobs has no entries and no answer: not ready, named by the group", !noJobs.ready && noJobs.missing.length === 1 && noJobs.missing[0].fact === "group:jobs" && noJobs.missing[0].reason === "not answered" && /Entries in "Jobs": add them, or say none apply/.test(noJobs.missing[0].label), noJobs.missing);
  const byOfficer = readiness(caseView(S, ppl, all, [], "agent", TODAY, [none({ channel: "agent_view", actor: "user-O" })]), "F 1", "p");
  ok("M3 fail (P-72): \"none apply\" entered by the officer waits for Confirm section: not confirmed", !byOfficer.ready && byOfficer.missing[0]?.reason === "not confirmed", byOfficer.missing);
  const entriesApply = readiness(caseView(S, ppl, all, [], "agent", TODAY, [none({ noneApply: false, status: "VERIFIED" })]), "F 1", "p");
  ok("M3 fail: \"entries apply\" with no entry added still blocks (not answered)", !entriesApply.ready && entriesApply.missing[0]?.reason === "not answered", entriesApply.missing);
  const doneView = caseView(S, ppl, all, [], "agent", TODAY, [none({ status: "VERIFIED", channel: "confirm_section", actor: "user-O" })]);
  const done = readiness(doneView, "F 1", "p");
  ok("RT-14 pass: with every required fact confirmed (and none apply confirmed for Jobs) the form is ready to file; optional facts left empty do not block", done.ready, done.missing);
  const own = caseView(S, ppl, all, [], "agent", TODAY, [none()]);
  ok("M3 pass (P-72): the principal's own \"none apply\" on the questionnaire counts as confirmed, so the form is ready", readiness(own, "F 1", "p").ready && own.sections.find((x) => x.section === "jobs")?.group?.none_apply?.confirmed === true, own.sections.find((x) => x.section === "jobs")?.group);
  const jobsOf = (v: ReturnType<typeof caseView>) => v.sections.find((x) => x.section === "jobs")!;
  ok("review M1 fail: an empty required group is not done: the part lists it as missing until none apply is said",
    jobsOf(caseView(S, ppl, all, [], "agent", TODAY)).missing.includes('Entries in "Jobs": add them, or say none apply') && jobsOf(caseView(S, ppl, all, [], "agent", TODAY, [none({ noneApply: false })])).missing.length === 1);
  ok("review M1 pass: with none apply said, the part has nothing missing and counts it as an answer (confirmed when it is)", jobsOf(own).missing.length === 0 && jobsOf(own).answered === 1 && jobsOf(own).confirmed === 1);
  // break r1d-none-apply M1: a copy keeps the groups it read, so withdrawing a confirmed none apply makes it out of date.
  const gThen = groupFacts(doneView, "F 1", "p"), gNow = groupFacts(caseView(S, ppl, all, [], "agent", TODAY, [none({ noneApply: false, status: "VERIFIED" })]), "F 1", "p");
  ok("break M1 pass: the groups a form reads are kept with none apply (confirmed) and entries", gThen.length === 1 && gThen[0].none === true && gThen[0].entries === false && gNow[0].none === false);
  ok("break M1 fail: none apply withdrawn is a change, named by its group; the same groups are no change; a copy without a record compares nothing",
    JSON.stringify(changedGroups(gThen, gNow)) === JSON.stringify(['Entries in "Jobs" for Applicant']) && changedGroups(gThen, gThen).length === 0 && changedGroups(undefined, gNow).length === 0);
  const withRows = (keys: string[]) => keys.map((k, i): Row => ({ rowKey: k, subjectId: "p", group: "jobs", order: i }));
  const one = groupFacts(caseView(S, ppl, all, withRows(["00000000-0000-0000-0000-0000000000a1"]), "agent", TODAY), "F 1", "p");
  const two = groupFacts(caseView(S, ppl, all, withRows(["00000000-0000-0000-0000-0000000000a1", "00000000-0000-0000-0000-0000000000a2"]), "agent", TODAY), "F 1", "p");
  ok("PR 13 review fail: an entry added (even blank) after a copy is a change, named by its group; a copy without entry ids compares as before",
    JSON.stringify(changedGroups(one, two)) === JSON.stringify(['Entries in "Jobs" for Applicant']) && changedGroups(one, one).length === 0 && changedGroups(one.map(({ rows: _r, ...g }) => g), two).length === 0, { one: one[0]?.rows, two: two[0]?.rows });
  const readded = groupFacts(caseView(S, ppl, all, withRows(["00000000-0000-0000-0000-0000000000a3"]), "agent", TODAY), "F 1", "p");
  ok("PR 13 review (review m5): an entry removed is a change; an entry removed and added again (a new id) is a change",
    JSON.stringify(changedGroups(two, one)) === JSON.stringify(['Entries in "Jobs" for Applicant']) && changedGroups(one, readded).length === 1);
  ok("M3 pass: the view shows the group with its rows and its answer; a section without a group has none", doneView.sections.find((x) => x.section === "jobs")?.group?.rows === 0 && doneView.sections.find((x) => x.section === "jobs")?.group?.required === true && doneView.sections.find((x) => x.section === "personal")?.group === null);
  const answeredOnly = all.map((a) => ({ ...a, status: "DECLARED" as const, channel: "agent_view" }));
  const unconf = readiness(caseView(S, ppl, answeredOnly, [], "agent", TODAY), "F 1", "p");
  ok("RT-14 fail (review M2): facts answered but not confirmed still block filing, named \"not confirmed\"", !unconf.ready && unconf.missing.some((m) => m.reason === "not confirmed"), unconf.missing.map((m) => m.reason));
  const wrong = all.map((a) => (a.field === "person.date_of_birth" ? { ...a, value: "1991-02-31" } : a));
  const fix = readiness(caseView(S, ppl, wrong, [], "agent", TODAY), "F 1", "p");
  ok("RT-14 fail (break M2): a confirmed answer that fails its check (1991-02-31) blocks filing as \"needs a fix\"", !fix.ready && fix.missing.some((m) => m.fact === "person.date_of_birth" && m.reason === "needs a fix"), fix.missing);
  const twins = [...ppl, { subjectId: "c0", role: "child" as const, label: "Applicant", applies: true }];
  const tw = caseView(S, twins, all, [], "agent", TODAY, [none({ status: "VERIFIED", channel: "confirm_section", actor: "user-O" })]);
  ok("RT-14 pass (break M6): readiness matches the person by id, so another person with the same name never blocks", readiness(tw, "F 1", "p").ready && !readiness(tw, "F 1", "c0").ready);
  // QA-122 (P-71, P-72): an optional fact (person.phone) answered with a problem would be written wrong, so it blocks
  // filing and is never written, confirmed or not (it needs a fix either way); left empty, or answered validly and not
  // confirmed (never written), it does not block.
  const noneOk = [none({ status: "VERIFIED", channel: "confirm_section", actor: "user-O" })];
  const badPhone = ans("p", "person.phone", "12", { status: "VERIFIED", channel: "confirm_section" });
  const optFix = readiness(caseView(S, ppl, [...all, badPhone], [], "agent", TODAY, noneOk), "F 1", "p");
  ok("C7.6 QA-122 fail: an optional fact confirmed with a problem lists the form as not ready, \"needs a fix\"", !optFix.ready && optFix.missing.length === 1 && optFix.missing[0].fact === "person.phone" && optFix.missing[0].reason === "needs a fix", optFix.missing);
  const optDeclaredBad = readiness(caseView(S, ppl, [...all, { ...badPhone, status: "DECLARED" as const, channel: "agent_view" }], [], "agent", TODAY, noneOk), "F 1", "p");
  ok("C7.6 QA-122 fail: an optional fact answered with a problem and not yet confirmed also needs a fix", !optDeclaredBad.ready && optDeclaredBad.missing[0]?.reason === "needs a fix", optDeclaredBad.missing);
  const goodPhone = ans("p", "person.phone", { country_code: "91", number: "9876543210" }, { status: "VERIFIED", channel: "confirm_section" });
  const optDeclared = readiness(caseView(S, ppl, [...all, { ...goodPhone, status: "DECLARED" as const, channel: "agent_view" }], [], "agent", TODAY, noneOk), "F 1", "p");
  const optGood = readiness(caseView(S, ppl, [...all, goodPhone], [], "agent", TODAY, noneOk), "F 1", "p");
  ok("C7.6 QA-122 pass: an optional fact left empty, answered validly and not confirmed, or confirmed and valid does not block", done.ready && optDeclared.ready && optGood.ready, [optDeclared.missing, optGood.missing]);
  const covBad = formCoverage(S, ppl, [...all, badPhone], [], "F 1", "p", TODAY)!, covGood = formCoverage(S, ppl, [...all, goodPhone], [], "F 1", "p", TODAY)!;
  const gBox = covBad.boxes.find((b) => b.box === "g") as { coverage: string; fix?: string } | undefined;
  ok("C7.6 QA-122 fail: Generate never writes a confirmed value that fails its check: not among the facts, its form field says why", !covBad.facts.some((f) => f.fact === "person.phone") && gBox?.coverage === "answered on screen" && /answered with a problem, not written: Enter the country code/.test(gBox?.fix ?? ""), gBox);
  ok("C7.6 QA-122 pass: a confirmed valid value is written as before", covGood.facts.some((f) => f.box === "g" && f.fact === "person.phone"), covGood.facts.map((f) => f.box));
}
// ── PR 7 review D2: ageOn gives no age for a date that is not real or is in the future
ok("D2 pass: a real past birth date gives the age in whole years (birthday today counts)", ageOn("2015-02-28", TODAY) === 11 && ageOn("2008-10-23", TODAY) === 18 && ageOn("2008-10-24", TODAY) === 17 && ageOn("2024-02-29", TODAY) === 2 && ageOn("2026-10-23", TODAY) === 0);
ok("D2 fail: an impossible or future birth date gives no age", [ "2015-02-30", "2023-02-29", "2015-13-01", "2015-00-10", "2026-10-24", "2030-01-01"].every((d) => ageOn(d, TODAY) === null));
ok("D2 fail: a child with an impossible or future birth date does not get the principal's answer counted as confirmed", ["2015-02-30", "2030-01-01"].every((d) => { const c = confirmation(S, ans("c0", "person.criminal_history", true, { channel: "questionnaire" }), who("c0"), d, TODAY); return !c.confirmed && /not a real past date/.test(c.why); }));

// ── field checks
prop("property: a full date is accepted only if real (and a birth date not in the future); a month-only field refuses a full date", fc.property(fc.integer({ min: 1900, max: 2100 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 31 }), (y, m, d) => {
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const real = new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
  return (checkValue(S, "person.job_from", iso, TODAY).length === 0) === false && (checkValue(S, "person.criminal_history_details", iso, TODAY).length === 0) && ((checkValue(S, "person.date_of_birth", iso, TODAY).length === 0) === (real && iso <= "2026-10-23"));
}), 400);
ok("pass: a month-only field takes 2019-06", checkValue(S, "person.job_from", "2019-06").length === 0 && shapeOf(S, "person.job_from").datePrecision === "month");
prop("property: money takes whole dollars as digits only (surrounding spaces trimmed; no hex, exponents or cents)", fc.property(fc.string({ maxLength: 16 }), (x) => (checkValue(S, "case.funds", x).length === 0) === (/^\d+$/.test(x.trim()) && x.trim().length <= 12)), 400);
ok("fail: money refuses \" \", 0x10, 1e3, 1e21 and 30.5", [" ", "0x10", "1e3", 1e21, 30.5].every((x) => checkValue(S, "case.funds", x).length > 0) && checkValue(S, "case.funds", 3000).length === 0);
prop("property: text length is counted as people count characters (an emoji is one), against the form's limit", fc.property(fc.array(fc.constantFrom("a", "é", "😀", "中"), { maxLength: 30 }), (cs) => (checkValue(S, "person.family_name", cs.join("")).length === 0) === (cs.length > 0 && cs.length <= 20)), 300);
ok("pass and fail: a phone needs a country code and digits", checkValue(S, "person.phone", { country_code: "91", number: "98765 43210" }).length === 0 && checkValue(S, "person.phone", { country_code: "+91", number: "x" }).length === 2 && checkValue(S, "person.phone", { country_code: "91", number: "9876543210", nested: { a: 1 } }).length > 0);
ok("pass and fail: a choice takes a value from its answer list", checkValue(S, "person.marital_status", "married").length === 0 && checkValue(S, "person.marital_status", "golden").length > 0);
ok("pass and fail: a choice without a list takes the codes its map lists", checkValue(S, "case.visa_type", "Transit").length === 0 && checkValue(S, "case.visa_type", "I want a golden visa").length > 0);

// ── rows: stable order, removed rows never read
prop("property: rows get distinct places in a stable order, whatever order they are read in (ties by row id)", fc.property(fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 6 }), (orders) => {
  const rows: Row[] = orders.map((o, i) => ({ rowKey: `00000000-0000-0000-0000-00000000000${i}`, subjectId: "p", group: "jobs", order: o }));
  const answers = rows.map((r) => ans("p", "person.job_from", "2019-06", { rowKey: r.rowKey }));
  const a = knownOf(S, people, answers, rows, TODAY).known, b = knownOf(S, people, [...answers].reverse(), [...rows].reverse(), TODAY).known;
  const idx = [...a.keys()].filter((k) => k.startsWith("p|person.job_from|"));
  return idx.length === rows.length && JSON.stringify([...a.entries()].sort()) === JSON.stringify([...b.entries()].sort());
}), 200);
const removed = knownOf(S, people, [ans("p", "person.job_from", "2019-06", { rowKey: "gone" })], [], TODAY).known;
ok("fail: an answer of a removed row is never read", ![...removed.keys()].some((k) => k.includes("job_from")));

// C7.7 (G25): "has any children" is worked out from the people on the case (Yes only), never asked then.
{ const fam: Participant[] = [{ subjectId: "p", role: "principal", label: "P", applies: true }, { subjectId: "s", role: "spouse_or_partner", label: "S", applies: true }, { subjectId: "k", role: "child", label: "K", applies: true }];
  const known = knownOf(S, fam, [ans("p", HAS_CHILDREN, false)], [], TODAY).known;
  ok("C7.7 pass: with a child on the case, the principal and the spouse have children (Yes, confirmed), overriding an answer of No; the child has none derived", known.get(`p|${HAS_CHILDREN}`)?.value === true && known.get(`p|${HAS_CHILDREN}`)?.status === "confirmed" && known.get(`s|${HAS_CHILDREN}`)?.value === true && !hasChildrenOf(fam).has("k"));
  const alone = hasChildrenOf(fam.filter((x) => x.role !== "child"));
  ok("C7.7 fail: with no child on the case nothing is derived (a child may not be on this application): the answer stands", alone.size === 0 && knownOf(S, fam.slice(0, 1), [ans("p", HAS_CHILDREN, false)], [], TODAY).known.get(`p|${HAS_CHILDREN}`)?.value === false); }

// D4 (P-229 (3), #357 m3): a derived Yes over the client's own No is shown to the officer as a check, never silently.
{ const fam: Participant[] = [{ subjectId: "c0", role: "case", label: "The application", applies: true }, { subjectId: "p", role: "principal", label: "Client P", applies: true }, { subjectId: "k", role: "child", label: "K", applies: true }];
  const d4 = (people: Participant[], answers: Answer[], mode: "agent" | "sqr" = "agent") => caseView(S, people, answers, [], mode, TODAY).checks.filter((c) => c.id === `derived.${HAS_CHILDREN}.overrides_no`);
  const hit = d4(fam, [ans("p", HAS_CHILDREN, false)]);
  ok("D4 pass: the client answered No, a child is on the case → one officer check on that person, naming the clash in words", hit.length === 1 && hit[0].subjectId === "p" && hit[0].fact === HAS_CHILDREN && /^Client P's answer to "Whether the person has any children[^"]*" is No, but a child is on this case, so the forms say Yes\. Check with the client before filing\. This note stays while the child is on the case/.test(hit[0].message) && !/answered/.test(hit[0].message) && /Unconfirmed, waiting for the immigration expert/.test(hit[0].message), hit);
  ok("D4 fail: an answer of Yes, or no answer, gives no check (nothing is overridden)", d4(fam, [ans("p", HAS_CHILDREN, true)]).length === 0 && d4(fam, []).length === 0);
  ok("D4 fail: with no child on the case the No stands and no check fires", d4(fam.filter((x) => x.role !== "child"), [ans("p", HAS_CHILDREN, false)]).length === 0);
  ok("D4 fail: the client's own questionnaire never shows the check (staff only)", d4(fam, [ans("p", HAS_CHILDREN, false)], "sqr").length === 0);
  // Review minor 2 on 0d5589a4: the spouse or partner too, each on their own tab.
  const both = d4([...fam, { subjectId: "s", role: "spouse_or_partner", label: "Spouse S", applies: true }], [ans("p", HAS_CHILDREN, false), ans("s", HAS_CHILDREN, false)]);
  ok("D4 pass: a spouse who answered No gets their own check too; one per person", both.length === 2 && new Set(both.map((c) => c.subjectId)).size === 2 && both.some((c) => c.subjectId === "s" && c.message.startsWith("Spouse S's answer to")), both.map((c) => c.subjectId));
  ok("D4 pass: the check is a warning (\"warn\", as every other check), never one that blocks filing", hit[0]?.severity === "warn" && hit[0]?.group !== "section_check"); }

// ── QA-76: plain words for the officer: no plan or team word, and a role's name, never its key
const noList = { ...S, field_maps: S.field_maps.map((m) => ({ ...m, entries: m.entries.map((e) => (e.fact === "case.visa_type" ? { ...e, transform: "code_list:t.visa_type" } : e)) })) } as unknown as Snapshot;
const noteOf = (fact: string) => qs(caseView(noList, household(false, 0), [], [], "agent", TODAY)).find((q) => q.fact === fact)?.note;
ok("QA-76 pass: a choice with no fixed list tells the officer in plain words, true for a country typed with suggestions too", noteOf("case.visa_type") === "No fixed list for this answer yet: check it before confirming the section.", noteOf("case.visa_type"));
ok("QA-76 fail: a choice with its own list gets no note", noteOf("person.marital_status") == null, noteOf("person.marital_status"));
ok("QA-76 pass: a role label reads in a sentence as \"the application\" / \"the representative\" (\"About the representative\")", inSentence("The application") === "the application" && inSentence("The representative") === "the representative");
ok("QA-76 fail: a person's own name is never changed, even one starting with \"The\"", inSentence("The Smiths") === "The Smiths" && inSentence("Client A") === "Client A");
const withRep = { ...S, field_maps: S.field_maps.map((m) => ({ ...m, entries: [...m.entries, { data_path: "r", outcome: "mapped", fact: "representative.membership_id", person: "representative", row: null, transform: "as_is" }] })) } as unknown as Snapshot;
const repBox = (people: Parameters<typeof render>[1]) => render(withRep, people, new Map(), { today: TODAY }).coverage.flatMap((c) => c.boxes).find((b) => b.box === "r");
const solo = [{ id: "p", role: "principal" as const, label: "Applicant", applies: true }];
ok("QA-76 pass: with no representative on the case, a form field about the representative names \"The representative\"", repBox(solo)?.about_label === "The representative", repBox(solo)?.about_label);
ok("QA-76 fail-guard: with a representative on the case, it names that person, as before", repBox([...solo, { id: "r1", role: "representative" as const, label: "Rep A", applies: false }])?.about_label === "Rep A", repBox([...solo, { id: "r1", role: "representative" as const, label: "Rep A", applies: false }])?.about_label);

// ── QA-272: a mapping's code range is a note, not one choice; the form's own labels and codes replace it at apply
{
  const statusBox = { options_resolved: [["", ""], ["Citizen", "01"], ["Permanent resident", "02"], ["Visitor", "03"], ["Worker", "04"], ["Student", "05"], ["Other", "06"], ["Protected Person", "07"], ["Refugee Claimant", "08"], ["Foreign National", "09"]] as [string, string][] };
  const range = "code_list:imm5257.immigration_status (01..09)";
  const spelled = spellOutCodeRange(range, statusBox)!;
  const withTransform = (transform: string) => ({ ...S, field_maps: S.field_maps.map((m) => ({ ...m, entries: m.entries.map((e) => e.fact === "case.visa_type" ? { ...e, transform } : e) })) } as unknown as Snapshot);
  ok("QA-272 pass: a range plus the form's options becomes its labelled list", spelled === "code_list:imm5257.immigration_status (Citizen=01, Permanent resident=02, Visitor=03, Worker=04, Student=05, Other=06, Protected Person=07, Refugee Claimant=08, Foreign National=09)", spelled);
  ok("QA-272 pass: the question offers the form's nine words and accepts one", optionsOf(withTransform(spelled), "case.visa_type")?.map((o) => o.label).join("|") === "Citizen|Permanent resident|Visitor|Worker|Student|Other|Protected Person|Refugee Claimant|Foreign National" && checkValue(withTransform(spelled), "case.visa_type", "Citizen").length === 0, optionsOf(withTransform(spelled), "case.visa_type"));
  ok("QA-272 fail: a bare range stays open and is never offered as one choice", isCodeRange("01..09") && shapeOf(withTransform(range), "case.visa_type").choices === null && optionsOf(withTransform(range), "case.visa_type") === null, shapeOf(withTransform(range), "case.visa_type"));
  ok("QA-272 fail: a label with a comma, equals sign, semicolon or bracket leaves the transform unchanged", [",", "=", ";", "(", ")"].every((mark) => spellOutCodeRange(range, { options_resolved: [["", ""], [`Bad${mark}label`, "01"]] }) === range));
  ok("QA-272 fail: a range without the form's options, or a non-range note, stays unchanged", spellOutCodeRange(range, { options_resolved: [] }) === range && spellOutCodeRange("code_list:x.y (VisitorVisa, Transit)", statusBox) === "code_list:x.y (VisitorVisa, Transit)");
  const keyed = { ...withTransform(spelled), canonical_fields: S.canonical_fields.map((f) => f.id === "case.visa_type" ? { ...f, answer_list: { key: "status", values: [{ key: "citizen", label: "Citizen" }, { key: "other", label: "Other" }] } } : f) } as unknown as Snapshot;
  ok("QA-272 pass: an attached answer list keeps its lowercase keys, so rules such as is: other still hold", optionsOf(keyed, "case.visa_type")?.some((o) => o.key === "other" && o.label === "Other") === true && checkValue(keyed, "case.visa_type", "other").length === 0, optionsOf(keyed, "case.visa_type"));
  prop("QA-272 property: every offered word reads back to its code in the range; no code outside it appears", fc.property(fc.integer({ min: -20, max: 20 }), (code) => {
    const options = optionsOf(withTransform(spelled), "case.visa_type") ?? [];
    const wanted = String(code).padStart(2, "0");
    const hit = options.some((o) => codeFor(o.key, statusBox) === wanted);
    return code >= 1 && code <= 9 ? hit && options.length === 9 : !hit;
  }), 100);
}

// ── QA-355 (tech lead's ruling on #1446 (b)): a map note that names no values ("codes as listed in the inventory") is read
// as no list, like QA-272's ranges, so a form added to one filing never closes a fact the release's forms accept.
{
  const notes = ["codes as listed in the inventory", "3-digit codes as listed in this box", "codes as in this box's list", "codes as in inventory, e.g. CAN (Canada", "01-09", "00-08 as listed", "codes 01-19 as in inventory", "01..09",
    "3-digit codes exactly as listed in this form", "three-digit codes as listed, e.g. Canada 511", "codes as listed for this box", "Canadian codes as in inventory", "codes exactly as in options_resolved"];
  const lists = ["VisitorVisa, Transit", "Female, Male, Unknown, Unspecified", "English|French|Both|Neither", "01 Residence, 02 Cellular, 03 Business", "Common-law=1, Single=2", "09,03,04,05,01,02,00,06", "Same as in passport=1, Other=2", "Listed in this form=1, Not listed=2"];
  ok("QA-355 pass: notes that point at a list held elsewhere, or a range, name no values", notes.every(namesNoValues), notes.filter((n) => !namesNoValues(n)));
  ok("QA-355 fail: a list that names its values stays a list", lists.every((l) => !namesNoValues(l)), lists.filter(namesNoValues));
  const releaseOnly = noList;   // the release's own map reads the fact with no list (as the release's country facts do)
  const frozen = (transform: string) => ({ title: "Sample added form", edition: "Sample", official_file: null, form_sha256: null, inventory_file: null, fields: [],
    entries: [{ data_path: "form1.Sample.Country", outcome: "mapped", fact: "case.visa_type", transform }] });
  const addition = (transform: string): Addition => ({ id: "a1", filing: "f1", subject: "s1", form: "SAMPLE-ADDED", kind: "fills", frozen: frozen(transform), channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signed_by: null, added_by: "user-O", added_at: "2026-11-09T00:00:00.000Z", reason: null });
  const joined = withAdditions(releaseOnly as never, [addition("code_list:sample.country (codes as listed in the inventory)")]) as unknown as Snapshot;
  const value = "VisitorVisa";
  ok("QA-355 pass: an added form whose map says \"codes as listed in the inventory\" leaves the shared fact's choices and checks as the release has them", (joined.field_maps as unknown[]).length === (S.field_maps as unknown[]).length + 1
    && JSON.stringify(shapeOf(joined, "case.visa_type").choices) === JSON.stringify(shapeOf(releaseOnly, "case.visa_type").choices) && checkValue(joined, "case.visa_type", value).join() === checkValue(releaseOnly, "case.visa_type", value).join(),
    { joined: shapeOf(joined, "case.visa_type").choices, release: shapeOf(releaseOnly, "case.visa_type").choices, check: checkValue(joined, "case.visa_type", value) });
  // (a), the guard: an added form's real list and limits judge only its own copy; the release's lines stay as they were.
  const own = withAdditions(releaseOnly as never, [addition("code_list:sample.visa (VisitorVisa, Transit); max 7 char")]) as unknown as Snapshot;
  ok("QA-355 (a) pass: an added form's own list and limit never change what the release's forms accept (choices, length, the check)", shapeOf(own, "case.visa_type").choices === null
    && shapeOf(own, "case.visa_type").maxLength === shapeOf(releaseOnly, "case.visa_type").maxLength && checkValue(own, "case.visa_type", "Business").length === 0 && optionsOf(own, "case.visa_type") === optionsOf(releaseOnly, "case.visa_type"),
    { choices: shapeOf(own, "case.visa_type").choices, max: shapeOf(own, "case.visa_type").maxLength, check: checkValue(own, "case.visa_type", "Business") });
  ok("QA-355 (a) fail: the same value is judged on the added form's own copy by its list and limit", JSON.stringify(shapeOf(own, "case.visa_type", "SAMPLE-ADDED").choices) === JSON.stringify(["VisitorVisa", "Transit"])
    && shapeOf(own, "case.visa_type", "SAMPLE-ADDED").maxLength === 7 && /Choose one of: VisitorVisa, Transit/.test(checkValue(own, "case.visa_type", "Business", new Date(), "SAMPLE-ADDED").join(" ")) && checkValue(own, "case.visa_type", "Transit", new Date(), "SAMPLE-ADDED").length === 0,
    checkValue(own, "case.visa_type", "Business", new Date(), "SAMPLE-ADDED"));
  ok("QA-355 (a) pass: with no added form the snapshot judges itself; with one, the same object per form (format cache kept)", judgingMaps(releaseOnly) === releaseOnly && judgingMaps(own) === judgingMaps(own) && judgingMaps(own, "SAMPLE-ADDED") === judgingMaps(own, "SAMPLE-ADDED")
    && (judgingMaps(own).field_maps as unknown[]).length === (releaseOnly.field_maps as unknown[]).length && (judgingMaps(own, "SAMPLE-ADDED").field_maps as unknown[]).length === (releaseOnly.field_maps as unknown[]).length + 1);
  ok("QA-355 (b) fail (review m2): judged on the added form's own copy, its \"codes as listed in the inventory\" is no list either (the value is open, not refused)",
    shapeOf(joined, "case.visa_type", "SAMPLE-ADDED").choices === null && checkValue(joined, "case.visa_type", "Business", new Date(), "SAMPLE-ADDED").length === 0, shapeOf(joined, "case.visa_type", "SAMPLE-ADDED"));
  // Review m1: a copy's coverage (engine/runtime/forms.ts) judges the added form by its own list, and a release form by the release's.
  const mine = { ...addition("code_list:sample.visa (VisitorVisa, Transit)"), subject: "p" };
  const ownCopy = withAdditions(releaseOnly as never, [mine]) as unknown as Snapshot, onePpl = household(false, 0);
  const business = [ans("case", "case.visa_type", "Business", { status: "VERIFIED", channel: "confirm_section" })];
  const boxOf = (form: string) => formCoverage(ownCopy, onePpl, business, [], form, "p", TODAY)?.boxes.find((b) => b.fact === "case.visa_type");
  ok("QA-355 (a) fail (review m1): on the added form's copy a value outside its own list is a fix; on the release form's copy the same value is written",
    boxOf("SAMPLE-ADDED")?.coverage === "answered on screen" && /Choose one of: VisitorVisa, Transit/.test(String((boxOf("SAMPLE-ADDED") as { fix?: string } | undefined)?.fix)) && boxOf("F 1")?.coverage === "confirmed fact",
    { added: boxOf("SAMPLE-ADDED"), release: boxOf("F 1") });
  ok("QA-355 (a) pass (review m4): a release form's copy shares the case's view (one object), an added form has its own", judgingMaps(own, "F 1") === judgingMaps(own) && judgingMaps(own, "SAMPLE-ADDED") !== judgingMaps(own));

}

process.exitCode = summary() ? 1 : 0;
