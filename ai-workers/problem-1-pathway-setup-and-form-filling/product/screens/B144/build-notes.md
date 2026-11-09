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

## Questions for the tech lead
1. **BR-8 on a firm that is not solo** (difference 3): I applied C7.6's rule unchanged (409; send back or hand over). The concept's words "needs the statement" would let a representative self-review a filing a case officer prepared, which P-155 (1) and BIC-17 say is never "Self-reviewed". **Recommend: keep the 409.**
2. **Keep the inline review form** (difference 2) until C7.6's browser suites move to the Review page; **recommend** a follow-up row to retire it.
