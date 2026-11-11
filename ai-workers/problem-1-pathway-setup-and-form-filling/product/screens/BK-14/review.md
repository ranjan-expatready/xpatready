Verdict: Approve 2c9a35660467837c6b506819476ad078635d4e3f

# BK-14 review: AI review on any pathway's forms (runtime, Bake plan row 36)

**Commit reviewed:** 2c9a35660467837c6b506819476ad078635d4e3f (PR #1573, branch claude/magical-babbage-z92wte; diff `origin/main...2c9a356`). I first reviewed 5de0fa9a3. The only change after it, `5de0fa9..2c9a356`, puts `product/STAND-INS.md` back to origin/main's text. That file is the tech lead's, and the PR proposes the new SI-6 wording instead.
**Reviewer:** fresh session (screen-review plus journey-test in the reviewer role), 11 Nov 2026. I used isolated copy `rv_bk14` on :4493 with STUDIO_MADE_UP_REVIEW_RUNS=1 only. No STUDIO_*_LIVE was set. The copy was started and stopped in one command. I never used :4400.
**Scope:** a runtime and API row with no new screen. The concept is the row's text and "Done when", with P-319, P-425 and P-452. Only the Review page's chip words and form order changed on screen, so the BIC table is limited to that page.

## Done when: met, with evidence
| Condition | Result |
|---|---|
| A test shows the review picks the form for a non-Visitor-visa release | Met. The pure `check_bk14_review_any_form.ts` passed 15/15 on 2c9a356. On my copy, `check_bk14_sp_review_api.ts` passed 10/10 (144 s): IMM 1294 (06-2026), 72 boxes, "Saved (made-up test run): 2 new findings. US$0.00". |
| Visitor visa unchanged | Met. The pure check covers IMM 5257 (09-2023): same official text and same key `edition:IMM 5257:09-2023`. Web order is alphabetical (`fill-case.ts:208 .sort()`), so IMM 5257 still comes first for a Visitor visa person. I did not re-run the C7.5 browser or API packs; the builder reports 37/37 and 44/44. |
| No form, program or pathway branch in code | Met. `reviewSource` (`engine/runtime/form-review.ts:25-35`) reads only the field maps, the edition in use and the inventory path pattern. Searching review-runs.ts, form-review.ts, rounds.ts, review.tsx, findings.tsx and the `p2/prompts/form-review*` files found no form number in code. |
| B164 green with SI-6 removed from its allow-list | Met. B164 passed 52/52. The allow-list only shrinks (one entry removed). **Mutation:** with the old SI-6 words put back at review-runs.ts:68, B164 fails 51/52 and BK-14 fails 13/15. |
| Not touched: `prisma/schema.prisma`, `api/src/case-prepare.ts` | Met (neither is in the diff). |
| Money: no new way to a paid call | Met. `liveRefusal`, the plan checksum (review-runs.ts:206), `aiLive`, sources.ts, rounds.ts and the ledger are unchanged. `prepare` on origin/main already chose forms from field maps, so only the words and the web sort limited it, and no new live path opens. No test sets STUDIO_*_LIVE. On my copy, Live returned 409 "Live is off" with ai_batch unchanged. |
| A passing and a failing test for every rule | Met for `reviewSource`. **Mutations:** an IMM 5257/5707/5476-only branch fails 5 checks; dropping the p1/inventory pattern fails 1; dropping the code-equals-form check fails 1. |
| No explicit `any` added | Met for live code: `count-any.mjs --against origin/main` gives 418 → 418. The test file `check_bk14_sp_review_api.ts:267` has one `any` with eslint-disable. That is the house pattern (151 tests have it), and the ratchet does not count tests. |

## Points the coordinator asked about
* **prepare's refusals compared with origin/main:** the same three refusals, in the same order, with the same words and status 422.
  * "X has no printed edition in this case's release, so it cannot be reviewed." (`no_edition`)
  * "The official text of P is not on this computer, so it cannot be reviewed here." This is used both for `no_official_text` (no map, no inventory_file, or a path outside p1/inventory) and when the inventory file is missing on disk (review-runs.ts:132, :136). That keeps the old words.
  * "Nothing is filled on X for Y yet…"
  * The cast on review-runs.ts:133 is safe because `fail` returns `never` (core.ts:106).
* **The web order change is right.** No form is put first because of its number. The de-duplication is harmless: one entry per form per person. The comment is slightly wrong; see m2.
* **Nothing else limits the review to one form family.** The estimate constants (review-runs.ts:49-66) were measured on IMM 5257 but scale with inventory bytes. IMM 1294's worst case is US$4.80, under the US$5 job cap.

## Code (item 5)
* **Correctness:** checked above.
* **Duplicates under race:** unchanged; there is an advisory lock per case in `store`. My double click on Saved left 2 findings, not 4.
* **Server authorisation:** unchanged; the plan and run routes require the officer. A client gets "This page is for the case officer".
* **Types and graph:** `tsc` (api and web) shows no errors in the changed files. `graph.mjs --check` exits 0 with no gaps naming review-runs or BK-14.
* **Pure checks on 2c9a356:** c75_form_review_engine 67/67, stand_ins 9/9, c75_cross_checks 20/20.

## D1–D20 (runtime row; scores for what changed)
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | The row's text and every Done-when line are met (table above). |
| D2 | 5 | 2 AI rows on IMM 1294, replayed, 1 audit line; a double run adds no duplicates (DB read). |
| D3 | 5 | One `reviewSource` serves every form; no per-form code. |
| D4 | 5 | Every refusal path is tested at the reason-code level. |
| D5 | 5 | Reload and a repeated Saved run kept the data correct. |
| D6 | 4 | Edition, recording date and inventory are named on the card. The SI-6 register row lags the screen words (m1). |
| D7 | 5 | The finding shows AI, Replayed, High/Low with both rounds' reasons, and "The form says". The made-up banner shows. |
| D8 | 5 | Breadcrumb Cases › case › Review. |
| D9 | 5 | One primary button: "Run review (Saved, US$0.00)". |
| D10 | 5 | Plain words; the SI-6 tooltip no longer names one form family. |
| D11 | 5 | Steps are ticked, and the result line and toast say "2 new findings". |
| D12 | 5 | Team look, 1440 and 1024 px screenshots (my walk). |
| D13 | 5 | Keyboard: Open Review, then Run review. axe found 0 issues on 2 states. No sideways scroll at 400, 1024 or 1440 px. |
| D14 | 5 | Unchanged team components. |
| D15 | 5 | Review page in 496 ms; Saved run in 548 ms. |
| D16 | 4 | Rules are mutation-proven. The words mapped from reason codes are not tested through prepare (m3). |
| D17 | — | Simulated only. |
| D18 | 5 | Edition, official text and saved-run origin are shown. |
| D19 | 5 | Study permit case → filled → Review → findings → decide, all on the product's own screens. |
| D20 | — | Simulated only. |

## BIC (Review page only; other checks are N/A because nothing else changed)
| Check | Result | Evidence |
|---|---|---|
| BIC-11 | Met | One filled button per panel (walk step 01). |
| BIC-13 | Met | Refusals say what and why: 409 "No saved review" with the reason; 422 "not one of … forms" (API check). |
| BIC-14 | Met | The SI-6 chip's tooltip opens on focus with Today and Later. |
| BIC-18 | Met | Findings empty state, then 2 findings after the run. |
| BIC-19 | Met | One heading per panel at 1440 and 1024 px. |
| BIC-20 | Met | Keyboard-complete main path; axe 0. |

## Issues (none Blocker or Major)
* **m1 (Minor, Should): STAND-INS.md disagrees with the screen.** At 2c9a356, the SI-6 row (line 16) still says "the AI review live on the Visitor visa forms only … Other form families one at a time". The chips (review.tsx:145, findings.tsx:67) and STAND_IN_WORDS (review-runs.ts:68) say "any form", and the chip's tooltip points to "Row SI-6 of the stand-ins register". `check_stand_ins` compares only ids and status, so it cannot catch this. Item 6 of the PR body still says the PR narrows the row.
  * Fix: the tech lead applies the proposed SI-6 wording when the PR merges.
  * Fix: update PR body item 6 to "proposed, not changed".
* **m2 (Minor, Should): the comment at review.tsx:56-57 misdescribes the order.** It says "in the case's own order (its release's forms, then any added)", but `/forms` lists them alphabetically (fill-case.ts:208). Behaviour is right.
  * Fix: say "the order /forms gives (by form number), none put first".
* **m3 (Minor, Should): the refusal words are not tested.** No test anywhere checks the words of the "no printed edition" or "not on this computer" refusals. This was already true on origin/main. The pure check's "this computer lacks" case (check_bk14_review_any_form.ts:179) exercises the test's own helper, not review-runs.ts:134-136.
  * Fix: one check that calls prepare (or the plan route) for each refusal and asserts the words and 422.

## What I could not check
* I did not re-run the Visitor visa C7.5 packs. The builder reports review_runs_api 44/44, saved_run_tripwire 22/22, findings_api 55/55 and review_page_browser 37/37. Running that browser test rewrites committed C7.5 screenshots.
* I did not do a 200 % zoom pass and did not use a real screen reader.
* D17 and D20 need an intended user's unaided walk (founder).
* CI on 2c9a356 shows only the draft guard (green); the full check runs when the PR is marked ready.

Journey score: **8.5/10, pass** (`journey-test-reviewer-2026-11-11.md`).

**Verdict: Approve** (no open Blocker or Major) for 2c9a35660467837c6b506819476ad078635d4e3f.
