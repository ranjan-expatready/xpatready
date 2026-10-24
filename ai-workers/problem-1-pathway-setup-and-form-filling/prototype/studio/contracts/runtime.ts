// Runtime contract (runtime lane, R1 thin slice, P-67): request shapes of the case, people, answer, row and confirm
// endpoints, shared by the API and later the web renderer (STANDARDS §6: contract first, zod). Answer values follow the
// shapes the PDF filler already reads (p5/transforms.ts Address and Phone), so a stored answer is written unchanged.
import { z } from "zod";

/** The case roles a combination's participants carry (Combination.participants[].role). */
export const ROLES = ["principal", "spouse_or_partner", "child"] as const;
export type CaseRole = (typeof ROLES)[number];

/** P-72 and P-78 (founder, 23 Oct: confirmed by who answered): a person's own answers and the principal's answers for a
 *  minor child count as confirmed; the principal's answers for an adult show "answered by the principal" and become
 *  confirmed when that adult confirms on their own link (not built in R1a) or the officer presses "Confirm section".
 *  The age and the fact it is read from are Sample until the immigration expert confirms them. Unconfirmed: no counsel. */
export const MINOR = { birthDateField: "person.date_of_birth", underAge: 18 } as const;

/** Text a person types: no NUL or other control characters (PostgreSQL refuses NUL; a refusal must be a 400, not a 500). */
/** Invisible characters a person never means to type (break report m1–m4): C0 and C1 controls, DEL, zero-width marks
 *  (not the emoji joiner), line and paragraph separators, bidi overrides and isolates, the byte-order mark. Tab, line
 *  feed and carriage return stay allowed in answers (long text). */
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069\ufeff]/;
/** Half of a surrogate pair on its own: not a character; PostgreSQL refuses it (a 500 before, break report m1). */
const LONE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
const clean = (x: string) => !INVISIBLE.test(x) && !/[\t\n\r]/.test(x) && !LONE.test(x);
const text = (missing: string, min: number, max: number) => z.string({ message: missing }).trim().min(min, missing).max(max, `Keep it to ${max} characters.`).refine(clean, "Remove the control or invisible characters from this text.");
/** An idempotency key: visible ASCII only, so it is stored and compared exactly. */
const idemKey = z.string({ message: "An idempotency key is text." }).trim().min(8, "An idempotency key has at least 8 characters.").max(128, "An idempotency key has at most 128 characters.").regex(/^[\x21-\x7e]+$/, "An idempotency key is letters, digits and punctuation, without spaces.");

export const NewCase = z.object({
  combinationId: z.string({ message: "Choose a released combination." }).uuid("Choose a released combination."),
  reference: text("Give the case a reference of at least 3 characters.", 3, 80),
  /** The simulated client login that answers the questionnaire. */
  clientActor: text("Name the client who answers the questionnaire.", 1, 40),
  principal: z.object({ displayName: text("Give the principal applicant a display name.", 2, 120) }, { message: "Name the principal applicant." }),
  idempotencyKey: idemKey.optional(),
});

export const NewPerson = z.object({
  role: z.enum(["spouse_or_partner", "child"], { message: "A person joins as a spouse or partner, or as a child." }),
  displayName: text("Give the person a display name.", 2, 120),
  applies: z.boolean({ message: "Say whether the person is travelling (true or false)." }).default(true),
  /** The same key again answers with the person already added (a double press adds one person, QA-28). */
  idempotencyKey: idemKey.optional(),
});
export const UpdatePerson = z.object({ applies: z.boolean({ message: "Say whether the person is travelling (true or false)." }) });

/** Answer values stay small and flat: the largest real value (an address) is a few hundred characters. */
export const VALUE_LIMITS = { chars: 4000, depth: 3 } as const;
/** Any text in the value holds a control character other than tab, line feed or carriage return (QA-25). */
const bad = (x: string) => INVISIBLE.test(x) || LONE.test(x);
const hasControl = (v: unknown, d = 0): boolean => d <= VALUE_LIMITS.depth + 1 && (typeof v === "string" ? bad(v) : !!v && typeof v === "object" && Object.entries(v as Record<string, unknown>).some(([k, x]) => bad(k) || hasControl(x, d + 1)));
/** JSON length that never overflows the stack on a hostile, very deep value (that value is refused for its depth). */
const jsonLength = (v: unknown) => { try { return (JSON.stringify(v) ?? "").length; } catch { return Infinity; } };
const tooDeep = (v: unknown, d = 0): boolean => d > VALUE_LIMITS.depth || (!!v && typeof v === "object" && Object.values(v as Record<string, unknown>).some((x) => tooDeep(x, d + 1)));

/** One answer. expectedId is the id of the current answer the person saw (null when there was none): a different
 *  current answer means someone else changed it first (409 with the newer value). Invalid values are saved and flagged;
 *  validation never blocks saving (P-47). */
export const PutAnswer = z.object({
  value: z.unknown()
    .refine((v) => v !== undefined && v !== null && v !== "", "Give a value (to remove an answer, remove its row or leave it unanswered).")
    .refine((v) => !tooDeep(v), `An answer is at most ${VALUE_LIMITS.depth} levels deep.`)
    .refine((v) => jsonLength(v) <= VALUE_LIMITS.chars, `An answer is at most ${VALUE_LIMITS.chars} characters.`)
    .refine((v) => !hasControl(v), "Remove the control characters from this answer (invisible characters pasted with the text)."),
  expectedId: z.string({ message: "Send the id of the answer you saw, or null when there was none." }).uuid("Send the id of the answer you saw, or null when there was none.").nullable(),
  row: z.string().uuid("Name the row by its id.").optional(),
});

export const NewRow = z.object({ group: z.string({ message: "Name the repeating group (its section)." }).trim().min(1, "Name the repeating group (its section).").max(80) });
/** "Confirm section" vouches for what the officer saw: the ids of the answers shown. Any answer that changed or arrived
 *  since is refused with 409 and listed, never confirmed unseen (STANDARDS §4). */
export const ConfirmSection = z.object({
  subjectId: z.string({ message: "Choose whose section to confirm." }).uuid("Choose whose section to confirm."),
  seen: z.array(z.string().uuid("Each reviewed answer is named by its id, as the questionnaire view gives it."), { message: "Send the ids of the answers you reviewed." }).max(500, "Send at most 500 reviewed answer ids; confirm a long section in parts."),
});

export const Address = z.object({ po_box: z.string().optional(), apt_unit: z.string().optional(), street_number: z.string().optional(), street_name: z.string().optional(), city: z.string().optional(), district: z.string().optional(), province: z.string().optional(), postal_code: z.string().optional(), country: z.string().optional() });
export const Phone = z.object({ type: z.string().optional(), country_code: z.string().optional(), number: z.string().optional(), extension: z.string().optional() });

/** Words shown for an answer's confirmation (P-72). */
export const CONFIRM_WORDS = {
  officer: "Confirmed by the officer",
  client_own: "Counts as confirmed: the client's own answer",
  waits: "Waits for the officer's \"Confirm section\"",
  by_principal: "Answered by the principal for an adult: confirmed once that person confirms on their own link or the officer presses \"Confirm section\"",
} as const;

/** The questionnaire view (GET /api/runtime/cases/:id/questionnaire): what the engine computes and the web renderer
 *  reads, one shape for both (engine/runtime/case.ts caseView returns it). */
/** answered: who first gave the answer, when this version is the officer's confirmation of it (review M4). */
export type ViewAnswer = { id: string; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; by: string; at: string; answered: { channel: string; by: string; at: string } | null; problems: string[]; confirmed: boolean; why: string };
export type ViewQuestion = {
  subjectId: string; about_label: string; fact: string; label: string; meaning: string; value_type: string;
  shape: { maxLength: number; datePrecision: "day" | "month"; phone: boolean; money: boolean; choices: string[] | null };
  section: string; section_title: string; collected_from: string; required: boolean; hidden: boolean; why: string;
  /** The repeating group (its section) when the question is asked per row; capacity is the rows the forms hold. */
  group: string | null; capacity: number | null;
  answer: ViewAnswer | null;
  rows: { row: string; index: number; fits: boolean; answer: ViewAnswer | null }[];
  options: { key: string; label: string }[] | null; note: string | null;
  /** Country names offered while typing a country that has no answer list yet (the release's country list). */
  countries: string[] | null;
  /** Each form this fact fills, for whom (subject: the person's id, so two people with one name never mix) and how many form fields. */
  fills: { form: string; person: string; subject: string; boxes: number }[];
};
export type ViewSection = { subjectId: string; about_label: string; section: string; title: string; questions: ViewQuestion[]; answered: number; confirmed: number; invalid: number; missing: string[] };
/** A section check the case's answers trigger (RT-7, release data): a warning on the person's answers, never a block
 *  (P-71). fact and section place it on the question it concerns; null when the check names no one question. */
export type ViewCheck = { id: string; severity: string; message: string; subjectId: string; about_label: string; fact: string | null; section: string | null; illustrative: boolean };
export type QuestionnaireView = {
  mode: "sqr" | "agent"; sections: ViewSection[]; checks: ViewCheck[]; forms: { form: string; person: string; applies: boolean | string }[];
  summary: { not_asked: number; questions: number; answered: number; confirmed: number; missing: number };
};

// ------------------------------------------------------------------ R1d: form copies (plan §8 RT-13…RT-17)
/** "Generate a copy": a new copy each time the officer asks (never on its own); the same key again answers with it. */
export const GenerateCopy = z.object({ idempotencyKey: idemKey.optional() });
/** A copy is locked when its validated copy was uploaded back or it was filed; a locked copy never changes (P-65 d). */
export const LOCK_KINDS = { validated_copy_uploaded: "Validated copy uploaded back", filed: "Filed" } as const;
export const LockCopy = z.object({ kind: z.enum(["validated_copy_uploaded", "filed"], { message: "Say how the copy was locked: validated copy uploaded back, or filed." }) });

/** One copy as the agent view shows it: its state, whether today's confirmed facts differ from those it read (out of
 *  date; on a locked copy: stale), and what changed. */
export type FormCopy = {
  id: string; status: "QUEUED" | "RUNNING" | "GENERATED" | "FAILED"; created_at: string; created_by: string; finished_at: string | null; error: string | null;
  locked: { kind: keyof typeof LOCK_KINDS; at: string; by: string } | null; out_of_date: boolean; stale: boolean; changed: string[];
  counts: { written: number; by_hand: number; blank: number; not_written: number; by_a_person: number } | null; intact: boolean | null; person_steps: string[];
  /** Form fields the officer writes by hand in Adobe, each with its question and why (review M3). */
  by_hand: { label: string; why: string }[];
  /** The copy's file is on disk and unchanged; false: it cannot be handed over (break m1). */
  file_ok: boolean;
};
/** One form for one person on the case: what a copy made now would write (the draft), whether it can be filed (P-71),
 *  and every copy made, newest first. */
export type CaseForm = {
  form: string; title: string; subject_id: string; person: string; draft: { written_now: number; mapped: number; unconfirmed: number };
  readiness: Readiness; copies: FormCopy[];
  /** The evidence lane's fill trial for this form passed (P-65 (a)); until it does a copy is "Checked copy, not for filing". */
  trial_passed: boolean;
  /** The form no longer applies to this person (for example marked not travelling); its copies stay listed (break M4). */
  applies: boolean;
};
/** P-71: what blocks filing one form for one person. missing: a required fact not answered, answered but not confirmed,
 *  or confirmed with a problem (it would be written wrong). empty_groups: repeating groups the form reads with no entries
 *  (shown before filing; whether a group needs one entry is configuration, not known yet). */
export type Readiness = { ready: boolean; missing: { fact: string; label: string; about: string; reason: "not answered" | "not confirmed" | "needs a fix" }[]; empty_groups: string[] };

/** Which forms an answer fills, short enough for a household (Lead, R1d early look): one line per form, the person named
 *  when there is one, else how many people ("IMM 5257 for 6 people"); with counts, the form fields it fills (P-63). */
export function fillsText(fills: { form: string; person: string; subject?: string; boxes: number }[], counts = false): string {
  const byForm = new Map<string, { person: string; boxes: number }[]>();
  for (const f of fills) byForm.set(f.form, [...(byForm.get(f.form) ?? []), f]);
  return [...byForm].map(([form, list]) => {
    const n = list.reduce((s, x) => s + x.boxes, 0), fields = counts ? ` (${n} form field${n === 1 ? "" : "s"})` : "";
    return `${form} for ${list.length === 1 ? list[0].person : `${list.length} people`}${fields}`;
  }).join(", ");
}

/** Why a copy cannot be locked yet (P-71, Lead R1d early look): the same words in the API and on the button. */
export const notReady = (n: number) => `${n} fact${n === 1 ? "" : "s"} to confirm before filing: confirm ${n === 1 ? "it" : "them"}, then generate a new copy.`;
