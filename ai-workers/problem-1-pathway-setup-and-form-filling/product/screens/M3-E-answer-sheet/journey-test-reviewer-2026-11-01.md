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

---

# Round 2: commit acb1ee93 (2 Nov 2026)

Same method, on a fresh copy on :4433, now stopped. US$0.
* **J4 (recovery after a change): now held.** A re-tick freezes the new answers and the section is current again. 6 parallel re-ticks gave 201 + 5 × 200, with 1 current tick and 2 in total.
* **J6 (tick from a stale read): now held.** A stale, superseded or pre-fill version gives 409. A missing or wrong-type version gives 400.
* **J10 (to readiness): no false Done now.** But IMM 5707 can never reach Done: the parents' boxes are listed as waited for under the applicant, and the two parents are folded into one (review N1). The item meanwhile says "Every fact it reads is confirmed."
* **J7, J8, J9 held again.** Wrong role 403/404, hostile keys 404, channel switched away gives 409. No values in any audit line.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 complete |
| Next step obvious | ½ | Out-of-date reason now works; IMM 5707 reason and sheet disagree (N1) |
| Plain words | ½ | Stale tick 409 talks of "filings or items" (n1) |
| Feedback and state | 1 | No false Done; Out of date clears on re-tick |
| Correct data | ½ | Ticks, history and snapshots right; parents shown as the applicant (N1) |
| Error recovery | 1 | 400/403/404/409 all recoverable; re-tick works |
| Accessibility and screen sizes | n/a → 1 | No screen |
| Speed | 1 | 15–74 ms |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | ½ | The waiting list names the wrong person for parent facts (N1) |
| **Total** | **8 / 10** | Passes (8+, no 0); the review still blocks on N1 (Major) |

Fixes that would raise the score:
1. Key the sheet by the full `about` and label waiting entries by person (N1).
2. Use the section's own words in the stale 409 (n1).

---

# Round 3: commit 732d4241 (2 Nov 2026)

Fresh copy on :4433, now stopped. US$0.
* **J10 (to readiness):** the waiting list now names each parent ("…: parent 1" and "…: parent 2", 8 entries each). The applicant's own facts no longer appear as waited for. Done still cannot be reached until the parents are collected, which is correct and will be stated in the PR. The item's reason still reads "Every fact it reads is confirmed." (review n3).
* **J4–J9** held again, with the same results as round 2. A stale tick now says which section's answers changed.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 complete |
| Next step obvious | ½ | Item reason and sheet still disagree for IMM 5707 (n3) |
| Plain words | 1 | Stale tick names the section |
| Feedback and state | 1 | No false Done; Out of date clears on re-tick |
| Correct data | 1 | Each parent is their own line; ticks and history right |
| Error recovery | 1 | 400/403/404/409, recoverable |
| Accessibility and screen sizes | n/a → 1 | No screen |
| Speed | 1 | 13–80 ms |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | 1 | Person and source on every line (n2 latent only) |
| **Total** | **9.5 / 10** | Passes |

Fix that would raise the score: give an Online item the sheet's waiting count as its reason (n3).
