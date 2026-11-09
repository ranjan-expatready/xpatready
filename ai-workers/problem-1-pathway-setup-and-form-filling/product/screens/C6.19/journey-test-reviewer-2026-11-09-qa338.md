# Journey test, reviewer: C6.19 QA-338 fix, round 4, commit 234b81af9 (9 Nov 2026)

**Round 4 (234b81af9), copy `rev4_qa338` on :4436, stopped afterwards.**
* J6 now holds. When A confirms only a later date, B's old passport number reads Expired and cannot be ticked, and the POST returns 409 (`probe2/shots4/r4-card-1024-z1.png`).
* A renewal confirmed on A is used from A: the POST returns 201, and C holds the new number and date.
* J1–J5 and J7 still hold:
  * Pack: 86/86.
  * qa's check: 4/4, twice.
  * Builder's walk: 21/21, twice.
  * The card at three widths: axe found 0 violations.
* "Correct data" goes from ½ to 1. **Score 10/10, pass.** The round 3 walk below stands for everything else.

---

This is the reviewer role and the one journey score for this check. I ran it on my own copy, `rev3_qa338` on :4436, and stopped it afterwards. I used headless Playwright, because this container has no headed pane, at 1440 px, 1024 px and 512 px (1024 at 200 %). All data is Sample.

Earlier scores:
* Round 1 (52f15e7f1, another reviewer): 9/10.
* Round 2 (5b14fc1e7, me): 9.5/10, with a Major: a renewal only typed elsewhere released an expired passport.

## Journeys (case officer, firm staff)
1. **Main.** Client R has earlier cases A and B, and B holds copies from A. On new case C the officer wants only facts that are still true. Expected: nothing is chosen. The officer picks a case and sees what can be used.
2. **Alternate.** A's expiry was corrected and confirmed after B copied it. Expected: B shows Out of date, names A, and the tick is off.
3. **Error.** The officer ticks an out-of-date or expired fact anyway, through the URL or a stale tab. Expected: the server refuses it and nothing is copied.
4. **Break (round 1 M1).** A's correction is typed but not confirmed. Expected: B's passport copies read Expired.
5. **Break (round 2 R1).** B holds the old passport, confirmed and already expired. On A a renewal is only typed. Expected: B's passport still reads Expired.
6. **Break (new).** On A the officer confirms only a later expiry date, with no passport number. Expected: B's old passport facts are flagged.
7. **Keyboard only.** Pick a case, then tick a fact.
8. **Step across the boundary.** The re-confirmed facts appear on C with their origin (builder's walk, 21/21, twice).

## What held
* **J1:** no radio is checked at any width, and the hint shows.
* **J2:** the Out of date chip shows the later value and the date. The tick is disabled. qa's check passed 4/4, twice.
* **J3:** both POSTs return 409 with the reason and "Nothing was copied".
* **J4 and J5:** B's number and expiry read Expired and cannot be ticked (`probe2/shots3/r1-card-1024-z1.png`). POST returns 409 and C holds nothing.
* **J7:** Space picks the case. axe found 0 violations at three widths. No sideways scroll and no console errors.
* **Pack:** 85/85.

## Findings
* **Minor (J6).** B's date row reads Out of date and is blocked, with the advice to check with the client. B's number Q1110001 shows only New and can be ticked; POST returns 201 (`probe2/shots3/r4-card-1024-z1.png`). See `review-qa338.md` R4.
* **Known from earlier, not counted again:** the card shows ISO dates, and at 200 % the table scrolls inside its own box.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete through the screens |
| Next step obvious | 1 | "Pick the earlier case…" hint; Out of date says to check with the client |
| Plain words | 1 | The reasons are in plain words; the advice never points to a refused value |
| Feedback and state | 1 | Chips, disabled ticks, the reason in the row |
| Correct data | ½ | J6: an out-of-date passport's number can be ticked with no flag on its row (Minor R4) |
| Error recovery | 1 | 409 with words; nothing copied |
| Accessibility and screen sizes | 1 | axe clean at three widths, keyboard pick works, no sideways scroll |
| Speed | 1 | API calls under 100 ms |
| Visual quality | 1 | Team chips and tones |
| Trust and sources | 1 | Names the other case, its value, the date and the rule's source |

**Round 3: 9.5/10, pass, no criterion at 0.** Round 4 fixes R4, which brings the score to 10/10.

Could not test: a real screen reader, a headed walk by a person, or an intended user's unaided walk (D17/D20 stay with the founder).
