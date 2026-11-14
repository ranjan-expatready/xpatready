# PF-0p review: shared port contracts and fakes (independent Opus reviewer, P-303)

PR #1752 · reviewed commit `3adcc2faf2575b315b0ad8b3eafa0265e3768717` (branch `claude/gifted-hawking-5rj7cp`, diff `origin/main...3adcc2faf`) · 14 Nov 2026.
Binding brief: `lead-b-briefs/PF-0p.md` (on `lead-b-front-office`). Also read: contracts §0 and §7, case-side contract v0.1 §1 rule 3, and PF-4's `identity/keys.ts` and `identity/audit.ts` (ref `pr1744`).
This is a code-contract row with no screen, so there was no browser walk, no D1–D20, no BIC table and no journey score (the caller said to skip them). The PR head has since moved to `458b7fd49` (`JobRun.attempt`). That commit is **not** covered here.

## What I ran
* `tsx studio/tests/check_pf0p_ports.ts`: **59 passed, 0 failed**, exit 0, 5.6 s.
* `product/tools/typecheck.mjs`: PASS, with no new errors (15 known). The api tsconfig includes `../tests/*.ts`, so CI type-checks the new ports, the adapter and the test. That includes the two-way assignability between this StaffContext and PF-4's.
* Scratch probes under `/tmp/claude-0/pf0p/`: concurrent first audit writers, a git 3-way merge of two slot replacements, cron behaviour across DST, cron speed, cross-firm job keys, re-putting a file, the import-check regex, and `migrate diff` output.

## Brief requirements
Met: the seven port files and their fakes; AuditEntry fields with summary ≤ 600 and ids-only detail; `record(tx, entry)` inside the caller's transaction; `failOn` throws and records nothing; StaffContext is exactly PF-4's 8 fields (zod plus the literal type, tsc both ways); `fakeStaff(partial)` is validated; ClockPort and FakeClock `set`/`advance`; jobs `enqueue`/`schedule`/`cancel`/`recurring`, where a key never queues twice and scheduling follows the clock; MailPort with its fields and the three classes, and the fake inbox keeps the order; FilesPort `put → {key, sha256}`, `get` and `exists`, firm-scoped; DocumentRenderPort with deterministic fake bytes; the zod schemas refuse a missing firmId (audit, jobs, mail, files, staff); the real adapter writes `audit_event` in the `platform-audit` workspace, which the demo reset never deletes (`demo.ts` deletes only the demo workspace's rows); six slot lines in each model, separated by blank lines. A probe shows two PRs replacing neighbouring slots merge cleanly in git. The touch list is respected, `ports/` imports only zod and its own files, and `migrate diff` names nothing in the platform tables.

## Findings
**Major**
1. **M1 `api/src/platform/audit/audit-event.ts:17-19`: two concurrent first writers fail the second caller's transaction.** The comment says the upsert means "two first writers never both create it". Prisma does not issue `ON CONFLICT` for this upsert. Probe on a fresh database: transaction A records the first line and stays open; transaction B records at the same time. B waits 1.5 s and then fails with **P2002 (unique violation)**, so B's business change rolls back and the caller gets a 500. This happens on every fresh database (isolated copies, scratch databases, the first days of the test environment). The race tests the downstream rows must write ("duplicates under race") are exactly where it bites. **Fix:** `await tx.workspace.createMany({ data: [{ key, label }], skipDuplicates: true })` (INSERT … ON CONFLICT DO NOTHING), then `findUniqueOrThrow`. With that change the same probe passes: B waits, no error, 2 lines, 1 workspace; after A rolls back, B succeeds. Add the two-writer case to the test.
2. **M2 `ports/staff.ts:151`: `fakeStaff()` defaults `authTime` to the wall clock, and `FakeClock` defaults to a fixed 2026-11-24T14:00Z.** With both defaults, the sign-in today looks 866,325 s (10 days) old. After 24 Nov 14:00 UTC it lies in the future, so `now − authTime` is negative. A downstream "stale sign-in is refused" step-up test that relies on the defaults (Owner role change within 5 min, §7 §1.2; Owner-only Connect set-up with step-up, §7 §2.5) passes today and fails after 24 Nov: a time bomb. Contracts §0.3 requires fakes to be "deterministic", and this one is not. **Fix:** export the FakeClock default start, for example `FAKE_NOW` from `clock.ts`, and default `authTime` to `FAKE_NOW / 1000`. Alternatively, accept `{ clock }`. The cheap fix belongs here, before 11 lanes encode the default.

**Minor**
3. `ports/jobs.ts:61, 100`: keys are global across firms and queues, and `cancel(key)` takes no firm (both as the brief specifies). Probe: firm A queues `invoice:INV-0001` and firm B's identical key returns `{queued:false}`, so firm B's job is silently lost. The risk is real for per-firm numbers (case numbers start at `00001` per firm; the `R-` and `CN-` series). **Fix:** state on `JobOptions.key` that a key must carry a uuid or the firm id. Note for PF-14: pg-boss's `singletonKey` is per queue and only applies until the job completes, so keeping "never twice" needs its own key ledger.
4. `ports/jobs.ts:140-145`, cron fidelity. At the DST fall-back, `30 1 * * *` in Toronto runs **twice** on 1 Nov 2026 (05:30Z and 06:30Z). At the spring-forward, `30 2 * * *` is **skipped** on 8 Mar. A day field `*/2` with a restricted weekday is treated as OR, where Vixie cron uses AND because the field starts with `*`. Document these or align them; sweeps should be idempotent anyway.
5. `ports/jobs.ts:141`: a new `Intl.DateTimeFormat` is built per minute per schedule. With 3 daily schedules, a 90-day `advance` takes **22.1 s**; with the formatter cached per zone it takes 2.1 s (probed). Downstream notice tests (day 0/7/12 trial, 30-day trust, day 0/30/60/85 exit) will pay this in CI. One-line fix: a `Map<zone, formatter>`.
6. `ports/mail.ts:204`: `sentAt` defaults to the wall clock, the same determinism point as M2. A `now` option exists; default it to a fixed time or take a clock.
7. `ports/files.ts:255-256`: putting the same bytes again with a **different** content type is accepted, and the original type is kept silently (probed). Refuse it like other bytes, or document it.
8. `ports/audit.ts:95-113`: the fake is advertised for use "inside the row's real transaction", but lines recorded earlier in a Prisma transaction that later rolls back stay in `entries`. Only `discard(tx)` drops them, and the test has no handle on Prisma's `tx`. Either pass `tx` to `failOn` as well, or say plainly in the doc comment that `entries` does not follow a real rollback (assert on the database instead).
9. `tests/check_pf0p_ports.ts:37`: the import check misses side-effect imports (`import "../api/src/core.ts";`) and `require(...)` (probed: both return no finding). Widen the regex.
10. `tests/check_pf0p_ports.ts:216`: the test accepts `migrate diff` exit 2 because `main` already has drift unrelated to this PR (`canonical_field_name` removed; `id` defaults on `fact_source`, `form_edition_accept`, `person_role`, `validated_copy`). So "empty" is proven as "nothing in the platform tables". That is acceptable, but the pre-existing drift is for the Lead.

**Notes for the Lead (no change asked of this PR)**
* Once any lane writes a platform audit line on a shared database, suites that pick `select id from workspace limit 1` or `order by created_at limit 1` may pick the `platform-audit` workspace, which is the oldest row after a demo reset: `check_forms_w102_fix.ts:43`, `check_c313_words_filters.ts:19`, `check_s7_reset.ts:25`, `check_b157_relative_subject_unique.ts:27`, `fixtures/scale_100.ts:35`. PF-4 has the same exposure. Unverified which of these suites share such a database.
* Case-side contract v0.1 §1 rule 3 names `*.port.ts` and `fakes/*.fake.ts`; the binding brief names `audit.ts` and so on, and the PR follows the brief. The contract text needs reconciling.
* `AuditEntry` requires `firmId` (per the brief), but the case-side contract calls the trail "mixed" because configuration lines have no firm. AUD-1 (the release holder) will have to widen the entry or add a second shape.

## API design calls (asked)
* `JobPort.handle(name, handler)`: **keep**. A port with no worker registration is incomplete, and it maps to pg-boss `work`.
* `AuditPort<Tx = unknown>`: **keep**. `ports/` stays free of Prisma, the fake (`unknown`) is assignable where `AuditPort<Prisma.TransactionClient>` is expected, and the adapter is typed.
* Mail `to` as one address: **keep**. Consent, class and bounces are per recipient, and SES is per recipient.
* Files write-once: **keep**. Sealed and signed documents must never change under a key; a retry with the same bytes is idempotent. See item 7 for the content-type gap.
* Fake render content type `text/plain`: **keep**. It is honest about bytes that are not a docx, and `opts.contentType` overrides it where a test needs the real type.
* Recurring runs carry `firmId: null` (each sweep covers all firms): fine.

## Does each check prove its claim?
Yes, with a pass and a fail per fake. The rollback check would fail if the adapter wrote outside `tx`, because the line count would change. The slot check's fail case deletes a separator and a line. The import check has a negative sample, though with the gap in item 9. Missing: a two-writer race on the adapter (M1) and a determinism check on the fakes' defaults (M2).

**Reviewer: Changes requested**: fix M1 (adapter first-writer race) and M2 (`fakeStaff` authTime against the wall clock); Minors 3–10 are recommended in the same pass, especially 3 (doc line) and 5 (one line). Re-review reads only the diff, including `458b7fd49`.

## Round 2 (diff `3adcc2faf..0e7772bbc5ce47803ad3fc55c07755dc93ed0065`, two commits; P-277: only the diff was read)
**Ran:** `check_pf0p_ports.ts` gives **66 passed, 0 failed** (exit 0). `typecheck.mjs` passes with no new errors (15 known). I re-ran the round-1 probes against the new code:
* fakeStaff's sign-in age under the default FakeClock is now 0 s (it was 866,325 s).
* A 90-day advance with 3 schedules now takes 1.9 s (it was 22.1 s).
* `*/2` with weekday 1 now uses AND, as Vixie cron does.
* Re-putting the same bytes under another content type is now refused.
* The DST behaviour is unchanged, as now documented.

**`458b7fd49`:** `JobRun.attempt` counts from 1, and the fake always gives 1. It is a field addition that the test covers, and I have no finding on it.

**Round-1 findings:**
* **M1 is closed.** `audit-event.ts` now runs findUnique, then `createMany({ skipDuplicates: true })` (INSERT … ON CONFLICT DO NOTHING), then `findUniqueOrThrow`. This is the fix I probed in round 1. The two new tests both run on a second PrismaClient:
  * In the first, both writers commit and there is one workspace.
  * In the second, the first writer rolls back and the waiting second still commits.

  A sends its first statement 200 ms before B and holds its transaction open for 800 ms, so B does block on the key. The coordinator reports that the first test fails with P2002 on the old upsert code.
  * Note, not a finding: the fix relies on READ COMMITTED, Prisma's default. A caller running a REPEATABLE READ or SERIALIZABLE transaction would get a serialization error instead. That is acceptable for an interim adapter; AUD-1 should know.
* **M2 is closed.** `FAKE_NOW` (`clock.ts`) is FakeClock's default start. `fakeStaff(partial, clock?)` and `fakeMail({ clock })` default to it and never read the wall clock. The 6-minute stale step-up test gives the same result whatever day it runs.
* **Minors 3-9 are closed** as listed by the builder: the key doc line, the DST doc plus the Vixie AND rule with its test, the cached formatter, mail `sentAt`, refusing another content type, `failOn(e, tx)` plus the `entries` doc, and the import check now catching side-effect imports and `require` (its fail sample has 7 imports and expects all 7). Two remarks, neither asking for a change:
  * `fakeMail`'s `now` option became `clock`. No caller exists yet, so nothing breaks.
  * Under DST the fake still runs a repeated time twice and skips a missing one. That is documented, with the advice to schedule outside 01:00-03:00 local.
* **Minor 10** stays a note for the Lead (main's pre-existing `migrate diff` drift). The round-1 Lead notes stand: the `limit 1` workspace pickers, `*.port.ts` naming, and the mixed audit trail for AUD-1.

**New findings in the diff:** none.

**Reviewer: Approve 0e7772bbc5ce47803ad3fc55c07755dc93ed0065**

## Round 3 (post-approval diff `cc6156088..c491f25c8f13c338cfe4739a6aeaf9119ad505be`, one commit; only the diff was read)
**Ran:** `check_pf0p_ports.ts` gives **70 passed, 0 failed** (exit 0). `typecheck.mjs` passes with no new type errors (15 known).

**What changed, and my reading of it:**
* **Job keys are now unique per job name** (`jobs.ts`: the used set is keyed by name plus key, for user keys and for recurring run keys alike). `cancel(key)` now cancels every waiting job with that key, whatever its name. Both doc comments say so, and the earlier note that keys are shared across firms (carry a uuid or the firm id) stays. This narrows the brief's "a key never queues twice" to "never twice under one name". That is a fair way to read the brief: within one queue, which is how pg-boss keys its job table, the rule still holds, and the PF-14 lane asked for this shape. A downstream row that used one key under two names now queues both jobs instead of silently dropping the second, which is the less surprising behaviour. Lead B should know the brief's wording now means "per name". This is a note, not a finding.
* **`runDue` cap:** the loop returns as soon as nothing runnable is left and throws only when a runnable job remains after 10 000 runs. The logic is right: exactly 10 000 runs followed by an empty queue returns normally.
* **Copies:** the `jobs` getter copies `runAt` and `payload`. `fakeMail` copies attachment bytes when it accepts a message, and `sent` and `inbox` return copies (including `sentAt` and the bytes).

**Do the new tests prove their claims?** Yes, each one would fail if the code were reverted:
* Per name: the same name is refused while another name queues, and `cancel` reaches both names (2 jobs cancelled).
* `jobs` copies: changing a returned `runAt` or `payload` leaves the queued job unchanged.
* Mail copies: changing the caller's buffer after `send` leaves the record unchanged, and so does changing the attachment or `sentAt` of a record read back.
* The exact-10 000 case has no test. The builder's reason (the fake picks jobs in O(n²), so 10 000 jobs is too slow for a suite) is acceptable for a guard in a test fake.

**New findings:** none. Rounds 1 and 2 stay closed, and the Lead notes stand.

**Reviewer: Approve c491f25c8f13c338cfe4739a6aeaf9119ad505be**

## Round 4 (CI fix: diff `8f64ca4e5..cfbf4f0c4f685eec80160823398c24ad63b3ffd2`, one commit; only the diff was read)
**Ran:**
* `check_case_feed.ts`: **39/39**.
* `check_pf0p_ports.ts`: **71 passed, 0 failed**.
* `typecheck.mjs`: passes, with no new type errors (15 known).
* A probe: a scratch copy of the refactored `sweep()` run on 13 made-up sources (`/tmp/claude-0/pf0p/cf/cf.mts`).

**Tightened, never loosened.**
* The old two paths behave exactly as before:
  * `.log(` with five or more arguments, and `auditEvent.create`/`createMany`.
  * `fieldsOf(arg, "data")` is the old code moved into a helper.
  * Probe: a `nonsense entity` through `log` and through `create` is still "on no list"; `auditEvent.create(payload)` is still "cannot read".
  * The 39 existing checks pass unchanged.
* The only new exemption is narrow: `entity: e.entity` inside `platform/audit/audit-event.ts`. It matches the file and the text exactly, as the existing core.ts exemption does. It is sound for two reasons:
  * the adapter's input is the zod `AuditEntry`, whose `entity` must now match `AREA_ENTITY` at run time;
  * its callers (`….record(tx, {...})`) are swept.
* The new port branch adds refusals: a non-area or case-side entity, a template summary naming a case, and a dynamic entity. The made-up-source tests prove the pass case and all three fail cases.
* `AREA_ENTITY` in `ports/audit.ts` covers the rev 15.2 prefixes (`fo_sales_`, `fo_booking_` and the rest fall under `fo_`). The new PF-0p test refuses `sign step`, `field`, `case` and `retainer`.

**The coordinator's question, `.record(tx, entry)` with a variable argument:** it **is already refused**. `fieldsOf` pushes "an audit write whose data the sweep cannot read: entry" (probed). A spread-only `{ ...base }` is refused too ("no entity the sweep can read"). Keep both refusals: a variable hides the summary, and the sweep exists to read the summary.

**Remaining blind spots (Minor; none needs fixing before merge):**
* **Calls the sweep does not see.** Probed, each gives no finding:
  * a `.record(` with 3 arguments;
  * a receiver not ending in `audit…` (`this.trail.record`);
  * an alias (`const a = auditEvent; a.record`);
  * a destructured `record(…)`;
  * an element access (`deps["audit"].record`).

  None of these can write a case or configuration entity, because zod's `AREA_ENTITY` refuses one at run time on every AuditPort write. What they escape is only the static "summary names a case" check.
* **A literal summary naming a case** (`"Retainer for case 1a2b3c4d"`) passes the sweep, which only looks for `case ${`. This matches the old rule for old writes. But `firmMayRead` would then hand that `fo_…` line to the firm owning case `1a2b3c4d`.

The lasting fix belongs outside this row's files: make `case-feed.ts` `firmMayRead` return `false` for any `AREA_ENTITY` entity, just as it already does for `PLATFORM_ENTITIES`, so no area line is ever read as a case line. It is for the Lead (case-feed.ts is the case side's) or AUD-1.

**Scope:** `check_case_feed.ts` is outside the brief's touch list, but CI requires it to change. The edit is additive and the reason is recorded, so it is acceptable. Lead B should know.

**New findings:** no Blocker or Major.

**Reviewer: Approve cfbf4f0c4f685eec80160823398c24ad63b3ffd2**
