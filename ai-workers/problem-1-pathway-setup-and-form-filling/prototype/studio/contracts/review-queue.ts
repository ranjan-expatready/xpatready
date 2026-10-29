// Screen 02 "To review" contract (P-79), shared by the API and the web app (STANDARDS §6: contract first, zod). One list
// of everything that waits for a person: AI proposals, combinations waiting for review or release, merges, held
// files and new editions (portal captures and screen maps are parked with the browser extension, W1-02); plus AI work still running. Each item names the one step the
// asking person can take; the server checks the step again when it is taken.
import { z } from "zod";

export const QUEUE_FILTERS = ["needs", "waiting", "running", "all"] as const;
export type QueueFilter = (typeof QUEUE_FILTERS)[number];
export const QUEUE_KINDS = ["proposals", "ai_proposals", "release", "library_change", "form_fields", "merge", "held_file", "new_edition", "running"] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number];
/** The Kind filter's words, in the board's order (board view 1). */
export const KIND_WORDS: Record<QueueKind, string> = {
  proposals: "Proposals", ai_proposals: "AI proposals", release: "Review and release", library_change: "Shared library", form_fields: "Form fields", new_edition: "New edition",
  held_file: "Held file", merge: "Merge", running: "Running",
};

export const ReviewQueueQuery = z.object({
  filter: z.enum(QUEUE_FILTERS).default("needs"),
  kind: z.enum(QUEUE_KINDS).optional(),
  q: z.string().trim().max(120).optional(),
}).strict();

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
};
export type ReviewQueue = { items: QueueItem[]; counts: Record<QueueFilter, number>; kinds: Partial<Record<QueueKind, number>> };
