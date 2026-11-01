# Journey test: C3.3 failed AI run (reviewer, 1 Nov 2026)

Commit 013b6b3e. Isolated copy `rev33` on :4466 (fault switch on IMM 5707, fake launcher), headless Chromium, US$0.

## Journeys
1. **Main path (Configuration author):** "One form failed; I want my good draft and a way forward." Open AI work › the batch. Expect "Done with problems", a plain reason on IMM 5707, IMM 5257 kept with "Review proposals", and Retry. **Held**, except the reason is raw fault text (M1).
2. **Crossing to the next screen:** Review proposals opens the IMM 5257 draft with all 84 proposals ("All (84)"). **Held.**
3. **Recovery:** Retry twice. Only IMM 5707 runs again (attempts 2 and 3). **Held.**
4. **Limit:** a fourth Retry. It is refused with "needs a person". **Held**, but Retry is still offered and the refusal names no next step (m2).
5. **Wrong role (Content reviewer):** Retry. It is refused in words, and the server returns 403. **Held**, but the button is shown (m3).
6. **Paid repeat (author):** Forms › IMM 1344 › Re-read with AI, Live, Draft again. The repeat is refused in words, with no price and Start disabled; nothing is queued. **Held.**
7. **Break it:** SIGTERM mid-walk leaves no planted file; a second run of the walk is not flaky (22/22 twice); reloading after the retries shows the same state. **Held.**

## Data underneath
* Batch status PARTIAL: one 5257 job COMPLETED, 84 items.
* The 5707 jobs are attempts 1, 2 and 3, all FAILED, US$0.
* Ledger and launcher log unchanged; the ai_batch and drafting_job counts did not change on the refused plan.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 complete |
| Next step obvious | ½ | Retry offered when it cannot run (m2, m3) |
| Plain words | ½ | `imm5707e.pdf (STUDIO_FAULT_SOURCE…)` on the main path (M1); the refusal is plain |
| Feedback and state | 1 | "Done with problems", counts, toasts |
| Correct data | 1 | attempts, items and ledger as expected |
| Error recovery | ½ | after 3 attempts, no next step is said |
| Accessibility and sizes | 1 | axe clean; 1440/1024/720 px; keyboard reaches Retry and Review |
| Speed | 1 | whole walk about 18 s; pages under 1 s |
| Visual quality | 1 | screenshots tidy, team pills |
| Trust and sources | 1 | "Saved AI answer (no model call, US$0)"; the refusal says why |
| **Total** | **8.5 / 10** | **Pass** (no 0) |

Fixes that would raise the score, most valuable first:
1. Plain words for step messages on the AI work page (M1).
2. No Retry button when nothing can be retried, and a next step in the refusal (m2).
3. A read-only state for the Content reviewer (m3).

Not tested: a real screen reader, an intended user's unaided walk (D17/D20), a real non-induced server error.
