# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit 89cccd71

Role: reviewer. This is the one journey score for this check.

Scope: "Newer edition on canada.ca" judged by the dates (`newerOnIndex`, `editionMonth`), the guarded "named newer" write, `libraryRows`, the held drawer's words, and Clear filters resetting `typedRef`.

**Setup.**
* `git archive 89cccd71` into `/tmp/x5rv89-mut`. Web built with `npx vite build`.
* Isolated copies on :4452 (API scenarios), :4453 (browser) and :4455 (mutations). All are stopped and their databases dropped.
* Playwright (Chrome, headless) script `/tmp/x5rv89-scripts/journey.cjs`. API scenarios are in `check.sh` and `dates.sh`. Screenshots are in `/tmp/x5rv89-shots/` (not committed).
* SQL was used only to move canada.ca dates (a later read cannot be replayed from one recorded index). The held file is a real upload through the page.
* US$0: no `*_LIVE`, ledgers empty.

## Journeys (configuration author first)
1. **Main, keyboard only.** "Bring IRCC's forms into the library." Tab to Fill, press Enter, read the result.
2. **A later read.** "canada.ca moved IMM 1295 on; what do I do?" Fill (double click), read the words, find the row, then run ⋯ › Replace with a new edition….
3. **Check says current.** "I checked, and canada.ca says mine is current." The form page and the file agree, but IRCC's list is later.
4. **Held file.** "My PDF waits for a second person." Upload an altered IMM 1344, then open its drawer by keyboard.
5. **Wrong role.** The approver tries to fill.
6. **Empty and recovery.** A search that matches nothing, then Clear filters.
7. **Concurrency.** Six fills at once, 3 rounds, one form moved on.
8. **Screen sizes.** 400, 1024 and 1440, plus 720 at 200 % on the drawer.

## What happened
* **J1.**
  * 16 Tabs reach Fill, and Enter fills in 103–128 ms.
  * The page says: "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library."
  * Focus returns to Fill. axe 0, no sideways scroll at any width.
  * None of the 15 sample editions reads Newer after the first fill.
* **J2.**
  * The double click sent one fill (2 fills audited in total). The words add "1 with a newer edition on canada.ca (IMM 1295)", and the row reads Newer.
  * The check says "canada.ca shows IMM 1295 last updated 2023-09. Run 'Find again' on a combination that uses it…".
  * The row stays Newer. That is coherent: the next step is named.
* **J3. Finding.**
  * The row reads "Newer edition on canada.ca". The check's notice says "IMM 1295 (09-2023) is still the current edition on canada.ca (last updated 2023-09)", and the row still reads Newer (`j3-check-current-still-newer-1440.png`).
  * The person is told two opposite things, and nothing on the screen settles it.
* **J4.**
  * The upload card says it is held (rules only, US$0). The row reads Needs your OK.
  * The drawer says "Its PDF is held on To review: what IRCC accepts is set once an edition of it is approved." There is no promise of an approval (m28 fixed).
  * axe 0. Escape returns focus to "IMM 1344". The drawer reads at 720 with 200 % zoom.
* **J5.** The API answers 403, and the approver's page shows no Fill button.
* **J6.** "No form matches", then Clear filters: "Showing 50 of 237 forms" is said at once (277 ms, including the wait). axe 0.
* **J7.** In each round exactly one fill named IMM 1295, and all six answered.
* **Data.** 237 forms, no duplicate numbers. IMM 1295 still has one edition (the fill never adds a file). Page errors and console errors: 0.

## Break pass (15 min)
* **A page-only change on a label-dated file** (IMM 5488, no `canada_updated`, index moved to 2025-02): the row reads Newer. Check cannot read the page ("not in the recorded copies"), so nothing on this screen answers it. Major, together with J3.
* **Removed rules.** The checks cover every new rule except three writes, which still pass 47/47 when removed: the fill's undated mark write, the fill's undated clear write, and the check's clear (the last one is unreachable).
* **Invisible titles.** U+3164, U+2800×2, U+202E+U+2066+U+2069 and U+115F+U+FFA0+U+034F are refused (engine). Removing the new classes fails the suite.
* **`typedRef`.** Removing the reset in Clear filters fails the browser suite (94/95).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Fill, row, drawer and held hand-off all work |
| Next step obvious | ½ | J3: after "still current" there is no next step for a Newer row |
| Plain words | 1 | Words per PRODUCT §4; the held drawer note is plain |
| Feedback and state | ½ | J3: the notice and the row disagree |
| Correct data | ½ | No duplicates or lost files; "Newer" can be wrong for a label-dated file |
| Error recovery | ½ | Only Find again on a combination answers a page-only change |
| Accessibility and screen sizes | 1 | axe 0 ×4; keyboard path; 400, 1024, 1440, 720@200 % |
| Speed | 1 | Fill 103–128 ms, list 164 ms, first view under budget |
| Visual quality | 1 | Team look; the pill and notice are clear |
| Trust and sources | 1 | canada.ca dates and links shown; no AI; US$0 |

**8 / 10: pass, no criterion at 0.** The fix that would raise the four ½ scores is the same one: a per-form baseline (the index date last seen as current) that a "current" check sets, so the check answers the row.

## Not tested
* A real screen reader.
* Live canada.ca. A page-only change is reasoned from IMM 5475 and IRM 0002 in the recorded copy, where the page date and the PDF edition differ.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
