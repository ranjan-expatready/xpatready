# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit 63d2ba6d

Role: reviewer. This is the one journey score for this check.

Scope: "Newer edition on canada.ca" judged by the dates plus the date last seen current for each file (`newerOnIndex`, `fileMonth`, `form_edition.index_date_seen_current`). Also: "Check against canada.ca" setting that date, and the migration that replaces `gov_form_def.newer_on_index_at`.

**Setup.**
* Copies:
  * :4452 and :4453 from `/home/user/x5i` (API scenarios and the migration).
  * :4454 (journeys) and :4455 (browser suite) from a `git archive 63d2ba6d` copy in `/tmp/x5rv63-mut`.
  * All are stopped and their databases dropped.
* Playwright (Chrome, headless) script `/tmp/x5rv63-scripts/walk.cjs`; screenshots in `/tmp/x5rv63-shots/` (not committed).
* To show a real page edit, J2 changed the /tmp copy's recorded canada.ca. In IRCC's list and on IMM 1295's page, 2023-09 became 2026-02, with the same PDF and checksums updated. It was restored byte-identical afterwards (`diff -rq` clean).
* SQL was used only to set old marks for the migration and to place a held copy (J4).
* US$0: no `*_LIVE`, ledgers empty.

## Journeys (configuration author first)
1. **Main, keyboard only: the check answers.** "IRCC's list says IMM 1295 is newer than my file; canada.ca's page says mine is current." Search, Tab to ⋯, Enter, Enter on the item, read the notice and the row.
2. **A real page edit.** "IRCC moved IMM 1295 to 2026-02, but the PDF is the same." Fill, read the words and the row, run the check, read what to do.
3. **Old marks after the upgrade.** "We marked these Newer before; are they still?" Run the migration on a library with 5 marked forms.
4. **A held file during a check.** "A second copy waits for approval; does the check vouch for it?"
5. **Next screen.** Follow the notice's hand-off to Find again on "With an LMIA".
6. **Screen sizes and zoom.** 400, 1024 and 1440, and 1024 at 200 %.

## What happened
* **J1 (:4454).**
  * Row before: "Newer edition on canada.ca".
  * Menu items: "Replace with a new edition…", "Re-read with AI…", "See where it is used (1)".
  * The notice says "IMM 1295 (09-2023) is still the current edition on canada.ca (last updated 2023-09)."
  * The row turned **Ready**, and the database baseline is 2026-02 on that edition only.
  * Focus returned to "Actions for IMM 1295". axe 0 before and after. No console or page errors.
* **J2 (:4454, the edited recording).**
  * The fill says "…230 already in the library, 1 with a newer edition on canada.ca (IMM 1295)." The row reads Newer.
  * The check's notice (`j2-page-edit-1b-message-1440.png`) says "canada.ca shows IMM 1295 last updated 2026-02. Run "Find again" on a combination that uses it to download it: a newer edition goes to edition review, the same edition from a new file is marked for you to replace."
  * The row stays Newer and no baseline is written.
  * The notice and the row agree, but the words do not say what happens with the *same* file (Find again re-dates it).
* **J3 (:4453).**
  * The old column is gone. IMM 5257, IMM 5488 and Guide 5289 read Newer. CIT 0001 (no file) reads "No file yet". IMM 5409 (no mark, later index) reads Newer.
  * IMM 1295 (label 09-2023, no canada.ca date, marked, index 2023-09) reads **Ready**, although the migration's note says marked forms keep reading Newer.
* **J4 (:4452).** A held "IMM 5257 (02-2025)" copy kept no baseline while the checked current file got 2026-03-01.
* **J5.** With saved answers (US$0) the finder stopped at step 1: "No application page could be chosen. Choose it on the combination's Forms tab." So the re-dating was not reached end to end.
* **J6.**
  * No sideways scroll at 400 or 1024.
  * The 1024-at-200 % shot used CSS zoom, which does not reflow, so it clips the header. The 400 px view stands in for it.

## Break it
* **Mutations**, each against a fresh copy:
  * Caught: dated baseline from a fill; earlier month; the list ignoring the baseline; the check using the page date.
  * Survived: the check writing every edition of the form (59/59), and dropping the fill's where-null guard (59/59).
* **Two fills and a check at once:** they write disjoint editions (the check only dated files, the fill only undated ones), so there is no lost update.
* **Wrong role, duplicates, hostile titles:** unchanged since 89cccd71. The suites pass, including "nobody cannot fill (401)" and the author-only Fill button.

## Findings
1. **Should:** one check cannot answer J2, and cannot answer a hand upload with no canada.ca date. The only path is Find again (J5), and a byte-identical re-upload re-dates nothing. Fix: the check compares the PDF bytes when the dates differ (review issue 1).
2. **Should:** "the baseline is the checked file's own" has no test that fails without it (J4 holds only because the code is right). Review issue 2.
3. **Should:** the migration note versus J3's IMM 1295 (review issue 3).
4. **Minor:** the check response returns internal ids. There is no audit line for the Newer → Ready change. A 500 is possible if the edition is deleted during a check.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 answered by one check; J3 marks carried; J4 held copy untouched |
| Next step obvious | ½ | J2: the notice sends to Find again with words for a new edition or file, not the same file; the check sits under "Replace with a new edition…" |
| Plain words | 1 | Words per PRODUCT §4; the tooltip now says "since it was last checked" |
| Feedback and state | 1 | Notice and row agree in J1 (Ready) and J2 (Newer) |
| Correct data | 1 | Baseline on the checked edition only; no duplicate; no false Ready found |
| Error recovery | ½ | J2 and undated-date uploads: only Find again, which needs a combination and a finder run |
| Accessibility and screen sizes | 1 | axe 0 ×4; keyboard path with focus return; 400, 1024, 1440 |
| Speed | 1 | First rows 1.19–1.23 s cold; check notice by 1.27 s; fill under 300 ms in the suite |
| Visual quality | 1 | Team look; the pill and the notice read clearly (`j2-page-edit-1b-message-1440.png`) |
| Trust and sources | 1 | canada.ca dates and links shown; no AI; US$0 |

**9 / 10: pass, no criterion at 0.** One fix would raise both ½ scores: the check compares the PDF bytes and re-dates the same file, so one check answers J2. Short of that, the "check" words could name the same-file case.

## Not tested
* Find again re-dating the same file end to end (J5 stopped at step 1; no live AI).
* Live canada.ca.
* A real screen reader. Browser zoom proper (CSS zoom only).
* An unaided walk by an intended user (D17 and D20 stay with the founder).
