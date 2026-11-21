# PF-12b part 3: journey test (reviewer, 21 Nov 2026), commit f817c153bb5274ceb4e6de88f10d0b40d715dcbc

This is a backend row with no screen of its own. Its three uses run under the public sign-up pages and two platform jobs.
- I walked the sign-up pages in headless Chromium on the isolated copy `rv_pf12b3`, on runtime port 4433 (never :4400). The script and screenshots are in the session scratchpad.
- I read the audit trail with SQL after each step.
- To simulate the audit store failing, I added an owner trigger on the copy only. It refused the platform line of one use and nothing else. I removed it afterwards, and the copy was stopped and dropped.

## Journeys (persona, goal, expected result: outcome)
1. **New firm owner signs up.** Goal: "get my firm's account". Steps: sign up, get the email, confirm, sign in.
   - Expected: one email, a firm, sign-in works, and one null-firm line each for `platform.account.mail` and `job:messages.send`.
   - **Held.** Check-your-email showed in 3.3 s and the email arrived.
   - Lines: account.mail 0 to 1 (1 with no firm), messages.send 0 to 1 (1 with no firm).
   - The line: firm null, `system:platform.account.mail`, SYSTEM, `bypass use`, workspace `platform-audit`, a uuid correlation id, method POST.
   - Confirm made one firm, and no account.mail line landed on the new firm's trail. The owner signed in.
2. **The same owner signs up again** (the account.mail use inside `platform.firms.signup`, at 1024 px).
   - **Held.** "You already have an ExpatReady account" arrived, and the account.mail lines went from 1 to 2.
   - axe found 0 serious or critical issues, with no sideways scroll.
3. **A new owner signs up while the audit store refuses account.mail's line** (keyboard only, 400 px).
   - **Held, fail-closed.** The page shows Check your email, as PF-5's background step always does, but no email was sent.
   - The platform outbox stayed at 2 rows, and no pending sign-up was stored.
   - There was no sideways scroll at 400 px.
4. **Recovery from 3.** With the store back, I waited for the 60 s and pressed "Send it again". **Held:** the email arrived.
5. **The send job's line is refused** (job:messages.send).
   - **Held.** No email, and the row stays `QUEUED` with no reason, so no try was counted. The suite shows the job is retried.
6. **The purge job** (job:platform.signup.purge). Not walked over the scheduler.
   - The suite proves its pass (one null-firm line) and its fail (nothing deleted). I re-ran it: 58/0.
7. **Wrong role.** A signed-in staff request cannot reach these uses: the account.mail route list is the public sign-up doors only. If a signed-in request ever did, recordCase would refuse the line on its actor check.

Console and page errors across the walk: 0.

## Break-it pass
- **Both mutations survived** (catch-path line removed; rethrow removed). Review m2.
- **The try-count read comes before the line** (`send/messages.ts:243-244`), so a race leaves a run with no line. Review m1, Minor.
- **Same address twice** (journey 2): one "already have an account" email, still one firm.
- **Re-encrypt with no firm:** refused by the runner and by the handler before any read (code reading plus `check_pf14_jobs`).

## Score (each 0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2 and 4 completed end to end |
| Next step obvious | 1 | Same pages and words as before; "Send it again" with its countdown |
| Plain words | 1 | Unchanged; BypassNotRecorded says "nothing was done. Try again in a minute." |
| Feedback and state | ½ | During the failure the page still says "We sent a link" (PF-5's anti-enumeration design, not this row) |
| Correct data | 1 | One null-firm line per run, nothing on any firm's trail, and no row or try on failure |
| Error recovery | 1 | Journey 4 recovered; the job is retried with no try counted |
| Accessibility and screen sizes | 1 | Keyboard path at 400 px; axe 0 serious at 1024; no sideways scroll |
| Speed | 1 | One insert per use; Check your email in 3.3 s, unchanged by this row |
| Visual quality | 1 | No UI change |
| Trust and sources | 1 | No AI; each line names the use, the method and the correlation id |

**9.5 / 10: pass** (8 or more, and no 0). Feedback stays at ½ because of a PF-5 design point, not something this row should fix.

Not tested:
- a real Cognito sign-in;
- the purge on the real schedule;
- a screen reader, and an intended user (D17 and D20 stay with the founder).
