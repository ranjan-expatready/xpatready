# Break report r3: unified "Prepare application" API (C6.12 + C11.6, migration 20261102030000)

Branch `claude/runtime-prepare-2` at 80da83d0 (diff `origin/main...80da83d0`). Copies: `brk` (`xr_studio_brk`), set up with `check_vv_prepare_api.ts` (25/25 PASS, release 2 with filing modes and channels). It started on :4443 but was moved to **:4457** because a reviewer's mutation run (`xr_studio_rev356m`) also binds :4443 and kept killing this copy. `brkmig` (`xr_studio_brkmig`): main's code (bb677e61, a separate worktree with its own copied `node_modules` and its own `prisma generate`) on :4444, then this branch on :4445. Live AI off, US$0. No code was changed or committed. Both copies were stopped afterwards and the worktree was removed. Scripts are in the session scratchpad only.

## Blockers
None found.

## Majors

**M1. A read can return old content with the newest version, so a write based on stale data passes the version check.**
- Cause: the fast path (`api/src/case-prepare.ts:81-93`, `:116`) reads groups, filings and items in three separate queries outside any transaction. The `version` then comes from a fourth, later read (`storedVersion(this.db, …)`, `:157`, `:237-244`). The write path has the same gap: it computes `storedVersion` on the shared client after its transaction commits.
- Reproduce, channel:
  1. Open a case with 2 people.
  2. Loop: `PATCH /items/:5257/channel` alternating PAPER (with a reason) and PDF_UPLOAD, each time with the version just returned.
  3. Meanwhile, 6 loops of `GET /prepare`.
  4. For each answer, compute `prepareVersion` from the answer's own groups and items. Use the item's channel only when `channel_changed` is set.
- Result: 27 of 469 reads were torn. Each showed `IMM 5257: PAPER` with the version of the state where it is already PDF_UPLOAD.
- Exploit (3 runs out of 3): take a torn read's version and stop the writer. That version equals the current version. A `PATCH` of another item with it answers 200 `changed:true`, although the read it came from was out of date. The guard ("a write made from an older read is refused", `engine/runtime/prepare.ts` `prepareVersion`) is defeated.
- Reproduce, split:
  1. On 25 cases, run 6 `GET` loops while one split commits.
  2. Result: 20 of 495 reads show **two `"kind":"family"` groups** with `reason:null`. The new SEPARATE group is read through `filings` but is missing from `groups`, so `groupKind` falls back to "family" (`:123-124`).
- Expected: the content and the version come from one snapshot. Either read inside one REPEATABLE READ transaction, or compute the version from the rows already read.

**M2. The migration is not "expand only": main's code breaks on the migrated schema (STANDARDS §5 [M] expand → migrate → contract).**
- Steps:
  1. Run main's code on a fresh database and let it fill the tables. Cases: A (3 people, read), B (spouse read, then off), C (5 reads at once), D (never read).
  2. Stop main's code and apply 20261102030000.
  3. Start main's code again on the same database.
- Actual:
  - `GET /prepare` for case D: **500** `new row for relation "submission_group" violates check constraint "submission_group_kind_check"`. Main writes `family`; the migration upper-cases it and narrows the check to `FAMILY|SEPARATE` (migration.sql lines 35-37).
  - Main's item insert would also fail. It writes no `case_id` or `item_key`, and lines 46-47 make both NOT NULL with no default.
  - On case A, main returns `channel: null` for 20 of 21 items (line 49 nulls them), although main's type says a channel is never null.
- Impact: there is no window where old code and new schema both work. That breaks a code-first rollback, which the header itself prescribes ("after the code that reads the new columns is reverted"). It also breaks any mixed-version run.
- The header's claim "Expand only … No table, column or row is dropped" is true about drops, but values are converted in place and checks are swapped, not widened.
- A true expand step would keep `family` valid and give `case_id` and `item_key` defaults or a trigger, then contract later.

## Minors

- **m1. The reason filter misses characters that its comment says it blocks.**
  - Rule: `Reason` regex at `case-prepare.ts:37`, which promises "no control characters, no hidden … zero-width characters".
  - Reproduce: one split per case, each with a different reason. Each answered 200 and was stored:
    - C1 controls U+0085 (NEL) and U+009B (CSI)
    - U+2028 and U+2029
    - U+061C (Arabic letter mark)
    - U+2060 (word joiner), U+2062, U+180E
    - tag characters U+E0041 and U+E0042
    - U+00AD (soft hyphen)
  - Invisible-only reasons pass both the API and the DB check `length(btrim(reason))>0`, so BR-16's "reason required" is met by a blank-looking reason: U+3164 (Hangul filler) is stored as `e385a4`, U+2800 (braille blank) as `e2a080`.
  - A lone surrogate `\ud800` is silently stored as U+FFFD (`efbfbd`), so the stored text differs from the text sent.
- **m2. Valid non-English reasons are refused.**
  - Reproduce: Persian `متقاضی نمی‌تواند آنلاین درخواست دهد` (ZWNJ U+200C, normal Persian spelling) and Hindi with ZWJ U+200D, each as a PAPER reason. Both get 400 "holds a hidden or control character". Emoji ZWJ sequences are refused the same way.
  - Cause: the regex range `​-‏` takes in ZWNJ and ZWJ.
- **m3. Items come back in random order.** Rows from one `createMany` share `created_at`, so `orderBy createdAt, id` sorts by random UUID (`:84`, `:107`). One case returned `IMM 5476, IMM 5707, IMM 5257, proof_of_financial_support, passport…, Give biometrics`, with people interleaved. This ignores the release's filing order (C11.9 `byFilingOrder` in `snapshot.forms`).
- **m4. Returning to the line's channel never "follows the line" again.**
  - Reproduce: PATCH PAPER (with a reason), then PATCH PDF_UPLOAD, which is the line's channel.
  - Result: the DB stores `PDF_UPLOAD`, not null, and `channel_changed` stays set (`by:"user-O"`, `reason:null`). A later release that changes the line's channel will not move this item.
- **m5. `channel_changed.by` shows the raw actor id (`"user-O"`), not a name** (`:147`). QA-74 says "never user-A on screen".
- **m6. A read that needs to store waits for the case row and then answers 500.**
  - Reproduce: hold `SELECT … FROM runtime_case … FOR UPDATE` for 20 s in psql, then `GET /prepare` on a case with a newly added person.
  - Result: 500 after 19 s. The log shows `Transaction API error … timeout 15000 ms`.
  - The `/prepare` write path (`:116-119`) now shares this row lock with `addPerson`, `team.ts` and `fill-case.ts`. `addPerson` also returned 500 (5 s timeout) while the lock was held.
  - Expected: a 409/503 "try again", not a server error.
- **m7. HEAD 405 has no `Allow` header** (RFC 9110 §15.5.6 requires one). HEAD itself stores nothing (held).
- **m8. Some links are checked only in the service (STANDARDS §3.4: "database constraints and service rules"):**
  - `filing_item.case_id` is not tied to its filing's `case_id` (no composite FK).
  - `filing.submission_group_id` is not tied to a group of the same case. The split now writes this column.
  - There is no check that `channel`, `channel_by` and `channel_at` are set together, or that only `kind='form'` has a channel.
  - There is no length limit on `submission_group.reason` or `channel_reason`.
- **m9. A channel change on an item of a person who left answers 422** "Only a form on this application has a channel", rather than 409 Reload. A `filing:"nope"` split answers 409, not 400.
- **m10. The request schemas `SplitBody` and `ChannelBody` live in `api/src/case-prepare.ts:38-39`**, not in `contracts/`. STANDARDS §6: "zod schemas in the shared package".

## What held
- The migration on main-filled data:
  - Every group, filing and item kept its id.
  - Kinds became `FAMILY`, and `item_key = form_key`.
  - Main's inactive spouse filing and its 3 items came back with the same ids when the spouse rejoined.
  - A SQL-planted `PAPER` with `channel_reason` kept its channel and reason.
  - Main's 5 concurrent first reads left one group, so the one-FAMILY index built.
  - No schema drift (`prisma migrate diff`) on the touched tables.
  - The recorded rollback ran clean inside BEGIN…ROLLBACK on 48 SEPARATE and 105 FAMILY groups.
- Permissions on all 3 routes:
  - Client P and client Q: 403.
  - Configuration A and B: 403.
  - Another firm (S): 404.
  - No actor or an unknown actor: 401.
  - Same-firm R and T: allowed.
- Bad ids (zero UUID, SQL text, `%00`, 5000 characters, an id of the wrong type): 404 or 409, never 500. Uppercase UUIDs work.
- Bad bodies (null, array, scalar, invalid JSON, objects in place of strings, missing version, 100 kB channel, `__proto__`, lowercase `paper`, NOT_NEEDED, a channel outside what IRCC accepts, PAPER without a reason, a reason over 400 characters, a whitespace-only reason): all 400 or 422.
- Concurrency:
  - 6 channel changes from one read: exactly one 200.
  - A split and a channel change from one read: one 200, one 409.
  - Splits at once: one 200, and the family group is never emptied.
  - 20 first reads on one case: one group, one version, 11 items.
  - 40 first reads on 40 cases at once: all 200 in 2.0 s.
  - Toggling `applies` against reads and channel flips for 15 s: no 500 and no duplicates.
- Leave and rejoin, 3 cycles: the same filing id, item id, PAPER channel and reason, and the split group with its reason came back. While the person was away, the split and channel routes refused.
- B1: a read with nothing new answered in 65 ms while the case row was locked. B4: HEAD answers 405 and stores nothing.
- The same channel again changes nothing.
- No audit line or `api.log` line held any reason used (English, Arabic, CJK, Persian, the private markers). Audit detail is `{from,to,reason_given}` only.
- Arabic, CJK and 400 combining marks are stored intact.
- Budgets on a case of 6 people (31 items, 31 kB): first read 125 ms, warm reads 64-90 ms, channel change 122 ms, split 133 ms.
