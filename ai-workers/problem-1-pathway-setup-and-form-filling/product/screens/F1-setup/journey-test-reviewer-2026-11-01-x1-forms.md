# Journey test: reviewer. X1 forms landings, commit 2e3ea7e8 (1 Nov)

Own copy `forms_rv3` on :4455. The sample was reset and loaded, US$0, headless Chrome. The script is in /tmp/rv3j (not committed). Screenshots are in /tmp/rv3j and in the builder's `screenshots/x1-forms/`. Review: `review-x1-forms-landings.md`.

## Journeys (configuration author, unless a journey says otherwise)
1. **Main path: Add n forms found.** Study permit checklist item "Add 3 forms found" → `/forms?focus=forms:sources`.
   * It lands on "Not set up yet: 3 forms can be added from the library now…".
   * The line is focused, outlined for 2 s, and the address is cleared.
2. **Map n forms.** Super visa and Visitor visa "Map 1 form" → it lands on the forms table, and the pending rows with "Draft with AI" are in view. The table's bottom edge is just below the fold, at 934/900 and 954/900.
3. **Fix n form problems (draft).**
   * Work permit family: one condition is left in words only, so the checklist reads "Fix 1 form problem".
   * The link lands on the problems block, which lists 1 "Blocks release" item.
   * The same problem is also said in the warn notice above the table (review m1).
4. **Fix n problems (Not ready, release only).**
   * The release's form condition was broken by SQL and the draft was clean. The checklist's own `next.href` was `/forms?focus=forms%3Aproblems` with `fromRelease`.
   * It lands on "The released version has 1 form problem: firms cannot open cases … Review and release".
5. **Review new edition.**
   * Two held uploads of one edition give the checklist count 1, and the notice names one edition, IMM 1295 (02-2099). It landed in 553 ms.
   * **Keyboard:** after landing, one Tab reaches "Review it on To review", and Enter opens `/review`.
6. **Wrong role.** The approver (user-B) gets the same landing and notice. It is read-only, and To review shows the item as waiting for the author.
7. **Recovery.** Back from To review: there is no `?focus=` in the address and nothing is outlined, so there is no jump back. A reload does not land again. An unknown key `forms:nothing_here` outlines nothing and the tab works (builder's suite).
8. **Empty and fail cases (builder's suite, rerun).** These were drawn with nothing to land on:
   * no forms waiting
   * no form problems (with warnings only, the block is not a landing)
   * no held edition
9. **Screen sizes.** For `forms:held` and `forms:problems`, at 1024×768 and at 720×450 (1440 at 200 % zoom): the element's scrollWidth equals its clientWidth, and the page has no sideways scroll. Axe (WCAG 2.2 AA) was clean at 1440 and 390 px for all four landings.
10. **Across the boundary.** The held notice leads to To review, and the release-only notice leads to Review and release. Both links work.

## Data underneath
* Counts were read from `/combinations/:id/summary` `setup.steps[].open`, and each one equals what the page shows.
* `row.held` is deduplicated by edition (1), while `summary.held` has 2 rows. The page uses the right one.
* Nothing is written by the landings: the change is read-only.

## Break it
| What | Result |
|---|---|
| Two held uploads of the same edition | One edition shown, count 1 |
| Release broken, draft clean | Notice with the checklist's count |
| Stale or unknown key | Nothing lands; the address keeps `?focus=` when the target is gone (m8) |

A pre-existing engine gap could let the list show an error the count leaves out: `accepts` is not passed at `programs.ts:163` (review m4). I did not reproduce it.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 all land on the item's content |
| Next step obvious | 1 | Held → To review link; release-only → Review and release |
| Plain words | ½ | The copy is plain, but the words-only problem is said twice (m1) |
| Feedback and state | 1 | 2 s ring, focus moves, the address is cleared |
| Correct data | 1 | Counts equal the checklist in J1–J5; held is deduplicated correctly |
| Error recovery | 1 | Back and reload do not jump; an unknown key is harmless |
| Accessibility and screen sizes | 1 | Axe clean at 1440 and 390 px; keyboard path; 1024 px and 200 % fine |
| Speed | 1 | Landed in about 0.55 s; shared query, no per-row requests |
| Visual quality | ½ | Warnings are listed above the counted error (m7); on a long table the outline's edges fall off-screen (m2) |
| Trust and sources | 1 | Counts are the engine's; the edition is named; no AI involved |
| **Total** | **9 / 10** | **Pass**, no criterion at 0 |

The fixes that would raise the score most: m1 (say the words-only problem once), then m7 and m2 (errors first; land on the line).

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A long forms table.
* The "To review" row text for my hand-made intake row (the badge showed it).
