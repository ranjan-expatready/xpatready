# Expat Ready — Request for Proposal (RFP): Full Platform Build

> **Document version 2.0** · Last updated 2026-06-22 · All changes are logged in [CHANGELOG.md](CHANGELOG.md) (no duplicate version files).


---

## Document Control

| Field | Value |
|---|---|
| **Document title** | Expat Ready — Request for Proposal: Full Platform Build |
| **Version** | 2.0 (reconciled to locked Architecture Decision Record FINAL) |
| **Date issued** | 2026-06-19 |
| **Status** | Issued for Quotation |
| **Budget range** | Open — vendors are invited to provide their own estimate per delivery wave (engine) and per content-pack unit (immigration content) |

---

## Companion Documents — the binding Scope Document set

This RFP is the **procurement wrapper**. It summarizes scope, requirements, and evaluation criteria, and carries the commercial and submission terms. It is **not** the binding build source.

The authoritative functional and technical requirements are contained in a **sequenced System Scope Document set**, provided to shortlisted vendors under a Non-Disclosure Agreement:

- **Doc 1 — Platform Foundation** (multi-tenancy, identity, RLS isolation substrate, canonical data spine, cross-cutting modules, NFRs/compliance).
- **Doc 2 — Super-Admin Console** (tenant/plan/entitlement management, global versioned reference data, form/document masters, compliance governance plane).
- **Doc 3 — Agent Console** (the firm staff operating environment: CRM, eligibility, booking, agreements, billing, case delivery, automation, communications, reporting, firm administration).
- **Doc 4 — Client Portal** (the immigrant applicant self-service surface).
- **The Architecture Decision Record (ADR)** and its folded **Procurement & Engagement Shell**, which together set the locked architecture and the binding acceptance gates.

These documents — the four Scope FINALs plus the ADR and its Procurement & Engagement Shell — are the **binding source**. Where this RFP and the Scope Document set differ, **the Scope Document set governs.** This RFP is retained as procurement lineage and to carry the commercial terms. Throughout this document, references to "the Scope Document" point to that sequenced set.

---

## Table of Contents

1. Executive Summary
2. About Expat Ready / Company Background
3. Business Context & Objectives
4. Scope of Work (Summary)
5. Out of Scope / Exclusions
6. Technology — Locked Stack & Hard Constraints
7. Non-Functional & Compliance Requirements (Summary)
8. Delivery Approach — One Frozen Scope, Build-Sequencing Waves
9. Team Composition Expected
10. Deliverables
11. Commercial & Engagement Model
12. What to Include in Your Proposal
13. Vendor Evaluation Criteria
14. Assumptions & Dependencies

---

## 1. Executive Summary

Expat Ready is a purpose-built SaaS operating system for the Canadian immigration industry. The platform serves Regulated Canadian Immigration Consultants (RCICs) and immigration law firms as paying tenants, giving their teams a single, end-to-end operational environment — from the first contact with a prospective immigrant through eligibility assessment, client engagement, case preparation, government form submission, and ongoing case tracking.

The founder is soliciting proposals from qualified software development companies to **build the Expat Ready platform from the ground up**. This is a greenfield, work-for-hire build with no production data to migrate. The scope covers full-stack product development: backend API, three web surfaces (super-admin console, staff/agent console, client portal), infrastructure, integrations, automated tests, documentation, and delivery against a **single, frozen full scope** — culminating in a production-ready, commercially launchable multi-tenant SaaS product.

The architecture is **locked** (see Section 6 and the ADR): a PostgreSQL 16 system of record with forced Row-Level Security, a NestJS modular monolith, React/Refine front ends, Redis/BullMQ workers, S3 object storage, in-house identity, all pinned to AWS ca-central-1. Vendors quote against this fixed architecture and frozen scope; the build is staged into **Build-Sequencing Delivery Waves** that phase milestones and payments **within** that one scope — not into scope tiers.

Vendors are invited to review this document, request the Scope Document set under NDA, and submit a structured proposal covering their methodology, proposed team, technical approach, wave-based timeline, and cost breakdown.

---

## 2. About Expat Ready / Company Background

**Product vision.** Expat Ready is designed to be the definitive operating system for Canadian immigration practices — a platform comparable in ambition and usability to leading vertical CRMs (e.g. GoHighLevel for marketing agencies, Clio for law firms), but purpose-built for the immigration domain. It combines a sales and prospect pipeline, regulatory-grade eligibility calculators, client management, case delivery tools, e-signature workflows, billing, an automation engine, and a self-service client portal in a single cohesive product. The platform is architected to be globally extensible (multi-country) from the data model up, with Canada as the launch market.

**Market.** Canada's immigration industry is served by thousands of RCIC practices and law firms, ranging from sole practitioners to multi-office firms processing hundreds of applications per year. These firms currently rely on a patchwork of general-purpose CRM, email, spreadsheet, and standalone case-management tools. Expat Ready targets this fragmented market with a unified, immigration-aware platform built from the ground up to fit how immigration professionals actually work.

**The founder** is a practising, licensed Canadian immigration professional and serves as the product owner and final domain authority throughout the build. Domain expertise for all immigration-specific requirements — program rules, IRCC forms, RCIC regulatory obligations, CICC compliance standards — is held by the founder and will be provided to the development team in structured form. **The authoritative immigration content (the Canada Country-Pack: versioned program rules, point tables, form editions, field maps, document requirements) is the founder's own deferred deliverable**, supplied as structured reference data for loading into the platform. The vendor builds the machinery that consumes it.

---

## 3. Business Context & Objectives

### The problem

Canadian immigration firms operate under compounding operational pressures: a high volume of leads requiring rapid qualification, strict IRCC filing deadlines, frequent regulatory rule changes (program rules, form editions, proof-of-funds thresholds), and demanding RCIC professional obligations (retainer requirements, client confidentiality, multi-year record-keeping). Existing tools do not reflect these realities. Firms lose leads through slow follow-up, miss eligibility opportunities through manual scoring, and carry compliance risk through fragmented record-keeping.

### What Expat Ready addresses

- **Revenue acceleration.** A structured sales pipeline with built-in eligibility calculators and automated follow-up so firms convert more prospects, faster.
- **Operational efficiency.** End-to-end case delivery in a single platform, eliminating the manual re-keying of applicant data across disjointed tools — captured once against a canonical data spine, reused everywhere (SQR, scoring, forms, documents).
- **Compliance by design.** Retainer management, e-signatures, immutable hash-chained audit logging, and version-controlled immigration rules that let firms demonstrate due diligence to the CICC and IRCC.
- **Client experience.** A self-service client portal where applicants submit questionnaire responses, upload documents, track their case status, and communicate with their consultant — reducing inbound administrative volume for the firm.

### What success looks like

At the end of the full build, Expat Ready is a commercially launchable, multi-tenant SaaS product that:

1. A firm can subscribe to, onboard onto (including bulk-importing its existing book of business), and operate independently without developer involvement.
2. Handles the complete immigrant lifecycle from lead capture to case decision, without data leaving the platform.
3. Meets Canadian data residency and PIPEDA obligations by construction, not by configuration.
4. Scales from a small firm with a handful of staff to a multi-office practice with hundreds of active cases, without architectural change.
5. Accommodates frequent Canadian immigration rule changes (program rules, point tables, form editions) through admin-editable, versioned, effective-dated reference data, without code deployments.

---

## 4. Scope of Work (Summary)

The platform is organized into the following functional modules, delivered as **one frozen full scope**. This section provides a high-level summary of each. Full requirements, data models, and acceptance criteria are in the Scope Document set (Doc 1–4 + ADR).

### 4.1 Platform Foundation — Multi-Tenancy, Identity & Entitlements

The platform is multi-tenant from day one. Every firm is a distinct, isolated tenant. Data isolation is enforced **at the database layer (PostgreSQL Row-Level Security, ENABLED and FORCED on every tenant table)** as the primary control, wrapped in four defense-in-depth layers (a non-BYPASSRLS application role, a per-request `SET LOCAL` tenant GUC, a mandatory tenant-scoped repository that never accepts a caller-supplied tenant id, and object-level IDOR checks). The tenant key is `firm_id`; the end-client key is a separate `client_id`; RLS scopes on `firm_id`.

The platform supports three personas operating under **separately walled authentication contexts** with distinct signing keys and mandatory audience-claim verification: **Super Admin** (the Expat Ready team), **Firm/Agent Staff** (RCICs and their employees), and **Clients** (immigrant applicants accessing their own data via the portal). A token issued for one context is structurally invalid on another.

Subscription plans and feature entitlements govern which capabilities a firm can access. Scope-aware role-based access control with a complete, CI-validated permission catalog (`system/*` global, `agent/*` and `portal/*` local) and a default role matrix governs what each staff member and client can do.

### 4.2 CRM / Prospect Pipeline

A full sales pipeline for immigrant prospects: lead capture (manual and via intake form), pipeline stages (Kanban board and list view), prospect qualification questionnaire (pre-assessment intake), activity tracking (notes, calls, emails), reminders, and performance reporting. Prospects convert to clients upon engagement. Contacts, prospects, and clients are role-lenses over a single **Party** identity spine, so a person inquiring twice is one Party with the correct history — not duplicate records. The pipeline is designed to the standard of a specialized immigration CRM — not a generic contact manager.

### 4.3 Eligibility Calculators & Assessment Engine

The calculators are a core differentiator. They take a structured applicant profile (bound to the canonical field catalogue) and produce:

- **CRS score** (Comprehensive Ranking System) with per-factor breakdown, comparison against recent draw cut-offs, and actionable improvement recommendations.
- **FSW 67-point eligibility gate** (pass/fail with factor breakdown).
- **Multi-program eligibility sweep** — a single profile evaluated against all configured programs and streams (Express Entry FSW/CEC/FST, Express Entry category draws, supported PNP streams) to produce a ranked list of likely-eligible, possibly-eligible, and not-eligible results with reasons.

All calculator logic is driven by versioned, effective-dated reference data so rule changes are data operations, not code deployments. Assessments are stamped with the rule version (resolved `programNodeKey` + `packVersionId`) used, making them reproducible and auditable. The eligibility engine is described fully in the Scope Document (immigration domain section). The scoring **machinery is in scope for all case types**; the **depth of immigration content** (which programs/PNP streams ship FULL versus INFORMATIONAL) is the founder's Country-Pack deliverable (see Section 14).

### 4.4 Scheduling & Booking

A native booking module for consultation scheduling: configurable availability rules, round-robin assignment, buffer times, timezone-aware booking, and client-facing booking links. Two-way calendar sync with Google Calendar and Microsoft Outlook. Automated booking confirmation, reminder, and follow-up communications.

### 4.5 Agreements & E-Signature (Retainer Management)

Retainer and service agreement creation from configurable templates, delivered to the client for e-signature. The e-sign workflow captures a legally defensible audit trail (identity, timestamp, document hash, certificate of completion) and is delivered as an in-house Signer behind an `ObjectStoragePort` (S3, SSE-KMS, presigned), with any third-party e-sign provider integrated as a swappable adapter behind that port should the founder require it. Public-by-link access to a contract uses an **unguessable capability token**, never a sequential or UUID id in the URL, and every presigned URL is bound to an ownership-checked record. Signed agreements are stored against the client/case record and retained for the periods required by RCIC regulatory obligations.

### 4.6 Billing & Payments

Client-facing invoicing, payment recording, and financial reporting — operated by the firm, for their clients. This module is the **single source of truth for all client money**; no other module duplicates monetary balances. Features include: invoice creation (service fees, disbursements, milestone-based retainers), payment recording (manual and via payment gateway), partial payments, overdue tracking, dunning, refunds, and a financial summary per client and firm-wide. The platform's own SaaS subscription billing (firm to Expat Ready) is a separate, plan-based system: **all server-side subscription lifecycle, webhooks, dunning, and MRR are owned by Super-Admin Billing (SA-4)**; the firm-facing self-service billing UI lives in Agent Settings (AG-16) and calls SA-4 (it holds no billing logic). Payment gateway integration uses Stripe (Payment Intents + Connect for client→firm; Stripe Billing for firm→platform) behind a `PaymentRailPort`. Card data is tokenized and never stored (PCI scope SAQ-A).

### 4.7 Case Delivery — Core

The operational heart of the platform. A Case represents a single immigration application for a client. Case delivery covers:

- **Case creation and lifecycle management** — configurable stages per program type; a progress stepper visible to staff and clients.
- **Smart Questionnaire (SQR)** — an adaptive, branching digital intake form that collects the full applicant profile required for a given program pathway, bound to the canonical field catalogue. Data entered once; reused everywhere. The questionnaire definition is template-driven (Postgres JSONB, Zod-validated) and editable by administrators.
- **Document management** — per-program, per-case document checklists derived from the canonical DocumentType master and DocumentRequirement authoring unit; document upload (by staff or client); version control; virus scanning; a single 10-state lifecycle (the checklist is a derived view over the documents).
- **Deficiency tracking** — a continuously computed list of outstanding gaps (missing documents, incomplete form fields, expired credentials, out-of-date form editions) that must be cleared before the case is submission-ready.

### 4.8 IRCC Form Preparation & Auto-Fill

The platform maintains a **versioned library of IRCC forms** (one `GovFormDef` → `FormEdition` → `FormFieldMap` master, identified by IMM number and edition date). Key forms include IMM 0008, IMM 5406, IMM 5476 (Use of a Representative), and program-specific schedules. The system:

- Warns when a stored or in-progress form is not the currently accepted edition.
- Auto-populates form fields from the client's canonical answers (field-level mapping from `canonicalFieldKey` to form fields, defined as editable reference data per form edition).
- Allows the consultant to review and override the auto-fill before generating the final PDF output.
- Retains the generated, finalized form as a tagged/accessible document of record that re-renders byte-identically from its stamped edition and map version.

### 4.9 Workflow Tracking & Case Milestones

Post-submission lifecycle tracking: configurable stages and milestones per program (e.g. AOR, biometrics instruction, medical exam, PPR, COPR for a federal PR application). Automated reminders tied to deadlines. Client-visible status updates through the portal.

### 4.10 Automation Engine — Conductors & Doers

A rule-based automation engine that lets firms build operational automations without developer involvement. The engine has two layers:

- **Conductors** — orchestration rules that define triggers (e.g. prospect stage changed, case milestone reached, booking confirmed, document received), conditions, and action sequences, driven off one canonical domain-event dictionary.
- **Doers** — the executor layer, branded as task-specific in-house workers: **Reminder** (schedules and fires reminders), **Minder** (task creation and assignment), **Tasker** (workflow task automation), and **Messenger** (sends emails, in-app notifications, or SMS through the Communications module). Doers sit on swappable rail ports — no Doer imports a vendor SDK directly.

Automation definitions are stored as configuration data (Postgres JSONB) so they can be managed through a visual builder in the UI, not through code changes. Full specification is in the Scope Document.

### 4.11 Communications

A unified communications hub: outbound email via transactional email provider (AWS SES + SMTP fallback behind an `EmailRelayPort`), inbound email sync (via Gmail API / Microsoft Graph OAuth, with generic IMAP as fallback), in-app notifications, and SMS (AWS SNS + WhatsApp BSP behind an `SmsGatewayPort`). All communications are threaded against the entity they relate to (prospect, case, booking, etc.) and stored in the audit trail. Staff manage all client communications from within the platform.

### 4.12 Template Management

A global template library (managed by Super Admin, overridable per firm) for email templates, document templates, questionnaire definitions, workflow blueprints, and checklist templates. Templates carry English and French versions (firm-authored content is stored bilingually with side-by-side authoring; the firm owns its own translations). Firms can customize templates within their tenant without affecting the global default.

### 4.13 Client Portal

A self-service web application for the immigrant applicant (Scope Doc 4). Features include: secure login under a **separate, cryptographically walled authentication pool**, questionnaire completion, document upload, case status tracking, in-portal e-signature, communication with the firm, and access to signed documents and invoices. Portal access is governed by a fail-closed record-level authorization layer: a client touches only rows whose ownership chain resolves to its own `clientCustomerId` (plus a firm-controlled visibility allow-list, off by default), backed by a **second portal RLS dimension** (a client-subject GUC from the portal token). The portal supports English and French, is mobile-first responsive, and ships as an installable PWA (read-only offline shell). It is a first-class surface, not an afterthought.

### 4.14 Corporate Clients & LMIA

A distinct sub-module for corporate engagements: corporate client entities (employer/sponsor) modelled as ORGANISATION Parties linked to individual applicant records; Labour Market Impact Assessment (LMIA) case type with employer-side workflow (job offer, recruitment evidence, wage data). Corporate clients receive an org-scoped (multi-seat) view in the portal. This is part of the one frozen scope, not a later tier.

### 4.15 Reporting & Analytics

Per-firm operational reporting: pipeline performance (conversion rates, lead sources, deal values), case throughput and stage distribution, revenue (invoiced, collected, outstanding, overdue), staff workload and activity, and eligibility assessment history. Super Admin platform-level reporting: tenant counts, subscription revenue, feature usage, and system health. Drill-through and reports re-apply the record-level ownership check. Reports are exportable. A real-time dashboard gives each persona a view of their key metrics. Universal cross-entity search is owned by a dedicated platform Search module (firm-scoped, permission-filtered, ownership-filtered; the portal gets no universal search).

### 4.16 Settings & Firm Administration

Firm-level configuration: staff management (invite, roles, permissions), office/branch management, branding (logo, colors for client-facing surfaces), notification preferences, integration connections (calendar, email), billing and subscription management (the firm-facing UI that calls SA-4), a self-service developer/API section (firm-scoped read API keys + outbound signed webhooks), bulk import (Contacts/Clients, Cases, Documents, historical financials recorded into Billing), and reference data overrides.

### 4.17 Super Admin Platform

The Expat Ready team's own console (Scope Doc 2): tenant (firm) management, subscription plan creation and entitlement configuration, global reference data management (IRCC program rules, NOC catalogue, CRS tables, CLB conversion tables, form editions and field maps, fee schedules — all versioned and effective-dated, on the canonical spine), global template publishing, the compliance governance plane (consent register, retention/disposal with floors-in-code, legal hold, DSR register, breach register, per-individual data export), platform-wide hash-chained audit and monitoring, and support tooling.

---

## 5. Out of Scope / Exclusions

The following are **not** in scope for this build. The founder should review and adjust this list before issuing the RFP. (Note: this is the single authoritative OUT table — everything not listed here is IN, under the frozen-scope default-IN rule.)

| Item | Notes |
|---|---|
| **Immigration legal advice** | The platform produces scores, flags, and information. It does not provide legal opinions. Compliance features help RCICs fulfill their obligations; they do not replace qualified legal judgment. |
| **Firms' trust accounting** | The billing module records client invoices and payments; it is not a law-firm trust accounting system (no pooled trust ledger, no GL). Firms requiring trust accounting use their own accountancy software. |
| **IRCC live API integration** | IRCC does not publish a public machine-readable API for its rules or processing times. The platform maintains curated, versioned reference data updated by Super Admin — not a live feed. |
| **Authoring of immigration content / translation of firm content** | Initial English and French UI/system strings are in scope (delivered bilingually). The authoritative immigration content (program rules, point values, form editions, field maps, document requirements — the Country-Pack) is the founder's deferred deliverable, not the vendor's. Translation of firm-authored content is the firm's responsibility. |
| **Third-party license fees** | E-sign provider (if used), payment gateway (Stripe), cloud infrastructure (AWS), transactional email/SMS, and similar third-party SaaS costs are the founder's responsibility and are not included in the vendor's development quote. (Identity is in-house — there is no managed-IdP license line; see Section 6.) |
| **Mobile native apps (iOS/Android)** | The client portal and consoles are web-based; the portal is an installable PWA. Native app development is out of scope for this build. |
| **Marketing website** | A public product marketing site is not in scope. The portal's public-facing pages (booking links, public-form landing pages) are in scope. |
| **Offline / air-gapped operation** | The platform requires internet connectivity. The portal PWA supports a read-only offline shell only; offline write/sync is out of scope. |
| **OpenSearch / second search backend** | v1 universal search runs on Postgres full-text search behind a `SearchIndexPort`; OpenSearch is a documented later adapter, out of base scope. |
| **Managed-IdP / enterprise inbound SSO** | Identity is in-house. A managed-IdP enterprise-SSO adapter behind the `IdentityProviderPort` is a later additive, out of base scope (timing is a founder commercial knob — see Section 14). |
| **Database-per-tenant as the default** | The default tenancy is pooled Postgres + forced RLS. A dedicated-database tier for a contractually-requiring enterprise tenant is an opt-in deployment of the same resolver, not a re-architecture; bespoke day-one DB-per-tenant for a named enterprise is out of base scope unless the founder confirms it (see Section 14). |
| **Vendor-run one-time per-firm cutover migration** | The reusable bulk-import feature (Contacts/Clients, Cases, Documents, financials) **is in scope** as the supported onboarding path. A vendor-run bespoke per-firm data extraction/cutover is a separate T&M engagement, not base scope. |

---

## 6. Technology — Locked Stack & Hard Constraints

### Locked stack — fixed constraints

The architecture is **decided and locked** (see the ADR). The table below states the fixed technology constraints. For the locked decisions, vendors must build to the stack as specified — **the "propose alternatives" invitation does not apply.** Vendors may propose alternatives only for the genuinely-open implementation choices explicitly marked "open" below.

| Layer | Locked decision | Status |
|---|---|---|
| **Language** | TypeScript 5.x (strict) — end to end. `any` is prohibited. Shared Zod schemas across backend and frontend. | Locked |
| **Backend framework** | NestJS 11 (Node.js LTS), **modular monolith ("modulith")** with extractable service seams. Async/heavy work runs in worker processes. | Locked |
| **API style** | REST/JSON, OpenAPI 3.1, versioned at the URI. | Locked |
| **Frontend — all three surfaces** | React 19 + Vite + **Refine** + shadcn/ui + Tailwind CSS; design-token-driven. TanStack Query for server state. (One React/Refine stack across super-admin, agent console, and client portal.) | Locked |
| **Forms & validation** | React Hook Form + Zod; schemas shared with the backend (single source of truth). | Locked |
| **Primary database** | **PostgreSQL 16** (AWS RDS/Aurora, ca-central-1) as the SINGLE relational system of record. JSONB (GIN-indexed) for all config-as-data (questionnaire/form definitions, automation rules, form field maps, entitlements, reference data), validated by Zod at the edge. **MongoDB is eliminated** — there is no second datastore. | Locked |
| **Multi-tenancy isolation** | Shared database, shared schema, **PostgreSQL RLS ENABLED and FORCED** on every tenant table as the primary control, plus the four defense-in-depth layers. `firm_id` is the tenant key; RLS scopes on `firm_id`. A second portal RLS dimension (client-subject GUC) isolates client-to-client in the portal. Hybrid path to a dedicated-database tier designed in from the start. | Locked |
| **Connection pooling** | PgBouncer in **transaction-mode** pooling, with `SET LOCAL` inside the transaction and a fail-closed `current_setting(..., true)` NULL→zero-rows check; a connection-reuse cross-tenant test is a release gate. | Locked |
| **Caching & queues** | **Redis** (AWS ElastiCache, ca-central-1) — background job queues via **BullMQ** and tenant-namespaced hot-data caching. | Locked |
| **Object storage** | **Amazon S3** (ca-central-1), SSE-KMS, presigned URLs bound to ownership-checked records, firm-namespaced keys. Private buckets; no public access. | Locked |
| **Authentication** | **In-house identity** (NestJS + Passport, Argon2id, in-house TOTP/WebAuthn + recovery codes, 15-min access JWT + rotating refresh cookie, token-bound sessions). **Three physically-separate auth pools** (platform / firm-staff / client-portal) with distinct signing keys and mandatory audience-claim verification. The managed-IdP (Cognito/Auth0) recommendation is **overruled**; inbound enterprise SSO is a future additive adapter behind `IdentityProviderPort`. | Locked |
| **Email (outbound)** | AWS SES (ca-central-1) + SMTP fallback, behind `EmailRelayPort`. | Locked (rail) |
| **Email (inbound sync)** | Gmail API / Microsoft Graph OAuth; IMAP fallback. Runs in a dedicated worker. | Locked |
| **E-signature** | In-house Signer behind `ObjectStoragePort`; any third-party e-sign provider with confirmed Canadian residency integrates as a swappable adapter. | Locked (rail; provider open) |
| **Payments** | Stripe (Payment Intents + Connect for client→firm; Stripe Billing for firm→platform) behind `PaymentRailPort`. Tokenized; PCI SAQ-A. | Locked (rail; Connect terms a founder commercial knob) |
| **SMS / messaging** | AWS SNS + WhatsApp BSP behind `SmsGatewayPort`. | Locked (rail; BSP open) |
| **Infrastructure** | AWS ECS Fargate, CloudFront + WAF, ALB; **Terraform or AWS CDK** (vendor's choice — open); no click-ops in production. All ca-central-1. | Locked (IaC tool open) |
| **CI/CD** | GitHub Actions → ECR → Fargate; blue/green or rolling deploy; migrations gated; preview environments per PR. CI gates the tenant-isolation, RLS-lint, and a11y suites. | Locked |
| **Observability** | OpenTelemetry → CloudWatch / Grafana; Sentry; structured JSON logs (Pino) with correlationId + tenantId and PII redaction at the logger. | Locked |
| **i18n** | react-i18next (consoles) / next-intl-equivalent (portal); ICU MessageFormat. Full English and Canadian French from day one. No hardcoded user-facing strings. | Locked |
| **Testing** | Vitest (unit), React Testing Library (component), Playwright (E2E, both locales), MSW, Storybook + axe. Mandatory CI tenant-isolation/cross-record denial suite as a release gate. | Locked |

Genuinely-open implementation choices on which vendors may propose their approach: IaC tool (Terraform vs CDK), e-sign provider selection (if any), WhatsApp BSP selection, internal library/tooling choices that do not affect the locked decisions, and component/test-harness specifics.

### Hard constraints — non-negotiable

These are not preferences; proposals that cannot satisfy them will not be considered:

1. **Canadian data residency.** All production data — database, object storage, backups/PITR, search indexes, and PII-bearing logs — must be stored and processed within Canada (ca-central-1; DR within Canadian regions). Sub-processors must be assessed for Canadian residency. (Region is modelled as a per-tenant dimension so future non-Canadian regions are config, not a rewrite — but the launch deployment is Canada-only.)
2. **Bilingual EN/FR as a launch language.** Full English and Canadian French across all UI, system communications, validation messages, and generated document output (retainers, IMM forms, invoices). Not a post-launch retrofit. (French agreements are a Quebec Charter / Law-25 legal requirement.)
3. **Multi-tenant isolation by construction.** Tenant isolation enforced at the database layer (PostgreSQL RLS ENABLED+FORCED), not solely by application-level query filtering. A developer error must not be able to expose cross-tenant data. Proven by a CI cross-tenant-denial suite and an RLS schema-lint, both release gates.
4. **Extensibility-first data model.** Cross-cutting capabilities (notes, tasks, documents, communications, reminders, audit, e-sign, notifications) attach to any entity through a polymorphic pattern validated against one platform-owned EntityTypeRegistry, so new entity types inherit them without schema migrations.
5. **Regulated-PII security posture.** The platform handles passport numbers, government IDs, financial records, and immigration history. Field-level envelope encryption for the Restricted PII set (CMK → per-firm DEK → per-subject key), mask-by-default + audited reveal, mandatory schema validation of all input, and OWASP Top 10 mitigations are required. PIPEDA erasure is by crypto-shredding against immutable backups.
6. **WCAG 2.2 AA accessibility.** All three UI surfaces (staff console, super admin console, client portal) must conform to WCAG 2.2 Level AA, verified by automated tooling in CI and a manual audit before go-live, with a VPAT-style conformance statement. Generated PDFs are tagged/accessible.

---

## 7. Non-Functional & Compliance Requirements (Summary)

The Scope Document set contains the full NFR specification with measurable acceptance criteria. The highlights are presented here.

### Performance targets (steady-state, excluding maintenance)

| Metric | Target |
|---|---|
| API read endpoints (p95 / p99) | ≤ 300 ms / ≤ 800 ms server response |
| API write endpoints (p95 / p99) | ≤ 600 ms / ≤ 1200 ms server response |
| Universal search (p95) | ≤ 500 ms |
| First Contentful Paint (median, broadband) | ≤ 1.5 s |
| Largest Contentful Paint (key pages, p75) | ≤ 2.5 s |
| Interaction to Next Paint (p75) | ≤ 200 ms |
| Long-running jobs (IMM PDF generation, bulk export/import) | Async via BullMQ; no synchronous request > 5 s |
| Server error rate (5xx) over any rolling 24h | < 0.1% |

### Scalability targets

| Dimension | Initial | 3-year |
|---|---|---|
| Tenant firms | 200 | 2,000 |
| Active users (staff + clients) | 10,000 | 100,000 |
| Concurrent users | — | 10,000 |
| Sustained throughput | 200 req/s | 2,000 req/s |
| Records | — | 1,000,000 |
| Documents under management | 1,000,000 | 25,000,000 |

The architecture scales horizontally on the modulith (stateless app + Redis sessions + independent workers + read replicas + a hybrid-tenancy seam) without premature microservices. Load tests proving the performance targets at scale are a go-live release gate.

### Availability

- Monthly uptime: 99.9% or better; graceful degradation under load.
- No single point of failure: minimum two application instances across two availability zones; database primary with hot standby across ≥ 2 AZs.
- Planned maintenance outside Canadian business hours with at least 72 hours notice; zero-downtime deploys preferred.

### Backup & recovery

- RPO: 15 minutes (continuous WAL/PITR).
- RTO: 4 hours for a full-region failure.
- Documented restore drills at least quarterly (a contractual deliverable).
- Disaster recovery within Canadian regions only. One DR regime covers all durable data (no second datastore).

### Compliance highlights

| Area | Requirement |
|---|---|
| **PIPEDA / Quebec Law-25** | Consent register (Law-25 per-purpose), access/correction/DSR workflows (statutory clock, hold/floor-aware), retention and secure disposal (floors-in-code), legal hold (hold beats deletion), breach register (record every breach; RROSH gates notification; 72h clock UI), one canonical per-individual machine-readable export. Owned by the Super-Admin governance plane (SA-11). |
| **Canadian data residency** | All data at rest and in transit remains within Canada; CI region-allowlist; per-rail sub-processor residency matrix. |
| **WCAG 2.2 AA** | All three UI surfaces; automated CI checks, manual audit, and VPAT before go-live; tagged PDFs. |
| **Immutable audit logging** | One platform-wide append-only spine; immutability at the DB GRANT (INSERT-only role); hash-chained over ciphertext/HMAC (never plaintext) with per-firm chains; periodic WORM anchor (S3 Object Lock); continuous chain-verify alarm; written synchronously via an outbox (atomic with the user op). Retention floors in code (financial ≥ 7yr, breach ≥ 2yr, other ≥ 2yr; effective = max of applicable per-country minimums). |
| **RCIC regulatory support** | Retainer/service agreement capture and retention; client file completeness and history; use-of-representative (IMM 5476) tracking; financial transparency per case; point-in-time rule provenance on assessments (stamped pack version); long-term record-keeping and export on demand. |
| **Field-level encryption** | Restricted PII (passport/travel-doc, SIN + foreign equivalents, gov-ID numbers, financial-account/bank, biometric refs, licence/designated-person creds) encrypted with envelope keys (CMK → firm DEK → subject key); mask-by-default + reveal-permission + PII_REVEAL audit; blind-index/HMAC (per-firm key) only for exact-match lookup; never projected into the search index. The exact field list is a founder/privacy-counsel confirmation; the mechanism is fixed. |
| **OWASP Top 10** | Full mitigation matrix required; see the Scope Document NFR section. |
| **Penetration testing** | Independent third-party penetration test before go-live (multi-tenant and horizontal/cross-record access explicitly targeted; must fail to leak 100%) and annually thereafter. |

---

## 8. Delivery Approach — One Frozen Scope, Build-Sequencing Waves

There is **one fixed full scope** (all modules in Section 4, minus the single OUT table in Section 5), built against a **frozen ERD**. There are no MVP/breadth/hardening tiers and no "to be confirmed during Phase 1" scope deferrals — previously-deferred schema decisions are committed up front so the data model freezes too. Vendors quote the whole scope.

Delivery is **staged into Build-Sequencing Delivery Waves**. Waves phase milestones and payments **within** the one frozen scope; they are not scope tiers. Each wave has its own acceptance gate; every wave is committed. The waves reflect the product's natural dependency order, and the foundation wave (Wave A) is a hard, separately-accepted foundational sprint that gates every module.

| Wave | Goal | Notes |
|---|---|---|
| **A — Foundation** | Postgres + forced-RLS substrate (RLS migration generator + Prisma scoping extension + PrincipalContext + CI cross-tenant-denial suite); in-house identity with three walled pools; scope-aware RBAC catalog + default role matrix; EntityTypeRegistry; country-pack runtime; the CanonicalField catalogue + append-only answer store; the CMK→firm-DEK→subject-key hierarchy. | ~3–4 week critical-path sprint that must land before any module work. Exit gate: RLS schema-lint + CI denial suite + connection-reuse cross-tenant test all green. |
| **B — Revenue spine** | CRM / Party pipeline, eligibility/scoring engine, scheduling & booking, retainer/e-sign, billing & payments (client + SaaS firm-facing UI calling SA-4). | First sellable journey begins to land here. |
| **C — Case delivery** | SQR/PQR, document management + 10-state lifecycle, IRCC forms + data-driven Filler, workflow/milestone tracking, deficiency tracking. | Depends on the catalogue (Wave A) + revenue spine. |
| **D — Cross-cutting & surfaces** | Automation (Conductors + Doers), communications, universal Search, reporting, the **Client Portal console** (Doc 4), the bulk-import engine, outbound API/webhooks (AG-16 Developer). | Portal depends on `portal/*` permissions, the Party spine, and the record-level authz layer. |
| **E — Hardening & go-live** | WCAG 2.2 AA formal audit + VPAT, third-party penetration test, load test at scale targets, full PIPEDA/Law-25 tooling, observability maturity, and the bilingual end-to-end UAT acceptance scenario. | Go-live gate. |

**Definition of done (overall, validated at Wave E):** a single, fully scripted bilingual (EN/FR) end-to-end journey — lead → prospect → eligibility assessment → consult booking → retainer signed → invoice paid → case created → questionnaire completed → documents collected → IRCC form generated → case tracked to decision — runs without manual workarounds, with all data wired to real APIs, on a production-grade ca-central-1 deployment, passing the isolation, a11y, performance, and security release gates. (The "Client A" journey is the canonical UAT acceptance scenario.)

The immigration **content depth** that ships (which programs/PNP streams are FULL versus INFORMATIONAL) is set by the founder's Country-Pack deliverable; the **machinery for all case types is in scope regardless** of content depth.

---

## 9. Team Composition Expected

A credible proposal must staff the following roles. Vendors should name key personnel and provide CVs or profiles. The founder will provide domain expertise; the vendor supplies all engineering, design, QA, and project management.

| Role | Notes |
|---|---|
| **Engagement / Project Manager** | Single point of accountability; manages timeline, risks, and communication with the founder. |
| **Solution Architect** | Owns technical delivery against the locked architecture across backend, frontend, and infrastructure. Must have demonstrated experience with multi-tenant SaaS, PostgreSQL RLS, and regulated-data environments. |
| **Senior Backend Engineer(s)** | Deep proficiency in Node.js/TypeScript and NestJS. Experience with PostgreSQL (incl. RLS), Prisma, Redis, BullMQ, and cloud-native AWS services. |
| **Senior Frontend Engineer(s)** | Deep proficiency in React/TypeScript (React 19, Refine, shadcn/Tailwind). Experience with complex data-heavy applications (pipelines, case management, form builders). Knowledge of WCAG 2.2 implementation. |
| **UI/UX Designer** | B2B SaaS product design experience. Ability to design for information-dense, workflow-centric internal tools as well as a polished, accessible client-facing portal. Familiarity with design systems and accessibility standards. |
| **QA Engineer** | Automated testing (Playwright E2E in both locales, unit/integration), tenant-isolation and cross-record denial test coverage, security testing, and regression planning. |
| **DevOps / Cloud Engineer** | AWS expertise (ECS Fargate, RDS/Aurora Postgres, ElastiCache, S3, CloudFront, Secrets Manager, KMS); Terraform or CDK; CI/CD pipeline ownership; PgBouncer/RLS operational correctness. Understanding of Canadian data-residency constraints. (Note: no managed-IdP — identity is in-house.) |
| **Security Engineer (access to)** | Coverage for the RLS isolation model, field-level encryption/KMS hierarchy, and the pre-go-live horizontal-access pentest. May be shared, but must be named. |
| **Canadian immigration domain consultant (access to)** | Not a full-time team member; the vendor should have access to — or propose how they will work with — a domain resource to validate immigration-specific features during implementation. The founder is the final authority and supplies the Country-Pack content; a secondary resource helps the team ask the right questions during build. |

Proposals must clearly state which roles are proposed as dedicated versus shared across projects, and provide indicative allocation percentages per delivery wave.

---

## 10. Deliverables

The following deliverables are required, mapped to the delivery waves. Specific acceptance criteria per deliverable are defined by the Scope Document set's acceptance gates and will be confirmed during contract negotiation.

### Per wave

| Deliverable | Description |
|---|---|
| **Working software, deployed** | Fully functional wave scope, deployed to the founder's cloud account (dev, staging, and production environments in ca-central-1), passing all acceptance tests for that wave. |
| **Source code + IP assignment** | Complete, clean source code delivered to the founder's private repositories. All IP assigned to Expat Ready (work-for-hire basis) — see Section 11. |
| **Infrastructure as code** | All cloud infrastructure defined as Terraform or AWS CDK; no manual click-ops. Environment-specific configuration externalized; no secrets in code; region-allowlist enforced in CI. |
| **Automated test suite** | Unit and integration tests (≥ 80% coverage of business-logic modules), E2E tests covering all critical journey paths in both English and French, and a mandatory tenant-isolation + cross-record denial test suite (with RLS schema-lint) that runs in CI and gates releases. |
| **Architecture documentation** | Architecture overview (narrative + diagrams), data model + ERD, API reference (OpenAPI 3.1 spec), and a module extensibility guide demonstrating how to add a new entity type via the EntityTypeRegistry (one row, zero migrations). |
| **Runbooks** | Deployment, rollback, backup restore, on-call incident response, and database migration runbooks. |
| **Knowledge transfer** | At least two live knowledge-transfer sessions per wave with the founder and any designated technical stakeholders; recorded for reference. |

### At go-live (end of Wave E)

- WCAG 2.2 AA conformance statement (VPAT-style) across all three surfaces.
- Penetration test report (multi-tenant + horizontal-access) with remediation evidence.
- Disaster recovery runbook with documented restore drill results.
- Sub-processor list with data-residency status per processor.
- PIPEDA / Law-25 governance tooling operational and documented (consent, retention/disposal, legal hold, DSR, breach register, per-individual export).
- Load-test report proving performance targets at scale.

---

## 11. Commercial & Engagement Model

The commercial model reflects the locked architecture: a **fixed engine** built against a frozen scope, plus **immigration content priced per unit** because content volume is the founder's variable deliverable.

### Engine — fixed-price per delivery wave

The platform **engine/machinery** (all of Section 4's modules as built capabilities) is quoted as **fixed-price per delivery wave (Waves A–E)** against the one frozen scope and frozen ERD, with a per-wave acceptance gate and milestone payment. Because the scope and schema are frozen up front, scope is not a per-wave variable; the waves stage payment and acceptance, not scope.

### Immigration content — unit-priced per pack

Immigration **content** (per case-type, per form-edition, per Country-Pack) is **unit-priced**, because its volume is unknown until the founder supplies it. The founder's **binary case-type / PNP-depth list** (which streams ship FULL versus INFORMATIONAL) is a **hard gate**: it must be delivered before any content-bearing wave's content units can be fix-priced. The engine is fully in scope and priced regardless of content volume; only the content units flex.

| Component | Pricing basis |
|---|---|
| **Engine / machinery** | Fixed-price per delivery wave (Waves A–E), frozen scope + frozen ERD, per-wave acceptance gate. |
| **Immigration content** | Per-unit (case-type / form-edition / Country-Pack), priced once the founder's case-type/PNP-depth list (the hard gate) is delivered. |

Vendors should provide a fixed quote per wave for the engine and a per-unit rate card for content, and may propose a justified hybrid for genuinely ambiguous sub-areas — but the engine scope itself is fixed, not a tier to be reduced.

### IP ownership

All work produced under this engagement is **work for hire**. All intellectual property — source code, designs, documentation, data models, scripts, tests, and any other work product — is assigned exclusively to Expat Ready upon payment. The vendor retains no rights, license, or claim over any deliverable. This must be reflected in the contract.

### Payment milestones

Vendors should propose a payment milestone schedule aligned to the delivery-wave acceptance gates. A suggested structure per wave:

- 20% on wave kickoff.
- 40% on delivery of a testable, feature-complete build to staging for that wave.
- 40% on founder acceptance (wave acceptance gate passed) and production deployment of that wave.

Exact milestone definitions will be negotiated during contract finalization and tied to the Procurement & Engagement Shell's acceptance gates.

### Warranty / defect-fix period

Vendors must include a warranty period of at least 90 days post-go-live, during which defects (defined as deviations from the agreed acceptance criteria in the Scope Document set) are remediated at no additional charge.

### Post-launch support and maintenance

Proposals should include options for post-launch support, covering at minimum:

- Bug fixes and security patches within the defined SLAs (Critical ≤ 7 days, High ≤ 30 days, Medium ≤ 90 days).
- Dependency updates and vulnerability remediation.
- Infrastructure monitoring and incident response.
- Minor enhancement support (T&M).

Vendors may propose a retainer-based or T&M model for ongoing support. Pricing should be stated separately from the development quote.

---

## 12. What to Include in Your Proposal

Proposals must address each of the following items. Incomplete proposals will be scored accordingly.

**A. Company profile**
- Legal name, registered address, year established.
- Company size (headcount, structure).
- Relevant SaaS product development experience — specifically: multi-tenant B2B SaaS, PostgreSQL RLS isolation, regulated-data environments, legal-tech or immigration-tech (if any). Include two to three representative projects with client references available on request.
- Canadian development capacity and familiarity with Canadian data privacy requirements.

**B. Proposed team**
- Named key personnel for each role listed in Section 9, with brief profiles or CV summaries.
- Allocation per role per delivery wave (dedicated vs. shared; percentage).
- Team location(s) and timezone overlap with the founder (Canada Eastern / Pacific).

**C. Methodology**
- Development methodology (Agile, Scrum, Kanban, or other — describe sprint cadence, ceremony structure, and how the founder is engaged as product owner).
- QA and testing approach, including how the CI tenant-isolation/cross-record denial suite and RLS schema-lint gate releases.
- Code review and quality assurance process.
- How content units are sequenced and reconciled against the founder's Country-Pack deliverable.
- Security and compliance integration into the development lifecycle.

**D. Technical approach (against the locked stack)**
- Explicit confirmation of how you will build to each locked decision in Section 6 (no alternatives invited for locked items), and your proposed approach for the genuinely-open items (IaC tool, BSP, e-sign provider, etc.).
- Explicit statement on how each hard constraint (Section 6) is satisfied — especially RLS isolation, the four defense-in-depth layers, PgBouncer transaction pooling, the three walled in-house auth pools, the KMS key hierarchy, and field-level encryption.
- Architecture approach for multi-tenancy, the portal client-to-client isolation dimension, and the record-level authorization layer.

**E. Wave timeline with milestones**
- Proposed timeline per delivery wave, with named milestones and deliverable dates, foundation wave (Wave A) called out as the critical-path gate.
- Assumptions underlying the timeline (including dependence on the founder's Country-Pack content).
- Identified risks and proposed mitigations.

**F. Detailed cost breakdown**
- Fixed engine cost per wave, broken down by role and activity category (design, backend, frontend, QA, DevOps, project management).
- Per-unit content rate card (case-type / form-edition / Country-Pack).
- Hourly or daily rates per role (for any T&M components and post-launch support).
- Any fixed costs (e.g. tooling, architecture spikes).
- Post-launch support pricing (separate from development).
- Exclusions — what is not covered by the quoted price.

**G. Assumptions**
- A clear list of assumptions the quote is conditional upon, including inputs expected from the founder (notably the Country-Pack content and the founder-decision items in Section 14), and any items the vendor believes are ambiguous.

**H. Post-launch support model**
- Proposed support tiers, SLAs, and pricing for ongoing maintenance after go-live.

---

## 13. Vendor Evaluation Criteria

Proposals will be evaluated against the following weighted criteria. The founder may adjust weights based on priorities at evaluation time.

| Criterion | Weight | What we are looking for |
|---|---|---|
| **Relevant SaaS and regulatory experience** | 25% | Demonstrated delivery of multi-tenant B2B SaaS products in regulated or compliance-sensitive domains, ideally with PostgreSQL RLS isolation. Legal-tech, immigration-tech, or health-tech experience is strongly advantageous. References from comparable engagements. |
| **Team quality and immigration/regulated-PII experience** | 20% | Named senior engineers and architects with verifiable experience in the locked stack and in handling regulated personal data. Retention risk (key-person concentration). |
| **Technical approach and architecture fit** | 20% | Quality of execution against the locked architecture: RLS isolation strategy, the four defense-in-depth layers, the canonical data spine, extensibility model, scalability path, and explicit answers to the hard constraints. Evidence that the team understands what makes this domain technically non-trivial. |
| **Timeline credibility** | 15% | A realistic, wave-sequenced timeline with credible gate definitions, the Wave A foundation correctly treated as critical path. Red flags: timelines that are obviously too short, or with no buffer for feedback and iteration. |
| **Total cost (value for money)** | 10% | Fixed engine cost and content rate card assessed relative to team quality and timeline. Lowest cost is not the criterion; cost credibility relative to the proposed team and scope is. |
| **Understanding of multi-tenancy and compliance requirements** | 5% | Demonstrated understanding of Canadian data-residency, PIPEDA / Law-25, WCAG 2.2 AA, and RCIC compliance requirements in the technical approach. |
| **Post-launch support model** | 5% | A realistic and commercially reasonable support model, with clear SLAs and pricing. |

Scoring: proposals will be reviewed internally, shortlisted to two or three vendors, and those shortlisted vendors invited for a technical presentation and Q&A session before a final decision is made.

---

## 14. Assumptions & Dependencies

### What the founder will provide

- **Domain expertise.** The founder is a licensed RCIC and serves as the product owner. Domain questions on immigration rules, RCIC regulatory obligations, IRCC form requirements, and product requirements will be answered promptly by the founder.
- **Immigration content (the Country-Pack — the founder's deferred deliverable).** Current IRCC program rules, CRS point tables, NOC catalogue data, CLB conversion tables, proof-of-funds schedules, accepted form editions, parsed form field inventories, field→canonicalFieldKey maps, and document requirements — versioned and effective-dated — supplied in structured form for loading into the canonical catalogue and masters. The **binary case-type / PNP-depth list** (FULL versus INFORMATIONAL) is a hard gate before content waves are fix-priced. The vendor is not responsible for the accuracy of immigration-domain content.
- **Brand assets.** Logo files, brand color palette, typography guidance, and any other brand materials required for the design system.
- **Cloud account.** The founder will provide an AWS account (ca-central-1) to which the vendor deploys. The vendor manages infrastructure within that account.
- **Timely feedback.** The founder commits to reviewing deliverables and providing feedback within an agreed SLA (defined in the contract) so the vendor is not blocked on decisions.
- **Third-party service accounts.** Stripe, transactional email/SMS, e-sign provider (if used), and AWS — the founder will establish and own the commercial accounts for these services. (No managed-IdP account is needed — identity is in-house.)

### Founder decisions required (business / domain / commercial)

These are settled by the founder (not the vendor) and feed the quote; the architecture is fixed regardless:

- **Restricted-PII field set** — confirm the exact list classified Restricted for field-level encryption (proposed default per Section 7), with regulatory counsel.
- **Case types & PNP depth** — the binary FULL/INFORMATIONAL list (the content hard gate).
- **Retention floors & audit evidentiary bar** — numeric retention floors (financial 7yr proposed, case-file per CICC, breach ≥ 2yr), RROSH thresholds, the 72h breach-clock interpretation, and whether RFC-3161 timestamping is required beyond WORM anchoring.
- **Regulator / representative model** — which representative types and licensing bodies ship per country (RCIC-only vs + law societies + Quebec MIFI/CAQ/CSQ); the Party relationship slots are built regardless.
- **Budget / timeline tolerance & contract shape** — acceptance of one frozen full scope + frozen ERD priced fixed-per-wave (engine) + per-unit (content), and willingness to fund the Postgres+RLS substrate, the Client Portal build, and field-level encryption; acknowledging the first sellable journey lands at the end of Wave B/C, not a truncated MVP.
- **Rail vendor selection & Stripe Connect terms** — v1 vendor per rail (Stripe/SES/S3/SNS+WhatsApp BSP are engineering defaults) and the Stripe Connect onboarding model + whether the platform takes an application fee.
- **FX & MFA/SSO commercial knobs** — platform + per-firm default reporting currency (CAD assumed) and manual-vs-paid FX provider; per-persona MFA defaults (platform mandatory; firm-admins recommended required; portal optional); whether enterprise inbound SSO is v1 or fast-follow; SMS-OTP appetite.
- **Enterprise physical DB separation** — whether any target enterprise firm contractually requires database-per-tenant from day one (the pooled + RLS default holds otherwise; the resolver already abstracts placement).

### Key assumptions

- The sequenced Scope Document set (Doc 1–4 + the ADR and its folded Procurement & Engagement Shell) is the authoritative, binding source of functional and technical requirements; this RFP is the procurement wrapper. Proposals must be based on a review of that set (provided under NDA to shortlisted vendors).
- Immigration rule content is the founder's deliverable, loaded into the platform as versioned reference data; the vendor is not responsible for its accuracy.
- This is a greenfield build with **no production data migration** in base scope. The reusable bulk-import feature is the supported firm-onboarding path; bespoke per-firm cutover is a separate T&M engagement.
- An existing private prototype codebase exists as **design provenance only** and may be offered as an optional, NDA-gated, read-only reference; the vendor may inspect it but may not depend on it and is measured solely against the Scope Document set. The vendor must not lift the prototype's datastore — the system of record is PostgreSQL.
- Third-party SaaS fees (AWS, Stripe, e-sign provider if used, transactional email/SMS) are not included in the vendor's development quote and are the founder's direct cost.

---

*End of Request for Proposal*

*Expat Ready reserves the right to accept or reject any proposal, to cancel this RFP, to negotiate with multiple vendors simultaneously, and to award the contract to any vendor regardless of price. This RFP is the procurement wrapper and does not constitute a binding commitment to proceed with any procurement; the sequenced Scope Document set (Doc 1–4 + ADR + Procurement & Engagement Shell) is the binding build source.*
