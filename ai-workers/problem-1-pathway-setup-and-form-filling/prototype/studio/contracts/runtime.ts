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
const text = (missing: string, min: number, max: number) => z.string({ message: missing }).trim().min(min, missing).max(max, `Keep it to ${max} characters.`).refine((x) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x), "Remove the control characters from this text.");

export const NewCase = z.object({
  combinationId: z.string({ message: "Choose a released combination." }).uuid("Choose a released combination."),
  reference: text("Give the case a reference of at least 3 characters.", 3, 80),
  /** The simulated client login that answers the questionnaire. */
  clientActor: text("Name the client who answers the questionnaire.", 1, 40),
  principal: z.object({ displayName: text("Give the principal applicant a display name.", 2, 120) }, { message: "Name the principal applicant." }),
  idempotencyKey: z.string().trim().min(8, "An idempotency key has at least 8 characters.").max(128).optional(),
});

export const NewPerson = z.object({
  role: z.enum(["spouse_or_partner", "child"], { message: "A person joins as a spouse or partner, or as a child." }),
  displayName: text("Give the person a display name.", 2, 120),
  applies: z.boolean().default(true),
  /** The same key again answers with the person already added (a double press adds one person, QA-28). */
  idempotencyKey: z.string().trim().min(8, "An idempotency key has at least 8 characters.").max(128).optional(),
});
export const UpdatePerson = z.object({ applies: z.boolean({ message: "Say whether the person is travelling (true or false)." }) });

/** Answer values stay small and flat: the largest real value (an address) is a few hundred characters. */
export const VALUE_LIMITS = { chars: 4000, depth: 3 } as const;
/** Any text in the value holds a control character other than tab, line feed or carriage return (QA-25). */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const hasControl = (v: unknown): boolean => (typeof v === "string" ? CONTROL.test(v) : !!v && typeof v === "object" && Object.entries(v as Record<string, unknown>).some(([k, x]) => CONTROL.test(k) || hasControl(x)));
const tooDeep = (v: unknown, d = 0): boolean => d > VALUE_LIMITS.depth || (!!v && typeof v === "object" && Object.values(v as Record<string, unknown>).some((x) => tooDeep(x, d + 1)));

/** One answer. expectedId is the id of the current answer the person saw (null when there was none): a different
 *  current answer means someone else changed it first (409 with the newer value). Invalid values are saved and flagged;
 *  validation never blocks saving (P-47). */
export const PutAnswer = z.object({
  value: z.unknown()
    .refine((v) => v !== undefined && v !== null && v !== "", "Give a value (to remove an answer, remove its row or leave it unanswered).")
    .refine((v) => !tooDeep(v), `An answer is at most ${VALUE_LIMITS.depth} levels deep.`)
    .refine((v) => (JSON.stringify(v) ?? "").length <= VALUE_LIMITS.chars, `An answer is at most ${VALUE_LIMITS.chars} characters.`)
    .refine((v) => !hasControl(v), "Remove the control characters from this answer (invisible characters pasted with the text)."),
  expectedId: z.string({ message: "Send the id of the answer you saw, or null when there was none." }).uuid("Send the id of the answer you saw, or null when there was none.").nullable(),
  row: z.string().uuid("Name the row by its id.").optional(),
});

export const NewRow = z.object({ group: z.string({ message: "Name the repeating group (its section)." }).trim().min(1, "Name the repeating group (its section).").max(80) });
/** "Confirm section" vouches for what the officer saw: the ids of the answers shown. Any answer that changed or arrived
 *  since is refused with 409 and listed, never confirmed unseen (STANDARDS §4). */
export const ConfirmSection = z.object({
  subjectId: z.string({ message: "Choose whose section to confirm." }).uuid("Choose whose section to confirm."),
  seen: z.array(z.string().uuid("Each reviewed answer is named by its id, as the questionnaire view gives it."), { message: "Send the ids of the answers you reviewed." }).max(500),
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
  fills: { form: string; person: string; boxes: number }[];
};
export type ViewSection = { subjectId: string; about_label: string; section: string; title: string; questions: ViewQuestion[]; answered: number; confirmed: number; invalid: number; missing: string[] };
/** A section check the case's answers trigger (RT-7, release data): a warning on the person's answers, never a block
 *  (P-71). fact and section place it on the question it concerns; null when the check names no one question. */
export type ViewCheck = { id: string; severity: string; message: string; subjectId: string; about_label: string; fact: string | null; section: string | null; illustrative: boolean };
export type QuestionnaireView = {
  mode: "sqr" | "agent"; sections: ViewSection[]; checks: ViewCheck[]; forms: { form: string; person: string; applies: boolean | string }[];
  summary: { not_asked: number; questions: number; answered: number; confirmed: number; missing: number };
};
