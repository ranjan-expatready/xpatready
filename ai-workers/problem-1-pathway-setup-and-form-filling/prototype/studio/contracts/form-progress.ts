// F2 C2.12 slice 2 (forms lane; the agreed F3 plan §6, PDF only since P-102): one form's guided path on one combination.
// Calculated on every read from records the other screens keep (plan D5: never stored). Shared by the API and the web app.
export const PROGRESS_STATES = ["not_started", "running", "needs_you", "waiting_others", "done"] as const;
export type ProgressState = (typeof PROGRESS_STATES)[number];
export const STEP_KEYS = ["attach", "map", "review", "fields", "second_person", "complete"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
/** The six PDF steps (plan BR-3, steps 1–6; step 7, the online version, is parked with the extension, P-102). */
export const STEP_LABEL: Record<StepKey, string> = {
  attach: "Read the form and add it to this combination",
  map: "AI maps the form's fields to shared fields, or Add from the library",
  review: "Review the proposals and decide the form fields left",
  fields: "New shared fields are approved",
  second_person: "A second person checks held files and new editions",
  complete: "Field map complete for this combination",
};
export type ProgressStep = {
  n: number; key: StepKey; label: string; state: ProgressState;
  /** What stands now, in one plain sentence. */
  words: string;
  /** The asking person's one step here, when they can take it. */
  next: { label: string; href: string } | null;
  /** For waiting_others: who acts next. */
  who: string | null;
  /** How many things are open in this step (0 when done). */
  count: number;
};
export type FormProgress = {
  form: string; combination: string;
  steps: ProgressStep[];
  /** The first step not done; null when every step is done. */
  current: StepKey | null;
  /** The asking person's first step that can go ahead now (BR-4: when the current step waits for someone else, a later
   *  step this person can take meanwhile); null when there is none. */
  next_for_you: { step: StepKey; label: string; href: string } | null;
  /** Every step not done, with how many things are open and who acts. */
  whats_left: { step: StepKey; what: string; count: number; who: string | null; href: string | null }[];
};
