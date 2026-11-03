// C3.8 (validator): two IRCC completeness rules a field map and a combination's forms must keep. Pure, no database.
// [IRCC-F08] IMM 5257 page and Guide 5256: "Background Information All questions in this section must be answered or the
//   application will be considered incomplete and will be returned." (read 27 Oct and 19 Oct 2026; compliance-trace.md).
//   So a Background information question is never "not a fact": it is mapped to a shared field, or filled by hand.
// [IRCC-F09] Guide 5256: "You must complete the Family Information form (IMM 5707 or IMM 5645) listed in the application
//   package for your country." (read 19 Oct 2026). P-230 (6): IMM 5645 or IMM 5707 is one family-information line.

/** The outcomes that leave a form field unanswered on purpose ("Not a fact" on the page; `never_filled` reads the same). */
export const NOT_A_FACT = new Set(["not_a_fact", "never_filled"]);

/** A Background information question of an IRCC form: a yes/no box (`Choice`, `VisaChoice1`…) inside a
 *  `BackgroundInfo…` section (IMM 5257, IMM 1295 and their schedules name them so). Its details box ("if yes, give
 *  details") and the form's own calculation box (`backgroundInfoCalc`) are not questions. */
export function isBackgroundQuestion(dataPath: string): boolean {
  const parts = dataPath.split(".");
  const last = parts[parts.length - 1] ?? "";
  return parts.some((p) => /^BackgroundInfo\d*\[\d+\]$/.test(p)) && /^(Visa)?Choice\d*\[\d+\]$/.test(last);
}

/** The words for a Background question someone tried to mark "not a fact" (refusal and validator error alike). */
export const backgroundWords = (caption: string | null | undefined) =>
  `${caption?.trim() ? `"${caption.trim()}"` : "This question"} is a Background information question: IRCC returns an application with one unanswered, so it cannot be "not a fact". Map it to a shared field the applicant answers, or mark it "filled by hand" with a reason.`;

/** The family information forms; either one fills the line (P-230 (6)). */
export const FAMILY_INFORMATION_FORMS = ["IMM 5707", "IMM 5645"] as const;
const isFamilyForm = (formNumber: string) => (FAMILY_INFORMATION_FORMS as readonly string[]).includes(formNumber);

/** The form number of an edition label ("IMM 5707 (01-2023)" → "IMM 5707"). */
export const formNumberOf = (editionLabel: string | null | undefined) => (editionLabel ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();

/** [IRCC-F09] The family information form the combination's application package lists (a source form attached to it)
 *  when none of its forms is a family information form; null when nothing is missing. A combination with no form yet
 *  gets none: its "No forms yet" line and the release's "Nothing to release" already say every form is missing (F8 M1). */
export function missingFamilyForm(attachedForms: string[], combinationForms: string[]): string | null {
  if (!combinationForms.length || combinationForms.some(isFamilyForm)) return null;
  return attachedForms.find(isFamilyForm) ?? null;
}

/** The validator's words for a missing family information form. */
export const familyFormWords = (formNumber: string) =>
  `${formNumber} (Family Information) is in this combination's application package but not in its forms. IRCC returns an application without it: on the Forms tab, add ${formNumber} from the library, or read it and draft its field map.`;
