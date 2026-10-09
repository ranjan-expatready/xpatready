> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Artifact 2 — Sales, referral and customer-success playbook

**Version 0.2, 7 Oct 2026. Status: conditional draft for Codex recheck.** Not approved; nothing has been sent to anyone. Reward values are inputs in the workbook (group PART); derived figures are in a generated block.
**Writer:** Claude. **Owner:** Ranjan.
- "(On your behalf)" marks decisions taken under the delegation of 7 Oct (RAN-13, RAN-14).
- Every legal point is **"confirm with counsel"**; tax points are "confirm with accountant".
- Gates CP-G0 to CP-G4 follow `company-planning/WORKFLOW.md` §5.
- **Commercial owner** means the founder-consultant until a hire is made (Artifact 4 §3). Which founder holds the licence is to be confirmed (RAN-2, K-5).

## 1. Decisions

| ID | Decision | Rationale and evidence | Owner | Timing / trigger | Cost | Success measure |
|---|---|---|---|---|---|---|
| S-1 | **Founder-led selling until CP-G4.** No salesperson before the triggers in Artifact 4 §3 | Peer credibility with consultants (RAN-2). In the base model the founder's selling hours are the limiting step, and the first rep fails the payback gate at base values (A4 §3). A rep is hired only when the model's gates and real evidence agree | Founder-consultant | Now | Founder time (inputs SELL.FOUNDER_HRS_*) | Qualified conversations held vs the model's selling-hour capacity |
| S-2 | **Two kinds of demo, never mixed:**<br>• *prototype sessions* (labelled "simulator — not the product") for feedback only;<br>• *production demos* from CP-G3 | OBS-7; README §8 boundaries; LEG-3 (overall impression) | Founder-consultant | F now; L from CP-G3 | — | Zero prospects who believe the prototype is the live product (ask in follow-up) |
| S-3 | **One pipeline, stages as in §2, kept in a workbook tab or a free CRM tier** until more than 50 open opportunities | COVERAGE note: no paid CRM needed to start | Commercial owner | Now | CAD 0 to about 31 per user per month later (Zoho, CST-3) | Every opportunity has a stage, a next action and a date |
| S-4 | **Peer referral programme for licensed practitioners: account credit, not cash.**<br>• Peer firms only; never a reward for recommending anything to a client.<br>• RCIC and lawyer terms kept separate.<br>• Launch only after counsel review and at least 10 live, healthy customers | LEG-1 (CICC s.13 bans inducements for recommending to a client; guidance treats credits as inducements in a client context). Credit or cash makes no difference to conduct risk; credit is simpler to administer and keeps value in the product (R3 implication 2). Lawyers fall under law-society rules (R3 §2) | Commercial owner; counsel | Design now (P); test at CP-G3 (X6) | Reward in S-7 | §4 measures |
| S-5 | **Affiliates (non-licensee organisations only):**<br>• education providers, practice consultants, accountants;<br>• paid a cash commission, with written disclosure and promotion rules.<br>**Resellers: deferred** | Material-connection disclosure (LEG-3). Resellers would take on support and contracts we cannot yet manage | Commercial owner | CP-G4 | 15% of first-year collected revenue (S-7) | Each affiliate produces at least 2 paying firms in 6 months, or is ended |
| S-6 | **Outreach only with a recorded lawful basis** (checklist in §5a):<br>• warm contacts with an existing relationship first;<br>• published-address contact only when the address is conspicuously published, carries no statement refusing unsolicited messages, and the message is relevant to the person's business role;<br>• referral first messages only under the full referral-exemption conditions;<br>• LinkedIn and other social messages need the same consent basis as email;<br>• every message identifies the sender and offers an unsubscribe;<br>• no scraping or bulk use of the CICC register or the LSO directory | CASL s.6, s.10(9)(b) (R3 §3); Electronic Commerce Protection Regulations SOR/2013-221 s.4 (quoted in §5a); the LSO directory forbids unsolicited items (R2 §1.4); PIPEDA publicly-available-information limits. All pending counsel (Codex CR-09) | Founder-consultant; counsel | Before any outreach (X1 warm contacts excepted) | Counsel scope (A4) | Every contact has a basis and evidence record; zero complaints; unsubscribes processed within 10 business days |
| S-7 | **Referral economics (proposals, editable inputs):**<br>• Referrer: account credit per referred firm (PART.REF_CREDIT, proposed CAD 250), released only after the referred firm has paid for the release period (PART.REF_RELEASE_LAG, proposed 2 months).<br>• Referred firm: free month(s) of its own plan (PART.REF_FREE_MONTHS, proposed 1). The model values the free month at the referee's actual offer: the first invoice for monthly; one month's annual price, applied at the first renewal and expiring if it does not renew.<br>• Affiliates: commission on first-period **collected** revenue (PART.AFF_PCT, proposed 15%), paid after a lag (PART.AFF_PAY_LAG); refunded annual customers earn no commission.<br>• Credit cap: 12 months of the referrer's subscription per year. **No multi-level rewards** | Benchmarks: Clio and Cerenade pay $250 plus a discount or free month (CMP-4). Derived values (free-month value, total reward, months of contribution to recover it) are in the generated block below. Rewards are counted once, as an acquisition cost (accountant to confirm classification) | Claude (on your behalf); counsel; accountant | Fixed before X6 | See generated block | Reward under 20% of first-year revenue per referred firm |
| S-8 | **Onboarding standard:**<br>• kickoff within 5 business days of order;<br>• **first value within 14 days**: first live case with the client invited to the portal and the questionnaire submitted;<br>• migration accepted by the customer in writing | HYP-8. The website's "14 days" promise (OBS-1) is kept only if pilots prove it; VisaFlo claims 1 day (R1 §5) | Onboarding/CS specialist (founder until hired) | Pilots CP-G2 | Specialist cost (Artifact 4) | Median days to first value 14 or fewer across pilots; 90% of firms reach first value within 30 days |
| S-9 | **Support model at launch:**<br>• business hours Mon–Fri 9:00–18:00 ET, in-app and email;<br>• **targets** (not a contractual SLA until measured for 3 months): P1 (service down, data or security) response within 1 business hour, P2 (core function impaired) within 4 business hours, P3 (how-to) within 1 business day;<br>• public status page;<br>• P1 escalates to the product team's on-call | Replaces "4hr business-day SLA" and "99.9% SLA" (K-10, LEG-3). Support is a possible differentiator (CMP-2) | CS specialist; product on-call | CP-G2 | Help desk and status tools (CST-3) | 95% of P1 and P2 within target |
| S-10 | **Product feedback route:**<br>• the customer request is logged with a tag;<br>• weekly triage with the product owner;<br>• the decision is recorded in `product/requirements/decisions.md` by the product's writer.<br>**Sales never promise dates or features** | COVERAGE C22; one-writer rule | Commercial owner and product owner | Weekly from CP-G1 | — | No promised feature in any signed order form |

**Referral economics derived from the current offer (BASE):**

<!-- GENERATED:A2_REFERRAL BEGIN fingerprint=e16bfb6cbb3d5357 -->
*Generated 2026-10-07 21:16 by `tools/refresh_reports.py` from `04-execution-team-financial-workbook.xlsx` (model v0.2.0; inputs-and-logic fingerprint `e16bfb6cbb3d5357`; actuals: none entered; CAD). Forecasts are expected values from assumptions, not results. Do not edit inside this block.*

| Item (BASE) | Value (CAD) |
|---|---|
| List MRR per new firm (plan-mix weighted) | 195 |
| Referrer credit (PART.REF_CREDIT) | 250 |
| Referee free month(s) at list MRR (derived) | 195 |
| Total reward per referred paying firm | 445 |
| Unit contribution per firm per month (milestone) | 151 |
| Months of contribution to recover the reward | 3.0 |
<!-- GENERATED:A2_REFERRAL END -->

## 2. Pipeline: lead to payment and renewal

Elapsed times are assumptions until measured. "Evidence" is what must be in the record before the deal moves on.

| Stage | Enter when | Exit when (evidence) | Owner | Next action | Elapsed (assumption) | Typical loss reasons |
|---|---|---|---|---|---|---|
| 1. Target | Practice fits D-M1, with a known contact route that is lawful (S-6) | Contact made | Commercial owner | Personal message or introduction | — | No lawful route; out of segment |
| 2. Qualify | Reply or meeting accepted | Licensed practice confirmed; 1–10 users; current tools and pain noted; decision-maker identified | Commercial owner | Book discovery | 1 week | Not a decision-maker; no pain |
| 3. Discovery | Qualified | Interview notes on the 3 pains, current tools, spend, switching trigger, timing (§3 guide) | Founder-consultant | Prototype session (before CP-G3) or production demo | 1–2 weeks | No urgency; happy with current tool |
| 4. Demo | Pain confirmed | The prospect has seen the workflow that matches their case mix and states fit | Founder-consultant | Proposal | 1 week | Missing programme or form depth; AI expectations |
| 5. Pilot / founding commitment | Before CP-G3: founding offer; after: optional 14-day trial (D-P7) | Deposit paid or trial started | Commercial owner | Onboarding plan | 1–3 weeks | Price; timing; vendor risk |
| 6. Proposal | Fit confirmed | Order form sent: plan, users, billing basis, migration scope, start date | Commercial owner | Follow-up in 3 business days | 1 week | Price vs Officio, IMMeFile or low-cost tools |
| 7. Negotiation | Questions or objections | Agreed terms within approved limits (no custom features; discounts only within D-P5 or D-P4) | Commercial owner; Ranjan for exceptions | Signature | 1–2 weeks | Discount request beyond limits |
| 8. Payment | Signed | First invoice paid (card, or the invoice fallback) | Commercial owner | Kickoff | Immediate to 2 weeks | Failed payment |
| 9. Onboarding | Paid | First value reached (S-8); migration accepted | CS specialist | Day-30 check-in | 14 days target | Migration effort; time |
| 10. Adoption and renewal | Live | Health green at day 90; renewal at −60 and −30 days for annual plans | CS specialist | Renewal, expansion, referral ask | Ongoing | Low use; missing features; price |

**Weekly pipeline review:**
- stages over their elapsed time;
- next actions due;
- loss reasons;
- capacity (Artifact 4 §6 scoreboard).

## 3. Templates (short versions; full scripts follow once interviews start)

**Discovery (no demo, timing C).** Twenty minutes. No selling.
1. How many people work in the practice, and in which roles? Which case types bring most revenue?
2. Walk me through your last new client, from first enquiry to signed retainer. Where did time go?
3. What do you use today for enquiries, assessments, retainers, invoices, trust money, forms and client updates? What does it cost a month?
4. What changed for you with the College rules from July 2026? How do you keep records ready for a practice review?
5. When did you last switch software? What made you switch, and what was painful?
6. If one problem disappeared tomorrow, which one?
7. Who else would decide on a new system? What budget would feel reasonable for solving that problem? Ask for a range, not our price.

**Prototype session (timing F), 30 minutes.** Purpose stated at the start: "This is a simulator, not the product. We want your view on two things." Show the explained Express Entry assessment and the form copy-assist (OBS-7). Ask:
- Would this change how you work? Why or why not?
- What is missing for your case mix?

Record the answers; no price discussion.

**Production demo (timing L).** Follow the prospect's own case type:
enquiry → assessment with explanation → retainer with passcode signing → invoice and trust record → questionnaire and documents → forms → portal view → audit trail.
End with the plan and price (Artifact 1 D-P3) and the founding or standard offer.

**Proposal / order form contents:**
- plan, users, billing basis, price and any approved discount;
- migration scope (sources, record counts, acceptance check);
- start date and first-value target;
- support targets (S-9);
- the terms, data-processing agreement and privacy links (counsel-reviewed);
- cancellation and export (D-P8).

**Follow-up cadence:**
- recap and next step within 1 business day of every meeting;
- proposal follow-up at 3 and 7 business days;
- then monthly, only with consent (S-6).

## 4. Objections and honest answers

| Objection | Answer (must stay within the claims register, Artifact 1 §5) |
|---|---|
| "Officio or CaseEasy is cheaper or already does forms." | Agree where true. Show one connected record from enquiry to filed case, with explained assessments and trust records. Offer founding pricing. Never claim form breadth we do not have |
| "CAPIC gives me IMMeFile free." | Show what IMMeFile's own page does not list: IRCC forms, trust accounting, e-signature (MKT-5). The decision is theirs |
| "Where is the AI?" | AI assists and humans decide (FD-16). AI features are not in Release 1. We do not invent facts in filings |
| "Moving files mid-case is risky." | Phased migration: new matters first. Assisted migration is included on annual plans (D-P6). The customer signs off the migration |
| "You are new; is my clients' data safe?" | Only verified facts: hosting region, encryption and audit, as proven at CP-G3. Penetration-test summary under NDA once it exists |
| "Do you cover my programme?" | The honest Release 1 content list (roadmap R-01: Express Entry and two provincial streams in full depth; others as information). Show the content roadmap without dates we cannot keep |

## 5. Referral, affiliate and reseller options

| Model | Who | What they do | Reward | Responsibilities | Fit now |
|---|---|---|---|---|---|
| **Customer referral** | Licensed customers (RCICs; lawyers under separate terms) | Introduce a peer firm | Credit (S-7) | Disclosure; no client steering; follow our message rules | **Yes, from CP-G3** (X6) |
| **Non-customer practitioner referral** | Licensed peers who are not customers | Introduce a peer firm | Credit against a future subscription, or none | As above | Optional; buying is not required to refer (WORKFLOW §3), but credibility is higher if they use the product. Test both |
| **Affiliate** | Non-licensee organisations (education providers, accountants, practice consultants) | Promote to their audience with a tracked link | 15% of first-year collected revenue (S-7) | Written agreement; disclosure; approved claims only | CP-G4 |
| **Reseller** | Partner who sells, contracts and supports | Owns the customer relationship | Margin | Contracts, support, data handling | **Deferred** |

**Programme rules** (draft for counsel; based on R3 implications 1–6):
1. **Peer firms only.** No reward for recommending Expat Ready, or anyone else, to the referrer's own immigration clients. No passing of client leads. RCIC and lawyer versions of the terms are separate.
2. **Attribution.**
   - Unique link or code. A 90-day window from the first valid referral.
   - The first valid referral wins.
   - An open opportunity already in our pipeline does not qualify.
   - Same-firm, affiliated-firm and self-referrals are excluded.
3. **Payout.**
   - Credit is released after the referred firm has paid for 60 days.
   - It is reversed if the firm cancels and is refunded within that window. Example: an annual founding customer refunded under the 30-day guarantee triggers no reward.
   - Affiliate commission is paid quarterly on cash actually collected, after the clawback window.
4. **Disclosure.** Every referrer post or message states the material connection (e.g., "I receive account credit from Expat Ready"). No performance or savings claims beyond the claims register. Breach removes the referrer from the programme (LEG-3).
5. **Messages** (pending counsel; see §5a).
   - Referrers use their own relationships to introduce peers.
   - **Expat Ready's first message to a referred peer** is allowed without consent only if all of these hold (SOR/2013-221 s.4(1)):
     - the referrer is an individual with an existing business, non-business, family or personal relationship with **the Expat Ready person who sends** the message;
     - the referrer has one of those relationships with **the recipient**;
     - the message discloses the referrer's **full name** and states that it is sent as a result of the referral;
     - it is the **first** message only; later messages need consent;
     - identification and unsubscribe are still required (CASL s.6(2)).
   - **Non-customer referrers:** usually have no business relationship with Expat Ready, so they qualify only through a genuine personal relationship with the sender (direct, voluntary two-way communication; SOR/2013-221 s.2). Record the evidence or do not use the exemption.
   - No "invite a colleague" email from the product until counsel reviews it under CASL s.9 (causing or permitting).
6. **Fraud and disputes.**
   - Duplicate leads are checked against the pipeline.
   - Unusual patterns (many referrals from one address, links to the same firm) are reviewed.
   - Disputes are decided by the commercial owner within 10 business days and logged.
7. **Tax.** Credits versus cash and slip reporting (T4A) are confirmed with the accountant before launch (R3 §6).
8. **Training.** A 15-minute referrer briefing on disclosure and anti-spam rules. It protects the referrer's own licence duties (R3 implication 6).

### 5a. Outreach basis checklist

Pending counsel. Recorded in workbook tab T-Prospects, column "Lawful contact basis + evidence link".

| Basis | All conditions that must hold | Evidence to record |
|---|---|---|
| Express consent | Person agreed to receive our messages; the request identified us and the purpose | Form or record, date, wording shown |
| Existing business relationship | Purchase, contract or written enquiry within the periods in CASL s.10(10) | Date and type of the relationship |
| Personal relationship (founder's own contacts) | Direct, voluntary two-way communications and a relationship a reasonable person would call personal | Note of the relationship; the founder sends personally |
| Conspicuously published address | Published conspicuously by the person or their firm; **no statement that they refuse unsolicited messages**; message relevant to their business role (CASL s.10(9)(b)) | URL, screenshot, date seen, "no refusal statement" check, relevance note |
| Referral (first message only) | All conditions in rule 5 above, including the referrer's relationship with **both** sender and recipient | Referrer's full name; both relationships; copy of the message |
| LinkedIn or social message | One of the bases above. A public profile alone is not permission | As above |
| Not a basis | Scraped or bought lists; the CICC public register or LSO directory as a mailing list | — |

**Partner recruitment, training and activation (affiliates, from CP-G4):**

| Step | What happens | Owner |
|---|---|---|
| Select | From the R2 directory, by fit and permission | Commercial owner |
| Agreement | Written agreement covering disclosure, approved claims and data handling | Commercial owner; counsel |
| Train | 30-minute product and claims briefing; a demo account | Commercial owner |
| Activate | First co-hosted session within 60 days | Commercial owner |
| Review | Quarterly; end the agreement if fewer than 2 paying firms in 6 months | Commercial owner |

## 6. Communities, associations and partners (ranked; detail and sources in R2 §2)

**No contact has been made.** Membership never equals permission to market. Each "next action" excludes outreach until Ranjan instructs it.

| Rank | Organisation (verified site) | Fit | Public route (published by the organisation) | Permission needed | Next action |
|---|---|---|---|---|---|
| 1 | CICC continuing-education (CPD) provider route (college-ic.ca) | Reaches every RCIC (16 hours a year) | College Portal; registration@college-ic.ca | Written College approval; advertising limits | Read the CPD Regulation; decide by 15 Dec (X4) |
| 2 | NCIC 2027, CAPIC's national conference, 19–21 May 2027, Vancouver (ncic-cnci.ca) | Main national RCIC event, 2 months after launch | events2@capic.ca | Attend as a member; sponsorship needs an agreement | Decide on attendance by Jan 2027 (hotel block closes 16 Apr) |
| 3 | CAPIC membership and IMMeForum (capic.ca) | Largest consultant community | info@capic.ca; 416-483-7044 | Forum rules (not verified); no promotion without permission | The founder-consultant joins or renews as a member; reads the rules (needs approval) |
| 4 | Ashton College Immigration Practitioner Centre | CPD seminars pre-approved by the College | marketing@ashtoncollege.ca | Teaching partnership | Review its seminar calendar for a practice-management gap |
| 5 | OBA Citizenship & Immigration Law Section | Ontario lawyers (later segment) | sponsorship@oba.org | Paid sponsorship or advertising | Revisit at CP-G3 |
| 6 | CAPIC sponsorship / IMMeAffiliate | Best RCIC reach; CAPIC bundles a competing tool | info@capic.ca | Sponsor agreement | Weigh the IMMeFile conflict before any approach |
| 7 | CBA national Immigration Law Conference | Main lawyer conference | pd@cba.org | Sponsorship | Read the published sponsorship prospectus (a team member) |
| 8 | Queen's Graduate Diploma (immigrationdiploma.queenslaw.ca) | Feeds new licensees | immigrationdiploma@queensu.ca | Partnership | Read the curriculum for a practice-management gap |
| 9 | Translation Agency of Canada | Serves the same buyers | Contact page | Co-marketing agreement | Decide whether co-marketing partners are in scope (CP-G4) |
| 10 | CILA (cila.co) | Lawyers only; competitors sponsor it | info@cila.co | Sponsorship | Park until the lawyer segment |

Not channels: the CICC (the regulator) and the LSO specialist directory, which forbids unsolicited items.
Not yet researched (R2 §5): podcasts, newsletters, accountants serving RCICs, insurers.

## 7. Onboarding and migration

| Step | Day | What happens | Evidence |
|---|---|---|---|
| Kickoff | 0–5 | Goals, users, case types, data sources, migration scope; plan configured (Practice Pack published, as required) | Kickoff record |
| Import | 3–10 | **Client records** by CSV template, or assisted import (D-P6). Existing cases and documents cannot be imported at launch (GAP-17): firms open live cases fresh | Record counts match; 10 records spot-checked; customer signs acceptance |
| Configure | 3–10 | Branding, retainer templates (EN/FR), invoice settings, trust-account designation, staff and roles with MFA | Settings checklist |
| Train | 5–12 | Two 60-minute sessions: (1) enquiry to retainer; (2) case, documents, forms and portal | Attendance |
| First value | By 14 | First live case: client invited to the portal and the questionnaire submitted | Event in the product |
| Day-30 review | 30 | First retainer signed and paid in the product; issues logged | CS notes |

- **Capacity:** about 10 firms a month per specialist; the founder handles about 4 alongside selling (assumptions; validate in pilots).
- **Stress test:** halving capacity barely changes the base case, because demand is the bottleneck. It matters in the higher-capacity plans.

## 8. Customer success, renewals and expansion

**Health signals** (weekly, once production analytics exist):
- staff logins;
- new cases;
- portal invitations;
- payments recorded;
- support tickets.

Green / amber / red by agreed thresholds, set after the first 10 customers.

**Touchpoints:** days 7, 30, 60 and 90, then quarterly. Annual renewals at −60 and −30 days.

**Expansion triggers:**
- users at the plan limit;
- employer cases near the plan limit;
- a second office.

**Referral and testimonial asks:**
- Referral: at day 60 if health is green.
- Testimonial: only with written approval of the exact words, and nothing implying College or law-society endorsement (R3 implication 14).

**Churn interviews:** every cancellation; reason codes feed the product triage (S-10).

## 9. Website and campaign needs

| Asset | When | Owner | Note |
|---|---|---|---|
| Claims correction (Artifact 1 D-M3) | Now; needs authorisation | Website owner | First, before any promotion |
| Pricing page with D-P1–D-P8 terms | Before the founding offer | Website owner | Counsel checks for hidden-fee issues (R3 implication 15) |
| Founding-firm page and deposit flow (manual invoice is acceptable) | Mid-Nov | Commercial owner | Refund terms clear |
| Security and privacy page: facts only | CP-G3 | Product team | Each line backed by evidence |
| Demo booking with consent wording (anti-spam) | Now | Website owner | Separate marketing-consent tick box |
| Two-minute demo video | CP-G3 | Commercial owner | Recorded on production, not the prototype |
| Case studies (2–3 pilot firms) | CP-G3 + 60 days | CS specialist | Written approval |
| Launch announcement to the founder's network and members' channels | CP-G3 | Founder-consultant | No large campaign before CP-G3 |
| Referrer kit (link, disclosure text, approved claims) | X6 | Commercial owner | After counsel review |

**Measurement:**
- demo requests;
- qualified-opportunity rate;
- close rate by channel;
- cost per paying firm by channel (Artifact 4 §6).
