# Review round 3: one migration and one /prepare on main's filing tables (C6.12 + C11.6), commit 80da83d0

Reviewer agent, 2 Nov 2026. Branch `claude/runtime-prepare-2`, head of PR #356. Diff: `git diff origin/main...80da83d0`, with main at bb677e61 (#325 merged). Backend only, no screen.

I worked on my own copies: isolated :4442 (`xr_studio_rev356`) and throwaway copies on :4443 and :4444 for the mutation and main-baseline runs. All are stopped, and the throwaway databases are dropped. US$0, live AI off, never :4400.

Journey test: `journey-test-reviewer-2026-11-02.md`, **8/10, passes**.

## Runs
* `tests/check_vv_prepare_api.ts`, fresh copy: **25/25**. It includes pack 4 C6.12 24/24 and C11.6 14/14.
* `tests/check_vv_prepare_store_api.ts` (#325's): **33/33**.
* Pure suites: `check_vv_prepare.ts` **32/32**, `check_vv_prepare_store.ts` **11/11**, `tests/runtime/check_vv_filings.ts` **37/37**.
* `tsc -p api/tsconfig.json`: no errors in the changed files.
* **`tests/runtime/check_vv_filings_api.ts` (#283's /filings suite): main 12/12, this commit 10/12.** Both ran on a fresh copy with `setup_visitor_visa.ts` (see M1).
* **Upgrade on existing data.**
  * I filled a copy, then ran the migration's rollback text exactly as written in one transaction. The result matched main's schema: constraints, indexes and NOT NULLs.
  * I refilled 135 form items in main's shape (`form_key`, the line's channel stored, kind `family`) and ran the forward migration.
  * The forward migration converted every row: `case_id` and `item_key` filled, `channel` null, `FAMILY`.
  * GET /prepare on all 27 cases: 200. All 135 old item ids were kept with their active flags. 124 document and step items were added, and no form item was duplicated.
  * A second read of every case wrote nothing (xmin unchanged).
* **Mutations.**
  * With the fast path's item-active clause removed, the store suite fails "form no longer applies" (33/34).
  * With the `FOR UPDATE` in the read path removed, the 3- and 24-first-read races fail with 409s (32/34).

## Focus points
* **Migration.** It is expand-and-convert, and the order is right: add nullable columns → backfill through `filing` → SET NOT NULL → relax `form_key` and `channel` → null the stored line channels (main never wrote `channel_reason`, so all of them) → FK, indexes, wider checks.
  * Constraint and index names match the Prisma defaults and main's migration. The partial index `submission_group_one_family` follows the repo's pattern.
  * The one-family index cannot fail on main's data: main created the group only under its advisory lock, after reading again.
  * It is not compatible with main's code running against the new schema (`kind 'family'` and the NOT NULL `case_id` would refuse old writes). That is acceptable with this repo's single restart deploy, which is what the tech lead asked for.
* **Fast path in `sync`** (case-prepare.ts:81-115).
  * It checks five conditions: no family group; a filer whose filing is missing, inactive or in another mode; an active filing that is no longer a filer; a wanted key with no row; an item whose active flag differs from wanted.
  * These cover everything the write branch changes. The write branch builds its keys the same way (subjects without a live filing give `undefined|…` keys that match nothing).
  * Nothing loops: 27 upgraded cases plus the suites' cases were read again with no write.
  * A role change of a person is not detected, but neither side detected it before. Not a finding.
* **Concurrency.**
  * One row lock on `runtime_case` now serialises the first-read writes, splits and channel changes. Before, #325's advisory lock for reads and #356's row lock for writes were separate. That is a strict improvement.
  * Reads with nothing new take no transaction (B1 kept: 120 at once, all 200).
  * See m2 on the lock mode.
* **#325's behaviours.** Kept and tested:
  * B1 (no transaction for a read with nothing new).
  * B2 (release fingerprint, 409, nothing stored).
  * B4 (HEAD returns 405).
  * Ids kept through inactive and active again; filing order follows the people; `not_filing`; other combinations "not derived yet"; no POST.
  * `portal_read_only` and `not_built` are gone from the body. `not_built` listed things now built. The portal is covered by C11.6-1/2. Not findings.
* **Test adaptations.**
  * "Biometrics waits for the date of birth" is pack 4's own rule (C6.12-21, G15). The CAD 170 family maximum with dates of birth is still checked by C6.12-8 inside `check_vv_prepare_api.ts`.
  * Limiting the items checks to forms is right, because documents and steps have no channel. The "no item for a person without a filing" check still covers every kind.
  * `canada.ca` rather than `ircc.canada.ca` fits the exemption page's URL.
  * The pure `prepareView` checks moved to the API suites (stored ids, inactive filing and item hidden, fee lines name stored filings).
  * Not weakened, except for the one suite left behind (M1).

## Blockers
None.

## Majors
* **M1: #283's /filings suite now fails and nothing runs it.**
  * `tests/runtime/check_vv_filings_api.ts:23` (one person: total CAD 185) and `:33` (six people: total CAD 670) fail. Those people have no date of birth, so `case-filings.ts` now sends ages and biometrics waits (G15).
  * The suite passes 12/12 on main. CI does not run it (`product/tools/run-suites.sh` runs only `check_case_engine` and the R1 suites from `tests/runtime/`), so green CI will not show the failure.
  * The builder's "check_vv_filings 37/37" is the pure suite.
  * This is a test of one side that is lost, which the brief says must not happen.
  * Fix: answer adult dates of birth in the test so the CAD 185 and 670 totals still hold. That keeps #283's rule checked, the same way pack 4 C6.12-8 does. Optionally add one check that a line without a date of birth waits. Name the suite in the PR.

## Minors
* **m1: the version can be newer than the items it is returned with.**
  * In a read with nothing new, `sync` reads groups, filings and items in three statements with no transaction. `storedVersion` then reads again separately (case-prepare.ts:157).
  * A split or channel change that commits in between returns the old items with the new version. A write made from that view then passes the stale check.
  * #325 hashed the version from the body it returned.
  * Fix: compute it with `prepareVersion` from `stored` (the same groups, active filings and active items). Keep `storedVersion` under the lock for the writes.
* **m2: the lock mode blocks other writes to the case.**
  * `SELECT … FROM runtime_case … FOR UPDATE` (case-prepare.ts:117, 180, 215) conflicts with the FOR KEY SHARE that every foreign-key insert into a case's child tables takes (answers, rows, form copies). Those writes wait while a prepare write runs.
  * The transactions are short, and fill-case.ts uses the same lock.
  * `FOR NO KEY UPDATE` keeps the mutual exclusion between prepare, split, channel and fill-case without blocking child inserts.
* **m3: stale schema comment.** `prisma/schema.prisma:1671`: the `SubmissionGroup.kind` comment still reads "family (one submission…)". The column now holds `FAMILY` or `SEPARATE`, upper case; say so.
* **m4: the rollback does not keep item ids.** The rollback deletes every `filing_item`, so after a rollback main's /prepare makes the form items again with new ids, and chosen channels are lost. The text half says this ("derived rows"). State plainly that item ids are not kept across a rollback.

## Could not check
* There is no screen, so no browser walk, axe check or screen sizes.
* D17 and D20 stay with the founder.
* I did not judge the parts of the diff outside the focus that came with #356: `releaseLabel` (G13), the placement sort tiebreak in `engine/snapshot.ts:175`, and `filingMode` in people lines. The tiebreak could change a draft's fingerprint where two placements tie, which would show as a draft change after the release. I did not look into it.
* Note for the builder: this worktree shows 8 modified evidence and p2 run files, timestamped 00:45–00:47. They are not from my runs, which used separate worktrees and only the prepare and filings suites. Do not commit them by mistake.

**Verdict: Changes needed** for 80da83d0. Fix M1. m1–m4 are recommended.

---

# Round 4: commit 641f3713 (fixes `git diff 80da83d0 641f3713`)

Reviewer agent, 2 Nov 2026. Fresh isolated copies: :4442 (`xr_studio_rev356`) and :4443 (`xr_studio_rev356f`). US$0, never :4400. Both copies are stopped afterwards.

## Runs
* `check_vv_prepare_api` **25/25** (C6.12 24/24, C11.6 14/14).
* `check_vv_prepare_store_api` **33/33**, including B1: 120 reads at once, all 200.
* Pure suites: `check_vv_prepare` **32/32**, `check_vv_prepare_store` **11/11**, `runtime/check_vv_filings` **37/37**.
* `runtime/check_vv_filings_api` on a fresh copy after `setup_visitor_visa.ts`: **13/13**.
* `tsc`: no errors in the changed files.
* The migration's change is header comments only, so round 3's upgrade and rollback results stand. Its checksum changed, but no main database has applied it yet.

## Round 3 findings
* **M1: closed.**
  * The suite answers dates of birth (adults 40 and 38, children 16–19). The CAD 185 and CAD 670 totals with the CAD 170 biometrics maximum are checked again.
  * A new fail check proves that, with no date of birth, the biometrics line waits and the total is CAD 100.
* **m1: closed.** The view's version is `versionOf(stored.filings, stored.items)`, made from the rows shown. Writes still check `storedVersion` under the lock, with the same function.
  * I wrote a race probe: 8 readers in a loop (782 reads) while one writer switched one item's channel 40 times.
  * 41 versions were seen. **0 versions came with two different channels.** All reads answered 200.
  * A write using a version read before a change: 409.
* **m2: closed.** `FOR NO KEY UPDATE` in all three places (read-write path, split, channel). It still excludes them from one another and from fill-case's `FOR UPDATE`.
* **m3: closed.** `schema.prisma` comment: "FAMILY … · SEPARATE …".
* **m4: closed.** The rollback text says item ids and chosen channels do not survive, while filings and groups keep their ids. It says to stop the app first.

## The breaker's round 3 items, as they touch this review
* **Breaker M1** (stale version) is the same race as my m1.
  * The fast path's three reads are now one RepeatableRead batch on one connection, with no lock, and the version comes from those rows. The probe above shows it holds.
  * A short batch transaction per read does not reopen #325's pool problem: no shared-client read happens inside it. The 120-read burst and the 24 first-reads test pass.
* **Breaker M2** (the migration is not compatible with old code) is the tech lead's explicit instruction: convert in the same migration, one deploy. The header now says this plainly, and the builder has escalated it to the Lead.
  * I don't treat it as a review Major, because it is the Lead's call.
  * The prototype restarts as one deploy.
  * The rollback runs with the app stopped and worked as written (round 3).
* **Breaker m1/m2** (reason filter): I checked them on the channel route.
  * Allowed (200): ZWJ in an emoji sequence, and ZWNJ in Persian text.
  * Refused (400): a reason of only dots ("Write the reason in words"); U+2028, U+3164 filler, C1 U+0085, U+061C, U+2060; a lone surrogate sent as raw JSON `\ud800`.
* The breaker's remaining Minors (m3 item order, m4–m10) are left and listed in the PR, as the builder says.
  * m3 sorts by `createdAt, id` the same way #325 did, so it is not a regression.
  * None of them is a correctness gap that blocks this item.

## Open
No Blocker. No Major. Minors are left as listed in the PR.

**Verdict: Approve** for 641f3713.
