# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit 6bc5eb72

Role: reviewer. This is the one journey score for this check.

Scope: "Check against canada.ca" (⋯ › Replace with a new edition… on Library › Forms; ⋯ › Replace edition… on a combination) now downloads canada.ca's PDF and compares its checksum with the library's current file. Same bytes: current, re-dated from the page, baseline set, audit line. Other bytes: "check". Also `fileMonth` refusing future months.

**Setup.**
* :4452 from `/home/user/x5i` with the recorded copies as committed: J1–J3, J5, J6.
* :4453 from `/home/user/x5i` with canada.ca copies edited in the copy's own folder (`/tmp/x5rv6b-scripts/fx.py`, checksums re-recorded): J4, J7.
  * IMM 1295's page reads "Last updated: October 2026" with the same PDF.
  * IRCC's list dates IMM 1295 2026-10-05 (then 2026-10-20) and IMM 5257 2026-10-01.
  * IMM 5257's PDF is left out.
* Web built first. Playwright (Chrome, headless): `/tmp/x5rv6b-scripts/walk.cjs`, `walk2.cjs`. Screenshots in `/tmp/x5rv6b-shots/`, not committed.
* SQL only to set index dates and to play another approved file (J2) or an undated upload (J3), as the suite does.
* US$0: no `*_LIVE`, ledgers empty. Copies stopped, databases dropped.

## Journeys (configuration author first)
1. **Main, keyboard only.** "IRCC's list says IMM 1295 is newer, but canada.ca still serves my file." Fill from IRCC's forms list, search, Tab to ⋯, Enter, Enter on "Replace with a new edition…", read the toast and the row.
2. **Other bytes (M13).** "canada.ca serves a different IMM 5257 PDF than mine." Check it, read the words and the row.
3. **Undated hand upload (M14).** "My IMM 5409 was uploaded by hand, with no canada.ca date." Check it.
4. **Error: canada.ca's PDF cannot be read.** Check IMM 5257 when its PDF is missing.
5. **Across the screen boundary: Replace from a combination.** On "With an LMIA" › Forms, ⋯ › "Replace edition… (checks canada.ca)" on IMM 1295. Also a stale version.
6. **Wrong role, recovery.** The approver opens the menu. The author checks the same form three times quickly. Widths 400, 1024 and 1440, and 1024 at 200 %.
7. **Break: a page edit, then a new edition in the same month.** "IMM 1295's page changed on 5 Oct with the same PDF; IRCC then put out a new edition on 20 Oct."

## What happened
* **J1.** The fill toast says "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library." The row reads Newer (`j1-1-newer-1440.png`).
  * Menu: "Replace with a new edition…", "Re-read with AI (fields and boxes)", "See where it is used (1)".
  * Toast in 122 ms: "IMM 1295 (09-2023) is canada.ca's current file: the same PDF (page last updated 2023-09)." The row reads **Ready** (`j1-2-ready-1440.png`).
  * Database: `canada_updated` 2023-09, baseline 2026-10-15, the PDF address recorded. One audit line: "Configuration author checked IMM 1295 against canada.ca: the library's file is canada.ca's current PDF." axe 0 before and after; no console errors.
* **J2.** Toast: "canada.ca shows IMM 5257 last updated 2023-09. Run "Find again" on a combination that uses it…". The row stays Newer and no baseline is written. IMM 5257 is "Not used", so the next step the words give does not exist (`j2-other-bytes-1440.png`).
* **J3.** Newer → toast "IMM 5409 (01-2023) is canada.ca's current file: the same PDF…" → **Ready**. Re-dated 2023-01, baseline 2026-02-01.
* **J4.** Toast (danger): "IMM 5257: This page is not in the recorded canada.ca copies… Upload its new edition's PDF instead, or try again later." The API answers 409 "canada.ca could not be read" (`j4-pdf-failed-1440.png`).
  * The row stays Newer; no baseline, no audit line.
  * `checked_at` still moved 11:09:04 → 11:15:21, so the detail panel says it was checked.
  * The words say "page" for a missing PDF (recorded copies only).
* **J5.** The combination's menu gives the same check: toast "…is canada.ca's current file: the same PDF…" in 135 ms; baseline 2026-10-25. axe 0 on the combination's Forms tab (`j5-combination-replace-1440.png`). Version 99 → 409 "Changed since … Reload to see it." Approver → 403.
* **J6.** For the approver, "Replace with a new edition…" is `aria-disabled`. Three quick checks leave 1 edition, the same dates and 3 audit lines. No sideways scroll at 400 or 1024. CSS zoom at 200 % does not reflow, so it clips; 400 px stands in for it.
* **J7.** Step 1: the fill marks IMM 1295 Newer; the check says current; the file is re-dated **2026-10** (its own month is 2023-09); baseline 2026-10-05; Ready (right). Step 2: IRCC lists 2026-10-20. The fill says "0 new forms listed, 230 already in the library" with no newer form, and the row reads **Ready** on the 09-2023 file (`j7-B-1295-1440.png`). **False Ready.**

## Break it
* **Mutations** (in `/tmp/x5rv6b-mut`, fresh :4454):
  * "nodate" (no re-date in the check): only the M14 re-date assertion fails, and that row still reads Ready. So the re-date is not needed.
  * "anyfile" (match any edition's bytes): survives, 60/60, although it is a false Ready.
  * "lower" (the baseline may go down): survives, 60/60.
* **Wrong role by URL:** 403 for the approver on the check and on Replace. An unknown actor gets 401.
* **Duplicates and race:** three checks in a row are idempotent. Two checks write the same values. The guarded baseline cannot be lowered in the shipped code.

## Findings
1. **Major:** J7, a false Ready. The check's re-date (`form-library.ts:251`) moves the file's month to the page's month, and `newerOnIndex` then ignores the check's baseline within that month. Fix: drop the re-date (the baseline answers M13 and M14 alone) and add the J7 test. `finder.ts:581` shares the re-date.
2. **Should:** a failed check stamps `checked_at` (`form-library.ts:243`, before the download at `:249`).
3. **Should:** "compare with the current file only" and "never lowered" have no failing test (mutations "anyfile" and "lower").
4. **Should:** the "check" words do not say canada.ca's file differs, and they send an unused form to Find again (J2).
5. **Minor:** no running state while a check reads a PDF. "page" is used for a missing recorded PDF.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J3, J5 answered by one check; J2 and J4 leave the row Newer |
| Next step obvious | ½ | J2: "Run Find again on a combination that uses it" for a form no combination uses |
| Plain words | 1 | "…is canada.ca's current file: the same PDF" |
| Feedback and state | ½ | A failed check still shows "checked" (J4); no running state while the PDF downloads |
| Correct data | ½ | J1–J5 exact, one audit line per check; J7 false Ready |
| Error recovery | 1 | J4: 409 in words, row unchanged, Upload or retry offered; stale version and role refused in words |
| Accessibility and screen sizes | 1 | axe 0 on 3 states; keyboard path; 400, 1024, 1440 |
| Speed | 1 | Check 122–135 ms on recorded copies; first rows 0.80–1.30 s cold |
| Visual quality | 1 | Team toasts and pills (`j1-2-ready-1440.png`, `j4-pdf-failed-1440.png`) |
| Trust and sources | 1 | The PDF address recorded, the audit line names the role, no AI, US$0 |

**8.5 / 10: pass, no criterion at 0.** The pass does not override the Major (J7).

Fixes that raise the low scores, most valuable first:
1. Drop the check's re-date, and add the J7 test (correct data).
2. Write `checked_at` only after the PDF is read (feedback).
3. Make the "check" words say the file differs, and offer Upload PDF for an unused form (next step).

## Not tested
* `check_forms_s4_finder` (needs `STUDIO_AI_LIVE=approved`). Find again end to end.
* Live canada.ca.
* A real screen reader. Browser zoom proper.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
