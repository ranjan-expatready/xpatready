# QA-144 slice 1, last block (IRM 0002): independent review of #891 at 32c7a0782

Reviewer: a fresh context that did not build this. 4 Nov 2026. US$0. I started no copy (the walk was run on the Mac) and ran no suite. I read the diff over #798 (`git diff origin/claude/runtime-qa144-configured-release HEAD`, merged as fe6b1239b), the CI record, and the four screenshots at 1440 px.

## Verdict (screen-review): Ship after fixes (Minors only). **Verdict: Approve 32c7a0782** (no open Blocker or Major)
* CI run 41813757809 on eb86988fe is green. The head 32c7a0782 adds only the walk's released branch and the screenshots (`git diff --stat eb86988fe 32c7a0782`). CI on the head (run 41816861934) was still running when I wrote this. The approval holds only if that run is green.

## What I checked
* **Screens' services only. Holds.** `api/src/demo.ts:430-440` uses the same route chain as the six:
  * `intake.sample` (the route `POST combinations/:id/attachments/sample`, `main.ts:107`);
  * `sources.read`;
  * `ai.plan(..., "REPLAY")`, which must offer `reuse_saved_output`;
  * `ai.launch` in REPLAY with an idempotency key and the plan's sha.
  * Rows 3–4 then decide the drafts through `sources.decide`/`apply`, and the release goes through `studio.submit`/`signoff`/`approve` (server `canRelease`).
  * The diff has no SQL write and no LIVE mode. `check_qa144_vv_release.ts:50` and `check_c10_1_configured` (R-143) both assert that no LIVE job ran and the ledger did not change.
* **The Approver's approval is still enforced.** A release made without it would fail:
  * on the strict branch (`check_qa144_vv_release.ts:45-46`), which needs `1|user-B|user-A`;
  * on `check_c10_1_configured.ts:73`, which needs every release approved by user-B through an APPROVED submission by user-A;
  * on BR-7 fail (`:60`), which requires that the author approved no library item. That check stays strict.
  * CI took the strict branch (released ["Visitors › Visitor visa"]).
* **The 4 "rounds differ" items decided by the loader.** These are acceptable for a Sample checkpoint, and the pattern is not new: the saved checker rounds for IMM 0008 DEP, IMM 5645 and IMM 5669 (`p2/runs/studio-fieldmap-check-*`) go through the same accept at `demo.ts:460`. Each item keeps both readings and the loader's note, so the record is honest. Row 4's words do not say it, though (m1).
* **Other suites that load the configured checkpoint** (grep for `configured`, `IRM 0002`, `irm0002`):
  * `check_c10_1_browser` (12/12 in CI) and `check_qa145_clean_clone` (8/8) are green.
  * Rows 9 and 11 change their words when the Visitor visa is released (`demo.ts:598-600`), and `check_c10_1_configured` still expects "waiting", which is correct.
  * `check_s7_load` and `check_d1_reset_to_six` load the six only (`loadSix`), so this change does not touch them.
  * `check_forms_s4_finder`, `check_forms_c1115_download_link`, `check_forms_p80_guard` and `check_irm_editions` use their own setups.
  * `acceptance/C9.1.test.ts:87` ("same release, same hash") now has a real Visitor visa release to guard. That makes the check stronger. Not run.
  * `acceptance/C10.1.test.ts:38` part A now finds a release. Not run (see "Could not check").
* **Graph (P-86).** I read `qa/GRAPH.md` but did not run `graph.mjs`, because running it rewrites GRAPH.md and this review may write only this file. C10.1 is named by 8 tests. The PR adds no page or route.

## Issues (all Minor, Should; none blocks)
* **m1. Row 4 does not say that the loader decided the AI disagreements** (`demo.ts:460`, `:470`).
  * IRM 0002 has 4 items, and IMM 0008 DEP, IMM 5645 and IMM 5669 have others. In each, the draft's reading is taken over the checker's under the generic note "as the saved AI answer proposed it". P-121 makes a disagreement a person's decision.
  * Fix: count the items with `agreement = 'differ'` and add a clause to row 4, for example "N where the two AI rounds differed, decided by the sample loader: check them on each form's page". Optionally give those items their own note.
* **m2. The fallback branches are now dead, and they hide a regression in the attach.**
  * `check_qa144_vv_release.ts:44-48`, `check_c10_1_configured.ts:85-88` and `qa/check_qa144_vv_walk.cjs:51-55` all choose "one IRM 0002 block" when the DB shows no IRM 0002 map or release.
  * If the attach or replay silently fails (`demo.ts:433` and `:436` only `log.push`), the release check and the walk still pass. Only `check_c10_1_configured.ts:61` (`jobs === 19`) catches it.
  * Fix: the done-when is met, so make all three assert the release unconditionally and drop the "until it lands" branch and comments (`check_qa144_vv_release.ts:39-41`, `:5`).
* **m3. The relaxed checks accept the pre-release state after a release.** `(DRAFT|PUBLISHED)` (`check_qa144_vv_release.ts:98, 104, 108`) and `APPROVED|RELEASED` (`:57`) both pass a release that left its lines DRAFT or its library items APPROVED.
  * Fix: once released, require `PUBLISHED` and `RELEASED` (key the pattern on `released`, as m2 makes it unconditional).
* **m4. A failed attach is silent on screen.** In the failure case of m2, row 3 still says "done · 18 saved". Only row 10's words name IRM 0002. Fix: put the `log.push` reasons at `demo.ts:433` and `:436` into row 3's `why` and mark the row partial.
* **m5. Words and state on the released combination** (`4-review-released-1440.png`, `2-forms-rules-1440.png`):
  * "Forms AI picked (2): confirm they apply before release" (`web/src/pages/review.tsx:65`) is still shown after release 1 went out with IMM 5257 and SCH1 unconfirmed.
  * The tabs say "Forms 15 to do" and "Documents 1 to do" next to "Live" and "0 problems to fix".
  * These exist on main too (round-1 D9), but the release now makes them visible. Fix: after a release, word the banner as "before the next release". The screens lane can file the badges.
* **m6. Idiom.** `keyOf0` (`demo.ts:414`) duplicates `keyOf` (`:475`): the combinations do not change between them, so reuse one map. The walk's header comment (`check_qa144_vv_walk.cjs:3`) is now one 200+ character line; wrap it as before.

## D1–D20 (1–5; this block only)
D1 5 the done-when is met: released at US$0 · D2 4 · D3 4 · D4 4 · D5 4 (the second load gives 409 and Reset is clean, per CI) · D6 4 (reasons on every decision) · D7 5 (REPLAY only, ledger unchanged) · D8 4 · D9 3 (m5) · D10 3 (round-1 m5 section names unchanged) · D11 3 (m1, m4) · D12 4 · D13 3 (axe allow-list carried from main; only 1440 px this round) · D14 4 · D15 3 (round-1 m6 unchanged) · D16 3 (m2, m3) · D17 simulated only · D18 4 · D19 5 (the Visitor visa is released as the ruling asked) · D20 simulated only.

## Journey test (reviewer role, from the screenshots and CI; the one score for this check)
Journey: on a blank copy, the author runs Demo › Load the configured checkpoint, then opens the Visitor visa's SQR, Forms, Preview, and Review and release. The walk passed 16/16 at 1440 px, axe ran on each page, and nothing scrolled sideways. A second load is refused with 409, and Reset leaves a blank workspace (`check_c10_1_configured`, CI).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Live, "Last released: version 1, in Release 1, by Approver", 0 problems to fix |
| Next step obvious | ½ | The next-step card points to the checklist page, while the badges say 15 + 1 to do (m5) |
| Plain words | ½ | Section names from round-1 m5. "Sample: … its setup has changed since they were loaded" is unclear |
| Feedback and state | ½ | The banner still asks to confirm forms "before release" after the release (m5) |
| Correct data | 1 | 19 replays, release `1\|user-B\|user-A`, BR-7 strict, US$0 (CI) |
| Error recovery | 1 | 409 on a second load, Reset clean (CI) |
| Accessibility and sizes | ½ | axe passes only with main's allow-list. 1440 px only; 1024/400 px and keyboard were not walked this round |
| Speed | ½ | Round-1 m6 unchanged; the load takes minutes |
| Visual quality | 1 | Team look holds; the Demo release chip is separate |
| Trust and sources | 1 | Demo release, Sample, AI picks marked with IRCC's words |

**Score 7.5/10: not a pass (needs 8 and no 0).** No criterion is 0. The block's own goal raised "task completed" from ½ to 1. The best fixes, in order: m5 (feedback, next step), then m1/m4 (words that tell the truth about the loader), then a 1024/400 px and keyboard walk of the released state.

## Could not check
* CI on the head 32c7a0782 (still running).
* `acceptance/C10.1.test.ts` and `C9.1.test.ts` against this head.
* Exactly which 4 IRM 0002 items "rounds differ" covers: no copy kept the data.
* A real screen reader, 200 % zoom, and an intended user's unaided walk (D17 and D20 stay with the founder).

**Verdict: Approve 32c7a0782** (on green CI for that head). Should-fix list: m2 and m3 (`check_qa144_vv_release.ts:44-48, 57, 98-108`; `check_qa144_vv_walk.cjs:51`; `check_c10_1_configured.ts:85`), m1 and m4 (`demo.ts:433, 436, 460, 470`), m5 (`review.tsx:65`), m6 (`demo.ts:414/475`).
