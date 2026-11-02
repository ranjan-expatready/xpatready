# K3, C3.12 "Published" is IRCC's month (QA-148): review round 2, 2 Nov 2026

**Reviewer:** I did not build this.
**Commit:** **681fcae6** on the local `k3-published`; the fixes are in `git diff 31bfda94 681fcae6`.
**Inputs:** round 1 (`review.md`, Approve 9/10, 6 Minors and a note) and the breaker (`break-report.md`, 1 Major and 5 Minors).
**Journey score:** **9.5/10, pass.** Report: `journey-test-reviewer-2026-11-02-681fcae6.md`.

## How I checked
* **Copies.** :4443 and :4444, each with a fresh database, live AI off, US$0. Both are stopped, their databases dropped and their var folders removed. The bundle in `web/dist` carries this commit's words.
* **Suites (exit 0).**
  * `check_forms_c312_field_map.ts`: **61/0** (57 plus 4 new).
  * Pack `acceptance/C3.12.test.ts`: **17/0**.
  * `check_forms_s4_library_browser.cjs`: **113/0** (chromium launch preload); the 42 screenshots it rewrote were restored with `git checkout --`.
* **My own walk.** Playwright at 1440, 1024, 400, 512@2x (200 %), and as user-B. I planted a dated guide, `(13-2024)`, `(12-2026)`, `(12-2027)`, a label with no month, and an earlier edition `(13-2018)`.
* **Graph.** `graph.mjs` gives G3 7 and G6 3, unchanged; none come from this diff.
* **Working tree.** Clean apart from my two files.

## Round-1 findings
| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | A dated guide gets an IRCC month in the API | **Fixed** | `published-date.ts:32` (guide gets none); `form-library.ts:133,139` pass the type. Fail tests at `check_forms_c312_field_map.ts:69` (unit) and `:134-136` (API, planted dated guide). That check fails if the gate is removed, so it is no longer vacuous. Walk: Guide 5256 with page 2025-03-14 gives `published null / none`. |
| 2 | The printed-first order is not recorded | **Fixed (record)** | `challenge.md` gives the order, the reason, the 24/24 evidence and the one-line reversal. Remainder, a process step that is not a code finding: put it under "Questions" in the PR body; the tech lead aligns the pack's comment (`C3.12.test.ts:5-7,75`) and closes QA-148. |
| 3 | The file-date wording | **Fixed** | "File saved 2026-06-04: the PDF's own date, not when IRCC published it", "The PDF's own date could not be read" / "is not read yet" / "The PDF names no date of its own" (`library-forms.tsx:55-57`). Browser suite updated (`:121`). |
| 4 | A rejected printed month says "No edition date printed" | **Fixed, with a remainder** | `not_a_month` gives "Its printed edition date is not a real month" in the list and the drawer (J4); unit fail test at `:70`. The remainder is new finding A below. |
| 5 | Earlier editions drop the source and the file date | **Fixed** | "Earlier edition (06-2018) · published 2018-06 (printed on the form) · file saved 2019-04-18"; `(13-2018)` reads "its printed edition date is not a real month" (`library-forms.tsx:365`). |
| 6 | The form picker's upload says "published <file date>" | **Fixed** | `components/forms.tsx:67` says "file saved …"; no other `published ${…}` remains in `web/src`. Read, not walked. |
| 7 | Note: the drawer's unread/unreadable words are tested through the API only | **Open (note)** | Unchanged. My walk saw them right. |

## Breaker findings
| Breaker | Status | Evidence |
|---|---|---|
| M1 a guide claims an IRCC month | **Fixed** | As round-1 #1 |
| m2 a rejected printed month reads "No edition date printed" | **Fixed, with a remainder** | As round-1 #4; future months: finding A |
| m3 the canada.ca fallback borrows another file's page date | **Fixed where it showed** | A label that prints a month that is not real no longer falls back (`published-date.ts:34-39`; walk: `13-2024` with page 2023-09 gives "not a real month"). Acceptable remainder: a label that prints no month still uses the page month without a checksum check (`finder.ts:785`). That is the pack's own fallback, and the reader always writes `(MM-YYYY)`. |
| m4 earlier editions | **Fixed** | As round-1 #5 |
| m5 "published" in intake | **Fixed** | As round-1 #6 |
| m6 the order is not recorded | **Fixed (record)** | As round-1 #2 |

## Regression check
* **List.** At 1440, 1024, 400 and 512@2x:
  * no sideways scroll;
  * the date is one line box;
  * axe WCAG 2.2 AA finds 0 violations;
  * no console or page errors;
  * first view in 330–650 ms.
* **Drawer.** At every size, axe finds 0 violations on 3 drawers (IMM 1295, IMM 5604, IMM 5257). Enter opens it, and Esc returns focus to the row's button.
* **Roles.** user-B sees the same dates with "View", read-only.
* **Pack.** `acceptance/C3.12.test.ts` 17/0 with AT-3 green; the s4 browser suite 113/0.
* No other reader of `published_state` is broken: the new value `not_a_month` is typed in the page's `Row` (`library-forms.tsx:25,31`).

## Remaining findings
**A. Should (Minor). A printed month after this one is said as "Published".**
* `published-date.ts:38` accepts any month up to December of next year, while its comment says "a month printed for next month". On 2 Nov 2026, the planted `IMM 5409 (12-2027)` reads "Published 2027-12": an IRCC publication 13 months in the future.
* `fileMonth` (`library-index.ts:31`) rejects the same label for the row's status, so two rules still read one label in one row.
* Planted only: IRCC prints past months.
* Fix: cap at next month, to match the comment and the `:71` test, or say "printed 12-2027 (a future month)". It can also be listed in the PR.

**B. Note.** The drawer's unread/unreadable words are tested through the API only (round-1 note 7).

## Could not check
* A real screen reader.
* A visible (headed) browser.
* An intended user (D17, D20).
* The form-picker upload walked in the browser.
* Live canada.ca pages.
* 100 programs.

**Verdict: Approve.** No open Blocker or Major. Remaining:
1. Minor A: cap the printed month at next month (`engine/published-date.ts:38`), or list it in the PR.
2. Process: put the printed-first order under "Questions" in the PR body, for the tech lead to align the pack's AT-3 comment and close QA-148.
3. Note B: the browser suite could check the drawer's unread/unreadable words.
