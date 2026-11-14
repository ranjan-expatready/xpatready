// PF-23 (NFR5-14 RED metrics; SA-8-27): metrics as CloudWatch embedded-metric-format (EMF) log lines, with no call
// from the app; elsewhere it is an ordinary JSON log line. CloudWatch extracts the metrics when the stream reaches it
// marked as EMF (Lambda; the CloudWatch agent; FireLens with log format json/emf), not through the plain awslogs
// driver: the shipper is PF-23c's and PF-8's choice (review m10). Measured: request count, errors and latency per route; job runs, failures and age per queue; mail
// sent and bounced; audit-write failures; alerts raised (alerts.ts). Dimensions are bounded (a route pattern, a queue
// name, an alert kind), never an id, a firm or a person. The format, as AWS documents it:
//   { "_aws": { "Timestamp": <ms>, "CloudWatchMetrics": [{ "Namespace": "...", "Dimensions": [["Route"]],
//     "Metrics": [{ "Name": "Latency", "Unit": "Milliseconds" }] }] }, "Route": "GET /api/x", "Latency": 12 }
// emfProblems() checks a line against those rules; PF-23's test parses every metric line with it.
import { log, type Fields, type Level } from "./log.ts";

export const NAMESPACE = "ExpatReady/Studio";
export type Unit = "Count" | "Milliseconds" | "Seconds";
type Metric = { value: number; unit: Unit };

/** One EMF object: the dimensions' values and the metrics' values at the root, described under _aws. */
export function emf(dims: Record<string, string>, metrics: Record<string, Metric>, props: Fields = {}, now = Date.now()): Fields {
  // A dimension set holds at least one name: a metric with no dimension of its own is counted per service.
  const dimensions = Object.keys(dims).length ? dims : { Service: "studio-api" };
  const values: Fields = {};
  for (const [name, m] of Object.entries(metrics)) values[name] = Number.isFinite(m.value) ? m.value : 0;
  return {
    ...props,
    ...dimensions,
    ...values,
    _aws: {
      Timestamp: now,
      CloudWatchMetrics: [{ Namespace: NAMESPACE, Dimensions: [Object.keys(dimensions)], Metrics: Object.entries(metrics).map(([Name, m]) => ({ Name, Unit: m.unit })) }],
    },
  };
}

const UNITS = new Set(["Seconds", "Microseconds", "Milliseconds", "Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes", "Bits", "Kilobits", "Megabits", "Gigabits", "Terabits", "Percent", "Count", "Bytes/Second", "Kilobytes/Second", "Megabytes/Second", "Gigabytes/Second", "Terabytes/Second", "Bits/Second", "Kilobits/Second", "Megabits/Second", "Gigabits/Second", "Terabits/Second", "Count/Second", "None"]);

/** What is wrong with a parsed line as embedded metric format (empty when it is valid). */
export function emfProblems(o: unknown): string[] {
  const p: string[] = [];
  if (!o || typeof o !== "object" || Array.isArray(o)) return ["not a JSON object"];
  const root = o as Record<string, unknown>, aws = root._aws as Record<string, unknown> | undefined;
  if (!aws || typeof aws !== "object") return ["no _aws object"];
  if (typeof aws.Timestamp !== "number" || !Number.isInteger(aws.Timestamp) || aws.Timestamp <= 0) p.push("_aws.Timestamp is not a whole number of milliseconds");
  const directives = aws.CloudWatchMetrics;
  if (!Array.isArray(directives) || directives.length === 0) return [...p, "_aws.CloudWatchMetrics is not a non-empty array"];
  for (const d of directives as Record<string, unknown>[]) {
    if (typeof d?.Namespace !== "string" || !/^[A-Za-z0-9._#:/ -]{1,255}$/.test(d.Namespace)) p.push("a Namespace is missing or not 1-255 allowed characters");
    if (!Array.isArray(d?.Dimensions)) p.push("Dimensions is not an array");
    else for (const set of d.Dimensions as unknown[]) {
      if (!Array.isArray(set) || set.length < 1 || set.length > 30) { p.push("a dimension set is not an array of 1 to 30 names"); continue; }
      for (const name of set) if (typeof name !== "string" || typeof root[name] !== "string" || !(root[name] as string).length) p.push(`dimension ${String(name)} has no text value at the root`);
    }
    if (!Array.isArray(d?.Metrics) || d.Metrics.length === 0 || d.Metrics.length > 100) { p.push("Metrics is not an array of 1 to 100"); continue; }
    for (const m of d.Metrics as Record<string, unknown>[]) {
      if (typeof m?.Name !== "string" || !m.Name.length) { p.push("a metric has no Name"); continue; }
      if (m.Unit !== undefined && !UNITS.has(String(m.Unit))) p.push(`metric ${m.Name} has an unknown Unit ${String(m.Unit)}`);
      const v = root[m.Name];
      if (!(typeof v === "number" && Number.isFinite(v)) && !(Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === "number" && Number.isFinite(x)))) p.push(`metric ${m.Name} has no number value at the root`);
    }
  }
  return p;
}

function line(level: Level, event: string, obj: Fields) { log().trusted(level, event, obj); }
const ms = (n: number) => Math.max(0, Math.round(n));

/** The request line (hook.ts): one per request, also the request's metrics. */
export function requestLine(r: { method: string; route: string; status: number; durationMs: number; correlationId: string; firmId?: string; aborted?: boolean }) {
  const err = r.status >= 500 ? 1 : 0;
  line(err ? "error" : r.status >= 400 ? "warn" : "info", "request", emf(
    { Route: `${r.method} ${r.route}` },
    { Requests: { value: 1, unit: "Count" }, Errors: { value: err, unit: "Count" }, Latency: { value: ms(r.durationMs), unit: "Milliseconds" } },
    { method: r.method, route: r.route, status: r.status, durationMs: ms(r.durationMs), correlationId: r.correlationId, ...(r.firmId ? { firmId: r.firmId } : {}), ...(r.aborted ? { outcome: "aborted" } : {}) },
  ));
}

/** One background job's run (jobs.ts): runs, failures and how long it waited, per queue. */
export function jobLine(j: { queue: string; jobId: string; ok: boolean; durationMs: number; ageMs: number | null }) {
  line(j.ok ? "info" : "error", "job", emf(
    { Queue: j.queue },
    { JobRuns: { value: 1, unit: "Count" }, JobFailures: { value: j.ok ? 0 : 1, unit: "Count" }, ...(j.ageMs != null ? { JobAge: { value: ms(j.ageMs), unit: "Milliseconds" as const } } : {}), JobDuration: { value: ms(j.durationMs), unit: "Milliseconds" } }, // an unknown age is left out, never 0 (review m9)
    { queue: j.queue, jobId: j.jobId, outcome: j.ok ? "done" : "failed", durationMs: ms(j.durationMs), ...(j.ageMs != null ? { ageMs: ms(j.ageMs) } : {}) },
  ));
}

/** Mail sent or bounced (the mail adapter calls it: PF-4b's SES adapter, the bounce handler). Never the address. */
export function mailLine(kind: "sent" | "bounced", n = 1, mailClass?: "TRANSACTIONAL" | "SERVICE" | "MARKETING") {
  line(kind === "bounced" ? "warn" : "info", kind === "sent" ? "mail_sent" : "mail_bounced", emf({}, kind === "sent" ? { MailSent: { value: n, unit: "Count" } } : { MailBounced: { value: n, unit: "Count" } }, mailClass ? { mailClass } : {}));
}

/** An audit write that failed after its retries (alerts.ts, BR-5). */
export function auditFailureLine(ids: { firmId?: string; entity?: string; entityKey?: string; attempts: number }) {
  line("error", "audit_write_failed", emf({}, { AuditWriteFailures: { value: 1, unit: "Count" } }, { ...ids }));
}

/** An alert raised (alerts.ts): the metric a CloudWatch alarm watches, one dimension per kind (PF-23c). */
export function alertLine(kind: string, detail: Fields) {
  line("error", "alert", emf({ AlertKind: kind }, { Alerts: { value: 1, unit: "Count" } }, { alert: kind, ...detail }));
}
