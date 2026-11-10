# Review: QA-355 (C7.8, an added form leaves the release's facts alone) · PR #1450 at 3708f4f83

Reviewer: a fresh session that did not build this (screen-review + journey-test, reviewer role), 9 Nov 2026. Code read: `git diff origin/main...3708f4f83`. Runs: my own isolated copy (:4462, `xr_studio_rev_q355`, Demo › Load the configured checkpoint, then stopped and dropped). The builder's copy on :4461 was only read, never stopped. Live AI off, US$0.
**Skill outcome: Ship.** No Blocker or Major. Five Minors, listed below; none of them holds the merge.

## What I verified (not taken from the build notes)
* **The ruling holds.** (b): `namesNoValues` (engine/options.ts:161) replaces `isCodeRange` in `shapeIn` (engine/runtime/case.ts:141). (a): `judgingMaps` (case.ts:120) removes every map marked `added` unless `form` names that map. `checkValue(…, form)` is called only from `formCoverage` (engine/runtime/forms.ts:62), so only a copy's own coverage sees its own map. No form number and no combination key appear in the code (P-319, P-425). Added maps are told apart by the `added` flag that `withAdditions` sets (added-forms.ts:101). F3 (added-forms.ts:82-83) means an added form never shares a number with a release map, so the filter by `form_number` cannot mix the two.
* **Every caller.** Each copy path goes through `formCoverage(…, form, …)` and so passes the form: fill-case.ts (142, 202, 301, 389, 409, 460, 531), sign-steps.ts:190, case-prepare.ts (280, 619, 728, 818), review-runs.ts:126, submission.ts:143, form-additions.ts:170 and answer-keys.ts:322. Readiness picks up an added copy's own `fix` through `formHoldsBack` (forms.ts:246-253), so its own list still blocks that copy alone. Every caller that judges by fact now uses the release's maps only: the question view (case.ts:421-427), saving an answer (runtime.ts:648, 672), case-documents.ts:173/182, earlier-facts.ts:119, release-update.ts:129, case-checklist.ts, assessments.ts, release-context.ts, case-filings.ts, submission.ts:63, employer-link.ts:54 and the phone parts (runtime.ts:454). None of them still judges release facts by an added map.
* **Cache.** `judging` is a WeakMap keyed by the snapshot object, like `snapshotFieldFormat`'s own cache. The joined snapshot is built once per reached case (runtime.ts:146-151) and nothing mutates `field_maps` in place (grep: the only `entries.push` is on local arrays in engine/parts.ts). With no addition it returns `s` itself. The cache is sound.
* **Tests, re-run by me.** Unit `check_case_engine.ts`: 83/83. C7.8 pack on a fresh checkpoint copy: **20/20, exit 0**. C7.8-19 added IMM 0008 and IMM 5707, then removed both; the 4 release forms were identical before, after and back, and each added copy had `to_fix` 0. `tests/qa/check_qa355_…`: 2/2. The type check (`product/tools/typecheck.mjs`) found no new errors.
* **Fail-first (mutations in a throw-away worktree, unit suite).** Removing (a) (`judgingMaps` returns `s`): 81/83, so the (a) steps fail as they should. Removing (b) from `shapeIn`: **83/83**, still green; see m2. Dropping `form` at forms.ts:62: **83/83**, still green; see m1. The builder's before-fix pack run (19/20, only C7.8-19 red) and qa check (1/2) are in the folder. C7.8-19 is a real guard for the reported bug.
* **The data reach of (b).** I classified every `code_list` note in the library and in the 6 release snapshots on the checkpoint. 25 notes now read as "no list", and all 14 lists that carry no "=" stay lists. Two of the 25 sit on releases' own forms and change release lines; see m3.

## D1–D20 (a bug fix: one engine rule, no new screen)
D1 concept fit 2/2: BR-7 and F3 hold again; Ready to file after the add lists only IMM 0008's own lines (walk r1-ready-after-add-1440). · D2 words 2/2: the unfixable "Choose one of: codes as listed in the inventory" is gone. · D3 menu and team look 2/2: unchanged. · D4 states 2/2: approval withdrawn on add and back on remove. · D5 errors 2/2: the added copy's fixes stay on that copy. · D6 a11y 2/2: axe found 0 violations before the add, in the panel and after the add, on 2 runs. · D7 keyboard 2/2: Enter opens, picks and adds. · D8 1024 px, 400 px and 200 % 2/2: no sideways scroll. · D9 speed 2/2: page 1.4 s, add 0.35–0.84 s. · D10 data 2/2: API lines identical before, after and back. · D11 audit 2/2: add and remove carry reasons (C7.8 pack). · D12 authorisation 2/2: C7.8-12 gives 403/403/404. · D13 duplicates 2/2: C7.8-5 gives 409. · D14 code quality 2/2: one rule, one join point, no form numbers. · D15 tests 1/2: m1, m2. · D16 records 1/2: m3, m5. · D17 simulated only. · D18 no migration: N/A. · D19 cost 2/2: US$0. · D20 simulated only.

## BIC scorecard (EXPERIENCE.md §6; only the checks this fix touches)
| Check | Score | Evidence |
|---|---|---|
| BIC-03 No stale answers | Met | Adding a form no longer changes a confirmed answer into a "needs a fix" answer on other forms. C7.8-19; walk "release lines unchanged by add: yes". |
| BIC-12 Check before it leaves | Met | Ready to file names only IMM 0008's lines: validate, 76 mandatory fields and signature (r1-ready-after-add-1440, r1-w1024). |
| BIC-13 Errors say what and how to fix | Met | No line offers a fix that cannot be done. Before the fix, qa's walk/10 showed 7 such lines. |
| BIC-19 Low load by layout | Met | 1440 and 1024 px screenshots. |
| BIC-20 Accessible, keyboard-complete | Met | axe 0, keyboard add, 1024/400/512 px with no sideways scroll. |
| BIC-01, 02, 04–11, 14–18 | N/A | This PR does not touch them. |

## Issues (all Minor, all Should)
* **m1 (Should): no test fails when the copy stops judging by its own list.** Changing forms.ts:62 to `checkValue(s, b.fact, b.value, today)` keeps the unit suite at 83/83. C7.8-19 cannot see it either, because no form addable on today's checkpoint carries a real list that rejects an answer the release accepts. The (a) unit steps call `checkValue` directly. Fix: one unit step that calls `formCoverage` on a `withAdditions` snapshot whose added map has a real list and a value outside it. The added form's box should be "answered with a problem" and a release form's box should still be written.
* **m2 (Should): (b) inside `shapeIn` has only the pack as its guard.** With (a) in place, putting `isCodeRange` back at case.ts:141 keeps the unit suite at 83/83. Only C7.8-19's `own.to_fix === 0` (server and database) catches it. The build notes' "80/81 without (b)" was measured before (a) existed. Fix: a unit step `shapeOf(joined, fact, "SAMPLE-ADDED").choices === null` for the "codes as listed in the inventory" note.
* **m3 (Should, records): (b) also changes release lines, and that is not recorded.** On the checkpoint's releases 241d20f5 and 90040a31:
  * IMM 5257 SCH1 reads its travel, military, government-position and organisation country facts with "codes exactly as in options_resolved, e.g. Canada=511, …". Before this PR those facts accepted only the fragments of that note. They are now open.
  * IRM 0002 reads `person.requested_sex_identifier` and `person.sex_identifier_on_record` with "F Female / M Male / X Another gender; inventory does not separate code from label, …". That note does name values; it is swallowed because it contains the word `inventory`. Before, it gave two junk "choices"; now it accepts any text up to 120 characters.
  Both are better than before, but neither is in build-notes.md or any test. The keyword half of the rule (`as in`, `this form`, `inventory`, options.ts:162) would also swallow a future real label such as "Same as in passport". Fix: record both changes in build-notes.md. Optionally anchor the keywords to the phrases actually seen ("as listed", "as in inventory", "listed for this box").
* **m4: `judgingMaps` keys its cache by any `form`, release forms included.** Once a case has one addition, every release form number gets its own filtered snapshot, so `snapshotFieldFormat` rebuilds its cache per form. Behaviour is correct; the cost is a few extra filtered copies per request. Fix: use the key "" when `form` names no added map.
* **m5 (records):** `C7.8-pack-before-fix.txt` shows the earlier text of step 19 (IMM 0008 only), not the final step that adds every form that fills. The final step is a superset, so the guard is unaffected.

## Not findings (outside the ruling, or not built here)
* qa's verdict asked that C7.8-2's lock be 200 on clean facts. The ruling did not ask for it, and IMM 0008 still leaves 76 mandatory fields empty, a library gap the build notes report.
* GRAPH G3 shows `GET /runtime/form-additions/:id/blank` with no test. That was there before this PR.
* An added-only fact's choice words on an added form's answer sheet now come from the release's maps only (`optionsOf`, case.ts:160). I found no fact on the checkpoint where this shows.

## Journey test (reviewer, the one score for this check)
**9/10, pass, no criterion at 0.** Report: `screens/qa-355/journey-test-reviewer-2026-11-09.md`.

## Could not check
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Whether an added form's own real list blocks only its own copy on screens: no addable form on the checkpoint has one, so this is proven by unit steps only (m1). CI on GitHub's runners.

Blockers: none. Majors: none. Minors: m1, m2, m3, m4, m5.

Verdict: Approve

## Round 2 (diff-only, P-293): 547ca5946 on top of 3708f4f83
Read: `git diff 3708f4f83 547ca5946 -- ai-workers/problem-1-pathway-setup-and-form-filling`. Ran in a throw-away worktree at 547ca5946, since removed. I did not touch the :4463 copy.
* **m1, m2 and m4 fixed and proven.** The unit suite at the head passes 86/86. I re-did each mutation myself:
  * dropping `form` at forms.ts:62 fails the new m1 step (85/86);
  * putting `isCodeRange` back in `shapeIn` fails the new m2 step (85/86);
  * `key = form ?? ""` fails the m4 step (85/86);
  * `judgingMaps` returning `s` fails 4 steps (82/86).

  The m1 step goes through `formCoverage`, so the added copy's own-list judgement is now covered at copy level. The type check found no new errors.
* **m3 fixed.** `namesNoValues` (options.ts:163-164) now reads three kinds of note as naming no values: a range, `inventory` or `options_resolved`, and codes said to be "as listed / as in / listed in|for". "Same as in passport=1, Other=2" and "Listed in this form=1, Not listed=2" stay lists (unit step). Both release-side effects (IMM 5257 SCH1's countries, IRM 0002's F/M/X) are recorded in build-notes.md, with the map fix named for the forms lane.
* **m5 fixed.** `C7.8-pack-before-fix.txt` is now labelled as the step's first text. `C7.8-pack-final-step-on-main-engine.txt` shows the final step 19 red on main's engine files. C7.8-16 is also red there, which the file explains as an artefact of a reused copy; that matches what I saw in round 1 on a reused copy, and the step was green on my fresh copy.
* **New, Minor (Should, not blocking): the narrower rule reads four notes as lists again, as main does.** I re-classified every checkpoint note. 21 read as no values; these 4 moved back to "list":
  * "01, 02, 03, 04, 06, 05, 09, 07, 08 as listed" (IMM 0008 eye colour);
  * "09, 03, 04, 01, 05, 02, 00, 06 as listed" (marital status);
  * the two partial "… ; other codes 87, …, 85 as listed" lists (relationship to the principal applicant).

  None of them shows today:
  * On releases 5a93c493 and 93ed9bf4, the first real eye-colour list ("01 Black, …") wins `shapeIn`'s `find`.
  * Marital status has an answer list.
  * Relationship to the principal applicant is a text fact, so no choice check runs; `optionsOf` may offer its fragments as options, exactly as on main.

  This is not a regression against main. But if one of these notes ever judged an answered fact, its last fragment ("08 as listed") would refuse a real code. Fix, when the forms lane touches these maps: write them as real lists. Or treat a note that ends "as listed" after bare codes as no list.

Blockers: none. Majors: none. Minors: one, carried forward (the four notes above).

Verdict: Approve

## Round 3 (diff-only, C6.19 pack)
Read: `git diff 7e21009ab 82e986c8f6831e8d3e99f7ef170caaeedd0713c9`. That is one file, `acceptance/C6.19.test.ts`: +10/−1 in two commits, with no merge of main into the branch.

How I checked it:
* I worked in a throw-away worktree: 82e986c8f with today's `origin/main` (bdf3b59ec) merged in, never pushed.
* I ran my own isolated copy on :4466 (`xr_studio_rev_r3c619`). The pack loaded the configured checkpoint itself through `/demo/reset` and `/demo/load`. The copy is now stopped and dropped, and both worktrees are removed.
* :4400 and the builder's copies were not touched. Live AI off, US$0.

What I verified (not taken from the builder's evidence):
* **The CI failure's cause is as the builder says.** I ran main's engine (a worktree at `origin/main`) against the checkpoint's With an LMIA release:
  * `checkValue` refuses "IND" for `person.passport_country_of_issue` with "Choose one of: codes as listed for this box, e.g. CAN (Canada.".
  * The release's only map line for that fact is IMM 5710's `code_list:imm5710.passport_country (codes as listed for this box, e.g. CAN (Canada)=511)`.
  * With this PR's engine, "IND" passes on both releases.

  So the old step's "VV accepts, WP refuses" split was QA-355's bug itself. IND is a valid country, so it never tested M4 honestly.
* **Changing the pack here is right and allowed.** WAY-OF-WORKING says "When a decision changes behaviour, its pack changes in the same PR". The ruling on #1446 (b) changes this behaviour, and leaving the step would turn C6.19 red on main.
  * P-270 is not touched: no main was merged into the branch.
  * One PR, one area holds: the change is limited to the step that QA-355's rule broke, and no product code moved.
* **The new instance is an honest M4 test.** Case B's offer says `problems: ["Keep the answer to 120 characters."], usable: false` for case A's 136-character stored country. That is the challenge's own "a length since shortened" example.
  * The step checks four things: `usable === false`, the value is the stored one, `STALE.length > 120`, and the reason text. So a failed set-up cannot pass quietly.
  * The step count is kept, so gate B's step list is unchanged.
* **It fails when the offer stops checking.** I changed `engine/runtime/earlier-facts.ts:161` to `const problems: string[] = []` and restarted. The pack went to 84/85, and only this M4 step failed.
* **The SQL stand-in is sound.**
  * The order (stamp the old row superseded, then insert the new row) meets `runtime_answer_append_only`: only `superseded_by_id` changes, once, from null, to another id. It also meets `uq_answer_current`, because the new row goes in after the old one stops being current. The deferred FK `client_canonical_answer_superseded_by_id_fkey` lets the stamp name a row that does not exist yet.
  * This is the product's own order (`case-changes.ts:66`, `case-documents.ts:581`).
  * `psql -c` runs it as one transaction. `execFileSync` throws on an error, so a failed write stops the pack loudly.
  * The new row copies `status`, `verified_by`, `source_json` and the party and subject. The DB after the run shows 3 rows: DECLARED, then VERIFIED by user-O (superseded), then the current 136-character VERIFIED row by user-O. `confirmation()` reads `status === "VERIFIED"`, so the value is still confirmed on case A.
  * Later steps are unaffected. `beforeA` (BR-3) is read after the stand-in. `UNTICKED` is still `COUNTRY`: offered, not usable, never ticked. On the merged state, main's new QA-338 steps on cases C, B2 and C2 are green.
* **Merged state: C6.19 86/86, exit 0, on a freshly loaded checkpoint.** Main has since added a step, so the builder's 85/85 is now 86.
* **P-319 / P-425:** the added lines contain no form number and no combination key. The quoted map note sits in a comment only, and the change is test code.

Issues:
* **m1 (Should, not blocking): the step no longer proves the check runs on case B's release rather than case A's.**
  * The test: I made the offer check against the earlier case's snapshot (`checkWith: r.es` passed into `offerFrom`). The pack stays **85/85 green**, because both releases refuse more than 120 characters.
  * Today, the fact that case B's release is used rests only on code reading: `offersOf` passes `snapshot = this.runtime.snapshotOf(c)`, case B's.
  * No honest instance exists on the checkpoint today. I probed all 63 person facts that both releases ask, with 25 values. The only fact that VV accepts and WP refuses is `person.current_residence_country`, and that refusal is itself a map-note artefact (see "Outside this diff").
  * Fix: once IMM 5710's current-residence label is corrected, add one step: case A's residence "IND" (valid on VV) is refused on case B. Until then, say this limit in the step's comment.
* **m2 (records): `screens/C6.19/concept.md:16` still gives the example "case A's passport country "IND" is not on the work permit's list".** That example is now known to be the bug. Fix: change it to the length example, in this PR or in the runtime lane's next C6.19 edit.

Outside this diff (for the tech lead / qa; not held against this PR):
* On With an LMIA, `person.current_residence_country` offers one choice labelled **"only option: Canada"** and refuses "Canada", "CAN" and "511" with "Choose one of: only option: Canada.". The source is IMM 5710's map note `code_list:imm5710.current_cor (only option: Canada=511)`: the note's lead-in is read as part of the label.
* I reproduced it through the API on a fresh With an LMIA case, and on `origin/main` too, so this PR did not cause it. It is QA-355's bug class in a form `namesNoValues` does not cover, and an officer cannot give an inside-Canada worker a valid answer.
* It belongs in a new qa item for the forms lane (the map label), probably Major.

Journey test: no screen or flow changed in this diff (test code only), so round 1's reviewer score stands at **9/10**. I wrote no new report.

Blockers: none. Majors: none. Minors: m1, m2 (and round 2's carried Minor).

Verdict: Approve
