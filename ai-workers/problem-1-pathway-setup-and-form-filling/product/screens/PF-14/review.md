Verdict: Approve 519097e5b0e1c4d8d73a3862f490578178077064 (round 2b; round 2 approved 214767843, round 1 on 75c40c54c was Changes requested, below)

# PF-14 review: background jobs (the real JobPort, the pg-boss adapter, the worker)

* PR #1757, branch `claude/stoic-davinci-94qft8`, reviewed commit **75c40c54c**. The independent Opus reviewer (P-303), reviewer only (no breaker).
* Read: `git diff origin/main..75c40c54c` (5 new files under `prototype/studio`), row PF-14 (`origin/lead/2026-11-07-lead31` BACKLOG), brief `lead-b-briefs/PF-14.md` (`origin/lead-b-front-office`), `ports/jobs.ts` + `ports/clock.ts` (untracked copies, byte-identical to #1752 head 458b7fd49), pg-boss 12.38.0 `dist/` (plans.js, index.js, timekeeper.js, manager.js), `api/src/platform/firm-scope.ts`, `api/src/features.ts`, `api/src/main.ts`, `@nestjs/core/hooks/on-app-bootstrap.hook.js`.
* Not a screen: there is no UI, so the screen dimensions and the journey score do not apply (**journey score: n/a, no user journey**). In their place I ran the row's suite and wrote throw-away probes against real pg-boss on scratch databases (dropped afterwards; nothing committed).

## Round 1 (75c40c54c)

## What I ran

| Command | Result |
|---|---|
| `studio/node_modules/.bin/tsx --tsconfig studio/api/tsconfig.json studio/tests/check_pf14_jobs.ts` (from `prototype/`) | **52 passed, 0 failed**, exit 0, real 59 s |
| `cd studio && npx tsc -p api/tsconfig.json` | 15 errors, **none** in `platform/jobs/*`, `features/platform-jobs.ts`, `check_pf14_jobs.ts` or `ports/*` (all in older test files: check_c69_runs, check_cost_check, check_vv_checklist, check_x2b_bulk_apply) |
| `node studio/tools/count-any.mjs` | 417 explicit `any` in live code (baseline 433): the diff adds none (only `as never` in negative test cases) |
| Probe: start/stop timing | start on an empty database 131 ms (creates `platform_jobs`), on an installed one 24 ms; idle stop 14 ms |
| Probe: SIGTERM to a Nest context holding `PlatformJobs` | idle: exit in 23 ms by SIGTERM; a 2.5 s job running: job ends, exit in 2500 ms by SIGTERM; a 15 s job: exit in 10041 ms by SIGTERM (the job goes back to retry). The old exit-on-signal behaviour holds. |
| Probe: a provider calling `jobs.recurring()` at boot | `onModuleInit: app failed to start: jobs: the job runner has not started (or has stopped)`; `onApplicationBootstrap:` the same (finding M1) |
| Probe: findings m1–m6 | outputs quoted under each finding |

## Rules

* Touch list: exactly the 5 new files allowed (`api/src/platform/jobs/{job-key,pgboss-jobs,platform-jobs}.ts`, `api/src/features/platform-jobs.ts`, `tests/check_pf14_jobs.ts`); `ports/` and `package.json` are not committed (correct, they wait for #1752 and #1751). No Prisma schema or migration. The suite's migrate-diff case shows no pg-boss line from a database pg-boss has installed into (the same filter shape as PF-3/FO-1b, because main has known drift). No secrets, no model call, live AI off, US$0. No personal names. Payloads are ids only by contract; nothing in the adapter logs a payload (`onError` logs the message only).
* Merge order (by design, not a finding): this commit imports `../../../../ports/jobs.ts` and `pg-boss`, which are not on `main` yet, and `features/platform-jobs.ts` is picked up by `main.ts` on its own. CI cannot go green until PF-0p and PF-L land, and merging `main` makes a new head that needs a diff-only re-review (P-277).
* Other suites: every isolated copy and the demo now run pg-boss (≤3 connections each, about 25–130 ms added to start, its own `platform_jobs` schema). Demo reset (Prisma deletes), `demo-dump.mjs` (`current_schema()` only) and PF-3/FO-1b's diff filters do not touch that schema. I did not run the full shard suites: that is the builder's pre-label run (brief, rows rev 16).

## Done when: a real pass and a real fail for each line

| Done-when line | Pass | Fail | Verdict |
|---|---|---|---|
| same key twice → one job | :99 | :100 (a different key queues) | real. But :104 "completed jobs are kept" checks straight after completion, so it would still pass if `deleteAfterSeconds: 0` regressed to pg-boss's 7-day default (m2) |
| 09:00 Toronto across 1 Nov 2026 | :129, :133, :136 | :131 (nothing at 13:00 UTC on 1 Nov) | real. The fail case tells a zone-aware cron from a fixed −4 offset |
| retries, then the dead-letter list with its error | :153 (attempts 1,2,3; gaps ≥1 s then ≥2 s, so no back-off fails it), :156 | :157 | real |
| a crash mid-job reruns once (idempotent) | :216 (SIGKILLed child; attempts `1,2`, one effect) | :210 (no rerun before the claim expires) | real |
| firm A never reads firm B's rows | :183, :184 | :186, :187, :188 | real for what the adapter owns (the firm id is checked by `firmScope` before the handler; ALS context). Isolation inside a handler still rests on the handler calling `firmScope` (DB walls are Lead 37's) |
| fake clock drives every scheduled job, no real waiting | pg-boss `TestClock` throughout; :287 the PF-0p fake and the adapter give the same instants and keys | :118 | real |
| worker stops cleanly on shutdown | :241, :242, :274 | :252, :275 | real for `stop()` and `app.close()`. The production path (SIGTERM → `#onSignal`) is only checked as `listenerCount >= 1` (:272). My probe shows it works (m7) |

No `ok()` passes only because a wait ran out: every `tickUntil` result is either asserted itself or followed by a state assertion. The `every(...)` checks (:137, :159, :184) come after assertions that the lists are not empty.

## Findings

### Blocker
None.

### Major

**M1. Nothing can schedule a recurring job (or queue one) while the app starts: the app fails to start, and code tested on PF-0p's fake does not catch it.**
Evidence: `recurring`, `enqueue`, `schedule`, `cancel` and `deadLetters` all call `#mustBeStarted()` (`pgboss-jobs.ts:126,143,151,162`), and the runner starts in `PlatformJobs.onApplicationBootstrap` (`platform-jobs.ts:21-23`). Every feature is registered into the one `AppModule` (`features.ts` `registerFeatures`), and Nest runs one module's `onApplicationBootstrap` hooks together (`@nestjs/core/hooks/on-app-bootstrap.hook.js`: `await Promise.all(callOperator(nonTransientInstances))`), after every `onModuleInit`. So no hook lets another provider call `jobs.recurring(...)` at boot. Probe (`PlatformJobs` + a provider that calls `recurring("fo.seed_created_firms","0 3 * * *","America/Toronto")`):
```
onModuleInit: app failed to start: jobs: the job runner has not started (or has stopped)
onApplicationBootstrap: app failed to start: jobs: the job runner has not started (or has stopped)
```
PF-0p's `fakeJobs` takes `recurring`/`enqueue` at any time (it has no start), so FO-2's "seedCreatedFirms recurring" and FO-12a's conductor would pass every fake-backed test and then stop the Studio from starting. The fix would also mean editing PF-14's files, which are outside those rows' touch lists.
Fix: give the adapter the same "before start" behaviour as `handle()`. `recurring()` called before start records `{name, cron, zone}` and `start()` applies it (as it already does for `#handlers`). `enqueue`/`schedule`/`cancel`/`deadLetters` await a `#ready` promise that `start()` resolves, and refuse only after `stop()`. Add a pass/fail case to the suite: a provider calling `recurring()` in `onModuleInit`, and one calling `enqueue()` in `onApplicationBootstrap`, both boot, the schedule exists and the job runs. Update the class comment in `platform-jobs.ts:1-4` to say where to call `recurring`.

### Minor

**m1. "A key never queues twice" means per job name in pg-boss but across all names in the fake.** pg-boss's job table key is `(name, id)` (plans.js:1228), so `jobIdOf(key)` stops a repeat only within one queue. Probe: `same key, two names: pg-boss queued true/true; fake queued true/false`. `cancel(key)` then cancels both (`cancelled/cancelled`). The port says "a key never queues twice". Fix: decide which rule is right, and have the port comment, the fake (PF-0p) and the adapter agree. Either put the job name in the fake's `used` key, or refuse a cross-name repeat in the adapter. Raise it with the PF-0p owner rather than change `ports/` here.

**m2. A used key comes free again when its job is never fetched; the suite does not check that kept jobs survive time.** `deleteAfterSeconds: 0` keeps completed, cancelled and failed rows for good (plans.js:3664 deletes only when `deletion_seconds > 0`). But created/retry rows are deleted once `keep_until` (start_after + 14 days, pg-boss default) passes (plans.js:3666). Probe: a job on a queue with no handler, clock +15 days, `supervise()`: `row after maintenance deleted; same key again queued true`, and nothing on the dead-letter list. This happens when a handler is renamed or removed, or a module is not deployed. Separately, :104/:109 check "kept" straight after completion or cancellation, so a regression of `deleteAfterSeconds` would pass. Fix: set a long `retentionSeconds` on each job queue (Sample, like the dead-letter list's year), and add a case that advances the TestClock past 8 and 15 days, runs `supervise`, and re-enqueues the key.

**m3. `cancel(key)` "cancels" a job that is already running.** pg-boss cancels any state below completed, active included (plans.js:2723). Probe: `state before cancel active … cancel() answered true; handler finished true; final state cancelled`. The port says "Cancels the waiting job … true when one was waiting". A caller cancelling a reminder would be told it was stopped while it is being sent. Fix: cancel only `created`/`retry` (read the state first, or a state-filtered statement) and answer false for an active job.

**m4. Dead-letter `error` is a JSON blob for expiry and shutdown failures, and handler error text is stored for a year.** `toDeadLetter` reads `sourceOutput.message` only (`pgboss-jobs.ts:214`). Expiry stores `{"value":{"message":"job timed out"}}` (plans.js, `failJobsByTimeout`) and shutdown stores `{"value":"pg-boss shut down while active"}`. Probe (overrun on its last attempt): `dead-letter entry: ["{\"value\":\"pg-boss shut down while active\"}"]`. A thrown handler error is stored with `name,stack,message` (probe E7), so an error message that carries a value (an email in a Prisma error, say) sits in jsonb for a year. Fix: unwrap `value`/`value.message`. Have `#run` rethrow a cleaned `Error` (message truncated, no stack, ids only), and say in the port note that handler errors must be id-only.

**m5. On a shutdown, a job that runs past the stop limit uses up a retry, and on its last attempt it goes to the dead-letter list.** pg-boss's `failWip` fails it (`manager.js:1129`). The comment at `pgboss-jobs.ts:91-92` ("handed back by pg-boss for a retry, never lost") is true only while retries remain (probe: `state failed`, dead-lettered). Fix: correct the comment. Optionally add one retry to the limit for a shutdown fail, or document it for PF-26's long exports.

**m6. A recurring run's `runAt` and key come from when pg-boss sent the job, not the cron occurrence.** `pgboss-jobs.ts:196` floors `job.startAfter`. pg-boss sends it through `__pgboss__send-it` at the cron pass (a 60 s due window, `cronMonitorIntervalSeconds` 30, worker poll 5: timekeeper.js:261-266, 637-640), and a missed occurrence is caught up at restart time (timekeeper.js:602-633). So a run can be keyed `…@09:01` or at the restart minute, and the fake would key it `…@09:00`. Fix: put `cron`/`zone` in the recurring envelope and take `runAt` as the latest occurrence ≤ `startAfter` (cron-parser `prev()`, which pg-boss already ships).

**m7. The SIGTERM/SIGINT path is not in the suite, and its 10 s budget meets `restart-api.sh`'s 10 s wait.** :272 only counts listeners. My probe shows the path is right (23 ms idle, 2.5 s for a short job, 10.04 s for an overrun, exit by the signal each time). During the stop the HTTP listener stays open. `tools/restart-api.sh` waits 40×0.25 s and then starts a new server, and `isolated.sh` kills with -9 at 10 s. Once a later row has jobs longer than about 10 s, a restart can meet `EADDRINUSE` or a SIGKILL mid-stop. Fix: add a child-process SIGTERM pass/fail case like the crash case, and stop the runner within about 8 s (or close the HTTP server first).

**m8. `stop()` can stop the runner only once.** `#stopping` is never cleared (`pgboss-jobs.ts:96-103`). Probe: start → stop → start → stop leaves `started = true` and the pool open. A rejected stop also leaves `#started` true. No code path restarts the runner today, but tests or PF-23 might. Fix: clear `#stopping` in a `finally`.

**m9. For later rows.** (a) PF-23: `deadLetters()` loads up to 100 000 rows and sorts them in JS (`:152-153`), so take metrics from `getQueues()` counts and page the list in SQL. `createQueue` on an existing queue does not change it, so a later change to `DEFAULT_RETRY` or retention never reaches a queue the demo database already has (use `updateQueue`). Completed jobs are kept for good, so the job table only grows. (b) FO-2: the port cannot remove a recurring schedule, and a renamed one keeps firing into a queue with no worker. (c) PF-26: `expireInSeconds` 15 min applies to every queue, so an export running longer is failed and rerun alongside the first run. It needs a per-queue expiry or heartbeat. (d) The header says `platform.dead-letter` but the constant is `platform.dead_letter` (`:9` vs `:26`).

## To change before Approve
1. M1: accept `recurring()` before start (applied at start) and have `enqueue`/`schedule`/`cancel`/`deadLetters` wait for start, with a boot-time pass/fail case in `check_pf14_jobs.ts`.

The minors are recommended in the same PR where they are cheap (m2's retention and its time-advance case, m3, m4, m7's signal case, m8). The rest can go to the rows named.

---

# Round 2: 214767843571d6acbf1d69833781aac5b5a12f28

Diff only (P-277): `git diff 75c40c54c..214767843`, two commits. a2a0aeece adds `product/qa/built/PF-14.md` (one line; the records file `WAY-OF-WORKING.md:34` requires, plain and with no names). 214767843 is the fix round: `pgboss-jobs.ts` +184/−48, `platform-jobs.ts` (one comment line), `check_pf14_jobs.ts` +92.

## What I ran

| Command | Result |
|---|---|
| `studio/node_modules/.bin/tsx --tsconfig studio/api/tsconfig.json studio/tests/check_pf14_jobs.ts` | **62 passed, 0 failed**, exit 0, real 1 min 11 s; no scratch database left behind |
| `npx tsc -p api/tsconfig.json` | 15 errors, as in round 1, **none** in the PF-14 files or `ports/` |
| `git diff --name-only origin/main..214767843` | the 5 code files from round 1 plus `product/qa/built/PF-14.md`; still no `ports/`, `package.json`, Prisma schema or migration |
| Probe: `recurring()` called while `start()` runs its worker loop (a wrapper around `boss.work` makes the call) | `resolved, schedule in pg-boss = MISSING` (new m10) |

## Round 1 findings

| # | Status | Evidence |
|---|---|---|
| **M1** | **Fixed** | `recurring()` before start is stored in `#schedules` and applied in `start()`. `enqueue`/`schedule`/`cancel`/`deadLetters` wait on `#ready` through `#whenStarted()`, and after `startWaitMs` they refuse with a reason. Test: an `EarlyUser` provider calls `handle` + `recurring` in `onModuleInit` and `enqueue` in `onApplicationBootstrap`; the app starts, `getSchedule` shows the Toronto zone and the job runs (pass). A runner that never starts refuses after 0.2 s (fail). Going back to round 1's code would make `createApplicationContext` throw, and the suite would exit non-zero. Residual: m10, m11 below |
| m1 | Open, sent to PF-0p as a question | The header now says "(per job name)", so the code and its comment agree; the fake still differs |
| m2 | Fixed | Every queue gets `retentionSeconds` of 10 years, plus `updateQueue` on first use in each process. Test: an unworked job is still `created` 30 days later on the TestClock and its key refuses (pass); a raw queue with pg-boss's default retention loses its job over the same jump (fail). The "completed kept" check still does not advance time, but completed rows depend on `deleteAfterSeconds: 0`, which the same `updateQueue` writes |
| m3 | Fixed | A cancel reads each queue's job by id and cancels only one in `created` or `retry`. Test: cancelling a running job answers false and the job completes. The read-then-cancel race is documented in the code. Acceptable |
| m4 | Fixed | `cleanError` keeps the message only (300 chars; the stack becomes `Error: <message>`), and `messageOf` unwraps `value.message`. Test: the stored output's stack is `Error: boom for broken:1` |
| m5 | Fixed | The `stop()` comment now says a job that runs past the limit is retried while it has retries, and otherwise goes to the dead-letter list |
| m6 | Documented, not changed | The `#run` comment now says `runAt` is the minute pg-boss sent the job. Acceptable for this row; FO-2 should key its fan-out on `run.key` as is |
| m7 | Fixed | Two real SIGTERM child cases. 1.5 s job: completed, exit by SIGTERM in under 5 s (pass). 20 s job: exit by SIGTERM in 7.5–10 s, job unfinished, `retry` (fail). `STOP_LIMIT_MS` = 8 s, below restart-api.sh's and isolated.sh's 10 s |
| m8 | Fixed | A `#state` machine, and `#stopping` is cleared in `finally`. Test: stop → start → run a job → stop, and the runner's connections are 0 |
| m9 | Partly | The header name is fixed. `deadLetters` reads 10 000 rows, but see m12. Per-queue expiry or heartbeat and unschedule are for PF-26 and FO-2, as agreed |

## New findings (round 2)

### Blocker
None.

### Major
None.

### Minor

**m10. A `recurring()` call that lands while `start()` is registering workers is lost for that boot.** `recurring()` applies a schedule only when `#state === "started"`. `start()` applies `#schedules` before its handler loop (`for (const name of this.#handlers.keys()) await this.#work(name)`), so a call made during that loop is stored but never sent to pg-boss until the next start. Probe: `recurring() called while start() runs its worker loop: resolved, schedule in pg-boss = MISSING`. In the app this is a provider whose `onApplicationBootstrap` awaits something first (a database read) and then calls `recurring()`, alongside the runner's own start. pg-boss keeps schedules in its table, so this matters only for the first boot after a schedule is added or changed (FO-2's first deploy). Fix (one line): in `recurring()`, when `#state === "starting"`, `await this.#ready.promise` and then apply. Or apply `#schedules` again after the handler loop.

**m11. `enqueue()` awaited in another provider's `onModuleInit` waits 30 s, then the app fails to start.** This is documented in the header and in the refusal text ("not onModuleInit"), and it is loud, not silent. But PF-0p's fake takes the same call at any time, so a fake-tested row would only find out at boot. Optional fix: start the runner in `PlatformJobs.onModuleInit`. Nest runs one module's `onModuleInit` hooks together, and every feature is in `AppModule`, so a waiting `enqueue` then resolves. `handle()` after start already starts its worker. Otherwise, give FO rows a line saying "enqueue from onApplicationBootstrap or later".

**m12. `deadLetters()` returns the newest of the oldest 10 000.** `findJobs` returns oldest first (`types.d.ts:641-644`), and the adapter sorts newest-first in JS afterwards, so once the list passes 10 000 rows the newest failures are left out. The comment says so. Not reachable at prototype volume. PF-23 should read the list newest-first in SQL.

## Other suites
The builder reports 42 of 43 selected suites green. `check_runtime_r1c.cjs` missed one 1 s budget (1,020–1,139 ms), and also missed it (1,109 ms) in a control run with `features/platform-jobs.ts` removed and no `platform_jobs` schema. I did not rerun it. The control run is the right check, and nothing in this diff touches the case page's path, so I accept it as this container's speed, not PF-14. The pre-label shard run on `main`-merged (brief, rows rev 16) still applies once #1751/#1752 land, and that merge head needs a diff-only re-review.

No Blocker and no Major remains. m10 is a one-line fix worth taking before the merge; m11 and m12 can go to FO-2 and PF-23.

Verdict: Approve 214767843571d6acbf1d69833781aac5b5a12f28

---

# Round 2b: 519097e5b0e1c4d8d73a3862f490578178077064

Diff only, `git diff 214767843..519097e5b`: pgboss-jobs.ts +2, check_pf14_jobs.ts +14, and this review moved to `product/screens/PF-14/` (unchanged). **m10 fixed:** `recurring()` called while the runner is starting now awaits `#ready` and then applies the schedule. My round-2 probe now gives `schedule in pg-boss = 0 9 * * *` (was `MISSING`). The new case is not vacuous: it fires `recurring()` from start's first `boss.work()`, after the schedule loop, which is exactly where the probe hit. After the fix the order is fixed by `await`s (ready resolves → state `started` → apply → the call returns), so I see no race behind the builder's one unexplained null run. **Per-name keys:** the local `ports/` matches PF-0p c491f25c8 (#1752), where the fake keys `used` by name+key and `cancel` reaches every name. The new case asserts that both adapters queue the same key under another name, which closes m1. Suite: 64 passed, 0 failed, twice in a row. No other change.

Verdict: Approve 519097e5b0e1c4d8d73a3862f490578178077064
