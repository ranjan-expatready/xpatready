// C6.9 Staff eligibility page (runtime lane, M3-D; concept screens/C6.9/concept.md §6). Part 1: the eligibility gates an
// author saves on a combination's draft. The shape only; the rules that refuse a gate (BR-2, BR-2a) are in
// engine/eligibility-gates.ts, so the API and the tests share them. Pure (STANDARDS §6: contract first, zod).
import { z } from "zod";
import type { Gate, SnapshotEligibility } from "../engine/eligibility-gates.ts";
import { INVISIBLE, LONE } from "./runtime.ts";

/** PUT /combinations/:id/eligibility-gates. `version` is the one read; the first save needs none (BR-3). */
export const EligibilityGatesBody = z.object({
  gates: z.array(z.object({ key: z.unknown().optional(), label: z.unknown().optional(), condition: z.unknown().optional(), whenNotMet: z.unknown().optional() }, { error: "Each gate is { key, label, condition, whenNotMet? }." }), { error: "Send the list of gates." }).max(30, "At most 30 gates."),
  judgement: z.array(z.unknown(), { error: "Send the officer's judgement lines as a list." }).max(20, "At most 20 officer's judgement lines.").default([]),
  disclaimer: z.unknown().optional(),
  version: z.number({ error: "Reload the page: the version you read is not a number." }).int().optional(),
});

/** What PUT and GET answer. GET adds what the newest release carries (null before any release with gates). */
export type EligibilityGatesView = {
  gates: Gate[]; judgement: string[]; disclaimer: string | null; version: number; savedBy: string | null; savedAt: string | null;
  released?: (SnapshotEligibility & { release: number }) | null;
};

// ------------------------------------------------------------------ part 2: runs (BR-7, BR-8, BR-14)
const oneLine = (x: string) => !INVISIBLE.test(x) && !LONE.test(x) && !/[\t\n\r]/.test(x);
/** POST /runtime/cases/:id/assessments. `reason` is needed from a person's second run on (BR-14), checked by the API. */
export const AssessmentRunBody = z.object({
  person: z.string({ error: "Choose the person to check." }).min(1, "Choose the person to check."),
  reason: z.string({ error: "Give the reason as text." }).trim().max(300, "Keep the reason to 300 characters.").refine(oneLine, "Write the reason as one line of plain text.").optional(),
});
