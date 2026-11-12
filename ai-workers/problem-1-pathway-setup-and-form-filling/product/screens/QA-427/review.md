# Review: QA-427 (case page, Client questionnaire card reads the case) · PR #1652 at e235916da

Reviewer: a fresh session that did not build this (screen-review, plus journey-test as the reviewer role, reported in this file as asked), 12 Nov 2026. Commit reviewed: **e235916daf3e7322b2d355ad87115ea02d7f4853** (`git diff origin/main...e235916da`: `cases.tsx` +33/-10, `check_bk4c.ts`, `check_bk4c_browser.cjs`, new `check_qa427_client_card_browser.cjs`). Isolated copy `screens_q427r` on :4468, now stopped and removed. Screenshots the runs rewrote in other rows' folders were restored. Nothing was committed or pushed. Live AI off, US$0.
Scope: the row's asked fix (`qa/BUGS.md` QA-427 on `origin/claude/dazzling-bell-fidwfr`), BK-4 concept BR-2 and the hand-off shape (§3), EXPERIENCE §2.5 and §6.
**Skill outcome: Ship after fixes.** **Verdict: Block (Request changes).** One Major is open (M1).

## What I verified
* **Pack check `check_qa427_client_card_browser.cjs 4468`:** 15 passed, 0 failed (13 card steps plus 2 story-setup steps). **`check_bk4c.ts`:** 16/16. I did not run `check_bk4c_browser.cjs` or `run-suites`.
* **States walked in the browser at 1440 px as the case officer:**
  * Thin story case: "Next: Client B answers on their phone…", with the hand-off. Right.
  * New family case, client done, answers waiting: "Next: confirm the answers (N to confirm, in the Agent view)". Right.
  * Every answer confirmed: "Next: prepare the forms and send them for review". Right.
  * Round 1 waiting (sent through the product's routes, opened as the representative): "Round 1 is with the representative of record now". Right.
  * The same round **sent back** with a reason: "Next: prepare the forms and send them for review". Right: that is the officer's work after a send-back (question 2b).
* **Data underneath:** the card only reads. Nothing is written. The extra `mode=sqr` read took 0.09 s on the story case (agent read: 0.10 s).
* **Accessibility:** axe (WCAG 2.2 A/AA, `main`) gave 0 violations on 3 cases at 1440 and 1024 px. There is no sideways scroll at 400 and 1024 px, or at 200 % zoom (512 css px).
* **Keyboard:** "confirm the answers" is reached at Tab 12, right after "Hand to Client A". It shows a 2 px blue focus ring. Enter moves to `#agent-view` (top at 88 px), and the next Tab lands inside the Agent view (question 5: good).
* **Console and page errors:** none.

## Issues (ranked)
* **M1 (Major, Must): the "approved" state names a step the case is not at. It reads only the latest round, and it outranks answers waiting to be confirmed.** `cases.tsx:307`: `latest.filings.every(approved) ? "approved" : toConfirm > 0 ? "confirm" : "prepare"`. Two reachable states are wrong:
  * **(a) The finished story's own family case (the PR's evidence state).** Rounds 3, 2 and 1 each hold one filing, all approved. The fourth filing, "Visitor visa: Child 18 or over", was **never sent for review**. Ready to file says "Not started · Not ready · 1 block and 5 open warnings" for it, and the header pill reads "Readiness: Not ready · 55% (lowest: … Child 18 or over)". The card still says "Next: Ready to file, then Record the submission". The real next step is to fix the block and send it for review. So for question 2a: no, this is not right. The card skips the review step that BIC-17 requires before recording.
  * **(b) Approved, then the client changes an answer.** The card itself invites this ("can still check the answers"). As Client A I changed Child 18 or over's occupation. The household line then reads "1 to confirm", and the card still says "Next: Ready to file, then Record the submission" instead of "confirm the answers".
  * This is the same defect class as the row itself (the card names a next step the case is not at), on the demo's flagship case.
  * **Fix (S):**
    * Check "confirm" before "approved".
    * Count "approved" only when every filing not yet submitted (prepare view) has, as its own latest review row (the newest round that holds it), status `approved`. Otherwise fall through to "prepare".
    * Move the state into one small pure function, and give it pass and fail cases for (a) and (b). The pack check passes today with either order.
* **m1 (Minor, Should): a failed client-questionnaire read leaves a skeleton forever.** `cases.tsx:331`: `clientCase.owes === null` stays true when `clientView.isError`. With the read answering 500, the card was still a skeleton after 8 s, with no words and no retry (BIC-18, D11). Before this PR the card did not depend on this read.
  * **Fix:** on error, show the hand-off without a Next line, or a muted "Could not read the client's questionnaire" with Retry.
* **m2 (Minor, Should; question 1): a private adult's parts count as "Client A owes".** The officer's `mode=sqr` comes from `caseView(…, "sqr")` with no `withoutHidden` (runtime.ts:515-520, unlike `clientView`). While only a private adult owes, the card says "Client A answers… for everyone travelling", although Client A cannot see those parts. Their own-link card (`privacy.tsx`) is on the same page.
  * This is acceptable as a stated limit for this row: it is rare and errs toward asking. Record it in the build notes.
  * **Cheaper fix:** leave out the sections whose owner is kept private. The page already reads who answers on their own link.
* **m3 (Minor; question 4): the submitted state is evidenced only by a browser patch.** Every filing's `status` in the prepare read is set to "submitted". The story cannot reach a real all-submitted case without a validated barcode copy, so this is acceptable evidence of the render path. The pure function from M1 should carry the "every filing submitted / one not" pair, so the rule's own test fails when the rule is removed (STANDARDS §7).
* **Nit:** in the same line, "confirm the answers" is a link but "Ready to file" is not. `#readiness-h` exists and could be the target.

## Questions asked
1. See m2. Acceptable as a stated limit.
2. The order is submitted > in review > owes > approved > confirm > prepare. Move confirm above approved, and make approved per filing (M1). The words are plain and match the panels ("Ready to file", "Record the submission", "Submission to IRCC").
3. STANDARDS §5: met. One extra read per case-page view, not per row, at about 0.1 s. It is invalidated with the other `["runtime","view",id]` reads on each save, which is still constant. The prepare read is shared under SubmissionPanel's key.
4. See m3. Acceptable.
5. The link and its focus work (see above). The skeleton shows while the reads load: card ready in 0.4-0.5 s on the thin case, and 1.3-1.9 s on the story case, where it waits on the shared prepare read. There is no flicker.

## D1-D20 (one card on the case page)
D1 Requirement fit: Partly (M1). · D2 Data integrity: Met (read only). · D3 Reuse: Met (shared prepare key). · D4 Rule integrity: Partly (M1 ordering). · D5 Stability: Partly (m1; reload is fine). · D6 Freshness: N/A. · D7 AI trust: N/A (no AI). · D8 Orientation: Met. · D9 Flow: Partly (one Next per state, but M1's is wrong). · D10 Language: Met. · D11 Feedback and state: Partly (m1). · D12 Visual: Met (one secondary button, team tokens; screenshots at 1440 and 1024). · D13 Accessibility: Met (axe 0, keyboard, 200 %). · D14 Team look: Met. · D15 Speed: Met (+0.1 s read; the wait is the shared prepare read). · D16 Testability: Partly (fails on main; no pure pass/fail pair for the order, m3). · D17 and D20: simulated only. · D18 Provenance: Met (every state comes from server reads). · D19 Closure: Met for new, confirm, prepare and sent back; Partly for approved (M1).

## BIC (EXPERIENCE §6)
BIC-08 Case structure and next step: Partly (M1). · BIC-10 Calculated statuses: Partly (M1). · BIC-11 One primary action: Met (no filled button; "Hand to" is secondary). · BIC-14 Help in place: Met (the hand-off tip is unchanged). · BIC-17 Review before recording: Partly (M1a points past an unreviewed filing; the panel still enforces review). · BIC-18 States: Partly (m1). · BIC-19 Layout: Met. · BIC-20 Accessible: Met. · BIC-01 to BIC-07, BIC-09, BIC-12, BIC-13, BIC-15 and BIC-16: N/A (no input, AI or filing step changed).

## Graph (P-86)
`graph.mjs`: G1 0, G2 0, G5 0. The new check is in the graph. No page or route was added, and no claimed capability is untested.

## Journey test (reviewer role)
Journeys walked:
1. Officer, new case: the client owes answers.
2. Officer, client done: confirm the answers by keyboard.
3. Officer, everything confirmed: prepare.
4. Officer, a round waiting.
5. Officer, the round sent back.
6. Officer, the story case: approved, with a filing still to file.
7. The client changes an answer after approval, then the officer looks.
8. The read fails or is slow.
9. 400 px, 1024 px and 200 % zoom.

Journeys 6 and 7 fail (M1). Journey 8 fails on error (m1); the slow read shows the skeleton correctly.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | 5 of 7 states right; 6 and 7 wrong (M1) |
| Next step obvious | ½ | Story case: "Ready to file…" beside "Readiness: Not ready · 55%" |
| Plain words | 1 | Short, verb-led; panel names exact |
| Feedback and state | ½ | Loading skeleton yes; the error state never ends (m1) |
| Correct data | 1 | Read only; reviews and prepare data unchanged by viewing |
| Error recovery | ½ | No retry on a failed read; reload works |
| Accessibility and sizes | 1 | axe 0; keyboard link and focus; no sideways scroll at 400, 1024 or 200 % |
| Speed | ½ | Card ready in 1.3-1.9 s on the story case (waits on prepare); 0.4 s on thin |
| Visual quality | 1 | Team card, one secondary button, the Next line under it |
| Trust and sources | 1 | No AI; states come from server reads |

**Journey score: 7.5/10: fail** (under 8, no 0). Most valuable fixes: M1 (task, next step), then m1 (feedback, recovery).

## Not checked
An intended user's unaided walk (D17, D20) · a real screen reader · `check_bk4c_browser.cjs` and `run-suites --direct` (the builder's) · a real all-submitted case (m3).

**Verdict: Block** (Request changes). Fix M1. m1 to m3 are Should.
