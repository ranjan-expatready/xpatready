// C6.9 Staff eligibility page (runtime lane, M3-D; concept screens/C6.9/concept.md §6). Part 1: the eligibility gates an
// author saves on a combination's draft. The shape only; the rules that refuse a gate (BR-2, BR-2a) are in
// engine/eligibility-gates.ts, so the API and the tests share them. Pure (STANDARDS §6: contract first, zod).
import { z } from "zod";
import type { Gate, SnapshotEligibility } from "../engine/eligibility-gates.ts";

/** PUT /combinations/:id/eligibility-gates. `version` is the one read; the first save needs none (BR-3). */
export const EligibilityGatesBody = z.object({
  gates: z.array(z.object({ key: z.unknown().optional(), label: z.unknown().optional(), condition: z.unknown().optional() }, { error: "Each gate is { key, label, condition }." }), { error: "Send the list of gates." }).max(30, "At most 30 gates."),
  judgement: z.array(z.unknown(), { error: "Send the officer's judgement lines as a list." }).max(20, "At most 20 officer's judgement lines.").default([]),
  disclaimer: z.unknown().optional(),
  version: z.number({ error: "Reload the page: the version you read is not a number." }).int().optional(),
});

/** What PUT and GET answer. GET adds what the newest release carries (null before any release with gates). */
export type EligibilityGatesView = {
  gates: Gate[]; judgement: string[]; disclaimer: string | null; version: number; savedBy: string | null; savedAt: string | null;
  released?: (SnapshotEligibility & { release: number }) | null;
};
