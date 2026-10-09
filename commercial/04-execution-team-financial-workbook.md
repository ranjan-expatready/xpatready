> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Artifact 4 — Execution, team and financial workbook

**Version 0.2, 7 Oct 2026. Status: conditional draft for Codex recheck.**
- Nothing is approved. No hire, spend, contact or application has been made.
- **The numbers live in one place:** `04-execution-team-financial-workbook.xlsx` (model v0.2). Tables below are generated blocks; nothing here is a second forecast.
- **All amounts CAD.** Month 1 = Oct 2026; the reporting milestone is Mar 2028 (CAL.MILESTONE); the horizon is 36 months (CAL.HORIZON).
- **Two inputs are not facts:**
  - product-team cost is a **placeholder** (COST.PRODUCT, QB-1);
  - opening cash is **your statement**, not a verified bank balance (CASH.OPEN_VERIFIED = 0).

## 1. Decisions

| ID | Decision | Rationale and evidence | Owner | Timing / trigger | Cost | Success measure |
|---|---|---|---|---|---|---|
| E-1 | **Plan by commercial gates CP-G0 to CP-G4**, alongside the product's G1–G6. Dates are targets | WORKFLOW §5; K-1 | Ranjan | Now | — | Every spend and hire tied to a gate (§4) |
| E-2 | **One configurable model** (CR-07). Edit the Inputs and Scenarios tabs only; run `tools/refresh_reports.py` to update these documents; `check_reports.py` flags anything out of date | Codex brief §1, §5 | Claude builds; Ranjan edits | Now | — | `check_reports.py` passes before any document is shared |
| E-3 | **Recommended operating case: BASE** (funded; hires and spend gated by prerequisites and cash). **HIGH** shows unconstrained growth. **MNR/UNR** show the managed and unmitigated no-raise paths (CR-04) | Generated scenario table (§5) | Ranjan | Re-run after QB-1 | §4 | Gates in §4 |
| E-4 | **First commercial hire: onboarding and customer-success specialist** (Canada, remote). In gated cases the start is the **later** of the requested date and the month its prerequisites and the cash rule are met. The model shows requested, gated and used dates (§3.3) | Founder-consultant sells to peers (RAN-2); onboarding and support capacity is modelled from hours (ONB.*) | Ranjan | Gate | ROLE.CS1.COST | Median days to first value 14 or fewer; support targets met |
| E-5 | **Ranjan's one-salesperson idea: not now.** In BASE the rep fails the payback gate at current assumptions (HIRE.REP_MAX_PAYBACK), so no rep is hired. Selling hours are the limiting step, so the cheaper first lever is founder time, close rate or price (sensitivity §5) | Model gates; CR-04 (sales capacity now in hours, reconciled) | Ranjan | Re-test monthly with actual close rates | — | Rep gate met on actual, not forecast, evidence |
| E-6 | **Enter the actual product-team monthly cost and a dated bank balance first** | Funding timing and amount depend on them (A3) | Ranjan and Sanjay | By 14 Oct 2026 | — | Inputs updated; CASH.OPEN_VERIFIED = 1 |
| E-7 | **Fixed-scope legal and accounting engagements now.**<br>• **Counsel:** founding terms, referral rules, outreach basis, website claims, terms of service, data-processing agreement, privacy, round documents.<br>• **Accountant:** CCPC status, SR&ED/IRAP, GST/HST, credit treatment, revenue recognition | Several actions are blocked on them (WORKFLOW v2 dependencies) | Ranjan authorises | Quotes by 31 Oct | COST.LEGAL_SETUP, COST.ACCT (assumptions until quoted) | Engaged by 15 Nov |
| E-8 | **No real client data in pilots until §8.1 is evidenced** (CR-11) | Product decisions GAP-05/07/08/13/14; NFR-ISO-1, NFR-SEC-1; mandate §4 | Product delivery lead + Ranjan | Before pilots (Jan 2027) | Product budget | §8.1 all "evidenced" |

## 2. Phases, founder time and the first 90 days

| Phase (gate) | Target dates | Main work | Founder-consultant hours a week (proposal; model inputs SELL.FOUNDER_HRS_*, ONB.FOUNDER_HRS) |
|---|---|---|---|
| Plan and prepare (CP-G0) | 7 Oct – 15 Nov 2026 | Inputs, counsel, website fixes, pricing, interview guide, raise preparation if QB-1 confirms urgency | 8–10 |
| Customer learning (CP-G1) | Nov 2026 – Feb 2027 | Interviews; founding offer; prototype sessions; fundraising process (A3 F-1) | 15–20 |
| Production pilot (CP-G2) | Jan – Feb 2027, after §8.1 evidence | 3–5 pilot firms; onboarding runbook | 25–30 (busiest period) |
| Launch (CP-G3) | Mar – May 2027 | Founding firms go live; NCIC 19–21 May | 25–30 |
| Repeatability, then expand (CP-G4) | Jun 2027 onward | Referral test; hiring by gates; seed preparation | 20–25 sales + 5 investors |

**First 90 days, 7 Oct 2026 – 5 Jan 2027.** Actions marked † need your explicit instruction before anyone is contacted, any money is spent or anything is published.

| # | Action | Owner | Due | Depends on | Done when |
|---|---|---|---|---|---|
| A-01 | Enter the actual product-team cost, commitments and a dated bank balance (QB-1) | Ranjan / Sanjay | 14 Oct | — | Inputs updated; refresh run |
| A-02 | Confirm which founder holds the licence; founders' roles and equity (QB-2) | Ranjan / Sanjay | 14 Oct | — | Baseline updated |
| A-03 | Read the team plan of 9 Oct; update CAL.LAUNCH and onboarding inputs | Claude | 12 Oct | Team plan | Inputs updated |
| A-04† | Authorise website claims correction (A1 D-M3), including migration wording | Ranjan → website owner | 21 Oct | — | Claims register satisfied |
| A-05† | Fixed-scope quotes from 2–3 Canadian law firms and an accountant (E-7) | Ranjan | 31 Oct | — | Engaged by 15 Nov |
| A-06 | Approve or amend pricing (A1 D-P1–P8; amends FD-18 unit) | Ranjan | 30 Oct | — | Recorded |
| A-07 | Interview guide and tracker ready (A2 §3; T-Prospects) | Claude | 14 Oct | — | Ready |
| A-08† | Discovery interviews with warm contacts (X1) | Founder-consultant | 19 Oct – 15 Dec | A-07 | 20 logged with evidence |
| A-09† | Founding-firm offer (X2) | Founder-consultant | Mid-Nov | A-05, A-04 | Deposits recorded as actuals |
| A-10† | Labelled prototype sessions (X3) | Founder-consultant | Nov – Dec | Delivery 1/1b accepted | 6 sessions |
| A-11 | Choose 3–5 pilot firms (decisions.md Q-12) | Founder-consultant | 15 Dec | A-08 | Named, with consent |
| A-12† | CAPIC membership; read the IMMeForum rules | Founder-consultant | Nov | — | Rules recorded |
| A-13 | CPD route decision (X4) | Claude drafts; founder decides | 15 Dec | — | Decision |
| A-14 | Accountant memo (A3 F-5) | Sanjay + accountant | 15 Nov | A-05 | Memo |
| A-15 | Founders' agreement, cap table, IP assignments (A3 F-7) | Sanjay + counsel | Before diligence | A-05 | Signed |
| A-16 | Specialist scorecard and job post | Claude drafts; Ranjan approves | 15 Dec | — | Approved |
| A-17 | §8.1 evidence owners named with the product team | Product delivery lead + Ranjan | 15 Dec | — | Owners and dates recorded |
| A-18 | Name the licensed immigration-content owner and update routine | Ranjan | 15 Dec | — | Named |
| A-19 | Fundraising preparation (A3) if QB-1 confirms the model's urgency | Claude drafts; Ranjan decides | From Nov | A-01 | Data-room index; one-pager |

## 3. Organisation and hiring

### 3.1 Organisation by phase (role names; people to be confirmed)

| Responsibility | Now – launch | After first evidence (CP-G3) | After repeatability (CP-G4) |
|---|---|---|---|
| Positioning, discovery, early sales, partners | Founder-consultant | Founder-consultant | + sales rep when the gate passes |
| Fundraising relationships | Founder-consultant + Sanjay; fractional CFO | Same | Same |
| Onboarding, client-record import, support, customer success | Founder (pilots) | Specialist #1 (gated) | Specialist #2 (gated) |
| Marketing content and website | Contractor; website owner | Contractor | Marketing and partnerships lead (gated) |
| Product, engineering, QA, release | Product team (product/README.md) | Same | Same |
| Immigration content | Licensed content owner + immigration expert (mandate §5) | + business configuration owner | + reviewer |
| Finance, billing, tax | Sanjay + accountant | + fractional CFO during the raise | Same |
| Legal, privacy | Counsel; privacy officer named | Same | Same |

**What stays with the founder:**
- positioning;
- the first interviews;
- founding commitments;
- investor relationships;
- content-quality sign-off.

**Not to hire yet:** head of sales, SDR, paid-ads agency, reseller manager, fundraising finder.

### 3.2 One generalist commercial hire vs staged specialists

| Option | For | Against | Verdict |
|---|---|---|---|
| One generalist who does most commercial work | One salary | Closing and onboarding conflict; becomes a bottleneck for both; no evidence of repeatable demand to hand over; fails the model's rep gate at base values | **No** |
| Founder sells; specialist onboards and supports | Uses peer credibility; protects onboarding and support promises | The founder carries sales through the raise | **Yes** |
| Outsourced SDR | Fast volume | Anti-spam exposure (A2 §5a); cost (CST-3); poor fit for a peer-trust sale | **No** |
| Success-fee fundraising finder | No upfront cost | Registration risk (A3 F-4) | **No** |

### 3.3 Hiring gates in the model (requested vs used dates)

For each role the model keeps:
- **requested start** (ROLE.*.REQ);
- **prerequisites**, checked against the previous month to avoid circular logic;
- **cash rule:** cash above the floor must cover HIRE.CASH_COVER_M months of the role's cost;
- **override** (ROLE.*.OVERRIDE).

The prerequisites are:

| Role | Prerequisite |
|---|---|
| CS1 | Founding commitments ≥ HIRE.CS1_FOUND, or onboarding queue ≥ HIRE.CS1_QUEUE, or launch |
| CS2 | Onboarding over capacity for 2 months, or active firms ≥ HIRE.CS2_FIRMS |
| Rep #1 | Founder selling hours exceeded for 2 months, and close rate ≥ HIRE.REP_MIN_CLOSE, and rep payback ≤ HIRE.REP_MAX_PAYBACK |
| Rep #2 | Rep #1 in seat for 6 months, and all selling hours exceeded for 2 months, plus the same economics |
| Marketing lead | Evidence gate (HIRE.MKT_EARLIEST): a forecast cannot prove channel evidence |

How the modes work:
- **HIRE.MODE = 1:** requested dates, unconstrained (HIGH, UNR).
- **HIRE.MODE = 2:** gated (BASE, DOWN, UP, MNR).

A forecast meeting a gate is not approval: the real decision needs actual evidence (tab T-Hiring).

<!-- GENERATED:A4_HIRING BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| Start month used: Onboarding and customer-success specialist #1 | Feb 2027 | Feb 2027 | Feb 2027 | May 2027 | Feb 2027 | Feb 2027 |
| Start month used: Customer-success specialist #2 | Mar 2029 | none in horizon | Sep 2027 | none in horizon | Feb 2028 | Jul 2027 |
| Start month used: Sales representative #1 | none in horizon | none in horizon | Sep 2027 | none in horizon | Sep 2027 | May 2027 |
| Start month used: Sales representative #2 | none in horizon | none in horizon | none in horizon | none in horizon | none in horizon | Nov 2027 |
| Start month used: Marketing and partnerships lead | none in horizon | none in horizon | none in horizon | none in horizon | none in horizon | Jan 2027 |
<!-- GENERATED:A4_HIRING END -->

**Scorecards (unchanged from v0.1 in substance):**

| Role | Reports to | 30 days | 60 days | 90 days | Pay basis |
|---|---|---|---|---|---|
| Onboarding and CS specialist #1 | Commercial owner | Runbook and import templates tested on pilot data | 5 firms live; median first value 14 days or fewer | 95% of P1/P2 within target; health scoring; 2 case studies | Job Bank 64101/62100 midpoint + 5.5% uplift; loaded ROLE.CS1.COST (CST-1, CST-2) |
| Sales rep #1 | Founder-consultant | Shadows 15 calls; demo certified | Owns 20 opportunities | 4+ closes a month | Job Bank 62100 median incl. commission; base/commission split is your decision; ROLE.REP1.COST |
| Marketing and partnerships lead | Founder-consultant | Claims-compliant site | CPD or partner pilot | One channel with 10+ qualified opportunities a month | Job Bank 41402 + uplift; ROLE.MKT.COST |
| Fractional CFO | Sanjay | Model on actuals | Data room | Investor updates | Provider-published ranges; fixed fee (A3 F-4) |

## 4. Budgets and spending gates (generated)

<!-- GENERATED:A4_BUDGET BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| COGS, start to milestone | 126,187 | 117,187 | 162,465 | 106,811 | 142,907 | 181,668 |
| Sales and marketing, start to milestone | 119,962 | 66,562 | 189,908 | 113,313 | 180,137 | 449,802 |
| Product development (R&D), start to milestone | 405,000 | 324,000 | 405,000 | 405,000 | 405,000 | 405,000 |
| Administration and fundraising, start to milestone | 108,492 | 58,052 | 97,497 | 105,854 | 116,415 | 161,716 |
| Total costs, start to milestone | 759,641 | 565,801 | 854,870 | 730,978 | 844,459 | 1,198,186 |
| Discretionary commercial spend, start to milestone | 298,320 | 194,480 | 391,050 | 275,220 | 374,550 | 726,660 |
<!-- GENERATED:A4_BUDGET END -->

- **Cost classification** (accountant to confirm):
  - **COGS** = production share of the product team (COST.PRODUCT_COGS), variable delivery cost, card and billing fees, and the delivery share of CS roles and support tools.
  - **S&M** = selling and marketing roles, programmes, website and demo assets, referral credits and affiliate commission (acquisition costs counted once).
  - **R&D** = the rest of the product team.
  - **G&A** = finance, legal, insurance, fundraising, bad debt and contingency.
  - Mixed roles are split by the ROLE.*.{COGS, SM, RD, GA} shares, which must sum to 100%.
- **Excluded:** recruiter fees, benefits beyond the allowance in loaded costs, the penetration test and security tooling (product budget), GST/HST and corporate tax, and India-based commercial hires (no primary pay data).
- **Spending gates:**
  - **In the model:** hires are gated in BASE, DOWN, UP and MNR. Discretionary spend (content, events, paid tests, demo assets) is gated on cash in MNR (HIRE.DISC_GATED).
  - **Outside the model** (your authorisation): legal and website work now; specialist at the CS1 gate; paid acquisition and sponsorships only at CP-G4 with measured payback.

## 5. Scenarios, cash and sensitivity (generated)

<!-- GENERATED:A4_SCEN BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| Input validation | Valid | Valid | Valid | Valid | Valid | Valid |
| Model checks | PASS | PASS | PASS | PASS | PASS | PASS |
| Opening cash | 295,200 | 295,200 | 295,200 | 295,200 | 295,200 | 295,200 |
| Opening cash status | Founder statement — no actual runway claim | Founder statement — no actual runway claim | Founder statement — no actual runway claim | Founder statement — no actual runway claim | Founder statement — no actual runway claim | Founder statement — no actual runway claim |
| Funding received in this case | 1,000,000 in Feb 2027 | none | none | 1,000,000 in Apr 2027 | 1,500,000 in Feb 2027 | 1,500,000 in Jan 2027 |
| First month below floor, same plan with no financing | Apr 2027 | May 2027 | Apr 2027 | Apr 2027 | Apr 2027 | Mar 2027 |
| First month below floor, with this case's financing | none in horizon | May 2027 | Apr 2027 | Apr 2027 | none in horizon | none in horizon |
| Lowest within-month cash, with financing | 74,865 | -410,023 | -1,001,818 | 8,709 | 75,932 | 96,520 |
| Funding needed to milestone plus forward reserve | 586,925 | 337,065 | 737,999 | 637,904 | 597,863 | 1,067,255 |
| Paying firms at milestone (expected value) | 51.0 | 51.0 | 72.5 | 29.7 | 104.8 | 118.1 |
| MRR at milestone | 8,859 | 8,859 | 12,742 | 5,038 | 18,397 | 20,945 |
| ARR run rate at milestone | 106,312 | 106,312 | 152,906 | 60,458 | 220,763 | 251,334 |
| Revenue earned, 12 months to milestone | 68,328 | 68,328 | 81,560 | 35,054 | 113,506 | 129,915 |
| Cash collected from customers, 12 months to milestone | 86,372 | 86,372 | 115,217 | 46,749 | 162,760 | 187,684 |
| Gross margin, 12 months to milestone | -46% | -33% | -67% | -159% | -3% | -19% |
| Contribution after sales and marketing, 12 months | -115,015 | -52,615 | -208,007 | -136,650 | -146,542 | -396,622 |
| Operating result, 12 months to milestone | -426,082 | -265,792 | -530,079 | -468,594 | -465,498 | -745,101 |
| Unit contribution per firm per month (milestone) | 151 | 151 | 152 | 147 | 152 | 154 |
| CAC, fully loaded (trailing 3 months at milestone) | 1,925 | 679 | 2,090 | 3,260 | 1,305 | 2,758 |
| CAC payback (months of unit contribution) | 12.8 | 4.5 | 13.7 | 22.2 | 8.6 | 17.9 |
| Burn multiple, 12 months to milestone | 4.5x | 2.8x | 3.6x | 7.6x | 2.1x | 3.0x |
| Commercial cost per firm gone live (descriptive, not CAC) | 5,205 | 3,460 | 4,877 | 8,190 | 3,345 | 5,576 |
| Break-even paying firms at milestone cost base | 261.6 | 177.5 | 366.6 | 268.4 | 368.5 | 507.1 |
| Limiting step at milestone | Selling hours | Cash below floor | Cash below floor | Demand: channel activity and conversion | Demand: channel activity and conversion | Demand: channel activity and conversion |
| Cash at end of reported horizon | 114,177 | -410,023 | -1,001,818 | 8,709 | 808,102 | 120,165 |
<!-- GENERATED:A4_SCEN END -->

**Metric definitions** (full text in the workbook, Compare column B):
- **MRR** is the normalised recurring run rate. **ARR = 12 × MRR**; it is not revenue earned.
- **Revenue earned** = subscription revenue net of free-month credits, plus client-record import fees.
- **Gross margin** includes the delivery share of staff, so it is negative early on. **Unit contribution** counts variable delivery costs only.
- **CAC** = S&M, lagged by the sales cycle, divided by new activated contracts; **payback** uses unit contribution.
- **No lifetime value is shown**, because no retention has been observed.

**Sensitivity** (each row overrides BASE only; price rows do not prove willingness to pay):

<!-- GENERATED:A4_STRESS BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

| Variant (applied to BASE only) | Floor breach (with financing) | Lowest cash | Funding needed | Paying firms (Mar 2028) | ARR run rate (Mar 2028) | Revenue earned (12 m) | Limiting step | Rep #1 starts |
|---|---|---|---|---|---|---|---|---|
| Base (as entered) | none in horizon | 74,865 | 586,925 | 51.0 | 106,312 | 68,328 | Selling hours | none in horizon |
| Prices +30%, conversion unchanged (hypothesis) | none in horizon | 74,865 | 577,519 | 72.5 | 198,778 | 104,765 | Demand: channel activity and conversion | Sep 2027 |
| Prices +30%, close rate -15% per +10% price | none in horizon | 74,865 | 601,176 | 32.8 | 86,614 | 58,664 | Selling hours | none in horizon |
| Close rate halved | Sep 2029 | 27,185 | 636,643 | 30.7 | 62,167 | 42,940 | Selling hours | none in horizon |
| Churn doubled (monthly 4%, annual non-renewal 42%) | none in horizon | 74,865 | 597,327 | 46.7 | 97,707 | 65,430 | Selling hours | none in horizon |
| Launch 3 months later (Jun 2027) | none in horizon | 74,865 | 622,291 | 50.4 | 97,358 | 54,443 | Selling hours | none in horizon |
| Onboarding and support hours doubled | none in horizon | 74,865 | 590,032 | 51.2 | 106,475 | 68,339 | Selling hours | none in horizon |
| Funding received 3 months later (May 2027) | Apr 2027 | -35,954 | 586,925 | 51.0 | 106,312 | 68,328 | Selling hours | none in horizon |
| Funding Jun 2027 with founder bridge CAD 150,000 in Feb 2027 (option, not commitment) | none in horizon | 76,825 | 586,925 | 51.0 | 106,312 | 68,328 | Selling hours | none in horizon |
| Founder selling hours +50% (18 a week) | none in horizon | 74,865 | 560,810 | 61.1 | 128,485 | 79,040 | Demand: channel activity and conversion | none in horizon |
| Product team CAD 15,000 a month | none in horizon | 124,865 | 346,925 | 51.0 | 106,312 | 68,328 | Selling hours | none in horizon |
| Product team CAD 35,000 a month | Feb 2027 | -184,223 | 819,225 | 51.0 | 106,312 | 68,328 | Selling hours | none in horizon |
| Combined: launch +3, close x0.75, churn x1.5, funding +3 months | Apr 2027 | -49,320 | 642,472 | 41.8 | 78,744 | 46,285 | Selling hours | none in horizon |

Each row changes only the stated assumptions in BASE; price rows do not prove willingness to pay.
<!-- GENERATED:A4_STRESS END -->

**WORKFLOW challenge cases** (answered by the model and the rules):

| # | Case | Result |
|---|---|---|
| 1 | Small reachable share of buying firms | The pool is derived from people ÷ RCICs per practice × province share × addressable share (inputs). The founder-network pool caps founder opportunities. Lowering either shows the effect live |
| 2 | Onboarding takes twice as long | Sensitivity row: backlog rises. In gated cases CS2 can trigger earlier; in the base, selling hours stay the main limit |
| 3 | Launch or funding slips 3 months | Sensitivity rows; the floor breach and "arrives too late" flags show the first shortfall |
| 4 | Referred, discounted annual customer refunds | Refunded contracts never become active, release no referrer credit and earn no affiliate commission (acceptance test 4b) |
| 5 | No outside investment | UNR and MNR cases: which hires and programmes stop, and when cash breaches |
| 6 | A website capability is only simulated | Removed from claims and any deck (A1 §5) |
| 7 | Lawyer and RCIC referral rules differ | Separate terms (A2 S-4) |
| 8 | Founder decision vs recommendation | Surfaced: FD-18 unit (QB-3); RAN-12 timing (A3 F-1) |

## 6. Scoreboard and reviews

- **Weekly:** tab T-Weekly-Scoreboard (16 metrics with definitions, owners and triggers). Actual results go to the **Actuals** tab by month and metric ID; months up to CAL.ACT_CUTOFF are frozen.
- **Monthly:** actual vs forecast, cash and runway, retention, gross margin, hiring gates, funding, risks. Update the model first, then run the refresh.

## 7. Risks and decision gates (live list: tab T-Risks)

| ID | Risk | Likelihood / impact | Mitigation or test | Trigger |
|---|---|---|---|---|
| R-01 | Cash runs out before revenue | H / H | E-6; A3 F-1/F-2 | Model floor-breach warning; runway under the floor |
| R-02 | Launch slips; production readiness unknown | M / H | Team plan; gates G1/G2; deposit refund date | G2 missed by more than 2 weeks |
| R-03 | Demand weaker than assumed | M / H | X1, X2 stop rules | Fewer than 5 deposits by 31 Jan |
| R-04 | Price pressure from free or cheap tools | H / M | Price tests; positioning X3 | More than 1 in 3 losses on price |
| R-05 | Website claims legal exposure | H / H | A1 D-M3 | Until corrected |
| R-06 | Referral or outreach breaches rules | M / H | A2 §5a; counsel | Before any outreach |
| R-07 | Content breadth gap; migration limited to client records (GAP-17) | H / M | Honest claims; content roadmap | Lost-deal reasons |
| R-08 | IP not assigned | M / H | A3 F-7 | Before diligence |
| R-09 | Grant eligibility unclear | M / M | A3 F-5 | 15 Nov memo |
| R-10 | Founder overload, Jan–May 2027 | H / M | CFO; specialist gate | Over 30 hours a week for 3 weeks |
| R-11 | Market contraction (MKT-1, MKT-7) | M / M | Target in-Canada transition work | Interview evidence |
| R-12 | Model error or out-of-date report | M / H | Built-in checks; acceptance tests; `check_reports.py` | Any FAIL or STALE |

## 8. Launch operations

### 8.1 Minimum safeguards before real-data pilots (CP-G2; CR-11)

**Product-owned evidence is referenced, not re-planned.** Status: **none evidenced in the commercial records as of 7 Oct 2026**. Each line needs a named owner and an accepted test record before pilots use real client data. Otherwise pilots run on test copies (charter G1 notes: the founder must decide whether pilots wait for the penetration test).

| # | Safeguard | Product-owned record | Evidence needed |
|---|---|---|---|
| 1 | Firm and client data isolation | NFR-ISO-1 (isolation suite; release gate 100% green) | Passing isolation run on the pilot build |
| 2 | Server-side permissions | NFR-SEC-1 | Permission tests per role passing |
| 3 | MFA for staff; encryption of restricted fields | Release 1 mandate §1; restricted-data list (due 16 Oct) | Configuration evidence |
| 4 | Backups with a tested restore | Mandate §4 ("tested restore"); charter restore 4 h / data loss 15 min | Restore drill record |
| 5 | Monitoring, status page, emergency off-switch | GAP-05/GAP-11 (status page), GAP-07 (off-switch) | Live status page; off-switch tested |
| 6 | Breach register and incident procedure | GAP-08 (counsel to confirm the breach-record duty) | Register exists; incident roles named |
| 7 | Support procedure | GAP-13 (shared mailbox with written procedure), A2 S-9 | Procedure document; on-call named |
| 8 | Staff access review | GAP-14 | First review done |
| 9 | Pilot agreement, data-processing agreement, privacy notice | A1 D-P8; counsel | Signed by each pilot firm |
| 10 | Client-record import and export procedure | GAP-17 (clients only at launch); SA3-E1b deletion window | Import tested on pilot data; export on request |

### 8.2 Broader launch (CP-G3) adds

- penetration test highs fixed;
- verified claims register;
- billing with cancellation and refund handling (A1 D-P8);
- help content;
- three months of measured support response before any contractual SLA;
- the immigration-content update routine (GAP-09 weekly watch; FD-4 second-person approval).

## 9. Workbook map, refresh and validation

- **Tabs:**
  - **Guide:** a founder's one-page guide, with three worked changes.
  - **Views:** Dashboard (choose the case); Compare (all cases).
  - **Edit:** Inputs; Scenarios (overrides only); Actuals; Experiments.
  - **Checks:** independent invariants.
  - **Detail views:** Cash13w; Cohorts; Sensitivity (generated).
  - **Housekeeping:** Reports (staleness); History_v0.1; C_* case calculations (identical formulas).
  - **Trackers:** T-*.
- **What updates when:**
  - In Excel, everything except the Sensitivity tab and these Markdown blocks updates on edit.
  - `python3 commercial/tools/refresh_reports.py` refreshes both.
  - `python3 commercial/tools/check_reports.py` reports any stale block.
  - Rebuilding the model (`build_workbook.py`, only when the logic changes) keeps Inputs, Scenarios, Actuals, Experiments and trackers.
- **Validation:** see `commercial/tests/` for the latest acceptance report (12 test groups from the Codex brief) and the independent Python recalculation (`tools/independent_model.py`).
- **Known limits:**
  - Plan and channel are expected-value mixes inside each start-month cohort.
  - Referral and affiliate shares of onboarded firms follow the closes of the same month.
  - Free-month credits are recognised when applied (accountant to confirm).
  - No GST/HST, corporate tax, fixed assets or full balance sheet until opening balances are validated.
