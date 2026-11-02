# Journey test, reviewer: C7.3 answer sheet rebased onto #356 (commit 7595e170)

2 Nov 2026, reviewer agent. C7.3 is backend only (no screen). I walked the journeys over the API on a fresh isolated copy on :4449 (`xr_studio_rev73r`), the way the case officer's portal-entry screen would call it. The copy is now stopped and its database dropped. US$0, live AI off. The persona is the case officer unless stated. The case has two adults (principal and spouse), every answer filled and confirmed, release 2 (IMM 5707 Online, Sample).

## Journeys
1. **Main: enter IMM 5707 in the portal.** The sheet follows Section A, B, C. Section A shows 14 confirmed answers, each with person, label, source and copy text. Ticking A with its version gives 201 with who and when. **Held** (pack 4's C7.3 13/13).
2. **Before confirmation:** no values, only what each section waits for. **Held** (C7.3-4).
3. **A fact changes after the tick:** section A and the item read Out of date, as a warning only, and the frozen snapshot is unchanged. **Held.**
4. **Recovery: tick again after the change:** the tick succeeds and section A is current again. The earlier tick is kept as history (1 current of 2, 2 snapshots). **Held.**
5. **Double click or two tabs:** 6 parallel first ticks give 201 + 5 × 200 and leave 1 row. 6 parallel re-ticks give the same result. **Held.**
6. **Tick from a stale read:** a wrong or older version gives 409, and the message names the section. A missing, numeric, null or list version gives 400. **Held.**
7. **Wrong role:** client, client B and author get 403 on both GET and POST. An unknown or missing actor gets 401. **Held.**
8. **Error:** 6 hostile section keys give 404. A bad or unknown item id gives 404. A document item gives 422. **Held.**
9. **Channel moved to PDF upload** (`FilingChannel` enum now): the sheet and the tick both give 409 in words, and the item reads `to_do`. Back to Online, the item answers again. **Held.**
10. **New with #356's tables, the person stops travelling, then travels again:**
    * While the person is off: the item is `active = false` and missing from `/prepare`. The sheet and the tick both give 422, and the ticks are kept.
    * When they travel again: the same item id returns with its tick, which reads current.
    * After a fact changed while they were off: the item comes back Out of date, with the right reason.
    * **Held.** No check covers this journey (review m6).

## Data underneath
* There is 1 current tick per item and section. A raw SQL second current tick is refused by `entered_section_one_current`.
* Each tick has its own `answer_snapshot`.
* There are 2 audit lines ("…entered in the portal…", then "…again, after a change…"), and 0 audit rows hold a sample value or name.
* Roles are enforced on the server.

## Break it
Concurrency, hostile keys, bad versions, the channel switch, the person leaving and returning, and a raw duplicate insert are all covered above. Nothing broke. Read speed: sheet 39–47 ms, `/prepare` 61–63 ms.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 and J10 complete |
| Next step obvious | ½ | IMM 5707 item reads "Every fact it reads is confirmed." while its sheet waits for 16 parent facts (n3, carried) |
| Plain words | 1 | Refusals name the form, the section and why |
| Feedback and state | 1 | No false Done; Out of date clears on re-tick, survives an item leaving and returning |
| Correct data | 1 | One current tick under race, history kept, snapshots frozen; each parent their own line |
| Error recovery | 1 | 400/401/403/404/409/422, each recoverable |
| Accessibility and screen sizes | n/a → 1 | No screen |
| Speed | 1 | 39–63 ms |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | 1 | Person and source on every answer; only confirmed facts fill (n2 latent only) |
| **Total** | **9.5 / 10** | Passes (8+, no 0) |

Fix that would raise the score: give an Online item the sheet's waiting count as its reason (n3).

## Not tested
* No browser, axe check or real screen reader: there is no screen.
* No unaided walk by an intended user: D17 and D20 stay with the founder.
* The other-firm 404 was not re-run; the `reach` path is unchanged.
