// C8.1 signed PDFs (runtime lane, M3-F; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; M3-CONTRACT C8.1): who signs a form
// item, in the team's words, and the order of the steps of a form signed by hand and scanned. Who signs is the
// resolver's one rule (SH3 R7, engine/resolver.ts formSigners); nothing here repeats it. Pure: no database (P-249).
import { FILING } from "../../contracts/resolver.ts";
import { formSigners, type Person } from "../resolver.ts";

/** Devin on #617: whether a person is a minor (under 18) on `today`, from their own answered date of birth; undefined when
 *  it is not answered (R7 then keeps a child a minor, as before). VV-R09: a child under 18 is signed for by a parent. */
export function minorFromAnswers(answers: { subjectId: string; field: string; rowKey: string | null; value: unknown }[], today: Date): (id: string) => boolean | undefined {
  const born = new Map<string, string>();
  for (const a of answers) if (a.field === "person.date_of_birth" && a.rowKey === null && typeof a.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(a.value)) born.set(a.subjectId, a.value.slice(0, 10));
  return (id) => {
    const d = born.get(id); if (!d) return undefined;
    const [y, m, day] = d.split("-").map(Number);
    const eighteen = new Date(Date.UTC(y + 18, m - 1, day));
    return today < eighteen;
  };
}

/** The steps of a form signed by hand and scanned, in order (C8.1-3). */
export const SIGN_STEPS = ["print", "signed", "scan_received", "uploaded_to_ircc"] as const;
export type SignStepKey = (typeof SIGN_STEPS)[number];
export const SIGN_STEP_WORDS: Record<SignStepKey, string> = { print: "Printed", signed: "Signed by hand", scan_received: "Signed scan received", uploaded_to_ircc: "Uploaded to IRCC" };
export const isSignStep = (k: string): k is SignStepKey => (SIGN_STEPS as readonly string[]).includes(k);

/** Who signs one form item, in words (C8.1-1, C8.1-2): "person" (the person the form is about), "parent" (the principal
 *  signing for a child, by role as R7 decides it), "principal" (the principal signing for the family) and "representative".
 *  From R7 for this item's own row: the person signs their own; whoever else R7 names signs for them. */
export function signersOf(people: Person[], subject: string, who: string, signedBy: string | null | undefined, minor?: (id: string) => boolean | undefined): string[] {
  const signers = [...formSigners(people, who, signedBy, minor)].filter(([, rows]) => rows.includes(subject) || (rows.includes(FILING) && people.find((p) => p.id === subject)?.role === "principal")).map(([id]) => id);
  const me = people.find((p) => p.id === subject), role = (id: string) => people.find((p) => p.id === id)?.role;
  const words = signers.map((id) => id === subject ? "person" : role(id) === "representative" ? "representative" : role(id) === "principal" ? (me?.role === "child" && (minor?.(subject) ?? true) ? "parent" : "principal") : role(id) ?? id);
  // The representative of record is on the case team, not among the case's people, so R7 cannot name them: a line signed
  // by "the person and the representative" names them here (who they are comes from the case team, C6.11).
  if (signedBy === "person_and_representative" && words.length) words.push("representative");
  const order = ["person", "parent", "principal", "representative"];
  return [...new Set(words)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export type StepsDone = Partial<Record<SignStepKey, { at: string; by: string; copy?: string | null }>>;

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

/** An item's state once signing has started: Ready when the signed scan is in, Done when it is uploaded to IRCC; else
 *  null (the state worked out from the facts stands). */
export function signedState(done: StepsDone, form: string): { state: "ready" | "done"; reason: string } | null {
  if (done.uploaded_to_ircc) return { state: "done", reason: `${form} is signed, its signed scan is in, and it is uploaded to IRCC.` };
  if (done.scan_received) return { state: "ready", reason: `${form} is signed by hand and its signed scan is in: upload it to IRCC once the filing is Ready to file.` };
  return null;
}
