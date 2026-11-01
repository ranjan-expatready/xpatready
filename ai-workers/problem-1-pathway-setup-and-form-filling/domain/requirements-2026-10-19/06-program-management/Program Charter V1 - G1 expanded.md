# Program Charter V1 | Markdown dump

Source: C:/Users/team-member/Dropbox/team-member-notes/ExpatReady/output/Program Charter V1 - G1 expanded v2.pptx

This is a text-first working copy of the deck. Section order is preserved. Tables are represented as Markdown tables.

## Section 1: Release 1 overview

### Release framing

- **Product:** Release 1: immigration practice, connected
- **Positioning:** One platform for Canadian immigration firms and their clients.
- **Market launch:** 12 March 2027
- **Production release:** 23 February
- **Planning note:** All dates are working targets until the delivery team confirms them on 9 Oct 2026.

#### Launch objective
> One firm. One client. Enquiry to filed case. No manual workaround.

### Client journey, end to end

### Step 1 - Win

**Lead management · CRM**

- Enquiry capture
- Pipeline and follow-up
- Conversion to client


### Step 2 - Assess & advise

**Eligibility · consultation**

- Pathway assessment
- Explained result, human review
- Consultation booking


### Step 3 - Engage

**Retainer · e-signature**

- Retainer agreement
- Passcode e-signing
- Signed evidence


### Step 4 - Bill & collect

**Billing · payments · trust**

- Invoices and tax
- Online or offline payment
- Trust ledger


### Step 5 - Prepare & deliver

**Case management**

- Smart questionnaire
- Documents and review
- Filing recorded, tracked
- LMIA recruitment evidence


### Step 6 - Client portal

**Client self-service**

- Progress, next action
- Upload, sign, pay
- Messages, privacy requests
- Employer view (read-only)


### Capabilities across every step

Messaging · tasks and reminders · templates · data import · audit trail · reports · English and French · accessible (WCAG 2.2 AA)


### Four product planes

All four planes go live together. The 37 modules share one client record. Full list in Appendix A.

| Plane | Scope | Timing |
| --- | --- | --- |
| Foundation platform | Security, data, Canadian hosting | Largely built · finish Oct |
| Super Admin · 12 modules | Firms, packs, plans and billing | In build · finish Nov |
| Agent console · 16 modules | Where the firm runs every case | Build Oct – Dec |
| Client portal · 9 modules | Web portal, works on phone, EN/FR | Build Nov – Dec |


### Business configuration

Set up by the business alongside the build. Checklist in Appendix B.

| Configuration | Contents |
| --- | --- |
| Canada Country Pack | Programs and pathways · eligibility and CRS scoring · SQR questionnaire rules · checklists · stages · form list |
| Canada Practice Pack | Regulator, trust money, fees and complaints, retention, privacy, e-signature, tax |
| Firm setup | Templates EN/FR · plans and prices · roles · legal text · pilot firms and data import |

### Not in Release 1

AI-assisted features · Automation engine (AG-11) and its Doers · Advanced engagement scoring. Earlier exclusions: Appendix A.

**Page marker:** 1 / 3

### Speaker notes

WHAT THIS PAGE SAYS. Release 1 launches on 12 Mar 2027 (production release 23 Feb). All dates are working targets until the delivery team confirms them on 9 Oct against its measured speed.

THE JOURNEY. Six steps a firm and its client go through. "Filing recorded" means staff file on the government portal themselves and record it in the case; Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28). "Human review" means a client can ask a named person to review an automated eligibility result (FD-20).

THE FOUR PLANES. Built in this order: Foundation (security, data, hosting), Super Admin (how Expat Ready runs firms, packs, plans and billing), Agent console (the firm's workspace), Client portal (a web portal that works on a phone; not a native app). All four go live together. AG-17 (LMIA recruitment evidence) and CP-9 (employer view, read-only) are in Release 1.

BUSINESS CONFIGURATION. Content and settings the business sets up while the team builds. Country Pack = Canada's immigration rules held as data. Practice Pack = the firm's own regulator rules. A firm cannot be created until both are published, so v0 packs go to staging by 13 Nov. Immigration content may appear in English only at launch (SA1-D2 makes French optional for pack text); screens, client messages and legal documents are English and French.

NOT IN RELEASE 1. AI-assisted features; the AG-11 automation engine and its Doers (rule-based "when X, do Y" tools such as Minder, Tasker and Messenger; Reminder was folded into Minder by FD-8); advanced engagement scoring. Ordinary tasks, reminders and three plain notices (consultation reminder, unsigned document chase, missing evidence nudge) stay. Founder decision needed: case deadlines and document expiry need a watcher; either keep a simple deadline and expiry reminder in scope or track deadlines by hand at launch.

TERMS. CRS = the federal points score for Express Entry. PNP = provincial nominee programs. LMIA = the employer's proof that a foreign hire is needed. SQR = the smart questionnaire that asks only what the pathway needs. RCIC = licensed immigration consultant, regulated by CICC. Trust ledger = per-client record of client money not yet earned. WCAG 2.2 AA = the accessibility standard.

---

## Section 2: The path to 3rd March

### Timeline

- Six gates, each passed on evidence, not effort.
- Programme started 15 Aug; build since 15 Sep.
- Dates are targets until 9 Oct.
- **Plan:** closed
- **Build:** four planes in order, configuration alongside, continuous QA
- **Harden**
- **Prove**
- **Launch**
- **Hypercare**
- **Production:** 23 Feb
- **Market launch:** 12 Mar

### Gate criteria

| Gate | Date | Passes when | Evidence |
| --- | --- | --- | --- |
| **G1 - Platform ready** | **15 Nov** | Foundation live in production environment; Super Admin 80% built; all remaining requirements and designs signed off | Environment checklist; isolation tests; signed requirements |
| **G2 - Core journey** | **11 Dec** | A firm on v0 Canada packs takes a client from enquiry to paid retainer and open case; the journey runs on real services in test mode | Recorded demo; golden journey 4 |
| **G3 - Feature complete** | **2 Jan** | All four planes are built on staging; no mock screens remain; configuration is 80% complete; the cut line is applied if needed | Requirement-to-test map; configuration checklist |
| **G4 - Release candidate** | **31 Jan** | Every requirement has a passing test; no critical or high defects remain; configuration is complete; code is frozen | Regression report; load report; accessibility report |
| **G5 - Business accepted** | **26 Feb** | Pilots run real cases; 9 of 9 golden journeys pass; legal sign-off is complete; pen-test highs are fixed and retested | Pilot sign-off; pen-test report |
| **G6 - Go / No-Go** | **3 Mar** | All six quality gates below pass under the decision rule | Go/No-Go evidence pack |

### G6 quality gates

Ready means proven, not promised.

- **Security:** 100% isolation tests; pen test finds no leakage
- **Golden journeys:** 9 / 9 pass in EN and FR, desktop and mobile; portal meets WCAG 2.2 AA
- **Money and advice:** 0 unexplained variance; golden cases match
- **Critical / high defects:** 0 open at Go/No-Go
- **Coverage:** 80% of business-logic code; every requirement tested
- **Operations:** 4-hour restore; 15-minute data loss; load test; rollback

### Governance and decision rules

- Founder decides each gate on evidence from the dev lead, QA lead and business owner.
- Security, money and privacy are never waived.
- Any other gate requires written approval with a fix date.
- **Critical:** blocks a journey, loses data or money, or exposes personal data.
- **High:** major fault with a workaround.
- **Holiday freeze:** 21 Dec – 1 Jan.
- Change control applies after G1. After G4, only founder-approved changes are allowed.
- **Proposed date rule:** decided at G3 and never in February. If G3 misses by more than a week, 28 Feb becomes a pilot-firm launch and public sale moves to 30 Apr.

**Page marker:** 2 / 3

### Speaker notes

GATES. Six founder decisions, each passed on evidence. Between gates, the team reports a month-end checkpoint (program sheet); the founder only steps in when a row turns amber or red. G1 is 15 Nov (a Sunday).

WHY G2 MATTERS. It is the first time a real firm, on early (v0) Canada packs, runs a client end to end on real services in test mode. Packs must be published before any firm can be created (SA-1-4, A22-6.6), so v0 packs reach staging by 13 Nov.

THE SHADED WEEKS, 21 Dec to 1 Jan. A holiday freeze: no new features and no production changes, because people are away and a broken release could not be fixed quickly. Defect fixes may go to staging if staff are working. Use working days for test automation, golden cases, pack content, help content and load and pen-test preparation. An on-call owner covers the production environment; backups and alerts are checked before 21 Dec. On 4 Jan, a re-entry check compares tested % and open critical or high defects against the 31 Jan target. Holidays count as lost capacity in the team plan.

GOLDEN JOURNEYS. Nine end-to-end business scenarios (Appendix C) that must all pass before Go/No-Go. They replace the earlier list of seven, which missed Super Admin, employer and LMIA, privacy and trust money.

DEFINITIONS. Built = running on staging against real services, with no mock screens. Tested = the tests mapped to its requirements pass. Restore 4 h = time to recover from a failure; 15 min = most data that may be lost (RPO). Load test = the system holds launch traffic. Pen test = independent experts try to break in.

DECISION FOR THE FOUNDER. Pilots load real client data from 15 Jan, but the pen test runs 25 Jan to 5 Feb. Either pilots use test copies until the pen test highs are fixed, or the pen test moves before 15 Jan.

DATE RULE (proposed). The launch-or-slip decision is taken at G3 on 2 Jan with the cut line applied, never in February. Candidates for the cut line, in order, are a founder decision; LMIA and the employer view are the largest late items.

---


---

## Section 3: PRODUCT & LAUNCH PLAN

### Goals

- Back-plan: what must be true at each month end
- Development, configuration, testing and operations move together. 
- Use for resourcing; the team confirms targets on 9 Oct.
- Built = running on staging against real services, no mock screens. 
- Tested = its requirement tests pass. 
- Starting point: Foundation largely built; 
- Super Admin about 35% (team audit, 27 Aug); 
- Agent console and portal mostly not started. 
- Each month end the team returns the checkpoint in the program sheet.


### Table 1

| Track                     | Oct                                                                                        | Nov                                                                                       | Dec                                                                               | Jan                                                      | Feb                                                       | Owner               |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| Target                    | G1 <br>**15 Nov** <br>Platform ready                                                       | G2 <br>**11 Dec** <br>Core journey                                                        | G3<br>**2 Jan** <br>Feature complete                                              | G4 <br>**31 Jan** <br>Release candidate                  | G5 <br>**26 Feb** Accepted · <br>G6<br>3 Mar Go/No-Go     | x                   |
| 1 Foundation              | 100% built; production environment live; Stripe test mode, email, storage; in-house e-sign | Fixes only                                                                                | Fixes only                                                                        | Hardened                                                 | ~~Live 23 Feb~~                                           | Dev lead            |
| 2 Super Admin             | 80% built: packs and configurator, firms, plans, roles, users, flags                       | 100% built: subscription billing, templates, integrations, analytics, support, compliance | Fixes only                                                                        | Hardened                                                 | ~~Live 23 Feb~~                                           | Dev lead            |
| 3 Agent console           | 20% built: firm setup, data import, CRM                                                    | 60% built: assessment, booking, retainer, billing, case record, questionnaire             | 100% built: documents, messaging, tasks, templates, reports, portal control, LMIA | Hardened                                                 | ~~Live 23 Feb~~                                           | Dev lead            |
| 4 Client portal           | Designs signed off                                                                         | 40% built: access, progress, intake, pay, sign                                            | 100% built: evidence, messages, privacy, employer view                            | Hardened                                                 | ~~Live 23 Feb~~                                           | Dev lead            |
| Business configuration    | 30%: accounts, roles, plans and prices                                                     | 45%: v0 Canada packs on staging (13 Nov)                                                  | 80%: Practice Pack, templates, legal text EN/FR                                   | 100%: packs published; privacy rules; pilot firms set up | ~~Signed off 26 Feb~~                                     | Founder + business  |
| Testing                   | Test plan; golden journeys agreed; isolation tests on every new table                      | Built work tested within 2 weeks; journey 4 passes                                        | 65% tested; journeys 1–4 pass                                                     | Every requirement tested; full regression; coverage 80%  | ~~Pilot acceptance; 9 of 9 journeys pass~~                | QA lead             |
| Hardening and security    | Restricted-data encryption in place                                                        | Security review of each new module                                                        | Dependency and vulnerability scan clean                                           | Load test; accessibility audit; pen test 25 Jan – 5 Feb  | ~~Pen test highs fixed and retested by 26 Feb~~           | Dev lead + security |
| Deployment and operations | CI on front and back end; fortnightly staging releases                                     | Staging releases rehearse deploy and rollback                                             | Monitoring live; on-call named; holiday freeze 21 Dec – 1 Jan                     | 4-hour restore drill; import rehearsal; cutover plan     | ~~Cutover rehearsal; production 23 Feb; hypercare March~~ | DevOps              |
| Commercial readiness      | Prices set; 2–3 pilot firms signed                                                         | Demo and onboarding script                                                                | Help content drafted                                                              | Pilot onboarding and training                            | ~~Help and support live; market launch 12 Mar~~           | Founder             |

#### Speaker notes

HOW TO READ IT. Down a month column: what every track must have delivered by that month end. Across a row: one team's commitments, which is the basis for resourcing. Sprint detail stays in the team's own tool and maps onto these rows.

TARGETS. All percentages are proposals. The team confirms them on 9 Oct against its measured speed. The audit found the plan back-loaded: about 12 modules in November and 12 more in the first 18 days of December. If the team cannot meet that pace, the founder cuts scope at G3 rather than letting dates drift.

ORDER. The case record and questionnaire are pulled into November because documents, messaging, tasks and most portal screens depend on them.

PERCENT BUILT. Counted by modules, weighted by effort in the team plan. Mock screens and screens calling services that do not exist do not count.

---


---


---
## Section 4: Appendix A - what goes live, and who owes what

Module IDs match the requirement documents already in use. The order below follows the build sequence.

### Product planes

#### 1. Foundation

One client record · isolation · MFA · encryption · audit · EN/FR · Canadian hosting

#### 2. Super Admin · 12 modules

- SA-1-A  Country Packs
- SA-1-B SQR Configuration
- SA-2 Firms
- SA-3 Plans and entitlements
- SA-4 Subscription billing
- SA-5 Global templates
- SA-6 Roles and permissions
- SA-7 Platform users
- SA-8 Integrations
- SA-9 Analytics (launch minimum)
- SA-10 Support (launch minimum)
- SA-11 Audit and compliance
- SA-12 Flags and configuration

#### 3. Agent console · 16 modules

- AG-1 Firm setup
- AG-2 Lead management / CRM
- AG-3 Pathway assessment
- AG-4 Consultation booking
- AG-5 Retainers and e-signature
- AG-6 Billing and trust
- AG-7 Case delivery
- AG-8 Smart questionnaire
- AG-9 Documents
- AG-10 Communications
- AG-12 Templates
- AG-13 Tasks and audit trail
- AG-14 Reporting
- AG-15 Portal management
- AG-16 Firm settings
- AG-17 Recruitment evidence (LMIA)

#### 4. Client portal · 9 modules

- CP-1 Secure access
- CP-2 Progress and next action
- CP-3 Intake questionnaire
- CP-4 Evidence upload
- CP-5 Payments
- CP-6 Signing
- CP-7 Messaging
- CP-8 Profile, consent, privacy
- CP-9 Employer view (read-only)

### Delivery-team asks

- **9 Oct:** Confirm the back-plan against measured speed; map sprints to its rows; confirm owners, estimates, capacity, holidays and risks.
- **Every month end:** Return the checkpoint covering built, tested, configured, defects and people.

### Founder inputs and due dates

| Due date | Owner | Input |
| --- | --- | --- |
| 9 Oct | Founder | PNP streams; representative model; scope log |
| 16 Oct | Founder + counsel | Restricted-data fields; accounts; pen tester |
| 30 Oct | Founder | Plan tiers and CAD prices; 2–3 pilot firms |
| 13 Nov | Founder + expert | Canada pack content |
| 11 Dec | Founder + counsel | Legal text EN/FR; tax profile |
| 15 Jan | Counsel | Retention, breach and consent rules |

### Delivery health (DORA) · proposed

Staging deploys fortnightly or faster · change lead time under 1 week · change failure rate under 15% · restore within 4 hours

### Deferred scope

- AI-assisted features
- AG-11 automation engine and its Doers
- Advanced engagement scoring
- Government form auto-fill
- Quebec programs
- SMS and WhatsApp
- Single sign-on
- Credit notes

**Appendix A**

### Speaker notes

WHAT THE FOUNDER INPUTS CONTAIN.

9 Oct · PNP streams: which provincial nominee streams get full rules, scoring and checklists at launch (for example Ontario and British Columbia skilled-worker streams); all others are information only. Representative model: who can represent clients (licensed consultants only, or also lawyers and Quebec), and whether each case has one representative of record. Record scope decisions: write the Release 1 deferrals and the AG-17/CP-9 inclusion into the Founder Decisions Log, because the original scope rule treats anything not excluded as in scope.

16 Oct · Restricted-data fields: the exact personal fields encrypted one by one (passport and travel-document numbers, SIN, government IDs, bank details, biometric references, licence credentials), confirmed with privacy counsel. Accounts: Stripe, AWS (Canada), email sending domain, owned by Expat Ready. Pen tester: an independent security firm booked for 25 Jan to 5 Feb.

30 Oct · Plan tiers and CAD prices: what each plan includes, seat limits and prices, so subscription billing can be set up. Pilot firms: two or three real firms who will run real cases from January.

13 Nov · Canada pack content: program rules, scoring grids, reference tables, questionnaire sections, document checklists and the form list, supplied as data by the founder and an immigration expert.

11 Dec · Legal wording in English and French (retainer clauses, consent, disclaimers, terms) and the tax profile (GST/HST/QST by province; government fees not taxed).

15 Jan · Retention periods, breach-notification rules and consent and privacy-request rules, from counsel.

SCOPE NOTES. Launch minimum: SA-9 = a basic firm and revenue view; SA-10 = a support mailbox plus logged read-only support sessions. Advanced engagement scoring = automatic lead and client engagement scores; manual follow-up and stall flags stay. DORA targets except the 4-hour restore are proposals.

SOURCES. Founder's Drive requirement set captured 29 Sep 2026: Platform Foundation v1.3, Super Admin Console v1.4 (SA-1 to SA-4 superseded by newer module files), Agent Console v1.4, Client Portal v1.3, Founder Decisions Log v1.5; code inventory of the backend and frontend repositories.

---


---
## Section 5 - Appendix B: business configuration before go-live

### Goals

| # | Area | What is configured | Owner | Needed by |
| --- | --- | --- | --- | --- |
| 1 | Canada Country Pack | Programs and pathways · eligibility rules and CRS scoring · reference tables (NOC/TEER, CLB, proof of funds, fees) · SQR questionnaire sections and rules · document checklists · case stages and milestones · form list | Founder + immigration expert | v0 on staging 13 Nov · published 15 Jan |
| 2 | Canada Practice Pack | Regulator and licence rules · trust money rules · fee disclosure and complaints · e-signature rules · tax profile (GST/HST/QST) · retention, privacy and consent rules | Founder + counsel | 11 Dec · retention and privacy 15 Jan |
| 3 | Templates | Retainer agreements EN/FR · client emails and notices · invoices and receipts · the three plain notices · LMIA offer and regret letters | Founder + delivery | 11 Dec |
| 4 | Plans and billing | Plans, entitlements and seat limits · CAD prices · Stripe products and tax | Founder | 30 Oct |
| 5 | Roles and access | Role templates and permission values · platform users with MFA · support access rules · restricted personal-data list | Delivery | 30 Oct (data list 16 Oct) |
| 6 | Connected services | Stripe platform account in test mode · email sending domain · storage and backups · in-house e-signature settings | Founder + DevOps | 16 Oct |
| 7 | Legal and policy text | Terms of service · privacy notice · consent wording · disclaimers · firm subscription agreement · data processing agreement · sub-processor list, all EN/FR | Counsel | 11 Dec |
| 8 | Pilot firms | Profile, branding and licence record · staff accounts · each firm's Stripe account and offline payment instructions · client and case import · training | Delivery + pilots | 15 Jan |
| 9 | Test data and golden cases | Golden assessment cases per program · test clients for each golden journey | Founder + QA | 15 Jan |

### Speaker notes

Business deliverables are what the business must supply or set up; the team cannot finish testing without them. A firm cannot be created until the Country Pack and Practice Pack are published (SA-1-4, A22-6.6), which is why v0 packs reach staging by 13 Nov. Golden cases are sample clients with known correct answers, re-run after every change to prove advice has not shifted.

---


---
## Section 6 - Appendix C: the nine golden journeys

### Goals

- All nine must pass before Go/No-Go, in EN and FR, on desktop and phone.
- Proposed set, agreed with the team on 9 Oct. 
- Each journey also has negative cases (wrong input, interruption, no permission); portal steps are also checked by keyboard and screen reader. Everything else is covered by automated regression tests.


| # | Journey | What happens | What it proves | Planes |
| --- | --- | --- | --- | --- |
| 1 | Launch Canada | Author Country and Practice Packs, second-person approval, publish, activate Canada | Content is data; firms cannot start without published packs | Super Admin |
| 2 | Sell and bill a firm | Provision a firm on a plan, Stripe subscription with tax invoice, seat limit, failed payment, hold, recovery | Subscription billing and plan limits work | Super Admin |
| 3 | Firm ready to work | Licence, branding, payment account, staff with MFA, import clients and open cases, read-only support visit | A real firm can move in | Agent console |
| 4 | Enquiry to paid engagement | Web enquiry, duplicate check, explained assessment, consultation, retainer EN/FR, passcode signing, invoice, payment, case opened | The core revenue path (G2) | Agent + portal |
| 5 | Family case to decision | Principal, spouse and dependant intake, documents rejected and re-uploaded, review, filing recorded, milestones, decision, closure | Case delivery end to end | Agent + portal |
| 6 | Money and trust | Partial, offline and refunded payments, trust to operating with a reason, ledger and reconciliation, duplicate callbacks | Zero money variance | Agent + portal |
| 7 | Employer and LMIA | Employer case, recruitment evidence bundle, signed offer, worker hand-off, employer sees summaries only | LMIA path with no data leaks | Agent + portal |
| 8 | Privacy and rights | Consent withdrawn, data export, correction, deletion held by retention, human review of an automated result, breach logged | Privacy law obligations | All planes |
| 9 | Change and recovery | Rule update leaves open cases unchanged, interrupted signing or payment recovers once, staff removed, audit export verifies | Resilience and audit | All planes |

#### Speaker notes

Why nine and not seven: the earlier seven did not cover Super Admin (packs and subscription billing), the employer and LMIA path, privacy requests or trust money, so Go/No-Go could pass with those untested. Nine is enough for a launch decision because each journey crosses several modules and the full regression suite covers the rest. Journey 4 is the G2 proof; all nine must pass for G5 and G6.

---


---
## Section 7: G1 | Platform ready

### Goals

| Workstream | October requirement / status | Due date |
| --- | --- | --- |
| Foundation | Production environment live; Stripe test mode, email, storage, in-house e-signature | 15 Nov |
| Super Admin | 80% built: packs and configurator, firms, plans, roles, users, flags | 15 Nov |
| Agent console | 20% built: firm setup, data import, CRM | 15 Nov |
| Client portal | Designs signed off | 15 Nov |
| Business configuration | 30% complete: accounts, roles, plans and prices | 15 Nov |
| Testing | Test plan; golden journeys agreed; isolation tests on every new table | 15 Nov |
| Hardening and security | Restricted-data encryption in place | 15 Nov |
| Deployment and operations | CI on front and back end; fortnightly staging releases | 15 Nov |
| Commercial readiness | Prices set; 2–3 pilot firms signed | 15 Nov |



### Requirements


### SA Items
**Delay Tolerance** - minimal to none

| Module                          | Requirement Status | Due date |
| ------------------------------- | ------------------ | -------- |
| SA-1-A Country Pack             | ✅ Delivered        | 24 Sep   |
| SA-2 Firms                      | ✅ Delivered        | 24 Sep   |
| SA-3 Plans and entitlements     | ✅ Delivered        | 24 Sep   |
| SA-4 Subscription billing       | ✅ Delivered        | 24 Sep   |
| SA-1-B Practice Pack            | ⚠️ Pending         | 7 Oct    |
| SA-6 Roles and permissions      | ⚠️ Pending         | 7 Oct    |
| SA-7 Platform users             | ⚠️ Pending         | 7 Oct    |
| SA-5 Global templates           | ⚠️ Pending         | 14 Oct   |
| SA-8 Integrations               | ⚠️ Pending         | 14 Oct   |
| SA-9 Analytics (launch minimum) | ⚠️ Pending         | 14 Oct   |
| SA-10 Support (launch minimum)  | ⚠️ Pending         | 21 Oct   |
| SA-11 Audit and compliance      | ⚠️ Pending         | 21 Oct   |
| SA-12 Flags and configuration   | ⚠️ Pending         | 21 Oct   |

### AG Items
**Delay Tolerance** - 8 Days 

| Module                                | Requirement Status | Due date  |
| ------------------------------------- | ------------------ | --------- |
| AG-1 Firm setup                       | ⚠️ Pending         | 28 Oct    |
| AG-2 Lead management / CRM            | ⚠️ Pending         | 28 Oct    |
| AG-3 Pathway assessment               | ⚠️ Pending         | 28 Oct    |
| AG-4 Consultation booking             | ⚠️ Pending         | 4 Nov     |
| AG-5 Retainers and e-signature        | ⚠️ Pending         | 4 Nov     |
| AG-6 Billing and trust                | ⚠️ Pending         | 4 Nov     |
| AG-7 Case delivery                    | ⚠️ Pending         | 11 Nov    |
| AG-8 Smart questionnaire              | ⚠️ Pending         | 11 Nov    |
| AG-9 Documents                        | ⚠️ Pending         | 11 Nov    |
| AG-10 Communications                  | ⚠️ Pending         | 18 Nov    |
| AG-12 Templates                       | ⚠️ Pending         | 18 Nov    |
| AG-13 Tasks and audit trail           | ⚠️ Pending         | 18 Nov    |
| AG-14 Reporting                       | ⚠️ Pending         | 25 Nov    |
| AG-15 Portal management               | ⚠️ Pending         | 25 Nov    |
| AG-16 Firm settings                   | ⚠️ Pending         | 25 Nov    |
| **AG-17 Recruitment evidence (LMIA)** | ⚠️ Pending         | ~~2 Dec~~ |

### CP Items
**Delay Tolerance** - 2-3 Weeks

| Module                         | Requirement Status | Due date |
| ------------------------------ | ------------------ | -------- |
| CP-1 Secure access             | ⚠️ Pending         | 2 Dec    |
| CP-2 Progress and next action  | ⚠️ Pending         | 2 Dec    |
| CP-3 Intake questionnaire      | ⚠️ Pending         | 9 Dec    |
| CP-4 Evidence upload           | ⚠️ Pending         | 9 Dec    |
| CP-5 Payments                  | ⚠️ Pending         | 9 Dec    |
| CP-6 Signing                   | ⚠️ Pending         | 16 Dec   |
| CP-7 Messaging                 | ⚠️ Pending         | 16 Dec   |
| CP-8 Profile, consent, privacy | ⚠️ Pending         | 16 Dec   |
| CP-9 Employer view (read-only) | ⚠️ Pending         | 23 Dec   |



---

## Sprint Planning

### Planning rules

- Sprint length: two weeks
- Maximum load: three modules per week
- Working days: Monday through Saturday; Sundays skipped
- Sprint 1 starts Monday 5 Oct 2026
- Delivered before Sprint 1: SA-1-A Country Pack (SA-2 Firms, SA-3 Plans and entitlements and SA-4 Subscription billing have requirements delivered; build work is scheduled in Week 1)
- Week 1 is SA-4 Subscription billing plus the SA-3 / SA-2 backlog; all other modules follow one week later
- Pending modules are sequenced in the existing SA → AG → CP order. To be updated based on actual dependency blocking

### Sprint 1 · 5–17 Oct

| Week - 1 | Modules             | Q/A                       |
| -------- | ------------------- | ------------------------- |
| 5–10 Oct | SA-3 / SA-2 backlog | SA-4 Subscription billing |
| +        | Repo Maintainence   |                           |

| Week - 2  | Modules                      | Q/A                       |
| --------- | ---------------------------- | ------------------------- |
| 12–17 Oct | - SA-1-B Practice Pack !!!   | SA-4 Subscription billing |
| +         | - SA-7 Platform users        | SA-3 / SA-2 backlog       |
| +         | - SA-6 Roles and permissions |                           |

### Sprint 2 · 19–31 Oct

| Week - 3 | Modules | Q/A |
| --- | --- | --- |
| 19–24 Oct | - SA-5 Global templates | SA-1-B Practice Pack |
| + | - SA-8 Integrations | SA-7 Platform users |
| + | - SA-9 Analytics (launch minimum) | SA-6 Roles and permissions |

| Week - 4 | Modules | Q/A |
| --- | --- | --- |
| 26–31 Oct | - SA-10 Support (launch minimum) | SA-5 Global templates |
| + | - SA-11 Audit and compliance | SA-8 Integrations |
| + | - SA-12 Flags and configuration | SA-9 Analytics (launch minimum) |

### Sprint 3 · 2–14 Nov

| Week - 5 | Modules | Q/A |
| --- | --- | --- |
| 2–7 Nov | - AG-1 Firm setup | SA-10 Support (launch minimum) |
| + | - AG-2 Lead management / CRM | SA-11 Audit and compliance |
| + | - AG-3 Pathway assessment | SA-12 Flags and configuration |

| Week - 6 | Modules | Q/A |
| --- | --- | --- |
| 9–14 Nov | - AG-4 Consultation booking | AG-1 Firm setup |
| + | - AG-5 Retainers and e-signature | AG-2 Lead management / CRM |
| + | - AG-6 Billing and trust | AG-3 Pathway assessment |

### Sprint 4 · 16–28 Nov

| Week - 7 | Modules | Q/A |
| --- | --- | --- |
| 16–21 Nov | - AG-7 Case delivery | AG-4 Consultation booking |
| + | - AG-8 Smart questionnaire | AG-5 Retainers and e-signature |
| + | - AG-9 Documents | AG-6 Billing and trust |

| Week - 8 | Modules | Q/A |
| --- | --- | --- |
| 23–28 Nov | - AG-10 Communications | AG-7 Case delivery |
| + | - AG-12 Templates | AG-8 Smart questionnaire |
| + | - AG-13 Tasks and audit trail | AG-9 Documents |

### Sprint 5 · 30 Nov–12 Dec

| Week - 9 | Modules | Q/A |
| --- | --- | --- |
| 30 Nov–5 Dec | - AG-14 Reporting | AG-10 Communications |
| + | - AG-15 Portal management | AG-12 Templates |
| + | - AG-16 Firm settings | AG-13 Tasks and audit trail |

| Week - 10 | Modules | Q/A |
| --- | --- | --- |
| 7–12 Dec | - AG-17 Recruitment evidence (LMIA) | AG-14 Reporting |
| + | - CP-1 Secure access | AG-15 Portal management |
| + | - CP-2 Progress and next action | AG-16 Firm settings |

### Sprint 6 · 14–26 Dec

| Week - 11 | Modules | Q/A |
| --- | --- | --- |
| 14–19 Dec | - CP-3 Intake questionnaire | AG-17 Recruitment evidence (LMIA) |
| + | - CP-4 Evidence upload | CP-1 Secure access |
| + | - CP-5 Payments | CP-2 Progress and next action |

| Week - 12 | Modules | Q/A |
| --- | --- | --- |
| 21–26 Dec | - CP-6 Signing | CP-3 Intake questionnaire |
| + | - CP-7 Messaging | CP-4 Evidence upload |
| + | - CP-8 Profile, consent, privacy | CP-5 Payments |

### Sprint 7 · 28 Dec–9 Jan

| Week - 13 | Modules | Q/A |
| --- | --- | --- |
| 28 Dec–2 Jan | - CP-9 Employer view (read-only) | CP-6 Signing |
| + | | CP-7 Messaging |
| + | | CP-8 Profile, consent, privacy |



---
