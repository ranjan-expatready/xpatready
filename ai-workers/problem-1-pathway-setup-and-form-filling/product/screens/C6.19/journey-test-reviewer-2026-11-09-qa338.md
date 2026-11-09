# Journey test, reviewer: C6.19 QA-338 fix, commit 52f15e7f1 (9 Nov 2026)

Reviewer role, the one journey score for this check. Copy `rev_qa338` on :4436. Playwright headless (no headed pane in this container), at 1440 / 1024 / 512 (1024 at 200 %) / 400 px, Toronto time. All data is Sample.

## Journeys (case officer, firm staff)
1. **Main.** Client R has two earlier cases, A (Visitor visa) and B (With an LMIA, holding copies from A). On new case C the officer wants only facts that are still true. Expected: nothing is chosen; the officer picks a case and sees which facts can be used.
2. **Alternate.** Case A's expiry was corrected and confirmed after B copied it. Picking B should show B's 2031-05-09 as Out of date, naming A, and the tick should be off.
3. **Error.** The officer ticks an out-of-date fact anyway, by URL or with a stale tab. Expected: the server refuses it and nothing is copied.
4. **Break.** Case A's correction was typed but not confirmed yet. Expected: the expired passport is still caught on B's copies.
5. **Recovery.** Pick B, then the window regains focus and the data refetches. Expected: the pick holds and the ticks stay sane.
6. **Keyboard only.** Reach the radios, pick a case, tick a fact.
7. **Step across the boundary.** After "Re-confirm and use", the facts are on C. The C6.3 Agent view origin is covered by the builder's walk (21/21, twice).

## What held
* J1: no radio checked and no fact rows, with the hint visible at every width (`08-nothing-chosen-1440.png`). Picking a case shows its table.
* J2: Out of date chip plus "Later value: 2025-01-15, confirmed 9 Nov 2026", tick disabled (`09-case-b-out-of-date-1440.png`). qa's check 4/4, twice.
* J3: POST of B's out-of-date date of birth → 409, with the Out of date words and "Nothing was copied". The expired-number POST → 409 (pack).
* J5: the pick held after a focus refetch. No console or page errors.
* J6: Space and the arrow keys pick a case, Tab reaches the tick, then the chip button. Disabled ticks carry `aria-describedby` pointing to the reason. axe found 0 violations in the nothing-chosen and picked states at 1024, 512 and 400 px. No sideways page scroll.
* Speed: GET 43 ms, POST 49–93 ms; the card is ready 0.6–1.2 s after navigation.

## Findings
* **Major (J4).** With A's correction unconfirmed, B's number and its 2031 expiry are New and tickable on C, while A's number reads Expired. The POST from B returns 201, so the expired passport's number is copied onto C (`review-qa338.md` M1).
* Minor. The Out of date advice says "re-confirm it from <A>" even when A's value is Expired and refused (`09-…-1440`; m2).
* Minor. A missing expiry date borrows another passport's date ("expired on 15 Jan 2025" on a newer number; m1).
* Known from earlier, not counted again: ISO dates in the card; at 200 % the table scrolls inside its own box and the status cell grows tall.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete by screens |
| Next step obvious | 1 | "Pick the earlier case…" hint; Out of date says to check with the client |
| Plain words | ½ | The advice points to a refused value (m2); ISO dates |
| Feedback and state | 1 | Chips, disabled ticks, reasons in the row |
| Correct data | ½ | J4: an expired passport's number is copied (M1) |
| Error recovery | 1 | 409 with words; nothing copied |
| Accessibility and screen sizes | 1 | axe clean at 3 widths, keyboard path works, no sideways scroll |
| Speed | 1 | Under 100 ms per API call |
| Visual quality | 1 | Team chips and tones; dense but readable at 1440 |
| Trust and sources | 1 | Names the other case, its value, the date and the rule's source |

**9/10, pass, no criterion at 0.** Fix M1 to raise "correct data", and m2 to raise "plain words".

Could not test: a real screen reader, a headed walk by a person, or an intended user's unaided walk (D17/D20 stay with the founder).
