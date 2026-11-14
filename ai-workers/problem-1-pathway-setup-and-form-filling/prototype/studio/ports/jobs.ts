// PF-0p (rows rev 16): the background jobs port. PF-14 builds the real adapter (pg-boss, its own schema) behind it; until
// then every row uses fakeJobs(clock), which runs due jobs when the test's clock moves. This folder imports only zod and
// its own files.
import { z } from "zod";
import { FirmId } from "./audit.ts";
import type { FakeClock } from "./clock.ts";

/** A queue name: lower case, dotted (`booking.reminder`, `invoice.overdue_sweep`). */
export const JobName = z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "a dotted lower-case job name").max(100);
/** What a job carries: plain JSON (ids and facts; never a secret, a card number or a person's details). */
export const JobPayload = z.record(z.string(), z.json());
export type JobPayload = z.infer<typeof JobPayload>;
/** `key` is the job's own idempotency key (`booking:<uuid>:reminder-24h`): a key never queues twice under the same job
 *  name, even after its job ran or was cancelled (unique per name, as pg-boss's job table is keyed by name: PF-14). Keys
 *  are one space across every firm (and `cancel` takes only the key), so a key must carry a uuid or the firm id: never a
 *  per-firm number alone (`invoice:INV-0001` of firm B would be lost behind firm A's). The firm is the tenant the job
 *  works for. */
export const JobOptions = z.strictObject({ key: z.string().min(1).max(200), firmId: FirmId });
export type JobOptions = z.infer<typeof JobOptions>;
/** A recurring schedule: five cron fields (minute hour day-of-month month day-of-week) read in an IANA zone. */
export const CronSpec = z.object({
  cron: z.string().refine((c) => { try { parseCron(c); return true; } catch { return false; } }, "five cron fields: minute hour day month weekday"),
  zone: z.string().refine(isZone, "an IANA time zone (America/Toronto)"),
});

/** One run as the handler sees it. A recurring run has no firm (it sweeps every firm itself) and its key is
 *  `<name>@<minute, ISO>`. `attempt` counts from 1 (a real queue's retry is attempt 2; the fake never retries). */
export type JobRun = { name: string; payload: JobPayload; key: string; firmId: string | null; runAt: Date; attempt: number };
export type JobHandler = (job: JobRun) => Promise<void>;

export interface JobPort {
  /** Queues a job to run now. `{ queued: false }` when its key was queued before under this name (nothing changes). */
  enqueue(name: string, payload: JobPayload, opts: JobOptions): Promise<{ queued: boolean }>;
  /** Queues a job to run at `at` (or soon after); same key rule. */
  schedule(name: string, at: Date, payload: JobPayload, opts: JobOptions): Promise<{ queued: boolean }>;
  /** Cancels every waiting job of `key`, whatever its name; true when one was waiting. Its key stays used. */
  cancel(key: string): Promise<boolean>;
  /** Runs queue `name` on a cron schedule in `zone` (one schedule per name: a second call replaces it). */
  recurring(name: string, cron: string, zone: string): Promise<void>;
  /** The worker for queue `name` (one per name). */
  handle(name: string, handler: JobHandler): Promise<void>;
}

type FakeJob = JobRun & { id: number; status: "waiting" | "done" | "failed" | "cancelled"; error?: string };
export type FakeJobs = JobPort & {
  /** Every job queued (recurring runs included), in queue order. */
  readonly jobs: ReadonlyArray<Readonly<FakeJob>>;
  /** Runs every waiting job due by the clock's now, earliest first (also called on each clock move). A handler's throw
   *  marks its job failed (the fake never retries); a job whose queue has no handler waits. */
  runDue(): Promise<void>;
};

/** The fake: in memory, driven by `clock` (each `set`/`advance` runs the cron minutes passed and then the due jobs). */
export function fakeJobs(clock: FakeClock): FakeJobs {
  const jobs: FakeJob[] = [], used = new Set<string>(), handlers = new Map<string, JobHandler>();
  const schedules = new Map<string, { cron: ReturnType<typeof parseCron>; zone: string }>();
  let nextId = 1, lastTick = clock.now().getTime(), running = false;

  const queue = (name: string, at: Date, payload: JobPayload, opts: JobOptions): { queued: boolean } => {
    JobName.parse(name);
    const p = JobPayload.parse(JSON.parse(JSON.stringify(JobPayload.parse(payload))) as unknown);
    const o = JobOptions.parse(opts);
    if (!Number.isFinite(at.getTime())) throw new RangeError("schedule: `at` is not a time");
    if (used.has(`${name}\u0000${o.key}`)) return { queued: false };
    used.add(`${name}\u0000${o.key}`);
    jobs.push({ id: nextId++, name, payload: p, key: o.key, firmId: o.firmId.toLowerCase(), runAt: new Date(at), attempt: 1, status: "waiting" });
    return { queued: true };
  };

  const runDue = async () => {
    if (running) return;   // a handler that moves the clock does not re-enter
    running = true;
    try {
      for (let runs = 0; ; runs++) {
        const now = clock.now().getTime();
        const due = jobs.filter((j) => j.status === "waiting" && j.runAt.getTime() <= now && handlers.has(j.name)).sort((a, b) => a.runAt.getTime() - b.runAt.getTime() || a.id - b.id)[0];
        if (!due) return;
        if (runs >= 10_000) throw new Error("fakeJobs: more than 10 000 runs in one step (a job that queues itself without end?)");
        try { await handlers.get(due.name)!({ name: due.name, payload: structuredClone(due.payload), key: due.key, firmId: due.firmId, runAt: new Date(due.runAt), attempt: due.attempt }); due.status = "done"; }
        catch (e) { due.status = "failed"; due.error = e instanceof Error ? e.message : String(e); }
      }
    } finally { running = false; }
  };

  const tick = async (now: Date) => {
    const to = Math.floor(now.getTime() / 60_000) * 60_000;
    let from = Math.floor(lastTick / 60_000) * 60_000 + 60_000;
    lastTick = Math.max(lastTick, now.getTime());   // a clock set backward runs no cron minute twice
    if (schedules.size && to - from > 400 * 24 * 60 * 60_000) throw new RangeError("fakeJobs: a cron step of more than 400 days at once; advance in smaller steps");
    for (; schedules.size && from <= to; from += 60_000) {
      for (const [name, s] of schedules) if (cronMatches(s.cron, new Date(from), s.zone)) {
        const key = `${name}@${new Date(from).toISOString()}`;
        if (!used.has(`${name}\u0000${key}`)) { used.add(`${name}\u0000${key}`); jobs.push({ id: nextId++, name, payload: {}, key, firmId: null, runAt: new Date(from), attempt: 1, status: "waiting" }); }
      }
    }
    await runDue();
  };
  clock.onChange(tick);

  return {
    async enqueue(name, payload, opts) { return queue(name, clock.now(), payload, opts); },
    async schedule(name, at, payload, opts) { return queue(name, at, payload, opts); },
    async cancel(key) {
      const waiting = jobs.filter((x) => x.key === key && x.status === "waiting");
      for (const j of waiting) j.status = "cancelled";
      return waiting.length > 0;
    },
    async recurring(name, cron, zone) {
      JobName.parse(name);
      CronSpec.parse({ cron, zone });
      schedules.set(name, { cron: parseCron(cron), zone });
    },
    async handle(name, handler) { JobName.parse(name); handlers.set(name, handler); },
    get jobs() { return jobs.map((j) => ({ ...j, runAt: new Date(j.runAt), payload: structuredClone(j.payload) })); },   // copies: inspecting never changes a job
    runDue,
  };
}

// ---------------------------------------------------------------------------------------------- cron, for the fake only
const FIELDS = [["minute", 0, 59], ["hour", 0, 23], ["day", 1, 31], ["month", 1, 12], ["weekday", 0, 7]] as const;

/** Five fields, each `*`, `n`, `a-b`, a list of those, any with `/step`. Weekday 0 and 7 are Sunday. The fake reads each
 *  UTC minute's wall time in the zone, so across a daylight-saving change a time that happens twice (fall back, e.g.
 *  01:30 in Toronto on 1 Nov 2026) runs twice and a time that does not happen (spring forward, 02:30 on 8 Mar) is
 *  skipped; schedule recurring work outside 01:00-03:00 local. */
export function parseCron(cron: string): { sets: Set<number>[]; dayAny: boolean; weekdayAny: boolean } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`cron "${cron}": five fields`);
  const sets = parts.map((p, i) => {
    const [, lo, hi] = FIELDS[i], out = new Set<number>();
    for (const item of p.split(",")) {
      const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(item);
      if (!m) throw new Error(`cron "${cron}": ${FIELDS[i][0]} "${item}"`);
      const a = m[1] === "*" ? lo : Number(m[2]), b = m[1] === "*" ? hi : m[3] !== undefined ? Number(m[3]) : m[4] ? hi : a, step = m[4] ? Number(m[4]) : 1;
      if (a < lo || b > hi || a > b || step < 1) throw new Error(`cron "${cron}": ${FIELDS[i][0]} "${item}" out of range`);
      for (let v = a; v <= b; v += step) out.add(i === 4 && v === 7 ? 0 : v);
    }
    return out;
  });
  return { sets, dayAny: parts[2].startsWith("*"), weekdayAny: parts[4].startsWith("*") };   // Vixie cron: a field starting with * makes the day rule AND
}

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
/** Whether the minute `at` matches, read in `zone` (cron's day rule: when both day and weekday are restricted, either). */
const formats = new Map<string, Intl.DateTimeFormat>();
export function cronMatches(c: ReturnType<typeof parseCron>, at: Date, zone: string): boolean {
  let f = formats.get(zone);
  if (!f) formats.set(zone, (f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })));
  const parts = Object.fromEntries(f.formatToParts(at).map((p) => [p.type, p.value]));
  const [mi, h, d, mo, wd] = [Number(parts.minute), Number(parts.hour), Number(parts.day), Number(parts.month), WEEKDAY[parts.weekday]];
  const dayOk = c.dayAny || c.weekdayAny ? c.sets[2].has(d) && c.sets[4].has(wd) : c.sets[2].has(d) || c.sets[4].has(wd);
  return c.sets[0].has(mi) && c.sets[1].has(h) && c.sets[3].has(mo) && dayOk;
}

function isZone(zone: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return zone.includes("/") || zone === "UTC"; } catch { return false; }
}
