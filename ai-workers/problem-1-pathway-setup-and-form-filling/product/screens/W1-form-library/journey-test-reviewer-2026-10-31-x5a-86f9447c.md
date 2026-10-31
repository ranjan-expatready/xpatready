# Journey test: X5 slice a (fill the library from IRCC's forms list), reviewer, 31 Oct 2026, commit 86f9447c

**Setup.**
* **Copy.** Isolated copy `rvx5b` on :4457, US$0. I ran Reset, then Load sample, as setup only.
* **Scripts.** `/tmp/rv5/journey.cjs`, plus timing scripts `/tmp/rv5/timing.cjs`, `t2.cjs` and `t4.cjs`. They run headless Chrome with Playwright and stay outside the repo.
* **Runs.** I ran the journey twice and the timings three times; the results were consistent.
* **Screenshots.** In `/tmp/rv5/shots/`; not committed.

## Journeys
1. **Main path, keyboard only.**
   * **Who:** the configuration author.
   * **Goal:** "put every IRCC form in my library without paying".
   * **Steps:** open Shared library › Forms, Tab to "Fill from IRCC's forms list", press Enter.
   * **Result:**
     * Reached in 16 Tabs.
     * The message "221 new forms listed (no file yet), 9 already in the library" came after 0.13 s; the rows came after 0.6–0.7 s.
     * **Focus stays on the button** (fixed).
     * axe 0. No ledger line and no edition were added.
2. **Finding the usable forms after the fill.**
   * **Who:** the author.
   * **Steps:** press "Ready 15", then "No file yet 222", then search "5257", "IMM 5373B" and "visitor".
   * **Result:**
     * Ready shows only the 15 forms with a file; No file yet shows the 222 listed rows.
     * "IMM 5373B" (IRCC's spelling) finds "IMM 5373 B".
     * **Search takes 184–375 ms, about 230 ms typical, in the page (budget < 200 ms).** The first press of Guides takes 207–217 ms.
     * First view takes 0.41–0.75 s (budget < 1 s).
3. **Lettered number, end to end.**
   * **Who:** the author, then the approver.
   * **Steps:** search 5373; on IMM 5373 B press Delete; give a reason; Send for approval. Then user-B approves.
   * **Result:**
     * The row reads "Deletion waiting · Withdraw", and the change is WAITING.
     * After the approval the row is gone (RELEASED).
     * Uses answers for "IMM 0008SCH4A" and "imm 0008 sch4a". Attaching it with no file says "No file yet"; with an approved file it attaches to "IMM 0008 SCH4A", with no twin.
4. **The newer mark's life.**
   * **Who:** the author.
   * **Set.** An older stored index date, then a fill, marks the form. With the library's edition dated before the index, the row reads "Newer edition on canada.ca".
   * **Kept** by a check that cannot read canada.ca (409), and by a check that finds another date.
   * **Cleared** by a check that finds the edition current, and answered once the library's edition is dated at or after the index's date.
   * **Wrong turn:** the fill's message said "3 with a newer edition on canada.ca (IMM 1295, IMM 5257, IMM 5409)" while the list showed "Newer on canada.ca 0".
5. **Wrong role.**
   * **Who:** the approver (user-B).
   * **Result:** no Fill button.
6. **Recovery.**
   * **Steps:** double click Fill, reload mid-fill.
   * **Result:** 237 rows, 0 duplicates. **The double click sent two fills**: two audit lines, the second "0 new".
   * **Missing recorded copy of the list:** 409 "IRCC's forms list could not be read… Nothing was added".
7. **Fill racing approved deletes.**
   * **Steps:** 3 rounds, each a fill plus 8 approvals at once.
   * **Result:** every fill succeeded and there were no duplicates. The next fill re-lists the deleted numbers; that is put to the Lead (break m3).
8. **Screen sizes.**
   * **Result:** at 1024, 400 and 720×450 (200 % zoom) there is no sideways scroll, the Fill button stays visible, and axe reports 0.
   * Fill and Upload PDF sit side by side at every size.

## Data underneath
* 237 rows, with 0 duplicate keys after every journey. Matched forms keep their title, kind, page and retired state.
* The audit line's counts are true.
* The plain-row shortcut gives the same action as `formUses` on all 237 rows for user-A, user-B and user-C, with crafted states (lines, releases, held file, open changes, retired).

## Findings (details in review-x5a.md)
* **Major:** search and the first chip press exceed the §9 200 ms budget after the fill (about 100 ms of re-render before the fetch).
* **Minor:** the fill's message names "newer" forms the list does not show.
* **Minor:** four fixes have no failing check.
* **Minor:** a double click sends two fills.
* **Carried question:** review issue 9.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Library filled, usable forms found, lettered form deleted and attached |
| Next step obvious | 1 | Ready and No file yet chips; the tip says how a listed form gets its file |
| Plain words | 1 | "Listed by IRCC · no file yet", "Newer on canada.ca", "No file yet" on attach |
| Feedback and state | ½ | Fast message, focus kept; the message's newer list contradicts the list |
| Correct data | 1 | No duplicates, true counts under races, one spelling, mark lifecycle right |
| Error recovery | 1 | A failed check keeps the mark; a missing copy gives 409 in words; races are safe |
| Accessibility and screen sizes | 1 | axe 0 at 4 sizes, keyboard path, focus kept, no sideways scroll |
| Speed | ½ | API 0.10–0.13 s and first view < 1 s; search about 230 ms (> 200 ms) |
| Visual quality | 1 | Buttons grouped; chips wrap cleanly at 400 px |
| Trust and sources | 1 | No AI; each row links its canada.ca page; origin said |

**Total 9 / 10: pass** (8 or more, no 0).

To raise it, most valuable first:
1. Keep typing and chip clicks off the 237-row render, so search and filters are under 200 ms.
2. Make the message's newer list use the list's rule.

## Not tested
* canada.ca live.
* A real second-edition PDF.
* The finder end to end (it needs AI).
* A real screen reader.
* An unaided walk by an intended user (D17, D20 stay with the founder).
