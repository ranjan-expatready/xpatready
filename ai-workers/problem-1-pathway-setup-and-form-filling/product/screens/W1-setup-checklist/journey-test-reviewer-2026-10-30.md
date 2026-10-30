# Journey test: setup checklist card v4 on Immigration programs (reviewer, 30 Oct)

Walked by the reviewer agent in a headed Chrome (Playwright, slowMo) on a private copy (:4446), with the sample data and one saved replay (US$0). Each step uses only what a person sees: click, type, read. Afterwards the API was read per person. Screenshots of the walk are in the reviewer's scratchpad, not committed. Score per `QUALITY.md` "Journey score". Findings M1–M4 and m1–m5 are those in `review.md`.

## Journeys (main path first)
1. **Author: "what do I work on next?"** Opens Programs and sees Visitors (0 of 3 live) and Work permits (2 of 7 live). Super visa carries **Needs you**; its hover says "Review 84 proposals". **Held.** Five things per card; Live cards say ✓ Live with a green edge bar.
2. **Author resumes Visitor visa.** Expected: land on the first open item. Got `/c/…/forms?focus=people%3Acard`: nothing outlined, no people card on Forms, the header says "Next step: Add 1 form from the library", and the first action is the priced "Find forms with AI". **Wrong turn (M3).** Back returns to Programs with Visitor visa highlighted and the scroll kept. **Held.**
3. **Author starts Extend stay in Canada (double click).** One combination, landing on Forms. No AI started, no priced click. Back on Programs the card reads **"1 of 5 steps"** although nothing is set up. **Wrong data (M1).**
4. **Expert: "what waits for me?"** The Needs you toggle (7) shows 7 cards, each "Confirm who can apply", two of them Live. The button is **Open** on every card (Q1, as agreed). Open lands on the Overview, which has no Confirm, only "Change in Questionnaires". **Dead end (M2).**
5. **Approver, Needs you on.** One card: Study permit, "Release". The other bands say nothing. **Held.**
6. **Keyboard only, List view.** 38 Tabs reach the first row (m3). ↑/↓ move between rows. Tab goes to Needs you, then the button. Enter opens. Progress sort works within each Program band (m1). **Held**, with the two notes.
7. **Empty / error.** A search for "zzzz" gives "Nothing matches" with Clear search. Clear all resets the view. The page-level load error has Retry. **Held**; the per-card error state is not built (m2).
8. **Wrong role.** The case officer sees "This page is for the configuration people…" with "Open your cases". The API answers 403 for the officer, 401 with no person and 400 for a bad filter. **Held.**
9. **Screen sizes.** No sideways scroll at 1440, 1024, 800, 512 (200 % zoom), 400 and 375 px. Columns are 4/3/2/1. axe finds no WCAG 2.2 A/AA violation in cards or List. **Held.**
10. **Across the screen boundary.** The name opens `/c/:id`. Resume uses `setup.next.href`, but the `?focus=` landing is slice C, so the hand-over stops on the tab (M3).

## Replayed as automated checks
`check_setup_card_browser.cjs` passed 42/42 (states, words per duty, colour, chips, folds, List, 4 widths, axe, 150 combinations in 425–480 ms). `check_w1_programs_s2.cjs` passed 87/87, but printed a NOTE that two "need you" counts disagree (M4). `check_screen01_browser.cjs` passed 112/116: two C1.6 Forms fails outside this item, and two timing fails under load average 14–16. Run twice: the card check passed both times, and the timings varied between 1050 and 2389 ms.

## Data underneath
For user-A, user-B and user-C, `rows[].needsYou` equals `setup.viewer.needsYou` on every row. The chip counts add up (15 + 4 + 2 = 21; 14 + 5 + 2 after the Start). Start setup created exactly one row. The Live chip agrees with releases 1 and 2. Step 4 shows ✓ with 0 documents and 0 questions (M1).

## Break it
* Double click on Start setup: one combination.
* A 500-character non-English search: 200, nothing breaks.
* Unknown filter: 400.
* Person switch (fixed in df88ff10): not re-broken.
* Wrong role by URL: refused.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The author finds, starts and resumes. The expert cannot complete what Needs you asks (M2) |
| Next step obvious | ½ | Resume lands where its item is not, and the header names a different next step (M3) |
| Plain words | 1 | "n of 5 steps", "Needs you: Review 84 proposals", tooltips on chips and bar |
| Feedback and state | 1 | Skeleton, busy spinner, 2 s outline, Back highlight |
| Correct data | ½ | Step 4 is ✓ on an empty combination (M1). Structure and Programs counts differ (M4) |
| Error recovery | 1 | Nothing matches with a way back. Retry. Wrong-role page with a way out |
| Accessibility and screen sizes | 1 | axe clean at 4 widths and in List, keyboard path complete, no sideways scroll at 200 % |
| Speed | ½ | 150 combinations under 0.5 s. First view over 1 s on every run, under heavy load |
| Visual quality | 1 | Calm cards, one blue, green only for Live |
| Trust and sources | 1 | Sample note. No AI or price on the card |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0) |

Fixes that raise the low criteria, most valuable first: M1 (correct data), M2 (task completed), M3 (next step obvious), M4 (correct data), then a first-view timing on a quiet machine (speed).

Not tested: a real screen reader, an intended user's unaided walk (D17, D20 stay with the founder), and the Overview strip and tabs (slices B and C, not built).
