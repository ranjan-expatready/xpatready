// C7.3 checks (M3-E, runtime lane): engine/runtime/answer-sheet.ts lays out an Online form item's answer sheet in the PDF
// twin's sections from the person's form boxes: every declared or confirmed answer (P-242, P-411; was confirmed only,
// P-72), each with its person, source, mark, "to confirm" and the text to copy; an answer that needs a fix (or none) is
// listed as waited for; "Entered in the portal" ticks go out of date when an answer they
// froze changes (P-65). Each rule has a passing and a failing case. No database, no server, no model call (US$0).
//   tsx studio/tests/check_vv_answer_sheet.ts
import { answerSheet, copyText, OTHER_PART, partsInFormOrder, sectionHash, sheetOf, sourceOf, type FormPart } from "../engine/runtime/answer-sheet.ts";
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

process.exitCode = summary() ? 1 : 0;
