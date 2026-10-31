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
  /** US$ other Continues chosen in the last 10 minutes still hold until their runs start (N6): past the ceiling with them,
   *  no Continue until they start or expire. */
  held_usd: number;
  wave: { name: string; spent_usd: number; cap_usd: number };
};

/** POST /ai/overrides: Continue past `limits` for the start the person looked at (`start` lets the server make that plan
 *  again; its run key, worst case and limits must be the same now). Author only. Answers `{ override_id, expires_at }`. */
// Break m5: strict, so a field the server does not know is refused in words instead of dropped without a word.
const unknownField = { error: (i: { code?: string }) => (i.code === "unrecognized_keys" ? "This Continue carries a field the server does not know. Look at the cost again." : undefined) };
export const OverrideStart = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("draft_field_maps"), scope: z.strictObject({ kind: z.enum(["catalogue", "program", "combination", "source"]), ids: z.array(z.string()).max(400) }, unknownField), mode: z.enum(["LIVE", "REPLAY", "STUB"]), draftAgain: z.boolean().optional() }, unknownField),
  z.strictObject({ kind: z.literal("find_forms"), combinationId: z.string().min(1), mode: z.enum(["live", "replay", "rules"]), pageUrl: z.string().optional(), only: z.array(z.string()).max(30).optional() }, unknownField),
], { message: "Say which start this Continue is for." });
export const OverrideBody = z.strictObject({
  run_key: z.string().regex(/^[0-9a-f]{40}$/, "Look at the cost first: the run key is missing."),
  worst_usd: z.number({ message: "Say the worst case you saw, in US$." }).finite().min(0),
  limits: z.array(z.enum(COST_LIMITS)).min(1, "Say which limit to continue past.").max(4),
  start: OverrideStart,
  /** Optional words the person adds (kept on the ledger line and in the audit). */
  // Break n3 (N6): a control character (NUL and the like) cannot be stored with the audit, so it is refused before anything
  // is written; a line break or a tab is kept.
  reason: z.string().max(500, "Keep the reason under 500 characters.").regex(/^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/, "The reason has a character that cannot be stored (a control character). Type it again; nothing was recorded.")
    // Break 3 m5: a lone surrogate (half of an emoji) cannot be stored either.
    .refine((s) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s), "The reason has a character that cannot be stored (half of a character). Type it again; nothing was recorded.").optional(),
}, unknownField);
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
  // Review m4: one label and one rounding with Draft setup and Sources ("Spent so far", cents by toFixed(2)).
  spent: (c: CostCheck) => `Spent so far ${usd(c.spent_usd)} of ${usd(c.cap_usd)}`,
  description: "Nothing is spent until you choose.",
  wave: (c: CostCheck) => `${c.wave.name}: ${usd(c.wave.spent_usd)} of ${usd(c.wave.cap_usd)}`,
  continueNote: (c: CostCheck) => `Continue records your name and allows this one run, up to ${usd(c.worst_usd)}. Total spend stays within ${usd(c.ceiling_usd)}.`,
  ceilingNote: "The founder must raise the cap before this can start.",
  continue: "Continue",
  cancel: "Cancel",
  cancelled: "Cancelled: nothing was started and nothing was spent.",
};
