// X2b (C1.5, concept v3 §6, board design/draft-x2b-board.html): copy one form or document line to other combinations, or
// remove it from them, after a preview of what happens in each. Shared by the API and the web app (STANDARDS §6: zod).
// Founder 31 Oct (#167): form and document lines first; links between combinations stay on the case (P-106).
import { z } from "zod";

export const LINE_KINDS = ["form", "document"] as const;
export type LineKind = (typeof LINE_KINDS)[number];
export const BULK_OPS = ["add", "remove"] as const;
export type BulkOp = (typeof BULK_OPS)[number];

/** BR-C1: what happens in one combination. Only WILL_CHANGE and WAITS rows may be ticked (WAITS only on purpose). */
export const OUTCOMES = [
  // adding
  "WILL_ADD", "ALREADY_HAS", "HAS_OTHER_CONDITION", "CANNOT_CHANNEL", "CANNOT_PERSON", "CANNOT_FACT", "CANNOT_RETIRED",
  // removing
  "WILL_REMOVE", "DOES_NOT_HAVE", "REMOVED_IN_DRAFT",
  // both
  "WAITS", "CANNOT_COMBINATION_RETIRED", "SOURCE",
] as const;
export type Outcome = (typeof OUTCOMES)[number];
/** The rows a person may tick: a change, or a change that withdraws a submission (ticked on purpose). */
export const TICKABLE: readonly Outcome[] = ["WILL_ADD", "WILL_REMOVE", "WAITS"];
/** The short word for each outcome, as the board shows it in its Outcome column. */
export const OUTCOME_WORDS: Record<Outcome, string> = {
  WILL_ADD: "Will be added", ALREADY_HAS: "Already has it", HAS_OTHER_CONDITION: "Has it with a different \"only if\"",
  CANNOT_CHANNEL: "Cannot", CANNOT_PERSON: "Cannot", CANNOT_FACT: "Cannot", CANNOT_RETIRED: "Cannot",
  WILL_REMOVE: "Will be removed", DOES_NOT_HAVE: "Does not have it", REMOVED_IN_DRAFT: "Removed already in its draft",
  WAITS: "Waits", CANNOT_COMBINATION_RETIRED: "Cannot", SOURCE: "The line comes from here",
};
/** Whose line it is, in the words of the Forms and Documents tabs (web/src/pages/configuration.tsx WHO). */
export const WHO_WORDS: Record<string, string> = { each_applicant: "each applicant", principal_applicant: "the principal applicant", spouse_or_partner: "the spouse or partner", couple_once: "the couple (once)", each_dependent_child: "each child", each_person: "each person", case: "the application (once)", representative: "the representative", sponsor: "the sponsor" };
/** Concept §5. */
export const PREVIEW_INTRO = "Nothing changes until you choose Add. Every combination gets its own draft change; one Undo takes back the whole copy while none of them has changed since.";
export const WAITS_WORDS = "Submitted for review: adding withdraws that submission. Tick to add it anyway.";
export const WAITS_REMOVE_WORDS = "Submitted for review: removing withdraws that submission. Tick to remove it anyway.";

const uuid = (what: string) => z.string().uuid({ message: `${what} is not known. Reload the page.` });
/** The line: a form by its form number (its line key), a document by its line key on the source combination. */
export const LineRef = z.object({
  combinationId: uuid("The combination the line comes from"),
  kind: z.enum(LINE_KINDS, { error: "Say whether it is a form or a document line." }),
  key: z.string().trim().min(1, "Say which line.").max(200, "That line is not known. Reload the page."),
});
export type LineRef = z.infer<typeof LineRef>;

export const BulkPreview = z.object({
  line: LineRef,
  op: z.enum(BULK_OPS, { error: "Choose add or remove." }),
  combinationIds: z.array(uuid("A combination"), { error: "Choose the combinations." }).min(1, "Choose at least one combination.").max(500, "At most 500 combinations in one change."),
});
export type BulkPreview = z.infer<typeof BulkPreview>;

/** Slice (b): the same fields, the rows the person ticked, and a key so a retried request changes nothing twice. */
export const BulkApply = BulkPreview.extend({
  idempotencyKey: z.string().trim().min(8, "Reload the page: the request key is missing.").max(100),
  include: z.array(uuid("A combination")).min(1, "Tick at least one combination."),
});
export type BulkApply = z.infer<typeof BulkApply>;

export type PreviewTarget = {
  combinationId: string;
  /** The full trail, pathway first (concept §4: "one table row per combination with its full trail"). */
  trail: string[];
  outcome: Outcome;
  /** Plain words: why, for every outcome but WILL_ADD and WILL_REMOVE (null). */
  reason: string | null;
  tickable: boolean;
};
export type PreviewResult = {
  /** The line in words ("IMM 5476 Use of a representative · for the case · always"). */
  line: { kind: LineKind; key: string; words: string; from: string };
  op: BulkOp;
  targets: PreviewTarget[];
  counts: { tickable: number; waits: number; cannot: number; nothing: number };
};
