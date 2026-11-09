# Journey test, reviewer: C6.19 QA-338 fix, round 2, commit 5b14fc1e7 (9 Nov 2026)

This is the reviewer role and the one journey score for this check. I ran it on copy `rev2_qa338` on :4436, stopped afterwards. The browser was Playwright headless (this container has no headed pane), at 1440 px, 1024 px and 512 px (1024 at 200 %). All data is Sample.

Round 1 (52f15e7f1, another reviewer) scored 9/10. Its findings were J4 Major (M1), m1 and m2. All three are fixed now; the evidence is below.

## Journeys (case officer, firm staff)
1. **Main.** Client R has earlier cases A and B. B holds copies from A. On new case C the officer wants only facts that are still true. Expected: nothing is chosen; the officer picks a case and sees what can be used.
2. **Alternate.** A's expiry was corrected and confirmed after B copied it. Expected: picking B shows B's date as Out of date, naming A, and the tick is off.
3. **Error.** The officer ticks an out-of-date or expired fact anyway, by URL or from a stale tab. Expected: the server refuses it and nothing is copied.
4. **Break (round 1 M1).** A's correction is typed but not confirmed. Expected: B's copies of the passport are still Expired.
5. **Break (new).** B holds the client's old passport, confirmed, whose date has passed. On A the officer starts typing the renewed passport but does not confirm it. Expected: B's old passport is still Expired on C.
6. **Keyboard only.** Reach the radios, pick a case, tick a fact.
7. **Step across the boundary.** After "Re-confirm and use", the facts are on C, with their origin shown in the Agent view (builder's walk, 21/21, twice).

## What held
* **J1.** No radio is checked at any width, and the hint shows (`08-nothing-chosen-1440.png`).
* **J2.** B shows the Out of date chip, the later value and the date, and the tick is disabled. The advice now reads "Check with the client which is true before using either." (`09-case-b-out-of-date-1440.png`). qa's check passed 4/4, twice.
* **J3.**
  * POSTing B's out-of-date date of birth returns 409 with the Out of date words and "Nothing was copied".
  * POSTing the expired number returns 409 with the rule and its source.
* **J4.** B's number and its 2031 expiry read Expired, blocked. The POST returns 409 (round 1 got 201).
* **J6.** Space picks the case and the table appears. axe found 0 violations on the card at three widths. No sideways scroll and no console errors.
* **Speed.** GET took 40 ms and POST 40–48 ms. The pack ran 81/81.

## Findings
* **Major (J5).** On C, B's expiry 2025-01-15 and number Q1110001 show only a New chip, and both can be ticked (`probe2/shots/r1-card-1024-z1.png`). The POST returns 201, and C now holds the expired passport.
  * Control: with nothing typed on A, both read Expired and the POST returns 409.
  * The change in 5b14fc1e7 caused this. An unconfirmed later date elsewhere now replaces the case's own date. See `review-qa338.md` R1.
* **Minor.** The m3 rule (a copy dated by its re-confirmation) works in my probe, but no test names it (`review-qa338.md` r1).
* Known from earlier, not counted again: the card shows ISO dates, and at 200 % the table scrolls inside its own box.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete through the screens |
| Next step obvious | 1 | The "Pick the earlier case…" hint; Out of date says to check with the client |
| Plain words | 1 | The advice no longer points to a refused value (m2 fixed) |
| Feedback and state | 1 | Chips, disabled ticks, the reason in the row |
| Correct data | ½ | J5: an expired passport is copied onto C (R1) |
| Error recovery | 1 | 409 with words; nothing copied |
| Accessibility and screen sizes | 1 | axe clean at three widths, the keyboard pick works, no sideways scroll |
| Speed | 1 | Under 100 ms per API call |
| Visual quality | 1 | Team chips and tones |
| Trust and sources | 1 | Names the other case, its value, the date and the rule's source |

**9.5/10, pass, no criterion at 0.** Fixing R1 would raise "correct data".

Could not test: a real screen reader, a headed walk by a person, or an intended user's unaided walk (D17/D20 stay with the founder).
