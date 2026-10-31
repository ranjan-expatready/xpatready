# Journey test, reviewer role: X5 slice a at 5a5f0d16, 31 Oct 2026

Screen: Shared library › Forms, "Fill from IRCC's forms list" (P-156 (1), P156-1, P156-2). Copy: `rvx5c` on :4457, fresh database, sample loaded, web built from 5a5f0d16. Scripts: `/tmp/rv6/journey.cjs`, `back.cjs`, `flash.cjs` (outside the repo), each run twice. Headless Chrome, no CPU throttle. US$0.

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 | Configuration author · "get every IRCC form into the library" | Keyboard only: Tab to Fill (16 Tabs), Enter | Forms listed, message in words, focus kept | **Held.** Message at 113 ms: "221 new forms listed (no file yet), 9 already in the library". Rows at 665 ms. Focus on Fill. 1 audit line. axe 0. First view after the fill 546–600 ms |
| J2 | Author · "find IMM 5373B and the forms with no file" | Search 10 terms; press 8 chips and All; Used by × 6; 96 combinations | Same rows as the server; < 200 ms | **Rows: held** (96/96, all terms, chips and combinations). **Speed: narrowing held** (search median 39 ms, max 72 ms; chips max 157 ms; Used by max 46 ms; 0 requests). **Back to the whole list: failed** (see below) |
| J3 | Author · "this listed form is not needed" | Search IMM 5373B → Delete → reason → send → open drawer → Undo | Row and drawer update; Undo puts it back | **Held.** Row "Deletion waiting", action Withdraw; DB `DELETE:WAITING`. The drawer says it waits. Undo → row Delete again; DB `WITHDRAWN` |
| J4 | Author on a laptop and zoomed | 1024 px, 400 px, 720×450 (200 %) | No sideways scroll, axe 0 | **Held** at all three |
| J5 | Wrong role | user-B (no author duty) opens Forms; reviewer posts fill | No button; 403 | **Held.** 0 buttons, 403 |
| J6 | Recovery: double click | Double click, then triple click Fill | One fill | **Held.** +1 audit line each |
| J7 | Recovery: clear a search that found nothing | Search "zzzz", then clear | The whole list | **Wrong state.** "No forms yet" (the empty-library text) shows for 280–390 ms, 3 of 3 times, before the 237 rows. Screenshot `/tmp/rv6/shots/flash-no-forms-yet.png`, with "All 237" visible above it |
| J8 | Data: twice-listed number | Real `parseFormsIndex` on a checklist row, then a form row for IMM 4444 | The form row whole | **Held.** Create and match both take the form row's title, page and date |

## J2 timings that fail STANDARDS §9 (< 200 ms), event → all 237 rows on screen, median of 7 (run 1 / run 2)
| Action | Median | Range |
|---|---|---|
| Clear the search (from "IMM 5257") | 402 / 429 ms | 323–526 |
| Used by → Any combination | 370 / 339 ms | 310–412 |
| Ready chip pressed off | 311 / 385 ms | 198–509 |
| All chip (from Guides) | 316 / 325 ms | 240–488 |
| All chip (from Forms) | 170 / 194 ms | 135–249 |

The search box itself paints in 3 ms. The rows are what arrive late. Narrowing actions are in budget, and those are the only ones the builder's step times.

## Data underneath
* Fill: 1 audit line with counts; no ledger line; no new edition.
* Delete and Undo: one `library_change` row each, WAITING then WITHDRAWN.
* Server API unchanged for other callers: `form-library.ts` changes only in `fillFromIndex`.

## Break it (15 minutes)
* **Minor: the "newer" rule.** I seeded unapproved editions by SQL. IMM 1295 has a usable file dated 2023-06, an index date of 2023-09 and an unapproved edition dated 2025-01: the fill leaves it unmarked and the list shows it **Ready**. For IMM 5373 B (no usable file, an unapproved undated edition), the fill message says "newer" but the list says **No file yet**. This is Devin's open thread. I found no product path that creates this state.
* **Minor:** the J7 wrong empty state.
* Lettered spellings, a no-match term, a one-letter term: correct rows each time.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J3: filled, found, deleted, undone in the screen |
| Next step obvious | 1 | Fill and Upload PDF side by side; Ready / No file yet chips |
| Plain words | 1 | Message, pills and chips in plain words |
| Feedback and state | ½ | J7 shows the wrong empty state; issue 2 on seeded data |
| Correct data | 1 | 96/96 filter combinations; one audit line per fill; twice-listed row whole |
| Error recovery | 1 | Double click → one fill; Undo restores |
| Accessibility and screen sizes | 1 | axe 0 at four sizes; keyboard path; focus kept |
| Speed | ½ | Narrowing in budget; whole list back 170–430 ms |
| Visual quality | 1 | Team look at 1440, 1024 and 400 px |
| Trust and sources | 1 | "Listed by IRCC", canada.ca page links, no AI, US$0 |

**Score: 9 / 10. Pass (8 or more, no 0).**

**Fixes, most valuable first.**
1. Keep the rows mounted, memoised per number, and hide the filtered-out ones, so the whole list comes back under 200 ms. Time it in the suite.
2. Compute `filtered` from the deferred term.
3. Give the fill the list's own current edition.

## Not tested
* A real screen reader.
* An unaided walk by the configuration author (D17, D20 stay with the founder).
* canada.ca live.
* CI: the run did not start because of a GitHub billing refusal.
