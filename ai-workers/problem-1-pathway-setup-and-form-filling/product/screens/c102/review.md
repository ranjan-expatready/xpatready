# C10.2 phase 1, the finished story: review (reviewer, 8 Nov 2026)

**Reviewed:** commit 3e595b0b0 (PR #1330) against `origin/main` (`git diff origin/main...3e595b0b0`). The app was run from a `git archive` extract of that exact commit, because the builder shares this clone and HEAD moved to 2f024e676 during the review, with uncommitted work on `finished-story.ts`. **This verdict covers 3e595b0b0 only.** 2f024e676 and the later work (a Paper line, a group split, DEMO.md moved to a proposal) need their own diff review.
**Judged against:** the tech lead's brief, DEMO.md's new section (at this commit), WAY-OF-WORKING, STANDARDS, EXPERIENCE, AGENTS rule 4 and `acceptance/C10.2.test.ts`. There is no concept file (it is a demo route). Journey test: `journey-test-reviewer-2026-11-08.md`, **8.5/10, pass**.

## Re-run evidence
* Pack, on the clean extract at :4435: **12/12, 2 PENDING (6b, 6c), exit 0**. The same result on the shared tree.
* `tests/check_features_registry.ts`: 27/27. `check_c10_1_configured.ts` was not re-run: steps 125 and 200 return at once unless `ctx.story === "finished"`, and the load path is otherwise unchanged.
* The walk at 1440, 1024, 400 px and 200 %; the keyboard path; axe with 0 violations; 0 console errors for the author.

## The points the brief asked to judge hard
* **Writes only through routes: met.** `finished-story.ts` calls only `/api/...` on 127.0.0.1:STUDIO_PORT, with `x-actor` set to the person who acts. Its port comes from the same expression `main.ts:224` listens on. `125-thin-case.ts` and `200-finished-story.ts` write nothing directly; `ctx.row` lives in memory. In `demo.ts` the only direct write is the load's own audit line, as the configured checkpoint already does. The data confirms this: the officer passed only `missing_document` warnings (4); 4 filing records exist, reviewed by the representative (user-R); the client answered and re-confirmed as user-P.
* **Claim (`this.loading`): correct.** It is checked and set before any await (`demo.ts:94-95`). It is released on the 400/count path (`:100`) and in `.finally` after `runStory`, and `runStory` catches everything. The live walk gave 409 for a second start, for Reset and for Reset to the six. **Gap:** no test (see M1). Also, a route call has no timeout (`finished-story.ts:42-56`), so a hung call would hold the claim until restart (m4).
* **RESET: correct and in line with Reset and Reset to the six** (EXPERIENCE §2.8, in-page confirmation). A demo with content and no `RESET`, or lower-case `reset`, gets 400 with words, and nothing is removed. **No test fails if it is removed** (M1).
* **Status fields: sound.** `checkpoint` is read from the newest load audit line (Reset deletes those lines). `story` is in memory: it reads idle after a restart, and the brief allows this for a demo. Reading status as the author is needed: `GET /demo/status` already sits behind the configuration read guard (`core.ts:85-96`), so anonymous reads get 401.
* **The pack amendments are honest and do not lower the bar.**
  * Checks 3 and 10 read the status as the author, which the existing guard requires.
  * Check 5: "submitted" with 4 `filing_record` rows. Recording refuses any filing that is not Ready to file (`submission.ts:131`), so this check is at least as strict as before. All four are recorded, which is BR-11 group recording, and that differs from the brief's word "one filing".
  * Check 6: IMM 5257 Online matches release 2 as configured (C10.1 R9: IMM 5257 Online, IMM 5645 instead of IMM 5707).
  * 6c is a real check wherever the validated files exist, as C10.1 R12c does.
  * 6b names an open Major (QA-165) but also an unlogged cause (m2).
  * Check 9 counts batches whose mode is not REPLAY, stricter than C10.1's `LIVE` (the old before/after count could never pass, because the load empties `ai_batch`).
  * Check 10 now compares the stages of both loads, which is stronger.
* **Web: met with Minors.** The tooltip opens on hover and on keyboard focus. The dialog gives the RESET field only when the demo has content, keeps Load disabled until RESET is typed exactly, shows the running state, cannot be closed while running, and links to both cases. App.tsx adds 3 lines. The result is lost after a reload (m1).

## D1–D20 (1–5)
| D | Score | Evidence | D | Score | Evidence |
|---|---|---|---|---|---|
| D1 | 4 | The brief's order is met. One deviation: BR-11 records the whole group | D11 | 3 | Running state shown; result lost on reload (m1) |
| D2 | 4 | Claim and RESET hold live; no duplicate cases after two loads | D12 | 4 | Team dialog, table, pills (04b, b03) |
| D3 | n/a | No library change | D13 | 5 | axe 0; keyboard; 1024/400/200 % with no sideways scroll |
| D4 | n/a | No rule change | D14 | 4 | Team components; DemoControls pattern |
| D5 | 4 | 409s and 400; Reset to the six 201 after the story; hung route call (m4) | D15 | 3 | Job 227–328 s; dialog under 1 s |
| D6 | 4 | Audit line per load and per action, with the right actors | D16 | 3 | Pack 12/12, run by me; the new refusals are untested (M1) |
| D7 | 5 | US$0; replay only; nothing passed as AI | D17 | – | Simulated only |
| D8 | 4 | Dialog title and steps; links to both cases | D18 | 4 | Each stage says who did it and why it waits |
| D9 | 4 | Continue, then open the case | D19 | 4 | Configure through to recorded submission, with honest holds |
| D10 | 3 | Field key and codes on the result (m3) | D20 | – | Simulated only |

## BIC scorecard (EXPERIENCE §6)
This PR adds no case screen. It drives the existing case routes, and the case pages are unchanged. So BIC-01 to BIC-10, BIC-12, BIC-15, BIC-16 and BIC-17 are **N/A**.
* BIC-11 **Met**: one primary button per state ("Load the finished story", "Continue").
* BIC-13 **Met**: the refusals say what happened and how to fix it ("Type RESET to confirm").
* BIC-14 **Partly**: the menu tooltip is met, but the Done, Partly and Waiting pills have none (m5, Should).
* BIC-18 **Met**: running and failed states are drawn.
* BIC-19 **Met**: one heading and one primary button per panel.
* BIC-20 **Met**: the journey's keyboard path at 1024 px and 200 %.

## Graph (P-86)
`graph.mjs`: G1 0, G2 0. No gap names this route or this dialog. The new route is exercised by the pack (C10.2-1, -2, -10a).

## Issues
**Major**
* **M1 (Must; STANDARDS §3.10 and §7 [M], "a rule's test fails when the rule is removed").** The two refusals this PR adds have no failing test.
  * The confirmation: `demo.ts:99`.
  * The one-at-a-time claim: `demo.ts:94`.
  * Removing either leaves the pack green, because 10a sends RESET and nothing starts twice. Reset to the six tests both (`tests/check_d1_reset_to_six.ts:5`, `:64`).
  * Fix: on the loaded demo, POST `{}` and `{"confirm":"reset"}` must give 400 with "Type RESET", and nothing may be removed (count the combinations and cases). While the job runs, a second POST and `/demo/reset` must give 409.

**Minor (Should)**
* m1: `demo-finished-story.tsx:30`. The result appears only in the tab that pressed Load (`started`). After a reload, or in another tab, the dialog offers to load again with RESET, even though `status.story` holds the result. Show the last done or failed result. Also, `demo.ts:104` says "Demo › status shows when it is done", and no such menu item exists.
* m2: `acceptance/C10.2.test.ts:44` and `finished-story.ts:68`. 6b blames QA-165 (1), but also "release 2 never asks the visit contact", which has no bug row. Once QA-165 closes, 6b stays PENDING with no owner. Name it in the PR so qa can log it.
* m3: `finished-story.ts:68`. The field key `case.visit_contact_*`, the QA and C codes, and "Release 1 to Release 6 (release 2)" appear on the result (EXPERIENCE §5). The founder reads these codes, but the key should be words.
* m4: `finished-story.ts:42-56`. The route calls have no timeout. A hung call would keep `loading` set, and every load and reset would get 409 until a restart. Add a timeout that stops the stage.
* m5: `demo-finished-story.tsx:68`. The status pills have no tooltip (EXPERIENCE §2.10).
* m6: `finished-story.ts:230`. `p.groups[0]` with no group throws a TypeError, not a `Stop`. The whole load would then read "failed" instead of the record stage reading waiting.

## Could not check
* The Mac path with the validated files (6c and the R12c read-back).
* A real screen reader, and an intended user's unaided walk (D17, D20).
* `check_c10_1_configured.ts` (not re-run; reasoning above).
* DEMO.md ownership: the builder's next commit treats DEMO.md as the tech lead's file. That is not judged here.

**Verdict: Block**
Fix list:
1. **M1:** add failing tests for the RESET refusal (`demo.ts:99`) and the one-at-a-time claim (`demo.ts:94`), the second start and Reset during a run, in the C10.2 pack or a `tests/check_c102_*.ts`.

The Minors m1–m6 are fixed, or listed with a follow-up row. Everything else the brief asked for is met.

## Round 2: diff-only re-review of a1a3c575f (`git diff 3e595b0b0..a1a3c575f`)
**Scope:** the diff only. The tech lead's rulings (the Paper line, the split, pack lines 5b, 6b, 6c, 6d, check 6 by channel, DEMO.md as on main) were judged as code, not as decisions.
**How it was run:** from a `git archive` extract of a1a3c575f (the shared clone's HEAD had moved on to 2b01edb25), on :4435, started and stopped in one command. The run was one story probe, then `tests/check_c102_finished_story_refusals.ts` on the same copy.
* The refusal check gave **19/20**. The one FAIL is its setup line ("Load sample" 409), and that is my harness: my probe had already loaded the demo. Every rule line passed.
* I did not re-run the pack. The coordinator is running it on :4432.

**Round 1 findings**
* **M1, closed.** The new check has a pass and a fail for each rule. Spot-check: dropping `demo.ts:99` turns the four 400 lines red; dropping `demo.ts:94` turns the 409 lines red. It also covers 403 for five people who are not the author, and the claim being released after the run.
* **m1, closed.** The last result shows in any tab and after a reload, read from `status.story` with `checkpoint`. "Load again…" was added, and the dialog closes while the job runs, which is safe because the job is on the server.
* **m2, closed.** The visit contact is said in words and named as qa's own row.
* **m3, mostly closed.** There is no field key now. QA and C codes remain, which is acceptable for demo chrome.
* **m4, closed.** Every route call has a 120 s timeout; uploads use `AbortSignal.timeout`.
* **m6, closed.** The record stage looks for a group whose filings are all Ready, and stops in words if there is none.
* **m5, Partly.** The pills use a native `title`: it shows on hover, but not on keyboard focus (EXPERIENCE §2.10, BIC-14), at `demo-finished-story.tsx:75`. It stays a Should.

**New code**
* The Paper stage and the split go through the product's own routes: `PATCH /items/:id/channel` with a reason, then `POST /groups/:gid/split` with a reason.
* The ready stage never passes a block (P-315). It holds that filing and says why.
* The record stage reads Partly and names the filing left. The probe showed record Partly ("Not recorded yet: Child 18 or over… (NOT STARTED)"), ready 3 of 4, and paper Partly.
* Pack check 5 asserts that the Paper filing has a `barcode_not_validated` block and that each recorded filing was Ready before the recording.
* Break-M2 is closed by the record stage reading Done only when every filing is recorded.

**Round 2 findings**
* **R2-M1 (Major; brief "never faking it", same class as break-M1).** At `finished-story.ts:157`, the facts stage now says "99 by the case officer for another adult, **each** marked for the client to re-confirm (C6.18)". The same result then says "6 re-confirmed by the client", and the check found 0 still awaiting.
  * The engine marks only background facts for the client (`engine/runtime/background.ts:62-65`, `awaitsClient`), so 93 of the 99 were never marked. The claim is false in the data.
  * The check's break-M1 line (`tests/check_c102_finished_story_refusals.ts:57`) passes it, because it compares no counts.
  * Fix: say what happened, for example "99 by the case officer for another adult; the 6 background answers among them re-confirmed by the client (C6.18)". Count the answers that came back `awaits_client` rather than asserting "each". Make the check assert that the number claimed as marked equals the number re-confirmed.
* **R2-m1 (Should).** `screens/c102/DEMO-section-proposal.md` (items 3, 7, 8 and "does not show yet") still describes round 1: "on another adult's behalf with a reason", "all four filings Ready to file" and "recorded for the family's group". It has no Paper line and no split. Bring it up to date before the tech lead pastes it into DEMO.md.
* **R2-m2 (Should).** Row 14 can never read Done while the Paper stage exists, because the Paper stage is always `partial` (`200-finished-story.ts:21`). That is honest today, but the Paper stage should read Done once its validated copy is read back.

**Verdict for a1a3c575f: Block**
Fix list:
1. **R2-M1:** `api/src/finished-story.ts:157` must claim only the re-confirmations that happened (the count of marked answers, not "each"), and `tests/check_c102_finished_story_refusals.ts:57` must assert that the claim matches the data.

R2-m1, R2-m2 and m5 are Shoulds. Everything else in the diff is met.
