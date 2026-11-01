# Re-review: QA-119 (PR #216), C11.10 drift 5 updated for the checklist's next step (head f1b4278a)

**Reviewer.** I did not build this. **Scope:** what changed since my Approve on f8ded396 (`F1-setup/review-qa119.md`).
* b862041a: `tests/check_s5_slice2_browser.cjs:90-97`, the C11.10 drift 5 step.
* f1b4278a: a merge of origin/main (751cbc42).

**Sources:** P-157, P-161 (1), EXPERIENCE #5 [M] ("one next action per status"), concept v4 §5–§7.
**Environment:** worktree /home/user/wt-216. The web build is dated 08:23, after the merge commit (08:22). Own copy `rvw216` on :4447, fresh database for each run. No live AI (US$0).
**Screenshots:** I ran the checks from a scratch copy under /tmp, so the tracked slice2 PNGs were not overwritten.

## 1. Is the new expectation the right product behaviour? Yes
* **What changed in the old step.** It required a header button "Add n forms from the library" (the catalogue's step). QA-119 removes that header step on purpose: P-157 has one checklist drive every card and the header, and P-161 (1) gives the step order.
* **What Visitor visa shows now.** Its checklist's next item is step 1, Official pages, "Confirm the checklist page".
  * Library adds belong to step 3 (Forms), so the old expectation now contradicts the decisions.
  * The new step asserts three things:
    * the header reads `setup.next.item.text` from `GET /api/combinations/:id/summary`;
    * the header button is the page's only `[data-next-step]`;
    * no "Add n forms from the library" button exists.
  * That is EXPERIENCE #5 stated directly.
* **What is kept.** The part of the old intent that still holds is kept: the pending summary's count of forms addable from the library equals the rows' "Add from library" buttons.
* **Row buttons.** These are per-row actions, not the page's next step, and the approved QA-119 build already treated them that way.

Walked by hand on a fresh copy (author, user-A):
* Overview and Forms both read "Next step · Official pages · Confirm the checklist page". There is one `[data-next-step]`, the header shows in about 275 ms, and there are no page errors.
* Keyboard Tab reaches the header button, and its focus is visible (`/tmp/rvw216/shots/header-focus-1440.png`).
* Enter lands on Forms with focus on `pages:record` (Official pages).

The approver (user-B) gets "Waiting for the configuration author: Confirm the checklist page · See it on Forms", with no button (0 `[data-next-step]`). That is the same item the summary returns for user-B.

## 2. Is the check still strong? Yes, proven by mutation
I ran four mutants of the check on a fresh copy each. Each one changes the live DOM just before the drift-5 asserts. The unmutated check passes 62/62.

| Mutant | What it simulates | Result |
|---|---|---|
| m1 | Header button text swapped to "Add 1 form found" (header disagrees with the checklist) | 61/62. The QA-119 step FAILs: "… Add 1 form found \| Confirm the checklist page" |
| m2 | A second "Add 1 form from the library" button added inside the header | 61/62. The QA-119 step FAILs |
| m3 | One row's "Add from library" button removed (summary says 1, rows have 0) | 61/62. The summary/rows step FAILs |
| m4 | A second `[data-next-step]` element added in a pending row | 61/62. The QA-119 step FAILs (the only-next-step rule) |

**Fails closed.** If the summary's wording changes, `k` falls to 0 and `k > 0` fails. If `setup.next` is missing, `!!setupNext` fails.

## 3. Did the main merge break QA-119? No
* **QA-119 files unchanged by the merge.** `git diff f8ded396 f1b4278a` shows no change to:
  * `web/src/pages/combination.tsx`
  * `contracts/setup-checklist.ts`
  * `engine/setup-checklist.ts`
  * `web/src/components/setup-strip.tsx`
  * `web/src/pages/workspace/overview.tsx`
* **Code that did change.** The only product code that changed is in `api/src/fill-case.ts` and `web/src/runtime/forms.tsx`. In `fill-case.ts`, decision ids and a name were removed from user-facing messages. Neither file is on the header path.
* `check_qa119_next_step_browser.cjs`: 30 passed, 0 failed on f1b4278a (:4447, fresh).
* `check_s5_slice2_browser.cjs`: 62/62 on f1b4278a (:4447, fresh).
* `web` `tsc --noEmit`: exit 0.

## D1–D20 (this change only: a test and a merge)
* **D1:** 5. The expectation matches P-157/P-161 (1).
* **D3:** 5. The header is compared with the server's checklist.
* **D16:** 4. All four mutants are caught; there is one narrow gap (n1).
* **Unchanged from the f8ded396 review:** D2, D4–D15, D18 and D19 (no product code on this path changed).
* **D17 and D20:** simulated only.

## Journey score (reviewer, this check): 9.5/10, pass
Details are in `journey-test-reviewer-2026-11-01-qa119-drift5.md`.
* Full marks: task completed, next step obvious, plain words, feedback and state, correct data, accessibility and screen sizes, speed, visual quality, trust and sources.
* Error recovery: ½. Not re-walked this round, and Retry focus (m2 from the f8ded396 review) is still open.

## Issues
1. **n1, Minor, Should (test only): the drift-5 step's `[data-next-step]` count is page-wide** (`check_s5_slice2_browser.cjs:95`).
   * The waiting line also contains `item.text` ("Waiting for …: Confirm the checklist page").
   * So a header that wrongly showed the waiting line to the author, with one stray `[data-next-step]` elsewhere, would still pass. The QA-119 check covers the author/approver split, so this is narrow.
   * The step label ("Official pages") is also not compared with `setup.next.step`.
   * **Fix:** count `[data-header-next] [data-next-step]` === 1 as well, and assert that the header includes `STEP_LABEL[setupNext.step]`.
2. **Note for the builder (not a finding on this PR): stray changes in the worktree.**
   * The worktree shows modified tracked files written at 08:29 by the concurrent run-suites, not by this review:
     * `p2/runs/stub-pass/*.json`
     * `p2/screening/canary-digest.json`
     * `studio/evidence/ai-orchestration/check_ai_orchestration.json`
   * Do not commit them with this PR by accident.

Carried, still open from the f8ded396 review: m1 (focus on the "See it on …" link and Retry), m2 (Retry loses focus) and m3 (paired Find forms and View AI progress untested). None is Major.

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
* The full run-suites (the builder's run is in the screens slot).

**Verdict: Approve** on f1b4278a. There is no Blocker or Major. n1 is a Minor test-strength Should, and can be fixed in this PR or recorded.
