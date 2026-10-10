# Inventory slice: sa-frs (Super Admin detailed functional requirements)

Reader: requirements-cartographer (W1, 9 Oct 2026). Source folder: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/` only. Format: `SCHEMA.md`. Notes were written file by file while reading and then regrouped into Parts 1–5 below (one sub-section per module in each Part).

Abbreviations used in citations: file names shortened to the module ID plus version, e.g. "SA-01 v2.2 §3.12". All quotes are word for word from the named file.

## Slice summary and cross-file findings

Facts below are cited to the module sections in Parts 1–5. Anything that is my reading rather than the documents' words is labelled **Inferred**, **Unknown** or **Proposal**.

### A. Release status as the files state it (not checked against the Program Charter, which is outside this slice)

| File | Has a "Release 1 priorities" table? | What it says |
|---|---|---|
| SA-01 v2.2 | Yes (§0.3) | All slices "**Must now**" except "who is on which version" (Should now), retire screen and clone (Defer); Canada R1 content "Parked" |
| SA-01B v1.2 | Yes (§0.3) | Core "**Must now**"; box maps, deterministic filling, forms editor, "AI drafting of box maps" and "AI reading of uploaded documents" **Defer** |
| SA-02 v2.19 | Yes (§0.3) | All "**Must now**"; some parts "Should now" |
| SA-03 v2.14 | Yes (§0.3) | "**Must now**" except role seeding "Should now", price sync "Moved" |
| SA-04 v2.14 | Yes (§0.3) | Payment spine "**Must now**"; discounts and notification log "Should now"; manual billing and revenue dashboard "Defer" |
| SA-07 v2.10 | Yes (§0.3) | Most "**Must now**"; Google sign-in "Phase 2" |
| SA-06 v3.1 | No table | Internal-role editor "**Release 1**" (SA-6-19); firm custom roles "not built yet" |
| SA-05, SA-08, SA-09, SA-10, SA-11, SA-12 | No | Status line "Baseline"; phasing given only as Phase-1/2/3 assumptions or open questions in §13 |

**Unknown:** release of SA-05, SA-08, SA-09, SA-10, SA-11, SA-12 from this slice alone; the Charter (another reader) decides.

### B. Doers and engines named anywhere in this slice

| Name | Where named | What the slice says |
|---|---|---|
| Mailer | SA-05 §1; SA-08 §3.0, §3.3; SA-09 §3.4 | sends email templates over the email relay rail |
| Scheduler | SA-08 §3.8 | in-house booking; runs "fully self-contained" without a connector |
| Messenger | SA-05; SA-06 §10b AG-10; SA-08 §3.5 | SMS / WhatsApp / portal chat over the gateway rail |
| Dialer | SA-06 §10b AG-02; SA-08 §3.5 | calls over the gateway rail |
| Biller | SA-05 §1; SA-08 §3.4 | renders invoices; charges over the payment rail. **Not named in SA-04** (SaaS billing uses Stripe directly) |
| Signer | SA-05; SA-06 §10b; SA-08 §3.7 | in-house e-signature with per-country consent and certificate settings |
| Drafter | SA-05; SA-06 §10b AG-04/05/09 | generates retainers and documents from templates |
| Qualifier | SA-06 §10b AG-03; SA-08 plane note | "Run / re-run the Qualifier" (assessment) |
| Filler | SA-06 §10b AG-07 | "prepares drafts; does not approve them" (government forms) |
| Binder | SA-06 §10b AG-07 | case documents |
| Reader | SA-06 §10b AG-08 | proposes values that staff verify ("approve a Reader-proposed value") |
| Sorter | SA-06 §10b AG-10 | matches incoming messages; "low-confidence matches" go to a human queue |
| Finder | SA-06 §10b code-only keys | staff search |
| Minder | SA-03 SA-3-35; SA-06 §10b AG-11 | deadline and expiry reminders, always on in every plan; "Minder deadline cascades" |
| Conductor (Workflow) | SA-05 §1; SA-06 §10b AG-13; SA-08; SA-09; SA-12 | runs workflow steps and message templates; "active Conductors pause" when a feature is switched off |
| Deterministic engines | SA-01 / SA-01B | pack validation, dry-run, generic scoring engine, eligibility rule sets, resolver, deterministic form filler (AcroForm only) |
| Platform engines | SA-02, SA-03, SA-04, SA-06, SA-09, SA-10, SA-11, SA-12 | firm creation service, entitlement service, usage counters, Stripe rail, permission guard, aggregation pipeline, SLA engine (to build), Audit Emitter, retention engine, `FlagService` |

Not seen in this slice: Tasker, Reminder (as a Doer name), Reporter, Reviewer, Planner, Timer, Submitter.

### C. The five most AI-relevant findings

1. **The only explicit AI permissions in the Super Admin files sit in SA-01B and are deferred:** AI may draft box maps and extract answers from uploaded documents "with a confidence score and a human confirmation step" (SA-1B-34), but "AI never sets a value on a form at fill time" (SA-1B-35); both are **Defer** in Release 1 (SA-01B v1.2 §0.3).
2. **SA-06 already records AI controls owned by AG-11:** AI-written client text is approved by a licensed user by default, as "a **firm setting, on by default, that the firm may switch off**"; switching AI on is Owner-only; `agent/automation:set-autonomy` sets an action's autonomy level "never below the floor"; approval items (including "AI-written or supervised client message") go to all holders of the approval permission, licensed staff marked "preferred" (SA-06 v3.1 §3.3, §10b, Appendix C; change note §1).
3. **There is no non-human actor anywhere in the admin model:** staff accounts are named people only (SA-07 SA-7-3, SA-7-39); roles are granted to a person (SA-06 §3.0); the audit actor types are `super_admin`, `firm_staff`, `client`, `system` only (SA-11 SA-11-2). **Inferred:** an AI Worker would be logged as `system` or under a human's identity unless a new actor type is defined. **Unknown** which.
4. **Pricing hooks exist but AI is not priced:** "Nothing is sold outside a plan: there are no add-on prices in Release 1" (SA-4-44); add-ons are deferred until "A capability needs per-use pricing" (SA-04 §0.1); new metered limits are "configuration, not a migration" (SA-03 §11); new product-map items "start **off on every plan**" (SA3-D3d). The "auto-prefilled forms" limit "has nothing to meter in Release 1" (SA-01B SA1B-X10).
5. **The support-session rules are the nearest template for an Expat Ready-side AI acting inside a firm:** read-only by default, changes only with the owner's time-limited consent, every action tagged, a fixed always-blocked list including the four professional judgements (waive warning, approve review, record decision, export case), shown to the firm owner (SA-02 SA-2-17, SA2-D14). SA-10's own automation is suggest-only: "a hint the agent confirms, never a silent decision" (SA-10 §3.3).

### D. Cross-file conflicts and gaps that matter for AI Workers

- **Older "Baseline" files disagree with reviewed decisions.** SA-05, SA-08, SA-09, SA-10, SA-11 and SA-12 still describe firms with several countries, while SA-03 SA3-D1 says "A firm has **exactly one country**". SA-05 says French is required for Canada; SA-01 SA1-D2 says "French is optional". SA-05 and SA-10 use `global/*` permission names; SA-06 §3.1 says the `global/` prefix is "purged". SA-10 sends unauthorised impersonation to "request supervisor approval"; SA-02 SA2-R2 and SA-07 removed supervisor approval. SA-09 uses firm statuses (SUSPENDED / OFFBOARDED) that SA-02 replaced. SA-12 §1 and US-3 still describe closing deals with firm overrides; SA-12-10 forbids it.
- **No AI model provider rail.** SA-08 lists storage, email relay, payment, SMS/WhatsApp gateway and identity provider only, and forbids third-party product integrations (BR-1). **Inferred:** an external AI model service would need a rail entry, a residency row and a sub-processor safeguard (SA-11 §3.6 warns on any "Non-Canadian without a confirmed safeguard"). Not stated anywhere.
- **Canada pack content does not exist yet.** SA-01 parks it to a separate session (slice SA-01.15); SA-01B §12 says no resolver, no assessment output, no checklist resolver are built. **Inferred:** AI Workers that rely on pack rules have nothing to run on until that content is authored and approved.
- **Licensed sign-off is a firm setting, not a hard rule.** SA-06 SA6-D9: "The permission system never checks licence"; there is no RCIC role. Whether this is enough for regulated advice and filing: **confirm with counsel / RCIC**.
- **Several code-state notes cite an older codebase** (`DevAPI-main`, `src/...`, `clientId`) in SA-05, SA-08, SA-09, SA-10, SA-11, SA-12, while SA-06 says that code is "retired". Code status for these modules is therefore **Unknown** from this slice.

## Part 1: Components

### SA-01 Country and immigration pack management (v2.2)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-1 | Country and immigration pack management (the "container") | Admin (SA) | Defines each destination country and holds all its immigration rules as dated, versioned "Country Packs" that firms read only. | Content Manager, content publisher, Platform Owner; firm staff indirectly | Content Manager edits pack drafts, uploads forms, bulk-uploads reference tables; publisher reviews diffs and approves; Platform Owner creates/activates/suspends country | None named | Country Pack (17 content areas, see SA-1B), completeness profiles, validation | Yes: "a production pack needs a **second person** — its author and its submitter can never approve or publish it" | R1: §0.3 slices SA-01.00–SA-01.15 "**Must now**" | SA-01 v2.2 §1, §3.12 |
| SA-1 §3.1 | Countries | Admin (SA) | Create, activate, suspend, re-enable a destination country; R1 runs Canada only. | Platform Owner | Creates country, decides activation, writes suspend/re-enable reason | None | ISO code lists, timezone; activation needs a published production pack | Platform Owner only: "creating, activating, suspending and re-enabling a **country** is Platform Owner only" | R1 (SA-01.01 "Must now") | SA-01 v2.2 §0 SA1-D6, §3.1 |
| SA-1 §3.2 | Country Pack, 17 content areas + completeness profiles | Admin (SA) | The bundle of all rule content per country (fields, programs, questionnaire, documents, forms, field maps, conditions, scoring, eligibility, stages, reference data, regulator setup, labels). | Content Manager | Authors every content value (detail in SA-1B) | None | All 17 content areas; "completeness profile — the rules for what must be present before a pack can publish" | Content values: "authored and signed off by the Immigration SME and product owners" (BR-15) | R1 (SA-01.02 "Must now") | SA-01 v2.2 §3.2, §5 BR-15 |
| SA-1 §3.12 | Versioning, review and publishing | Admin (SA) | Draft → In review → Approved → Published, scheduled publish in the country's timezone, rollback, "who is on which version" list. | Content Manager, publisher | Submits, reviews, rejects with reason, approves, schedules, rolls back with written reason | None (scheduled publish is a system job; no Doer named) | Mandatory validation; two-person rule | Yes: "Rollback (one person with the publisher role, written reason)"; production needs second person | R1 (SA-01.12 "Must now"; who-is-on-which-version "Should now"; retire screen "Defer") | SA-01 v2.2 §0.3, §3.12 |
| SA-1 §3.13 | Authoring tools: validation, dry-run, diff, import/export, clone | Admin (SA) | Checks a draft before publish, test-runs rules and scoring on a sample client, compares versions, imports/exports packs (JSON, CSV/XLSX). | Content Manager, publisher | Builds sample clients for dry-run, reads validation report, reads diff before approving, fixes errors | None | Validation checks list (references resolve, scoring consistent, form maps match PDF, licence patterns, languages, completeness profile) | Approval step shows diff; "Errors block; warnings don't." | R1 (SA-01.13 "Must now" for validate, diff, dry-run, import/export; clone "Defer") | SA-01 v2.2 §3.13 |
| SA-1 §3.14 | How firms use the pack: pinning and adoption | Cross-cutting | Each client's work stays pinned to the pack version it started on; staff adopt newer rules deliberately with one click and a reason. | Firm staff; Super Admin (listing) | Firm staff decide when to adopt newer rules and type a reason | None | Pack version pins (PackWorkPin), BR-3 date selection, BR-4 outputs stamped | Staff decision: "new work for that client requires an explicit adoption by firm staff — one action, with a reason, audited" | R1 (SA-01.14 "Must now") | SA-01 v2.2 §3.14, SA-1-58 |

### SA-01B Content Pack Configurator (v1.2)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-1B | Content Pack Configurator (content and the "resolver") | Admin (SA) | Holds every piece of immigration content in the pack and the engine that turns it into each person's questionnaire, checklist and forms. | Content Manager, Content Approver; firm staff consume | Content Manager authors library, rows, routes, reference tables; Approver approves | None named | Library, configurator rows, routes, reference tables | Production approval by second person (SA-1); content values "Routed to the Immigration SME, product owners final" | R1 core "**Must now**" (§0.3); several items Defer | SA-01B v1.2 §1, §0.3, §13 |
| SA-1B §3.1–3.3 | Question library: canonical fields, answer lists, field groups, placements, purposes, sections | Admin (SA) | Every question is defined once, flagged lead/prospect/case tier, grouped and reused in sections with show/hide rules, repeats and coverage-gap rules. | Content Manager | Defines fields, groups, sections, conditions, coverage rules | None | Canonical fields; "five fixed kinds" of purpose; coverage rules | Content authoring, approved by second person | R1 "Must now" (SA-1B-1 – SA-1B-17) | SA-01B v1.2 §3.1–3.3 |
| SA-1B §3.4 | Master documents: substitute sets and validity gates | Admin (SA) | Each document type defined once with accepted alternatives, expiry rules and whether expiry blocks submission; reminders derive from it. | Content Manager | Authors document types, substitutes, validity periods | Reminders "derive from SA-1B-21 to SA-1B-23 with nothing further to configure" (no Doer named) | Document validity rules | Deficiency reasons are firm-owned (SA1B-D23) | R1 "Must now" (SA-1B-18 – SA-1B-25) | SA-01B v1.2 §3.4 |
| SA-1B §3.5 | Master forms, editions and box maps (form filling) | Admin (SA) | Government forms and their editions; box maps link each form box to client answers so forms can be filled deterministically. | Content Manager; staff upload/e-sign | Today (R1): staff upload and e-sign forms; mapping and filling parked | Signer implied by "e-sign" (Doer not named) | Box maps, transforms, value maps; deterministic filler | "Nothing is signed without a person approving it." (SA-1B-30) | R1: form list only; box maps and filling **Defer** (SA1B-D28) | SA-01B v1.2 §3.5, §0.3 |
| SA-1B §3.6 | Rules, gates and scoring | Admin (SA) | Conditions written once over canonical fields; eligibility gates (hard yes/no) and scoring grids evaluated by one generic engine; every government-derived item carries source, date checked and next-review date. | Content Manager, second approver | Authors rules; reviewer checks them (no test profiles); keeps review dates current | None | Shared condition language; generic scoring engine | "trusted by **second-person approval** alone" (SA1B-D18; owners' call against recommendation) | R1 "Must now"; overdue queue "Should now"; test profiles "Defer" | SA-01B v1.2 §3.6, §0 |
| SA-1B §3.7 | Reference-table designer | Admin (SA) | Content Managers design typed tables (occupations, language scores, fees, funds, wages) and bulk-upload rows. | Content Manager | Designs tables, bulk-uploads and fixes row errors | None | Table definitions, validation | Definitions "needing second-person approval" (SA-1B-42) | R1 "Must now" | SA-01B v1.2 §3.7 |
| SA-1B §3.8 | Government steps | Admin (SA) | Library of government milestones (biometrics, medicals, fairness letter, decision...) with deadline rules, gates and reminders, placed on rows. | Content Manager | Authors steps and deadline rules | Reminders named but no Doer; delivery steps "platform-standard" | Deadline rules per step | — | R1 (part of row "Must now") | SA-01B v1.2 §3.8 |
| SA-1B §3.9 | Regulator setup and required wording | Admin (SA) | Representative types (RCIC, lawyer/notary, paralegal), licensing bodies, licence formats; required wording carried on every assessment. | Content Manager | Authors regulator data and disclaimer wording | None | Regulator config | Firm responsible for own professional limits (SA-1B-53) | R1 "Must now" | SA-01B v1.2 §3.9 |
| SA-1B §4 | Programme structure, four levels, government fees | Admin (SA) | Pathway › Program › Category › Sub-category; fees per category; linked-case suggestions declared. | Content Manager | Authors the tree and fees | None | Fee table | — | R1 "Must now" | SA-01B v1.2 §4 |
| SA-1B §5 | Configurator rows | Admin (SA) | One row per full combination holding the ordered list of sections, documents, forms and government steps, each with "who" and "only if". | Content Manager | Builds rows, copies between rows, bulk adds/removes items, previews per sample family | None | Lines, conditions | Bulk change lists "the affected rows before the change goes for approval" (SA-1B-61) | R1 "Must now" | SA-01B v1.2 §5 |
| SA-1B §6 | Filings and routes | Cross-cutting | A case holds filings (one application to one authority each); routes (e.g. Express Entry profile then application) open the next filing when one is approved. | Content Manager authors; staff use (AG-7) | Authors route per category | None named (next filing opens automatically) | Route definitions | — | R1 "Must now" | SA-01B v1.2 §6 |
| SA-1B §7 | People and roles, family case | Cross-cutting | Each person on a case has a row and role; shared answers asked once; minors answered by a parent. | Content Manager; staff | Authors roles | None | Roles, conditions | — | R1 "Must now" | SA-01B v1.2 §7 |
| SA-1B §8 | Prospect tiers and the PQR (pre-qualification questionnaire) | Cross-cutting | One PQR per country: block 0 plus a block per qualifier; lead form gives an "indicative" result; each tier pre-fills the next. | Content Manager; firm staff and prospects (AG-2) | Authors blocks; staff fill PQR with prospect or send link | Qualifier (Doer) not named in this file | Rules unfold blocks | Lead result is "**indicative**" | R1 "Must now" | SA-01B v1.2 §8 |
| SA-1B §9 | Assessment output | Cross-cutting | Verdict per programme (qualifies / close / does not), deciding rule in plain words, the gap, required wording, "rules as at" date, reproducible. | Staff (AG-3) | Reads and explains verdict | None named | Gates, scoring, required wording | Not stated in this file | R1 "Must now" | SA-01B v1.2 §9 |
| SA-1B §10 | Startable and completeness checks | Admin (SA) | A category can be opened as a case only when its row is complete; console lists what is startable and what is missing. | Content Manager | Reviews missing-items list | None | Publish checks | — | R1 "Must now" | SA-01B v1.2 §10 |
| SA-1B §11 | Firm extensions | Firm (AG) | Firms may add own questions, reorder/hide optional pack questions, own deficiency reasons and fee-quote wording. | Firm staff | Writes own questions and wording | None | — | Firm fields "never feed conditions, scoring or government forms" (SA-1B-94) | R1 "Must now" | SA-01B v1.2 §11 |

### SA-02 Tenant / firm management (v2.19)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-2 | Tenant / firm management | Admin (SA) | "the **control plane for the firms that are the business**": creates, watches, supports and closes every firm. | Firm onboarding / Account manager (heaviest), Support Agent, Billing, Platform Owner / Security & audit, Platform Engineer; Firm Owner indirectly | See sub-rows | Owner invitation email via the worker mailer (`MAILER_ADAPTER`); no Doer named | SA-3 plan limits, SA-4 billing events | Reasons required for operator actions | R1: all slices SA-02.00–SA-02.09 "**Must now**" (some parts "Should now") | SA-02 v2.19 §1, §0.3 |
| SA-2 §3.1 | Creating a firm (Super Admin form or private sign-up link) | Admin (SA) | One creation service; seeds six starter roles, sends owner invitation, sets Trial or Active. | Firm onboarding / Account manager | Types firm details after a demo, picks plan and discount, creates sign-up link, resumes or abandons stalled set-ups | Invitation email (mail sender; not named as Mailer) | Duplicate email check, tax-number format, web-address availability | Abandon needs a reason | R1 "Must now"; sign-up links "live once SA-4 has prices and card payments" | SA-02 v2.19 §3.1, §0.3 |
| SA-2 §3.2–3.3 | Firm directory and firm detail | Admin (SA) | List with search/filters and one-screen account view (identity, health, activity, actions). | Account manager, support, Platform Owner | Searches, filters "mine", reads health, takes permission-gated actions | None | Usage counters | — | R1 "Must now" | SA-02 v2.19 §3.2, §3.3 |
| SA-2 §3.4 | Firm lifecycle | Admin (SA) | Provisioning → Trial / Active → Payment hold → Deleted, plus Security lock and Abandoned; payment-driven moves are automatic. | Billing (watches), Platform Owner (lock) | Applies/lifts/closes security lock with written reason | System jobs (payment hold, 90-day deletion); no Doer named | SA-4 billing events; 14-day and 90-day rules | Security lock "applied by Super Admin with a written reason (fraud, abuse, breach)" | R1 "Must now" | SA-02 v2.19 §3.4 |
| SA-2 §3.6 | Health and usage | Admin (SA) | Per firm usage vs plan limits, last login, payment and trial state; alerts to account manager or shared inbox. | Account manager | Watches over-limit, trial-ending and overdue lists; follows up firms | Alerts by background jobs ("alerts raised by background jobs, not page loads") | SA-3 metrics, counters | — | R1 "Must now"; trends "Should now" | SA-02 v2.19 §3.6, §11 |
| SA-2 §3.7 | Support access ("log in as") | Cross-cutting | Expat Ready support opens a firm read-only with reason; changes only if firm owner allows for 1/7/30 days; long always-blocked list. | Support Agent, Platform Owner, Security & audit | Opens session with ticket reason, fixes things if allowed | None | Firm permission record, session limits (60 min) | Professional actions blocked: "professional judgements and evidence exports that support staff never make for a firm" | R1 "Must now" read-only + history; "Should now" change permission | SA-02 v2.19 §3.7, SA-2-17 |
| SA-2 §3.8 | Contact, account manager, key dates and emails | Admin (SA) | Owner contact switch, billing email, optional account manager with shared-inbox fallback, emails. | Account manager | Switches contact (reason), reassigns manager, resends invitation | Emails (no Doer named) | — | Reason required, audited | R1 "Must now" | SA-02 v2.19 §3.8 |
| SA-2 §3.9 | Cancelling, data download and deletion | Cross-cutting | Owner cancels with reason; self-service full data download; deletion 90 days into hold; record-keeping notice (CICC 6 years). | Firm Owner; Platform Owner / Security & audit for supervised export | Owner cancels and downloads; Security & audit verifies identity for supervised export | Deletion job, export background job | Retention rules, legal hold (SA-11) | Supervised export: "verifies the requester's identity and sends a secure, expiring download link" | R1 "Must now" cancel/download/notice; "Should now" deletion job, backup purge, supervised export | SA-02 v2.19 §3.9, §0.3 |

### SA-03 Subscription plans and entitlements (v2.14)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-3 | Subscription plans and entitlements | Admin (SA) | "the **commercial control plane** of Expat Ready": decides what each paying firm can use (product map) and how much (limits). | Billing (heaviest), Platform Owner, Account manager, Platform Engineer, Support (read-only); Firm Owner indirectly | See sub-rows | Minder named for always-on reminders | Entitlement service, product map, limits, usage counters | Owner approval of every live-plan change | R1: slices SA-03.00–SA-03.09 "**Must now**" except role seeding "Should now", price sync "Moved" | SA-03 v2.14 §1, §0.3 |
| SA-3 §3.1 | Plan definition | Admin (SA) | Plan with name, trial days, status Draft/Active/Retired, Public or Internal; no prices (SA-4 holds them); clone to start. | Billing | Builds plans as drafts "over days", clones, activates | None | — | Retired → Active "requires a written reason" | R1 "Must now" | SA-03 v2.14 §3.1 |
| SA-3 §3.2 | Usage limits (hard / warn) | Admin (SA) | Per plan limits on seats, clients, active cases (individual/corporate), auto-prefilled forms, retainer agreements, storage, tasks, messages, time entries; warn becomes hard after 14 days. | Billing sets; account manager follows up | Sets limits and modes; account manager calls over-limit firms | Notifications/alerts (no Doer named) | `UsageCounterService`, `assertWithinLimit` | — | R1 "Must now" | SA-03 v2.14 §3.2, SA-3-4 |
| SA-3 §3.3 | Product map | Admin (SA) | Hierarchical list of every firm-app module → tab → action, switched on/off per plan; dependencies cascade; new items start off; unregistered routes fail the build. | Billing, Platform Engineer | Decides each new item per plan ("New — needs a decision" list), reviews dependency warnings | None | Product map; "one master list of actions" shared with SA-6 roles | — | R1 "Must now" ("build before the Agent modules") | SA-03 v2.14 §3.3, SA-3-30, SA-3-32 |
| SA-3 §3.3 always-on | Always-on items | Cross-cutting | Security floor, payment screens, data download, corporate-case items and standard deadline/expiry reminders "registered with the Minder" can never be switched off by plan. | — | — | **Minder** (AG-11-47, AG-11-48) | CI gate `check-flag-security-floor.ts` | — | R1 | SA-03 v2.14 SA-3-35 |
| SA-3 §3.5 | Starter roles for every firm | Cross-cutting | Every plan seeds the same six starter roles; roles never decide what a firm may use. | — | — | None | SA-6 roles | — | R1 ("Should now" slice SA-03.05) | SA-03 v2.14 §3.5 |
| SA-3 §3.6 | Live entitlement resolution | Cross-cutting | One service answers on every request: is this item on for this firm, is this action within limit, given firm state (hold / lock). | System | — | None | `resolve / isIncluded / assertWithinLimit`; cache ≤ 60 s | — | R1 "Must now" | SA-03 v2.14 §3.6 |
| SA-3 §3.7 | Usage-vs-limits visibility | Admin (SA) | Over-limit firms list and per-firm entitlement and usage panel. | Account manager, Support | Reads list, explains to firms why a feature is unavailable | Alerts | Same counts as enforcement | — | R1 "Must now" list + alerts; dashboard "Should now"/deferred | SA-03 v2.14 §3.7 |
| SA-3 §3.9 | Plan lifecycle, live-plan change requests and approvals | Admin (SA) | Any change to a plan with firms is a change request approved by an Owner other than the requester; additions now, removals at renewal ≥ 30 days. | Billing requests; Platform Owner approves | Writes request; Owner reviews exact change and affected-firm count; approves/rejects with reason | None | Approval queue | "waits for approval by an **Owner** other than the requester (Billing requests but never approves)" | R1 "Must now" | SA-03 v2.14 §3.9, SA-3-44 |

### SA-04 SaaS billing (v2.14)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-4 | SaaS billing (firm pays Expat Ready) | Admin (SA) + firm billing screen | "SA-4 is **how Expat Ready gets paid**": two prices per plan, card checkout via sign-up link, invoices with tax, 14-day failed-payment timeline, payment hold, plan changes, cancellation, refunds. | Billing (heaviest), Platform Owner, Account manager, Support (read-only), Platform Engineer; firm Owner and Admin | See sub-rows | Payment processor Stripe Billing + Stripe Tax (an SA-8 "rail", not a Doer); billing notices (no Doer named; Biller not mentioned) | Fixed timeline rules, tax by business address | Price changes on live plans approved by an Owner | R1: most slices "**Must now**"; discounts and notification log "Should now"; manual billing and revenue dashboard "Defer" | SA-04 v2.14 §1, §0.3 |
| SA-4 §3.1 | Plan prices and price changes | Admin (SA) | Exactly one monthly and one yearly CAD price per plan, pushed automatically to Stripe; price changes on plans with firms are Owner-approved requests; existing firms move at renewal ≥ 30 days. | Billing requests; Platform Owner approves | Types prices; writes change request; Owner approves | None | — | "a price change is a **request** approved by an Owner" | R1 "Must now" | SA-04 v2.14 §3.1 |
| SA-4 §3.1a | Approved discounts | Admin (SA) | Short list of approved discounts (percent or CAD off, one invoice or set months, never forever); one per firm, applied with a reason; no add-ons. | Billing, Account manager | Maintains list; applies discount with reason | None | — | Reason required, audited | R1 "Should now" | SA-04 v2.14 §3.1a, §0.3 |
| SA-4 §3.2 | Sign-up-link checkout → firm created | Cross-cutting | Firm enters details, tax numbers, chooses plan, accepts bilingual terms, card on Stripe page; firm created exactly once on signed notification. | Prospective firm owner | Firm types details and card | Processor notification → SA-2 creation service | Tax-number formats | Terms acceptance recorded | R1 "Must now" | SA-04 v2.14 §3.2 |
| SA-4 §3.3–3.4a | Subscription record, invoices, card, sales tax | Admin (SA) | One subscription per firm; CRA-complete bilingual invoices (French first) stored in Canada; tax computed by Stripe Tax from business address. | Billing, Support | Looks up registry "if in doubt" for tax numbers; reads subscription timeline | Stripe Tax (rail) | CRA invoice content rules | "a Billing user may look a number up in the CRA or Revenu Québec registry if in doubt" (SA4-D17) | R1 "Must now" | SA-04 v2.14 §3.3–3.4a |
| SA-4 §3.5–3.6 | Failed payments, payment hold and coming back | Cross-cutting | 14-day overdue timeline with notices on days 0, 7, 12; payment hold day 14; deletion day 104; return = overdue invoice + new period. | Billing, Account managers; firm Owner/Admins | Billing works the **overdue list**: "so I can call before payment hold"; clicks "send reminder now", "send update-card link" | Stripe automatic retries; billing notices | Fixed timeline (SA3-E2) | "Goodwill is given through an approved discount or a refund, never by lifting a hold without payment." | R1 "Must now" | SA-04 v2.14 §3.5, §3.6, §2 |
| SA-4 §3.7 | Plan and billing-period changes | Cross-cutting | One rule: if it increases what Expat Ready collects now it happens now, else at renewal; yearly → monthly waits for anniversary; Super Admin exception with credit. | Firm Owner; Super Admin | Owner chooses plan; Super Admin makes exceptions with reason | Stripe proration, subscription schedules | SA4-D24 timing rule | Yearly→monthly mid-term: "Super Admin — and only Super Admin" (SA-4-74) | R1 "Must now" | SA-04 v2.14 §3.7 |
| SA-4 §3.8–3.9 | Trials, cancellation and refunds | Cross-cutting | Trial reminders 7 and 3 days before end; Owner cancels to period end with undo; no refunds except three exceptions; credit notes. | Owner; Billing | Billing issues refunds on written request; reviews written-off report | Stripe refunds | BR-19 | First-year refund "is requested in writing and issued by a Billing user — no self-service refund button" (SA4-D10a) | R1 "Must now" | SA-04 v2.14 §3.8, §3.9 |
| SA-4 §3.10 | Payment-processor notifications | Admin (SA) | Signed notifications recorded once, processed in background; disputes recorded and alerted; log screen with safe re-run. | Platform Engineer, Billing | Re-runs failed notifications; handles disputes by hand | Event ledger | Signature check | Disputes: "no automatic status change in Release 1" | R1 "Must now"; log screen "Should now" | SA-04 v2.14 §3.10 |
| SA-4 §3.12 | Revenue figures (data now, dashboard later) | Admin (SA) | Records everything in CAD for SA-9; dashboard deferred. | Billing | Uses Stripe reports | — | — | — | Dashboard "Defer" | SA-04 v2.14 §3.12 |
| SA-4 §3.13 | Firm's billing screen | Firm (AG) | Owner and Admin: update card, pay now; Owner only: upgrade, downgrade, invoices, billing details, cancel. Always on. | Firm Owner, Admin | Owner manages subscription | — | SA-06 §10b keys | Owner-only actions enforced on server (SA-4-67) | R1 "Must now" | SA-04 v2.14 §3.13 |

### SA-05 Global templates (v2.2)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-5 | Global templates (platform template catalogue) | Admin (SA) | "the platform's content backbone": one curated, versioned, bilingual library of emails, documents, retainers, messages, workflow blueprints and checklists that every firm inherits and copies. | Country / Content Manager (author), Platform Owner (approve), Firm onboarding / Account manager (seed), Support (read), Platform Engineer | See sub-rows | Rendered downstream by "the Doers (Mailer, Drafter, Signer, Biller, Messenger) and the Conductor (Workflow)" | Merge-field dictionary, safe render engine, SA-1 pack | Legal wording "confirmed by the Immigration-SME ... with the **founder as final authority**" | **Unclear**: file status "Baseline — not yet reviewed"; no §0.3; Phase 1/2/3 from v1.0 awaiting founder confirmation (§13 Q10) | SA-05 v2.2 header, §1, §13 |
| SA-5 §3.1 | Global template library | Admin (SA) | Filterable list of every system template with country, status, language coverage, default badge and "cloned by N firms". | Content Manager, Platform Owner | Browses, finds missing French bodies, reviews queue | None | — | — | Unclear | SA-05 v2.2 §3.1 |
| SA-5 §3.2 | Template types and channels | Admin (SA) | Six families: email, document/letter, retainer/agreement, message/SMS, workflow blueprint, checklist; each type knows its Doer. | Content Manager | Chooses type and channel | Retainer "Rendered by Drafter/Signer (AG-5)"; invoice "Rendered by Biller (AG-6)"; Conductor fires message templates | Per-type merge dictionary | Legal types strictest | Message/SMS and workflow blueprint "Phase-3" (SA-5-7) | SA-05 v2.2 §3.2, SA-5-7 |
| SA-5 §3.3 | Authoring and merge-field dictionary | Admin (SA) | Typed, entity-bound merge fields inserted from a picker; unknown fields block publish. | Content Manager | Writes template bodies, inserts fields | None | `TemplateVariableMapperService` | — | Unclear | SA-05 v2.2 §3.3 |
| SA-5 §3.4–3.5 | Per-country and bilingual variants | Admin (SA) | Each country gets distinct templates; EN/FR bodies side by side, consent text authored per language. | Content Manager | Authors both languages by hand | None | Country pack locales | "consent/legal copy SHALL be **authored per locale, never machine-translated**" (SA-5-15) | Unclear | SA-05 v2.2 §3.4, §3.5 |
| SA-5 §3.6 | Injection-safe rendering and preview | Cross-cutting | Logic-less, auto-escaping render engine shared with firm side; preview with sample data. | Content Manager | Checks preview in both languages | Shared render engine used by Doers | — | — | Unclear | SA-05 v2.2 §3.6 |
| SA-5 §3.7 | Versioning, review and publish | Admin (SA) | DRAFT → REVIEW → PUBLISHED → SUPERSEDED/ARCHIVED; rollback with justification. | Content Manager, Platform Owner | Submits; Owner approves legal types | None | Publish guards | "Legal-type templates SHALL require **Platform-Owner REVIEW approval** before publish." (SA-5-23) | Unclear | SA-05 v2.2 §3.7 |
| SA-5 §3.8–3.9 | Default designation and seeding to firms | Admin (SA) | One default per type/country/language; clone to one firm or bulk-clone to all firms of a country, asynchronously, never overwriting. | Account manager, Platform Owner | Picks defaults; runs bulk-clone wizard; reads result report | Bull queue job (not a Doer) | Default pointer | — | Unclear | SA-05 v2.2 §3.8, §3.9 |
| SA-5 §3.10 | Global-update propagation | Cross-cutting | On republish, marks firm copies stale and notifies firm admins; never writes into a firm's copy. | Content Manager; firm template admins (AG-12) | Firm admins review the change and decide | Notification; queued propagation pass | — | Firm decides: "the change is *offered with a diff* (AG-12), accepted on the firm's terms" | Unclear | SA-05 v2.2 §3.10 |
| SA-5 §3.11 | Regulator/legal wording and the SME seam | Admin (SA) | Where mandated wording (CICC retainer disclosure, no-guarantee disclaimer, consent) enters the platform; mandated blocks protected in firm copies. | Content Manager, Immigration SME, Platform Owner, counsel | SME confirms wording; Owner approves; counsel reviews legal instruments | None | Mandated-block markers | "SA-5 guarantees the *governance*, not the *legal accuracy*" — confirm with counsel / RCIC | Unclear | SA-05 v2.2 §3.11 |

### SA-06 RBAC (v3.1) and SA-06 change note (7 Oct 2026)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-6 | Roles and permissions (RBAC) | Cross-cutting | "the platform's **authorization control plane**": one permission catalogue, one guard, two role sets that never mix (Expat Ready staff `system/*`, firm `agent/*`), dormant portal set. | Platform Owner; firm Owner and Admin; everyone governed | See sub-rows | None | Permission catalogue (259 firm keys), guard, product-map binding | Separation of duties throughout | **Unclear**: no §0.3 priority table; internal-role editor stated "**Release 1**" (SA-6-19); firm custom roles "not built yet" | SA-06 v3.1 §1, SA-6-19 |
| SA-6 §3.1 | Permission catalogue | Cross-cutting | Every authorisable action as a key `<namespace>/<resource>:<action>`; frozen in code; refuses to load if malformed. | Platform engineers (by release) | Adding a key is a code release | None | Naming rule SA6-D10 | — | Built (code) | SA-06 v3.1 §3.1 |
| SA-6 §3.3 | Starter roles, visibility, sign-off, licensed user | Firm (AG) | Six firm starter roles; see-all visibility by default; four professional approvals with Owner and Case Manager; five never-delegable Owner-only actions; licence is a person attribute never checked by permissions. | Firm Owner, Admin | Owner decides who gets approvals; licensed staff maintain own CICC number | None | Appendix C defaults | "**The permission system never checks licence**" (SA6-D9); approvals queue shown to all holders, licensed marked "preferred" | Six roles built in code; approval routing "TO BUILD" (§12) | SA-06 v3.1 §3.3, SA6-D2, SA6-D9 |
| SA-6 §3.5–3.6 | Firm custom roles and plane validation | Firm (AG) | Owner/Admin copy and edit roles; server validates every key is `agent/*`, held by an Admin editor, not Owner-only; written reason required. | Firm Owner, Admin | Builds roles (e.g. Intake), types a reason for every role change | None | SA-6-13 must-have guard | "A written reason is required" (SA6-D3) | "not built in ERv2" | SA-06 v3.1 §3.5, §3.6 |
| SA-6 §3.7 | Plane-aware guard | Cross-cutting | Plane first, then held keys (AND), then entitlement, then own/all record check; every denial audited; support sessions carry READ_ONLY / LIMITED_WRITE scope. | System | — | None | `roles.guard.ts` | — | Built | SA-06 v3.1 §3.7 |
| SA-6 §3.8 | Entitlement interplay | Cross-cutting | Permission authorises the verb, plan decides if the feature works (hard 403), firm country filters resources (soft). | System | — | None | SA-3 product map `PERMISSION_ACTION_MAP` | — | Built | SA-06 v3.1 §3.8 |
| SA-6 §3.10 | Audit, separation of duties and change control | Cross-cutting | Every grant/revoke/refusal audited fail-closed; firm audit log firm-wide for `agent/audit:read`. | Platform Owner, firm Owner/Admin | Reviews audit log | None | Audit outbox | — | Built (partly) | SA-06 v3.1 §3.10 |
| SA-6 §10b AG-11 keys | Automation and AI Doer permissions (catalogue rows) | Firm (AG) | Keys for automations, Minder cascades, autonomy level and switching the firm's AI Doers. | Firm Owner, Admin | Owner switches AI on; Admin/Owner switch AI Doers off; set autonomy | Minder; "AI Doers" (named generically) | AG-11 floors (AG-11-53) | "Switching AI on is the Owner's alone" (truncated row) | NEW keys (not in code) | SA-06 v3.1 §10b AG-11 |
| SA-6 Change note | Change note to all FR owners, 7 Oct 2026 | Cross-cutting | Plain-English summary of SA6-D1–D11, documents updated, code to change (incl. security bug), nothing open. | All document owners, developers | — | — | — | — | — | SA-06-CHANGE-NOTE 2026-10-07 §1–§4 |

### SA-07 Platform users (v2.10)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-7 | Platform users (Expat Ready's internal team) | Admin (SA) | Accounts of Expat Ready's own staff: invite, sign-in with mandatory second step, configurable roles, sessions, activity, deactivation. "a 4–6 person team". | Platform Owner, Staff manager (and every staff member for My account) | Invites staff, gives roles, resets MFA after video-call verification, deactivates and hands over firms | None | Nine starter roles (Appendix A), `system/*` keys | Step-up before support sessions, staff access changes, refunds, platform settings | R1: most slices "**Must now**"; one-session, warnings, My account, Activity, Demo firm "Should now"; Google sign-in "Phase 2" | SA-07 v2.10 §0.3, header |
| SA-7 §3.3 + App. A | Nine staff roles and role editor | Admin (SA) | Platform Owner, Staff manager, Content author, Content approver, Firm onboarding / Account manager, Billing, Support, Security & audit, Platform engineer; Owner edits roles as data. | Platform Owner | Ticks/unticks permissions; creates roles | None | — | "Access changes take effect at once and are audited — no second-person approval." (SA7-D7) | R1 "Must now" | SA-07 v2.10 §3.3, SA7-D2, SA7-D8 |
| SA-7 §3.6 | Activity tab | Admin (SA) | Plain list of what each staff member did, over the audit trail. | Owner, Security & audit | Answers "who opened our account?" with SA-2 support-session list | None | SA-11 audit trail | — | "Should now" | SA-07 v2.10 §3.6 |
| SA-7 §3.7 | Deactivate, handover and reactivate | Admin (SA) | Instant deactivation destroying password and second step; tickets back to queue; account-manager handover prompt. | Staff manager | Chooses new account manager or skips | None | — | Reason and step-up | R1 "Must now" | SA-07 v2.10 §3.7 |

### SA-08 Platform integrations and infrastructure rails (v2.2)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-8 | Platform integrations and infrastructure rails | Admin (SA) | "the **infrastructure control plane**": credentials and health of commodity rails (storage, email relay, payment processor, SMS/WhatsApp gateway, identity provider) beneath the in-house Doers, plus Doer platform settings. | Platform Engineer (heaviest), Platform Owner, Billing, Content Manager (read) | Enters/rotates credentials, runs connectivity tests, watches health dashboard, confirms TEST→LIVE | Mailer, Scheduler, Messenger, Biller, Signer, Drafter, Qualifier, Dialer, Conductor named as in-house Doers | Secret store (KMS), health log | TEST→LIVE "require an explicit confirmation step" (SA-8-13) | **Unclear**: status "Baseline — SA-07 decisions applied"; no §0.3; §13 Q7 assumption "storage/email/payment rails + Signer settings = Phase-1; connector = Phase-2; SMS gateway + per-country routing = Phase-3" | SA-08 v2.2 header, §1, §13 |
| SA-8 §3.1 | Secret management | Admin (SA) | Every secret encrypted in a managed store, write-only, masked on read, rotated without downtime, decrypted only where used. | Platform Engineer | Stages, tests, promotes new secrets | — | Secrets Manager / KMS | "You cannot read a secret back — by design, even as Platform Owner." | Unclear (Phase-1 per §13 assumption) | SA-08 v2.2 §3.1 |
| SA-8 §3.2–3.6 | Rails: storage, email relay, payment, SMS/WhatsApp gateway, identity provider | Admin (SA) | Configure each commodity pipe with a live connectivity test before activation. | Platform Engineer, Billing (payment) | Enters config, runs test send / ping | Mailer → email relay; Biller → payment; Messenger/Dialer → gateway; Signer → storage | — | — | Storage/email/payment Phase-1; SMS gateway "Phase-3"; Google staff SSO "Phase 2" | SA-08 v2.2 §3.2–3.6 |
| SA-8 §3.7 | Signer platform settings (in-house e-signature) | Admin (SA) | Per-country consent text, certificate-of-completion template, evidence capture, signing-link expiry; forward-only. | Platform Owner | Edits consent and certificate text per country | **Signer** | Per-country settings, versions | Consent text is legal: "Hand the *content* to counsel" (§13 Q4) — confirm with counsel | Phase-1 (assumption §13 Q7) | SA-08 v2.2 §3.7 |
| SA-8 §3.8 | Own-mailbox / own-calendar connector | Cross-cutting | Optional OAuth link to a firm's own Google/Microsoft mailbox or calendar for Scheduler and Mailer. | Platform Engineer (app); firm (connect) | Firm connects its account | **Scheduler**, **Mailer** | Least-privilege scopes | — | Phase-2 (assumption) | SA-08 v2.2 §3.8 |
| SA-8 §3.9–3.10 | Connectivity test, health dashboard, webhook registry | Admin (SA) | Per-rail status, last error, 24h error rate, ping; Degraded raises a notification; inbound webhooks verified and idempotent. | Platform Engineer | Watches dashboard, investigates Degraded rails | Doer-call outcome telemetry feeds health | `IntegrationHealthLog` | — | Unclear | SA-08 v2.2 §3.9, §3.10 |
| SA-8 §3.11–3.12 | Per-country overrides, data-residency declaration, change safety and rollback | Admin (SA) | Firm → country → platform resolution; residency declaration generated from configured regions; versioned config with rollback and justification. | Platform Owner, Platform Engineer | Rolls back with justification | — | — | Rollback "with a mandatory justification note" | Routing Phase-3; declaration Phase-1 | SA-08 v2.2 §3.11, §3.12 |

### SA-09 Platform analytics and observability (v2.2)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-9 | Platform analytics and observability | Admin (SA) | "the **instrument panel for the business of Expat Ready itself**": cross-tenant, de-identified business metrics (MRR, churn, plan mix), product usage, system health, alerts and exports. | Platform Owner/Founder, Billing, Account manager, Content Manager, Platform Engineer, Support | Founder reads Monday state; engineer watches queues; content team prioritises by per-country usage; sets alert thresholds | Usage counted from Mailer/Messenger (emails/messages sent) and Conductor (automations triggered); queues: email, PDF, automation/workflow, reminder, booking-reminder | Aggregation pipeline, FX snapshots, health-query adapter | — | **Unclear**: status "Baseline"; no §0.3; Phase-1/2/3 named in §13 deferrals; SA-04 says revenue dashboard "Defer" to SA-9 review | SA-09 v2.2 header, §1, §13 |
| SA-9 §3.1–3.3 | Business metrics: tenants, growth, revenue, plan mix, trial conversion, churn | Admin (SA) | MRR/ARR/ARPU, MRR bridge, logo and revenue churn, net revenue retention, cohorts, revenue by country. | Founder, Billing, Account manager | Reviews numbers, prioritises outreach on churn/dunning | — | BR-1–BR-6 definitions | — | Unclear | SA-09 v2.2 §3.1–3.3 |
| SA-9 §3.4 | Product-usage metrics and feature-adoption heatmap | Admin (SA) | Module activity counters, MAU, adoption per plan-gated feature, per-country usage incl. anonymised CRS bands. | Founder, Content Manager | "build-vs-kill signal" decisions | `FeatureUsageEvent` keyed by SA-12 flags | Small-cohort suppression (open) | — | Unclear | SA-09 v2.2 §3.4 |
| SA-9 §3.5 | System health and observability | Admin (SA) | API error rate, latency, queue depth and failure rate, uptime, DB/cache, storage, read from instrumentation. | Platform Engineer | On-call monitoring | BullMQ queues incl. "automation/workflow" | OTel → CloudWatch/Prometheus (not yet wired) | — | Queue + storage first; full APM "wired progressively" | SA-09 v2.2 §3.5, §13 |
| SA-9 §3.8 | Alerts and thresholds | Admin (SA) | Threshold rules on any metric fire one de-duplicated alert, notify, auto-resolve. | Platform Engineer, Billing | Creates rules, acknowledges alerts | Notification module | Seeded defaults (email-queue depth > 500 etc.) | Operator acknowledges | Unclear | SA-09 v2.2 §3.8 |
| SA-9 §3.9 | Export and scheduled digest | Admin (SA) | Aggregate-only CSV/XLSX export (audited); optional Monday digest email. | Founder, Billing | Pulls exports | — | — | — | Export Phase-1; digest "Phase-2" | SA-09 v2.2 §3.9 |

### SA-10 Support (v2.5)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-10 | Support (Expat Ready helps firms) | Cross-cutting (firm submits; Expat Ready answers) | "the **operational bridge between Expat Ready and the firms that pay for it**": firm tickets, cross-firm queue, triage, conversation with internal notes, SLA, escalation, link to support session, knowledge base, CSAT. | Support Agent (heaviest), Support Lead / Account manager, Content Manager, Platform Owner, Platform Engineer; firm staff (submit) | Agents read and answer every ticket, triage category/priority, assign, write internal notes, reproduce issues via support session, escalate, write canned answers | In-house mailer for email fallback (Mailer not named); realtime WebSocket gateway | SLA engine (to build), routing rules | Impersonation requires separate permission; reasons for force-close | **Unclear**: status "Baseline"; no §0.3; demo-oriented recommendations in §13 (e.g. "demo the internal canned responses + impersonation link"); SA-10-26 shipped "in the MVP" per AG1-D13 | SA-10 v2.5 header, §1, §13 |
| SA-10 §3.1 | Ticket submission (firm side) | Firm (AG) | "Get help" form inside the firm console; auto-acknowledgement in firm's language; on-call agents notified within 60 s. | Firm staff | Firm types title, description, category, priority, attaches screenshot | Notification + mailer | — | — | EXISTS (submit); notify/ack NEW | SA-10 v2.5 §3.1, SA-10-1, SA-10-2 |
| SA-10 §3.2–3.3 | Support queue, triage, assignment and routing | Admin (SA) | Cross-firm queue sorted by SLA risk; category-driven routing (e.g. Immigration Content → Content Manager); optional round-robin; auto-triage hints. | Support Agent, Lead | Picks next ticket, sets category/priority, assigns, bulk-triages | — | Routing rules (config) | Auto-triage: "a hint the agent confirms, never a silent decision" | Queue EXISTS; routing NEW | SA-10 v2.5 §3.2, §3.3 |
| SA-10 §3.4–3.5 | Ticket workspace (conversation, internal notes) and realtime | Admin (SA) | Thread with reply vs internal-note toggle, canned responses, KB suggestions, escalate, open support session; live WebSocket delivery with email fallback. | Support Agent | Writes replies and internal notes; reproduces issues | Realtime gateway; email fallback | — | Internal notes must never reach firm (BR-4) | Messaging EXISTS; note enforcement NEW "security-critical" | SA-10 v2.5 §3.4, §3.5 |
| SA-10 §3.6–3.7 | Status lifecycle, SLA clock and escalation | Admin (SA) | SLA per priority measured in firm's timezone and business hours, paused when waiting on firm; manual and rule-driven escalation. | Support Lead | Handles escalations; sets SLA targets | SLA engine (NEW) | Business-hours calendar | Escalation reason and target chosen by agent | NEW | SA-10 v2.5 §3.6, §3.7 |
| SA-10 §3.8 | Link to support session (SA-2 impersonation) | Cross-cutting | One click from ticket to SA-2 session with ticket reference pre-filled; double-gated. | Support Agent | Starts session with ticket reason | — | SA-2 rules | "Holding `global/support:*` alone is **not** sufficient" | NEW | SA-10 v2.5 §3.8 |
| SA-10 §3.9 | Knowledge base and canned responses (bilingual) | Cross-cutting | Bilingual canned replies with merge fields; internal and firm-facing KB articles, country-tagged; contextual suggestions to deflect tickets. | Support Agent, Content Manager (KB admin), firm staff (deflection) | Agents insert and edit canned replies; Content Manager writes articles | — | — | Agent edits before sending | NEW; firm-facing KB "Should/Phase-2" (§13 Q6) | SA-10 v2.5 §3.9 |
| SA-10 §3.10–3.12 | CSAT, support metrics to SA-9, category/SLA configuration | Admin (SA) | Survey on resolve; KPIs (first response, resolution, SLA attainment, CSAT); configurable categories, SLA, routing, escalation. | Platform Owner, Lead | Reviews CSAT, configures rules | — | Rollups | Low score "can auto-flag for a lead's review" | NEW (categories fixed enum in Phase-1) | SA-10 v2.5 §3.10–3.12 |

### SA-11 Audit, compliance and data governance (v2.7)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-11 | Audit, compliance and data governance | Cross-cutting (operated from Admin) | "the **compliance backbone of the entire platform**": tamper-evident audit log for all planes, retention and disposal, legal hold, data residency, PIPEDA breach and data-subject-request tooling, consent records, pack provenance, compliance dashboards. | Platform Owner, Compliance / DPO, Account manager, Content Manager, Platform Engineer, Support (light); firm staff and clients generate events | DPO runs breach assessment and notifications, tracks DSR deadlines, configures retention; Owner exports evidence for auditors | Audit Emitter, retention engine, chain-verify job (no Doers named) | Hash chain, WORM anchor, retention floors | Legal values: "the system makes them configurable; counsel sets the numbers" | **Unclear**: status "Baseline"; no §0.3; §12 "Honest scope note for the demo" lists demoable parts; WORM, archival, per-country routing "target architecture" | SA-11 v2.7 header, §1, §12, §13 |
| SA-11 §3.1–3.3 | Immutable, tamper-evident audit log; actor model; investigation and export | Cross-cutting | Every security/data-significant event from every plane, append-only (INSERT-only grant), hash-chained, anchored, verified; explicit `actorType`; impersonation and cross-tenant events first-class; exports self-verifying. | Platform Owner, Platform Engineer, Security & audit | Queries and exports evidence; responds to integrity alarms | Audit Emitter, chain-verify job | `actorType ∈ {super_admin, firm_staff, client, system}` | — | Unclear | SA-11 v2.7 §3.1–3.3, SA-11-1–12 |
| SA-11 §3.4–3.5 | Retention, archival, secure disposal; legal hold | Cross-cutting | Retention per data category with code-enforced legal floors; cold archive; provable disposal; legal hold freezes everything in scope. | Platform Owner, DPO | Sets periods, reviews pre-disposal manifest, places/releases holds with reason | Retention engine (scheduled) | Floors: financial-linked audit ≥ 7 years; staff actions ≥ 7 years; breach ≥ 2 years | Regulatory-ordered audit deletion needs "two-person authorization" (SA-11-17) | Unclear | SA-11 v2.7 §3.4, §3.5 |
| SA-11 §3.6 | Data residency declaration and warnings | Admin (SA) | Generated from SA-8 rails; flags any non-Canadian rail without safeguard; Canada in `ca-central-1`. | Platform Owner | Reviews warnings; supplies sub-processor list for firm DPAs | — | SA-8 rail config | — | Declaration + warning at launch; per-country routing "Phase-3 / founder-confirm" | SA-11 v2.7 §3.6, SA-11-23 |
| SA-11 §3.7 | Breach register and notification (PIPEDA) | Admin (SA) | Records every breach; structured "real risk of significant harm" assessment; 72-hour countdown; notification composer to OPC and individuals. | Compliance / DPO | Assesses harm, decides notification, composes notices | — | RROSH criteria (counsel) | "legal determinations — flagged for the **Immigration-SME and regulatory counsel**" — confirm with counsel | Unclear | SA-11 v2.7 §3.7 |
| SA-11 §3.8 | Data-subject requests and consent records | Cross-cutting | DSR register (access, correction, deletion) on a clock; deletion checks holds and floors, honest partial results; consent records with locale and form version. | DPO; firm executes access exports; clients raise requests | Verifies identity, executes deletions, writes disclosure notes | Retention engine for disposal | Statutory deadlines (counsel) | "where law prevents full deletion ... never falsely "COMPLETED"" | Unclear | SA-11 v2.7 §3.8 |
| SA-11 §3.9 | Pack / reference-data provenance | Cross-cutting | Per-entity history of every pack change (e.g. every CRS table version, publisher, diff) on the audit spine. | Content Manager | Shows provenance when a firm disputes an assessment | — | SA-1 publish events | — | Unclear | SA-11 v2.7 §3.9 |
| SA-11 §3.10 | Compliance dashboards and per-firm report | Admin (SA) | Chain integrity, residency warnings, retention health, breach and DSR clocks, impersonations, holds; per-firm "who from Expat Ready accessed it" report. | Platform Owner, DPO, Account manager | Hands per-firm report to a firm asking for proof | — | Rollups | — | Unclear | SA-11 v2.7 §3.10 |

### SA-12 Feature flags and platform configuration (v2.7)

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| SA-12 | Feature flags and platform configuration | Admin (SA) | "the platform's **control plane for behaviour and configuration**": operational on/off switches with scopes, kill-switches, gradual rollout, typed platform settings, maintenance mode, banners, rate limits — no deploy, all audited. | Platform Engineer (heaviest), Platform Owner, Account manager, Content Manager, Billing | Engineer ramps rollouts watching error rates, trips kill-switches, sets maintenance; Owner changes security settings | Conductors named as in-flight work paused on switch-off ("active Conductors pause") | `FlagService`, `PlatformSettingService` | Reasons mandatory for high-impact changes (BR-8); two-person on kill-switch is open (Q3) | **Unclear**: status "baseline"; no §0.3; §13 Q1 Phase-1 vs Phase-2 catalog; Q2 user scope maybe "Phase-3" | SA-12 v2.7 header, §1, §13 |
| SA-12 §3.0 | Flag vs entitlement model | Cross-cutting | Feature runs only if SA-3 plan allows it (commercial) AND SA-12 flag is on (operational); distinct deny codes. | System | — | — | Composition guard | — | Unclear | SA-12 v2.7 §3.0, BR-1 |
| SA-12 §3.1–3.3 | Flag catalog, scopes and precedence, `FlagService` | Admin (SA) | Typed catalog (e.g. `feature.automation.conductors`, `feature.eSign`, `feature.corporate`); precedence kill-switch → user → firm → rollout → country → plan → default; explainable `{value, reason}`; cached, server-authoritative. | Platform Engineer | Sets values per scope; uses "Explain this flag for this firm" | — | Precedence code-fixed | — | Unclear | SA-12 v2.7 §3.1–3.3 |
| SA-12 §3.4–3.5 | Kill-switches, %-rollout, safe-change tooling | Admin (SA) | Emergency OFF for everyone; sticky percentage ramp; preview affected firms, diff, versioned revert. | Platform Engineer, Platform Owner | Ramps 5% → 25% → 50% → 100% "watching SA-9 error/usage metrics between steps" | Pauses in-flight feature work e.g. Conductors | `RolloutConfig`, `KillSwitch` | Kill needs `system/flag:kill`, reason; "*may* require Platform-Owner confirmation" | Unclear | SA-12 v2.7 §3.4, §3.5 |
| SA-12 §3.6, §3.9 | Platform configuration registry and rate limits | Admin (SA) | Typed, validated, versioned, environment-aware settings with per-plan/per-firm overrides; rate limit and upload limits configurable; security settings Owner-only. | Platform Engineer; Owner for security settings | Edits settings with reasons | — | Schema validation | Security settings: "Only an Owner may change them" (SA-12-27) | Unclear | SA-12 v2.7 §3.6, §3.9, SA-12-27 |
| SA-12 §3.7–3.8 | Maintenance mode and announcement banners | Cross-cutting | Platform-wide or per-firm 503 with message and ETA, bypass token; scheduled, bilingual, self-expiring banners. | Platform Engineer, Platform Owner | Writes messages, sets windows | — | — | — | Unclear | SA-12 v2.7 §3.7, §3.8 |
| SA-12-30 | Flags that cover client records | Cross-cutting | When such a flag is off by any means, existing client records stay read-only, a banner explains, deadline and expiry reminders never pause. | All | — | Reminders (Minder per SA-03) keep running | `coversClientRecords` | — | Unclear (decided 2 Oct, AG17-D69) | SA-12 v2.7 SA-12-30 |

## Part 2: Doers and engines seen in this slice

### SA-01 Country and immigration pack management (v2.2)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Pack validation | Checks a draft against required areas, references, scoring consistency, form-map/PDF match, licence patterns, languages, completeness profile | Draft → pass / warning / error report; errors block | Deterministic | SA-01 v2.2 SA-1-51 |
| Dry-run (test run) | "a test run of rules and scoring on a sample client, for a draft or a published version" | Sample client + pack version → rule and score results | Deterministic | SA-01 v2.2 SA-1-52 |
| Scoring engine | §0.3 SA-01.05 Scoring "Built (generic engine)" | Detail in SA-1B | Deterministic | SA-01 v2.2 §0.3 |
| Pack date selection (BR-3) | "the version with the latest effective date on or before that date applies" | Content area + date → version | Deterministic | SA-01 v2.2 §5 BR-3 |
| PackAssessment record | "pinned version, input and result hashes, engine version, provenance" | Assessment inputs → reproducible result | Deterministic (reproducible) | SA-01 v2.2 §7 |

### SA-01B Content Pack Configurator (v1.2)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Resolver | "the engine that turns it into what a client is asked, what they must upload, and which forms are filed" | Person's filing row + role + answers → questionnaire, checklist, forms, each with a reason | Deterministic | SA-01B v1.2 §1, SA-1B-59 |
| Generic scoring engine | "stored as data and evaluated by one generic engine" | Canonical fields → named scores, stamped with version | Deterministic | SA-01B v1.2 SA-1-21 |
| Eligibility rule set / gates | Hard and advisory rules in the shared condition language | Answers → pass / fail / missing input per rule | Deterministic | SA-01B v1.2 SA-1-16, SA-1-19 |
| Deterministic form filler (built on backend) | "filler.service.ts is a pure, side-effect-free renderer"; fills AcroForm only, refuses XFA | Pinned edition + field map + answer snapshot → PDF with provenance | Deterministic | SA-01B v1.2 §12 |
| Document validity / reminders | "Reminders and notifications derive from SA-1B-21 to SA-1B-23" | Document dates → warnings, blocks | Deterministic | SA-01B v1.2 SA-1B-24 |
| E-sign (Signer implied) | "staff upload and e-sign them" (form list) | — | — | SA-01B v1.2 SA1B-D28 |

### SA-02 Tenant / firm management (v2.19)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Firm creation service | "Both routes use one service; divergent creation paths are a defect." | Form or paid sign-up link → firm, roles, invitation, audit | Deterministic | SA-02 v2.19 BR-2, SA-2-2 |
| Mail worker (invitation email) | "the worker defaults to logging mail only (`MAILER_ADAPTER=log`), so invitation emails reach nobody until it is set to `smtp` or `ses`" | Event → email | Deterministic | SA-02 v2.19 §0.2 SA2-X8 |
| Support-access (impersonation) service | Step-up check, firm state check, short-lived session, auto-end at 60 min | Operator + reason → session READ_ONLY or WITH_CHANGES | Deterministic gate; human operator judgement | SA-02 v2.19 §3.7 diagram C |
| Lifecycle / deletion jobs | Payment hold automatic; deletion after 90 days; "the job re-checks status immediately before deleting" | SA-4 events, timers → status change, deletion record | Deterministic | SA-02 v2.19 §6, §9 |
| Alerts | over-limit, trial ending in 3 days, payment overdue, cancellation → account manager or shared inbox | Counters → alert | Deterministic | SA-02 v2.19 SA-2-14a |

### SA-03 Subscription plans and entitlements (v2.14)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Entitlement service | `resolve(firm) → EffectiveEntitlement`, `isIncluded`, `assertWithinLimit`; "One source of truth for every gate" | Firm, item key, metric → allow / 402 / 403 / 409 | Deterministic | SA-03 v2.14 §3.6 |
| UsageCounterService | "maintains per-(firm, metric) counts ... with a periodic reconciliation job" | Create/delete events → counts | Deterministic | SA-03 v2.14 SA-3-7 |
| Minder | Standard deadline and expiry reminders "registered with the Minder" are always on, every plan | Deadlines → reminders | Deterministic | SA-03 v2.14 SA3-D3a, SA-3-35 |

### SA-04 SaaS billing (v2.14)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Payment processor (Stripe Billing + Stripe Tax) — an SA-8 rail | "holds cards, charges and retries them, calculates tax and produces invoices; Expat Ready is the master of prices, discounts, subscription state and access" | Prices, card → charges, invoices, tax lines, notifications | Deterministic (external service) | SA-04 v2.14 header Plane note, SA4-D20 |
| Notification handler / event ledger | Verify signature, record by event id, process in background, converge regardless of order | Processor event → subscription event, SA-2 status | Deterministic | SA-04 v2.14 §3.10, SA-4-33–36 |
| Billing notices | failure, reminder-7, reminder-12, hold, trial-7, trial-3, card-expiring, price-change, invoice, refund; duplicates prevented | Subscription events → emails | Deterministic | SA-04 v2.14 §7 BillingNotice |
| Invoice archive copy | copies each invoice/credit note PDF to Canadian storage with hash; daily exception report | Processor invoice → stored copy | Deterministic | SA-04 v2.14 SA-4-66 |

### SA-05 Global templates (v2.2)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Mailer | sends an *email template* | Firm template + entity → email | Deterministic render | SA-05 v2.2 §1 |
| Drafter / Signer | "the Drafter/Signer produces a *retainer/agreement template*" | Retainer template → document for signature | Deterministic render | SA-05 v2.2 §1, §3.2 |
| Biller | "renders an *invoice template*" | Invoice template → invoice | Deterministic | SA-05 v2.2 §1 |
| Messenger | Listed among consuming Doers | Message template → message | Deterministic | SA-05 v2.2 Plane note |
| Conductor (Workflow) | "the Conductor's workflow steps fire *message templates* and instantiate *workflow blueprints*" | Workflow step → message / stage pipeline | Deterministic | SA-05 v2.2 §1 |
| Template render engine | "context-aware auto-escaping, logic-less engine"; "never evaluate arbitrary code/expressions" | Template version + entity values → rendered text | Deterministic | SA-05 v2.2 SA-5-18 |

### SA-06 RBAC (v3.1) and SA-06 change note (7 Oct 2026)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Permission guard | "plane → held → every key (AND) → feature entitlement → country filter → own/all record check → allow / deny" | Caller + route keys → allow/403 + audit row | Deterministic | SA-06 v3.1 §6 E, BR-10 |
| Qualifier | `agent/assessment:run` "Run / re-run the Qualifier" | Lead answers → assessment | Deterministic (per SA-1B) | SA-06 v3.1 §10b AG-03 |
| Drafter | `agent/booking-consult:create-proposal` "Launch Drafter from a consult"; `agent/retainer:draft` "(Drafter)"; `agent/document:generate` "Generate-from-template (Drafter)" | Template + data → draft | Not stated | SA-06 v3.1 §10b AG-04, AG-05, AG-09 |
| Signer | `agent/e-sign:*` "(underlying Signer)"; `agent/retainer:send` "(Signer)"; `agent/document:sign` | Document → envelope | Deterministic | SA-06 v3.1 §10b AG-05, AG-09 |
| Filler | `agent/case:form-prepare` "Edit/auto-fill/generate `FormInstance`s (Filler) — prepares drafts; does not approve them" | Answers → form draft | Deterministic (per SA-1B) | SA-06 v3.1 §10b AG-07 |
| Binder | `agent/case:document-manage` "Add/request/approve/reject Binder documents" | Documents → case binder | — | SA-06 v3.1 §10b AG-07 |
| Reader | `agent/sqr:verify` "approve a Reader-proposed value (the approval is the verification, AG-8-44)" | Uploaded document → proposed values → staff approval | Proposes values; human verifies | SA-06 v3.1 §10b AG-08 |
| Sorter | `agent/communication:resolve-unmatched` "including Sorter low-confidence matches" | Incoming messages → matched record or unmatched queue | Confidence-based (judgement) | SA-06 v3.1 §10b AG-10 |
| Messenger | `agent/communication:send-message` "Send SMS / WhatsApp / portal chat (Messenger)" | Message → channel | Deterministic | SA-06 v3.1 §10b AG-10 |
| Dialer | `agent/prospect:log-call` "Log a call / use the Dialer" | — | — | SA-06 v3.1 §10b AG-02 |
| Minder | `agent/automation:manage-minder` "Arm/configure Minder deadline cascades" | Deadlines → reminder cascades | Deterministic | SA-06 v3.1 §10b AG-11 |
| Finder | `agent/search:query` "Run staff-only search queries across the firm (Finder)" | Query → results | — | SA-06 v3.1 §10b code-only keys |
| Conductor | `agent/reminder:create` "Create ad-hoc reminders (today Conductor-only)" | Workflow → reminders | Deterministic | SA-06 v3.1 §10b AG-13 |

### SA-07 Platform users (v2.10)

- No Doers named. Engines: session check, step-up grant (5-minute window), Owner guard (SA-07 v2.10 §7, §12).

### SA-08 Platform integrations and infrastructure rails (v2.2)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Mailer | "composes and sends mail (over the relay rail)" | Template + recipient → email via SES/SMTP | Deterministic | SA-08 v2.2 §3.0 |
| Biller | "invoices (charging over the payment rail)" | Invoice → charge via Stripe | Deterministic | SA-08 v2.2 §3.0 |
| Signer | "runs e-signature in-house (storing artifacts in the storage rail)"; per-country consent and certificate | Document → signed PDF + certificate | Deterministic | SA-08 v2.2 §3.0, §3.7 |
| Messenger / Dialer | "send messages/calls (over the gateway rail)" | Message → SMS/WhatsApp/call | Deterministic | SA-08 v2.2 §3.0, §3.5 |
| Scheduler | "ER's booking tool (no Calendly)"; runs "fully self-contained" without connector | Availability → bookings, meeting links | Deterministic | SA-08 v2.2 §3.8 |
| Drafter, Qualifier, Conductor | Listed among in-house Doers only | — | — | SA-08 v2.2 Plane note |

### SA-09 Platform analytics and observability (v2.2)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Aggregation pipeline | "incremental-on-event read-model updates + a daily scheduled reconcile"; de-identified, FX-normalised | Domain events → `MetricSnapshot`, `FeatureUsageRollup` | Deterministic | SA-09 v2.2 §3.10, SA-9-21 |
| Alert evaluator | Reads read-models and health adapter; fires `AlertEvent` with cool-down | Metrics + rules → alerts | Deterministic thresholds | SA-09 v2.2 §3.8 |
| Conductor | "automations triggered (the Conductor / AG-13)" counted as usage | — | — | SA-09 v2.2 §3.4 |
| Mailer / Messenger | "emails/messages sent (Mailer/Messenger)" counted | — | — | SA-09 v2.2 §3.4 |

### SA-10 Support (v2.5)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Realtime gateway (`SupportTicketGateway`) | Per-ticket rooms, typing presence, `new-message` | Message → live delivery | Deterministic | SA-10 v2.5 §3.5 |
| SLA engine (to build) | Computes elapsed vs targets in firm business hours, pause on waiting states, at-risk/breach | Status events → SLA state | Deterministic | SA-10 v2.5 §3.6 |
| Routing / escalation rules (to build) | category → pool; trigger → action | Ticket → assignee/priority | Deterministic rules | SA-10 v2.5 §3.3, §3.7 |
| Auto-triage hints | "Suggested category/priority from keywords" | Ticket text → suggested category/priority | Keyword rules; human confirms | SA-10 v2.5 §3.3, SA-10-7 |
| In-house mailer | Email fallback and notifications ("in-house mailer") | Event → email | Deterministic | SA-10 v2.5 §3.1, §13 Q7 |

### SA-11 Audit, compliance and data governance (v2.7)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Audit Emitter | normalises, enriches (actor, `actorType`, tenant, IP, UA, `correlationId`), hash-links, INSERTs | Any module event → chained audit entry | Deterministic | SA-11 v2.7 §3.1 |
| Chain-verification job | recomputes hashes vs last anchor; alarm on break | Audit chain → intact / BREAK | Deterministic | SA-11 v2.7 SA-11-6 |
| Retention engine | archive, soft-delete, secure disposal; checks holds at execution time | Records + policy + holds → archived/disposed + `DATA_DISPOSED` | Deterministic | SA-11 v2.7 §3.4, §9 |
| Residency declaration generator | derives per-category region/status from SA-8 | Rail config → declaration + warnings | Deterministic | SA-11 v2.7 §3.6 |
| RROSH assessment | structured "real risk of significant harm" assessment | Breach facts → notify / not | Human judgement (DPO; criteria from counsel) | SA-11 v2.7 §3.7 |

### SA-12 Feature flags and platform configuration (v2.7)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| `FlagService` | `evaluate(flagKey, ctx)` → `{value, reason}`; `bulkEvaluate`; guard paired with SA-3 entitlement | Flag + context → ON/OFF + reason | Deterministic | SA-12 v2.7 §3.3 |
| `PlatformSettingService` | `get(key, firmId?)` typed, cached, environment-pinned | Key → value | Deterministic | SA-12 v2.7 §3.6 |
| Maintenance middleware | early cached check → 503 or continue | Request → 503 / pass | Deterministic | SA-12 v2.7 §3.7 |
| Conductor | "active Conductors pause" when feature switched off; `feature.automation.conductors` example key | — | — | SA-12 v2.7 §3.4, SA-12-11, AC-3a |

## Part 3: AI and automation already written into the requirements

### SA-01 Country and immigration pack management (v2.2)

- No mention of AI, machine learning, OCR or suggestions in SA-01 v2.2 (read in full). Nearest automation: "uploaded PDFs are virus-scanned and their fields parsed on the server" (§11) and validation/dry-run tools (§3.13).
- Outcome statement useful for AI Workers: "**Rule changes without developers.** When IRCC changes the CRS grid or a form, a Content Manager edits the pack, a second person approves" (§1).
- "Content neutrality is enforced in CI: immigration tokens (IRCC, CRS, LMIA, PNP, RCIC, CICC) are banned in code" (§12) — all immigration logic must live in pack data, not code.

### SA-01B Content Pack Configurator (v1.2)

- **SA1B-D16:** "**Form filling is deterministic; AI stays out of the fill path.**" — "AI may draft and diff box maps and extract answers from uploaded documents with a confirmation step" — and "never sets a value at fill time."
- **SA-1B-33:** "AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map" — "a person approves before publishing."
- **SA-1B-34:** "AI may **extract** answers from an uploaded document (passport, educational credential assessment, language test) with a confidence score and a human confirmation step."
- **SA-1B-35:** "AI never sets a value on a form at fill time."
- **SA-1B-28:** "Every value placed on a form is traceable to an answer. Nothing on a form is generated."
- **SA1B-D28 reason:** "an agent does not solve the XFA blocker (a file-format problem)" and "a generated value on a signed form cannot be traced by a reviewer."
- Deferred (§0.1): "AI reading of uploaded documents into answers" — "Needs an extraction service, confidence handling and a review screen; the fill path works without it"; reopen when "The box maps are live and the checklist is in daily use". Also deferred: "AI drafting of box maps (SA-1B-33)" and "Translation tooling — export and import for translators, machine translation, stale-translation detection".
- §0.3: "AI reading of uploaded documents | **Defer**"; "AI drafting of box maps (SA-1B-33) | **Defer**".
- Suggestion: "The pack declares which categories usually follow or support each other, so the platform can suggest a linked case (AG-7)." (SA-1B-54).
- Explanation per item: "Every resolved item carries **the reason it is there**" (SA-1B-59) — useful for explainable AI output.
- Overdue-review work queue (SA-1B-40) "Should now" — a queue an AI Worker could work through.

### SA-02 Tenant / firm management (v2.19)

- No mention of AI, machine learning or automation agents in SA-02 v2.19 (read in full).
- Outcome statement that an AI Worker could serve: "**The team sees a firm's health before the firm complains** — limits, trial end, payment problems, last activity." (§1).
- Support-session model is the only defined pattern for a non-firm actor acting inside a firm: tagged actions, banner, time limit, blocked list (§3.7). **Inferred:** closest existing template for how an Expat Ready-side AI Worker might act inside a firm.

### SA-03 Subscription plans and entitlements (v2.14)

- No mention of AI, machine learning or AI-specific plan items in SA-03 v2.14 (read in full).
- Metering hooks that exist: "Limits as rows: a new metered metric is configuration, not a migration." (§11). Current metrics: "staff users; individual clients; corporate clients; active cases by group" ... "auto-prefilled forms and retainer agreements by group; document storage" ... "tasks; messages; time-and-activity entries" (SA-3-4). **Inferred:** an AI Worker could be a new product-map item and/or a new metered limit row without schema change, per §11; this is not stated for AI.
- Product map gate: "an action runs only if the firm's plan includes it **and** the user's role permits it" (SA-3-32) — any AI Worker action would pass this double check. **Inferred.**
- Seat definition counts "active users, suspended users and pending invitations" (SA-3-41); nothing says whether a non-human actor takes a seat (Unknown).
- New items "start **off on every plan**" (SA3-D3d) — any AI feature would launch off until decided per plan.
- Deferred: "Per-firm exceptions (extra features or higher limits for one firm)"; "Full usage dashboard (trends, charts)" (§0.1).

### SA-04 SaaS billing (v2.14)

- No mention of AI, machine learning or automated agents in SA-04 v2.14 (read in full).
- Pricing facts relevant to pricing AI Workers: example price "**$199 CAD + applicable taxes**" (SA4-D7); Solo "$99" monthly and Growth $199, yearly "$1,990" appear in user stories (US-4, US-6) — these are examples in acceptance criteria, not a price list.
- "**Add-ons are not sold** in Release 1 (SA3-D6)" (SA4-D1); "Nothing is sold outside a plan: there are no add-on prices in Release 1." (SA-4-44).
- Deferred: "Add-ons (e.g. SMS, WhatsApp sold separately) | SA4-D1, SA3-D6 | A capability needs per-use pricing; review together with SA-3's deferred per-firm exceptions" (§0.1). **Inferred:** per-use pricing of AI Workers would hit this deferral; the documents name the reopen trigger.
- "Prices, discounts and the timeline are data, not code ... A second currency or a second payment method is an extension, not a redesign" (§11).
- Work an AI could do on Expat Ready's side (Inferred, not stated): overdue-list follow-up (Billing "call before payment hold"), daily exception report, written-off report, dispute alerts.

### SA-05 Global templates (v2.2)

- Translation suggestion: "The side-by-side editor may *suggest* a draft translation for convenience, but it is always human-reviewed before publish." (§3.5); "a suggestion helper MAY exist but output SHALL be human-reviewed" (SA-5-15).
- Open founder question: "May the bilingual editor *suggest* a machine translation for non-legal copy (human-reviewed), or is all translation hand-authored?" (§13 Q5).
- "SA-5 never auto-translates a disclaimer." (§3.5).
- No other AI mention. Note the engine "never evaluate arbitrary code/expressions" — relevant to any AI-generated template content (Inferred).

### SA-06 RBAC (v3.1) and SA-06 change note (7 Oct 2026)

- **AI-written client text approval:** "AI-written client text (AG11-D11(a)) is approved by a licensed user by default." — "a **firm setting, on by default, that the firm may switch off**" — "it is not enforced by the permission system." (§3.3; also SA-6-27, BR-20).
- Change note: "the permission system never checks licence; AG-11's "AI-written client text needs a licensed approver" is a firm setting, on by default." (§1 Added after review).
- Approvals queue includes AI items: "an item awaiting approval (form, AI-written or supervised client message, override, sign-off, countersign) is shown to **all** holders of that permission at once" (Change note §1 Closing decisions).
- `agent/automation:configure-ai` — "Switch the firm's AI Doers off (within what SA-03 / SA-12 allow)" — "Switching AI on is the Owner's alone, once the processing…" (§10b AG-11; row text truncated in source).
- `agent/automation:set-autonomy` — "Change an action's autonomy level, e.g. raise a recipe's template messages to `APPROVE` (never below the floor, AG-11-53) — default Owner/Admin" (§10b).
- `agent/automation:simulate` — "Dry-run / simulate" (§10b).
- Owner-only checks with no key: "switching Team safeguards off, switching supervised client messages off, choosing who approves AI-written client text, first AI switch-on." (Appendix C).
- `agent/sqr:verify`: "approve a Reader-proposed value (the approval is the verification, AG-8-44)" — Reader proposes, human verifies.
- `agent/communication:resolve-unmatched`: "Sorter low-confidence matches" — confidence-scored matching exists.
- Non-human actors: "An API key counts as the FIRM plane (`:361-365`)" (§3.7); `agent/developer-api:manage` "Manage the firm's developer API keys and webhooks" (§10b code-only). **No service account, bot or AI-actor role type is defined** in SA-06 (read in full); roles are granted to "a person" (`PlatformUserRole` / `FirmUserRole` keyed by `principalId`). Unknown whether an AI Worker would be a principal holding a role.
- Richer policy deferred: "ABAC/policy-engines ... richer policy is a Phase-3 option, not a Phase-1 need." (§3.0).

### SA-07 Platform users (v2.10)

- No mention of AI, machine learning or automated actors in SA-07 v2.10 (read in full).
- Staff accounts are human-only by design: "Every audit record of a staff action identifies the actor as Expat Ready staff" — "with the person's id and name." (SA-7-3); "**Can you prove who did what?** Every staff action is recorded against a named person." (§1); "No self-signup or access-request form." (SA-7-4); "A one-time go-live setup ... No other route creates staff in production" (SA-7-39). `system/platform-user:create` is "dev-only, off in production" (§10). **Inferred:** there is no defined way to create a non-human (AI) staff account on the Expat Ready side.
- "Three separate sign-in groups" (staff, firm users, clients) — no fourth group for service/AI actors (§3.0).

### SA-08 Platform integrations and infrastructure rails (v2.2)

- No mention of AI, machine learning, LLM providers or model APIs in SA-08 v2.2 (read in full). The rail list is "object storage, an email-delivery relay, a payment processor ..., an SMS/WhatsApp carrier gateway, an identity provider" (§1 framing).
- Governing rule: "**Expat Ready has NO third-party product-tool integrations.** ... a reviewer should reject any future requirement that introduces one — the answer is always "build it as a Doer."" (module framing note, §3.0 and BR-1). **Inferred:** an external AI model service would have to be classed as a "rail" (commodity pipe) with its own credentials, residency row and health monitoring; SA-08 does not list one. Unknown which class it falls in.
- Health telemetry: "every Doer call records success/failure against its rail ... into an `IntegrationHealthLog`" (§3.9) — reusable for AI Worker monitoring (Inferred).

### SA-09 Platform analytics and observability (v2.2)

- No mention of AI, machine learning, forecasting or anomaly detection in SA-09 v2.2 (read in full). Alerting is threshold-based only (§3.8).
- **Inferred** hooks for AI Workers: `FeatureUsageEvent` per plan-gated feature (would measure AI Worker adoption), module-activity counters (would count AI Worker actions), alert rules (would watch AI failure rates). None stated for AI.
- Founder job-to-be-done that an AI Worker could serve on Expat Ready's side (Inferred): "When I start my week, I want MRR, ARR, net-new vs churned firms, and plan mix on one screen" (§2).

### SA-10 Support (v2.5)

- No mention of AI, machine learning or language models in SA-10 v2.5 (read in full). Nearest automation: "**Auto-triage hints.** Suggested category/priority from keywords (e.g., "invoice," "refund" → Billing; "can't log in" → Account/urgent) — a hint the agent confirms, never a silent decision." (§3.3); SA-10-7 "*(NEW, optional)*: Auto-triage suggests category and priority from keywords; the agent confirms — suggestions never silently set values."
- KB "Contextual suggestions" match "category/keywords" (§3.9); firm-side help "suggests articles as the firm types a title — deflecting tickets" (§3.9).
- Canned responses with merge fields; "The agent inserts one into the composer and tweaks it" (§3.9).
- Low CSAT "can auto-flag for a lead's review or offer the firm a one-click reopen" (§3.10).
- Open founder question: "Auto-triage / auto-routing aggressiveness. Suggest-only (agent confirms) vs auto-assign by round-robin from day one?" (§13 Q8).
- **Inferred:** the whole module is a manual human-agent help desk; triage, first reply drafting, KB article drafting and "Immigration Content" answers are the support tasks most open to an Expat Ready-side AI Worker; the spec's own rule is suggest-only with human confirmation.

### SA-11 Audit, compliance and data governance (v2.7)

- No mention of AI, machine learning, AI decision logging or model provenance in SA-11 v2.7 (read in full).
- **Actor model has no non-human actor other than `system`:** "an explicit **`actorType` ∈ {super_admin, firm_staff, client, system}**" (§3.0, SA-11-2); "System actions are `system`; impersonated actions are `super_admin` with impersonated context; never inferred from a null `userId`." (BR-3). **Inferred:** an AI Worker's actions would today be logged as `system` (losing which AI, on whose behalf, with which model/version) unless a new actor type or field is added. Unknown/gap.
- `correlationId` "so all entries from one operation are linkable" (§3.1) and before/after snapshots — usable to trace an AI Worker's multi-step run (Inferred).
- Provenance doctrine: SA-1 stamps each output with the pack version used and SA-11 holds the version history, so "a disputed assessment can be re-run exactly as it was" (§3.9) — the reproducibility base that any AI-assisted output would need to match (Inferred).
- Impersonation stamping: actions in a session carry "both the impersonator's identity and `actorType = super_admin` *plus* the impersonated context" (§3.2) — closest existing pattern for an action taken on behalf of someone else (Inferred).

### SA-12 Feature flags and platform configuration (v2.7)

- No mention of AI, machine learning or AI-specific flags in SA-12 v2.7 (read in full). Example flags include `feature.automation.conductors` and `feature.automation.v2` ("the new automation engine") (§3.1, US-1).
- **Inferred** (not stated for AI): the catalog, kill-switch, %-rollout and per-firm emergency off-switch are the existing machinery an AI Worker launch would ride: dark launch → internal firms → 5% → ramp, with an instant kill. SA-06 separately lists `agent/automation:configure-ai` "within what SA-03 / SA-12 allow".
- `FeatureUsageEvent` emitted on gated feature use feeds SA-9 adoption (Visual Overview B).
- Safe default on outage: "a security-relevant flag's safe default is OFF (deny), so an outage never *opens* a gated capability." (§11).

## Part 4: Guardrails already in the requirements

### SA-01 Country and immigration pack management (v2.2)

- Two-person rule: "A production draft can be approved and published only by someone who is neither its author nor its submitter" (SA-1-61); "refusals are audited" (§3.12).
- Audit: "Every draft change, submission, approval, rejection, publish, rollback and refusal is audited." (SA-1-50); "Every country change is audited (actor, time, before/after)." (SA-1-7).
- Reproducibility: "Every assessment, score and generated form records the versions used and can be reproduced." (BR-4).
- Adoption audited with reason (SA-1-58); firms cannot change rules: "Firms never change eligibility rules, scoring, forms, reference data, questionnaire content or regulator text." (SA1-D9).
- Content ownership: "content values are authored and signed off by the Immigration SME and product owners" (BR-15).
- "Approval, country scope and read-only access are enforced on the server; screens only reflect them." (BR-17).
- Import: "Import previews first and commits all or nothing; it creates draft content only." (SA-1-56).

### SA-01B Content Pack Configurator (v1.2)

- "Nothing is signed without a person approving it." (SA-1B-30)
- "The platform produces values, never a submission-ready 2D barcode" (SA-1B-31); the barcode is created "only when a person clicks Validate".
- Second-person approval of rules, scoring and table definitions (SA-1B-38, SA-1B-42); exposure stated: "a wrong gate or points row reaches clients in writing if the reviewer misses it" (SA1B-D18).
- Assessment carries non-removable required wording (SA-1B-48) and a "rules as at" date, stored for reproduction (SA-1B-88).
- "Nothing is sent to a person under 18; a parent answers for them." (SA-1B-76)
- Firm-owned fields "never feed conditions, scoring or government forms" (SA-1B-94).
- Licence: "the platform does not track expiry, warn or block" (SA1B-X8, AG1-D19).
- Master document "handling class (standard, restricted, restricted-health)" and canonical field "sensitivity and retention class" (SA-1B-18, SA-1B-1).

### SA-02 Tenant / firm management (v2.19)

- "Every action is tagged with the support person and session in the firm's audit trail." (§3.7)
- Always blocked in a support session: "deleting clients, cases or documents; billing and payment; bulk export; users, roles and security settings; signing; sending messages to clients; starting another support session" plus `agent/case:waive-deficiency`, `agent/case:review-approve`, `agent/case:record-decision`, `agent/case:export` (SA-2-17).
- SA2-D14: "**Professional judgements are never made in a support session.**"
- Firm consent: "the firm owner allows Expat Ready support for **1, 7 or 30 days** (revocable anytime)" (SA2-D7); owner is emailed after changes (SA-2-29).
- Data-processing clause: "Expat Ready uses firm data only to run the service and support it, keeps it confidential, logs every support session" (SA2-D10).
- "BR-16 (Audit everything stateful)."; "BR-13 (No direct hard delete)."
- Retention notice: "RCICs must keep client files at least 6 years after closing them (CICC Client File Management Regulation s. 7.2)" (SA-2-38). Action: "the Immigration SME confirms that CICC Client File Management Regulation v2021-001 s. 7.2 is still the current rule" (§13) — confirm with counsel / RCIC.
- Client portal during hold/lock: "uploads, signing, messaging and payments are refused with a neutral, firm-branded message" (SA-2-35).

### SA-03 Subscription plans and entitlements (v2.14)

- "Every change to a live plan needs approval by an Owner (Platform Owner role)" and "nobody approves their own request." (SA3-D8b); "At least two people must hold the Owner role."
- "No per-firm exceptions and no custom plans per deal." (SA3-D6).
- Server authority: "an excluded item returns **`403 FEATURE_NOT_ENTITLED`** however the UI was bypassed" (§3.3).
- "BR-14 (everything is audited)."
- Removals keep data: "the firm's existing data from them is **retained, read-only**, never deleted" (SA-3-11).
- Always-on security floor cannot be switched off by "any plan or flag" (SA-3-35).

### SA-04 SaaS billing (v2.14)

- "BR-10 (Money actions audited)."; SA-4-39 lists every money action audited "with actor, target, before and after, and reason where required".
- "BR-9 (No card data, ever)."; "Super Admin can send ... but can never see or enter card details" (SA-4-19).
- Separation of duties: Owner approves price changes, "never the requester, and never Billing" (SA-4-48).
- "BR-14 (Payment restores access)." — "nothing else lifts a payment hold".
- Billing records retention 6 years after fiscal year-end, Canadian region (SA-4-64).
- "no card data or personal data in logs." (§11 Security).
- Billing emails are transactional, "sent regardless of marketing consent" (BR-17).
- Counsel and accountant actions before go-live (§13): counsel drafts terms; accountant approves no-tax sentence — confirm with counsel.

### SA-05 Global templates (v2.2)

- "BR-7 (No silent clobber on propagation — cardinal rule). A central republish **never writes into any firm's CLIENT template.**"
- "BR-11 (Mandated wording → SME/founder)." Publish gate "blocks legal types until `smeConfirmedBy` is recorded" (§9).
- Provenance: "who authored, who (SME) confirmed, who (Platform Owner) approved, and when" (§3.11).
- "BR-9 (Render treats values as data)." — merge values are "always untrusted data".
- SA-5-35: create, edit, submit, publish, rollback, archive, set-default, clone, bulk-clone, mandated-clause change "SHALL be **audited**".

### SA-06 RBAC (v3.1) and SA-06 change note (7 Oct 2026)

- Four professional approvals (`agent/case:waive-deficiency`, `:form-approve`, `:review-approve`, `agent/retainer:countersign`) default to Owner and Case Manager; "Every use is audited" (SA-6-26).
- "There is **no licensed-representative (RCIC) role**" (§3.3) — confirm with counsel / RCIC whether this is sufficient for regulated sign-off.
- If nobody holds an approval: "the Owner approves it, recorded as "approved by Owner — no active holder of the permission"" (§3.3).
- Five never-delegable Owner-only actions: support access, cancel subscription, legal firm profile, export all firm data, connect payment account (SA6-D5).
- Support sessions: "permitted keys are derived from the firm templates, excluding destructive verbs (`assign`, `manage`, `import`, …) and financial resources" (§3.7).
- Reasons required: waive-deficiency, `agent/case:reopen`, `agent/assessment:override`, `agent/retainer:void`, `agent/retainer:offline-sign`, `agent/document:waive`, closing a case, and every firm role change (SA-6-18).
- "Every denial writes one scope-violation audit row" (§3.7); grants "fail-closed" on audit (§3.10).
- "the plan decides what works, the role decides who" (§3.8, BR-22).

### SA-07 Platform users (v2.10)

- "**Staff help firms only through support sessions.**" (BR-17); "A support session never outlives the staff session that opened it." (BR-19).
- Mandatory second step at every sign-in, "No SMS" (SA-7-8).
- Step-up before support session start, staff access changes, refunds, platform settings (SA-7-10).
- "Security settings are Owner-only" (SA7-D54); Platform engineer changes "integration credentials, feature flags and operational settings" (Appendix A).
- Staff audit retention: "every audit entry of a staff action is kept at least 7 years — one rule" (§0.2 SA7-X5).
- "Developers never restore access by editing the database." (SA7-D43).

### SA-08 Platform integrations and infrastructure rails (v2.2)

- "BR-2 (Encrypt-all, write-only)"; "BR-3 (Secrets never in logs/audit)".
- "BR-7 (Residency from facts)" — declaration "generated from the actually-configured regions, never hand-asserted; Non-Canadian-without-safeguard is flagged".
- "BR-5 (Test before live)"; "BR-6 (Payment LIVE gate)".
- "BR-13 (Plan-gated rails)" — "SA-8 supplies capability, not entitlement."
- Signer settings forward-only; signed artifacts immutable (BR-14).

### SA-09 Platform analytics and observability (v2.2)

- "**BR-9 (Aggregate-and-de-identified only — the cardinal safety rule).** ... No read-model table has a PII column."
- "There is no path from a chart to a firm's confidential records that is not an explicit impersonation." (§3.0).
- "BR-10 (No live cross-tenant scans)."; "BR-11 (Honest health states)" — "never a fabricated value".
- Exports audited: "actor, filter, row-count, and timestamp" (§3.9).
- Small-cohort anonymity floor recommended (§13 Q6) — confirm.

### SA-10 Support (v2.5)

- "**BR-4 (internal notes never reach the firm).**"; "BR-3 (scoped support access, GLOBAL)" — support reads the ticket only; firm data needs SA-2 session.
- "BR-7 (impersonation is double-gated and audited)."; "BR-12 (audit everything significant)."
- "**BR-13 (attachments are PII).**" — "Passports/refusal letters/CRS breakdowns can ride a ticket." (§11).
- Immigration content questions routed to Content Manager because "a generic agent cannot answer it" (§2).
- "PII minimisation in metrics" (§11).

### SA-11 Audit, compliance and data governance (v2.7)

- "**BR-1 (Append-only, no exceptions).**"; "**BR-2 (Chain integrity is mandatory).**"; "**BR-3 (Actor type is always explicit).**"
- "**BR-5** ... The user's action commits; the audit write retries durably and alarms if it ultimately fails."
- "**BR-7 (Hold beats schedule beats deletion).**"; "**BR-9 (Two-person rule for audit deletion).**"
- "**BR-14 (Cross-tenant access is self-logging).**" — any GLOBAL operation spanning tenants emits `CROSS_TENANT_ACCESS` (SA-11-12). **Inferred:** an Expat Ready-side AI Worker reading across firms would trigger this.
- "**BR-16 (Personal data never in system logs or traces).**" — **Inferred:** applies to any AI prompt/trace logging.
- "**BR-17 (No passport or financial numbers in message content).**" — applies to any AI-drafted email/WhatsApp.
- "**BR-15 (Legal/retention numbers come from counsel).**"; staff action audit kept "at least 7 years" (SA-11-14).
- Residency: "If any rail/sub-processor for a category is **Non-Canadian without a confirmed safeguard**, SA-11 raises a **compliance warning**" (§3.6) — would cover an AI model provider as a sub-processor (Inferred).

### SA-12 Feature flags and platform configuration (v2.7)

- "**SA-12-26:** **No flag or setting may disable a tenant-isolation, authentication, authorization, or audit control.**" (BR-14).
- "**BR-8 (reason mandatory for high-impact)**"; every mutation audited in the same transaction (SA-12-25).
- "BR-4 (server-authoritative)"; "BR-9 (paused, not deleted)".
- "**BR-18 (client records are never hidden or silenced)**" — reminders never pause.
- Firm override "never used to grant a paid feature or to close a deal" (SA-12-10, changed v2.6).
- "Secrets never live here" (SA-12-18, BR-12).

## Part 5: Conflicts, gaps and surprises

Cross-slice findings are in the section "Slice summary and cross-file findings" at the top of this file; the per-module items follow.

### SA-01 Country and immigration pack management (v2.2)

- Canada R1 pack content is not decided: "the content of the Canada Release 1 pack" ... "is to be planned in a **separate working session**" (§0 Parked). **Inferred:** any AI Worker relying on pack rules has no Canada content to run on until slice SA-01.15 is done.
- Code state: "No Canada content (by design)." and the listing of who is on which version "(SA-1-62) — not built." (§12).
- "Restricted-field encryption is still inert for answers" (§12 Gaps).
- Hierarchy wording differs inside the file: §3.2 table says "Pathway → Program → Stream → Category" but SA1B-D2 says "Pathway (Individual / Corporate) › Program › Category › Sub-category" (§0). The file states SA1B-D2 supersedes.
- Content values routed to the Immigration SME [name withheld] (§13).

### SA-01B Content Pack Configurator (v1.2)

- Code state: "What does not exist is the part this module is mostly about" — including "any resolver a client's questionnaire, checklist or forms could come out of" (§12 Summary). No assessment output, no checklist resolver, no prospect tiers, no startable check built.
- Built filler cannot open IRCC forms: "IRCC's 2D-barcode forms are XFA" and the engine maps them to "UNSUPPORTED_TEMPLATE" (§12); placeholder P1 open.
- SA1B-X10: the "auto-prefilled forms" plan limit "has nothing to meter in Release 1" — affects SA-3 pricing metrics.
- P3 open: family case with several filings vs plan limits (pricing question).
- "No source, date-checked or next-review fields on content, and no overdue queue" built (§12).
- Two decisions against recommendation: no rule tests (SA1B-D18), no deficiency library (SA1B-D23).
- **Inferred:** SA-01B is the only SA file read so far that already allows specific AI tasks (box-map drafting, document extraction), both deferred beyond R1 and both bounded by human confirmation.

### SA-02 Tenant / firm management (v2.19)

- Code follows an older source: "**The SA-2 build on `dev` follows an older requirements source, not this document.**" (§12).
- Built code lets operator choose `LIMITED_WRITE` with no firm permission (§12 Gaps) — conflicts with SA2-D7.
- Real email sending is off by default (SA2-X8 pending).
- Health and usage, sign-up links, trials, data download, deletion: not built (§12 Gaps).
- **Inferred:** no service account or non-human operator is described; any AI Worker acting for Expat Ready inside a firm would need a rule set like the support-session rules.

### SA-03 Subscription plans and entitlements (v2.14)

- Code: "cap ENFORCEMENT is absent in this slice" — limits stored but not enforced; product map is only a flat catalogue; guard "applied to zero production routes"; subscription state "a stub that always returns `ACTIVE`"; per-firm overrides built and must be removed (§12).
- SA1B-X10 (from SA-01B): the "auto-prefilled forms" metric has nothing to meter in R1 because autofill is parked; SA-03 v2.14 still lists the metric (SA-3-4). Pending in SA-01B.
- Launch plan differentiation (solo vs multi-person) is "launch plan configuration", decided later with the Immigration SME (§13 note).
- Pricing per seat: SA-03 defines seats as a hard limit by default; no price figures in this file (prices in SA-4).

### SA-04 SaaS billing (v2.14)

- "**Summary: no part of SA-4 works on `dev`.**" (§12).
- Frontend has add-on price screens and "FOREVER" coupons that conflict (§12).
- Prices in the requirements are examples only; the commercial plan's CAD 199/seat is not stated as per-seat here — SA-04 speaks of a price per plan, not per seat. **Inferred:** per-firm vs per-seat is not decided in SA-04; seats are a plan limit (SA-3).

### SA-05 Global templates (v2.2)

- File status: "**Baseline — not yet reviewed**" — not aligned with later decisions:
  - Says "for Canada, French is a *required* language (SA-1), so a Canada retainer cannot publish without an FR body" (§3.5, SA-5-16) — conflicts with SA-01 v2.2 SA1-D2 "English is the required language for Canada in Release 1; French is optional."
  - Assumes multi-country firms ("grants an existing firm the Australia entitlement", "country-entitlement grant", §1, §3.9) — conflicts with SA-03 v2.14 SA3-D1 "A firm has **exactly one country**".
  - Uses `global/template:*` permissions — SA-01 v2.2 SA1-D8 says "permission keys `system/*` (no `global/*` namespace)" for SA-1; SA-06 is the owner (check there).
  - Code references are to `DevAPI-main` (Mongo), an older codebase than SA-1–SA-4's `ERv2-sanitized` (§12). **Inferred:** the SA-5 code note may describe a superseded codebase.
- 10 open questions incl. named SME sign-off per country (§13 Q1).

### SA-06 RBAC (v3.1) and SA-06 change note (7 Oct 2026)

- **Security bug in code:** "an Admin can give the Owner role, even to themselves" (§12; Change note §3 item 1).
- Code holds 38 `agent/*` keys vs 259 canonical; "no exact matches" (§3.1, §12).
- Approval routing, firm custom roles, reason capture: "TO BUILD" (§12).
- SA-05 still uses `global/template:*`; SA-06 says the catalogue refuses "a legacy `global/` prefix (named as **purged**" (§3.1) — conflicts with SA-05 v2.2 §10.
- The `agent/automation:configure-ai` row is truncated in the source ("once the processing…"); full rule is in AG-11 (other reader).
- **Inferred:** an AI Worker acting in a firm would need either a principal type not yet defined, or would act under a human's permissions; SA-06 has no rule for this.

### SA-07 Platform users (v2.10)

- Code: "Roles hard-coded" vs "roles as data with an editor" (§12); code has six platform templates vs nine (§12; also SA-06 §12).
- §12 not re-fetched after 30 Sep ("Not re-fetched for v2.4").
- Session timeout code (commit ab5e8f9a) still covers all three groups; SA7-X8 pending.

### SA-08 Platform integrations and infrastructure rails (v2.2)

- Status "Baseline"; code reference is to "current codebase — `src/integration`, `src/storage`" with models `Bucket`, `SmtpSettings`, `PaymentSettings` (§12) — differs from ERv2 paths used in SA-1–SA-4 and SA-6. **Inferred:** SA-08 §12 may describe the older `DevAPI-main` codebase; SA-06 v3.1 §12 says "`DevAPI-main` code ... retired".
- Security defects recorded: "Stripe `secretKey` and `webhookSecret` are stored in PLAINTEXT" and S3 keys plaintext (§12).
- SA-08 assumes "Canada-entitled firm" and multi-country entitlement wording (§3.11) — SA-03 SA3-D1 says one country per firm.
- Data-residency commitment for any third-party processing (including any AI service) is open: §13 Q1 "Cross-region data residency — Day-1 or roadmap?".

### SA-09 Platform analytics and observability (v2.2)

- Status "Baseline"; still uses statuses "TRIAL / ACTIVE / SUSPENDED / OFFBOARDED" (SA-9-1) — conflicts with SA-02 v2.19 statuses `PROVISIONING`, `TRIAL`, `ACTIVE`, `PAYMENT_HOLD`, `SECURITY_LOCK`, `ABANDONED`, `DELETED` and "no separate offboarding stages".
- Multi-currency and multi-country-firm revenue (BR-2, BR-6) — conflicts with SA-03 "CAD only" (SA3-D2b) and one country per firm (SA3-D1).
- §12 describes `DevAPI-main` (`clientId`, no RLS) — older codebase than SA-1–SA-4.
- "No OTel / Prometheus / CloudWatch instrumentation is wired in the codebase today." (§12).

### SA-10 Support (v2.5)

- Uses `global/support:*` and `global/firm:impersonate` permission names (§10) — SA-06 v3.1 says the `global/` prefix is "purged"; SA-02 uses `system/firm:impersonate`.
- "request supervisor approval" when impersonation is denied (SA-10-19, US-4) — SA-02 v2.19 SA2-R2 replaced the policy that had "supervisor approval for Support"; SA-07 says "No supervisor approval step." Conflict.
- Describes impersonation as "read-mostly (no destructive/financial actions)" (§3.8) — SA-02 defines read-only unless firm allows changes.
- "multi-country firm running Canada + Australia desks" and "country entitlements" (§1, §3.1) — conflicts with one country per firm (SA-03 SA3-D1).
- §12 describes `src/support-ticket` with `clientId` (older codebase). Demo-era framing ("one-week demo", §13 Q6).

### SA-11 Audit, compliance and data governance (v2.7)

- Code (per §12, `DevAPI-main`): "**No tamper-evidence whatsoever.** ... the log is **append-only by *convention* only**"; no `actorType`, no `tenantId`, no `correlationId`; no governance registers built. SA-11 §12 cites `DevAPI-main` while SA-06 says that code is retired — status of ERv2 audit code not stated in this file.
- Multi-country wording ("Canada + Australia + UK", "firm's country entitlement") vs one-country-per-firm (SA-03).
- All retention values, breach criteria, DSR deadlines open for counsel (§13 Q1–Q3).
- Demo-era scope note in §12 (localhost demo).

### SA-12 Feature flags and platform configuration (v2.7)

- Internal inconsistency kept in the file: §1 says "A sales rep can close a deal that needs `feature.eSign` "just for this firm, as a trial" via a **firm-level override**" and §2/US-3 "Close a deal with a firm override ... "paid trial — deal #123"", while SA-12-10 (changed v2.6) says the override "is never used to grant a paid feature or to close a deal" (SA3-D6). The file's change log says §3/SA-12-10 were updated; §1, §2 and US-3 still carry the older wording.
- Country scope wording assumes multiple country entitlements per firm (e.g. "France-entitled firms", BR-15) — vs one country per firm (SA-03).
- §12: "**There is no real feature-flag system in the codebase today.**" (refers to `src/settings/...`, older codebase naming).
- Rate-limit default disagreement: code `100 / 60s` vs v1.0 `200 / 15s` (SA-12-24, Q4).
