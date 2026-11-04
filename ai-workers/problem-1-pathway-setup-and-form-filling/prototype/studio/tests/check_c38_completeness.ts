// C3.8 (validator) completeness rules in engine/form-completeness.ts, each with a passing and a failing case. Pure: no
// database, no server, no model call (US$0). The API and the validator on real data: acceptance/C3.8.test.ts AT-3, AT-8.
//   [IRCC-F08] a Background information question is never "not a fact"
//   [IRCC-F09] the family information form the application package lists is in the combination's forms
//   tsx studio/tests/check_c38_completeness.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backgroundQuestions, backgroundWords, familyFormWords, formNumberOf, missingFamilyForm, NOT_A_FACT, readingMissingWords, type ReadField } from "../engine/form-completeness.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();

// [IRCC-F08] QA-199: each form's Background questions by its own reading (p1/inventory, as read_form.py wrote it), Q1 to
// Q6 with their parts. Q4 military, Q5 political party and Q6 ill-treatment sit outside any `BackgroundInfo` node on
// IMM 5257, 1295 and 1294, and IMM 5710 names its boxes qANY, qGovtNY…: the earlier path test missed all of them.
const reading = (file: string) => (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "p1", "inventory", file), "utf8")) as { fields: ReadField[] }).fields;
const q16 = (page: string, wrap2: string, d3: string) => [`form1[0].${page}[0].BackgroundInfo[0].Choice[0]`, `form1[0].${page}[0].BackgroundInfo[0].Choice[1]`,
  `form1[0].${page}[0].${wrap2}BackgroundInfo2[0].VisaChoice1[0]`, `form1[0].${page}[0].${wrap2}BackgroundInfo2[0].VisaChoice2[0]`, `form1[0].${page}[0].${wrap2}BackgroundInfo2[0].${d3}VisaChoice3[0]`,
  `form1[0].${page}[0].PageWrapper[0].BackgroundInfo3[0].Choice[0]`, `form1[0].${page}[0].PageWrapper[0].Military[0].Choice[0]`, `form1[0].${page}[0].PageWrapper[0].Occupation[0].Choice[0]`, `form1[0].${page}[0].PageWrapper[0].GovPosition[0].Choice[0]`];
const p4 = "form1[0].Page4[0].BackgroundInfo[0].";
const forms: [string, string, string[]][] = [
  ["IMM 5257", "imm5257e.inventory.json", q16("Page3", "", "Details[0].")],
  ["IMM 1295", "imm1295e.inventory.json", q16("Page4", "", "")],
  ["IMM 1294", "imm1294e.inventory.json", q16("Page4", "PageWrapper[0].", "")],
  ["IMM 5710", "imm5710e.inventory.json", ["HealthQ[0].qANY[0]", "HealthQ[0].qBNY[0]", "PrevApplied[0].qANY[0]", "PrevApplied[0].qBNY[0]", "PrevApplied[0].qCNY[0]", "Criminal[0].qANY[0]", "Military[0].qANY[0]", "Occupation[0].Choice[0]", "GovPosition[0].qGovtNY[0]", "Illtreatment[0].qWitnessNY[0]"].map((x) => p4 + x)],
];
for (const [form, file, expected] of forms) {
  const got = backgroundQuestions(reading(file));
  ok(`C3.8 [IRCC-F08] ${form}: every Background question, Q1 to Q6 (military, political party, ill-treatment included), by the form's own reading`, expected.length === got.size && expected.every((p) => got.has(p)), { missing: expected.filter((p) => !got.has(p)), extra: [...got.keys()].filter((p) => !expected.includes(p)) });
  const fields = reading(file);
  const not = (f: ReadField) => !!f.data_path && !got.has(f.data_path);
  const consent = fields.filter((f) => not(f) && f.ui === "exclGroup" && /Consent|Signature/.test(f.section ?? "")), earlier = fields.filter((f) => not(f) && f.ui === "exclGroup" && /Education|natID|USCard/.test(f.section ?? ""));
  const details = fields.filter((f) => not(f) && f.ui !== "exclGroup" && /BackgroundInfo|Military|Occupation|GovPosition|Illtreatment/.test(f.section ?? ""));
  ok(`C3.8 [IRCC-F08] ${form} fail case: its details and calculation boxes, its consent box and the yes/no questions of other sections are not Background questions`, consent.length > 0 && earlier.length >= 2 && details.length >= 5, { consent: consent.length, earlier: earlier.length, details: details.length });
}
ok("C3.8 [IRCC-F08] fail case: a reading with no \"BACKGROUND INFORMATION\" heading names none (whether a schedule's own background questions fall under IRCC-F08 is a question for the tech lead, QA-199 review Minor 2)", backgroundQuestions([{ data_path: "form1[0].Page1[0].Q[0].Choice[0]", ui: "exclGroup", heading: "PERSONAL DETAILS", section: "Page1.Q.Choice" }]).size === 0 && backgroundQuestions([]).size === 0);
ok("C3.8 [IRCC-F08] fail case: the questions stop at the form's consent and signature block", !backgroundQuestions(reading("imm1295e.inventory.json")).has("form1[0].Page4[0].Consent0[0].Choice[0]"));
const q5710 = backgroundQuestions(reading("imm5710e.inventory.json")).get(p4 + "Occupation[0].Choice[0]");
ok("C3.8 [IRCC-F08] (review Minor 3) a question with a blank caption is named by the form's own words above it (IMM 5710's government security question)", !!q5710 && /^Have you ever been employed by a government/.test(q5710) && backgroundWords("", q5710).startsWith(`"Have you ever been employed by a government`), q5710);
const rm = readingMissingWords("IMM 5257 (09-2023)");
ok("C3.8 [IRCC-F08] (review Minor 1) a reading that cannot be read says so and what to do, in plain words", /^The reading of IMM 5257 \(09-2023\) is missing on this computer/.test(rm) && /read the form again/.test(rm) && !/\[0\]/.test(rm), rm);
ok("C3.8 [IRCC-F08] both outcomes the page calls \"Not a fact\" count; mapped, filled by hand and undecided do not", NOT_A_FACT.has("not_a_fact") && NOT_A_FACT.has("never_filled") && !["mapped", "by_hand", "unresolved"].some((o) => NOT_A_FACT.has(o)));
const w = backgroundWords("Within the past two years, have you had tuberculosis?");
ok("C3.8 [IRCC-F08] the words name the question by its caption, say why (IRCC returns the application) and what to do", w.startsWith("\"Within the past two years") && /IRCC returns an application/.test(w) && /Map it to a shared field/.test(w) && /filled by hand/.test(w), w);
ok("C3.8 [IRCC-F08] fail case: with no caption the words never show a PDF path", backgroundWords(null).startsWith("This question") && !/\[0\]/.test(backgroundWords(null)), backgroundWords(null));

// P-319: the family information forms are the library's (each form's role); here the demo's two, as the library holds them.
const FAMILY = new Set(["IMM 5707", "IMM 5645"]);
ok("C3.8 [IRCC-F09] IMM 5707 in the package but not in the forms is missing", missingFamilyForm(["IMM 5257", "IMM 5707"], ["IMM 5257"], FAMILY) === "IMM 5707");
ok("C3.8 [IRCC-F09] pass case: IMM 5707 in the forms is not missing", missingFamilyForm(["IMM 5257", "IMM 5707"], ["IMM 5257", "IMM 5707"], FAMILY) === null);
ok("C3.8 [IRCC-F09] pass case: IMM 5645 in the forms fills the family information line the package lists as IMM 5707 (P-230 (6))", missingFamilyForm(["IMM 5707"], ["IMM 5645"], FAMILY) === null);
ok("C3.8 [IRCC-F09] a combination with no form yet gets no family information line (its \"No forms yet\" says it once, F8 M1)", missingFamilyForm(["IMM 5257", "IMM 5707"], [], FAMILY) === null);
ok("C3.8 [IRCC-F09] pass case: a package with no family information form asks for none", missingFamilyForm(["IMM 5257", "IMM 5476"], ["IMM 5257"], FAMILY) === null && missingFamilyForm([], [], FAMILY) === null);
ok("P-319 pass: a form the library marks as family information (here IMM 5406) fills the line; no form number is in the rule", missingFamilyForm(["IMM 5707"], ["IMM 5406"], new Set(["IMM 5707", "IMM 5406"])) === null && missingFamilyForm(["IMM 5406"], ["IMM 5257"], new Set(["IMM 5406"])) === "IMM 5406");
ok("P-319 fail: with no form marked family information, the package asks for none (it is the library's, not a list in the code)", missingFamilyForm(["IMM 5257", "IMM 5707"], ["IMM 5257"], new Set()) === null);
ok("C3.8 [IRCC-F09] the form number is read from the edition label; an unrecognised file has none", formNumberOf("IMM 5707 (01-2023)") === "IMM 5707" && formNumberOf("IMM 5257 SCH1 (09-2023)") === "IMM 5257 SCH1" && formNumberOf(null) === "");
const fw = familyFormWords("IMM 5707");
ok("C3.8 [IRCC-F09] the words say what is missing, why, and where to add it, in plain words", /^IMM 5707 \(Family Information\) is in this combination's application package but not in its forms/.test(fw) && /IRCC returns an application without it/.test(fw) && /Forms tab/.test(fw), fw);

process.exit(summary() ? 1 : 0);
