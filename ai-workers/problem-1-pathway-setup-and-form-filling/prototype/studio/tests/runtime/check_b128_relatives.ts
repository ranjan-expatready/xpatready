// B128 (QA-153) engine checks, no database, no server (STANDARDS §7: property-based tests when the engine changes; Devin on
// #1256). On a small synthetic release with a family form for adults that writes each applicant's mother, father and
// siblings: which relatives caseView asks, for whom, under which key and name; how parentWord names a parent from box
// paths; and that factChanges reads a parent's pending answer by the parent's own key. Each rule has a passing and a
// failing case; properties run on many generated households, dates of birth and box paths. Sample data, US$0.
//   tsx studio/tests/runtime/check_b128_relatives.ts
import fc from "fast-check";
import { caseView, type Answer, type Participant } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { ASKED_RELATIONS, parentWord, relativeKey, relativeLabel, relativeOf, SUBJECT_OR_RELATIVE } from "../../engine/runtime/relatives.ts";
import { factChanges, type ChangeWords } from "../../engine/runtime/out-of-date.ts";
import { familyPeople, previewFamily } from "../../engine/runtime/preview.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const prop = (name: string, p: fc.IProperty<never>, numRuns: number) => { try { fc.assert(p as fc.IProperty<unknown>, { numRuns }); ok(name, true); } catch (e) { ok(name, false, String((e as Error).message).slice(0, 500)); } };
const TODAY = new Date("2026-11-07T12:00:00Z");

/** A family form "F 2" for applicants of 18 or more: the subject's name and birth date, each parent's name and birth date
 *  (boxes named Mother and Father, as IMM 5645's are), and two siblings' names (a list, not asked yet). */
const S = {
  contract_version: "combination-config/v0", mode: "release",
  combination: { key: "t", label: "Test", program: "p", pathway: null, participants: [{ role: "principal", min: 1, max: 1 }, { role: "spouse_or_partner", min: 0, max: 1 }, { role: "child", min: 0, max: 4 }] },
  canonical_fields: [
    { id: "person.family_name", meaning: "Family name", value_type: "text" },
    { id: "person.date_of_birth", meaning: "Birth date", value_type: "date" },
  ],
  sections: [{ id: "personal", title: "Personal" }],
  placements: [
    { fact: "person.family_name", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.date_of_birth", section_id: "personal", repeats: "per_person", collected_from: "client_questionnaire" },
  ],
  forms: [{ form_number: "F 2", title: "Family", who: "each_applicant", status: "always", min_age: 18 }],
  field_maps: [{ form_number: "F 2", form_edition: "F 2 (01-2026)", official_file: "f2.pdf", entries: [
    { data_path: "F2[0].A[0].Applicant[0].Name[0]", outcome: "mapped", fact: "person.family_name", person: "form_subject", row: null, transform: "as_is" },
    { data_path: "F2[0].A[0].Applicant[0].DOB[0]", outcome: "mapped", fact: "person.date_of_birth", person: "form_subject", row: null, transform: "date:YYYY-MM-DD" },
    { data_path: "F2[0].A[0].Mother[0].MotherName[0]", outcome: "mapped", fact: "person.family_name", person: "subject_parent_1", row: null, transform: "as_is" },
    { data_path: "F2[0].A[0].Mother[0].MotherDOB[0]", outcome: "mapped", fact: "person.date_of_birth", person: "subject_parent_1", row: null, transform: "date:YYYY-MM-DD" },
    { data_path: "F2[0].A[0].Father[0].FatherName[0]", outcome: "mapped", fact: "person.family_name", person: "subject_parent_2", row: null, transform: "as_is" },
    { data_path: "F2[0].A[0].Father[0].FatherDOB[0]", outcome: "mapped", fact: "person.date_of_birth", person: "subject_parent_2", row: null, transform: "date:YYYY-MM-DD" },
    { data_path: "F2[0].C[0].Sibling[0].Name[0]", outcome: "mapped", fact: "person.family_name", person: "subject_sibling", row: 0, transform: "as_is" },
    { data_path: "F2[0].C[0].Sibling[1].Name[0]", outcome: "mapped", fact: "person.family_name", person: "subject_sibling", row: 1, transform: "as_is" },
  ] }],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [],
} as unknown as Snapshot;

type Age = "adult" | "minor" | "unknown";
const birth = (a: Age) => (a === "adult" ? "1980-05-01" : a === "minor" ? "2016-05-01" : null);
const household = (ages: Age[]): { people: Participant[]; answers: Answer[] } => {
  const roles = ["principal", "spouse_or_partner", "child", "child", "child"] as const;
  const people: Participant[] = [{ subjectId: "case", role: "case", label: "The application", applies: true },
    ...ages.map((_, i) => ({ subjectId: `p${i}`, role: roles[i], label: `Sample Person ${i}`, applies: true }))];
  const answers = ages.flatMap((a, i) => (birth(a) ? [{ id: `dob${i}`, subjectId: `p${i}`, field: "person.date_of_birth", rowKey: null, value: birth(a), status: "VERIFIED" as const, channel: "confirm_section", actor: "user-O", at: TODAY.toISOString() }] : []));
  return { people, answers };
};
const sections = (ages: Age[]) => { const h = household(ages); return caseView(S, h.people, h.answers, [], "agent", TODAY).sections; };

// ── The keys, pure.
prop("property: a person's key and each asked relation round-trip through relativeKey and relativeOf; the confirm pattern takes them", fc.property(fc.uuid(), fc.constantFrom(...ASKED_RELATIONS), (id, rel) => {
  const k = relativeKey(id, rel), r = relativeOf(k);
  return r?.owner === id && r.relation === rel && SUBJECT_OR_RELATIVE.test(k) && SUBJECT_OR_RELATIVE.test(id) && relativeOf(id) === null;
}), 200);
prop("property (fail): any other relation, or more parts, is no asked relative and the confirm pattern refuses it", fc.property(fc.uuid(), fc.stringMatching(/^[a-z_0-9]{1,12}$/).filter((x) => !(ASKED_RELATIONS as readonly string[]).includes(x)), (id, rel) =>
  relativeOf(`${id}/${rel}`) === null && !SUBJECT_OR_RELATIVE.test(`${id}/${rel}`) && relativeOf(`${id}/parent_1/${rel}`) === null), 200);

// ── parentWord: named by the boxes, never a constant. Noise holds no "m" or "f", so it can never spell a parent.
const noise = fc.stringMatching(/^[a-eg-ln-zA-EG-LN-Z0-9_]{0,8}$/);
const word = (w: "Mother" | "Father") => fc.constantFrom(w, w.toLowerCase(), w.toUpperCase(), `${w.toLowerCase()}s`);
prop("property: the boxes name the mother when some say mother and none father, the father the other way, else no one", fc.property(fc.boolean(), fc.boolean(), fc.array(noise, { minLength: 1, maxLength: 4 }), word("Mother"), word("Father"), (m, f, parts, mw, fw) => {
  const paths = [parts.join("."), ...(m ? [`${parts[0]}[0].${mw}[0].X`] : []), ...(f ? [`${fw}GivenName`] : [])];
  const want = m && !f ? "mother" : f && !m ? "father" : null;
  return parentWord(paths) === want && relativeLabel("Sample Person", "parent_1", paths) === `Sample Person's ${want ?? "first parent"}`;
}), 300);
ok("fail: a parent word inside another word (Grandmother, StepFather) names no parent", parentWord(["X[0].Grandmother[0]", "Y.StepFather[0]"]) === null);

// ── caseView: a parent is asked exactly when the form applies to that person, under the parent's key, by the boxes' name.
const ageArb = fc.array(fc.constantFrom<Age>("adult", "minor", "unknown"), { minLength: 1, maxLength: 5 });
prop("property: for any household, each adult's two parents are asked (both facts, filling that adult's family form), named mother and father", fc.property(ageArb, (ages) => {
  const secs = sections(ages);
  return ages.every((a, i) => a !== "adult" || ASKED_RELATIONS.every((rel) => {
    const mine = secs.filter((x) => x.subjectId === `p${i}/${rel}`), qs = mine.flatMap((x) => x.questions);
    const facts = new Set(qs.map((q) => q.fact));
    return facts.has("person.family_name") && facts.has("person.date_of_birth") && qs.every((q) => q.fills.length > 0 && q.fills.every((x) => x.form === "F 2" && x.subject === `p${i}`))
      && mine.every((x) => x.about_label === `Sample Person ${i}'s ${rel === "parent_1" ? "mother" : "father"}`);
  }));
}), 150);
prop("property (fail): no parent is asked for a minor or a person whose age is unknown, no sibling for anyone, none for the application", fc.property(ageArb, (ages) => {
  const keys = new Set(sections(ages).map((x) => x.subjectId));
  return [...keys].every((k) => { if (!k.includes("/")) return true; const r = relativeOf(k); const i = r ? Number(r.owner.slice(1)) : -1; return !!r && r.owner !== "case" && ages[i] === "adult"; });
}), 150);
prop("property: a parent's answer stays the parent's: it never shows on the person's own question, and the person's never on the parent's", fc.property(ageArb.filter((a) => a[0] === "adult"), fc.stringMatching(/^[A-Z]{2,10}$/), (ages, name) => {
  const h = household(ages);
  const answers = [...h.answers, { id: "m1", subjectId: "p0/parent_1", field: "person.family_name", rowKey: null, value: name, status: "VERIFIED" as const, channel: "confirm_section", actor: "user-O", at: TODAY.toISOString() }];
  const qs = caseView(S, h.people, answers, [], "agent", TODAY).sections.flatMap((x) => x.questions);
  const own = qs.find((q) => q.subjectId === "p0" && q.fact === "person.family_name"), mother = qs.find((q) => q.subjectId === "p0/parent_1" && q.fact === "person.family_name");
  return own?.answer === null && mother?.answer?.value === name;
}), 100);

// ── factChanges (Devin on #1256): a parent's newest saved value is read by the parent's own key.
const saved = new Map<string, unknown>([["p0/parent_1|person.family_name", "JANE"]]);
const words = (store: Map<string, unknown>): ChangeWords => ({ label: (f) => f, person: (a) => (a === "p0" ? "Sample Person 0" : a), at: (a, f) => (store.has(`${a}|${f}`) ? "2026-11-07T10:00:00Z" : null), saved: (a, f) => store.get(`${a}|${f}`) ?? null });
const then = [{ fact: "person.family_name", about: "p0/parent_1", row: null, value: "JANE" }];
ok("pass: the same parent value typed again (not confirmed yet) is no change to a copy", factChanges(then, [], words(saved)).length === 0, factChanges(then, [], words(saved)));
const ch = factChanges(then, [], words(new Map([["p0/parent_1|person.family_name", "JANET"]])));
ok("fail: a new parent value (not confirmed yet) is a change to that value, not confirmed, named for that person's parent", ch.length === 1 && ch[0].now === "JANET" && ch[0].confirmed === false && ch[0].relation === "parent_1" && ch[0].person === "Sample Person 0's parent 1" && ch[0].at !== null, ch);
const none = factChanges(then, [], words(new Map()));
ok("fail: a parent value no longer read and not saved again is a change to no answer", none.length === 1 && none[0].now === null && none[0].confirmed === true, none);

// ── The studio's Preview (merge batch #1280, C4.1 on the six): its parts, chips and passport skips are per person of its
// Sample family, so its client questionnaire holds no relative's section; a case's view of the same family asks them.
const pv = previewFamily(S, "", "principal", {}, TODAY);
const pvKeys = [...new Set(pv.questionnaire.sections.map((x) => x.subjectId))];
const fam = familyPeople((S.combination as { participants: never[] }).participants, pv.family as never);
const caseKeys = new Set(caseView(S, fam, pv.questionnaire.sections.length ? [{ id: "d", subjectId: "principal", field: "person.date_of_birth", rowKey: null, value: "1988-01-01", status: "VERIFIED", channel: "confirm_section", actor: "user-O", at: TODAY.toISOString() }] : [], [], "sqr", TODAY).sections.map((x) => x.subjectId));
ok("pass (C4.1): the Preview's client questionnaire has the Sample family's people and no relative's section", pvKeys.includes("principal") && !pvKeys.some((k) => k.includes("/")), pvKeys);
ok("fail (control): a case's client view of the same family asks the principal's parents on their own keys", caseKeys.has("principal/parent_1") && caseKeys.has("principal/parent_2"), [...caseKeys]);
ok("pass: the Preview's checks name no relative either", !pv.questionnaire.checks.some((c) => c.subjectId.includes("/")));

process.exitCode = summary() ? 1 : 0;
