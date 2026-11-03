# QA-193 — journey test, reviewer (PR #740 at 538d666e3), 3 Nov 2026

**How:** API-level journeys on the isolated copy `rv193` (:4457), fresh database each, live AI off, US$0.
* The planted checker run is a Sample with `cost_usd: 0` and the draft is replayed, so both AI rounds agree with no model call.
* No visible-browser walk: the worktree has no web build, and this change has no UI.
* D17/D20 stay with the founder.

## Journeys (persona · goal · steps · expected → seen)
1. **Main.**
   * Content reviewer · "accept this Ready new field and let the approver see where it came from".
   * Accept one Ready new field on To review → author applies the IMM 5257 draft → approver opens To review.
   * Expected: the ADD carries that decision; the batch view names the reviewer; `/draft` carries it.
   * **Held:** `check_forms_qa193_batch_mark.ts` 15/15.
2. **Alternate.**
   * Reviewer · "accept the clean reuse matches together".
   * Two Ready reuse matches accepted together, then apply.
   * Expected: nothing added to the library, so nothing unmarked. **Held.**
3. **Error (P-296 (1)/P-299).**
   * Reviewer tries to accept two Ready new fields together.
   * Expected: 409 "decided on its own"; nothing changes. **Held.**
4. **Page supersedes the queue.**
   * Reviewer accepts two reuse matches together; the author changes both to new fields on the form-field page; then apply.
   * Expected: the ADDs carry no bulk mark.
   * **Held** (probe: both `batch_id` null, no batch row; audit shows the 2-item accept).
5. **Re-compare.**
   * The author compares the draft again after a To review accept.
   * Expected: the kept decision keeps its batch. **Held** (15/15 includes it).
6. **Recovery: Undo after the page decided again (one item).**
   * Reviewer accepts on To review; the item is returned on its page; the reviewer presses Undo within 10 s.
   * Expected: 409 "decided again on its form-field page"; the page's decision stays.
   * **Broken:** 404 "No decision with this id." (`check_gcore_b5_field_map_bulk.ts` 21/22).
7. **Recovery: Undo after one of two was decided again.**
   * Expected: 409 in words, nothing undone.
   * **Seen:** 201 `{"undone":1}`, the other item put back, and the bar saying "2 proposals".
8. **Wrong role / after apply.**
   * Undo by batch after the draft is applied.
   * Expected: refused; applied ADDs never deleted. **Held** (APPLIED guard; B5 pack).

## Data underneath
* Each ADD exists once.
* `proposed_by` is the decider and `applied_by` the author; the batch view's "by" is the decider.
* Probe audit: "Content reviewer accepted 2 proposals" under the batch id.
* `drafting_job.cost_usd` = 0.00.

## Break-it (short)
* **Two copies running the test at once** removed each other's planted file (fixed in 538 by a per-port name).
* **A killed run** leaves its planted file in `p2/runs`, which spoils the next checker-based suite. Cleanup runs only in `finally`/`catch`, not on a signal. This is test scaffolding, not product.

## Score (0 / ½ / 1, with evidence)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 held; 15/15 |
| Next step obvious | ½ | nothing visible changes; not walked |
| Plain words | ½ | J6: "No decision with this id." for a decision that exists |
| Feedback and state | ½ | J7: the bar says 2 undone, the server undid 1 |
| Correct data | 1 | batch ids right on apply, page supersede, re-compare (J1, J4, J5) |
| Error recovery | ½ | J6/J7: Undo's refusal lost (B5 pack red) |
| Accessibility and screen sizes | ½ | no UI change; not walked |
| Speed | 1 | one `Map` per apply, no per-row request; pack about 10 s |
| Visual quality | ½ | no UI change; not walked |
| Trust and sources | 1 | each change names the decision and decider it came from |

**7/10, no criterion at 0 → below the pass bar of 8.**
* **Fix first:** M1 in `review.md`, i.e. restore Undo's 409 after a page decision. That lifts plain words, feedback and error recovery to 1, giving 8½.
* **Not tested:** a browser walk, a screen reader, an intended user's unaided walk.
