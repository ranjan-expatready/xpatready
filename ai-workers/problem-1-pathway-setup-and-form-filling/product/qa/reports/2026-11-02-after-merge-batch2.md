# qa after-merge, batch 2 — 2 Nov evening (main 9c516267 → 0d129be5)

Batch 2: #565 C11.15, #557 K13 names, #566 QA-162 (C4.7, C4.11), #569 G1 migration. Batch CI green (#580: 4 shards plus the final `ci` job). Every check ran on its own fresh isolated copy, one at a time; US$0, no live switch.

## Verdict
Sound: no Blocker, Critical or Major found in the batch. **M2 +2 Works: C11.15 and C4.7.** QA-162 drops from Critical to Major (its C4.7 half is fixed).

## Rows
| Row | Before | Now | Evidence |
|---|---|---|---|
| C11.15 | Partial | **Works** | `acceptance/C11.15.test.ts` 37/37 (was 33/37): Load sample replays the finder; Redo per stage (find, read, match) answers. qa head check on #565 passed (roles, bad stage, stale plan, live refused while off, double start; ledger US$0). Live Redo not run (P-276) |
| C4.7 | Partial | **Works** | Visitor visa configured: `acceptance/C4.7.test.ts` 17/17 (was 5/19). 13 of 23 saved picks land, tied by a tolerant match and shown at Check, never Ready; the 10 left out are listed with a reason |
| C4.11 | Partial | **Partial** | After Reset to the six still 4/23 (no IMM 5257 field map: QA-163, fix #563 not merged). Configured Visitor visa 14/23: the 7 steps complete at US$0, all four rules pass; step 5 lands 2 of 20 saved conditions (QA-162) |
| C4.2 (K13) | Works | **Works** | `acceptance/C4.2.test.ts` on `wp.family` 8/10, the **same on 9c516267** (not this batch): QA-125 (open Minor) and a pack fixture gap. `check_c42_marking_browser` in CI |
| C4.1 (K13) | — | unchanged | `acceptance/C4.1.test.ts` on `wp.family` 16/16 |
| C5.4 (#569) | Not built | Not built | Migration only (head check Pass); wiring PRs to come |
| C7.7, C6.7, C6.8 (K13 names) | — | unchanged | K13's `check_k13_names_browser.cjs` green in batch CI; not re-walked |

`qa/built/C11.15.md` and `qa/built/C4.7.md` removed. `qa/built/C4.11.md` stays (not Works).

## Bugs
* **QA-162** retest: **C4.7 half fixed**. The C4.11 half is still open: step 5 lands 2 of 20 saved conditions, and 18 are left out because their saved words match two questions or none (e.g. "Ever used other name" → two questions). Severity Critical → **Major**: incomplete, not wrong (nothing is guessed).
* No new bugs.

## Pack debt found (not product bugs)
* `acceptance/C4.11.test.ts` reads an older `GET /runs/:id` contract. `usd` is now `{spent, worst, usual, about}`, so "the whole run spent US$0" fails on `Number(object)` = NaN although spend is 0 (checked in `drafting_job` and in the run record), and step kinds are now `qd_conditions` and `checklist_draft`. About 5 of its 9 red steps are this. *Suggestion (Needed for the proof, Scaffolding):* the forms lane updates the pack's readers so the red steps that remain are real.
* `acceptance/C4.7.test.ts` and `C4.2.test.ts` on `wp.family`: setups that no longer work under later rules (a declaration fact can't come from the case officer; an unasked fact drops out of `fact-sources`), so two refusal checks are not exercised there. CI's own checks cover both refusals.

## Could not test
* Live AI anywhere (P-276). The shared demo (:4400): not in this cloud copy.

## Questions for the tech lead
1. C4.11 waits on #563 (QA-163) for the six, and on the rest of QA-162 for step 5 (2 of 20). Is a third PR planned for step 5's matching? The other 18 conditions need either the question list in the prompt for a fresh saved run (the PR says future runs see it) or a re-run on the Go.
2. Who updates `acceptance/C4.11.test.ts` to the current run contract: the forms lane or qa?

## Batch 3 (0d129be5 → 214db197: #576 PD)
* **C11.7 stays Partial.** `check_forms_pd_unique_paths.ts` 10/10 and `check_forms_pd_apply_replayed.ts` 8/8 (IMM 5532's unnamed XFA subforms get unique data paths). `acceptance/C11.7.test.ts` 18/21, the same three part-B steps red as before (Provincial nominee from paper twins, nomination certificate, IMM 5669/5406 Online). IMM 5532's saved map waits for its paid re-run on the tech lead's Go. No bugs.

## Batch 4 (214db197 → 4031894d: #579 T1 part 1, test-only)
* No capability row: `tests/speed_budget.cjs` only judges speed budgets on a GitHub machine when `SPEED_JUDGE=1`. `check_speed_budget.ts` 9/9, and 9/9 with `RUNNER_ENVIRONMENT=github-hosted`. No bugs.

## Batch 5 (4031894d → c155ebf3: #584 C3.13 rest)
* **C3.13 → Works.** `acceptance/C3.13.test.ts` 23/23 on Visitor visa configured (8/23 before #584, per qa-batch's #567). `check_c313_words_filters.ts` 32/32 and `check_c313_search_browser.cjs` 12/12. No bugs. Note for the tech lead: #567 also edits the C3.13 row (scored down before #584), so whichever records PR merges second keeps this score.

## Batch 6 (c155ebf3 → 2dd05e62: #573 C3.6 part not held)
* **C3.6 → Works, held part excluded (P-265)** (status "Works" so `progress.sh` counts it; the held part is named in the row). `acceptance/C3.6.test.ts` 18/18 on `wp.family` (was 17/18), `check_forms_c36_requirement_type.ts` 34/34, `_browser.cjs` 13/13. Held: guarded Add with AI co-pilot (P-252, P-253). No bugs.

## Batch 7 (2dd05e62 → d98041e7: #572 QA-165 part 1)
* **C7.2 stays Partial.** QA-165's "validated without validation" half is fixed through the endpoint, not only the reader: `tests/qa/check_qa_c72_validated_upload.ts` (new, 4/4) uploads the generated copy unchanged and with bytes appended (both 422, with the words to press Validate) and a copy whose own flag says Yes (validated). `check_qa165_form_validation.ts` 28/28.
* `acceptance/C7.2.test.ts` 1/10: 6 steps need the Mac's Adobe run (J6 step 6), and the barcode report (P-46) is not given. **Pack debt:** #572 changed the pack's "never ready" step to upload a *simulated validated* copy while it still expects "never ready", so the step contradicts itself; its P-171 (1) step runs on a fresh case whose copy writes 0 values, so it proves nothing either way. *Suggestion (Needed for the proof, Scaffolding):* the runtime lane restores the un-validated upload in that step and runs P-171 (1) on a case with confirmed facts.
* QA-165 stays open for the 3 Yes/No boxes and 6 of 46 empty mandatory fields.

**M2 count:** this PR's file says 44/60 (`tools/progress.sh`); main's says 41. With #567 (C3.12, C11.12, C5.7) it should be **48/60** once both merge, keeping C3.13 Works.
