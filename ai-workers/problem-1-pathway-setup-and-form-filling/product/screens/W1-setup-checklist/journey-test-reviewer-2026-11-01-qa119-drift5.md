# Journey test (reviewer), QA-119 drift 5 re-check: f1b4278a, 1 Nov 2026

**Copy:** `rvw216` on :4447, a fresh database for each run, with the sample loaded through `/api/demo/load` (the same setup as the suite).
**AI:** none (US$0).
**Script:** `/tmp/rvw216/a/p/studio/tests/walk.cjs`, kept outside the repo.
**Screenshots:** `/tmp/rvw216/shots/`.

## Journeys
1. **Main path. The configuration author (user-A) opens Visitor visa and wants to know the one thing to do next.**
   * Overview: "Next step · Official pages · Confirm the checklist page".
   * Forms: the same words.
   * In both, this is the page's only `[data-next-step]`, and it matches the summary's `setup.next`.
   * The header shows in 277 ms (Overview) and 271 ms (Forms).
2. **Keyboard only. The same author, using no mouse.**
   * Tab reaches the header button, and its focus ring is visible (`header-focus-1440.png`).
   * Enter stays on `/c/<id>/forms` and focuses `pages:record` ("Official pages: Proposed by the rules, not confirmed").
3. **Wrong role. The approver (user-B) opens the same page.**
   * The header reads "Waiting for the configuration author: Confirm the checklist page · See it on Forms".
   * There is no button (0 `[data-next-step]`).
   * The summary returns the same item for user-B.
4. **Screen sizes.**
   * At 400, 1024 and 1440 px the header has no sideways scroll.
   * axe (WCAG 2.2 A/AA) on the header: 0 violations on Overview and on Forms.
5. **Data.**
   * The suite's drift-5 steps passed 62/62.
   * Four DOM mutants were each caught by exactly one step (see `review-qa119-drift5.md` §2).
   * `check_qa119_next_step_browser`: 30/30.
6. **Not re-walked this round.** Error recovery (Retry on a failed summary) and reload/back. Both are unchanged code since the f8ded396 walk.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The header button lands on Official pages, focused |
| Next step obvious | 1 | One next step, the same on Overview and Forms |
| Plain words | 1 | "Confirm the checklist page"; the waiting line names the role |
| Feedback and state | 1 | Waiting line for the approver; the step is named |
| Correct data | 1 | Header = `setup.next` for user-A and user-B |
| Error recovery | ½ | Not re-walked; Retry focus m2 still open |
| Accessibility and screen sizes | 1 | axe 0; no sideways scroll at 400/1024/1440; keyboard path works |
| Speed | 1 | Header in about 275 ms |
| Visual quality | 1 | Team Button; no clipping at 400 px |
| Trust and sources | 1 | No AI step here; the AI mark logic is unchanged |

**9.5/10, pass** (8 or more, no criterion at 0).

## Could not test
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
