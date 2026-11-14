// PF-14 (map row 9; AG-10-1, AG-11-17..20): the real JobPort, on pg-boss in its own schema of our PostgreSQL (no
// second store). pg-boss creates and migrates that schema itself at start; Prisma never sees it, so `migrate diff`
// stays empty. The interface and the fake every PF/FO test uses are PF-0p's (`ports/jobs.ts`, `ports/clock.ts`);
// this file is the adapter only.
//
// What it adds to pg-boss, each line the row's Done when:
// * a key never queues twice (per job name): the key becomes the job id (job-key.ts), so a second enqueue of a key is
//   a no-op, and no job row is ever deleted (finished: deleteAfterSeconds 0; waiting: kept 10 years), so a used key
//   stays used;
// * retries with back-off (Sample: 3 retries, 30 s doubling, at most 1 h) and then one dead-letter list
//   (`platform.dead_letter`) holding each failed job's name, key, firm and last error (its message only: no stack);
// * calls made while the app starts are safe: `handle` and `recurring` before start are applied at start; `enqueue`,
//   `schedule` and `cancel` before start wait for it (call them from onApplicationBootstrap or later, never from
//   onModuleInit, which runs before the runner can start);
// * every job carries its firm; the handler runs only after `firmScope` accepts the firm id, and inside a firm context
//   (`currentJobFirm()`) that code below it reads; a recurring job is platform-wide (no firm) and fans out per firm
//   with `enqueue`;
// * a job never sends a message itself: a handler calls the owning module's port (MailPort and the like). Nothing in
//   this folder imports a sending port (tests/check_pf14_jobs.ts checks it).
// Payloads carry ids, never personal data or secrets (contracts §0.5): they sit in a plain jsonb column.
import { AsyncLocalStorage } from "node:async_hooks";
import { PgBoss, type ConstructorOptions, type JobWithMetadata } from "pg-boss";
import { z } from "zod";
import { CronSpec, JobName, JobOptions, JobPayload, type JobHandler, type JobPort } from "../../../../ports/jobs.ts";
import { firmScope } from "../firm-scope.ts";
import { jobIdOf } from "./job-key.ts";

/** pg-boss's schema in our database (created by pg-boss at start, never by Prisma). */
export const JOBS_SCHEMA = "platform_jobs";
/** The one dead-letter list: every job that failed after its last retry, with its error. */
export const DEAD_LETTER = "platform.dead_letter";

/** A job never waits for a fetch longer than this before pg-boss would delete it (and free its key): 10 years. */
const KEEP_WAITING_SECONDS = 10 * 365 * 24 * 3600;
/** How long an enqueue made before start waits for the runner to start before it is refused. */
const START_WAIT_MS = 30_000;
/** Stop's limit for a running handler: under the 10 s restart-api.sh and isolated.sh give the process before kill -9. */
export const STOP_LIMIT_MS = 8_000;
/** The longest error text kept on the dead-letter list (a handler's message; ids only, never personal data). */
const ERROR_CHARS = 300;

/** Retry policy of every job queue (Sample values, contracts §0.8 sizing: about 100 firms). */
export type RetryPolicy = { retryLimit: number; retryDelay: number; retryBackoff: boolean; retryDelayMax: number; expireInSeconds: number };
export const DEFAULT_RETRY: RetryPolicy = { retryLimit: 3, retryDelay: 30, retryBackoff: true, retryDelayMax: 3600, expireInSeconds: 15 * 60 };

const FIRM = z.string().refine((f) => { try { firmScope(f); return true; } catch { return false; } }, "not a firm id");
/** What pg-boss stores as a job's data: our envelope around the caller's payload. A recurring schedule's envelope has
 *  no firm and `recurring: true`; each of its runs gets the key `<name>@<minute, ISO>` (as PF-0p's fake gives). */
const ENVELOPE = z.object({ key: z.string().min(1).max(200), firmId: FIRM.nullable(), payload: JobPayload, recurring: z.literal(true).optional() });
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
  /** How long a call made before start waits for it (default 30 s). */
  startWaitMs?: number;
};

export class PgBossJobs implements JobPort {
  readonly boss: PgBoss;
  readonly retry: RetryPolicy;
  #handlers = new Map<string, JobHandler>();
  #schedules = new Map<string, { cron: string; zone: string }>();
  #queues = new Set<string>();
  #working = new Set<string>();
  #state: "new" | "starting" | "started" | "stopping" | "stopped" = "new";
  #stopping: Promise<void> | null = null;
  #ready = deferred();
  #poll: number;
  #startWait: number;

  constructor(o: PgBossJobsOptions) {
    this.retry = { ...DEFAULT_RETRY, ...o.retry };
    this.#startWait = o.startWaitMs ?? START_WAIT_MS;
    this.#poll = o.pollingIntervalSeconds ?? 2;
    this.boss = new PgBoss({ connectionString: o.connectionString, schema: o.schema ?? JOBS_SCHEMA, max: 3, application_name: "xr-studio-jobs", ...o.boss });
    // pg-boss emits "error" for background failures (maintenance, a lost connection); an EventEmitter "error" with no
    // listener would end the process, so it always has one.
    this.boss.on("error", (e) => (o.onError ?? ((x: Error) => console.error(`jobs: ${x.message}`)))(e));
  }

  get started() { return this.#state === "started"; }

  /** Starts pg-boss (creating or migrating its schema), the dead-letter list, the schedules and a worker per handler
   *  registered so far. A stopped runner can start again. */
  async start(): Promise<void> {
    if (this.#state === "started" || this.#state === "starting") return this.#ready.promise;
    if (this.#state === "stopping") await this.#stopping;
    if (this.#state === "stopped") { this.#ready = deferred(); this.#queues.clear(); }
    this.#state = "starting";
    try {
      await this.boss.start();
      // The list keeps a failed job for a year (Sample) instead of pg-boss's 14 days for a job nobody fetches.
      await this.boss.createQueue(DEAD_LETTER, { retentionSeconds: 365 * 24 * 3600 });
      await this.boss.updateQueue(DEAD_LETTER, { retentionSeconds: 365 * 24 * 3600 });
      this.#queues.add(DEAD_LETTER);
      for (const [name, s] of this.#schedules) await this.#applySchedule(name, s.cron, s.zone);
      for (const name of this.#handlers.keys()) await this.#work(name);
      this.#state = "started";
      this.#ready.resolve();
    } catch (e) {
      this.#state = "new";
      this.#ready.reject(e);
      this.#ready = deferred();
      throw e;
    }
  }

  /** Stops the worker: no new job is fetched, a running handler gets up to `timeoutMs` to finish, then the pool closes.
   *  A handler still running then is failed by pg-boss: it is retried while it has retries left, and otherwise lands
   *  on the dead-letter list (a handler must be idempotent, as for a crash). */
  stop(timeoutMs = STOP_LIMIT_MS): Promise<void> {
    if (this.#state !== "started") return this.#stopping ?? Promise.resolve();
    this.#state = "stopping";
    this.#stopping = (async () => {
      try {
        const done = new Promise<void>((r) => this.boss.once("stopped", () => r()));
        await this.boss.stop({ graceful: true, close: true, timeout: timeoutMs });
        await done;
      } finally {
        this.#state = "stopped";
        this.#working.clear();
        this.#stopping = null;
      }
    })();
    return this.#stopping;
  }

  /** The worker of queue `name` (one per name). Registered before start: it starts with the runner. */
  async handle(name: string, handler: JobHandler): Promise<void> {
    JobName.parse(name);
    if (this.#handlers.has(name)) throw new JobRefused(`jobs: "${name}" already has a handler`);
    this.#handlers.set(name, handler);
    if (this.#state === "started") await this.#work(name);
  }

  async enqueue(name: string, payload: JobPayload, opts: JobOptions): Promise<{ queued: boolean }> {
    return this.#send(name, payload, opts);
  }

  async schedule(name: string, at: Date, payload: JobPayload, opts: JobOptions): Promise<{ queued: boolean }> {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) throw new JobRefused("jobs: schedule needs a valid time");
    return this.#send(name, payload, opts, at);
  }

  /** Cancels the waiting job with this key, of whatever name; true when one was waiting. A job already running is not
   *  cancelled (it finishes). Its key stays used either way. */
  async cancel(key: string): Promise<boolean> {
    JobOptions.shape.key.parse(key);
    await this.#whenStarted();
    const id = jobIdOf(key);
    let affected = 0;
    for (const q of await this.boss.getQueues()) {
      if (q.name === DEAD_LETTER || q.name.startsWith("__pgboss")) continue;
      // Only a waiting job (created or retry; findJobs' `queued` leaves out one whose time is still ahead, so the state
      // is read). pg-boss has no cancel-if-waiting (its attempt fence matches active jobs only), so a job that starts in
      // the instant between this read and the cancel is marked cancelled while its handler finishes; handlers are
      // idempotent. pg-boss 12 types the answer as {}; at run time it carries `affected` (manager.js mapCommandResponse).
      const [waiting] = (await this.boss.findJobs(q.name, { id, limit: 1 })).filter((j) => j.state === "created" || j.state === "retry");
      if (!waiting) continue;
      affected += Number((await this.boss.cancel(q.name, id) as { affected?: number }).affected ?? 0);
    }
    return affected > 0;
  }

  /** A platform-wide job on a cron read in a time zone (e.g. "0 9 * * *", "America/Toronto"): pg-boss evaluates the
   *  cron in that zone, so 09:00 stays 09:00 local across a clock change. A second call replaces the schedule. Called
   *  before start, it is applied at start. */
  async recurring(name: string, cron: string, zone: string): Promise<void> {
    JobName.parse(name);
    const spec = CronSpec.safeParse({ cron, zone });
    if (!spec.success) throw new JobRefused(`jobs: ${name}: ${spec.error.issues.map((i) => i.message).join("; ")}`);
    if (this.#state === "stopping" || this.#state === "stopped") this.#mustBeStarted();
    this.#schedules.set(name, { cron, zone });
    // Landing while start() runs (another provider's onApplicationBootstrap): wait for it, then apply (review m10).
    if (this.#state === "starting") await this.#ready.promise;
    if (this.#state === "started") await this.#applySchedule(name, cron, zone);
  }

  /** The dead-letter list, newest first (read from its oldest 10 000; the list keeps a year, Sample). */
  async deadLetters(limit = 100): Promise<DeadLetter[]> {
    await this.#whenStarted();
    const rows = await this.boss.findJobs<Record<string, unknown>>(DEAD_LETTER, { limit: 10_000 });
    return rows.map(toDeadLetter).sort((a, b) => b.failedAt.getTime() - a.failedAt.getTime()).slice(0, limit);
  }

  async #applySchedule(name: string, cron: string, zone: string) {
    await this.#queue(name);
    const data: Envelope = { key: name, firmId: null, payload: {}, recurring: true };
    await this.boss.schedule(name, cron, data, { tz: zone });
  }

  async #send(name: string, payload: JobPayload, opts: JobOptions, at?: Date): Promise<{ queued: boolean }> {
    JobName.parse(name);
    const o = JobOptions.safeParse(opts);
    if (!o.success) throw new JobRefused(`jobs: ${name}: ${o.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    const p = JobPayload.safeParse(payload);
    if (!p.success) throw new JobRefused(`jobs: ${name}: the payload is a JSON object of ids and facts`);
    await this.#whenStarted();
    await this.#queue(name);
    const data: Envelope = { key: o.data.key, firmId: firmScope(o.data.firmId).firmId, payload: p.data };
    const id = await this.boss.send(name, data, { id: jobIdOf(o.data.key), ...(at ? { startAfter: at } : {}) });
    return { queued: id !== null };
  }

  /** Each job name is its own queue with the retry policy, the dead-letter list and no deletion: finished and cancelled
   *  jobs are kept (deleteAfterSeconds 0) and a waiting one for 10 years, so a used key still refuses a second job. The
   *  policy is written on every start (createQueue leaves an existing queue as it was; updateQueue brings it up to date). */
  async #queue(name: string) {
    if (this.#queues.has(name)) return;
    const policy = { ...this.retry, deadLetter: DEAD_LETTER, deleteAfterSeconds: 0, retentionSeconds: KEEP_WAITING_SECONDS };
    await this.boss.createQueue(name, policy);
    await this.boss.updateQueue(name, policy);
    this.#queues.add(name);
  }

  async #work(name: string) {
    if (this.#working.has(name)) return;
    this.#working.add(name);
    await this.#queue(name);
    const handler = this.#handlers.get(name)!;
    await this.boss.work(name, { pollingIntervalSeconds: this.#poll, batchSize: 1, includeMetadata: true }, async (jobs: JobWithMetadata<Record<string, unknown>>[]) => {
      for (const job of jobs) await this.#run(name, handler, job);
    });
  }

  async #run(name: string, handler: JobHandler, job: JobWithMetadata<Record<string, unknown>>) {
    // A job whose envelope is not ours (written by hand, or by an older shape) or whose firm id is not a firm never
    // reaches the handler: it fails, and after its retries it is on the dead-letter list with this reason.
    const env = ENVELOPE.safeParse(job.data);
    if (!env.success) throw new JobRefused(`jobs: ${name}: the job's data is not a PF-14 envelope (${env.error.issues[0]?.path.join(".")})`);
    const firmId = env.data.firmId === null ? null : firmScope(env.data.firmId).firmId;
    if (firmId === null && !env.data.recurring) throw new JobRefused(`jobs: ${name}: a job without a firm`);
    // A recurring run's instant is the minute pg-boss sent it in (its cron pass runs a moment into the cron minute;
    // pg-boss's default `missed: skip` sends nothing for minutes the app was down); its key names that minute.
    const runAt = env.data.recurring ? new Date(Math.floor(new Date(job.startAfter).getTime() / 60_000) * 60_000) : new Date(job.startAfter);
    const key = env.data.recurring ? `${name}@${runAt.toISOString()}` : env.data.key;
    const attempt = job.retryCount + 1;
    try {
      await firmOfJob.run({ firmId, name }, () => handler({ name, payload: env.data.payload, key, firmId, runAt, attempt }));
    } catch (e) {
      throw cleanError(e);
    }
  }

  async #whenStarted() {
    if (this.#state === "started") return;
    if (this.#state === "stopping" || this.#state === "stopped") this.#mustBeStarted();
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<never>((_, no) => { timer = setTimeout(() => no(new JobRefused(`jobs: the job runner did not start within ${this.#startWait / 1000} s (enqueue from onApplicationBootstrap or later, not onModuleInit)`)), this.#startWait); });
    try { await Promise.race([this.#ready.promise, late]); } finally { clearTimeout(timer); }
  }

  #mustBeStarted() {
    if (this.#state !== "started") throw new JobRefused("jobs: the job runner has not started (or has stopped)");
  }
}

function deferred() {
  let resolve!: () => void, reject!: (e: unknown) => void;
  const promise = new Promise<void>((y, n) => { resolve = y; reject = n; });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

/** What a failed attempt stores (pg-boss keeps it on the job and copies it to the dead-letter list for a year): the
 *  error's message, cut to 300 characters, with no stack (a stack can carry values from the code's locals). */
function cleanError(e: unknown): Error {
  const message = (e instanceof Error ? e.message : String(e)).slice(0, ERROR_CHARS);
  const clean = e instanceof JobRefused ? new JobRefused(message) : new Error(message);
  clean.stack = `${clean.name}: ${message}`;
  return clean;
}

/** The message inside pg-boss's stored output, however deep it sits (a handler's error, a timeout, a shutdown). */
function messageOf(out: unknown, depth = 0): string | null {
  if (out === null || typeof out !== "object" || depth > 3) return null;
  const o = out as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  for (const v of Object.values(o)) { const m = messageOf(v, depth + 1); if (m) return m; }
  return null;
}

function toDeadLetter(j: JobWithMetadata<Record<string, unknown>>): DeadLetter {
  const env = ENVELOPE.safeParse(j.data);
  const out = j.sourceOutput;
  return {
    name: String(j.sourceName ?? "?"),
    key: env.success ? env.data.key : "?",
    firmId: env.success ? env.data.firmId : null,
    error: (messageOf(out) ?? JSON.stringify(out ?? null)).slice(0, ERROR_CHARS),
    failedAt: j.createdOn,
  };
}
