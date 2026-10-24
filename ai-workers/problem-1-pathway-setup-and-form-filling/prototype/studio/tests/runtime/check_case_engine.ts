// Case engine checks (runtime lane, R1a FIX, review Major 7): unit and property tests of engine/runtime/case.ts on a
// small synthetic release (no database, no server). Each rule has a passing and a failing case; properties run on many
// generated households, answers and values.
//   tsx studio/tests/runtime/check_case_engine.ts
import fc from "fast-check";
import { ageOn, caseView, checkValue, confirmation, knownOf, shapeOf, type Answer, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
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
