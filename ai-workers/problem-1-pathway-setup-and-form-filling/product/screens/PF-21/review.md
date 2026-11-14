# PF-21 review: complaints register (schema, migration, service and test; no screen, no route)

Reviewer (did not build it), 14 Nov 2026. Commit **5eca10767e7737a4cac403a17def7ec2429d886c**, branch `claude/eager-cray-o6w2py`, PR #1753. Read against: brief `lead-b-briefs/PF-21.md` and PF-0p's brief `lead-b-briefs/PF-0p.md` (both on `lead-b-front-office`); `lead-b-rows-2026-11-14.md` "Rev 12" FO-13k Done when, plus rev 14 PF-21 ("migration on empty and demo-data copies, `migrate diff` empty"); contracts 2026-11-14 §0, §7, §9; the PR's questions and the tech lead's answers (Lead 47, 13:20Z).
**Journey test:** there is no screen in this row (PF-21s is the screens row), so the journey score is n/a. D1–D20 and BIC-01–BIC-20 are N/A for the same reason.

## What I ran (127.0.0.1:54329 scratch databases only, all dropped; never :4400, never `xr_studio_demo`)
* `npx tsx tests/check_pf21_complaints.ts`: **56 passed, 0 failed**. The commit message says 59; the run counts 56.
* `npx tsx tests/check_prisma_schema.ts`: **7 passed, 1 failed** (`F pass`: "platform-register.prisma: no one-line rule"). The M lines pass, so the migrations still give the schema apart from main's 5 known differences, and PF-21 adds none. **`migrate diff` is empty for PF-21.**
* `node product/tools/typecheck.mjs`: PASS, no new type errors (15 known). This used the local uncommitted `ports/` stand-ins.
* My own probe on scratch database `xr_studio_rev_pf21_*` (script in the session scratchpad):
  * Four concurrent `runAckReminder` calls on two Prisma clients gave `sent,skipped,skipped,skipped`, with 1 mail and 1 `REMINDER_SENT` event.
  * On two `pg` connections, a raw STEP insert racing a close (the closer holds `FOR UPDATE`) waited, then was refused "a closed complaint takes only a NOTE".
  * A service race of close, addStep and close gave `ok,409,409`, with one CLOSED event.
  * `acknowledgeBy` across daylight saving is correct for:
    * Toronto, autumn: Fri 30 Oct EDT → Tue 3 Nov 17:00 EST, 22:00Z.
    * Toronto, spring: Fri 6 Mar → Tue 10 Mar 17:00 EDT, 21:00Z.
    * St John's, Regina, and Lord Howe (a 30-minute DST change).
    * Received during the repeated 01:30 on 1 Nov.

## Checks asked for
* **Firm wall:** pass. Every change goes through `lock()` (complaints.ts:124-129, scoped `FOR UPDATE`). `get` and `list` are firm-scoped. Firm B's Owner gets 404 on get and close and an empty list (test :204-208). The database refuses another firm's handler with 23503 (test :209).
* **Who may read and act:** matches FO-13k.
  * Reading needs the read key, or being the handler.
  * Acting needs the read and record keys, or being the handler.
  * A non-reader gets 404. Read-only access gets 403. Changing the handler needs both keys.
  * Tests :186-201 cover this. The key catalogue is not done yet (M1).
* **Reminder:** fires once and is idempotent.
  * It is scheduled with a key (complaints.ts:153).
  * The handler re-checks closed, acknowledged and an existing `REMINDER_SENT` under `FOR UPDATE` (:277-280). The race probe above confirms it.
  * It is cancelled on acknowledge and close.
* **Audit rollback:** pass. `AuditPort.record(tx, …)` runs inside each transaction. A forced failure on record and on close leaves no row, no event and no job (test :246-252).
* **Triggers:** correct.
  * No delete or truncate on either table.
  * Events are insert-only, RECEIVED comes first, and only a NOTE may follow a close.
  * A closed complaint never changes, its facts are fixed, and the acknowledgement and response are recorded once.
  * The service writes the CLOSED event before the status flip (:259-260), which the event trigger needs.
  * Under concurrency, the event trigger's `FOR SHARE` (migration :180) waits on the service's `FOR UPDATE`, then sees the committed CLOSED.
* **Personal data:**
  * Audit `detail` holds ids and enums only. Summaries are fixed phrases plus category, kind, outcome and dates.
  * The reminder mail names neither the complainant nor the summary, only the complaint id and the due date.
  * The code is correct; the test is weak (m5a).
* **P-600:**
  * (1) Own file `platform-register.prisma` and its own folder.
  * (2) Additive. Two back-relation fields, no column; the second was approved by the tech lead (Q3).
  * (3) Every function and trigger is `plat_`: `plat_has_text`, `plat_complaint_kept`, `plat_complaint_write`, `plat_complaint_event_write`.
  * (4) Stamp `20261114200000` is later than main's newest, `20261114120000_fo1b_booking_tables` (main `549b9cfbb`, fetched at review).
  * (5) `migrate diff` is empty (above).
  * All five are met.
* **Pass and fail twins:** every FO-13k line (1 to 6) and both migration lines (empty and demo copy; diff) have a real pass and a real fail case. The weak spots are in m5.

## Findings
**Blocker**
* **B1. The existing suite `check_prisma_schema.ts` goes red.**
  * Where: `prisma/schema/platform-register.prisma:1` reads `// platform-register.prisma: complaints (…). Owner: Lead B (platform, contracts §9)`.
  * The suite requires `^// <file> — .+ Owner: .+\.\n` (`tests/check_prisma_schema.ts:61`): an em dash after the file name and a final full stop.
  * The brief's wording used a colon, but "every existing suite passes unchanged" binds.
  * Fix: `// platform-register.prisma — complaints (later data requests, legal holds, breaches). Owner: Lead B (platform, contracts §9).`

**Major**
* **M1. The tech lead's answer to Q1 (PR comment, 13:20Z) is not in the commit.** It is binding for this row.
  * The migration adds no `platform_role_permission` rows: `agent/complaint:record` for OWNER, ADMIN and CASE_MANAGER, and `agent/complaint:read` for OWNER and ADMIN.
  * The suite has no per-role pass and fail test. Tests :101-106 hand the keys straight to `fakeStaff`, so no real role reaches "visible to Owner and Admin".
  * Failing case: any CASE_OFFICER, CASE_MANAGER or ADMIN role mapping currently resolves to neither key.
  * Fix:
    * Add the four or five catalogue rows. These are the lead's written P-600 (b) exception, and the release holder reads them.
    * Add a test per role: Owner, Admin and Case Manager may record and the others are refused; Owner and Admin may read and the others get 404.

**Minor**
* **m1. Mismatches with PF-0p's brief signatures:**
  * `registerComplaintJobs` calls `jobs.handle(...)` (complaints.ts:292-294). PF-0p's `JobPort` has only `enqueue`, `schedule`, `cancel` and `recurring`; `handle` exists only in the local stand-in.
  * The reminder `mail.send` (:285) omits `replyTo`, which PF-0p lists as a field and does not mark optional.
  * Fix: ask PF-0p how a job's worker is registered, and align both calls when PF-0p lands.
* **m2. A malformed id answers 500 instead of 404.**
  * `lock()` (:126) and `get()` (:160) accept `^[0-9a-f-]{36}$`, then cast to uuid.
  * Failing case: `get(owner, "------------------------------------")` and `get(owner, "abcdabcdabcdabcdabcdabcdabcdabcd----")` both throw a Prisma "invalid input syntax for type uuid" error, which is 500 once routed.
  * Fix: use the strict `uuid` pattern from :50.
* **m3. An impossible date is shifted, not refused.**
  * `instant` (:49) relies on `Date.parse`.
  * Failing case: `receivedAt: "2026-02-30T10:00:00Z"` is stored as `2026-03-02T10:00:00Z`.
  * Fix: round-trip the date part and answer 422 at the field.
* **m4. Side effects run inside the database transaction.**
  * The reminder sends its mail before commit (:285): a send failure rolls back, and a commit failure after sending resends on retry.
  * `jobs.cancel` runs in `after` before commit (:187, :207, :261): if the commit then fails, an unacknowledged complaint loses its reminder.
  * The job already re-checks state, so cancel (and send) can run after commit.
* **m5. Tests that would stay green if their rule were removed:**
  * (a) Lines :243-244 (no names in audit) and :154 (mail) have nothing to catch. No complaint recorded through the service has a `complainantName`: the only one, at :125, is refused. Putting `complainantName` into audit `detail` or the mail would stay green. Record one OTHER_PERSON complaint by the service and assert its name appears in neither.
  * (b) No business-day case crosses daylight saving. Every date in :140-144 falls after 1 Nov. The code is right (probe above).
  * (c) Nothing tests a race. Removing `FOR UPDATE` (:127, :277) or `FOR SHARE` (migration :180) leaves 56/56.
  * (d) Two database rules have no test: RECEIVED-first (migration :182) and the second `responseSent` (409 at :230, trigger :166).
* **m6. `list()` silently caps at 500 rows** (:174). It has no cursor and no "more" signal, and the closed view only grows. Nothing tells the caller older complaints are missing.

## Merge preconditions (known; not counted as findings)
* `prototype/studio/ports/` is local and uncommitted (`.git/info/exclude`). At this commit, CI's `types` job and `check_pf21_complaints.ts` would hit TS2307 on `../../../../ports/*.ts`. Merge main once PF-0p is on it, then re-run.
* Still to come, as the tech lead agreed:
  * the `complaint.received` and `complaint.closed` outbox events, which wait on FO-1a #1742;
  * the controllers and `api/src/features/platform-complaints.ts`, which wait on PF-4 #1744;
  * the College by-laws, so the fields stay Sample.

## Could not check
* `graph.mjs`: it rewrites `qa/GRAPH.md` and `graph.json`, and this review may write only this file.
* Demo reset (`check_s7_reset`, `check_d1_reset_to_six`) and C10.1: not run. The new rows carry no `workspace_id`, and the demo seed writes no complaint.
* CI on this head: every job was skipped (draft); only `guard` ran green.

For commit 5eca10767e7737a4cac403a17def7ec2429d886c: fix B1 and M1. The m1-m6 fixes are recommended; they do not hold the label.

Verdict: Block
