# Journey test (reviewer): X5 slice c "remember a deletion", commit 00007dd0, 31 Oct 2026

**Setup.** Isolated copy `rv5cw` on :4452 with a fresh database. Headless Chromium 1243 through Playwright, with axe 4.14 on the tags the suite uses (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa). US$0, no `*_LIVE`.
**Files outside the repo.** Scripts `/tmp/x5cscripts/walk.cjs`, `focus.cjs` and `side.sh`; screenshots `/tmp/x5cscripts/shots/`. Afterwards the copy was stopped and its database dropped.
**Runs.** The main and keyboard paths ran twice, once in `walk.cjs` and again in `focus.cjs`, with the same result. Setup (sample load, fill, delete, approve) went through the API, because those steps were walked in the 02ca83a5 round. Everything new was walked in the browser.

## Journeys (persona · goal · result)
1. **Main path.** Configuration author: "IMM 0008 SCH4 was deleted by mistake; bring it back." **Held.**
   * "Deleted from the library (2)" sits under the table, with "IMM 0008 SCH4 deleted 2026-10-31, approved by Approver" and a List again button.
   * Pressing it brings back the toast "IMM 0008 SCH4 is listed again (no file yet). Find again on a combination, or upload its PDF, to add its file." in about 0.5 s. The row is back as "no file".
2. **Keyboard only.** **Held, with two findings.**
   * Tab reaches List again (284 Tabs at 50 rows), the focus ring is visible, and Enter works.
   * Afterwards focus falls to `<body>` (Should B), including when the last item empties the section.
3. **Empty state.** **Held.** With no deletion, the section is not shown.
4. **Error: a form that is not remembered.** **Held.** List again returns 404 "… is not among the forms deleted from the library." A form IRCC does not list gets "will be listed again when IRCC's forms list includes it" (by reading the code).
5. **Wrong role.** **Held.**
   * Approver: sees the section without buttons; a POST returns 403.
   * Case officer and Client A: no section; 403.
   * No actor: 401.
6. **Recovery.** **Held.** A double click on List again sends one request (one `restored` audit line). The button is busy while it works.
7. **Alternate: another spelling, and the schedule DEP.** **Held.** `imm0008sch4` returns 201, and IMM 0008 DEP comes back the same way. These are the forms that could never come back at 02ca83a5.
8. **Across the boundary: the next fill.** **Held.** After List again, a fill treats the form as "already in the library" and leaves nothing out. The fill's words point to "List again" under the table.
9. **Break: List again with other new forms on IRCC's list.** **Under-reports (Should C).** The toast names one form; the audit says "6 new forms listed", and the library grew by 6.

## Data underneath
* Memory row removed. The form row exists once with `listed_on_index_at` set.
* Audit: one `restored` line (author, code), then one `filled` line with matching counts.
* `remembered_deletions` in the list response matches the database.
* Mutants (see the review): each new rule's check fails when the rule is removed. The one exception is the sample load's forget, which is older.

## Accessibility and sizes
* axe on the section, author view: **1 violation, `label-content-name-mismatch` ×2** (Major A, WCAG 2.5.3). The visible "List again" is not inside the name "List IMM 0008 SCH4 again" (`library-forms.tsx:259`).
* axe on the approver view: clean.
* Sideways scroll: none at 400, 1024 and 1440 px, nor at 512 px (200 %). Screenshots: `deleted-400/1024/1440.png`, `focus-1024.png`.
* Semantics: the section is labelled by an h2 "Deleted from the library (n)"; items are a list; buttons are real buttons with a busy state. The toast is announced through the status region.

## Break (15 min)
| Finding | Severity |
|---|---|
| axe label-in-name on List again | Major |
| Focus lost after List again | Minor (Should) |
| Toast under-reports the fill | Minor (Should) |
| The memory is forgotten before the fill, outside one transaction | Minor |

Held: double click, wrong role by URL, a lower-case number, a second List again (404), the approver re-deleting and the author listing again.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every deleted number, schedules included, comes back by List again (journeys 1, 7) |
| Next step obvious | 1 | The fill's words name "List again" under the table; the toast names the next step for the file |
| Plain words | 1 | "Deleted from the library", "approved by Approver", "List again" |
| Feedback and state | ½ | Busy state and toast; focus lost (B); the toast hides the other forms the fill listed (C) |
| Correct data | 1 | Memory removed once, form once, audit lines match, the race is tested |
| Error recovery | 1 | A wrong delete is now undoable by an author; 404 in words |
| Accessibility and screen sizes | ½ | axe violation on the new state (A); widths and the focus ring are fine |
| Speed | 1 | List again about 0.5 s; fill 93 ms |
| Visual quality | 1 | Team chips and a secondary button; reads cleanly at 400 px (`deleted-400.png`) |
| Trust and sources | 1 | Who approved and when are shown; no AI, US$0 |

**Score: 8.5/10, pass (8 or more and no 0).** The review verdict is still Block, because of Major A.
**What would raise the low criteria, most valuable first:**
1. Make the accessible name contain "List again" (A), and add a browser step with axe on the section.
2. Return focus after List again (B).
3. Make the toast say when the fill listed other forms too (C).

**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); canada.ca live; Find again's add-back in a browser (covered by the API suite).
