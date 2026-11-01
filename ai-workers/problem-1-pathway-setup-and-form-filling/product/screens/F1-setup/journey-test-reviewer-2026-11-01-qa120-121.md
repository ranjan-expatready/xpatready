# Journey test, reviewer: QA-120 and QA-121 (83628cec, code from 048330ac, 1 Nov)

* **Setup:** isolated copy `screens_x1` on port 4442, sample loaded, headless Chromium (`/opt/pw-browsers/chromium`). No model call (US$0).
* **Walk script:** `/tmp/rv/probe.cjs`, not committed. Screenshots are in `/tmp/rv/shots/`.
* **Suites replayed:** `check_x1_tabs_focus_browser` (39/39) and `check_w1_before_forms_browser` (23/23).

## Journeys
1. **Main path. Configuration author, Super visa. Goal: "which tabs have work, and how much?"**
   * The tabs read "Forms 4", "Documents 1" and "Review and release 1", with one badge shape and a space before each count.
   * Hovering shows the same words as the screen reader: "Review and release 1 problem".
   * **Held.**
2. **Keyboard only.**
   * Tab reaches all six tabs, named in words.
   * **Finding (minor):** the tip is a native title, so it never shows on focus.
3. **1024 px, then 200 % zoom.** No sideways scroll, and the tab row keeps every name. axe on the Overview: 0 violations. **Held.**
4. **Alternate. Author follows "Add 1 form found" from the Overview strip.**
   * It lands on Forms and, after 1.5 s, says "This was done since you opened it. Nothing waits there now". But that form is still waiting to be added.
   * "Map 1 form" does the same.
   * **Fails: Major.** Screenshot: `forms-false-done-since-1440.png`.
5. **Recovery. A stale link (`?focus=documents:gone`).**
   * Documents says the place was done since, the key leaves the address, and a reload does not repeat it.
   * **Held.**
6. **Slow load. Summary delayed 3 s, direct link `?focus=documents:lines`, then `forms?focus=people:card`.**
   * Both land, with no false notice.
   * **Held.** By code reading, a Not ready `questionnaires:problems` link could show a false "done" if the summary is more than 1.5 s late (minor).
7. **Empty state. Questionnaires with no questions and a missed key.**
   * By code: the key is cleared silently and no notice is shown (minor; not walked, because the sample has no such combination with a problem).

## Data underneath
These changes are display only: no write and no route. The tab counts match `tabCounts(summary.setup)`, and the problem count matches the draft's error problems (the suite checks both).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J5: the counts and the stale-link notice work |
| Next step obvious | ½ | J4: "Nothing waits there now" while a form waits |
| Plain words | 1 | "1 setup item open", "1 problem" |
| Feedback and state | ½ | J4: a false done state on Forms |
| Correct data | 1 | Counts equal the engine's; nothing written |
| Error recovery | 1 | J5: a wrong key is answered and cleared, with no repeat on reload |
| Accessibility and screen sizes | ½ | axe 0, keyboard names, 1024 px and 200 % pass; the tip is mouse-only |
| Speed | 1 | Landing is immediate; the 1.5 s wait applies only to a missing place |
| Visual quality | 1 | One badge style, danger told apart by colour only |
| Trust and sources | 1 | No AI or source content in this change |

**8/10, no 0: a pass by number.** The verdict in `review-qa120-121.md` is still **Block**, because of the Major finding in J4.
**Fixes that would raise the score, most valuable first:**
1. Judge only the hook's own keys, so Forms never says a false done (lifts next step and feedback).
2. Use `Tip` instead of `title` (lifts accessibility).

**Not tested:**
* A real screen reader, or voice control.
* An intended user's unaided walk (D17/D20 stay with the founder).
