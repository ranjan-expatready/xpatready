// Screen 02 slices 2 and 3: the shapes the API answers and the web app reads (STANDARDS §6 contract first, §7 no any).
// Requests are parsed on the server with their own zod schemas (api/src/screen02.ts); these are the response shapes.

/** A change to the shared library a second person approves (LibraryChange, Screen 04 B1). */
export type LibraryChangeView = {
  id: string; kind: string; kind_word: string; key: string; label: string; action: string; action_word: string; reason: string | null;
  ai_verdict: string | null; matches: { key: string; score: number }[]; status: "WAITING" | "APPROVED" | "RETURNED" | "RELEASED" | "WITHDRAWN";
  proposed_by: string | null; proposed_by_id: string; proposed_at: string; decided_by: string | null; decided_at: string | null; decision_note: string | null;
  released_in: number | null; combination_id: string | null;
};
export type LibraryChangeDetail = LibraryChangeView & { field: { key: string; label: string | null; meaning: string; value_type: string; group: string | null; status: string } | null };

/** One side of a proposed merge (board view 8). */
export type MergeSide = { key: string; label: string; meaning: string | null; value_type: string | null; aliases: string[]; form_fields: number; questions: number };
export type MergeView = { id: string; status: "PROPOSED" | "APPLIED" | "REJECTED"; reason: string; proposed_by: string | null; proposed_by_id: string; proposed_at: string; decided_by: string | null; decision_note: string | null; goes: MergeSide; stays: MergeSide };

/** A portal capture as the capture review reads it (board view 6; forms.ts view). */
export type CaptureView = {
  id: string; portal_label: string; form: string; title: string; way: string; status: string; status_detail: string | null;
  screens: { order: number; title: string; questions: number }[]; questions: number; difference: { change?: string; kind?: string; label?: string; input?: string; screen?: string }[] | null;
  changes_edition_id: string | null; review_file: string | null; captured_on: string | null; captured_by: string; captured_by_name: string | null;
};

/** A held file from the one intake (board view 9). */
export type HeldFileView = { id: string; file: string; kind: string; code: string | null; title: string | null; edition: string | null; outcome: string; reason: string | null; combinationId: string | null; at: string; irccPage: string | null; uploadedBy: string; sha256: string; stored: boolean };

/** The new-edition impact review (board view 7, C9.1). */
export type ImpactChange = "unchanged" | "reworded" | "new" | "removed";
export type ImpactRow = { dataPath: string; caption: string; section: string | null; change: ImpactChange; was?: string; field?: string | null; outcome?: string };
export type ImpactReview = {
  id: string; form: string; title: string; edition: string | null; library_edition: string | null; uploaded_by: string; at: string;
  counts: { form_fields: number } & Record<ImpactChange, number>; rows: ImpactRow[];
  library: { key: string; label: string; meaning: string; form_fields: number }[]; combinations: { id: string; label: string }[]; open_cases: number;
  ai: { used: boolean; cost_usd: number; note: string };
};
export type ImpactAccepted = { edition: string; carried: number; for_a_person: number; combinations: { id: string; label: string }[] };

/** An online version's screen map (board view 5). */
export type ScreenMapInput = { input: string; label: string | null; screen: string | null; outcome: string; method?: string | null; field: string | null; field_label: string | null; why: string | null };
export type ScreenMapView = { edition: { id: string; label: string; form: string }; state: "not_drafted" | "drafted" | "accepted"; pdf_edition?: string | null; counts?: Record<string, number>; inputs: ScreenMapInput[] };

/** K1: a PDF edition's form fields with their decision. */
export type FormFieldRow = { dataPath: string; caption: string | null; heading: string | null; outcome: string; outcome_word: string; field: string | null; reason: string | null; status: string; carried: boolean };
export type FormFieldsView = { edition: { id: string; label: string; form: string } | null; fields: FormFieldRow[] };

/** Board view 11: "Describe it" (no AI until paid runs are agreed). */
export type PathLevel = { key: string; label: string };
export type PathProposal = { mode: "no_ai"; cost_usd: 0; why: string; confidence?: "High" | "Medium";
  proposal: { pathway: "INDIVIDUAL" | "CORPORATE"; path: string[]; program: PathLevel; category: PathLevel; subCategory: PathLevel | null; exists: boolean; combinationId: string | null } | null; others?: string[] };

/** A4: one part of a step drafted in parts (read-only). */
export type BatchPart = { index: number; sections: string[]; fields: number; status: string; cost_usd: number; message: string | null };
