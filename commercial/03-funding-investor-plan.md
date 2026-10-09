> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Artifact 3 — Funding and investor plan

**Version 0.2, 7 Oct 2026. Status: conditional draft for Codex recheck.**
- Not approved. No investor, adviser or programme has been contacted, and nothing has been applied for.
- Securities, tax and legal points are **questions for counsel or the accountant**, not conclusions.
- Investor names are "fit unverified" (R4).
- **Writer:** Claude. **Owner:** Ranjan, with Sanjay as owner of the company (RAN-11).

**Numbers** come from the workbook and sit in the generated block (§3). Two inputs drive them:
- product-team cost: a **placeholder of CAD 25,000 a month** (COST.PRODUCT, QB-1);
- opening cash: **INR 2 crore stated by you, not a verified bank balance** (CASH.OPEN_VERIFIED = 0).

So **no output here is an actual runway or a settled funding requirement** (Codex CR-06).

## 1. Decisions

| ID | Decision | Rationale and evidence | Owner | Timing / trigger | Cost | Success measure |
|---|---|---|---|---|---|---|
| F-1 | **Funding timing comes from the cash trough, the reserve floor and the process lead time, not from a target date.** | **Why from the model:**<br>• Start the process no later than the model's "latest month to start raising" (the no-financing floor breach, less FUND.LEAD_M, less 1).<br>• Under the placeholder cost that is about now (generated block).<br>• Funds count only when **received**; they are modelled as arriving at month end, so a shortage earlier in the month is not hidden.<br>**Amount:**<br>• Size to a chosen milestone plus a forward reserve (CASH.MILESTONE, CASH.RESERVE_M).<br>• The CAD 1.0M input (FUND.AMT) is a **scenario**, not a requirement.<br>**Against:** a pre-launch raise means a lower valuation; your stated ambition was to raise after traction (RAN-12). | Model §2.8 rules (brief); WORKFLOW v2 "funding quality" | Ranjan and Sanjay | Re-decide as soon as QB-1 gives the actual cost | Fractional CFO and round legal (inputs COST.CFO, FUND.LEGAL) | Funds received before the floor breach (Compare: "Funding arrives before…" = Yes) |
| F-2 | **Three no-raise paths shown, none assumed:**<br>• unmitigated (UNR: plan continues, hires on requested dates);<br>• managed (MNR: discretionary spend and hires gated on cash; an illustrative product-cost cut, not decided);<br>• bridge (sensitivity row: founder bridge as an option only).<br>Choose before **31 Jan 2027** or at the floor-breach warning, whichever is first | Codex CR-04, CR-06. "Sanjay bridges" is an option, not a commitment | Ranjan and Sanjay | Decision point | — | Within-month cash never below the floor (proposal: CASH.FLOOR) |
| F-3 | **Two-step path** (proposal): a pre-seed to reach repeatable acquisition, then a seed sized from the model at that time. The seed story needs evidence of share capture and, if the ambition is a large outcome, a credible path beyond Canada | Market sensitivity (A1 §7) is a hypothesis, not a ceiling (CR-08) | Founders | Seed preparation at CP-G4 | — | Repeatable conversion and retention on real data |
| F-4 | **No success-fee finder for the pre-seed** (commercial choice). A **registered dealer** may be used if a wider raise needs one; that is a commercial trade-off, not a legal bar. A **fixed-fee fractional CFO** helps with the model, data room and updates. Their actual activities, such as contacting investors, are reviewed by counsel, because a title or fee basis alone does not settle registration | LEG-4; FND-3 (published registered-dealer fees); Codex CR-10 | Ranjan | Now | Inputs FUND.FEE_PCT / FEE_FIXED let you test a registered-dealer fee | Raise closed with counsel-cleared engagements |
| F-5 | **Government programmes stay outside base cash** (FUND.GOV_AMT = 0) until the accountant confirms eligibility. Questions to confirm:<br>• **SR&ED:** the work done in Canada; the limited exception for wages of Canadian-resident employees doing SR&ED abroad (CRA salary policy §10); CCPC status; qualifying expenditures and limits.<br>• **IRAP:** a Canadian R&D project.<br>• **Wage subsidies:** Canadian payroll | CCPC status depends on control and shareholdings, not one person's residency alone (CR-10). Sources: [CRA ITC rates](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim/investment-tax-credit.html); [CRA salary policy](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/salary-wages-policy.html) | Sanjay + accountant | Memo by 15 Nov 2026 | Accountant time | Eligibility memo; government cash entered only with dates |
| F-6 | **Accelerators:**<br>• not YC Winter 2027 (deadline 2 Nov 2026; in-person Jan–Mar during pilots and launch);<br>• DMZ after paid usage;<br>• TMU Legal Innovation Zone once there is an MVP with users | FND-2 | Ranjan | Revisit Jun 2027 | — | — |
| F-7 | **Company housekeeping on the diligence critical path:**<br>• founders' agreement (roles, equity, vesting);<br>• cap table;<br>• written IP assignments and moral-rights waivers from every developer, India team included;<br>• vendor contracts.<br>Complete before term-sheet diligence. Early investor conversations can start in parallel; requiring every document before any conversation is a choice, not a rule (Codex minor finding) | Contractors keep copyright unless they assign it in writing (R4 §8) | Sanjay + counsel | Start now; complete before diligence | Legal (COST.LEGAL_SETUP) | Data-room core items present |
| F-8 | **No strategic investor in the pre-seed.** Consolidators (Clio, 8am/AffiniPay, Mitratech) are acquirers to track | R4 §5 | Ranjan | Revisit at seed | — | — |
| F-9 | **Investor reporting from the first cheque:**<br>• monthly: actuals, cash, burn, runway, MRR, firms, pipeline, risks, asks;<br>• quarterly review | WORKFLOW §3 | Founder + CFO | From close | Included | Sent by the 10th |

## 2. Options compared

| Option | Fits when | Does not fit when | For Expat Ready now |
|---|---|---|---|
| Customer-funded (founding deposits, annual prepayment) | Customers pay ahead | Costs run far ahead of collections | **Use it**: deposits and annual prepayments are modelled as cash and liabilities. The model shows they do not cover the product team before the floor breach |
| Founder money (bridge) | Fast, no dilution | Founder capacity limited | **Option** (F-2); not assumed |
| Government programmes | Accountant confirms eligibility | Eligibility unconfirmed | **Outside base** (F-5) |
| Loans (BDC, CSBFP, Futurpreneur) | Revenue history; founder criteria | Pre-revenue | Not now (FND-2) |
| Accelerators | Stage and location fit | Conflicts with launch | Later (F-6) |
| Angels and angel groups | Credible team and early evidence | No evidence | **Primary for the pre-seed** |
| Pre-seed and seed funds | Stated stage fits | Thesis mismatch | Secondary for the pre-seed; primary for the seed |
| OCI Ready 4 Market | Private co-investor; Ontario operations; market of at least $100M | Market test uncertain | Check eligibility |
| Registered-dealer placement or crowdfunding (NI 45-110) | Wide raise; many small investors | Small, relationship-led round | Possible later; fees modelled via inputs |
| Strategic investors | Partnership value clear | Early-stage conflicts | Not now (F-8) |

## 3. Timing, amount, use of funds and dilution (generated from the workbook)

<!-- GENERATED:A3_FUND BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| Funding received in this case | 1,000,000 in Feb 2027 | none | none | 1,000,000 in Apr 2027 | 1,500,000 in Feb 2027 | 1,500,000 in Jan 2027 |
| First month below floor, same plan with no financing | Apr 2027 | May 2027 | Apr 2027 | Apr 2027 | Apr 2027 | Mar 2027 |
| First month below floor, with this case's financing | none in horizon | May 2027 | Apr 2027 | Apr 2027 | none in horizon | none in horizon |
| First month cash below zero, with financing | none in horizon | Jul 2027 | May 2027 | none in horizon | none in horizon | none in horizon |
| Funding arrives before the no-financing floor breach? | Yes | No funding in case | No funding in case | NO — arrives too late | Yes | Yes |
| Latest month to start raising (breach - lead time - 1) | Nov 2026 | Dec 2026 | Nov 2026 | Nov 2026 | Nov 2026 | Oct 2026 |
| Funding needed to milestone plus forward reserve | 586,925 | 337,065 | 737,999 | 637,904 | 597,863 | 1,067,255 |
| Lowest within-month cash, with financing | 74,865 | -410,023 | -1,001,818 | 8,709 | 75,932 | 96,520 |
| Cash at end of reported horizon | 114,177 | -410,023 | -1,001,818 | 8,709 | 808,102 | 120,165 |

**Use of funds (funded cases)**

| Metric | BASE | DOWN | UP | HIGH |
|---|---|---|---|---|
| Use of funds, receipt to milestone: product team | 350,000 | 300,000 | 350,000 | 375,000 |
| Use of funds, receipt to milestone: all other costs paid | 259,117 | 202,731 | 342,137 | 692,203 |
| Use of funds, receipt to milestone: customer collections offset | 92,460 | 46,071 | 170,668 | 193,600 |

**Ownership illustration** (BASE funding amount; not a valuation; existing holdings unknown)

| Post-money cap (illustrative) | Funding amount | Dilution |
|---|---|---|
| 5,000,000 | 1,000,000 | 20% |
| 8,000,000 | 1,000,000 | 12% |
| 12,000,000 | 1,000,000 | 8% |
<!-- GENERATED:A3_FUND END -->

**Reading the table:**
- **"First month below floor, same plan with no financing"** is the deadline signal.
- **"Latest month to start raising"** subtracts the process lead time.
- **"Funding needed to milestone plus forward reserve"** sizes a round. It is not a minimum or a maximum.
- The A4 sensitivity table shows funding received 3 months later, a bridge with a later raise, and product-cost alternatives.
- The workbook's **13-week cash view** (tab Cash13w) gives the weekly picture once the shortfall is near. Its weekly payment shares are labelled assumptions.

## 4. Fundraising help kept distinct

| Type | What it does | Fee basis (published only) | Registration questions for counsel | Use now? |
|---|---|---|---|---|
| Fundraising adviser or consultant | Deck, model, targeting, coaching | No Canadian published fees found | Depends on actual activities (investor contact, pay tied to money raised), not the title | Optional |
| Finder or introducer | Introduces investors for a success fee | Not published | High risk if unregistered and paid per deal (LEG-4) | **No** |
| Registered dealer or placement agent | Markets the offering under an exemption | Equivesto C$5,000 + 7%, or C$2,500 + 1.5% for private raises (FND-3) | Verify registration in the CSA National Registration Search | Possible later |
| Fractional CFO | Model, data room, reporting | US$1,750–5,250 a month, provider-published (CST-3) | Not dealing in securities only if it does not solicit investors or take pay tied to the raise; counsel confirms the scope | **Yes, fixed fee** |
| Investor-relations and cap-table software | Updates, data room, cap table | Visible from US$59 a month; Cake Equity from $1,000 a year (R4) | — | Free tiers first |

**Due diligence on any paid helper:**
1. Registration category and provinces (National Registration Search).
2. Whether they contact investors, and who handles the trade.
3. Exact fee basis and what is refundable.
4. Which prospectus exemption applies, and **its own** filing requirements. Forms and deadlines differ by exemption; do not assume one route's checklist.
5. Who holds investor money.
6. Any written guarantee; treat it as a red flag.
7. Two or three references, including a raise that failed.
8. Conflicts, exclusivity, termination and tail fees.

## 5. Investor targeting and pipeline

The target list is in R4 §4 and §6; every entry is fit unverified, with no contact until you instruct it.
- **Practitioner angels:** accredited investors or exemption-eligible associates in the founders' network. Conflict check with client matters.
- **Ontario angel groups** with no application fee: Maple Leaf Angels, Keiretsu Forum Canada.
- **Pre-seed and seed funds:** Ripple, Panache, Golden, N49P, Staircase, Good News, Basecamp, Round13.

**Pipeline stages** (workbook tab T-Investors), each with its exit evidence:
1. **Fit:** stage, cheque size and thesis match.
2. **Introduction.**
3. **First meeting.**
4. **Evaluation:** a data request.
5. **Diligence.**
6. **Terms:** counsel involved.
7. **Close:** cash received, and the exemption's filing completed.

## 6. Materials and data room

- **Materials:**
  - one-pager;
  - 12–15-slide deck answering YC's seven questions;
  - the workbook (generated exhibits only);
  - an FAQ with the honest risks.

  Built only from reviewed, refreshed model outputs. Any exhibit carries its fingerprint, and `check_reports.py` flags it when it goes out of date.
- **Data-room index** (missing items shown as missing):

| Item | Status |
|---|---|
| Articles, minute book, federal corporation records | Exist per RAN-11; not seen |
| Cap table; founders' agreement | Unknown (F-7) |
| IP assignments and waivers | Unknown; critical (F-7) |
| Financial statements; tax; CCPC status | Unknown (F-5) |
| Workbook | v0.2 |
| Product evidence | Pending product gates |
| Customer evidence | Pending experiments X1–X3 |
| Contracts | Templates only |

## 7. Funding-readiness criteria (product quality alone is not enough)

1. **Evidence:** founding deposits, pilots on production, interview findings.
2. **Metrics:** measured weekly.
3. **Team:** named owners.
4. **Housekeeping:** F-7, and a model reconciled to actual cash.
5. **Story:** bottom-up market, named competition, listed risks.

## 8. Reporting after the raise

- **Monthly update by the 10th:** actual vs forecast, cash, runway, MRR movements, firms, pipeline, hires, risks, asks.
- **Quarterly:** review and re-forecast.
- **Annually:** statements; cap table.
