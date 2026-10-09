> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Artifact 1 — Market and revenue strategy

**Version 0.2, 7 Oct 2026. Status: conditional draft for Codex recheck.** Not approved, not published. Numbers sit in generated blocks from the workbook (refresh with `tools/refresh_reports.py`).
**Writer:** Claude. **Decision owner:** Ranjan.
- Decisions marked **(on your behalf)** use the delegation of 7 Oct (RAN-13, RAN-14). They are overturnable.
- External actions (contacting anyone, changing the website, spending) still need Ranjan's explicit yes.

**Facts** are cited by baseline ID (`00-evidence-baseline.md`). **Numbers** come from the workbook (`04-execution-team-financial-workbook.xlsx`, Summary sheet).
**Gates:** CP-G0 to CP-G4 (`company-planning/WORKFLOW.md` §5). Timing tags: P = CP-G0, C/F = CP-G1, L = CP-G2–G3, R = CP-G4.

## 1. Decisions

| ID | Decision | Rationale and evidence | Owner | Timing / trigger | Cost | Success measure |
|---|---|---|---|---|---|---|
| D-M1 | **First buyers:**<br>• owner-led RCIC practices of 1–5 people in Ontario, BC and Alberta, English-first;<br>• first among them, practices under 5 years old and small practices still running on generic tools.<br>Lawyers come at CP-G3; Quebec when French staff screens exist; LMIA-heavy firms are served but not targeted first | **Why:**<br>• FD-19 (DEC-2).<br>• 83% of RCICs are in ON/BC/AB (MKT-2).<br>• 54% of RCICs have practised under 5 years (MKT-2). This is a segmentation hypothesis about people; it says nothing about practice age or willingness to buy.<br>• The lawyer population is small and tool-saturated (MKT-4, R2 §2: rivals sponsor CILA).<br>**Against:**<br>• New practices are price-sensitive and growth has stopped (MKT-1).<br>• No count of firms by size exists (MKT-3).<br>Interviews must confirm | Founder-consultant | Now (P); re-test at 20 interviews | CAD 0 | 20 discovery interviews by 15 Dec; at least 60% confirm one of the top-3 pains (§3) |
| D-M2 | **Positioning (to test, not publish yet):** "Run your whole immigration practice in one place — enquiry, assessment, retainer, billing and trust, case preparation and the client portal — on Canadian rules kept current by licensed practitioners, with every step recorded for the College." | Rivals publish portals, forms and trust (CMP-2). What looks uncommon is deterministic, practitioner-written rules with replayable audit, plus responsive support (CMP-2). New College regulations add compliance duties (MKT-7) | Founder-consultant | Test in interviews from Oct (C); publish at CP-G3 | — | At least 4 of 6 prototype sessions rate "explained, auditable assessment" as a reason to switch |
| D-M3 | **Correct the website now:**<br>• remove the "$482" baseline, the comparison table and every unproven claim (K-10, K-11);<br>• publish only claims in the register (§5).<br>**Needs your authorisation**: it is a public change | CMP-3; R3: Competition Act s.74.01 needs dated evidence for performance claims (LEG-3). Risk exists today, and referrals would multiply it | Ranjan authorises; website owner edits | Within 2 weeks of authorisation | Included in website budget (Artifact 4) | Claims register 100% "verified" or labelled "coming"; evidence file per claim |
| D-P1 | **Price per firm by practice size, with included users.** Extra users are bought per user. Cases and client-portal users are unlimited. **This changes the unit in ratified FD-18** (per-seat), but keeps its tiers by firm size and buy-up. Your 7 Oct statement delegates this; please confirm | Most Canadian rivals price per firm; "unlimited users" is a rival attack line against per-seat pricing; IMMeFile is free with CAPIC (CMP-1, MKT-5). Solo buyers compare monthly totals | Claude (on your behalf) | Now | — | Price objection rate in proposals under 30% |
| D-P2 | **Plans:**<br>• **Solo:** 1 practitioner + 1 assistant.<br>• **Practice:** up to 4 users.<br>• **Firm:** up to 10 users.<br>• **Enterprise:** custom.<br>Every plan includes the full core journey (FD-19: "Solo must be complete"). Employer/LMIA cases are in every plan with a limit on active employer cases (SA-03 v2.12). Practice adds team review and assignment, and reports. Firm adds advanced permissions, priority support and a guided onboarding package | DEC-1, DEC-2, DEC-6 | Claude (on your behalf) | Now; package details reviewed with the product owner against Release 1 scope | — | Plan mix within ±15 points of the assumption by month 3 of launch |
| D-P3 | **List prices (CAD per firm per month, monthly billing):**<br>• Solo **89**<br>• Practice **229**<br>• Firm **549**<br>• Extra user **49**<br>• Enterprise custom | **Market comparison (CMP-1):**<br>• Officio: 69 / 99 / 129.<br>• CaseEasy: 99 + 69 per user.<br>• Visto: 199 / 449 / 999, with caps.<br>• Low-cost tools: 29–49.<br>**Positioning:** above the low-cost tools and at or near Officio/CaseEasy/Visto, not at the website's 199 per seat (597 for 3 users).<br>**Model:** the effect of a 30% higher price, with and without a conversion penalty, is in the A4 sensitivity table (generated). Willingness to pay is unknown (HYP-3) | Claude (on your behalf) | Now; review at 20 interviews and after the founding offer | — | Founding conversion at least 20% of qualified conversations; no more than 1 in 3 lost on price |
| D-P4 | **Annual prepayment: two months free** (about 17%) | Officio gives 12 months for 10 (R1). Brings cash forward (deferred revenue in the model) | Claude (on your behalf) | Now | Discount cost is in the model | Annual share at least 50% of standard firms |
| D-P5 | **Founding-firm programme:**<br>• first **50 firms**;<br>• **30% off list for 24 months**;<br>• free assisted import of client records (existing cases and documents cannot be imported at launch, GAP-17);<br>• refundable **CAD 200 deposit**, credited to the first invoice and refunded in full if not live by **30 Jun 2027**;<br>• a founding-firm council gives input, with no feature promises;<br>• no obligation to refer.<br>Terms reviewed by counsel before use | Tests willingness to pay before launch (HYP-3). Gives investors evidence (Artifact 3). Scarcity matches onboarding capacity. Refund protects against launch slip (K-1) | Founder-consultant offers; counsel reviews | Offer from CP-G1, after counsel and website fixes (target mid-Nov) | Discount and deposit handling in the model | At least 10 deposits by 31 Jan 2027 (base model: 12 by launch) |
| D-P6 | **Migration:**<br>• at launch, firms import **client records only** (CSV templates, free); existing cases and documents are a later product feature (product decisions GAP-17);<br>• assisted import of client records free on annual plans; CAD 499 on monthly plans (input OFFER.MIG_FEE; only monthly-billed standard firms are charged in the model) | Rivals advertise migration (R1; advertised, not tested). Our launch scope is narrower, so the claim must be too. A fee on monthly plans protects onboarding capacity | Claude (on your behalf) | From CP-G2 | Onboarding capacity (Artifact 4) | Median client-record import under 14 days in pilots |
| D-P7 | **Trial:**<br>• no self-serve trial until CP-G3 and a sandbox with sample data exist;<br>• then a 14-day trial with no card.<br>Before that: a guided demo and the founding offer | Market norm (R1: Immicase, ImmCase, CaseEasy, RCIC App). DEC-8 (assisted set-up) | Claude (on your behalf) | CP-G3 | Product work (sandbox) | Trial-to-paid at least 25% (assumption to measure) |
| D-P8 | **Billing rules:**<br>• monthly plans can cancel any time, effective at the end of the period;<br>• annual plans get a 30-day money-back on the first term only, then no refunds except where the law requires;<br>• data export available for 30 days after cancellation.<br>Replaces the conflicting website and terms wording (K-10). Counsel confirms | OBS-1 vs OBS-4 conflict; 90-day deletion window in SA-03 SA3-E1b | Claude (on your behalf); counsel | Before the first paid invoice (CP-G2) | Legal budget | No refund disputes unresolved after 30 days |
| D-P9 | **No platform fee on client payments at launch.** Revisit after 12 months with counsel (trust-money rules) | FD log C-4 default ("no application fee at launch (revisit)"). RCIC App charges 1% (R1) | Claude (on your behalf) | Revisit Mar 2028 | Revenue forgone (not modelled) | — |
| D-C1 | **Channels, in order:**<br>1. founder network and peer relationships;<br>2. CAPIC community presence as a member (no promotion without permission);<br>3. a practice-management course through the CICC CPD route, if a vendor can qualify;<br>4. the peer referral programme after 10 happy customers;<br>5. new-licensee partnerships;<br>6. lawyers' bar sections (CP-G3);<br>7. paid search (CP-G4 only) | R2 ranking (CPD route scores 54/81; NCIC 36; CAPIC 27); CMP-4; LEG-1 and LEG-2 | Founder-consultant | §6 experiments | Artifact 4 budgets | §6 measures |
| D-M4 | **Deliberately deferred:**<br>• firms outside Canada (FD-22);<br>• enterprise single sign-on;<br>• resellers;<br>• paid advertising before CP-G4;<br>• AI features (FD-16; charter);<br>• payments revenue;<br>• Quebec French staff screens;<br>• large launch campaigns before CP-G3 | Focus and cash (Artifact 4) | Ranjan | Revisit at CP-G4 | — | — |

## 2. Segments compared

| Segment | Size evidence | Pain (hypothesis) | Willingness to pay | Access | Verdict |
|---|---|---|---|---|---|
| Solo RCIC, under 5 years | 54% of 11,994 RCICs (MKT-2); 470 new a year (MKT-1) | Setting up compliant systems; winning clients | Low to medium; IMMeFile is free with CAPIC (MKT-5) | Founder network, CAPIC, education providers | **Primary**, with the Solo plan |
| Small RCIC practice (2–5) | Not published (MKT-3) | Coordination, follow-up, trust records, client chasing | Medium | Founder network, referrals | **Primary**, with the Practice plan |
| Larger RCIC firm (6–10+) | Not published | Reporting, permissions, multi-office | Higher, but procurement is slower | Referrals, events | Secondary (Firm plan) |
| Immigration lawyers | 68 certified specialists in Ontario; CILA about 500; CBA 750+ (MKT-4) | Trust accounting; Clio already common | Medium to high | OBA/CBA; competitors are entrenched | Later (CP-G3) |
| Refugee/tribunal-heavy practices | RCIC-IRB 2,076 and rising (MKT-1) | Hearing preparation and deadlines | Unknown | — | Watch; the product does not target tribunal workflows in Release 1 |
| Quebec practices | 1,097 RCICs; 748 prefer French (MKT-2) | French staff screens; Quebec programmes | Unknown | AQAADI, UdeM | Later (French staff console is R1.1; Quebec programmes out, DEC-5) |
| Firms outside Canada | 261 (MKT-2) | — | — | — | Deferred |

**Disqualifiers:**
- unlicensed representatives (the product never serves unauthorised representation);
- practices that want AI-written applications;
- firms whose case mix is mostly programmes without Release 1 depth, until the content roadmap reaches them.

## 3. Customer problem: what is known and what interviews must show

- **Known:**
  - firms already buy practice software: 18 products and many customers claimed, for example CaseEasy "500+ firms" (CMP-1);
  - compliance duties increased on 15 Jul 2026 (MKT-7);
  - demand is shifting to in-Canada files (MKT-7).
- **Claimed but unverified:** "patchwork" tools, lost leads and re-keying (HIST-6).
- **Three pains to test** (HYP-1, HYP-2):
  1. Time lost re-typing client data between intake, assessment, forms and invoices.
  2. Anxiety about College record-keeping, retainers and client-account rules, especially after July 2026.
  3. Enquiries lost through slow follow-up.
- **Switching evidence to collect:**
  - current tools and monthly spend;
  - the last switch and why;
  - what would make them move mid-case;
  - who decides.

## 4. Competitive alternatives (detail in R1)

Advertised prices and features from vendor pages (checked 7 Oct 2026; three pages were not independently re-retrievable in Codex's review). Not proof of delivered parity. Before prescribing a final price, compare like for like: seats, billing term, currency, limits and included services.

| Alternative | Why firms choose it (published) | Our honest answer | Where we are weaker |
|---|---|---|---|
| Officio | 400+ forms, long track record, CAD 69–129 per firm | One system from enquiry to filed case, with explained assessments and a compliance-grade audit trail | Form breadth: Release 1 automates Express Entry and two provincial streams in depth (roadmap R-01). Price |
| Visto, VisaFlo | AI features; portal auto-fill; lawyer-designed | Deterministic, explainable rules; no AI deciding (FD-16) | No AI in Release 1; no portal auto-fill evidence |
| CaseEasy | 500+ firms; assessments; trust reconciliation | Trust-aware money with passcode-signed retainers (FD-17, FD-21) | Track record |
| IMMeFile (CAPIC) | Free with membership | Forms, trust and e-signature, which IMMeFile does not publish (MKT-5) | Price (free) |
| Low-cost tools (Migrawise, Immicase, ImmCase) | CAD 29–49 | Depth and support | Price |
| Spreadsheets and generic tools | Familiar, cheap | Time saved; compliance | Switching effort |

**Main reasons we may lose:** price, form breadth, the switching effort mid-case, a new vendor holding sensitive data, and rivals' AI features. Each has a counter in the playbook (Artifact 2 §5) and a measure (lost-deal reasons).

## 5. Claims register (what may be said, and when)

| Claim | Status today | May be used | Evidence needed |
|---|---|---|---|
| End-to-end enquiry to filed case | Simulated (OBS-7); production unknown (HIST-1) | CP-G3, once golden journey 4/5 passes on production | Team test evidence |
| Express Entry eligibility and points with explanation and review | Simulated (Delivery 1b) | CP-G3 | Golden cases pass; RCIC-reviewed content |
| IRCC form auto-fill | DEC-4: in Release 1; simulator shows 2 forms (K-12) | Only for named, tested forms | Form list with test evidence |
| Client-record import at onboarding | Release 1: clients only; cases and documents later (GAP-17) | CP-G2, worded "client records" | Pilot import timings |
| Trust-aware billing; passcode e-signature with evidence | Release 1 scope (FD-17, FD-21) | CP-G3 | Production tests |
| Client portal in English and French | Release 1 scope (mandate §1) | CP-G3 | Production tests |
| Canadian hosting (ca-central-1) | Architecture (RFP §6) | When production is live in Canada | Deployment evidence |
| "No caps on cases or forms"; "unlimited client-portal users" | Pricing decision (D-P1) | Now, as a pricing term | Terms of service |
| Support response targets | Proposal (Artifact 2 S-9) | CP-G3, as targets not an SLA | 3 months of measured response times |
| Uptime percentage, RPO/RTO | None in production | Not before 3 months of monitoring | Monitoring data and published terms (LEG-3) |
| Savings versus other tools | None | **Remove** | A dated, per-tool evidence file if ever reinstated (R3 implication 11) |
| SMS, SSO/SCIM, API, custom domain, multi-office, time tracking, "65+ programs" | Not in Release 1 (DEC-5; roadmap) | **Remove**, or label "planned" | — |
| "AI-generated facts in filings: 0" / "rules, not AI" | Consistent with FD-16 | Yes, worded so it does not imply the AI decides | — |

## 6. Channel experiments

| ID | Hypothesis | Tag | Owner | Cost (CAD) | Duration | Success measure | Stop rule |
|---|---|---|---|---|---|---|---|
| X1 | The founder's peers will give 20 problem interviews and describe real pain | C | Founder-consultant | 0 | 19 Oct – 15 Dec | 20 interviews; at least 60% name one of the 3 pains as top-3 | Under 8 interviews by 15 Nov: network reach is smaller than assumed (HYP-5); rethink channels |
| X2 | Founding firms pay a deposit before launch | C/F | Founder-consultant | Counsel review (Artifact 4) | Mid-Nov – 31 Jan | At least 10 deposits | Under 5 by 31 Jan: review price and positioning; the funding plan changes (Artifact 3) |
| X3 | The prototype's explained assessment and forms create switching intent | F | Founder-consultant, with Claude preparing | 0 | Nov – Dec, 6 sessions | At least 4 of 6 "would change how I work" | Fewer than 2: positioning D-M2 changes |
| X4 | The CPD route reaches every RCIC at low cost | P→L | Founder-consultant | Course preparation, time | Read the rules by 30 Nov; decide by 15 Dec | Approval feasible for a vendor | Vendors excluded: drop |
| X5 | Community presence (CAPIC member, NCIC 19–21 May 2027) yields conversations | C/L | Founder-consultant | About 2,500 for NCIC with travel (R2) | Nov – May | At least 15 qualified conversations from NCIC | Fewer than 5: no sponsorship spend in 2028 |
| X6 | Happy customers refer peers for credit | R | Commercial owner | Reward per paying referral: see the A2 referral block (generated from the offer) | From 10 live customers | At least 0.5 referred opportunities per referrer per quarter | Under 0.1 after 2 quarters: redesign |
| X7 | Cold outreach to published business addresses converts | C | Founder-consultant | Sales Navigator about 145 a month (CST-3) | 100 contacts, after the counsel anti-spam plan | At least 8% meetings booked | Under 3%: stop |
| X8 | New-licensee partners (education providers, mentoring) send starters | R | Founder-consultant | 0–2,000 | After CP-G3 | 10 firms a year | — |

## 7. Reachable market, built bottom-up (sensitivity, not a measured ceiling)

**Units:**
- **RCIC people** (CICC count: 11,994 RCICs plus 507 RISIAs in good standing, 30 Jun 2025; R7);
- **practices** (buying firms, not published);
- **reachable accounts** (practices we can contact lawfully and that fit);
- **lawyers** (excluded until counted).

The model converts people to practices with an assumed ratio (MKT.RCIC_PER_FIRM). The table shows how the pool changes across that assumption.

<!-- GENERATED:A1_MARKET BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

| RCICs per practice (assumption) | Practices in Canada | In ON/BC/AB | Annual revenue pool at BASE list MRR per firm (CAD) |
|---|---|---|---|
| 1.5 | 7,822 | 6,492 | 15,206,223 |
| 2 | 5,866 | 4,869 | 11,404,667 |
| 3 | 3,911 | 3,246 | 7,603,112 |

RCIC counts are people (CICC, 30 Jun 2025), not firms; the number of practices is not published. Excludes RISIAs, lawyers and other provinces. A sensitivity, not a measured ceiling.
<!-- GENERATED:A1_MARKET END -->

**In plain words:**
- Canadian RCIC-practice software is a pool of roughly the size shown at today's advertised prices, shared by many vendors.
- Whether that limits a venture outcome depends on unknowns: practice counts, lawyers, other countries (FD-22) and extra revenue lines.
- This is a hypothesis for the funding thesis (A3), not a finding.

## 8. Revenue scenarios (generated from the model)

<!-- GENERATED:A1_SCEN BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

Cases: **BASE** = Lean base (funded); **MNR** = Managed no-raise; **UNR** = Unmitigated no-raise; **DOWN** = Downside (funded); **UP** = Upside (funded); **HIGH** = Higher capacity (funded).

| Metric | BASE | MNR | UNR | DOWN | UP | HIGH |
|---|---|---|---|---|---|---|
| Paying firms at milestone (expected value) | 51.0 | 51.0 | 72.5 | 29.7 | 104.8 | 118.1 |
| Whole-firm operating target at milestone | 50 | 50 | 72 | 29 | 104 | 118 |
| MRR at milestone | 8,859 | 8,859 | 12,742 | 5,038 | 18,397 | 20,945 |
| ARR run rate at milestone | 106,312 | 106,312 | 152,906 | 60,458 | 220,763 | 251,334 |
| Revenue earned, 12 months to milestone | 68,328 | 68,328 | 81,560 | 35,054 | 113,506 | 129,915 |
| Cash collected from customers, 12 months to milestone | 86,372 | 86,372 | 115,217 | 46,749 | 162,760 | 187,684 |
| Limiting step at milestone | Selling hours | Cash below floor | Cash below floor | Demand: channel activity and conversion | Demand: channel activity and conversion | Demand: channel activity and conversion |
<!-- GENERATED:A1_SCEN END -->

**How the numbers arise:** demand → selling hours → closes (after the sales-cycle lag) → onboarding capacity → active contracts by start month and billing term → revenue and cash (A4 §5).
- Customer counts are expected values; the whole-firm row is the operating target.
- **Limiting step (base):** the founder's selling hours. Doubling onboarding effort barely moves the base case, while selling time, close rate and price do (A4 sensitivity).
- An arbitrary revenue target is a comparison, not a source of customers.

## 9. Commercial launch criteria (CP-G3; alongside the product's G5/G6)

**Before any real-data pilot (CP-G2)**, the minimum safeguards in A4 §8.1 must be evidenced. Launch criteria below come on top.

1. At least 3 pilot firms ran real cases on production for 4+ weeks, with no unresolved severity-1 incident.
2. At least 10 founding firms committed (proposal, not a model output); median client-record import under 14 days in the pilots.
3. Every public claim in §5 is verified or removed. The terms, data-processing agreement and privacy notice are reviewed by counsel.
4. Billing works (subscription billing, or a manual invoicing fallback). Support rota and status page are live (Artifact 2 S-9).
5. The immigration-content update owner and process are named (Artifact 4 §8).
