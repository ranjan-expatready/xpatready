# Journey test: C11.13 (reviewer, 1 Nov, commit 10af4182, isolated :4454, US$0)

## Journeys
1. Content publisher, main path. Goal: "Two forms ask for family name; I want one shared field." Opened To review › Proposals › IMM 5257 Schedule 1. Expected: the second form's field tied to the first. Got: row says "Reuses the item drafted for another form (accept that one first)", but its only action leads to the form-field page, which shows the item as NEW and never mentions the other form. Accepting it there worked while the first still waited. **Major** (words are not what the product does).
2. Publisher, exact duplicate. A "new" item named like a live field is refused (409), naming the key and where it is used. Held.
3. Publisher, near duplicate with no reason: refused by the contract. With a reason: shown in Check, never Ready. Held.
4. Second person, approval. The near reason shows on the batch, then on the Release page after approval. Held.
5. Publisher, error: the first item is rejected. Accepting the twin gives 409, editing it gives 409, both saying "accept that one first". The only way out is reject. **Major.**
6. Publisher, recovery: Undo within 10 s of accepting the first, after the twin was accepted. The twin stays accepted with a key whose field was removed. **Major.**
7. Race: two editions read at the same moment give one "new" and one "reuse". Held.
8. Sizes: 1440 and 1024 px have no sideways scroll; 400 px has 46 px of sideways scroll. Queue 0.9 s. No console errors.

## Data checked underneath
proposal_item rows: 19 field_map twins as `reuse {existingKey:null}` with `relates_to` set. A twin accepted on the field-map page has `decided_key` set while its reuse stays null. After Undo, the twin's key is missing from canonical_field.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | stored right; not actionable where people decide (J1) |
| Next step obvious | ½ | "accept that one first" leads to a page with no such step |
| Plain words | ½ | "P-120" in user text; edition cut mid-phrase ("source  too") |
| Feedback and state | ½ | accepted twin keeps reuse of nothing |
| Correct data | ½ | J6 dangling key |
| Error recovery | ½ | J5 stuck twin |
| Accessibility and sizes | ½ | 400 px overflow; axe not run |
| Speed | 1 | 0.9 s queue; 60 inserts 189 ms |
| Visual quality | 1 | team look kept |
| Trust and sources | 1 | AI marked; where-used and near reason shown |

**6.5/10: fail.** Fixes that raise the score most: true words for field_map twins (J1), unstick the twin when the first is rejected (J5), Undo guard (J6).

Not tested: a real screen reader, a headed walk, an intended user's unaided walk (D17/D20 stay with the founder).
