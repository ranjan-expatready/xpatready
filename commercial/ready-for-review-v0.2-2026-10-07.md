> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Ready for review — commercial plan v0.2 and configurable model

**Handoff from Claude (author) to Codex (independent recheck), 7 Oct 2026, 19:17 IST.** Format follows `company-planning/HANDOFF.md`.
- **Responds to:** `company-planning/reviews/commercial-v0.1-review-2026-10-07.md` (CR-01–CR-12) and `company-planning/reviews/model-v0.2-brief.md`.
- **Author edit pause:** no edits to the files below until Codex's recheck arrives, except to record founder answers to QB-1–QB-4. Any such edit will be listed here with new hashes and a refresh.

## 1. What to review

SHA-256, first 12 characters; workbook fingerprint `e16bfb6cbb3d5357` (inputs + actuals + model logic).

**Update, 21:16:** Ranjan ran `refresh_reports.py`. Inputs and logic were unchanged (same fingerprint; all 9 blocks current). Only the generation timestamps inside the blocks and the workbook's cached values changed, so the hashes below are the post-refresh ones.

| File | Hash | State |
|---|---|---|
| `04-execution-team-financial-workbook.xlsx` (model v0.2.0) | 6c8693bdfeee | Six cases, Checks PASS, 0 formula errors (90,880 formulas) |
| `review-dispositions.md` | 0faae6b290de | All 12 findings fixed; three qualifications explained |
| `00-decision-summary.md` | 177473ea057e | Conditional draft; generated block current |
| `00-evidence-baseline.md` (v1.3) | 9be21c17ea73 | FND-1 reworded (CR-10); DEC-11 (GAP-17) added |
| `01-market-revenue-strategy.md` | bb717da63dd7 | Generated A1_MARKET, A1_SCEN |
| `02-sales-affiliate-cs-playbook.md` | 1cf8f7e95e1e | Outreach checklist §5a (CR-09); generated A2_REFERRAL |
| `03-funding-investor-plan.md` | b5b7037ee1cf | Rewritten (CR-06, CR-10); generated A3_FUND |
| `04-execution-team-financial-workbook.md` | d1d3be12f28e | Rewritten; §8.1 pilot safeguards (CR-11); generated A4_* |
| `coverage-map.md` | f7132750265c | C01–C51 |
| `tests/acceptance-report-2026-10-07-1915.md` | 9dc2136d5d53 | 23 of 23 PASS |
| `tools/*.py` | build 05ae3a7cffa6 · refresh ff5d0b0abaac · check 3204966e45a8 · tests 418d0ece0592 · independent 17c11573b62e · recalc 1ecaf9a62526 · spec 17cfeaa500f4 · helpers 776326c8e78c | v0.2 |

## 2. Ready versus conditional

| Ready for decision (by Ranjan; external actions need his yes) | Conditional |
|---|---|
| Use the workbook as the single editable model (Guide tab) | Every cash and funding figure: product cost is a placeholder (QB-1); opening cash is unverified |
| Correct website claims, including "client records only" migration (GAP-17) | Pricing amends FD-18's unit (QB-3); willingness to pay untested |
| Engage counsel and an accountant (fixed scope) | Referral, outreach and securities points need counsel; CCPC and SR&ED need the accountant |
| No success-fee finder; no sales hire at base gates | Pilot use of real client data waits for the A4 §8.1 evidence |

## 3. Checks actually run

1. **Recalculation:** LibreOffice headless, 90,880 formulas, 0 errors (`tools/lo_recalc.py`).
2. **Acceptance tests** (Codex brief §6): **23 of 23 PASS**.
   - Groups: input rejection; scenario inheritance and isolation; annual-only and monthly-only billing; deposits, credits, expiry, refunds and clawback; no-customer N/A; funding removed or delayed (within-month shortage not hidden); launch, onboarding and sales-cycle timing; reconciliations; frozen actuals and duplicate imports; stale detection and refresh; rebuild preservation; independent recalculation and a planted ARR × 10 error; delivered-workbook status.
   - The earlier run at 19:06 failed 10b (the rebuild picked up the Actuals legend). It was fixed and re-run.
3. **Independent Python model** (`tools/independent_model.py`, explicit cohort loops) agrees with the sheet on revenue, MRR, collections and cash. All six cases, 36 months; maximum difference about 4 × 10⁻⁹ CAD.
4. **In-workbook invariant checks** (Checks tab) pass in all six cases: customer movement, MRR movement, ARR identity, deferred-revenue closed form, receivables, deposits, non-negative balances, cost classification, cash identity, whole-period cash.
5. **Stale detection:** `tools/check_reports.py` reports 9 of 9 blocks current. Reports!B10 says "Current"; test 10a shows Current → STALE → Current.

**Not done:**
- no review of the four sites that blocked automated reading (R3);
- no tax lines or opening balance sheet;
- no charts (deliberately: openpyxl would drop them on refresh);
- the team's 9 Oct plan has not been received.

## 4. Requested reviewer actions

1. **Recheck CR-01–CR-12** against `review-dispositions.md`, especially the three qualifications:
   - plan and channel as mixes inside cohorts;
   - gross margin negative early, with payback on unit contribution;
   - the no-finder recommendation (commercial, not legal).
2. **Re-run or extend the acceptance tests** (`python3 commercial/tools/acceptance_tests.py`, about 6 minutes) and plant your own error. The workbook must stay unchanged; tests use copies.
3. **Challenge the model's semantics:**
   - monthly versus annual churn;
   - referral credit timing and classification;
   - deposit pooling across founding firms;
   - the funding-need formula (floor gap to milestone plus reserve × 3-month average burn);
   - the gating logic using previous-month values.
4. **Check that no forecast number appears outside generated blocks** in the artifacts. Narrative statements derived from the model, such as the decision summary's "spring 2027", are flagged for author review on each refresh.
5. **Check the decision summary's few founder decisions** (QB-1–QB-4 and the authorisations) for completeness.

Findings go to `company-planning/reviews/`.

## 5. Open decisions and risks

- **Ranjan:**
  - QB-1: product cost and verified cash;
  - QB-2: licensed founder, equity, control;
  - QB-3: pricing unit and levels;
  - QB-4: India team engagement;
  - authorisations: website, counsel and accountant, outreach.
- **Top risks** (A4 §7):
  - R-01 cash timing;
  - R-05 website claims;
  - R-07 content and migration breadth;
  - R-12 model or report drift.
- **No external action taken:** no contact, publication, spend, hire, equity promise or application.
