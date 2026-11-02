# UX-A part 2 review: To review's "Needs you" with release blockers and next steps (commit 59fbccf1)

Reviewer agent (did not build it), 2 Nov 2026. Scope: `git diff f9a5880a 59fbccf1` only. Spec: BACKLOG row UX-A (P-273), finding 2 of `screens/UX-baseline-2026-11-02/findings.md`.

**How it was run.** The exact commit, from the detached worktree `/home/user/uxa2-rev`, using its own web build.
* `isolated.sh rev_uxa2 4446`: a fresh database, then `POST /api/demo/load` as user-A. Used for the walks.
* `isolated.sh rev_uxa2b 4447`: used for the builder's check.
* US$0: no live AI, no priced button. :4400 was never used.

The journey test (reviewer role) is in this file at the end, as the caller asked for one file.

## Verdict: Block

Two Majors, M1 and M2. Fix both with a fail test, then ask for a new review.

## What holds
* **Finding 2 is fixed in the baseline's own state.** I made the Visitor visa spouse and child filings unset, which gives the 3 errors of baseline screenshot 10. The author's Needs you then shows "3 problems block release (first: Filing for Spouse or partner (travelling): Filing not set)", and its link opens `/c/…/forms?focus=people:card`, where the filing is set.
* **The approver no longer gets a bare "Nothing waits for you"** when a release is blocked. The empty state says releases are blocked and offers "Show Waiting for others". The Waiting row reads "The configuration author fixes them".
* **The row's count matches the Review and release tab's "n to fix"**, both before and after an error is added.
* **No duplicates.** There is one setup row per combination. Steps that already have their own row are not repeated. `forms: []`, so the guided path is unchanged. A `?form=` filter reports `blocked: 0`.
* **Builder's check `check_uxa2_to_review_browser.cjs`: 20/20, twice.** I ran a copy with psql at `/usr/local/bin` and screenshots saved to scratch.
* **Graph (`graph.mjs`, no `--write`):** G1 0, G2 0. No gap names To review or `/review-queue`.
* **Cost:** `GET /review-queue` takes 18–36 ms warm. It reads the same cached catalogue rows that Programs reads (cache key `programs.ts:115`), and the nav polls every 15 s. I did not measure it at 100 combinations.
* **Server checks:** an unknown `x-actor` gets 401. Nothing is stored, because the rows are derived from the checklist, so no migration, race or duplicate risk.

## Blockers
None.

## Majors

**M1. Needs you lists steps that no screen lets the person do.**
* **Where:** `api/src/review-queue.ts:112` and `:128`.
* **What happens:** a combination's next step goes into Needs you whenever `forViewer(...).filled` is true. This includes `confirm_pages` and `choose_pages`.
* **Why that is wrong here:** the engine keeps those out of Needs you on purpose. `engine/setup-checklist.ts:52-56` says "the 'Before forms' block that offers them comes with slice C; until then they are not 'Needs you'" and "a mark nobody can clear is noise" (N8, F2 review M1, break M3).
* **This is still true at this commit:**
  * Before forms shows Official pages as read-only text (`web/src/components/before-forms.tsx:2`, `:34-37`).
  * The API has `POST …/official-pages/confirm`, but no web page calls it.
* **Evidence:**
  * The author's Needs you has 2 rows, both "Confirm the checklist page" (Visitor visa; With an LMIA).
  * Keyboard walk: Tab 23 times, then Enter. The page lands on Forms with focus on the line "Official pages: Proposed by the rules, not confirmed · Confirm the checklist page". That line has 0 buttons or links.
  * The content reviewer's Needs you has 6 rows (5 "Choose the checklist page" or "Confirm the checklist page", 1 "Confirm who can apply"). The nav badge shows 6.
  * Nobody can clear those rows in the product, so the badge never goes down. That is the opposite of the trust this row is meant to fix.
* **Fix:** put a next step in Needs you only when the person can act on it on a screen today, with the same rule as `REVIEWS`, plus the blocker rows. List other next steps elsewhere, for example under Waiting for others or a "Next steps" view. Add a fail test that the author's Needs you has no `confirm_pages` row while Before forms offers no Confirm.
* If you read the row's wording "each combination's next step" in Needs you as overriding P-180 and N8, write that in `screens/UX-A/challenge.md` for the founder. Do not settle it silently (AGENTS rule 2).

**M2. Two "Needs you" counts now disagree on the same screen.**
* **Evidence:** as the content reviewer on Immigration programs, the status chip says "Needs you 0" (P-180, from `forViewer().needsYou`). The menu beside it says "To review 6". As the author it is 0 against 2.
* Both say "Needs you" but count different things. Programs counts reviews and confirmations, as in P-180 ("with Needs you when they must act"). To review counts every next step.
* This is the kind of mismatch finding 1 (UX-A part 1) removed: "one computation and one fixed label per count".
* **Fix:** use one definition for both screens, from one function. The fix for M1 does this if the Programs mark and To review's Needs you then read the same rule. Add a test that asserts Programs' Needs you count equals the To review badge for user-A, user-B and user-C on the demo.

## Minors (fix, or list in the PR)
* **n1. One row shows two different counts.**
  * Example: "3 problems block release …" with the link "Fix 2 problems". With one injected error it is "2 problems" against "Fix 1 problem".
  * Cause: the "what" counts "Nothing to release yet" (`programs.ts:245`). The link text comes from the checklist's fix item, which does not count it (`review-queue.ts:123`).
  * Fix: make the label's number the row's number, or say "(and: nothing to release yet)".
* **n2. The approver's empty state overstates.**
  * It says "Nothing waits for you, but 5 combinations' releases are blocked. **Its** problems are fixed by someone else".
  * All 5 are only "Nothing to release yet": nobody has set them up. Their rows say "Waiting for the immigration expert: Choose the checklist page".
  * "Its" is wrong for a plural.
  * Cause: `blocked` counts the `:blocked` ids, including the empty-draft branch (`review-queue.ts:84`, `:116`). It agrees with the tab's "1 to fix", so this is wording only.
  * Fix: "are not set up yet" for empty drafts, or count only real errors in the title. Use "Their" for the plural.
* **n3. "1 problem blocks release (first: Nothing to release yet)"** on a combination nobody has started reads like a defect. Plainer: "Not set up yet: nothing to release".

## Notes, not findings (out of this row's scope)
* At 400 px the Next step link sits off-screen inside the table's own scroll. That is group C, finding 9.
* The Live "With an LMIA" still says "Next step · Official pages". That is finding 7, another UX-A part.

## D1–D20 (1–5; independent reviewer, browser and script)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Blockers are listed (finding 2 fixed), but the next steps break P-180/N8 (M1). |
| D2 Data integrity | 5 | Derived only; no writes. |
| D3 Reuse | 4 | Reads the one setup checklist and the cached rows. |
| D4 Rule integrity | 3 | A blocked row's count and its fix label disagree (n1). |
| D5 Stability | 4 | The row follows a fix and its revert, with no reload needed. |
| D6 Governance | Not yet evidenced | Not touched. |
| D7 AI trust | Not yet evidenced | Not touched. |
| D8 Orientation | 4 | Each row has its full path and a "Setup step" chip. |
| D9 Flow | 2 | The author's first two Needs you rows lead to a line with no control (M1). |
| D10 Language | 3 | "Its problems…", and "problem … Nothing to release yet" (n2, n3). |
| D11 Feedback and state | 4 | The approver sees a blocked state, not a bare empty one. |
| D12 Visual quality | 4 | Warn tone chip; same table pattern as the other rows. |
| D13 Accessibility | 5 | axe clean on 12 states (3 people × 1440/1024/400/200 % zoom); keyboard path works; no sideways page scroll. |
| D14 Team look | 4 | Unchanged components. |
| D15 Speed | 5 | Page ready in 150–310 ms; API 18–36 ms. |
| D16 Testability | 3 | Good fail cases, but none for "a Needs you row is actionable" or "the two Needs you counts are equal". |
| D17 First-use | Simulated only | — |
| D18 Provenance | 4 | The first blocker is named, with its place. |
| D19 Closure | 3 | Blocker to Fix works; next step to confirm does not. |
| D20 Pain and wow | Simulated only | — |

## Journey test (reviewer, 2 Nov 2026)
**Journeys.** Each was walked headless at 1440, 1024, 400 and 720 px at 200 %, with screenshots in scratch.
* J1 (author): see what blocks Visitor visa and fix it. Holds.
* J2 (author): take the next step from Needs you. Fails at the read-only pages line (M1).
* J3 (approver): empty Needs you while releases are blocked, then Show Waiting for others. Holds; words n2.
* J4 (content reviewer): 6 Needs you rows, none can be cleared (M1). Programs shows "Needs you 0" (M2).
* J5: keyboard only (J2, J3). Holds.
* J6, break: unknown actor gets 401. Setup rows under `?form=` and `?combination=` are scoped correctly.

**Data underneath.** Rows are derived, and the row count equals the tab's "to fix". The filing PATCH and its revert left one people list.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Blocker to Fix works; the next step is a dead end (M1). |
| Next step obvious | ½ | The link exists but leads to no control. |
| Plain words | ½ | n2, n3. |
| Feedback and state | 1 | Approver empty state; the row updates after fix and revert. |
| Correct data | ½ | "3 problems" against "Fix 2" (n1); the two Needs you counts differ (M2). |
| Error recovery | 1 | The blocked row leads to the fix; the approver is pointed to Waiting for others. |
| Accessibility and sizes | 1 | axe 0 on 12 states; keyboard path; no page scroll. |
| Speed | 1 | 150–310 ms. |
| Visual quality | 1 | Consistent with the board. |
| Trust and sources | ½ | A badge that never clears (M1, M2). |
| **Total** | **7.5 / 10** | **Below the pass mark of 8.** Fixing M1 and M2 raises task, next step, correct data and trust. |

**Could not test:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); 100 combinations; whether a `review_people` next step (not in `LISTED_ELSEWHERE`) repeats an existing proposals row, because no demo combination reaches that state; CI for the check, whose psql path is the Mac's.
