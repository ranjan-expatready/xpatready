// PF-14 (map row 9; AG-10-1, AG-11-17..20; BACKLOG row PF-14 rev 11/16): background jobs behind JobPort, on pg-boss in
// its own schema. Every line of the row's "Done when", each with a passing and a failing case, against real pg-boss on
// a scratch database. Time is pg-boss's own TestClock: it moves JavaScript timers and PostgreSQL's job_now() together,
// so a job due tomorrow at 09:00 Toronto runs with no real waiting. One child process (this file, run with
// --crash-child) is killed with SIGKILL mid-job to prove the rerun. No server, no browser, no model call (US$0). The
// scratch databases are dropped at the end.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_pf14_jobs.ts
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PgBoss, TestClock } from "pg-boss";
import { firmScope } from "../api/src/platform/firm-scope.ts";
import { jobIdOf } from "../api/src/platform/jobs/job-key.ts";
import { currentJobFirm, DEAD_LETTER, JobRefused, JOBS_SCHEMA, PgBossJobs } from "../api/src/platform/jobs/pgboss-jobs.ts";
import { FakeClock } from "../ports/clock.ts";
import { fakeJobs } from "../ports/jobs.ts";

const STUDIO = join(import.meta.dirname, "..");
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const A = "0000000a-0000-4000-8000-000000000001", B = "0000000b-0000-4000-8000-000000000002";
const FAST = { retryLimit: 2, retryDelay: 1, retryBackoff: true, retryDelayMax: 10, expireInSeconds: 60 };

// ------------------------------------------------------------------------------------------------- crash child
// Run by the crash case: takes the job, records its attempt and its (idempotent) effect, says STARTED, then hangs until
// the parent kills it with SIGKILL (a process dying mid-job: no completion, no graceful stop).
if (process.argv[2] === "--crash-child") {
  const db = process.argv[3]!;
  const c = new pg.Client({ connectionString: urlOf(db) });
  await c.connect();
  const jobs = new PgBossJobs({ connectionString: urlOf(db), retry: FAST, pollingIntervalSeconds: 0.5 });
  await jobs.handle("pf14.crash", async (job) => {
    await c.query("insert into pf14_attempt(key, attempt) values ($1, $2)", [job.key, job.attempt]);
    await c.query("insert into pf14_effect(key) values ($1) on conflict do nothing", [job.key]);
    console.log("STARTED");
    await new Promise(() => {});
  });
  await jobs.start();
  await new Promise(() => {});
}

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const throwsLike = async (f: () => unknown, test: (e: unknown) => boolean) => { try { await f(); return false; } catch (e) { return test(e); } };
const realPause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fresh = (db: string) => { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" }); execFileSync(join(BIN, "createdb"), [...PG, db]); };

const MAIN = `xr_studio_pf14_${process.pid}`, BARE = `xr_studio_pf14_bare_${process.pid}`, MIG = `xr_studio_pf14_mig_${process.pid}`;
const WORK = join(STUDIO, "var", `pf14-check-${process.pid}`);
for (const db of [MAIN, BARE, MIG]) fresh(db);
const sqlc = new pg.Pool({ connectionString: urlOf(MAIN), max: 4 });
const q = async <T = Record<string, unknown>>(text: string, v: unknown[] = []) => (await sqlc.query(text, v)).rows as T[];
await q(`create table pf14_note(firm_id uuid not null, body text not null);
  create table pf14_attempt(key text not null, attempt int not null, at timestamptz not null default clock_timestamp());
  create table pf14_effect(key text primary key)`);
await q(`insert into pf14_note values ($1, 'a-1'), ($1, 'a-2'), ($2, 'b-1')`, [A, B]);

// The instants each job's handler saw on the test clock, by job name.
const ran = new Map<string, { at: number; key: string; firmId: string | null; attempt: number; runAt: string; current: string | null | undefined }[]>();
const seen = (name: string) => ran.get(name) ?? [];
const record = (name: string, job: { key: string; firmId: string | null; attempt: number; runAt: Date }): void => void ran.set(name, [...seen(name), { at: clock.now(), key: job.key, firmId: job.firmId, attempt: job.attempt, runAt: job.runAt.toISOString(), current: currentJobFirm() }]);

const clock = new TestClock("2026-10-30T12:00:00Z");
const errors: string[] = [];
const jobs = new PgBossJobs({ connectionString: urlOf(MAIN), retry: FAST, pollingIntervalSeconds: 0.5, boss: { clock, cronMonitorIntervalSeconds: 1, cronWorkerIntervalSeconds: 1 }, onError: (e) => errors.push(e.message) });
const tickUntil = async (cond: () => boolean | Promise<boolean>, stepMs: number, maxSteps: number) => {
  for (let i = 0; i < maxSteps; i++) { if (await cond()) return true; await clock.tick(stepMs); await realPause(15); }
  return await cond();
};
const state = async (name: string, key: string) => (await jobs.boss.getJobById(name, jobIdOf(key)))?.state ?? null;
const procs: { kill: (s: NodeJS.Signals) => boolean }[] = [];

try {
  // ------------------------------------------------------------------------------------- starts on an empty database
  {
    const bareErrors: string[] = [];
    const bare = new PgBossJobs({ connectionString: urlOf(BARE), onError: (e) => bareErrors.push(e.message) });
    await bare.start();
    const bareSql = new pg.Client({ connectionString: urlOf(BARE) });
    await bareSql.connect();
    const schemas = (await bareSql.query("select nspname from pg_namespace where nspname = $1", [JOBS_SCHEMA])).rows;
    await bareSql.end();
    await bare.stop();
    ok("PF-14 pass: the runner starts on an empty database with no error and pg-boss makes its own schema (platform_jobs)", bareErrors.length === 0 && schemas.length === 1, { bareErrors, schemas });
    const nowhere = new PgBossJobs({ connectionString: urlOf(`xr_studio_pf14_missing_${process.pid}`), onError: () => {} });
    ok("PF-14 fail: a database that is not there stops the start loudly (never a silent runner that runs nothing)", await throwsLike(() => nowhere.start(), (e) => /does not exist/.test(String(e))));
  }

  await jobs.start();
  ok("PF-14: the test runner starts with no error", errors.length === 0, errors);

  // ------------------------------------------------------------------------------------- a key never queues twice
  {
    const r1 = await jobs.enqueue("pf14.once", { noteId: 1 }, { key: "once:1", firmId: A });
    const r2 = await jobs.enqueue("pf14.once", { noteId: 2 }, { key: "once:1", firmId: A });
    const r3 = await jobs.enqueue("pf14.once", { noteId: 3 }, { key: "once:2", firmId: A });
    const stored = await jobs.boss.findJobs("pf14.once");
    ok("PF-14 pass: the same key twice → one job (the second enqueue answers queued: false)", r1.queued && !r2.queued && stored.filter((j) => (j.data as { key: string }).key === "once:1").length === 1, { r1, r2 });
    ok("PF-14 fail: a different key is a second job", r3.queued && stored.length === 2, stored.length);
    await jobs.handle("pf14.once", async (job) => record("pf14.once", job));
    ok("PF-14: both keys run once", await tickUntil(() => seen("pf14.once").length === 2, 500, 20), seen("pf14.once"));
    const r4 = await jobs.enqueue("pf14.once", { noteId: 4 }, { key: "once:1", firmId: A });
    ok("PF-14 pass: a key whose job has finished still refuses a second job (completed jobs are kept)", !r4.queued && (await state("pf14.once", "once:1")) === "completed");
    ok("PF-14 fail: a job without a firm is refused before anything is queued", await throwsLike(() => jobs.enqueue("pf14.once", {}, { key: "once:3" } as never), (e) => e instanceof JobRefused && /firmId/.test(String(e))));
    ok("PF-14 fail: a firm id that is not a uuid is refused", await throwsLike(() => jobs.enqueue("pf14.once", {}, { key: "once:3", firmId: "firm-a" }), (e) => e instanceof JobRefused && /firmId a firm id/.test(String(e))));
    ok("PF-14 fail: a payload that is not an object of ids is refused", await throwsLike(() => jobs.enqueue("pf14.once", "a@b.ca" as never, { key: "once:3", firmId: A }), (e) => e instanceof JobRefused));
    ok("PF-14 fail: a job name outside the dotted lower-case form is refused", await throwsLike(() => jobs.enqueue("Send Email!", {}, { key: "once:3", firmId: A }), () => true));
    ok("PF-14 pass: a cancelled job's key stays used (PF-0p's rule)", await (async () => { await jobs.schedule("pf14.once", new Date(clock.now() + 864e5), {}, { key: "once:c", firmId: A }); return (await jobs.cancel("once:c")) && !(await jobs.enqueue("pf14.once", {}, { key: "once:c", firmId: A })).queued; })());
  }

  // ------------------------------------------------------------------------------------- schedule and cancel on the clock
  {
    await jobs.handle("pf14.later", async (job) => record("pf14.later", job));
    const at = new Date(clock.now() + 3600_000);
    await jobs.schedule("pf14.later", at, { bookingId: "x" }, { key: "later:1", firmId: A });
    await jobs.schedule("pf14.later", at, { bookingId: "y" }, { key: "later:2", firmId: A });
    ok("PF-14 fail: a job scheduled for an hour from now does not run 50 minutes in", !(await tickUntil(() => seen("pf14.later").length > 0, 60_000, 50)), seen("pf14.later"));
    ok("PF-14 pass: cancel(key) cancels a queued job (true) and a second cancel finds nothing (false)", (await jobs.cancel("later:2")) && !(await jobs.cancel("later:2")));
    ok("PF-14 pass: it runs once the clock reaches its time, and the cancelled one never runs", await tickUntil(() => seen("pf14.later").length === 1, 60_000, 15) && seen("pf14.later")[0]!.at >= at.getTime() && seen("pf14.later")[0]!.key === "later:1", seen("pf14.later"));
    ok("PF-14 fail: a schedule without a valid time is refused", await throwsLike(() => jobs.schedule("pf14.later", new Date("nope"), {}, { key: "later:3", firmId: A }), (e) => e instanceof JobRefused));
  }

  // ------------------------------------------------------------------- 09:00 America/Toronto across the 1 Nov 2026 change
  {
    await jobs.handle("pf14.morning", async (job) => record("pf14.morning", job));
    await clock.setTime("2026-10-31T12:55:00Z"); // 08:55 EDT (UTC-4)
    await jobs.recurring("pf14.morning", "0 9 * * *", "America/Toronto");
    ok("PF-14 pass: 31 Oct (EDT): the 09:00 Toronto job runs at 13:00 UTC", await tickUntil(() => seen("pf14.morning").length === 1, 30_000, 20) && seen("pf14.morning")[0]!.at >= Date.parse("2026-10-31T13:00:00Z") && seen("pf14.morning")[0]!.at < Date.parse("2026-10-31T13:05:00Z"), seen("pf14.morning").map((r) => new Date(r.at)));
    await clock.setTime("2026-11-01T12:55:00Z"); // clocks went back at 02:00: 07:55 EST (UTC-5)
    ok("PF-14 fail: 1 Nov (EST): nothing runs at 13:00 UTC (08:00 Toronto; a fixed −4 offset would run it here)", !(await tickUntil(() => seen("pf14.morning").length > 1, 30_000, 20)), seen("pf14.morning").map((r) => new Date(r.at)));
    await clock.setTime("2026-11-01T13:55:00Z");
    ok("PF-14 pass: 1 Nov (EST): it runs once at 14:00 UTC, 09:00 Toronto", await tickUntil(() => seen("pf14.morning").length === 2, 30_000, 20) && seen("pf14.morning")[1]!.at >= Date.parse("2026-11-01T14:00:00Z") && seen("pf14.morning")[1]!.at < Date.parse("2026-11-01T14:05:00Z"), seen("pf14.morning").map((r) => new Date(r.at)));
    await tickUntil(() => false, 30_000, 10);
    const sent = (await jobs.boss.findJobs("pf14.morning")).map((j) => j.startAfter.toISOString()).sort();
    ok("PF-14 pass: exactly two runs, each created for its own instant (no double run in the repeated hour)", seen("pf14.morning").length === 2 && sent.length === 2, sent);
    ok("PF-14: a recurring job is platform-wide (no firm) and fans out per firm with enqueue", seen("pf14.morning").every((r) => r.firmId === null && r.current === null));
    ok("PF-14: each recurring run has runAt = its instant and the key <name>@<minute> (PF-0p's form)", seen("pf14.morning").map((r) => `${r.key}|${r.runAt}`).join() === "pf14.morning@2026-10-31T13:00:00.000Z|2026-10-31T13:00:00.000Z,pf14.morning@2026-11-01T14:00:00.000Z|2026-11-01T14:00:00.000Z", seen("pf14.morning"));
    ok("PF-14 fail: a time zone that does not exist is refused", await throwsLike(() => jobs.recurring("pf14.morning", "0 9 * * *", "Mars/Olympus"), (e) => e instanceof JobRefused));
    ok("PF-14 fail: a cron that does not parse is refused", await throwsLike(() => jobs.recurring("pf14.morning", "nine every morning", "America/Toronto"), (e) => e instanceof JobRefused));
    await jobs.boss.unschedule("pf14.morning");
  }

  // ------------------------------------------------------------------------- retries with back-off, then the dead-letter list
  {
    await jobs.handle("pf14.flaky", async (job) => { record("pf14.flaky", job); if (job.attempt === 1) throw new Error("first try fails"); });
    await jobs.handle("pf14.broken", async (job) => { record("pf14.broken", job); throw new Error(`boom for ${job.key}`); });
    await jobs.enqueue("pf14.flaky", {}, { key: "flaky:1", firmId: A });
    await jobs.enqueue("pf14.broken", {}, { key: "broken:1", firmId: B });
    await tickUntil(async () => (await state("pf14.broken", "broken:1")) === "failed" && (await state("pf14.flaky", "flaky:1")) === "completed", 250, 200);
    const tries = seen("pf14.broken");
    const gaps = tries.slice(1).map((t, i) => (t.at - tries[i]!.at) / 1000);
    ok("PF-14 pass: a failing job is tried 1 + retryLimit times, the waits growing (back-off: ≥1 s, then ≥2 s)", tries.length === 3 && tries.map((t) => t.attempt).join() === "1,2,3" && gaps[0]! >= 1 && gaps[1]! >= 2 && gaps[1]! >= gaps[0]! * 0.99, { attempts: tries.map((t) => t.attempt), gaps });
    const dead = await jobs.deadLetters();
    const mine = dead.find((d) => d.key === "broken:1");
    ok("PF-14 pass: then it is on the dead-letter list with its name, key, firm and error", !!mine && mine.name === "pf14.broken" && mine.firmId === B && /boom for broken:1/.test(mine.error), dead);
    ok("PF-14 fail: a job that fails once and then succeeds is not on the dead-letter list", (await state("pf14.flaky", "flaky:1")) === "completed" && !dead.some((d) => d.key === "flaky:1") && seen("pf14.flaky").length === 2, seen("pf14.flaky"));
    const dlqState = (await jobs.boss.getQueue(DEAD_LETTER));
    ok("PF-14: nothing works the dead-letter list (it is a list, not a queue that reruns)", dlqState !== null && (await jobs.boss.findJobs(DEAD_LETTER)).every((j) => j.state === "created"));
  }

  // --------------------------------------------------------------------------------------- firm A never reads firm B's rows
  {
    const read = new Map<string, string[]>();
    await jobs.handle("pf14.notes", async (job) => {
      record("pf14.notes", job);
      const w = firmScope(job.firmId!);
      const rows = await q<{ body: string }>("select body from pf14_note where firm_id = $1 order by body", [w.firmId]);
      read.set(job.key, rows.map((r) => r.body));
    });
    await jobs.handle("pf14.nosy", async (job) => {
      record("pf14.nosy", job);
      const w = firmScope(job.firmId!, { firmId: job.payload && (job.payload as { other: string }).other });
      read.set(job.key, (await q<{ body: string }>("select body from pf14_note where firm_id = $1", [w.firmId])).map((r) => r.body));
    });
    await jobs.enqueue("pf14.notes", {}, { key: "notes:a", firmId: A });
    await jobs.enqueue("pf14.notes", {}, { key: "notes:b", firmId: B });
    await jobs.enqueue("pf14.nosy", { other: B }, { key: "nosy:a", firmId: A });
    // A job written past the port (by hand) with a firm id that is not one: it must never reach a handler.
    await jobs.boss.send("pf14.notes", { key: "notes:forged", firmId: "not-a-firm", payload: {} }, { id: jobIdOf("notes:forged") });
    await jobs.boss.send("pf14.notes", { key: "notes:nofirm", firmId: null, payload: {} }, { id: jobIdOf("notes:nofirm") });
    await tickUntil(async () => read.has("notes:a") && read.has("notes:b") && (await state("pf14.nosy", "nosy:a")) === "failed" && (await state("pf14.notes", "notes:forged")) === "failed" && (await state("pf14.notes", "notes:nofirm")) === "failed", 250, 200);
    ok("PF-14 pass: each firm's job reads only its own firm's rows", JSON.stringify(read.get("notes:a")) === '["a-1","a-2"]' && JSON.stringify(read.get("notes:b")) === '["b-1"]', Object.fromEntries(read));
    ok("PF-14 pass: the handler runs inside its firm (currentJobFirm() is the job's firm)", seen("pf14.notes").every((r) => r.current === r.firmId && r.firmId !== null), seen("pf14.notes"));
    const dead = await jobs.deadLetters();
    ok("PF-14 fail: firm A's job asking for firm B's rows is refused by firmScope, reads nothing and ends on the dead-letter list", !read.has("nosy:a") && dead.some((d) => d.key === "nosy:a" && /names another firm/.test(d.error)), dead.filter((d) => d.key.startsWith("nosy")));
    ok("PF-14 fail: a job whose firm id is not a firm never reaches its handler and ends on the dead-letter list", !seen("pf14.notes").some((r) => r.key === "notes:forged") && dead.some((d) => d.key === "?" && /firmId/.test(d.error)), dead.map((d) => [d.key, d.error]));
    ok("PF-14 fail: a job without a firm that is not a recurring run never reaches its handler either", !seen("pf14.notes").some((r) => r.key === "notes:nofirm") && dead.some((d) => d.key === "notes:nofirm" && /without a firm/.test(d.error)), dead.map((d) => [d.key, d.error]));
    ok("PF-14: outside a job there is no job firm", currentJobFirm() === undefined);
  }

  // -------------------------------------------------------------------------- a crash mid-job reruns it once (idempotent)
  {
    await clock.setTime(Date.now());
    await jobs.enqueue("pf14.crash", { caseId: "c1" }, { key: "crash:1", firmId: A });
    const child = spawn(process.execPath, [...process.execArgv, import.meta.filename, "--crash-child", MAIN], { stdio: ["ignore", "pipe", "pipe"] });
    procs.push(child);
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    for (let i = 0; i < 300 && !out.includes("STARTED"); i++) await realPause(100);
    child.kill("SIGKILL");
    await new Promise((r) => child.once("exit", r));
    ok("PF-14: the child worker took the job and was killed mid-job", out.includes("STARTED") && (await state("pf14.crash", "crash:1")) === "active", out.slice(-400));
    await jobs.handle("pf14.crash", async (job) => {
      record("pf14.crash", job);
      await q("insert into pf14_attempt(key, attempt) values ($1, $2)", [job.key, job.attempt]);
      await q("insert into pf14_effect(key) values ($1) on conflict do nothing", [job.key]);
    });
    ok("PF-14 fail: before its claim expires (60 s, Sample 15 min) the job is not rerun", !(await tickUntil(() => seen("pf14.crash").length > 0, 5_000, 6)) && (await state("pf14.crash", "crash:1")) === "active");
    await clock.setTime(Date.now() + 5 * 60_000);
    await jobs.boss.supervise("pf14.crash");
    await tickUntil(async () => (await state("pf14.crash", "crash:1")) === "completed", 500, 60);
    const attempts = await q<{ attempt: number }>("select attempt from pf14_attempt where key = 'crash:1' order by attempt");
    const effects = await q("select * from pf14_effect where key = 'crash:1'");
    ok("PF-14 pass: after the claim expires the job reruns once, completes, and its idempotent effect exists once", (await state("pf14.crash", "crash:1")) === "completed" && attempts.map((a) => a.attempt).join() === "1,2" && effects.length === 1 && seen("pf14.crash").length === 1, { attempts, effects: effects.length });
  }

  // ------------------------------------------------------------------- a job never sends a message itself (it calls a port)
  {
    const dir = join(STUDIO, "api", "src", "platform", "jobs");
    const SENDING = /^\s*import\b[^;]*(?:mail|messag|sms|send|notif|ses)[^;]*;/im;
    const offenders = readdirSync(dir).filter((f) => f.endsWith(".ts") && SENDING.test(readFileSync(join(dir, f), "utf8")));
    ok("PF-14 pass: nothing in api/src/platform/jobs imports a sending port (mail, messages, SMS, notifications)", offenders.length === 0, offenders);
    ok("PF-14 fail: the same check catches a job file that would import MailPort", SENDING.test(`import type { MailPort } from "../../../../ports/mail.ts";`));
  }

  // ------------------------------------------------------------------------------------------- stops cleanly on shutdown
  {
    const realErrors: string[] = [];
    const real = new PgBossJobs({ connectionString: urlOf(MAIN), pollingIntervalSeconds: 0.5, boss: { application_name: "xr-pf14-stop" }, onError: (e) => realErrors.push(e.message) });
    let finished = false;
    await real.handle("pf14.slow", async () => { await realPause(1500); finished = true; });
    await real.start();
    await real.enqueue("pf14.slow", {}, { key: "slow:1", firmId: A });
    for (let i = 0; i < 100 && (await real.boss.getJobById("pf14.slow", jobIdOf("slow:1")))?.state !== "active"; i++) await realPause(100);
    const before = (await real.boss.getJobById("pf14.slow", jobIdOf("slow:1")))?.state;
    await real.stop();
    const after = (await jobs.boss.getJobById("pf14.slow", jobIdOf("slow:1")))?.state;
    const open = await q<{ n: string }>("select count(*)::text n from pg_stat_activity where application_name = 'xr-pf14-stop' and datname = $1 and pid <> pg_backend_pid()", [MAIN]);
    ok("PF-14 pass: stop waits for the running job to finish, completes it and closes the runner's connections", before === "active" && finished && after === "completed" && !real.started && open[0]!.n === "0", { before, finished, after, open });
    ok("PF-14 pass: …and after stop the runner refuses new work", await throwsLike(() => real.enqueue("pf14.slow", {}, { key: "slow:2", firmId: A }), (e) => e instanceof JobRefused && /not started|stopped/.test(String(e))) && realErrors.length === 0, realErrors);
    // the failing side: a handler that overruns stop's limit is not completed by the stop; pg-boss hands its job back
    // for a retry, so it is never lost and reruns on the next start (an idempotent handler, as in the crash case).
    const late = new PgBossJobs({ connectionString: urlOf(MAIN), pollingIntervalSeconds: 0.5, onError: () => {} });
    await late.handle("pf14.overrun", async () => { await realPause(3000); });
    await late.start();
    await late.enqueue("pf14.overrun", {}, { key: "overrun:1", firmId: A });
    for (let i = 0; i < 100 && (await late.boss.getJobById("pf14.overrun", jobIdOf("overrun:1")))?.state !== "active"; i++) await realPause(100);
    await late.stop(300);
    const left = (await jobs.boss.getJobById("pf14.overrun", jobIdOf("overrun:1")))?.state;
    ok("PF-14 fail: a handler that outlasts stop's limit is not completed by the stop: its job goes back for a retry, never lost", left === "retry", left);
    await realPause(3000);
  }

  // ------------------------------------------------------------------------ the app's provider: starts with it, stops with it
  {
    process.env.DATABASE_URL = urlOf(MAIN);
    const { NestFactory } = await import("@nestjs/core");
    const { Module } = await import("@nestjs/common");
    const { PlatformJobs } = await import("../api/src/platform/jobs/platform-jobs.ts");
    const feature = (await import("../api/src/features/platform-jobs.ts")).default;
    class JobsOnly {}
    Module({ providers: feature.providers as never[] })(JobsOnly);
    const app = await NestFactory.createApplicationContext(JobsOnly, { logger: false });
    const svc = app.get(PlatformJobs);
    let ranInApp = false;
    await svc.handle("pf14.app", async () => { ranInApp = true; });
    await svc.enqueue("pf14.app", {}, { key: "app:1", firmId: A });
    for (let i = 0; i < 100 && !ranInApp; i++) await realPause(100);
    ok("PF-14 pass: the feature file registers the provider; the worker starts with the app and runs a job", svc.runner.started && ranInApp);
    ok("PF-14: the app's runner listens for SIGTERM to stop cleanly", process.listenerCount("SIGTERM") >= 1);
    await app.close();
    ok("PF-14 pass: app.close() stops the worker and removes its signal listeners", !svc.runner.started && process.listenerCount("SIGTERM") === 0);
    ok("PF-14 fail: after the app closed, a new job is refused (no runner left behind)", await throwsLike(() => svc.enqueue("pf14.app", {}, { key: "app:2", firmId: A }), (e) => e instanceof JobRefused));
  }

  // ------------------------------------------------- the same contract on PF-0p's fake (every PF/FO test runs on it)
  {
    const fc = new FakeClock("2026-10-31T12:55:00Z");
    const fake = fakeJobs(fc);
    const fakeRuns: string[] = [];
    await fake.handle("pf14.morning", async (j) => { fakeRuns.push(`${j.key}|${j.runAt.toISOString()}`); });
    await fake.recurring("pf14.morning", "0 9 * * *", "America/Toronto");
    await fc.advance({ hours: 26 });
    const realRuns = seen("pf14.morning").map((r) => `${r.key}|${r.runAt}`);
    ok("PF-14 pass: PF-0p's fake and the pg-boss adapter run 09:00 Toronto across 1 Nov at the same instants with the same keys", realRuns.length === 2 && fakeRuns.join() === realRuns.join(), { fakeRuns, realRuns });
    const f1 = await fake.enqueue("pf14.once", {}, { key: "once:1", firmId: A }), f2 = await fake.enqueue("pf14.once", {}, { key: "once:1", firmId: A });
    ok("PF-14 pass: the fake agrees: the same key twice → one job", f1.queued && !f2.queued);
    ok("PF-14 fail: the fake agrees: a job without a firm is refused", await throwsLike(() => fake.enqueue("pf14.once", {}, { key: "once:9" } as never), () => true));
  }

  // --------------------------------------------------------------------- migrate diff stays empty (pg-boss is not Prisma's)
  {
    const MIGS = join(STUDIO, "prisma", "migrations");
    for (const d of readdirSync(MIGS).filter((d) => /^\d{14}_/.test(d)).sort()) execFileSync(join(BIN, "psql"), [urlOf(MIG), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIGS, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
    const onMig = new PgBossJobs({ connectionString: urlOf(MIG), onError: () => {} });
    await onMig.start();
    await onMig.enqueue("pf14.diff", {}, { key: "diff:1", firmId: A });
    await onMig.stop();
    mkdirSync(WORK, { recursive: true });
    const cfg = join(WORK, "prisma.config.ts"), SCHEMA = join(STUDIO, "prisma", "schema");
    writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIGS)} }, datasource: { url: ${JSON.stringify(urlOf(MIG))} } });\n`);
    const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--script"], { cwd: STUDIO, encoding: "utf8" });
    const JOBS_LINE = /platform_jobs|pgboss|pg_boss/i;
    const lines = `${r.stdout}`.split("\n").filter((l) => JOBS_LINE.test(l));
    ok("PF-14 pass: prisma migrate diff from a database pg-boss has installed into names nothing of pg-boss's schema", (r.status === 0 || r.status === 2) && lines.length === 0, { status: r.status, lines: lines.slice(0, 5), err: r.stderr.slice(0, 300) });
    ok("PF-14 fail: the same filter catches a line that would drop pg-boss's table", JOBS_LINE.test(`DROP TABLE "platform_jobs"."job";`));
  }

  ok("PF-14: no pg-boss error during the whole run", errors.length === 0, errors);
} finally {
  for (const p of procs) try { p.kill("SIGKILL"); } catch { /* gone */ }
  await jobs.stop(2000).catch(() => {});
  await sqlc.end().catch(() => {});
  for (const db of [MAIN, BARE, MIG]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db]);
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
