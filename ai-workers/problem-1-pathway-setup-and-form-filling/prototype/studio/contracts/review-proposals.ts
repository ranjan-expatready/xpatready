// S6 slice 1b (P-149 one door, P-121, P-123; screens/W1-shared-library/plan-slice1.md): the review queue page's
// contract, shared by the API (api/src/review-proposals.ts) and the web app. Waiting proposals grouped by form edition
// or combination, each group in the three words a person reads (Ready to accept · Check · Decide), with what the side
// panel shows: both readings, IRCC's quote and the rules. Also the second person's grouped approval of what one
// decision landed on the library.
import { z } from "zod";
import type { LibraryChangeView } from "./screen02.ts";

export const BANDS = ["ready", "check", "decide"] as const;
export type Band = (typeof BANDS)[number];
export const BAND_WORDS: Record<Band, string> = { ready: "Ready to accept", check: "Check", decide: "Decide" };
export const BAND_TIPS: Record<Band, string> = {
  ready: "Both readings agree, IRCC's words were found in the file and every rule passed. You can accept these together.",
  check: "Something needs a person's eye first: a rule failed, the quote was not found, or it is close to an item already in the library.",
  decide: "The two readings differ, or it could be an existing item: open it and choose.",
};
export const PROPOSAL_KIND_WORDS: Record<string, string> = {
  field: "Shared field", answer_list: "Answer list", section: "Section", document_type: "Document type", form_check: "Form check", person_role: "Person role",
  condition: "Condition", requirement_line: "Requirement line", cross_check: "Cross-check", comes_from: "Comes from", pqr_pick: "Prospect questionnaire (PQR) pick",
};
export const AGREEMENT_WORDS: Record<string, string> = { agreed: "Both readings agree", differ: "The readings differ", one_round: "One reading only", rules_only: "From the rules, no AI reading" };

/** `c` and `step` (PR #108 minor (c)): the setup checklist's "Review n proposals" opens the oldest group holding that
 *  combination's proposals for that step (1–5), when no group is named. */
export const ProposalsQuery = z.object({ group: z.string().max(200).optional(), c: z.string().uuid().optional(), step: z.coerce.number().int().min(1).max(5).optional() }).strict();
export const DecideBody = z.object({
  ids: z.array(z.string().uuid()).min(1, "Choose at least one proposal.").max(200, "At most 200 proposals at a time."),
  action: z.enum(["accept", "edit", "reject"]),
  reason: z.string().max(300).nullable().optional(),
  payload: z.unknown().optional(),
}).strict();
export const BatchDecisionBody = z.object({ decision: z.enum(["approve", "return"]), note: z.string().max(300).optional() }).strict();

export type GroupKind = "edition" | "combination" | "run";
export type ProposalGroup = { id: string; kind: GroupKind; title: string; sub: string; counts: Record<Band, number>; total: number; oldest: string };
export type Reading = { text: string; from: "live" | "replay"; payload: unknown } | null;
export type QueueProposal = {
  id: string; kind: string; kind_word: string; title: string; meaning: string | null;
  /** C3.6: a choice fact's (or an answer list's) answer values, as the second person reads them; null for other kinds. */
  values: { code: string; label: string }[] | null;
  /** QA-196 (tech lead, 4 Nov): a check's reads, each as the shared field it becomes (a form field through its edition's
   *  field map; shared null: not mapped yet, or a guide answer not in the library yet), and each printed choice it
   *  compares with as that field's answer (shared null: the field holds no such answer yet); null for other kinds. */
  reads: { field: string; words: string; shared: string | null; shared_words: string | null; values: { printed: string; shared: string | null }[] }[] | null;
  band: Band; agreement: string; agreement_word: string; reason: string | null;
  lands_on: "library" | "combination"; reuse: { match: "reuse" | "new"; existing_key: string | null }; origin: "ai" | "rules"; step: string;
  readings: { draft: Reading; check: Reading };
  source: { file: string; edition: string | null; page: number | null; quote: string; quote_found: boolean; rule: { key: string; sentence: string } | null } | null;
  rules: { rule: string; passed: boolean; why: string | null }[];
  near: string[]; near_reason: string | null; basis: "SAMPLE" | "EXPERT";
  /** null when it can be accepted with others; else why not, in words. */
  bulk_why: string | null;
  /** QA-192 (P-120): accepting it needs a person's one-line reason why it is not the same as the near library item. */
  near_reason_needed?: boolean;
  /** QA-192 (Devin r2): the same, for accepting the checker's reading (an edit to that reading's name). */
  near_reason_needed_check?: boolean;
  /** Where it is decided instead (the field-map step's form-field page), or null when it is decided here. */
  decide_on: string | null;
  created_at: string;
};
export type ProposalsView = { groups: ProposalGroup[]; group: (ProposalGroup & { bands: Record<Band, QueueProposal[]> }) | null; batch_max: number; undo_seconds: number };
export type DecideResult = { batchId: string; items: { id: string; landedAs: string | null }[] };

/** What one decision landed on the library, for a second person to approve or return together. */
export type ChangeBatch = { id: string; by: string | null; by_id: string; at: string; count: number; items: LibraryChangeView[]; can_decide: boolean; why_not: string | null };
export type ChangeBatches = { batches: ChangeBatch[] };
