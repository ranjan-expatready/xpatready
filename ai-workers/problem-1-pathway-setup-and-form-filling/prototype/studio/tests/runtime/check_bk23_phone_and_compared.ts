// BK-23 (BK-13 code gap C4 on #1695; Lead 36's ruling on #1698): two runtime rules, each with a passing and a failing
// case, on a tiny synthetic release (no server, no database). Sample people and firm; US$0.
//  1. C4: the firm record writes the representative's number and fax in the shape the release's question reads: the phone
//     itself (country code and number) where some form of the release writes that fact part by part, so it never "needs a
//     fix"; text where none does (as before). A form field that writes the value as it is (IMM 5476 (11-2021)'s question 7)
//     still holds the text it always held (the number, and its extension), never the phone object.
//  2. A fact a form field's "A equals B" step compares is asked of the person who files the form, and reaches the filler
//     with that form field, even where no form field of the form reads it itself (IMM 1295's spouse and the current
//     residence country).
//   tsx studio/tests/runtime/check_bk23_phone_and_compared.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { caseView, checkValue, shapeOf, type Answer, type Participant } from "../../engine/runtime/case.ts";
import { formCoverage, isGateFact } from "../../engine/runtime/forms.ts";
import { formValues } from "../../engine/form-values.ts";
import { render } from "../../engine/render.ts";
import { comparedFacts } from "../../engine/runtime/compared.ts";
import { phoneInOneBox, representativeAnswers, representativeContact, writesAsIs, type Firm, type Member } from "../../engine/runtime/team.ts";
import { runTransform } from "../../../p5/transforms.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-13T12:00:00Z");
const FIRMS = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "firms.json"), "utf8")) as { firms: Firm[] }).firms;
const firm = FIRMS.find((f) => f.key === "sample-firm")!;
const REP = firm.users.find((u) => u.duties.includes("represent") && u.licence)!.id;
const team: Member[] = [{ userId: REP, role: "LEAD_REPRESENTATIVE", assignedBy: REP, assignedAt: new Date(Date.UTC(2026, 10, 13, 10)), endedAt: null, endedBy: null, endReason: null }];
const office = firm.office!.phone!;
const withFax: Firm = { ...firm, office: { ...firm.office!, phone: { ...office, extension: "12" }, fax: { country_code: "1", number: "4165550199" } } };

// ── A tiny release. F REP: the representative's block (IMM 5476 (11-2021)'s question 7 shape: number and fax written as
// they are, the country code in its own box). F OWN: the applicant's own form writes their number part by part, which
// makes person.phone_number a phone on this release (as IMM 1294 does on the Study permit). F SAME: a "same as" Yes/No
// comparing the applying-from country with the current residence country, and no form field of its own for the latter
// (IMM 1295 for the spouse). F BOTH: the same comparison on a form that also reads the residence country itself.
const S = {
  contract_version: "combination-config/v0", mode: "release",
  combination: { key: "t", label: "Test", program: "p", pathway: null, participants: [{ role: "principal", min: 1, max: 1 }, { role: "spouse_or_partner", min: 0, max: 1 }], source_basis: "SOURCE_BACKED", basis_note: "" },
  canonical_fields: [
    { id: "person.phone_number", meaning: "Telephone number", value_type: "text" },
    { id: "person.fax_number", meaning: "Fax number", value_type: "text" },
    { id: "person.phone_country_code", meaning: "Country code", value_type: "text" },
    { id: "representative.membership_id", meaning: "Membership ID", value_type: "text" },
    { id: "person.applying_from_country", meaning: "Country applying from", value_type: "text" },
    { id: "person.current_residence_country", meaning: "Country of residence", value_type: "text" },
  ],
  sections: [{ id: "personal", title: "Personal" }],
  placements: [
    { fact: "person.phone_number", section_id: "other", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.fax_number", section_id: "other", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.phone_country_code", section_id: "other", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "representative.membership_id", section_id: "other", repeats: "per_person", collected_from: "profile_record" },
    { fact: "person.applying_from_country", section_id: "other", repeats: "per_person", collected_from: "client_questionnaire" },
    { fact: "person.current_residence_country", section_id: "other", repeats: "per_person", collected_from: "client_questionnaire" },
  ],
  forms: [
    { form_number: "F REP", title: "Representative", who: "each_applicant", status: "always" },
    { form_number: "F OWN", title: "Own", who: "principal_applicant", status: "always" },
    { form_number: "F SAME", title: "Same as", who: "spouse_or_partner", status: "always" },
    { form_number: "F BOTH", title: "Both", who: "principal_applicant", status: "always" },
  ],
  field_maps: [
    { form_number: "F REP", form_edition: "F REP (11-2021)", entries: [
      { data_path: "rep.id", outcome: "mapped", fact: "representative.membership_id", person: "representative", row: null, transform: "as_is" },
      { data_path: "rep.cc", outcome: "mapped", fact: "person.phone_country_code", person: "representative", row: null, transform: "digits_only" },
      { data_path: "rep.phone", outcome: "mapped", fact: "person.phone_number", person: "representative", row: null, transform: "as_is" },
      { data_path: "rep.fax", outcome: "mapped", fact: "person.fax_number", person: "representative", row: null, transform: "as_is; max 30 characters" },
    ] },
    { form_number: "F OWN", form_edition: "F OWN (01-2026)", entries: [
      { data_path: "own.cc", outcome: "mapped", fact: "person.phone_number", person: "form_subject", row: null, transform: "phone_part:country_calling_code" },
      { data_path: "own.fax", outcome: "mapped", fact: "person.fax_number", person: "form_subject", row: null, transform: "phone_part:national_number" },
    ] },
    { form_number: "F SAME", form_edition: "F SAME (01-2026)", entries: [
      { data_path: "same.from", outcome: "mapped", fact: "person.applying_from_country", person: "form_subject", row: null, transform: "as_is" },
      { data_path: "same.yn", outcome: "mapped", fact: "person.applying_from_country", person: "form_subject", row: null, transform: "derived:person.applying_from_country equals person.current_residence_country -> yes_no_code:Y/N" },
    ] },
    { form_number: "F BOTH", form_edition: "F BOTH (01-2026)", entries: [
      { data_path: "both.cor", outcome: "mapped", fact: "person.current_residence_country", person: "form_subject", row: null, transform: "as_is" },
      { data_path: "both.yn", outcome: "mapped", fact: "person.applying_from_country", person: "form_subject", row: null, transform: "derived:person.applying_from_country equals person.current_residence_country -> yes_no_code:Y/N" },
    ] },
  ],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [],
} as unknown as Snapshot;
const people: Participant[] = [
  { subjectId: "case", role: "case", label: "The application", applies: true },
  { subjectId: "p", role: "principal", label: "Student", applies: true },
  { subjectId: "s", role: "spouse_or_partner", label: "Spouse", applies: true },
];
let n = 0;
const ans = (subjectId: string, field: string, value: unknown): Answer => ({ id: `a${++n}`, subjectId, field, rowKey: null, value, status: "VERIFIED", channel: "agent_view", actor: "user-O", at: TODAY.toISOString() });
const phoneParts = (fact: string) => shapeOf(S, fact).phone;

// ── 1. C4: the firm record's phone in the release's shape
ok("BK-23 setup: on this release the representative's number and fax are phones (another form writes them part by part); the country code is not", phoneParts("person.phone_number") && phoneParts("person.fax_number") && !phoneParts("person.phone_country_code"));
const given = representativeContact(withFax, team, phoneParts)!;
ok("BK-23 pass: the firm record gives the number as the phone itself (country code and number, its extension kept)", JSON.stringify(given["person.phone_number"]) === JSON.stringify({ ...office, extension: "12" }), given["person.phone_number"]);
ok("BK-23 pass: and the fax the same way", JSON.stringify(given["person.fax_number"]) === JSON.stringify({ country_code: "1", number: "4165550199" }), given["person.fax_number"]);
ok("BK-23 pass: so the release's question finds nothing to fix in either", checkValue(S, "person.phone_number", given["person.phone_number"], TODAY).length === 0 && checkValue(S, "person.fax_number", given["person.fax_number"], TODAY).length === 0);
const before = representativeContact(withFax, team, true)!;
ok("BK-23 fail (the cause, C4): the number as text, as before this row, needs a fix on that release", typeof before["person.phone_number"] === "string" && checkValue(S, "person.phone_number", before["person.phone_number"], TODAY).length > 0, checkValue(S, "person.phone_number", before["person.phone_number"], TODAY));
const textRelease = representativeContact(withFax, team, () => false)!;
ok("BK-23 fail: a release that reads them as text keeps the text it always had (\"4165550100 ext. 12\", the fax number)", textRelease["person.phone_number"] === "4165550100 ext. 12" && textRelease["person.fax_number"] === "4165550199", [textRelease["person.phone_number"], textRelease["person.fax_number"]]);
ok("BK-23 pass: QA-289's telephone keeps its rule (a boolean still means person.telephone_number only)", typeof before["person.telephone_number"] === "object" && typeof representativeContact(withFax, team, false)!["person.telephone_number"] === "string");
ok("BK-23 fail: an office with no fax gives no fax (left out, so the question stays asked), never an empty phone", !("person.fax_number" in representativeContact(firm, team, phoneParts)!));

ok("BK-23 pass: phoneInOneBox is the number and its extension; a value that is not a phone object stays as it is", phoneInOneBox({ country_code: "1", number: "4165550100", extension: "12" }) === "4165550100 ext. 12" && phoneInOneBox("4165550100") === "4165550100" && phoneInOneBox({ country_code: "1", number: "" }) === null);
ok("BK-23 pass and fail: writesAsIs is true for a value written as it is (with a stated length), false for any step that reads a phone's parts",
  writesAsIs("as_is") && writesAsIs("as_is; max 30 characters") && writesAsIs("as_is;max_chars:5") && writesAsIs("as_is (max 20 chars)") && writesAsIs(null)
  && !writesAsIs("phone:area_code_and_number") && !writesAsIs("phone_part:national_number") && !writesAsIs("digits_only") && !writesAsIs("derive:1 if country calling code is 1, else 0"));

// The case: the firm record's answers, read like any confirmed answer, and the representative's form field values.
const firmAnswers = representativeAnswers(withFax, team, "case", phoneParts) as Answer[];
const repCov = formCoverage(S, people, firmAnswers, [], "F REP", "p", TODAY)!;
const box = (path: string) => repCov.boxes.find((b) => b.box === path)!;
ok("BK-23 pass: the representative's number and fax are written on the form (no fix), as the text the as-is form fields always held", box("rep.phone").coverage === "confirmed fact" && box("rep.phone").value === "4165550100 ext. 12" && box("rep.fax").value === "4165550199", [box("rep.phone"), box("rep.fax")].map((b) => [b.coverage, b.value, (b as { fix?: string }).fix]));
const repInv = { fields: ["rep.id", "rep.cc", "rep.phone", "rep.fax"].map((data_path) => ({ data_path })) };
const repValues = formValues(S, S.field_maps[0] as never, repInv as never, repCov.boxes).values;
ok("BK-23 pass: the filler writes them as that text, never \"[object Object]\"; the country code in its own box", repValues["rep.phone"] === "4165550100 ext. 12" && repValues["rep.fax"] === "4165550199" && repValues["rep.cc"] === "1", repValues);
const rawPhone = runTransform("as_is", given["person.phone_number"], {});
ok("BK-23 fail (why the form field gets text): the phone object itself written as it is would be \"[object Object]\"", rawPhone.ok && (rawPhone as { value: string }).value === "[object Object]");
const view = caseView(S, people, firmAnswers, [], "agent", TODAY).sections.flatMap((x) => x.questions).find((q) => q.subjectId === "representative" && q.fact === "person.phone_number");
ok("BK-23 pass: the case view shows the representative's number as the phone (the question's own kind), with no problem", !!view && typeof view.answer?.value === "object" && (view.answer as { problems?: string[] }).problems?.length === 0, view?.answer);

// ── 2. The fact an "A equals B" step compares is asked, and reaches the filler
const SAME = "derived:person.applying_from_country equals person.current_residence_country -> yes_no_code:Y/N";
ok("BK-23 pass: comparedFacts names the other fact of an \"A equals B\" step (the filler is asked which fact it reads)", JSON.stringify(comparedFacts(SAME, "person.applying_from_country")) === JSON.stringify(["person.current_residence_country"]));
ok("BK-23 fail: a tick by a word, a \"recorded\" Yes/No, a plain step and a step with no own fact name nothing",
  comparedFacts("derived: 1 if case.application_type = visitor, else 0", "person.x").length === 0 && comparedFacts("derived:any(person.other_names) recorded -> yes_no_code:Y/N", "person.other_names_used").length === 0
  && comparedFacts("as_is", "person.applying_from_country").length === 0 && comparedFacts(SAME, null).length === 0);
// The drafters' spelling on IMM 1295: named only when the filler runs it (BK-22, #1698), never guessed from its words.
const DRAFT = "derive:case.applying_from_country equals current residence country->yes_no_code:Y/N";
const runs = runTransform(DRAFT, "India", {}, { ownFact: "person.applying_from_country", fact: () => "India" }).ok;
ok(`BK-23 pass and fail: IMM 1295's drafted spelling names a fact exactly when the filler runs it (it ${runs ? "runs" : "does not run"} on this filler)`, comparedFacts(DRAFT, "person.applying_from_country").length === (runs ? 1 : 0), comparedFacts(DRAFT, "person.applying_from_country"));

const qs = (answers: Answer[]) => caseView(S, people, answers, [], "agent", TODAY).sections.flatMap((x) => x.questions);
const cor = (subject: string, answers: Answer[] = []) => qs(answers).find((q) => q.subjectId === subject && q.fact === "person.current_residence_country");
ok("BK-23 pass: the spouse, who files F SAME, is asked the current residence country, and it fills F SAME", cor("s")?.fills.map((f) => f.form).join() === "F SAME", cor("s")?.fills);
ok("BK-23 pass: the principal, who files F BOTH (which also reads it itself), is asked it once, and F BOTH counts its own form field once", cor("p")?.fills.map((f) => `${f.form}:${f.boxes}`).join() === "F BOTH:1", cor("p")?.fills);
const noPlace = { ...S, placements: (S.placements as { fact: string }[]).filter((p) => p.fact !== "person.current_residence_country") } as unknown as Snapshot;
ok("BK-23 fail: with no question placed for the compared fact, the spouse is not asked it, and it is not listed as unplaced for them (no form field of theirs reads it)", !caseView(noPlace, people, [], [], "agent", TODAY).sections.flatMap((x) => x.questions).some((q) => q.subjectId === "s" && q.fact === "person.current_residence_country") && !render(noPlace, people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as never, label: p.label, applies: true })), new Map()).unplaced.some((u) => u.about === "s" && u.fact === "person.current_residence_country"));
const plain = { ...S, field_maps: (S.field_maps as { form_number: string; entries: { transform: string }[] }[]).map((m) => m.form_number === "F SAME" ? { ...m, entries: m.entries.map((e) => ({ ...e, transform: "as_is" })) } : m) } as unknown as Snapshot;
ok("BK-23 fail: without an \"A equals B\" step the spouse is not asked it (only facts a form reads are asked, P-62)", !caseView(plain, people, [], [], "agent", TODAY).sections.flatMap((x) => x.questions).some((q) => q.subjectId === "s" && q.fact === "person.current_residence_country"));

const sameInv = { fields: [{ data_path: "same.from" }, { data_path: "same.yn" }] };
const fill = (answers: Answer[]) => { const c = formCoverage(S, people, answers, [], "F SAME", "s", TODAY)!; return { c, r: formValues(S, S.field_maps[2] as never, sameInv as never, c.boxes) }; };
const yes = fill([ans("s", "person.applying_from_country", "India"), ans("s", "person.current_residence_country", "India")]);
const no = fill([ans("s", "person.applying_from_country", "India"), ans("s", "person.current_residence_country", "Canada")]);
const none = fill([ans("s", "person.applying_from_country", "India")]);
ok("BK-23 pass: the spouse's answer reaches the filler with F SAME's form field: the same country writes Y", yes.r.values["same.yn"] === "Y", yes.r.boxes.find((b) => b.box === "same.yn"));
ok("BK-23 pass: another country writes N", no.r.values["same.yn"] === "N", no.r.boxes.find((b) => b.box === "same.yn"));
ok("BK-23 fail: unanswered, it stays by hand with its reason (never guessed, P-170)", none.r.values["same.yn"] === undefined && none.r.boxes.find((b) => b.box === "same.yn")?.result === "by hand", none.r.boxes.find((b) => b.box === "same.yn")?.why);
ok("BK-23 pass: the compared fact is among the copy's facts, so changing it makes a copy out of date", yes.c.facts.some((f) => f.fact === "person.current_residence_country" && f.about === "s" && f.value === "India") && !none.c.facts.some((f) => f.fact === "person.current_residence_country"));
const both = formCoverage(S, people, [ans("p", "person.applying_from_country", "India"), ans("p", "person.current_residence_country", "India")], [], "F BOTH", "p", TODAY)!;
ok("BK-23 fail: a form that reads the compared fact itself carries nothing extra (its copies keep the same facts, so validated copies stay current)", !both.boxes.some((b) => b.compared) && both.facts.filter((f) => f.fact === "person.current_residence_country").length === 1);

// Review m1: a compared fact kept with a copy decides a form field; it is never counted as a form field written.
const kept = yes.c.facts.find((f) => f.box.endsWith("#compared:person.current_residence_country"));
ok("BK-23 pass and fail (review m1): the compared fact is kept as a gate-like fact, so \"written now\" counts only form fields", !!kept && isGateFact(kept) && !isGateFact(yes.c.facts.find((f) => f.box === "same.from")!) && yes.c.facts.filter((f) => !isGateFact(f)).every((f) => !f.box.includes("#")), yes.c.facts.map((f) => f.box));

// Review m2: a form field on a row of the map (here a child's row, "subject_child") compares nothing, in Preview too.
const S2 = { ...S, combination: { ...(S as { combination: object }).combination, participants: [{ role: "principal", min: 1, max: 1 }, { role: "child", min: 0, max: 2 }] },
  forms: [{ form_number: "F KID", title: "Kid", who: "principal_applicant", status: "always" }],
  field_maps: [{ form_number: "F KID", form_edition: "F KID (01-2026)", entries: [
    { data_path: "kid.yn", outcome: "mapped", fact: "person.applying_from_country", person: "subject_child", row: 0, transform: SAME },
  ] }] } as unknown as Snapshot;
const kidPeople = [{ id: "p", role: "principal" as never, label: "Student", applies: true }, { id: "c", role: "child" as never, label: "Child", applies: true }];
const kidQs = render(S2, kidPeople, new Map()).questions.filter((q) => q.about === "c");
ok("BK-23 fail (review m2): a child's form field on a row of the map asks nothing it compares (Preview agrees with the case)", kidQs.some((q) => q.fact === "person.applying_from_country") && !kidQs.some((q) => q.fact === "person.current_residence_country"), kidQs.map((q) => q.fact));

process.exitCode = summary() ? 1 : 0;
