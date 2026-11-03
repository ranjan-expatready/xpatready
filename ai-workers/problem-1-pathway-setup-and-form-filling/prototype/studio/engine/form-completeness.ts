// C3.8 (validator): two IRCC completeness rules a field map and a combination's forms must keep. Pure, no database.
// [IRCC-F08] IMM 5257 page and Guide 5256: "Background Information All questions in this section must be answered or the
//   application will be considered incomplete and will be returned." (read 27 Oct and 19 Oct 2026; compliance-trace.md).
//   So a Background information question is never "not a fact": it is mapped to a shared field, or filled by hand.
// [IRCC-F09] Guide 5256: "You must complete the Family Information form (IMM 5707 or IMM 5645) listed in the application
//   package for your country." (read 19 Oct 2026). P-230 (6): IMM 5645 or IMM 5707 is one family-information line.

/** The outcomes that leave a form field unanswered on purpose ("Not a fact" on the page; `never_filled` reads the same). */
export const NOT_A_FACT = new Set(["not_a_fact", "never_filled"]);

/** One form field as the form's own reading lists it (tools/read_form.py, `<edition>.inventory.json` `fields`), in the
 *  form's order. Only what the Background rule reads. */
export type ReadField = { data_path?: string | null; section?: string | null; heading?: string | null; ui?: string | null };

/** [IRCC-F08] The Background information questions of one PDF edition, by the form's own reading (QA-199): every yes/no
 *  question (`exclGroup`) from the form's own "BACKGROUND INFORMATION" heading to its consent and signature block. Read
 *  from the form, never from a word in a path: IMM 5257, 1295 and 1294 put Q4 military, Q5 political party and Q6
 *  ill-treatment at `…Military[0]`, `…Occupation[0]` and `…GovPosition[0]`, and IMM 5710 names its boxes `qANY`, `qGovtNY`…
 *  The details boxes ("if yes, give details") and the form's own calculation box are text, not questions. A form with
 *  no Background information heading has none. Returns their data paths (the field map's `dataPath`), each with the
 *  form's own words above it (its heading), for a question whose own caption is blank (IMM 5710's security question). */
export function backgroundQuestions(fields: readonly ReadField[]): Map<string, string | null> {
  const out = new Map<string, string | null>();
  const start = fields.findIndex((f) => (f.heading ?? "").trim().toUpperCase() === "BACKGROUND INFORMATION");
  if (start < 0) return out;
  for (const f of fields.slice(start)) {
    if (/^(Consent|Signature|ButtonsFooter)/.test((f.section ?? "").split(".")[1] ?? "")) break; // the declaration starts
    if (f.ui === "exclGroup" && f.data_path) out.set(f.data_path, f.heading?.trim() || null);
  }
  return out;
}

/** The words for a Background question someone tried to mark "not a fact" (refusal and validator error alike): its
 *  caption, else the form's own words above it. */
export const backgroundWords = (caption: string | null | undefined, heading?: string | null) =>
  `${caption?.trim() ? `"${caption.trim()}"` : heading?.trim() ? `"${heading.trim()}"` : "This question"} is a Background information question: IRCC returns an application with one unanswered, so it cannot be "not a fact". Map it to a shared field the applicant answers, or mark it "filled by hand" with a reason.`;

/** The words when an edition's reading is recorded but cannot be read here: its Background questions cannot be named,
 *  so nothing is marked "not a fact" and release waits (fail closed, QA-199 review Minor 1). */
export const readingMissingWords = (form: string) =>
  `The reading of ${form} is missing on this computer, so its Background information questions cannot be checked: read the form again (Forms tab) before marking any of its form fields "not a fact" or releasing.`;

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
