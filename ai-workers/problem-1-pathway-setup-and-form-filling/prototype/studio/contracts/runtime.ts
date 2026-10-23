// Runtime contract (runtime lane, R1 thin slice, P-67): request shapes of the case, people, answer, row and confirm
// endpoints, shared by the API and later the web renderer (STANDARDS §6: contract first, zod). Answer values follow the
// shapes the PDF filler already reads (p5/transforms.ts Address and Phone), so a stored answer is written unchanged.
import { z } from "zod";

/** The case roles a combination's participants carry (Combination.participants[].role). */
export const ROLES = ["principal", "spouse_or_partner", "child"] as const;
export type CaseRole = (typeof ROLES)[number];

/** P-72 with founder question 1 (recommended, pending the founder): a client's own typed answers count as confirmed
 *  for the principal and a minor child; an adult's other answers wait for the officer's "Confirm section". The age and
 *  the fact it is read from are Sample until the founder and the immigration expert confirm them. */
export const MINOR = { birthDateField: "person.date_of_birth", underAge: 18 } as const;

export const NewCase = z.object({
  combinationId: z.string().uuid("Choose a released combination."),
  reference: z.string().trim().min(3, "Give the case a reference of at least 3 characters.").max(80),
  /** The simulated client login that answers the questionnaire. */
  clientActor: z.string().trim().min(1, "Name the client who answers the questionnaire."),
  principal: z.object({ displayName: z.string().trim().min(2, "Give the principal applicant a display name.").max(120) }),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export const NewPerson = z.object({
  role: z.enum(["spouse_or_partner", "child"], { message: "A person joins as a spouse or partner, or as a child." }),
  displayName: z.string().trim().min(2, "Give the person a display name.").max(120),
  applies: z.boolean().default(true),
});
export const UpdatePerson = z.object({ applies: z.boolean() });

/** One answer. expectedId is the id of the current answer the person saw (null when there was none): a different
 *  current answer means someone else changed it first (409 with the newer value). Invalid values are saved and flagged;
 *  validation never blocks saving (P-47). */
export const PutAnswer = z.object({
  value: z.unknown().refine((v) => v !== undefined && v !== null && v !== "", "Give a value (to remove an answer, remove its row or leave it unanswered)."),
  expectedId: z.string().uuid().nullable(),
  row: z.string().uuid().optional(),
});

export const NewRow = z.object({ group: z.string().trim().min(1) });
export const ConfirmSection = z.object({ subjectId: z.string().uuid("Choose whose section to confirm.") });

export const Address = z.object({ po_box: z.string().optional(), apt_unit: z.string().optional(), street_number: z.string().optional(), street_name: z.string().optional(), city: z.string().optional(), district: z.string().optional(), province: z.string().optional(), postal_code: z.string().optional(), country: z.string().optional() });
export const Phone = z.object({ type: z.string().optional(), country_code: z.string().optional(), number: z.string().optional(), extension: z.string().optional() });

/** Words shown for an answer's confirmation (P-72). */
export const CONFIRM_WORDS = {
  officer: "Confirmed by the officer",
  client_own: "Counts as confirmed: the client's own answer",
  waits: "Waits for the officer's \"Confirm section\"",
} as const;
