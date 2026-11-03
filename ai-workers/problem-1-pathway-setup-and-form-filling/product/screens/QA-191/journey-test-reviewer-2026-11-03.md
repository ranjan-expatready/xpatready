# Journey test: QA-191 (field-map rules on both rounds), reviewer, 3 Nov

Commit 96f55350c. An isolated copy `rvr` on :4459 (`xr_studio_rvr`) served the web build of this commit, built into the reviewer's scratch folder and fed in by Playwright request routing, so nothing in the worktree changed. Headless Chromium. US$0.

## Journeys (persona · goal · expected)
1. **Main path.** Content publisher (author): "I see which AI field proposals I can accept together." IMM 5257's saved draft plus a recorded checker round that agrees on `person.given_names` but quotes "zq". Expected: that item is not Ready and the reason says the quote is not on the form.
2. **Alternate.** Same person, items whose quotes are on the form: Ready only when both rounds agree and every rule passes (AT-3).
3. **Error.** The checker reads a field as a different kind of answer, or does not name it: Decide, with both reasons.
4. **Break it.** A short fake quote ("na", "e") on an agreed item. Expected: it is refused like "zq".
5. **Across the boundary.** To review → "Review 84 AI proposals" → the run's form-field page, with the keyboard only.
6. **Wrong role.** The content reviewer opens To review and sees the same queue (the server decides each step).

## What held
- J1: B4 passed 28/28 twice on fresh copies. In the database, `person.given_names` is `agreed`, `checker_quote_on_the_form:false`, `check`, reason "A rule did not pass (The words it quoted ("zq") are not printed on this form.), so a person checks it."
- J2: 47 Ready and 8 Check (7 near a library field, 1 the quote). Every Ready item has all ten rules passed (B4 AT-3 query).
- J3: B4's RETYPED and DROPPED cases are Decide, with the reasons.
- J5: Tab reaches "Review 84 AI proposals" and Enter opens the run page in about 0.5 s. axe (WCAG 2.2 A/AA): 0 violations on To review at 400, 1024 and 1440 px and on the run page at 1024 and 1440 px. No sideways scroll and no console errors. Screenshots: `/tmp/claude-0/-home-user-xpatready/4a02ef13-b1c0-5884-8900-0e666d875a28/scratchpad/review-user-A-1440.png`, `…/review-user-A-400.png`, `…/run-page-1024.png`.
- J6: the content reviewer (user-C) sees To review with the same row and 0 axe violations.
- Data underneath: `source.quoteFound` is true for every IMM 5257 item. The draft's quotes are really printed on the form; the value is computed now, not assumed. No cost was recorded (US$0.00).

## Findings
- **Major (J4 fails):** `engine/field-map-rounds.ts:44` is a substring match. "na", "e", "x" and "ily nam" all count as printed on IMM 5257, as do 252 of 676 two-letter strings, so an agreed item quoting "na" would be Ready. Fix: a word-bounded match (0 misses on the first quotes of 15 saved runs).
- Minor: the rule reason does not say which round quoted the words (`field-map-rounds.ts:53`).
- Minor (unchanged, not this row): the run's form-field page, where these items are decided, shows no P-121 band or rule reason, so the "Check" reason is visible only through To review's rating and bulk refusal.

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | A misquoted agreed item is out of Ready (B4 28/28 ×2; database row) |
| Next step obvious | ½ | The reason is stored, but the form-field page does not show it (unchanged page) |
| Plain words | ½ | "The words it quoted" does not name the checker round |
| Feedback and state | ½ | The band moves to Check; the page shows no band on the item |
| Correct data | ½ | Short substring quotes pass (Major) |
| Error recovery | 1 | A failing rule goes to Check and nothing is dropped; Compare again stays |
| Accessibility and screen sizes | 1 | axe 0 at 400/1024/1440 px; keyboard to the run page; no sideways scroll |
| Speed | 1 | To review in 0.8–0.9 s warm (1.6 s cold first load); no request per row added |
| Visual quality | 1 | Unchanged screens; nothing new rendered |
| Trust and sources | ½ | `quoteFound` is real now but too permissive (M1) |

**7.5 / 10: below the pass bar (8).** Fixes that raise it, most valuable first: (1) word-bounded quote match plus option labels → correct data and trust; (2) name the round in the rule reason → plain words. The other two halves come from the unchanged form-field page and belong to its own row.

Not tested: 200 % zoom, a real screen reader, a paid checker round, and an intended user's unaided walk (D17 and D20 stay with the founder).
