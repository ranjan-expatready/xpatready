# Journey test, reviewer: X5 slice a follow-up (PR #142) at 310acb9c, 31 Oct 2026

**Scope.** Role: reviewer (the one journey score for this check). Only `git diff e849e9e6 310acb9c`: the check reads the current edition (M6), and Show more keeps focus and speaks.

**Copies.** Isolated copy `rvx5g` on :4453 (`P2_LEDGER_DIR=/tmp/rv8/l2`), with the sample loaded and **Fill from IRCC's forms list pressed in the screen** (16 rows, then 237). Copy `rvx5f` on :4452 for check-canada and Replace. The old-line copy `rvx5m` on :4455 ran from `/tmp/rv8/mut`.

**How.** Scripts are in `/tmp/rv8/scripts/` (`j.cjs`, `t.cjs`, `m16.cjs`, `diff.sh`, `rep.sh`, `held.sh`), outside the repo. Each was run twice in headless Chrome. **The sandbox has no visible browser,** so the walk was scripted keys and clicks, not a person's eye. Spend: US$0, no `*_LIVE`.

## Journeys (persona: configuration author, user-A)
1. **Main, keyboard only.** "Page through IRCC's list without a mouse."
   * Steps: Tab to "Show 50 more forms", then Enter until every form shows, then Tab on.
   * Expected: focus on the first new row each time, and the count spoken.
2. **Alternate.** "Search, then page within the search": "IMM", then Show more, then clear.
3. **Widen after all shown.** "No file yet" pressed with 237 rows shown, then off. The list goes back to 50 at once, with no 237-row render.
4. **Narrow below 50 and back.** Guides (4 rows, no pager), then All (the pager comes back).
5. **Recovery.** Open row 51's drawer, then Escape. Also press Enter twice fast on Show more.
6. **Sizes.** 1440, 1024, 720×450 (200 %) and 400 px.
7. **Next step across the boundary: Replace on a combination line.** "Is my line's form still current?" (`POST /combinations/:id/forms/:code/replace`). Run on every line, then with a held copy present.
8. **Data underneath.**
   * check-canada on every form: old line against new, same state.
   * The held copy carrying canada.ca's date: the mark and the row status, read from the database and the list.

## What held
* **J1.**
  * **Focus.** Presses 1–4 put focus on IMM 0017 (row 51), IMM 0248 (101), IMM 5481 (151) and **IMM 5709 (201)**. The last press no longer drops focus to the page.
  * **The count.** The status read 100, 150 and 200 of 237 forms; ARIA snapshot: `status: Showing 50 of 237 forms`, `button "Show 50 more forms"`.
  * **Tab.** Tab from row 51 goes on within row 51.
  * Same result in 2 of 2 runs.
* **J2.** "IMM" gives 50 of 196. Show more puts focus on row 51 (IMM 0193) with the status at 100 of 196. Clearing gives 50 of 237, with focus kept in the box.
* **J3.** From all 237 shown, "No file yet" settles at 50 of 222 in **54–89 ms** (10 timings). **At most 50 rows** were mounted on any frame. Turning it off gives 50 of 237 in 33 ms.
* **J4.** Guides shows no pager. All brings back "Showing 50 of 237 forms".
* **J5.** Enter on row 51 opens the drawer. Escape returns focus to IMM 0017, with 100 rows kept.
* **J6.**
  * No sideways scroll at 1024, 720 or 400 px.
  * axe (WCAG 2.2 A/AA) found 0 after the fill, with all rows shown, and at each size.
  * No console or page errors.
* **J7.** Replace on all 8 lines gives the same answers as the old line: 6 current and 2 not recorded. With a held IMM 5409 copy carrying canada.ca's date and PDF:
  * **The PR** answers `check`, keeps the mark and the row says `newer_file`.
  * **The old line** answers `current` (naming the held copy), clears the mark and the row reads `ready`.
* **J8.**
  * check-canada on all 15 forms gives the same answers, old and new.
  * The suites pass: X5 **32/32**, browser **85/85** twice.
  * The M6 step fails with the old line: 31/32.

## Findings
1. **Minor: a second Enter on Show more opens a drawer (J5).** At a gap of 30, 60, 150 or 400 ms, the second Enter opens the IMM 0017 drawer, 4 of 4. Cause: focus goes to the row's number button (`library-forms.tsx:85-88`).
2. **Minor: the count is not spoken on the last press, or when the pager comes back (J1, J4).** The status lives inside the pager (`:187`): it unmounts on the last press, and it is inserted already filled when going back above 50 rows.
3. **Minor: no check fails when the reset goes back into an effect.** The browser suite passed 85/85 on the mutation.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Fill, page to 237 and open any row, by keyboard |
| Next step obvious | 1 | "Showing 50 of 237 forms" beside "Show 50 more forms" |
| Plain words | 1 | Button and count say "forms" |
| Feedback and state | ½ | Count spoken on change; silent on the last press and when the pager returns; second Enter opens a drawer |
| Correct data | 1 | One current edition: check and Replace identical on real data, correct with a held copy; mutation proves the step |
| Error recovery | 1 | Escape returns to the row; the page keeps its rows; a refetch keeps the limit |
| Accessibility and screen sizes | 1 | Focus on the first added row every press; axe 0 at 4 sizes; no sideways scroll |
| Speed | 1 | Chip from all shown 54–89 ms. Show more median about 145 ms; 3 of 40 at 201–227 ms, only by the paint frame I add |
| Visual quality | 1 | Pager wraps at 400 px (`/tmp/rv8/shots/r1-pager-400.png`) |
| Trust and sources | 1 | "Listed by IRCC", canada.ca page links, US$0 |

**Score: 9.5 / 10. Pass: 8 or more, no 0.**

**Raising it.** Focus the new row itself rather than its button, and keep one status region always mounted.

## Not tested
* **The tools I could not use.** A real screen reader. The finder suite (it needs `STUDIO_AI_LIVE=approved`).
* **The walks only people can do.** An intended user's unaided walk (D17 and D20 stay with the founder).
* **Live services.** canada.ca live (recorded copies only). CI: the job on 310acb9c was refused for billing.
