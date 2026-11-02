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

## Round 2 (b09bad01)
Same copy on :4466, re-walked by script and headless Chromium. Data was checked in the database after each journey.
- J5 split decision (now: return the field): **held.** The combination approve is refused in words. Field and list stay DRAFT. Withdraw removes both. With the field approved, the field and its list release together.
- J6 second person reads the list: **held.** The change page shows the values and whether the list is new or existing. axe 0 at 1024, 640 (200 %) and 400 px, no sideways scroll, no page errors.
- J7 recovery across batches: **held for fields** (a draft list is never reused by a field). **Failed across kinds:** a form's list accepted as reuse of a C3.6 draft list is left dangling by Undo (review R2-M1).
- J8 edit by API: **held** on route 1. Route 2 can still land a choice with no list (m-r2a).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Author, reviewer and approver paths, and both release routes, work. |
| Next step obvious | 1 | Unchanged. |
| Plain words | 1 | Release refusal and value refusals are in words. |
| Feedback and state | 1 | "(new list, approved with this field)" on the change page. |
| Correct data | ½ | R2-M1 dangling list key; m-r2a choice without a list. |
| Error recovery | ½ | Undo can orphan a form's accepted list (R2-M1). |
| Accessibility and screen sizes | 1 | axe 0; 400/1024 px and 200 % with no sideways scroll. |
| Speed | 1 | Within the budgets. |
| Visual quality | 1 | Team look; values shown in the existing definition list. |
| Trust and sources | 1 | The approver sees what they approve; values are Sample. |

**Total: 9 / 10. Pass** (no 0). Most valuable fix: R2-M1 (raises data and recovery).
Not tested: a real screen reader, an intended user's unaided walk (D17/D20).

## Round 3 (c0d427e6, reviewed at 7d5d3d54)
Same copy on :4466, scripts and headless Chromium. Data was checked in the database.
- J7 recovery across batches: **held.** A form's list no longer reuses a riding draft list, and Undo leaves nothing dangling.
- J8 edit by API: **held** for "a choice needs values" on both routes. An edit can still drop the value the rule compares (review m-r3a, API only).
- J6 second person reads a long list: the values scroll in a 212 px box and Approve is in view. **axe flags the scroll box** (`scrollable-region-focusable`, review R3-M1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Unchanged. |
| Next step obvious | 1 | Unchanged. |
| Plain words | 1 | The rule-value refusal names the rule, the value and the codes. |
| Feedback and state | 1 | "400 values · a new list, approved with this field" / "a released list". |
| Correct data | 1 | R2-M1 and R2-M2 closed on the screen paths. |
| Error recovery | 1 | Undo across kinds is safe. |
| Accessibility and screen sizes | ½ | axe serious issue on the long list (R3-M1); no sideways scroll at 400/1024 px or 200 %. |
| Speed | 1 | Within the budgets. |
| Visual quality | 1 | The list matches the panel's list style. |
| Trust and sources | 1 | Unchanged. |

**Total: 9.5 / 10. Pass.** Most valuable fix: make the scroll box focusable and give it a name (R3-M1).

## Round 4 (285f45e2)
Fresh copy on :4466, scripts and headless Chromium. Data was checked in the database.
- J6 second person reads a long list (400 values): axe 0 at 1024, 640 (200 %) and 400 px. Keyboard: Tab reaches the named list, the focus ring shows, and the arrow keys scroll it. **Held.**
- J8 edit by API: an edit that drops the value the rule compares is refused in words on both add routes; an edit that keeps it lands. **Held.**

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Unchanged. |
| Next step obvious | 1 | Unchanged. |
| Plain words | 1 | Refusals name the rule, the value and the codes. |
| Feedback and state | 1 | Unchanged. |
| Correct data | 1 | m-r3a and m-r3b closed. |
| Error recovery | 1 | Unchanged. |
| Accessibility and screen sizes | 1 | R3-M1 closed: axe 0 on the long list at all three sizes; keyboard scroll works. |
| Speed | 1 | Within the budgets. |
| Visual quality | 1 | The focus ring matches the app's ring. |
| Trust and sources | 1 | Unchanged. |

**Total: 10 / 10. Pass.** Not tested: a real screen reader, an intended user's unaided walk (D17/D20). Known and open: m-a, m-b, m-c, m-r3c.
