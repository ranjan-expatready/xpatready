// B86 (QA-237, C4.11): "Form fields that read this answer", as the API gives it and the panel reads it.
export type FormFieldState = "not_confirmed" | "waiting" | "returned" | "confirmed" | "different" | "no_words" | "worked_out" | "asked"; // B88: "asked", a worked-out Yes/No asked as its deciding question
export type FormFieldRow = { form: string; edition: string; form_edition_id: string; data_path: string; caption: string; words: string; state: FormFieldState; change_id: string | null; why: string | null; warning: string | null;
  /** B88: the form's printed question beside the deciding question, for a worked-out Yes/No that can be (or is) asked as it. */
  asks: { printed: string; deciding: string; writes: string } | null; can_confirm: boolean; can_ask: boolean; can_undo: boolean };
export type FormFieldsOfQuestion = { fact: string; question: string; sentence: string | null; why: string | null; rows: FormFieldRow[]; spread: string | null };
/** Every question of a combination with a SHOW condition, or a form field holding one (one request for Review and release). */
export type FormFieldsOfCombination = { questions: FormFieldsOfQuestion[] };
