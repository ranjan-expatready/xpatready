// C8.2 Record the submission (runtime lane, M3-F; M3-CONTRACT C8.2; r5c BR-11, BR-15, BR-21; AV-6, P-155, P-168): the
// request shapes of "Record the submission" (one per submission group) and "Correct a number", shared by the API and the
// case page (STANDARDS: contract first, zod). Pure. Every refusal names its field (Problem Details `errors[].field`).
import { z } from "zod";

/** Plain text a person typed: no control characters, hidden direction marks or zero-width spaces (as C6.12's reasons). */
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;
const plain = (what: string, max: number) => z.string({ error: `Write ${what} as text.` }).trim().max(max, `Keep ${what} under ${max} characters.`)
  .refine((x) => !HIDDEN.test(x) && !/[\ud800-\udfff]/u.test(x), `Write ${what} as plain text: it holds a hidden or control character.`);

/** One filing of the group as IRCC acknowledged it. `submitted_on` is checked against today by the server. */
export const RecordFiling = z.object({
  filing: z.string({ error: "Name the filing this line records." }),
  our_reference: plain("our reference", 100).refine((x) => x.length > 0, "Give our reference for this filing."),
  submitted_on: z.string({ error: "Give the date it was submitted." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Give the date it was submitted as a date (YYYY-MM-DD)."),
  application_number: z.string({ error: "Give the application number IRCC gave this filing." }).max(200, "That is too long to be an application number."),
  fee_receipt: plain("the fee receipt", 100).nullish(),
});
/** The UCI IRCC gave one person on the group. */
export const RecordUci = z.object({
  subject: z.string({ error: "Name the person this UCI is for." }),
  uci: plain("the UCI", 40).refine((x) => x.length > 0, "Give the UCI, or leave the person out."),
});
/** PATCH /api/runtime/groups/:gid/record: every filing of the group once, a UCI per person (optional), the version read. */
export const RecordSubmission = z.object({
  filings: z.array(RecordFiling, { error: "List the filings of this submission." }).min(1, "List the filings of this submission.").max(20),
  ucis: z.array(RecordUci, { error: "List the UCIs as a list (it may be empty)." }).max(40).default([]),
  version: z.union([z.string(), z.number()], { error: "Reload: the version you read is missing." }),
});
export type RecordSubmission = z.infer<typeof RecordSubmission>;

/** POST /api/runtime/filings/:id/record/corrections: the corrected application number (the contract's), or a person's
 *  UCI (break M3 on #924: a UCI typed wrong, or given later), and why. The old value is kept with the reason. */
export const CorrectNumber = z.object({
  application_number: z.string({ error: "Give the corrected application number." }).max(200, "That is too long to be an application number.").optional(),
  uci: z.object({ subject: z.string({ error: "Name the person whose UCI this is." }), uci: z.string({ error: "Give the UCI." }).max(200, "That is too long to be a UCI.") }, { error: "Send the UCI as { subject, uci }." }).optional(),
  reason: z.string({ error: "Say why the number is corrected: the old one is kept with your reason." }).pipe(plain("the reason", 400))
    .refine((x) => /[\p{L}\p{N}]/u.test(x), "Say why the number is corrected: the old one is kept with your reason."),
}).refine((b) => (b.application_number === undefined) !== (b.uci === undefined), { message: "Correct one thing at a time: the application number, or one person's UCI.", path: ["application_number"] });
export type CorrectNumber = z.infer<typeof CorrectNumber>;

/** The record of one filing as the Prepare view shows it. */
export type FilingRecordView = {
  portal: string | null; our_reference: string; submitted_on: string; application_number: string; fee_receipt: string | null;
  prepared_by: { id: string; name: string }; reviewed_by: { id: string; name: string; self: boolean } | null; recorded_by: string; recorded_at: string;
  /** Every person applying on the filing, with the UCI recorded for them (null: none given yet). */
  ucis: { subject: string; person: string; uci: string | null }[];
  corrections: { field: "application_number" | "uci"; person: string | null; before: string | null; after: string; reason: string; by: string; at: string }[];
};
/** A task a change after filing opened (BR-12, P-142 D7). */
export type CaseTaskView = { id: string; kind: "after_filing_change"; filing: string | null; item: string | null; words: string; state: "open" | "done"; created_at: string; done: { by: string; at: string } | null };
