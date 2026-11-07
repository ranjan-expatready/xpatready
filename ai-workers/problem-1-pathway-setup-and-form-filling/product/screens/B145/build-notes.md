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
