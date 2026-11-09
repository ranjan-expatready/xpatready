# B144 · C8.3 Representative review: build notes

Builder: screens lane, branch `claude/intelligent-noether-qkzc6a-b144` (draft PR #1247), from `origin/main` fc49dc5a4 (merged at 8dffee494), 9 Nov 2026. Spec: `concept.md` r2; decisions on #1247: Lead 31 (Q1 yes, scaffolding port; Q3 build after C4, which is on main) and founder P-412 (F1 withdraw, change-only view with one-click re-approve; F2 representative of record only). US$0, live AI off.

## Plan: rule → where → test
| Rule | Where | Test (pass · fail) |
|---|---|---|
| BR-1 Send (one action, ticked by default, 400 none, 409 already open, freeze each form incl. Online with no copy, "Not stamped: waits", solo "Review now") | `engine/runtime/review.ts` `sendProblem`, `fileOf`; `api/src/review-rounds.ts` `send`; partial unique index (one open row per filing) | unit `check_review_rounds.ts` BR-1; pack C8.3-1 · -2, -3 |
| BR-2 Checklist (default items with live state, program items through `reviewItemsOf(release, combinationKey)` from `samples/review-items.json`, "Values confirmed, with who") | `review.ts` `checklistOf`; `api/src/review-items.ts` (the one port) | unit BR-2; pack C8.3-5 |
| BR-3 Open (POST by the representative of record moves Sent → Under review; GET safe; anyone else: nothing) | `review.ts` `canMove`; route `open` | unit BR-3; pack C8.3-4 |
| BR-4 Approve (representative of record now, loaded hashes, row lock, only Under review → Approved, one confirmation for unticked, stamps + `filing_review`) | `review.ts` `canMove`, `hashesProblem`, `untickedProblem`; route `decision` under `SELECT … FOR UPDATE` | unit BR-4; pack C8.3-8, -9, -12 |
| BR-5 Send back (reasons required, pinned to a form or item, round n+1) | `review.ts` `reasonsProblem`; route `decision` | unit BR-5; pack C8.3-6, -7 |
| BR-6 Changed since review (round n-1 frozen vs round n / today, typist = answer origin, one batched history query) | `review.ts` `formChanges`; route `GET` | unit BR-6; pack C8.3-11 |
| BR-7 / F1 A later fact change withdraws (stamp current only while hash and representative unchanged) | `review.ts` `stampCurrent` (the ONE rule function), used by the page and by `readiness-inputs.ts` | unit BR-7; pack C8.3-10 |
| P-412 change-only view, one-click re-approve of only the changed forms | `review.ts` `withdrawnForms`; route `POST …/reapprove`; page "Re-approve N changed forms" | unit P-412; pack C8.3-17 · -18 |
| BR-8 Approver ≠ author (a fact typed by the representative after send = prepared; readiness.ts:63-71 unchanged) | `review.ts` `selfReviewOf` (shared with the old route) | unit BR-8; pack C8.3-13 |
| BR-9 / F2 Permissions (representative of record only decides; staff send; client, configuration, former representative, another firm) | `review.ts` `mayDecide` (the ONE permission check); routes | unit BR-9; pack C8.3-14 |
| BR-10 Rounds append-only (triggers), history, compare n with n-1 | migration triggers; route `GET` | unit BR-10 (legal moves); pack C8.3-14 (trigger refuses UPDATE) |
| M1 Old route = one-step round through the same code | `api/src/readiness.ts` `review` calls `ReviewRounds.oneStep` | pack C8.3-15; C7.6, C8.1, C8.2 packs unchanged |

## Files (expected)
Migration `prisma/migrations/20261109010000_c83_review_rounds` (4 new tables, triggers, rollback in header) · `prisma/schema.prisma` (4 models, back-relations only) · `engine/runtime/review.ts` · `api/src/review-items.ts` · `samples/review-items.json` · `api/src/review-rounds.ts` · `api/src/features/review-rounds.ts` · `api/src/case-prepare.ts` (additive: the per-form basis) · `api/src/readiness.ts` (old route → one-step round) · `api/src/readiness-inputs.ts` (uses `stampCurrent`) · `contracts/runtime.ts` (additive shapes) · `web/src/runtime/readiness.tsx` (Send for review, Open the review) · `web/src/runtime/representative-review.tsx` · `web/src/runtime/cases.tsx` (route) · `tests/runtime/check_review_rounds.ts` · `acceptance/C8.3.test.ts` · `tests/check_c83_review_browser.cjs`.

## Top 5 production improvements over the board
1. Each filing has its own status inside one round (board frame 2), stored per filing (B1).
2. The page keeps the hashes it loaded and sends them; a change meanwhile is a 409 with Reload, nothing stamped (M4).
3. After an approval, a fact change shows only the changed forms, before → after with the typist, and one button re-approves them (P-412).
4. Form "Checked" marks per form (GitHub "Viewed") beside the checklist, both by keyboard.
5. The read-only state for anyone not the representative of record says why, with no buttons (F2).

## Questions for the tech lead
(none yet)
