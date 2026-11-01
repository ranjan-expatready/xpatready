# Program Charter_V2.pptx (slide text only)

Extracted from the binary Program Charter_V2.pptx; layout, images and charts are not kept.

## Slide 1
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
1 / 3
Release 1: immigration practice, connected
One platform for Canadian immigration firms and their clients.
All dates are working targets until the delivery team confirms them on 9 Oct 2026.
MARKET LAUNCH
12 th March 2027
Production release 4 March
LAUNCH OBJECTIVE    One firm. One client. Enquiry to filed case. No manual workaround.
THE CLIENT JOURNEY, END TO END   what a firm and its client can do on day one
1
Win
(Lead management · CRM)
Enquiry capture
Pipeline and follow-up
Conversion to client
2
Assess & advise
(Eligibility · consultation)
Pathway assessment
Explained result, human review
Consultation booking
3
Engage
(Retainer · e-signature)
Retainer agreement
Passcode e-signing
Signed evidence
4
Bill & collect
(Billing · payments · trust)
Invoices and tax
Online or offline payment
Trust ledger
5
Prepare & deliver
(Case management)
Smart questionnaire
Documents and review
Filing recorded, tracked
LMIA recruitment evidence
6
Client portal
(Client self-service)
Progress, next action
Upload, sign, pay
Messages, privacy requests
Employer view (read-only)
ACROSS EVERY STEP   Messaging  ·  tasks and reminders  ·  templates  ·  data import  ·  audit trail  ·  reports  ·  English and French  ·  accessible (WCAG 2.2 AA)
FOUR PLANES, BUILT IN THIS ORDER, GO LIVE TOGETHER   37 modules on one client record · full list in Appendix A
1
Foundation  platform
Security, data, Canadian hosting
Largely built · finish Oct
2
Super Admin  12 modules
Firms, packs, plans and billing
In build · finish Nov
3
Agent console  16 modules
Where the firm runs every case
Build Oct – Dec
4
Client portal  9 modules
Web portal, works on phone, EN/FR
Build Nov – Dec
BUSINESS CONFIGURATION   set up by the business alongside the build · checklist in Appendix B
Canada Country Pack
Programs and pathways · eligibility and CRS scoring · SQR questionnaire rules · checklists · stages · form list
Canada Practice Pack
Regulator, trust money, fees and complaints, retention, privacy, e-signature, tax
Firm setup
Templates EN/FR · plans and prices · roles · legal text · pilot firms and data import
NOT IN RELEASE 1   AI-assisted features  ·  Automation engine (AG-11) and its Doers  ·  Advanced engagement scoring     Earlier exclusions: Appendix A

## Slide 2
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
2 / 3
The path to 3rd March
Six gates, each passed on evidence, not effort. Programme started 15 Aug; build since 15 Sep. Dates are targets until 9 Oct.
AUG
SEP
OCT
NOV
DEC
JAN 2027
FEB
MAR
Plan · closed
Build · four planes in order, configuration alongside, continuous QA
Harden
Prove
Launch
Hypercare
G1
G2
G3
G4
G5
G6
Market 12 Mar
G1
Platform ready
15 Nov
PASSES WHEN
Foundation live in production environment; Super Admin 80% built; all remaining requirements and designs signed off.
EVIDENCE
Environment checklist, isolation tests, signed requirements
G2
Core journey
11 Dec
PASSES WHEN
A firm on v0 Canada packs takes a client from enquiry to paid retainer and open case, on real services in test mode.
EVIDENCE
Recorded demo, golden journey 4
G3
Feature complete
2 Jan
PASSES WHEN
All four planes built on staging, no mock screens; configuration 80% done; cut line applied if needed.
EVIDENCE
Requirement-to-test map, configuration checklist
G4
Release candidate
31 Jan
PASSES WHEN
Every requirement has a passing test; no critical or high defects; configuration complete; code frozen.
EVIDENCE
Regression, load and accessibility reports
G5
Business accepted
26 Feb
PASSES WHEN
Pilots run real cases; 9 of 9 golden journeys pass; legal sign-off; pen test highs fixed and retested.
EVIDENCE
Pilot sign-off, pen test report
G6
Go / No-Go
3 Mar
PASSES WHEN
All six quality gates below pass, under the decision rule.
EVIDENCE
Go/No-Go evidence pack
G6 GO / NO-GO QUALITY GATES   Ready means proven, not promised
100%  Security
isolation tests; pen test finds no leakage
9 / 9  Golden journeys
EN and FR, desktop and mobile; portal WCAG 2.2 AA
0  Money and advice
unexplained variance; golden cases match
0  Critical / high
defects open at Go/No-Go
80%  Coverage
of business-logic code; every requirement tested
4 h  Operations
restore; 15 min data loss; load test; rollback
Founder decides each gate on evidence from the dev lead, QA lead and business owner. Security, money and privacy are never waived; any other gate only in writing, with a fix date.
Critical = blocks a journey, loses data or money, or exposes personal data; high = major fault with a workaround. Shaded = holiday freeze 21 Dec – 1 Jan. Change control after G1; after G4 only founder-approved changes. Proposed date rule, decided at G3 and never in February: if G3 misses by more than a week, 28 Feb becomes a pilot-firm launch and public sale moves to 30 Apr.

## Slide 3
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
3 / 3
Back-plan: what must be true at each month end
Development, configuration, testing and operations move together. Use for resourcing; the team confirms targets on 9 Oct.
Track
Oct
Nov
Dec
Jan
Feb
Owner
Gates
G1  15 Nov  Platform ready
G2  11 Dec  Core journey
G3  2 Jan  Feature complete
G4  31 Jan  Release candidate
G5  26 Feb  Accepted · G6  3 Mar  Go/No-Go
1  Foundation
100% built; production environment live; Stripe test mode, email, storage; in-house e-sign
Fixes only
Fixes only
Hardened
Live 23 Feb
Dev lead
2  Super Admin
80% built: packs and configurator, firms, plans, roles, users, flags
100% built: subscription billing, templates, integrations, analytics, support, compliance
Fixes only
Hardened
Live 23 Feb
Dev lead
3  Agent console
20% built: firm setup, data import, CRM. Corporate Module
60% built: assessment, booking, retainer, billing, case record, questionnaire
100% built: documents, messaging, tasks, templates, reports, portal control, LMIA
Hardened
Live 23 Feb
Dev lead
4  Client portal
Designs signed off | Not Scoped
40% built: access, progress, intake, pay, sign
100% built: evidence, messages, privacy, employer view
Hardened
Live 23 Feb
Dev lead
Business configuration
30%: accounts, roles, plans and prices
45%: v0 Canada packs on staging (13 Nov)
80%: Practice Pack, templates, legal text EN/FR
100%: packs published; privacy rules; pilot firms set up
Signed off 12 Feb
Founder + business
Testing
Test plan; golden journeys agreed; isolation tests on every new table
Built work tested within 2 weeks; journey 4 passes
65% tested; journeys 1–4 pass
Every requirement tested; full regression; coverage 80%
Pilot acceptance; 9 of 9 journeys pass
QA lead
Hardening and security
Restricted-data encryption in place
Security review of each new module
Dependency and vulnerability scan clean
Load test; accessibility audit; pen test 25 Jan – 5 Feb
Pen test highs fixed and retested by 12 Feb
Dev lead + security
Deployment and operations
CI on front and back end; fortnightly staging releases
Staging releases rehearse deploy and rollback
Monitoring live; on-call named; holiday freeze 21 Dec – 1 Jan
4-hour restore drill; import rehearsal; cutover plan
Cutover rehearsal; production 23 Feb; hypercare March
DevOps
Commercial readiness
Prices set; 2–3 pilot firms signed
Demo and onboarding script
Help content drafted
Pilot onboarding and training
Help and support live; market launch 28 Feb
Founder
Built = running on staging against real services, no mock screens. Tested = its requirement tests pass. Starting point: Foundation largely built; Super Admin about 35% (team audit, 27 Aug); Agent console and portal mostly not started. Each month end the team returns the checkpoint in the program sheet.

## Slide 4
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
Appendix A
Appendix A: what goes live, and who owes what
Module IDs match the requirement documents the team already uses. Columns follow the build order.
1  Foundation  one client record · isolation · MFA · encryption · audit · EN/FR · Canadian hosting
2  Super Admin · 12
SA-1 Country and Practice Packs
SA-2 Firms
SA-3 Plans and entitlements
SA-4 Subscription billing
SA-5 Global templates
SA-6 Roles and permissions
SA-7 Platform users
SA-8 Integrations
SA-9 Analytics (launch minimum)
SA-10 Support (launch minimum)
SA-11 Audit and compliance
SA-12 Flags and configuration
3  Agent console · 16
AG-1 Firm setup
AG-2 Lead management / CRM
AG-3 Pathway assessment
AG-4 Consultation booking
AG-5 Retainers and e-signature
AG-6 Billing and trust
AG-7 Case delivery
AG-8 Smart questionnaire
AG-9 Documents
AG-10 Communications
AG-12 Templates
AG-13 Tasks and audit trail
AG-14 Reporting
AG-15 Portal management
AG-16 Firm settings
AG-17 Recruitment evidence (LMIA)
4  Client portal · 9
CP-1 Secure access
CP-2 Progress and next action
CP-3 Intake questionnaire
CP-4 Evidence upload
CP-5 Payments
CP-6 Signing
CP-7 Messaging
CP-8 Profile, consent, privacy
CP-9 Employer view (read-only)
Deferred: AI-assisted features · AG-11 automation engine and its Doers · advanced engagement scoring. Already out by earlier decisions: government form auto-fill, Quebec programs, SMS and WhatsApp, single sign-on, credit notes.
THE ASKS
Delivery team
9 Oct: confirm the back-plan against measured speed; map sprints to its rows; owners, estimates, capacity, holidays, risks.
Every month end: return the checkpoint (built, tested, configured, defects, people).
9 Oct
Founder
PNP streams; representative model; scope log
16 Oct
Founder + counsel
Restricted-data fields; accounts; pen tester
30 Oct
Founder
Plan tiers and CAD prices; 2–3 pilot firms
13 Nov
Founder + expert
Canada pack content
11 Dec
Founder + counsel
Legal text EN/FR; tax profile
15 Jan
Counsel
Retention, breach and consent rules
DELIVERY HEALTH (DORA) · PROPOSED
Staging deploys fortnightly or faster · change lead time under 1 week · change failure rate under 15% · restore within 4 hours

## Slide 5
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
Appendix B
Appendix B: business configuration before go-live
Business deliverables. Configured while the team builds; complete by G4 (15 Jan) unless shown otherwise.
#
Area
What is configured
Owner
Needed by
1
Canada Country Pack
Programs and pathways · eligibility rules and CRS scoring · reference tables (NOC/TEER, CLB, proof of funds, fees) · SQR questionnaire sections and rules · document checklists · case stages and milestones · form list
Founder + immigration expert
v0 on staging 13 Nov · published 15 Jan
2
Canada Practice Pack
Regulator and licence rules · trust money rules · fee disclosure and complaints · e-signature rules · tax profile (GST/HST/QST) · retention, privacy and consent rules
Founder + counsel
11 Dec · retention and privacy 15 Jan
3
Templates
Retainer agreements EN/FR · client emails and notices · invoices and receipts · the three plain notices · LMIA offer and regret letters
Founder + delivery
11 Dec
4
Plans and billing
Plans, entitlements and seat limits · CAD prices · Stripe products and tax
Founder
30 Oct
5
Roles and access
Role templates and permission values · platform users with MFA · support access rules · restricted personal-data list
Delivery
30 Oct (data list 16 Oct)
6
Connected services
Stripe platform account in test mode · email sending domain · storage and backups · in-house e-signature settings
Founder + DevOps
16 Oct
7
Legal and policy text
Terms of service · privacy notice · consent wording · disclaimers · firm subscription agreement · data processing agreement · sub-processor list, all EN/FR
Counsel
11 Dec
8
Pilot firms
Profile, branding and licence record · staff accounts · each firm's Stripe account and offline payment instructions · client and case import · training
Delivery + pilots
15 Jan
9
Test data and golden cases
Golden assessment cases per program · test clients for each golden journey
Founder + QA
15 Jan
Owners and status are tracked in the program sheet, Business configuration tab. Help and support content sits under commercial readiness.

## Slide 6
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
Appendix C
Appendix C: the nine golden journeys
All nine must pass before Go/No-Go, in EN and FR, on desktop and phone.
#
Journey
What happens
What it proves
Planes
1
Launch Canada
Author Country and Practice Packs, second-person approval, publish, activate Canada
Content is data; firms cannot start without published packs
Super Admin
2
Sell and bill a firm
Provision a firm on a plan, Stripe subscription with tax invoice, seat limit, failed payment, hold, recovery
Subscription billing and plan limits work
Super Admin
3
Firm ready to work
Licence, branding, payment account, staff with MFA, import clients and open cases, read-only support visit
A real firm can move in
Agent console
4
Enquiry to paid engagement
Web enquiry, duplicate check, explained assessment, consultation, retainer EN/FR, passcode signing, invoice, payment, case opened
The core revenue path (G2)
Agent + portal
5
Family case to decision
Principal, spouse and dependant intake, documents rejected and re-uploaded, review, filing recorded, milestones, decision, closure
Case delivery end to end
Agent + portal
6
Money and trust
Partial, offline and refunded payments, trust to operating with a reason, ledger and reconciliation, duplicate callbacks
Zero money variance
Agent + portal
7
Employer and LMIA
Employer case, recruitment evidence bundle, signed offer, worker hand-off, employer sees summaries only
LMIA path with no data leaks
Agent + portal
8
Privacy and rights
Consent withdrawn, data export, correction, deletion held by retention, human review of an automated result, breach logged
Privacy law obligations
All planes
9
Change and recovery
Rule update leaves open cases unchanged, interrupted signing or payment recovers once, staff removed, audit export verifies
Resilience and audit
All planes
Proposed set, agreed with the team on 9 Oct. Each journey also has negative cases (wrong input, interruption, no permission); portal steps are also checked by keyboard and screen reader. Everything else is covered by automated regression tests.

## Slide 7
EXPAT READY
RELEASE 1  /  PRODUCT & LAUNCH PLAN  /  v6
Appendix D: Requirements 
#
SA Module
Status
1
SA-1-A Country Pack
✅ Delivered
2
SA-2 Firms
✅ Delivered
3
SA-3 Plans and entitlements
✅ Delivered
4
SA-4 Subscription billing
✅ Delivered
5
SA-1-B Practice Pack
⚠️ Pending
6
SA-6 Roles and permissions
✅ Delivered
7
SA-7 Platform users
✅ Delivered
8a
SA-5 System templates
✅ Delivered
8b
SA-5 Firm templates
⚠️ Pending
9
SA-8 Integrations
✅ Delivered
10
SA-10 Support (launch minimum)
✅ Delivered
11
SA-11 Audit and compliance
✅ Delivered
12
SA-12 Flags and configuration
✅ Delivered
#
Agent Modules
Status
1
AG-1 Firm setup
✅ Delivered
2
AG-2 Lead management / CRM
⚠️ Pending
3
AG-3 Pathway assessment
⚠️ Pending
4
AG-4 Consultation booking
⚠️ Pending
5
AG-5 Retainers and e-signature
⚠️ Pending
6
AG-6 Billing and trust
⚠️ Pending
7
AG-7 Case delivery
✅ Delivered
8
AG-8 Smart questionnaire
⚠️ Pending
9
AG-9 Documents
⚠️ Pending
10
AG-10 Communications
⚠️ Pending
11
AG-12 Templates
⚠️ Pending
12
AG-13 Tasks and audit trail
⚠️ Pending
13
AG-14 Reporting
⚠️ Pending
14
AG-15 Portal management
⚠️ Pending
15
AG-16 Firm settings
⚠️ Pending
16
AG-17 Recruitment evidence (LMIA)
✅ Delivered
#
Client Module
Status
1
CP-1 Secure access
⚠️ Pending
2
CP-2 Progress and next action
⚠️ Pending
3
CP-3 Intake questionnaire
⚠️ Pending
4
CP-4 Evidence upload
⚠️ Pending
5
CP-5 Payments
⚠️ Pending
6
CP-6 Signing
⚠️ Pending
7
CP-7 Messaging
⚠️ Pending
8
CP-8 Profile, consent, privacy
⚠️ Pending
9
CP-9 Employer view (read-only)
⚠️ Pending
