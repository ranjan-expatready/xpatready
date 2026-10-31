# Journey test: X5 fill hardening (PR #146), reviewer, 31 Oct 2026, commit e466adb1

Role: reviewer. This is the one journey score for this check.

Scope: the fixes for the dc93b60f review:
* the mark when canada.ca's date steps back;
* held uploads;
* "newer" from what this fill set;
* the held-only drawer;
* the count spoken on Clear filters and at drawer open.

**Setup.**
* Isolated copies on :4452 to :4455. Web built with `npx vite build`.
* Playwright (Chrome, headless) script `/tmp/x5rv-e46-scripts/typed.cjs`. API scenarios are in `pending.ts`, `stale.ts` and `repro.sh` in the same folder.
* Screenshots are in `/tmp/x5rv-e46-shots/` and are not committed.
* SQL seeding was used only to move dates and marks for the break pass. Held files are real uploads through `/api/intake`, approved or rejected by a second person.
* US$0, with no `*_LIVE` set.

## Journeys (configuration author first, then the approver)
1. **Main, keyboard only (author).** "Bring IRCC's forms into the library." Tab to Fill, press Enter, read the result.
2. **Held file (author, then approver).** "My PDF waits for a second person; canada.ca's date moves on." Upload, fill, open the drawer, approve, read the row.
3. **Rejected held file.** As journey 2, but the second person rejects the file, and the author uploads again.
4. **Step back.** canada.ca's date goes back, but stays later than the file. Then it goes back to before the file.
5. **Concurrency.** Six people press Fill at once, 3 rounds.
6. **Search and Clear filters (screen reader user).** Type a search that matches nothing, then Clear filters. Also type, open a drawer at once, and press a chip after typing.
7. **Screen sizes.** 1024, 400, and 720×450 (200 % zoom).

## What happened
* **J1.**
  * 16 Tabs reach Fill.
  * Enter gives "Filled from IRCC's forms list: 221 new forms listed (no file yet), 9 already in the library." in 211 ms.
  * axe finds 0 violations (`j1-after-fill.png`).
* **J2.**
  * The IMM 1344 upload is held, and the row reads "Needs your OK".
  * The drawer says "Its PDF waits for a second person on To review: what IRCC accepts is set once that edition is approved." axe finds 0 violations (`j-drawer-needs-ok.png`).
  * Escape returns focus to the IMM 1344 row.
  * The fill marks the form and says no "newer".
  * After approval the row reads "Newer edition on canada.ca": this is the list's rule for an undated hand upload.
  * "Check canada.ca" answers `check` and keeps the mark. A later fill keeps it too.
* **J3.**
  * After the reject, the row reads "No file yet", but the mark stays in the database.
  * A new upload of canada.ca's listed edition (IMM 5710, 09-2023) reads "Newer edition on canada.ca" as soon as it is approved, with no fill in between. **Should.**
* **J4.**
  * IMM 5488 (file 2019-01, marked at 2026-01, index now 2024-10) stays "newer".
  * With the file at 2025-01 the mark is cleared and the row reads Ready.
* **J5.** In each round, all 6 replies are 201, exactly one fill names the form, there is one mark, and no fill creates rows twice.
* **J6.**
  * Clear filters after typing says "Showing 16 of 16 forms" within 200 ms.
  * A chip pressed after typing is said at once.
  * A drawer opened while the count waited says "Showing 1 of 1 forms" at open.
  * Break pass: an edit and its undo inside one deferred render (two input events in one task) leave `typedRef` set. The next Clear filters still says "No form matches" at 200 ms, 5 of 5 times, and is correct by 900 ms. Separate key presses did not reproduce it. **Should.**
* **J7.** No sideways scroll at 1024, 400 or 720@200 %. 0 page errors.

## Findings
1. **Should:** a pending mark outlives a rejected held upload, and the next approved file reads "Newer" (`intake.ts:146` does not clear it; `library-index.ts:62` never clears without a current edition).
2. **Should:** `typedRef` can stay `true` (`library-forms.tsx:138`), so Clear filters (`:204`) waits 700 ms in that case.
3. **Should:** the fill's title filter and its de-duplicated unreadable count (`form-library.ts:178-179`) can be removed with the suite still at 45/45.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Fill, held path, approve and reject all complete |
| Next step obvious | 1 | The held-only drawer names To review and the second person |
| Plain words | 1 | The fill's words and the drawer per PRODUCT §4 |
| Feedback and state | ½ | The stale `typedRef` edge; the mark after a reject |
| Correct data | ½ | Races clean, M8/M9 right; a stale mark after a reject (J3) |
| Error recovery | 1 | Failed load: no count and `data-shown` 0; Try again restores the list |
| Accessibility and screen sizes | 1 | axe 0 ×2; 16 Tabs; focus returns; no sideways scroll at 3 sizes |
| Speed | 1 | Fill 211 ms in the browser |
| Visual quality | 1 | Team look unchanged |
| Trust and sources | 1 | No AI; canada.ca pages linked; held files are never called current |

**9 / 10: pass, no criterion at 0.**

## Not tested
* A real screen reader. The count is set in the same commit as the dialog opens, so whether it is heard is unknown.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Live canada.ca (only the recorded copy).
