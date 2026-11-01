# Journey test, reviewer role: C3.14 Checks and Rules lists (1 Nov)

Copy `rev_c314` on :4452, fresh database, sample inputs loaded, web rebuilt from 6f45417b (verdict for head 3ae9d516: no code change since). Headless Chromium driven like a person. Screenshots are in `/tmp/rev_c314_shots/` (not committed).

## Journeys
1. **Main path.** The content publisher asks: "Which checks exist, and what does each read?" Open Shared library › Checks, choose the Readiness warning chip, search "passport", read a row and its source. *Held*: 64 rows, the chip count and filter go into the address, the source quote shows, load takes about 240 ms.
2. **Alternate.** "Where is the rule that adds IMM 5707, and where do I change it?" Open Rules, search "IMM 5707", follow Lives on. *Held*: 3 rows; the link opens With an LMIA › Questionnaires. *Wrong turn*: the tab opens at the top, and the rules and checks sit below every section (`used-by-target.png`).
3. **Combination filter.** Pick a combination. *Held*, including a combination with no rules taken from the address.
4. **Empty and nothing matches.** *Held*: "No check matches" with how to clear it.
5. **Check shared by two combinations.** Visitor visa holds its own copy of `OR_PASSPORT_PAGE_FACTS` (warn, no source, edited by a person). *Failed*: the one row shows Visitor visa's values for With an LMIA too ("Warns", "No source recorded"), although there it blocks and quotes IRCC. With two "Used by" links, axe also reports target-size.
6. **Wrong role.** The case officer opens /library/checks by URL. *Held*: the page says "This page is for the configuration people", and the API returns 403. With no person the API returns 401.
7. **Recovery.** Reload keeps the search and the chip; Back returns to the list. *Held*.
8. **Keyboard only.** Tab moves through the menu, then search, combination, chips and the links in the table, with a visible ring at every stop; Enter on a chip filters. *Held*.
9. **Screen sizes.** 400, 1024 and 1440 px and 200 % zoom (720 px at 2×): no sideways page scroll. At 400 px both tables scroll inside their frame, and the Rules table does too at 200 % (25 px).
10. **Break it.** Six writes (POST, PATCH and DELETE on both lists) all return 404 and nothing is written. Typing at 0 ms between keys drops characters ("passport expiry" became "psxiy"); at 30 ms or more nothing is lost. A question rule with an unconfirmed field name shows the raw key "Ask case.application_date" (builder test output).

## Replayed checks
The builder's API check passes 17/17 and the browser check 26/26 on fresh copies. My own walk script (widths, zoom, keyboard, axe, timings, wrong role) found no page or console errors. axe is clean except target-size, and only in journey 5.

## Data underneath
Rows match `check_def` (64 distinct keys) and the predicate, form-line and checklist-line counts (39, 5, 24). Nothing changes after browsing or after the refused writes. No audit lines are written, as expected for reads.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Both lists answer the question on sample data; journey 5 gives a wrong answer |
| Next step obvious | ½ | Links go to the right tab but land at its top (journey 2) |
| Plain words | ½ | "Stops until resolved" states a behaviour nothing implements; raw key in a question rule; "…line. when:" |
| Feedback and state | 1 | "N of M", chip counts, nothing-matches text, filters in the address |
| Correct data | ½ | Correct with one combination; misattributed with two (journey 5) |
| Error recovery | 1 | Reload and Back keep state; wrong role explained |
| Accessibility and sizes | ½ | Keyboard and widths fine; target-size fails in journey 5 |
| Speed | 1 | First view 150–255 ms; filter about 130 ms |
| Visual quality | 1 | Team list pattern; fits at 1024 px with Kind moved under the sentence |
| Trust and sources | ½ | Every row shows a source or "No source recorded", but sources merge across combinations; Runs and AI review are not labelled Not built (M8) |
| **Total** | **7 / 10** | Below 8: **fail** |

Fixes that raise the score, most valuable first: per-combination values with their sources (correct data, trust, task); the M8 kind mapping and Not built labels (trust); honest effect wording plus field names instead of keys (words); a focus anchor on the target tab (next step); spaced "Used by" links (accessibility).

Not tested: a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
