// PF-14 (map row 9; AG-10-1, AG-11-17..20): the real JobPort, on pg-boss in its own schema of our PostgreSQL (no
// second store). pg-boss creates and migrates that schema itself at start; Prisma never sees it, so `migrate diff`
// stays empty. The interface and the fake every PF/FO test uses are PF-0p's (`ports/jobs.ts`, `ports/clock.ts`);
// this file is the adapter only.
//
// What it adds to pg-boss, each line the row's Done when:
// * a key never queues twice: the key becomes the job id (job-key.ts), so a second enqueue of a key is a no-op;
// * retries with back-off (Sample: 3 retries, 30 s doubling, at most 1 h) and then one dead-letter list
//   (`platform.dead-letter`) holding each failed job's name, key, firm and last error;
// * every job carries its firm; the handler runs only after `firmScope` accepts the firm id, and inside a firm context
//   (`currentJobFirm()`) that code below it reads; a recurring job is platform-wide (no firm) and fans out per firm
//   with `enqueue`;
// * a job never sends a message itself: a handler calls the owning module's port (MailPort and the like). Nothing in
//   this folder imports a sending port (tests/check_pf14_jobs.ts checks it).
// Payloads carry ids, never personal data or secrets (contracts §0.5): they sit in a plain jsonb column.
import { AsyncLocalStorage } from "node:async_hooks";
import { PgBoss, type ConstructorOptions, type Job, type JobWithMetadata } from "pg-boss";
import { z } from "zod";
import type { JobHandler, JobPort } from "../../../../ports/jobs.ts";
import { firmScope } from "../firm-scope.ts";
import { jobIdOf } from "./job-key.ts";

/** pg-boss's schema in our database (created by pg-boss at start, never by Prisma). */
export const JOBS_SCHEMA = "platform_jobs";
/** The one dead-letter list: every job that failed after its last retry, with its error. */
export const DEAD_LETTER = "platform.dead-letter";

/** Retry policy of every job queue (Sample values, contracts §0.8 sizing: about 100 firms). */
export type RetryPolicy = { retryLimit: number; retryDelay: number; retryBackoff: boolean; retryDelayMax: number; expireInSeconds: number };
export const DEFAULT_RETRY: RetryPolicy = { retryLimit: 3, retryDelay: 30, retryBackoff: true, retryDelayMax: 3600, expireInSeconds: 15 * 60 };

const KEY = z.string().min(1).max(200);
const NAME = z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/, "a job name is lower case words joined by dots or hyphens (e.g. fo.booking.reminder)").max(100);
const FIRM = z.string().refine((f) => { try { firmScope(f); return true; } catch { return false; } }, "not a firm id");
const OPTS = z.object({ key: KEY, firmId: FIRM });
const PAYLOAD = z.record(z.string(), z.unknown());
type Payload = z.infer<typeof PAYLOAD>;
/** What pg-boss stores as a job's data: our envelope around the caller's payload. */
const ENVELOPE = z.object({ key: KEY, firmId: FIRM.nullable(), payload: PAYLOAD });
type Envelope = z.infer<typeof ENVELOPE>;

/** A job that refused to run or failed after its last retry. */
export type DeadLetter = { name: string; key: string; firmId: string | null; error: string; failedAt: Date };

const firmOfJob = new AsyncLocalStorage<{ firmId: string | null; name: string }>();
/** The firm of the job running in this call chain (null: a platform-wide job; undefined: not inside a job). */
export function currentJobFirm(): string | null | undefined { return firmOfJob.getStore()?.firmId; }

/** Refused before anything is queued: a programming error (bad name, key, firm, cron or zone), never a person's. */
export class JobRefused extends Error {}

export type PgBossJobsOptions = {
  connectionString: string;
  schema?: string;
  retry?: Partial<RetryPolicy>;
  /** Seconds between a worker's polls for new jobs (pg-boss's minimum is 0.5). */
  pollingIntervalSeconds?: number;
  /** pg-boss's own options passed through (tests pass a TestClock as `clock`). */
  boss?: Partial<ConstructorOptions>;
  /** Where pg-boss's errors go (no payload is ever logged: ids and the queue name only). */
  onError?: (e: Error) => void;
};

export class PgBossJobs implements JobPort {
  readonly boss: PgBoss;
  readonly retry: RetryPolicy;
  /** Handlers by job name; each receives the payload it was queued with (the envelope's object of ids). */
  #handlers = new Map<string, JobHandler<Payload>>();
  #queues = new Set<string>();
  #working = new Set<string>();
  #started = false;
  #stopping: Promise<void> | null = null;
  #poll: number;

  constructor(o: PgBossJobsOptions) {
    this.retry = { ...DEFAULT_RETRY, ...o.retry };
    this.#poll = o.pollingIntervalSeconds ?? 2;
    this.boss = new PgBoss({ connectionString: o.connectionString, schema: o.schema ?? JOBS_SCHEMA, max: 3, application_name: "xr-studio-jobs", ...o.boss });
    // pg-boss emits "error" for background failures (maintenance, a lost connection); an EventEmitter "error" with no
    // listener would end the process, so it always has one.
    this.boss.on("error", (e) => (o.onError ?? ((x: Error) => console.error(`jobs: ${x.message}`)))(e));
  }

  get started() { return this.#started; }

  /** Starts pg-boss (creating or migrating its schema), the dead-letter list and a worker per registered handler. */
  async start(): Promise<void> {
    if (this.#started) return;
    await this.boss.start();
    // The list keeps a failed job for a year (Sample) instead of pg-boss's 14 days for a job nobody fetches.
    await this.boss.createQueue(DEAD_LETTER, { retentionSeconds: 365 * 24 * 3600 });
    this.#queues.add(DEAD_LETTER);
    this.#started = true;
    for (const name of this.#handlers.keys()) await this.#work(name);
  }

  /** Stops the worker: no new job is fetched, a running handler finishes (up to `timeoutMs`), then the pool closes. */
  stop(timeoutMs = 10_000): Promise<void> {
    if (!this.#started) return Promise.resolve();
    this.#stopping ??= (async () => {
      const done = new Promise<void>((r) => this.boss.once("stopped", () => r()));
      await this.boss.stop({ graceful: true, close: true, timeout: timeoutMs });
      await done;
      this.#started = false;
      this.#working.clear();
    })();
    return this.#stopping;
  }

  handle<P>(name: string, handler: JobHandler<P>): void {
    NAME.parse(name);
    if (this.#handlers.has(name)) throw new JobRefused(`jobs: "${name}" already has a handler`);
    this.#handlers.set(name, handler as unknown as JobHandler<Payload>);
    if (this.#started) void this.#work(name).catch((e) => this.boss.emit("error", e));
  }

  async enqueue<P>(name: string, payload: P, opts: { key: string; firmId: string }): Promise<{ queued: boolean }> {
    return this.#send(name, payload, opts);
  }

  async schedule<P>(name: string, at: Date, payload: P, opts: { key: string; firmId: string }): Promise<{ queued: boolean }> {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) throw new JobRefused("jobs: schedule needs a valid time");
    return this.#send(name, payload, opts, at);
  }

  /** Cancels the queued job with this key, of whatever name. True when one was cancelled. */
  async cancel(key: string): Promise<boolean> {
    KEY.parse(key);
    this.#mustBeStarted();
    const id = jobIdOf(key);
    let affected = 0;
    for (const q of await this.boss.getQueues()) {
      if (q.name === DEAD_LETTER || q.name.startsWith("__pgboss")) continue;
      // pg-boss 12 types CommandResponse as {}; at run time it carries `affected` (manager.js mapCommandResponse).
      affected += Number((await this.boss.cancel(q.name, id) as { affected?: number }).affected ?? 0);
    }
    return affected > 0;
  }

  /** A platform-wide job on a cron in a time zone (e.g. "0 9 * * *", "America/Toronto"): pg-boss evaluates the cron in
   *  that zone, so 09:00 stays 09:00 local across a clock change. Calling it again replaces the schedule. */
  async recurring(name: string, cron: string, zone: string): Promise<void> {
    NAME.parse(name);
    this.#mustBeStarted();
    if (!validZone(zone)) throw new JobRefused(`jobs: "${zone}" is not a time zone`);
    try { this.boss.previewSchedule(cron, { tz: zone, count: 1, from: new Date(0) }); } catch (e) { throw new JobRefused(`jobs: "${cron}" is not a cron: ${(e as Error).message}`); }
    await this.#queue(name);
    const data: Envelope = { key: `recurring:${name}`, firmId: null, payload: {} };
    await this.boss.schedule(name, cron, data, { tz: zone });
  }

  /** The dead-letter list, newest first. */
  async deadLetters(limit = 100): Promise<DeadLetter[]> {
    this.#mustBeStarted();
    const rows = await this.boss.findJobs<Record<string, unknown>>(DEAD_LETTER, { limit: 100_000 });
    return rows.map(toDeadLetter).sort((a, b) => b.failedAt.getTime() - a.failedAt.getTime()).slice(0, limit);
  }

  async #send(name: string, payload: unknown, opts: { key: string; firmId: string }, at?: Date): Promise<{ queued: boolean }> {
    NAME.parse(name);
    const o = OPTS.safeParse(opts);
    if (!o.success) throw new JobRefused(`jobs: ${name}: ${o.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    const p = PAYLOAD.safeParse(payload ?? {});
    if (!p.success) throw new JobRefused(`jobs: ${name}: the payload is a JSON object of ids`);
    this.#mustBeStarted();
    await this.#queue(name);
    const data: Envelope = { key: o.data.key, firmId: firmScope(o.data.firmId).firmId, payload: p.data };
    const id = await this.boss.send(name, data, { id: jobIdOf(o.data.key), ...(at ? { startAfter: at } : {}) });
    return { queued: id !== null };
  }

  /** Each job name is its own queue, created once with the retry policy and the dead-letter list. Completed jobs are
   *  kept (deleteAfterSeconds 0), so a finished job's key still refuses a second one. */
  async #queue(name: string) {
    if (this.#queues.has(name)) return;
    await this.boss.createQueue(name, { ...this.retry, deadLetter: DEAD_LETTER, deleteAfterSeconds: 0 });
    this.#queues.add(name);
  }

  async #work(name: string) {
    if (this.#working.has(name)) return;
    this.#working.add(name);
    await this.#queue(name);
    const handler = this.#handlers.get(name)!;
    await this.boss.work<Record<string, unknown>>(name, { pollingIntervalSeconds: this.#poll, batchSize: 1 }, async (jobs: Job<Record<string, unknown>>[]) => {
      for (const job of jobs) await this.#run(name, handler, job);
    });
  }

  async #run(name: string, handler: JobHandler<Payload>, job: Job<Record<string, unknown>>) {
    // A job whose envelope is not ours (written by hand, or by an older shape) or whose firm id is not a firm never
    // reaches the handler: it fails, and after its retries it is on the dead-letter list with this reason.
    const env = ENVELOPE.safeParse(job.data);
    if (!env.success) throw new JobRefused(`jobs: ${name}: the job's data is not a PF-14 envelope (${env.error.issues[0]?.path.join(".")})`);
    const firmId = env.data.firmId === null ? null : firmScope(env.data.firmId).firmId;
    const attempt = job.retryCount + 1;
    await firmOfJob.run({ firmId, name }, () => handler({ name, key: env.data.key, firmId, payload: env.data.payload, attempt }));
  }

  #mustBeStarted() {
    if (!this.#started) throw new JobRefused("jobs: the job runner has not started (or has stopped)");
  }
}

function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat("en-CA", { timeZone: zone }); return /\//.test(zone) || zone === "UTC"; } catch { return false; }
}

function toDeadLetter(j: JobWithMetadata<Record<string, unknown>>): DeadLetter {
  const env = ENVELOPE.safeParse(j.data);
  const out = j.sourceOutput as { message?: unknown } | null | undefined;
  return {
    name: String(j.sourceName ?? "?"),
    key: env.success ? env.data.key : "?",
    firmId: env.success ? env.data.firmId : null,
    error: typeof out?.message === "string" ? out.message : JSON.stringify(out ?? null),
    failedAt: j.createdOn,
  };
}
