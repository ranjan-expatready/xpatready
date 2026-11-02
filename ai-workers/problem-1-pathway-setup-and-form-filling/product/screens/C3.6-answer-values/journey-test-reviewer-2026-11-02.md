# C3.6 answer values: journey test (reviewer, 2 Nov)

Copy `rev_c36` on :4466, commit 795015d2. Headless Chromium, mostly at 1024 px. Data checked in the database after each journey.

## Journeys
1. **Main.** The author (user-A) opens Questionnaires › "Facts a rule needs that no form asks" for person.travels_with, chooses "A list to choose from", writes the 4 values and proposes the fact. The reviewer (user-C) opens it on To review › Proposals, reads "Answer values · 4" and accepts. Result: the field and its list land, with 2 ADDs WAITING. **Held.**
2. **Alternate.** The author adds Custody by naming the rule (route 2), then Undo. **Held:** the field and its new list are gone.
3. **Reuse.** A third fact with the same codes in another order reuses the live list. **Held:** one list.
4. **Error.** Repeated, empty and one-value lists, values on a yes/no fact, typed codes. **Held:** every one is refused in words and nothing is proposed.
5. **Second person, split decision.** A third person returns the list ADD and approves the field ADD, then the combination is released. **Failed (Blocker):** the returned list is published (review B1).
6. **Second person reads the list.** The third person opens `/review/change/<list ADD>` and the field page. **Failed (Major):** no values are shown on either (review M2).
7. **Recovery across batches.** Accept A (new list), accept B (reuses A's list), Undo A. **Failed (Major):** B points at a list that no longer exists (review M1).
8. **Edit by API.** An edit with duplicate codes gets the wrong words. An edit to yes/no with values is accepted. **Minor** (review m1).
9. **Wrong role.** Covered by the existing decide rules: the accepter cannot approve their own ADD (proposedBy/appliedBy). **Held.**

## Checks
- axe WCAG 2.2 AA: 0 on the open form, 0 on the side panel.
- Sideways scroll: none at 1024 px or 640 px (200 %).
- Page errors: none.
- Accept took about 1.5 s including the panel refresh.
- Not walked key by key; the form uses standard controls.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The author's path works. The approval path ends in a published list that was returned (J5). |
| Next step obvious | 1 | "Answer values, one per line" appears only for a choice, with an example placeholder. |
| Plain words | 1 | The refusals name the value and its place. The one exception is the edit-route wording (m1). |
| Feedback and state | ½ | The returned list keeps showing as RETURNED after it was released. |
| Correct data | ½ | A dangling list key after Undo (M1); a list on a yes/no field through edit. |
| Error recovery | ½ | Undo is unsafe across batches. There is no way to withdraw a returned list. |
| Accessibility and screen sizes | 1 | axe 0; 1024 px and 200 % with no sideways scroll. |
| Speed | 1 | Within the budgets. |
| Visual quality | 1 | Team look; the values list on the panel matches the other panel sections. |
| Trust and sources | ½ | Values are marked Sample and the source names the rule, but the approver cannot see what they approve (M2). |

**Total: 6.5 / 10. Fail** (below 8; no criterion at 0).

Most valuable fixes:
1. Gate the release on the list ADD (B1): raises task, state and trust.
2. Show the values on the list's change page and the field page (M2): raises trust.
3. Make Undo check fields that reuse the list (M1): raises data and recovery.

Not tested: a real screen reader, an intended user's unaided walk (D17/D20), runtime R3 using the list.
