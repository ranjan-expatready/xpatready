// C3.8 (validator) completeness rules in engine/form-completeness.ts, each with a passing and a failing case. Pure: no
// database, no server, no model call (US$0). The API and the validator on real data: acceptance/C3.8.test.ts AT-3, AT-8.
//   [IRCC-F08] a Background information question is never "not a fact"
//   [IRCC-F09] the family information form the application package lists is in the combination's forms
//   tsx studio/tests/check_c38_completeness.ts
import { backgroundWords, familyFormWords, formNumberOf, isBackgroundQuestion, missingFamilyForm, NOT_A_FACT } from "../engine/form-completeness.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();

// IMM 5257 (09-2023) and IMM 1295 (09-2023) form field paths, as the library holds them.
const questions = ["form1[0].Page3[0].BackgroundInfo[0].Choice[0]", "form1[0].Page3[0].BackgroundInfo[0].Choice[1]", "form1[0].Page3[0].BackgroundInfo2[0].VisaChoice1[0]",
  "form1[0].Page3[0].BackgroundInfo2[0].Details[0].VisaChoice3[0]", "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].Choice[0]", "form1[0].Page4[0].BackgroundInfo2[0].VisaChoice2[0]"];
const notQuestions = ["form1[0].Page3[0].BackgroundInfo[0].Details[0].MedicalDetails[0]", "form1[0].Page3[0].BackgroundInfo[0].backgroundInfoCalc[0]", "form1[0].Page3[0].BackgroundInfo2[0].Details[0].refusedDetails[0]",
  "form1[0].Page1[0].PersonalDetails[0].Choice[0]", "form1[0].Page1[0].MaritalStatus[0].SectionA[0].Choice[0]", "form1[0].Page3[0].NotBackgroundInfo[0].Choice[0]"];
ok("C3.8 [IRCC-F08] every yes/no box of a Background information section is a Background question (IMM 5257, IMM 1295)", questions.every(isBackgroundQuestion), questions.filter((q) => !isBackgroundQuestion(q)));
ok("C3.8 [IRCC-F08] fail case: a details box, the form's calculation box and a Choice outside Background information are not", !notQuestions.some(isBackgroundQuestion), notQuestions.filter(isBackgroundQuestion));
ok("C3.8 [IRCC-F08] both outcomes the page calls \"Not a fact\" count; mapped, filled by hand and undecided do not", NOT_A_FACT.has("not_a_fact") && NOT_A_FACT.has("never_filled") && !["mapped", "by_hand", "unresolved"].some((o) => NOT_A_FACT.has(o)));
const w = backgroundWords("Within the past two years, have you had tuberculosis?");
ok("C3.8 [IRCC-F08] the words name the question by its caption, say why (IRCC returns the application) and what to do", w.startsWith("\"Within the past two years") && /IRCC returns an application/.test(w) && /Map it to a shared field/.test(w) && /filled by hand/.test(w), w);
ok("C3.8 [IRCC-F08] fail case: with no caption the words never show a PDF path", backgroundWords(null).startsWith("This question") && !/\[0\]/.test(backgroundWords(null)), backgroundWords(null));

ok("C3.8 [IRCC-F09] IMM 5707 in the package but not in the forms is missing", missingFamilyForm(["IMM 5257", "IMM 5707"], ["IMM 5257"]) === "IMM 5707");
ok("C3.8 [IRCC-F09] pass case: IMM 5707 in the forms is not missing", missingFamilyForm(["IMM 5257", "IMM 5707"], ["IMM 5257", "IMM 5707"]) === null);
ok("C3.8 [IRCC-F09] pass case: IMM 5645 in the forms fills the family information line the package lists as IMM 5707 (P-230 (6))", missingFamilyForm(["IMM 5707"], ["IMM 5645"]) === null);
ok("C3.8 [IRCC-F09] a combination with no form yet gets no family information line (its \"No forms yet\" says it once, F8 M1)", missingFamilyForm(["IMM 5257", "IMM 5707"], []) === null);
ok("C3.8 [IRCC-F09] pass case: a package with no family information form asks for none", missingFamilyForm(["IMM 5257", "IMM 5476"], ["IMM 5257"]) === null && missingFamilyForm([], []) === null);
ok("C3.8 [IRCC-F09] the form number is read from the edition label; an unrecognised file has none", formNumberOf("IMM 5707 (01-2023)") === "IMM 5707" && formNumberOf("IMM 5257 SCH1 (09-2023)") === "IMM 5257 SCH1" && formNumberOf(null) === "");
const fw = familyFormWords("IMM 5707");
ok("C3.8 [IRCC-F09] the words say what is missing, why, and where to add it, in plain words", /^IMM 5707 \(Family Information\) is in this combination's application package but not in its forms/.test(fw) && /IRCC returns an application without it/.test(fw) && /Forms tab/.test(fw), fw);

process.exit(summary() ? 1 : 0);
