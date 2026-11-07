// Screen 02 slices 2 and 3: the shapes the API answers and the web app reads (STANDARDS §6 contract first, §7 no any).
// Requests are parsed on the server with their own zod schemas (api/src/screen02.ts); these are the response shapes.

import type { SuppliesView } from "./document-supplies.ts";

/** A change to the shared library a second person approves (LibraryChange, Screen 04 B1). */
export type LibraryChangeView = {
  id: string; kind: string; kind_word: string; key: string; label: string; action: string; action_word: string; reason: string | null;
  ai_verdict: string | null; matches: { key: string; score: number }[]; status: "WAITING" | "APPROVED" | "RETURNED" | "RELEASED" | "WITHDRAWN";
  proposed_by: string | null; proposed_by_id: string; proposed_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null;
  released_in: number | null; combination_id: string | null;
  /** QA-193 (P-121): the decision (To review's batch) the change came from; null when it was not decided there. */
  batch_id?: string | null;
  /** G-CORE B2: a rename waiting for a second person (action RENAME): the name now and the name proposed. */
  rename?: { before: string | null; after: string | null; undo: boolean };
  /** C4.5: the facts a document supplies, before → after, each new fact's official words (contracts/document-supplies.ts). */
  supplies?: SuppliesView;
  /** B86: a question's condition (only what the page reads: what approving it holds on other combinations). */
  condition?: { spread: string | null };
  /** B86: a form field's condition: the form field, its own words, what is proposed, what approving it holds elsewhere. */
  /** B154 (P-97, P-244): whether a library section holds background answers, before → after, what it means, its reach. */
  background?: { section: string; before: string; after: string; on: boolean; questions: number; uses: number; sourced: string[]; means: string; reason: string };
  form_field?: { form: string; edition: string; caption: string; words: string; sentence: string; clear: boolean; spread: string | null; reason: string; ask?: { printed: string; deciding: string; writes: string } | null };
};
export type LibraryChangeDetail = LibraryChangeView & { field: { key: string; label: string | null; meaning: string; value_type: string; group: string | null; status: string; /** C3.6: the answer list the field carries, approved with it. */ answer_list?: { key: string; label: string; status: string; values: { code: string; label: string }[] } | null } | null;
  /** A structure name (P-128): the names a branch delete takes with it, and whether a retire or restore takes its combination. */
  goes_with: string[]; with_combination: boolean;
  /** ReviewCard (P-116 amended): the approval re-check, run now and shown before the click; null when it does not apply. */
  recheck: { ok: boolean; text: string; kept: string[] } | null;
  /** Break M5: a change to what IRCC accepts, the combinations in use it leaves with a line filed in a refused way. */
  accepts_impact?: { combination: string; label: string; channel: string; words: string }[];
  /** S4 C11.18: a change to what IRCC accepts for a form, in words (before → after, IRCC's line or the reason, its page). */
  accepts?: { form: string; edition: string | null; before: string; after: string; quote: string | null; reason: string | null; form_page: string | null } };

/** One side of a proposed merge (board view 8). */
export type MergeSide = { key: string; label: string; meaning: string | null; value_type: string | null; aliases: string[]; form_fields: number; questions: number };
export type MergeView = { id: string; status: "PROPOSED" | "APPLIED" | "REJECTED"; reason: string; proposed_by: string | null; proposed_by_id: string; proposed_at: string; decided_by: string | null; decision_note: string | null; goes: MergeSide; stays: MergeSide };

/** A held file from the one intake (board view 9). */
export type HeldFileView = { id: string; file: string; kind: string; code: string | null; title: string | null; edition: string | null; outcome: string; reason: string | null; combinationId: string | null; at: string; irccPage: string | null; uploadedBy: string; sha256: string; stored: boolean; /** Why approving would be refused (review-4 Minor 2); null when it can be approved. */ cannotApprove?: string | null };

/** The new-edition impact review (board view 7, C9.1). */
export type ImpactChange = "unchanged" | "reworded" | "new" | "removed";
export type ImpactRow = { dataPath: string; caption: string; section: string | null; change: ImpactChange; was?: string; field?: string | null; outcome?: string };
export type ImpactReview = {
  id: string; form: string; title: string; edition: string | null; library_edition: string | null; uploaded_by: string; at: string;
  counts: { form_fields: number } & Record<ImpactChange, number>; rows: ImpactRow[];
  library: { key: string; label: string; meaning: string; form_fields: number }[]; combinations: { id: string; label: string }[]; open_cases: number;
  /** C9.1 P-32: what the removed and reworded boxes touch beyond fields, each with why in words and its combination. */
  components: Record<ImpactComponentKind, ImpactComponent[]>;
  /** C9.1 P-151: IRCC's accepted-until date for the previous edition, quoted from the form's IRCC page; null when none. */
  previous_accepted_until: string | null; previous_accepted_words: string | null; previous_accepted_source: { quote: string; url: string | null; saved: string | null } | null;
  ai: { used: boolean; cost_usd: number; note: string; offer: ImpactAiOffer; saved: boolean; saved_words?: string; live: { open: boolean; why: string | null };
    drafted?: { job_id: string; at: string; message: string | null; proposals: number; waiting: number; boxes: Record<string, string[]> } | null };
};
export type ImpactComponentKind = "sections" | "document_types" | "rules" | "checks";
export type ImpactComponent = { key: string; label: string; field: string; combination: string; combination_id: string; boxes: string[]; why: string };
/** C9.1 P-138: Draft with AI for the new and reworded boxes only, with its cost said first. */
export type ImpactAiOffer = { boxes: number; words: string; about_usd: number; at_most_usd: number; key?: string };
export type ImpactDrafted = { job_id: string; again: boolean; proposals: number; cost_usd?: number; message: string };
export type ImpactAccepted = { edition: string; carried: number; for_a_person: number; combinations: { id: string; label: string }[] };

/** K1: a PDF edition's form fields with their decision. */
export type FormFieldRow = { dataPath: string; caption: string | null; heading: string | null; outcome: string; outcome_word: string; field: string | null; reason: string | null; status: string; carried: boolean;
  /** C3.8 [IRCC-F08]: a Background information question, which is never "not a fact". */
  background?: boolean };
export type FormFieldsView = { edition: { id: string; label: string; form: string } | null; fields: FormFieldRow[] };

/** A4: one part of a step drafted in parts (read-only). */
export type BatchPart = { index: number; sections: string[]; fields: number; status: string; cost_usd: number; message: string | null };
