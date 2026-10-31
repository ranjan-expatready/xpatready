# Review — F6 slice 1: pre-qualification picks by the rules (C4.7, walk of C4.2 and C4.8)

Reviewer: independent reviewer agent (did not build it), 31 Oct. **Commit reviewed: `63e9eff61b0dc71cd8d9a9b353d7445ed54064a5`** (branch `claude/runtime-f6-pqr-picks`, one commit on #113's head `7e4ea58c`; #113 itself not reviewed here). Diff: `origin/claude/reverent-mahavira-cef858..63e9eff6`.
Basis: BACKLOG F6, concept-draft.md (P-130–P-132; step 6 "PQR picks … with a reason … each (P-76)"), concept-draft-v2-notes.md (P-147), W1-shared-library/plan-slice1.md item 1c, CAPABILITIES C4.7 ("a reason per pick; a person accepts or removes each"), STANDARDS, EXPERIENCE, QUALITY. Live AI picks (W1-10 step 7) are out of scope and not counted.

r1 verdict on 63e9eff6: Block (two Majors). **Current verdict, r2 on `80b0fdee4afa0798fbfda2a3fd773c54edc4d631`: Approve** (see r2 at the end).

## Suites rerun on the exact commit (isolated copies, ports 4430–4438, names `rv6_*`, US$0)
| Suite | Result |
|---|---|
| check_f6_pqr_picks.ts | 20/20 |
| check_f6_pqr_picks_browser.cjs | 23/23 (axe clean on 4 states, no sideways scroll at 1024) |
| check_pqr.ts / check_pqr_browser.cjs | 38/38 / 20/20 |
| check_s6_queue_browser.cjs / check_s6_p149.ts / check_queue_tx.ts | 28/28 / 73/73 / 8/8 |
Graph (P-86): G1–G6 clean for this slice; `POST /combinations/:id/pqr/picks` is reached by check_f6_pqr_picks.ts and a browser page; C4.7 and C4.8 name both new suites. Evidence files the suites rewrote were restored with `git checkout`; nothing committed.

## Issues
**Major 1 (Must) — the accepted tick loses the pick's own reason.** C4.7 is "a reason per pick". The usual Accept on To review has nothing in the reason box (it is labelled "needed to reject"). `decide` passes `reason: reason ?? r.reason` to the lander (api/src/proposals.ts:289), so `l.reason` is never null and the lander's `l.reason ?? pick.reason` (proposals.ts:162) never falls back to the pick. Every pick accepted that way stores the run's general sentence. Probe: the pick's reason was "A rule of this combination reads it: The applicant is applying from a country of which they are not a citizen." The stored `fact_source.reason` was "Proposed by the rules from what this combination's rules read; the immigration expert confirms at release." The audit line's "Why:" says the same. So the Questionnaires tab, the release review and the activity log lose why each fact is asked. The suites miss this because both always type a reason. Fix: let the lander tell a reason the person typed apart from the item's reason (pass the typed `reason` separately on `Landing`, or use `pick.reason` when `l.reason === r.reason`). Add a pass and a fail test: Accept with `reason: null` stores `payload.reason`.

**Major 2 (Must) — a rejected pick comes back on the next run.** P-76: a person "accepts or removes each". `proposePicks` skips only picks that are still waiting (fact-sources.ts:156), so a rejected pick is proposed again every time. Probe: propose 32, reject one with "Not something a prospect knows.", propose again. The reply was "1 pick is waiting on To review … 31 more were already waiting", and the rejected fact was waiting again. Result: someone's "no" quietly turns back into open work, and a second author can accept what the first rejected without seeing that decision. Fix: also skip identities with a rejected `pqr_pick` for this combination, and add "N you rejected before are not proposed again" to the words. Test: reject, propose again, nothing comes back.

**Minor 3 (Should) — Undo does not fully restore an earlier draft row (challenge 1).** Where the slice's tick appears is put back correctly: when the author had changed the source in a draft first, the source, document and case-officer reason survive accept and Undo. Other parts of that earlier row do not survive. Probe before: `v1 DRAFT CLIENT tick=false reason="author note" origin=HUMAN`. After accept and Undo: `v2 DRAFT CLIENT tick=false reason=null origin=CODE_MATCH`. So the person's change is now recorded as made by the rules, and its reason is gone. The row's bulk `batchId` is also dropped, so that bulk change's Undo no longer covers it. The `updatedBy` becomes whoever accepted. Cause: `acceptPqrPick` deletes the earlier draft (#113), and `unlandPick` (fact-sources.ts:294–302) only clears the tick. Fix: when the lander runs, save the earlier draft row in the item's `work` (as `beforeEdit` does), and have `unlandPick` re-create it exactly.

**Minor 4 (Should) — two proposes at once fill the queue twice (challenge 2).** The waiting set is read outside the transaction (fact-sources.ts:156–166) and nothing locks the run. Probe: two simultaneous POSTs each returned `proposed: 32`, leaving 64 waiting items with 32 duplicate identities. The data stays correct: the twin's Accept is refused in words ("… is already asked in pre-qualification", 409). But the person then has to reject 32 duplicates, each with a reason. Fix: take `pg_advisory_xact_lock` on the combination, and read the waiting set inside the transaction.

**Minor 5 (Should) — a person who cannot accept is offered Accept (challenge 3).** The Approver and the Content reviewer hold "review", so the side panel offers an enabled Accept on a pick (proposals.tsx:166). It always fails with the toast "Approver (simulated) does not hold the author duty" (core.ts:89). Those are words, but the toast does not say who can accept. The transaction rolls back cleanly and the item stays waiting (suite-checked). Fix: for `pqr_pick` without the author duty, disable Accept and explain why ("Only a configuration author ticks pre-qualification").

**Minor 6 (Should) — words and layout on To review (challenge 5).** (a) The side panel's Rules line shows the key "pqr subset of sqr" (engine/sources.ts:191, from #113), which is jargon on the main path (D10). Fix: "Asked in the client questionnaire too". (b) Case facts read `(The application)` in the title: "Ask "Country or territory …" (The application) in pre-qualification". (c) The same long "Why a person looks" sentence is repeated on all 32 rows. That makes each row about 145 px tall, and at 1024 px the Kind column is cut off and the Open button sits off-screen inside the table's own scroll. The page itself does not scroll sideways, so the browser suite's check passes. proposePicks already overrides `work.title`, so it can pass a short `reason` without touching #113's engine.

**Minor 7 (Should) — focus is lost after "Propose picks from the rules".** Pressing it with the keyboard leaves focus on `<body>`, probably because the busy button is disabled. The result notice is `role=status`, so it is announced. Fix: keep focus on the button, or move it to the notice.

**Checked and holding:**
- (4) The circular import is safe. The package is ESM, `unlandPick` and `pickStamp` are hoisted function declarations, and `STAMP.pqr_pick` is a lazy arrow. Undo reaching `unlandPick` is proven by the suite (the tick comes off). If either becomes a `const`, the circle becomes a load-order hazard; worth a one-line comment.
- Bulk accept of picks is refused because they are band "check". The UI offers no checkboxes outside Ready, so the 409 message with a raw key is unreachable.
- A pick whose fact stops being needed gives 404 "… Reject the pick.", and the item stays waiting (plan 1c).
- C4.8: an accepted pick is a named draft change, with no library change and no second-person batch.
- Retired combination: 409 in words. Unknown combination: 404.
- The run is recorded as LOCAL/COMPLETED, US$0, and the spend ledger is unchanged.
- (6) Merging with origin/main: the only conflict is `tests/check_w115_slice2_browser.cjs`, and it comes from #113's head against main. This slice does not touch that file, so it brings no conflict of its own. The branch was not on origin when checked.

## D1–D20 (out of 5)
D1 4 – propose, accept, reject, Undo and the release hand-off all work; reason per pick broken (M1) · D2 3 – rejected picks return (M2), duplicates under a race (m4), provenance lost on Undo (m3) · D3 5 – no library item is written; it reuses the fact-source row · D4 5 – the same refusals as a tick by hand (PQR ⊂ SQR) · D5 4 – double click guarded by busy; a 403 rolls back; Undo refuses after a later hand change · D6 3 – run, audit and decision recorded, but the audit "Why" is generic (M1) · D7 4 – marked Rules, never AI, no readings; accept or reject each · D8 4 – the notice links to the group, and the group shows the full path · D9 4 – one button leads to To review; 32 items each need opening one at a time · D10 3 – "pqr subset of sqr", "(The application)", "duty" · D11 4 – notice with role=status; toasts in words · D12 3 – tall repeated rows, clipped at 1024 · D13 4 – keyboard path works, axe clean, 400 px and 200 % fine; focus lost (m7); Open off-screen at 1024 · D14 5 – team Notice, Button and Pill · D15 5 – propose 131–217 ms, queue 16 ms, no request per row · D16 4 – a pass and a fail per rule, rerun here; no test covers M1 or M2 · D17 simulated only · D18 3 – the tick's stored reason is not the pick's · D19 4 – reaches the combination's one release (C4.8) · D20 simulated only.

**Journey score: 7.5/10. Fail** (below 8, no zero). Details: `journey-test-reviewer-2026-10-31.md`.

## To fix before Approve
1. M1: keep the pick's own reason when Accept has no typed reason, with a test.
2. M2: do not propose again a pick a person rejected, with a test.
Should (may follow, record it): m3 to m7.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Real browser zoom: 200 % was emulated as a 512 px viewport at scale 2.

## r2 — re-review of `80b0fdee4afa0798fbfda2a3fd773c54edc4d631` (31 Oct)
Diff `63e9eff6..80b0fdee`: changes in fact-sources.ts, proposals.ts, proposals.tsx, questionnaires.tsx and the two suites. Rerun on `rv6_*` copies (ports 4430–4434, 4437):

| Suite | Result |
|---|---|
| check_f6_pqr_picks.ts | 24/24 |
| check_f6_pqr_picks_browser.cjs | 27/27 |
| check_pqr.ts / check_pqr_browser.cjs | 38/38 / 20/20 |
| check_s6_queue_browser.cjs / check_s6_p149.ts / check_queue_tx.ts | 28/28 / 73/73 / 8/8 |

I reran my own probes (outside the repo) on the new head.

| Item | r2 | Evidence |
|---|---|---|
| M1 the pick's reason | **Fixed** | Accept with no typed reason now stores "A rule of this combination reads it: The applicant is applying from …", the pick's own reason, in the API probe and through the UI. A typed reason still wins (proposals.ts lander, `typed`). New test "review M1". |
| M2 a rejected pick returns | **Fixed** | After a reject, the next run reads "Nothing new: the 30 picks … already waiting on To review. 1 the rules would propose was decided by a person before, so it is not proposed again." and nothing is waiting for that fact. New test "review M2". |
| m1 Undo restores the earlier draft | **Fixed** | Hand change, then accept, then Undo gives `1\|DRAFT\|CLIENT\|false\|author note\|HUMAN\|user-A` before and after, identical. With an earlier bulk change, the batch id comes back too, and that bulk change's own Undo then succeeds (`undone: 1`). An edited pick restores its edited fact's earlier row. |
| m2 two proposes at once | **Fixed** | Two simultaneous POSTs returned 32 and 0, with 0 duplicate identities. The `pg_advisory_xact_lock` is taken per combination, and earlier picks are read inside the lock. New test "review m2". |
| m3 wrong role offered Accept | **Fixed** | For the Approver and the Content reviewer, Accept is disabled with "Only a configuration author accepts a pre-qualification pick." The server's 403 is unchanged. |
| m5 focus after Propose | **Fixed** | Focus moves to the notice, and the next Tab reaches "Open on To review". |
| m4 words and 1024 px layout | Open, Minor | "pqr subset of sqr", "(The application)", the repeated "Why a person looks" sentence, and Open off-screen at 1024 on To review. The builder lists these for the PR: the first three come from #113's engine/sources.ts, the last from the queue page's existing layout. Accepted as follow-ups; none blocks. |

New observations (Minor, none blocks):
- (a) A non-author (Approver, Content reviewer) can still Reject a pick. Since the M2 fix, that rejection keeps the pick from being proposed again. That fits P-76 ("a person … removes each"), but the founder may want removal kept to authors; noted, not a finding.
- (b) The result words "1 the rules would propose was decided by a person before" read awkwardly. Suggest "1 more was decided by a person before and is not proposed again."
- (c) The commit carries this review and the journey report as the builder copied them; this r2 section is the only change, and it is not committed.

Journey score r2: **8.5/10, pass** (no zero).
- Correct data goes from ½ to 1.
- Error recovery goes from ½ to 1.
- Accessibility rises with the focus fix but stays ½ because Open is off-screen at 1024.
- Plain words and visual quality stay ½.

**Verdict r2: Approve** on `80b0fdee4afa0798fbfda2a3fd773c54edc4d631`. No open Blocker or Major. The open Minors (m4 and a–b above) go on the PR's follow-up list.
