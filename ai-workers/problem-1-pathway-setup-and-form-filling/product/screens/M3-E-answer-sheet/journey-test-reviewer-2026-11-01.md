# Journey test, reviewer: M3-E answer sheet (C7.3), commit 3eab8873

1 Nov 2026, reviewer agent. Backend only. I walked the journeys over the API on a fresh isolated copy on :4433 (`xr_studio_rev_sheet`), as the case officer's portal-entry screen would call it. No screen, so there was no browser walk, axe check or screen-size pass. US$0, no live AI. The persona is the case officer unless stated.

## Journeys
1. **Main: enter IMM 5707 in the portal.** A principal and spouse, every answer filled and confirmed. The sheet follows Section A, B, C. Section A has 14 answers for both people, each with person, label, source and copy text; dates are YYYY-MM-DD. Ticking A gives 201 with who and when. **Held.**
2. **Before anything is confirmed:** no values, only waiting (16 and 10). **Held (P-72).**
3. **A fact changes after the tick:** Section A and the item read Out of date. It warns only, and the frozen snapshot is unchanged. **Held.**
4. **Recovery after the change, as the reason says ("enter the new answers, then tick it again"):** the re-tick gives 200 `created:false` and the section stays Out of date. **Fails (review M1).**
5. **Double click or two tabs:** 6 parallel ticks give 201 + 5 × 200, with 1 row and 1 snapshot. **Held.**
6. **Ticking from a stale read:** nothing ties the tick to what was shown, so a change in between is frozen as current. **Fails by design (M3).** Shown from the code (`case-prepare.ts:217–224`).
7. **Wrong role:** client, client B and author 403; other firm 404 on GET and POST; no actor 401. **Held.**
8. **Error:** bad section keys give 404 in words (9 hostile keys, no 500). A malformed or unknown item id gives 404, a document item 422, a PDF upload form 409. **Held.**
9. **Channel moved away from Online:** sheet and tick both give 409 and the item reads `to_do`. Back to Online, the old ticks return. **Held** (m2 noted).
10. **Across the boundary, to readiness (C7.6):** ticking all three sections with nothing confirmed made the item read `done`. **Fails (M2):** readiness would get a false Done.

## Data underneath
* One `entered_section` row per section, even under a race. Its `answer_snapshot` has the frozen answers and never changes (the md5 matched).
* Audit lines carry no values: a search of all audit rows for the sample names and values found 0.
* The server enforces roles (`Runtime.reach`, officer only).

## Break it
* Concurrent ticks, hostile keys and channel switches are covered above.
* The audit says "(1 answers frozen)" (m4).
* Read speed: prepare 56 ms, sheet 38 ms.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1–J3 work; J4 cannot be finished (M1) |
| Next step obvious | ½ | The Out-of-date reason names an action that does nothing (M1) |
| Plain words | 1 | Refusals name the form, the section and why |
| Feedback and state | ½ | `done` shown with 26 facts unconfirmed (M2) |
| Correct data | ½ | Single rows under race, snapshot fixed; a stale-read tick freezes unseen values (M3) |
| Error recovery | ½ | 401/403/404/409/422 are right, but there is no recovery from Out of date (M1) |
| Accessibility and screen sizes | n/a → 1 | No screen |
| Speed | 1 | 38–56 ms |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | 1 | Each answer has person and source; only confirmed facts fill |
| **Total** | **7 / 10** | Does not pass (below 8) |

Fixes that would raise the score, most valuable first:
1. Let a re-tick on an out-of-date section freeze the new answers (M1).
2. Count Done only when sections are current with nothing waiting (M2).
3. Send the section fingerprint with the tick and refuse a mismatch with 409 (M3).

## Not tested
No browser or real screen reader (no screen). No unaided walk by an intended user: D17 and D20 stay with the founder.
