# Journey test: QA-196 on To review (reviewer role), commit b8a00b8ef, 3 Nov

Tester: the reviewer, a fresh agent. Isolated copy `rvqa196` on :4441 with a fresh database. The web bundle was rebuilt and the state seeded by `tests/check_forms_c34_ai.ts`. Headless Chrome via Playwright (`scratchpad/walk.cjs`, not committed). Live AI off, US$0. Screenshots were saved to the session scratchpad (`shots/1-…6-…png`) and are not committed.

## Journeys
1. **Main: content reviewer (user-C) accepts a guide check.** To review › "Temporary residence › Visitors › Visitor visa" › Ready › "The passport number is given as shown on the passport" › Open (keyboard: focus, Enter) › Accept. Expected: it lands on the draft as a check that warns when the passport number is missing.
2. **Alternate: an edition's own form check.** To review › IMM 5257 (09-2023) › Decide › "When a criminal offence is declared, its details are given" › Open. Expected: no Accept, a clear reason, Reject offered.
3. **Recovery: Undo straight after Accept.** Expected: the item waits again and the draft is as it was.
4. **Error: an edit that reads a question the library does not have** (API, as in the suite). Expected: 409 in words, nothing lands.
5. **Across the boundary: the landed check in the combination's draft preview** (the next screen's data). Expected: it fires only on wrong answers.
6. **Wrong role:** the author's own "add a section check" door compared with the queue door, for user-C.
7. **Break:** accept, Undo, accept again. Look for a duplicate.

## What happened
- J1: groups load in 190-280 ms. The panel shows both readings, the guide's words ("found in the file"), 4 rules passed, Reject and Accept. After Accept the toast reads "Undo is offered for 9 more seconds". **But user-C holds no author duty and still changed the combination draft** (J6: the same person gets 403 on `POST /combinations/:id/checks`).
- J2: works as intended. Shown in Decide, a "Not accepted here yet" notice, Reject only (screenshot 2). The row's "Why a person looks" says "Both readings agree", and "Adds or reuses" says "New library item", which contradicts the reason. The notice title repeats its own first words.
- J3: "Undone: 1 proposal waiting again." **The check `AI-SC-01-hh7` stays in the Visitor visa draft** (database read after Undo).
- J4: 409, "The check's condition does not fit the library: reads person.not_in_the_library, which is not in the library. Add that question to the library and draft the guide again, or reject it." Nothing lands. This is clear, plain and gives a next step.
- J5: **inverted.** Preview with the passport number answered fires the check (warn section_check, which blocks "ready to file"). Preview with no answer fires nothing.
- J7: three identical checks end up in one draft. The author's door refuses a second copy ("This check is already in the draft.").
- Console: one 404 after the group's last item was decided. That is by design ("Nothing waits in this group any more"). No page errors.
- Accessibility and sizes: axe WCAG 2.2 A/AA found nothing on the edition group, the form-check panel or the guide panel. No sideways scroll at 1024 or 400 px. The main path works from the keyboard (focus Open, Enter, Tab to Accept). I ran each walk 3 times; it was stable.

## Score (reviewer role)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The check lands, but it does not do what it says (J5) |
| Next step obvious | ½ | J2 says "keep it or reject it", but the row reads "Both readings agree" and there is no Keep action |
| Plain words | ½ | Refusals are clear. "New library item" and "shared library" on an item that has no library home |
| Feedback and state | ½ | The toasts are clear, but "Undone" while the check stays is a false state (J3) |
| Correct data | 0 | Inverted condition (J5). Orphan row after Undo (J3). Duplicates (J7). Group and severity lost (review M2) |
| Error recovery | ½ | The 409s give a next step. Undo does not take the change back |
| Accessibility and screen sizes | 1 | axe clean on 3 states. 400, 1024 and 1440 px without sideways scroll. Keyboard path works |
| Speed | 1 | 190-280 ms queue load. Accept under 1.2 s including a fixed wait |
| Visual quality | 1 | Team components, the notice in the warn tone, consistent with the other panels |
| Trust and sources | ½ | AI marked, quote shown. The panel says "Sample until the expert confirms" and the reading says "(block)", but the item lands as non-Sample warn |

**Total 6/10, with a 0 (Correct data). Fail.**

Fixes that would raise the score, most valuable first:
1. Store the fire condition, the negated tree (Correct data, Task completed).
2. Undo removes the landed check, and the same check is refused twice (Correct data, Feedback, Recovery).
3. Keep the group, severity and Sample label (Trust).
4. Require the author duty.
5. Show `accept_why` in the Decide row and drop "New library item" for edition checks (Next step, Plain words).

## Not tested
A real screen reader. An intended user walking it unaided (D17/D20 stay with the founder). A real saved AI answer (none exists). Only the reviewer persona; an author persona would see the same panel.
