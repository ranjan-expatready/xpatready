# R4: Funding options and fundraising intermediaries

**Date:** 7 Oct 2026. **Writer:** research agent (Claude). **Status:** research input only. Nothing here is a decision, an application, an endorsement or a hire.
**Feeds:** `00-evidence-baseline.md` HYP-11 (whether an intermediary adds value) and QA-3 (company facts that decide eligibility); later `03-funding-investor-plan.md`.
**Not advice:**
- Tax items: confirm with an accountant.
- Securities items: confirm with Ontario securities counsel.
- Anything touching immigration programmes: confirm with counsel or an RCIC.

**How to read it:**
- **Sources:** each fact carries a source ID like [S12], listed in the Sources table at the end. Every source was checked on 7 Oct 2026. Most rows with a single read came from six parallel research passes; the priority facts were then fetched again by me.
- **"Not published"** means the organisation's own page does not say.
- **Tax labels:** **LAW** = enacted; **GUIDANCE** = agency policy or programme rules.
- **No contact:** nobody was contacted, and no form, application or account was used.
- **Providers** are "not vetted, not contacted". **Investors** are "fit unverified". Nothing here suggests any organisation is interested in Expat Ready.

**In plain words:**
- **CCPC** (Canadian-controlled private corporation): a private company that is resident in Canada and not controlled by non-residents or by public companies.
- **ITC:** a tax credit that reduces tax owed. A *refundable* credit is paid out in cash even when no tax is owed.
- **SAFE** (simple agreement for future equity): money now in exchange for shares later, at the next priced round. *MFN* (most favoured nation) means the SAFE converts on the best terms given to any later SAFE.
- **EMD** (exempt market dealer): a securities dealer registered to sell private-company shares to investors who qualify under an exemption.
- **MRR:** monthly recurring revenue.

---

## 0. Bottom line

1. **Most free government money depends on three facts nobody has confirmed:**
   - whether ExpatReady Technologies Inc. is a CCPC
   - whether the development work is done in Canada
   - whether there is Canadian payroll

   As the team appears to be set up (development in India, not confirmed), SR&ED, the Ontario Innovation Tax Credit and IRAP project funding would pay little or nothing on that work. These are conditions to confirm, not conclusions (§1).
2. **Before revenue, the realistic options are:**
   - angel groups that charge no application fee
   - pre-seed funds
   - accelerators and incubators: DMZ and the Legal Innovation Zone (LIZ) once there is a product with users; Y Combinator at any stage
   - small founder-eligibility programmes, which depend on the founder's age, citizenship and residence

   Bank-style loans (BDC, CSBFP) mostly need revenue history.
3. **Paying someone a success fee to find investors is the main legal risk.** Ontario's registration rules treat being paid, especially per deal, plus contacting investors as signs that a person is in the business of trading securities. That person must then be registered, for example as an EMD, or fit a specific exemption (§7.1).
4. **Published fees exist for some routes.** A registered EMD platform publishes C$5,000 plus 7% of funds raised, or C$2,500 plus 1.5% for private or accredited-only raises [S91]. No Canadian fundraising consultant or finder with published fees was found.

---

## 1. Facts that decide eligibility

| Unknown fact (baseline QA-3) | If yes | If no | Who confirms |
|---|---|---|---|
| **The company is a CCPC.** Private, resident in Canada, not controlled directly or indirectly by non-residents or public companies [S9] | SR&ED **35%** credit on up to **$6M** a year of qualifying spending, **100% refundable** on current spending [S1][S2] | **15%** credit, not refundable [S2]. With no tax to pay before revenue, there is no cash until the company is profitable | Accountant; incorporation and shareholder records |
| **The R&D work is done in Canada.** Employees, or contractors working in Canada | SR&ED, the Ontario Innovation Tax Credit (OITC) and IRAP projects are all possible | **SR&ED:** contract work done entirely outside Canada earns nothing [S5]. Salary for SR&ED done outside Canada counts only for employees resident in Canada, capped at 10% of in-Canada SR&ED salary [S4]. **IRAP:** does not fund "work done outside Canada" [S10]. **OITC:** needs SR&ED done in Ontario and a permanent establishment there [S13] | Accountant; contracts with the development team |
| **Canadian payroll.** Canadian employer; hires citizens, permanent residents or protected persons at Canadian institutions | Wage subsidies (SWPP, Canada Summer Jobs, IRAP youth) and Mitacs [S12][S24][S25][S26] | None of these apply | Ranjan |
| **Revenue history** | BDC start-up loan after 12 months of revenue [S18]; DMZ Incubator (needs MRR) [S33]; CanExport (from $300k revenue) [S17] | Pre-revenue routes only (§0, point 2) | Records (none found, OBS-8) |
| **Founder profile.** Age 18–39; citizen or permanent resident living in Canada; more than 50% ownership | Futurpreneur up to $75k [S22]; NEXT Founders [S38]; Starter Company Plus [S16] | Not eligible | Ranjan |
| **Corporate form** | IRAP needs an incorporated, for-profit company. It excludes ULCs and LLCs, sole proprietorships, partnerships and co-operatives [S10] | — | Incorporation papers |

---

## 2. Government and quasi-government programmes

| Programme | What it gives (published) | Conditions that could exclude Expat Ready | Timing | Effort |
|---|---|---|---|---|
| **SR&ED** (federal R&D tax credit) | **LAW**, from Bill C-15 (Royal Assent 26 Mar 2026), for tax years beginning after 15 Dec 2024 [S1]:<br>• Enhanced 35% credit limit raised from $3M to **$6M**.<br>• Limit phases out as prior-year taxable capital goes from **$15M to $75M**.<br>• Capital spending is eligible again.<br>• Eligible Canadian public companies now qualify.<br>The 35% credit on current spending is 100% refundable for qualifying CCPCs [S2]. Budget 2025 proposed the $6M figure [S3] | • CCPC status (§1).<br>• Work done in Canada (§1).<br>• Work must address *technological uncertainty* through systematic investigation. Routine development, debugging and quality control are excluded [S6].<br>• Non-arm's-length contract work is not a "qualified" expenditure; arm's-length contracts qualify at 80% [S5] | • Claim with the tax return (T661) **within 18 months of year-end**. Late claims cannot be accepted [S8].<br>• **Optional pre-claim approval** since 1 Apr 2026, for Canadian corporations with gross business income under $25M. CRA says it decides within 8 weeks [S1][S7] | Project write-ups and time records; amount not published |
| **Ontario Innovation Tax Credit** | **8% refundable** on Ontario SR&ED; $3M limit; maximum credit $240k. The limit shrinks as prior-year taxable income goes from $500k to $800k [S13] | • Permanent establishment in Ontario.<br>• SR&ED carried out in Ontario.<br>• A federal T661 claim [S13].<br>• The page does not say "CCPC only" | With the tax return | Comes with SR&ED |
| **NRC IRAP** | Advice and connections, "in some cases" funding for R&D and innovation projects. The relationship "typically starts with advice and referrals" before any funding [S10]. A published amount range was seen only as a search excerpt of an NRC evaluation (regular awards $50k–$1M) [S10b] | • Incorporated, for-profit, operating in Canada, ≤500 FTE, creating economic benefits in Canada.<br>• Needs a CRA business number, business plan, recent financial statements, ownership structure and team résumés.<br>• Does not fund day-to-day costs, purely commercial work or **work done outside Canada** [S10] | • Continuous intake.<br>• A senior executive calls **1-877-994-4727**; then a client engagement adviser, then an industrial technology adviser [S10].<br>• IRAP is due to move to the new Canada Innovation Corporation by 2026-27 at the latest [S11] | Not published |
| **IRAP Youth Employment Program** | Covers part of a young graduate's salary for 6–12 months [S12] | • Graduate aged 15–30, citizen, PR or refugee.<br>• At least 30 hours a week [S12] | Decision within 2 weeks of application [S12] | Monthly claims |
| **OCI Ready 4 Market** (Ontario Centre of Innovation) | Up to **$250k** co-investment in pre-seed or seed rounds of $500k–$2M. About 20 investments a year [S14] | • A private co-investor is required.<br>• Incorporated ≤5 years, principal operations in Ontario, under $1M of outside capital raised.<br>• Market of at least $100M.<br>• "Best suited" to Ontario academic IP or campus-incubator companies (for example DMZ, LIZ) [S14] | Interest form; no deadline published [S14] | Due diligence |
| **Starter Company Plus** (Ontario) | Grant **up to $5,000** plus training and a mentor [S16] | • Ontario resident; citizen or PR; 18+; not in school full-time.<br>• Must contribute 25% [S16] | Through Small Business Advisory Centres; local dates not published [S16] | Low |
| **Ontario Interactive Digital Media Tax Credit** | — | Products made primarily for corporate or institutional purposes are excluded [S15]. Practice-management software looks excluded; confirm with an accountant | — | — |
| **BDC** | • **Start-up financing:** up to $150k [S18].<br>• **Loan for Tech Companies:** amounts not published [S19].<br>• **Growth & Transition Capital:** $250k–$35M, including MRR-based financing [S21].<br>• **BDC Capital Seed Venture Fund:** direct seed equity; $100M fund; cheque size not published [S20].<br>• **Thrive Venture Fund:** for women-led companies [S20] | • Start-up loan: in operation ≥12 consecutive months **and** generating revenue [S18].<br>• Tech loan: needs revenue [S19].<br>• Growth & Transition: needs an established or high-growth firm [S21].<br>• Seed fund's listed focus areas do not name vertical SaaS [S20] | After revenue (loans) | Not published |
| **Futurpreneur** | Up to $25k plus up to $50k from BDC (**$75k total**); two years of mentoring. 1% loan management fee [S22] | • Age 18–39; citizen or PR living in Canada.<br>• Business not yet operating or ≤24 months old.<br>• Applicants own more than 50% [S22] | Rolling | Business plan and cash flow |
| **CSBFP** (federal small-business loan guarantee) | Bank loans up to **$1.15M**. Of term loans, at most $150k for intangibles and working capital. **2%** registration fee [S23] | • Revenue ≤$10M (start-ups eligible).<br>• Bank decides [S23].<br>• Guidelines require business and assets in Canada (per research pass) [S23] | Through any bank or credit union | Lender-dependent |
| **Mitacs** | • **Accelerate:** partner pays from $7,500 per 4–6-month internship, giving a $15,000 research award.<br>• **Business Strategy Internship:** $5,000 gives a $10,000 award [S24] | • Canadian partner organisation; academic supervisor.<br>• A research project, not routine feature building [S24] | Review about 4–8 weeks [S24] | Proposal with a university |
| **Student Work Placement (SWPP)**, **Canada Summer Jobs** | • **SWPP:** up to $5,000 per placement through delivery partners such as TECHNATION and Magnet. Funding is limited, first come, first served [S25].<br>• **Canada Summer Jobs:** up to 50% of provincial minimum wage [S26] | • Canadian-registered employer.<br>• Students must be citizens, PRs or protected persons (rules vary by partner).<br>• Canada Summer Jobs private employers ≤50 FTE [S25][S26] | Canada Summer Jobs 2027 window not yet published [S26] | Low |
| **CanExport SMEs** | Up to $50k [S17] | 3–500 FTE and revenue of $300k–$100M [S17] | 2026-27 intake **closed 31 Aug 2026** [S17] | Not relevant before revenue |
| **TMU Legal Innovation Zone** (legal-tech incubator) | Incubation in the legal sector. Fees and equity not published [S27] | • MVP with early users or customers.<br>• Full-time founder who moves into LIZ [S27] | Fall 2026 cohort closed; next dates "TBA" [S27] | Application |
| **LSO Access to Innovation** (Law Society of Ontario rules sandbox) | A sandbox where technology-based legal services can operate under LSO rules relief | lso.ca blocked automated reading. From search excerpts only: a 5-year pilot from Nov 2021, ending Nov 2026, with a 2026 consultation on what comes next [S28]. It covers LSO-regulated legal services; whether it applies to RCIC services is unknown (counsel or RCIC) | Unknown | — |
| **Law Foundation of Ontario** | Grants | Not-for-profits only; no for-profit ventures [S29] | — | Excluded |

---

## 3. Accelerators and incubators

| Programme | Money and equity (published) | Fees | Timing | Key conditions [source] |
|---|---|---|---|---|
| **Y Combinator** | **$500k**: $125k on a post-money SAFE for **7%**, plus $375k on an uncapped MFN SAFE; pro-rata right [S30] | "No fees" [S30] | **Winter 2027 deadline 2 Nov 2026, 8pm PT**; decisions by 11 Dec; batch Jan–Mar in San Francisco; later batches open [S31] | In person in San Francisco [S31] |
| **Techstars** | **$220k**: $200k uncapped MFN SAFE plus $20k for **5%** common stock [S32] | None mentioned | New York example: deadline 18 Nov 2026; programme Mar–Jun 2027 [S32] | No Canadian programme listed (research pass) |
| **Antler Canada** | Location page: **$250,000 for 9%** (currency not stated). A Jan 2025 blog said $150k for 10%. **The two conflict; confirm with Antler** [S40] | Not published | Residencies start late March and September [S40] | Pre-idea or pre-product founders accepted |
| **DMZ Incubator** (TMU) | **2.5%** equity in common shares; no cash [S33] | "We don't charge fees"; no board seats [S33] | Spring 2027 cohort; applications ongoing; 18 months [S33] | Seed stage **with MRR**; a full-time founder **and an in-house technical lead**; global founders accepted [S33] |
| **DMZ Pre-Incubator** | **2.0%** equity [S34] | None [S34] | Two intakes a year [S34] | MVP plus pilots, partnerships or letters of intent; same technical-lead rule [S34] |
| **Creative Destruction Lab** | No equity; no direct funding [S35] | No fees [S35] | 2026/27 applications closed 24 Jul 2026 (research pass) | Toronto streams are deep tech (research pass) |
| **MaRS** | No equity mentioned | Membership free [S36] | Rolling | Canadian-incorporated; climate, health or "transformative technology"; MVP and early validation [S36] |
| **Founder Institute** | Founders pledge **2.5%** of future equity as a warrant (a right to buy shares later). It activates at an outside equity round of ≥$100k [S37] | Entrance fee varies by city (example: $1,199, Silicon Valley Fall 2026) [S37] | Toronto chapter page appears out of date [S37] | Idea to early revenue |
| **NEXT Founders / NEXT AI** | No equity; no funding [S38] | No cost [S38] | • Founders: apply 12 Jan–3 Mar 2027.<br>• AI: deadline 9 Dec 2026 [S38] | • Founders: citizens or PRs.<br>• AI: AI at the core; Canadian-incorporated and majority citizen- or PR-owned [S38] |
| **Velocity** (Waterloo) | No equity [S39] | No charge [S39] | Onboarding every two months [S39] | On site in Kitchener-Waterloo at least 1 day a week for the first 3 months [S39] |
| **Communitech** | Not verified (pages blocked) [S41] | — | — | — |
| **TMU Legal Innovation Zone** | See §2 [S27] | Not published | Next cohort TBA | Only legal-tech-specific programme verified |

---

## 4. Angel networks

| Network | How to apply | Published fees [source] |
|---|---|---|
| **NACO** (national association for angel investors) | Does not take start-up applications; points to member groups [S42] | Not published |
| **Maple Leaf Angels** (Toronto) | Online application (Dealum, an online deal platform), then 30-minute Office Hours, then the monthly meeting [S43] | "Simple and free online application" [S43] |
| **Keiretsu Forum Canada** (Toronto, York Region, Waterloo, London) | "Apply to Present" form [S47] | • No fee to apply, be screened or present at Deal Screening.<br>• An **administrative fee** if selected for the full Forum; amount not published.<br>• No warrants or commissions taken in the US or Canada [S47] |
| **GTAN** (Waterloo) | Dealum form, or referral from an existing investor. Rounds of $750k–$5M with at least $300k left; B2B preferred [S44] | Not published |
| **Angel One** (Burlington) | Dealum; valuation $3–10M; pitch in person [S45] | Not published |
| **York Angel Investors** (Markham) | Company profile on its platform; 15-minute pitch plus Q&A [S46] | Not published on its own pages |
| **Capital Angel Network** (Ottawa) | Dealum [S48] | Not published |

GTAN and York Angels also advertise Start-up Visa routes [S44][S46]. That is out of scope here; any immigration aspect goes to counsel or an RCIC.

---

## 5. Strategic investors and acquirers: public facts only (no implication of interest in Expat Ready)

| Company | Transaction | Date | Value (if published) | Source |
|---|---|---|---|---|
| Clio | Completed acquisition of vLex; Series G round | 10 Nov 2025 | US$1B (vLex); US$500M at a US$5B valuation | [S49] |
| Clio | Acquired Jurisage (Toronto; Canadian case-law data) | 10 Jun 2026 | Not disclosed (news excerpt only) | [S51] |
| Clio | Acquired Learned Hand (technology for courts) | 30 Sep 2026 | Not disclosed | [S50] |
| MyCase | Acquired **Docketwise** (immigration software) | 16 May 2022 | Not disclosed | [S52] |
| AffiniPay (LawPay) | Acquired MyCase; the group now trades as **8am** (LawPay, MyCase, CasePeer, DocketWise) | 9 Jun 2022 (rebrand 2025) | Not disclosed | [S53][S54] |
| Mitratech | Acquired **INSZoom** (immigration case management) | 10 Nov 2020 | Not disclosed | [S55] |
| Equifax | Agreed to acquire LawLogix (I-9 and immigration case management) | 21 Jul 2022 | Not disclosed | [S56] |
| Thomson Reuters | Completed acquisition of Casetext (CoCounsel) | 17 Aug 2023 | US$650M | [S57] |
| Thomson Reuters Ventures | Fund 2: targets Series A, with flexibility earlier; legal technology among its focus areas | Feb 2025 | US$150M fund | [S58] |
| Envoy Global | Acquisitions: Sesam (UAE), Smith Stone Walters (UK), IBN (Africa), Offer & Mastmann (Germany, via an affiliate) | Aug 2023 to Jul 2025 | Not disclosed | [S59] |
| Fragomen | Acquired SimpleCitizen; formed Fragomen Technologies | 23 Sep 2020 | Not disclosed | [S60] |
| Filevine | Equity financing | 23 Sep 2025 | US$400M | [S62] |
| Dye & Durham | Strategic review that "may include a sale" (29 Jul 2025). Shareholder rights plan citing an "ongoing sales process" (31 Mar 2026). No completed sale on its news page; FY2026 results 29 Sep 2026 | 2025–2026 | — | [S61] |
| Officio and other Canadian immigration-software vendors | No public transaction found; that does not prove there is none | — | — | — |

---

## 6. Canadian seed and early-stage VCs (every firm: fit unverified)

| Firm | URL | Stage (stated) | Cheque (stated) | Thesis words on own site | Source |
|---|---|---|---|---|---|
| Ripple Ventures (Toronto) | rippleventures.com | Inception: pre-incorporation, pre-product or pre-traction | **US$250k–$1M** | Vertical AI; AI plus services; Canadian and US start-ups | [S63] |
| Staircase Ventures | staircaseventures.com | Pre-seed and seed; product in market | **$1M–$2M** | B2B software; early product-market fit | [S64] |
| Round13 Capital (Toronto) | round13.com | Not stated | Not published | Vertical software; tech-enabled services | [S65] |
| Mistral Venture Partners | mistral.vc | Pre-seed, seed | Not published | Enterprise AI | [S66] |
| Good News Ventures (Toronto) | goodnewsventures.com | Pre-seed, seed | Not published | B2B and B2B2C; blockchain and AI | [S67] |
| Basecamp Venture Partners (Toronto) | basecampvp.com | Early stage | Not published | Early-stage software founders | [S75] |
| Panache Ventures | panache.vc | Pre-seed, seed | **Up to $1.5M** first cheque | All sectors | [S68] |
| Golden Ventures (Toronto) | golden.ventures | Pre-seed, seed, seed+ | **$500k–$3M** initial | Sector agnostic | [S69] |
| Brightspark Ventures | brightspark.com | Pre-seed to Series A (research pass) | Not published | Disruptive tech | [S70] |
| N49P | n49p.com | Pre-seed | Not published | Generalist | [S72] |
| StandUp Ventures | standupvc.com | Seed | Not published | Women-led (a woman in a C-level role with equitable ownership) | [S71] |
| BDC Capital Seed Venture Fund | bdc.ca | Seed | Not published | Listed focus areas include cloud and AI | [S20] |
| *Legal-tech specialists (not Canadian):* The LegalTech Fund; Thomson Reuters Ventures | legaltech.com; [S58] | Not stated; Series A | Not published | Legal technology | [S76][S58] |

Currency is often not stated on these pages.

---

## 7. Fundraising support and intermediaries

### 7.1 Registration position in Ontario (confirm with securities counsel)

- **The business trigger.** A person or firm "in the business" of trading securities must register as a dealer [S79]. Factors regulators weigh [S77]:
  - acting like a registrant
  - standing between buyer and seller
  - repetition or regularity
  - **being paid or expecting to be paid, "including whether the compensation is transaction or value based"**
  - soliciting investors, including by advertising
- **Finders.** Someone who solicits or contacts potential investors (a "finder") cannot use the exemption for trades made through a registered dealer, even if a dealer completes the sale [S77].
- **The company itself.** A start-up raising money for its own genuine business plan generally does not have to register [S77]. The 2026 consolidation adds that this can change if staff are paid mainly on the amount raised (research pass) [S78].
- **EMDs** may act only in the "exempt market", meaning sales under prospectus exemptions such as accredited investor or offering memorandum [S77].
- **Ontario-only exemptions.** Ontario Instruments 32-508 (not-for-profit angel groups) and 32-509 (early-stage businesses promoting their own raise) are extended to **25 Apr 2027** [S83].
  - A law-firm summary says 32-508 caps an angel group's deal-based pay at 5% [S84].
  - A law-firm summary describes 32-509's limits [S84]. The instrument text (PDF) was not read.
- **2012 OSC staff notice.** OSC Staff Notice 33-738, per a law-firm summary: finders paid broker-type compensation must register unless the OSC grants relief [S85].
- **How to check registration:**
  - CSA National Registration Search: https://info.securities-administrators.ca/nrsmobile/nrssearch.aspx. It blocked automated reading; the OSC's investor site links to it [S80][S81].
  - OSC "Check before you invest" [S82].
  - CIRO Advisor Report, for investment dealers [S80].
- **In plain words:** paying anyone a percentage, shares or warrants for finding investors is the risky arrangement, unless they are registered or clearly fit an exemption. A fixed fee for advice, where the adviser does not contact investors, carries less of this risk.

### 7.2 Support types: what each does and published fees

| Type | What it does | Published fee examples (provider pages only) | Registration angle |
|---|---|---|---|
| Fundraising adviser or consultant | Deck, financial model, investor targeting, coaching | **No Canadian firm with published fees found** | Lower risk if paid a fixed fee and not contacting investors [S77] |
| Finder or introducer | Introduces investors, usually for a success fee | Not published anywhere | Highest risk if unregistered and paid per deal [S77][S85] |
| Registered EMD or placement agent | Markets and places exempt offerings | Equivesto: **C$5,000 non-refundable + 7% cash success fee** (all investors); **C$2,500 + 1.5%** (private or accredited only); no equity taken as a fee [S91] | Registered dealer; check it in NRS |
| Start-up crowdfunding portal (NI 45-110) | Online raise up to **$1.5M per 12 months**; **$2,500** per investor ($10k with dealer advice) [S88] | Vested: not published [S93] | Portal cannot give advice [S88] |
| Fractional CFO | Model, data room, investor reporting | CFO Centre (Canada): not published [S95]. Pilot (US-only, price reference only): from **US$1,750/month** [S96]. See also R5 | Not a dealer, unless soliciting or paid on money raised |
| Investor-relations, cap-table and data-room software | Investor updates, data room, cap table | • Visible: free; Base **US$59/month** billed annually [S97].<br>• Papermark: data rooms **€99/month** annual [S98].<br>• Cake Equity: free up to 5 stakeholders; **$1,000/yr** [S99].<br>• Eqvista: free under 20 stakeholders [S100].<br>• Pulley: $1,200/yr, but its page says it is **shutting down on "12/8/26"** [S101].<br>• Carta and DocSend pages blocked | Not dealing in securities |

### 7.3 Candidate providers (not vetted, not contacted; no registration checked in NRS)

| Type | Firm | Credential stated on own site | Published fees |
|---|---|---|---|
| EMD | Equivesto Canada Inc. | "Registered as an Exempt Market Dealer" in all provinces and territories [S91] | See 7.2 |
| EMD | Eventus Capital Corp. | Registered EMD; PCMA member; provinces not stated [S92] | Not published |
| NI 45-110 portal | Vested | Relies on NI 45-110; not registered [S93] | Not published |
| EMD or portal | FrontFundr | Page unreadable (JavaScript only) [S94] | Unknown |
| Fractional CFO | The CFO Centre (Canada, Toronto office) | Its own claims only [S95] | Not published |
| Investor-relations software | Visible; Papermark; Cake Equity; Eqvista | — | See 7.2 |

**No candidates are listed for "fundraising consultant" or "finder".** No firm was found with credentials or fees published on its own site. That is a gap, not an endorsement of any route.

### 7.4 Red flags

1. **Success fee, commission or warrants to an unregistered person who contacts investors** [S77][S85]. The US regulator lists consequences such as rescission (investors can demand their money back) and future fundraising problems [S90]. That is US context only.
2. **"Guaranteed" funding or an upfront fee before money is delivered.** The Canadian Anti-Fraud Centre flags upfront fees for loans and fake "special access" to government funding [S89].
   - A disclosed, non-refundable due-diligence fee charged by a registered EMD is a different thing [S91].
3. **Pay-to-pitch platforms or angel events charging companies per deal** [S85]. Compare: Maple Leaf Angels and Keiretsu Forum charge nothing at application [S43][S47].
4. **Registration claimed but not found in NRS**, or terms and conditions on the registration [S80][S81].
5. **An intermediary who holds investor money.** Crowdfunding portals must hold funds in trust until the minimum is reached [S88].

### 7.5 Reference-check questions

My derivation, each tied to a source:
1. What is your registration category, and in which provinces? Any terms or conditions? (Check NRS) [S77][S81]
2. Will you contact investors yourself? If so, which registered dealer handles the trade? [S77]
3. How exactly are you paid: fixed fee, retainer, percentage, warrants or equity? What is refundable if nothing is raised? [S77]
4. Which prospectus exemption will the raise use? [S77][S87]
5. Who holds investor money, and when is it released? [S88]
6. What, if anything, do you guarantee in writing? [S89]
7. Can we speak to two or three companies from the last 24 months, including one whose raise did not close?
8. For angel groups: do you rely on Ontario Instrument 32-508, and what do you take per deal? [S83][S84]

---

## 8. What early-stage investors ask for

- **Pitch:**
  - **YC's seven questions** [S103]: what you do, market size (bottom-up), progress, unique insight, business model, team, the ask.
  - **BDC (venture capital):** know your financials, 3-, 6- and 12-month forecasts and key metrics; research each investor's focus; get legal and accounting help before pitching [S105].
  - **BDC (angels):** elevator pitch, deck, financial statements, **5-year projections**, prototype or demo [S106].
- **How much to raise:** enough to reach the next significant milestone, typically 12–18 months of runway. This comes from YC's 2016 guide, which also says not to over-invest in diligence documents at seed [S102].
- **Instruments:**
  - YC publishes a **Canadian SAFE** and advises consulting a local lawyer [S104].
  - NACO's common documents, as hosted by EBAN, include common-share, seed-preferred, convertible-loan and a **Canadian SAFE with a maturity date** [S108].
  - The CVCA publishes Canadian model venture documents (term sheet, share purchase, shareholder agreements) [S107].
- **Data room** (derived checklist):
  - articles and minute book
  - cap table and shareholder agreement
  - **signed IP assignments and moral-rights waivers from every employee and contractor**
  - development-vendor contracts
  - financial model
  - customer evidence (pilots, letters of intent)
  - privacy and security documents

  The IP point matters here. Under the Copyright Act, an employer owns work its employees make in the course of employment, but a contractor keeps copyright unless they assign it **in writing**. Moral rights can be waived but not assigned [S109]. With offshore developers, also confirm the developers' local law with counsel.
- **Ontario securities basics** (confirm with counsel):
  - **Accredited investor:** financial assets over $1M, net income over $200k ($300k with a spouse), or net assets of at least $5M [S87].
  - **Family, friends and business associates:** Ontario requires a signed risk form (45-106F12) [S87].
  - **Private issuer:** no more than 50 holders [S87].
  - **Offering memorandum:** heavy disclosure obligations [S87].
  - **Report of exempt distribution:** Form 45-106F1, filed on SEDAR+ with fees, **within 10 days** (30 days for NI 45-110) [S86].
- **Market context:** a news report of NACO's 2026 report says 2025 Canadian angel investment was about $114M across 490 deals, averaging about $232k, a five-year low [S110]. Check against NACO's own report before quoting.

---

## 9. Conditions under which each option fits or does not fit

- **SR&ED, OITC, IRAP projects.**
  - **Fit** if the company is a CCPC, has an Ontario permanent establishment, and has R&D done in Canada (OITC: in Ontario) by employees or Canadian contractors, with genuine technological uncertainty.
  - **Do not fit** for work done in India, or if non-residents control the company (SR&ED drops to 15% with no cash before profit).
- **Wage subsidies and Mitacs.**
  - **Fit** only with a Canadian employer and eligible Canadian students or graduates.
  - Mitacs also needs a research project with a university.
- **Futurpreneur, Starter Company Plus, NEXT Founders.**
  - **Fit** only if the founder (or a co-founder with more than 50% ownership, for Futurpreneur) meets the age, citizenship and residence tests.
- **BDC loans, CSBFP, CanExport.**
  - **Do not fit** before revenue. BDC's start-up loan becomes possible about 12 months after revenue starts.
- **DMZ and LIZ incubators.**
  - **Fit** once there is an MVP with users (LIZ, DMZ Pre-Incubator) or MRR (DMZ Incubator).
  - DMZ also needs an in-house technical lead, which may fail if development stays outsourced.
  - Being in a campus incubator also suits OCI Ready 4 Market.
- **Y Combinator, Techstars, Antler.**
  - **Fit** if the founders want venture-scale growth with dilution (baseline A-09) and can relocate or attend in person.
  - The YC Winter 2027 deadline is 2 Nov 2026.
- **Angel groups and pre-seed VCs.**
  - **Fit** if the ambition is venture scale and there is evidence beyond the website: pilots, letters of intent or early revenue.
  - Vertical-software or B2B theses: Ripple, Staircase (product in market), Round13. Many others are generalists.
- **Strategic acquirers.**
  - Relevant as context for exit value and competition.
  - Not a funding route before traction; none has shown interest.
- **A paid intermediary.**
  - **Lowest risk** is a registered EMD with published fees, or a fixed-fee adviser who does not contact investors.
  - **Highest risk** is an unregistered finder on a success fee.
  - Fits only after QA-2 (money) and QA-3 (company facts) are answered and counsel has reviewed the agreement.

---

## 10. Gaps, failed pages, and who confirms what

- **Failed or blocked pages:**
  - **Blocked or failed:** nrc.canada.ca (403, read through Internet Archive copies dated Sep 2026 instead); lso.ca (403); communitech.ca (403); the CSA NRS tool (403); carta.com and docsend.com pricing (403); frontfundr.com (JavaScript only); angelinvestors.ca (connection refused); womensequitylab.com (domain not found).
  - **PDF not read:** the 32-509 instrument.
  - **Not re-verified:** CanExport (single read).
- **Text addressed to AI agents (ignored; no action taken):**
  - ycombinator.com/documents carried text telling agents they could draft and send SAFEs.
  - rippleventures.com/llms.txt carried directions to agents.
- **Not found:** Ontario Network of Entrepreneurs and Regional Innovation Centre pages (404); any Canadian fractional-CFO firm publishing prices; any finder or consultant publishing fees.
- **Accountant:** CCPC status; where the work is done and how the India team is engaged; SR&ED pre-claim approval; OITC; whether the digital media credit is excluded.
- **Securities counsel:** any intermediary agreement; which exemption to use; whether 32-509 applies; Form 45-106F1 fees.
- **Counsel or RCIC:** whether the LSO sandbox applies; any Start-up Visa matters (out of scope).
- **Ranjan:** QA-2 (money) and QA-3 (company, ownership, team engagement, ambition).

---

## Sources

Read column: **✓✓** = read twice, including my own re-fetch; **✓** = read once by a research pass; **E** = search excerpt or secondary copy only; **✗** = failed. All sources checked 7 Oct 2026.

| ID | Organisation and page title | URL | Date on page | Read | Checked |
|---|---|---|---|---|---|
| S1 | CRA, SR&ED news and updates | canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-updates.html | Modified 2026-05-25 | ✓✓ | 7 Oct 2026 |
| S2 | CRA, Get an investment tax credit (ITC) | …/sred-claim/investment-tax-credit.html | 2026-04-01 | ✓✓ | 7 Oct 2026 |
| S3 | Finance Canada, Tax measures: Supplementary information, Budget 2025 | budget.canada.ca/2025/report-rapport/tm-mf-en.html | 2025-11-04 | ✓✓ | 7 Oct 2026 |
| S4 | CRA, SR&ED Salary or Wages Policy | …/salary-wages-policy.html | 2025-01-28 | ✓✓ | 7 Oct 2026 |
| S5 | CRA, Contract Expenditures for SR&ED Performed on Behalf of a Claimant Policy | …/contract-expenditures-performed-on-behalf-a-claimant-policy.html | 2022-03-30 | ✓✓ | 7 Oct 2026 |
| S6 | CRA, Guidelines on the eligibility of work for SR&ED tax incentives | …/sred-policies-guidelines/guidelines-eligibility-work-sred-tax-incentives.html | Document 13 Aug 2021; modified 2022-07-05 | ✓✓ | 7 Oct 2026 |
| S7 | CRA, How to apply for pre-claim approval | …/apply-pre-claim-approval.html | 2026-04-01 | ✓✓ | 7 Oct 2026 |
| S8 | CRA, SR&ED Filing Requirements Policy | …/filing-requirements-policy.html | 2025-01-28 | ✓ | 7 Oct 2026 |
| S9 | CRA, Type of corporation | canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/type-corporation.html | 2026-09-11 | ✓ | 7 Oct 2026 |
| S10 | NRC, Financial support for technology innovation | nrc.canada.ca/en/support-technology-innovation/financial-support-technology-innovation (live 403; read from Internet Archive capture of 8 Sep 2026) | 2026-01-08 | ✓✓ | 7 Oct 2026 |
| S10b | NRC, Evaluation of the NRC's Industrial Research Assistance Program | nrc.canada.ca/en/corporate/planning-reporting/evaluation-nrcs-industrial-research-assistance-program | Not read | E | 7 Oct 2026 |
| S11 | NRC, Support for technology innovation (IRAP hub) | nrc.canada.ca/en/support-technology-innovation (archive capture 2 Sep 2026) | 2025-12-22 | ✓ | 7 Oct 2026 |
| S12 | NRC, NRC IRAP funding to hire young graduates | nrc.canada.ca/en/support-technology-innovation/nrc-irap-funding-hire-young-graduates (archive capture 2 Sep 2026) | 2025-06-19 | ✓✓ | 7 Oct 2026 |
| S13 | Ontario, Ontario innovation tax credit | ontario.ca/page/ontario-innovation-tax-credit | Updated 27 Nov 2024 | ✓✓ | 7 Oct 2026 |
| S14 | Ontario Centre of Innovation, Ready 4 Market fund | oc-innovation.ca/programs/ready-4-market/ | Modified 2026-05-08 (metadata) | ✓✓ | 7 Oct 2026 |
| S15 | Ontario Creates, OIDMTC | ontariocreates.ca/tax-incentives/oidmtc | "As of November 2021" | ✓ | 7 Oct 2026 |
| S16 | Ontario, Starter Company Plus | ontario.ca/page/starter-company-plus | Updated 23 Sep 2026 | ✓ | 7 Oct 2026 |
| S17 | Trade Commissioner Service, CanExport SMEs; Find out if you qualify | tradecommissioner.gc.ca/en/our-solutions/funding-financing-international-business/canexport-smes.html | 2026-02-09 | ✓ (my re-fetch failed) | 7 Oct 2026 |
| S18 | BDC, Start-up Financing And Start-up Loans | bdc.ca/en/financing/starting-business-loan | None | ✓✓ | 7 Oct 2026 |
| S19 | BDC, Loan for Tech Companies | bdc.ca/en/financing/technology-companies-loan | None | ✓ | 7 Oct 2026 |
| S20 | BDC Capital, Our Funds; Seed Venture Fund; Thrive Venture Fund | bdc.ca/en/bdc-capital/venture-capital/funds (and /seed-fund, /thrive-platform/thrive-venture-fund) | None (latest item 30 Oct 2023) | ✓ | 7 Oct 2026 |
| S21 | BDC, Growth & Transition Capital financing offer | bdc.ca/en/bdc-capital/growth-transition-capital/financing-offer | None | ✓ | 7 Oct 2026 |
| S22 | Futurpreneur, Eligibility; Core Startup Program | futurpreneur.ca/en/eligibility/ ; futurpreneur.ca/en/offering/core-startup/ | © 2026 | ✓✓ | 7 Oct 2026 |
| S23 | ISED, Helping small businesses get loans (CSBFP); CSBFP Guidelines | ised-isde.canada.ca/site/canada-small-business-financing-program/en/find-loan-your-small-business/helping-small-businesses-get-loans | 2026-06-22; guidelines Apr 2024 | ✓✓ | 7 Oct 2026 |
| S24 | Mitacs, Accelerate; Business Strategy Internship | mitacs.ca/our-programs/accelerate/ ; …/business-strategy-internship/ | Modified 2026-10-06 (metadata) | ✓✓ | 7 Oct 2026 |
| S25 | ESDC, Find wage subsidies to hire post-secondary students; TECHNATION Career Ready; Magnet SWPP | canada.ca/en/employment-social-development/services/student-work-placements-wage-subsidies.html ; technationcanada.ca/en/future-workforce-development/career-ready-program/ ; swpprogram.ca | 2026-04-01 | ✓ | 7 Oct 2026 |
| S26 | ESDC, Canada Summer Jobs: who can apply; about | canada.ca/en/employment-social-development/services/funding/canada-summer-jobs/applicant-guide/who-can-apply.html | 2026-08-21 | ✓ | 7 Oct 2026 |
| S27 | TMU, Incubate: Legal Innovation Zone | torontomu.ca/zone-learning/legal-innovation-zone/apply/incubate/ | None | ✓✓ | 7 Oct 2026 |
| S28 | Law Society of Ontario, Access to Innovation | lso.ca/about-lso/initiatives/access-to-innovation | 403 | E/✗ | 7 Oct 2026 |
| S29 | Law Foundation of Ontario, Apply | lawfoundation.on.ca/apply/ | Items to 15 Sep 2026 | ✓ | 7 Oct 2026 |
| S30 | Y Combinator, The Y Combinator Standard Deal | ycombinator.com/deal | None | ✓✓ | 7 Oct 2026 |
| S31 | Y Combinator, Apply to YC | ycombinator.com/apply | None | ✓✓ | 7 Oct 2026 |
| S32 | Techstars, New York City Accelerator (FAQ) | techstars.com/accelerators/nyc | None | ✓✓ | 7 Oct 2026 |
| S33 | DMZ, DMZ Startup Incubator | dmz.torontomu.ca/incubator | None | ✓✓ | 7 Oct 2026 |
| S34 | DMZ, Pre-Incubator | dmz.torontomu.ca/pre-incubator | None | ✓✓ | 7 Oct 2026 |
| S35 | Creative Destruction Lab, Frequently Asked Questions | creativedestructionlab.com/faq/ | 2023-03-27 (metadata) | ✓✓ | 7 Oct 2026 |
| S36 | MaRS, Startup Support and Growth at MaRS | marsdd.com/startups/ | None | ✓ | 7 Oct 2026 |
| S37 | Founder Institute, FAQ | fi.co/faq ; fi.co/s/toronto | None | ✓✓ | 7 Oct 2026 |
| S38 | NEXT Canada, NEXT Founders; NEXT AI | nextcanada.com/next-founders/ ; nextcanada.com/next-ai/ | None | ✓ | 7 Oct 2026 |
| S39 | Velocity, How we help; Apply | velocityincubator.com/how-we-help | None | ✓ | 7 Oct 2026 |
| S40 | Antler, Antler Canada; blog "Antler Canada announces new investment terms" | antler.co/location/canada ; antler.co/blog/antler-canada-announces-new-investment-terms | Blog 8 Jan 2025 | ✓✓ | 7 Oct 2026 |
| S41 | Communitech, programmes | communitech.ca/programs/ | 403 | ✗ | 7 Oct 2026 |
| S42 | NACO, homepage; Membership | nacocanada.com | None | ✓ | 7 Oct 2026 |
| S43 | Maple Leaf Angels, Entrepreneurs | mapleleafangels.com/entrepreneurs/ | None | ✓✓ | 7 Oct 2026 |
| S44 | GTAN, homepage | gtan.ca | None | ✓ | 7 Oct 2026 |
| S45 | Angel One Investor Network, Entrepreneurs | angelonenetwork.ca/entrepreneurs | None | ✓ | 7 Oct 2026 |
| S46 | York Angel Investors, Entrepreneurs; FAQ; Startup Visa | yorkangels.com/entrepreneurs | None | ✓ | 7 Oct 2026 |
| S47 | Keiretsu Forum, FAQ; Keiretsu Forum Canada funding process | keiretsuforum.com/faq/ ; keiretsuforum.ca/entrepreneurs/funding-process | None | ✓✓ | 7 Oct 2026 |
| S48 | Capital Angel Network | capitalangels.ca | None | ✓ | 7 Oct 2026 |
| S49 | JMI Equity (repost of Clio release), Clio Completes Landmark $1B vLex Acquisition… | jmi.com/clio-completes-landmark-1b-vlex-acquisition-and-announces-500m-series-g-funding-round-at-5b-valuation/ | 10 Nov 2025 | ✓✓ | 7 Oct 2026 |
| S50 | Clio via CNW, Clio Acquires Learned Hand | newswire.ca/news-releases/clio-acquires-learned-hand-860724194.html | 30 Sep 2026 | ✓✓ | 7 Oct 2026 |
| S51 | Clio, Clio Acquires Jurisage… (clio.com 403; BetaKit excerpt) | clio.com/about/press/jurisage-clio-canadian-legal-ai | 10 Jun 2026 | E | 7 Oct 2026 |
| S52 | MyCase, MyCase Announces Acquisition of Docketwise | mycase.com/news/mycase-announces-acquisition-of-docketwise/ | 16 May 2022 | ✓✓ | 7 Oct 2026 |
| S53 | MyCase, AffiniPay… Acquires MyCase from Apax Funds | mycase.com/news/affinipay-parent-company-of-lawpay-announces-mycase-acquisition/ | 9 Jun 2022 | ✓ | 7 Oct 2026 |
| S54 | 8am, Press Releases | 8am.com/press-releases/ | Latest 23 Sep 2026 | ✓ | 7 Oct 2026 |
| S55 | Mitratech, Mitratech Acquires… INSZoom | mitratech.com/resource-hub/pressreleases/mitratech-acquires-inszoom/ | 10 Nov 2020 | ✓✓ | 7 Oct 2026 |
| S56 | Equifax, Equifax to Acquire LawLogix | investor.equifax.com/news-events/press-releases/detail/1242/equifax-to-acquire-lawlogix | 21 Jul 2022 | ✓ | 7 Oct 2026 |
| S57 | Thomson Reuters, Thomson Reuters completes acquisition of Casetext, Inc. | thomsonreuters.com/en/press-releases/2023/august/thomson-reuters-completes-acquisition-of-casetext-inc | 17 Aug 2023 | ✓ | 7 Oct 2026 |
| S58 | Thomson Reuters, Announces New $150M Corporate Venture Capital Fund | thomsonreuters.com/en/press-releases/2025/february/thomson-reuters-announces-new-150-million-dollar-corporate-venture-capital-fund | Feb 2025 | ✓✓ | 7 Oct 2026 |
| S59 | Envoy Global, press releases (Sesam; Smith Stone Walters; IBN; Offer & Mastmann) | envoyglobal.com/press-release/… | 3 Aug 2023; 12 Nov 2024; 12 Feb 2025; 1 Jul 2025 | ✓ | 7 Oct 2026 |
| S60 | Fragomen via CNW, …acquisition of SimpleCitizen | newswire.ca/news-releases/global-immigration-leader-fragomen-enriches-technology-offerings-through-acquisition-of-simplecitizen-864708974.html | 23 Sep 2020 | ✓ | 7 Oct 2026 |
| S61 | Dye & Durham, strategic review; rights plan; FY2026 results; interim CEO | dyedurham.com/dye-durham-initiates-review-of-strategic-alternatives/ ; …/dye-durham-announces-adoption-of-shareholder-rights-plan-to-protect-the-integrity-of-the-ongoing-sales-process/ ; dyedurham.com/category/news | 29 Jul 2025; 31 Mar 2026; 29 Sep 2026 | ✓✓ (rights plan) | 7 Oct 2026 |
| S62 | Filevine, Filevine raises $400M… | filevine.com/news/filevine-raises-400m-with-insight-accel-and-halo-fund-to-scale-legal-intelligence/ | 23 Sep 2025 | ✓ | 7 Oct 2026 |
| S63 | Ripple Ventures | rippleventures.com | None | ✓✓ | 7 Oct 2026 |
| S64 | Staircase Ventures, Founder Focused Growth | staircaseventures.com | 2026-04-13 (metadata) | ✓✓ | 7 Oct 2026 |
| S65 | Round13 Capital, Home | round13.com | 2026-03-17 (metadata) | ✓✓ | 7 Oct 2026 |
| S66 | Mistral Venture Partners | mistral.vc | None | ✓ | 7 Oct 2026 |
| S67 | Good News Ventures | goodnewsventures.com | None | ✓✓ | 7 Oct 2026 |
| S68 | Panache Ventures | panache.vc | None | ✓✓ | 7 Oct 2026 |
| S69 | Golden Ventures | golden.ventures | None | ✓✓ | 7 Oct 2026 |
| S70 | Brightspark Ventures | brightspark.com | None | ✓✓ | 7 Oct 2026 |
| S71 | StandUp Ventures | standupvc.com | None | ✓✓ | 7 Oct 2026 |
| S72 | N49P, Powering Canada's Top Founders | n49p.com | None | ✓ | 7 Oct 2026 |
| S75 | Basecamp Venture Partners | basecampvp.com | None | ✓ | 7 Oct 2026 |
| S76 | The LegalTech Fund | legaltech.com | None | ✓ | 7 Oct 2026 |
| S77 | OSC, Unofficial Consolidation: Companion Policy 31-103CP (s.1.3 business trigger; s.7.1 EMD; s.8.5 finders) | osc.ca/en/securities-law/instruments-rules-policies/3/31-103/unofficial-consolidation-companion-policy-31-103cp-registration-requirements-exemptions-and-1 | Consolidation current to 2022-06-06 | ✓✓ | 7 Oct 2026 |
| S78 | ASC-hosted 31-103CP consolidation, effective 1 Jan 2026 | asc.ca/-/media/ASC-Documents-part-1/Regulatory-Instruments/2026/01/6258977v1-31-103-CP-Consolidation-Eff-January-1-2026.pdf | 1 Jan 2026 | ✓ | 7 Oct 2026 |
| S79 | OSC, Getting registered | osc.ca/en/industry/registration-and-compliance/getting-registered | None | ✓ | 7 Oct 2026 |
| S80 | OSC GetSmarterAboutMoney, How registration protects investors | getsmarteraboutmoney.ca/learning-path/checking-registration/how-registration-protects-investors/ | Modified 2025-05-29 | ✓✓ | 7 Oct 2026 |
| S81 | CSA, National Registration Search | info.securities-administrators.ca/nrsmobile/nrssearch.aspx | 403 to automated access | ✗ | 7 Oct 2026 |
| S82 | OSC, Check before you invest | osc.ca/en/investors/check-before-you-invest | None | ✓ | 7 Oct 2026 |
| S83 | OSC, Notice of Commission Approval of OSC Rules 32-510 and 32-511 (extensions to 32-508 and 32-509) | osc.ca/en/securities-law/instruments-rules-policies/3/32-510/notice-commission-approval-osc-rule-32-510-extension-ontario-instrument-32-508-not-profit-angel | Rules in force 25 Oct 2025 | ✓ | 7 Oct 2026 |
| S84 | Blakes (law firm), OSC Introduces Initiatives to Support Capital Raising for Early Stage Businesses in Ontario | blakes.com/insights/OSC-Introduces-Initiatives-to-Support-Capital-Raising-for-Early-Stage-Businesses-in-Ontario | 20 Jun 2024 | E (secondary) | 7 Oct 2026 |
| S85 | Dentons via Mondaq, OSC Staff Provides Guidance For Angel Groups & Internet Funding Platforms (on Staff Notice 33-738) | webiis08.mondaq.com/canada/securities/212206/ | 24 Dec 2012 | E (secondary) | 7 Oct 2026 |
| S86 | OSC, Form 45-106F1: Report of Exempt Distribution | osc.ca/en/industry/companies/reporting-issuer-and-issuer-forms/form-45-106f1-report-exempt-distribution | None | ✓ | 7 Oct 2026 |
| S87 | BCSC-hosted NI 45-106 unofficial consolidation | bcsc.bc.ca/-/media/PWS/New-Resources/Securities-Law/Instruments-and-Policies/Policy-4/45106-NI-September-19-2025.pdf | 19 Sep 2025 | ✓ | 7 Oct 2026 |
| S88 | BCSC, NI 45-110 Start-up Crowdfunding Registration and Prospectus Exemptions | bcsc.bc.ca/securities-law/law-and-policy/instruments-and-policies/4-distribution-requirements/current/45-110 | In force 21 Sep 2021 | ✓ | 7 Oct 2026 |
| S89 | Canadian Anti-Fraud Centre, Grant and loan | antifraudcentre-centreantifraude.ca/scams-fraudes/loan-pret-eng.htm | Modified 16 Jan 2026 | ✓ | 7 Oct 2026 |
| S90 | US SEC, Broker-Dealers (Capital Raising Building Blocks), context only | sec.gov/resources-small-businesses/capital-raising-building-blocks/broker-dealers | Reviewed 24 Apr 2026 | ✓ | 7 Oct 2026 |
| S91 | Equivesto, Pricing | equivesto.com/pricing | None | ✓✓ | 7 Oct 2026 |
| S92 | Eventus Capital Corp. | eventuscapital.com | None | ✓ | 7 Oct 2026 |
| S93 | Vested | vested.ca | None | ✓ | 7 Oct 2026 |
| S94 | FrontFundr | frontfundr.com | JavaScript only | ✗ | 7 Oct 2026 |
| S95 | The CFO Centre (Canada) | cfocentre.com/en-ca/ | None | ✓ | 7 Oct 2026 |
| S96 | Pilot, Pricing (US-only) | pilot.com/pricing | None | ✓ | 7 Oct 2026 |
| S97 | Visible, Founder Pricing | visible.vc/pricing/ | None | ✓✓ | 7 Oct 2026 |
| S98 | Papermark, Pricing | papermark.com/pricing | None | ✓ | 7 Oct 2026 |
| S99 | Cake Equity, Pricing | cakeequity.com/pricing | None | ✓ | 7 Oct 2026 |
| S100 | Eqvista, Pricing | eqvista.com/pricing/ | None | ✓ | 7 Oct 2026 |
| S101 | Pulley, Pricing (shutdown banner) | pulley.com/pricing | None | ✓✓ | 7 Oct 2026 |
| S102 | Y Combinator, A Guide to Seed Fundraising | ycombinator.com/blog/how-to-raise-a-seed-round/ | 7 Jan 2016 | ✓ | 7 Oct 2026 |
| S103 | Y Combinator, How to Pitch Your Company | ycombinator.com/blog/how-to-pitch-your-company/ | 19 Jul 2016 | ✓ | 7 Oct 2026 |
| S104 | Y Combinator, Documents (SAFE, including the Canada version) | ycombinator.com/documents | None (contains agent-directed text, ignored) | ✓ | 7 Oct 2026 |
| S105 | BDC, How to pitch your business to venture capital investors | bdc.ca/en/articles-tools/start-buy-business/start-business/how-pitch-your-business-venture-capital-investors | None | ✓ | 7 Oct 2026 |
| S106 | BDC, Angel investors: how to find them | bdc.ca/en/articles-tools/start-buy-business/start-business/angel-investors-how-find-them | None | ✓ | 7 Oct 2026 |
| S107 | CVCA, Model Legal Documents | cvca.ca/resources/model-legal-documents/ | Term sheet page 21 May 2024 | ✓ | 7 Oct 2026 |
| S108 | EBAN-hosted NACO Term Sheets (not NACO's own site) | eban.org/knowledge-center/naco-common-docs-project-term-sheets/ | None | E | 7 Oct 2026 |
| S109 | Justice Laws, Copyright Act ss.13–14.1 | laws-lois.justice.gc.ca/eng/acts/c-42/page-3.html | Current to 21 Sep 2026 | ✓ | 7 Oct 2026 |
| S110 | BetaKit (news) on NACO's 2026 Report on Angel Investing in Canada | betakit.com/canadian-angel-investment-falls-to-five-year-low-but-women-investors-gain-ground/ | 21 May 2026 | E (secondary) | 7 Oct 2026 |
