# UX-A part 2 re-review, round 3: no bare empty Needs you (commit 2e662e41)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff 2b6b82cf 2e662e41`, checked against my round 2 (`review-part2-r2.md`, which blocked on M3 and listed minors n4–n6). The row's criterion (BACKLOG UX-A, P-273, finding 2): To review "never says 'Nothing waits for you' while a combination has blocking errors".

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`, with its rebuilt web (17:07, `index-D4oILyvj.js`).
* `isolated.sh rev_uxa2 4446`: a fresh database, then `demo/load` as user-A. I used it for the walks.
* `isolated.sh rev_uxa2b 4447`: I ran the builder's check on it.
* US$0: no live AI and no priced button. :4400 was never used.

The journey test (reviewer role) is in this file.

## Verdict: Approve

M3 is fixed. n4 and n5 are fixed. There is no open Blocker or Major. Two new Minors (n7, n8) can go in the PR body.

## Round 2 findings
| Item | Status | Evidence (exact commit) |
|---|---|---|
| **M3**: bare empty Needs you beside a red "to fix" | **Fixed** | See the details below this table. |
| n4: empty-state words | Fixed | With nothing to show, the text is "Reviews, confirmations and the problems that block a release appear here when they are yours." |
| n5: blocked row names a step no screen offers | Fixed | The row reads "3 problems to fix before release (first: Filing for Spouse or partner (travelling): Filing not set)." It no longer names "Confirm the checklist page" (`NO_SCREEN_YET`, `review-queue.ts:30`, `:281`). |
| n6: badge lags in a second session | Open, still Minor | Not touched in this diff. It comes from the break report. |

**M3 details, on the demo as loaded.**
* The API returns `notSetUp: 5` for user-A, user-B and user-C.
* All three see "Nothing waits for you, but 5 combinations have nothing to release yet · Their next step is on Immigration programs: set up the forms it files", with an "Open Immigration programs" button.
* That 5 matches the five Review tabs that show "1 to fix" ("Nothing to release yet"), which I counted in round 2.
* The mixed case: I recreated the baseline's 3 Visitor visa errors by unsetting the spouse and child filings.
  * user-A's Needs you shows one row, with "Fix them".
  * user-B and user-C read "Nothing waits for you, but 1 combination has problems to fix before release".
  * Restoring the filings brings back `notSetUp: 5` and `blocked: 0`.

## Breaker round 2 fixes (also in this diff)
* **"Submit again" is Needs you only for the author** (`review-queue.ts:174`). That matches the server: `studio.ts:850` has `need(actor, "author")` on submit. The check's fail case passes for user-B and user-C.
* **A retired combination's open submission leaves To review** (`review-queue.ts:160-162`). I checked this in the code only and did not reproduce it.

## Checks
* **`check_uxa2_to_review_browser.cjs`: 47/47, run twice.** I used a copy with psql at `/usr/local/bin` and screenshots saved to scratch.
  * The builder reports 50/50. On this commit the file prints 47 steps, all PASS, so the number in the PR body should say 47.
  * It covers the following, for user-A, user-B and user-C:
    * Programs and To review agree on which combinations need each person, on the demo as loaded, blocked, put back, and on the six.
    * No Needs-you row offers a step that no screen offers (N8).
    * The M3 empty state.
* **My walk:** axe (WCAG 2.2 A/AA) is clean on 24 states: three people, at 1440, 1024 and 400 px and at 200 % zoom, both as loaded and blocked.
  * No sideways page scroll.
  * No console or page errors.
  * The page is ready in 150–356 ms.
* **Programs Needs-you chip against the menu badge:**

| State | user-A | user-B | user-C |
|---|---|---|---|
| As loaded | 0 / 0 | 0 / 0 | 0 / 0 |
| Blocked (3 Visitor visa errors) | 1 / 1 | 0 / 0 | 0 / 0 |

## Blockers
None.

## Majors
None.

## Minors (list in the PR)
* **n7: the empty-state sentence does not agree with itself, and it addresses the wrong person.**
  * The plural sentence reads "Their next step is on Immigration programs: set up the forms **it** files". For the plural it should be "they file".
  * user-B and user-C read the same instruction, but only the author may edit a draft (`studio.ts`, `need(actor, "author")`). For them, "set up by the configuration author" would be accurate.
  * Where: `web/src/pages/to-review.tsx:103`.
* **n8: the mixed state names only the blocked combinations.**
  * With 1 blocked and 4 not set up, user-B's title counts only the 1. The other 4 combinations still show a red "1 to fix" and go unmentioned.
  * This is not a bare "Nothing waits for you", so it is not a Major. Adding "· 4 have nothing to release yet" would close it.
  * Where: `to-review.tsx:100`.
* **n6** is carried over (see the table above).

## For the Lead (not findings of this diff)
* **The builder's open question on AI proposals rows.**
  * To review's Needs you lists AI proposals for anyone with the review duty. P-180's card gives proposals to the author only.
  * So user-B and user-C can see proposals on To review that the Programs chip does not count.
  * This rule predates this PR (forms lane C2.6/C2.12, #277). Its own checks depend on it, and the demo as loaded has no proposals.
  * Settle it as a row of its own. It does not block here.
* **Still to record from round 2:** the 30 Oct amendment ("a draft's own problem" is now Needs you for the author) goes in DECISIONS. The P-180 reading of "each combination's next step" goes in the PR body.

## D1–D20 (1–5; independent reviewer, browser and script; only those this diff moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Never bare beside a red "to fix", as loaded, blocked or put back; n8. |
| D10 Language | 4 | n7. |
| D11 Feedback and state | 4 | As-loaded and blocked empty states both say what waits and where. |
| D13 Accessibility | 5 | axe 0 on 24 states; no page scroll. |
| D16 Testability | 5 | As-loaded M3 fail case, three-person parity, N8 and the Submit-again rule are all tested. |

Other dimensions are as in rounds 1 and 2. D17 and D20 are simulated only.

## Journey test (reviewer, 2 Nov 2026)
**Journeys.** Each was walked headless at 1440, 1024 and 400 px and at 200 % zoom.

| Journey | Result |
|---|---|
| J1: each person, the demo as loaded | Holds. The M3 empty state shows, with Open Immigration programs. |
| J2: author fixes Visitor visa's blockers ("Fix them" → people card; keyboard path as in round 2) | Holds. |
| J3: approver and content reviewer, blocked case under Waiting for others | Holds. |
| J4: the Programs chip equals the To review badge | Holds in every state. |
| J5: break: wrong role on Submit again | Holds (by the check). |

**Data underneath.** The rows are derived from existing data. The filing change and its restore left one combination and one people list.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Blockers are listed for the author and shown to the others; empty drafts are counted. |
| Next step obvious | 1 | "Fix them", or "Open Immigration programs". |
| Plain words | ½ | n7. |
| Feedback and state | 1 | Every empty state names what waits. |
| Correct data | 1 | notSetUp 5 = five tabs; chip = badge; row = tab. |
| Error recovery | 1 | The approver is pointed to Waiting for others. |
| Accessibility and sizes | 1 | axe 0 on 24 states. |
| Speed | 1 | Under 360 ms. |
| Visual quality | 1 | Same EmptyState and table pattern. |
| Trust and sources | 1 | No dead-end rows; no bare empty state. |
| **Total** | **9.5 / 10** | **Pass.** |

**Could not test:**
* A real screen reader.
* An unaided walk by an intended user.
* 100 combinations.
* The retired-submission path, live.
* CI for the check, which uses the Mac's psql path.
