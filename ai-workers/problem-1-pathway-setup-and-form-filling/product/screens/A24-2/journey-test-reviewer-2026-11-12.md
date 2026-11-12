# A24-2 journey test (reviewer role, 12 Nov 2026)

PR #1660, head `bc2c42f54`, isolated copy `rev_a24l` on :4446 (configured checkpoint), web rebuilt with `web-fresh.sh build`. r1c also ran on a fresh copy `rev_a24m` on :4447 with its own setup. Live AI off. Browser: Playwright Chromium (headless), driven with clicks and typing only. API reads were used for step 4 alone. Probe scripts are in the session scratchpad and were not committed.

## Journeys (persona: case officer, Sample firm, unless named)
1. **Main path: find a case by its number.** Cases, type `C-2026-00008`, the row shows, open it. Expected: one row, then the case page headed by the number.
2. **Alternate: find by own reference, by name, by IRCC application number.** `A24L-…`, `Sample Irn`, `v12345`. Expected: the matching case, in any letter case.
3. **Main path: open a case with no reference.** Open a case shows "Case number / Given when you open (C-2026-00009 next)". Leave "Your own reference (optional)" empty and open. Expected: the toast says "Case C-2026-00009 opened", the heading shows the number, and nothing reads "null".
4. **Error: a reference shaped like a case number.** Type `C-2026-00001`. Expected: refused in words under the field, the dialog stays open and no number is used.
5. **Empty: no match.** Expected: "No case matches …" with Clear search.
6. **Recovery: reload, then Back after opening a case from a search.** Expected: the search is kept.
7. **Wrong role and other firm.** Client A and the Configuration author on `/runtime/cases` and `/runtime/next-case-number`, and the solo firm searching this firm's numbers. Expected: 403 for the first two. The solo firm sees none of these cases, and its own peek is its own counter.
8. **Long list: Load more with a search, then the search changes while a page is loading** (53 cases named `Sample Bulk`, next page held for 2.5 s).
9. **Across the boundary: case without a reference** on the case page, Agent view, the Case check, Review, the client questionnaire and the client page.

## What held
* J1, J2, J5, J6: work. The search goes to the API (`?q=`), is case-insensitive, and Back and reload keep it. Builder pack: 33/33.
* J3, J4: work. The peek equals the counter's next value (format and Toronto year as in `runtime_next_case_number`). Reading it twice does not move it, and a refused opening uses no number. My solo-firm opening took `C-2026-00001` and left the Sample firm's peek at `C-2026-00009`.
* J7: the client and the author get 403 on both routes. The solo firm finds 0 cases by this firm's number, name or IRCC number.
* J8: no mixing. A page loaded for "Bulk" never shows under "Sample". Going back to "Bulk" correctly reuses its kept page (53 rows, 53 unique). The kept page follows `owner = actor|q`.
* J9: no "null" or "undefined" on any of the pages listed. The headings read `C-2026-00008`, "Case check … · C-2026-00008" and "Review · C-2026-00008", and the client questionnaire reads "Case C-2026-00008.".
* axe (builder pack) is clean on the list at 1440 and 375 px and on the dialog. No sideways scroll at 400, 720 or 1024 px, or at 200 % zoom. Below 768 px the list keeps Case, Client, Applications and Status.
* Keyboard: Tab reaches Search cases. Typing, then Tab and Tab, reaches the first case link, and Enter opens it. The link's name is the number, plus the reference when there is one ("C-2026-00002 A24L-…").
* Speed: the API's search answers in under 20 ms with the sample data, and the list answers about 300 ms after typing stops.

## Findings
* **Major: typed characters are lost in Search cases.** `cases.tsx:126` copies the address back into the box whenever `q` changes. When the 300 ms timer writes `q` (line 128) and the person presses a key before that render lands, the effect resets the box to the older `q`, and the new key is dropped. Measured in two runs of 30 tries each, typing `C-2026-00008` at 250-400 ms per key: 3/30 and 1/30 lost a character (`"C-026-0008"`, `"C-202-00008"`, `"C-2026-0008"`). An earlier run typing "Sample Irn" at 300 ms per key got `"Samle In"`. The person then searches for the wrong text and gets "No case matches" or the wrong cases.
* **Minor: `%` and `_` in a search are wildcards.** `q=%` and `q=_` return every case, and `C-2026-0000_` returns all of 00001-00009. The cause is Prisma `contains`, which does not escape `\ % _` (`runtime.ts:993`). The results stay inside the firm.
* **Minor: the number of results is not announced.** After a search the list and "N cases shown for …" change, but nothing is in a live region (WCAG 4.1.3).
* **Minor: the "None yet" tooltip is a `title`** (`cases.tsx:111`). It does not open on keyboard focus (BIC-14).

## Score (journey score, QUALITY.md)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1-J4 done unaided; builder pack 33/33 |
| Next step obvious | 1 | One filled button; the case cell is one link; Clear search on no match |
| Plain words | 1 | "Given when you open (C-2026-00009 next)", "Your own reference (optional)", "None yet" |
| Feedback and state | ½ | Toast names the number. Typed keys are sometimes lost (Major above) |
| Correct data | ½ | Peek, client name, filings and firm scope are right. `%`/`_` return false matches |
| Error recovery | 1 | The refusal sits under the field and clears on edit; Clear search; reload and Back keep the search |
| Accessibility and screen sizes | ½ | axe clean, keyboard path works, 400/1024 px and 200 % zoom pass. The result count is not announced; the `title` tooltip |
| Speed | 1 | API under 20 ms; no request per row (one query per page) |
| Visual quality | 1 | Screenshots `01`-`07`; team table; number bold with the reference muted under it |
| Trust and sources | 1 | The peek says "next", never "yours"; Sample names |

**Score 8.5/10, no criterion at 0: pass.** Most valuable fix first: (1) sync the box from the address only when `q` changed from outside, for example by keeping the last value the timer wrote in a ref and skipping the reset when `q` equals it. Add a check that types with about 300 ms between keys. (2) Escape `\ % _` before `contains`. (3) Make the "cases shown" line `role="status"`.

## Not tested
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). A walk by a person in a headed browser (Playwright only). A year rollover of the peek (the counter's own test covers allocation).
