// P-179 (C11.8): the cost check every AI start's plan carries (`cost_check`, `run_key`), the one request that records a
// person's Continue past a limit (POST /ai/overrides), and the words the shared CostWarning dialog shows. Shared by the
// API (engine/cost-check.ts fills it) and the web app (components/cost-warning.tsx). Hard limits stay the default.
import { z } from "zod";

export const COST_LIMITS = ["run", "attempts", "experiment", "wave"] as const;
export type CostLimit = (typeof COST_LIMITS)[number];
export type CostOver = { limit: CostLimit; limit_usd: number | null; after_usd: number | null; words: string };
export type CostCheck = {
  /** Every limit fits: the start goes ahead with no dialog. */
  ok: boolean; over: CostOver[];
  /** Over a limit and within the ceiling (the experiment cap + 10%): a person may Continue for this run's worst case. */
  can_continue: boolean; words: string;
  expected_usd: number | null; worst_usd: number; spent_usd: number; cap_usd: number; ceiling_usd: number;
  wave: { name: string; spent_usd: number; cap_usd: number };
};

/** POST /ai/overrides: Continue past `limits` for the start the person looked at (`start` lets the server make that plan
 *  again; its run key, worst case and limits must be the same now). Author only. Answers `{ override_id, expires_at }`. */
export const OverrideStart = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("draft_field_maps"), scope: z.object({ kind: z.enum(["catalogue", "program", "combination", "source"]), ids: z.array(z.string()).max(400) }), mode: z.enum(["LIVE", "REPLAY", "STUB"]), draftAgain: z.boolean().optional() }),
  z.object({ kind: z.literal("find_forms"), combinationId: z.string().min(1), mode: z.enum(["live", "replay", "rules"]), pageUrl: z.string().optional(), only: z.array(z.string()).max(30).optional() }),
], { message: "Say which start this Continue is for." });
export const OverrideBody = z.object({
  run_key: z.string().regex(/^[0-9a-f]{40}$/, "Look at the cost first: the run key is missing."),
  worst_usd: z.number({ message: "Say the worst case you saw, in US$." }).finite().min(0),
  limits: z.array(z.enum(COST_LIMITS)).min(1, "Say which limit to continue past.").max(4),
  start: OverrideStart,
});
export type OverrideStartBody = z.infer<typeof OverrideStart>;
export type OverrideReply = { override_id: string; expires_at: string };
/** What a started run carries to its launches (kept on the run's plan). */
export type OverrideRef = { id: string; run_key: string; limits: CostLimit[] };

const usd = (n: number | null | undefined) => (n == null ? "not known yet" : `US$${n.toFixed(2)}`);
export const LIMIT_NAMES: Record<CostLimit, string> = { run: "One run's limit", attempts: "Paid attempts per form", experiment: "AI spending cap", wave: "Wave limit" };
/** The dialog's words (STANDARDS: plain, one term per thing). */
export const COST_WORDS = {
  title: "This start is over a cost limit",
  titleCeiling: "This start is past what a click may allow",
  expected: (c: CostCheck) => `Expected ${usd(c.expected_usd)}`,
  worst: (c: CostCheck) => `At most ${usd(c.worst_usd)}`,
  spent: (c: CostCheck) => `Spend so far ${usd(c.spent_usd)} of ${usd(c.cap_usd)}`,
  wave: (c: CostCheck) => `${c.wave.name}: ${usd(c.wave.spent_usd)} of ${usd(c.wave.cap_usd)}`,
  continueNote: (c: CostCheck) => `Continue records your name and allows this one run, up to ${usd(c.worst_usd)}. Total spend stays within ${usd(c.ceiling_usd)}.`,
  ceilingNote: "The founder must raise the cap before this can start.",
  continue: "Continue",
  cancel: "Cancel",
  cancelled: "Cancelled: nothing was started and nothing was spent.",
};
