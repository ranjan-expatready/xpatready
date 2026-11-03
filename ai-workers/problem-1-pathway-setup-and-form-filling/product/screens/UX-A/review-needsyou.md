# Review: PR #637 (Needs you parity, QA-174), head 98403848

**Journey score: 9/10** (approver and expert walked Programs then To review in the browser test: same five combinations, chip 5 = To review; deducted 1 for no visual check of the new "Waiting for a content publisher" line).

## Checks
1. Done when: met. `check_uxa2_to_review_browser` run on :4447 (db xr_studio_rev_637): 56/56. user-B and user-C: Programs 5 = To review 5 on the six, same combinations; Programs page chip Retail 5 / Corporate 0 matches To review for both. `check_setup_checklist` 58/58, including the C11.10 lines. US$0, no :4400.
2. Other readers of actsOn/filledFor/acts:
   - `forViewer`: "Waiting for a content publisher" appears only for someone without the review duty. All three studio users hold review and runtime users never see this page, so the line is unreachable today and harmless.
   - Server: `official-pages.ts` uses mayAct only for confirm_pages kinds (unchanged). Proposal decisions still use `holds(actor,"review")` (`review-proposals.ts:131`). No permission change.
   - No double count: `review-queue.ts:27` LISTED_ELSEWHERE contains `review_proposals`, so To review shows proposals only as ai_proposals rows. `review_people` is not excluded, so it stays a setup row, now for review holders (was author only); the test's one-row-per-combination and parity steps pass.
3. Author (user-A holds author+review): unchanged; the six (user-A) still shows 5 and 1 setup row.
4. Words: "a content publisher" matches PRODUCT.md's role name; "Form facts, all people" is clear and `check_uxa1_counts_browser` covers QA-174.

## Findings
- None Blocker or Major.
- Minor: `contracts/setup-checklist.ts` now has two stacked doc comments on ACTS (the old one is left above the new); merge them.

Not checked: manual keyboard/zoom (no layout change).

**Verdict: Approve**
