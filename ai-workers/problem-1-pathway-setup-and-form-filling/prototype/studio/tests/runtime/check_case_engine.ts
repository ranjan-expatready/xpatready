// Case engine checks (runtime lane, R1a FIX, review Major 7): unit and property tests of engine/runtime/case.ts on a
// small synthetic release (no database, no server). Each rule has a passing and a failing case; properties run on many
// generated households, answers and values.
//   tsx studio/tests/runtime/check_case_engine.ts
import fc from "fast-check";
import { ageOn, caseView, checkValue, confirmation, optionsOf, knownOf, shapeOf, type Answer, type GroupAnswer, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { changedFacts, changedGroups, factsOf, formCoverage, groupFacts, inputHash, readiness, type FormFact } from "../../engine/runtime/forms.ts";
import { recorder } from "./api.ts";

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
// ── R1d (RT-13…RT-15): a copy reads confirmed facts only; its hash and what changed since
{
  const ppl = household(false, 0);
  const declared = ans("p", "person.family_name", "SAMPLE"), verified = ans("p", "person.family_name", "SAMPLE", { status: "VERIFIED", channel: "confirm_section" });
  const unconfirmed = formCoverage(S, ppl, [declared], [], "F 1", "p", TODAY)!, confirmed = formCoverage(S, ppl, [verified], [], "F 1", "p", TODAY)!;
  ok("RT-13 fail: an answer not confirmed is not among the facts a copy writes (P-72)", unconfirmed.facts.length === 0 && unconfirmed.boxes.some((b) => b.fact === "person.family_name" && b.coverage === "answered on screen"), unconfirmed.facts);
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
  ok("C7.6 QA-122 fail: Generate never writes a confirmed value that fails its check: not among the facts, its form field says why", !covBad.facts.some((f) => f.fact === "person.phone") && gBox?.coverage === "answered on screen" && /confirmed with a problem, not written: Enter the country code/.test(gBox?.fix ?? ""), gBox);
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

process.exitCode = summary() ? 1 : 0;
