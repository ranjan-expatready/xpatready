# Journey test, reviewer role: QA-195 identity guard by name (2026-11-03, commit 369e4cf06)

Isolated copy on :4441 (`xr_studio_rv_qa195`, since dropped). US$0. Committed code only.

**Setup:** there is no Saved run for this case and Live is not allowed, so the masters items were made by the product's own `formMastersFromRounds` (both rounds: "Passport"/travel, "Proof of identity"/civil, "Bank statement"/financial; all flag false, reader `letter_or_record`). They were put on the queue with `insertProposals`. The queue was then walked in headless Chromium (Playwright) with screenshots, the way a person reads and clicks.

| # | Journey (persona: content publisher, author duty) | Result |
|---|---|---|
| 1 | Main: review IMM 5257's AI document types on To review | "Passport" under **Check**, reason "An identity document is never read by AI (P-134): its reader is set to a person; check it.", no bulk checkbox. "Proof of identity" and "Bank statement" under **Ready to accept**. |
| 2 | Main: open "Passport" by keyboard (focus Open, Enter), read, Accept | Drawer shows both readings, IRCC's words "Passport number" with file and edition, rule "identity not read by ai" Failed. Accept in 0.53 s. Library: `person_only`, identity true, DRAFT |
| 3 | Alternate: "Choose all 2" → "Accept 2 items" | 0.83 s. "Proof of identity" lands `letter_or_record`, identity **false**, so an identity document gets an AI reader with no person looking (review M1) |
| 4 | Error/break: edit a guarded identity item to an AI reader via the API | "Refugee travel document" (`person_only`) edited to `letter_or_record`, identity false: 201, and the library row is AI-read (review M2) |
| 5 | Widths 1440 / 1024 / 400 | No sideways scroll. First view 0.6–0.8 s. No console or page errors |
| 6 | Suite replay | `check_forms_c34_ai.ts` 54/54. A mutant without the name clause makes the QA-195 checks fail |
| 7 | Across the boundary: C2.6 checklist step | Unchanged: C2.6 suite 39/0, pack 32/32. It still proposes "Birth certificate" etc. with an AI reader (review Minor 1) |

**Data underneath:** each accepted item gives exactly one `document_type` DRAFT row, and the proposal goes from `waiting` to `accepted`. There are 126 audit lines in the window (decide and batch lines written).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Passport guarded; "Proof of identity" leaks (J3) |
| Next step obvious | 1 | Check group, one Open, one Accept |
| Plain words | ½ | Reason is clear. The failed rule says "The AI named a reader that is not allowed", but in this case the name decided, not the AI's reader |
| Feedback and state | 1 | Check badge, failed rule shown, the counts update |
| Correct data | ½ | J2 correct; J3 and J4 store AI readers on identity documents |
| Error recovery | ½ | Wrong input through the edit door is not refused (J4). Reload and double-click not re-walked: unchanged by this diff |
| Accessibility and screen sizes | ½ | Keyboard opens the drawer, three widths clean. axe not run (not installed) |
| Speed | 1 | 0.6–0.8 s view, 0.5–0.8 s accept |
| Visual quality | 1 | Team components, no new UI |
| Trust and sources | 1 | AI tag, both readings, IRCC quote with file and edition, Sample label |

**Score 7.5/10: fail (below 8, no 0).** These fixes would raise it, most valuable first:
1. Widen the name list (review M1). This raises task completed and correct data.
2. Apply the same list at the `document_type` lander (review M2). This raises correct data and error recovery.
3. Make the failed-rule text say what decided ("its name, category or a reading says it is an identity document"). This raises plain words.

**Not tested:**
- A real screen reader, axe, 200 % zoom.
- An intended user's unaided walk (D17, D20 stay with the founder).
- A Saved or Live run carrying this case (none is recorded; Live is not allowed).

## Round 2 (commit 9c79ef5e7)
| # | Journey | Result |
|---|---|---|
| 1 | Main: the round-1 J3 case. A name such as "Proof of identity" is now caught | Engine: identity true, `person_only`, Check (suite 56/56; probe: 30 of 32 identity names caught) |
| 2 | Break: API edit to an AI reader | 409, nothing lands (suite C3.4 S, `:190-199`) |
| 3 | Recovery: a waiting item from before the change ("Birth certificate", AI reader, Ready) accepted in bulk, then alone | 409 toast, both items stay waiting, nothing lands. The toast asks for a reader choice the screen does not offer, so only Reject works (review round 2, Minor B) |
| 4 | Accessibility | axe WCAG 2.0–2.2 A/AA on To review: 0 violations |

**Round-2 scores:**
- 1 each: task completed, next step obvious, feedback and state, correct data, accessibility and screen sizes, speed, visual quality, trust and sources.
- ½ plain words: the toast names an action the screen does not offer.
- ½ error recovery: a legacy item can only be rejected.

**Score 9/10: pass.**
