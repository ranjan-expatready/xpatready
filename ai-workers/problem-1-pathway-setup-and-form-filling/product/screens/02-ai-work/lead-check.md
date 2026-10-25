# Screen 02 — Lead checks

## LEAD-CHECK and MERGE (25 Oct, Lead on the Mac) — **merged**
How checked: screens head e4acc96 (app code aa43c46). Read `review-2.md`, `break-report-2.md`, `journey-test-reviewer-2026-10-25-r2.md`, the diff against `main` and the three conflict files of the F2 sync (`demo.ts`, `main.ts`, `App.tsx`: a clean union, every extension line kept). Spot-walked To review (Needs you · Waiting for others · Running · All) and the returned field's "Correct it and send it again" from the reviewer's screenshots.
* **The first score was refused by the Lead:** it covered 6 of the 10 `journey-test` criteria on a different scale, with no journey report. The re-score to the rubric is **9.5/10** (task completed ½: the held-PDF journey was not walked live; every other criterion 1). All four dead ends from round 1 are gone; the breaker found 0 Blocker and 0 Major.
* **The five re-check items, SC-2 and review Musts 1–9** are verified on this head, each with its test (review-2 "earlier findings"). SC-2 was found unfixed at CHECK and fixed by the reviewing session (a one-line label), recorded in review-2.
* **Other lanes' test patches** (the blind ACCEPT carries a reason; Must 3) are as granted in `other-lanes-tests-patch.md`. Suites green on the lane copy, including all F2 suites; CI runs on the Lead PR.
* **Lead fix in the merge:** the lane's suite runs overwrote other lanes' tracked by-products (the F2 and R1 screenshots, forms evidence JSON). They are restored to main's version in the Lead PR, and an accidental fixture deletion was restored by the lane itself (aa43c46, no diff left).
* **Minors routed:** break-report-2 (a) Chromium does not change a closed select on ArrowDown, so two break-K1 checks are environmental; (b) the scout check calls a route that does not exist and a fixed id → scout lane; (c) a product-approved edition is refused for comparison in plain words (as designed, Must 7).
* Next: runtime merges after this; `/qa after-merge` covers F2 and Screen 02; Screen 04 slice 1.


## EARLY-LOOK of slice 1 (25 Oct, cloud Lead, P-89) — **Result: GO, continue to FINISH**
How checked: screens branch commit c30d67c. Build notes "Slice 1". Screenshots in `screenshots/slice1/` (8 states at 1024 and 1440 px) set beside board view 1 of `design/draft-ai-work.html`, rendered at 1440 px.
* **Matches the board:** To review is first under Configure with its count. The page has a one-line description, the views Needs you · Waiting for others · Running · All with counts, a Kind filter and search. The columns are Item (kind chip, name, who and when) · What and why · Status · AI cost · Next step, and the rows read in plain words. The AI work log shows names, not ids.
* **Better than the board:** the proposals count is the same number as on the Programs row (a test checks it). Submitted combinations go through the same gate as Release. A step with no page yet says "(not built yet)" with a tooltip instead of a dead link.
* **Differences, all accepted:**
  * Capture, merge and screen-map steps are "(not built yet)". Board views 5, 6, 8 and 9 had no slice: the build discovery is accepted, and they go into slice 2.
  * Merge rows show field keys. Names come with slice 2's field name and group (Screen 04 challenge M1).
  * There are no "New shared field" or "New edition" rows on today's data, and no Parts column. Both arrive with slice 2's `LibraryChange` and `detail.a4.parts`.
* **Capability or scaffolding (P-33):** the queue, gate, counts, focus fix and stale-sample note are capabilities. The sample load and the one replayed AI answer are scaffolding.
* **Evidence read, not re-scored:** `check_screen02_slice1` passed, all 22 suites passed on the lane copy, axe was clean on 7 states, there was no sideways scroll at 1024 px, the first view took 224 ms, and AI cost US$0. CI for the branch head is still running; its result is read at CHECK (P-85).
* **QA-41 and QA-42** are fixed with fail-before checks. qa retests them at the next `/qa after-merge` and closes them in `qa/BUGS.md`.
**Next:** FINISH, which is slice 2 (with board views 5, 6, 8 and 9) and slice 3, then CHECK.
