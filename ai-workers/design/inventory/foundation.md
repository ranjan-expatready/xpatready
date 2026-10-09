# Inventory slice: foundation

Wave W1, AI Workers workstream. Reader: requirements-cartographer (foundation slice). Written 9 Oct 2026.
Source: `sources/drive-snapshot-2026-10-09/` only, plus the founders' two Doer specs from the read-only code copy `code/expat-ready-api@c4117a3-2026-10-09/` (not on Drive). Every file in the slice was read in full; see `coverage-foundation.md`. The full reading notes (word-for-word extracts per document) are kept at the end of this file as Appendix C.

**Citation keys used below**

| Key | File (path under the snapshot unless stated) | Version / date |
|---|---|---|
| DOC1 | `01-techno-functional/03-Doc-1-Platform-Foundation.md` | v1.3, 2026-06-26 ("Status: FINAL") |
| ADR | `01-techno-functional/02-Architecture-Decision-Record.md` | v1.0, 2026-06-22 |
| RFP | `01-techno-functional/01-RFP-Build-Proposal.md` | v2.0, 2026-06-22 (demoted to "lineage") |
| FDL | `01-techno-functional/07-Founder-Decisions-Log.md` | v1.5, 2026-08-02 |
| OVW | `02-functional-requirements/shared/00-Overview_v3.6_2026-10-07.md` | v3.6, 2026-10-07 |
| PHG | `02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md` | v2.14, 2026-10-08 |
| TRI | `02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md` | 5 Oct 2026; says itself it is "**not** a requirements document" |
| CH1 | `06-program-management/Program Charter V1 - G1 expanded.md` | markdown dump of "Program Charter V1 - G1 expanded v2.pptx" (no version date in file) |
| CH2 | `06-program-management/Program Charter_V2.pptx` | slide header "RELEASE 1 / PRODUCT & LAUNCH PLAN / v6", 7 slides |
| SPEC-N | `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md` | v1, "decided 2026-06-13 (founder)" |
| SPEC-IA | `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md` | v1, "approved 2026-06-14 (founder)" |

Labels: **Inferred** = my reading, not stated in a source. **Unknown** = the sources do not say.

---

## Part 1: Components

### 1a. Foundation plane (Doc 1 and its decisions)

| ID | Plain name | Plane | What it does (plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| FND-1.1 | One-application design (modulith) | Foundation | One backend split into strict modules; heavy work (email, PDFs, OCR, reminders, Doer runs) runs in background workers. | Builders only | None for firm users. | "Automation (Conductors + Doers)" is one module | — | No | R1 (CH2 slide 1: Foundation "Largely built · finish Oct") | DOC1 §1.1: "Automation (Conductors + Doers) · Communications · Search ('the Finder')"; §1.4 workers run "OCR, document virus-scan, automation/Doer execution, reminder firing" |
| FND-1.12 | Capability switchboard (Capability Registry) | Foundation | Every Doer and major feature is one named switch; it is live only if the plan includes it, the firm turned it on, and Expat Ready has not killed it. | Expat Ready staff (flags), firm owner (firm switch) | Firm owner switches capabilities on or off; platform staff dark-launch or kill a capability. | Every Doer and the Conductor check it before acting | SA-3 plans, SA-12 flags, firm switch | No sign-off; "Fail-closed is absolute." | R1 (foundation) | DOC1 §1.12: "ONE CAPABILITY = ONE MODULE = ONE TOGGLE"; §1.12.5: "an OFF capability's Doer **no-ops with an audited reason**" |
| FND-2 | Firm data walls (tenant isolation) | Foundation | The database itself stops one firm seeing another firm's data, and one client seeing another client's data in the portal. | Everyone (invisible) | None. | — | Postgres row security on `firm_id`; second portal wall on the client | No | R1 | DOC1 §2.1: "`firm_id` — the tenant key"; §2.5 portal "leak-off by default" |
| FND-2.6 | Support access into a firm (impersonation) | Foundation | The only sanctioned way Expat Ready staff can act inside a firm: a short, single-firm, re-authenticated, audited session. | Expat Ready support staff | Staff state a justification, re-authenticate, then look (or change, if the firm allowed). | — | SA-2 support sessions; SA-7 step-up | Yes: "requiring a step-up (re-auth) and a stated justification" | R1 (PHG SA-2 P1 "read-only support sessions") | DOC1 §4.5; §2.6: "bound to **exactly one** target `firm_id`" |
| FND-3 | Sign-in (identity) | Foundation | Three completely separate sign-in pools: Expat Ready staff, firm staff, clients. | All users | Users sign in, set up second factor; admins invite and deactivate people. | Mailer delivers invites | MFA policy per pool | Deactivation "audited with actor and justification" | R1 | DOC1 §3.1 (three pools `er:platform`, `er:firm`, `er:portal`); §3.7: invite "delivered by the Mailer Doer" |
| FND-4 | Permissions (RBAC) and record-level checks | Foundation | Who may do what: about 259 firm permissions, six fixed firm starter roles, "own vs all" record rules, deny by default. | Firm owner/admin; Expat Ready staff | Firm owner/admin copies a starter role and edits it; assigns roles to people. | — | Permission catalogue (SA-6) | Catalogue is "hand-authored ... (a security decision that must not be auto-generated)" | R1 (PHG SA-6 P1) | DOC1 §4.1–§4.5; OVW SA-6 row: "Catalogue of about 259 firm permissions"; PHG §17 Role Template |
| FND-5.2 | One record per person (Party) | Foundation | One identity per person or organisation, with "lenses" for lead, client and portal login; merges never delete. | Firm staff | Staff spot and merge duplicates. | — | — | Representative-of-record cardinality: "[FOUNDER-CONFIRM]" | R1 | DOC1 §5.2: "Merge is **non-destructive**" |
| FND-5.3/5.4 | Facts captured once (canonical fields + answer store) | Foundation | Every answer is stored against a standard field, never overwritten, with its source and whether a person verified it. | Clients (answer), staff (verify) | Staff promote an answer from "declared" to "verified"; clients re-confirm facts that go stale. | Minder prompts re-confirmation | FreshnessRule; Country Pack field catalogue | Verification is a named person: "`verifiedBy` / `verifiedAt` (who promoted `DECLARED → VERIFIED`)" | R1 (schema, Wave A) | DOC1 §5.4: status "`FINAL \| DECLARED \| VERIFIED`"; "`sourceJson` (provenance: ... PQR, SQR, portal, import)" |
| FND-5.5 | Questionnaire engine schema | Foundation | Sections and questions bound to standard fields, with server-side show/hide rules; the lighter pre-qualification form is a marked subset of the full one. | Content authors; clients | Content authors build sections in the pack; clients answer. | — | Predicate rules; Country Pack | No | R1 schema; runtime later wave per DOC1 (AG-8 owns runtime) | DOC1 §5.5: "PQR is therefore *derived from the same section catalogue*" |
| FND-5.6 | Document requirement master | Foundation | Defines which documents are needed, alternatives, and which expire. | Content authors | Authors define requirements; staff later review uploads (AG-9). | Minder watches expiry; Binder (checklist) | Country Pack | No | R1 schema; Document lifecycle later wave | DOC1 §5.6: "`expiryRelevant` ... drives the **Minder** to watch and prompt before a dated document lapses" |
| FND-5.7 | Government form master and the Filler | Foundation | Maps standard fields to government form boxes; the Filler fills a form from stamped answers, identically every time. | Staff | Today staff "fill IMM forms and upload them" (TRI AG-07). | Filler | Form editions and field maps (pack) | RFP §4.8: consultant may "review and override the auto-fill before generating the final PDF" | Form auto-fill **not in R1**: CH2 Appendix A "government form auto-fill" already out; PHG SA-1B v2.6 "autofill parked" (SA1B-D28) | DOC1 §5.7: "The **Filler is a pure, data-driven function**" |
| FND-5.13 | Rules engine (one condition language, scoring, eligibility, stages, reference tables, regulator) | Foundation | The single, deterministic way the product evaluates conditions, scores (CRS-style), passes/fails eligibility gates and sets stage deadlines. | Content authors (Expat Ready), the system | Content author and a second approver publish rules; firm staff re-run assessments. | Qualifier (eligibility/scoring); Minder (stage deadlines) | Country Pack content | Dual control on rules: FDL FD-4 "Dual-control for rule/scoring/eligibility artifacts" | R1 (schema Wave A; AG-3 core engine stays in TRI) | DOC1 §5.13.1: "There is **exactly one** condition contract on the platform"; "deterministic" |
| FND-5.13.3 | Eligibility gates (HARD / ADVISORY) | Foundation | A failed HARD gate makes a client ineligible; a failed ADVISORY gate only raises a flag. | System; staff | Staff explain results to clients. | Qualifier | Eligibility rule sets (pack) | Client may ask a named human to review an automated result (FDL FD-20) | R1 | DOC1 §5.13.3: "a failed **ADVISORY** gate raises a non-blocking flag/note only" |
| FND-A4 | Decision snapshot (AnswerSnapshot) | Foundation | Freezes the exact answers and rule versions an assessment or case step used, so re-running gives the same result. | System; staff | None; re-run inserts a new snapshot. | Qualifier (producer in AG-3 wave) | Pack version + config versions | No | R1 (producer "IN scope for the assessment (AG-3) wave") | DOC1 Amendment A4: "`capturedAt` + `capturedBy` — provenance; **immutable once written**" |
| FND-6.1 | Business event dictionary | Foundation | Every business fact (case created, document uploaded, payment succeeded, deadline approaching) is a named event with one sender and listed receivers. | System | None. | Conductor listens on nearly every event; Minder emits `deadline.*` | — | No | R1 (foundation) | DOC1 §6.1.6: "`deadline.approaching` \| `automation`"; §6.1.2 notifications are "A *message to deliver* to a human" |
| FND-6.2 | Conductor bus and background queue | Foundation | Carries events after the database commit; the Conductor evaluates whether an event triggers a workflow step; durable queue sends notifications and webhooks with no double effects. | System | None. | Conductor | Per-firm processed-event ledger | No | Bus R1; automation engine use deferred (see Part 5 C1) | DOC1 §6.2.1: "the Conductor/automation engine evaluating whether an event triggers a workflow step" |
| FND-6.3 | Outside pipes (rails as ports) | Foundation | Doers reach Stripe, email, storage, SMS only through swappable adapters; firm calendars and video through firm-owned connectors. | Expat Ready platform engineer (SA-8) | Platform engineer configures rails and secrets. | Biller, Mailer, Signer, Messenger, Scheduler | SA-8 IntegrationRailConfig | No | R1 (SMS/WhatsApp out: CH2 Appendix A) | DOC1 §6.3: "**five infrastructure-backed Doers**"; Amendment A3 connectors |
| FND-6.5 | Currency conversion (FX) | Foundation | One service records exchange rates; v1 rates are typed in by an authorised operator. | Expat Ready operator | Operator publishes rates by hand. | Biller consumes | — | No | Unclear (TRI moves FX to R2 in AG-2/6/14) | DOC1 §6.5.2: "v1 ships a MANUAL adapter: an authorized platform operator publishes rates" |
| FND-7.1/7.2 | Encryption and reveal of sensitive personal data | Foundation | Passport, SIN, bank and similar fields are encrypted and masked; seeing them needs a permission and is logged first. | Firm staff; clients (own data) | Staff click "reveal" when they need the full value. | — | Restricted-PII list (counsel) | Restricted field list: "a founder/privacy domain confirmation" (ADR NFR5-06) | R1 (CH1 G1: "Restricted-data encryption in place") | DOC1 §7.2: "Every reveal emits a `PII_REVEAL` audit event" |
| FND-7.4 | Erasure by key destruction | Foundation | Deleting a person destroys their keys; financial records kept until the legal floor. | Firm (privacy requests); Expat Ready | Staff handle deletion requests; legal hold overrides. | — | Retention floors (counsel) | Retention values set by counsel (FDL B-2) | R1 machinery; values from counsel 15 Jan (CH2 Appendix A) | DOC1 §7.4: "destroy the key, not the rows" |
| FND-7.5 | Audit spine | Foundation | Tamper-evident, per-firm, append-only log of every significant action, written in the same transaction as the action. | Firm admins; Expat Ready security & audit | Auditors read and export the trail. | All Doers write to it (skipped-with-reason when off) | — | No | R1 (CH2 Foundation "audit") | DOC1 §7.5: "**Synchronous via an outbox, atomic with the user op**"; entry holds "actor, persona, `firm_id`" |
| FND-7.6 | Privacy governance plane (SA-11) | Foundation | Consent per purpose, retention, legal hold, data-subject requests on a legal clock, breach register, one personal-data export. | Firm staff; clients; Expat Ready | Staff log and answer privacy requests; assess breaches; place legal holds. | — | Practice Pack privacy rules | Breach notification gate (RROSH) set "with counsel" | Split: PHG SA-11 P1 = audit log only; DSR/consent/retention P2; breach register P3. CH2 golden journey 8 needs "breach logged" at launch | DOC1 §7.6: "a withdrawn purpose blocks that processing path at point of use" (AC-7.6.1) |
| FND-7.7 | Data residency and data-minimisation to outside pipes | Foundation | All data stays in Canada; no sensitive personal data ever goes to Stripe, email, SMS or WhatsApp. | Builders; Expat Ready | None. | All rail Doers | Sub-processor matrix | No | R1 | DOC1 §7.7: "no Restricted PII is ever sent to a payment, SMS, or messaging rail"; RFP §6 "stored and processed within Canada" |
| FND-8.8 | Universal search (the Finder) | Foundation | Firm-scoped search across all records; no sensitive fields indexed; portal has no search. | Firm staff | Staff search. | Finder | — | No | Unknown (not named in CH1/CH2) | DOC1 §8.8: "a new platform **SearchModule** ('the Finder')" |
| FND-8.9 | Bulk import engine | Foundation | Firm loads its existing clients, cases, documents, financials: map columns, dry run, run, report. | Firm owner/admin | Staff map columns, review the dry-run, fix rejected rows, attest. | Biller receives financials | — | TRI AG-18 stays: "owner attestation" | R1 (CH2: "data import" across every step; TRI AG-18 stays) | DOC1 §8.9: "column→canonical-field **mapping UI** → **dry-run preview**" |
| FND-8.10 | Outbound read API and webhooks | Foundation | Firms get read-only API keys and signed webhooks to their own tools. | Firm technical staff | Firm creates keys and webhook subscriptions. | — | Event dictionary | No | Unknown for R1 (not named in CH1/CH2) | DOC1 §8.10: "a key carries a subset of the firm's local `agent/*` read permissions; default-deny" |
| FND-PP | Practice Pack (firm regulator rules) | Foundation / Admin | Second rule pack, keyed on where the firm practises: regulator and representative model, trust money, retention, privacy, e-signature law, tax. | Expat Ready content team + counsel | Founder and counsel author it; a second person approves. | Biller (trust), Signer (assurance) | Practice Pack | Conflicts with no declared policy "ESCALATE": "block and raise a named human decision showing both sources" | R1 (CH2: Canada Practice Pack; CH2 slide 7 SA-1-B "Pending ???") | FDL FD-22, A22-6.4 |

### 1b. Release map for every module (from this slice's scope documents only; detailed manual work is in the SA, AG and CP slices)

| ID | Plain name | Plane | What it does (1 line) | Who uses it | Manual work (only where this slice says) | Doers / Conductor | Rules / pack data | Sign-off (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-1 | Country and Practice Packs (container) | Admin | Versioned country rule packs with draft, review, approve, publish. | Expat Ready content author and approver | Author drafts; approver approves "never own drafts, never edits". | — | Country Pack, Practice Pack | "a **production** pack must be approved and published by someone other than its author and submitter (SA-1-61)" | R1 (PHG P1; CH2 Appendix A) | OVW §3.2; PHG SA-1 row |
| SA-1B | Content Pack Configurator | Admin | The pack content: fields, sections, documents, forms, routes, assessment output. | Content author | Authors configure rows by hand. | Filler (parked) | Country Pack | — | R1 core; P3: "AI drafting and diffing of box maps"; "AI reading of uploaded documents into answers" | PHG SA-1B row; CH1 lists SA-1-B as "SQR Configuration", CH2 slide 7 as "Practice Pack" |
| SA-2 | Firms | Admin | Create and manage firms, trials, holds, support sessions. | Account manager, support | Create firms, send sign-up links, support sessions. | — | — | Support session "Read-only unless the firm owner has allowed changes" | R1 (Delivered 24 Sep, CH2 slide 7) | PHG SA-2 row; glossary "Support Session" |
| SA-3 | Plans and entitlements | Admin | Plans, product map, limits. | Billing, Owner | Changes to live plans need a second approver. | — | — | "Every change to a live plan needs a second Super Admin's approval" | R1 (Delivered) | PHG glossary "Live Plan" |
| SA-4 | Subscription billing | Admin | Charges firms; 14-day failed-payment timeline. | Billing | Approve discounts, refunds. | — | — | Dunning "A fixed rule in Release 1" | R1 (Delivered) | PHG SA-4 row |
| SA-5 | Global templates | Admin | Platform templates cloned to firms. | Content author | Author templates. | — | — | Legal templates "hard-require REVIEW before publish" (FDL B-3) | R1 core; P3 "Automation Conductor templates" | PHG SA-5 row |
| SA-6 | Roles and permissions | Admin | Permission catalogue and six fixed firm starter roles. | Owner, Staff manager | Firm admins copy and edit roles. | — | — | Custom roles: "written reason required" (OVW SA-6) | R1 (Pending 7 Oct, CH2 slide 7) | OVW SA-6 row |
| SA-7 | Platform users | Admin | Expat Ready staff accounts, nine starter roles, step-up. | Staff manager | Invite, deactivate, reset MFA. | — | — | "step-up before support sessions, staff access changes, refunds and settings" | R1 (Delivered 3 Oct per CH2; Pending 7 Oct per CH1) | PHG SA-7 row |
| SA-8 | Integrations and rails | Admin | Rail config and "in-house **Doer** platform settings". | Platform engineer | Configure rails, secrets. | All rail Doers | — | — | R1 P1: "in-house Signer settings"; P3 "SMS/WhatsApp gateway" | OVW SA-8 row; PHG SA-8 row |
| SA-9 | Analytics | Admin | Basic tenant and revenue dashboard. | Owner | — | Reporter (Inferred) | — | — | R1 "launch minimum" (CH1 §4 notes) though OVW lead phase P2 | CH1 §4 scope notes |
| SA-10 | Support | Admin | Ticket queue. | Support | Triage tickets. | — | — | — | R1 "launch minimum" | CH1 §4 scope notes |
| SA-11 | Audit and compliance | Admin | Immutable audit log; later residency, retention, DSR, breach. | Security & audit | Investigations, exports. | — | — | — | R1 P1 = audit log only; P2/P3 rest | PHG SA-11 row |
| SA-12 | Flags and configuration | Admin | Feature flags; per-firm emergency off for corporate. | Platform engineer | Flip flags. | Capability kill-switch | — | — | R1 (PHG P1 row); OVW lead phase P2 | PHG SA-12 row |
| AG-1 | Firm setup | Firm | Firm record, staff, roles, licence, branding. | Firm owner | Invite staff, set licence. | — | Practice Pack | Licence: "no documents without licence" (TRI) | R1 | CH2 Appendix A; TRI AG-01 |
| AG-2 | Lead management / CRM | Firm | Leads, pipeline, convert to client. | Intake staff | Manual lead entry, duplicate check, calls, follow-up. | Mailer (acknowledgement) | — | — | R1; "Lead scoring and 'what to do next' ranking" proposed R2 (TRI) | TRI AG-02 |
| AG-3 | Pathway assessment | Firm | Eligibility and CRS with reasons. | RCIC / staff | Re-run, review, stamp "reviewed by". | Qualifier | Country Pack | "'reviewed by' stamp" (TRI); FD-20 human review | R1 core engine; what-if, PNP streams, auto-assess proposed R2 (TRI) | TRI AG-03 |
| AG-4 | Consultation booking | Firm | Booking page, consult record. | Staff | Mark completed/no-show. | Scheduler; reminders "through AG-11" | — | — | R1 | TRI AG-04 |
| AG-5 | Retainers and e-signature | Firm | Retainer from template, passcode signing. | RCIC | "draft review and approve"; countersign. | Signer, Drafter (Inferred) | Practice Pack | Countersign "restricted to assigned RCIC" (FDL D-6) | R1 | TRI AG-05; FDL FD-21 |
| AG-6 | Billing and trust | Firm | Invoices, payments, trust ledger. | Billing staff | Record offline payments, manual reminders. | Biller | Practice Pack trust rules | Trust to operating "explicit, audited, reason-coded event" (FD-17) | R1 | TRI AG-06; FDL FD-17 |
| AG-7 | Case delivery | Firm | Cases, applicants, checklist, forms, submission, milestones. | Lead RCIC + case officer | Staff fill IMM forms and upload; internal review; record filing. | Binder; Filler (out of R1) | Country Pack | "forms per case, uploaded or staff-prepared, with approval record" (TRI) | R1 (Delivered 3 Oct) | TRI AG-07; CH1 notes "staff file on the government portal themselves" |
| AG-8 | Smart questionnaire | Firm | Client intake wizard. | Clients; staff | "manual verify against a document" | Reader (ships switched off) | Country Pack | — | R1 | TRI AG-08 |
| AG-9 | Documents | Firm | Upload, request, review, reject with reason. | Staff | Review and reject documents; re-request. | Reader AI (moved, [F]) | — | — | R1; Reader AI proposed R2 | TRI AG-09 |
| AG-10 | Communications | Firm | Email, portal chat, templates. | Staff | Write and send messages. | Mailer; Sorter AI / Drafter AI moved [F] | — | "Supervision of unlicensed staff's messages [F]" moved | R1 core; AI moved | TRI AG-10 |
| AG-11 | Automation (Conductor and its Doers) | Firm | Recipes "when X, do Y", deadline reminders. | Firm admin | — | Conductor, Minder, Tasker, Messenger | Automation templates in pack | "Licence-aware approval, supervised messages" moved (TRI) | **Conflict**: CH1/CH2 "NOT IN RELEASE 1"; TRI (5 Oct, review only) keeps engine + Minder + 4 recipes | CH2 slide 1; TRI AG-11 |
| AG-12 | Templates | Firm | Firm template overrides. | Staff | Adopt, edit, publish templates. | — | — | "separate publish permission" | R1 | TRI AG-12 |
| AG-13 | Tasks and audit trail | Firm | Tasks, notes, audit viewer, reminders. | Staff | Create/assign tasks, set own reminders. | Tasker / Minder (Inferred) | — | — | R1 | TRI AG-13 |
| AG-14 | Reporting | Firm | Two dashboards, CSV export. | Owner, staff | Export reports. | Reporter | — | — | R1 | TRI AG-14 |
| AG-15 | Portal management | Firm | Invite clients, visibility switches, "done on behalf". | Staff | Manual nudge, done-on-behalf. | — | — | — | R1 | TRI AG-15 |
| AG-16 | Firm settings | Firm | Profile, Stripe, mail, MFA, four-eyes rule. | Firm owner | Configure. | — | — | "four-eyes rule" stays; "AI settings [F]" moved | R1 | TRI AG-16 |
| AG-17 | Recruitment evidence (LMIA) | Firm | Employer LMIA file, advertising, sign-off record. | RCIC | Candidate log, readiness, waive with reason. | Minder ("validity clock via Minder") | Country Pack | "sign-off record"; "waive with reason" (TRI) | R1 (CH1 notes: "AG-17 ... and CP-9 ... are in Release 1") | TRI AG-17 |
| AG-18 | Import | Firm | Firm-onboarding import. | Firm owner | Map, dry-run, attest. | — | — | "owner attestation" | R1 per TRI; **not in CH1/CH2 module list** | TRI AG-18 |
| CP-1..CP-9 | Client portal (secure access, progress, intake, upload, payments, signing, messaging, consent/privacy, employer view) | Client portal | Client self-service. | Clients, employer contact | Clients upload, sign, pay, answer. | Signer, Biller | Practice Pack consent | — | R1 all nine (CH2 Appendix A); due 2–23 Dec (CH2 slide 7) | CH2 slide 4, slide 7 |

---

## Part 2: Doers and engines seen in this slice (the MASTER DOER & ENGINE LIST)

### 2a. Doers (named tools)

Sources disagree on several definitions; each row shows every source's own words.

| Doer | What this slice says it does (exact words, by source) | Inputs → outputs | Deterministic or judgement? | Release 1? | Citation |
|---|---|---|---|---|---|
| **Signer** | SPEC-N: "e-signature" (Tier 1 "Live now (shipped)"); RFP: "in-house Signer behind an `ObjectStoragePort`"; FD-21: OTP to signer "before the signature is applied" + "sealed **evidence bundle**" | Document + signers → signed document, certificate, `envelope.signed` event | Deterministic | Yes ("Passcode e-signing", CH2 slide 1; "in-house e-sign", CH2 slide 3) | SPEC-N §5; RFP §4.5; FDL FD-21; DOC1 §6.3.1 |
| **Mailer** | SPEC-N: "email + sequences"; DOC1: owning Doer of `EmailRelayPort`; invites "delivered by the Mailer Doer" | Template + recipient → sent email | Deterministic | Yes (email); "sequence enrolment (already Release 2)" (TRI AG-02) | SPEC-N §5; DOC1 §3.7, §6.3.1 |
| **Scheduler** | SPEC-N: "consult booking / calendar"; DOC1 A3: "the Scheduler is the Doer, not a rail; the connectors are the Scheduler's external seam" | Availability → booking, `booking.scheduled` | Deterministic | Yes (AG-4); calendar sync / video connectors proposed R2 (TRI) | SPEC-N §5; DOC1 Amendment A3 |
| **Tasker** | SPEC-N: "tasks + assignments" (Tier 1); RFP: "Tasker (workflow task automation)"; CH1 notes: listed among deferred rule-based Doers | Trigger → task | Deterministic | **Conflict**: tasks stay ("Ordinary tasks ... stay", CH1); Tasker as automation Doer deferred | SPEC-N §5; RFP §4.10; CH1 §1 notes |
| **Reminder** | SPEC-N: "follow-ups + nudges" (Tier 2); RFP: "Reminder (schedules and fires reminders)"; FD-8: "Reminder folds into Minder" | — | Deterministic | Folded into Minder (FD-8) | SPEC-N §5; RFP §4.10; FDL FD-8 |
| **Minder** | SPEC-N: "deadlines, status, audit trail" (Tier 3, "compliance"); RFP: "Minder (task creation and assignment)"; DOC1: watches document expiry, stage deadlines and stale answers, emits `deadline.approaching/breached/satisfied` | Dates and rules → reminder events, cascade steps | Deterministic | **Conflict**: CH1 notes defer it with AG-11 and ask the founder to decide on "a simple deadline and expiry reminder"; TRI keeps "deadline reminders (the Minder)"; TRI AG-17 keeps "validity clock via Minder" | SPEC-N §5; RFP §4.10; DOC1 §5.3, §5.6, §5.13.4, §6.1.6; CH1 §1 notes |
| **Messenger** | SPEC-N: "SMS / WhatsApp / chat"; RFP: "sends emails, in-app notifications, or SMS through the Communications module"; DOC1: `SmsGatewayPort` owner | Message → SMS/WhatsApp/email | Deterministic | SMS and WhatsApp out of R1 (CH2 Appendix A); CH1 lists Messenger among deferred Doers | SPEC-N §5; RFP §4.10; DOC1 §6.3.1 |
| **Biller** | SPEC-N: "invoices + retainers + trust"; DOC1: owns `PaymentRailPort`; "Money in the platform is single-sourced in the Biller" | Invoice/payment → ledger, `payment.*` | Deterministic | Yes (AG-6) | SPEC-N §5; DOC1 §6.3.1, §6.5 |
| **Reporter** | SPEC-N: "dashboards + BI"; DOC1 lists it as a Doer kind | Data → dashboards | Deterministic | Yes (AG-14 two dashboards; SA-9 minimum) | SPEC-N §5; DOC1 §1.12.2 |
| **Dialer** | SPEC-N: "click-to-call + call logging" | — | Deterministic | No: TRI "(drop) Click-to-call dialer" | SPEC-N §5; TRI AG-02 |
| **Qualifier** | SPEC-N: "eligibility + pathway + CRS scoring" (IP "scoring engine"); DOC1: pure in-house Doer, no rail; FDL A-3: "AG-3 (Qualifier runtime)" | Answers + rules → verdict, reasons, gaps, score | Deterministic (FD-16: "no model output is ever a decision") | Yes (AG-3 core engine) | SPEC-N §5; DOC1 §6.3; FDL A-3 |
| **Filler** | SPEC-N: "IMM form auto-fill (IMM0008…)"; DOC1: "a pure, data-driven function" | Answers + form map → filled PDF | Deterministic | **No** for R1 ("government form auto-fill", CH2 Appendix A; SA1B-D28) | SPEC-N §5; DOC1 §5.7 |
| **Drafter** | SPEC-N: "LOEs, retainers, submission letters" ("doc generation"); DOC1 lists it as a Doer kind; TRI: "Drafter AI and AI-text approval [F]" moved | Template/context → draft letter | Template fill = deterministic; "Drafter AI" = judgement (AI) | AI part proposed R2 [F]; template drafting Unknown | SPEC-N §5; DOC1 §1.12.2; TRI AG-10 |
| **Binder** | SPEC-N: "client doc collection + checklist" ("secure intake"); TRI: "document checklist (Binder)" stays | Requirements → checklist, requests | Deterministic | Yes (as checklist) | SPEC-N §5; TRI AG-07 |
| **Reviewer** | SPEC-N: "pre-submission QA / completeness" ("error-catching"); DOC1 lists it as a Doer kind | Case → completeness findings | Rule checks deterministic; quality judgement human | Unclear: TRI keeps "internal review", moves "readiness score, Checker" | SPEC-N §5; DOC1 §1.12.2; TRI AG-07 |
| **Finder** | DOC1: "a new platform **SearchModule** ('the Finder')" | Query → permission-filtered results | Deterministic | Unknown (not in CH1/CH2) | DOC1 §8.8; ADR C4-D4 |
| **Clocker** | FD-8: "Clocker (time-tracking; not 'Timer')" | Time → billable record | Deterministic | No (TRI AG-13 moves "timer") | FDL FD-8 |
| Future (SPEC-N) | "**Submitter** (IRCC submission) · **Reader** (OCR/extraction) · **Planner** (case roadmap/timeline) · **Timer** (billable-time tracking)" | — | Reader = extraction (AI/OCR) | Not R1; Reader "ships switched off" (TRI AG-08) | SPEC-N §5 |
| AI Doers (TRI) | "Reader AI — classify and extract [F]"; "Sorter AI [F]"; "Drafter AI and AI-text approval [F]"; "Checker mismatch warnings"; "The 4 AI Doers and their release gate (ship switched off anyway)" | — | Judgement (AI) | Proposed R2 | TRI AG-08/09/10/11 |

### 2b. Engines, planes and policies (not Doers)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| **Conductor / Workflow** | SPEC-N: "the conductor/automation engine that *runs* the Doers" (NOT a Doer); DOC1 glossary: "the workflow/automation engine + domain-event bus"; RFP: "orchestration rules that define triggers ..., conditions, and action sequences"; capability key `automation.conductor` | Domain events → Doer actions; skipped-with-reason when a capability is off | Deterministic ("rule-based 'when X, do Y'", CH1) | SPEC-N §6; DOC1 glossary, §1.12, §6.2.1; RFP §4.10; CH1 §1 notes |
| **Capability Registry** | "every functional capability — each in-house Doer and each major independent sub-function — is ... an **independently toggleable** capability" | Plan + firm switch + platform flag → ON/OFF | Deterministic, fail-closed | DOC1 §1.12 |
| **Rules engine (Predicate)** | "a typed, server-evaluable JSON tree over `canonicalFieldKey` answers"; closed operators `eq/neq/in/gt/gte/lt/lte/exists/and/or/not` | Answers → true/false | Deterministic ("side-effect-free, deterministic") | DOC1 §5.13.1 |
| **Scoring engine** | ScoringConfig/Factor/Bracket; "contiguous, non-overlapping cover" | Answers → points | Deterministic | DOC1 §5.13.2 |
| **Eligibility engine** | HARD / ADVISORY gates; runtime is "the assessment engine's job" | Answers → eligible / flags + messages | Deterministic | DOC1 §5.13.3 |
| **Stage pipeline** | Stages with `deadlineOffsetDays` and `kind` | Case → stage, deadlines | Deterministic | DOC1 §5.13.4, A1 |
| **Pack lifecycle and validator (Country Pack)** | "DRAFT → IN_REVIEW → APPROVED → PUBLISHED"; validation "Errors block publish; warnings require acknowledgment" | Draft content → published version | Deterministic checks; human approval | PHG §17; OVW §3.2, §3.5 |
| **Practice Pack resolver** | Two pack axes; conflict policies `MAX`/`MIN`/`UNION`/`EXCLUSIVE`/`ESCALATE` | Two packs → resolved obligation with both sources | Deterministic; ESCALATE goes to a human | FDL FD-22, A22-6.4 |
| **Representative resolver** | "a resolver that answers 'may this person be representative of record on this case' from the pair" | Licence + destination → yes/no | Deterministic | FDL A22-1 |
| **Automated-decision right** | `isAutomatedDecision` flag, factor snapshot, plain-language explanation, `REVIEW_OF_AUTOMATED_DECISION` routed "to a named human reviewer" | Assessment → reviewable record | Mechanism deterministic; review is human | FDL FD-20 |
| **AI policy** | "'AI assists, humans decide.'"; AI = "bounded, declared capability layer"; "every output is human-approved before it has effect"; `cap.ai.*` capabilities | — | AI = judgement; never a decision | FDL FD-16 |
| **Audit spine** | Per-firm, append-only, hash-chained, INSERT-only, WORM-anchored, written with the action | Action → audit entry | Deterministic | DOC1 §7.5; ADR NFR5-08 |
| **Permission model (RBAC)** | Two scopes (`system/*` GLOBAL; `agent/*`, `portal/*` LOCAL); scope-aware guard; ~259 firm permissions; six fixed firm starter roles; nine Expat Ready staff roles; `view.own`/`view.all` | Principal + route → allow/deny + audit | Deterministic, default-deny | DOC1 §4; OVW SA-6, §2; PHG §17 |
| **Identity** | Three walled sign-in pools; no service or AI pool | Credentials → principal | Deterministic | DOC1 §3.1 |
| **Consent register** | "per purpose (Law-25 granularity), with withdrawal"; "enforced at point of use" | Consent → allow/block processing | Deterministic | DOC1 §7.6 |
| **Retention, legal hold, disposal orchestrator** | "Legal hold ... **always beats** a deletion schedule or DSR clock" | Policy → crypto-shred + certificate | Deterministic | DOC1 §7.4, §7.6 |
| **DSR and breach registers** | DSR "statutory clock"; breach "RROSH gate", "72-hour clock" | Request → tracked response | Clock deterministic; RROSH judgement with counsel | DOC1 §7.6 |
| **Encryption and reveal** | Mask-by-default; `agent/pii:reveal`; audit before reveal | — | Deterministic | DOC1 §7.2 |
| **Domain Event Dictionary + idempotency ledger** | One emitter per event; per-firm ledger prevents double effects | Event → consumers once | Deterministic | DOC1 §6.1–§6.2 |
| **Rails as ports** | Payment, email, storage, SMS, identity; calendar/meeting connectors | Doer call → vendor | Deterministic | DOC1 §6.3, A3 |
| **FX service** | Single writer; manual adapter v1 | Rate → snapshot | Deterministic (human enters rate) | DOC1 §6.5 |
| **Import engine** | Map → dry-run → async → report | File → records | Deterministic; human mapping | DOC1 §8.9 |
| **AnswerSnapshot producer** | Freezes answers + config versions per decision | — | Deterministic | DOC1 A4 |

---

## Part 3: AI and automation already written into the requirements

| # | Exact words | Status / reason given | Citation |
|---|---|---|---|
| 1 | "'AI assists, humans decide.' The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision." | Founder decision, resolved 2026-08-02 | FDL FD-16 |
| 2 | "AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect." | Same | FDL FD-16 |
| 3 | "AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane." | Same | FDL FD-16 |
| 4 | "AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact." | Same | FDL FD-16 |
| 5 | "Marketing may say 'AI-assisted'; it may not say the AI decides." | Same | FDL FD-16 |
| 6 | "AI copilot — an intelligence layer across everything." (listed under "NOT Doers — by design") | Founder spec, June | SPEC-N §6 |
| 7 | "Advisor / Counselor \| Helper *(or keep as AI layer)*" | Founder spec | SPEC-N §3 |
| 8 | "**Reader** (OCR/extraction)" among "Future Doers (confirm when built)" | Future | SPEC-N §5 |
| 9 | "NOT IN RELEASE 1 AI-assisted features · Automation engine (AG-11) and its Doers · Advanced engagement scoring" | Deferred; no reason on slide | CH2 slide 1; CH1 §1 |
| 10 | "Advanced engagement scoring = automatic lead and client engagement scores; manual follow-up and stall flags stay." | Deferred | CH1 §4 scope notes |
| 11 | "AI drafting and diffing of box maps (all parked until the content pack SQR is final — SA1B-D28); AI reading of uploaded documents into answers" | Phase 3 | PHG §16 SA-1B row |
| 12 | "Reader AI — classify and extract **[F]** (ships switched off anyway)" | Proposed R2; earlier founder decision | TRI AG-09 |
| 13 | "Reader approval (ships switched off)" | Stays in R1, switched off | TRI AG-08 |
| 14 | "Sorter AI **[F]**"; "Drafter AI and AI-text approval **[F]**" | Proposed R2 | TRI AG-10 |
| 15 | "The 4 AI Doers and their release gate (ship switched off anyway)"; "AI-only triggers" | Proposed R2, "almost all [F], decided 4–5 Oct" | TRI AG-11 |
| 16 | "Autonomy levels on every action (Auto / Ask me / Off) — on/off per recipe is enough" | Proposed R2 | TRI AG-11 |
| 17 | "'Needs you' inbox + 'Done for you' home screen" | Proposed R2 | TRI AG-11 |
| 18 | "Full dry-run / simulation engine" | Proposed R2 | TRI AG-11 |
| 19 | "AI settings **[F]**, Team safeguards screen **[F]**" | Proposed R2 | TRI AG-16 |
| 20 | "Reader AI filing of documents **[F]**"; "near-match suggestions" | Proposed R2 | TRI AG-18 |
| 21 | "Lead scoring and 'what to do next' ranking" | Proposed R2 | TRI AG-02 |
| 22 | "What-if recommendations ('CLB 8→9 = +X points')"; "Draw-cutoff competitiveness band"; "auto-assess" | Proposed R2 | TRI AG-03 |
| 23 | "Deficiency library, auto-detect rules, readiness score, Checker"; "Form auto-fill engine (the Filler) — biggest build cost" | Proposed R2 | TRI AG-07 |
| 24 | "Checker mismatch warnings" | Proposed R2 | TRI AG-08 |
| 25 | "(drop) Language-test / ECA extraction" | Proposed drop | TRI AG-09 |
| 26 | "(drop) ... auto-translation"; "No machine-translation of legal copy." | Drop / rule | TRI AG-12; FDL B-3 |
| 27 | "CRS score ... with per-factor breakdown, comparison against recent draw cut-offs, and actionable improvement recommendations." | RFP lineage only | RFP §4.3 |
| 28 | "Automation Engine — Conductors & Doers" with "a visual builder in the UI" | RFP lineage; "Visual builder" already Release 2 (TRI) | RFP §4.10 |
| 29 | "Automation templates \| Pre-built Conductor/Doer automation blueprints ... (e.g., ITA deadline alert for Express Entry)" | Pack content domain; SA-5 "Automation Conductor templates" Phase 3 | OVW §3.1; PHG SA-5 |
| 30 | OCR as background work: "form generation, OCR, search projection, inbound-mail sync" | Infrastructure placeholder only | DOC1 §1.1, §1.4 |
| 31 | "'Human review' means a client can ask a named person to review an automated eligibility result (FD-20)." | R1 (golden journey 8: "human review of an automated result") | CH1 §1 notes; CH2 slide 6 |
| 32 | "The platform produces scores, flags, and information. It does not provide legal opinions." | OUT of scope item | RFP §5 |
| 33 | Proposed earlier: "Founder decision needed: case deadlines and document expiry need a watcher" | Open | CH1 §1 notes |
| 34 | The founders' email-recorded idea (E1/E4) is not in any Drive file in this slice. | Note | — |

Grep checks: RFP, ADR and DOC1 contain no "AI", "LLM" or "machine learning" (DOC1 mentions "OCR" three times as a background job).

---

## Part 4: Guardrails already in the requirements (an AI Worker must obey)

| Guardrail | Exact words | Citation |
|---|---|---|
| AI never decides | "no model output is ever a decision"; "every output is human-approved before it has effect" | FDL FD-16 |
| No AI identity, no autonomous permissions | "no AI principal in the identity spine, no autonomous permissions, no new plane" | FDL FD-16 |
| AI is a switchable, plan-gated capability with provenance | "plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact" | FDL FD-16 |
| Capability off = Doer does nothing, recorded | "an OFF capability's Doer **no-ops with an audited reason**" | DOC1 §1.12.5 |
| Instant kill-switch | "inert within one request ... with **no code change and no deploy**" | DOC1 AC-1.12.3 |
| Named human review of automated results | "routing to a named human reviewer with a recorded outcome" | FDL FD-20 |
| Assessment shared with client only after review (default) | "review-before-share configurable (default on)" | FDL D-6 |
| Refusals never auto-surfaced | "refusal HELD for firm release (never auto-surfaced)" | FDL D-4 |
| Legal advice stays human | "Compliance features help RCICs fulfill their obligations; they do not replace qualified legal judgment." | RFP §5 |
| Representative of record | "may this person be representative of record on this case" resolver; Practice Pack carries "supervision rules for unlicensed staff" | FDL A22-1, FD-22 |
| Countersign by the RCIC | "countersign = sequential client→firm, restricted to assigned RCIC" | FDL D-6 |
| Signer assurance | OTP "before the signature is applied"; "No pack may lower it." | FDL FD-21, A22-5 |
| Dual control on rules and packs | "Dual-control for rule/scoring/eligibility artifacts"; production pack approved "by someone other than its author and submitter" | FDL FD-4; OVW §3.2 |
| Unresolved rule conflicts stop | "a parameter with **no declared policy** resolves to `ESCALATE`, so an unclassified conflict stops the action rather than guessing" | FDL A22-6.4 |
| Pinning; adopting new rules is a human act | "moving it to newer rules is an explicit, audited adoption by firm staff" | PHG §17 |
| Trust money moves only with a reason | "requires an explicit, audited, reason-coded event tied to a delivered milestone or issued invoice" | FDL FD-17 |
| Default deny | "A route with no `@RequirePermissions` and no `@Public()` ... is **denied**" | DOC1 §4.2 |
| Scope from the session only | "PrincipalContext is the ONLY scope source." | DOC1 §4.5 |
| Own vs all records | "`view.own` is satisfied only when the record-level layer ... resolves the record's ownership to the caller" | DOC1 §4.1 |
| Permissions are a human security decision | "a security decision that must not be auto-generated" | DOC1 §4.4 |
| Support access | "scoped, time-boxed, step-up-gated"; "stated justification"; shown to firm owner | DOC1 §4.5; PHG §17 Support Session |
| Step-up before risky actions | "Re-confirming identity ... just before a risky action" | PHG §17 |
| Audit everything, in the same transaction | "**Synchronous via an outbox, atomic with the user op**" | DOC1 §7.5 |
| Audit before revealing sensitive data | "if the audit write fails, the reveal is denied" | DOC1 §7.2 |
| Sensitive data never to outside pipes, logs or search | "no Restricted PII is ever sent to a payment, SMS, or messaging rail"; "never lands in a search index or a log line" | DOC1 §7.7, §7 |
| Canadian residency | "must be stored and processed within Canada"; "Sub-processors must be assessed for Canadian residency." | RFP §6 |
| Consent at point of use | "a withdrawn purpose blocks that processing path at point of use" | DOC1 AC-7.6.1 |
| Contact consent follows the recipient | "*consent to contact a specific person* resolves from that recipient's jurisdiction" | FDL A22-2 |
| Tasks carry no sensitive values | "Restricted values never in task free-text" | FDL FD-14 |
| Legal hold wins | "Legal hold ... **always beats** a deletion schedule or DSR clock" | DOC1 §7.4 |
| Legal wording reviewed, not machine-translated | "legal types hard-require REVIEW before publish"; "No machine-translation of legal copy." | FDL B-3 |
| No hardcoded legal or money rules | "No money, legal, privacy, retention or tax rule may be hardcoded." | FDL FD-22 |
| Gates never waived | "Security, money and privacy are never waived" | CH2 slide 2 |
| Advice regression check | "Golden cases are sample clients with known correct answers, re-run after every change to prove advice has not shifted." | CH1 §5 notes |
| Imported data | "imported values marked unverified"; "never send imported" guard | TRI AG-08, AG-10 |

---

## Part 5: Conflicts, gaps and surprises

| # | Finding | Evidence |
|---|---|---|
| C1 | **AG-11 automation and its Doers: in or out of Release 1?** Charter V1 and V2 say out; the 5 Oct scope triage (a review file) keeps the engine, the Minder and four recipes; AG-4 keeps reminders "through AG-11". | CH2 slide 1 "NOT IN RELEASE 1 ... Automation engine (AG-11) and its Doers"; TRI AG-11 "Stays: deadline reminders (the Minder) · automation engine"; TRI AG-04 |
| C2 | **Launch date conflict (12 Mar vs 28 Feb 2027).** CH2 slide text says market launch 12 Mar 2027 (slides 1–2) but "market launch 28 Feb" (slide 3); CH2's own speaker notes for slide 1 say "Release 1 launches on 28 Feb 2027 (production release 23 Feb)"; slide 2 is titled "The path to 3rd March"; production release "4 March" (slide 1) vs "production 23 Feb" (slide 3). CH1 says production 23 Feb and launch 12 Mar. The date rule makes 28 Feb a pilot-firm launch if G3 slips. CH2 notes also move gates: "G1 moved to Fri 30 Oct" (slide: 15 Nov) and the date decision "at G3 on 18 Dec" (slide: G3 2 Jan), re-entry check "against the 15 Jan target" (slide: G4 31 Jan). Slide text and notes were not reconciled. | CH2 slides 1–3 and notes 1–2; CH1 §1, §2 |
| C3 | **AI scope.** Ranjan's AIW-D1 puts all AI, AI Workers and Doers in scope; Drive Charter still says "AI-assisted features" not in R1. Not changed on Drive. | CH2 slide 1; ai-workers/README §5 |
| C4 | **FD-16 versus the AI Worker idea.** FD-16 forbids an AI principal and autonomous permissions. An AI Worker that "operates Expat Ready itself" as its own user would need FD-16 changed, or must act inside a named human's session with every output approved. **Inferred**; founder decision needed. | FDL FD-16 |
| C5 | **No machine actor anywhere in the foundation.** Exactly three sign-in pools; the only machine access is read-only API keys and webhooks; no audit field marks AI-produced actions (only "actor, persona"). Doc 1 v1.3 (26 Jun) predates FD-16 (2 Aug) and was not updated. | DOC1 §3.1, §7.5, §8.10 |
| C6 | **Doer definitions disagree.** Minder = "deadlines, status, audit trail" (SPEC-N) vs "task creation and assignment" (RFP); Tasker = "tasks + assignments" vs "workflow task automation"; Reminder folded into Minder (FD-8) but still a Tier-2 Doer in SPEC-N; "Clocker" (FD-8) vs "Timer" (SPEC-N); Finder and Clocker are not in SPEC-N; Dialer not in DOC1. SPEC-N says Tier 1 is "Live now (shipped)" — repo status in June, not verified now. | SPEC-N §5; RFP §4.10; FDL FD-8; DOC1 §1.12.2 |
| C7 | **What "its Doers" means in the Charter is ambiguous.** CH1 notes define them as "rule-based 'when X, do Y' tools such as Minder, Tasker and Messenger", while Signer, Biller, Scheduler, Mailer functions are clearly in R1. **Inferred**: the deferral covers automation Doers, not every -er tool. | CH1 §1 notes |
| C8 | **Deadline watcher undecided.** "either keep a simple deadline and expiry reminder in scope or track deadlines by hand at launch" — open founder decision; AG-17 relies on "validity clock via Minder". | CH1 §1 notes; TRI AG-17 |
| C9 | **Pack carries automation content while automation is deferred.** Country Pack has an "Automation templates" domain and pack validation needs "At least one workflow template per active program". | OVW §3.1, §3.5 |
| C10 | **Phasing models clash.** ADR 6.2 says "DE-PHASE to ONE frozen full scope. Delete all P1/P2/P3 tags"; the October Phasing file uses P1/P2/P3 and the Charter cuts scope. **Inferred**: ADR de-phasing superseded. | ADR 6.2; PHG §16 |
| C11 | **SA-11 privacy plane vs launch journey.** Phasing puts breach register in Phase 3 and DSR register/retention in Phase 2, but golden journey 8 requires "breach logged" and privacy requests before Go/No-Go. Tamper-evident hash chain: core in DOC1/ADR, proposed R2 in TRI AG-13. | PHG SA-11 row; CH2 slide 6; TRI AG-13 |
| C12 | **SA-1-B is named two ways**: "SQR Configuration" (CH1 Appendix A) vs "Practice Pack" (CH2 slide 7, "Pending ???"). | CH1 §4; CH2 slide 7 |
| C13 | **AG-18 Import** appears in the triage but not in the Charter's 16 agent modules. | TRI AG-18; CH2 slide 4 |
| C14 | **Status mismatches** between CH1 §7 and CH2 slide 7 (SA-7, AG-7, AG-17 "Pending" vs "Delivered"); CH2 Appendix B says "complete by G4 (15 Jan)" while G4 is 31 Jan; SA-9 missing from CH2 slide 7. | CH1 §7; CH2 slides 2, 5, 7 |
| C15 | **FD numbering gap.** Other files cite FD-68; the snapshot's FDL v1.5 stops at FD-22. Later founder decisions are not in this snapshot (Unknown where they live). | PHG §17 "Firm Country"; FDL |
| C16 | **Session rules differ**: DOC1 idle timeouts for firm staff and portal vs SA-7: "firm users and clients are never auto-logged out". | DOC1 §3.4; PHG §17 (SA7-D67) |
| C17 | **AI sub-processor not covered.** The residency rules and the per-rail sub-processor matrix list no AI or model provider; any AI model call would be a new sub-processor needing Canadian residency review. **Inferred**. | RFP §6; DOC1 §7.7 |
| C18 | **Engagement scoring and lead ranking** deferred (Charter, triage) — the obvious AI suggestion features are explicitly not R1. | CH1 §4; TRI AG-02 |
| C19 | **RFP OUT table** says firms' trust accounting is out; FD-17 reversed it (trust-aware light in v1). RFP is lineage only. | RFP §5; FDL FD-17 |
| C20 | **Triage and calendar connectors**: DOC1 A3 defines calendar/video connectors; TRI proposes two-way calendar sync and video connectors for R2, and drops the in-house video room that FD-13 made the v1 adapter. | DOC1 A3; TRI AG-04; FDL FD-13 |

---

## Appendix A: Release and launch-date statements (all found in this slice)

| Statement (exact words) | Citation |
|---|---|
| "MARKET LAUNCH 12 th March 2027"; "Production release 4 March" | CH2 slide 1 |
| "Release 1 launches on 28 Feb 2027 (production release 23 Feb)." | CH2 speaker notes, slide 1 |
| "G1 moved to Fri 30 Oct (31 Oct is a Saturday)."; "The launch-or-slip decision is taken at G3 on 18 Dec with the cut line applied, never in February." | CH2 speaker notes, slide 2 |
| "All dates are working targets until the delivery team confirms them on 9 Oct 2026." | CH2 slide 1; CH1 §1 |
| "LAUNCH OBJECTIVE One firm. One client. Enquiry to filed case. No manual workaround." | CH2 slide 1 |
| "The path to 3rd March"; gates G1 15 Nov, G2 11 Dec, G3 2 Jan, G4 31 Jan, G5 26 Feb, G6 Go/No-Go 3 Mar; "Market 12 Mar" | CH2 slide 2 |
| "if G3 misses by more than a week, 28 Feb becomes a pilot-firm launch and public sale moves to 30 Apr." | CH2 slide 2; CH1 §2 |
| "Help and support live; market launch 28 Feb"; "Cutover rehearsal; production 23 Feb; hypercare March" | CH2 slide 3 |
| "Market launch: 12 March 2027"; "Production release: 23 February" | CH1 §1 |
| "Release 1 launches on 12 Mar 2027 (production release 23 Feb)." | CH1 §1 speaker notes |
| "NOT IN RELEASE 1 AI-assisted features · Automation engine (AG-11) and its Doers · Advanced engagement scoring" | CH2 slide 1 |
| "Already out by earlier decisions: government form auto-fill, Quebec programs, SMS and WhatsApp, single sign-on, credit notes." | CH2 slide 4 |
| "AG-17 (LMIA recruitment evidence) and CP-9 (employer view, read-only) are in Release 1." | CH1 §1 notes |
| "Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28)." | CH1 §1 notes |
| "Ordinary tasks, reminders and three plain notices (consultation reminder, unsigned document chase, missing evidence nudge) stay." | CH1 §1 notes |
| "Launch minimum: SA-9 = a basic firm and revenue view; SA-10 = a support mailbox plus logged read-only support sessions." | CH1 §4 notes |
| "Record scope decisions: write the Release 1 deferrals and the AG-17/CP-9 inclusion into the Founder Decisions Log, because the original scope rule treats anything not excluded as in scope." | CH1 §4 notes |
| "Phase 1 must produce a working Canada pack that real immigration firms can consume." | PHG §16 |
| "Every feature is still in Release 1 until we go through this together and you decide." | TRI header |
| "SSO is explicitly **not** in the launch scope" | DOC1 §3.8 |
| RFP/ADR model: "one fixed full scope" with waves A–E (June; superseded in practice by the Charter's cuts — Inferred) | RFP §8; ADR 6.2 |

## Appendix B: Founder decisions relevant to automation, AI, Doers, sign-off, privacy and residency

| FD | Decision (short exact words) | Relevance |
|---|---|---|
| FD-3 | "Pin at case open + explicit audited re-pin/migrate" | Rule changes never silently change open cases |
| FD-4 | "Dual-control for rule/scoring/eligibility artifacts" | Second person on any rule an AI might draft |
| FD-5 | "Flattened-overlay support in v1 (coordinate-mapped fill + FormFieldMap visual editor)" | Later parked for R1 (SA1B-D28) |
| FD-7 | AG-17 "Light-evidence ... no candidate identity plane ... CP-9 employer sees read-only summary" | LMIA scope |
| FD-8 | "Clocker (time-tracking; not 'Timer') · Reminder folds into Minder" | Doer roster |
| FD-9 | "Per-case threads + client-may-start" | Messaging |
| FD-12 | "platform never intermediates funds" | Money |
| FD-14 | "Reference-only tasks — ... Restricted values never in task free-text" | Tasks an AI creates |
| FD-15 | Restricted document metadata "envelope-encryption + masked audited reveal" | Extraction output |
| **FD-16** | "'AI assists, humans decide.'" ... "no AI principal in the identity spine, no autonomous permissions" | The binding AI policy |
| FD-17 | Trust: "no automatic sweep of client funds into operating" | Money automation limit |
| FD-18 | "Per-seat tiers by firm size (Solo / Small 2–5 / Firm 6+)" + "metered add-ons for consumption rails" | Pricing shape for AI Workers |
| FD-19 | "Solo and small RCIC practices, 1–5 people"; "a solo RCIC still needs review/QC, coverage while away" | Target buyer |
| **FD-20** | `REVIEW_OF_AUTOMATED_DECISION` "routing to a named human reviewer with a recorded outcome"; "Counsel confirms wording, not mechanism." | Human review right |
| FD-21 | OTP signing + "sealed **evidence bundle**" | Signing cannot be automated around |
| FD-22 | Country Pack vs Practice Pack; "No money, legal, privacy, retention or tax rule may be hardcoded."; A22-1 representative resolver; A22-2 recipient-jurisdiction consent; A22-6.4 ESCALATE to a named human | Licensed sign-off and conflict handling |
| B-1 | Restricted-PII list (counsel) | What an AI may see |
| B-2 | Retention floors, breach clock (counsel) | — |
| B-3 | "No machine-translation of legal copy." | AI translation limit |
| B-4 | Impersonation "NOTIFIED default with a per-firm CONSENTED toggle for Quebec"; "DSR self-request with firm-confirm step" | Consent posture |
| D-1 | Representative model RCIC-only vs lawyers/Quebec (open; CH2 founder input due 9 Oct) | Who signs off |
| D-2 | "Platform = MFA mandatory-locked"; "firm = required-for-admins"; "SSO ... NOT v1" | — |
| D-4 | "refusal HELD for firm release (never auto-surfaced)"; nudges "SMS/WhatsApp off at launch" | Client messaging limits |
| D-6 | "review-before-share configurable (default on)"; "at-risk = manual-acknowledge" | Human review defaults |
| Eng. default | "launch ca-central-1 only; CI region allow-list" | Residency |

---

## Appendix C: Reading notes (word-for-word extracts, per document, in reading order)

### Notes: founders' Doer specs (code/expat-ready-api@c4117a3-2026-10-09, read in full)

### 2026-06-13-er-doers-brand-naming-spec.md (v1, "decided 2026-06-13 (founder)")
- Scope: "Applies to **tools/plugins only** — never the core/global modules."
- Naming test §4 step 4: "Is it a tool, not an engine/surface? — Workflow (engine) and Client Portal (surface) are NOT Doers."
- Roster §5. Tier 1 "Live now (shipped)": Signer (e-signature, replaces DocuSign), Mailer (email + sequences), Scheduler (consult booking / calendar), Tasker (tasks + assignments).
- Tier 2 "Replace the generic stack": Reminder (follow-ups + nudges), Biller (invoices + retainers + trust), Reporter (dashboards + BI), Messenger (SMS / WhatsApp / chat), Dialer (click-to-call + call logging).
- Tier 3 "The immigration-only moat": Qualifier (eligibility + pathway + CRS scoring; IP "scoring engine"), Filler (IMM form auto-fill (IMM0008…); "form intelligence"), Drafter (LOEs, retainers, submission letters; "doc generation"), Binder (client doc collection + checklist; "secure intake"), Reviewer (pre-submission QA / completeness; "error-catching"), Minder (deadlines, status, audit trail; "compliance").
- Future Doers "(confirm when built)": Submitter (IRCC submission), Reader (OCR/extraction), Planner (case roadmap/timeline), Timer (billable-time tracking).
- §6 NOT Doers: "Workflow — the conductor/automation engine that *runs* the Doers." "Client Portal — the client-facing surface." "CRM spine — pipeline, contacts, cases (the system of record)." "AI copilot — an intelligence layer across everything."
- Mental model: "Doers = the hands. Workflow = the brain. The spine = the skeleton."
- §3 table: "Advisor / Counselor | Helper *(or keep as AI layer)*"; "Administrator / Processor | *(core module — not a Doer)*".
- Positioning §7: "A CRM talks. ER does."; competitors Officio / Caseasy, Visto.ai / Visafly.
- Clearance log: Tracker renamed Minder (clash with ImmigrationTracker); Gatherer renamed Binder.

### 2026-06-14-er-product-ia-doers-model.md (v1, "approved 2026-06-14 (founder)")
- "Doers are verbs, not destinations"; three homes: daily surface, contextual action inside a record, global "⌘K · Do" bar.
- Daily sidebar Doer surfaces: Mailer, Scheduler, Tasker, Biller, Reporter. "Action-Doers — Signer, Drafter, Filler, Binder, Qualifier, Reviewer, Minder, Messenger, Dialer — are NOT sidebar items."
- "Automation — Workflow (the conductor; NOT a Doer)".
- My Day cards: Consults today (Scheduler), Tasks due (Tasker), Follow-ups (Reminder), Docs overdue (Binder), Deadlines this week (Minder), Awaiting signature (Signer), Money in (Biller), New assessments (Qualifier).
- On a Case: "Binder (docs) · Filler (forms) · Drafter (letters) · Reviewer (QA) · Signer (e-sign) · Minder (deadlines/audit) · Biller (invoice)." On a Lead: "Qualifier (assess) · Scheduler (book) · Mailer (email) · Drafter + Signer (retainer) · Biller (invoice)."
- Visibility gate: "`accessControlProvider.can()` defaults to DENY".
- Phasing: "Demo ship (Priya journey)": rename sidebar, My Day, "the 4 live Doers as surfaces", basic ⌘K, contextual Doer actions on the Case.
- NOTE: these specs live in a personal repo (sanjaysingh2103), not on Drive; Doc 1 naming must be checked against them.

### Notes: Program Charter_V2.pptx (7 slides, header "RELEASE 1 / PRODUCT & LAUNCH PLAN / v6"; text extracted from slide XML, read in full)
- Slide 1: "MARKET LAUNCH 12 th March 2027"; "Production release 4 March"; "LAUNCH OBJECTIVE One firm. One client. Enquiry to filed case. No manual workaround."; "All dates are working targets until the delivery team confirms them on 9 Oct 2026."
- Journey steps: Win; Assess & advise ("Explained result, human review"); Engage ("Passcode e-signing"); Bill & collect ("Trust ledger"); Prepare & deliver ("Smart questionnaire", "Filing recorded, tracked", "LMIA recruitment evidence"); Client portal ("Employer view (read-only)").
- "ACROSS EVERY STEP Messaging · tasks and reminders · templates · data import · audit trail · reports · English and French · accessible (WCAG 2.2 AA)".
- "37 modules on one client record"; Foundation "Largely built · finish Oct"; Super Admin 12 modules "In build · finish Nov"; "Agent console 16 modules" "Build Oct – Dec"; Client portal 9 modules "Build Nov – Dec".
- Country Pack content: "Programs and pathways · eligibility and CRS scoring · SQR questionnaire rules · checklists · stages · form list". Practice Pack: "Regulator, trust money, fees and complaints, retention, privacy, e-signature, tax".
- **"NOT IN RELEASE 1 AI-assisted features · Automation engine (AG-11) and its Doers · Advanced engagement scoring"**.
- Slide 2 title: "The path to 3rd March". Gates: G1 Platform ready 15 Nov; G2 Core journey 11 Dec; G3 Feature complete 2 Jan; G4 Release candidate 31 Jan; G5 Business accepted 26 Feb ("legal sign-off"); G6 Go / No-Go 3 Mar; "Market 12 Mar".
- G6 quality gate "0 Money and advice unexplained variance; golden cases match". "Founder decides each gate on evidence from the dev lead, QA lead and business owner. Security, money and privacy are never waived".
- Date rule: "if G3 misses by more than a week, 28 Feb becomes a pilot-firm launch and public sale moves to 30 Apr."
- Slide 3 back-plan: Foundation "in-house e-sign" in Oct; Live 23 Feb for all planes; commercial readiness Feb "Help and support live; market launch 28 Feb"; "Cutover rehearsal; production 23 Feb; hypercare March". Client portal Oct column: "Designs signed off | Not Scoped". Agent console Oct: "20% built: firm setup, data import, CRM. Corporate Module".
- Slide 4 Appendix A: lists SA-1..SA-12, AG-1..AG-10, AG-12..AG-17 (AG-11 absent), CP-1..CP-9. "Deferred: AI-assisted features · AG-11 automation engine and its Doers · advanced engagement scoring. Already out by earlier decisions: government form auto-fill, Quebec programs, SMS and WhatsApp, single sign-on, credit notes." Asks: 9 Oct founder "PNP streams; representative model; scope log"; 16 Oct "Restricted-data fields"; 15 Jan Counsel "Retention, breach and consent rules".
- Slide 5 Appendix B: "complete by G4 (15 Jan) unless shown otherwise" (NOTE G4 = 31 Jan on slide 2). Country Pack owner "Founder + immigration expert", "v0 on staging 13 Nov · published 15 Jan". Practice Pack "Founder + counsel". Roles and access: "Role templates and permission values · platform users with MFA · support access rules · restricted personal-data list". Connected services "in-house e-signature settings".
- Slide 6 Appendix C golden journeys: J1 "Author Country and Practice Packs, second-person approval, publish, activate Canada"; J4 "Web enquiry, duplicate check, explained assessment, consultation, retainer EN/FR, passcode signing, invoice, payment, case opened"; J8 "human review of an automated result, breach logged"; J9 "Rule update leaves open cases unchanged ... audit export verifies".
- Slide 7 Appendix D requirement status: Delivered SA-1-A, SA-2, SA-3, SA-4, SA-7, AG-7, AG-17; SA-1-B Practice Pack "⚠️ Pending ???"; CP modules due 2–23 Dec. (SA-9 Analytics missing from the SA list on slide 7.)
- **Speaker notes (notesSlide1–7, extracted after first pass):** slide 1 notes: "Release 1 launches on 28 Feb 2027 (production release 23 Feb)." Otherwise same wording as CH1 §1 notes, including the Doer definition "rule-based 'when X, do Y' tools such as Minder, Tasker and Messenger; Reminder was folded into Minder by FD-8" and the deadline-watcher founder decision. Slide 2 notes: "G1 moved to Fri 30 Oct (31 Oct is a Saturday)."; "re-entry check compares ... against the 15 Jan target"; "The launch-or-slip decision is taken at G3 on 18 Dec". Slides 3–7 notes match CH1 notes (slide 7 notes duplicate slide 6).
- DATE CONFLICTS inside V2: Market launch 12 Mar 2027 (slide 1, 2) vs "market launch 28 Feb" (slide 3) vs title "The path to 3rd March" (slide 2) vs Go/No-Go 3 Mar, Production release "4 March" (slide 1) vs "production 23 Feb" / "Live 23 Feb" (slide 3).

### Notes: Program Charter V1 - G1 expanded.md (markdown dump of "Program Charter V1 - G1 expanded v2.pptx", 599 lines, read in full)
- §1 "Market launch: 12 March 2027"; "Production release: 23 February" (V2 slide 1 says "Production release 4 March").
- §1 speaker notes, JOURNEY: "'Filing recorded' means staff file on the government portal themselves and record it in the case; Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28)." "'Human review' means a client can ask a named person to review an automated eligibility result (FD-20)."
- §1 speaker notes, PLANES: "AG-17 (LMIA recruitment evidence) and CP-9 (employer view, read-only) are in Release 1." "Client portal (a web portal that works on a phone; not a native app)".
- §1 speaker notes, CONFIG: "Country Pack = Canada's immigration rules held as data. Practice Pack = the firm's own regulator rules. A firm cannot be created until both are published". "SA1-D2 makes French optional for pack text".
- **§1 speaker notes, NOT IN RELEASE 1 (key Doer definition): "the AG-11 automation engine and its Doers (rule-based 'when X, do Y' tools such as Minder, Tasker and Messenger; Reminder was folded into Minder by FD-8)". "Ordinary tasks, reminders and three plain notices (consultation reminder, unsigned document chase, missing evidence nudge) stay." "Founder decision needed: case deadlines and document expiry need a watcher; either keep a simple deadline and expiry reminder in scope or track deadlines by hand at launch."**
- §1 TERMS: "SQR = the smart questionnaire that asks only what the pathway needs. RCIC = licensed immigration consultant, regulated by CICC."
- §2 gates identical to V2. §2 notes: "Pilots load real client data from 15 Jan, but the pen test runs 25 Jan to 5 Feb" (founder decision). "Candidates for the cut line, in order, are a founder decision; LMIA and the employer view are the largest late items."
- §3 back-plan: Feb column struck through ("~~Live 23 Feb~~", "~~Help and support live; market launch 12 Mar~~"). Note V1 Feb says 12 Mar; V2 slide 3 says 28 Feb.
- §4 Appendix A: Super Admin listed as "SA-1-A Country Packs", "SA-1-B SQR Configuration" (V2 says "SA-1 Country and Practice Packs"; V2 slide 7 calls SA-1-B "Practice Pack") — naming conflict for SA-1-B.
- §4 Deferred scope: "AI-assisted features · AG-11 automation engine and its Doers · Advanced engagement scoring · Government form auto-fill · Quebec programs · SMS and WhatsApp · Single sign-on · Credit notes".
- §4 notes: "Representative model: who can represent clients (licensed consultants only, or also lawyers and Quebec), and whether each case has one representative of record." "Record scope decisions: write the Release 1 deferrals and the AG-17/CP-9 inclusion into the Founder Decisions Log, because the original scope rule treats anything not excluded as in scope." Restricted-data fields: "passport and travel-document numbers, SIN, government IDs, bank details, biometric references, licence credentials". "Accounts: Stripe, AWS (Canada), email sending domain, owned by Expat Ready."
- §4 SCOPE NOTES: "SA-9 = a basic firm and revenue view; SA-10 = a support mailbox plus logged read-only support sessions. Advanced engagement scoring = automatic lead and client engagement scores; manual follow-up and stall flags stay."
- §4 SOURCES: "Platform Foundation v1.3, Super Admin Console v1.4 ..., Agent Console v1.4, Client Portal v1.3, Founder Decisions Log v1.5" captured 29 Sep 2026.
- §5 Appendix B notes: "Golden cases are sample clients with known correct answers, re-run after every change to prove advice has not shifted."
- §7 G1 requirement status: SA-7 "Pending 7 Oct" (V2: Delivered 3 Oct); AG-7 "Pending 11 Nov" (V2: Delivered 3 Oct); AG-17 due "~~2 Dec~~" (V2: Delivered 3 Oct). Delay tolerance SA "minimal to none", AG "8 Days", CP "2-3 Weeks".
- Sprint planning: two-week sprints from 5 Oct 2026, max three modules per week; CP-9 build week 28 Dec–2 Jan.

### Notes: 99-Phasing-and-Glossary v2.14 (2026-10-08), read in full (§16 Phasing Summary, §17 Glossary). Covers SA modules only.
Phasing rows (Phase 1 Must = Release 1 per §16 rationale "Phase 1 must produce a working Canada pack"):
- SA-1 P1: "draft → review → approve → publish with second person for production, scheduled publish, rollback; validation, test run, diff". P3: "second country pack; French required; Quebec programs".
- SA-1B P1: configurator, PQR, "assessment output", "form lines on a row (which forms a filing needs, assignment, upload, e-sign, readiness — autofill parked)". P2: "The overdue-review work queue; exempt offers ... (Release 2, AG17-D51)". **P3: "Box maps and deterministic form filling; the forms and field-map editor; AI drafting and diffing of box maps (all parked until the content pack SQR is final — SA1B-D28); AI reading of uploaded documents into answers; translation tooling; rule and scoring test profiles; comparison against draw cut-offs; employer compliance depth".**
- SA-2 P1: "read-only support sessions + firm-visible history". P2: "automatic 90-day deletion job".
- SA-3 P1: "second-approver changes on live plans"; "limits enforced (seats and active corporate cases hard; others warn → hard after 14 days)".
- SA-4 P1: "14-day failed-payment timeline → payment hold"; "signed, once-only processor notifications".
- **SA-5 P3: "Automation Conductor templates".**
- SA-6 P1: "Permission catalog ... the same six fixed starter roles for every firm — Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only"; "internal (Super Admin) role editor".
- SA-7 P1: "mandatory second step"; "nine configurable starter roles"; "step-up before support sessions, staff access changes, refunds and settings".
- **SA-8 P1: "Storage / email-relay / payment-processor rails; in-house Signer settings". P3: "SMS/WhatsApp gateway, per-country storage routing".**
- SA-9 P1 "Basic tenant and revenue dashboard". SA-10 P1 "Ticket queue, messaging, status management".
- **SA-11 P1: "Immutable audit log (INSERT-only), security event logging, basic query/export". P2: "Data residency declaration, retention config, PIPEDA DSR register". P3: "Per-country data residency routing, breach register, cold-storage archival".** (Conflict: Charter J8 golden journey requires "breach logged" at launch.)
- SA-12 P1 "Plan-level feature flag resolution (derived from PlanPermission); per-firm emergency off for corporate".
Glossary items relevant to AI Workers:
- "Pinning / Adoption": "moving it to newer rules is an explicit, audited adoption by firm staff (SA-1)".
- "Representative type": "RCIC (CICC), lawyer / notary (law society or Chambre des notaires), paralegal (law society)".
- "Pack Validation": "automated checks run before publishing ... Errors block publish; warnings require acknowledgment."
- "Calculator Configuration": "Stored as data, not code." "Field Mapping": "Drives the auto-fill engine." "Effective Date": "support point-in-time reproducibility".
- "Action line": "A to-do line in pack content with who, only-if, order and done-by — proposed SA-01B extension (AG17-D15)."
- "Startable": only startable programmes "are offered when a case is opened".
- "Support Session": "Read-only unless the firm owner has allowed changes; some actions are always blocked; every session is shown to the firm owner".
- "Step-up": "Re-confirming identity ... just before a risky action ... One confirmation covers 5 minutes".
- "Internal role": nine starter roles "Platform Owner, Staff manager, Content author, Content approver, Firm onboarding / Account manager, Billing, Support, Security & audit, Platform engineer".
- "Role Template": six starter roles "(Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only)".
- "GLOBAL Scope" vs "LOCAL Scope ... Scoped by firm_id (tenant isolation)". "RLS ... The primary tenant isolation mechanism."
- "Dunning": "A fixed rule in Release 1 (SA-4)." "Merge Field ... validated against the canonical data model."
- Note: no glossary entry for Doer, Conductor or AI in this file.

### Notes: 00-Overview v3.6 (2026-10-07), Super Admin FR overview, read in full (206 lines)
- Document Summary: Super Admin console "operated **only** by Expat Ready's internal team"; "**GLOBAL control plane**"; "13 modules (SA-1 to SA-12, plus SA-1B)"; "built entirely from **in-house tooling — no third-party product tools** (only infrastructure rails)".
- DOCS-7: "The local module files are the only requirements source." Rule 6: combined FINAL files "superseded".
- Scope index lead phases (P1 = launch-Canada essentials · P2 breadth · P3 advanced): SA-1 P1; SA-1B P1 ("the assessment output with verdict, reason and gap"); SA-2 P1 ("support access (look anytime, change with the firm's permission, firm told)"); SA-3 P1; SA-4 P1; SA-5 P1/P2 (templates incl. "workflow"); SA-6 P1 ("Catalogue of about 259 firm permissions"; "server-side checks on every save; written reason required"; "one system, two role sets"); SA-7 P1/P2; **SA-8 P1/P2 "Rail config (storage / email-relay / payment-processor / SMS gateway / IdP) + in-house **Doer** platform settings + optional **own-account** connectors; **encrypt-all secrets**"**; SA-9 P2 (Charter: "launch minimum"); SA-10 P1/P2; **SA-11 P1/P2 "Platform-wide **immutable, tamper-evident audit log** (hash-chain/WORM, actorType); **data residency** config; **retention & disposal**; **PIPEDA** (breach register + DSR + consent)"**; SA-12 P2 (Charter: in R1).
- Cross-cutting mandates: "**In-house Doers — no third-party product tools.** Every product capability is in-house (Signer, Mailer, Scheduler, Messenger, Biller, etc.). The only third parties are **infrastructure rails**". "Default-deny RBAC with GLOBAL/LOCAL/country scopes; tenant isolation enforced by construction (`firm_id` + Postgres RLS — target)". "access into a single firm's data is only via **audited impersonation** (SA-2) — never a silent drill-through." "Country is a first-class configurable dimension ... never hardcoded."
- §2 Staff roles: nine starter roles. Content approver: "Second person for production packs (SA1-D6). ... never own drafts, never edits." "staff roles hold only `system/*` permissions and firm roles only `agent/*` (SA-06, SA6-D4)". Internal team "4–6 people at Canada launch".
- §3.1 Country Pack content domains incl. "Eligibility rules ... Stored as configurable rule sets, not hardcoded logic"; "Government forms + field mappings"; "Case stages and workflow templates"; **"Automation templates | Pre-built Conductor/Doer automation blueprints specific to this country's programs (e.g., ITA deadline alert for Express Entry). | ITA 60-day expiry alert, Draw cut-off tracker"**.
- §3.2: "a **production** pack must be approved and published by someone other than its author and submitter (SA-1-61)". "assessments, cases, and generated forms are stamped with the version of the data used to produce them, making them reproducible and auditable".
- §3.5 Pack validation checks incl. "At least one workflow template per active program is present." "Publish is blocked if any error-level checks fail."
- Gap (Inferred): Country Pack carries "Automation templates" (Conductor/Doer blueprints) and validation requires a workflow template, but Charter defers AG-11 and its Doers.

### Notes: agent/SCOPE-TRIAGE_2026-10-05.md, read in full (270 lines)
- Status: "A review file, **not** a requirements document. Nothing here has changed any spec. Every feature is still in Release 1 until we go through this together and you decide." "Judgment calls, not facts". Marks: [F] founder earlier decision; [today]; (drop). Two later inline decisions dated 8 Oct (Sanjay): AG1-D20 one session per device stays in R1; firm session policy withdrawn.
- AG-02 move: "Lead scoring and 'what to do next' ranking"; "Routing rules ... [F]"; (drop) "Click-to-call dialer". Stays: "speed-to-lead call task + simple acknowledgement email"; "consent check before sending".
- AG-03 stays: "core engine (eligible / possibly / not, with reasons and missing inputs)"; "'reviewed by' stamp"; "manual re-run"; "no-guarantee disclaimer"; "saved result with rules version". Move: "What-if recommendations"; "Draw-cutoff competitiveness band"; "Five PNP streams (OINP, AAIP, SINP, BCPNP, MPNP)"; "Consultant override of outcomes (a note does the job)"; "Entitlement tiers, bulk re-run, auto-assess".
- AG-04 stays: "calendar invite + reminders (through AG-11 — one reminder system, not two)". Move: "auto no-show".
- AG-05 stays: "draft review and approve"; "seal, hash, audit"; "remind + expiry".
- AG-06 move: "Payment plans and automatic dunning"; stays "overdue flag + manual reminder".
- AG-07 stays: "document checklist (Binder)"; "forms per case, uploaded or staff-prepared, with approval record"; "lead RCIC + case officer"; "internal review". **Move: "Form auto-fill engine (the Filler) — biggest build cost; staff fill IMM forms and upload them"; "Deficiency library, auto-detect rules, readiness score, Checker"; "Four-eyes and licence-aware form approval [F] — only matters once auto-fill exists"; "rule-based routing, SLA clocks".**
- AG-08 stays: "manual verify against a document"; **"Reader approval (ships switched off)"**; "imported values marked unverified". Move: "Checker mismatch warnings".
- **AG-09 move: "Reader AI — classify and extract [F] (ships switched off anyway)"; "Reader letter deadlines and imported-document review [F]"; (drop) "Language-test / ECA extraction".** Stays: "virus scan"; "who-opened log + file hash"; "translation / notarisation / expiry flags"; "auto re-request".
- **AG-10 move: "Sorter AI [F]"; "Drafter AI and AI-text approval [F]"; "Supervision of unlicensed staff's messages [F]"; "Mailbox connection (Gmail / M365 / IMAP) + Unmatched inbox [F]".** Stays: "email consent check (CASL)"; "one send path with 'Not started' and 'never send imported' guards"; "quiet hours, scheduled send".
- **AG-11 Automation STAYS (proposal): "deadline reminders (the Minder) · automation engine · no double-sends, retry · send-time safety (consent, no blank placeholders) · correct timezone · imported clients stay quiet · 4 starter recipes: e-sign → onboarding, missing-document chase, speed-to-lead, document-received + review task · deadline escalation (opt-in) · send limits, loop guard · failed-run list · run history".**
- **AG-11 move "(almost all [F], decided 4–5 Oct)": "Full dry-run / simulation engine"; "5 extra recipes (biometrics countdown, PR-card expiry, no-show, going-cold, post-consult)"; "'Needs you' inbox + 'Done for you' home screen"; "Autonomy levels on every action (Auto / Ask me / Off) — on/off per recipe is enough"; "Team safeguards (four parts, auto-on at 5 staff)"; "Licence-aware approval, supervised messages"; "The 4 AI Doers and their release gate (ship switched off anyway)"; "AI-only triggers"; "(already Release 2) Visual builder, firm-written recipes, SMS".**
- AG-12 (drop) "auto-translation". Note "AG-12 is still the 28 Aug version".
- AG-13 stays: "audit (append-only, viewer)"; "deadline → task"; "reminder engine"; "audit kept forever (fixed floor)". Move: "Tamper-evident hash chain + verifier" (conflicts with SA-11 Overview "tamper-evident ... hash-chain"); "Overdue escalation to managers (conflicts with AG-11 — needs a decision)"; "Subtasks, task templates, timer".
- AG-15 stays: "done on behalf"; "per-client 'last seen' + manual nudge". Move: "auto-nudges"; "anomaly alerts, client MFA".
- AG-16 stays: "supervised messages + standard-messages confirm (only if AG-11 keeps them)"; "four-eyes rule". **Move: "AI settings [F], Team safeguards screen [F]".**
- AG-17 stays: "validity clock via Minder"; "recruitment report generator"; "sign-off record"; "wage/hours/location consistency check". Risk: "the SA-01B row-and-line model AG-17 needs has no date and no owner."
- **AG-18 Import exists (not listed in Charter module list).** Stays: "mandatory dry-run"; "owner attestation"; "imported values marked unverified"; "Officio adapter". Move: "licensed approval"; **"Reader AI filing of documents [F]"**; "Assisted migration by Expat Ready staff [F]"; "near-match suggestions".
- CP-01 move: "Client two-factor login".
- Open founder questions: Quebec; online card payment; two-factor default; 3–4 or 6 role templates; "Overdue escalation: AG-13 says off by default; AG-11 says on from 5 staff."
- Biggest savings #1: "AG-11 approval / governance layer + AI Doers + WhatsApp (across AG-09, 10, 11, 16)"; #2 "AG-07 form auto-fill engine + deficiency library".
- **CONFLICT: Triage (5 Oct) keeps AG-11 engine + Minder + 4 recipes in R1; Charter V1/V2 say "Automation engine (AG-11) and its Doers" NOT in R1.** Triage also names AI Doers: Reader, Sorter, Drafter (AI), Checker (4th of "4 AI Doers" not named here — Unknown).

### Notes: 07-Founder-Decisions-Log.md (document version 1.5, last updated 2026-08-02), read in full (409 lines)
- Spine rule: "the MACHINERY is architect-decided and fully in-scope regardless of the founder's answer. The founder confirms VALUES (content, legal floors, commercial caps, policy posture)."
- FD-1 "Per-artifact versions + pack manifest, atomic publish". FD-3 "Pin at case open + explicit audited re-pin/migrate". **FD-4 "Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data".**
- **FD-5 "Flattened-overlay support in v1 (coordinate-mapped fill + FormFieldMap visual editor)"** (later parked for R1 by SA1B-D28 per Phasing v2.6 and Charter).
- FD-7 AG-17 "Light-evidence ... no candidate identity plane ... CP-9 employer sees read-only summary".
- **FD-8 Doer naming: "Clocker (time-tracking; not 'Timer') · Reminder folds into Minder (one nudge identity; AG-13 §3.2 retitled; naming spec amended)"** — conflicts with founders' June spec (Timer, Reminder as Tier 2).
- FD-9 CP-7 "Per-case threads + client-may-start". FD-11 credit notes OUT v1. FD-12 "platform never intermediates funds". FD-13 "in-house WebRTC room = v1 adapter" (Triage 5 Oct proposes dropping in-house video room).
- **FD-14 "Reference-only tasks — entity deep-links, Restricted values never in task free-text (guidance + lint)".** FD-15 Restricted doc metadata "envelope-encryption + masked audited reveal".
- **FD-16 AI posture (blocker): "'AI assists, humans decide.' The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision." "AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect." "AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane." "AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact." "Marketing may say 'AI-assisted'; it may not say the AI decides."** → MAJOR for AI Workers: an AI Worker operating as its own user would conflict with "no AI principal in the identity spine, no autonomous permissions".
- FD-17 trust-aware light: "no automatic sweep of client funds into operating — moving trust to operating requires an explicit, audited, reason-coded event".
- FD-18 pricing shape: "Per-seat tiers by firm size (Solo / Small 2–5 / Firm 6+)" + "metered add-ons for consumption rails".
- FD-19 beachhead: "Solo and small RCIC practices, 1–5 people, Canada, Express Entry + PNP volume"; "a solo RCIC still needs review/QC, coverage while away, and a defensible audit trail".
- **FD-20 (architect-decided): "every assessment result carries an `isAutomatedDecision` flag, an immutable factor snapshot ..., a client-facing plain-language explanation, and a `REVIEW_OF_AUTOMATED_DECISION` request type in the DSR machinery routing to a named human reviewer with a recorded outcome." "Counsel confirms wording, not mechanism."**
- FD-21: "one-time-passcode verification to the signer's on-file channel ... before the signature is applied" + sealed evidence bundle. A22-5: "OTP + sealed evidence bundle is the platform minimum".
- FD-22 two pack axes: Country Pack (destination) vs Practice Pack ("Regulator + representative model (who may lawfully advise, licence classes, rep-of-record cardinality, supervision rules for unlicensed staff)", trust rules, retention, privacy regime, e-signature law, tax). "No money, legal, privacy, retention or tax rule may be hardcoded." A22-1 representative model two-sided with resolver "may this person be representative of record on this case". A22-2 third axis: recipient's jurisdiction for consent to contact. A22-6.3 jurisdiction change "raising a review task". **A22-6.4 conflict policies MAX/MIN/UNION/EXCLUSIVE/ESCALATE; "ESCALATE | No automatic resolution is safe; block and raise a named human decision showing both sources"; "a parameter with no declared policy resolves to ESCALATE".** A22-6.6 "no published Practice Pack cannot have a firm onboarded against it — onboarding fails closed".
- Open: C-1, A-1 (PNP depth), A-2 (Canada pack seed), B-1 (Restricted PII), B-2 (retention), D-1 (representative model), C-2/C-3.
- A-3: admissibility/validity windows as "`EligibilityRule` (HARD/ADVISORY) / `FreshnessRule` content"; gates "AG-3 (Qualifier runtime)". A-4 gates "AG-6 (Biller)". C-4 gates "AG-4 (scheduler)".
- B-3: "legal types hard-require REVIEW before publish"; **"No machine-translation of legal copy."**
- B-4: impersonation "NOTIFIED default with a per-firm CONSENTED toggle for Quebec"; "DSR self-request with firm-confirm step".
- D-2: "Platform = MFA mandatory-locked"; "firm = required-for-admins"; "portal = optional-encouraged"; "SSO = future port-bound adapter, NOT v1".
- D-3 default matrix: platform roles "Platform Owner / Admin / Support / Billing-Ops / Content-Pack Publisher / Auditor" (superseded by SA-7 nine roles); firm six; "3 portal roles".
- **D-4: "refusal HELD for firm release (never auto-surfaced)"; nudges "in-portal+email (SMS/WhatsApp off at launch)".**
- **D-6: "review-before-share configurable (default on)" (assessments); "at-risk = manual-acknowledge"; countersign "restricted to assigned RCIC".**
- Engineering defaults: "launch ca-central-1 only; CI region allow-list"; "Counter-signature of Doc-1 + FINALs as the binding source; RFP demoted to lineage."; "Import feature IN (self-serve)".
- GAP: other documents cite FD-68 (Firm Country), but this log v1.5 only runs FD-1..FD-22 — later FDs not in the snapshot copy (Unknown where FD-23+ live).

### Notes: 01-RFP-Build-Proposal.md (document version 2.0, last updated 2026-06-22, issued 2026-06-19), read in full (544 lines)
- Status: procurement wrapper, "It is **not** the binding build source." FDL engineering default: "RFP demoted to lineage." No mention of AI, OCR or machine learning anywhere (grep confirmed).
- §2: founder "is a practising, licensed Canadian immigration professional and serves as the product owner and final domain authority". Country-Pack content "is the founder's own deferred deliverable".
- §3 problem statement (manual work today): "Firms lose leads through slow follow-up, miss eligibility opportunities through manual scoring, and carry compliance risk through fragmented record-keeping." "eliminating the manual re-keying of applicant data across disjointed tools".
- §4.1 three personas in "separately walled authentication contexts"; permission catalog "`system/*` global, `agent/*` and `portal/*` local".
- §4.2 Party identity spine: "a person inquiring twice is one Party".
- §4.3 Calculators: "CRS score ... with per-factor breakdown, comparison against recent draw cut-offs, and actionable improvement recommendations"; "Multi-program eligibility sweep ... ranked list of likely-eligible, possibly-eligible, and not-eligible results with reasons". "Assessments are stamped with the rule version".
- §4.5 in-house Signer; "unguessable capability token".
- §4.7 "Deficiency tracking — a continuously computed list of outstanding gaps".
- §4.8 Auto-fill: "Auto-populates form fields from the client's canonical answers"; "Allows the consultant to review and override the auto-fill before generating the final PDF output." (Parked for R1 per SA1B-D28.)
- §4.9 "Automated reminders tied to deadlines."
- **§4.10 "Automation Engine — Conductors & Doers": "Conductors — orchestration rules that define triggers (e.g. prospect stage changed, case milestone reached, booking confirmed, document received), conditions, and action sequences, driven off one canonical domain-event dictionary." "Doers — the executor layer, branded as task-specific in-house workers: Reminder (schedules and fires reminders), Minder (task creation and assignment), Tasker (workflow task automation), and Messenger (sends emails, in-app notifications, or SMS through the Communications module). Doers sit on swappable rail ports — no Doer imports a vendor SDK directly." "Automation definitions are stored as configuration data (Postgres JSONB) so they can be managed through a visual builder".** → Minder definition differs from founders' June spec (Minder = deadlines/status/audit) and FD-8 (Reminder folds into Minder).
- §4.11 Communications incl. "inbound email sync (via Gmail API / Microsoft Graph OAuth...)", SMS/WhatsApp.
- §4.16 "a self-service developer/API section (firm-scoped read API keys + outbound signed webhooks), bulk import".
- §5 OUT: **"Immigration legal advice | The platform produces scores, flags, and information. It does not provide legal opinions. Compliance features help RCICs fulfill their obligations; they do not replace qualified legal judgment."** "IRCC live API integration | IRCC does not publish a public machine-readable API". "Firms' trust accounting" OUT (superseded by FD-17). "the single authoritative OUT table — everything not listed here is IN, under the frozen-scope default-IN rule."
- §6 hard constraints: "**Canadian data residency.** All production data ... must be stored and processed within Canada (ca-central-1; DR within Canadian regions). Sub-processors must be assessed for Canadian residency." (Relevant to any AI model provider — Inferred.) Polymorphic "EntityTypeRegistry". "Field-level envelope encryption for the Restricted PII set (CMK → per-firm DEK → per-subject key), mask-by-default + audited reveal". "PIPEDA erasure is by crypto-shredding".
- §7 audit: "One platform-wide append-only spine; immutability at the DB GRANT (INSERT-only role); hash-chained ...; periodic WORM anchor (S3 Object Lock)". Restricted PII "never projected into the search index".
- §8 one frozen scope, Waves A–E; Wave D includes "Automation (Conductors + Doers)". DoD "Priya" journey ends "IRCC form generated → case tracked to decision".

### Notes: 02-Architecture-Decision-Record.md (document version 1.0, last updated 2026-06-22; decisions dated 2026-06-21), read in full (512 lines)
- Status: "decisions LOCKED"; "this is a DECISIONS REGISTER, not the vendor build source". No mention of AI/OCR/ML (grep confirmed).
- Correction 15: PostgreSQL 16 → 18, Prisma 6 → 7 (2026-06-26).
- Correction 8: "Region becomes a per-tenant dimension + region-scoped KMS now; deploy Canada-only at launch".
- C1-3 Residency: "Pin the entire estate (DB, replicas, S3, Redis, search, backups/PITR, PII logs) to AWS ca-central-1 ... per-rail sub-processor residency matrix". → Any AI model provider would be a sub-processor (Inferred).
- C2-D2 CanonicalField catalogue: "SA-1 rules, AG-8 ProfileBinding, AG-3 scoring, AG-7 form maps, AG-9 doc-conditions ALL bind to it." append-only answer store.
- C2-D3: "Wire expiry→Minder." (Minder = deadline/expiry watcher.)
- **C2-D6: "One master + thin instance makes the Filler a pure, auditable function of (answers × field map × edition)." "build the data-driven Filler reading from the answer store."** → Filler is deterministic.
- C3-D1: "The in-house-Doer doctrine, the existing three-auth codebase, and residency/PIPEDA control all point to in-house"; three walled auth pools.
- C3-D2: guard order "auth → permission(name+scope) → tenant/record binding → feature entitlement → resource query with country filter". Mismatch = "403 SCOPE_VIOLATION + audit".
- C3-D3: default matrix "6 platform sub-roles, 6 firm templates, 3 portal roles"; "view.own/view.all qualifier".
- C3-D4: "request-scoped PrincipalContext is the ONLY scope source (never caller-supplied id)"; "impersonation is a separate step-up-gated audited path".
- **C4-D1: "In-house Doers on swappable rail PORTS (PaymentRailPort/EmailRelayPort/ObjectStoragePort/SmsGatewayPort/IdentityProviderPort) ... No Doer imports a vendor SDK directly." Diagram: Biller→PaymentRailPort, Mailer→EmailRelayPort, Signer→ObjectStoragePort, Messenger→SmsGatewayPort.**
- **C4-D2 Domain Event Dictionary: "Transport = in-process Conductor bus + Bull, at-least-once, post-commit, non-fatal." "redelivery with the same idempotency key produces no duplicate side-effect."** Events feed SearchModule, WebhookWorker, Conductor.
- C4-D4 "NEW platform SearchModule (the 'Finder')" — another -er name not in the founders' roster.
- 6.4 import: "historical financials (recorded into Biller — never duplicated)".
- NFR5-06: "PII_REVEAL audit on every reveal"; "No Restricted PII in logs/traces/non-prod."
- NFR5-08 audit: "INSERT-only role ... hash-chained entries (SHA-256 of prevHash‖entry, monotonic sequenceNo); periodic WORM anchor (S3 Object Lock) ... failed audit write retries+alarms, never rolls back the user op." (Correction 5: audit written "synchronously via an outbox (atomic with the user op)" — internal tension with "never rolls back the user op" — Inferred.)
- NFR5-09 SA-11 owns consent register, retention, legal hold ("hold beats deletion"), DSR, breach register, per-individual export.
- NFR5-14: alerts "ALSO page on audit chain-integrity break and DSR/breach clocks approaching deadline".
- **6.2 Scope-Freeze: "DE-PHASE to ONE frozen full scope. Delete all P1/P2/P3 tags" — CONFLICT with current Phasing v2.14 (P1/P2/P3) and Charter deferrals (Inferred: ADR de-phasing superseded by 2026-10 Charter scope cuts).**
- W4 named contract holes: "WorkflowBlueprint JSON, DeficiencyLibraryItem.autoDetectRuleJson DSL, MinderWatch.cascadeSteps"; "Mechanical sweep: terminology, Doers roster".
- Waves: D = "Cross-cutting Doers/automation/Conductor, communications, search, reporting, Client Portal console, import engine".

### Notes: 03-Doc-1-Platform-Foundation.md (document version 1.3, last updated 2026-06-26; "Status: FINAL. FINAL (2026-06-22)"), read progressively
### Header, glossary, §1 (lines 1–406)
- "Content-free (platform machinery only — no immigration domain content)".
- **Glossary: "Doer — an in-house capability (Signer/Mailer/Scheduler/Biller/Minder/Filler/Qualifier/Messenger/Finder…) on a swappable rail port/adapter (Stripe/SES/S3/SNS…), never a third-party product dependency. Only infrastructure-backed Doers have rail ports."**
- **Glossary: "Conductor — the workflow/automation engine + domain-event bus."**
- Glossary: "PrincipalContext — the request-scoped (AsyncLocalStorage) identity/tenant context; the ONLY source of scope for queries; never caller-supplied." "transactional outbox — audit/event rows written in the SAME transaction as the business mutation ... gives exactly-once, gap-free audit." "capability token — an unguessable, scoped, expiring token used to authorize public-by-link access".
- §1.1 module map at launch: "Platform/Tenancy/Entitlements · Identity & Auth · CRM/Pipeline · Eligibility/Scoring · Scheduling · Agreements & E-Sign · Billing/Payments · Case Delivery (Questionnaire · Documents · Forms · Workflow) · Automation (Conductors + Doers) · Communications · Search ('the Finder') · Reporting". Cross-cutting core attaches "Notes, Tasks, Documents, Reminders, Communications, Notifications, and Audit" to any registered entity.
- §1.1 scale path mentions "OCR" as a high-load module: "(form generation, OCR, search projection, inbound-mail sync)". §1.2/§1.4: async workers run "form/PDF generation, OCR, document virus-scan, automation/Doer execution, reminder firing". → OCR is anticipated as platform infrastructure (no AI named).
- §1.2 "No third-party product tools. Every *product* capability is an in-house **Doer** on a swappable rail port (Signer, Mailer, Scheduler, Messenger, Biller, …). The only retained third parties are **infrastructure rails** that physically cannot be built in-house".
- §1.3 config-as-data: "automation/Conductor definitions" stored as validated JSONB; effective value = "override ⊕ global-default".
- §1.6 "production data is **never** copied to lower environments (synthetic/seed data only)."
- §1.8 machinery vs content: "generic scoring/workflow runtimes"; content is a "versioned Country Pack".
- **§1.12 Capability Registry: "ONE CAPABILITY = ONE MODULE = ONE TOGGLE"; "adding a new Doer is *registering a capability* (one data row + its module)". Capability `kind` "`DOER` (an in-house Doer: Signer, Mailer, Scheduler, Biller, Minder, Filler, Qualifier, Messenger, Reporter, Finder, Drafter, Reviewer, Binder, Tasker), `SUBFUNCTION` ..., or `SURFACE`". Example keys: "`signer`, `scheduler`, `qualifier`, `filler`, `messenger.sms`, `automation.conductor`". "`defaultState` ... OFF unless explicitly entitled-and-enabled".**
- §1.12.3 three toggle layers: "PLAN ENTITLEMENT (SA-3)", "FIRM SWITCH" (Agent console settings), "PLATFORM FLAG (SA-12)" "dark-launch / staged rollout / kill-switch". "Fail-closed is absolute."
- §1.12.4 dependencies: "`filler` needs `qualifier`'s answers"; "`automation.conductor` needs the event bus a Doer emits to".
- **§1.12.5 "Doer execution. The Conductor and every Doer check `CapabilityContext` before acting: an OFF capability's Doer **no-ops with an audited reason** (e.g. `CAPABILITY_OFF:messenger.sms`) ... A workflow step that fires a dark capability records a skipped-with-reason outcome on the audit spine (§7.5)".** AC-1.12.3 kill-switch "inert within one request ... with no code change and no deploy".
- Relevance (Inferred): FD-16 places AI features as `cap.ai.*` capabilities in this Registry — so any AI Worker capability would be plan-gated, firm-switched and platform-killable through the same three layers.

#### Doc 1 §2 Multi-tenancy (lines 408–688) and §3 Identity (690–938)
- §2.1 "`firm_id` — the tenant key"; "`client_id` (Party) — the end-client person ... not a tenant key". Staff "legitimately see all of that firm's clients".
- §2.4 Layer 2: tenant "from the verified token's audience-walled identity, never from caller-supplied input". Layer 4: "Drill-throughs, reports, and aggregations re-apply the check — a report is not a loophole."
- §2.5 portal second RLS dimension; "The portal layer is **leak-off by default**".
- §2.6 "The elevated cross-tenant / impersonation path (the one sanctioned boundary crossing)": "scoped, time-boxed, step-up-gated FIRM-pool token ... bound to **exactly one** target `firm_id`"; "IMPERSONATION_START / IMPERSONATION_END audit events with operator identity, target firm, and justification". GLOBAL writes need "operator identity and justification".
- §2.8 pentest "MUST fail to leak for 100% of resources".
- §2.9 region seam; "Each firm carries a `region` attribute (default `ca-central-1`)".
- **§3.1 exactly three auth pools: platform (`er:platform`, `system/*`), firm-staff (`er:firm`, `agent/*`), client-portal (`er:portal`, `portal/*`). No service/machine/AI pool is defined anywhere in §3** (consistent with FD-16 "no AI principal in the identity spine").
- §3.2 AuthCore "performs **no authorization**"; populates PrincipalContext "{ pool, subjectId, firm_id?, sessionId }".
- §3.4 "Access tokens carry **no permissions** — authorization is resolved per-request"; lifetimes platform 8 h/30 min idle, firm-staff 12 h/60 min idle, portal 24 h/30 min idle (FOUNDER-CONFIRM; later SA-7 says firm users never auto-logged out — conflict noted, Inferred).
- §3.6 MFA in-house; "MFA enrolment, verification, factor-reset, and every recovery-code use are written to the immutable audit spine". "A factor reset for another user is a privileged, audited, step-up-gated operation."
- §3.7 "New principals are created by invitation, never by open self-registration"; invite "delivered by the Mailer Doer". "Deactivation is audited with actor and justification."
- §3.8 `IdentityProviderPort`; "SSO is explicitly **not** in the launch scope".
- §3.4 includes API/SDK callers using "Authorization: Bearer" header (relevant if an AI Worker calls the API — Inferred).

#### Doc 1 §4 Authorization, RBAC & record-level authz (lines 940–1217)
- §4.1 two scopes: `system/*` GLOBAL; `agent/*` and `portal/*` LOCAL. "`view.own` vs `view.all` qualifiers". "`feature.*` is a separate, orthogonal hard-gate namespace". Guard order "Authenticate → Permission check (name AND scope match) → Tenant / record binding → Feature entitlement → Resource query → Object-level ownership".
- §4.2 scope mismatch → "`403 SCOPE_VIOLATION` and emits a security audit event (`AUTHZ_SCOPE_VIOLATION`)". "Fail-closed default. A route with no `@RequirePermissions` and no `@Public()` ... is **denied**".
- §4.3 "reject any attempt to attach a GLOBAL (`system/*`) permission to a firm role or a portal role"; whole write rejected, `AUTHZ_ROLE_WRITE_REJECTED`.
- §4.4 catalog "hand-authored ... (a security decision that must not be auto-generated)"; seeded per wave. Default matrix ~6 platform sub-roles, ~6 firm templates ("Firm Owner, Firm Admin, Case Manager, Case Officer (`view.own`-biased), Billing/Finance, Read-only"), ~3 portal roles ("Primary Applicant, Corporate Sponsor/Seat Admin, Dependent/Viewer"). **A catalog key may be "explicitly marked `wired-by` a non-route consumer, e.g. a queue worker"** — the only place Doc 1 contemplates a non-human, non-route consumer of a permission (relevant to Doers/AI Workers running in workers — Inferred).
- §4.5 "PrincipalContext is the ONLY scope source." Helpers `assertSameFirm`, `assertOwnedByCaller`, `assertPortalOwnershipChain`. "Portal rule = own-case-only + firm allow-list"; "leak-by-default-off". "Reports and drill-through re-apply the checks."
- §4.5 impersonation: "requiring a step-up (re-auth) and a stated justification"; writes "`IMPERSONATION_START` + `IMPERSONATION_END` (and `CROSS_TENANT_ACCESS`)".
- §4.6 `@Public()` controls: webhook-signature, capability-token, rate-limit.
- No mention of AI, agents or automated principals in §4.

#### Doc 1 §5.1–§5.12 Canonical data spine (lines 1219–1425)
- §5 "the single, founder-approved data spine that every console and Doer builds on, described as a **content-neutral engine**".
- §5.2 one Party root; lenses Contact / ClientIndividual / ClientCorporate / ClientCustomer. Merge "non-destructive" tombstone. Representative-of-record cardinality = FOUNDER-CONFIRM.
- §5.3 CanonicalField: "eligibility rules, scoring configs, section questions, document conditions, and form field-maps **all bind to a `canonicalFieldKey`**". **"`freshnessRuleJson` ... drives the Minder to prompt re-confirmation when an answer ages out."** `isRestrictedPii`, `retentionClass`.
- **§5.4 answer store: `status` "(`FINAL | DECLARED | VERIFIED`)"; "`sourceJson` (provenance: which intake surface captured it — PQR, SQR, portal, import), `verifiedBy` / `verifiedAt` (who promoted `DECLARED → VERIFIED`)". "a new answer **supersedes** the prior one rather than overwriting it; the history is the audit trail."** → an AI-extracted answer would need a provenance source value and human verification (Inferred; not specified).
- §5.4 "Capture-once is structural ... a fact captured at the lighter Pre-Qualification intake (PQR) is **not re-asked** at the fuller intake (SQR) and **auto-fills** the government form — the moat." `CaseSqrSnapshot` "captures the resolved, point-in-time set of answers a case was advanced/assessed on".
- §5.5 `ConditionalRule` "server-evaluable show/require/skip rule"; PQR = marked subset of SQR questions.
- §5.6 DocumentRequirement axes STANDARD/NON_STANDARD, PRIMARY/ALTERNATIVE, COMBINATION_MANDATORY / ANSWER_CONDITIONAL; **"`expiryRelevant` (boolean) + `expiryRuleJson` — drives the **Minder** to watch and prompt before a dated document lapses."** Document 10-state lifecycle deferred to a later wave.
- **§5.7 "The **Filler is a pure, data-driven function**: given a `FormInstance`, it resolves the case's answers (via `CaseSqrSnapshot`), loads the stamped `FormEdition` + `FormFieldMap`, and writes each `canonicalFieldKey`'s value into its `formFieldId`." "re-renders byte-identically forever".** (Charter: form auto-fill not in R1.)
- §5.8 `ConditionFlagDefinition` + `ComboFlagValue`: "deficiency/eligibility flags are *data the pack defines*, not hardcoded booleans." Effective-dating "greatest `effectiveAt ≤ referenceDate`".
- §5.10 "All immigration content is deferred".

#### Doc 1 §5.13 Rule machinery (lines 1427–1620) — the deterministic rules engine
- **§5.13.1 "There is **exactly one** condition contract on the platform" — the `Predicate`: "a typed, server-evaluable JSON tree over `canonicalFieldKey` answers"; closed operator set "`eq/neq/in/gt/gte/lt/lte/exists/and/or/not`"; "Evaluation is pure and total ... division-free, side-effect-free, deterministic. It runs server-side only (never trusted from the client)". "There is no second rule language anywhere on the platform."** Four consumers: SectionQuestion, DocumentRequirement, ConditionFlagDefinition, EligibilityRule.
- §5.13.2 ScoringConfig/ScoringFactor/ScoringBracket: aggregation "SUM|MAX|WEIGHTED_SUM"; brackets must be "contiguous, non-overlapping cover".
- **§5.13.3 EligibilityRule `severity` "`HARD | ADVISORY`" — "a failed **HARD** gate makes the subject ineligible ... (blocks); a failed **ADVISORY** gate raises a non-blocking flag/note only." `messageKey` for "the human explanation shown on pass/fail". Runtime = "the assessment engine's job (later wave)".**
- **§5.13.4 StageTemplate `deadlineOffsetDays` "drives the **Minder/Reminder** to watch and prompt".**
- §5.13.5 ReferenceDataset types "OCCUPATION | LANGUAGE_CLB | FEE | PROOF_OF_FUNDS | WAGE".
- §5.13.6 RegulatorConfig `licenceNumberRegex`, `repTypeSlots` "{ repTypeKey, nameKey, isPaid, allowsMultiple }" — the licence data a sign-off check would read (Inferred).
- §5.13.7 LocalizedLabel — all human strings by key.
- Relevance: the eligibility/scoring/stage machinery is fully deterministic and versioned — matches FD-16 "no model output is ever a decision".

#### Doc 1 §6 Eventing, integration, rails (lines 1622–1991)
- §6.1 Domain Event Dictionary in `packages/contracts/events`: every event "Zod schema", "EXACTLY ONE module may emit this name", explicit consumers. Example: "the Biller does not call the Case Delivery module directly when a retainer is paid — it emits `payment.succeeded`".
- §6.1.2 two namespaces: domain events `noun.verb-past` (facts) vs `notif/` notifications ("A *message to deliver* to a human via a channel", e.g. `notif/consult-reminder`, `notif/document-rejected`).
- §6.1.4 idempotency: rail-originated events keyed on external event id, "fail-closed".
- **§6.2.1 "In-process Conductor bus. For consumers in the same process that need low-latency, best-effort reaction (e.g. the Conductor/automation engine evaluating whether an event triggers a workflow step)" — "non-durable"; BullMQ durable lane for "notification delivery and outbound webhook dispatch".**
- §6.2.2 events post-commit; "Audit is the deliberate exception ... written **synchronously via its own outbox, atomic with the user operation**"; event bus "non-fatal".
- §6.2.3 per-firm processed-event ledger `(firm_id, consumerKey, idempotencyKey)` unique — "No consumer is permitted to invent its own ad-hoc dedupe scheme."
- **§6.3 "the founder doctrine is that every *product tool* is built in-house as a **Doer** (Biller, Mailer, Signer, Messenger, Scheduler, …)". "Only the **five infrastructure-backed Doers** below have rail ports". "The remaining Doers (Scheduler, Minder, Filler, Qualifier, Finder, Messenger's in-process automation) are **pure in-house Doers with no external rail and therefore no rail port**; they ship in later waves and are **not foundation scope**".**
- §6.3.1 ports: PaymentRailPort (Biller; SA-4) → Stripe + Connect; EmailRelayPort (Mailer, Messenger email, system mail) → AWS SES + SMTP; ObjectStoragePort (Signer, Documents) → S3; SmsGatewayPort (Messenger SMS + WhatsApp) → AWS SNS + WhatsApp BSP; IdentityProviderPort (AuthCore) → in-house IdP. (Note: the "five ports" are not all owned by Doers — AuthCore and Documents are listed as owners.)
- §6.3.2 SA-8 `IntegrationRailConfig` selects adapters; "region-aware".
- §6.5 FxRateService single writer; v1 "MANUAL adapter: an authorized platform operator publishes rates". Missing rate "exclude-with-note, never raw-sum".
- **§6.1.6 Domain Event Registry (complete), 41 rows. Automation-emitted: "`deadline.approaching` | `automation`" keyed "`${minderWatchId}:${cascadeStepIndex}`" with `severity`; "`deadline.breached`", "`deadline.satisfied`" (`satisfiedByPredicate`); also `portal.corporate.seat.invited/activated/removed` emitted by `automation` ("AG-15 ... the firm-console face of the Automation/Conductor bounded context").** `automation` is a consumer of nearly every event (case.*, sqr.*, document.*, invoice.*, payment.*, prospect.*, envelope.signed, booking.*, firm.onboarding.completed, portal logins) — i.e. the Conductor listens to the whole business.
- §6.1.6 notes: "document/credential expiry is signalled through the Minder's single `deadline.approaching`, never a `document.expiry.*` synonym". `document.disposed` emitted by `platform` (SA-11).
- `sqr.answer.captured` carries `status` (answer status) consumed by eligibility/automation/search.
- No event exists for an AI action, suggestion or draft (Inferred gap).

#### Doc 1 §7 Data security, privacy & audit (lines 1993–2291)
- §7 purpose: "Restricted PII is **mask-by-default**, never leaves the platform to a rail, and never lands in a search index or a log line". → Any external AI model call would be a new "rail"/sub-processor not in the matrix (Inferred; Unknown how AI providers fit).
- §7.1 key hierarchy CMK → per-firm DEK → per-subject key + "per-retention-class sub-keys"; "no per-document key".
- **§7.2 "Every column on every model carries a data-classification tag (`Public | Internal | Confidential | Restricted`)." Reveal requires "`agent/pii:reveal` for staff, `portal/pii:reveal-own`"; "Every reveal emits a `PII_REVEAL` audit event ... recorded *before* the cleartext is returned (fail-closed: if the audit write fails, the reveal is denied".**
- §7.3 blind index per-firm HMAC; "Restricted PII is NEVER projected into the universal search index".
- §7.4 crypto-shred: "destroy the key, not the rows"; DSR register "honest ... never claimed-fully-deleted when a floor still applies". "Legal hold ... **always beats** a deletion schedule or DSR clock."
- **§7.5 Audit spine: "one append-only engine with a separate, per-firm hash chain"; "INSERT-only GRANT"; "Synchronous via an outbox, atomic with the user op"; WORM anchor to S3 Object Lock; continuous chain-verify with paging alarm. "What is audited": authentication, authorization denials, "every `PII_REVEAL`", "create/update/delete on case/client/financial records (with before/after refs)", "document access/download, exports/egress, role/permission changes, consent changes", cross-tenant operations, disposal. "Each entry: actor, persona, `firm_id`, subject Party where relevant, target `(entityType, entityId)` ..., timestamp (UTC), source IP/device, outcome."** → "persona" field is where an AI-actor distinction would have to live (Inferred; FD-16 requires provenance on AI-assisted artifacts but Doc 1 v1.3 predates FD-16 and has no AI field).
- §7.5 retention floors "code-enforced (not a settable-to-zero config)"; proposed financial ≥7yr, breach ≥2yr, other ≥2yr (FOUNDER-CONFIRM, counsel).
- **§7.6 SA-11 governance: "`ConsentRecord` captures ... consent **per purpose** (Law-25 granularity), with withdrawal supported ... Consent state is queryable by any processing path so a withdrawn-consent purpose can be enforced at point of use." AC-7.6.1 "a withdrawn purpose blocks that processing path at point of use."** DSR "statutory clock"; Breach register "RROSH gate", "72-hour clock"; one canonical per-individual export "audited as a data egress".
- **§7.7 per-rail sub-processor matrix: Payment (Biller) Stripe; Email relay (Mailer) SES; Object storage (Signer/Files) S3; SMS/messaging (Messenger) SNS + WhatsApp BSP; Identity in-house. "PII-minimization to rails (normative)... strips Restricted PII by construction"; "A CI scanner inspects every rail-adapter outbound payload builder".** No AI/LLM sub-processor listed.
- §7.7 upload validation: content-type sniffing, size caps, "AV-scanned before they become available".

#### Doc 1 §8 NFRs and cross-cutting services (lines 2295–2631)
- §8.1 P7 "Long-running work (PDF/form generation, bulk export, doc scan, import) | asynchronous via BullMQ; no synchronous request > 5 s". §8.2 "per-tenant fair-use quotas (aligned to plan entitlements)". §8.3 AV3 "A non-critical subsystem (comms, reporting, search) failing SHALL NOT take down case delivery or payments".
- §8.4 logs: "PII redaction happens at the logger"; compliance alerts (audit chain, DSR clock, breach 72 h clock). AC-O3 synthetic journeys.
- §8.6 "the platform does not translate firm content" (firm owns translation; FDL B-3 "No machine-translation of legal copy").
- §8.8 Finder: "a new platform **SearchModule** ('the Finder')"; "The Client Portal gets **no** universal search"; results "triple-filtered: firm-scoped → permission-filtered → record-level-ownership-filtered"; no Restricted PII in index.
- **§8.9 ImportEngine: "column→canonical-field **mapping UI** → **dry-run preview** ... → **async job** → **result report**"; "gated by a dedicated local permission (`agent/firm:import`)"; "every import run is an audit event". (Manual work: staff map columns and review dry-run — candidate for assistance; Inferred.)**
- **§8.10 Outbound API: "Firm-scoped API keys with scoped permissions (a key carries a subset of the firm's local `agent/*` read permissions; default-deny)"; webhooks HMAC-signed, retried, dead-lettered. → The only machine-access channel defined is READ-only API keys + outbound webhooks; no write API for an external agent is specified (Inferred).**

#### Doc 1 §9 Procurement shell (lines 2633–2866)
- §9.1 "The RFP is lineage, not contract." Precedence: Doc 1 > FINAL console specs > supporting sections.
- §9.3 Wave A IN vs OUT: OUT → Wave D "Cross-cutting Doers, automation/Conductor, comms, **SearchModule**, reporting, **Client Portal console**, import engine, outbound API/webhooks"; Wave C "IMM Filler runtime, workflow". (Wave model from June predates 2026-10 Charter cuts.)
- §9.4 "ENGINE / machinery → fixed-price per delivery wave ... the Doers + rail ports, the cross-cutting engines".
- §9.7 RACI: Human Architect accountable for per-wave sign-off; Founder accountable for "RBAC catalog + role matrix least-privilege boundaries" and "Restricted-PII field list"; Counsel responsible for retention floors.
- §9.8 Foundation gate G-1..G-10 (isolation, denial suites, pentest, audit post-erasure, file handling, axe, scaling, region).
- §9.9 S1 Critical includes "audit-chain break".
- §9.10 ten founder open items; "none blocks the start of Wave 0/A".
- Source files cited at §9 end live under "/Users/sanjayexpatready.com/Desktop/Claude/Expat/Expatcode/docs/rebuild-scope/" (not in snapshot).

#### Doc 1 Integration Amendments A1–A7 (lines 2869–3093)
- A1 StageTemplate `kind` closed enum: PRE_WORK, COLLECTION, PREPARATION, READY, REVIEW, SUBMITTED, POST_SUBMISSION, DECISION, TERMINAL, ON_HOLD; "AG-7 consumes it".
- A2 PaymentRailPort adds `listTerminalIntentsSince(cursor)` (reconciliation "a *backstop for missed webhooks*, never a parallel write path") and `getConnectedAccountStatus(firmId)` (NOT_CONNECTED | ONBOARDING | ACTIVE | RESTRICTED | SUSPENDED).
- **A3 own-account OAuth connectors: `CalendarConnectorPort` and `MeetingConnectorPort`, owning Doer "Scheduler (AG-4)"; "per-firm OAuth refresh token"; correction: "There is still no `SchedulerPort` (the Scheduler is the Doer, not a rail); the connectors are the Scheduler's external seam."** (Note: Triage 5 Oct proposes two-way calendar sync and video connectors move to Release 2.)
- **A4 `AnswerSnapshot` (PROSPECT | CASE): "`purpose` (e.g. `ASSESSMENT`, `SQR_ADVANCE`) + `capturedAt` + `capturedBy` — provenance; **immutable once written**"; stamps `packVersionId` + `configVersionsJson`; "Re-running a decision **does not mutate** an existing snapshot — it inserts a **new** `AnswerSnapshot`". Producer in scope for "the assessment (AG-3) wave".** → the reproducibility record any assessment-related AI Worker would rely on (Inferred).
- A5 permission-key grammar `^(system|agent|portal)\/[a-z0-9-]+:[a-z0-9-]+(\.[a-z0-9-]+)?$`.
- A6 `entityType` values UPPER_SNAKE (CASE, PROSPECT, ASSESSMENT, TEMPLATE, DOCUMENT, INVOICE, PARTY).
- A7 Prisma 7 / PostgreSQL 18 (2026-06-26).
- END of Doc 1 (line 3093). Doc 1 contains NO occurrence of "AI" as a capability (FD-16 dated 2026-08-02 post-dates Doc 1 v1.3 of 2026-06-26) — verify by grep below.

