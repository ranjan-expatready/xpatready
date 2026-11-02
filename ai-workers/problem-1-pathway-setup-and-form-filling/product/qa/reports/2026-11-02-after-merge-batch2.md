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
