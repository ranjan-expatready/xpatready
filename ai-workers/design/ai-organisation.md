# The AI organisation of an Expat Ready firm, in business terms (Step 1)

**Author:** ai-worker-designer (maker). **Date:** 10 Oct 2026. **Status:** Proposal for the adversarial checker, the Lead and Ranjan. **Companion page:** `../visual/ai-organisation.html` (same content, for showing on screen).

**What this is.** The first of three layers (AIW-D28). It turns the 28 AI Workers in `workers/catalogue.md` into a small set of **AI personas**: each one an assistant to one human role in the firm, with a job, a list of duties, a list of things it never does, a named approver, hours saved (Assumption) and a charge unit (Assumption). Step 2 writes one behaviour document per persona; Step 3 writes the build specification.

**Who it is for.** Ranjan, to "sell and tell" to licensed immigration consultants, his own team and investors (AIW-D28). It is written in plain English; any term that cannot be avoided is explained where it first appears and again in the glossary (§8).

**Rules this file follows.** Nothing is restated: every product fact is a pointer to its requirement by ID, file and version in `sources/drive-snapshot-2026-10-09/`, or to a catalogue entry (W-nn) or improvement item (IMP-nn) that already carries the citation (AIW-D22). Everything that is not a product fact is labelled **Proposal**, **Assumption** or **Unknown**. Where the catalogue and `ws2-improvements.md` differ, the improvements win (review B-1). Everything in the documents is treated as built or to be built (AIW-D21); where a buyer should be told that something is "Specified, not built", the card says so.

**Sources.** `workers/catalogue.md` (28 entries, revised 9 Oct), `workers/module-map.md`, `ws2-improvements.md` (IMP-1 to IMP-41), `../assumptions.md`, `../decisions.md` (AIW-D13 to D30), `../commercial/price-card.md`, `../commercial/provider-and-cost.md`; the Drive snapshot of 9 Oct 2026 (AG-01 v1.16, AG-11 v1.11, AG-13 v1.12, AG-16 v1.12, SA-06 v3.1, SA-11 v2.7, SA-12 v2.7, Overview v1.11, Founder Decisions Log v1.5); the team's Product Vision v1.0 (frozen 2 Aug 2026; cited as "Product Vision v1.0 (team), section n"; where it differs from an October FR file, the FR file wins).

---

## 0. The idea in five lines

1. Expat Ready is built for people: every action has a permission, every message has a template or an approval, every rule comes from a published Country Pack (the rulebook for a destination country; FD-22, Founder Decisions Log v1.5).
2. An **AI persona** is an assistant to one of those people. It does the same work, through the same product, under that person's own permissions, and it stops where a named person approves (AIW-D13, AIW-D26).
3. There is no AI user. FD-16 (Founder Decisions Log v1.5): "no AI principal in the identity spine, no autonomous permissions", and "Marketing may say 'AI-assisted'; it may not say the AI decides." The team's own Product Vision says the same in four words: "AI assists; humans decide" (Product Vision v1.0 (team), section 00).
4. Five personas serve the firm; two serve Expat Ready's own team (§1). Together they carry all 28 workers in the catalogue (§3).
5. Nothing is built yet. Every "hours saved" figure is an Assumption until the pilot (AIW-A6); every price is an Assumption until the Step 5 conversations.

---

## 1. The AI organisation chart (one screen)

### 1.1 How to read it

Each persona is drawn **beside** the human role it assists, never above it or in its place. The human role names are the firm's own (SA-06 v3.1 §3.3: the six starter roles seeded in every firm; AG-01 v1.16 §2 and §3.3; Product Vision v1.0 (team), section 06 "Actors & Personas"). Where the Product Vision's older role list differs from the October files, the October file wins: the Product Vision lists a "Licensed Practitioner / Representative of Record" role and a "Sales / Intake Rep" role; SA-06 v3.1 withdrew both as role templates (SA6-D2, SA6-D5). In the product today a licensed person is "a person, not a role" (SA6-D9) and an intake job is "a custom role the firm makes by copying a starter role and editing the copy" (AG-01 v1.16 §3.3; "An Intake job is not a starter role", SA-06 v3.1 §3.3). The chart uses the October names.

### 1.2 The firm (the customer)

| Human role (the firm's own) | What the role does, in the product's words | AI persona beside it | Catalogue workers it bundles |
|---|---|---|---|
| **Owner** and **Admin** (SA-06 v3.1 §3.3: "Everything, including the five Owner-only actions"; "All firm administration except the five Owner-only actions") | Stands the firm up, owns its compliance posture, switches capabilities on (AG-01 v1.16 §2; Product Vision v1.0 (team), section 06 "Firm Owner / Principal") | **Firm assistant** (§2.4) | W-02, W-14, W-15, W-16, W-18 |
| **Case Manager** (SA-06 v3.1 §3.3: "Cases only — runs and signs off case work"; holds the four professional approvals by default, SA6-D2) | Operational leadership of cases; the default approver of reviews, forms, waivers and retainers (SA-06 v3.1 §3.3) | **Firm assistant** (shared with the Owner, §2.4); approves what the Case assistant prepares | — |
| **Case Officer** (SA-06 v3.1 §3.3: "Prepares case work. No sign-off by default") | Post-conversion delivery on their own cases: "questionnaire, documents, form-filling, workflow and client comms" (Product Vision v1.0 (team), section 06 "Case Officer / Paralegal") | **Case assistant** (§2.1) | W-25 = W-01, W-03, W-04, W-05, W-06, W-07, W-08, W-13, W-17 |
| **Intake** (a custom role the firm copies from a starter role, AG-01 v1.16 §3.3; SA-06 v3.1 §3.3; AG-01 v1.16 §2 "a part-time intake person who can see leads but not money") | Top of the funnel: leads, calls, sequences, conversion (Product Vision v1.0 (team), section 06 "Sales / Intake Rep", role withdrawn as a template in SA-06 v3.1) | **Intake assistant** (§2.2) | W-26 = W-09, W-10, W-11 |
| **Billing / Finance** (SA-06 v3.1 §3.3: "Firm billing and payments") | The money edge: invoices, payments, reporting currency (Product Vision v1.0 (team), section 06 "Billing / Finance (Accountant)") | **Billing assistant** (§2.3) | W-27 = W-12 |
| **The licensed person** (a person with a regulator credential on their profile, SA6-D9; AG-01 v1.16 §3.5) | By default approves AI-written client text (AG-11 v1.11 AG11-D11(a); AG-16 v1.12 §3.9 "Who may approve AI-written client text") and is marked "preferred" for professional approvals (AG-11-89) | No persona of its own: every persona's client-facing output ends at this person, or at whoever the firm's settings allow (AIW-D26) | — |
| **Reviewer / Approver** ("a permission pair … not a headcount", Product Vision v1.0 (team), section 06; `agent/case:review-approve` seeded on Owner and Case Manager, SA6-D2) | The second pair of eyes before a file leaves the firm | No persona: the Case assistant's readiness report lands here | — |
| **Every staff role**, within its own permissions | Asks questions about files, rules and what is waiting | **Practice expert** (§2.5): answers only, never acts (AIW-D25) | W-24 |
| **Read-only** (SA-06 v3.1 §3.3: "Sees, never changes") | Observes | No persona: the role holds no write permission, so there is nothing to prepare | — |
| **The client** (portal) | Fills, uploads, pays, signs, messages (Product Vision v1.0 (team), section 06 "Client Portal Actors") | **No persona faces the client** (AIW-D11). The client sees only output a named person approved (`workers/module-map.md` §2) | — |

### 1.3 Expat Ready's own team (the platform)

Shown apart because these personas serve Expat Ready, not the firm, and never touch a client (catalogue §2.5).

| Human role (SA-07 v2.10 Appendix A; Product Vision v1.0 (team), section 06 "SuperAdmin Actors") | AI persona beside it | Catalogue workers it bundles |
|---|---|---|
| **Content author** and **Content approver** (the two-person publishing rule, SA-01 v2.2 §3.12) | **Pack author's assistant** (§2.6) | W-28 = W-19, W-20, W-21 |
| **Support** and **Account manager** (SA-10 v2.5; SA-02 v2.19 §3.6) | **Support and account assistant** (§2.7) | W-22, W-23 |
| **Platform Owner**, **Platform engineer**, **Billing-Ops**, **Compliance / DPO**, **Auditor** | No persona: these roles record the AI provider, trip the emergency stop, change plans and flags, and read the audit spine; the hard limits keep every persona out of them (IMP-27; `workers/module-map.md` §3) | — |

### 1.4 Four facts that hold for every persona

- **Works under one named person's delegation** (IMP-1, Proposal; `../assumptions.md` AIW-A2): the record says which worker, for which person, which subset of that person's permissions, on which files, from when until when. It takes no seat (AIW-A7). The person can end it at any time.
- **Stops at a named person's approval** (AIW-D26): the approver is whoever the firm's own settings allow for that role, licensed by default (AG-11 v1.11 AG11-D11; AG-16 v1.12 §3.9). We never claim product-enforced licensed sign-off (`../README.md` §5).
- **Is a recipe, not a model with hands** (IMP-10, Proposal): the product's own automation engine runs it as an ordered list of product actions; the AI inside proposes values, never chooses actions (AG-11 v1.11 AG-11-94).
- **Is an "assistant to the role", never a user** (AIW-D27; FD-16).

---

## 2. One card per persona

Each card has the same ten fields. "What it does" lines point to the catalogue entry (W-nn) and the requirement it builds on; the catalogue entry carries the full citation and is not repeated here. "Who approves" names the existing permission key or firm setting that governs the same action done by hand (catalogue §1.3; `../proposals.md` rule row of 9 Oct). Hours saved and charge unit are Assumptions with the reasoning shown.

### 2.1 Case assistant (assistant to the Case Officer)

- **Catalogue identity:** W-25 "AI Case Processor" (role twin), with three duties added (W-05, W-06, W-13; see the note under "Bundles").
- **Job in one sentence:** prepares every case officer's files from retainer signed to ready for review, reads what arrives, drafts what goes out, and hands the officer and the reviewer a file where every value shows its source.
- **What it does (each line builds on a catalogue entry; nothing is restated):**
  1. Builds the file from `envelope.signed` to a readiness report: chases documents, reads them, proposes questionnaire values, cross-checks facts, keeps the checklist current (W-01; the officer's loop in AG-07 v2.7 §3.4, AG-08 v1.7 §3.8, AG-09 v1.8 §3.8 to §3.9; recipes in AG-11 v1.11 §3.5).
  2. Checks each upload on arrival and drafts the accept or reject reason in the client's language (W-04; AG-09 v1.8 §3.8 to §3.9; Doc4 v1.3 CP-4 §3.5).
  3. Files every inbound email and WhatsApp on the right record and hands attachments to the Reader for typing (W-07; AG-10 v1.9 §3.2, §3.5; IMP-12).
  4. When a government letter arrives, proposes the milestone, the deadline, the task, a client notice and a response plan (W-03; AG-07 v2.7 §3.7).
  5. Drafts the firm's free-text client words in the client's language, and the French of non-legal template text (W-08; AG-10 v1.9 §3.3; AG-12 v1.2 §3.6; SA-05 v2.2 §3.5).
  6. Assembles the form set and fills every box from verified values only, flags what is unmapped or unverified, routes four-eyes (W-05; AG-07 v2.7 §3.5; SA-01B v1.2 §3.5). AI stays out of the fill path by rule (SA1B-D16; IMP-25).
  7. Drafts letters of explanation, submission letters and procedural-fairness responses with a "facts used" footer (W-06; AG-10-15; SA-01B v1.2 §3.9).
  8. On a corporate (LMIA) file: reads advertising proof, builds the candidate log from staff entries, proposes the duties comparison, drafts the recruitment report and prepares the inspection-pack list (W-13; AG-17 v0.5 §3.4 to §3.8). Never screens or ranks candidates (FD-7).
  9. Writes an internal pickup summary per file, a leaver's handover list and each person's ranked day (W-17; AG-13 v1.12 §3.4; AG-07 v2.7 §3.8).
- **What it never does:** the hard limits (IMP-27) and the blocked list (IMP-23), both Proposal for Ranjan to ratify, summarised in the catalogue as G16: never deletes, never makes a billing, payment, refund or trust entry, never exports, never changes users, roles, settings or switches, never signs, never holds a professional approval, never moves a case stage, never creates a lead from an unknown number, never sends free text to a client, never edits a delegation. Specific to this persona: never submits anything to a government authority (AG-11 v1.11 AG-11-54; catalogue G5); never verifies a value (AG-09 v1.8 §3.9; approving a Reader value is the verification and needs `agent/sqr:verify`, AG11-D10); never fills a form with AI (SA1B-D16); never types into a government portal until counsel answers IMP-40; worker-sent client messages use firm-confirmed templates only, and any template the firm marks as carrying status content defaults to "ask me first" (catalogue G17; IMP-28(c)).
- **Who approves (the existing key or setting for the same act by hand):** readiness report and internal review: `agent/case:review-approve` (AG-07 v2.7 §3.6; Owner and Case Manager by default, SA6-D2). Values: `agent/sqr:verify` (AG11-D11(e)). Upload verdicts: `agent/case:document-manage`. Filed messages: `agent/communication:resolve-unmatched`. Forms: `agent/case:form-approve` (AG11-D8). Recorded decisions: `agent/case:record-decision`. Any client-facing text: the firm's "Who may approve AI-written client text" setting (AG-16 v1.12 §3.9; AG11-D11(a)); template chases at the recipe's autonomy setting (AG-16-36). Template French: `agent/template:publish` (AG-12 v1.2 §3.7). The internal summaries (W-17): the reader; no approval. Four-eyes: the officer the persona worked for counts as the preparer, so neither the persona nor that officer approves what it prepared (IMP-1, Proposal; AG-7-65). Per AIW-D26 the firm's role settings decide who the person is.
- **Where it sits:** beside the Case Officer (SA-06 v3.1 §3.3), working for one named officer per delegation (IMP-22 rule 6: several officers means several delegations, never a shared "AI case officer").
- **Bundles:** W-01, W-03, W-04, W-05, W-06, W-07, W-08, W-13, W-17. The catalogue's W-25 bundle is W-01, W-03, W-04, W-07, W-08, W-17; this card adds W-05, W-06 and W-13 (**Proposal**) because the Product Vision's Case Officer persona includes "form-filling" and "corporate recruitment campaigns" (Product Vision v1.0 (team), section 06) and W-06's letters are prepared from the same case data for the representative who approves them. The three keep their own approval points and status flags.
- **Hours saved (Assumption until the pilot, AIW-A6):** per prepared file, 1 / 3 / 6 hours of assistant work (low / typical / high) is the scenario in `../commercial/provider-and-cost.md` §3.6, every input an Assumption; the reviewer's minutes come off that and are "the real cost, not yet measured" (catalogue §1.5; provider-and-cost U8). Reasoning for a weekly figure: at 10 files a month (the middle volume on the price card) that is about 2 to 14 hours a week before review time. Letters, briefs and corporate files: Unknown; the Step 4 pilot measures them (IMP-29 "time saved").
- **Charge unit (Assumption; Step 5 tests it):** the three options on `../commercial/price-card.md` page 2: (a) CAD 25 to 40 per prepared file; (b) an allowance of 10 prepared files inside the Practice plan, then CAD 25 to 40 per file; (c) CAD 199 per persona per month with a 20-file cap. Our cost floor per prepared file: CAD 0.37 / 2.24 / 14.38 (low / typical / high, mid-tier model; `provider-and-cost.md` §3.4, every input a ranged Assumption). A "prepared file" is a run whose readiness report a person approved (IMP-18, Proposal). Note: the catalogue prices the twin "through W-01, not per twin" (W-25 "Value") and AIW-A7 says a twin is "charged by work done"; option (c) sits against that (§7, decision 3).
- **What a buyer should be told today (status from the catalogue, AIW-D21 applies to the design, not to the sales conversation):** the case records this persona works on are "Specified, not built" (catalogue D7); the Canada pack content it reads is not yet authored (D2); the four AI Doers are "built but switched off" (D10); the form duty (W-05) is blocked by the IRCC form format the built engine refuses (SA-01B v1.2 §12) and its release is undecided (catalogue §4). The Letter Reader and corporate duties also wait on the Minder (D5).
- **Regulatory flags (confirm with counsel / RCIC):** the advice boundary of readiness reports, response plans and letters; the Federal Court's declaration rule for AI content in filed material (`../research/field-scan.md` §6 item 9); ESDC record-keeping periods for LMIA files; portal filling (IMP-40); whether firm-set approvers meet supervision rules (IMP-15, IMP-17).

### 2.2 Intake assistant (assistant to the intake role)

- **Catalogue identity:** W-26 "AI Intake Clerk" (role twin).
- **Job in one sentence:** answers every enquiry fast with a consented, eligibility-grounded message, asks only what is missing, books the consultation and hands the host a complete profile and a drafted proposal.
- **What it does:**
  1. Answers an enquiry in minutes with a consented message, books the consult, recovers no-shows and cold leads, tells the rep the next move (W-10; AG-02 v1.9 §3.6 to §3.7, §3.13; AG-04 v1.5 §3.8).
  2. Lists missing facts, drafts targeted questions, and proposes questionnaire answers from a client's free-text reply, for staff to approve (W-09; AG-03 v1.4 §3.1; AG-08 v1.7 §3.4, §3.11).
  3. With consent, transcribes or reads the consult and drafts the consult record and proposal scope for the host (W-11; AG-04 v1.5 §3.12; AG-05 v1.9 §3.1 to §3.3).
  4. Calls on the Case assistant's inbox filing (W-07) for lead messages; W-07 is counted once, under the Case assistant.
- **What it never does:** the hard limits and blocked list (IMP-27, IMP-23; catalogue G16). Specific: never converts a lead (AG-2-47); never creates a lead from an unknown number (AG-10-58; AG11-D18(b)); never overrides, reviews or shares an eligibility result (AG-03 v1.4 §10); never sends a marketing message without express consent checked at send time (AG-11 v1.11 §3.10; AG-02 BR-9; catalogue G8); never promises an outcome (AG-02 BR-10; catalogue G13); never records a consult without the consent gate (AG-02 v1.9 §3.12).
- **Who approves:** the rep, under `agent/prospect:*` for pipeline moves and `agent/booking:*` for bookings (catalogue W-26 "New"); the firm's AI-text setting for any lead message (AG11-D11(a)); `agent/sqr:verify` for proposed answers (AG-8-44 pattern); AG-3-38 for any shared summary; the host for the consult record; AG-5-17 approval-for-send for the proposal.
- **Where it sits:** beside the firm's intake role (a custom role copied from a starter role, AG-01 v1.16 §3.3; SA-06 v3.1 §3.3), one named rep per delegation; in a solo firm, beside the Owner wearing that hat.
- **Bundles:** W-09, W-10, W-11 (W-07 shared, counted under the Case assistant).
- **Hours saved (Assumption):** Unknown volume; no source gives enquiries per week for the beachhead firm (FD-19: solo and small, 1 to 5 people). Reasoning for an illustrative figure: if a rep spends 15 to 30 minutes per enquiry on first reply, qualification and booking, 20 enquiries a week is 5 to 10 hours. The Step 5 conversations ask the real number; the pilot measures it.
- **Charge unit (Assumption):** inside the plan, or CAD 199 per persona per month (price-card option (c) pattern: "Later workers … would each carry their own monthly price: not on this card"). No cost floor has been computed for this persona; its model calls are "one per personalised message, one per client message read, transcription minutes" (catalogue W-26 "Cost drivers").
- **What a buyer should be told today:** the recipes and Needs you queue it runs on are "Specified" (catalogue D11); the delegation record is Proposed (D3); the consult reminders are "not delivered in today's code" (AG-04 v1.5 §12 per catalogue W-11); a second, speech provider with Canada-only terms is needed for transcription (W-11 "Dependencies").
- **Regulatory flags (confirm with counsel / RCIC):** the CASL class of each message (transactional or marketing); pre-retainer questions as advice; recording consent and storage.

### 2.3 Billing assistant (assistant to Billing / Finance)

- **Catalogue identity:** W-27 "AI Billing Clerk" (role twin).
- **Job in one sentence:** prepares invoice drafts, proposes payment matches, lists unbilled work and drafts reminders; money is only ever moved by a person.
- **What it does:**
  1. Proposes matches for offline payments, lists billable but unbilled work, drafts overdue reminders, and prepares an internal list of trust-tagged items for the person who runs the accountant's export (W-12; AG-06 v1.7 §3.2, §3.4, §3.5; AG-13 v1.12 §3.6).
  2. Drafts invoices from milestones, time and government fees for the Billing user to issue (W-27 "Job"; AG-06 v1.7 §3.1; AG-05 v1.9 §3.11).
  3. Reads the money section of the weekly report (W-18, counted under the Firm assistant) to draft the aged-receivables note (W-27 "Job").
- **What it never does:** the hard limits and blocked list (IMP-27, IMP-23). Specific: never issues an invoice on its own, never records a payment, never refunds, never writes a trust entry, never runs an export (AG-06 v1.7 BR-11, BR-2; catalogue G16); client wording only through the AI-text setting or a transactional template (catalogue G17).
- **Who approves:** the Billing user's own issue and record-payment keys (AG-06 v1.7 §9); the export by its permission holder; client wording by the AI-text setting (AG11-D11(a)).
- **Where it sits:** beside Billing / Finance (SA-06 v3.1 §3.3), one named Billing user per delegation; the Owner for firm-wide money questions (catalogue W-27 "Works for").
- **Bundles:** W-12.
- **Hours saved (Assumption):** Unknown; no source measures billing time, and the catalogue marks this use case "Unknown in this niche" (W-12 "Who has solved it"). Reasoning for an illustrative figure: a firm issuing 20 invoices a month and matching e-transfers by hand (the failures AG-06 v1.7 §1 names) might spend 1 to 3 hours a week on matching and chasing. The pilot measures it.
- **Charge unit (Assumption):** inside the plan, or per persona per month (option (c) pattern); the catalogue calls it "the twin a solo practitioner may switch on first". Cost drivers: "one call per unmatched line and per draft; low" (catalogue W-27). No cost floor computed.
- **What a buyer should be told today:** the online payment rail is "Specified, 'effectively NEW'" (AG-06 v1.7 §12 per catalogue); the trust posture is open (`../proposals.md`, carve-out B trust row; FD-17 vs AG-06); refunds are Phase 2 (AG-6-23).
- **Regulatory flags (confirm with counsel / RCIC):** trust-money handling under the Practice Pack (FD-17, FD-22).

### 2.4 Firm assistant (assistant to the Owner and the Case Manager)

- **Catalogue identity:** **Proposal**: a new grouping, not a catalogue twin. It bundles the five firm-wide workers whose "Works for" line names the Owner, the Admin or the Case Manager, so that oversight, renewals, migration, privacy requests and the weekly numbers sit with one assistant to the people who run the firm.
- **Job in one sentence:** watches every deadline on every file, finds each client's next immigration moment, brings an old practice's files across, keeps privacy requests on their legal clock and explains the week's numbers, all as drafts and lists for the Owner or Case Manager to act on.
- **What it does:**
  1. Watches every government, document and status deadline on every file; nudges the right person with a firm-confirmed template; escalates when the firm chose that; flags a slipping date (W-02 "Deadline Guardian", the hook; AG-11 v1.11 §3.4 Minder; AG-07 v2.7 §3.3; Doc4 v1.3 CP-4 §3.6; escalation and at-risk marks are Team safeguards parts, AG-16 v1.12 §3.8, §3.10).
  2. Computes each client's next immigration moment from pack rules (permit expiry, PR card, citizenship, residency obligation), drafts the consented re-engagement, and opens an opportunity only when a person clicks (W-14; AG-02 v1.9 §3.10 to §3.11; AG-07 v2.7 §3.7, §3.10).
  3. Proposes column, value and program mappings for a migrated practice, pulls key dates from legacy notes, files old documents and hands the Owner a dry-run (W-15; AG-18 v1.2 §3.2, §3.5, §3.6).
  4. Logs each access, correction, erasure or consent-withdrawal request on its clock, prepares an internal draft of the response and a checklist of what the law stops, reminds before the deadline (W-16; Doc4 v1.3 CP-8 §3.2, §3.5, §3.6; SA-11 v2.7 §3.8).
  5. Writes a weekly plain-language note from the dashboards, quoting only computed numbers (W-18; AG-14 v1.10 §3.1 to §3.5, §3.9).
- **What it never does:** the hard limits and blocked list (IMP-27, IMP-23). Specific: never imports (a person confirms after the dry-run, AG-18 v1.2 BR-1; AG-18-49); never runs the privacy export or the deletion (Owner-only, SA-06 v3.1 §3.3; catalogue W-16); never exports a report (AG-14 BR-12; G16); never converts a re-engagement into an opportunity (AG-2-47); never sends a re-engagement without consent (CASL class open, `../proposals.md` lifecycle row); never computes a deadline itself: dates come from the Minder and the pack (catalogue G10).
- **Who approves:** each extracted deadline: the file owner (AG-9-51); template reminders: the recipe's autonomy setting (AG-16-36), status-content templates defaulting to "ask me first" (IMP-28(c)); escalation: Team safeguards (AG-16 v1.12 §3.10, Owner only to switch off); re-engagement text: the AI-text setting, and the Owner switches the recipe on (catalogue W-14); migration: the Owner's attestation and confirm (AG-18-49); privacy requests: the Owner (export is one of the five Owner-only actions, SA-06 v3.1 §3.3); the weekly note: the schedule owner (catalogue W-18).
- **Where it sits:** beside the Owner (and Admin) and the Case Manager, one named person per delegation; reminders reach the file owners, oversight stays with the managers.
- **Bundles:** W-02, W-14, W-15, W-16, W-18.
- **Hours saved (Assumption):** mostly risk and revenue rather than hours. Deadline watching: the value is record-keeping ("the firm can show when it reminded whom", catalogue W-02 "Value") and avoided misses, hours small; Lifecycle: repeat revenue at low acquisition cost (W-14 "Value", Assumption). Migration: a one-time saving per practice, Unknown. Privacy requests: low frequency, high consequence (W-16). The weekly note: minutes. Reasoning: none of these is a daily loop a clerk runs; the pilot measures the deadline catch rate and reminders sent (IMP-29 "catch rate").
- **Charge unit (Assumption):** the Deadline Guardian is proposed free, as the hook ("Sell the Deadline Guardian free, measure the switch-on", `direction-review-2026-10-09.md` §4 item 6; `price-card.md` page 1); the rest inside the plan. Cost drivers: messages, one Reader call per letter, one model call per draft (catalogue W-02, W-14, W-18). No cost floor computed.
- **What a buyer should be told today:** the Minder "does not exist" today (AG-11 v1.11 §12 per catalogue D5, "Specified, not built") and the deadline catalogue is unauthored content (D2); the import engine is built for parties, documents and notes only, with no undo (AG-18 v1.2 §12); the privacy registers are "Specified, not built" (SA-11 v2.7 §12); the reporting aggregation layer is "Specified, not built" (AG-14 v1.10 §12).
- **Regulatory flags (confirm with counsel / RCIC):** all deadline values; the CASL class of re-engagement; closed-file contact retention; imported consent; the clocks and purposes for privacy requests (CP-8 §3.6; SA-11 §13); whether a human-approved AI draft is an "automated decision" under Law 25 (IMP-11, IMP-33, Unknown).

### 2.5 Practice expert (answers only, for every staff role)

- **Catalogue identity:** W-24 "Practice Expert" (the expert co-pilot shape, AIW-D19, D25).
- **Job in one sentence:** answers any staff question from two sources only, the published rulebook version in force and the firm's own records the asker may see, lists its sources, and refuses when it has none.
- **What it does:**
  1. Answers questions such as "Which of my files are at risk this week, and why?", "What does this client still need, and which rule says so?", "Why did the Qualifier rank this program below the cutoff?" (W-24 "Job"; AIW-D19).
  2. Version 1 answers a fixed set of question shapes (at risk this week, what is missing, which rule, what is waiting) from the Minder, deficiencies, Needs you and pack rule text; version 2 answers free questions over documents and messages (W-24 "New"; `../proposals.md` expert v1 row).
  3. Gives the Case, Intake, Billing and Firm assistants their "why" lines (catalogue §2.7 pairs); the expert is never a component of them and never acts.
- **What it never does:** the eleven rules in IMP-20 (Proposal) and the least-data rule in IMP-21: no actions, cannot call a Doer, cannot write anything; sources only; permission checked at the moment of reading (the AG-14-22 pattern); numbers quoted from the engines, never computed (catalogue G10); no advice to clients, and anything pasted into a client message falls under the AI-text floor (AG-10-44); no promises, no regulator talk (AG-11 BR-9, BR-34); every answer logged; Canada-only, no training, no memory across firms (AG11-D15, BR-25); cost caps (IMP-36); text it reads is quoted data, never an instruction (IMP-26); Restricted personal-data fields never passed to the model, only their status (IMP-21; the field set is Ranjan's open item B-1, Founder Decisions Log v1.5).
- **Who approves:** nobody, for an answer to staff (catalogue W-24 "Approval point"); anything that reaches a client goes through one of the acting personas and that persona's approval point.
- **Where it sits:** beside every firm role, within that person's own permissions (AIW-A8); firm-wide questions for the Owner.
- **Bundles:** W-24.
- **Hours saved (Assumption):** Unknown. Reasoning: it replaces "knowledge held in a senior consultant's head" and timeline reading (catalogue W-24 "Replaces"); minutes per question against minutes of searching; the pilot measures questions asked and turnaround (IMP-29).
- **Charge unit (Assumption):** inside the plan, with question caps per user per day and per firm per month (IMP-36; catalogue W-24 "Value": "inside the plan"); "the least predictable cost" (W-24 "Cost drivers"). No cost floor computed beyond the per-question tokens in `provider-and-cost.md` §3.2 row E2.
- **What a buyer should be told today:** no October requirement specifies it (catalogue W-24 "New"); the permission-scoped search it needs is Proposed (D9) and the Finder's release is Unknown; the challenge review "names it the riskiest piece (hallucination, privacy, cost)" (catalogue W-24 "Difficulty"), which is why its limits are written first.
- **Regulatory flags (confirm with counsel / RCIC):** the advice boundary of expert answers; refusal wording; Law 25 treatment of human-approved AI answers (IMP-33).

### 2.6 Pack author's assistant (Expat Ready's own team)

- **Catalogue identity:** W-28 "AI Pack Author" (role twin, admin plane).
- **Job in one sentence:** keeps a country's rulebook current as drafts, so that two people can approve every change and every firm on the pack stays on checked content.
- **What it does:**
  1. Drafts box maps for a new form edition, diffs editions, proposes reference-table rows from official pages with source and date (W-19; SA-01 v2.2 §3.12, §3.13; SA-01B v1.2 §3.5 to §3.7).
  2. Drafts sample clients with expected outcomes, runs the dry-run, explains version differences in plain words (W-20; SA-1-52; SA-01 v2.2 §3.13; IMP-5 fixed test set).
  3. Watches the official pages a pack cites, flags changes, drafts the proposed pack change with a diff (W-21; SA-01B v1.2 §3.6 to §3.7; SA-01 v2.2 §3.14).
- **What it never does:** never approves, publishes or rolls back a pack (SA-01 v2.2 §3.12 two-person rule; catalogue W-28); never scores an outcome (the engine decides, catalogue G10; W-20 "AI never scores"); never edits a pack in place (W-21); never touches legal or consent text (SA-5-23; catalogue G12); the hard limits (IMP-27).
- **Who approves:** the Content Approver (SA-01 v2.2 §3.12); immigration values by the SME and the founder (SA-01 v2.2 §13).
- **Where it sits:** beside the Content author (SA-07 v2.10 Appendix A), one named author per delegation; SA-07 has no route for a non-human staff account, so the delegation record is needed here too (catalogue W-28 "New").
- **Bundles:** W-19, W-20, W-21.
- **Hours saved (Assumption):** saves Expat Ready's content cost, not the firm's hours: "a new IRCC form edition mapped in hours, checked by a person" (W-19 "Why it sells", Proposal wording). Unknown until measured.
- **Charge unit:** none; it is Expat Ready's own cost (catalogue §6 line 10). Cost drivers: model calls per page watched, per form page, per program per version; approver time (W-28).
- **What a buyer should be told today:** the pack source and review-date fields are "Specified, not built" (SA-01B v1.2 §12); the built form engine refuses the IRCC form format (XFA); the two deferred features it brings into scope (SA-1B-33, SA-1B-34) are permitted but deferred (SA-01B v1.2 §0.3).
- **Regulatory flags (confirm with counsel / RCIC):** every immigration value it drafts.

### 2.7 Support and account assistant (Expat Ready's own team)

- **Catalogue identity:** **Proposal**: a grouping of the two admin-plane task workers that serve Support and Account management; not a catalogue twin.
- **Job in one sentence:** drafts the first reply to a firm's ticket and the outreach to a firm that is going quiet, for a person to check and send.
- **What it does:**
  1. Suggests category, priority and route for a ticket; drafts the first reply from the bilingual knowledge base; drafts an article from each resolved ticket (W-22; SA-10 v2.5 §3.2 to §3.3, §3.9, §3.10).
  2. Watches firm health (over limit, trial ending, overdue, stalled setup, no logins) and drafts outreach (W-23; SA-02 v2.19 §3.6; SA-03 v2.14 §3.7; SA-04 v2.14 §3.5 to §3.6; AG-01 v1.16 §3.6).
- **What it never does:** never changes a firm's state, plan, lock or lifecycle (catalogue W-23 "New"; `workers/module-map.md` §3 SA-2, SA-3, SA-4); never lets an internal note reach a firm (SA-10 BR-4); immigration-content tickets route to the Content Manager, never answered by it (SA-10 BR-4; catalogue W-22); never enters a firm's data in a support session beyond the session rules (SA-2-17; AG-18-47); the hard limits (IMP-27).
- **Who approves:** the support agent (W-22); the account manager (W-23).
- **Where it sits:** beside Support and the Account manager (SA-07 v2.10 Appendix A; Product Vision v1.0 (team), section 06 "Support", "Tenant Account Manager").
- **Bundles:** W-22, W-23.
- **Hours saved (Assumption):** Expat Ready's support cost per firm; "matters for margin as firms scale" (W-22 "Value", Assumption). Unknown until measured.
- **Charge unit:** none; internal.
- **What a buyer should be told today:** nothing; it never touches a firm's client. Internally: the support routing engine is "Specified, 'NEW'" (SA-10 v2.5 §12) and the firm-health lists are "Specified, not built" (SA-02 v2.19 §12).
- **Regulatory flags:** none beyond the support-session rules already in SA-02.

---

## 3. Coverage: every worker, exactly once

| Worker | Persona it is a duty of | Note |
|---|---|---|
| W-01 File Builder | Case assistant | the wedge (AIW-D17); contains W-04 and W-07 |
| W-02 Deadline Guardian | Firm assistant | the hook (AIW-D17); proposed free |
| W-03 Letter Reader | Case assistant | |
| W-04 Upload Reviewer | Case assistant | inside W-01; usable alone |
| W-05 Form Preparer | Case assistant | added to the W-25 bundle (Proposal); "hard but worth it" (catalogue §4) |
| W-06 Submission Letter Drafter | Case assistant | added to the W-25 bundle (Proposal) |
| W-07 Inbox Filer | Case assistant | also used by the Intake assistant for lead messages; counted once |
| W-08 Bilingual Writer | Case assistant | |
| W-09 Intake Assistant (catalogue name) | Intake assistant | |
| W-10 Lead Responder | Intake assistant | |
| W-11 Consult Scribe and Proposal Drafter | Intake assistant | |
| W-12 Money Matcher | Billing assistant | |
| W-13 LMIA Compliance Clerk | Case assistant | added to the W-25 bundle (Proposal); never screens candidates (FD-7) |
| W-14 Lifecycle Keeper | Firm assistant | CASL class with counsel first |
| W-15 Migration Mapper | Firm assistant | |
| W-16 Privacy Clerk | Firm assistant | |
| W-17 Case Briefer and Day Planner | Case assistant | |
| W-18 Report Narrator | Firm assistant | the Billing assistant reads its money section |
| W-19 Pack Drafter | Pack author's assistant | admin plane |
| W-20 Pack Tester | Pack author's assistant | admin plane |
| W-21 Rule-change Watcher | Pack author's assistant | admin plane |
| W-22 Support Triager | Support and account assistant | admin plane |
| W-23 Firm Health Watcher | Support and account assistant | admin plane |
| W-24 Practice Expert | Practice expert | the persona is the worker |
| W-25 AI Case Processor | Case assistant | the persona is the twin's delegation |
| W-26 AI Intake Clerk | Intake assistant | the persona is the twin's delegation |
| W-27 AI Billing Clerk | Billing assistant | the persona is the twin's delegation |
| W-28 AI Pack Author | Pack author's assistant | the persona is the twin's delegation |

**Count:** 28 of 28 placed; 0 left out. Five firm personas (Case, Intake, Billing, Firm, Practice expert) carry 22 workers; two platform personas carry 6. Nothing is deliberately excluded: W-05 stays in as a duty with its status flagged rather than being dropped, because dropping it would hide the gap firms name first (`../visual/w2-workers.html` "Honest limits").

---

## 4. How a firm runs it, in plain words

Every control below already exists in the requirements or is a named improvement; the persona layer adds nothing a firm has not already got a screen for, except where marked Proposal.

### 4.1 Switching on

1. **Expat Ready records the AI provider first.** The firm's AI switch "is locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement" (AG-16 v1.12 AG-16-35; AG-11 v1.11 AG-11-93; catalogue G6). Today there is no place in the Super Admin's integrations list to record one (SA-08 v2.2 framing; IMP-6, Proposal).
2. **The residency rule is still open.** AG-11 says processing "happens only in Canada" (AG11-D15); SA-11 §3.6 allows a non-Canadian processor "with documented safeguards" (IMP-7). On 9 Oct 2026, by their own pages, the main US providers do not process in Canada; Google's Montréal region and a Cohere deployment are the candidates (`../commercial/provider-and-cost.md` §2, §4). Until Ranjan chooses the wording and counsel confirms it, the switch stays locked (`provider-and-cost.md` §4 items 1 and 2). **Label: open decision, blocking before Step 3.**
3. **The firm opts in.** FD-16 makes AI features "ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in" (Founder Decisions Log v1.5). In the product this is one switch: the Owner "switches AI on once, with an audited acknowledgement; the product supplies client-notice wording the firm may use" (AG-16 v1.12 §3.9). The notice wording does not exist yet (IMP-11, for counsel).
4. **Each persona is its own item on the plan.** Proposal: the four AI Doers as one product-map item, each persona as its own item, the expert as its own, each off on existing plans until added (IMP-9; SA-3-31, SA-3-38). SA-12 names no AI flag today; the per-persona switch and the platform emergency stop are IMP-8 (Proposal) on top of the generic kill switch in SA-12 v2.7 §3.4.
5. **A delegation is granted.** The person the persona will work for accepts it; the Owner may set it up but it "takes effect only when the person accepts it" (IMP-1 rule 1, Proposal). One delegation per person per persona (rule 2).
6. **Rehearsal first.** Every persona is "tried in rehearsal mode (AG-11-29 dry-run: shows what it would do, does nothing) before it is enabled" (IMP-10). Shadow mode shows proposals beside the person's own entry until the agreement rate earns trust (IMP-30, Proposal).

### 4.2 Setting how much each persona may do on its own, per action

- Every action a persona takes carries an autonomy level the firm sees as **"Send automatically / Ask me first / Off"** (AG-11 v1.11 AG-11-51; Overview v1.11 "Autonomy levels and product floors").
- Defaults: internal actions (create a task, file a message, assign) run automatically; template messages run automatically once the firm has confirmed "Review your standard messages"; every other client-facing message asks first (AG-11-52; AG11-D12).
- **Floors the firm cannot lower**, shown as locked rows with a plain reason on the settings screen (AG-16-36): AI-written text sent to a client; a template whose body AI edited; any government form; any value written into the verified profile nobody has looked at (AG-11-53; catalogue G2). The engine re-checks the floor at run time (AG-11 v1.11 §3.10 "Autonomy floor").
- For personas, two more floors are proposed: a template the firm marks as carrying status or eligibility content defaults to "ask me first" when a persona sends it (IMP-28(c)), and any persona free text is "ask me first" (IMP-28(b)).
- **Who approves AI-written client text** is a firm setting under Advanced: "By default the approver must be a licensed user … the Owner may allow other roles" (AG-16 v1.12 §3.9; AG11-D11(a)). Per AIW-D26 this setting is what decides who approves a persona's client text.
- **Team safeguards** (one switch, four parts: four-eyes on forms, Minder escalation, at-risk marks, routing of unlicensed staff's items to licensed users) turns on at 5 active staff; only the Owner switches it off, with a recorded reason (AG-16 v1.12 §3.10; Overview v1.11 "Easy for solo, safe for teams"). **Supervised client messages** is a separate setting, on as soon as the firm has an unlicensed user who can message clients (AG-16 v1.12 §3.11).

### 4.3 The approvals queue

- Anything a persona prepares at "Ask me first" waits in **Needs you**, the staff home screen, "followed by a Done for you feed of what the Doers did" (AG-11 v1.11 §3.13; AG11-D7; AG-11-64). If the approver is the person acting, they approve inline and no item is created (AG-11-60).
- Each item shows "what will happen … why … the provenance of every value and the confidence of any AI output, its age and its due time" (AG-11-56). The approver can approve, edit then approve, or reject with a reason (AG-11-57). An item whose record changed is flagged stale and the server refuses an approval of a rendering the approver did not see (AG-11-61).
- Items needing a professional approval go to every active holder at once, licensed holders marked "preferred"; if nobody holds the permission, the Owner, recorded as such (AG-11-55; AG11-D11(d)). A backup approver catches items whose approver is away (AG-11 v1.11 §3.13 "Backup approver").
- **The approval record, after AIW-D26** (IMP-17(a), Proposal): approver name; whether the approver was linked to a regulator credential at that moment; the firm's setting in force; the Owner-route wording if used. A monthly count of Owner-route approvals (IMP-17(c)). One proposed exception for Ranjan: pause client-facing preparation while the firm has no active licensed user, on by default (IMP-17(b); §7).
- **One item per file, not per value** for the Case assistant's readiness report, with approve-all, approve-some and reject-with-reason per line (IMP-34, Proposal), so a reviewer "can clear a file in minutes".
- **Nothing executes because time passed**: "A pending item SHALL never execute because time passed" (AG-11-59; catalogue G3). Overdue after 2 working days by default; due at least 2 working days before any government deadline (AG-11-59, AG-11-100).

### 4.4 The audit view

- The firm's **audit log** is "immutable, append-only, tamper-evident", readable firm-wide by holders of `agent/audit:read` (Owner and Admin by default) in the entity audit panel and the firm audit viewer (AG-13 v1.12 §3.5; SA6-D11). Expat Ready's Super Admin reads across firms with `system/audit-log:list`, with date-range queries and chain-verified exports (SA-11 v2.7 §3.3; SA-11-8, SA-11-9).
- Every decision in Needs you is audited: "who, when, the draft before and after any edit, and the rejection reason" (AG-11-62). Every model call is logged with Doer, model, prompt version, firm, record, time and outcome (AG-11-72).
- **What the persona layer adds (Proposal):** each audit entry says whether a person acted directly, a persona acted for them, or a plain automation ran, and which delegation (IMP-1); one **AI provenance view** per file lists every AI-prepared item, its run, its sources, the approver and the decision (IMP-2); the AI run log becomes the single authoritative record with a retention that matches the record it touched, not one year (IMP-4; retention values for counsel). The firm-data export already includes the Needs-you approval history (AG-16-39); IMP-2(d) adds the AI run log to it.
- "Tamper-evident" holds while the hash chain stays in Release 1 (IMP-39; `../assumptions.md` AIW-A9).

### 4.5 Spend caps

- Today: a cap on how many AI jobs one firm runs at once and caps on automated messages (AG-11 v1.11 §11; AG-11-38; BR-11). No cap on model spend.
- Proposal (IMP-36): per firm per month ("a warning at 80 %, a hard stop at 100 %, then the manual path"), per expert user per day, per persona run (a runaway run is stopped and parked for a manager). Caps are plan limit rows (IMP-9). The high-case cost per prepared file (CAD 14.38 mid-tier) is the number the caps are set from (`provider-and-cost.md` §4 item 6).

### 4.6 Switching off and the emergency stop

- **The firm switches off:** "The firm can switch AI off again" (AG-11 v1.11 §3.10); with AI off "every path still works by hand" (AG-11-71; AG-16 BR-18). A setting change "SHALL apply only to items created after the change; an item already waiting in Needs you SHALL NOT be sent or executed because of the change" (AG-16-37).
- **A person ends a delegation** at any time; it also ends by itself when the person is deactivated or suspended, when the firm's AI switch goes off, or when the platform emergency stop trips (IMP-1 rule 4, Proposal). A persona run stops when the client is paused, the retainer ends, the case closes or a person stops it (IMP-35, Proposal).
- **Expat Ready's emergency stop:** the platform kill switch exists as a generic control with a mandatory reason that "pauses in-flight feature work" (SA-12 v2.7 SA-12-12, §3.4); "a firm cannot switch on what the platform has switched off" (AG-16 v1.12 §3.9). Proposal (IMP-8): one stop for all four AI Doers and one per persona; tripping one pauses queued AI work and ends running delegations at the next safe point, never in the middle of a send; items already in Needs you stay visible and approvable, marked "AI paused by Expat Ready on <date>: <reason>"; a separate audited "withdraw AI proposals" action exists for a safety recall; the Owner sees a banner.

---

## 5. What this is not, in writing

| It is not | Because | Where it is written |
|---|---|---|
| A thing that files applications | "No Doer action SHALL submit anything to a government authority, at any autonomy level." | AG-11 v1.11 AG-11-54; AG-7-59; AG-17 v0.5 §3.6 (catalogue G5) |
| A thing that decides eligibility | The Pathway Assessment engine is "Deterministic, no AI" (Product Vision v1.0 (team), section 02, AG-3); the Qualifier gives the same result for the same inputs and pack version (AG-3-39; catalogue G10). The expert quotes its result; it never computes one (IMP-20 rule 4) | AG-03 v1.4; Product Vision v1.0 (team), section 02 |
| A thing that moves money | No persona makes "any billing, payment, refund or trust entry" | IMP-27, IMP-23 (Proposal for Ranjan to ratify; catalogue G16); AG-06 v1.7 BR-11 |
| A thing without a manual path | "With AI off, gated, or the provider unavailable, every path SHALL still work by hand" | AG-11 v1.11 AG-11-71; AG-16 v1.12 BR-18; AG-8-45 (catalogue G14) |
| A user, a login or a permission holder | "no AI principal in the identity spine, no autonomous permissions" | FD-16, Founder Decisions Log v1.5; AIW-D13 |
| A thing that gives advice to clients | Expert answers are for staff; any client text goes through the AI-text floor and a named person | IMP-20 rule 5; AG-10-44; AG-11-53 |
| A thing that promises an outcome | "never promise an outcome" | AG-02 BR-10; AG-10-44 note; AG-03 BR-11 (catalogue G13) |
| A thing that reports a firm to its regulator | "We work for the firm, not the regulator" | Overview v1.11 "Agent-native operation"; AG-11 BR-34 (catalogue G11) |
| A thing that gives the same words twice | "Every rule step gives the same result for the same input and pack version. Every AI step is a proposal with its source, its confidence and its model and instruction version recorded, reviewed the same way every time." Word-for-word identical AI output is never promised | IMP-37 (wording for Ranjan); AG-3-39; AG-11 v1.11 §11 |

---

## 6. Naming

**What Ranjan says today:** "AI personas" and "AI workers" (AIW-D28; AIW-D19 "many versions and avatars").

**The constraint:** FD-16: "Marketing may say 'AI-assisted'; it may not say the AI decides." IMP-38 notes that "AI Worker" implies an actor and recommends keeping it as the working and investor term "always with 'works for a named person; a person approves' in the same breath", using "AI assistant" in client-facing and regulator-facing text, and giving no persona a human name or avatar. AIW-D27 accepted "assistants to the role" as the external wording.

**Proposal, one term per thing (Ranjan's style: plain functional words):**

| Thing | Internal and investor word | Client-facing and regulator-facing word |
|---|---|---|
| The whole layer | **AI Workers** (the workstream's name; always "work for a named person; a person approves") | **AI assistance** |
| One assistant to one role (this document's unit) | **AI persona** (a bundle of duties under one role's delegation) | **assistant to the <role>** |
| The seven in this document | **Case assistant**, **Intake assistant**, **Billing assistant**, **Firm assistant**, **Practice expert**, **Pack author's assistant**, **Support and account assistant** | the same words; never a human name, never an avatar that suggests a person (IMP-38) |
| One duty inside a persona | **worker** (catalogue W-nn names stay as the internal index) | not used externally |

**The one naming risk to decide:** "Practice expert" is the catalogue's name for W-24. The word "expert" could be read by a regulator or a client as a claim of professional expertise. Alternatives in the same style: **Practice answers**, **Practice guide**. Recommendation: keep **Practice expert** internally (it is the sharpest description of what it knows), and never use the word in client-facing text, where the answer is always relayed by a person. Ranjan decides (§7, decision 1). Counsel reads the final list before publication (IMP-38).

---

## 7. Decisions for Ranjan (only what this step needs; recommendation with each)

1. **Naming.** Adopt the table in §6: "AI Workers" internally and for investors, "AI assistance / assistant to the role" externally, "AI persona" as the word for the grouping, the seven persona names as written, and decide whether "Practice expert" stays or becomes "Practice guide". *Recommend: adopt the table; keep "Practice expert" internally, never client-facing; counsel reads the list before anything is published (IMP-38).*
2. **The persona set.** Five for the firm (Case, Intake, Billing, Firm, Practice expert) and two for Expat Ready (Pack author's assistant, Support and account assistant), carrying all 28 workers (§3). Two groupings are new beyond the catalogue's four twins: the Firm assistant and the Support and account assistant; three duties are added to the Case assistant beyond the catalogue's W-25 bundle (W-05, W-06, W-13). *Recommend: yes to the seven; Step 2 writes seven behaviour documents, not 28.* If he prefers fewer, the Firm assistant's duties could fold into the Case assistant (deadlines) and the Owner's own settings (the rest), at the cost of a persona that reads as "the one that watches everything".
3. **The charge unit to test in Step 5.** The price card offers (a) per prepared file, (b) an allowance inside the plan with overage, (c) per persona per month. Only the Case assistant has a costed unit (the prepared file, CAD 0.37 / 2.24 / 14.38 floor). Option (c) sits against AIW-A7 and IMP-1 rule 3 ("a delegation takes no seat and is metered by the work it does"). *Recommend: test (a) as the headline for the Case assistant with (b) as the pilot arrangement (IMP-18(d)); the Deadline Guardian free (hook); the Intake, Billing and Firm assistants and the Practice expert inside the plan for the pilot, with usage measured (IMP-9, IMP-29), and priced only after the pilot. Drop (c) unless the ten conversations ask for predictability above everything.*
4. **Admin-plane personas in the investor story, or internal only** (catalogue §5 question 5). *Recommend: show them in the chart as "Expat Ready's own team" (as here), because they make "one engine, many countries" true (catalogue §6 line 10), but never price them.*
5. **The delegation record under FD-16** (IMP-1; `../assumptions.md` AIW-A2). Step 2 cannot write a trigger or an approval step without it. *Recommend: confirm in one line that a delegation record (no identity, no permissions of its own, a subset of one named person's) is consistent with FD-16, and that the person the persona worked for counts as the preparer for four-eyes.*
6. **The hard limits and blocked list** (IMP-27, IMP-23) as a founder decision, after counsel reads them. Every "never does" line in §2 rests on them. *Recommend: yes.*
7. **The proposed exception to AIW-D26** (IMP-17(b)): pause client-facing preparation while the firm has no active licensed user, on by default, Owner may switch off with a reason. *Recommend: accept; a plain "no" is fine and the rest of IMP-17 stands.*

Not needed for Step 2 but still open and blocking before Step 3: the residency wording (AG11-D15 "only in Canada" or SA-11 §3.6 "with safeguards"; `../PROGRESS.md` "Waiting on Ranjan"); the FD-16 reading on automatic document typing (IMP-13; until then every type goes to review); the Form Preparer's technical route (catalogue §5 question 2).

---

## 8. Glossary (plain words; the product's own terms where they exist)

- **AI persona:** this document's unit: an assistant to one human role, made of several catalogue workers (duties), working under that role's delegation. Not a user (FD-16).
- **AI Worker:** the workstream's name for one job-shaped bundle of Doers and recipes that does a whole job a person does today, on behalf of a named person, stopping at a human sign-off (`ws2-improvements.md` glossary). The catalogue has 28 (W-01 to W-28).
- **Doer:** one of the product's own single-job tools: the Mailer sends, the Reader reads documents, the Minder watches dates, the Filler fills forms (AG-11 v1.11 §3.0, §3.3). Four are AI Doers: Reader, Sorter, Drafter, Checker (AG11-D4).
- **Conductor:** the engine that runs Doers when something happens (AG-11 v1.11 §3.0).
- **Recipe:** a ready-made automation: when this happens, check these things, then do these actions in order (AG-11 v1.11 §3.5). Every persona is specified as a recipe (IMP-10).
- **Needs you / Done for you:** the staff home screen: the queue of drafts waiting for a person, then the feed of what the Doers did (AG-11 v1.11 §3.13).
- **Autonomy level:** per action, "Send automatically / Ask me first / Off" (AG-11-51). **Floor:** an action that can never be set to "Send automatically" (AG-11-53).
- **Delegation:** the record that says which persona works for which named person, with which subset of that person's permissions, on which files, from when until when (IMP-1, Proposal).
- **Verified profile:** the client's facts a person has checked against a document (AG-08). Approving a Reader value in its review view is the verification (AG11-D10).
- **Readiness report:** the Case assistant's one-item summary of a file: every value with its source and confidence, every open deficiency, every message sent (catalogue W-01 "New (a)"; IMP-34).
- **Prepared file:** one Case assistant run on one case whose readiness report a person approved (IMP-18, Proposal). The unit of price-card option (a).
- **Country Pack / Practice Pack:** the rulebook for the destination country (programs, forms, checklists, deadlines) and the rulebook for the firm's own regulator (who may advise, trust money, retention, privacy) (FD-22, Founder Decisions Log v1.5).
- **Minder:** the Doer that registers and watches dates and runs deadline cascades (AG-11 v1.11 §3.4). "Specified, not built" today (AG-11-47).
- **Team safeguards:** one firm switch with four parts for firms of five or more staff (AG-16 v1.12 §3.10).
- **Emergency stop (kill switch):** Expat Ready's platform-wide off switch with a mandatory reason (SA-12 v2.7 §3.4); the AI-specific stops are IMP-8 (Proposal).
- **Licensed person / RCIC / CICC:** a Regulated Canadian Immigration Consultant, licensed by the College of Immigration and Citizenship Consultants. In the product a licence is a credential on a person's profile, never checked by the product (SA6-D9; AG1-D19).
- **CASL:** Canada's anti-spam law on commercial messages. **Law 25 / PIPEDA:** Quebec's and Canada's privacy laws. **XFA:** the file format of IRCC's barcode PDF forms, which the built filler cannot open (catalogue header).
- **Specified, not built:** in the October requirement files but not in the code copies (catalogue §0 status markers).
