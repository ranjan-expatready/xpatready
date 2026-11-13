# BK-18 (QA-448) — re-review, round 6 (diff only: a test fix)

**Commit reviewed:** `0a67b2fde9bec8799eb3f5413462acf0d84520fc` · branch `claude/screens-true-record` · PR #1691 · reviewer agent (did not build it), 13 Nov 2026.
**Scope:** `git diff c2b940f5..0a67b2fd` only — one file, `prototype/studio/tests/check_c82_record_browser.ts` (+8 −2). Round 5 (`review-5.md`) approved `c2b940f5`; the rest of the PR is not re-reviewed, and no journey-test score is given (the brief: a diff-only re-review of a test fix).
**Evidence:** my own fresh isolated copies `rv_c82` on **:4436** (a fresh database each start), the product's own case page read with Playwright from my scratchpad, psql on the copy. Copy stopped at the end; the C8.2 screenshots the suite rewrites restored with `git checkout`.

## What changed
1. The wait after "Record the submission" was page-wide, `p.locator("[data-record]")`; it is now scoped to the submission panel, `panel().locator("[data-record]")`.
2. C8.2-7 keeps its three earlier assertions word for word and adds one: every `[data-reviewed]` line on the page (exactly 2) has `data-record="two-people"` and starts `Prepared by · Reviewed by: Case officer (Sample) · reviewed by Representative (Sample) (licence R000000), `.

## (1) A real fix, not a hidden defect
The builder's diagnosis holds against the code:
* BK-18's `RecordLine` (`web/src/runtime/readiness.tsx:210-218`) puts `data-record` on the readiness panel's "Prepared by · Reviewed by" line, rendered whenever `r.reviewed` is set (`:189`). The suite's `readyToFile(c.id, rep)` (`acceptance/lib/m3.ts:430`) has the representative review both filings **before** anything is recorded, so two `[data-record]` elements are on the page from step 2 onward. The old page-wide `.first().waitFor()` therefore returned at once after the dialog closed, and `panel().innerText()` could be read while both filings still said Ready to file: exactly the two checks CI shard (1) failed (C8.2-6 needs `data-status="submitted"` ×2 and the numbers; C8.2-7 needs the record text).
* The readiness panel (`ReadinessPanel`, `data-readiness`, mounted from `web/src/runtime/forms.tsx:57`) is not inside `[data-submission]` (`submission.tsx:84`). Inside the panel, `data-record` exists only on the recorded filing's `<dl>` (`submission.tsx:136`), which renders only when `f.record` exists. So the scoped wait waits for the submission's own record and nothing else; it cannot be satisfied early. On my copy after a run: page-wide `[data-record]` 2, in the panel 2, both the `<dl>`s.
* Nothing in the screen is weakened or hidden: no product file changed; the record still appears without a reload after "Record the submission"; the earlier failure was the check reading too early, not the screen showing the wrong thing. The two readiness lines carrying `data-record` is BK-18's intended marker (the two attributes mean the same thing in both places: "this is a record line"), not a defect.

## (2) What C8.2-6 and C8.2-7 still prove
* **C8.2-6 unchanged:** `Recorded · read-only`, two `[data-status="submitted"]` in the panel, `V300000201` and `V300000202` each present. Read-only group, each filing Submitted with its own number: still proved, and now proved at the right moment.
* **C8.2-7 is stronger, not weaker.** The submission record must still read `Prepared by · Reviewed by` followed directly by `Case officer · Representative` (not a bare "contains Reviewed by"; a Self-reviewed record would read `Case officer · Self-reviewed` or `Representative · Self-reviewed` and fail), plus `SAMPLE-RECEIPT-E` and `Sample Client E: 1111-2222`. The new part pins BK-18's readiness line exactly: `lines.length === 2` (one per filing), each `data-record="two-people"` (so neither `self-reviewed` nor `nobody-recorded`), and an anchored regex naming the preparer list as only `Case officer (Sample)` (a list that also named the representative would read `Case officer (Sample), Representative (Sample) · …` and fail), the reviewer with the licence number, and the time after the comma.

## (3) Is the expected wording the true record for this case?
Yes. In the suite's setup the case officer opens the case (`openCase` calls as `officer`, a weak act under `preparersOf`) and `fillEverything` enters the officer's facts and the on-behalf client facts as `officer` (real work); the client's own answers are the client's declaration and not staff work (P-242, `staff` filter). The representative's only act is the review in `readyToFile`. So `preparersOf` = `[officer]`, the reviewer is the representative, and `reviewRecordOf` (`engine/runtime/preparers.ts:62-67`) gives `self: false`, `preparedBy: [officer]` → "two-people". Server side, `recordedPeople` (`engine/runtime/submission-record.ts:70-71`) takes the first preparer who is not the reviewer → officer. Confirmed on the copy in psql: both `filing_record` rows `prepared_by = user-O`, `reviewed_by = user-R`, `recorded_by = user-O`; the rendered panel reads `Case officer · Representative` on both filings, `data-status` `submitted` ×2. Never Self-reviewed, as P-510 (4) and P-154 require for a second person's review.

## Runs (3 fresh copies, :4436, `rv_c82`)
| Run | Exit | Result |
|---|---|---|
| 1 | **0** | 40/40 passed |
| 2 | **0** | 40/40 passed (C8.2-6, C8.2-7 PASS) |
| 3 | **0** | 40/40 passed (C8.2-6, C8.2-7 PASS) |

## Findings
No Blocker, no Major, no Minor in this diff.
* **Observation (outside this diff, carried, not a fix for this PR):** the same two people are named in two forms on one page. The submission record reads `Case officer · Representative` (names from `RUNTIME_ACTORS`, `api/src/submission-record.ts:20`, no licence or time), while BK-18's readiness line reads `Case officer (Sample) · reviewed by Representative (Sample) (licence R000000), <time>` (names from the case team and firm). Both are true and agree on who did what; `submission.tsx` is untouched by BK-18. Worth one line to the lead if the record's wording is ever unified.
* **Note:** the readiness lines are read without their own wait; that is safe because they are on the page from step 2 (before recording) and React Query keeps them during the refetch, and the three runs agree.

**Verdict: Approve** — for head `0a67b2fde9bec8799eb3f5413462acf0d84520fc`.
