// PF-23 (NFR5-14; SA-11 BR-2, BR-5; SA-8-27, SA8-D40): AlertPort, the one way any module raises an alarm a person must
// act on. Raised for: an audit write that failed after its retries (BR-5), a broken audit hash chain (BR-2), a stuck
// background job (SA8-D40's limit, fixed in code), and a privacy-request or breach clock near its date (NFR5-14).
// The detail carries ids and rule names only, never personal data (BR-16, SA-11-37): every text field is id-shaped (no
// spaces, no "@"), so a name, an email or a sentence is refused before it is raised.
// The cloud adapter writes one alert line in CloudWatch's embedded metric format, which an alarm watches (PF-23's
// api/src/platform/observability/alerts.ts; the alarms themselves are PF-23c). Tests use fakeAlerts() below.
// Cross-module port (case-side contract v0.1 §1 rule 3): zod and types only, no app import.
import { z } from "zod";

export const ALERT_KINDS = ["audit_write_failed", "audit_chain_break", "job_stuck", "privacy_clock_near", "breach_clock_near"] as const;
export const AlertKind = z.enum(ALERT_KINDS);
export type AlertKind = z.infer<typeof AlertKind>;

/** An id or a rule name: letters, digits and . _ : - only, 1 to 120 characters (no spaces, no "@"). */
const Id = z.string().regex(/^[A-Za-z0-9_.:-]{1,120}$/, "ids and rule names only (letters, digits, . _ : -), never a name, an address or a sentence");

export const AlertDetail = z.object({
  /** The rule that fired, e.g. "BR-5", "SA8-D40". */
  rule: Id,
  firmId: Id.optional(),
  /** The record kind and its id, e.g. entity "audit_event", entityKey a uuid. */
  entity: Id.optional(),
  entityKey: Id.optional(),
  /** A job queue's name (job_stuck). */
  queue: Id.optional(),
  /** When the clock runs out (privacy_clock_near, breach_clock_near). */
  dueAt: z.iso.datetime().optional(),
  count: z.number().int().nonnegative().optional(),
}).strict();
export type AlertDetail = z.infer<typeof AlertDetail>;

export interface AlertPort {
  /** Raises one alert. `raised` is false when the same alert was raised within the adapter's repeat window. */
  raise(kind: AlertKind, detail: AlertDetail): Promise<{ raised: boolean }>;
}

/** The fake tests use: it checks the payload like the real adapter and keeps every alert in order. */
export function fakeAlerts(): AlertPort & { raised: { kind: AlertKind; detail: AlertDetail }[] } {
  const raised: { kind: AlertKind; detail: AlertDetail }[] = [];
  return {
    raised,
    async raise(kind, detail) {
      raised.push({ kind: AlertKind.parse(kind), detail: AlertDetail.parse(detail) });
      return { raised: true };
    },
  };
}
