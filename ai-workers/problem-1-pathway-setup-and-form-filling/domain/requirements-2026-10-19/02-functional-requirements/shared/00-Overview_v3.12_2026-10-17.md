> **Document control** · Version **3.12** · **2026-10-17** · Status: **Updated — see change log**\
> Part of: *Super Admin Console — Functional Requirements* · Split from `FINAL-SuperAdmin-FR.md` lines 1–158 on 2026-09-16 · Previous version: `_archive/00-Overview_v3.11_2026-10-12.md`
>
> | Version | Date | Change | Decisions |
> |---|---|---|---|
> | 3.12 | 2026-10-17 | **Second pass (AG16-54 #5, AG16-11).** SA-5 scope row and the "Automatic messages run from day one" rule: no "optional page with on/off switches"; the one **Automatic messages** page (AG-12) shows each message with the choice *Send automatically · Ask me first · Off*. Current-version cells for SA-6, SA-7, SA-8 and SA-11 brought up to date (v3.9, v2.17, v2.10, v2.12). | AG16-54, AG16-11 |
> | 3.11 | 2026-10-12 | **12 Oct decisions applied (the product owner approved).** Detailed Scope Index gains a **Current version** column (SA-1 v2.4 … SA-12 v2.9) and every scope row is brought up to date: SA-1 and SA-1B (firms see only the final questionnaire and the dynamic checklist — firm-added questions withdrawn; the pack carries no required wording; review dates with a weekly email), SA-2, SA-3 (payment account on every plan), SA-4, SA-5 (now **Templates — ExpatReady side**; automatic messages run from day one; no longer "being redesigned"), SA-6, SA-7 (six roles), SA-8, SA-9 (one Business page), SA-10 (simple queue), SA-11 (7-year activity log, erasure of approved requests, legal holds by the Platform Owner, consent records), SA-12 (two flag scopes). **§2 Staff roles:** the six roles — Platform Owner, Admin, Support, Billing, Content publisher, Auditor; the nine earlier role names are retired (kept as history). New section **Key Product Rules** and a new **Defaults first (Rule 9)** mandate. "Content publisher" becomes Content publisher in §3; the SA-7 version reference in §2 is corrected. **Pending rows applied:** SA5-X34, SA6-X10, SA7-X19, SA8-X19, SA9-X6, SA10-X7, SA11-X7, SA12-X8. **Same-day revision (P-1 – P-5, the product owner, 12 Oct):** the SA-9 Business page, the SA-10 support-session link, the SA-11 breach register and the SA-12 maintenance mode and banner are Phase 1. | SR-Q1 – SR-Q3, SR-Q5, SR-Q6 · SA05-R9a, SA05-R9b · SA-Q1, SA-Q3 · G-Q1, G-Q2, G-Q4, G-Q5 · R9-pass ruling 3 · R5, R8, R11 – R14, R28, R34 · W-2, W-11, W-12, W-15, W-17, W-18 · Rule 9 |
> | 3.10 | 2026-10-10 | **SA-08 merge (the product owner, 10 Oct).** SA-8 row: the co-product owner's wording (SA-8 v2.5) with WhatsApp and firm calendar linking in **Release 1** and the extended upload types. SA-5 row unchanged and marked **being redesigned** (template management review; the co-product owner's SA-05 review kept as the draft). SA-4 row's trial wording corrected to SA-4 v2.17 (no card to start a trial). The co-product owner's v3.9 review copy is in `_archive/`. | SA8-D25 – SA8-D27 · SA4-D29 |
> | 3.8 | 2026-10-10 | Applied from SA-03 v2.16 (SA3-X10; the product owner, 10 Oct): SA-3 scope row rewritten — feature catalogue replaces the product map, plan ladder, four limits with fixed modes, downgrade check. *Same day:* SA-3 and SA-4 rows aligned with SA7-D51 (an Owner approves live plan and price changes). | SA3-D10 – SA3-D17 |
> | 3.7 | 2026-10-10 | SA6-D12 — starter roles configured in Super Admin (the product owner, 10 Oct; owned by SA-06 v3.1 §3.9): SA-6 scope row now says starter roles are published by Expat Ready in Super Admin (six at launch) instead of "six fixed starter roles"; Expat Ready adds, edits, renames and retires them with a second person's approval. | SA6-D12 |
> | 3.6 | 2026-10-07 | Aligned to SA-06 v3.0 roles and permissions (the product owner, 7 Oct): SA-6 scope row rewritten (catalogue of about 259 firm permissions with default roles; six fixed firm starter roles for every plan; firm custom roles with server-side checks; internal-role editor; one system, two role sets) — plan-to-role seeding and "privilege-escalation fix" removed; §2 Permissions model notes the two role sets. | SA6-D1 – SA6-D11 |
> | 3.5 | 2026-10-03 | Consistency review fixes (3 Oct): SA-3 scope row now says limits are hard for seats and active corporate cases, others warn then hard after 14 days (matches SA-3 v2.12). | AG17-D68 |
> | 3.4 | 2026-10-02 | SA-7 scope row aligned with SA-7 v2.7: one session at a time for staff and firm users; clients may be signed in on several devices; auto-logout for Expat Ready staff only. | SA7-D66 |
> | 3.3 | 2026-10-01 | SA-7 scope row: deactivation is never blocked — open tickets return to the support queue and an account manager's firms are handed over or use the shared inbox (SA-7 v2.5). | SA7-D64 |
> | 3.2 | 2026-10-01 | SA-7 scope row and §2 aligned with SA-7 v2.4 (final review): launch sign-in is email + password + second step, Google sign-in in Phase 2; one session at a time with client auto-save; step-up narrowed. | SA7-D55 – SA7-D63 |
> | 3.1 | 2026-09-30 | SA-7 scope row aligned with SA-7 v2.2. §2 "Super Admin Persona — Sub-Roles" replaced by the nine configurable starter roles (several per person, Owner can edit and create roles); SA-6 scope row notes the internal-role editor. | SA7-D2, SA7-D3, SA7-D8, SA7-D47 – SA7-D54 · SA7-X7 |
> | 3.0 | 2026-09-22 | **SA-1 split in two.** SA-1 keeps the container — countries, pack versions, draft → review → approve → publish, rollback, validation and authoring tools, completeness profiles, firm read with pinning and adoption. A new module, **SA-1B Content Pack Configurator**, holds the pack's content and the resolver: the library, the configurator rows, filings and routes, person roles, the prospect tiers and PQR, the assessment output, and the startable and completeness checks. Detailed Scope Index gains an SA-1B row; the SA-1 row is rewritten. Major version because the module set changed (rule 2). | SA1B-D1 – SA1B-D27 |
> | 2.7 | 2026-09-18 | SA-1 scope row and the Country Pack overview (§3.1, §3.2) aligned with SA-1 v2.1. | SA1-D1 – SA1-D10 |
> | 2.6 | 2026-09-18 | SA-4 scope row aligned with SA-4 v2.1; SA-4 lead phase P1. | SA4-D1 – SA4-D10, SA4-P1 |
> | 2.5 | 2026-09-18 | Corrected DOCS-2, DOCS-3, DOCS-4, DOCS-7 and rule 5 (product owners, 18 Sep): the local per-module files are the only source for reviews and for the team; Confluence is never read as a source. The product owners share updated files with the development team, who update Confluence and Jira manually. | DOCS-2, DOCS-3, DOCS-4, DOCS-7 |
> | 2.4 | 2026-09-18 | Added DOCS-7 and rule 8: the reviewed per-module masters, as published on Confluence, are the only requirements source for Spec Kit and tickets. | DOCS-7 |
> | 2.3 | 2026-09-18 | Added DOCS-6 and rule 7: code checks always use same-day GitHub `dev` on both repositories, with commit ids recorded. | DOCS-6 |
> | 2.2 | 2026-09-17 | SA-2 scope row aligned with SA-2 v2.1. | SA2-D1 – SA2-D9 |
> | 2.1 | 2026-09-17 | Added "How this document set is maintained" (DOCS-1–5). Document Control now points to per-file versions. SA-3 scope row and Country Pack consumption sentence aligned with SA-3 v2.1. | DOCS-1–5 · SA3-D1, SA3-D3, SA3-D6 |
> | 2.0 | 2026-06-20 | Baseline — golden per-module rebuild | — |

# Expat Ready — Super Admin Console: Functional Requirements (FINAL — Development-Ready)

---

## Document Control

| Field | Value |
|---|---|
| **Document title** | Expat Ready — Super Admin Console: Functional Requirements (FINAL) |
| **Version** | Per file — see each file's name and document-control header (set baseline: 2.0 golden per-module rebuild, 2026-06-20) |
| **Date** | Per file |
| **Status** | Draft for review — development-ready |
| **Audience** | Development team & vendor — build-ready specification |
| **Companion documents** | FINAL Agent (RCIC/Lawyer) Console FR (`FINAL-Agent-FR/` folder) · Architecture & Tech Stack (`sections/02-architecture-and-tech-stack.md`) · Data / Multi-Tenancy / NFR / Security (`sections/03-data-multitenancy-nfr-security.md`) · Immigration Domain (`sections/04-immigration-domain.md` — to be rebuilt from founder's expertise) |

---

## How this document set is maintained

*Added 2026-09-17. Applies to every file in `FINAL-SuperAdmin-FR/`.*

**Document-set decisions (2026-09-17)**

| ID | Decision |
|---|---|
| **DOCS-1** | Module documents are **updated in place**, with version and date — no addenda or override pages. |
| **DOCS-2** | The **master copy** is this per-module folder (`FINAL-SuperAdmin-FR/`, with `FINAL-Agent-FR/` for the other console), in the product owners' working folder. It is outside the developers' repository, so it has no automatic change history: the **version and date in each file name**, the **change log** at the top of each file, and the **`_archive/`** folder are the version record. **All edits happen only in these files.** *(Revises the 2026-09-17 decisions that the repository, then Confluence, would be the master.)* |
| **DOCS-3** | **One file per module.** The development team mirrors each file as one Confluence page. |
| **DOCS-4** | **Sharing is manual.** The product owners send updated files to the development team; the team updates Confluence and comments on the affected Jira tickets. |
| **DOCS-5** | File names carry version and date: `<module>_v<major>.<minor>_<YYYY-MM-DD>.md`. |
| **DOCS-6** | **Code checks use GitHub `dev` on both repositories** (`ERv2-sanitized` and `ERv2-frontend`), downloaded the same day, read directly from `origin/dev` — never from a local working folder, which may be on another branch. Every "what's built" statement records the exact `dev` commit it was checked against. *(Requested by the development team, 2026-09-18.)* |
| **DOCS-7** | **The local module files are the only requirements source.** Reviews read only the module files in this folder — never Confluence. The development team builds (Spec Kit, tickets) only from the files the product owners share, and keeps Confluence as a mirror of them. For every module reviewed here, older sources — "Doc-2", `Docs/SuperAdmin-Console-Modules/`, build specs, the combined FR files, pre-review Confluence pages — are superseded. Modules not yet reviewed keep their current source until reviewed. *(Product owners, 2026-09-18.)* |

**Rules**

1. **Every change creates a new file** with the next version and today's date; the previous file moves to `_archive/`; a row is added to the change log at the top of the new file (version, date, change, decision IDs).
2. **Minor version** (e.g. 2.0 → 2.1) for review changes; **major version** (e.g. 2.1 → 3.0) for a restructure.
3. **Requirement IDs are permanent.** A changed requirement keeps its number and is marked "(changed vX.Y — decision ID)". A withdrawn requirement stays as a one-line entry. New requirements continue from the highest number. Numbers are never reused.
4. **Decision IDs are module-prefixed** (e.g. `SA3-D1`, `SA2-D1`). Decisions that another module must apply are listed in the deciding module's §0.2 as **Pending** until that module's review applies them.
5. **Share as soon as a module review closes:** send the changed file(s), with their change-log entries, to the development team. The team updates the matching Confluence page (title with the new version and date) and comments on the affected Jira tickets.
6. The combined files `FINAL-SuperAdmin-FR.md` and `FINAL-Agent-FR.md` (in this folder's parent and in `ERv2-sanitized/Docs/`) are **superseded** by the per-module folders and must not be edited. Developers read Confluence, not those files.
7. **Verify against same-day `dev` (DOCS-6).** Before writing or updating a "what exists today" section (§12), download the latest branches (`git fetch`) and read `origin/dev` of both repositories; record both commit ids in §12. A §12 older than the current `dev` must say so.
8. **One requirements source (DOCS-7).** When a module review closes, tell the tech lead which older documents it supersedes, so any Spec Kit feature built on them is re-based.

---

## Document Summary

This is the **build-ready functional specification for the Super Admin console** — the platform-owner application operated **only** by Expat Ready's internal team. It is the **GLOBAL control plane** of a multi-tenant, multi-country immigration SaaS: it defines and publishes the per-country **Immigration Packs** that every firm consumes, provisions and governs tenant firms, runs SaaS billing and entitlements, and owns platform-wide security, compliance, analytics, and configuration.

It spans **13 modules (SA-1 to SA-12, plus SA-1B)**. The centerpiece is **SA-1 Country & Immigration-Pack Management** — the mechanism that makes "add a new country with no code change" real, with versioned, effective-dated packs so every assessment and case is reproducible against the rules in force when it ran. The console is **global-first** (country is a first-class configurable dimension), enforces the **Global-vs-Local doctrine** (Super Admin owns global; firms own local), is built entirely from **in-house tooling — no third-party product tools** (only infrastructure rails), and treats **scalability, security-at-every-level, and performance** as per-feature mandates.

Read the **Detailed Scope Index** next for module-by-module scope at a glance. Each module then carries: a Module Index + Visual Overview (diagrams), Purpose & Goal, Users & Jobs-to-be-Done, deep Functional Design (per sub-function: how it works · world-class behaviour · screens · data flow), numbered functional requirements, business rules, states/lifecycle, entities/fields, user stories with Given/When/Then acceptance criteria, edge cases, GLOBAL-scope permissions, a Scalability·Security·Performance block, an honest "exists today vs NEW vs CHANGED" Reference Note, and Open Questions / Founder Decisions.

---

## Detailed Scope Index

Scope at a glance — what each module contains, without reading the whole document. (Lead phase: P1 = launch-Canada essentials · P2 = breadth · P3 = advanced.)

| # | Module | Scope at a glance | Lead phase | Current version |
|---|---|---|---|---|
| SA-1 | **Country &amp; Immigration-Pack Management** (the container) | Countries (Draft → Active ⇄ Suspended; suspend stops new firms only); per-country **versioned, date-controlled Country Pack**; draft → review → approve → publish with a **second person for production packs** (the Platform Owner or another Content publisher; the approver approves exactly what was submitted and does not edit — SR-Q5), scheduled publish in the country's timezone, rollback; validation, test run, diff, import / export, clone; completeness profiles (one Canada profile, kept by the Content publisher); firms read only their one country's pack, with each client's work pinned and newer rules adopted deliberately, with a reason; **firms see only the final questionnaire and the dynamic document checklist** — they may hide standard items that have no deadline, rename a step's client name, and add a document to one case with "Request a document" (W-15, W-17); English required, French optional for Release 1; no Quebec programs in Release 1. **The pack's content, and the resolver that turns it into questionnaires, checklists and forms, are SA-1B.** | P1 | v2.4 |
| SA-1B | **Content Pack Configurator** (the content and the resolver) | The library, authored once and reused — canonical fields flagged lead / prospect / case, field groups with placements and derived purposes, answer lists, reusable sections with rules, repeats and coverage, master documents with substitute sets and validity gates, master forms with editions and box maps, conditions, gates and scoring, the reference-table designer, government steps, regulator setup (the pack carries no required wording — SA1B-D20); **one configurator row per full combination** of Pathway (Individual / Corporate) › Program › Category › Sub-category, holding one line shape for sections, documents, forms and government steps, each with who it is for and an optional condition; **filings and routes** — a case holds filings, side by side for a family's separate permits and in sequence for two- and three-level provincial routes; person roles with a per-person questionnaire, checklist, forms and decision; one PQR with qualifier blocks and a capped lead form; the assessment output with verdict, reason and gap; startable and completeness checks (a programme is startable when every form on its row has a current edition); review dates with a weekly email to the content team; document expiry warns only; **no firm-added questions or firm questionnaire layer** — firms see only the output (W-17) | P1 | v1.4 |
| SA-2 | Tenant / Firm Management | Create firms by Super Admin or private sign-up link (country fixed; firm picks a Public plan; pays at sign-up only if the plan has no trial); per-plan trials; **one country per firm, locked**; business address, owner contact, billing email, optional account manager (an Admin or the Platform Owner), editable web address; saved views in the firm list; lifecycle Setting up → Trial / Active → Payment hold → Deleted, plus Security lock; health & usage vs limits; support access (look anytime; change only while the firm allows it — 7 days by default, revocable; firm told); owner cancellation, data download, deletion 90 days after hold (refused while a legal hold exists) | P1 | v2.24 |
| SA-3 | Subscription Plans & Entitlements | Plans with Draft → Active → Retired and Owner-approved changes on live plans (never by the requester — SA7-D51); the **feature catalogue** (about 30 features — one per left-menu module plus named extras — switched per plan; new-features-off; locked display); the **plan ladder** (each plan we sell includes everything in the plan below; prices rise); **four limits with real enforcement** (seats and active cases hard; storage warns, then hard after 14 days); the **downgrade check** (a firm moves down only when its usage fits); live entitlement resolution composed with firm state; no per-firm exceptions; **connecting the firm's own payment account is on every plan** — paid consultations and pay-by-card invoices need no extra (SA-Q1); extras are plan features with no separate price; plans are country-neutral (FD-68); prices owned by SA-4 (monthly + yearly, CAD) | P1 | v2.20 |
| SA-4 | SaaS Billing (Firm → Expat Ready) | One monthly + one yearly price per plan in CAD, pushed to the payment processor; price changes approved by an Owner (never the requester — SA7-D51) and applied at renewal with 30 days' notice; approved discounts, no add-ons; checkout through private sign-up links — **no card to start a trial** (the firm is created when the sign-up form is submitted and adds a card before the trial ends; plans without a trial take the card first); trial extension (≤ 90 days) and start-early; *(changed v3.10 — SA-4 v2.17)* during a trial the Owner may switch to any public plan, a smaller plan only if usage fits (W-18, W-22); tax numbers are asked at trial end, before the first invoice (R9-19); invoices with sales tax from the business address; **failed payments: 14 days' full access, notices on days 0, 7, 12 to the billing email, the Owner and the Admins, then payment hold; return by paying the overdue invoice + a new period**; owner self-service plan changes (upgrades now, downgrades at renewal) and cancellation; no refunds except three rules; the firm's billing screen; signed, once-only processor notifications (the "Payment events" screen, under Advanced). *(changed v3.11 — SA-4 v2.21)* Manual billing and the revenue dashboard deferred | P1 | v2.21 |
| SA-5 | **Templates — ExpatReady side** *(file: Global Templates)* | ExpatReady's catalogue of ready-made templates — **automatic messages** (one per event), **library** starters and documents — and ExpatReady's **own emails** to firms. Firms use ExpatReady's wording until they edit it ("use until you edit"); ExpatReady changes reach firms with a **7-day notice** and "Keep my current wording", or at once for an urgent correction. **Automatic messages run from day one** — nothing waits for a review; the one **Automatic messages** page (AG-12) shows each message with a choice *Send automatically · Ask me first · Off* (AG16-11); a message that needs a firm detail not yet filled in is not sent and the firm sees a note (SA05-R9a, SA05-R9b). The **Content publisher** writes and publishes templates; the **Platform Owner publishes every ExpatReady email** and marks urgent corrections (SR-Q2). WhatsApp versions of short client messages; English required, French optional; sending rules by purpose (service or marketing) and route; unsubscribe / STOP. Firm-side screens are specified in the Agent console (AG-12). *(changed v3.11 — SA5-X34; v3.12 — AG16-54 #5)* | P1/P2 | v3.4 |
| SA-6 | RBAC — Roles & Permissions | **Catalogue of 256 firm permissions** with default roles; **firm starter roles published by Expat Ready in Super Admin (six at launch)** *(changed v3.7 — SA6-D12; not built — R28)* (Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only), the same for every plan; changes to a starter role are approved by a second person — the Platform Owner or an Admin, never the requester (SR-Q1); **firm custom roles** (Owner and Admin copy a starter role and edit the copy; several roles per person; server-side checks on every save) built in an editor that shows **30 plain-language capabilities**, with an **Advanced** view of every permission (R2, SR-Q8); a reason on a role change is optional except when giving or removing the Owner role (R36); **no two-person approval for firm actions** (SR-Q1); approval items go to every holder of the approval permission, with no licence marking (SA-Q3); **ExpatReady staff roles are the six in code** — the staff-role editor is parked (R8); **one system, two role sets** (Expat Ready staff roles and firm roles never mix) *(changed v3.11 — SA6-X10)* | P1 | v3.9 |
| SA-7 | Platform Users (Internal Team) | Expat Ready staff accounts in their own sign-in group: **email + password + mandatory second step** (passkey / app / recovery codes; company Google sign-in in Phase 2); **six fixed roles** — Platform Owner, Admin, Support, Billing, Content publisher, Auditor — several per person, changed by a release (staff-role editor parked; the code registry is the master — R8, SR-Q6); only an Owner invites staff and gives roles, at least one active Owner at all times; invite (company domains only) → deactivate (login factors destroyed, end state; never blocked — open tickets back to the queue, account manager's firms moved with one "Move all N firms to ___" choice or to the shared inbox) → reactivate; Reset MFA; one auto-logout setting for staff only (60 min / 12 h, never off in production) and one session at a time for staff and firm users (clients may be signed in on several devices; client questionnaires auto-save); step-up (fixed 5 minutes) before support sessions, staff access changes, refunds and settings; staff list, Activity list, My account; two staff emails *(changed v3.11 — SA7-X19)* | P1/P2 | v2.17 |
| SA-8 | Integrations & Infrastructure Rails | The outside services the platform runs on: **shared email** (Amazon SES — firms email clients from day one under their own name, replies to the firm) and the Google / Microsoft apps for **firms' own mailbox and calendar**; the **WhatsApp provider connection** for firms' own WhatsApp (ExpatReady submits the starter message versions when a firm connects; opt-in required; email fallback); **file storage** (S3, Canada, encrypted) with **virus scanning** before staff open any upload (PDF, JPG, PNG, HEIC, Word, Excel, TIFF, ZIP); **payments** (Stripe Billing + Tax, Owner-confirmed go-live, daily proration; a firm's own payment account through the provider's hosted sign-up, on every plan); **in-house e-sign settings** (ExpatReady's default consent text and fixed, factual certificate wording published by the Content publisher; evidence always time, IP, device and consent; a firm may replace the consent text). Expat Ready's keys stay with the engineer — a read-only **Integrations status page** with alerts, a "what to do" line on each red item, failed invoice copies retried automatically, and a stuck-jobs line. WhatsApp and calendar linking Release 1; SMS and per-country routing later *(changed v3.10 — SA-8 v2.5; v3.11 — SA8-X19)* | P1/P2 | v2.10 |
| SA-9 | Platform Analytics | **One "Business" page** — about eight numbers counted nightly (firms by status, new and cancelled firms this month, trial conversion, monthly active users, a few module counts) against last month, a feature-usage table (firms using each feature, last 30 days) and an audited CSV; **feature-usage events recorded from day one**; revenue comes from Stripe's reports, with no money figure on the page. Parked: revenue dashboards, multi-currency, per-country views, alert rules, health graphs (a stuck-queue line sits on the SA-8 status page) *(changed v3.11 — SA9-X6; R11)* | P1 *(P-1)* | v2.4 |
| SA-10 | Support | **A simple queue:** a ticket form ("what's wrong" + screenshot; support sets the priority), one queue with the oldest unanswered first, manual assignment, internal notes never visible to firms, email on a support reply, "open support session" link from a ticket, tickets return to the queue when staff leave, ticket age and "waiting on firm"; first-response time recorded from day one. Parked: SLA clocks, escalation, routing, canned replies, knowledge base, satisfaction survey, metrics *(changed v3.11 — SA10-X7; R12)* | P1 *(P-2)* | v2.7 |
| SA-11 | Audit, Compliance & Data Governance | Platform-wide **append-only audit log** (insert-only database grant, actor type, failed writes retried with an alarm; hash-chain integrity check and off-site anchoring as built); support-session accountability; the **activity log is kept 7 years** — one number, firms cannot shorten it; **legal holds placed by the Platform Owner only** (a hold blocks deletion and the purge of a cancelled firm); a **written data-location statement** (Canada) with sub-processors; ExpatReady's own breach register (a plain record); **consent records** per purpose, including WhatsApp opt-in, with sending rules by route; **erasure of approved "delete my data" requests** — on by default, after a 7-day grace from approval, stopped in an emergency by the kill switch of the "Data erasure" flag; a firm's "keep closed client files for N years" is a reminder, not a lock *(changed v3.11 — SA11-X7; G-Q1 – G-Q6)* | P1/P2 | v2.12 |
| SA-12 | Feature Flags & Platform Configuration | Flags with **two scopes** (platform on / off + per-firm override); server-side check that the flag **and** the plan allow a feature; "why is this on for this firm"; **kill switch** with a reason (also the emergency stop for data erasure); **platform-wide maintenance mode** with a bilingual message; **one platform banner** (EN / FR, start / end); every change audited; no flag can switch off security; staff email domains and auto-logout under Advanced, Owner only. Parked: percentage rollouts, user and country scopes, per-firm maintenance, banners and rate limits *(changed v3.11 — SA12-X8; R14)* | P1/P2 *(maintenance mode and banner P1 — P-4, P-5)* | v2.9 |

---

## Cross-Cutting Mandates — Scalability, Security & Performance + In-House + Global (at every level)

Mandatory in every module (and re-stated per module in its `Scalability · Security · Performance` block):

- **GLOBAL plane / Global-vs-Local doctrine.** The Super Admin owns the global plane (countries, packs, plans, global templates, master/reference data, platform config). Firms (LOCAL) consume but never modify global data. Cross-tenant aggregate visibility (analytics) is GLOBAL-only; access into a single firm's data is only via **audited impersonation** (SA-2) — never a silent drill-through.
- **Country-configurable / global-first.** Country is a first-class configurable dimension. Programs, rules, calculators, forms, checklists, stages, reference data, regulator, and languages all come from the **versioned Country Pack** (SA-1) — never hardcoded. Multi-currency (FX→reporting currency), timezone-awareness, and bilingual (EN/FR + pack languages) are first-class.
- **In-house Doers — no third-party product tools.** Every product capability is in-house (Signer, Mailer, Scheduler, Messenger, Biller, etc.). The only third parties are **infrastructure rails** (payment processor, email/SMS delivery gateway, cloud storage, identity provider) + optional connectors to a firm's **own** mailbox/calendar. (SA-8.)
- **Security at every functional level.** Default-deny RBAC with GLOBAL/LOCAL/country scopes; tenant isolation enforced by construction (`firm_id` + Postgres RLS — target); least privilege; immutable audit; encrypt-all secrets; PII protection (PIPEDA). Security is specified per feature, not just platform-wide.
- **Performance (highest priority).** DB-side aggregation / materialized rollups (never per-request cross-tenant scans); indexed, paginated reads; async/background for heavy work; cached, tenant-namespaced hot data with explicit invalidation. Called out per module.
- **Defaults first (Rule 9).** Every setting that is kept has a default and a place: on the main screen, under a collapsed **Advanced** section, or fixed in code or deploy configuration. A new firm, and a new ExpatReady staff member, works on the defaults with no set-up and no support call. Firm screens use plain outcome wording and never show permission keys.

> **Note on this assembly:** modules below are golden per-module specs, each self-contained with its own Module Index and Visual Overview. Two known polish items for a follow-up pass: (1) heading-level normalization across modules (esp. SA-11); (2) confirm the canonical label "Country Pack" vs "Immigration Pack" (SA-1) and the permission prefix `system/*` vs `global/*` — both surfaced in the modules' Open Questions.

---

## Key Product Rules — status 12 Oct 2026

Rules decided on 10–12 Oct 2026 that run through several modules. The owning module holds the detail.

- **Automatic messages run from day one** (SA-5; SA05-R9a, SA05-R9b). Nothing is held for a review; the one Automatic messages page (AG-12) lets the firm choose Send automatically · Ask me first · Off for each message (AG16-11). A message that needs a firm detail not yet filled in is not sent, and the firm sees a note naming the missing detail.
- **ExpatReady's own emails are published by the Platform Owner** (SA-5, SA-7; SR-Q2). The Content publisher drafts and previews them, and publishes firm starter templates and the default e-sign wording.
- **No two-person approval for firms** (SA-6; SR-Q1, SR-Q1b, SR-Q1c). Whoever holds the right acts alone; four-eyes on government forms and the Team safeguards switch are removed. Two-person rules stay on the ExpatReady side: production packs, live plan and price changes, and firm starter roles.
- **Escalation and at-risk marks** are two separate firm settings, both **on by default**, under Advanced (SR-Q1c).
- **A firm's own payment account is available on every plan** (SA-3; SA-Q1).
- **Firms see only the final questionnaire and the dynamic document checklist** (SA-1, SA-1B; W-17). They may hide standard items that have no deadline (W-15) and add a document to one case with "Request a document".
- **Data erasure is on, with a 7-day grace and a stop switch** (SA-11, SA-12; G-Q1, W-11). An approved "delete my data" request is erased 7 days after approval; ExpatReady can stop all erasure by tripping the kill switch of the "Data erasure" flag. The firm's keep-period is a reminder, not a lock (G-Q4).
- **Legal holds are placed by ExpatReady only** — the Platform Owner (SA-11; G-Q5).
- **The activity log is kept 7 years** — one number for firm entries and ExpatReady staff actions (SA-11; R9-pass ruling 3).
- **Six ExpatReady staff roles** — Platform Owner, Admin, Support, Billing, Content publisher, Auditor (SA-7; SR-Q3).
- **Defaults first (Rule 9)** is a design principle for every module — see Cross-Cutting Mandates.

---

## 1. Purpose of This Document

This document defines the functional requirements for the **Super Admin Console** of Expat Ready — a separate, access-controlled web application used exclusively by **Expat Ready's own internal team** to operate the platform. It is not accessible to immigration firms (tenants) or their clients.

**Scope boundary.** This document covers only the Super Admin plane. The Agent/Firm console (the tenant-facing product) is specified separately.

**Design doctrine.** Every entity and setting in the platform belongs to exactly one of two planes:

- **Global plane (Super Admin owned):** Platform-wide configuration, country definitions, immigration program data, subscription plans, system templates, reference data, regulatory body definitions, and platform analytics. Created and curated by Expat Ready's team. Firms consume but cannot modify global-plane data.
- **Local plane (firm owned):** Each tenant's prospects, clients, cases, invoices, staff, firm-specific templates, and operational configuration. Isolated per tenant by Row-Level Security in the database; Super Admin can access it only through a documented, audited impersonation mechanism.

**The centerpiece of this document** is Module SA-1: Country and Immigration-Pack Management. Expat Ready is a global immigration platform that launches with Canada but is designed from day one to serve multiple destination countries. Every significant design decision in the Super Admin console is made with that global-first stance in mind.

---

## 2. Super Admin Persona — Staff Roles

The "Super Admin" is not a single person. Expat Ready's internal team (4–6 people at Canada launch) work under **roles**. **Six fixed roles** are pre-loaded and are changed by a release, not on a screen; **a person can hold several**. The staff-role editor is parked and the code registry is the master (SA-7 v2.15, SA7-D2, SA7-D8, SR-Q3, SR-Q6). Exact permissions: SA-7 Appendix A. *Retired role names (history only, before 12 Oct 2026): Staff manager, Content author, Content approver, Firm onboarding / Account manager, Billing operations, Security & audit, Platform engineer.*

| Starter role | Responsibilities | Typical actions |
|---|---|---|
| **Platform Owner** | Everything; the only role that can make someone an Owner, approve live plan and price changes, close a firm account, apply and lift a security lock, change security settings, publish every ExpatReady email and place legal holds. Go-live needs two Owners; there is never zero. | Approve plan and price changes; close a locked firm; publish an ExpatReady email; place a legal hold. |
| **Admin** | Brings in firms and looks after them (the account manager is an Admin or the Platform Owner); feature flags; creates and approves firm starter roles (never their own change); deactivates a leaver, requires a password change, ends a session; sees anyone's Activity; watches the Integrations status page. | Create firms, send sign-up links, reassign a firm's account manager, check stalled set-ups, switch feature flags. |
| **Support** | Answers firm issues. | Support sessions (read-only unless the firm allowed changes — SA-2); plan and billing status; payment events log (view only). |
| **Billing** | SaaS billing. | Plans, price change requests, discount list and discounts, refunds, overdue list, plan changes for a firm, payment events (view and re-run). |
| **Content publisher** | Writes the country pack for assigned countries and is the second person for production packs (SA1-D6): the approver approves exactly what was submitted, never edits, and never approves their own draft. Also writes and publishes firm starter templates and the default e-sign wording; drafts and previews ExpatReady's own emails (the Platform Owner publishes them); keeps the completeness profile. | Draft and submit pack changes (CRS grid, IMM forms, checklists); approve or reject a colleague's change with a reason; publish a starter template. |
| **Auditor** | Oversight, read-only. | Audit trail, anyone's activity, all support sessions, ExpatReady's breach register. |

**Permissions model.** Staff roles hold only `GLOBAL` (`system/*`) permissions, never the `LOCAL` permissions of firm roles. Staff sign in through their own sign-in group — email + password plus Expat Ready's own second step (company Google sign-in in Phase 2) — entirely separate from firm staff and clients (SA-7). One permission system serves both planes, with two role sets that never mix: staff roles hold only `system/*` permissions and firm roles only `agent/*` (SA-06, SA6-D4).

---

## 3. Country Pack Model Overview

A **Country Pack** is the complete, versioned configuration set that defines how Expat Ready operates for a specific destination country. Super Admin creates and publishes packs; each firm consumes the pack for its one country, set at provisioning and never changed (FD-68 · SA3-D1).

### 3.1 What a Country Pack Contains

A Country Pack is a structured container composed of the following content domains. Each content domain can be versioned, effective-dated, and exported/imported independently or as a bundle.

| Content Domain | Description | Examples (Canada) |
|---|---|---|
| **Country definition** | Name, ISO code, languages (English required), currency, official timezone, regulator setup. | Canada · ISO 3166: CA · English (French optional, R1) · CAD · Eastern Time · CICC + law societies |
| **Programs and streams** | The immigration programs the country offers, organized in a hierarchy: Pathway → Program → Stream/Category → Sub-Category. Each level has eligibility rules and is individually activatable. | Pathway: Economic → Program: Express Entry → Stream: Federal Skilled Worker |
| **Eligibility rules** | The structured eligibility criteria for each program/stream — minimum thresholds, required fields, qualifying conditions. Stored as configurable rule sets, not hardcoded logic. | FSW: CLB 7, 1 year skilled work exp, 67+ FSW points |
| **Scoring / calculator configuration** | The point tables, scoring grids, factor weights, and conversion tables that feed the eligibility calculators. | CRS scoring grid, CLB-to-score conversion by test type, FSW six-factor grid |
| **Government forms + field mappings** | The library of government forms for that country (by form number and edition date), plus the field-level mapping from the platform's canonical data model to each form field. | IMM 0008 (Oct 2024 edition), IMM 5406, IMM 5476 |
| **Document checklists** | The master list of required documents per program/stream, categorized by document type. | Police clearance, ECA report, IELTS TRF, Employment reference letter |
| **Case stages and workflow templates** | Default stage pipelines and workflow blueprints for each case type in that country. | Express Entry FSW: ITA Received → Docs → Forms → Internal Review → Submitted → ADR → Decision |
| **Reference and occupation data** | Occupation code catalogues (e.g. NOC/TEER for Canada), language tests and their CLB equivalence tables, wage tables, settlement fund schedules, fee schedules. | NOC 2021 TEER 0/1/2/3 codes, IELTS CLB table, proof-of-funds by family size |
| **Regulator and compliance body** | The regulatory body for immigration consultants/lawyers in that country, with license number format and validation rules. | Canada: CICC (RCIC license: Rxxxxxxxx format) |
| **Languages and localization** | The languages the pack supports for client-facing content. Governs which language options appear in the firm's portal and questionnaires for this country's programs. | English (en-CA), French (fr-CA) |
| **Automation templates** | Pre-built Conductor/Doer automation blueprints specific to this country's programs (e.g., ITA deadline alert for Express Entry). | ITA 60-day expiry alert, Draw cut-off tracker |

### 3.2 Pack Versioning and Lifecycle

Every Country Pack (and each content domain within it) is versioned using a sequential version number and an effective date. The lifecycle follows a draft-to-publish pattern.

```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED (effective on its date) · superseded when a newer version takes effect
```

- **DRAFT**: Work in progress. Not visible to firms. Content publishers can edit freely.
- **IN_REVIEW / APPROVED**: Submitted for approval; a **production** pack must be approved and published by someone other than its author and submitter (SA-1-61). A rejected draft returns to DRAFT, editable.
- **PUBLISHED**: Live for the firms of that country from its effective date (scheduled dates use the country's timezone). Rollback re-points to an earlier version with a reason.
- **SUPERSEDED**: A previous version, retained for historical and auditability purposes. Assessments made under a superseded version remain linked to that version.

**Versioning granularity.** The entire Country Pack has a top-level version, but individual content domains (e.g., scoring tables, form editions) carry their own version and effective date. This allows, for example, a new CRS scoring table to be published without bumping the entire pack version.

**Immutable history.** Published versions of any content domain are immutable. A change always creates a new version; old versions are retained and linkable (assessments, cases, and generated forms are stamped with the version of the data used to produce them, making them reproducible and auditable).

### 3.3 Clone a Country as Starting Template

When adding a new destination country, Super Admin may clone an existing country pack as a structural starting point. The clone creates a new draft pack with all structural content (program hierarchy, workflow stages, checklist categories, automation templates) copied but all country-specific values (form numbers, point tables, regulatory body) cleared, ready for the Content publisher to fill in.

### 3.4 Bulk Import and Export

A Country Pack can be exported as a structured manifest (JSON or XLSX). The manifest covers all content domains at a point-in-time version. It can be re-imported into any Expat Ready environment (dev, staging, production) to seed or update a pack. Field validation runs on import; import failures produce a row-level error report.

### 3.5 Pack Preview and Validation

Before publishing, Content publishers can run a **pack validation**:
- All required content domains are present and non-empty.
- All eligibility rules reference valid fields in the canonical data model.
- All scoring tables are mathematically consistent (no gaps, no overlapping brackets).
- All form field mappings reference canonical fields that exist.
- At least one government form is present.
- At least one workflow template per active program is present.

Validation produces a structured report: pass / warning / error per check. Publish is blocked if any error-level checks fail.
