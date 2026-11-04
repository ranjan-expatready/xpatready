// C7.5 Review findings (runtime lane, M3-E; r5c BR-19; M3-CONTRACT C7.5): the request and answer shapes, shared by the
// API and the case page (STANDARDS: contract first, zod). Pure. Part 1 is the rules cross-checks and the finding's life;
// part 2 (the replayed AI review) adds the review-run shapes here.
import { z } from "zod";
import { INVISIBLE, LONE } from "./runtime.ts";

export const SEVERITY = ["CRITICAL", "MAJOR", "MINOR", "INFO"] as const;
export const SOURCE = ["rules", "ai", "manual"] as const;
export const STATE = ["open", "acknowledged", "resolved", "waived", "dismissed"] as const;
export type FindingSeverity = (typeof SEVERITY)[number];
export type FindingSource = (typeof SOURCE)[number];
export type FindingState = (typeof STATE)[number];

/** The team's words on the page (AG-11-69): source and state as a person reads them. */
export const SOURCE_WORDS: Record<FindingSource, string> = { rules: "Rules", ai: "AI", manual: "Added by hand" };
export const STATE_WORDS: Record<FindingState, string> = { open: "Open", acknowledged: "Acknowledged", resolved: "Resolved", waived: "Waived", dismissed: "Dismissed" };

/** GET /api/runtime/cases/:id/findings → { findings: Finding[], … }. */
export type Finding = {
  id: string; filing: string | null; subject: string; person: string; form: string | null; field: string | null;
  /** The fact as the case asks it ("Expiry date of the passport"), null when the case no longer asks it. */
  fact_label: string | null;
  severity: FindingSeverity; source: FindingSource; state: FindingState; quote: string;
  /** The rule a rules finding comes from, in words (the tooltip). */
  rule: string | null;
  agreement: "high" | "low" | null; reasons: string[]; replayed: boolean;
  state_reason: string | null; state_by: string | null; state_at: string | null;
  /** Who moved it (acknowledged, waived, dismissed), in words. */
  state_by_name: string | null;
  /** Who resolved it ("rules" when a fixed fact did; the person's earlier move stays in state_*). */
  resolved_by: string | null; resolved_by_name: string | null; resolved_at: string | null;
  created_by: string; created_at: string;
};
export type Findings = { case_id: string; findings: Finding[]; counts: Record<FindingState, number>; ai: { available: false; words: string };
  /** The reader is this case's representative of record: only they pass (waive) a CRITICAL finding. */
  may_waive: boolean };

/** ?source=… and ?state=… filters (each optional, one value). */
export const FindingsQuery = z.object({
  source: z.enum(SOURCE, { error: "source is rules, ai or manual." }).optional(),
  state: z.enum(STATE, { error: "state is open, acknowledged, resolved, waived or dismissed." }).optional(),
});

/** Typed text (QA-25, as answers): no control, invisible or bidirectional characters, and some visible text. */
const typed = (s: z.ZodString, what: string) => s.refine((x) => !INVISIBLE.test(x) && !LONE.test(x), `The ${what} holds a hidden or control character: type it again as plain text.`);
const reason = typed(z.string({ error: "Give a reason: it is kept with the finding." }).trim().min(3, "Give a reason of at least 3 characters: it is kept with the finding.").max(1000, "Keep the reason under 1,000 characters."), "reason");
/** POST /api/runtime/findings/:id/{acknowledge · waive · dismiss} { reason }. */
export const FindingReason = z.object({ reason });

/** POST /api/runtime/cases/:id/findings: staff add a finding by hand (source "manual"). */
export const NewFinding = z.object({
  filing: z.string().uuid("Choose the filing this finding is about.").nullable().optional(),
  subject: z.string({ error: "Choose the person this finding is about." }).uuid("Choose the person this finding is about."),
  severity: z.enum(SEVERITY, { error: "Choose a severity: CRITICAL, MAJOR, MINOR or INFO." }),
  note: typed(z.string({ error: "Say what the finding is." }).trim().min(3, "Say what the finding is, in at least 3 characters.").max(1000, "Keep the finding under 1,000 characters."), "finding"),
  form: typed(z.string().trim().max(40, "That is too long to be a form number."), "form number").nullable().optional(),
  /** One per "Add finding" dialog: sending it again returns the finding already stored (a double click is one row). */
  idempotencyKey: z.string().min(8, "The request key is too short.").max(100, "The request key is too long.").optional(),
  field: z.string().trim().max(200, "That is too long to be a fact.").regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, "Choose one of this case's facts.").nullable().optional(),
});
export type NewFinding = z.infer<typeof NewFinding>;
