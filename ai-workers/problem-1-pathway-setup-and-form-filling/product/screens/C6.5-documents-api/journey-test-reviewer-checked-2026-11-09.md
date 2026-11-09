# Journey test (reviewer): "checked against the document" with a compare (PR #1386, `107aefb7d`)

Role: reviewer. I did not build it. Scope: this PR's own change (`git diff origin/claude/runtime-c65-counts...107aefb7d`), which covers the route `checkedAgainst` and the drawer's resolved row. I ran it on my copy `rv_c65f`, :4434, fixture (`setup_visitor_visa.ts` + `setup_vv_m3.ts`), with live AI off, at a cost of US$0. The browser walk was Playwright, headless (Chromium), at 1440 and 1024 px, with screenshots in the scratchpad. The probe and walk scripts stay in the scratchpad and are not committed.

## Journeys (persona · goal · steps · expected → result)
1. **Main path, case officer.** "The client typed SAMPLEDE; the passport reads SAMPLED; I know the renewed passport is right." Steps: open the case → "Fill this from documents" on Travel and identity documents → tick the values → Confirm & use → the check appears → "Keep the current answer" → type a reason → Save, by keyboard. Expected: the row says the answer was kept and offers no "Mark checked". Result: "Family name (surname) …: SAMPLEDE · Check resolved · kept over the document, with a reason", no mark, and the toast "resolved, keeping the current answer". **Held.**
2. **The same row at 1024 px and 200 %.** Result: the row wraps cleanly, with no sideways scroll (screenshot w4-resolved-1024-200). **Held.**
3. **Recovery: reload.** Result: after a reload and reopening the drawer, the row still reads "kept over the document". **Held.**
4. **Error: the officer (or a script) asks to mark a differing answer checked.** Expiry typed 2036-01-01 vs read 2035-06-30. Expected: refused and a check opened, with the answer unchanged. Result: 409 `differs_from_document`, one open check, the answer still DECLARED (F1). Asking again gives 409 `open_checks`. **Held.**
5. **Double click / two tabs: five clicks at once.** Result: five 409s naming one existing check, one audit line, and nothing VERIFIED. **Held.**
6. **Answer changed while marking (eight rounds).** Result: never VERIFIED with a contradicted value. When the check is opened on the superseded answer, resolve handles it as it does any check whose answer was changed since. **Held.**
7. **Alternate: a value left for a person.** The passport reads the citizenship as IND. The officer answers "India" → 200 VERIFIED, the officer's judgement, as ruled. "Afghanistan" → **also 200 VERIFIED** (probe 4). This follows the rule as ruled; it is a note for the tech lead in the review.
8. **Error: a document never read.** The spouse's passport (coded line SAMPLES35) is uploaded but never read. The officer answers "WRONG0001" and marks it checked against that passport (API) → **200, VERIFIED** with nothing compared. **Failed: Major M1 in the review.** The drawer itself never offers this.
9. **Kept, then resolved on a newer answer.** The check was opened on SAMPLEX, the answer was changed to SAMPLEY, and the check was resolved keeping it. Then the mark → **a second check opens** (409 `differs_from_document`). API only. **Minor (m1).**
10. **Step across the boundary: the Agent view.** After the keep, the answer stays as typed (not VERIFIED) and the reason lives only on the check. The Agent view shows the answer as entered. **Held.**

## Data underneath
* After journey 1: one `answer_check`, resolved with `kept = answer`, with the reason on it. The audit has no line holding the reason or the values. The current answer is SAMPLEDE and not VERIFIED. The mark afterwards gives 409 `kept_over_document`, with no second check.
* The opened-check audit line names the fact key, the role, the document type and the case only: "…the answer differs from the document, so a check was opened instead".
* Roles: the route is `reach(…, "officer")`, unchanged by this PR; the client has no drawer (C6.5-24).

## Break it
Five racing clicks (held); a mark raced against an answer change (held); an unread document (Major M1); a keep on a newer answer (Minor m1). The refusal text uses the fallback label "given names:" in lower case (Minor m2, API only).

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journey 1 end to end in the drawer |
| Next step obvious | 1 | the settled row offers nothing more to do; the open check names "Which is right?" |
| Plain words | 1 | "kept over the document, with a reason"; the API-only wording slip is m2 |
| Feedback and state | 1 | toast, then the row changes state; it persists on reload |
| Correct data | ½ | journey 8: VERIFIED against an unread passport that contradicts it |
| Error recovery | 1 | 409s change nothing (or open exactly one check); reload is safe |
| Accessibility and screen sizes | 1 | axe 0 violations (open check 1440, resolved 1440 and 1024); keyboard resolve; 200 % |
| Speed | 1 | the drawer opens in 162–188 ms |
| Visual quality | 1 | screenshots w3-resolved-1440, w4-resolved-1024-200 |
| Trust and sources | ½ | the reader is shown and the keep is recorded; journey 8 lets "checked against the passport" stand for nothing compared |
| **Total** | **9/10** | **Pass** (8 or more, no 0) |

**To raise it:** close M1 (refuse or read an unread document before marking), which lifts correct data and trust to 1. Then m1.

## Could not test
A real screen reader; a visible (headed) browser, since this cloud copy has no display, so the walk was a headless person-like replay with screenshots; and an intended user's unaided walk (D17, D20 stay with the founder).
