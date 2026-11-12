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

## Re-review accc77d74 (diff-only, P-277)
Reviewer: the same fresh session's role (not the builder), 12 Nov 2026. Scope: `git diff e235916da accc77d74` only (new `client-card.ts` and its check, `cases.tsx`, the pack check, `check_bk4c.ts`, `check_bk4c_browser.cjs`, the screenshots). Isolated copy `screens_q427r2` on :4469, now stopped and removed. The BK-4 screenshots that `check_bk4c_browser` rewrote were restored. Nothing was committed or pushed. Live AI off, US$0.
**Verdict: Approve accc77d74.** M1 and m1 are closed, the nit is closed, and m3 is closed by the rule's own pair. m2 stays a stated limit (PR body). One new Minor (m4) and one nit are open; neither blocks.

### Run here
* **`check_qa427_client_card.ts`:** 15/15.
  * It catches each removed rule. I ran four mutants of `client-card.ts` from a scratch copy:
    * confirm after approved: fails "M1 (b)";
    * latest round only (the e235916da rule): fails "M1 (a)";
    * no submitted line: fails "submitted pass";
    * "some" for "every" submitted: fails 3, among them "submitted fail" (m3).
* **`check_qa427_client_card_browser.cjs 4469`:** 17/17, finished story loaded from scratch (3 min).
* **`check_bk4c_browser.cjs 4469`:** 46/46 (the e235916da "Target page… closed" is gone).
* **`check_bk4c.ts`:** 16/16.
* **Web `tsc --noEmit`:** clean.
* **`graph.mjs`:** G1 0, G2 0, G5 0.
* I did not run `run-suites --direct`; that is the builder's evidence.

### M1: closed
I walked a new family case of three filings through the product's own routes (send, open as the representative, decide), as the case officer at 1440 px:

| State | Card says | Right? |
|---|---|---|
| All confirmed, nothing sent | Next: prepare the forms and send them for review | Yes |
| Round 1 waiting | Round 1 is with the representative of record now | Yes |
| Round 1: Client A sent back, Spouse A and Child A1 approved (my round-1 "sent back" state, now mixed) | Next: prepare… | Yes (per filing; the old latest-round rule also said prepare here, but only because the round was not all approved) |
| Round 2 approves Client A: every filing's newest row approved | Next: **Ready to file**, then Record the submission | Yes |
| Then Client A changes an answer (M1 b) | Next: confirm the answers (1 to confirm, in the Agent view) | Yes |

* **The story's family case (M1 a):** fourth filing never reviewed. It now reads "Next: prepare the forms and send them for review" (screenshot `qa427-04-a-filing-not-reviewed-1440.png`, pack step). Right.
* **The rule** (`client-card.ts`): confirm comes before approved, and approved is counted per filing through `latestReviewOf`, which is what round 1 asked. The rounds type now carries `filing`, which `GET /reviews` returns (`filing`, `status`, `filing_round`).

### m1: closed
I failed each of the card's three reads with a 500 in turn (the client's questionnaire, prepare, reviews):
* Each time, the card read "Where the case stands for Client A could not be read." with Try again, within 1.4-1.6 s. It is no longer a skeleton forever.
* Try again after unroute brought back the right state ("Ready to file…").
* "Try again" is a secondary team Button, reached at Tab 11 with the 3 px focus ring (focus-visible true).
* axe on the failed state: 0.
* The hand-off is not shown while failed. That is the second option round 1 offered, so it is acceptable.

### Nit (round 1): closed
"Ready to file" is a link:
* It is reached at Tab 12 with a 2 px blue ring.
* Enter moves to `#readiness-h` (top 72 px), and focus is on the heading (`tabIndex=-1`).

### No regressions
* **axe (WCAG 2.2 A/AA, `main`):** 0 on the mixed send-back state, the approved state and the failed state.
* **Sideways scroll:** none at 400 and 1024 px.
* **Errors:** no page or console errors.
* **Card ready:** 1.07-1.25 s from navigation on the new family case, the same as round 1.
* **`check_bk4c.ts`:** its source patterns follow the shared `handToClient` object, and the hand-off still carries the same `to`, `go` and `handsCase`.

### Open (do not block)
* **m4 (Minor, Should; new, inside the rule this diff writes): a withdrawn approval still reads as approved.**
  * Approved, then the client changes Spouse A's national identity number, then the officer confirms. The card goes back to "Next: Ready to file, then Record the submission".
  * Meanwhile, Spouse A's Ready to file row shows the pill "Approval withdrawn", and a CRITICAL line: "The filing changed after it was reviewed… The representative of record reviews it again". `GET /reviews/<round>` gives `withdrawn: 1, reapprovable: true`.
  * The case-level `GET /cases/:id/reviews` that the card reads carries no withdrawal, so the rule cannot see it.
  * Not Major:
    * the link lands on the panel that names the re-review;
    * the line can be passed with a reason there;
    * nothing is recorded without that panel.
  * **Fix (S), when convenient:** add `withdrawn` (or `reapprovable`) per row to the case-level reviews list, and count such a filing as not approved ("prepare", or a "re-approve" wording). Give it a pass/fail pair in `check_qa427_client_card.ts`.
  * Otherwise, record it beside m2 as a stated limit.
* **Nit: focus drops after Try again.** After Try again succeeds, the button unmounts and focus drops to `body`. It would be better to move focus to the card's Next line or its heading.

### Journey test (reviewer role), re-scored on this diff
Journeys walked:
1. Confirmed: prepare.
2. Round waiting.
3. Mixed send-back.
4. Every filing approved: Ready to file, by keyboard.
5. The client changes after approval: confirm.
6. Confirm again (m4).
7. The story's never-reviewed filing.
8. Each read fails, then Try again.
9. 400 and 1024 px.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every round-1 state is now right (M1 a, M1 b, sent back, approved) |
| Next step obvious | ½ | m4: after a withdrawn approval, the card says "Ready to file" while the real next step is re-review (the panel says so) |
| Plain words | 1 | "could not be read", "Try again", panel names exact |
| Feedback and state | 1 | Skeleton, then the state; failed state in about 1.5 s |
| Correct data | 1 | Read only; review rows and filings unchanged by viewing |
| Error recovery | 1 | Try again re-reads all three; the card comes back |
| Accessibility and sizes | 1 | axe 0 on 3 states; keyboard links and focus rings; no sideways scroll at 400 or 1024 px |
| Speed | ½ | Card ready 1.1-1.25 s on a new family case (waits on the shared prepare read), as in round 1 |
| Visual quality | 1 | Team card, one secondary button per state |
| Trust and sources | 1 | No AI; every state comes from server reads |

**Journey score: 9/10: pass** (8 or more, no 0). Most valuable next fix: m4 (next step).

### Not checked
* An intended user's unaided walk (D17, D20).
* A real screen reader.
* `run-suites --direct` at accc77d74 (the builder's).
* A real all-submitted case (m3 is now covered by the rule's pair).

**Verdict: Approve accc77d74.** No open Blocker or Major. m2 and m4 are Should, and the focus-after-retry nit is Could.

## Re-review (merge of main, 23c6d9ab)
Diff-only (P-277, P-318 (1)). Head `23c6d9abfa4d508bd18afaf2cfc913d40984a0c0`, confirmed with `git rev-parse HEAD`. Its parents are 43226f480 (the PR; notes only since the Approve on accc77d74) and 16f9af51b (`origin/main`). The reviewer did not make the merge. Read only; no app copy started.

### What the resolution did
* **`git show --remerge-diff`:** one conflict, in `web/src/runtime/cases.tsx`, `CasePage`. The resolution:
  * removes the three conflict markers;
  * keeps QA-427's four lines (`toConfirm`, `cardState`, `handToClient`), then QA-417's comment and `confirmTabs`, in that order.
  * No line was edited or added beyond that. Nothing else differs from a clean merge.
* **Main's side survives intact.** `git diff 43226f480 23c6d9ab -- cases.tsx` shows exactly what #1640 (QA-417) brought:
  * the `tabHash, toConfirmByTab` import;
  * `confirmTabs`;
  * the `data-household-to-confirm` span;
  * the `data-household-tabs` line.
* **The PR's side survives intact.** `git diff origin/main 23c6d9ab -- cases.tsx` shows exactly what QA-427 brought:
  * the `clientCardState` import;
  * the `filing` field on `rounds`;
  * `clientView` and `prep`;
  * the three derived values;
  * the client card's state chain.
  * The PR's other files are unchanged by the merge (`git diff --stat origin/main 23c6d9ab`: the same 12 files as the PR).
* **The `caseName()` claim, checked.** #1633 (A24-1, merge 92507436d) came in with this merge. It does not touch `cases.tsx`, `client-card.ts` or `questionnaire.tsx`, so it causes no conflict here. The builder's words "there is no `caseName` on main" are inaccurate, though:
  * `caseName` is on main, at `contracts/runtime.ts:32`;
  * the API uses it (`case-prepare.ts`, `case-filings.ts`, `case-checklist.ts`, `earlier-facts.ts`).
  * It is not used in `web/`. The conclusion stands; only the wording of the claim is off (Nit, record only).

### Interactions with what main brought
* **The same figure, kept in step.** QA-427's `toConfirm` and QA-417's household "N to confirm" are the same expression (`v.summary.answered - v.summary.confirmed`). QA-417's `toConfirmByTab` sums the same sections, so in the "confirm" state:
  * the client card's "(N to confirm, in the Agent view)" equals the household line's figure;
  * it also equals the sum of QA-417's per-tab links.
  * The two cannot disagree.
* **Hashes do not collide.**
  * The card's link is `#agent-view`, handled by `CasePage`'s effect.
  * QA-417's links are `#tab-<subject>`, handled in `AgentView`. Its new branch matches only `^tab-` and returns early; `#agent-view` falls through to the `a-<uuid>` test, which does not match, as before.
  * The card's `#readiness-h` link is untouched.
* **Selectors do not overlap.** QA-427's browser check does not read `data-household-*` or the tab labels. QA-417's check does not read `data-client-card*`. The builder's runs on 23c6d9ab: QA-427 17/17 and QA-417 56/56.
* **Nit: two "to confirm" links in the header.** In the "confirm" state the header now has two:
  * the household line's per-person links (to each tab);
  * the client card's "confirm the answers" (to the top of the Agent view).
  * They are consistent and lead to the same place, one level apart. The PR adds no new scope, and this is not a defect. A later pass could point the card's link at the first tab with something to confirm (`tabHash`).
* **A24-1's API changes and the card's reads.** `case-prepare.ts` changes only the `reference` it returns (`caseName(c)`). The `filings[].id/status` the card reads are unchanged, and so is the reviews list shape. `useCaseView` is unchanged.

### Builder's results on 23c6d9ab
The logs are `m-*.log` in the builder's scratchpad, written after the merge (17:25-17:39; merge 17:25:06):
* `check_qa427_client_card.ts` 15/15;
* `check_qa427_client_card_browser.cjs` 17/17;
* `check_qa417_counts_browser.cjs` 56/56;
* `check_a24_case_number_migration.ts` 28/28;
* `check_a24_case_number_api.ts` 23/23;
* `check_a24_record_reference_browser.ts` 5/5;
* `tsc -p web` exit 0, as the builder reports. There is no tsc log among the `m-*.log` files.

### Journey test (reviewer role)
Not re-walked: this re-review is read only, with no app copy. The merge changes no QA-427 line or behaviour. The one new neighbour, QA-417's household tab line, agrees with the card's figure (above). **Score carried: 9/10: pass**, as on accc77d74. Most valuable next fix: still m4.

### Not checked
* The commit and ports the builder's logs ran against. The logs name neither; I rely on the builder's statement of fresh isolated copies on 23c6d9ab.
* The header's layout with both lines at 400 and 1024 px. No screenshot on the merged head.
* Full `run-suites`.

Verdict: Approve 23c6d9abfa4d508bd18afaf2cfc913d40984a0c0
