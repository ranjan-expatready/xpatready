# UX-A part 2 re-review, round 2: one Needs-you rule (commit 2b6b82cf)

Reviewer agent (did not build it), 2 Nov 2026. Scope: `git diff 59fbccf1 2b6b82cf`, checked against my round 1 (`review-part2.md`: Block on M1 and M2; Minors n1–n3) and the row's criterion: To review "never says 'Nothing waits for you' while a combination has blocking errors" (BACKLOG UX-A, P-273, finding 2).

**How it was run.** The exact commit, from the detached worktree `/home/user/uxa2-rev`, with its rebuilt web (16:49).
* `isolated.sh rev_uxa2 4446`: fresh database, `POST /api/demo/load` as user-A. Used for the walks.
* `isolated.sh rev_uxa2b 4447`: used for the builder's check.
* US$0: no live AI, no priced button. :4400 was never used.

The journey test (reviewer role) is in this file.

## Verdict: Block

M1 and M2 are fixed. One new Major, M3: on the demo as loaded, every person reads a bare "Nothing waits for you" while five combinations each show "1 error (block submission)". Fix M3 with a fail test, then ask for a new review.

## Round 1 findings
| Item | Status | Evidence (exact commit) |
|---|---|---|
| M1 steps no screen offers | **Fixed** | No `confirm_pages`, `choose_pages` or `confirm_people` row for anyone. Fresh demo: user-A, user-B and user-C each have Needs you 0. `needsYouItems` uses `REVIEWS` only (`engine/setup-checklist.ts:59-65`). |
| M2 two Needs-you counts | **Fixed** | Programs chip against menu badge, on the fresh demo: 0/0 for all three people. With the 3 Visitor visa errors: user-A 1/1, user-B 0/0, user-C 0/0. The builder's check asserts this for all three people. |
| n1 two counts in one row | Fixed | "3 problems to fix before release … · Fix them". |
| n2 overstated empty state | Fixed in words | "Nothing waits for you, but 1 combination has problems to fix before release · Their problems are fixed by the configuration author". But empty drafts were removed from the list altogether, which is M3. |
| n3 "Nothing to release yet" as a problem | Fixed | The wording no longer appears on To review. |

## What holds
* **The baseline's state works for every person.** I unset the Visitor visa spouse and child filings, which gives the 3 errors of baseline screenshot 10.
  * The author's Needs you shows one row: "Temporary residence › Visitors › Visitor visa · 3 problems to fix before release (first: Filing for Spouse or partner (travelling): Filing not set)".
  * Keyboard only: Tab 23 times, then Enter on "Fix them". It lands on Forms with focus on the people card, where "Show and edit" sets the filing.
  * user-B and user-C see it under Waiting for others with "The configuration author fixes them".
  * After the filing is restored, the row clears for all three people. Visitor visa still has one combination.
* **Builder's check `check_uxa2_to_review_browser.cjs`: 37/37, twice.** I ran a copy with psql at `/usr/local/bin` and screenshots saved to scratch.
* **`check_setup_checklist.ts` (engine): 51/51.** The new UX-A2 case fails if `fix_problems` is taken out of `REVIEWS`.
* **Break fixes.**
  * The catalogue now validates with `acceptsOf` (`programs.ts:146`), as the Review tab does.
  * Setup rows carry the Pathway in their title, so search finds them.
* **Accessibility and sizes.** axe (WCAG 2.2 A/AA) is clean on 24 states: three people × 1440/1024/400 px/200 % zoom, on the fresh demo and in the blocked state. No sideways page scroll anywhere. No console or page errors.
* **Speed.** To review is ready in 141–340 ms.

## Blockers
None.

## Majors

**M3. On the demo as loaded, To review says "Nothing waits for you" while five combinations have a blocking error.**
* **Evidence:**
  * After `demo/load`, five combinations (Visitor visa, Super visa, Study permit, Applicant outside Canada, High-wage position) each show "Review and release 1 to fix" and "1 error (block submission)": "Nothing to release yet …" (scratch `r2/shots/fresh-vv-review-tab.png`).
  * To review gives user-A, user-B and user-C a bare "Nothing waits for you", with Needs you 0, Waiting 0, All 0 and `blocked` 0.
  * user-A is the person who must act: setting up the forms clears that error.
  * This is the baseline's complaint again (screenshot 15 against 10), on the screen the founder's demo opens on. It breaks the row's own criterion.
* **Cause:** a row exists only when `own.length || fixable` (`api/src/review-queue.ts:270`). An empty draft's only error opens no `fix_problems` item, so it gets no row and does not count in `blocked`.
* **This is not a request to put building steps in Needs you.** P-180 and N8 rightly keep them out.
* **Fix:** let the empty state count these combinations, for example "Nothing waits for you, but 5 combinations have nothing to release yet: their next step is on Immigration programs", with the existing "Open Immigration programs" button. Or list them under Waiting for others or All. Either way, the count must match the Review tab's "to fix".
* **Fail test:** on a fresh `demo/load`, the Needs you empty state is never a bare "Nothing waits for you" for user-A, user-B or user-C while any combination's Review tab has a red "to fix".
* My round-1 n2 asked only for new words for these combinations, not for them to drop out.

## Minors (fix, or list in the PR)
* **n4.** The author's empty-state text still says "its next steps, AI draft, new editions and approvals appear here" (`web/src/pages/to-review.tsx:100`). Next steps no longer appear on To review.
* **n5.** A blocked row's text still names "Next step · Official pages: Confirm the checklist page" (`review-queue.ts:272-273`). That step has no control on any screen (N8). Leave it out of the row's text, or say it waits for its screen.
* **n6 (carried from the break report, m3).** The menu badge can lag the list in a second session until the 15 s poll (`App.tsx:39`).

## For the record (not findings; the Lead and the founder decide)
* **The 30 Oct rule is amended.** `needsYouItems` changes the 30 Oct rule ("never a draft's own problem") for every surface, so the Programs chip and card now count a draft's blockers for the author. It follows the row's wording, but it changes a founder rule: record it in DECISIONS.
* **The row's "each combination's next step" is read the P-180 way.** Building next steps are no longer on To review at all. Put that reading in the PR body so the founder can confirm it (AGENTS rule 2).

## D1–D20 (1–5; independent reviewer, browser and script; only those this diff moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Blocked case met; demo-as-loaded case not met (M3). |
| D4 Rule integrity | 4 | One rule for both screens; row count equals the tab's. |
| D9 Flow | 4 | "Fix them" lands on the people card. |
| D10 Language | 4 | n4. |
| D11 Feedback and state | 3 | Bare empty state beside a red "1 to fix" (M3). |
| D13 Accessibility | 5 | axe 0 on 24 states; keyboard path works; no page scroll. |
| D15 Speed | 5 | 141–340 ms. |
| D16 Testability | 4 | The parity and rule-removal tests work; there is no test of the as-loaded state (M3). |

Other dimensions are as in round 1. D17 and D20 are simulated only.

## Journey test (reviewer, 2 Nov 2026)
**Journeys.** Each was walked headless at 1440, 1024 and 400 px and at 200 % zoom.
* J1 (author): fix what blocks Visitor visa. Holds, including keyboard only.
* J2 (approver, content reviewer): blocked release under Waiting for others. Holds.
* J3 (each person): the demo as loaded. Fails, M3.
* J4: Programs chip equals the To review badge for each person, in both states. Holds.
* J5, break: an unknown actor gets 401 (round 1); there are no new routes.

**Data underneath.** The rows are derived. The filing change and its restore left one combination and one people list.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Blocked case yes; as loaded, the blockers are not shown (M3). |
| Next step obvious | 1 | "Fix them" goes to the fix. |
| Plain words | ½ | n4, n5. |
| Feedback and state | ½ | M3. |
| Correct data | 1 | Chip equals badge; row equals tab. |
| Error recovery | 1 | The approver is pointed to Waiting for others. |
| Accessibility and sizes | 1 | axe 0 on 24 states. |
| Speed | 1 | Under 350 ms. |
| Visual quality | 1 | Same table and chip pattern. |
| Trust and sources | ½ | A bare "Nothing waits for you" beside a red "1 to fix". |
| **Total** | **8 / 10** | **Passes, no zero.** M3 still blocks, as a Major. Fixing M3 lifts task, feedback and trust. |

**Could not test:** a real screen reader; an unaided walk by an intended user; 100 combinations; CI for the check, whose psql path is the Mac's.
