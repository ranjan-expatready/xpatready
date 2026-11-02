# qa after-merge, batch #599 and head checks — 2 Nov evening (main 88ed986a → 5e3c046d), with hand-over

Session qa-batch-2. US$0, no live switch set, Sonnet helpers for the head checks (P-278).

## Verdict
Batch #599 (#570 C11.8, #568 G2) is sound on main. **M2 48 → 49/60: C5.5 Works.** C11.8 stays Partial (it needs the live gate on the founder's Go). No Blocker, Critical or Major.

## Rows on 5e3c046d
| Row | Before | Now | Evidence |
|---|---|---|---|
| C5.5 (#568 G2) | Not built | **Works** | `check_g2_answer_key_gate.ts` 72/72, `_firm.ts` 13/13, `_browser.cjs` 15/15 |
| C11.8 (#570) | Partial | **Partial** | `check_forms_c118_acceptance.ts` 18 + 2 SKIP (their rules proven in `check_cost_override` 72/72, 0 SKIP); missing: the live gate J2 L1/L2 on the founder's Go |

`qa/built/C5.5.md`, `qa/built/C11.8.md` removed.

## Per-PR checks (verdicts are comments on each PR)
* **#570 C11.8 (money): Pass** on 7889de5a. The coverage trade-off is resolved: the fake-launcher pairing is in, so P-179 and P-194 are still proven in CI.
* **#585 C3.4 AI step (money): Pass with Minors** on d401140c. Every switch-off check is green and the costs match the PR's table. **Not run by qa:** the three checks that pair `STUDIO_AI_LIVE=approved` with the stand-in launcher (`check_forms_c34_ai_live`, `check_forms_c47_pqr_picks`, `check_forms_c411_draft_qd`), so the Live money rules rest on CI. **The tech lead to confirm the Live plan's figure (helper noted US$6.60 against the runner's 4.35) before the Go.** Minors: a non-object body still runs the rules pass; an unhelpful 400 for a guide in rules mode; `check_forms_c34_ai.ts` can fail with `fetch failed` on a slow machine (keep-alive).
* **#603 R-146 IMM 5532 saved run: Saved check Pass, labelled `review: approved` (P-275).** The reviewer's Approve is on 9560dd3d and the head f431cc82 adds only the review record. IMM 5532 replays at US$0 (75 of 314 mapped, 22 proposals, none dropped); cost US$1.607568 matches usage × price. New check `tests/qa/check_qa_p227_imm5532_saved.ts` 22/22 (runs on a copy with the PR's run file; on main once #603 merges). Minor carried: Mac home-folder paths in the run file (row PE, P-263).

## Could not test
Live AI (no live variable tonight, even with the stand-in launcher; a rule to revisit: the stand-in launcher makes no model call, so qa could run those checks). The shared demo (:4400): not in this cloud copy.

## Hand-over (P-218: context near its limit; the next qa session picks up here)
* **Branch:** `claude/eager-allen-0cw0m4`. This is the open records PR; the tech lead merges records directly (P-285), so never label it. Before each push, check the PR is still open and merge origin/main into the branch (no rebase or force-push, AGENTS rule 1). #581 was squash-merged, so the branch had main merged in afterwards.
* **Not yet merged, to score on main when they land:** #563 QA-163 (C11.7, C2.12, C4.11: then rerun `acceptance/C4.11.test.ts` after Reset to the six, 4/23 today), #574 C2.6, #554 UX-A, #587, #585 C3.4, #603 IMM 5532 (then rerun `tests/qa/check_qa_p227_imm5532_saved.ts` on main and `acceptance/C11.7.test.ts`).
* **Open questions for the tech lead:** C4.11's step 5 lands 2 of 20 saved conditions (QA-162, Major): a third PR or a re-run? Who updates `acceptance/C4.11.test.ts` to the current run contract (`usd` is an object)? The C7.2 pack's "never ready" step contradicts itself after #572 (runtime lane). QA-170 (P-266 rename) goes into G-CORE B2's "Done when"?
* **How to run here:** `studio/node_modules/.bin/tsx --tsconfig studio/api/tsconfig.json …` (plain `npx tsx` fails on decorators). One isolated copy at a time. After a schema change, `prisma generate` the shared client (a stale one made `/demo/reset` throw tonight). Worktrees go under `/home/user` (postgres can't read `/tmp/claude-0`). Helper `runq.sh` pattern: start, run one check, stop.
