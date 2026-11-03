// Screen 02 "To review" contract (P-79), shared by the API and the web app (STANDARDS §6: contract first, zod). One list
// of everything that waits for a person: AI proposals, combinations waiting for review or release, merges, held
// files and new editions (portal captures and screen maps are parked with the browser extension, W1-02); plus AI work still running. Each item names the one step the
// asking person can take; the server checks the step again when it is taken.
import { z } from "zod";

export const QUEUE_FILTERS = ["needs", "waiting", "running", "all"] as const;
export type QueueFilter = (typeof QUEUE_FILTERS)[number];
export const QUEUE_KINDS = ["setup", "proposals", "ai_proposals", "release", "library_change", "form_fields", "merge", "held_file", "new_edition", "running"] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number];
/** The Kind filter's words, in the board's order (board view 1). */
export const KIND_WORDS: Record<QueueKind, string> = {
  setup: "Setup step", proposals: "Proposals", ai_proposals: "AI proposals", release: "Review and release", library_change: "Shared library", form_fields: "Form fields", new_edition: "New edition",
  held_file: "Held file", merge: "Merge", running: "Running",
};

export const ReviewQueueQuery = z.object({
  filter: z.enum(QUEUE_FILTERS).default("needs"),
  kind: z.enum(QUEUE_KINDS).optional(),
  q: z.string().trim().max(120).optional(),
  /** F2 C2.12 (F3 plan D2): only the items that belong to this form (its number as the library writes it, "IMM 5257"). */
  form: z.string().trim().min(1, "Give a form number, such as IMM 5257.").max(40, "A form number has at most 40 characters.").optional(),
  /** F2 C2.12 (concept K1, the return strip): with `form`, only this combination's items and the library-wide ones (as the
   *  form's guided path counts them), so To review opened from the path lists what the path says is left. */
  combination: z.string().trim().min(1).max(64, "A combination reference has at most 64 characters.").optional(),
}).strict().refine((x) => !x.combination || x.form, { message: "Give the form too: a combination narrows one form's items.", path: ["combination"] });

/** needs: the asking person can take the next step. waiting: someone else must (a second person, an approver).
 *  running: AI work not finished yet. */
export type QueueState = "needs" | "waiting" | "running";
export type QueueItem = {
  id: string;
  kind: QueueKind;
  /** What it is about: a combination's path, a form and edition, or a shared field. */
  title: string;
  /** What and why, in one plain sentence. */
  what: string;
  state: QueueState;
  /** For "waiting": who acts next ("A second person approves it"). */
  waiting_on: string | null;
  /** Who started it, by name (never an id), and when (ISO). */
  by: string | null;
  at: string;
  /** AI cost so far in US dollars; null when no AI is involved. */
  cost_usd: number | null;
  /** The one step for the asking person; href null when that step has no page yet (it says so in `note`). */
  next: { label: string; href: string | null; note: string | null } | null;
  /** F2 C2.12 (F3 plan D2): the forms this item belongs to, by number (an item can belong to several: a release lists every
   *  form of its combination, a shared field every form whose field map reads it); [] when it belongs to none. */
  forms: string[];
  /** F2 C2.12 slice 3 (review 28b3bba3 Major 2, concept K1: a form's path is keyed by form and combination): the combination
   *  this item is about (an AI draft or proposals on it, its release); null for a library-wide item (a held file, a new
   *  edition, a shared field, a merge). */
  combination: string | null;
  /** C9.1 BR-12: a new edition's item names the combinations that file its form now (by label); absent on other items. */
  combinations?: string[];
};
/** UX-A part 2: `blocked`, the combinations whose draft has problems that block release (whoever fixes them), so the
 *  empty "Needs you" never says nothing waits while a release is blocked. */
/** UX-A part 2 (review M3): `notSetUp`, the combinations whose only blocking problem is "Nothing to release yet" (no
 *  form, no document): their next step is a building step, on Immigration programs, never Needs you (P-180, N8). */
export type ReviewQueue = { items: QueueItem[]; counts: Record<QueueFilter, number>; kinds: Partial<Record<QueueKind, number>>; blocked: number; notSetUp: number };
