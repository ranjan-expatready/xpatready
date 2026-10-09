> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Expat Ready — commercial plan v0.2: decision summary

**7 Oct 2026. Conditional draft for Codex's recheck.** Nothing has been approved, contacted, published or spent.

**Detail:** [A1 market and revenue](01-market-revenue-strategy.md) · [A2 sales, referral and customer success](02-sales-affiliate-cs-playbook.md) · [A3 funding](03-funding-investor-plan.md) · [A4 execution and model](04-execution-team-financial-workbook.md) · [workbook](04-execution-team-financial-workbook.xlsx) · [evidence](00-evidence-baseline.md) · [Codex findings and dispositions](review-dispositions.md) · [coverage](coverage-map.md)

**How to read the numbers:**
- Every forecast figure below sits inside a generated block that comes from the workbook. Run `python3 commercial/tools/refresh_reports.py` after changing any assumption; `check_reports.py` flags any outdated block.
- Product-team cost is a **placeholder of CAD 25,000 a month** (input COST.PRODUCT). Opening cash is **your statement of INR 2 crore**, not a verified bank balance. So nothing below is an actual runway.

## What the evidence and the model say

1. **Market** (CICC 2025 Annual Report, 30 Jun 2025):
   - **11,994 RCICs plus 507 RISIAs** in good standing. These count people, not firms.
   - The number of practices that would buy is **not published**.
   - Revenue-pool figures are a sensitivity built on an assumed number of RCICs per practice, not a measured ceiling (A1 §7).
   - Lawyers are excluded until counted.
2. **Competition is real and cheap:**
   - 18 products verified; most are priced per firm at about CAD 29–237 a month for 3 users (advertised prices, checked 7 Oct; R1).
   - The CAPIC association gives its members a case tool free.
3. **Cash timing is the binding constraint** (placeholder product cost):
   - With no funding, cash falls below the reserve floor in **spring 2027**, before meaningful revenue. Under the base assumptions, funding must arrive by about **end of February 2027**. The table gives the exact months.
   - A later raise needs a founder bridge or lower costs. Your answer to QB-1 (product cost) moves this more than any commercial choice.
4. **The base plan is limited by the founder's selling hours, not by onboarding.**
   - Under base assumptions the first sales rep fails the payback test, so the model does not hire one.
   - More founder selling time, a higher close rate or a higher price changes that. See the sensitivity table in A4.
5. **ARR is a run rate (12 × MRR), not revenue earned.** The table shows MRR, ARR, revenue earned and cash collected separately.
6. **Migration claim corrected:** at launch, firms can import **client records only**; existing cases and documents come later (product decisions GAP-17). The website and offers must say so.

<!-- GENERATED:SUMMARY_KEY BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| Input validation | Valid | Valid | Valid | Valid | Valid | Valid |
| Model checks | PASS | PASS | PASS | PASS | PASS | PASS |
| Funding received in this case | 1,000,000 in Feb 2027 | none | none | 1,000,000 in Apr 2027 | 1,500,000 in Feb 2027 | 1,500,000 in Jan 2027 |
| First month below floor, same plan with no financing | Apr 2027 | May 2027 | Apr 2027 | Apr 2027 | Apr 2027 | Mar 2027 |
| Funding arrives before the no-financing floor breach? | Yes | No funding in case | No funding in case | NO — arrives too late | Yes | Yes |
| Latest month to start raising (breach - lead time - 1) | Nov 2026 | Dec 2026 | Nov 2026 | Nov 2026 | Nov 2026 | Oct 2026 |
| Funding needed to milestone plus forward reserve | 586,925 | 337,065 | 737,999 | 637,904 | 597,863 | 1,067,255 |
| Lowest within-month cash, with financing | 74,865 | -410,023 | -1,001,818 | 8,709 | 75,932 | 96,520 |
| Paying firms at milestone (expected value) | 51.0 | 51.0 | 72.5 | 29.7 | 104.8 | 118.1 |
| MRR at milestone | 8,859 | 8,859 | 12,742 | 5,038 | 18,397 | 20,945 |
| ARR run rate at milestone | 106,312 | 106,312 | 152,906 | 60,458 | 220,763 | 251,334 |
| Revenue earned, 12 months to milestone | 68,328 | 68,328 | 81,560 | 35,054 | 113,506 | 129,915 |
| Limiting step at milestone | Selling hours | Cash below floor | Cash below floor | Demand: channel activity and conversion | Demand: channel activity and conversion | Demand: channel activity and conversion |
<!-- GENERATED:SUMMARY_KEY END -->

## Decisions taken on your behalf (delegation RAN-13/14; overturnable)

| ID | Decision | Why | Owner | When |
|---|---|---|---|---|
| D-P1–P3 | Per-firm plans with included users: Solo, Practice, Firm, plus Enterprise. Prices are proposals (A1) | Rivals price per firm; IMMeFile is free. **Changes FD-18's per-seat unit; please confirm (QB-3)** | Claude | Confirm by 30 Oct |
| D-P5 | Founding-firm offer, capped, with a refundable deposit; terms reviewed by counsel | Tests willingness to pay before launch; brings cash and evidence forward | Founder-consultant | From mid-Nov, after counsel |
| E-3, E-4 | Founder sells. The first hire is an onboarding and customer-success specialist, gated by prerequisites and cash. No salesperson until the rep gates pass. **No success-fee intermediary for the pre-seed** | Model: selling hours are the constraint; the rep fails payback at base values; registration risk for unregistered finders (LEG-4) | You | Gates in the model |
| F-1 (revised) | Funding: **start the process by November 2026** if the actual product cost is near the placeholder. The amount is sized to the milestone plus reserve, not fixed. Bridge and cost-cut options are shown, not assumed | The model's no-financing floor breach minus 4 months' lead time | You and Sanjay | Decide after QB-1 |
| S-4, S-6 | Peer-only referral programme, with credits and full anti-spam conditions; outreach only with a recorded lawful basis | CICC s.13; CASL; Competition Act (R3) | Commercial owner + counsel | Before any outreach |
| CP-G2 | No real client data in pilots until the minimum safeguards are evidenced: isolation, permissions, MFA, backups with a tested restore, monitoring, breach register, support procedure, signed pilot terms | Codex CR-11; product decisions GAP-05/07/08/13/14; mandate §4 | Product delivery lead + you | Before pilots (Jan 2027) |

## What I need from you (questions that change decisions)

| ID | Question | Why it matters |
|---|---|---|
| QB-1 | The actual product-team cost per month and committed contracts (or let me read `Resource Cost.xlsx`, totals only). A dated bank balance, if you can | Sets the cash deadline, raise timing and size |
| QB-2 | Which founder is the licensed consultant who sells; Ranjan's role and equity; Sanjay's residency and control | Founders' agreement, investor diligence, CCPC status |
| QB-3 | Confirm per-firm pricing (amends FD-18) or change the prices in the workbook | Every revenue figure depends on it |
| QB-4 | How the India team is engaged, and whether any R&D could be done in Canada | IP ownership; SR&ED and IRAP eligibility |

**Authorisations requested:**
- website correction;
- counsel and accountant quotes;
- founder interviews and the founding offer.

Nothing proceeds without your yes.
