# Journey test (reviewer): C3.12 published date, commit 456fb7d0, 1 Nov 2026

Copies `rev_c312p` (:4471) and `rev_s4lp` (:4476), fresh databases, US$0. Playwright headless Chrome, axe WCAG 2.2 AA. Review: `review-c312-published.md`.

## Journeys
1. **Main (content publisher, user-A).**
   * Goal: "Which date did IRCC put on this file?"
   * Steps: Forms → IMM 5257 row → drawer.
   * Held. The row shows "09-2023 · Published 2026-06-04". The drawer shows "Published 2026-06-04 (the date in the file)" and "Earlier edition (06-2018) · published 2019-04-18".
2. **Alternate (1024 px, and 200 % zoom).** The date is in the short line, with no sideways scroll. At 1024 the date wraps mid-date (m1).
3. **Keyboard only.** Focus IMM 5257 and press Enter. The drawer opens with the date, and axe finds 0 issues at 1440, 1024 and 720@2×.
4. **Uploaded PDF (suite).** Upload imm5604e.pdf: the column is 2023-02-27 straight away, and the list shows it.
5. **Empty / no date.**
   * A file read as "" shows "Date not in the file", and it is not read again.
   * A value that is not a date is never shown as one.
6. **Error.** A file missing from disk stays NULL and is tried again later. The page then says "Date not in the file", although the file was never read (m2).
7. **Wrong role.** The reader user-C sees the same dates. There is nothing to write.
8. **Recovery.** I set all 18 values to NULL and reloaded. The first list (485 ms) filled every file on disk again, with the same values. Later lists took 151–194 ms.
9. **Across the boundary.** The older edition's date shows in the drawer next to what keeps it ("Kept for the record …").

## Data underneath
* Every date matches the PDF's own ModDate, else its CreationDate. I read the files with pypdf: IMM 1295 and IMM 5257 give 2026-06-04, IMM 5707 gives 2025-04-11, IMM 0008 Sch 4 gives 2022-12-06.
* Each edition has one row. The fill changes only rows whose value was NULL.

## Break it
* **Two lists at the same moment.** The update guards on `published: null`, so neither list can overwrite the other's answer.
* **Corrupt value in the database.** It is hidden by `publishedOf`.
* **Damaged file.** It is kept as "" ("no date"), not "could not be read". That is Minor and goes with m2.

## Score: **9/10, pass** (no criterion at 0)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Date in the list and the drawer, for the current and the earlier editions |
| Next step obvious | 1 | The date is information only; there is nothing to act on |
| Plain words | ½ | m2: "not in the file" is also shown for a file that was never read |
| Feedback and state | 1 | Every edition shows either a date or an explicit "none" |
| Correct data | 1 | Matches the PDF metadata for all 17 files |
| Error recovery | 1 | Values reset to NULL are read again once; a missing file is retried |
| Accessibility and screen sizes | ½ | axe 0, keyboard works, no sideways scroll; m1 mid-date wrap at 1024 |
| Speed | 1 | 485 ms on the first fill, 150–200 ms after |
| Visual quality | 1 | Muted line under the edition, in the team look |
| Trust and sources | 1 | The drawer says the date comes from the file itself |

**Fixes that would raise the score, most valuable first:** m1 (`whitespace-nowrap` on the date), then m2 (say "Date not read yet" for NULL).

**Not tested:** a real screen reader; an unaided walk by an intended user (D17 and D20); a cold fill of about 220 editions.
