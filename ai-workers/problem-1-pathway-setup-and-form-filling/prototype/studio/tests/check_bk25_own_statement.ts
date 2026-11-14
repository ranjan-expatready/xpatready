// BK-25 (P-533, P-170; BK-24's follow-up F4): the own-question door (B52/B116) asks a Yes/No form field nothing fills yet
// that the form prints as a statement answered YES or NO (IMM 5707's "I was physically present at the marriage ceremony"),
// in those words, only when the form's saved text holds them; and a box in a row about another person of the case (IMM
// 5707's spouse row) is asked about that person only when its row's mapped form fields all name that person. Also the
// Study permit's own-question data (samples/own-yes-no.json "sp.outside"): every quoted question and every statement is in
// its form's saved text, each box is a Yes/No form field of the form's own reading, and a "person" names its row's person.
// Pure: reads files; no server, no database. US$0.
//   tsx studio/tests/check_bk25_own_statement.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inFormText, printedQuestion, printedStatement, rowPeople, rowPersonRefused, yesNoCodes, type Box } from "../api/src/own-yes-no.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");
/** A form's reading by form field, as the door reads it (api/src/own-question.ts readingOf, which needs Nest to import). */
const readingOf = (file: string | null) => { try { return new Map(((JSON.parse(readFileSync(join(SOLUTION, file ?? ""), "utf8")) as { fields?: Box[] }).fields ?? []).filter((x) => x.data_path).map((x) => [x.data_path!, x])); } catch { return null; } };
const F5707 = "forms/imm5707e.pdf", F1294 = "forms/imm1294e.pdf", F1295 = "forms/imm1295e.pdf";
const SPOUSE = "IMM_5707[0].page1[0].SectionA[0].Spouse[0].PaddedEntry[0].MarriageInPerson[0].MarriageInPerson[0].yesno[0]";
const APPLICANT = SPOUSE.replace(".Spouse[0].", ".Applicant[0].");
const r5707 = readingOf("prototype/p1/inventory/imm5707e.inventory.json");

// 1. A statement the form prints, from its own reading and saved text.
ok("BK-25 pass: IMM 5707's applicant row prints \"I was physically present at the marriage ceremony\", a statement in the form's saved text, so it is asked in those words",
  printedStatement(r5707?.get(APPLICANT), F5707) === "I was physically present at the marriage ceremony" && printedQuestion(r5707?.get(APPLICANT)) === null, r5707?.get(APPLICANT));
ok("BK-25 pass: the spouse row's own words, \"My spouse was physically present at the marriage ceremony\"", printedStatement(r5707?.get(SPOUSE), F5707) === "My spouse was physically present at the marriage ceremony");
ok("BK-25 pass: both are Yes/No form fields (the form prints YES 1 and NO 2)", JSON.stringify(yesNoCodes(r5707?.get(APPLICANT))) === JSON.stringify({ yes: "1", no: "2" }));
ok("BK-25 fail: a statement that is not in the form's saved text is refused (null)", printedStatement({ heading: "I was physically present at the wedding party" }, F5707) === null);
ok("BK-25 fail: a form with no saved text gives no statement", printedStatement({ heading: "I was physically present at the marriage ceremony" }, "forms/imm9999e.pdf") === null);
ok("BK-25 fail: a heading that is a label, a number or script words is never a statement (\"* Date of birth\", \"Question 2\", \"Family name\")",
  [{ heading: "* Date of birth" }, { heading: "Question 2 A. Something printed here" }, { heading: "Family name" }, { heading: "this.rawValue = xfa.layout.page(this)" }, undefined].every((b) => printedStatement(b, F5707) === null));
ok("BK-25 fail: a question is not taken as a statement (it stays printedQuestion's)", printedStatement({ heading: "Have you previously applied to enter or remain in Canada?" }, F1295) === null);

// Review M2 on #1747: a heading the reading cut at 120 characters is not a whole statement, even though the saved text holds it.
const r1295 = readingOf("prototype/p1/inventory/imm1295e.inventory.json"), Q5 = "form1[0].Page4[0].PageWrapper[0].Occupation[0].Choice[0]";
ok("BK-25 fail (review M2): IMM 1295's background question 5, its heading cut by the reading (\"…or organization which has\"), is refused, never asked as a fragment",
  /which has$/.test(r1295?.get(Q5)?.heading?.trim() ?? "") && printedQuestion(r1295?.get(Q5)) === null && printedStatement(r1295?.get(Q5), F1295) === null, r1295?.get(Q5)?.heading);
ok("BK-25 fail (review M2): a statement is taken only where the saved text runs straight on into the box's own first choice (a heading shorter than the cut, with options the form does not print after it, is refused)",
  printedStatement({ ...r5707?.get(APPLICANT), options: [["MAYBE", "3"]] } as Box, F5707) === null);

// 2. The row's person, from its mapped form fields.
const row = (dataPath: string, person: string | null, outcome = "mapped") => ({ dataPath, person, outcome });
const P = "IMM_5707[0].page1[0].SectionA[0].Spouse[0].PaddedEntry[0].", PA = P.replace(".Spouse[0].", ".Applicant[0].");
const rows = [row(`${P}PersonalData[0].FamilyName[0]`, "subject_spouse_or_partner"), row(`${P}Accompanying[0].yesno[0]`, "subject_spouse_or_partner"), row(SPOUSE, null, "by_hand"),
  row(`${PA}PersonalData[0].FamilyName[0]`, "form_subject"), row(APPLICANT, null, "by_hand")];
ok("BK-25 pass: the spouse row's box is about the person its row's mapped form fields name (subject_spouse_or_partner)", JSON.stringify(rowPeople(rows, SPOUSE)) === JSON.stringify(["subject_spouse_or_partner"]), rowPeople(rows, SPOUSE));
ok("BK-25 pass: the applicant row's box is about the form's subject", JSON.stringify(rowPeople(rows, APPLICANT)) === JSON.stringify(["form_subject"]));
ok("BK-25 fail: a row whose mapped form fields name two people gives both (the door refuses a single name then)",
  rowPeople([...rows, row(`${P}PersonalData[1].DOB[0]`, "subject_child")], SPOUSE).length === 2);
ok("BK-25 fail: a row with no mapped form field names no one (the door refuses)", rowPeople([row(SPOUSE, null, "by_hand")], SPOUSE).length === 0);
ok("BK-25 pass: the door asks the spouse row about the spouse, and the applicant row about the form's subject with no person named",
  !rowPersonRefused(rowPeople(rows, SPOUSE), "subject_spouse_or_partner") && !rowPersonRefused(rowPeople(rows, APPLICANT)));
ok("BK-25 fail (review M3): the spouse row asked with no person named is refused, never filled from the applicant's own answer", rowPersonRefused(rowPeople(rows, SPOUSE)));
ok("BK-25 fail (tech lead on #1747): a person its row does not name is refused (the child on the spouse row; the spouse on the applicant row; anyone on a row that names no one)",
  rowPersonRefused(rowPeople(rows, SPOUSE), "subject_child") && rowPersonRefused(rowPeople(rows, APPLICANT), "subject_spouse_or_partner") && rowPersonRefused([], "subject_spouse_or_partner"));
ok("BK-25 pass: a page of mixed rows does not say, so a box with no person named keeps the form's subject there, as before this row", !rowPersonRefused(["form_subject", "subject_spouse_or_partner"]));

// 3. The Study permit's data: each box is a Yes/No form field of its form's reading, asked in that form's own words.
const own = JSON.parse(readFileSync(join(STUDIO, "samples", "own-yes-no.json"), "utf8")).combinations["sp.outside"] as { application: string; boxes: { form?: string; dataPath: string; question?: string; person?: string; later?: boolean }[] };
const inv: Record<string, [string, string]> = { "IMM 1294": ["prototype/p1/inventory/imm1294e.inventory.json", F1294], "IMM 1295": ["prototype/p1/inventory/imm1295e.inventory.json", F1295], "IMM 5707": ["prototype/p1/inventory/imm5707e.inventory.json", F5707] };
ok("BK-25: the Study permit's own questions are on its application form IMM 1294, and on IMM 1295 and IMM 5707 (8 boxes)", own?.application === "IMM 1294" && own.boxes.length === 8, own?.boxes.length);
for (const b of own?.boxes ?? []) {
  const [file, pdf] = inv[b.form ?? own.application] ?? [], box = readingOf(file ?? null)?.get(b.dataPath);
  const words = b.question ?? printedQuestion(box) ?? printedStatement(box, pdf);
  ok(`BK-25: ${b.form ?? own.application} ${b.dataPath.split(".").slice(-3).join(".")} is a Yes/No form field asked in its form's own words ("${words}")`,
    !!box && !!yesNoCodes(box) && !!words && (!b.question || inFormText(pdf, b.question)), { box: !!box, words });
}
ok("BK-25 (P-598): only IMM 5707's two boxes, the form edition every paper combination files, are \"later\" (asked after the other combinations' release 1)",
  JSON.stringify(own.boxes.filter((b) => b.later).map((b) => b.form)) === JSON.stringify(["IMM 5707", "IMM 5707"]));
// The quoted words of 2 c) and the consent: the reading prints a neighbour's words on those boxes, so they must be quoted.
ok("BK-25 fail: the readings print a neighbour's words on 2 c) and the consent, so those boxes carry a quoted question",
  own.boxes.filter((b) => /VisaChoice3|Consent0/.test(b.dataPath)).every((b) => !!b.question) && printedQuestion(readingOf(inv["IMM 1295"][0])?.get("form1[0].Page4[0].Consent0[0].Choice[0]")) !== "Do you consent to be contacted by IRCC, or an organization at IRCC’s request, in the future?");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
