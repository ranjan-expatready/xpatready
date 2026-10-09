# Configurable company model — implementation brief for Claude

**Superseded for new work, 8 Oct 2026, at Ranjan's direction.** This brief caused excessive scope. Follow ../WORKFLOW.md for the reset. The details below explain the historical v0.2 build, not what the replacement must contain. Retained calculations must be correct; unused features may be omitted with clear limits.

**7 Oct 2026. Authority:** Ranjan's request to change assumptions in one place and experiment with the entire commercial/financial framework. **Author:** Claude, in the existing `commercial/` artifacts. **Reviewer:** Codex. This specifies the next revision; it is not a completed workbook or an approved operating budget.

Purpose: answer **what we can sell, what it costs to acquire and serve customers, when cash runs short, which hires we can afford, and what a raise would achieve**. Read with [the v0.1 review](commercial-v0.1-review-2026-10-07.md). Resolve CR-01–CR-12; record justified disagreements. Keep the four existing artifacts, one workbook and one calculation engine.

## 1. A single control centre

Use the workbook's structured input tables as the canonical editable numeric source. Ranjan must not also edit a script. A generator may read these inputs and preserve them; it must never silently replace them with coded defaults. If another architecture is essential, explain the trade-off and deliver an equally simple editable interface before switching.

Every assumption has: stable ID, plain name, value, unit, effective date, fact/estimate/proposal status, source/date, owner and reasonable permitted range. Required unknowns remain unknown; **zero is an explicit answer**. Assumptions may be uncertain without preventing labelled scenarios. A missing actual cash balance must prevent an “actual runway” claim, not all scenario work.

Shared defaults are entered once. Scenario tables contain **only deliberate overrides**, with an explicit override flag so a zero override works. Show the effective value, source and override to the user. Provide a case selector and a comparison dashboard. Changing a shared default updates every inheriting case; changing an override affects only that case. All cases use the same formulas.

| Control group | Examples to expose, with units |
|---|---|
| Calendar and currency | Forecast start, launch date, horizon, actuals cutoff, CAD reporting currency, FX rate/date; propose 36 monthly forecast periods, with quarterly/annual summaries |
| Price and offer | Per-firm/seat unit, included seats, extra seats, plan mix, monthly/annual terms, discounts and stacking, founder offer/cap/duration, free periods, deposits and migration eligibility |
| Selling and adoption | Unique reachable firms by channel, activity, stage conversion, sales-cycle lag, trial-to-paid/activation, founder hours, seller ramp, onboarding hours/capacity and backlog |
| Retention and usage | Monthly cancellation versus annual non-renewal, expansion/contraction, seats/usage, refund/default, collections delay and payment recovery |
| Partners | Referral versus affiliate, cash/credit/free-month reward, eligibility, attribution/deduplication, rate/base/duration, payout delay, refund/clawback and channel ownership |
| People and costs | Product team, founder pay, employee/contractor costs, payroll burden, raises, role allocations, hire dates/prerequisites, support capacity, cloud/AI/processing, tools, legal/accounting, marketing and one-time costs |
| Cash and funding | Dated available cash, committed contributions and receipt dates, taxes/remittances, payables, capex, debt/repayments, fundraising fees, proposed funding amount/date, minimum reserve, milestone and lead time |
| Decision rules | Evidence required to hire/spend/expand, cash floor, capacity thresholds, experiment stop criteria; proposed thresholds visibly labelled |

No hidden business assumptions in formulas. Mathematical constants such as 12 months per year are not business controls. Forecast starts and horizons must extend formulas, charts and reports consistently.

## 2. Connected calculations

**Demand → sales → onboarding → active subscriptions → invoices/revenue/cash → costs/capacity → cash gap → financing choices.** Show the limiting step. An arbitrary revenue target is a comparison target, not a source of invented customers.

1. **Acquisition:** channel-specific activity and stage conversion with elapsed time; deduplicate customers acquired through multiple channels. Sales capacity limits closes; onboarding capacity limits activation. Make contract, invoice and activation triggers explicit. Forecast fractional customers may represent expected values, but identify them and show feasible whole-customer operating targets separately.
2. **Contracts/cohorts:** track start month, plan, seats, billing term, offer and acquisition channel. Forecast cohorts are required now; historical cohorts remain empty until evidence exists. Monthly cancellations and annual renewal decisions follow their respective terms. Schedule offer expiry, seat changes and renewals explicitly.
3. **Billing/revenue:** distinguish contracted bookings, normalized recurring run rate, earned subscription/service revenue, invoices, cash, receivables, deferred revenue, deposits and credits. Annual cash arrives on collection and revenue follows the service period; do not count both as revenue. Deposits offset eligible invoices or remain a credit/liability, never a negative invoice receipt. Migration charges apply only to eligible contracts. Include refunds, free service, failed payment and timing. State recognition policy and items needing accountant confirmation.
4. **Partners:** derive free-month value from the actual eligible offer. Track earned, approved, payable and paid commission/credit and clawback. Attribute acquisition costs once. Do not treat all rewards as the same cash movement.
5. **People and delivery:** combine selling, onboarding and ongoing support workload with available hours and ramp. Give each hire a requested date, earliest eligible date, missing prerequisites and any explicit override. Actual evidence and forecast expectations must be distinguishable. Avoid circular logic: assess cash/hiring gates using the prior period or a documented staged calculation.
6. **Costs:** separate service-delivery COGS, acquisition sales/marketing, product development and administration/fundraising. Allocate mixed roles transparently; allocations sum to 100%. Include costs regardless of whether a fundraising pitch would prefer to exclude them. Forecast product-team commitments separately from discretionary commercial spend.
7. **Financial schedules:** connected operating profit/loss, cash flow and working-capital schedules. Reconcile affected balance-sheet balances (cash, receivables, payables, deferred revenue, deposits/credits, tax, fixed assets/debt/equity where relevant). Do not present a complete balance sheet without validated opening balances; flag its scope. Taxes collected are not subscription revenue.
8. **Funding:** compare unmitigated no-raise, managed no-raise and funded cases. Remove or delay discretionary hiring under the managed case, with the effect on growth visible. Cash arrives on receipt, not investor interest or commitment. Size funds to a chosen milestone and forward reserve; show costs/cuts, funding delay, bridge need and deadline uncertainty. Provide a 13-week cash view when the shortfall is near, with explicit weekly payment assumptions and reconciliation to monthly totals.

## 3. Investor and management dashboard

Every metric states its definition, period, numerator/denominator, actual versus forecast status and data source. Missing or inapplicable evidence displays **N/A + reason**, not zero or infinity. No minimum history means no historical retention claim.

| Output | Required interpretation |
|---|---|
| Firms, users, paid/active accounts and pipeline | Distinct units; booked, activated and paying counts reconciled |
| MRR and ARR | Normalized recurring run rate; ARR = 12 × MRR. Exclude one-time fees. Separately show revenue earned during the period and cash collected |
| MRR movements | Opening + new + expansion + reactivation − contraction − churn = closing; state any other movements such as FX explicitly |
| Growth, ARPA and contract value | Period and eligible account base clear; growth from zero is N/A. Annual contract value is not automatically ARR per account when services are included |
| Logo retention, GRR and NRR | Existing opening cohort; new customers excluded from retention. Show monthly versus trailing-12-month views only when eligible; disclose reactivation policy |
| Gross/contribution margins and operating result | Reconciled cost classifications; delivery/support labor included as appropriate. Do not call revenue less hosting alone gross margin |
| CAC, channel CAC and payback | Acquisition costs and customer timing matched with a stated lag/allocation policy. Separate fully loaded from incremental cost. Payback uses recurring gross profit contribution, not revenue alone |
| LTV | No reliable observed value before sufficient retention history; optional clearly labelled sensitivity with method and limits |
| Cash, burn and runway | Cash received and timing; financing separated from operating burn. Runway from forecast cash and reserve, not simply current cash/current burn during a changing cost base |
| Burn multiple | Net cash burn divided by net new ARR over the same period, with policy explicit; N/A when denominator is non-positive, interpretation limited at very early stage |
| Break-even and funding | Required customers/revenue, capacity feasibility, first cash-floor breach, funding amount/timing to milestone, use of funds, no-raise actions |
| Ownership illustration | Round-size/valuation/dilution sensitivity, existing options/instruments only when supplied; unknown founder holdings remain unknown. Not a valuation opinion or legal term sheet |

Do not add Rule of 40, SaaS magic number or mature-company benchmarks merely to look investor-ready. Include a metric only if it supports a decision at this stage. Forecasts do not establish fundability.

Definition references: [ARR](https://help.chartmogul.com/article/155-chart-annual-run-rate-arr), [NRR](https://help.chartmogul.com/article/143-chart-net-mrr-retention), [gross versus net retention](https://chartmogul.com/blog/net-and-gross-retention-rates/), [burn multiple](https://chartmogul.com/saas-metrics/burn-multiple/). The implementation and classification choices above are project requirements, not a claim that a source prescribes this entire model.

## 4. Actuals, scenarios and experiment records

- Keep imported/entered actuals separate from assumptions and freeze closed months. Map operational/accounting records by stable IDs and period; detect duplicate imports. Manual entry is acceptable initially. Never label a forecast as an actual because its date passed.
- Show actual versus plan and latest forecast, with material variance reasons. Record deliberate corrections to closed data.
- Provide downside/base/upside and managed no-raise views without duplicating formula logic. Preserve v0.1 scenario history as a dated comparison, not another live input source.
- Add a compact sensitivity view for price, conversion, churn, launch delay, support effort and funding delay. Change one factor and combined stresses. Price elasticity is a separate hypothesis: a higher price must not imply unchanged conversion as a proven fact.
- Experiment log: changed assumption IDs, original/new values, expected behavior, model result, customer test, owner, evidence and decision. Numerical optimization cannot prove real willingness to pay.

## 5. What updates automatically

Excel inputs must update formulas and dashboard immediately. Provide one documented **refresh reports** action for dependent numeric tables in A1–A4, the decision summary, funding schedules and any deck exhibits. A spreadsheet edit cannot silently rewrite an already exported PDF or presentation.

Generated tables identify scenario, currency, actuals cutoff, model version and generation time. Record a fingerprint of canonical inputs, actuals and model logic; a check must flag exports as stale when that fingerprint changes. Rebuilding preserves user inputs and actuals. Narrative recommendations affected by a change are flagged for author review, not automatically declared valid. There must be no second manually maintained set of forecast figures in Markdown or code.

The founder's guide should fit on one workbook tab: editable cells, scenario override behavior, how to refresh, warning meanings and three worked changes (price, hire date, funding delay). Lock/style formula cells to discourage accidental edits without hiding formulas. No new subscription, app or CRM is required.

## 6. Acceptance tests and handoff

Report expected versus observed outcomes. Run on disposable copies; preserve actual records. At minimum:

1. Blank required product cost and invalid plan mix are explicitly rejected; explicit zero remains valid where allowed.
2. Shared price change flows to inheriting scenarios, offers, eligible rewards and summaries; an override remains isolated.
3. Annual-only and monthly-only cohorts produce correct renewals, cash and deferred balances; annual-free migration yields no migration charge.
4. Deposit larger than invoice, free month, discount expiry, refund and affiliate clawback reconcile credits/liabilities and cash without negative receipt artifacts.
5. No customers and no new ARR produce informative N/A metrics, not calculation errors or misleading zeros.
6. Funding removed/delayed changes cash and managed-case spending/capacity; unmitigated case stays visibly distinct. A monthly cash shortage cannot be hidden by funding received later in that month.
7. Launch delay, doubled onboarding time and sales-cycle changes alter timing/backlog and affected hiring assumptions.
8. Customer/cohort and MRR movements, ARR identity, cash identity, revenue/deferred/receivable/credit movements and cost allocations reconcile to explicit tolerances.
9. Actual months do not change with forecast assumptions; repeated actual imports do not double count.
10. Changed input/formula makes old reports stale; refresh brings numerical exhibits into agreement. Rebuild/reopen preserves edited inputs, formulas and calculated values.
11. Independent recalculation agrees on selected cash/revenue outputs. A planted ARR×10 error is detected by an independent invariant check; no broad accuracy claim follows from this one test.
12. Summary and spreadsheet checks have no unresolved blocking/major issue presented as ready to act. Display limitations and unresolved factual inputs prominently.

Deliver the revised existing workbook, refreshed artifacts, CR finding dispositions, coverage map and `commercial/ready-for-review.md` with hashes, tests and unresolved decisions. **Do not restart broad market/AI-tool research.** Ask only for missing factual inputs that change decisions; use clearly labelled scenarios meanwhile. End with a short before/after result and the few decisions Ranjan needs to make.
