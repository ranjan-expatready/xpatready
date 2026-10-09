"""Model v0.2 specification: assumption definitions and scenario cases.

These are the *initial* defaults used only when an assumption ID does not yet exist
in the workbook. Once the workbook exists, its Inputs and Scenarios sheets are the
canonical source: build_workbook.py reads and preserves them (Codex brief §1, §5).
"""
import datetime as dt

D = dt.date
MODEL_VERSION = "v0.2.0"
MAX_MONTHS = 60  # calculation columns available; CAL.HORIZON selects how many are reported

GROUPS = {
    "CAL": "Calendar and currency",
    "CASH": "Cash, reserve and milestone",
    "FUND": "Funding and financing",
    "MKT": "Market and reachable pool",
    "PRICE": "Plans and list prices",
    "OFFER": "Offers, billing terms and refunds",
    "PART": "Referral and affiliate programmes",
    "SELL": "Selling and pipeline",
    "ONB": "Onboarding and support capacity",
    "RET": "Retention, expansion and collections",
    "COST": "Product, programme and operating costs",
    "ROLE": "Commercial roles: requested dates, cost, allocation",
    "HIRE": "Hiring and spending gates",
    "W13": "13-week cash view",
}

INPUTS = []


def I(id_, group, name, unit, default, req="Y", lo=None, hi=None, status="Assumption",
      source="", owner="Claude (proposal)", eff=D(2026, 10, 7), fmt="num", note=""):
    INPUTS.append(dict(id=id_, group=group, name=name, unit=unit, default=default, req=req,
                       lo=lo, hi=hi, status=status, source=source, owner=owner, eff=eff,
                       fmt=fmt, note=note))


DMIN, DMAX = D(2025, 1, 1), D(2032, 12, 31)

# ---- Calendar and currency
I("CAL.START", "CAL", "Forecast start (month 1)", "date", D(2026, 10, 1), lo=DMIN, hi=DMAX, status="Decision",
  source="Model convention, 7 Oct 2026", fmt="date")
I("CAL.HORIZON", "CAL", "Forecast horizon reported", "months", 36, lo=12, hi=60, status="Proposal",
  source="Codex brief §1 proposes 36 months")
I("CAL.LAUNCH", "CAL", "Launch month (onboarding of paying firms starts)", "date", D(2027, 3, 1), lo=DMIN, hi=DMAX,
  status="Decision (target)", source="Charter v6 slide 1: market launch 12 Mar 2027; team confirms 9 Oct (DEC-10)", owner="Ranjan", fmt="date")
I("CAL.ACT_CUTOFF", "CAL", "Actuals cutoff: last closed month (blank = no actuals yet)", "date", None, req="N", lo=DMIN, hi=DMAX,
  status="Fact (none yet)", source="No verified actuals as of 7 Oct 2026 (OBS-8)", owner="Sanjay / finance", fmt="date")
I("CAL.FX_INR", "CAL", "Exchange rate", "CAD per INR", 0.01476, lo=0.005, hi=0.05, status="Fact",
  source="Bank of Canada FXINRCAD, 6 Oct 2026 (FX-1)", fmt="fx")
I("CAL.MILESTONE", "CAL", "Funding milestone month (reporting point)", "date", D(2028, 3, 1), lo=DMIN, hi=DMAX,
  status="Proposal", source="End of first year after launch (A3)", fmt="date")

# ---- Cash
I("CASH.OPEN_INR", "CASH", "Opening founder capital (statement, not a verified bank balance)", "INR", 20_000_000, lo=0, hi=1e10,
  status="Founder statement", source="Ranjan 7 Oct 2026 (RAN-10): INR 2 crore provided by Sanjay", owner="Sanjay", fmt="int")
I("CASH.OPEN_VERIFIED", "CASH", "Opening cash verified against a bank statement? (1 = yes, 0 = no)", "flag", 0, lo=0, hi=1,
  status="Fact", source="Not verified as of 7 Oct 2026", owner="Sanjay / finance", fmt="int")
I("CASH.FLOOR", "CASH", "Minimum cash reserve (floor)", "CAD", 50_000, lo=0, hi=5e6, status="Proposal",
  source="Proposal: about 1 month of base costs; configurable (CR-06)", owner="Ranjan", fmt="cad")
I("CASH.RESERVE_M", "CASH", "Forward reserve after milestone, for raise sizing", "months", 6, lo=0, hi=24, status="Proposal",
  source="Proposal; YC guidance: raise for 12-18 months (R4 §8)")

# ---- Funding
I("FUND.AMT", "FUND", "Proposed funding amount (scenario, not committed)", "CAD", 1_000_000, lo=0, hi=2e7, status="Proposal",
  source="A3 F-1 scenario; investor interest unverified", owner="Ranjan / Sanjay", fmt="cad")
I("FUND.DATE", "FUND", "Funding cash received (end of month; blank = none)", "date", D(2027, 2, 1), req="N", lo=DMIN, hi=DMAX,
  status="Proposal", source="Scenario; cash counts on receipt, not commitment (CR-06)", owner="Ranjan / Sanjay", fmt="date")
I("FUND.FEE_PCT", "FUND", "Placement fee on funds raised", "%", 0.0, lo=0, hi=0.2, status="Proposal",
  source="A3 F-4: no success-fee intermediary for pre-seed; Equivesto publishes 7% or 1.5% (FND-3)", fmt="pct")
I("FUND.FEE_FIXED", "FUND", "Fixed placement or platform fee", "CAD", 0, lo=0, hi=1e6, status="Proposal",
  source="Equivesto publishes C$5,000 or C$2,500 (FND-3)", fmt="cad")
I("FUND.LEGAL", "FUND", "Legal cost of the round (paid in the funding month)", "CAD", 20_000, lo=0, hi=5e5, status="Assumption",
  source="Assumption until counsel quotes", fmt="cad")
I("FUND.LEAD_M", "FUND", "Fundraising process lead time", "months", 4, lo=0, hi=18, status="Assumption",
  source="Assumption; A3 plans Feb-May 2027")
I("FUND.BRIDGE_AMT", "FUND", "Founder bridge amount (option, not a commitment)", "CAD", 0, lo=0, hi=1e7, status="Proposal",
  source="A3 F-2 lists a Sanjay bridge as an option only", owner="Sanjay", fmt="cad")
I("FUND.BRIDGE_DATE", "FUND", "Founder bridge received (blank = none)", "date", None, req="N", lo=DMIN, hi=DMAX,
  status="Proposal", source="Option only", owner="Sanjay", fmt="date")
I("FUND.GOV_AMT", "FUND", "Government programme cash (excluded from base)", "CAD", 0, lo=0, hi=5e6, status="Proposal",
  source="Eligibility unconfirmed (FND-1; CR-10)", owner="Sanjay / accountant", fmt="cad")
I("FUND.GOV_DATE", "FUND", "Government programme cash received (blank = none)", "date", None, req="N", lo=DMIN, hi=DMAX,
  status="Proposal", source="Eligibility unconfirmed", fmt="date")
I("FUND.CAP1", "FUND", "Illustrative post-money cap 1 (dilution table only)", "CAD", 5_000_000, lo=1e5, hi=1e9, status="Proposal",
  source="Illustration only; no valuation data researched", fmt="cad")
I("FUND.CAP2", "FUND", "Illustrative post-money cap 2", "CAD", 8_000_000, lo=1e5, hi=1e9, status="Proposal", source="Illustration only", fmt="cad")
I("FUND.CAP3", "FUND", "Illustrative post-money cap 3", "CAD", 12_000_000, lo=1e5, hi=1e9, status="Proposal", source="Illustration only", fmt="cad")

# ---- Market
I("MKT.RCIC_CANADA", "MKT", "RCICs in good standing living in Canada (30 Jun 2025)", "people", 11_733, lo=0, hi=1e6, status="Fact",
  source="CICC 2025 Annual Report (R7 §1.2; MKT-2)", fmt="int")
I("MKT.RCIC_PER_FIRM", "MKT", "Average RCICs per practice (people per buying firm)", "ratio", 2.0, lo=1, hi=10, status="Assumption",
  source="Not published (MKT-3); sensitivity 1.5-3 (R2 §1.3)")
I("MKT.REACH_SHARE", "MKT", "Share of practices in target provinces (ON/BC/AB)", "%", 0.83, lo=0, hi=1, status="Estimate",
  source="83% of RCICs in ON/BC/AB (MKT-2); applied to practices as an assumption", fmt="pct")
I("MKT.ADDRESSABLE", "MKT", "Share of those practices that fit and can be reached lawfully", "%", 0.70, lo=0, hi=1, status="Assumption",
  source="Assumption; tests HYP-1, HYP-6", fmt="pct")

# ---- Prices
I("PRICE.SOLO", "PRICE", "Solo plan list price (1 practitioner + 1 assistant)", "CAD/firm/month", 89, lo=0, hi=5000, status="Proposal",
  source="A1 D-P3 (delegated, RAN-13); market CMP-1", fmt="cad")
I("PRICE.PRACTICE", "PRICE", "Practice plan list price (up to 4 users)", "CAD/firm/month", 229, lo=0, hi=5000, status="Proposal", source="A1 D-P3", fmt="cad")
I("PRICE.FIRM", "PRICE", "Firm plan list price (up to 10 users)", "CAD/firm/month", 549, lo=0, hi=10000, status="Proposal", source="A1 D-P3", fmt="cad")
I("PRICE.EXTRA", "PRICE", "Extra user price", "CAD/user/month", 49, lo=0, hi=1000, status="Proposal", source="A1 D-P3", fmt="cad")
I("PRICE.X_SOLO", "PRICE", "Average extra users bought per Solo firm", "users", 0.1, lo=0, hi=20, status="Assumption")
I("PRICE.X_PRACTICE", "PRICE", "Average extra users bought per Practice firm", "users", 0.3, lo=0, hi=20, status="Assumption")
I("PRICE.X_FIRM", "PRICE", "Average extra users bought per Firm firm", "users", 0.5, lo=0, hi=50, status="Assumption")
I("PRICE.MIX_SOLO", "PRICE", "Share of new firms on Solo", "%", 0.50, lo=0, hi=1, status="Assumption",
  source="FD-19 focus; must sum to 100% with the other two plans", fmt="pct")
I("PRICE.MIX_PRACTICE", "PRICE", "Share of new firms on Practice", "%", 0.42, lo=0, hi=1, status="Assumption", fmt="pct")
I("PRICE.MIX_FIRM", "PRICE", "Share of new firms on Firm", "%", 0.08, lo=0, hi=1, status="Assumption", fmt="pct")
I("PRICE.USERS_SOLO", "PRICE", "Average active users per Solo firm (reporting)", "users", 1.4, lo=0, hi=2, status="Assumption")
I("PRICE.USERS_PRACTICE", "PRICE", "Average active users per Practice firm (reporting)", "users", 2.8, lo=0, hi=4, status="Assumption")
I("PRICE.USERS_FIRM", "PRICE", "Average active users per Firm firm (reporting)", "users", 7, lo=0, hi=10, status="Assumption")

# ---- Offers
I("OFFER.ANNUAL_DISC", "OFFER", "Annual prepayment discount", "%", 0.17, lo=0, hi=0.6, status="Proposal", source="A1 D-P4", fmt="pct")
I("OFFER.ANNUAL_SHARE", "OFFER", "Share of standard new firms choosing annual billing", "%", 0.50, lo=0, hi=1, status="Assumption", fmt="pct")
I("OFFER.FOUND_DISC", "OFFER", "Founding-firm discount off list", "%", 0.30, lo=0, hi=0.9, status="Proposal", source="A1 D-P5", fmt="pct")
I("OFFER.FOUND_DUR", "OFFER", "Founding discount duration from go-live", "months", 24, lo=0, hi=120, status="Proposal", source="A1 D-P5")
I("OFFER.FOUND_ANNUAL", "OFFER", "Share of founding firms choosing annual billing", "%", 0.60, lo=0, hi=1, status="Assumption", fmt="pct")
I("OFFER.STACK", "OFFER", "Stack founding and annual discounts? (1 = multiply both, 0 = larger only)", "flag", 1, lo=0, hi=1, status="Proposal",
  source="Proposal; explicit control requested (CR-03)", fmt="int")
I("OFFER.FOUND_CAP", "OFFER", "Founding-firm cap", "firms", 50, lo=0, hi=1000, status="Proposal", source="A1 D-P5", fmt="int")
I("OFFER.DEPOSIT", "OFFER", "Refundable founding deposit (credited to invoices)", "CAD/firm", 200, lo=0, hi=10000, status="Proposal",
  source="A1 D-P5; counsel to review terms", fmt="cad")
I("OFFER.REFUND_DEADLINE", "OFFER", "Deposit refund deadline if not live", "date", D(2027, 6, 1), lo=DMIN, hi=DMAX, status="Proposal",
  source="A1 D-P5: refund if not live by 30 Jun 2027 (modelled as June 2027)", fmt="date")
I("OFFER.LATE_REFUND_SHARE", "OFFER", "Share of waiting founding firms that take the refund if launch is late", "%", 1.0, lo=0, hi=1,
  status="Assumption", source="Conservative: all ask for refunds", fmt="pct")
I("OFFER.MIG_FEE", "OFFER", "Assisted migration fee (standard monthly-billed firms only)", "CAD/firm", 499, lo=0, hi=20000, status="Proposal",
  source="A1 D-P6: free on annual and for founding firms", fmt="cad")
I("OFFER.MIG_ATTACH", "OFFER", "Share of eligible firms buying assisted migration", "%", 0.25, lo=0, hi=1, status="Assumption", fmt="pct")
I("OFFER.ANNUAL_REFUND", "OFFER", "Share of new annual contracts refunded under the 30-day guarantee", "%", 0.03, lo=0, hi=1,
  status="Assumption", source="A1 D-P8 policy; rate unknown", fmt="pct")

# ---- Partners
I("PART.REF_RATE", "PART", "Referral opportunities per active firm per month", "rate", 0.03, lo=0, hi=1, status="Assumption",
  source="Tests HYP-7", fmt="pct")
I("PART.REF_CLOSE", "PART", "Close rate on referral opportunities", "%", 0.45, lo=0, hi=1, status="Assumption", fmt="pct")
I("PART.REF_CREDIT", "PART", "Referrer account credit per referred firm", "CAD", 250, lo=0, hi=10000, status="Proposal",
  source="A2 S-7; Clio and Cerenade pay $250 (CMP-4)", fmt="cad")
I("PART.REF_FREE_MONTHS", "PART", "Referee incentive: months of service credited", "months", 1, lo=0, hi=12, status="Proposal",
  source="A2 S-7: first month free (monthly) or one extra month (annual)")
I("PART.REF_RELEASE_LAG", "PART", "Referrer credit released after the referee has paid this many months", "months", 2, lo=0, hi=11,
  status="Proposal", source="A2 S-7: 60 paid days")
I("PART.AFF_START", "PART", "Affiliate programme start (blank = none)", "date", D(2027, 12, 1), req="N", lo=DMIN, hi=DMAX,
  status="Proposal", source="A2 S-5: CP-G4 only; date is an assumption", fmt="date")
I("PART.AFF_OPPS", "PART", "Affiliate-sourced qualified opportunities per month", "per month", 2, lo=0, hi=1000, status="Assumption")
I("PART.AFF_PCT", "PART", "Affiliate commission on collected first-period revenue", "%", 0.15, lo=0, hi=1, status="Proposal",
  source="A2 S-7", fmt="pct")
I("PART.AFF_MONTHS", "PART", "Commission base period from start", "months", 12, lo=0, hi=36, status="Proposal", source="A2 S-7")
I("PART.AFF_PAY_LAG", "PART", "Commission paid after (quarterly after 60-day clawback)", "months", 3, lo=0, hi=12, status="Proposal",
  source="A2 S-7")

# ---- Selling
I("SELL.PRESALE_START", "SELL", "Founder pre-launch selling starts", "date", D(2026, 11, 1), lo=DMIN, hi=DMAX, status="Proposal",
  source="A4 A-08/A-09; needs Ranjan's instruction to contact anyone", fmt="date")
I("SELL.PRE_CONV", "SELL", "Pre-launch qualified founder conversations wanted per month", "per month", 15, lo=0, hi=1000, status="Assumption",
  source="Tests HYP-5")
I("SELL.FOUND_RATE", "SELL", "Conversations that become founding commitments", "%", 0.20, lo=0, hi=1, status="Assumption",
  source="First willingness-to-pay test (X2)", fmt="pct")
I("SELL.FOUNDER_POOL", "SELL", "Unique practices reachable through the founders' own network", "firms", 300, lo=0, hi=1e5,
  status="Assumption", source="Unknown (HYP-5); not the 25,000 figure (RAN-9)", fmt="int")
I("SELL.FOUNDER_OPPS", "SELL", "Founder-network qualified opportunities wanted per month after launch", "per month", 12, lo=0, hi=1000,
  status="Assumption")
I("SELL.COMM_OPPS", "SELL", "Community, inbound and events qualified opportunities per month after launch", "per month", 8, lo=0, hi=1000,
  status="Assumption", source="A1 D-C1 channels")
I("SELL.REP_OPPS", "SELL", "Qualified opportunities a fully ramped sales rep sources per month", "per month", 15, lo=0, hi=1000,
  status="Assumption")
I("SELL.CLOSE", "SELL", "Close rate on qualified opportunities", "%", 0.22, lo=0, hi=1, status="Assumption", source="No benchmark used", fmt="pct")
I("SELL.LAG", "SELL", "Months from qualified opportunity to close", "months", 1, lo=0, hi=12, status="Assumption", fmt="int")
I("SELL.ELASTICITY", "SELL", "Close-rate change per +10% price vs reference (hypothesis)", "% per 10%", 0.0, lo=-1, hi=1,
  status="Assumption (unknown)", source="Price elasticity untested (CR brief §4)", fmt="pct")
I("SELL.HRS_PER_OPP", "SELL", "Selling hours per qualified opportunity (discovery, demo, proposal)", "hours", 3, lo=0.1, hi=100,
  status="Assumption")
I("SELL.FOUNDER_HRS_PRE", "SELL", "Founder selling hours per week before launch", "hours/week", 12, lo=0, hi=80, status="Proposal",
  source="A4 §2 founder time")
I("SELL.FOUNDER_HRS_POST", "SELL", "Founder selling hours per week after launch", "hours/week", 12, lo=0, hi=80, status="Proposal",
  source="A4 §2 founder time")
I("SELL.REP_HRS", "SELL", "Selling hours per sales rep per month", "hours/month", 120, lo=0, hi=200, status="Assumption")
I("SELL.REP_RAMP", "SELL", "Sales rep ramp to full productivity", "months", 3, lo=1, hi=12, status="Assumption", fmt="int")

# ---- Onboarding and support
I("ONB.HRS_PER_FIRM", "ONB", "Onboarding hours per new firm (kickoff, import, setup, training)", "hours", 8, lo=0.1, hi=200, status="Assumption",
  source="Validate in pilots (HYP-8)")
I("ONB.SUP_HRS", "ONB", "Ongoing support hours per active firm per month", "hours/month", 0.75, lo=0, hi=20, status="Assumption")
I("ONB.FOUNDER_HRS", "ONB", "Founder onboarding and support hours per week", "hours/week", 8, lo=0, hi=80, status="Proposal")
I("ONB.CS_HRS", "ONB", "Productive hours per onboarding/CS specialist per month", "hours/month", 130, lo=0, hi=200, status="Assumption")
I("ONB.CS_RAMP_FIRST", "ONB", "Specialist productivity in first month", "%", 0.5, lo=0, hi=1, status="Assumption", fmt="pct")
I("ONB.ACTIVATION", "ONB", "Share of onboarded firms that go live and pay", "%", 0.95, lo=0, hi=1, status="Assumption", fmt="pct")

# ---- Retention and collections
I("RET.MONTHLY_CHURN", "RET", "Monthly-billed cancellations per month", "%", 0.02, lo=0, hi=1, status="Assumption",
  source="No observed retention (HYP)", fmt="pct")
I("RET.ANNUAL_NONRENEW", "RET", "Annual contracts not renewed at each anniversary", "%", 0.21, lo=0, hi=1, status="Assumption",
  source="About 1-(0.98^12)", fmt="pct")
I("RET.EXPANSION", "RET", "Monthly expansion in retained recurring revenue (annual: at renewal)", "%", 0.008, lo=0, hi=0.2, status="Assumption", fmt="pct")
I("RET.CONTRACTION", "RET", "Monthly contraction in retained recurring revenue", "%", 0.0, lo=0, hi=0.2, status="Assumption", fmt="pct")
I("RET.DEFAULT", "RET", "Share of invoices never collected (bad debt)", "%", 0.01, lo=0, hi=1, status="Assumption", fmt="pct")
I("RET.COLLECT_LAG", "RET", "Share of each month's invoices collected next month", "%", 0.05, lo=0, hi=1, status="Assumption", fmt="pct")

# ---- Costs
I("COST.PRODUCT", "COST", "Product and engineering team cost (all-in)", "CAD/month", 25_000, lo=0, hi=1e6,
  status="Placeholder scenario", source="UNKNOWN actual (QB-1); placeholder only", owner="Ranjan / Sanjay", fmt="cad")
I("COST.PRODUCT_COGS", "COST", "Share of product team cost that is production operations (service delivery)", "%", 0.10, lo=0, hi=1,
  status="Proposal", source="Allocation policy (CR-05)", fmt="pct")
I("COST.PROD_CUT_PCT", "COST", "Product cost reduction (managed case lever; not decided)", "%", 0.0, lo=0, hi=1, status="Proposal",
  source="Illustrative lever only (CR-06)", fmt="pct")
I("COST.PROD_CUT_DATE", "COST", "Product cost reduction from (blank = none)", "date", None, req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.FOUNDER_PAY", "COST", "Founder pay from this capital", "CAD/month", 0, lo=0, hi=1e5, status="Assumption",
  source="Explicit zero: founders unpaid (to confirm)", fmt="cad")
I("COST.CONTENT", "COST", "Content and marketing contractor", "CAD/month", 2_500, lo=0, hi=1e5, status="Estimate",
  source="R5: NOC 51111 median about $40/hr x 60 hrs", fmt="cad")
I("COST.CONTENT_START", "COST", "Contractor start", "date", D(2026, 11, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.CONTENT_END", "COST", "Contractor end (blank = open)", "date", None, req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.CFO", "COST", "Fractional CFO", "CAD/month", 3_500, lo=0, hi=1e5, status="Estimate",
  source="R5 provider-published $1,750-5,250; quote needed", fmt="cad")
I("COST.CFO_START", "COST", "Fractional CFO start", "date", D(2027, 1, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.CFO_END", "COST", "Fractional CFO end", "date", D(2027, 6, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.TOOLS_BASE", "COST", "Commercial tools base", "CAD/month", 550, lo=0, hi=1e5, status="Estimate", source="R5 official price pages", fmt="cad")
I("COST.TOOLS_HEAD", "COST", "Tools per commercial person (founder counts as one)", "CAD/month", 100, lo=0, hi=5000, status="Estimate", fmt="cad")
I("COST.TOOLS_COGS", "COST", "Tools allocated to service delivery (help desk, status page)", "%", 0.30, lo=0, hi=1, status="Proposal", fmt="pct")
I("COST.TOOLS_SM", "COST", "Tools allocated to sales and marketing", "%", 0.50, lo=0, hi=1, status="Proposal", fmt="pct")
I("COST.TOOLS_GA", "COST", "Tools allocated to administration", "%", 0.20, lo=0, hi=1, status="Proposal", fmt="pct")
I("COST.EVENTS", "COST", "Events and community", "CAD/month", 1_200, lo=0, hi=1e5, status="Estimate", source="R2: CAPIC $450/yr; NCIC $950 + travel", fmt="cad")
I("COST.EVENTS_START", "COST", "Events start", "date", D(2026, 12, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.PAID", "COST", "Paid acquisition tests", "CAD/month", 1_000, lo=0, hi=1e6, status="Proposal", fmt="cad")
I("COST.PAID_START", "COST", "Paid tests start (blank = none)", "date", D(2027, 7, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.ACCT", "COST", "Accountant and bookkeeping", "CAD/month", 600, lo=0, hi=1e5, status="Estimate", source="R5 provider-published", fmt="cad")
I("COST.VAR_FIRM", "COST", "Variable delivery cost per active firm (hosting, e-sign, email)", "CAD/firm/month", 15, lo=0, hi=1000,
  status="Assumption", source="Needs product-team unit costs", fmt="cad")
I("COST.CARD_PCT", "COST", "Card and billing fees, % of collections", "%", 0.036, lo=0, hi=0.2, status="Fact",
  source="Stripe Canada 2.9% + Stripe Billing 0.7% (CST-3)", fmt="pct")
I("COST.CARD_FIXED", "COST", "Card fee per payment", "CAD", 0.30, lo=0, hi=10, status="Fact", source="Stripe Canada C$0.30 (CST-3)", fmt="cad2")
I("COST.CONTINGENCY", "COST", "Contingency on commercial and administrative spend", "%", 0.10, lo=0, hi=1, status="Proposal", fmt="pct")
I("COST.LEGAL_SETUP", "COST", "Legal set-up: terms, DPA, privacy, offers, referral, claims", "CAD", 18_000, lo=0, hi=1e6,
  status="Assumption", source="Until counsel quotes (E-6)", fmt="cad")
I("COST.LEGAL_DATE", "COST", "Legal set-up paid", "date", D(2026, 11, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.WEBSITE", "COST", "Website claims correction and rework", "CAD", 8_000, lo=0, hi=1e6, status="Assumption", fmt="cad")
I("COST.WEBSITE_DATE", "COST", "Website work paid", "date", D(2026, 11, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.DEMO", "COST", "Demo video, collateral, case studies", "CAD", 5_000, lo=0, hi=1e6, status="Assumption", fmt="cad")
I("COST.DEMO_DATE", "COST", "Demo assets paid", "date", D(2027, 2, 1), req="N", lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
I("COST.INSURANCE", "COST", "Cyber and E&O insurance, annual premium", "CAD/year", 4_000, lo=0, hi=1e6, status="Assumption",
  source="R5: quote needed for customer-grade limits", fmt="cad")
I("COST.INSURANCE_START", "COST", "First insurance premium (then every 12 months)", "date", D(2027, 2, 1), req="N", lo=DMIN, hi=DMAX,
  status="Proposal", source="Before real-data pilots (CR-11)", fmt="date")

# ---- Roles
ROLES = [
    ("CS1", "Onboarding and customer-success specialist #1", D(2027, 2, 1), 6_900, (0.7, 0.3, 0.0, 0.0)),
    ("CS2", "Customer-success specialist #2", D(2027, 9, 1), 6_900, (0.7, 0.3, 0.0, 0.0)),
    ("REP1", "Sales representative #1", D(2027, 9, 1), 7_800, (0.0, 1.0, 0.0, 0.0)),
    ("REP2", "Sales representative #2", None, 7_800, (0.0, 1.0, 0.0, 0.0)),
    ("MKT", "Marketing and partnerships lead", None, 8_900, (0.0, 1.0, 0.0, 0.0)),
]
for rid, rname, req, cost, alloc in ROLES:
    I(f"ROLE.{rid}.REQ", "ROLE", f"{rname}: requested start (blank = not requested)", "date", req, req="N", lo=DMIN, hi=DMAX,
      status="Proposal", source="A4 §3.3", owner="Ranjan", fmt="date")
    I(f"ROLE.{rid}.COST", "ROLE", f"{rname}: loaded cost", "CAD/month", cost, lo=0, hi=1e5, status="Estimate",
      source="R5 Job Bank medians + 5.5% uplift + CPP/EI + $3,600 benefits (CST-1, CST-2)", fmt="cad")
    for k, cls in enumerate(["COGS", "SM", "RD", "GA"]):
        I(f"ROLE.{rid}.{cls}", "ROLE", f"{rname}: share allocated to {cls}", "%", alloc[k], lo=0, hi=1, status="Proposal",
          source="Allocation policy (CR-05); four shares must sum to 100%", fmt="pct")
    I(f"ROLE.{rid}.OVERRIDE", "ROLE", f"{rname}: force hire at requested date despite gates (1 = yes)", "flag", 0, lo=0, hi=1,
      status="Proposal", fmt="int")

# ---- Hiring and spending gates
I("HIRE.MODE", "HIRE", "Hiring mode (1 = requested dates, unconstrained; 2 = gated by prerequisites and cash)", "mode", 2, lo=1, hi=2,
  status="Proposal", source="CR-04", fmt="int")
I("HIRE.CASH_COVER_M", "HIRE", "Cash above floor needed before a hire, in months of that role's cost", "months", 12, lo=0, hi=60,
  status="Proposal", source="Configurable gate (CR-04)")
I("HIRE.CS1_FOUND", "HIRE", "CS1 prerequisite: founding commitments at least", "firms", 10, lo=0, hi=1000, status="Proposal", source="A4 E-3", fmt="int")
I("HIRE.CS1_QUEUE", "HIRE", "CS1 prerequisite: firms waiting for onboarding at least", "firms", 5, lo=0, hi=1000, status="Proposal", source="A4 E-3", fmt="int")
I("HIRE.CS2_FIRMS", "HIRE", "CS2 prerequisite: active firms at least (or onboarding over capacity 2 months)", "firms", 80, lo=0, hi=10000,
  status="Proposal", source="A4 §3.3", fmt="int")
I("HIRE.REP_MIN_CLOSE", "HIRE", "Sales rep prerequisite: close rate at least", "%", 0.20, lo=0, hi=1, status="Proposal", source="A4 §3.3", fmt="pct")
I("HIRE.REP_MAX_PAYBACK", "HIRE", "Sales rep prerequisite: rep payback at most", "months", 12, lo=0, hi=60, status="Proposal", source="A4 §3.3")
I("HIRE.REP_GM", "HIRE", "Gross margin assumed for the rep payback test", "%", 0.80, lo=0, hi=1, status="Proposal",
  source="Fixed assumption avoids circular logic (brief §2.5)", fmt="pct")
I("HIRE.MKT_EARLIEST", "HIRE", "Marketing lead: earliest month channel evidence could exist (CP-G4)", "date", D(2027, 10, 1), req="N",
  lo=DMIN, hi=DMAX, status="Assumption", source="Evidence gate cannot be proven by a forecast", fmt="date")
I("HIRE.DISC_GATED", "HIRE", "Gate discretionary spend (content, events, paid, demo) on cash? (1 = yes)", "flag", 0, lo=0, hi=1,
  status="Proposal", source="Managed no-raise lever (CR-04)", fmt="int")
I("HIRE.DISC_COVER_M", "HIRE", "Cash above floor needed for discretionary spend, in months of it", "months", 6, lo=0, hi=60, status="Proposal")

# ---- 13-week view
I("W13.START", "W13", "13-week view start month (blank = automatic: month before first floor breach)", "date", None, req="N",
  lo=DMIN, hi=DMAX, status="Proposal", fmt="date")
for nm, shares, label in [("PAYROLL", (0.0, 0.5, 0.0, 0.5), "Payroll and contractors"),
                          ("PRODUCT", (1.0, 0.0, 0.0, 0.0), "Product team payment"),
                          ("OTHER", (0.25, 0.25, 0.25, 0.25), "Other costs"),
                          ("RECEIPTS", (0.25, 0.25, 0.25, 0.25), "Customer receipts")]:
    for b in range(4):
        I(f"W13.{nm}_W{b+1}", "W13", f"{label}: share paid/received in week {b+1} of the month", "%", shares[b], lo=0, hi=1,
          status="Assumption", source="Weekly timing assumption; four shares sum to 100%", fmt="pct")

# ---- Cases: deliberate overrides only (Codex brief §1)
CASES = [
    ("BASE", "Lean base (funded)", "Recommended lean plan; hires gated by prerequisites and cash; funding scenario received.", {}),
    ("DOWN", "Downside (funded)", "Launch 2 months later, weaker conversion and retention, slower onboarding, funding 2 months later.",
     {"CAL.LAUNCH": D(2027, 5, 1), "SELL.PRE_CONV": 8, "SELL.FOUND_RATE": 0.15, "SELL.CLOSE": 0.16,
      "RET.MONTHLY_CHURN": 0.03, "RET.ANNUAL_NONRENEW": 0.30, "SELL.FOUNDER_POOL": 150, "SELL.COMM_OPPS": 5,
      "ONB.HRS_PER_FIRM": 12, "FUND.DATE": D(2027, 4, 1)}),
    ("UP", "Upside (funded)", "Stronger conversion, retention and referral; larger round.",
     {"SELL.PRE_CONV": 25, "SELL.FOUND_RATE": 0.25, "SELL.CLOSE": 0.28, "RET.MONTHLY_CHURN": 0.015,
      "RET.ANNUAL_NONRENEW": 0.16, "PART.REF_RATE": 0.05, "SELL.COMM_OPPS": 12, "FUND.AMT": 1_500_000}),
    ("MNR", "Managed no-raise", "No funding; discretionary spend and hires gated by cash; illustrative 30% product-cost cut from Apr 2027 (not decided).",
     {"FUND.AMT": 0, "FUND.DATE": None, "HIRE.DISC_GATED": 1, "COST.CFO": 0, "COST.PROD_CUT_PCT": 0.30,
      "COST.PROD_CUT_DATE": D(2027, 4, 1), "FUND.LEGAL": 0}),
    ("UNR", "Unmitigated no-raise", "No funding; the plan continues unchanged (requested hire dates, no gates). Shows the cash shortfall.",
     {"FUND.AMT": 0, "FUND.DATE": None, "HIRE.MODE": 1, "FUND.LEGAL": 0}),
    ("HIGH", "Higher capacity (funded)", "Unconstrained growth plan: marketing lead from Jan 2027, earlier reps, larger programmes and round.",
     {"HIRE.MODE": 1, "ROLE.MKT.REQ": D(2027, 1, 1), "ROLE.REP1.REQ": D(2027, 5, 1), "ROLE.REP2.REQ": D(2027, 11, 1),
      "ROLE.CS2.REQ": D(2027, 7, 1), "COST.EVENTS": 3_000, "COST.EVENTS_START": D(2026, 11, 1), "COST.PAID": 3_000,
      "COST.PAID_START": D(2027, 5, 1), "SELL.COMM_OPPS": 18, "SELL.PRE_CONV": 20, "COST.CONTENT": 1_500,
      "FUND.AMT": 1_500_000, "FUND.DATE": D(2027, 1, 1), "COST.LEGAL_SETUP": 22_000, "COST.WEBSITE": 12_000,
      "COST.DEMO": 9_000, "COST.INSURANCE": 5_000, "FUND.LEGAL": 25_000, "COST.TOOLS_BASE": 950}),
]

ACTUAL_METRICS = [
    ("ACT.CASH_CLOSE", "Closing bank cash (all accounts)", "CAD"),
    ("ACT.NEW_FIRMS", "New paying firms in the month", "firms"),
    ("ACT.ACTIVE_FIRMS", "Active paying firms at month end", "firms"),
    ("ACT.MRR", "Recurring revenue run rate at month end (MRR)", "CAD"),
    ("ACT.REVENUE", "Revenue earned in the month", "CAD"),
    ("ACT.COLLECTIONS", "Cash collected from customers", "CAD"),
    ("ACT.COSTS", "Total costs in the month", "CAD"),
]
