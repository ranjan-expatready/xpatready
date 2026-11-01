# Journey test, reviewer: C11.9 round 4 (commit 6b3b8cbd, 1 Nov)

Isolated copy `b5crev5` on :4469, sample inputs loaded, web built from 6b3b8cbd. Headless Playwright (Chrome), 1440 px unless stated. US$0, no AI. Review: `review-c119-r4.md`.

## Journeys
1. **Main: author sets the filing order** (configuration author). Goal: "IMM 5257 SCH1 is filed first." Open a combination's Forms tab, choose Change the filing order, move a form, Save to draft. Expected: the draft and the tab's list show the new order, with an audit line.
2. **Alternate: author deletes their own new document type** (author). Goal: "I named a type by mistake; remove it." Name a new type on a checklist line, remove the line, user-B returns it, then Shared library › Document types › Delete, then Undo. Expected: deleted at once with Undo, and Undo brings back the returned change as it was.
3. **Alternate: author removes their own new section** (author). The section still waits on To review. Sections › its row action. Expected: deleted at once, or withdrawn.
4. **Wrong role:** the approver on the Forms tab, and their direct reorder call. Expected: no control, 403.
5. **Error:** a reorder with a form missing or listed twice. Expected: 400 in words, nothing changed.
6. **Race (break):** section retire approved while an author chooses that section (40 staggered rounds). Expected: never retired and still chosen.
7. **Recovery:** Undo of a field whose question's section was retired meanwhile. Expected: refused in words, nothing back.
8. **Across the boundary:** the saved order reaches the draft snapshot (`/config?mode=draft` forms order).

## What held
* J1: keyboard-only. I reached "Move IMM 1295 down" with Tab, pressed Enter, then Tab to Save and Enter. The toast "Filing order saved to the draft" came in 61 ms. `form_order` = IMM 5257 SCH1, IMM 1295, … and the audit line "set the filing order of "With an LMIA"'s forms (draft): …". The tab's list shows the new order. Forms tab ready in 1.1 s. axe clean. No sideways scroll at 1024, 720 or 400 px. No console or page errors.
* J4: the approver sees no control, and a direct call gets 403. J5: 400 "The filing order lists every form … once. Missing: IMM 1295. Nothing changed." / "One is listed twice."
* J6: 0 bad in 40 rounds (27 refused 409). With the lock removed: 7 bad in 40, so the fix is real, but the suite's own test stays green without it.
* J7: 409 "Its question's section … is retired now: restore that section first. Nothing was undone."
* J8: the API suite and the browser step read the order back from the draft snapshot.

## Findings
* **Major (J2):** the Document types row shows "New: waiting for a second person" and a **disabled Delete** ("Its addition waits on To review: decide it there first."), although `GET …/uses` says `immediate:true`. Only a direct call can delete it (`web/src/pages/library-item-actions.tsx:62`). Screenshot `/tmp/r4j/m4-doc-row.png`.
* **Major (J3):** the Sections row offers Withdraw. Withdraw with a reason → "Only a new shared field that is waiting or returned is withdrawn." It is a dead end (`api/src/library-items.ts:212`, `api/src/library-changes.ts:163`). Screenshot `/tmp/r4j/m4-section-withdraw.png`.
* **Major (J2, by API):** after Undo the returned ADD reads `RETURNED` with no decider, no date and no note. "Use the existing type." is gone from the change (`api/src/library-items.ts:256`).
* Minor (J1): focus drops to `<body>` after Change the filing order opens and after Save (`web/src/pages/workspace/forms.tsx:404,406`).
* Minor (J2): a returned change is called "waiting for a second person".

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1 done, but J2 and J3 cannot be done on the screen |
| Next step obvious | ½ | Delete greyed with a To review reason that does not fit, and Withdraw leads nowhere |
| Plain words | ½ | Refusals are in words, but "returned" is said as "waiting" |
| Feedback and state | 1 | toast, row note, list reorders, Undo toast |
| Correct data | ½ | order and audit exact, but Undo wipes the return decision |
| Error recovery | ½ | J5 and J7 clear, J3 a dead end |
| Accessibility and screen sizes | ½ | axe clean, keyboard path works, widths fine, but focus is lost twice |
| Speed | 1 | 1.1 s tab, 61 ms toast |
| Visual quality | 1 | shared pattern: Up/Down ghost buttons, numbered list |
| Trust and sources | 1 | no AI on this path, audit lines, origin pills kept |
| **Total** | **7/10** | below 8: fail |

Fixes that raise it, most valuable first: (1) an own new type or section gets Delete on its row (task, next step, recovery); (2) restore the full ADD decision on Undo (data); (3) keep focus on open and Save of the filing order (accessibility); (4) "Returned to you" words for a returned ADD (words).

## Could not test
A real screen reader, a headed walk, an intended user's unaided walk (D17 and D20 stay with the founder). The section journey (J3) used a section and ADD planted with SQL, shaped as `landSection` writes them (`api/src/proposals.ts:169-170`). J2 used the product's checklist-line route.

**Verdict: fail, 7/10** (no criterion at 0).
