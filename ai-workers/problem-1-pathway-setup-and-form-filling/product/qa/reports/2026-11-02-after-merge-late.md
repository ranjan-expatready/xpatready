# qa after-merge, late round — main 8893b4a2 / e6e3534c (2 Nov, ~23:30 UTC)

Asked by Lead 5: re-score C5.4 (#615), C11.13 and C11.14 (#602), C4.11 (#563), and #616, on current main, in one records PR. US$0, live AI off. A Sonnet helper did the C5.4 and C11.10 runs on 8893b4a2 (P-278); qa reran the rest on e6e3534c. #615 and #616 touched `review-queue.ts`, so nothing was carried over unrun.

## Verdict
**M2 stays 50/60: C5.4 → Works, C11.10 → Partial.** One Major, QA-176, was named as a fix row on Lead 5's request. It is not new with a merge: C11.14 has been red on it since 1 Nov.

| Row | Now | Evidence |
|---|---|---|
| C5.4 | **Works** (was Partial) | a person does it on screen: 17 numbers without a source shown and answered through the Source panel → held 0 → Submit → v2; non-authors see "View" only; `check_g1_source_register_browser.cjs` 60/60 |
| C11.10 | **Partial** (was Works) | author's badges and Needs you now agree; for the approver and the expert, Programs says "Needs you 0" against To review's 17 (#616 Question 0); QA-174 open |
| C11.13 | Partial | 14/15; only P-120's near reason at release is missing; P-266 met (4/4); Draft fields wired |
| C11.14 | Partial | 9/13. Load sample gives 560 field proposals, **all `one_round`** (no checker round), 50 Ready without one: **QA-176** |
| C4.11 | Partial | 14/23 on Visitor visa; step 5 lands no conditions (QA-162) |

## Lead 5's questions, plainly
* **Is Draft fields wired?** Yes: `GET`/`POST /api/library/forms/:code/draft-fields` and its screen (42/42, browser 14/14).
* **Does Load sample give proposals?** Yes, 560 field proposals on To review. But none has an independent checker round, so C11.14 stays Partial. The pack's AT-1 showing 0 is pack debt (it calls the older fixture, `/demo/load` with no body).
* **Fix row:** QA-176. Each replayed field-map proposal should carry its draft and checker rounds, with Ready only when both agree and the rules pass. That's G-CORE B3, or a saved checker round per field-map run (paid on the Go if none is saved). Then the pack's AT-1 loads the six.

## Bugs
New: **QA-176 (Gap · Major)**, QA-177 (Minor: the Source panel's prefilled words don't always state the number), QA-178 (Minor, timing: the header stays stale until a reload after release). Still open: QA-174, QA-162.

## Head check
#617 (C8.1 migration): Pass on 126b8070 (comment on the PR).

## Questions for the tech lead
1. C11.10: is the approver's "Needs you 0" on Programs against 17 on To review intended (#616 Question 0: P-180 against C2.6)? If yes, C11.10 is Works again.
2. C11.13: is P-120's near reason at release met anywhere (open since #405)? If yes, C11.13 is "Works, held part excluded".
