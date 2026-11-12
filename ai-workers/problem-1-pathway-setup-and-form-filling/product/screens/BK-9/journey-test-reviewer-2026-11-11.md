# BK-9 journey test (reviewer, 11 Nov): shared-filing changes on any pathway

Commit `c920937f1`. Copy `rv_bk9` on :4437, configured checkpoint, live AI off, US$0. Headless Chromium (the bundled `/opt/pw-browsers/chromium`).
* Cases were opened through the product's routes; every change was made in the People and filings table.
* The script is kept in my scratchpad (`/tmp/claude-0/-home-user-xpatready/1948601d-b747-55a3-a3f8-561a91efceee/scratchpad/bk9/journey.cjs`), with its screenshots in `…/bk9/jshots/`. They are not committed.
* It was run twice: same results both times, no flakiness.

## Journeys (persona: case officer)
1. **Main path, keyboard only, 1440 px.** Express Entry family (principal, spouse, child). "Make the spouse the principal, she holds the job offer."
   * ⋯ on the spouse, then Enter, then Make principal…, then Tab to Why?, then Make principal.
   * Expected: the one application moves to the spouse, nothing else stops.
2. **Undo** of journey 1, from the banner.
3. **Alternate, mouse, 1024 px.** Study permit (student and child): "The child is not travelling this term": Remove filing…, then Add filing back… on the same child.
4. **Error:** apply with no reason.
5. **Error:** another tab adds a child between the preview and the apply (stale).
6. **Recovery:** open Add filing back…, then reload.
7. **Sizes:** the dialog at 400 px and at 720 px (200 % of 1440).
8. **Wrong role:** the client (user-P) asks for the preview.
9. **Across the boundary:** the rows and readiness after the change (the Prepare application view, same filing).

## What held
* **Journey 1.**
  * The menu item is focused with ArrowDown.
  * The preview shows in 76 ms with: "This changes 1 other person's application too", "Sample Principal J · on Sample Spouse J's application: Now on Sample Spouse J's application (the same application, its items and fees kept)" and "The family's application is now Sample Spouse J's".
  * Apply with the refetch took 1.36 s. The banner reads "Sample Spouse J is now the principal applicant." with Undo.
  * The rows update ("Made principal Nov 11 by Case officer (Sample): …"), and focus returns to "Actions for Sample Spouse J".
  * Data underneath: the same filing id, owner = spouse, 1 `filing_change` row, 1 audit event.
* **Journey 2:** Undo re-keys the filing back to the principal. Still one row.
* **Journey 3:**
  * Remove: the title is "Take Sample Kid J off as travelling on Sample Student J's application?", with lines saying the child is declared only and "7 items stop applying". The row then reads "Declared only on Sample Student J's application (not travelling)" with the reason.
  * Add back: the title is "Add Sample Kid J back as travelling…".
* **Journey 4:** "Write a reason: it is kept with the change." shows at the field.
* **Journey 5:** "Changed since you opened this… nothing was changed. What changes now is shown below." The second apply succeeds.
* **Journey 6:** after the reload nothing changed (`applies` still false).
* **Journey 7:** no sideways scroll at 400, 720, 1024 or 1440 px, and the dialog fits. axe (WCAG 2.2 A/AA) found no violations on the dialogs at 1440 and 1024 px.
* **Journey 8:** 403 "Only the case officer can do this."
* Console: only the expected 409 of journey 5. No page errors.

## Break-it pass
* Race: 6 rounds of 2 identical applies plus 6 prepare reads at once. Result: 42×200 and 6×409, one filing row, no duplicate items.
* Long chain: Make principal, Undo, Remove spouse, Add back, Remove child, Make principal, Add child back. The same filing id throughout and items reused.

## Findings (details and file:line in `review.md`)
* **Major:** the hand-signed form warning for a minor is missing on a shared application (Express Entry vs Visitor visa control), `api/src/filing-changes.ts:106-108`.
* **Major:** a Family sponsorship co-filer's Add filing back is accepted (200, writes a change and flips `applies`), and their Remove filing gets "not travelling" words. The co-filed rule sits after the `applies` check, `engine/runtime/filing-changes.ts:55-59`. API only (the screen hides the menu).
* **Minor:** the Ready to file reset is missed when two changes run with no prepare read between them, `api/src/filing-changes.ts:114,146-147`.
* **Minor:** the banner says "Sample Kid J's filing removed." for a shared application (`:151`).
* **Minor:** a child with their own added study permit filing gets an Add back title naming the student's application (`:75-77`).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 done on screens, on Express Entry and Study permit |
| Next step obvious | 1 | One named action per row; Undo in the banner |
| Plain words | ½ | Banner "…'s filing removed"; "filing" and "application" mixed in one dialog; contradicting Add back title (journey 3, probe D3) |
| Feedback and state | 1 | Banner, Undo, reason on the row, stale message |
| Correct data | ½ | A co-filer's Add back is accepted; Ready to file can stay set (API order) |
| Error recovery | 1 | Journeys 4–6 |
| Accessibility and screen sizes | 1 | Keyboard path, axe clean, 400/720/1024/1440 px |
| Speed | 1 | Preview 76 ms; page ready 1.09 s; apply 1.36 s including the refetch |
| Visual quality | 1 | Team dialog and table (j2-sp-remove-1024, j3-ee-dialog-400) |
| Trust and sources | ½ | Fees cited and labelled Sample; the preview omits the hand-signed warning on shared applications |

**8.5/10, pass on score with no 0.** The check still blocks on the two Majors (see `review.md`).

Fixes that raise the low criteria, most valuable first:
1. Count the child's signed scans by item subject.
2. Refuse co-filers before the `applies` checks.
3. Word the banner and the Add back title from the person's place.

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A headed (visible) browser: this sandbox only runs headless Chromium.
