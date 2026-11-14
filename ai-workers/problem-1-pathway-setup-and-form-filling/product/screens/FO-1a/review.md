# FO-1a review: front-office sales tables and the per-firm seed (independent reviewer, 14 Nov 2026)

Commit reviewed: **5f88dc133** (branch `claude/tender-hamilton-moa9bq`, PR #1742). Diff `origin/main...5f88dc133`: `front-office-sales.prisma`, migration `20261114063000_fo1a_front_office_sales`, `api/src/front-office/firm-seed.ts`, `tests/check_fo1a_sales_schema.ts`, one line of `DEVELOPING.md`. Judged against: the row (rows rev 3.1), brief FO-1a (rev 14: consent removed), contracts §0, §2.1, §2.6, §7, AG-2-52, -77, -80, -84, -8a, -44, -76, BR-22, STANDARDS §3–§5. Schema row, so there is no browser or screenshot part. BIC table: N/A (no case-side screen). Graph: `graph.mjs` run; no page or route belongs to FO-1a.

**Round 1 verdict (5f88dc133): Block** (one open Major). Round 2 (121476e43) is at the end of this file.

## What I ran
* `npx tsx tests/check_fo1a_sales_schema.ts`: **74 passed, 0 failed** (15 s). `check_prisma_schema.ts` 8/8, `check_pf3_platform_schema.ts` 75/75, `check_case_feed.ts` 37/37.
* Isolated copy `fo1arev` on **:4431** (runtime ports), with FO-1a migrated. **Load the finished story (C10.1/C10.2) ran to done in 166 s.** Then I ran PF-3's seed and FO-1a's seed twice: the first run gave 16 stages, 13 reasons, 1 form (off) and 5 services for each Sample firm; the second run changed nothing. Copy stopped and dropped.
* A scratch database with every migration, where I tried to break it (SQL below). It is dropped now.

## Done when: each line, with its pass and fail test
| Done-when line | Pass / fail test | Holds? |
|---|---|---|
| Migration on empty and demo-data copies, `migrate diff` empty | yes / yes (bare database differs; applying it twice is refused) | Yes. The "demo copy" in the test is synthetic; I added the real checkpoint load above |
| A lead has no stage, type or value | yes / yes (a fake table is caught) | Yes (BR-22) |
| A prospect's stage is of its own firm and its type's pipeline | yes / yes ×2 (other pipeline; other firm) | Yes, composite key `(firm_id, type, stage_id)` |
| A Corporate prospect needs a company and a primary contact linked to it | yes / yes ×3 | Yes, but stricter than AG-2-77 rule 4, and that causes M1 |
| A repeat enquiry is a second lead | yes / weak (the fail tests a missing person, not a per-person unique) | Yes |
| The same intake key twice is one receipt | yes / yes | Yes |
| Attribution refuses update and delete (consent wording: PF-19a, per the brief) | yes / yes (truncate too) | Yes |
| L-/P- numbers never repeat under 20 parallel inserts | yes / yes | Yes. `UPDATE … RETURNING` on the setup row holds its lock until commit. If the lock is removed, the unique index throws and the suite fails |
| `firm_id` first in an index on every table | yes / yes | Yes |
| A new firm gets 16 stages, reasons, one form and its services, once | yes / yes | Yes (see m7 on how strong the concurrency test is) |

## Deviations from the row: my judgement
* **No foreign key from `fo_*` to `platform_firm`/`platform_staff`:** justified. Prisma needs a back-relation field in `platform.prisma`, and the brief forbids editing that file. The firm and owner triggers stand in for it. Two conditions: the PR must ask Lead B for the lines (m1), and the triggers protect inserts only (m2).
* **Extra `fo_sales_setup`:** justified. It is the per-firm row the number lock needs, the anchor for every `firm_id` foreign key, and the once-only seed mark. Putting the counters on `platform_firm` would mean editing another area.
* **No raw request on the receipt:** justified. The team's own AG-2-84 rule 3 says "stores a hash of the normalised request, never the raw request". It ranks above the contracts' "raw fields" (AGENTS rule 2). Record it in the PR as a deviation from contracts §2.1 (m1).
* **One email and one phone per person:** acceptable for month one (the form has one of each), but the contracts §2.1 table says "emails, phones". Record it as a deviation (m1). A second channel later is a data move.
* **`pipeline` column on `fo_stage_move`:** half right. It keeps `from` and `to` in one pipeline, but nothing ties it to the prospect's type (m3).

## Issues
**Blockers:** none.

**M1 (Major): you cannot change a Corporate prospect's primary contact.** AG-2-77 rule 6 needs this ("cannot be removed until another person is made primary"), FO-2b's row needs it ("add, change and end contacts"), and the trigger's own message tells people to do it. Three rules lock each other out:
* `migration.sql:685`: one live PRIMARY per company, as a partial unique index, which cannot be deferred.
* `:726` `fo_company_contact_primary_kept`: refuses to end, demote or repoint a PRIMARY link while **any** prospect names that person, including WON and LOST ones.
* `:716` `fo_prospect_rules`: a Corporate prospect's contact must hold a live **PRIMARY** link. AG-2-77 rule 4 and the row ask only for "a link to the company".

Reproduced in one transaction, every order fails: adding B as PRIMARY hits `fo_company_contact_one_primary_key`; repointing the prospect to B raises "primary contact is the company's live PRIMARY contact"; ending or demoting A raises "make another person primary first". Old Lost or Won prospects pin the company's primary for ever, and after any change they can never be updated again.
*Fix:* make the two cross-row checks deferred constraint triggers (`CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`), or require a live link of any role (AG-2-77 rule 4). Check only prospects that are not WON or LOST. Add a pass test that swaps A to B in one transaction, and a fail test that commits with no live primary.

**Minors**
* **m1, PR body unfinished** ("Body completed at the end of the row"). It does not yet contain:
  * the "Question for Lead B" asking for the back-relation lines: `PlatformFirm` to `FoSalesSetup`, and `PlatformStaff` to the lead and prospect owners as `(firm_id, owner_staff_id)`, since staff already has `@@unique([firmId, id])`;
  * the deviations above;
  * the `migrate diff` note on the re-stamp.
* **m2, owner and firm checked only on insert/update** (`:554`, `:642`). In my break test I deleted a `platform_staff` row that had no grants. `fo_lead.owner_staff_id` was left pointing at nothing. "Staff are never deleted" is a promise PF-3 does not enforce. The real foreign keys (m1) close this.
* **m3, `fo_stage_move.pipeline` is not tied to the prospect's type** (`front-office-sales.prisma:497`). A move on a CORPORATE prospect naming two INDIVIDUAL stages was accepted. Check `NEW.pipeline = prospect.type` on insert. That still lets Change type (FO-2b) log later moves in the new pipeline.
* **m4, person not tied to lead on the receipt and on notes.** A receipt marked CREATED naming lead L (person A) together with person B was accepted, and so was a note on lead L about B. Calls already use the `(firm_id, lead_id, person_id)` key (`:462`); use the same key on `fo_arrival_receipt` and `fo_note`.
* **m5, a booking arrival that makes no lead has no outcome.** AG-2-84 rule 8 and contracts §7 §2.2 say "a booker with an open prospect makes no lead". But `fo_arrival_receipt_outcome_check` (`:666`) makes CREATED name a lead, and no other outcome fits. FO-3 will hit this. Add an outcome, or record how FO-3 completes the receipt.
* **m6, the seeded "Interested in" names are unclear to a visitor** (`firm-seed.ts:60`). On the finished-story copy each firm got "Outside Canada" (it is Study permit › Outside Canada) and "With an LMIA – inside Canada". The seed runs once and keeps later edits, so a vague label sticks for every firm seeded before a fix. Seed the parent program's label with it.
* **m7, the concurrent-seed test does not prove the `for update`** (`firm-seed.ts:74`). The setup row never exists before the race, so the unique-insert wait already serialises the two runs. Removing `for update` stays green, yet a pre-made setup row would then get two web forms. Pre-create the setup row in the race test.
* **m8, STANDARDS §3 [M] optimistic concurrency.** `fo_lead`, `fo_prospect`, `fo_web_form`, `fo_person` and `fo_company` have no version column (PF-3 did the same). State in the PR that FO-2 uses `updated_at` as the stale-save token, or add `version` now. Adding it now is cheap.
* **m9, check-then-insert race in `fo_prospect_rules`/`primary_kept`** under READ COMMITTED: a prospect insert and the ending of the primary link can both commit. Deferred triggers (M1) or a row lock on the company, taken in FO-2b, close it. Note it for FO-2b.
* **m10, `consent_wording_version_id` has no firm key** (`schema:525`). When its foreign key lands it must be `(firm_id, id)` if `msg_consent_wording` is per firm, or firm A's form can name firm B's wording.
* **m11, the seed is not wired to anything.** Nothing calls `onFirmCreated` or the Sample seed. Nothing emits `firm.created` yet, and PF-3's seed is manual too, so this is acceptable. Name in STATE or the PR which row runs it (sign-up, PF-4), because FO-2 refuses every insert for an unseeded firm (`fo_next_number`).
* **m12, where the form's "message" lives** (AG-2-84 rule 1, "first message"). There is no column on the lead, and the receipt keeps only a hash. Presumably it becomes a system `fo_note` on the lead. Say so for FO-2.

## D1–D20 (1–5; schema row)
D1 4: every Done-when line met; M1 breaks AG-2-77 rule 6 · D2 4: composite keys block every cross-firm link I tried; m3/m4 are gaps inside one firm · D3 4: one person record, contacts linked not copied · D4 3: M1 leaves a reachable state that cannot be undone · D5 5: numbers are given back on rollback; seed retries are safe; the checkpoint loads · D6 4: keys fixed, labels renameable, rollback recorded · D7 N/A · D8–D14 N/A (no UI) · D10 3: m6 · D15 4: indexes for Unassigned, timeline and match; no per-row seed queries · D16 4: a pass and a fail per line; m7 · D17, D20 simulated only (no user walk) · D18 4: every seeded label cites AG-02 · D19 N/A.

## Journey score (reviewer; `journey-test-reviewer-2026-11-14.md`): **8/10**, no criterion at 0
These were data journeys, played as SQL in the shapes FO-2, FO-2b and FO-3 will write. Half points: task completed (cannot swap a primary contact), plain words (m6), feedback and state (m5), correct data (m3/m4).

## Not checked
* A copy of the real :4400 demo database on the Mac (this cloud copy had no demo data; the finished-story checkpoint was my substitute).
* CI on GitHub.
* PF-19a's consent tables (not on main).
* Row-level security (PF-12).

**Round 1 verdict: Block.** To fix: **M1**. Minors m1 to m12 are for the builder to fix or to record in the PR, which the merge does not depend on.

## Round 2: commit 121476e43 (diff `5f88dc133..121476e43`, studio only, P-277)
I read the diff, round 1 above and the breaker's `break-report.md`. **The suite now gives 98 passed, 0 failed.**

What I re-checked, and how:
* **M1 and m9 are fixed.** Two deferred constraint triggers now hold the rule, and a link of any role counts (AG-2-77 rule 4). The rule applies only to prospects that are not WON or LOST. In my scratch database:
  * swap order "demote A to OTHER, add B as PRIMARY, repoint the prospect" committed;
  * the suite's own order (end A, add B, repoint) passes.
* **The race is closed, in both orders.** I used two psql sessions with the default deferral, and in both orders the prospect was refused at commit, leaving 0 open Corporate prospects without a linked contact:
  * the link ends first and is still uncommitted;
  * the prospect is written first and the link-end commits before it.
* **m3 is fixed:** a move must go to the prospect's current stage, and only `CHANGE_TYPE` crosses pipelines. There is a pass and a fail test for each.
* **m4, m5 and m7 are fixed, each with a pass and a fail test.** I ran the m7 race shape myself.
* **m6 is fixed.** I reloaded the finished story on an isolated copy at **:4432** and ran the seed. The services now read, for example, "Temporary residence › Study permits › Study permit › Outside Canada" and "Temporary residence › Work permits › Employer-specific work permit › With an LMIA – inside Canada". A second run seeded nothing. The copy is stopped and dropped.
* **Breaker items:**
  * B3: `DUPLICATE_PROSPECT` is now a system reason, and `COMBINED_PROSPECT` is seeded.
  * B4: each pipeline keeps at least one live ACTIVE stage, under an advisory lock.
  * B6: a combination name with no letter or digit is skipped; one failing firm no longer stops the catch-up.
  * Minors fixed: the counters only go forward; the seed mark is set once; "ENGAGED stays engaged"; `closed_by` and `engaged_by` are required; the word checks.

**New Major (R2-M1): the m4 fix reopened the cross-firm wall on `fo_arrival_receipt`.**
* The lead key is now `(firm_id, lead_id, person_id)`, which PostgreSQL checks as MATCH SIMPLE. When `person_id` is NULL the key is not checked at all, and `person_id` is nullable on receipts. Only CREATED and ON_OPEN_PROSPECT force a person.
* Reproduced:
  * a **firm A** receipt with outcome FAILED and `lead_id` = **firm B's** lead, `person_id` NULL, is accepted;
  * a PENDING receipt naming a lead id that does not exist is accepted.
* At 5f88dc133 the key `(firm_id, lead_id)` refused both. This is the "firm A names firm B's row" case of contracts §0.2.
* *Fix:* add `CHECK (lead_id IS NULL OR person_id IS NOT NULL)` on `fo_arrival_receipt`, or keep the `(firm_id, lead_id)` key beside the triple. Add a fail test: a FAILED receipt naming another firm's lead with no person.
* Notes and calls are safe, because their `person_id` is NOT NULL.

**Round 2 Minors:**
* **r1:** the migration comment on `fo_prospect_contact_linked` says the swap works "in any order". Adding the new PRIMARY first is still refused at once by `fo_company_contact_one_primary_key`, which cannot be deferred. Correct the comment so FO-2b ends or demotes the old link first.
* **r2:** the PR body is still the plan only, and has no "Question for Lead B". Items moved to the PR (m2/B5, m8, m10, m11, m12) must actually be there before the label.

Journey score, round 2: **9/10**. J7 (swap the primary) now completes and J10 (a booking with no lead) has its outcome. Correct data stays at half a point because of R2-M1.

**Round 2 verdict: Block.** To fix: **R2-M1** (one CHECK and one fail test). Once it is fixed and that test is shown failing without the CHECK, I expect to approve on the diff alone.

## Round 3: commit 0405443ea (diff `121476e43..0405443ea`, P-277)
**The suite now gives 109 passed, 0 failed.**

What I re-checked, on a scratch database with every migration and the seed:
* **R2-M1 is fixed.** Both repeats are now refused by `fo_arrival_receipt_outcome_check`:
  * a FAILED receipt in firm B naming firm A's lead with no person;
  * a PENDING receipt naming a lead that does not exist.
* **r1 is fixed:** the swap comment now says to end or demote the old PRIMARY link first.
* **r2 is fixed:** the PR body now has the Questions for Lead B, the deviations, `migrate diff`, and m2, m8, m10, m11 and m12.
* **`fo_has_word` reads any script:**
  * 株式会社さくら, Виза, السعر and é count as words;
  * a space, U+200B/U+00A0, U+3164 and "--" do not;
  * I checked the byte ranges of the character class in the migration.
* **The engaged-lead rule is sound under concurrency.** `fo_prospect_lead_engaged` is deferred and takes a share lock on the lead. A BEFORE UPDATE on the lead locks the row before `fo_lead_stays_engaged` runs, so a lead closed at the same moment waits for the prospect and then sees it.
* **Setup rows** must start unseeded at number 1. **The program-chain query** now cuts a loop. **Invisible characters** are refused in intake keys.

**New Major (R3-M1): the stage-move chain rule orders history by `at`, which is not the order the moves happened in.**
* **Where:** `migration.sql`, in `fo_stage_move_matches`, the query `SELECT m."to_stage_id" INTO prev … ORDER BY m."at" DESC, m."id" DESC LIMIT 1`.
* **The cause:** `at` defaults to `now()`, which is the time the *transaction started*. The tie-break is a random uuid. Two failures follow, both reproduced:
  * **Moves in one transaction (Engage, then two moves).** All three moves share one `at`, so the "last" move is picked at random. The correct third move was refused in **4 of 12** runs ("a move starts where the last one ended").
  * **Two transactions at once.** T2 begins first and does other work. T1 begins later, moves the prospect A→B and commits. T2 then moves B→C. Both pass, but T2's row carries the earlier `at`. The history now reads ENGAGED, then QUALIFIED→CONSULT, then ENGAGED→QUALIFIED. **The next honest move, C→D, is refused**, so the prospect is stuck. The only way out is a false duplicate move into history that can never be removed. Two staff, or a booking and a person, moving one prospect together is enough to cause this.
* **Fix:** order the chain by a value given under the prospect's row lock. Either:
  * add a `bigint` identity column (`seq`) and use `ORDER BY seq DESC`; the move is inserted after the prospect's UPDATE, which holds the row lock, so `seq` follows the real order; or
  * set `NEW."at" := clock_timestamp()` in the trigger and order by (`at`, `seq`).
* **Tests to add:**
  * pass: three moves in one transaction, repeated about 20 times;
  * fail-without-fix: the two-transaction case above, followed by the next move;
  * each shown failing on 0405443ea.

Journey score, round 3: **8½/10**. Correct data drops to half a point again because of R3-M1. Error recovery stays at 1.

**Round 3 verdict: Block.** To fix: **R3-M1**. Everything else from rounds 1 and 2 is closed or recorded in the PR.

## Round 4: commit 1aaccdb4c (diff `0405443ea..1aaccdb4c`, P-277)
**The suite now gives 116 passed, 0 failed.** I rebuilt a scratch database with every migration and the seed, re-ran both round-3 repros on it, then dropped it.
* **R3-M1 is fixed.** The trigger now gives `seq` (from `nextval`) and `at` (from `clock_timestamp()`) after it takes the `FOR UPDATE` lock on the prospect, and it finds the previous move by `seq`.
  * Engage plus two moves in one transaction: **0 of 20** refused (it was 4 of 12 at 0405443ea).
  * The two-transaction case: the history now reads ENGAGED, QUALIFIED, CONSULT in `seq` order, and its `at` values follow the same order. The next honest move, C→D, is accepted.
  * The suite has the matching pass and fail tests, and the builder reports that the mutation fails them.
* **WON:** a move into WON with cause PERSON is refused. Only RETAINER_EXECUTED, SIGNED_OFFLINE or CONVERT may enter WON, and only into WON (AG-2-28a). Undo convert, a move out of WON, stays possible.
* **`fo_has_word` uses ICU:**
  * true for 株式会社さくら, Виза, السعر, é, "Won – client";
  * false for a space, U+200B/U+00A0, U+3164, "--", an em dash and U+2800.
  * The migration needs ICU. That is the case on this cloud copy, and the builder says it is also so on Homebrew and pgdg. I have not seen a CI run, so watch the first one.
* **Also checked:** intake keys must be printable ASCII; the seed mark can be set only once the stages, reasons and web form exist. The seed still sets the mark last, so a normal seed is not affected.
* **Still open:** none. m2/B5, m8, m10, m11 and m12 are recorded in the PR (checked in round 3).

Journey score, round 4: **9½/10**. Correct data is back to 1. Plain words stays at ½ for the long service names, such as "Study permits › Study permit".

**Round 4 verdict: Approve.** No Blocker or Major is open.

Reviewer: Approve 1aaccdb4c3c0d8c31d0b13b8a513258c406f6982

## Round 5: commit 94ca99117 (diff `f4eaad629..94ca99117`, P-277)
Two commits: 7e868861f (shared event name, for CI shard 2's B164) and 94ca99117 (the two automated Devin Review threads on the PR).
* **Tests:**
  * At 94ca99117: `check_fo1a_sales_schema.ts` gives **119 passed, 0 failed**, and `check_b164_no_engine_keys.ts` gives **63 passed, 0 failed**.
  * At 7e868861f, from a `git archive` copy: B164 gives 62 passed, 0 failed, and FO-1a gives 116 passed. I take the one-check difference in B164 to be the copy having no git history; I did not confirm that.
* **The event name now comes from `ports/events.ts`. Accepted.**
  * The file imports zod only, and `zod` is in the studio's `package.json`.
  * `EVENT.FIRM_CREATED` replaces all three spellings in `firm-seed.ts`; the SQL one is now a bound parameter, and the catch-up test covers it.
  * B164 is unchanged and still scans `engine/` and `api/src`. Moving the event name to the shared contract follows the brief's "shared event payload types go in `prototype/studio/ports/`"; it is not a way around the check.
  * The Docker context lets in the whole `prototype` folder, so `ports/` ships with the image.
  * `tsc -p api/tsconfig.json` reports no error in `firm-seed.ts`, `ports/events.ts` or the FO-1a test. The 15 errors it reports are in other suites (e.g. `check_vv_checklist.ts`, `check_x2b_bulk_apply.ts`), and the API is not compiled before it runs.
* **Devin thread (1) is fixed: one lock per company on link removals.**
  * Reproduced in two psql sessions with the default deferral: each session ends one of a contact's two live roles (PRIMARY, SIGNATORY) on a company with an open Corporate prospect.
  * The second commit was refused, and one live link remained. The suite also has a race test that uses immediate mode.
  * `FOR NO KEY UPDATE` does not block foreign-key share locks, so new contacts and new prospects on the company do not wait.
* **Devin thread (2) is fixed: the seed command reports failures.**
  * It prints `failed` explicitly and exits 1. The test forces one firm's seed to fail and checks that the command exits 1 and names the firm.
  * Once the cause is removed, the same command seeds that firm and exits 0.
* **Still open:** none. The PR-recorded items (m2/B5, m8, m10, m11, m12) are unchanged.

Journey score, round 5: **9½/10** (unchanged).

**Verdict: Approve.** No Blocker or Major is open at 94ca99117.

Reviewer: Approve 94ca991179b07e9b3d6dcc4e5fc7cdca284e0fc7
