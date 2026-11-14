// PF-23 (NFR5-14 "alerts ALSO page on audit chain break and DSR/breach clocks"; SA-11 BR-2, BR-5; SA-8-27; SA8-D40):
// the log-line adapter of AlertPort (ports/alert.ts) and the checks that raise alerts.
//  * LogAlerts.raise writes one alert line in embedded metric format (metric "Alerts", dimension AlertKind); in the
//    cloud a CloudWatch alarm on that metric pages the on-call address (PF-23c). The same alert (kind and its firm,
//    queue or record) raised again within ALERT_REPEAT_MS raises nothing: one page per incident, not one per retry.
//  * writeAuditWithAlarm: an audit write retried, then alarmed if it still fails (BR-5: "retries durably and alarms if
//    it ultimately fails; a gap can never go unnoticed"). The caller's transaction rule is the caller's (AuditPort).
//  * stuckJobs: a job running or waiting longer than STUCK_JOB_MS (SA8-D40: "the stuck jobs limit is fixed in code").
//  * clocksNear: a privacy request or a breach whose legal clock ends within its lead time (NFR5-14).
// Every number below is Sample: the requirements fix where the limit lives (in code, SA8-D40) but not its value; a
// value is set by the founder or the immigration and privacy experts later (P-170: labelled Sample, never guessed).
import { AlertDetail, AlertKind, type AlertPort } from "../../../../ports/alert.ts";
import { alertLine, auditFailureLine } from "./metrics.ts";
import { log } from "./log.ts";

/** Sample: the same alert within 5 minutes raises nothing (PF-23's acceptance test). */
export const ALERT_REPEAT_MS = 5 * 60_000;
/** Sample: a job running or waiting over 30 minutes is stuck (SA8-D40 fixes the limit in code; its value is not stated). */
export const STUCK_JOB_MS = 30 * 60_000;
/** Sample: how long before its end a legal clock alerts. */
export const CLOCK_LEAD_MS = { privacy_clock_near: 5 * 24 * 3_600_000, breach_clock_near: 24 * 3_600_000 } as const;
/** Sample: audit writes tried this many times, this far apart, before the alarm. */
export const AUDIT_ATTEMPTS = 3, AUDIT_RETRY_MS = 50;

type Clock = { now(): Date };
const systemClock: Clock = { now: () => new Date() };

export class LogAlerts implements AlertPort {
  private readonly last = new Map<string, number>();
  constructor(private readonly clock: Clock = systemClock, private readonly repeatMs = ALERT_REPEAT_MS) {}

  async raise(kind: AlertKind, detail: AlertDetail): Promise<{ raised: boolean }> {
    const k = AlertKind.parse(kind), d = AlertDetail.parse(detail);
    const key = [k, d.firmId ?? "", d.queue ?? "", k === "audit_write_failed" ? "" : d.entityKey ?? ""].join("|");
    const now = this.clock.now().getTime(), was = this.last.get(key);
    if (was !== undefined && now - was < this.repeatMs) {
      log().trusted("info", "alert_repeat", { alert: k, rule: d.rule, sinceMs: now - was });
      return { raised: false };
    }
    this.last.set(key, now);
    alertLine(k, d);
    return { raised: true };
  }
}

let alerts: AlertPort = new LogAlerts();
/** The process's AlertPort (a test may install a fake or a LogAlerts on a fake clock). */
export const currentAlerts = (): AlertPort => alerts;
export function useAlerts(a: AlertPort): AlertPort { const was = alerts; alerts = a; return was; }

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An audit write tried up to `attempts` times; when the last fails, one audit-failure metric line and one alert
 *  (BR-5), then the error is thrown on to the caller. `ids` names the record, never its content. */
export async function writeAuditWithAlarm<T>(write: () => Promise<T>, ids: { firmId?: string; entity?: string; entityKey?: string }, opts: { alerts?: AlertPort; attempts?: number; retryMs?: number } = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? AUDIT_ATTEMPTS);
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try { return await write(); } catch (e) { last = e; if (i < attempts) await pause(opts.retryMs ?? AUDIT_RETRY_MS); }
  }
  const d = AlertDetail.parse({ rule: "BR-5", ...ids });
  auditFailureLine({ firmId: d.firmId, entity: d.entity, entityKey: d.entityKey, attempts });
  log().write("error", "audit_write_error", { error: last });
  await (opts.alerts ?? alerts).raise("audit_write_failed", d);
  throw last;
}

/** Raises job_stuck once per queue holding a job older than the limit; returns the queues alerted. */
export async function stuckJobs(jobs: { queue: string; id: string; since: Date }[], clock: Clock = systemClock, a: AlertPort = alerts, limitMs = STUCK_JOB_MS): Promise<string[]> {
  const now = clock.now().getTime(), byQueue = new Map<string, { id: string; n: number }>();
  for (const j of jobs) if (now - j.since.getTime() > limitMs) { const q = byQueue.get(j.queue); byQueue.set(j.queue, { id: q?.id ?? j.id, n: (q?.n ?? 0) + 1 }); }
  const out: string[] = [];
  for (const [queue, { id, n }] of byQueue) if ((await a.raise("job_stuck", { rule: "SA8-D40", queue, entity: "job", entityKey: id, count: n })).raised) out.push(queue);
  return out;
}

/** Raises privacy_clock_near or breach_clock_near for each open record whose clock ends within its lead time. */
export async function clocksNear(kind: "privacy_clock_near" | "breach_clock_near", open: { id: string; firmId?: string; dueAt: Date }[], clock: Clock = systemClock, a: AlertPort = alerts): Promise<string[]> {
  const now = clock.now().getTime(), out: string[] = [];
  for (const r of open) {
    if (r.dueAt.getTime() - now > CLOCK_LEAD_MS[kind]) continue;
    const res = await a.raise(kind, { rule: "NFR5-14", entity: kind === "privacy_clock_near" ? "privacy_request" : "breach", entityKey: r.id, ...(r.firmId ? { firmId: r.firmId } : {}), dueAt: r.dueAt.toISOString() });
    if (res.raised) out.push(r.id);
  }
  return out;
}
