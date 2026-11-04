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
  // slice (c), tech lead 1 Nov (#273 Question 1): attachNow's two refusals, shown per target before Add
  "CANNOT_NO_FILE", "CANNOT_WAITING_PERSON",
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
  CANNOT_CHANNEL: "Cannot", CANNOT_PERSON: "Cannot", CANNOT_FACT: "Cannot", CANNOT_RETIRED: "Cannot", CANNOT_NO_FILE: "Cannot", CANNOT_WAITING_PERSON: "Cannot",
  WILL_REMOVE: "Will be removed", DOES_NOT_HAVE: "Does not have it", REMOVED_IN_DRAFT: "Removed already in its draft",
  WAITS: "Waits", CANNOT_COMBINATION_RETIRED: "Cannot", SOURCE: "The line comes from here",
};
/** Whose line it is, in the words of the Forms and Documents tabs (web/src/pages/configuration.tsx WHO). */
export const WHO_WORDS: Record<string, string> = { each_applicant: "each applicant", principal_applicant: "the principal applicant", spouse_or_partner: "the spouse or partner", couple_once: "the couple (once)", each_dependent_child: "each child", principal_partner_adult_children: "the principal applicant, a spouse or partner, and each child 18 or older", each_person: "each person", case: "the application (once)", representative: "the representative", sponsor: "the sponsor" };
/** Concept §5. */
export const PREVIEW_INTRO = "Nothing changes until you choose Add. Every combination gets its own draft change; one Undo takes back the whole copy while none of them has changed since.";
export const WAITS_WORDS = "Submitted for review: adding withdraws that submission. Tick to add it anyway.";
/** Board "Remove from others: preview". */
export const PREVIEW_REMOVE_INTRO = "Nothing changes until you choose Remove. A released line's removal is a draft change until that combination's next release; one Undo takes back the whole removal while none of them has changed since.";
/** Board "Copy a line from another". */
export const COPY_FROM_INTRO = "Its form and document lines. Lines this combination already has are not offered. Nothing changes until you choose Add; one Undo takes back every line added.";
/** Board "Approver (read-only)". */
export const APPROVER_WORDS = "Approver view: copies arrive as draft changes in each combination and are approved with that combination's other changes (before and after shown on Review and release). No copy controls here.";
/** Board "Undo refused". */
export const UNDO_REFUSED_TITLE = (op: BulkOp) => `The ${op === "add" ? "copy" : "removal"} cannot be undone in one step`;
export const undoRefusedHint = (op: BulkOp, line: string) => op === "add" ? `Remove ${line} by hand where you want it gone, or use Remove from other combinations.` : `Add ${line} back by hand where you want it, or use Copy to other combinations.`;
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
  idempotencyKey: z.string({ error: "Reload the page: the request key is missing." }).trim().min(8, "Reload the page: the request key is missing.").max(100, "Reload the page: the request key is not valid.").regex(/^[^#]+$/, "Reload the page: the request key is not valid."),
  /** Break m1 (#281): the source line as the preview showed it (PreviewResult.line.version); a change since is refused. */
  sourceVersion: z.string().max(64).optional(),
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
  line: { kind: LineKind; key: string; words: string; from: string; /** What the line says now, short (break m1). */ version: string };
  op: BulkOp;
  targets: PreviewTarget[];
  counts: { tickable: number; waits: number; cannot: number; nothing: number };
};

/** Slice (b), BR-C3: what the apply returns. `replayed`: the same request key was seen before; nothing changed twice. */
export type ApplyResult = { batchId: string; op: BulkOp; changed: { combinationId: string; trail: string[] }[]; message: string; replayed: boolean };
/** Slice (b), BR-C4: what one Undo of a whole batch returns. */
export type UndoResult = { batchId: string; undone: { combinationId: string; trail: string[] }[]; message: string };
/** Concept §4 "After": the toast. */
export const appliedWords = (line: string, op: BulkOp, n: number) => `${line} ${op === "add" ? "added to" : "removed from"} ${n} combination${n === 1 ? "" : "s"} (draft changes in each).`;
/** Concept §5 "Undo refused" (review m3: a removal says removal). */
export const undoRefusedWords = (op: BulkOp, combination: string, what: string, who: string, time: string) => `${combination} was changed after the ${op === "add" ? "copy" : "removal"} (${what}, by ${who} at ${time}). Nothing was undone.`;

/** Slice (c): the combinations a line can be copied to or removed from (every combination of the workspace that is not
 *  retired, the source left out), by trail. */
export type BulkCombination = { id: string; trail: string[] };

/** Slice (d), board "Copy a line from another": the lines of one combination, each with what happens in this one. */
export const CopyFromPreview = z.object({
  sourceId: uuid("The combination to copy from"),
  targetId: uuid("This combination"),
});
export type CopyFromPreview = z.infer<typeof CopyFromPreview>;
export const CopyFromApply = CopyFromPreview.extend({
  // Each line is its own batch under "<key>#<n>", so the key stays shorter than a batch's (100).
  idempotencyKey: z.string({ error: "Reload the page: the request key is missing." }).trim().min(8, "Reload the page: the request key is missing.").max(90, "Reload the page: the request key is not valid.").regex(/^[^#]+$/, "Reload the page: the request key is not valid."),
  lines: z.array(z.object({ kind: z.enum(LINE_KINDS), key: z.string().trim().min(1).max(200), version: z.string().max(64).optional() }), { error: "Tick at least one line." }).min(1, "Tick at least one line.").max(100, "At most 100 lines in one copy."),
});
export type CopyFromApply = z.infer<typeof CopyFromApply>;
export type CopyFromLine = { kind: LineKind; key: string; version: string; short: string; words: string; outcome: Outcome; reason: string | null; tickable: boolean };
export type CopyFromResult = { source: { id: string; trail: string[] }; lines: CopyFromLine[]; hidden: number };
/** Slice (d): the copy's answer: one batch per line, undone together. */
export type CopyFromApplied = { batchIds: string[]; message: string; replayed: boolean };
export const UndoMany = z.object({ batchIds: z.array(z.string().uuid({ message: "That change is not known. Reload the page." })).min(1, "Say which change to undo.").max(100, "At most 100 changes in one Undo.") });
export const copiedFromWords = (n: number, from: string) => `${n} line${n === 1 ? "" : "s"} copied here from ${from} (draft changes).`;
