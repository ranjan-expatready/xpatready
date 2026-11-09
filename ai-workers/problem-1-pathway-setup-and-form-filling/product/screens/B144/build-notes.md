# B144 · C8.3 Representative review: build notes

Builder: screens lane, branch `claude/intelligent-noether-qkzc6a-b144` (draft PR #1247), from `origin/main` fc49dc5a4 (merged at 8dffee494), 9 Nov 2026. Spec: `concept.md` r2; decisions on #1247: Lead 31 (Q1 yes, scaffolding port; Q3 build after C4, on main) and founder P-412 (F1 withdraw, change-only view with one-click re-approve; F2 representative of record only). US$0, live AI off. **Migration** (four new tables) and **permissions**: for the tech lead's read and the breaker.

## Rule → where → test
| Rule | Where | Unit (`check_review_rounds.ts`) · pack (`C8.3.test.ts`) · walk |
|---|---|---|
| BR-1 Send, freeze (B2), "Not stamped: waits", solo "Review now" | `engine/runtime/review.ts` `sendProblem`, `tickedByDefault`, `fileOf`; `api/src/review-rounds.ts` `send`; partial unique index | BR-1 ×8 · C8.3-1, -2, -3, -14 (removed 409), -14b · walk 2 |
| BR-2 Checklist (defaults + live state, program items via the port, confirmations with who, a mark per form) | `checklistOf`; `api/src/review-items.ts` `reviewItemsOf(release, combinationKey)` ← `samples/review-items.json` (Sample, Unconfirmed: expert) | BR-2 ×2 · C8.3-5 · walk 5 |
| BR-3 Open by POST only; GET safe | `nextStatus`; route `open` | BR-3 ×2 · C8.3-4 · walk 3b, 4 |
| BR-4 Approve: representative now, loaded hashes, row lock, one move, one confirmation, stamps + `filing_review` | `nextStatus`, `hashesProblem`, `untickedProblem`; route `decision` + shared `approve` | BR-4 ×6 · C8.3-8, -9, -12 · walk 5, 7, 8 |
| BR-5 Send back with reasons (pinned), round n+1 | `reasonsOf`; route `decision` | BR-5 ×3 · C8.3-6, -7 · walk 6 |
| BR-6 Changed since review, typist = origin (m4), one batched snapshot read (m6) | `changesOf`, `formStateOf`; route `GET` `compose` | BR-6 ×2 · C8.3-11 · walk 4 |
| BR-7 / F1 withdraw: **one rule function** `stampCurrent` (facts hash + representative) | `review.ts`; used by the page, re-approve **and** `readiness-inputs.ts` (C7.6's line) | BR-7 ×6 · C8.3-10, -14 (rep changed) · walk 1, 9, 10 |
| P-412 change-only view + one-click re-approve | `withdrawnForms`; route `reapprove`; page footer | P-412 ×2 · C8.3-17 (fail), -18 (pass) · walk 9, 11 |
| BR-8 approver ≠ author, C7.6's rule unchanged | `selfReviewOf` (prepared **or** typed a changed fact after send) | BR-8 ×3 · C8.3-13, -14b |
| BR-9 / F2: **one permission check** `mayDecide` | every decide route (`mustDecide`) | BR-9 ×2 · C8.3-14, -14b, -17 · walk 3 |
| BR-10 append-only, history, compare n with n-1 | triggers in the migration; `history` on each row | BR-10 ×2 · C8.3-14 (UPDATE refused) |
| M1 C7.6 route = one-step round, same code | `readiness.ts review` → `ReviewRounds.oneStepBasis` / `oneStep` (`freeze`, `stamp`) | C8.3-15; C7.6, C8.1, C8.2 packs unchanged |

## Files
Migration `prisma/migrations/20261109010000_c83_review_rounds/migration.sql` (`review_round`, `review_round_filing`, `review_round_form`, `review_check`; checks, triggers, rollback in the header) · `prisma/schema.prisma` (4 models + back-relations only) · `engine/runtime/review.ts` (new) · `api/src/review-rounds.ts`, `api/src/review-items.ts`, `api/src/features/review-rounds.ts` (new) · `samples/review-items.json` (new, Sample) · `api/src/case-prepare.ts` (additive: `reviewBasis`, the per-form hash pulled into one `formHash`, unchanged value) · `api/src/readiness.ts` (old route → one-step round; 409 while the filing is in an open round) · `api/src/readiness-inputs.ts` (`stampCurrent`, same result) · `contracts/runtime.ts` (additive: `SendForReview`, `ReviewOpen`, `ReviewTick`, `ReviewDecision`, `ReviewReapprove`, `ReviewRound`, `ReviewRoundFiling`, `FormStamp`, `ChangedSinceReview`) · `web/src/runtime/representative-review.tsx` (new), `web/src/runtime/readiness.tsx` (Send for review, per-filing review link, "Approval withdrawn"), `web/src/runtime/cases.tsx` (2 routes) · tests: `tests/runtime/check_review_rounds.ts`, `acceptance/C8.3.test.ts`, `tests/check_c83_review_browser.cjs`, `tests/runtime/setup_c83_walk.ts`.

Routes: `GET|POST /runtime/cases/:id/reviews` · `GET /runtime/reviews/:id` · `POST /runtime/reviews/:id/open|checks|decision|reapprove` · `POST /runtime/filings/:id/review` (kept).

## Differences from the concept (plainly)
1. **Extra route** `GET /runtime/cases/:id/reviews` (the panel's per-filing link and the page's newest round) and `POST …/reapprove` (P-412). Not in §2's list.
2. **The inline "Review the filing" form stays** in the readiness panel (it now makes a one-step round through the same code, M1), beside a new "Open the review" link; the concept said it "becomes Open the review". Kept because `check_c76_ready_browser.ts` and `check_c81_sign_browser.ts` drive it; hidden while the filing is in an open round (the route then answers 409).
3. **BR-8 on a firm that is not solo:** a representative who typed a changed fact after the send gets C7.6's 409 ("would read as a second person's: send it back…"), not the statement; the statement applies on a solo firm (exactly `readiness.ts:63-71` with "typed a changed fact" counted as "prepared"). Question 1 below.
4. **Approve and Send back need Under review** (opened by POST first); the page opens on view. The concept allows deciding from Sent (challenge M4). One allowed move, as BR-4.
5. **Re-approve is a new round** (kind `reapprove`, approved at once): unchanged forms keep their stamped snapshot, only changed ones are stamped anew; checklist ticks and confirmations are carried.
6. **What the page shows on the right** is each form's facts **as they read now** with before → after against the previous round's frozen snapshot (open rows) or the stamp (approved rows); the frozen values are the "before". The decision sends the hashes the page loaded.
7. A form's **"Checked" mark** is a `review_check` row of source `form` (GitHub "Viewed"); it is not counted among the unticked checklist items.
8. A **removed filing's send is 409** (as BR-9), an unknown id 404.
9. "Changed since review" does not list a checklist document's change (concept §1 (c), as written; the default item shows its live state).

## Top 5 production improvements over the board
Per-filing status inside one round (B1) · loaded hashes and Reload, nothing stamped meanwhile (M4) · change-only view, one-click re-approve (P-412) · per-form Checked marks · read-only state in the concept's words for anyone but the representative of record (F2).

## Checks run (exit codes, 9 Nov, fresh isolated copies on 4441-4445)
* Unit `tests/runtime/check_review_rounds.ts` 0 (38/38) · `tests/check_prisma_schema.ts` 0 · `tests/check_contract_seams.ts` 0 · `count-any --against origin/main` 0 (418 = base) · `graph.mjs --check` 0 · web `tsc` clean · api `tsc`: no new error (15 old ones, all in tests/).
* Pack `acceptance/C8.3.test.ts` 0 (18/18) on a fresh copy (setup_vv_m3 reports only the 2 known failures S2w, S7a).
* Walk `tests/check_c83_review_browser.cjs` 0 (20/20) on a fresh copy, 1440 px + one 1024 px state, axe clean on 3 states, screenshots in `screenshots/`.
## Regression
* Packs: C7.6 0 · C8.1 0 · C8.2 0 · C9.5 0 (fresh copy) · C6.13 0 · C7.6-screen 0.
* R1 group in order on one copy: r1c 0 · r1d 0 · r1a --reset 0.
* Suites that call `/filings/:id/review`: `check_c76_readiness_api.ts` 0 · C7.6, C9.5 packs above · `check_c76_ready_browser.ts` 0 · `check_c81_sign_browser.ts` 0 · final re-run of `check_c83_review_browser.cjs` 0.
* Not run locally: the full set. `select-suites.mjs` says ALL (a migration, and a new features file), so CI runs every suite when the PR is marked ready.

## Self-score (honest, D1-D20 summary)
Strong: rules in one place, every BR pass+fail, M1/M2/M4 closed, axe clean on 3 states, keyboard path. Weaker: the page is dense on long checklists (left column scrolls with the page, not on its own); the "loading" and "empty" states are drawn but plain; no 1024 px walk for the dialogs; D17/D20 need an intended user (not self-scored).

## Not built (as concept §6b)
Needs-you items and notifications · the case stage move to REVIEW · `waive-deficiency` as its own key · a "checked against the document" record. **Follow-up row (Q1):** SA-1B-221's `REVIEW_ITEM` line kind replaces `samples/review-items.json` behind `reviewItemsOf` (only `api/src/review-items.ts` changes).

## Round 1 fixes (review and break of 09e660220, at 4de4f6f88)
| Finding | Fix | Fail test |
|---|---|---|
| Break B1 (Blocker): a send back left the earlier approval in force | `stampCurrent` gains `superseded` (one rule): a `filing_review` counts only while its filing's newest round row is the approval that wrote it (`readiness-inputs.ts`, one query), so C7.6's line reopens and C8.2's "Reviewed by" reads nothing; the page shows such stamps withdrawn ("the filing was sent for review again"); the Send dialog no longer ticks an approved, current filing ("Approved: sending it again withdraws the approval") | pack C8.3-19; unit "B1" ×3 |
| Review M1: a solo firm could not re-approve from the page | "Re-approve" opens a dialog with the self-review statement on a solo firm, or when the server asks for it (400 on `self`); the words name no field | walk 11d; unit BIC-13 |
| Review M2: a fact typed between rounds was approved as "Reviewed" | BR-8's base is the previous round's frozen snapshot when there is one (the page's own base), else this round's | pack C8.3-13b |
| Review M3: relatives' facts named as the client | `factPerson` (exported from `out-of-date.ts`, the words `factChanges` already used) names each fact's person, relatives included | pack C8.3-20; unit "review M3" ×2; `check_c92_out_of_date.ts` 29/29, `check_b128_relatives.ts` 20/20 unchanged |
| Review M4: other screens' screenshots in the PR | restored from origin/main (25 files); `git diff --stat origin/main...HEAD` has no .png outside B144 | (records) |
| Break M1: a change of representative broke re-approve | facts about `REPRESENTATIVE` (the firm record) have no typist, so never count in `changedBy` | pack C8.3-14c; unit "break M1" |
| Break M2: a tick under another filing ticked the selected one | `tick(f.filing, …)`; boxes enabled only on a filing under review | walk 11c |
| Break M3: a send could race the C7.6 route | `oneStep` re-checks for an open round under the case lock and refuses 409 (the route's transaction, `filing_review` too, rolls back) | pack C8.3-21 (4 races, invariant holds) |
| Review m2 | "Review now" only on a solo firm (400 otherwise) | pack C8.3-14 `nowNotSolo` |
| Review m6 / D10 | answers shown in their words (`value_words`, `was_words`, `now_words`), never their keys; "Frozen when sent" vs "Stamped"; "the other forms keep their approval" only when there are others; dates in Toronto's day | pack C8.3-20 |
| Review m7 | "Open the review" passes `?filing=`; the page selects (and opens) it | walk 11b |
| Break m1 | BR-8's 409 after an approval says "Ask the case officer to send it for review again" | unit "break m1" |
| Break m2, review m5 | only the deciding representative's ticks count; re-approve carries only their ticks and records the rest as confirmed unticked | pack C8.3-14c |
| Break m3 | ticks only on a filing under review (409 on Sent) | pack C8.3-14 `repTickBeforeOpen` |
| Break m4 | a removed filing is not opened; it can still be sent back (never approved) | (code; no sample route keeps a removed filing in an open round) |
| Break m5 | closing a dialog gives the focus back to its button | walk 5b |
| Break m6, review m8 | triggers: a filing row starts only as its round's kind says; forms and checks are added only to an open row or in the transaction that made it; a stamp only while under review (or that transaction); FKs `review_round_form.round_id`, `.filing_id`, `review_round_filing.filing_review_id` (NO ACTION) | pack C8.3-14 `insertApproved`, `insertCheck` |
| Break m7 | the "forms changed since sent" check applies to Approve only | (code; not reproducible on the sample) |

## Round 1 regression (9 Nov, head e2c98f994 + this note; fresh copies via the scratchpad `copy.sh`, since `isolated.sh`'s `pg_ctl` check cannot traverse `/tmp/claude-0`)
* Unit and static: `check_review_rounds.ts` 0 (46/46) · `check_prisma_schema` 0 · `check_contract_seams` 0 · `count-any` 0 (418 = base) · `graph.mjs --check` 0 · `check_c92_out_of_date.ts` 0 · `check_b128_relatives.ts` 0.
* Pack C8.3 0 (23/23) · walk 0 (24/24) · packs C7.6 0, C8.1 0, C8.2 0, C6.13 0 · `check_c76_readiness_api.ts` 0 · `check_c76_ready_browser.ts` 0 · `check_c81_sign_browser.ts` 0 · R1 in order: r1c 0, r1d 0, r1a `--reset` 0. setup_vv_m3: only S2w, S7a (known).

## CI round (gate B on the configured checkpoint, #1247 at f457a8df7, run 42566736094)
Reproduced gate B's way (`tools/gate-b.mjs` runPack, data `checkpoint`): a fresh copy, Demo › Reset then Demo › Load the configured checkpoint as the author, no setups, then `C8.3.test.ts`: **16/23, exit 1**, the same failing steps as CI. FAIL lines (each cut at 900 characters):
```
FAIL  C8.3-11 pass (BR-6, m4): round 2 marks only the changed form "Changed since review", with before → after and the person who typed the new value — [["IMM 5257","to_check",[]],["IMM 5257 SCH1","to_check",[]],["IMM 5476","to_check",[]],["IMM 5645","to_check",[]]]
FAIL  C8.3-13 fail (BR-8, M3): after the representative typed a fact on the filing, approve is refused as a second person's (409, on a firm with another officer); a send back is taken — {"approve":[200,null],"back":[409,"This filing was decided meanwhile. Reload."]}
FAIL  C8.3-10 pass (BR-7, P-412 F1): a fact change → that form shows "Approval withdrawn" naming the fact and who typed it; the other forms keep their stamp; C7.6's review line reopens — {"forms":[["IMM 5645","approved",null],["IMM 5257 SCH1","approved",null],["IMM 5257","approved",null],["IMM 5476","approved",null]],"warns":["no_copy","fields_left_empty","no_copy","no_copy","hand_write","hand_write","hand_write","hand_write","hand_write","han
FAIL  C8.3-18 pass (P-412 F1): the representative sees only the changed form and re-approves it in one click: a new round, approved at once; the unchanged forms keep their stamp, only the changed one is stamped anew; C7.6's line closes; a second click finds nothing changed (409) — {"status":409,"body":"Nothing changed since this filing was approved: its approval stands. Reload.","keep":["525f1bd6-4942-4f01-9913-2cecc49ec78c=2fe5b7cc-8116-495d-a060-a5b215c80cc0","601f0110-575c-4c45-bc1b-3139156b6b4a=2b376ad8-d1c6-4b38-9c33-2f4aa650c587",
FAIL  C8.3-13b fail (BR-8, review M2): a fact the representative typed between rounds (after the send back, before the next send) is still theirs: approve is refused as a second person's (409), never "Reviewed" — [200,null]
FAIL  C8.3-14c pass (break M1): after a change of representative the new representative of record re-approves in one click (200, Reviewed); the former representative's ticks are not carried (break m2) — [404,"No such case."]
FAIL  C8.3-14 fail (BR-9, F2, M7): the officer ticking, approving or sending back 403; configuration 403; a client 403; another firm 404 on every route; a former representative 403 (the stamps read "the representative of record changed"); a removed filing 409; the database refuses changing a round — {"m":{"officerTick":403,"repTickBeforeOpen":409,"nowNotSolo":400,"officerApprove":403,"officerBack":403,"configRead":403,"configSend":403,"clientRead":403,"clientSend":403,"otherFirmRead":404,"otherFirmOpen":404,"otherFirmCheck":404,"otherFirmDecide":404,"othe
```
**Cause: the pack's set-up, not the code.** The pack picked "a text fact only the barcode form reads" among facts the staff collect (`collected_from !== "client_questionnaire"`). On the checkpoint every fact is collected in the client questionnaire, so no fact was found and none was changed: -10, -11, -13, -13b and -18 then saw nothing change. -14c and -14 failed after -18, which left no re-approve round to read (a 404 on an undefined round). The old set-up (setup_vv_m3) has staff-collected facts, so the pack passed there.

**Fix (P-319, no fixed names; no step lowered or dropped):** the pack picks the fact from the data whoever collects it (a staff-collected one first). The case officer (or the representative at -13, -13b) types the change, which staff may do for any fact (agent view, "Declared: entered by staff"); the typist checks are unchanged. The walk's set-up picks the same way. No code and no migration change.

## Left after round 1
* Review m1: page and C7.6 can still disagree when the form set changes (a waiting form starts, a form is added, a Not-needed form, a C9.5 move): waits come from the frozen row and the re-approve covers stored rows only. Not reproducible on the sample.
* Review m3: hashes and the representative are checked before the case lock (benign: a stamp that goes stale shows withdrawn at once). Noted, not changed.
* Review m4: the decision races (double approve, approve against send back) have no pack line; the breaker's probe showed them holding. The send-against-C7.6-route race has one (C8.3-21).
* Review m9: graph G3/G6 false positives (the graph tool's, not this PR).
* The representative-review line's words after a send back still read "The filing changed after it was reviewed … (or the representative of record changed)"; a sentence for "sent for review again" would need C7.6's engine words.
* `check_b128_parents.ts` (needs its own checkpoint copy) not run.

## Questions for the tech lead
1. **BR-8 on a firm that is not solo** (difference 3): I applied C7.6's rule unchanged (409; send back or hand over). The concept's words "needs the statement" would let a representative self-review a filing a case officer prepared, which P-155 (1) and BIC-17 say is never "Self-reviewed". **Recommend: keep the 409.**
2. **Keep the inline review form** (difference 2) until C7.6's browser suites move to the Review page; **recommend** a follow-up row to retire it.
