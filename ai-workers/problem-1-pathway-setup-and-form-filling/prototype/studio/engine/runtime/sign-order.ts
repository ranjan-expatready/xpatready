// C8.1 signed PDFs: the steps of a form signed by hand and scanned, their words and the order rule, alone in a file with
// no import so the browser reads the same words the server refuses with (B3 challenge M3: STANDARDS §7, no duplicated
// logic between web and API). engine/runtime/signing.ts re-exports all of it. Pure: no database (P-249).

/** The steps of a form signed by hand and scanned, in order (C8.1-3). */
export const SIGN_STEPS = ["print", "signed", "scan_received", "uploaded_to_ircc"] as const;
export type SignStepKey = (typeof SIGN_STEPS)[number];
export const SIGN_STEP_WORDS: Record<SignStepKey, string> = { print: "Printed", signed: "Signed by hand", scan_received: "Signed scan received", uploaded_to_ircc: "Uploaded to IRCC" };
export const isSignStep = (k: string): k is SignStepKey => (SIGN_STEPS as readonly string[]).includes(k);

/** B132 (C7.7 part 2, P-380 Q3): the recorded steps of a form signed in pen on Paper, in order: Printed, then Signed in
 *  pen (its Validate, for a barcode form, is the validated copy read back, not a step recorded here; Mail is not yet). */
export const PEN_STEPS = ["print", "sign_in_pen"] as const;
export type PenStepKey = (typeof PEN_STEPS)[number];
export const PEN_STEP_WORDS: Record<PenStepKey, string> = { print: "Printed", sign_in_pen: "Signed in pen" };
export const isPenStep = (k: string): k is PenStepKey => (PEN_STEPS as readonly string[]).includes(k);

export type StepsDone = Partial<Record<SignStepKey | PenStepKey, { at: string; by: string; copy?: string | null }>>;

/** The refusal, in words, for doing `key` now (null when it may be done). "scan_received" is done only by uploading the
 *  signed scan; "uploaded_to_ircc" only once the scan is in and the filing is Ready to file (BR-21). */
export function stepRefusal(key: SignStepKey, done: StepsDone, form: string, opts: { viaUpload?: boolean; filingReady?: boolean } = {}): string | null {
  if (done[key]) return `${SIGN_STEP_WORDS[key]} is already done for ${form}.`;
  const i = SIGN_STEPS.indexOf(key), before = SIGN_STEPS[i - 1];
  if (before && !done[before]) return `${SIGN_STEP_WORDS[key]} comes after "${SIGN_STEP_WORDS[before]}": ${before === "print" ? `print ${form} first` : before === "signed" ? `mark ${form} signed by hand first` : `upload the signed scan of ${form} first`}.`;
  if (key === "scan_received" && !opts.viaUpload) return `Upload the signed scan of ${form}: that marks it received.`;
  if (key === "uploaded_to_ircc" && !opts.filingReady) return `${form} is uploaded to IRCC only once its filing is Ready to file.`;
  return null;
}

/** B132: the refusal, in words, for doing a Paper (pen) step now, or null. A barcode form is printed only once its
 *  validated copy is read back for today's facts (P-144: IRCC returns it unprocessed without its barcode page). */
export function penRefusal(key: PenStepKey, done: StepsDone, form: string, opts: { barcode: boolean; validated: boolean }): string | null {
  if (done[key]) return `${PEN_STEP_WORDS[key]} is already done for ${form}.`;
  if (key === "print" && opts.barcode && !opts.validated) return `Printed comes after the validated copy of ${form} is read back: make the copy, press Validate in Adobe (this adds its barcode page), save it and read it back first.`;
  if (key === "sign_in_pen" && !done.print) return `Signed in pen comes after "Printed": print ${form} first.`;
  return null;
}
