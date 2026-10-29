# Forms lane: audit of the late work before the Lead merge (fresh session, 29 Oct)

Branch `claude/forms-r69-fix-4af07a`. Audited from the code and the decisions rows, not from the old chat. No live AI, US$0.

## 1. Verdict
**Clean except two real bugs, both fixed with pass and fail tests (commit in §3).** Every claim of the 13:05 handover holds in the code; the plans match their decisions. Items not this lane's, or older than the late work, are in §6 for the Lead.

## 2. Commits read, newest first (branch only; slice 0 and contract v2 `9049a49d` are already on main)
| Commit | Claim | Found in the code | Tests (pass and fail) |
|---|---|---|---|
| `8ff87e5e` | QA-88 words in `check_ai_launch_paths`; QA-90 plan | as said; plan 10 lines, no code | the check's label only |
| `569cc7e3` | QA-86 refused (4xx bar 408/409/429) or busy (429/500/502/503/529) at US$0; timeout at worst case | `p2/runner.ts` settle + outcomes `refused_by_provider` · `busy` · `timed_out`; status `timed_out` is in `drafting-run.v0` | `check_forms_ai_errors.ts` (3 shapes × 3, busy, timeout), `check_p2_guard.ts` QA-87 lines |
| | QA-87 retry only after a named wait ≤ 30 s; round budget sized from the input | `retryAfterSeconds`, `MAX_RETRY_AFTER_S = 30`; `rounds.ts sizedBudgetUsd` (≥ US$1, ≤ run cap); `AiStep.budget_usd` / `timeout_ms` (defaults: sized, 300 000 ms) | `check_forms_ai_errors.ts` 429 short/long wait; `check_forms_rounds.ts` sized budget, per-step job settings |
| | QA-88 plain words; request id under Details | `engine/ai-run.ts explainRun` per outcome; `rounds.ts` reasons + `details`; `p2/launch.ts` keeps `attempts[].request_id` | both files above (raw JSON/codes never in the sentence) |
| | QA-89 no checker after a failed first guide round | `finder.ts` sends round 2 only when `d.ok` | `check_forms_s4_finder.ts` QA-89 pass and fail (fake launcher) |
| | QA-85 who_can_be stub | `p2/stubs/who_can_be.json` | `check_forms_schema_lint.ts` part B |
| `c17615ec` | lint per the provider docs; 4 paid attempts per form shown first; 800 KB request cap at US$0 | `check_forms_schema_lint.ts`; `p2/policy.ts MAX_PAID_ATTEMPTS_PER_FORM = 4`, `paidRetryAllowed`, `ai.ts` refusal; `MAX_REQUEST_BYTES = 800000` refused before any reservation; dialog cost line | lint 24; `check_forms_rounds.ts` G4/G5; `check_p2_guard.ts` |
| `3bcd7cce` | P-156 plan | `plan-p156.md` §1–§5 match P-156 (1)–(4); 2 Lead questions | plan names a pass and a fail per rule P156-1…7 |
| `61264d86` | demo bug QA-83: no `maxItems`; who-can-be no `minimum`/`maximum`; 4xx at US$0 | schemas edited; limits moved into code (`finder.ts` 5 pages, `people-ai.ts` 0–9) | schema files checked by lint; **the code limits had no behaviour test** (§3 fix 2; 0–9 in §6) |

Measured, not assumed: the sized budget estimate (files + prompt + 8 KB) is above the real request for the finder's largest set (Visitor visa: estimate 79 868 bytes, real request 72 387), so both attempts fit the cap. No TODO, stub or half-done code found in these commits.

## 3. Bugs found and fixed (commit `e838097d`)
1. **A counted attempt hidden behind "nothing was charged" (QA-86/88 gap).** A run whose first attempt timed out or dropped (counted at its worst case) and whose retry was refused or busy was shown as US$0 and "nothing was charged" (`rounds.ts` returned `costUsd: 0`; `ai-run.ts` said "nothing was drafted or charged"). Now the run's recorded cost is kept and said. Tests: `check_forms_rounds.ts` (2 fail, 1 pass), `check_forms_ai_errors.ts` (2 fail, 1 pass); the 4 fail tests fail on the old code (run by swapping the two files back).
2. **"At most 5 other pages" had no test (P-153).** Moved to `engine/rounds.ts otherPages` / `MAX_OTHER_PAGES`, used by `finder.ts`; `check_forms_rounds.ts` pass (≤ 5 kept) and fail (8 → 5, non-titles dropped).

## 4. Checks run on the exact commit
Node 24, `prisma generate`, `web/dist` rebuilt before each run. Mac, port prefix `forms_`.
* **Full `run-suites.sh` on `e838097d` (the fix): 65 pass, 2 fail, 1 skipped** (`check_studio_browser.cjs`: resets :4400, CI only). Both fails were rerun alone on the same commit:
  * `check_forms_s4_library_browser.cjs` failed only on "Forms first view under 1 s" (1101 ms, while another lane's suites ran on the same Mac); **alone: 69/69**.
  * `check_s5_slice3_browser.cjs` (runtime's) P-116 Undo-bar step: **a race, on both versions**. Fixed source: 35/35 in 2 of 5 runs (34/35 in the others, always this step); pre-fix source (`HEAD~1`): 35/35 in 1 of 3 runs, 34/35 on the same step in the other 2. A debug copy shows the toast is already up while the row and the "Last change" bar have not caught up. Not this lane's code (§6).
* Named checks on `e838097d`: `check_forms_rounds.ts` 60/60 · `check_forms_ai_errors.ts` 20/20 · `check_forms_schema_lint.ts` 24/24 · `check_p2_guard.ts` 80/80 · `check_forms_s4_finder.ts` 140/140 · `check_forms_proposal_contract.ts` 20/20 · `check_ai_launch_paths.ts` 39/39. `tsc --noEmit` for api and web: clean. `graph.mjs --check`: pass (G3 2: `main.ts` attachment routes, not this lane).
* Baseline on `f0912a47` (= code `8ff87e5e` plus main's documents): 66 pass, 1 skipped, 1 fail. The fail was `check_forms_schema_lint.ts`, caused by this session's edit landing during that run (it read `finder.ts` for `.slice(0, 5)`). It now reads the helper. The old "67/67" is consistent with the 66 + that check.

## 5. Decisions and bugs traced (forms-owned)
| Item | Built (file · test) | Planned (file §) | Missing |
|---|---|---|---|
| P-102 extension parked | `engine/channels.ts`, `contracts/forms.ts` (no capture) · `check_forms_channels.ts`, `check_forms_slice2*.ts` | — | — |
| P-103 / P-123 / P-125 finder: canada.ca only, on a click, cost first | `api/src/canada.ts` host refusal · `check_forms_s4_canada.ts` C11.2; button "Find forms with AI (about · at most)" · `check_forms_s4_finder.ts`, `check_w1_start_setup*.{ts,cjs}` | P-156 changes the page pick: `plan-p156.md` | — |
| P-114 route step | superseded by P-122 and P-143 | — | — |
| P-143 four channels + signature value | today's three channels (`engine/channels.ts`) | `plan-slice1-channels.md` | build waits for slice 1 Go |
| P-121 two rounds, quote or dropped | `api/src/rounds.ts StepRunner`, `engine/agreement.ts compareRounds` · `check_forms_rounds.ts`, `check_forms_s4_finder.ts` | `plan.md` §5 | — |
| R-126 unreadable hand upload waits, no AI | `api/src/upload-run.ts` NEEDS_PERSON · `check_forms_s4_runs.ts` C11.11 (M1) | — | — |
| P-126 build ahead | process rule, no code | — | — |
| P-138 drafting only on a click | Re-read / Draft with AI opens `ai-launch.tsx` with cost first, nothing runs before Start | `plan.md` §5 (saved draft replays at once, button wording) | wording "Draft fields with AI (about · at most)" with the plan |
| P-139 US$120 cap | `p2/policy.ts EXPERIMENT_CAP_USD = 120` · `check_forms_rounds.ts` P-139 | — | — |
| P-140 channel proposed in the finder's rounds | — | `plan-slice1-channels.md` | build (slice 1) |
| P-144 / P-145 validated copy read back; "Copy, not for filing" | — | `plan-slice1-channels.md`; W1-16 `plan.md` | build (slice 1) |
| P-149 + contract v2 (approved 29 Oct) | `contracts/proposal-item.ts` (on main) · `check_forms_proposal_contract.ts` (20) | `queue-item-contract.md` | — |
| P-150 / P-152 W1-16 masters, online-only flag | — | `screens/W1-16-forms-masters/plan.md` slices a–h | build (W1-16 Go) |
| P-153 rules in code, traced | code limits with tests (§3 fix 2; schema lint) | shared rules file: W1-16 `plan.md` §5 slice r | decision checker is the Lead's tool |
| P-154 `case_officer`, no "agent" | `contracts/proposal-item.ts` · `check_forms_proposal_contract.ts` | — | — |
| P-156 library first, checklist page per combination | — | `plan-p156.md` slices a–f | build (after Lead answers Q1–Q2) |
| P-158 every item from a source; rule reference on `ProposalSource` | — | lane file Handover only (queued, not started) | **no plan section yet** |
| P-162 field formats from the form | — | lane file Handover only; to go into `plan-p156.md` | **no plan section yet** |
| P-165 | not found in `DECISIONS.md` on main `ee5a901f` | — | Lead to name it |
| QA-83 guide schema | `find-guide-output.v1` · `check_forms_schema_lint.ts` | — | — |
| QA-84 who-can-be schema (runtime's row) | schema fixed in `61264d86` · lint | — | 0–9 code check has no behaviour test (§6) |
| QA-85 stub | `p2/stubs/who_can_be.json` · lint part B | — | — |
| QA-86 / QA-87 / QA-88 / QA-89 | §2 | — | Who can be's own words (runtime, §6) |
| QA-90 one ledger | — | `plan-qa90.md` (PLAN only) | build, after the Lead's answer |

## 6. For the Lead (not fixed here)
* **Runtime's half of QA-88 on Who can be:** `people-ai.ts` lines 173 and 176 still put the launcher's own text in the sentence ("The guarded AI route refused the job before any call: …"); line 179 does not say busy or refused. The runner fixes (US$0, waits) already apply there.
* **0–9 people (QA-84):** kept in `people-ai.ts` (61264d86) with no behaviour test; the natural place is runtime's `check_s5_people_ai.ts` (a saved answer with `max: 12` dropped with "not a whole number from 0 to 9").
* **Flaky runtime check:** `check_s5_slice3_browser.cjs` step "P-116 pass: the line goes…" reads the row and the Undo bar right after the toast appears; it failed in 5 of 8 runs, on both versions (§4). It should wait for `[data-undo-bar]` to name the removal.
* **Two schema lints:** `check_forms_schema_lint.ts` copies qa's parts A+B; when qa's `check_qa_ai_paths.ts` lands on main, keep one.
* **Forms tab, older than the late work:** the status line reads "Last find today 1:21 p.m.." (the time's own full stop plus the sentence's), and after a failed find the heading says "AI found 0 forms for this combination" above "A step failed". Proposed: drop the doubled stop; heading "The last find did not finish" when the run failed. Their browser checks are runtime's and screens' (`check_s5_slice3_browser.cjs`, `check_w1_start_setup_browser.cjs`).

## 7. Experience walk (isolated copy `forms_walk`, :4452, sample loaded, fake launcher; 1440 and 1024)
Study permit › Forms: cost on the button before any call (about US$0.31 · at most US$5.58); a failed AI step says "could not start on this computer, so nothing was sent and nothing was charged"; steps shown with US$0 each; no codes or P-numbers. Library › Forms › Re-read with AI: Live shows expected, worst case, "at most 4 paid attempts per form, a retry included", spent of US$120 before Start. 1024: no sideways scroll, dialog fits. Tooltips per `EXPERIENCE.md` §10 present on statuses and icon buttons.

## 8. Reuse
Filling: `api/src/fill.ts` runs `p5/fill.py`. The branch adds no PDF, barcode or inventory code, so nothing duplicates `E1/tools/barcode_compare.py` or `inventory.py`.
