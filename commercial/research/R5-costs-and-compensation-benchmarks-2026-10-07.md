# R5 — Costs and compensation benchmarks for the commercial budget

**Date:** 7 Oct 2026. **Writer:** research agent (Claude). **Status:** research input only. Nothing here is a decision, an offer or a hire. Every figure was checked on 7 Oct 2026 unless the row says otherwise.
**Scope:** pay for possible commercial roles (Toronto, remote Canada and India), employer on-costs in Ontario, commission evidence, published prices for fractional help and tools.
**Not used:** the earlier illustrative budget by another assistant. It is not a benchmark and nothing here relies on it.

**In plain words:**
- *Median* means half of workers earn less and half earn more. *Low* is roughly the 10th percentile, so about 1 in 10 earn less. *High* is roughly the 90th percentile, so about 9 in 10 earn less (Job Bank wage methodology).
- *NOC* is Canada's official job classification. Job Bank publishes wages by NOC code.
- *On-costs* are what the employer pays on top of salary, such as CPP, EI and payroll tax.
- *OTE* (on-target earnings) is base salary plus the commission paid when 100% of target is met.

---

## 1. Toronto, Ontario and Canada pay by occupation (Job Bank, Government of Canada)

**Source and method.** Job Bank wage pages for each occupation, Ontario view, read on 7 Oct 2026. The pages say "These wages were updated on November 19, 2025". The reference period is **2023–2024** (Statistics Canada Labour Force Survey) unless the table says otherwise. Job Bank states that Labour Force Survey wages **include tips and commissions**, before taxes. For sales roles, the figures are therefore closer to total cash pay than to base salary.
**Annual figures are my calculation:** hourly × 1,950 hours (37.5 hours × 52 weeks), rounded to $100. For a 40-hour week, multiply the hourly figure by 2,080 instead (about 6.7% higher). No inflation adjustment has been applied; see §1.3.

### 1.1 Wages ($ CAD per hour; low / median / high)

| Role in our budget | NOC 2021 code and title used | Why this code | Toronto Region | Ontario | Canada median | Toronto annual at median (calc.) |
|---|---|---|---|---|---|---|
| Account executive (software sales) | **62100** Technical sales specialists – wholesale trade | Job Bank lists "software sales representative" in this group. Duties include identifying clients, proposals and contracts. | 22.44 / **40.06** / 72.60 | 21.00 / 38.00 / 71.43 | 37.07 | 78,100 |
| Sales development / inside sales | **64101** Sales and account representatives – wholesale trade (non-technical) | There is no SDR code. Duties include "identify and solicit potential clients". This is the non-technical sales band. | 18.50 / **31.25** / 55.56 | 19.23 / 31.25 / 57.69 | 31.50 | 60,900 |
| Customer success / account manager | **62100** as primary proxy (alternative **64101**) | There is no customer-success code. 62100 duties include "maintain and grow sales relationships with existing clients". 64101 includes after-sale support. *Do not use* Job Bank's "Account Manager" profile, which maps to 11102 Financial and investment analysts, or "Account Manager – Sales", which maps to 60010 managers. | as 62100 (alt. 64101) | — | — | 78,100 (alt. 60,900) |
| Support, technical (software help desk) | **22221** User support technicians | Job titles include "software technical support analyst" and "help desk technician". | 21.63 / **34.50** / 52.20 | 20.00 / 33.00 / 51.28 | 31.47 | 67,300 |
| Support, non-technical (phone/email) | **64409** Other customer and information services representatives | Job Bank profile "Customer Service Representative – Call Centre". The low figure equals the Ontario minimum wage of $17.95 from 1 Oct 2026. | 17.95 / **21.54** / 32.95 | 17.95 / 21.50 / 33.17 | 22.00 | 42,000 |
| Onboarding / implementation | **21221** Business systems specialists | Duties: "design, develop, integrate, test and implement information systems business solutions"; liaison with clients. | 33.33 / **45.13** / 62.50 | 33.33 / 45.13 / 62.50 | 45.13 | 88,000 |
| Implementation (alternative) | **21222** Information systems specialists | Titles include "IT consultant" and "systems consultant". | 27.47 / **48.08** / 73.85 | 28.59 / 47.00 / 72.60 | 46.15 | 93,800 |
| Data migration / conversion | **21223** Database analysts and data administrators | There is no data-conversion code. This is the closest data-handling group. **The Toronto row comes from the 2021 Census (older)**, so the Ontario row is used in §7. | 21.90 / **44.47** / 67.45 (2021) | 24.58 / 40.87 / 61.54 | 40.87 | 86,700 (Ontario: 79,700) |
| Marketing coordinator | **11202** Professional occupations in advertising, marketing and public relations | Job Bank profile "Marketing Coordinator". | 20.00 / **37.50** / 60.73 | 20.00 / 37.02 / 58.97 | 35.58 | 73,100 |
| Content writer | **51111** Authors and writers (except technical) | Job Bank profile "Content Writer (except Technical)". | 27.18 / **40.38** / 53.00 | 25.82 / 40.38 / 53.00 | 36.81 | 78,700 |
| Partnerships / business development | **41402** Business development officers and market researchers and analysts | Title "business development officer". *Caveat:* the group leans toward economic-development and market-research work. A commission-paid partner manager may sit closer to 62100. | 31.73 / **47.18** / 71.79 | 30.00 / 45.64 / 71.79 | 44.00 | 92,000 |
| Head of sales (higher-capacity scenario only) | **60010** Corporate sales managers | Job Bank profile "Account Manager – Sales" (a manager-level group). | 38.46 / **59.55** / 147.06 | 38.00 / 60.10 / 132.57 | 60.10 | 116,100 |
| Bookkeeper (if employed rather than outsourced) | **12200** Accounting technicians and bookkeepers | Direct match. | 18.00 / **29.22** / 47.36 | 19.23 / 28.50 / 46.15 | 28.02 | 57,000 |

**Remote Canada.** The Canada median column is the national figure. CPP and EI are the same in every province except Quebec (which has its own pension plan and a lower EI rate). Payroll taxes in other provinces were **not researched**.

### 1.2 Data quality notes
- The figures are occupation-wide, not specific to SaaS. Software firms may pay above the median, but **no primary source** was found to measure that.
- 21221 shows identical Ontario and Toronto rows on the page. They were re-read directly and are as published.
- Commission: because Labour Force Survey wages include commissions, the sales medians should not be treated as base salary. No government source splits base from commission (§3).

### 1.3 Optional wage-growth uplift (Statistics Canada)
Statistics Canada, *The Daily — Labour Force Survey, August 2026* (released 4 Sep 2026): average hourly wages were "up 2.0% (to $37.02) year over year". Growth "averaged 4.9% over 2023 and 2024, before decelerating to an average of 3.4% in 2025". These are averages across all occupations in Canada, not by occupation. **My calculation:** to move a 2023–2024 Job Bank figure to 2026 levels, an uplift of about **+5.5%** (1.034 × 1.020) is a defensible central case. Use 0% as the low case. Confidence: low to medium.

---

## 2. Employer on-costs in Ontario, 2026 (official rates published)

| Item | 2026 rule | Max per employee per year | Source |
|---|---|---|---|
| CPP (base + first additional) | Employer pays **5.95%** of earnings between the $3,500 basic exemption and the **$74,600** maximum pensionable earnings ($71,100 maximum contributory earnings). The employee pays the same. | **$4,230.45** employer | CRA, CPP contribution rates (page dated 2025-10-31) |
| CPP2 (second additional) | Employer pays **4%** on earnings between $74,600 and **$85,000**. The employee pays the same. | **$416** employer | CRA, CPP2 rates and maximums |
| EI | Employee rate is **1.63%**. The employer pays **1.4 times** the employee premium (= 2.282% of insurable earnings) up to the **$68,900** maximum insurable earnings. | **$1,572.30** employer | CRA, EI premium rates and maximums (page dated 2025-09-16) |
| **Total federal payroll on-cost (calc.)** | CPP + CPP2 + EI | **$6,218.75** at a salary of $85,000 or more. Examples: $3,085 at $40k (7.7%); $4,731 at $60k (7.9%); $6,019 at $80k (7.5%); $6,219 at $100k (6.2%) | Calculated from the rows above |
| Ontario Employer Health Tax (EHT) | **No EHT** while total annual Ontario payroll is under the **$1 million exemption** (eligible employers, with associated-group payroll under $5M). Above that, the rate is **0.98% to 1.95%** of payroll over $1M, set by total payroll: 1.95% applies once payroll is over $400,000. Remuneration includes salaries, bonuses and taxable benefits. | $0 in the lean and probably the higher-capacity case | Ontario Ministry of Finance, EHT (updated 18 Sep 2026) |
| Vacation | At least **2 weeks** and **4%** vacation pay for employees with under 5 years' service; **3 weeks / 6%** at 5+ years. Vacation pay is calculated on gross wages, **including commissions**. For salaried staff who take paid leave, this is not an extra cash cost; for commission and hourly pay, budget **+4%**. | — | Ontario, Your guide to the ESA: Vacation (updated 5 Feb 2026) |
| WSIB (workplace injury insurance) | Probably **not mandatory**. Ontario Regulation 175/98, Schedule 1 Part II ("Excluded Industries") lists "Software services", "Computer services", "Application software programming services", "Data hosting and processing services" and "The design and development of computer software for the purpose of mass market reproduction". Coverage can be bought voluntarily by application. **Confirm the classification with WSIB.** | $0 if not covered | O. Reg. 175/98; WSIB "Can I choose to have WSIB insurance?" |
| Group health and dental benefits | **No primary source.** Quote needed from a group-benefits broker or insurer. | — | — |
| Ontario minimum wage | **$17.95/hour** from 1 Oct 2026 to 30 Sep 2027 | — | Ontario, ESA guide: Minimum wage |

---

## 3. Commission and variable pay

| Question | Finding |
|---|---|
| Typical base/commission split (OTE) for SaaS account executives, SDRs, customer success | **No primary source.** No government source publishes splits. GitLab's public handbook (a provider's own published policy) confirms that sales roles are paid on OTE but says "The split between base and commission varies by role". It publishes no split. Third-party salary sites were not used. |
| Do Job Bank wages include commission? | **Yes.** Labour Force Survey wages "include tips and commissions" (Job Bank wage methodology). |
| On-costs on commission | Vacation pay (4% or 6%) applies to commissions (Ontario ESA). EHT remuneration includes bonuses. CPP and EI apply to employment income up to the maximums above. |
| What to do instead | Treat the plan as a decision, not a benchmark. Set a scenario in the workbook (for example, central = Job Bank median as total cash, with the split decided by Ranjan). Validate with 2–3 recruiter quotes before any offer. |

---

## 4. India (Bengaluru or remote)

| Item | Finding |
|---|---|
| Role-level salaries (sales, customer success, support, implementation, marketing) | **No primary source.** India's government labour survey (PLFS, Ministry of Statistics) publishes average earnings for all salaried workers, not by occupation or city. It is not usable for pricing these roles, so no figure is used. |
| Statutory employer on-costs (provident fund, gratuity and others) | Not verified in this pass: the EPFO site could not be read cleanly. **Confirm with an Indian chartered accountant or payroll provider.** |
| How to get usable numbers | (1) Salary bands per role from 2–3 Bengaluru technology recruiters. (2) Employer-of-record cost quotes, which include statutory costs (see §5 for published platform fees). (3) If the development team's Indian company exists, its payroll provider or CA for actual on-costs. (4) Salary bands in current job postings, as a secondary check only. |
| Exchange rate, if converting | Bank of Canada daily average for 6 Oct 2026: **1 INR = 0.01476 CAD**; **1 USD = 1.4226 CAD**. Re-check on the budget date. |

---

## 5. Fractional and contract services (all rows: provider-published, not vetted)

All prices are the provider's own published "from" or "starting at" figures, checked on 7 Oct 2026. Real quotes for our scope will usually be higher. "$ (unstated)" means the page shows "$" without naming the currency. US providers are probably USD, but that has not been confirmed. Several US firms file US taxes only and may not handle Canadian corporate tax or GST/HST.

| Category | Provider (market) | Published price | Basis | URL |
|---|---|---|---|---|
| Fractional / virtual CFO | LedgerLogic (Canadian CPA firm) | "typically range from $2,000 to $5,000 per month" | per month; $ (unstated) | https://www.ledgerlogic.ca/services/virtual-cfo |
| Fractional CFO | Pilot (US) | CFO Basic $1,750 / Essentials $3,150 / Custom $5,250 | per month, billed annually; $ (unstated) | https://pilot.com/pricing |
| Fractional CFO | Bookkeeper360 (US); Graphite Financial (US) | Each "Starting at $2,000 per month" | per month; $ (unstated) | https://bookkeeper360.com/pricing/ ; https://www.graphitefinancial.com/pricing |
| Outsourced bookkeeping | LedgerLogic (Canada) | Genesis from $350/mo (annual or quarterly books plus corporate T2 return); Momentum from $750/mo (monthly books, payroll); Summit from $2,000/mo | per month, "No Lock-in Contracts"; $ (unstated) | https://www.ledgerlogic.ca/pricing |
| Outsourced bookkeeping | Avalon Accounting (Canada; healthcare focus) | "minimum investment of $300 per month" | per month | https://avalonaccounting.ca/packages |
| Outsourced bookkeeping | Bench | Light $199 / Bookkeeping $399 / Bookkeeping + Tax $649; 20% off 12-month plans | per month; $ (unstated) | https://www.bench.co/pricing |
| Outsourced bookkeeping | Escalon (US) | "Starting around $695 per month" | per month | https://escalon.services/pricing |
| Fractional marketing | Gripped (UK agency) | "Advisory or Execution From £3,500/month + project fees" | per month, GBP. An agency retainer rather than a true fractional CMO. | https://gripped.io/pricing/ |
| Fractional leader placement | Fractional Jobs (US/Canada network) | One-time referral fee "$3,000 to $8,000"; the leader's own rate is not published | one-time | https://www.fractionaljobs.io/hire-a-fractional-cmo |
| Revenue operations (adjacent to a sales leader) | RevPartners (US) | $9,850 / $14,500 / $19,000 per month for 10 / 15 / 20 hours a week | per month, 6-month initial term | https://revpartners.io/pricing |
| Outsourced SDR / appointment setting | CIENCE (US) | Setup $5,000 one-time; strategy team $2,000/mo; platform $499/mo; first month $7,499. **The sales reps themselves are "quoted separately".** | month to month | https://www.cience.com/pricing/ |
| Outsourced SDR | Sopro (UK) | "pricing starts at around £3K per month" | per month, GBP | https://sopro.io/pricing/ |
| Lead calling | Upcall (US agents) | "$3.5 to $7.5 per lead"; minimum 1,000-lead programme | per lead | https://www.upcall.com/pricing |
| Customer-support outsourcing | Influx (global) | Part-time from $1,000/mo; dedicated agent from $1,400/mo (Asia-Pacific) or $1,700/mo (Americas); managed team $2,000–2,100/mo per agent | per agent per month, month to month | https://influx.com/pricing |
| Phone answering | Smith.ai (US) | 30 calls $300 / 90 calls $810 / 300 calls $2,100 per month | per month plus per-call overage | https://smith.ai/pricing/receptionists |
| Employer of record (hire in Canada or India without our own entity) | Deel / Remote / Oyster | $599 (Deel) / USD 699 (Remote) / USD 699 (Oyster) per employee per month. Platform fee only: salary and statutory costs are on top. Country-specific prices were not checked. | per employee per month | https://www.deel.com/pricing/ ; https://remote.com/pricing ; https://www.oysterhr.com/pricing |

**Gaps:**
- **Fractional VP Sales:** no provider-published rate found (checked Sales Xceleration, Leadium, Toptal, Fractional Jobs).
- **True fractional CMO:** no published rate (checked MarketerHire, Kalungi, Chief Outsiders, Toptal).
- **QuickBooks Live Canada:** price not shown.
- **Pages that blocked reading (HTTP 403):** Martal Group (Toronto, outsourced sales), Multiplier, Peak Support, Upwork.
- **Bench:** check the provider's current status and ownership before relying on it. It had a widely reported service disruption in Dec 2024 (not re-verified here).

---

## 6. Tools and services (official pricing pages, checked 7 Oct 2026)

**Important caveat:** several vendor sites priced this session as if the visitor were in India (HubSpot reported country "in"; Mailchimp, Zoom and Zoho displayed INR first). The rows below use CAD where the page offered it, otherwise USD. **Re-check HubSpot, Mailchimp, Zoom and Pipedrive from a Canadian connection before committing.** Regular prices are listed; first-year promotions are noted but not used.

| Tool | Plan: price | Currency | Basis | Notes | URL |
|---|---|---|---|---|---|
| HubSpot Sales Hub | Starter: page showed $7 with a crossed-out **$20** list price (the $7 is possibly India or promotional pricing). Professional: **$90** annual ($100 list) plus a **mandatory $1,500 one-time onboarding fee**. Enterprise: from $150 plus $3,500 onboarding. | USD | per seat per month | Free plan for up to 2 users | https://www.hubspot.com/pricing/sales |
| Pipedrive | Lite 14 / Growth 24 / Premium 49 / Ultimate 69 (annual); monthly 19 / 34 / 64 / 89 | USD | per seat per month | Prices exclude tax; add-ons extra | https://www.pipedrive.com/en/pricing |
| Zoho CRM | Standard 19 / Professional 31 / Enterprise 50 / Ultimate 65 (annual); monthly 25 / 44 / 63 / 81 | CAD | per user per month | CAD read from the page's own price data, not seen on screen | https://www.zoho.com/crm/zohocrm-pricing.html |
| Mailchimp | **Not captured for Canada** (the page offered only INR or USD) | — | priced by contacts | Re-check from Canada | https://mailchimp.com/pricing/marketing/ |
| Brevo | Starter C$9 (yearly) / C$10 (monthly); Standard C$19 / C$22 | CAD | per month, priced by email volume (from 5,000/mo) | Free plan: 300 emails/day | https://www.brevo.com/pricing/ |
| Calendly | Standard $10 (yearly) / $12 (monthly); Teams $16 / $20 | $ (USD implied) | per seat per month | Only hosts need seats | https://calendly.com/pricing |
| Zoom Webinars (500 attendees) | $83.33/mo billed annually; $129 monthly | USD | per licence per month | **A Zoom Workplace Pro licence is also required** (price not captured). Read from the India view. | https://zoom.us/pricing/events |
| FirstPromoter | $49 / $99 / $149 per month ($490 / $990 / $1,490 per year) | USD | flat, tiered by affiliate revenue ($5k / $15k / above $15k per month) | Unlimited team members | https://firstpromoter.com/pricing |
| Rewardful | $49 / $99 / $149+ per month ($490 / $990 / $1,490+ per year) | $ (unstated) | flat, tiered by affiliate revenue | Managed payouts 3% | https://www.rewardful.com/pricing |
| Tolt | $69 / $99 / $199 per month | $ (unstated) | tiered by affiliate revenue | Automatic payouts 2% fee | https://tolt.com/pricing |
| PartnerStack | **Not published** (demo only). The page's hidden data lists USD 1,000 and 1,520 per month on 1-year terms, which is unconfirmed. | — | — | Quote needed | https://partnerstack.com/pricing |
| DocuSign eSignature | Personal C$13 (annual) / C$20 (monthly); Standard C$40 / C$57; Business Pro C$65 / C$85 | CAD | per user per month | First-year specials (C$33, C$53) not used | https://www.docusign.com/en-ca/products-and-pricing |
| Dropbox Sign | Essentials $15/mo ($180/yr); Standard $25/user/mo (minimum 2 users) | USD | per user | Lower figures shown appear to be a first-year offer | https://sign.dropbox.com/products/dropbox-sign/pricing |
| Zendesk | Support Team $19 (annual) / $25; Suite Team $55 / $69; Suite Professional $115 / $149. Suite Growth $89 / $115 (in page data only). | USD | per agent per month | Extra AI resolutions $1.50–2.00 | https://www.zendesk.com/pricing/ |
| Freshdesk | Growth $19 / Pro $55 / Enterprise $89 | USD | per agent per month, annual | Monthly rates not shown; AI agent $49 per 100 sessions after the first 500 | https://www.freshworks.com/freshdesk/pricing/ |
| Intercom | Essential $29 / Advanced $85 / Expert $132 (annual); page data $39 / $99 / $139 (probably monthly) | USD | per seat per month | **Fin AI agent $0.99 per outcome** | https://www.intercom.com/pricing |
| Help Scout | Standard $25 / Plus $45 / Pro $75 | $ (unstated) | per user per month, annual | Paid plans no longer priced by contacts; AI Answers $0.75 per resolution | https://www.helpscout.com/pricing/ |
| Atlassian Statuspage | Hobby $29 / Startup $99 / Business $399 | $ (unstated) | per page per month | Free plan available | https://www.atlassian.com/software/statuspage/pricing |
| Instatus | Pro $20 monthly / $15 yearly; Business $300 / $225 | $ (unstated) | per month | Read from the page script | https://instatus.com/pricing |
| LinkedIn Sales Navigator | Core C$144.99/mo or C$1,199.88/yr; Advanced C$179.99/mo or C$2,039.88/yr | CAD | per licence | LinkedIn calls these "estimates" that may exclude tax | https://business.linkedin.com/sell/sales-navigator/compare-plans |
| Stripe Canada, cards | **2.9% + CA$0.30** per domestic card charge; **+0.8%** international cards; +2% if currency conversion is needed; dispute fee CA$15 | CAD | per transaction | No monthly fee | https://stripe.com/en-ca/pricing |
| Stripe Billing | **0.7% of Billing volume** (pay as you go), or from CA$770/mo on a 1-year contract covering up to CA$125k/mo of volume, then 0.67% | CAD / % | on top of card fees | Calculation: a domestic subscription card payment costs about 3.6% + CA$0.30 | https://stripe.com/en-ca/billing/pricing |
| Vanta / Drata | **Not published. Quote needed.** | — | — | Demo only | https://www.vanta.com/pricing ; https://drata.com/pricing |
| Cyber / technology E&O insurance | Zensurance (Canadian broker) guide figures: technology package about **$600/yr** (E&O $100k limit plus general liability $1M); cyber about $100–200/yr as an add-on, standalone about $750–1,000/yr. **Low limits only.** | $ (Canadian site) | per year | Coalition Canada publishes no price. **For the limits customers will ask for: quote needed.** | https://www.zensurance.com/technology-insurance |
| Penetration testing | Software Secured (Ottawa): web and API test from **US$10,800**, including retests. Astra: $5,999/yr. Intruder: AI-assisted web app tests from $3,500 per test. Cobalt: quote only. | mixed | per engagement or year | **Published prices are rare** and are "starts at" figures | https://www.softwaresecured.com/pricing ; https://www.getastra.com/pricing ; https://www.intruder.io/pricing |
| Website builder / hosting | Not researched (judged not needed for this budget) | — | — | — | — |

---

## 7. Assumptions ready for a budget

**Conventions:**
- Pay rows: Toronto, at 2023–2024 levels, total cash including commission, annualised at 1,950 hours. Low = 10th percentile (entry level), central = median, high = 90th percentile (senior).
- Confidence: **H** = official and direct; **M** = official but a proxy, or a clear vendor page; **L** = provider marketing figure, mixed proxies or unverified.

| Item | Low | Central | High | Unit | Currency | Source | Conf. |
|---|---|---|---|---|---|---|---|
| Account executive | 43,800 | 78,100 | 141,600 | per FTE per year | CAD | Job Bank 62100 Toronto | M |
| Sales development rep | 36,100 | 60,900 | 108,300 | per FTE per year | CAD | Job Bank 64101 Toronto | M |
| Customer success manager | 60,900 | 78,100 | 141,600 | per FTE per year | CAD | Low = 64101 median; central and high = 62100 (mixed proxies) | L |
| Support, technical | 42,200 | 67,300 | 101,800 | per FTE per year | CAD | Job Bank 22221 Toronto | M |
| Support, non-technical | 35,000 | 42,000 | 64,300 | per FTE per year | CAD | Job Bank 64409 Toronto | H |
| Onboarding / implementation | 65,000 | 88,000 | 121,900 | per FTE per year | CAD | Job Bank 21221 Toronto | M |
| Data migration specialist | 47,900 | 79,700 | 120,000 | per FTE per year | CAD | Job Bank 21223 **Ontario** row (Toronto row is from 2021) | M |
| Marketing coordinator | 39,000 | 73,100 | 118,400 | per FTE per year | CAD | Job Bank 11202 Toronto | M |
| Content writer | 53,000 | 78,700 | 103,400 | per FTE per year | CAD | Job Bank 51111 Toronto | M |
| Partnerships / business development | 61,900 | 92,000 | 140,000 | per FTE per year | CAD | Job Bank 41402 Toronto | L |
| Head of sales (higher capacity only) | 75,000 | 116,100 | 286,800 | per FTE per year | CAD | Job Bank 60010 Toronto | M |
| Bookkeeper, employed part-time | 18.00 | 29.22 | 47.36 | per hour | CAD | Job Bank 12200 Toronto | H |
| Uplift from 2023–24 to 2026 pay levels | 0% | +5.5% | not sourced | % of pay | — | StatCan LFS Aug 2026 (calc. 1.034 × 1.020) | L |
| Commission / OTE split | — | — | — | — | — | **No primary source. Decision for Ranjan.** | — |
| Employer CPP + CPP2 + EI | 3,085 (at $40k) | 6,019 (at $80k) | 6,219 (cap, ≥ $85k) | per employee per year | CAD | CRA 2026 rates (calc.) | H |
| Ontario EHT | 0 | 0 | 1.95% of payroll above $1M | per year | CAD | Ontario EHT page | H |
| Vacation pay on commission and hourly pay | 4% | 4% | 6% (5+ years) | % of those wages | — | Ontario ESA | H |
| WSIB | 0 | 0 | quote if bought voluntarily | — | CAD | O. Reg. 175/98 Part II (confirm with WSIB) | M |
| Group health and dental benefits | quote | quote | quote | per employee | CAD | No primary source | — |
| India salaries and on-costs | quote | quote | quote | per FTE | INR | No primary source; get recruiter and EOR quotes | — |
| EOR platform fee (Canada or India hire) | 599 | 699 | 699 | per employee per month | USD | Deel; Remote and Oyster pages | M |
| Fractional CFO | 1,750 | 2,000 | 5,250 | per month | $ (unstated) | Pilot; LedgerLogic, Bookkeeper360, Graphite; Pilot Custom | L |
| Outsourced bookkeeping (Canada) | 300 | 750 | 2,000 | per month | $ (Canadian sites) | Avalon; LedgerLogic Momentum and Summit | L |
| Outsourced SDR | £3,000 | — | 7,499 first month (reps extra) | per month | GBP / $ | Sopro; CIENCE (not comparable) | L |
| Outsourced support agent | 1,000 (part-time) | 1,700 (Americas, dedicated) | 2,100 (managed) | per agent per month | $ (unstated) | Influx | L |
| Fractional VP Sales or CMO | quote | quote | quote | per month | — | No published rate found | — |
| CRM (Zoho) | 19 | 31 | 50 | per user per month, annual | CAD | Zoho CRM | M |
| CRM (Pipedrive) | 14 | 24 | 49 | per seat per month, annual | USD | Pipedrive | M |
| CRM (HubSpot Sales Hub) | 20 (Starter list) | 90 + 1,500 one-time | 150 + 3,500 one-time | per seat per month | USD | HubSpot (re-check from Canada) | L |
| Email marketing (Brevo) | 9 | 19 | 22 | per month | CAD | Brevo | M |
| Scheduling (Calendly) | 10 | 16 | 20 | per seat per month | USD | Calendly | M |
| Webinars (Zoom, 500 attendees) | 83.33 | 83.33 | 129 | per month (plus Workplace Pro licence) | USD | Zoom | M |
| Affiliate / referral tracking | 49 | 99 | 199 | per month | USD / $ | FirstPromoter, Rewardful, Tolt | M |
| E-signature | 13 | 40 | 65 | per user per month, annual | CAD | DocuSign Personal / Standard / Business Pro | M |
| Help desk | 19 | 55 | 115 | per agent per month, annual | USD | Zendesk Support Team / Suite Team / Suite Professional | M |
| AI support agent | 0.75 | 0.99 | 2.00 | per resolution | USD / $ | Help Scout, Intercom Fin, Zendesk overage | M |
| Status page | 15 | 99 | 399 | per month | $ | Instatus Pro yearly; Statuspage Startup / Business | M |
| LinkedIn Sales Navigator | 99.99 (Core, paid yearly) | 144.99 (Core, monthly) | 179.99 (Advanced, monthly) | per licence per month | CAD | LinkedIn | M |
| Card processing (Stripe) | 2.9% + 0.30 | 2.9% + 0.30 | 3.7% + 0.30 (international card) | per charge | CAD | Stripe Canada | H |
| Subscription billing (Stripe Billing) | 0.7% | 0.7% | 0.7% | % of billing volume | — | Stripe Billing | H |
| Compliance automation (Vanta / Drata) | quote | quote | quote | per year | — | Not published | — |
| Cyber and technology E&O insurance | 600 (low limits) | quote | quote | per year | $ | Zensurance guide | L |
| Penetration test, web app and API | 3,500 | 5,999 | 10,800 | per test or year | $ / USD | Intruder; Astra; Software Secured | L |
| USD to CAD, if converting | — | 1.4226 | — | CAD per USD | — | Bank of Canada, 6 Oct 2026 | H |

---

## 8. Sources (all checked 7 Oct 2026; vendor and provider URLs are in the §5 and §6 rows)

| # | Source (publisher) | URL | Date or data year | Status |
|---|---|---|---|---|
| S1 | Job Bank wage pages, Ontario and Canada views (ESDC): profiles 6127 (62100), 23200 (64101), 3772 (22221), 15201 (64409), 22515 (21221), 22490 (21222), 17873 (21223), 27114 (11202), 296595 (51111), 3873 (41402), 26658 (60010), 12562 (12200) | https://www.jobbank.gc.ca/marketreport/wages-occupation/{profile}/ON and …/ca | Updated 19 Nov 2025; reference 2023–2024 (21223 Toronto: 2021 Census) | OK; figures re-read from page text |
| S2 | Job Bank occupation descriptions (job titles, duties) | https://www.jobbank.gc.ca/marketreport/occupation/{6127, 23200, 22490, 3772, 3873, 22515}/ca | current | OK |
| S3 | Job Bank, Questions and Answers on Wages | https://www.jobbank.gc.ca/trend-analysis/search-wages/wage-methodology | current | OK |
| S4 | Statistics Canada, The Daily — Labour Force Survey, August 2026 | https://www150.statcan.gc.ca/n1/daily-quotidien/260904/dq260904a-eng.htm | released 4 Sep 2026 | OK |
| S5 | CRA, CPP contribution rates, maximums and exemptions | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html | page 2025-10-31; 2026 rates | OK |
| S6 | CRA, Second additional CPP contribution rates and maximums | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions/making-deductions/second-additional-cpp-contribution-rates-maximums.html | 2026 rates | OK |
| S7 | CRA, EI premium rates and maximums | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html | page 2025-09-16; 2026 rates | OK |
| S8 | Ontario Ministry of Finance, Employer Health Tax | https://www.ontario.ca/document/employer-health-tax-eht | updated 18 Sep 2026 | OK |
| S9 | Ontario, Your guide to the ESA: Vacation | https://www.ontario.ca/document/your-guide-employment-standards-act-0/vacation | updated 5 Feb 2026 | OK |
| S10 | Ontario, Your guide to the ESA: Minimum wage | https://www.ontario.ca/document/your-guide-employment-standards-act-0/minimum-wage | rates from 1 Oct 2026 | OK |
| S11 | Ontario Regulation 175/98, Schedule 1 Part II | https://www.ontario.ca/laws/regulation/980175 | current consolidation | OK |
| S12 | WSIB, Can I choose to have WSIB insurance? | https://www.wsib.ca/en/businesses/registration-and-coverage/can-i-choose-have-wsib-insurance | current | OK |
| S13 | Bank of Canada, daily exchange rates (Valet) | https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXINRCAD/json?recent=3 | 6 Oct 2026 observation | OK |
| S14 | GitLab Handbook, Compensation | https://handbook.gitlab.com/handbook/total-rewards/compensation/ | current | OK; no split published |
| — | Failed or blocked: NOC site noc.esdc.gc.ca (certificate error; Job Bank used instead); EPFO India site (not readable); Mailchimp (no Canadian view); Zoom /pricing/zoom-webinars (404); Multiplier, Martal Group, Peak Support, Upwork, Foxquilt, BrokerLink, BreachLock (403); Packetlabs (no pricing page) | — | — | gaps noted |

**Method note.** Government pages and the Stripe and LinkedIn figures were re-read directly from page text. Vendor and provider pages in §5–6 were read by research sub-agents and not all re-checked line by line. Pages that served India pricing are flagged. Nothing was signed up for, submitted or requested.
