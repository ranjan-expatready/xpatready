// C7.3 checks (M3-E, runtime lane): engine/runtime/answer-sheet.ts lays out an Online form item's answer sheet in the PDF
// twin's sections from the person's form boxes: every declared or confirmed answer (P-242, P-411; was confirmed only,
// P-72), each with its person, source, mark, "to confirm" and the text to copy; an answer that needs a fix (or none) is
// listed as waited for; "Entered in the portal" ticks go out of date when an answer they
// froze changes (P-65). Each rule has a passing and a failing case. No database, no server, no model call (US$0).
//   tsx studio/tests/check_vv_answer_sheet.ts
import { answerSheet, copyText, OTHER_PART, partsInFormOrder, sectionHash, sheetOf, sheetWords, sourceOf, waitsOf, type FormPart, type Sheet } from "../engine/runtime/answer-sheet.ts";
import { readiness } from "../engine/runtime/forms.ts";
import type { QuestionnaireView, Readiness } from "../contracts/runtime.ts";
import type { BoxRow } from "../engine/render.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const SECTIONS = { SectionA: "Applicant, spouse and parents", SectionB: "Children", SectionC: "Declaration and signature" };
const box = (path: string, fact: string | null, about: string, value: unknown, coverage: BoxRow["coverage"] = "confirmed fact", row: number | null = null): BoxRow =>
  ({ box: `IMM_5707[0].page1[0].${path}`, caption: fact ?? "", fact, meaning: null, about, about_label: about === "p" ? "Client A" : "Spouse A", row, coverage, detail: "", value });
const boxes = [
  box("SectionA[0].Applicant[0].FamilyName[0]", "person.family_name", "p", "SAMPLE"),
  box("SectionA[0].Applicant[0].FamilyName2[0]", "person.family_name", "p", "SAMPLE"),
  box("SectionA[0].Applicant[0].DOB[0]", "person.date_of_birth", "p", "1986-04-13"),
  box("SectionA[0].Spouse[0].FamilyName[0]", "person.family_name", "s", "SPOUSE"),
  box("SectionB[0].Child[0].Name[0]", "person.given_names", "s", null, "answered on screen"),
  box("Other[0].Note[0]", "person.note", "p", "x"),
  box("SectionC[0].Sign[0]", null, "p", null, "unresolved"),
  box("SectionB[0].Spouse[0].Name[0]", "person.given_names", "", null, "unresolved"),
  box("SectionA[0].Father[0].Name[0]", "person.family_name", "p/parent_1", null, "unresolved"),
  box("SectionA[0].Mother[0].Name[0]", "person.family_name", "p/parent_2", null, "unresolved"),
  box("SectionA[0].Mother[0].DOB[0]", "person.date_of_birth", "p/parent_2", "1950-02-02"),
];
const origin = (subject: string) => (subject === "p" ? "questionnaire" : "agent_view");
const labels = new Map([["person.family_name", "Family name"]]);

{
  const s = answerSheet(SECTIONS, boxes, origin, labels, new Map());
  ok("C7.3: the sheet follows the PDF twin's sections, in order (Section A, B, C)", s.order_basis === "pdf_twin" && s.sections.map((x) => x.title).join("|") === Object.values(SECTIONS).join("|"));
  const a = s.sections[0].answers;
  ok("C7.3: Section A lists each confirmed answer once per person, with its label, person and source", a.filter((x) => !x.subject.includes("/")).length === 3 && a.filter((x) => x.fact === "person.family_name" && !x.subject.includes("/")).length === 2 && a.find((x) => x.subject === "p" && x.fact === "person.family_name")?.source === "Client" && a.find((x) => x.subject === "s")?.source === "Case officer" && a[0].label === "Family name");
  ok("C7.3 (review N1): each parent is their own line: two parents waiting give two entries, neither the applicant's", s.sections[0].waiting.filter((w) => w.fact === "person.family_name").map((w) => w.subject).sort().join() === "p/parent_1,p/parent_2");
  ok("C7.3 (review N1, fail): a parent's confirmed answer is never dropped as a copy of the applicant's", a.some((x) => x.subject === "p/parent_2" && x.fact === "person.date_of_birth") && a.some((x) => x.subject === "p" && x.fact === "person.date_of_birth"));
  ok("C7.3 (fail): an answer that needs a fix (\"answered on screen\" since P-411) is never shown as a value, only as waited for; a box about nobody on the case is not waited for", s.sections[1].answers.length === 0 && s.sections[1].waiting.length === 1 && s.sections[1].waiting[0]?.subject === "s");
  ok("C7.3 (fail): a form field outside the twin's sections, and a box with no fact, are left out", !s.sections.some((x) => x.answers.some((y) => y.fact === "person.note")) && s.sections[2].answers.length === 0 && s.sections[2].waiting.length === 0);
}
// B150 review M2 (P-411): each answer carries its mark and whether it is still to confirm, from the case view's answer.
{
  const marks: Record<string, { mark: "declared" | "by_principal" | "by_staff" | "confirmed"; confirmed: boolean; why: string }> = {
    "p|person.family_name": { mark: "declared", confirmed: true, why: "Declared: the client's own answer; it fills the forms now" },
    "p|person.date_of_birth": { mark: "by_staff", confirmed: false, why: "Declared: entered by staff; it fills the forms now and waits for the officer's \"Confirm section\"" },
    "s|person.family_name": { mark: "by_principal", confirmed: false, why: "Answered by the principal for Spouse A: declared, it fills Spouse A's forms now" },
  };
  const s = answerSheet(SECTIONS, boxes, origin, labels, new Map(), (about, fact) => marks[`${about}|${fact}`]);
  const a = s.sections[0].answers, at = (subject: string, fact: string) => a.find((x) => x.subject === subject && x.fact === fact);
  ok("C7.3 pass (P-411 (2), B150): an answer entered by staff and not confirmed is on the sheet, marked \"by_staff\" and to confirm", at("p", "person.date_of_birth")?.mark === "by_staff" && at("p", "person.date_of_birth")?.to_confirm === true && /entered by staff/.test(at("p", "person.date_of_birth")?.why ?? ""), at("p", "person.date_of_birth"));
  ok("C7.3 pass (P-411 (1), B150): the principal's answer for the adult spouse is on the sheet, marked \"answered by the principal for\" the spouse, to confirm", at("s", "person.family_name")?.mark === "by_principal" && at("s", "person.family_name")?.to_confirm === true && /^Answered by the principal for Spouse A/.test(at("s", "person.family_name")?.why ?? ""), at("s", "person.family_name"));
  ok("C7.3 fail (B150): the client's own answer is not \"to confirm\"; an answer the case view does not hold (a parent's) has no mark", at("p", "person.family_name")?.to_confirm === false && at("p", "person.family_name")?.mark === "declared" && at("p/parent_2", "person.date_of_birth")?.mark === null && at("p/parent_2", "person.date_of_birth")?.to_confirm === false);
  ok("C7.3 (B150): a mark never changes the section's fingerprint (an entered tick is about the values)", s.sections[0].version === answerSheet(SECTIONS, boxes, origin, labels, new Map()).sections[0].version);
}
// The text to copy, as the portal takes it.
ok("C7.3: a date copies as YYYY-MM-DD, yes/no as Yes or No", copyText("1986-04-13") === "1986-04-13" && copyText(true) === "Yes" && copyText(false) === "No");
ok("C7.3: an address copies on one line, a phone with its country code", copyText({ street_name: "Sample Road", city: "Sample City", country: "Canada" }) === "Sample Road, Sample City, Canada" && copyText({ country_code: "1", number: "5550100" }) === "+1 5550100");
ok("C7.3 (fail): nothing to copy is an empty text, never \"null\"", copyText(null) === "" && copyText(undefined) === "");
ok("C7.3: the source says Document for a document read, Client for the questionnaire, else Case officer", sourceOf("document_read") === "Document" && sourceOf("questionnaire") === "Client" && sourceOf("agent_view") === "Case officer" && sourceOf(null) === "Case officer");

// "Entered in the portal": current while the answers it froze are unchanged; out of date after a change (P-65).
{
  const first = answerSheet(SECTIONS, boxes, origin, labels, new Map());
  const tick = new Map([["SectionA", { at: "2026-11-01T10:00:00Z", by: "user-O", hash: sectionHash(first.sections[0].answers) }]]);
  const same = answerSheet(SECTIONS, boxes, origin, labels, tick);
  ok("C7.3: a ticked section shows who and when, and is current while nothing changed", same.sections[0].entered?.by === "user-O" && same.sections[0].out_of_date === false && same.sections[1].entered === null);
  const changed = answerSheet(SECTIONS, boxes.map((b) => (b.about === "p" && b.fact === "person.family_name" ? { ...b, value: "SAMPLEDX" } : b)), origin, labels, tick);
  ok("C7.3 (fail): a changed answer marks the entered section out of date and shows the new value", changed.sections[0].out_of_date === true && changed.sections[0].answers.some((x) => x.value === "SAMPLEDX"));
  ok("C7.3: the fingerprint does not depend on the order of the answers", sectionHash([...first.sections[0].answers].reverse()) === sectionHash(first.sections[0].answers));
}

// The form's own parts from the release's configuration (P-319): no table of form numbers; the form's order; a field no
// part groups goes in "Other questions"; a part with nothing to type for this person is left out.
{
  const F = "IMM_5707[0].page1[0].";
  const parts: FormPart[] = [
    { key: "children", title: "Section B - children", named: true, fieldKeys: [`${F}SectionB[0].Child[0].Name[0]`] },
    { key: "applicant", title: "Applicant", named: true, fieldKeys: [`${F}SectionA[0].Applicant[0].FamilyName[0]`, `${F}SectionA[0].Applicant[0].FamilyName2[0]`, `${F}SectionA[0].Applicant[0].DOB[0]`] },
    { key: "part_1", title: "Unnamed section 1 of the form", named: false, fieldKeys: [`${F}SectionA[0].Spouse[0].FamilyName[0]`] },
    { key: "sign", title: "Section C - certification", named: true, fieldKeys: [`${F}SectionC[0].Sign[0]`] },
    { key: "applicant_again", title: "Applicant (proposed again)", named: true, fieldKeys: [`${F}SectionA[0].Applicant[0].FamilyName[0]`] },
  ];
  const order = boxes.map((b) => b.box);
  const inOrder = partsInFormOrder(parts, order);
  ok("C7.3: the form's own parts go in the order the form prints them (their first form field), whatever order they were proposed in", inOrder.map((p) => p.key).join() === "applicant,part_1,children,sign", inOrder.map((p) => p.key));
  ok("C7.3 (fail): a part proposed twice for the same form fields is shown once (the first kept)", !inOrder.some((p) => p.key === "applicant_again"));
  const s = sheetOf({ basis: "form_parts", parts: inOrder }, boxes, origin, labels, new Map());
  ok("C7.3: a sheet from the form's own parts says so and titles each section with the configuration's name", s.order_basis === "form_parts" && s.sections[0].title === "Applicant" && /configuration/.test(s.order_note));
  ok("C7.3: each answer goes in the part that groups its form field", s.sections[0].answers.every((a) => a.subject === "p") && s.sections.find((x) => x.key === "part_1")?.answers.some((a) => a.subject === "s") === true);
  ok("C7.3: a part not named yet is shown with its placeholder and marked not named (B78), never dropped", s.sections.find((x) => x.key === "part_1")?.named === false && s.sections[0].named === undefined);
  const other = s.sections.find((x) => x.key === OTHER_PART);
  ok("C7.3 (fail): a form field no part groups is never dropped: it goes last, in \"Other questions\"", s.sections.at(-1)?.key === OTHER_PART && !!other?.answers.some((a) => a.fact === "person.note") && !!other?.waiting.some((w) => w.subject === "p/parent_1"));
  ok("C7.3 (fail): a part with nothing to type for this person (a signature block) is not a step on the sheet", !s.sections.some((x) => x.key === "sign"));
  const tick = new Map([["sign", { at: "2026-11-01T10:00:00Z", by: "user-O", hash: sectionHash([]) }]]);
  ok("C7.3: a ticked part stays on the sheet with its tick even with nothing to type", sheetOf({ basis: "form_parts", parts: inOrder }, boxes, origin, labels, tick).sections.find((x) => x.key === "sign")?.entered?.by === "user-O");
  const clash = sheetOf({ basis: "form_parts", parts: [{ key: OTHER_PART, title: "A part keyed like Other", named: true, fieldKeys: [`${F}SectionA[0].Applicant[0].FamilyName[0]`] }] }, boxes, origin, labels, new Map());
  ok("C7.3 (review m3, fail): \"Other questions\" never takes a part's key, even one keyed like it", new Set(clash.sections.map((x) => x.key)).size === clash.sections.length && clash.sections.some((x) => x.title === "Other questions" && x.key !== OTHER_PART));
  const dup = partsInFormOrder([{ key: "part_old", title: "Unnamed section 1", named: false, fieldKeys: [`${F}SectionA[0].Applicant[0].FamilyName[0]`] }, { key: "applicant", title: "Applicant", named: true, fieldKeys: [`${F}SectionA[0].Applicant[0].FamilyName[0]`] }], order);
  ok("C7.3 (review m5, fail): of two parts with the same first form field, the named one is kept, never the one still waiting", dup.length === 1 && dup[0].key === "applicant");
  const long = `${F}SectionA[0].Applicant[0].${"X".repeat(130)}[0]`;
  const cut = sheetOf({ basis: "form_parts", parts: [{ key: "applicant", title: "Applicant", named: true, fieldKeys: [long.slice(0, 120)] }] }, [{ ...boxes[0], box: long }], origin, labels, new Map());
  ok("C7.3 (review m1): a form field whose data path is longer than the 120 characters the rules pass keeps still goes in its part", cut.sections[0].key === "applicant" && cut.sections[0].answers.length === 1 && !cut.sections.some((x) => x.key === OTHER_PART));
}

// QA-309 (C7.3, C10.2; P-401): a section waits only for what the form's readiness still names (`waits`): a fact held
// as "none apply", a row fact that is answered (the form's spare rows stay empty) or a fact the release never asks is
// not waited for, so an all-ticked sheet can read Done. Without `waits` every empty box waits, as before.
{
  const F = "IMM_5257[0].page1[0].";
  const qb = (path: string, fact: string, row: number | null = null, coverage: BoxRow["coverage"] = "answered on screen", value: unknown = null): BoxRow =>
    ({ box: `${F}${path}`, caption: fact, fact, meaning: null, about: "p", about_label: "Client A", row, coverage, detail: "", value });
  const parts: FormPart[] = [
    { key: "education", title: "Education", named: true, fieldKeys: [`${F}Edu[0].School[0]`, `${F}Edu[0].From[0]`] },
    { key: "employment", title: "Employment", named: true, fieldKeys: [`${F}Emp[0].Title[0]`, `${F}Emp[1].Title[0]`, `${F}Emp[2].Title[0]`] },
    { key: "visit", title: "Details of visit", named: true, fieldKeys: [`${F}Visit[0].Purpose[0]`, `${F}Visit[0].Contact[0]`] },
  ];
  const qbs = [
    qb("Edu[0].School[0]", "person.education_school_name", 0), qb("Edu[0].From[0]", "person.education_from_date", 0), // "none apply"
    qb("Emp[0].Title[0]", "person.occupation_title", 0, "confirmed fact", "Sample analyst"), qb("Emp[1].Title[0]", "person.occupation_title", 1), qb("Emp[2].Title[0]", "person.occupation_title", 2), // one row answered
    qb("Visit[0].Purpose[0]", "case.visit_purpose", null, "confirmed fact", "tourism"), qb("Visit[0].Contact[0]", "case.visit_contact_name", null, "unresolved"), // never asked
  ];
  const before = sheetOf({ basis: "form_parts", parts }, qbs, origin, labels, new Map());
  const after = sheetOf({ basis: "form_parts", parts }, qbs, origin, labels, new Map(), undefined, () => false);
  const waitsOf = (sh: typeof after, key: string) => sh.sections.find((x) => x.key === key)?.waiting.length ?? -1;
  ok("QA-309 (fail, without readiness): every empty box waits: \"none apply\" education, the spare employment rows, the never-asked contact", waitsOf(before, "education") === 2 && waitsOf(before, "employment") === 1 && waitsOf(before, "visit") === 1);
  ok("QA-309 pass: with nothing readiness names, no section waits (\"none apply\", an answered row fact, a never-asked fact)", after.sections.every((x) => x.waiting.length === 0), after.sections.map((x) => [x.key, x.waiting.length]));
  ok("QA-309 pass: a section the form asks of the person stays on the sheet to tick, though nothing in it waits (Education, held as \"none apply\")", after.sections.map((x) => x.key).join() === "education,employment,visit" && after.sections.every((x) => x.version !== ""));
  const one = sheetOf({ basis: "form_parts", parts }, qbs, origin, labels, new Map(), undefined, (subject, fact) => subject === "p" && fact === "person.education_school_name");
  ok("QA-309 (fail): a fact readiness still names waits, and only it", waitsOf(one, "education") === 1 && one.sections.find((x) => x.key === "education")?.waiting[0]?.fact === "person.education_school_name" && waitsOf(one, "employment") === 0 && waitsOf(one, "visit") === 0);
  ok("QA-309: `waits` never changes a section's fingerprint (a tick is about the values shown)", JSON.stringify(after.sections.map((x) => x.version)) === JSON.stringify(before.sections.map((x) => x.version)));
}

// QA-309 review M1 (b, c), m2: what a sheet waits on comes from readiness's lines, each matched to its person by id.
{
  const q = (subjectId: string, fact: string, extra: Record<string, unknown> = {}) => ({ subjectId, about_label: "Client A", fact, label: fact, required: true, hidden: false, group: null, rows: [], answer: null, fills: [{ form: "IMM 5257", person: "p", subject: "p" }], ...extra });
  // Two people with the same name shown ("Client A"), each with an education group: only the one readiness names waits.
  const view = { sections: [
    { subjectId: "p", about_label: "Client A", section: "education", title: "Education", questions: [q("p", "person.education_school_name")], group: { required: true, rows: 0, none_apply: null } },
    { subjectId: "p2", about_label: "Client A", section: "education", title: "Education", questions: [q("p2", "person.education_school_name")], group: { required: true, rows: 0, none_apply: null } },
    { subjectId: "k", about_label: "The application", section: "visit", title: "Visit", questions: [q("k", "case.visit_purpose")], group: null },
  ], checks: [{ id: "dates", severity: "warn", group: "section_check", message: "The stay ends before it starts.", subjectId: "p", about_label: "Client A", fact: "person.stay_to", section: "visit", illustrative: false }] } as unknown as QuestionnaireView;
  const line = (fact: string, subject: string | undefined, about = "Client A", reason: Readiness["missing"][number]["reason"] = "not answered") => ({ fact, label: fact, about, reason, ...(subject ? { subject } : {}) });
  const w = waitsOf(view, [line("group:education", "p"), line("check:dates", "p", "Client A", "a check fired"), line("case.visit_purpose", "k", "The application"), line("person.family_name", "p")], "p", "k");
  ok("QA-309 M1 (c) pass: a fired section check makes the fact it reads wait", w("p", "person.stay_to"));
  ok("QA-309 M1 (c) fail: a check on the same fact of another person does not", !w("p2", "person.stay_to"));
  ok("QA-309 pass: a group whose \"none apply\" is not answered makes each of its facts wait; a fact readiness names waits", w("p", "person.education_school_name") && w("p", "person.family_name"));
  ok("QA-309 m2 (fail): the same group of another person shown by the same name does not wait (matched by id, never by name)", !w("p2", "person.education_school_name"));
  ok("QA-309 M1 (b) pass: a box about the application (\"case\" on the form) waits when readiness names the case's own fact", w("case", "case.visit_purpose"));
  ok("QA-309 M1 (b) fail: without the case's subject, a \"case\" box never matches; a fact readiness does not name never waits", !waitsOf(view, [line("case.visit_purpose", "k", "The application")], "p")("case", "case.visit_purpose") && !w("p", "person.given_names") && !w("case", "case.visit_contact_name"));
  // The item's words while it is not Done.
  const sh = (entered: boolean[]) => ({ order_basis: "form_parts", order_note: "", sections: entered.map((e, i) => ({ key: `s${i}`, title: `Part ${i + 1}`, version: "", entered: e ? { at: "2026-11-08T10:00:00Z", by: "user-O" } : null, out_of_date: false, answers: [], waiting: [] })) }) as Sheet;
  const four = [1, 2, 3, 4].map((n) => line(`person.fact_${n}`, "p"));
  ok("QA-309 (fail): while facts wait, the words name the first three by label and person and count the rest", sheetWords(sh([true]), four) === "Waiting for 4 facts to answer or confirm: person.fact_1 (Client A); person.fact_2 (Client A); person.fact_3 (Client A); and 1 more." && sheetWords(sh([true]), four.slice(0, 1)) === "Waiting for 1 fact to answer or confirm: person.fact_1 (Client A).");
  ok("QA-309 (fail): nothing waits but a section is not ticked: the words name it, never \"Every fact it reads is confirmed\"", sheetWords(sh([true, false]), []) === "Every answer is ready to enter in the portal; 1 of 2 sections still to tick \"Entered in the portal\": Part 2." && !/Every fact it reads is confirmed/.test(sheetWords(sh([false]), [])));
}
// QA-309 review m1: a fact about the application that needs a fix is one readiness line, about the application, never a
// second one "about" the person whose form it is ("case" on the form, the case's own subject on its question).
{
  const answered = { confirmed: true, problems: ["The date is not a real date."] };
  const view = { sections: [{ subjectId: "k", about_label: "The application", section: "visit", title: "Visit", group: null, questions: [{ subjectId: "k", about_label: "The application", fact: "case.intended_stay_to", label: "Stay to", required: true, hidden: false, group: null, rows: [], answer: answered, fills: [{ form: "IMM 5257", person: "p", subject: "p" }] }] },
    { subjectId: "p", about_label: "Sample Client A", section: "personal", title: "Personal", group: null, questions: [] }], checks: [] } as unknown as QuestionnaireView;
  const boxes = [{ box: "IMM_5257[0].Stay[0].To[0]", caption: "To", fact: "case.intended_stay_to", meaning: null, about: "case", about_label: "The application", row: null, coverage: "answered on screen" as const, detail: "", fix: "answered with a problem, not written: The date is not a real date." }];
  const r = readiness(view, "IMM 5257", "p", { boxes, open: [] });
  ok("QA-309 m1 (fail): a case fact with a problem is named once, about the application (was twice, the second about the person)", r.missing.filter((m) => m.fact === "case.intended_stay_to").length === 1 && r.missing.every((m) => m.about === "The application"), r.missing);
  const alone = readiness({ ...view, sections: [view.sections[1]] } as QuestionnaireView, "IMM 5257", "p", { boxes, open: [] });
  ok("QA-309 m1 pass: with no question for it, the form's own fix is still named once", alone.missing.length === 1 && alone.missing[0].reason === "needs a fix", alone.missing);
  // Review m2: readiness says whose group and whose fired check each line is, by id, so a sheet never matches by name.
  const g = readiness({ sections: [{ subjectId: "p", about_label: "Sample Client A", section: "education", title: "Education", group: { required: true, rows: 0, none_apply: null }, questions: [{ subjectId: "p", about_label: "Sample Client A", fact: "person.education_school_name", label: "School", section: "education", required: true, hidden: false, group: "education", rows: [], answer: null, fills: [{ form: "IMM 5257", person: "p", subject: "p" }] }] }],
    checks: [{ id: "dates", severity: "warn", group: "section_check", message: "The dates disagree.", subjectId: "p", about_label: "Sample Client A", fact: "person.education_school_name", section: "education", illustrative: false }] } as unknown as QuestionnaireView, "IMM 5257", "p");
  ok("QA-309 m2: readiness's group line and fired-check line each carry their person's id", g.missing.find((m) => m.fact === "group:education")?.subject === "p" && g.missing.find((m) => m.fact === "check:dates")?.subject === "p", g.missing);
}

// QA-317 review M1: a choice is copied in the release's own words (its option's label, as the portal lists it), never its
// key; the value it stores, and so the section's fingerprint, stay the key.
{
  const choice = [{ box: "IMM_5707[0].page1[0].SectionA[0].Applicant[0].Marital[0]", caption: "Marital status", fact: "person.marital_status", meaning: null, about: "p", about_label: "Client A", row: null, coverage: "confirmed fact" as const, detail: "", value: "annulled_marriage" },
    { box: "IMM_5707[0].page1[0].SectionA[0].Applicant[0].FamilyName[0]", caption: "Family name", fact: "person.family_name", meaning: null, about: "p", about_label: "Client A", row: null, coverage: "confirmed fact" as const, detail: "", value: "SAMPLE" }];
  const words = (fact: string, v: unknown) => (fact === "person.marital_status" && v === "annulled_marriage" ? "Annulled Marriage" : undefined);
  const plain = answerSheet(SECTIONS, choice, origin, labels, new Map());
  const named = sheetOf({ basis: "pdf_twin", sections: SECTIONS }, choice, origin, labels, new Map(), undefined, undefined, words);
  const at = (sh: typeof named, fact: string) => sh.sections[0].answers.find((a) => a.fact === fact);
  ok("QA-317 M1 (fail, without the release's words): a choice would copy its key", at(plain, "person.marital_status")?.copy_text === "annulled_marriage");
  ok("QA-317 M1 pass: a choice copies its option's label; free text copies as typed", at(named, "person.marital_status")?.copy_text === "Annulled Marriage" && at(named, "person.family_name")?.copy_text === "SAMPLE");
  ok("QA-317 M1: the stored value and the section's fingerprint stay the key", at(named, "person.marital_status")?.value === "annulled_marriage" && named.sections[0].version === plain.sections[0].version);
}

process.exitCode = summary() ? 1 : 0;
