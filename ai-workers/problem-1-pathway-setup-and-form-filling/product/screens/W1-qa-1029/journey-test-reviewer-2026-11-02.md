# Journey test: reviewer, Review and release Item column (PR #389, head 330f4a64), 2 Nov

Isolated copy `screens_qa29` on :4438. Simulated personas only.

## Journeys
1. **Main path.** The content publisher (configuration author) opens Visitor visa › Review and release and reads what is about to go for review. Expected: each row names its item in a few words. **Held:** 22 calculated answers, one line each, the longest 56 characters, no role keys.
2. **Alternate.** The immigration expert decides what to sign and needs each item's meaning. Expected: the definition is reachable. **Partly:** it is in the cell's tip on mouse hover only. The `<td>` is not focusable, and the author view has no checkbox whose label would carry the text.
3. **Keyboard only.** Tab through the table. **Held** for the controls. The definition is never reachable by keyboard (review issue 2).
4. **Other kinds (code walk; the sample has none).** After release the author renames the row, reorders sections or edits a rule. Expected: the row says what changed. **Fails by code.** Row details reads "Single" (from key `vv.single`, label 71 characters). A long rule reads "R-01". "Who fills a question" loses "filled by …, was …" (review issue 1).
5. **Screen sizes.** 1440, 1024 and 512 px: no sideways scroll. Load about 0.35 s.
6. **Empty.** A combination with no changes still shows its empty line (unchanged code path).
7. **Break it.** A free-text rule over 60 characters makes the name an ID. A document requirement key has no ".", so `fieldName` returns "type:role" words.

## Automated
`check_screens_qa_1029_browser.cjs` on :4438: 63 PASS · 0 FAIL, with axe passing on Review and release. I ran it once; the builder ran it as well. The new pass check cannot fail on a meaningless short name (review issue 5).

## Data underneath
The change is display only. `GET /combinations/:id/review` returns the same `changes`, and nothing is written.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Works for calculations; other kinds get wrong names (journey 4) |
| Next step obvious | 1 | Unchanged step cards and buttons |
| Plain words | ½ | Calculations are fine; "R-01", "Single" and system-key tips ("person.age_years") are not; "Us PR card" |
| Feedback and state | 1 | Change, origin and needs pills unchanged |
| Correct data | ½ | Display only, but a misleading item name on Row details, Section order and People on this row |
| Error recovery | 1 | Nothing new to recover from |
| Accessibility and screen sizes | ½ | axe passes, no sideways scroll; the definition is mouse-only |
| Speed | 1 | About 0.35 s |
| Visual quality | 1 | One-line rows (`review-1440.png`) |
| Trust and sources | ½ | Origin shown; the full definition hidden behind hover |
| **Total** | **6.5 / 10** | Below the pass mark of 8 |

Fixes that would raise the score, most valuable first:
1. Limit the short name to the "Derived definition" kind, so other kinds keep their label. This raises task, correct data and plain words.
2. Make the definition reachable by keyboard (a disclosure or focusable tip). This raises accessibility and trust.
3. Show no system key in tips, and add `us` to ABBREVIATIONS.

## Could not test
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Non-derived long labels live: the sample has no such change.

**Verdict: Block** (fails the pass mark of 8).
