# B145 · C9.5 Adopt a published update on an open case: build notes

7 Nov 2026 (IST), screens lane, branch `claude/exciting-mccarthy-up4u21` (draft #1252). Spec: `concept.md` + `challenge.md` (B1, M1-M8, m1-m4 binding; tech lead's approval on #1252, Q2 = info notice + warning on touched filings only). Sample data only; legal points Unconfirmed: no counsel. AI: none, identical with AI off, US$0.

## Files (first line of the PR: **migration**; shared contract `contracts/runtime.ts`, additive)
* Data: `prisma/migrations/20261107180000_c95_pin_revisions/migration.sql` (expand only: `pack_work_pin.reason`; unique (case, combination, revision) replaces (case, combination); insert trigger `runtime_pin_chain`: first pin revision 1, then previous + 1 on a strictly higher version of the same combination, with a reason; `trg_pack_work_pin_frozen` kept; rollback in the header), `prisma/schema.prisma`.
* Engine (pure): `engine/runtime/release-update.ts` (difference of two snapshots, case changes per person, effect groups, touched filings, review rule, refusals, release words, pin chain, target); `engine/runtime/readiness.ts` (warning code `release_update`, out-of-date words override, review-withdrawn words; additive).
* Readers: `api/src/runtime.ts` `reach()` (pins `orderBy revision desc`, chain and every revision's hash checked; `pins[0]` = newest), `api/src/where-used.ts` (newest revision per case), `api/src/fill-case.ts` `generate` (re-reads the newest revision under the case lock → 409).
* API: `api/src/release-update.ts` + `api/src/features/release-update.ts` (`GET/POST /runtime/cases/:id/release-update`), `api/src/release-context.ts` (case side, shared with prepare); `api/src/case-prepare.ts` (out of date by release, no fact lines, no Undo; `configReleaseId` in the selects; the review rule; the touched-filing warning; draft marks "to fill again" / "filed another way now"); `api/src/readiness-inputs.ts`; `api/src/case-checklist.ts` (a removed line reads "No longer required", uploads kept).
* UI: `web/src/runtime/release-update.tsx` (notice, 560 px panel, moved groups with Fill), `cases.tsx` (notice under the header; header shows the release label), `forms.tsx` (moved groups in Prepare application), `questionnaire.tsx` (type).
* Tests: `tests/check_c95_release_update.ts` (engine, 28 checks, BR-1…BR-8 pass + fail, where-used stand-in), `acceptance/C9.5.test.ts` (pack, C9.5-1…14), `acceptance/lib/sample-release.ts` (later Sample release by the author's routes), `tests/check_c95_release_update_browser.ts` (walk, 32 checks).

## Team-name mapping
`PackWorkPin` (AG-7-56: revision chain, `reasonRef` → `reason`; "a move is a new revision via ADOPT" → POST …/release-update) · `ConfigRelease` (version; label by `releaseLabel`, G13) · `FormInstance.configReleaseId` (where a copy was filled) · `FilingReview.reviewedAt` vs `PackWorkPin.pinnedAt` (M5, no schema) · `FilingRecord` (recorded = refused) · `ChecklistLine`/`CaseDocument` (kept lines).

## Top 5 production improvements over the board
1. The reason and the button are pinned in the panel footer, so they stay in view while the lists scroll (board: reason above the button in the body).
2. Every count is a focusable chip with its group's tooltip (board: plain numbers).
3. The conflict state recovers in place ("Read the list again" reloads the panel), proved in the walk with a release published while the panel was open.
4. After the move, Prepare application keeps the groups (with Fill on each form to fill again) until each copy is made again, instead of a toast only.
5. Each draft in Prepare carries its own mark ("To fill again …" / "Filed another way now …"), and each finished item its "Out of date because of the release …" words.

## Checks (exit codes)
* Engine `tsx tests/check_c95_release_update.ts`: 28/28, exit 0.
* Pack `isolated.sh screens_c95 4442 start --ttl 60 && trap '… stop' EXIT && tsx acceptance/C9.5.test.ts 4442 xr_studio_screens_c95`: **29/29, exit 0** at 72bd31a6f (fresh copy, started and stopped in the same command); earlier runs 28/28 on fresh and lane copies after the D1 fix.
* Walk `tsx tests/check_c95_release_update_browser.ts 4441 xr_studio_b145`: 32/32, exit 0; axe WCAG 2.2 A/AA clean in every state; no sideways scroll at 1024.
* `run-suites.sh --changed origin/main..HEAD` selects ALL (shared contract), so the suites of the touched files ran through it with `--skip-green` (the other 342 left to the PR check): **exit 0**, all PASS: c1112_prepare_api 30/30 · c64_storage_api 48/48 · c76_readiness 75/75 · c76_readiness_api 23/23 · c76_ready_browser 53/53 · c81_signing_api 13/13 · c82_record_api 56/56 · c92_out_of_date 29/29 · c92_out_of_date_browser 19/19 · c92_undo_api 27/27 · c95_release_update 28/28 · c95_release_update_browser 32/32 · contract_seams 98/98 · sh2_where_used 24/24 · case_engine 76/76 · runtime r1c 132/132, r1d 96/96, r1a 99/99.
* `graph.mjs --check`: exit 0. `count-any.mjs --against origin/main`: exit 0, 418 before and after. `typecheck.mjs`: no new type error.

## Screenshots (`screenshots/`, deviceScaleFactor 1)
C95-01 notice (1440, 1024; ⓘ tooltip open) · C95-02 panel (1440, 1024) · C95-03 long list "Show all" · C95-04 conflict (1440, 1024) · C95-05 Prepare after the move with the groups and the toast (1440, 1024) · C95-06 after Fill.

## BIC scorecard (applicable checks; builder's own reading, the reviewer scores)
* BIC-03 No stale answers: met for the move: copies made on the release left are marked (to fill again / filed another way / out of date because of the release), a type mismatch refuses the move until the answer is changed. Hidden answers are kept, not flagged "No longer needed" (C4's).
* BIC-09 Explicit and safe (applied to a move): preview of what moves and what stays, the named action, history (pin revisions + audit line), cancel changes nothing. No reverse path: forward only by SA-1B-254 rule 8. Partly.
* BIC-11 One primary per panel: met (Move in the panel; Fill buttons secondary).
* BIC-13 Errors: the reason's error on its field, typed text kept; refusals on top in words with "Nothing was changed". No "There is a problem" summary (one field only). Partly.
* BIC-14 Tooltips: met (ⓘ and every count open on hover and focus; nothing needed to act is hidden in them).
* BIC-18 States: empty (no notice), loading (skeleton rows), long ("Show all n"), refused, conflict, done (toast + groups), client never sees it. Refused state proved by API, no screenshot. Mostly met.
* BIC-19 Low load: one heading per panel, one primary, counts say what they count; four text steps (18/14/13/12) in the panel. Partly.
* BIC-20 Keyboard: the walk is keyboard (focus + Enter), focus returns to the opener on "Not now" and lands on Prepare's heading after the move; axe clean; 200 % zoom not tested. Partly.

## Deviations (each with its reason)
* Engine tests are `tests/check_c95_release_update.ts`, not `tests/runtime/…`: run-suites runs only two named files under `tests/runtime`, so CI would never have run them there.
* "Release N" is `releaseLabel` (the pack release, "Release 6" for Visitor visa's second row), and the case header uses it too (challenge.md D5).
* The contract's `effects` carries the five groups of challenge M3 (concept §6 still lists four) plus `unchanged`; `last_move` added for Prepare.
* C9.5-2 "to fill again" and C9.5-8 "untouched filing" are proved on the pack's later Sample release (D2); C9.5-7 on a signed scan (D3).
* Only answers the new release asks refuse a move by type (D4).
* Work is counted per newest copy of each form for each person (older copies are history), plus each signed scan, entered form and current upload.
* The facts fingerprint now sorts the waiting answers (D1): a one-time re-review where a waiting fact had several answers.

## Not proved / known gaps
* An Online section entered in the portal before a move is listed in the groups but Prepare does not mark it out of date by release (only validated copies and signed scans are; entered sections keep C9.2's rule).
* The race (C9.5-13) was seen one way in every run (fills first → the move answers 409 "being filled", then moves); the other order (move first → Fill 409) is covered by code and the engine chain test, not observed.
* A form no longer required after the move leaves Prepare's list (its item goes inactive, as before); it is listed in the moved groups only.
* Per-filing moves (Q1, founder), dated releases (SA-1B-253 CRITICAL by filing date), withdrawn releases (SA-1B-257), fee differences: not built (concept §6b).

## Review round 1 (review.md, break-report.md on 14ef16070)
Fail-first: the new pack steps were committed first (8f7222951) and run on the old app code (fresh copy): **33/43, exit 1**. The 10 failures were C9.5-5b (F1: answered "newest"), -8b (B1: pass 500), -1b (m3: 1, 11, 1 rows written), -10b (m2), -14b (m8), m4 (pin deleted), m5 (triggers), -10c (m9: record 200), -8c (m10), -6b (m7: 500). Then on the fixed code: **43/43, exit 0**. With Fill's race guard removed, -13b fails (Fill 202, a copy on the old release). The engine test fails on the old code (no `waitingFactsKey`) and passes on the new: 32/32.
* **B1:** migration `20261107220000_c95_pin_guards` (expand only) adds `release_update` to `readiness_pass_known_code_check`. -8b passes the warning with a reason, and the filing is Ready to file again on its release.
* **F1:** `move()` compares the revision read before it says "newest". The panel treats every 409 as a reason to read the list again: stale or newest shows the conflict state, any other code a named refusal. Test: -5b.
* **m9 and m10:** the prepare `version` carries the pin revision once a case has moved, so record, split and channel changes from a screen read before a move get 409 under the case lock. A review sends `pin_revision` (the readiness screen sends it), and a stale one gets 409. Tests: -10c, -8c.
* **Break m1:** a copy of a form neither release asks for is in no group (engine test). **m2:** a recorded filing has no release warning (-10b). **m3:** the list reads `CasePrepare.peek`; when nothing is stored it falls back to the stored rows and never writes (-1b). **m4/m5:** the database refuses a lone pin delete (a case's own cascade is still allowed), a blank reason (tabs and new lines too), a hash that is not the release's, and another combination's first pin. **m6:** a "Demo release" mark on the notice and in the panel (walk). **m7:** a long lock wait gives a worded 503 (`busyWords`) in the move and in prepare's write (-6b). **m8:** the audit line is written in the move's transaction (same transaction id as the pin, -14b).
* **Review m1:** `waitingFactsKey`, with an order test (pass and fail). **m3:** a section entered in the portal before a move, on a form the move changed, gets the release's out-of-date words on its item; no test, because the pack's data has no entered section on a changed Online form. **m4:** a review counts only if no move after it touched its filing, across every move. **m5:** -13b, with the lock held and the move written first. **m7:** where-used is checked on the database with the real Prisma client (-6). **m9:** filed-another-way rows on a PDF line get Fill; the words say a form leaves the list once its copy is made. **m10:** `ReleaseLastMove` is in `contracts/runtime.ts`; the walk now calls `GET` and `POST` (`POST` refused "newest").
* **Not fixed (with reason):**
  * Review m6: answers in repeating rows are not type-checked before a move; BR-7 covers single answers only. Such an answer is asked again on the new release, so nothing is lost.
  * Review m8 (part): every prepare read still looks for a newer release (one small query; the snapshot only when one exists). The list reads the filings once per request, and the notice's place is held.
  * Break m11: at 200 % zoom the pinned footer leaves about 90 px for the lists. They scroll and nothing is lost; the reason stays beside the button on purpose.
  * Review m2 (the qa script expects the old header form) and D1's one-time re-review are left to the tech lead, as asked.

## Automated review on f583c3e28 (Devin, #1252) and Lead 32's pin-read condition
Fail-first: the tests were committed first (aa1f378b9) and run on f583c3e28's app code (fresh copy): **41/47, exit 1**. C9.5-11b (case-level type refusal) failed: the move answered 200. C9.5-8d (a review racing a move) answered 200. C9.5-8e (a review with no revision on a moved case) answered 200. The engine test failed its rule-only check (33/34). On the fixed code: pack **48/48, exit 0**, engine 34/34.
* **1 (real):** `caseInputs` left out the application's own answers. They now count, named "The application" and sorted after the people's, so a changed, still-asked once-per-case type refuses the move (-11b).
* **2 (real):** the review route checked the revision without the case lock. The review and its audit line are now written under `runtime_case FOR UPDATE`, with the revision read again under it, so a move that committed meanwhile gets 409. Facts are not re-read under the lock, because answer writes do not take it; a later change reopens the review (break B2). A moved case refuses a review sent without `pin_revision` (400). Tests: -8d (lock held, move first) and -8e.
* **3 (real):** a rule-only form change now touches a filing when it changes whether the form applies to one of its people, under each release. Engine tests cover newly applicable, no longer applicable, and applicability unchanged.
* **R2-m1:** Fill's wait for the case lock answers the worded 503 (`busyWords`, moved to `api/src/busy.ts`).
* **Lead 32:** every pin read in the app takes the newest revision. Through `reach()` (`orderBy revision desc`): case, prepare, checklist, filings, assessments, Fill, review, sign steps, employer link and case changes all read `c.pins[0]`. `where-used` orders ascending and the last pin wins. "Kept by" in `form-library.ts` now counts each case's newest pin. `fill-case.ts` `run()` keeps reading all pins on purpose: a copy is written with the release it was made on, found by its id. Pin reads in tests and packs now filter to the newest revision. Counts of pins as cases opened (open-cases checks), and the updates C7.7 puts back, deliberately cover every pin. New pack step: after the move, every case route answers from release 2.
