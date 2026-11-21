# PF-12b3 break report (breaker, 21 Nov)

Branch `claude/runtime-pf12b3` at f817c153b, stacked on #2752 (4f7009ead). Diff read: `firm-scope.ts` (touchPlatform, BYPASS_USES, mayRunInside), `signup.ts` purge, `mail.ts`, `messages.ts` deliverPlatform/sendPlatformRow, MODULE.md, the suite.
How I tested: a scratch database on 127.0.0.1:54329 (`xr_studio_brk3_<pid>`, all migrations, Sample firms) driven through the walled pool (xr_app), like tests/check_pf12b_bypass_audit.ts. The audit store refused for real: a BEFORE INSERT trigger on audit_event that raises on firm-less `platform.bypass` rows, not only a fake port. I also ran one isolated server (`tools/isolated.sh brk3 4563 … PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on`). The server is stopped and both databases are dropped; `git status` is clean. The attack script is not committed (scratchpad `brk/attack.mts`).
Scope: the three "platform" uses, the re-encrypt removal and mayRunInside. M1 lies outside the three uses. It is reported because this diff's MODULE.md line claims it, and R1.4 is to be proven on #2752 + PF-12b3.

## Findings

### Major
**M1. `platform.firms.signup` still crosses the bypass with no line on its firm-less paths, so the new MODULE.md claim "no use writes none" is false.**
- Sign-up with a new email: `signUpWork` reads every firm's staff (`knownAccount`, signup.ts:142). It finds none, so no firm is touched. It then updates, deletes and creates `platform_signup_pending` rows in its own transaction (signup.ts:154-165). It runs on the bypass role, and no touchFirm or touchPlatform is called.
- Verify with an unknown link or a wrong code: it reads `platform_signup_pending` on the bypass (signup.ts:181) and writes no line.
- Repro (attack G): `new FirmSignUp(db, { identity: new LocalSignUp(now) /* no MailPort: the provider mails, as Cognito will */, … }).signUp({ email: "fresh@…", … }); settled()`.
  - Expected: one `platform.bypass` line.
  - Actual: `pending=1, linesAdded=0`. `verify({ token: "y"×43 })` gives 404 with `linesAdded=0`.
- With PLATFORM_IDENTITY=local, a sign-up does have one line, but it is platform.account.mail's line for the email. It sits in a separate transaction committed *before* the pending row. The pending write itself is never lined.
- With a provider that sends its own email (Cognito, part 2's adapter), an anonymous public request commits bypass writes with zero audit rows. R1.4 ("every use writes an audit line") is then not met.
- Same class: the honeypot and too-fast paths make no DB call, so they are fine.

### Minor
**m1. deliverPlatform's catch path can read, call the provider and commit with no line.**
- In the counting transaction, `findFirst` runs first and `if (!row) return null` (messages.ts:243-244) comes before `touchPlatform(tx)` (messages.ts:245). sendPlatformRow's line was rolled back with its throw.
- So when the provider throws and the row is no longer QUEUED (another worker sent it between the two transactions), the run has:
  - read msg_outbox twice;
  - called the provider for the address;
  - committed zero lines.
- Repro (attack D, deterministic): the provider throws, and a `$transaction` proxy marks the row SENT (owner connection) just before the counting transaction opens. Result: `row=SENT, linesAdded=0`; the provider error is rethrown.
- Expected: one line, because touchPlatform runs before the read. That is narrow, but it is a bypass run on one of the three uses with no committed line.

**m2. A sweep whose only due rows are PLATFORM_ACCOUNT writes no line.**
- `job:messages.outbox_sweep` reads firm-less msg_outbox rows on the bypass and queues a platform send (messages.ts:310-319). touchEachFirm gets an empty list.
- Repro (attack F): firm rows SENT, one PLATFORM_ACCOUNT row QUEUED for an hour. `asJob("messages.outbox_sweep", () => pm.sweep())` gives `queued=1, platformJobs=1, linesAdded=0`.
- The send it queues later writes its own job:messages.send line, so only the sweep's read and queueing go unlined. It does go against "every use writes a line".

**m3. The "firm-less" line is not pinned firm-less.**
- touchPlatform records a CaseEntry with no firmId. `AuditEventAdapter.recordCase` then takes the firm from the request's or job's scope (`caseFirm ?? scope ?? named`, audit-event.ts:87).
- Repro (attack H): `requestScope.run({ correlationId, firmId: () => A }, () => asJob("platform.signup.purge", …))`. The line's `firm_id` is A, so it lands on firm A's trail.
- Not reachable on this commit:
  - public sign-up never has `req.platform`, so the request firm is undefined (checked over HTTP);
  - the three uses run in platform jobs, with job firm null.
- But a firm job's scope does name its firm (observability/jobs.ts:20), and `platform.account.mail` is `outside: true`, so it is allowed inside any job. A firm job that sends a platform-account email would put the line on that firm's trail.
- Fix: pass `firmId: null` explicitly, or have the adapter refuse when the scope names a firm.

**m4. The audit row's `correlation_id` column keeps the caller's free-text X-Request-Id; only `detail.correlationId` is filtered.**
- HTTP repro on :4563: anonymous `POST /api/public/signup` with `X-Request-Id: Client.A.passport.lost`.
- Line: `firm_id NULL | system:platform.account.mail | correlation_id=Client.A.passport.lost | detail.correlationId=null`.
- This is AUD-1b's existing behaviour for every line (audit-event.ts:60/91; hook.ts accepts up to 128 characters of `[A-Za-z0-9_.:-]`). It is newly reachable here: before PF-12b3, a new-email sign-up wrote no audit row, and now each anonymous one stores caller-chosen text in the append-only trail for good. Break M2's intent ("the trail keeps it for good") is only half met.

**m5. In the running app, every job-run line has `detail.correlationId = null`.**
- Job ids in the scope are `job:<job key>`, for example `correlation_id = job:msg.send:platform:2a04…`. CORRELATION (firm-scope.ts:197) accepts only `job:<uuid>`, and its comment ("pg-boss uuid") is wrong.
- The suite feeds `job:<uuid>`, so it never sees this. The column still has the id, so the trail itself is fine; the detail field is misleading. The same applies to part 1's touchFirm lines in jobs.

No Blocker found.

## What held (with evidence)
- **Line shape.** The purge line is `firm_id NULL | workspace platform-audit | system:job:platform.signup.purge | SYSTEM | job:… | {use, method:"none", correlationId}`. There is no `detail.firmId`, so it is on no firm's trail. Over HTTP, the mail line and the send line from a real sign-up both have `firm_id NULL`.
- **(2) Real DB refusal, all three uses fail closed with `BypassNotRecorded` (500, plain words) and an `audit_write_failed` alert:**
  - the purge deletes nothing (pending stays 1);
  - the mail writes no outbox row, and no rendered file either, because touchPlatform runs before `put`;
  - the send leaves the row `QUEUED|` with no try counted.
- **Provider throws, then the counting line fails:** `QUEUED|`, 0 lines, BypassNotRecorded, so the job is retried (pg-boss retryLimit 3, then the sweep re-queues it hourly).
- **Provider throws, line OK:** `send failed: try 1 of 5` with exactly 1 line.
- **(1) Repeated idempotency key:** 1 row and 1 job, one line per call. Eight concurrent sends with one key give 8/8 fulfilled, 1 row, 8 lines, no error. A skipped send and an unknown outbox id each write one line.
- **(3) Refused before any use:** a Bearer token on public sign-up (a real staff token from `session/local`) gets 403 before any use runs. No signed-in request reaches the three uses. A non-uuid X-Request-Id never reaches `detail`.
- **(4) Re-encrypt with no firm:**
  - JobPort refuses to queue it: `firmId` null is invalid, and `platform: true` gives "not in PLATFORM_JOB_QUEUES";
  - the handler called directly with `firmId: null` refuses before any read (0 store reads), runs with `currentBypass()` undefined, and a bad payload gives ZodError;
  - the job is not registered in the app, so no crash loop is possible (a refused job is dead-lettered after 3 tries).
- **(5) mayRunInside:** over every pair of BYPASS_USES, only `platform.account.mail<platform.firms.signup` is allowed.
  - Refused: signup>mail>send ("not allowed on POST /api/public/signup") and mail>purge ("one bypass use at a time").
  - touchPlatform does nothing under a per-firm use and refuses the client in place of a transaction.
- **Suites:** check_pf12b_bypass_audit 58/0, check_pf12b_doors 31/0, check_pf24_secrets 84/0.
