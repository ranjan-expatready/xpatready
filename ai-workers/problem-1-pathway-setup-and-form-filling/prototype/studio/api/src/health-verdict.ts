// M1: the verdict of GET /api/health (api/src/health.ts), apart from Nest so a test reads it without a server
// (tests/check_m1_health.ts). Pure: the probes' findings and the limits in, the answer out.
/** A limit from the copy's environment: a positive number, else the default (review m9: "abc" must never make a part
 *  that cannot fail, as NaN compares false). */
export const limitOf = (raw: string | undefined, dflt: number) => { const n = Number(raw); return raw != null && raw.trim() !== "" && Number.isFinite(n) && n > 0 ? n : dflt; };
/** The limits, each overridable by the copy's environment. */
export const HEALTH_LIMITS = {
  /** Below this many GB free, new copies, uploads and the database's own writes may fail. */
  minFreeGb: limitOf(process.env.HEALTH_MIN_FREE_GB, 2),
  /** A form copy queued or running longer than this many minutes is stuck (one fill takes seconds to a minute). */
  fillMaxAgeMin: limitOf(process.env.HEALTH_FILL_MAX_AGE_MIN, 15),
  /** The database ping waits this long before it counts as not answering. */
  dbTimeoutMs: limitOf(process.env.HEALTH_DB_TIMEOUT_MS, 2000),
};

/** `p`, or a refusal after `ms`: a database that hangs (a lock, a stopped server that keeps the socket) is named within
 *  the limit, never waited on. */
export const within = <T,>(ms: number, p: Promise<T>): Promise<T> => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<never>((_, no) => { t = setTimeout(() => no(new Error(`no answer within ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
};
export type HealthLimits = typeof HEALTH_LIMITS;

/** What the probes found; null where a probe could not run (the queue cannot be read while the database is down). */
export type HealthProbes = {
  database: { ok: true; ms: number } | { ok: false; error: string };
  freeBytes: number | null;
  fill: { waiting: number; oldestCreatedAt: Date | null } | null;
};
export type HealthPart = { ok: boolean | null; words: string } & Record<string, unknown>;
export type Health = {
  status: "ok" | "bad"; failing: string[];
  checks: { database: HealthPart; disk: HealthPart; fill_queue: HealthPart };
  sha: string; started_at: string; uptime_s: number; ms?: number;
};

const GB = 1024 ** 3;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The verdict from what the probes found: pure, so each rule has its own pass and fail test (tests/check_m1_health.ts). */
export function judgeHealth(p: HealthProbes, limits: HealthLimits, now: Date, sha: string, startedAt: Date): Health {
  const database: HealthPart = p.database.ok
    ? { ok: true, ms: p.database.ms, words: "The database answers." }
    : { ok: false, words: `The database does not answer: ${p.database.error}`.slice(0, 300) };
  const freeGb = p.freeBytes == null ? null : round1(p.freeBytes / GB);
  const disk: HealthPart = freeGb == null
    ? { ok: false, free_gb: null, min_gb: limits.minFreeGb, words: "The free disk space could not be read." }
    : freeGb < limits.minFreeGb
      ? { ok: false, free_gb: freeGb, min_gb: limits.minFreeGb, words: `Only ${freeGb} GB free on the disk; at least ${limits.minFreeGb} GB is needed.` }
      : { ok: true, free_gb: freeGb, min_gb: limits.minFreeGb, words: `${freeGb} GB free on the disk.` };
  let fill_queue: HealthPart;
  // The queue is read from the database: with the database down it is unknown, never a second failure.
  if (!p.fill || !p.database.ok) fill_queue = { ok: null, waiting: null, oldest_age_s: null, max_age_s: limits.fillMaxAgeMin * 60, words: "Not checked: the fill queue is read from the database." };
  else {
    const age = p.fill.oldestCreatedAt ? Math.max(0, Math.round((now.getTime() - p.fill.oldestCreatedAt.getTime()) / 1000)) : 0;
    const stuck = age > limits.fillMaxAgeMin * 60;
    fill_queue = {
      ok: !stuck, waiting: p.fill.waiting, oldest_age_s: p.fill.waiting ? age : null, max_age_s: limits.fillMaxAgeMin * 60,
      words: !p.fill.waiting ? "No form copy is waiting." : stuck
        ? `A form copy has waited ${Math.round(age / 60)} min in the fill queue; at most ${limits.fillMaxAgeMin} min is expected.`
        : `${p.fill.waiting} form ${p.fill.waiting === 1 ? "copy is" : "copies are"} being made; the oldest for ${age} s.`,
    };
  }
  const checks = { database, disk, fill_queue };
  const failing = (Object.keys(checks) as (keyof typeof checks)[]).filter((k) => checks[k].ok === false);
  return { status: failing.length ? "bad" : "ok", failing, checks, sha, started_at: startedAt.toISOString(), uptime_s: Math.round((now.getTime() - startedAt.getTime()) / 1000) };
}
