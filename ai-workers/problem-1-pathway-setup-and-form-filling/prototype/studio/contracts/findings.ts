// C7.5 Review findings (runtime lane, M3-E; r5c BR-19; M3-CONTRACT C7.5): the request and answer shapes, shared by the
// API and the case page (STANDARDS: contract first, zod). Pure. Part 1 is the rules cross-checks and the finding's life;
// part 2 (the replayed AI review) adds the review-run shapes here.
import { z } from "zod";

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
  severity: FindingSeverity; source: FindingSource; state: FindingState; quote: string;
  /** The rule a rules finding comes from, in words (the tooltip). */
  rule: string | null;
  agreement: "high" | "low" | null; reasons: string[]; replayed: boolean;
  state_reason: string | null; state_by: string | null; state_at: string | null;
  created_by: string; created_at: string;
};
export type Findings = { case_id: string; findings: Finding[]; counts: Record<FindingState, number>; ai: { available: false; words: string } };

/** ?source=… and ?state=… filters (each optional, one value). */
export const FindingsQuery = z.object({
  source: z.enum(SOURCE, { error: "source is rules, ai or manual." }).optional(),
  state: z.enum(STATE, { error: "state is open, acknowledged, resolved, waived or dismissed." }).optional(),
});

const reason = z.string({ error: "Give a reason: it is kept with the finding." }).trim().min(3, "Give a reason of at least 3 characters: it is kept with the finding.").max(1000, "Keep the reason under 1,000 characters.");
/** POST /api/runtime/findings/:id/{acknowledge · waive · dismiss} { reason }. */
export const FindingReason = z.object({ reason });

/** POST /api/runtime/cases/:id/findings: staff add a finding by hand (source "manual"). */
export const NewFinding = z.object({
  filing: z.string().uuid("Choose the filing this finding is about.").nullable().optional(),
  subject: z.string({ error: "Choose the person this finding is about." }).uuid("Choose the person this finding is about."),
  severity: z.enum(SEVERITY, { error: "Choose a severity: CRITICAL, MAJOR, MINOR or INFO." }),
  note: z.string({ error: "Say what the finding is." }).trim().min(3, "Say what the finding is, in at least 3 characters.").max(1000, "Keep the finding under 1,000 characters."),
  form: z.string().trim().max(40, "That is too long to be a form number.").nullable().optional(),
  field: z.string().trim().max(200, "That is too long to be a fact.").nullable().optional(),
});
export type NewFinding = z.infer<typeof NewFinding>;
