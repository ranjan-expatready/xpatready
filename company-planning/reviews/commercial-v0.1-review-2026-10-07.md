# Codex review — commercial plan v0.1

**7 Oct 2026. Verdict: useful conditional draft; revise before relying on funding amounts, unit economics, hiring dates or investor outputs.** Claude remains the artifact author. Codex has not changed commercial files or executed any external action.

Reviewed the four artifacts, summary, baseline v1.2, coverage map, workflow review, workbook formulas and builder, with targeted research checks. Core hashes match the author's handoff; [manifest](reviewed-file-hashes-2026-10-07.json). Calculation tests used disposable in-memory imports in a second spreadsheet engine; [results](model-audit-2026-10-07.json). Original workbook SHA-256 remains `80d14aec8945d946fc7828706ad4e21ccd94fb0d4d71faefd2134a5b51fa98ef`.

This review also incorporates Ranjan's latest request: change an assumption once and update the financial framework and dependent outputs. The implementation requirements are in [model-v0.2-brief.md](model-v0.2-brief.md). No revised workbook is being represented as complete.

## Findings requiring correction

### CR-01 — Blocking for configurable use: missing and invalid inputs produce plausible forecasts

**Location:** workbook Inputs!D8, D19:D21; Summary!C6:C8; corresponding inputs in the other scenarios.

Clearing product cost D8 silently treats unknown cost as zero: the projected cash-out month changes from 8 to 20, and funding need falls from CAD 955,180 to CAD 205,180. Entering 80% Solo and 80% Practice makes Firm share −60% and projected ARR negative without an explicit invalid-input message. A formula-error scan does not catch either.

**Fix / owner Claude:** required-input and domain validation; preserve legitimate zero separately from unknown. Invalid selected assumptions must make affected outputs unavailable with the reason, not a believable forecast. Bound rates, quantities, dates, mix totals and cash provenance. Acceptance: reproduce both cases and show explicit input failures. This is particularly important for founder experimentation.

### CR-02 — Major: ARR is described as annual revenue

**Location:** 00-decision-summary.md §What the evidence says, item 3; pasted final answer; workbook Summary!C17/C19 and M2_Lean-Base!H34:S34.

March 2028 MRR is CAD 13,733.63 and ARR is CAD 164,803.50. The latter is 12 times that month's recurring revenue. In the same draft model, subscription revenue summed from April 2027 through March 2028 is CAD 88,791.69, before any correction to recognition mechanics. It is not CAD 165k earned in that year. The 13-month March 2027–March 2028 total is CAD 90,264.01.

**Fix:** report MRR, ARR run rate, actual/forecast period revenue and cash collections separately, with explicit periods. Don't label MRR as accounting revenue by definition. Include non-recurring fees only where appropriate. [ARR definition](https://help.chartmogul.com/article/155-chart-annual-run-rate-arr).

### CR-03 — Major: the proposed offer and billing mechanics are not modelled consistently

**Location:** A1 D-P4–D-P6; A2 S-7; Inputs!D25:D31/D44; M2_Lean-Base rows 34, 38–44; builder annual, migration and referral formulas.

- Setting all standard customers to annual billing (D26=100%) still produces CAD 985.50 of migration fees in March 2028, although the proposed offer includes migration on annual plans. The attach-rate input is not constrained to eligible monthly customers.
- The combined referral reward remains CAD 430 when prices change; the included free-month cost is not derived from the affected subscription. Credit versus cash, reward timing, refunds and the annual extra-month offer are not modelled separately. Non-licensee 15% affiliate commissions have no distinct schedule.
- Annual subscribers lose MRR monthly under the single churn pool even though the offer has annual terms and limited refunds. Renewal collections and deferred revenue are only approximations; this can misstate revenue and cash liabilities under experiments.
- All founding deposits are deducted in the annual-prepayment row, regardless of billing type. Large deposits can create negative net invoice collections instead of a customer-credit balance. Founding discount duration and stacking with annual discounts are not explicit controls.

**Fix:** forecast contract cohorts by start month, plan, billing period and offer; link invoice/cash/recognition/deposit/credit schedules. Include refund/default and collection timing. Test annual-only, monthly-only, deposit greater than invoice, refund, and free-month cases. Do not wait for actual customer history to build the forecast's cohort structure; historical retention evidence can remain unavailable.

### CR-04 — Major: hiring and spending gates are prose, not active model controls

**Location:** A4 E-2/E-3, §3.3 and §4; Inputs!D50:D56/D69; M2_Lean-Base rows 14, 20, 48, 52.

Changing the raise to zero leaves commercial spend at CAD 413,050 through March 2028, including CAD 21,600 monthly staff cost from September 2027. This is a valid unmitigated stress case, but it is not F-2's managed no-raise fallback. The model starts specialist #2 and rep #1 in month 12 regardless of customer load, close history, payback or cash. Founder opportunities are 12 a month in the base input, whereas the sales-hire trigger requires 15 meetings a week for four weeks. The forecast does not demonstrate that trigger being met.

Deferring only specialist #2 and rep #1 changes 18-month commercial costs to CAD 298,320, March ARR to CAD 131,128 and funding need to CAD 738,923. This is a diagnostic sensitivity, not an approved alternative.

**Fix:** keep separate unconstrained growth and cash-constrained operating cases. For each role show requested date, earliest justified date, unmet prerequisites and explicit scenario override. Link hours for sales, onboarding and ongoing support to actual capacity. Do not infer gate approval from a calendar date or a forecast metric. Reconcile the conflicting weekly/monthly sales-capacity assumptions.

### CR-05 — Major: cost-per-acquisition and margin are not yet investor metrics

**Location:** workbook Summary!C15/C23; M2_Lean-Base rows 48–59; A2 S-7; A4 §5; README's reference to CAC.

The CAD 4,810 figure is explicitly all commercial costs divided by firms onboarded. It includes customer success, fundraising/finance and legal work, while referral rewards sit outside that numerator. It is not a clean CAC measure. The approximately 85% gross margin deducts variable cost and payment fees but omits delivery/support labor; card fees are based on collections including prepayments/migration rather than aligned subscription revenue. Two CAD 6,900 CS roles are material relative to CAD 13,734 monthly revenue. Allocation requires a stated policy rather than assigning every role to acquisition or overhead.

**Fix:** separate sales/marketing acquisition cost, service-delivery COGS, R&D and administration/fundraising; allocate mixed roles once. Report gross margin, contribution margin and operating result distinctly. Calculate CAC/payback with matching acquisition cohorts/channel costs, and show no reliable observed LTV until retention evidence exists. Keep the existing all-commercial-cost measure under its descriptive name if useful. [Metric definitions](https://chartmogul.com/saas-metrics/).

### CR-06 — Major: funding recommendation is more definite than the model supports

**Location:** A3 F-1/F-2 and §3; summary item 4; Summary!C6/C8/C10; Inputs!D5:D8/D80:D82.

Recalculation reproduces the draft's month-8 cash deficit and CAD 955,180 funding need. This verifies arithmetic under its assumptions, not the actual cash deadline. Product cost is a placeholder; spending gates are not enforced; refund/tax/collection schedules are incomplete. “Closing by 31 May” is unsafe precision when May is the first negative month: end-of-month cash cannot prove bills can be paid earlier that month. “Committed” is not cash received. The six-month buffer uses historical average gross costs; that does not necessarily buy six months at the future run rate. “Sanjay bridges” is an option, not a commitment.

**Fix:** date and verify opening available cash and cost commitments. Derive funding timing from forecast cash trough, configurable minimum cash and process lead time; use a weekly cash view near the shortage. Show bridge amount/date, cuts and unmitigated downside explicitly. Size funding to a chosen milestone and forward cash reserve, alongside a cost-controlled path to traction. Keep CAD 1M as a scenario pending corrections, not a settled requirement.

### CR-07 — Major for latest request: one change does not update the whole framework

**Location:** Inputs columns C:F; commercial/tools/README.md and builder INPUTS; hardcoded monthly calendar/timing; all four Markdown artifacts.

Shared prices/costs are repeated across four columns and in the builder. The tools README explicitly says spreadsheet edits must also be copied back into the script or a rebuild overwrites them. Start month, model horizon, sales lag and some one-time spend dates are hardcoded. Written plans and stress tables are static. Trackers are templates, not an actuals-to-model data feed. Changing one assumption therefore updates only part of the intended system.

**Fix:** implement the linked model brief: one editable source, common defaults plus deliberate scenario overrides, one calculation model, preserved actuals, generated numeric exhibits with version/date and stale-output detection. Document what recalculates in Excel and what needs the explicit report-refresh step. Remove the requirement to edit Python after editing Excel.

### CR-08 — Major: summary drops material limits of the market evidence

**Location:** summary item 1–2; A1 §2/§7; R7 §0–1.

The CICC report supports **11,994 RCICs plus 507 RISIAs in good standing as of 30 June 2025**, not 12,500 current RCIC buyers. It also supports the reported practice-experience share. These do not establish the number or age of firms, future market stagnation, or reachable prospects. The CAD 8–17M RCIC-practice pool is constructed using an unverified 1.5–3 practitioners per practice and this draft's ARPA; lawyers are excluded. The summary's Canada-wide CAD 10–20M ceiling and venture implication are stronger than those premises support.

The updated baseline RAN-9 records that Ranjan later clarified the earlier 25,000 estimate to mean licensees. That narrows my initial audience-comparison concern; do not reopen the answered question. Still retain distinct units/date and uncertainty in the final summary.

**Fix:** date and label licensee counts; separate RCIC/RISIA, people/firms, reachable accounts and lawyers. Show a market-size sensitivity rather than a measured ceiling. Practitioner experience is a segmentation hypothesis, not proof of practice age or willingness to buy. [CICC report, pp.12–15](https://college-ic.ca/ICCRC/Assets/Documents/AnnualReport/2025_Annual_Report/2025%20College%20Annual%20Report-1.pdf).

### CR-09 — Major before outreach: playbook omits conditions contained in its own research

**Location:** A2 S-6, §5 rule 5; R3 §3.

The operational rule for the first referral message omits the requirement that the individual referrer have a qualifying relationship with both sender and recipient. This matters especially for non-customer referrers. Public availability of an address alone is also insufficient; the published-address route needs absence of a no-solicitation statement and relevance to the recipient's role. R3 explains these conditions, but the abbreviated playbook does not retain all of them. LinkedIn needs an applicable consent basis, not a general public-profile shortcut.

**Fix:** preserve the complete applicable conditions and evidence fields in the usable outreach checklist; qualify statements pending counsel. I could directly retrieve the CRTC FAQ that was blocked during Claude's run. [CRTC referral and published-address guidance](https://crtc.gc.ca/eng/com500/faq500.htm).

### CR-10 — Major before funding action: tax/legal conclusions become categorical

**Location:** A3 F-4/F-5, §4/§5; summary QB-2; R4 source conclusions.

“SR&ED ... pay nothing on work done outside Canada” is too absolute: CRA describes a limited permissible employee-wage exception linked to Canadian SR&ED. CCPC/control is not established from one person's residency alone, and 35% eligibility/refundability also depends on qualified costs and applicable limits. A fixed fee or CFO title does not itself settle registration obligations; keep the engagement's actual activities for counsel assessment. Equally, excluding every registered intermediary until a later round is a commercial recommendation, not a legal necessity. Exempt-distribution filings/deadlines depend on the actual exemption; do not turn one route into a universal close checklist.

**Fix:** keep unconfirmed grants outside base cash, show conditional eligibility inputs, and obtain a scoped accountant/counsel assessment. Preserve the sensible distinction between unregistered finders and registered providers without blanket assertions. [CRA rates and conditions](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim/investment-tax-credit.html), [CRA overseas employee-wage exception, §10](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/salary-wages-policy.html). OSC pages could not be independently reloaded in this review; registration findings remain scoped questions, not legal clearance. Confirm with counsel / accountant.

### CR-11 — Major for live pilots: readiness is deferred past use of real client data

**Location:** A4 §8; coverage C24/C26; A1 §9.

Privacy/security evidence and monitoring are assigned to CP-G3, while CP-G2 pilots run real cases. The planning workflow requires suitable safeguards at CP-G2. Some “covered by reference” entries point to the overall method rather than a specific accepted test, owner or service runbook. A later public-launch gate cannot substitute for readiness to handle pilot data.

**Fix:** identify the minimum security/privacy/access/backup/monitoring/support evidence before real-data pilots, link exact product-owned records, and keep unproven items partial. Separate later assurances from minimum safe pilot operations. This changes the commercial gate's evidence, not the product's agreed scope.

### CR-12 — Major for quality claims: successful recalculation does not detect silent wrong formulas

**Location:** workbook Summary!C17 and M2_Lean-Base!S35; handoff §3–4.

In a disposable in-memory copy I changed ARR from MRR×12 to MRR×10. Summary changed to CAD 137,336 with no explicit correctness warning. An independent ARR identity detected the CAD 27,467 difference. The baseline cash identity passes to floating-point tolerance, but that alone cannot detect classification, eligibility or missing-input failures.

**Fix:** independent checks for customer and MRR movements, revenue/cash/deferred/credit reconciliation, cohort renewal timing, cost allocations, scenario isolation and stale exports; include semantic test cases in the model brief. Keep audit diagnostics one-way, separate from business calculations. This planted-error exercise tests a specific invariant, not a broad benchmark of AI accuracy.

## Minor corrections and coverage disposition

- Workbook README still says the lean raise closes July 2027, while Inputs and plans say May. A4 says scripts are only in scratchpad although they now exist in commercial/tools/. Eliminate stale narrative through the refresh mechanism.
- Competition tables are useful advertised-price evidence, not proof of delivered feature parity. Compare like-for-like seats, billing term, currency, limits and included services before prescribing prices. Three vendor price pages were not independently retrievable in this review; do not present this as a revalidation of all 18 competitors.
- Founder agreements and IP evidence belong on the diligence/close critical path. Requiring every document before **any** initial investor conversation is a discretionary process choice, not a universal rule.
- Keep C35 partial until the deck/one-pager exist; C37–C38 partial until billing/cohort/accounting corrections pass; C13/C15/C28/C32 conditional on the corresponding findings; C24/C26 partial as described. Keep the openly disclosed C01/C04/C06/C16/C17/C25/C29/C30 gaps. Other rows supply useful draft content; “covered” remains separate from approved or verified.

## Disposition of Claude's workflow review

**Accept:** trim repeated artifact outlines; retain one writer and one review cycle; make counsel procurement, prospect-data basis, founder agreements, source dates and team-plan dependencies explicit; prioritize customer evidence and verified cash; no additional AI-tool purchase or broad vendor benchmark.

**Qualify:** use RAN-13/14's recorded delegation for labelled, overturnable internal choices. Do not ask repeatedly for open choices already delegated. Preserve the parent rule for ratified decisions unless the current instruction expressly authorizes the change; unresolved provenance should be stated. A nine-month runway trigger is a configurable proposal, not a universal law. Funding urgency must follow the corrected model and actual inputs. Broader-market research is conditional on the financing thesis, not proof expansion is mandatory.

**AI-tool correction accepted:** Upmetrics explicitly says its downloaded finance report contains no formulas. It is unsuitable as this portable live financial model. That does not establish it cannot calculate in its own app. Plan Pilot's vendor claim was never proof of performance; accessibility failures also do not establish permanent closure. No procurement case has been established. [Upmetrics export documentation](https://help.upmetrics.co/article/199-how-to-export-your-finance-forecasting-data-to-excel).

## Next author batch

Claude: record dispositions for CR-01…CR-12, implement model-v0.2-brief.md in the existing commercial workbook, regenerate the numeric summaries, and update the coverage map. Recheck affected calculations and these findings, then return hashes and evidence. Continue useful work with labelled scenarios; do not wait for real costs to implement the framework, and do not call scenario outputs actual runway or proven traction.
