# Journey test, reviewer, round 2: C3.12 K3 "Published" is IRCC's month (commit 681fcae6)

**Role:** reviewer; I did not build this. **Commit:** 681fcae6 on the local `k3-published` (fixes since 31bfda94).
**Copies:** `rv2a` :4443 and `rv2b` :4444, each with a fresh database, live AI off, US$0. Both are stopped, their databases dropped and their var folders removed. The web bundle in `web/dist` carries this commit's words ("not when IRCC published it", "is not a real month").
**Browser:** Playwright with `/opt/pw-browsers/chromium`, headless (this sandbox has no visible pane). Scripts and screenshots: `/tmp/claude-0/-home-user-xpatready/12cd23a1-e5cf-5cbe-9208-eb5654594dca/scratchpad/r2/`.

## Journeys (content publisher user-A unless stated)
1. **Main.** Shared library › Forms: each form shows IRCC's month at 1440 (under the edition), and at 1024 and 400 (in the line under the title).
2. **Drawer, by keyboard.** Focus IMM 1295's number, press Enter, read Definition, press Esc: focus returns to the row's button.
3. **Source named.** A form with no month in its label: "Published 2024-03 (canada.ca page, Last updated)".
4. **Printed date that is not a month** (planted `IMM 1295 (13-2024)`, page 2023-09): the list and the drawer say "Its printed edition date is not a real month". The page's month is not borrowed.
5. **Guide with a dated page** (planted `canada_updated 2025-03-14` on Guide 5256): the API returns `published: null, published_from: null, published_state: none`. The row says "Updated on canada.ca 2025-03-14".
6. **Earlier editions.** "Earlier edition (06-2018) · published 2018-06 (printed on the form) · file saved 2019-04-18". A planted `(13-2018)` reads "its printed edition date is not a real month · file saved 2019-04-18".
7. **File's own date.** The drawer says "File saved 2026-06-04: the PDF's own date, not when IRCC published it". Unreadable file (IMM 5475): "The PDF's own date could not be read". A file not read yet is read once on the list call.
8. **Wrong role.** user-B (read-only) sees the same dates and drawer, with "View" in place of "Edit".
9. **Future printed month** (break pass, planted): `IMM 5476 (12-2026)` shows "Published 2026-12"; `IMM 5409 (12-2027)` shows "Published 2027-12".
10. **Across the boundary.** The combination's form picker upload result now says "file saved <date>" (`components/forms.tsx:67`; the bundle has the words). Checked by reading the source and the bundle; I did not walk it.

## What held
* **Suites, all exit 0.**
  * `check_forms_c312_field_map.ts` on :4443: **61/0**, including 4 new checks.
  * Pack `acceptance/C3.12.test.ts` on :4444: **17/0**.
  * `check_forms_s4_library_browser.cjs` on a fresh :4444, through a chromium launch preload: **113/0**, with 15 axe checks. The screenshots it rewrote were restored with `git checkout --`.
* **Sizes and axe.** At 1440, 1024, 400 and 512@2x (200 % zoom), and as user-B at 1440:
  * no sideways scroll (scrollWidth = viewport);
  * every `data-published-date` is one line box;
  * axe WCAG 2.2 AA finds 0 violations on the list and on three drawers per size;
  * 0 console or page errors.
* **Speed.** First view 330–650 ms. There is no new query: the change adds one regex per edition.
* **The new guide check is not vacuous.** It plants a dated guide page (`check_forms_c312_field_map.ts:134-136`). Without the guide gate (`published-date.ts:32`), the guide label prints no month, `fileMonth` would return 2025-03 and the check would fail.
* **Graph.** `graph.mjs` gives G3 7 and G6 3, the same as round 1; none come from this diff.

## Findings
* **Minor.** A printed month after this one is said as "Published":
  * The rule accepts any month up to December of next year (`engine/published-date.ts:38`), so in Nov 2026 a label `(12-2027)` reads "Published 2027-12". That is a publication date 13 months in the future.
  * The code comment says "a month printed for next month".
  * `fileMonth` rejects the same label for the row's "newer on canada.ca" status, so two rules still read one label in one row.
  * It shows only with planted data: IRCC prints past months.
  * Fix: allow at most next month, matching the comment, or say "printed 12-2027 (a future month)".
* **Note.** The browser suite still checks the drawer's "could not be read" and "not read yet" wording only through the API (round-1 note 7). I saw it right (J7).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Each dated form and checklist shows IRCC's month at all three widths; AT-3 green |
| Next step obvious | 1 | Read-only information; the drawer opens from the number; focus comes back (J2) |
| Plain words | 1 | "File saved …: the PDF's own date, not when IRCC published it"; "Its printed edition date is not a real month" |
| Feedback and state | 1 | date, none, not a real month, and the file's date (date, none, not read yet, could not be read) are all distinct |
| Correct data | ½ | A guide claims no month (J5), and the page's month is never borrowed (J4); a future printed month is called "Published" (J9, planted) |
| Error recovery | 1 | 61/0, including a missing file, a pipe and an unreadable file; the list is stable on reload |
| Accessibility and screen sizes | 1 | axe 0 at 5 sizes, on the list and the drawers; keyboard path; no sideways scroll; the date never breaks |
| Speed | 1 | 330–650 ms first view; no new query |
| Visual quality | 1 | One muted line, with team tokens; `list-1440-1-user-A.png`, `drawer1295-400-1-user-A.png` |
| Trust and sources | 1 | The source is named on the current and earlier editions; the file's date is kept apart and named |

**9.5 / 10, pass (8 or more, no 0).** To raise it: cap the printed month at next month (`published-date.ts:38`).

## Not tested
* A real screen reader.
* A visible (headed) browser.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The form-picker upload walked in the browser (read from the source and the bundle only).
* Live canada.ca pages.
* 100 programs.
