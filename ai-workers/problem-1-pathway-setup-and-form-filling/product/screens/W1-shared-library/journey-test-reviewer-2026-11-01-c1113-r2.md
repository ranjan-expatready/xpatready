# Journey test round 2: C11.13 (reviewer, 1 Nov, commit c49426ce, isolated :4454, US$0)

## Journeys (round-1 set, re-walked)
1. Content publisher, main path. Opened To review › Proposals › IMM 5257 Schedule 1. Each twin row says "Same item as drafted for another form (the first accepted adds it)", and its reason names the other form. The row's link goes to the form-field page. The words now match what the product does. **Held.**
2. Exact duplicate refused, with its key and where it is used. **Held.**
3. Near duplicate: refused without a reason. With a reason it waits in Check, and the producer's reason is kept. **Held.**
4. Second person: the near reason shows on the batch, and on the Release page once the batch is approved. **Held.**
5. Error, the first item is rejected: accepting the twin adds it as new. **Held** (was Major).
6. Recovery, Undo of the first after the twin reused it: refused in plain words. Undo of the twin, then of the first, works. **Held** (was Major).
7. Break-it, reverse order: the twin is accepted first, then the first item is refused (409, "reject this one, or reuse that item"). Data is right, and reject works. Minor.
8. Break-it, edit a twin after its first is accepted: a generic "the database refused a duplicate. Refresh…" message. Nothing is written. Minor.
9. Sizes: no sideways scroll at 1440 or 1024 px. At 400 px the page scrolls 46 px sideways (not this diff). axe WCAG 2.2 A/AA: 0 violations. No console errors. Queue loads in 0.9 s.

## Data checked underneath
* An accepted twin has `reuse.existingKey` set to its first's key, `decided_key` set to the same key, and one canonical_field.
* A twin whose first was rejected has `reuse.match = new` and its own field.
* An undone twin goes back to `{reuse, null}` and `waiting`.
* Real Demo-load twins (field_map) carry `work.twinOf`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J5, J6 |
| Next step obvious | 1 | the words match the form-field path; no dead "accept that one first" |
| Plain words | ½ | edition cut mid-phrase ("source."); J8 generic message |
| Feedback and state | 1 | resolved key written back; Undo refusal says why |
| Correct data | 1 | one field per meaning in every order tried |
| Error recovery | ½ | J7: the first item can only be rejected; J8 |
| Accessibility and sizes | ½ | axe clean; 400 px overflow |
| Speed | 1 | 0.9 s |
| Visual quality | 1 | team look kept |
| Trust and sources | 1 | AI marked; where-used and near reason shown |

**8.5/10: pass.** Fixes that would raise the score: words for J8 and the edition text, then the J7 reverse order, then 400 px.

Not tested: a real screen reader, a headed walk, an intended user's unaided walk (D17/D20 stay with the founder).
