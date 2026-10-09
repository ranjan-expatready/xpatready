# Commercial v0.2 — independent recheck

**7 Oct 2026, Codex. Verdict: substantial progress; the configurable model still needs correction before financial or investor reliance.** Review complete. Claude remains the author of `commercial/`; no commercial files were changed by Codex.

The single input source, scenario overrides, separate ARR/revenue labels, annual renewal schedules and generated exhibits are real improvements. I independently reran **all 23 author acceptance tests: 23 passed**. Additional adversarial cases nevertheless exposed material errors. Matching a second implementation confirms agreement on the implemented rules; it does not establish that those rules represent the business correctly.

## Evidence and scope

- Reviewed workbook SHA-256: `81b1d9acbad9476d41b052d9d7de7692b815ab1c1d3b3871da4311fbbfca8729`; model fingerprint `e16bfb6cbb3d5357`. [File manifest](reviewed-v02-file-hashes-2026-10-07.json).
- **Refresh during review:** the updated author handoff records that Ranjan ran report refresh at 21:16. Current workbook hash is `6c8693bdfeee71238bf57366a9e9628878963aa34b5e0aa6a6849e72b836631f`. I compared the files: inputs/formulas are unchanged; workbook value/formula differences are only two timestamp cells, and report changes are generation timestamps plus the handoff's hash note. The model fingerprint remains the same, so the tested findings apply to this refreshed copy. [Delta evidence](v02-refresh-delta-2026-10-07.json).
- [Successful acceptance rerun](commercial-v0.2-acceptance-rerun-2026-10-07.md); [adversarial results, locations and static traces](model-v02-audit-2026-10-07.json). Tests used disposable copies and native LibreOffice recalculation. Workbook locations below use the reviewed version.
- Rechecked the prior CR findings, changed planning sections, coverage map, refresh code and original GAP-17 wording. Revisited primary referral-regulation, CRA and retention-definition sources. Did not repeat the entire competitor or investor-directory research.
- Artifact Tool was also attempted for independent inspection/recalculation. Its handling of zero-versus-empty comparisons disagreed with native LibreOffice on this file; its resulting invalid-input view is **not** a finding against the workbook. Microsoft Excel behavior and full visual layout remain unverified.
- An initial sandboxed LibreOffice launch failed; that run was discarded. The successful native rerun above is the acceptance result. The helper's failure detection itself needs hardening under V2-07.

## Required corrections

### V2-01 — Blocking for actual reporting: closed periods can contain changing forecasts, and actual customers do not anchor the forecast

**Location:** Inputs!D8; Actuals; C_BASE!D167:F167, D391:F397; builder lines 799–806, 932–935, 1124–1125, 1140–1147. Applies to all cases.

**Reproduction A:** set CAL.ACT_CUTOFF to November 2026, leave Actuals empty, then change COST.PRODUCT from CAD 25,000 to 50,000. October/November remain labelled “Actual”, yet reported costs change from **26,375 / 57,725** to **51,375 / 82,725**. Cash changes too. Compare still says Valid/PASS. A cutoff is not evidence that actual data exists.

**Reproduction B:** enter November actual closing cash 250,000, active firms 200, MRR 40,000, new firms 0, revenue/collections 40,000 and costs 50,000. Reported firms show **0 → 200 → 0** across October–December; MRR shows **0 → 40,000 → 0**. Actual closing cash carries forward, but customers/MRR do not. If the supplied history cannot explain those balances, that must be an explicit reconciliation gap. Silently reverting to the old forecast is not a valid resolution.

Other margins, costs, retention, operating cash flow and funding calculations still read forecast schedules even in closed months. “Actuals frozen” currently means some displayed totals are replaced where populated, not that the complete model is rebased from actual performance. The existing test 9 checks cash only.

**Correction:** validate completeness by metric and period; label partial months honestly and never substitute forecast values under an Actual label. Add a reconciled handoff from actual customers/contracts, MRR and financial balances into the first forecast month, or make affected forecasts unavailable until those opening schedules are supplied. Preserve historical prices, billing mix and receipts rather than recreating them from current global assumptions. Financial metrics must use a consistent actual/forecast basis. Add tests for missing actuals, customer/MRR continuity, cash-flow reconciliation and forecast changes that leave all closed data unchanged. No need to manufacture actual records now.

### V2-02 — Major: funding need stays positive even when available cash already covers it

**Location:** Compare!C16:H16; builder lines 1305–1307; A3 funding exhibit.

With CASH.OPEN_INR = 200,000,000, BASE has **CAD 2,952,000** opening cash, **CAD 2,308,303** at the milestone without financing, and no no-financing floor breach anywhere in the reported horizon. It nevertheless requests **CAD 188,428** as “Funding needed”. Checks pass.

The formula adds reserve after clamping the milestone gap to zero, so surplus available cash never offsets reserve. It also calls the prior three months' average burn a forward reserve even though the model contains future costs and hires. Round fees and associated costs need consistent treatment when sizing gross proceeds; a commitment or proposed founder bridge must not silently become available cash.

**Correction:** calculate the net external cash requirement through the milestone and chosen forward reserve period, including available cash, dated receipts, financing costs and the actual future spend pattern. Preserve a gross-cost view if useful, but do not call it additional funding needed. Test abundant starting cash (zero required), changed post-milestone costs, fees and funding delay. Re-evaluate hiring gates at the proposed funded amount. Until this passes, **CAD 586,925 is a draft model output, not a verified raise requirement**.

### V2-03 — Major: affiliate commissions do not follow collected revenue

**Location:** C_BASE!D336:AM338; builder lines 1036–1042; A2 §5 payout rule.

Set both billing mixes to annual and RET.DEFAULT = 100%. Over the first 36 months, collections are **zero**, yet affiliate commission accrues **CAD 1,936.27**, with **CAD 1,581.57 paid**. Checks pass. The annual commission formula omits default/collection timing; the monthly formula also ignores collection delay. A fixed three-month lag is a rolling monthly payout schedule, not the playbook's quarterly settlement. Commission periods above 12 months are accepted, but annual renewals are excluded from the annual base.

**Correction:** derive commission from attributable eligible receipts, net of refunds and applicable credits, with the configured eligibility period, settlement calendar and clawback. Test zero receipts, delayed receipts, annual renewal beyond year one, full refund and one identified settlement quarter. Test 4b currently only shows that more refunds reduce a total; it does not prove a collected-cash rule or correct clawback timing.

### V2-04 — Major: credits and deposits are pooled across customers who have different entitlements

**Location:** C_BASE rows 317–330; builder lines 999–1026; A2 rewards and A1 deposit terms.

Set all billing monthly and PART.REF_FREE_MONTHS = 3. In the first referral month (May 2027), newly referred customers receive **CAD 72.95** credit, and all of it is applied immediately. Those customers' one-month eligible invoice value is only **CAD 24.32**. Their other two months of credit offset unrelated standard customers' invoices. Checks pass because totals remain non-negative.

Deposits are similarly applied to the pooled founding invoices. This lets one firm's annual invoice use another firm's deposit; unused deposits for non-activating/refunded firms lack an owner-specific settlement. Referrer credit is applied against all customer invoices without a referrer entitlement schedule. Annual “extra month” is represented as a credit at a 12-month renewal, which is a different offer from a 13-month service term; its revenue/deferred schedule needs to match the chosen policy.

**Correction:** maintain balances and application limits for the entitled customer or sufficiently distinct cohort. Plan/channel mixes are acceptable only where they do not erase different billing, credit or commission rights. Specify annual incentive semantics, renewal date and recognition consistently; obtain accountant confirmation where needed. Tests must prove whose invoice a credit can reduce and the expected residual liability, not merely non-negative totals.

### V2-05 — Major: gross revenue retention ignores contraction

**Location:** C_BASE!J401:L402 (April–June 2027); builder lines 1153–1158.

Set monthly billing, zero churn/non-renewal, zero expansion and 10% monthly contraction. The model reports **GRR = 100% and NRR = 90%**. Both should be 90% for the opening cohort in this case. GRR deducts churn only; expansion and contraction are netted before separate contraction can be counted. [Definition: GRR includes losses from contraction and churn](https://chartmogul.com/blog/net-and-gross-retention-rates/).

**Correction:** track gross expansion and contraction separately; calculate retention on the opening customer cohort, excluding new customers. Add contraction-only, simultaneous expansion/contraction, annual-renewal and empty-cohort tests. Keep forecast retention explicitly separate from observed retention.

### V2-06 — Major: “change once” still fails for sensitivity tests and written offers

**Location:** refresh_reports.py lines 30–73, 134–145; A1 D-P3–D-P6; A4 A4_STRESS; Reports status.

The “relative” stress tests are fixed copies of v0.2's initial values. For example:

| Shared input changed | Label promises | Code still uses | Correct relative value |
|---|---|---|---|
| Solo price → 97 | Prices +30% | 115.70 | 126.10 |
| Close rate → 30% | Close rate halved | 11% | 15% |
| Launch → May 2027 | Launch 3 months later | June 2027 | August 2027 |

Likewise, stress-table milestone headings are fixed to March 2028 and generated metadata always says **“actuals: none entered”**. The referral exhibit reads some shared Inputs directly instead of BASE's effective overrides. Published offer descriptions and decision rows retain manually typed prices, discounts, caps and dates; a normal numeric refresh does not replace them or create the claimed narrative-review warning. These are static-code/document findings, not claims that the full new-input report workflow passed.

**Correction:** express shocks as transformations of the currently effective case; keep intentionally absolute alternatives labelled as absolute. Generate period/actuals metadata and offer tables from their canonical sources. Reuse effective assumptions in every exhibit. Surface changed narrative conclusions as pending author review. Acceptance must change prices, dates, cutoff and a BASE override, then verify the whole output—including text and labels—against the changed configuration. No second input edit in Python or Markdown.

### V2-07 — Major: invalid or uncalculated outputs can still appear usable

**Location:** Cash13w!C13:F25; build_cash13 (VALID argument unused); lo_recalc.py recalc/scan; refresh_reports.py main; Checks.

**Native reproduction:** set all four W13.PRODUCT shares to zero. Effective correctly reports VALID.W13 = FALSE, but Cash13w still presents cash balances with **no product payments**. Its reconciliations differ by **CAD 25,000 per complete month**, without an explicit unavailable status on the cash results. The input validator exists but is not connected to the dependent view.

**Observed recalculation failure:** under the initial sandbox, LibreOffice exited 134. The helper ignores process return codes, and its scan checks only text error values; missing formula caches count as no errors. The acceptance tests then raised exceptions on missing values. Successful native reruns do not eliminate this failure-handling defect. Report refresh must not certify outputs merely because no cached `#REF!` string exists.

**Correction:** make the weekly view explicitly unavailable when its required timing assumptions fail; surface reconciliation failures. Check LibreOffice exit codes, saved-file freshness and populated formula results, then model invariants before stamping outputs current. Fail the refresh without replacing prior valid artifacts. `--no-sensitivity` must leave sensitivity outputs explicitly stale/retained, not clear the sheet while the main report status says Current. Add negative tests for invalid weekly shares and failed recalculation, besides the successful happy path.

## Prior finding disposition

| Prior finding | Recheck result |
|---|---|
| CR-01 invalid inputs | Original blank-cost and bad-mix reproductions fixed; actuals completeness and dependent weekly validation remain open under V2-01/V2-07 |
| CR-02 ARR versus revenue | Terminology corrected; accounting mechanics still depend on V2-04 |
| CR-03 billing/offers | Annual renewal treatment and migration eligibility improved; credits/deposits and affiliate collections remain open |
| CR-04 hiring gates | Forecast hiring gates and separate managed/unmitigated cases implemented; real hiring still requires evidence. Does not prove the hiring recommendation optimal |
| CR-05 cost classification | Delivery labor and distinct acquisition cost categories added; actual reporting and retention errors prevent accepting the full investor framework |
| CR-06 funding | Cash/commitment labels and timing scenarios improved; sizing remains open under V2-02 |
| CR-07 single configuration | Inputs/overrides preserved in rerun; sensitivity and document propagation remain open under V2-06 |
| CR-08 market scope | Main summary dates and units improved; minor wording below remains |
| CR-09 outreach | Main referral and published-address conditions restored. [Regulation §4](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2013-221/FullText.html) supports both qualifying relationships, first-message scope and disclosures; counsel confirmation remains an execution dependency |
| CR-10 tax/legal | Limited overseas-wage exception and conditional eligibility reflected; government cash excluded from base. [CRA §10](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/salary-wages-policy.html). No legal/tax clearance implied |
| CR-11 pilot readiness | Explicit pre-pilot evidence checklist and partial statuses added; production evidence remains outstanding |
| CR-12 independent checks | Planted ARR error now caught; additional examples above still show PASS despite incorrect business results. Extend semantic tests rather than claim universal correctness |

## Remaining coverage and wording

- C15, C32, C37–C39, C41, C50 and C51 remain **partial for implementation**, not merely conditional on founder facts. C44 should reference this recheck. C35 correctly remains partial: the deck/one-pager are not yet delivered.
- Quarterly/annual summaries, channel-specific CAC, actual-versus-plan variance, dated assumption changes and financial schedules beyond the current simplified model are not all implemented. Prioritize the defects above, then either complete required brief coverage or explicitly propose bounded deferrals; do not call the entire framework complete. Taxes/working-capital schedules can be designed with unknown inputs without fabricating balances.
- GAP-17 supports client-record-only launch import: `product/requirements/decisions.md:212`, current decision register: “At launch firms import clients (S-F-8S-4) and start new cases fresh”. It is recorded as a decided, overturnable product choice, not proof of implementation or a newly ratified founder decision. A2's mid-case objection response still needs the same explicit limitation.
- A1 D-M1 still says “growth has stopped”; a past reporting period does not establish future stagnation. Its outside-Canada row labels 261 as firms although the source count is people. Date and correct these statements without restarting market research.
- A2's statement that non-customer referrers qualify “only” through personal relationships is too narrow as a statement of law; preserve all applicable relationship routes, or label a narrower company policy as a proposal. [Regulation §4](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2013-221/FullText.html).
- A3 F-1 has one more table cell than its header, shifting owner/timing/cost; it also names CASH.MILESTONE instead of CAL.MILESTONE. A1 still points to the removed Summary sheet. Correct these small usability issues in the same batch.
- Founder factual questions about actual costs, dated available cash, licensed-founder identity, equity/control and team engagement remain relevant. Reuse RAN-13/14 delegation for internal pricing choices; identify a specific unresolved ratified-decision conflict before repeating an approval request. Bank/account credentials are unnecessary; dated totals and commitments suffice for planning.

## Next author batch — bounded correction, no restart

Claude: fix V2-01–V2-07 in the existing workbook/tools; record each disposition and exact evidence. Reuse the valid v0.2 work. Add the adversarial cases above and keep the 23 passing regressions. Refresh all dependent exhibits, fix the small wording issues, update the coverage map and return a versioned handoff. Do not add more research or tabs unless needed for the corrected financial relationships. Codex will recheck affected findings; Ranjan supplies real inputs in parallel. External website changes, messages, spending and fundraising remain outside this review's execution scope.
