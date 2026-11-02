# Journey test (reviewer): K3, C3.12 "Published" is IRCC's month, commit 31bfda94

Commit **31bfda94** on the local `k3-published`, based on f02ef514. The copies were `rev_k3` :4443 and `rev_k3b` :4444; both are stopped and their databases and var folders removed. Live AI was off (US$0; `drafting_job` spend 0). The browser was `/opt/pw-browsers/chromium`, headless Playwright: the sandbox has no visible pane. The steps used only what a person sees; SQL was used only to plant test input (J4–J6). My walk script is `/tmp/claude-0/-home-user-xpatready/12cd23a1-e5cf-5cbe-9208-eb5654594dca/scratchpad/walk.cjs`. That scratchpad is shared with the breaker, which wrote a file of the same name; the results below are from my run. Screenshots are in `/tmp/claude-0/-home-user-xpatready/12cd23a1-e5cf-5cbe-9208-eb5654594dca/scratchpad/shots/`.

## Journeys (content publisher user-A unless named)
1. **Main path.** Goal: "When did IRCC publish the edition we hold?" Steps: Shared library › Forms at 1440 → read the Edition cell → open IMM 5476 by keyboard → read Definition → Esc.
   * **Held.** The list was visible in 700 ms (1156 ms on the cold first run, which reads the files once).
   * IMM 5476 shows "11-2025 / Published 2025-11". This is QA-148's own example: it was "Published 2025-12-15", the PDF's ModDate.
   * IMM 5707 shows "Published 2023-01" (it was 2025-04-11). IMM 5488 and 5881, checklists with no page month, show 2024-10 and 2026-05.
   * The guides show no Published line.
   * By keyboard, 90 Tabs reach the IMM 5476 button and Enter opens the drawer. It says: "Current edition: IMM 5476 (11-2025) · canada.ca last updated 2025-11 / Published 2025-11 (printed on the form) / Not IRCC's date: file saved 2025-12-15". Esc returns focus to "IMM 5476". No console errors. Shot: `k3-drawer-1440.png`.
2. **Smaller screens and zoom.**
   * At 1024 and 400, the short line under the title reads "Form · 11-2025 · Published 2025-11 · Field map: 46 of 53 …".
   * At 720@2x (1440 at 200 %) and 512@2x (1024 at 200 %), the same.
   * The date is one line box at every width, with no sideways scroll on the list or the drawer. axe WCAG 2.2 A/AA found 0 issues on the list and the drawer at 1440, 1024, 400, 720@2x and 512@2x. Shot: `k3-list-400.png`.
3. **Other roles.** The content reviewer (user-C) and the approver (user-B) see the same "01-2023 / Published 2023-01" for IMM 5707.
4. **The file's own date.** IMM 5409 with the file date set to '' and then '?':
   * The Published month is unchanged (2023-01, printed).
   * The drawer says "Not IRCC's date: the file names no date" and then "… the file's date could not be read".
   * The states stay apart (break M2 of #313 still holds), but the words read oddly (finding 3).
5. **Fallback and nothing known** (test input: the IMM 5409 label without a month).
   * The row shows "Published 2023-01", and the drawer adds "(canada.ca page, Last updated)".
   * With `canada_updated` also null, both the row and the drawer say "No edition date printed on it or on canada.ca". Nothing is guessed.
6. **Earlier edition.** An earlier IMM 5257 (06-2018) is shown as "Earlier edition (06-2018) · published 2018-06 · Kept for the record …". That is its own printed month, not its file's 2019-04-18.
7. **Across the boundary.** Upload PDFs on the Forms page with imm5604e.pdf: the row appears in 1.8 s with "02-2023 / Published 2023-02". The page never calls the file's 2023-02-27 "published".
8. **Recovery and reload.** Two more list reads took 103 and 88 ms. The stored file dates were unchanged by the reads, so nothing was read again.

## Replayed as automated checks (exit codes)
* `tests/check_forms_c312_field_map.ts`: **57/0**.
* `acceptance/C3.12.test.ts`: **17/0**. AT-3 passes; it failed on main.
* `tests/check_forms_s4_library_browser.cjs`: **113/0**, run through a launch preload that sets the chromium path, with the suite file unchanged. It rewrote 30 tracked screenshots, which I restored with `git checkout --`.
* My walk: run once in full, after two runs that stopped on my own script's selectors before any product finding.

## Break pass (15 min)
* **A guide whose page prints "Date modified".** `finder.ts:566-577` labels it `Guide NNNN (YYYY-MM-DD)` and stores that date in `canadaUpdated`. `ircPublished` then returns `published` set to that month, with `published_from: canada_page`, for a guide (`form-library.ts:133`). The screen hides it (`type !== "guide"`). The suite's "no guide claims one" passes only because the sample guides have no date. **Minor** (review finding 1).
* **A printed month the rule rejects** (future or impossible) is shown as "No edition date printed on it" under a printed edition. This is an edge case, also found by the breaker. **Minor.**
* **The upload result in a combination's form picker** still says "published <file date>" (`components/forms.tsx:67`). That is a different screen. **Minor.**

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every dated form and checklist shows IRCC's month; AT-3 green |
| Next step obvious | 1 | Read-only information; the drawer opens from the number; focus comes back |
| Plain words | ½ | "Not IRCC's date: the file names no date"; the same month is shown in two formats (11-2025, 2025-11) |
| Feedback and state | 1 | Published, none, and the file's date (date, none, not read yet, could not be read) all distinct (J4, J5) |
| Correct data | ½ | Correct on screen; the API gives a dated guide a `published` month with the wrong source (break pass) |
| Error recovery | 1 | Missing file, pipe and unreadable file are kept apart and not read again (57/0); reload is stable (J8) |
| Accessibility and screen sizes | 1 | axe 0 at 5 sizes, list and drawer; keyboard path; no sideways scroll; the date never breaks |
| Speed | 1 | List API 88–103 ms; first view 700 ms; no new query (a regex per edition) |
| Visual quality | 1 | One quiet line under the edition; team tokens; `k3-list-400.png` |
| Trust and sources | 1 | The source is named ("printed on the form" or "canada.ca page, Last updated"); the file's date is kept apart and said to be the file's |

**9 / 10, pass (8 or more, no 0).** To raise it: (1) gate `ircPublished` on non-guides in the API, with a fail test using a dated guide; (2) word the file's date as "File saved 2025-12-15 (the PDF's own date, not IRCC's publication)", or similar.

## Not tested
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). A visible-browser walk: no pane in this sandbox, so it was headless with screenshots. 100 programs (the change adds no query).
