# C7.3 answer sheet (#358): delta review after #356 merged to main

Reviewer role, 2 Nov 2026. PR #358, `claude/runtime-answer-sheet`, base `main`. Head reviewed: **beba2e79**. Last approved: **7595e170** (`C7.3-rebase/review.md`). Live AI OFF, US$0. No ports used. The only run was the engine check, which needs no server or database.

## What changed after 7595e170

`git log origin/main..beba2e79` lists these commits after 7595e170:

* `8b5ae613`, `941e8fe0`: records only. These are the C7.3-rebase review and journey test. The supersede merge adds just these two `.md` files.
* `e213711b`, `d7da9435`: merges of `claude/runtime-prepare-2` (#356). They bring in `929727b1` and `68d52573`, the test usage-line and port fix for `check_vv_prepare_store_api`, which was reviewed in #356 (r5 delta, Approve on 68d52573).
* `756f524c`: records only (`C6.12-C11.6/review-r5-delta.md`).
* `beba2e79`: merge of `origin/main` at 54019473. That main includes #356 (04312cc1), #397, #401, #394, #395, #389, #390 and #398.

None of these commits changes C7.3 code.

## Checks

| Check | Result |
|---|---|
| `git merge-base --is-ancestor origin/main beba2e79` | Yes. Main (54019473) is fully merged into the PR. |
| `git merge-base --is-ancestor 7595e170 beba2e79` | Yes. The reviewed commit is in the PR's history. |
| Non-`.md` part of `git diff origin/main beba2e79` compared with the non-`.md` part of `git diff 351aa879 7595e170` (the reviewed C7.3 patch on its old #356 base), ignoring `index` lines | **Identical.** 12 files, +540/−18, all in the C7.3 scope: `engine/runtime/answer-sheet.ts`, `api/src/case-prepare.ts` (sheet in the prepare view, `GET items/:id/answer-sheet`, `POST items/:id/screens/:key/entered`, C7.7 `POST items/:id/pdf-copy`), `api/src/fill-case.ts`, `contracts/runtime.ts`, `prisma/schema.prisma` (`EnteredSection` plus back-relations on Case, FilingItem and AnswerSnapshot), migration `20261102040000_c73_entered_section`, `acceptance/C7.3.test.ts`, `tests/check_vv_answer_sheet.ts`, `tests/check_vv_prepare_api.ts` |
| Non-`.md` part of `git diff 7595e170 beba2e79` compared with the non-`.md` part of `git diff 351aa879 origin/main` | **Identical** (16 files, +436/−14). The delta is exactly what main and #356 brought in. |
| `.md` part of `git diff origin/main beba2e79` | Six records only: `qa/built/C7.3.md`, `C6.12-C11.6/review-r5-delta.md`, `C7.3-rebase/review.md` and its journey test, `M3-E-answer-sheet/review.md` and its journey test. |
| Overlap between files main changed since 351aa879 and C7.3's files | None. Main changed `runs.ts`, `draft-qd.ts`, `saved-readings.ts`, `draft-contract.ts`, web `add-to-structure.tsx` and `review.tsx`, `item-words.ts`, and tests. It did not change `case-prepare.ts`, `fill-case.ts`, `contracts/runtime.ts`, `schema.prisma` or any migration. No route collides with the new routes: `pdf-copy`, `answer-sheet` and `entered` appear only in `case-prepare.ts`. |
| Nothing from main undone | Holds. The two diff equalities above mean every main change reaches beba2e79 unchanged, and the PR's only change on top of main is the reviewed C7.3 patch. |
| Migrations (`ls prisma/migrations` at beba2e79 against main) | The only addition is `20261102040000_c73_entered_section`, and it sorts last, after main's newest (`20261102030000_c612_c116_prepare_items`, `20261102010000_c612_prepare_filings`, `20261102010000_c1110_person_preference`, `20261101210500_c119_form_order`). Main added no migration after 351aa879. The SQL creates one table and refers to `runtime_case`, `filing_item` (created by 20261102030000) and `answer_snapshot`, all of which exist on main. It also creates a partial unique index (`WHERE superseded_at IS NULL`) and states its rollback. It applies on top of main's chain as it did at 7595e170, where the builder's fresh-copy runs applied it. |
| `tsx tests/check_vv_answer_sheet.ts` at beba2e79 (working copy, no DB, US$0) | 13/13 passed |

I did not re-run the builder's database suites. Nothing above suggests they would differ: the C7.3 patch is byte-identical, and main changed none of its files. The builder's results at beba2e79 stand: check_vv_answer_sheet 13/13, check_vv_prepare_api 32/32 (pack 4: C6.12, C11.6, C7.3), check_vv_prepare_store_api 33/33, check_vv_prepare_store 11/11, the web build, and tsc clean apart from three test files that already failed before this PR.

## Journey test

There is no new journey report. The code and the user-facing behaviour are byte-identical to 7595e170, so the reviewer journey `C7.3-rebase/journey-test-reviewer-2026-11-02.md` carries forward with its score. **Journey score: 9.5/10, passes.** D17 and D20 remain simulated only.

## Findings

No Blocker or Major issue. No new Minor issue. The Minors from earlier rounds stay as recorded in `C7.3-rebase/review.md`: m6, n7, n2, n3, m2, m3. The PR's first lines must still say that IMM 5707 cannot reach Done until the parents are collected.

**Verdict: Approve** for commit **beba2e79**.
