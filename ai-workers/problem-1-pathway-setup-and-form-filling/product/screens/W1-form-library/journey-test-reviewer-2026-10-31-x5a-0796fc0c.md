# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit 0796fc0c

Role: reviewer. This is the one journey score for this check.

## Scope
"Check against canada.ca" opens from two places: ⋯ › Replace with a new edition… on Library › Forms, and ⋯ › Replace edition… on a combination. What this commit changes:
* `fileMonth` takes the label's printed month first.
* The check no longer re-dates the file.
* `checked_at` is written only after the PDF downloads.
* Guides are refused.
* The "check" words say what was found.
* Canada.ca's own bytes clear the finder's new-file marker.
* The audit line names the edition, the checksum and the baseline.

## Setup
* :4452 from `/home/user/x5i` with the recorded copies as committed, for J1–J3, J5, J6 and J8.
* :4454 with canada.ca copies edited by `/tmp/x5rv7-scripts/fx.py` inside the copy's own folder, for J4 and J7:
  * IMM 1295's page reads "Last updated: October 2026" with the same PDF.
  * IRCC's list dates IMM 1295 2026-10-05, then 2026-10-20, and IMM 5257 2026-10-01.
  * IMM 5257's PDF is left out.
* The web was built first. Playwright (Chrome, headless) ran `/tmp/x5rv7-scripts/walk.cjs` and `walk2.cjs`. Screenshots are in `/tmp/x5rv7-shots/` (not committed).
* The sample was loaded with `/demo/load`, as the suite does.
* SQL was used only to set index dates, to play another approved file (J2), an undated file (J3, J8) and the finder's page-month write (J8).
* US$0: no `*_LIVE`, and the ledgers stayed empty. Copies stopped, databases dropped.

## Journeys (configuration author first)
1. **Main, keyboard only.** "IRCC's list says IMM 1295 is newer, but canada.ca still serves my file." Fill, search, Tab to ⋯, Enter, Enter on "Replace with a new edition…".
2. **Other bytes (M13).** "canada.ca serves a different IMM 5257 PDF than mine."
3. **Undated hand upload (M14).** "My IMM 5409 has no canada.ca date." Check it, then check it twice more at once.
4. **Error: canada.ca's PDF cannot be read** (IMM 5257).
5. **Across the screen boundary: Replace from a combination.** On "With an LMIA" › Forms, ⋯ › "Replace edition… (checks canada.ca)".
6. **Wrong role, sizes.** The approver opens the menu. Widths 400, 1024 and 1440, and 1024 at 200 %.
7. **The 6bc5eb72 break: a page edit, then a new edition in the same month.**
8. **Break: an undated file, then the finder's page-month write.**

## What happened
* **J1.** The fill toast says "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library". Newer → toast in 55 ms "IMM 1295 (09-2023) is canada.ca's current file: the same PDF (page last updated 2023-09)." → **Ready**.
  * Database: `canada_updated` 2023-09 (unchanged), baseline 2026-10-15, PDF address recorded.
  * Audit: "Configuration author checked IMM 1295 against canada.ca: the library's file (IMM 1295 (09-2023)) is canada.ca's current PDF.", with sha256, edition and baseline in its detail.
  * axe 0 on Newer and Ready; no console errors. Focus returns to the search box.
* **J2.** Toast: "canada.ca now serves a different PDF for IMM 5257 than the library's file (IMM 5257 (09-2023)); its page was last updated 2023-09. Find again on a combination that uses IMM 5257 downloads it for review…". The row stays Newer, with no baseline. The form is "Not used", so the next step named does not exist for it.
* **J3.** Newer → **Ready**. `canada_updated` stays null (not re-dated), baseline 2026-02-01. Three checks give 1 edition, the same values and 3 audit lines.
* **J4.** Toast: "IMM 5257: canada.ca's form page was read but its PDF could not be downloaded (This page is not in the recorded canada.ca copies…). Nothing changed; try again later." The API answers 409 "canada.ca's PDF could not be read". The row stays Newer, and `checked_at` is unchanged (11:41:39.472 before and after).
* **J5.** Menu: "Redo with AI (find, read, match)", "Replace edition… (checks canada.ca)", "Remove from this combination". The current answer comes in 166 ms, the baseline is 2026-10-25, and axe finds 0 issues.
* **J6.** For the approver, "Replace with a new edition…" is `aria-disabled`. There is no sideways scroll at 400 or 1024. CSS zoom at 200 % clips, so 400 px stands in for it.
* **J7.** Phase A: the fill says "2 with a newer edition on canada.ca (IMM 1295, IMM 5257)". The check says current. `canada_updated` is 2026-10 (from the sample load, with the edited page), baseline 2026-10-05, Ready. Phase B (index 2026-10-20): the fill says "1 with a newer edition on canada.ca (IMM 1295)", and the row reads **Newer** (`j7-B-1295-1440.png`). **Fixed.**
* **J8.** IMM 5409 is relabelled `(13-2025)` with the index at 2026-10-05.
  * The check says current, baseline 2026-10-05.
  * Index 2026-10-20: `newer_file` (right).
  * After `canada_updated = '2026-10'` (what `finder.ts:581` writes): **`ready`**. A false Ready, for undated files only.
  * Control: the same with label `(01-2023)` gives `newer_file`.
* **Guide.** POST check-canada on Guide 5289 gives 409: "Guide 5289 is a guide: the form finder reads it from canada.ca; there is no PDF to check."

## Break it
* **Mutations** (fresh :4455 each): anyfile, lower, maxmonth, redate, noclear and guide are each caught. "early" (`checkedAt` before the download) survives at 63/63.
* **A later baseline is kept:** a stored 2099-01-01 stays 2099-01-01. The audit detail says 2026-10-20 (the index date, not the kept baseline).
* **Wrong role by URL:** the approver gets 403 (6bc5eb72 result; that code is unchanged).
* **Duplicates and race:** three quick checks are idempotent.

## Findings
1. **Should:** J8. `finder.ts:581` writes the page month, which an undated file then takes as its month, so a false Ready follows within that month. Drop the write, or add it to the m34/m35 list in the PR body.
2. **Should:** m39 (nothing recorded as checked when the PDF fails) has no failing test (mutation "early").
3. **Should:** for an unused form, the "check" words should also offer Upload PDF (J2).
4. **Minor:** the audit's `baseline` should be the value kept, not the index date read.
5. **Minor:** J4 nests "This page is not in the recorded copies" inside a PDF message (recorded copies only). There is no running state while a check reads a PDF (live up to 60 s).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J3 and J5 are answered by one check; J2 and J4 leave Newer, with reasons |
| Next step obvious | ½ | J2: "Find again on a combination that uses IMM 5257" for a form no combination uses |
| Plain words | 1 | "canada.ca now serves a different PDF for … than the library's file (…)" |
| Feedback and state | 1 | A failed check moves nothing (J4); toast and row agree. The missing running state is live only (Minor) |
| Correct data | ½ | J1–J7 exact, J7 fixed; J8 undated edge; audit baseline (issue 4) |
| Error recovery | 1 | J4: 409 in words, nothing changed, try again |
| Accessibility and screen sizes | 1 | axe 0 on 3 states; keyboard path; 400, 1024, 1440 |
| Speed | 1 | Check 55–166 ms; fill 221 ms; first rows 0.76 s |
| Visual quality | 1 | Team toasts and pills (`j7-B-1295-1440.png`) |
| Trust and sources | 1 | The PDF address and checksum are recorded, the audit line names the role and the edition; no AI, US$0 |

**9 / 10: pass, no criterion at 0.**

Fixes that raise the low scores, most valuable first:
1. Drop the page-month write at `finder.ts:581` (correct data).
2. Offer Upload PDF in the "check" words for an unused form (next step).
3. Record the kept baseline in the audit (correct data).

## Not tested
* `check_forms_s4_finder` and Find again end to end (need `STUDIO_AI_LIVE=approved`); J8 plays `:581` by SQL.
* Live canada.ca.
* A real screen reader. Browser zoom proper.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
