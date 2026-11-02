## PDF Studio (AG-19) — developer handover, 26 Oct 2026

Product owner: the product owner. Everything below is approved (the product owner, 26 Oct 2026). All paths are inside `team-workspace/`. Older versions are in each folder's `_archive/`. Where an older note below names an older version, use this list.

**1. Documents and current versions**

| Document | Current file | What it holds for PDF Studio |
|---|---|---|
| AG-19 PDF Studio | `FINAL-Agent-FR/AG-19-pdf-studio_v1.10_2026-10-26.md` | The epic. Start at Part A. 20 cards, AG-19-1 – AG-19-20. |
| AG-09 Documents | `FINAL-Agent-FR/AG-09-document-management_v1.26_2026-10-26.md` | Parts and versions (AG-9-65), status and Accept new files (AG-9-26), Replace and Remove (AG-9-67), To file list (AG-9-68), password-protected uploads (AG-9-69). |
| CP-01 Client portal | `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.12_2026-10-26.md` | Portal uploads add parts; password prompt (CP-1-97); phone scan (CP-1-41). |
| AG-07 Case core | `FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.10_2026-10-26.md` | Binder line: Open in PDF Studio, the quiet note, Accept new files (AG-7-15 rules 3, 11, 12). |
| AG-10 Communication hub | `FINAL-Agent-FR/AG-10-communication-hub_v1.25_2026-10-25.md` | Email attachments filed to a line or the To file list; portal message attachments. |
| AG-02 Leads and prospects | `FINAL-Agent-FR/AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md` | Lead and prospect documents; To file items stay on the person at conversion. |
| AG-16 Firm settings | `FINAL-Agent-FR/AG-16-firm-settings-and-integrations_v1.24_2026-10-25.md` | Recently deleted screen for removed and replaced files. |
| AG-08 Questionnaire | `FINAL-Agent-FR/AG-08-smart-questionnaire_v1.14_2026-10-25.md` | Document-request card: password prompt and phone scan. |
| AG-15 Portal management | `FINAL-Agent-FR/AG-15-client-portal-management_v1.14_2026-10-25.md` | Portal upload pointers: phone scan and password prompt. |
| SA-01B Content packs | `FINAL-SuperAdmin-FR/SA-01B-content-pack-configurator_v2.0_2026-10-26.md` | Size limit and file-name pattern per document type (SA-1B-106). |
| SA-03 Plans | `FINAL-SuperAdmin-FR/SA-03-subscription-plans-and-entitlements_v2.29_2026-10-25.md` | Studio is on every plan; no catalogue row. |
| SA-06 Permissions | `FINAL-SuperAdmin-FR/SA-06-rbac_v3.15_2026-10-25.md` | No new key; Studio uses `agent/document:edit`. |
| Glossary | `FINAL-Agent-FR/99-Phasing-and-Glossary_v1.20_2026-10-26.md` | Section "Key terms — PDF Studio (AG-19)". |
| 00-Overview | `FINAL-Agent-FR/00-Overview_v1.28_2026-10-26.md` | AG-19 scope row; the main-menu gap. |

Decisions: `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions", AG19-D1 – AG19-D73. Each epic lists the ones that change it in "Decisions that change this epic".

**2. Build order**

1. AG-19-1, the engine spike, first. It proves redaction, compression, the client unlock and the phone bar. Its report confirms the spike values: the Standard and Strong levels, the largest session and the "Already small" threshold.
2. Then AG-09's data model: AG-9-65 (parts), then AG-9-67, AG-9-68 and AG-9-69.
3. Then the AG-19 cards in the order of AG-19 Part A5.

**3. Before build**

- A short legal check of the licence list (AG19-D15).
- Add the LGPL libraries (server only, unmodified) to the allow-list of the licence gate `check:licence-copyleft` (`ERv2-sanitized/docs/onboarding/07-gates-catalog.md:574`).

**4. Dependencies outside AG-19 (they do not block the start)**

- SA-8-36, virus-scan wiring of stored files. Without it no file becomes clean, so AG-19-6 cannot reach Accepted (AG-19 A5 row 5).
- AG-09 open questions 5 (virus-scan engine) and 6 (storage vendor and data residency), in AG-09 §13.
- The staff main menu has no owner epic, so the position of the "PDF Studio" menu item is open (AG19-D23; 00-Overview, "Not decided — no epic owns the staff main menu").
- AG-07 does not yet record which files went into a submission (AG-07 D9 Q55). Until it does, only Accepted files are protected as evidence; "submitted" protection waits for it (AG19-D29).

**5. Known accepted limitation**

- When staff close or reload the browser page with unsaved Studio work, the browser shows its own fixed warning text. A page cannot set those words (AG19-D37; AG-19-3 rule 12).

---

**Updated 25 Oct 2026, after AG19-D70 (version references):** these files have a newer version than the lists below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.27_2026-10-25.md`, `AG-09-document-management_v1.25_2026-10-25.md`, `AG-19-pdf-studio_v1.9_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.11_2026-10-25.md`. Unchanged since the note below: `99-Phasing-and-Glossary_v1.19_2026-10-25.md` and `SA-01B-content-pack-configurator_v1.14_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D70). In short: a government form that needs a password to open is recognised once it is opened. The client upload component sends `isXfaForm` = yes with the upload, so **Open in PDF Studio** is hidden; for an email attachment, PDF Studio asks for the password, refuses the form, leaves the stored file untouched, then sets `isXfaForm` = yes (D70; AG-19-5 rule 7). AG-19 Q20 is closed.

**Updated 25 Oct 2026, after the final block (version references; AG19-D66 – AG19-D69 applied):** these files have a newer version than the lists below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.26_2026-10-25.md`, `99-Phasing-and-Glossary_v1.19_2026-10-25.md`, `AG-09-document-management_v1.24_2026-10-25.md`, `AG-19-pdf-studio_v1.8_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.10_2026-10-25.md`. Super Admin: `SA-01B-content-pack-configurator_v1.14_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D69). In short: a government form is never altered anywhere and is filled on the Forms tab (D66; AG-19-5 rule 8); a Studio save made only from files added after the Accept keeps the line Accepted (D67; AG-9-26 rule 7); a locked PDF the client unlocks that is signed is unlocked and loses its signature, a locked government form uploads as is with the label (D68; AG-9-69 rule 5a); every writer default is approved, and the spike-dependent values are confirmed in the AG-19-1 report (D69). AG-09 open questions 49 and 50 are closed. New: AG-19 Q20.

**Updated 25 Oct 2026, final (version references; AG19-D62 – AG19-D65 and the PDF Studio review fixes applied):** these files have a newer version than the lists below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.25_2026-10-25.md`, `99-Phasing-and-Glossary_v1.18_2026-10-25.md`, `AG-07-case-core-and-delivery_v3.9_2026-10-25.md`, `AG-09-document-management_v1.23_2026-10-25.md`, `AG-19-pdf-studio_v1.7_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.9_2026-10-25.md`. Super Admin: `SA-01B-content-pack-configurator_v1.13_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D65). In short: a Studio save keeps every part it did not use on the line, after the result (D62; AG-9-65 rule 6); every To file item offers Open in PDF Studio and **Save and file to line** (D63; AG-19-6 rule 2a, AG-9-68 rule 12); on a client upload a government form or a signed PDF is never unlocked automatically (D64; AG-9-69 rule 5); Studio covers the lead, prospect, client, case and corporate case (D65). Values the writer chose are marked "(writer default — confirm)" in AG-19 and AG-09. New AG-09 open questions 49 and 50.

**Updated 25 Oct 2026, newest (version references; AG19-D61 applied; AG-19 build path cleaned):** these files have a newer version than the lists below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.24_2026-10-25.md`, `AG-09-document-management_v1.22_2026-10-25.md`, `AG-10-communication-hub_v1.25_2026-10-25.md`, `AG-19-pdf-studio_v1.6_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.8_2026-10-25.md`. Still current: `SA-01B-content-pack-configurator_v1.12_2026-10-25.md`, `99-Phasing-and-Glossary_v1.17_2026-10-25.md`, `AG-08-smart-questionnaire_v1.14_2026-10-25.md`, `AG-15-client-portal-management_v1.14_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D61). In short: a file a client attaches to a portal message shows in the conversation and also goes to the record's To file list, where a locked file uploaded as is carries "Password protected" (D61; AG-9-68 rule 2d, AG-9-69 rule 6). AG-19 v1.6 and AG-09 v1.22 also remove version tags and history notes from the build path (no rule changed); the removed text is kept word for word in AG-19 D6.1 and AG-09 §14.

**Updated 25 Oct 2026, latest (version references; AG19-D57 – AG19-D60 applied):** these files have a newer version than the lists below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.23_2026-10-25.md`, `AG-09-document-management_v1.21_2026-10-25.md`, `AG-10-communication-hub_v1.24_2026-10-25.md`, `AG-19-pdf-studio_v1.5_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.7_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.12_2026-10-25.md`. Still current: `99-Phasing-and-Glossary_v1.17_2026-10-25.md`, `AG-08-smart-questionnaire_v1.14_2026-10-25.md`, `AG-15-client-portal-management_v1.14_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D60). In short: a restore keeps an Accepted line Accepted unless the file it displaces was accepted (D57); the client password prompt is one rule of the shared client upload component, portal message attachments included (D58); the file-name token is `{documentType}` (D59); a used QR code shows "This code has already been used. Ask for a new code on the computer." (D60).

**Updated 25 Oct 2026, later (version references; AG19-D50 – AG19-D56 applied):** these files have a newer version than the 25 Oct list below. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.22_2026-10-25.md`, `99-Phasing-and-Glossary_v1.17_2026-10-25.md`, `AG-08-smart-questionnaire_v1.14_2026-10-25.md`, `AG-09-document-management_v1.20_2026-10-25.md`, `AG-10-communication-hub_v1.23_2026-10-25.md`, `AG-12-templates_v2.10_2026-10-25.md`, `AG-15-client-portal-management_v1.14_2026-10-25.md`, `AG-16-firm-settings-and-integrations_v1.24_2026-10-25.md`, `AG-19-pdf-studio_v1.4_2026-10-25.md`. Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.6_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.11_2026-10-25.md`. Older versions are in each folder's `_archive/`. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D56). The SA-05 wording for the automatic "password-protected file" email is no longer pending: the email is withdrawn (AG19-D50).

**Updated 25 Oct 2026 (version references):** files with a newer version since the 23 Oct version references, and their current versions. Agent (`FINAL-Agent-FR/`): `99-Phasing-and-Glossary_v1.16_2026-10-25.md`, `AG-01-firm-setup-and-onboarding_v1.26_2026-10-25.md`, `AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md`, `AG-05-retainer-and-agreements_v1.14_2026-10-25.md`, `AG-06-billing-and-payments_v1.14_2026-10-25.md`, `AG-07-case-core-and-delivery_v3.8_2026-10-25.md`, `AG-08-smart-questionnaire_v1.13_2026-10-25.md`, `AG-09-document-management_v1.19_2026-10-25.md`, `AG-10-communication-hub_v1.22_2026-10-25.md`, `AG-12-templates_v2.9_2026-10-25.md`, `AG-13-tasks-reminders-notes-and-activity-audit_v1.18_2026-10-25.md`, `AG-15-client-portal-management_v1.13_2026-10-25.md`, `AG-17-corporate-cases-and-lmia_v0.13_2026-10-25.md`, `AG-18-data-import-and-migration_v1.9_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.10_2026-10-25.md`, `SA-03-subscription-plans-and-entitlements_v2.28_2026-10-23.md`, `SA-06-rbac_v3.15_2026-10-25.md`. Still current from 23 Oct: `00-Overview_v1.21_2026-10-23.md`, `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md`, `AG-19-pdf-studio_v1.3_2026-10-23.md`, `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md`. Older versions are in each folder's `_archive/`. Where this note names an older version of one of these files, use the one listed here.

**Updated 23 Oct 2026 (version references):** files changed on 23 Oct and their current versions. Agent (`FINAL-Agent-FR/`): `00-Overview_v1.21_2026-10-23.md`, `99-Phasing-and-Glossary_v1.15_2026-10-23.md`, `AG-02-prospect-lead-sales-crm_v2.3_2026-10-23.md`, `AG-07-case-core-and-delivery_v3.6_2026-10-23.md`, `AG-09-document-management_v1.18_2026-10-23.md`, `AG-10-communication-hub_v1.20_2026-10-23.md`, `AG-12-templates_v2.8_2026-10-23.md`, `AG-15-client-portal-management_v1.12_2026-10-23.md`, `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md`, `AG-19-pdf-studio_v1.3_2026-10-23.md` (the new module PDF Studio). Client portal: `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.8_2026-10-23.md`, `SA-03-subscription-plans-and-entitlements_v2.27_2026-10-23.md`, `SA-06-rbac_v3.13_2026-10-23.md`. Older versions are in each folder's `_archive/`. Where this note names an older version of one of these files, use the one listed here. Decisions: `TEMPLATE-MAP-working_2026-10-10.md`, section "AG-19 review — decisions" (AG19-D1 – AG19-D49).

**Updated 21 Oct 2026:** AG-02 v2.0 is now handed over and 25 epics have new versions. Current versions and how to start: `DEV-HANDOVER-AG02_2026-10-21.md`. Where this note names an older version, use the one listed there.

# Developer hand-over: where we are and what to build (18 Oct 2026)

Product owner: the product owner. **This note is the starting point for the developer team.** It replaces `DEV-HANDOVER-AG07-AG16_2026-10-18.md`, which covered only two epics.
All paths are inside `team-workspace/`. "Card" means a build card (`FINAL-SuperAdmin-FR/BUILD-CARD-STANDARD_2026-10-17.md`). "Epic" means one requirement document.

## 1. Where we are (status at a glance)

Four groups are finished and handed over: **Super Admin (SA-01 to SA-12)**, **AG-01**, **AG-16** and **AG-07**. Every other Agent epic and the client portal are **not reviewed yet. Do not start them.**

| Status | Meaning |
|---|---|
| **Handed over** | Reviewed by the product owner. Build from it. |
| **Updated 18 Oct** | Handed over earlier; changed again on 18 Oct. Re-read the change log. |
| **Not reviewed yet — do not start** | Its review has not happened. The text may still change. |

### Super Admin (reviewed 10–12 Oct, including the Rule 9 passes)

| Module | File and version | Status | Notes |
|---|---|---|---|
| SA-01 Country and immigration packs | `SA-01-country-and-immigration-pack-management_v2.7_2026-10-18.md` | Updated 18 Oct | Old format. |
| SA-01B Content pack configurator | `SA-01B-content-pack-configurator_v1.8_2026-10-23.md` *(path updated 23 Oct)* | Updated 18 Oct | Old format. A v2.0 rewrite is pending; see section 8. |
| SA-02 Tenant firm management | `SA-02-tenant-firm-management_v2.24_2026-10-12.md` | Handed over | Unchanged since 12 Oct. |
| SA-03 Subscription plans | `SA-03-subscription-plans-and-entitlements_v2.27_2026-10-23.md` *(path updated 23 Oct)* | Updated 18 Oct | Old format. |
| SA-04 SaaS billing | `SA-04-saas-billing_v2.22_2026-10-17.md` | Handed over | Old format. |
| SA-05 Global templates | `SA-05-global-templates_v3.6_2026-10-17.md` | Handed over | ExpatReady side only; firm-side template management waits for the AG-12 review. |
| SA-06 RBAC | `SA-06-rbac_v3.13_2026-10-23.md` *(path updated 23 Oct)* | Updated 18 Oct | Old format. |
| SA-07 Platform users | `SA-07-platform-users_v2.17_2026-10-17.md` | Handed over | Old format. |
| SA-08 Integrations and rails | `SA-08-platform-integrations-and-infrastructure-rails_v2.10_2026-10-17.md` | Handed over | Old format. |
| SA-09 Analytics and observability | `SA-09-platform-analytics-and-observability_v2.4_2026-10-12.md` | Handed over | Unchanged since 12 Oct. |
| SA-10 Support | `SA-10-support_v2.8_2026-10-14.md` | Handed over | Old format. |
| SA-11 Audit, compliance, data governance | `SA-11-audit-compliance-and-data-governance_v2.13_2026-10-18.md` | Updated 18 Oct | Old format. |
| SA-12 Feature flags and configuration | `SA-12-feature-flags-and-platform-configuration_v2.9_2026-10-12.md` | Handed over | Unchanged since 12 Oct. |

### Agent console (firm side)

| Module | File and version | Status | Date(s) | Notes |
|---|---|---|---|---|
| AG-01 Firm setup and onboarding | `AG-01-firm-setup-and-onboarding_v1.23_2026-10-18.md` | **Handed over, updated 18 Oct** | Reviewed 13 Oct; gap check 18 Oct | Old format. Gap-checked 18 Oct. |
| AG-16 Firm settings and integrations | `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md` *(path updated 23 Oct)* | **Handed over, updated 18 Oct** | Reviewed 14–18 Oct; gap check 18 Oct | Old format, 13 full cards. Gap-checked 18 Oct. |
| AG-07 Case core and delivery | `AG-07-case-core-and-delivery_v3.6_2026-10-23.md` *(path updated 23 Oct)* | **Handed over (v3.0)** | 18 Oct | **New format (X-1).** The only build source. v2.13 is archived. |
| AG-02 Prospect, lead, sales CRM | `AG-02-prospect-lead-sales-crm_v2.3_2026-10-23.md` *(path updated 23 Oct; handed over 21 Oct, see `DEV-HANDOVER-AG02_2026-10-21.md`)* | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-03 Pathway assessment | `AG-03-pathway-assessment_v1.4_2026-10-07.md` | Not reviewed yet — do not start | | Old format. |
| AG-04 Consultation and booking | `AG-04-consultation-and-booking_v1.8_2026-10-17.md` | Not reviewed yet — do not start | | Knock-on edits only. |
| AG-05 Retainer and agreements | `AG-05-retainer-and-agreements_v1.11_2026-10-18.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-06 Billing and payments | `AG-06-billing-and-payments_v1.10_2026-10-17.md` | Not reviewed yet — do not start | | Knock-on edits only. |
| AG-08 Smart questionnaire | `AG-08-smart-questionnaire_v1.10_2026-10-18.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-09 Document management | `AG-09-document-management_v1.18_2026-10-23.md` *(path updated 23 Oct)* | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-10 Communication hub | `AG-10-communication-hub_v1.20_2026-10-23.md` *(path updated 23 Oct)* | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-11 Automation | `AG-11-automation_v1.20_2026-10-21.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). Will specify the X-3 expiry watch. |
| AG-12 Templates | `AG-12-templates_v2.8_2026-10-23.md` *(path updated 23 Oct)* | Not reviewed yet — do not start | | Knock-on edits only. |
| AG-13 Tasks, reminders, notes, activity | `AG-13-tasks-reminders-notes-and-activity-audit_v1.16_2026-10-18.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-14 Reporting and analytics | `AG-14-reporting-and-analytics_v1.11_2026-10-10.md` | Not reviewed yet — do not start | | Old format. |
| AG-15 Client portal management | `AG-15-client-portal-management_v1.12_2026-10-23.md` *(path updated 23 Oct)* | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-17 Corporate cases and LMIA | `AG-17-corporate-cases-and-lmia_v0.10_2026-10-18.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-18 Data import and migration | `AG-18-data-import-and-migration_v1.7_2026-10-18.md` | Not reviewed yet — do not start | | Knock-on edits only (18 Oct). |
| AG-19 PDF Studio *(row added 23 Oct; path updated 25 Oct)* | `AG-19-pdf-studio_v1.7_2026-10-25.md` | New module (22–25 Oct) | 22–25 Oct | **New format (X-1).** Decisions AG19-D1 – AG19-D65 (D61, D62 and D64 have their home in AG-09). |

### Client portal

| Module | File and version | Status | Notes |
|---|---|---|---|
| CP-01 Client portal app | `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md` *(path updated 23 Oct; the status and notes in this row are as of 18 Oct)* | Not reviewed yet — do not start | Out of date (8 Oct). A refresh to v0.3 is pending; its top notes list the decisions the refresh must apply. |

"Knock-on edits only" means: other reviews changed a few lines in this epic so it stays consistent. The epic has not had its own review.

### Shared documents (current)

| Document | File |
|---|---|
| Super Admin overview and glossary | `FINAL-SuperAdmin-FR/00-Overview_v3.12_2026-10-17.md`, `FINAL-SuperAdmin-FR/99-Phasing-and-Glossary_v2.22_2026-10-17.md` |
| Agent overview and glossary | `FINAL-Agent-FR/00-Overview_v1.25_2026-10-25.md`, `FINAL-Agent-FR/99-Phasing-and-Glossary_v1.18_2026-10-25.md` *(paths updated 25 Oct)* |
| Build card standard | `FINAL-SuperAdmin-FR/BUILD-CARD-STANDARD_2026-10-17.md` |
| Code tasks | `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md` |
| Decision log | `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md` |

## 2. What we did, by epic

### Super Admin SA-01 to SA-12 (10–12 Oct, updated since)

**What the review did.** The product owner went through every module, then ran a "Rule 9" pass (intuitive, zero setup, defaults first) on each. Rulings are in the decision log under "ExpatReady staff roles", "Governance code built against earlier 'park' decisions", "Remaining SA open questions", the Rule 9 pass sections and "After the SA write-up".

**Decision IDs.** Older prefixes (R-, SR-, G-, SA-Q, R9-) plus **W-1 to W-24** and **P-1 to P-5** (12 Oct). After 12 Oct, Super Admin documents were changed again by the AG16 and AG07 decisions. Each of SA-01, 01B, 03, 04, 05, 06, 07, 08, 10, 11 and 12 has a table "Decisions that change this epic".

**The changes that matter most to developers.**

1. **Six fixed ExpatReady staff roles** (Platform Owner, Admin, Support, Billing, Content publisher, Auditor). No role editor. The code registry is the master. `check:seed-parity` must block a release on any drift (DEV-TASKS A7).
2. **At least one active Platform Owner**, as built (W-12). Live plan and price changes need a second Owner (W-2).
3. **Data erasure:** grace period of 7 days from approval, with Cancel (B1). The "Data erasure" flag is on by default; tripping its kill switch pauses erasure (W-11, B2).
4. **Consent send check** is aligned: unsubscribe and STOP block on every route; "no recorded consent" is skipped on shared email and automatic marketing (B3). New consent purpose `WHATSAPP_OPT_IN` (B4).
5. **The firm's own payment account is on every plan.** Trials need no card; tax numbers are asked at trial end (C1, C2, C5).
6. **Firms see only the final questionnaire and the dynamic document checklist.** Pack configuration is ExpatReady's. Firms add documents per case with "Request a document" (W-17).
7. **Automatic messages run from day one** on ExpatReady's wording. A message that lacks a firm detail is skipped, with a dashboard note.
8. **Phase 1 now includes** the SA-09 Business page, the SA-10 "Open support session" link, the SA-11 breach register, and SA-12 maintenance mode and banner (P-1 to P-5).

**Added after 12 Oct (AG16 decisions).** SA-03: which plans include AI and the Developer API are pricing choices (AG16-80, AG16-101); portal nudging is on every plan (AG16-86). SA-06: new key `agent/ai:switch`; `agent/automation:configure-ai` withdrawn. SA-08: Google verification starts now (AG16-70).

**Open items.** Each document's section 13. SA-04 section 13 Q8 is undecided. SA-08 Q8 (WhatsApp provider) is open. A pointer to the "before go-live" vendor tasks is in section 3.

### AG-01 Firm setup and onboarding (reviewed 13 Oct; gap check 18 Oct)

**What the review did.** Decisions **AG01-1 to AG01-23** (13 Oct) rebuilt onboarding and the staff model. On 18 Oct decisions **AG01-24 to AG01-28** closed the last open questions. Then the gap check produced **AG01-29** and **AG01-30**.

**The changes that matter most.**

1. **Setup gates nothing.** "Setup complete" means licence plus firm profile. Real gates sit only at the point of action: a retainer needs a licensed person (AG01-2, AG01-6, AG01-22).
2. **Two-step sign-in is optional.** Default OFF for firm staff and clients. This is a code change (DEV-TASKS C6; AG01-3).
3. **One lead representative per case** drives the retainer and the IMM 5476 form. Firm setting "Default lead representative for new cases", default none (AG01-5).
4. **One last-Owner rule.** Only an Owner gives or removes the Owner role (AG01-7). See the priority fix H14.
5. **One-click work handover** when someone leaves; leftovers go to "Needs an owner" (AG01-8, AG01-21).
6. **Offices are hidden until a second office exists** (AG01-10). Times show in the item's own office time, labelled "10:00 (Calgary)" (AG01-24).
7. **Stored signature**, applied automatically when the lead representative signs (AG01-20, AG01-23).
8. **Step-up check** before giving or removing the Owner role and before changing the payment account (AG01-11).

**18 Oct developer-eye gap check.** Method: someone read AG-01 as the developer who builds it and listed the silent gaps. A second, independent check verified each finding against the code and the decisions. Only confirmed findings were applied. The product owner answered them as AG01-29 and AG01-30:
- Sign-out after 28 days unused stays (built).
- Task "Update representative with the authority" whenever a submitted case's lead representative changes.
- Suspended staff get no new work.
- A removed licence moves nothing; it warns.
- Handover moves all the leaver's clients; appointments move only if AG-04's availability check says the new person is free.
- Who edits which firm detail; one licence record per person.
- The Owner-role bug, recorded as DEV-TASKS **H14**.

**Developer decides.** AG-01 section 13 holds **18 items** under "Developer decides (gap check, 18 Oct)". Each has a suggested default.

### AG-16 Firm settings and integrations (reviewed 14–18 Oct; gap check 18 Oct)

**What the review did.** Decisions **AG16-1 to AG16-104** (14–18 Oct) built the settings structure. The gap check added **AG16-105** and **AG16-106**. From about AG16-24 these decisions apply to the whole product; the "AG16" prefix is historical.

**The changes that matter most.**

1. **Settings map:** nine sections plus Advanced and My account. Every setting has a default and a placement (section 3.20).
2. **AI switch is Owner only** (`agent/ai:switch`). It is locked until ExpatReady records its AI provider (AG16-80, AG16-95).
3. **One rule for every broken connection:** one email to whoever can fix it, plus one home-screen item (AG16-82, AG16-90).
4. **Mailboxes:** Google is required at launch; the firm connects its own mailbox on every plan (AG16-70, AG16-93).
5. **Video** is per person: calendar Meet or Teams, own Zoom, or "My meeting link" (AG16-53, AG16-99).
6. **Recently deleted:** restore uses the same key as delete (AG16-104). Each person sees only what their delete keys allow (AG16-105).
7. **Eight fixed notification groups** with email defaults and one test each (AG16-105).
8. **`agent/billing-config:currency` is withdrawn.** Default currency uses `agent/settings:edit` (AG16-106).

**18 Oct developer-eye gap check.** Same method as AG-01. Applied: the built Owner-only firm export is the one export; entity names corrected to what the code has; four new cards (AG-16-59, -60, -65, -66); a warning at the top of section 4 about struck text; a new "Developer decides" list.

**Open items.** Section 13 "Genuinely open": none. All 13 items are closed. **"Developer decides (gap check, 18 Oct)": 18 items**, each with a suggested default.

### AG-07 Case core and delivery (reviewed 18 Oct; rewritten as v3.0)

**What the review did.** Decisions **AG07-D1 to AG07-D27** (D5 was replaced by the people model X-2). Then the whole epic was rewritten in the new format.

**The v3.0 rewrite (AG07-D21).**
- **New format (X-1):** Part A Start here, Part B build cards, Part C rules and tests, Part D appendix.
- **12 chapters, 107 cards.** Each card has 14 fields.
- **v3.0 is the only build source.** v2.13 is frozen in `FINAL-Agent-FR/_archive/` and marked "do not build from this".
- Requirement IDs, decision IDs and permission keys are the same as in v2.13. Part D "Where did it go?" maps every v2.13 ID to its place in v3.0.
- Checks before release: every v2.13 ID is present; a meaning review of every card; two AI build tests, whose findings were fixed or turned into open questions.

**The changes that matter most.**

1. **One rules-version pin per filing and per person** (AG07-D2, AG07-D18). "Use newer rules" moves the whole filing (H1, H2).
2. **One application number per filing**; `Filing.status` is `OPEN`, `SUBMITTED`, `DECIDED` or `WITHDRAWN`; `clientCode` is set at conversion (AG07-D22, AG07-D26; H10, H13).
3. **Answer sheet at launch** for every mapped form, plus an XFA trial (AG07-D17; H5, H6).
4. **A minor's answers show to both parents** on the case (AG07-D23; H9).
5. **CRITICAL warnings are passed, not blocked,** by holders of `agent/case:waive-deficiency` (Owner, Admin, Case Manager, Case Officer). An unapproved or unsigned form is such a warning (AG07-D24, D25, D26, D27; H11).
6. **Review is per filing,** with "Changed since review" (AG07-D26).
7. **Target filing date** replaces the target closure date. It is optional and counts calendar days (AG07-D26, D27).
8. **Staff are notified only when someone is handed work** (AG07-D6).

**Product-wide rules added in this review.**
- **X-1:** how documents are written (section 4).
- **X-2:** one person record per real person. The role (principal, spouse, child) is stored per filing. Details live in one place.
- **X-3:** expiry watch, placeholder only (section 7).
- **AG16 product rules:** Agent `00-Overview` section "Product rules every epic follows" lists 17 rules (suggest, don't decide; quiet by default; a duplicate beats a miss; single home; email-first; English first; X-1; X-2; X-3).

**Open items.** 28 open questions in Part D, section D9 (section 7).

## 3. What to build now, in order

Sizes and details are in `DEV-TASKS_2026-10-12.md` (section 6 of this note). The file marks priority only in three places: **H14**, **F "Top priority"** and **G "Top priority"**. The rest of the order below is a dependency order and is a suggestion.

| Step | Build | Why |
|---|---|---|
| **0** | **H14: the Owner-role and self-role security fix.** Do it first. | An Admin can remove the Owner role, even from the last active Owner. A role-assign holder can change their own roles. Size S. |
| **1** | **Long-lead vendor items** (start now, they take weeks). G1: Google OAuth verification and CASA assessment, submitted at least 10 weeks before launch; at launch minus 6 weeks the product owner chooses between Nylas and the app-password route if approval has not arrived. F2: Microsoft publisher verification. F3: choose a WhatsApp provider. F4: Zoom Marketplace approval. F1 is withdrawn (G1 replaces it). | Calendar time, not coding time. |
| **2** | **Super Admin code:** sections A (roles), B (data governance), C (plans, billing). Start with A7 (fix seed drift once; run `check:seed-parity` in the release pipeline). Then the card-owner epics in section F (F5 to F9) and the pointers in G. | Every role change needs a matching seed row. Parity must pass first. |
| **3** | **AG-01:** section C tasks C6 to C14 (for example C6 two-step default off, C7 only-Owner guard, C9 step-up, C10 multi-role invites), then H15. | Cards in AG-01 v1.23. |
| **4** | **AG-16:** section E tasks (E1 to E7, E8 is withdrawn), H15, and the AG-16 cards. E7 (soft delete with 30-day restore) is needed for Recently deleted. | Cards in AG-16 v1.22 *(updated 23 Oct; was v1.19)*. |
| **5** | **AG-07,** in chapter order (table below) with its H tasks. | Chapter 1 to 12. |

### AG-07 build order (from Part A, section A5)

| Ch | Chapter | Build after | H tasks | Waits for (from A5 "Pending") |
|---|---|---|---|---|
| 1 | Clients and people | None for AG-7-69 to AG-7-93. AG-7-4, -97, -107 and -78 come after Ch 2 and 3. | H7, H8, H9 | Person details and client file record (X-2); `PartyRelationship.caseId`; AG-11 `client.created` trigger; CP-01 refresh. Needs AG-02, AG-06, AG-08, AG-10, AG-13, AG-15, AG-17, AG-18. |
| 2 | Case creation and team | 1 | H3 | No `Case` table exists. AG-12 Welcome box is pending. Needs AG-05, AG-10, AG-12, AG-13. |
| 3 | Filings, rules versions, stages | 2 | H1, H2, H10, H12 | Rules pin keyed by filing and person (backend lead). Needs AG-11 Conductor and AG-17. |
| 4 | Documents | 3 | H4 (no task) | None. Needs AG-09 statuses and "Request a document", AG-12. |
| 5 | Forms | 3 | H5, H6, H13 | SA-01B fields `signedBy`, `signatureMethod`; SA-01 form mappings (expert content). Needs AG-05, AG-08, AG-11, AG-18. |
| 6 | Deficiencies and readiness | 4, 5 | H11 | Deficiency library content from the immigration expert. Needs AG-05, AG-06, AG-11. |
| 7 | Review and submission | 6 | H11, H13 | None. Needs AG-11 and AG-12. |
| 8 | Government steps, letters, deadlines, numbers | 3, 7 | H13 | `CaseMilestone` is not built. Needs AG-10 letter matcher, AG-11 Minder. |
| 9 | Decision, after decision, close, withdraw, reopen | 7, 8 | H3 | Seed of `agent/case:reopen`. Needs AG-11, AG-12. |
| 10 | Timeline, notifications, target filing date, audit | 2 (grows with 3 to 9) | H13 | AG-14 queue colours. Needs AG-11, AG-13. |
| 11 | Government fees, Bill to, linked cases, evidence bundle | 2, 9 | | None. Needs AG-05, AG-06, AG-17. |
| 12 | Import, offices, time zones | 1, 2, 8 | | AG-18 submission date on an imported case; AG-11 `client.created` trigger. Needs AG-10, AG-15. |

**Epics AG-07 depends on that are not reviewed yet:** AG-02, AG-05, AG-06, AG-08, AG-09, AG-10, AG-11, AG-12, AG-13, AG-14, AG-15, AG-17, AG-18. Their current text is the reference today. Expect small changes when each is reviewed. A card that depends on an unreviewed epic follows that epic's current text; it does not wait unless A5 "Pending" says it is blocked.
**Content the immigration expert must supply** (pack data, not code): government steps per country and program; form sets and editions; document checklists; the deficiency list and default severities; steps after submission; submission references; decision outcomes; mappings for the design-partner firm's most-filed forms.

## 4. How to read the documents

### Super Admin documents

1. Read `00-Overview_v3.12` and the glossary for the module map and terms.
2. Open your module. Start at its change log and at "Decisions that change this epic" (not present in SA-02 and SA-09).
3. SA-05 and SA-08 have a "Hand-over scope" block at the top. Read it before the body.
4. Look up decision IDs (R-, SR-, G-, SA-Q, R9-, W-) in the decision log only if you need the reason.

### Old-format Agent documents (AG-01, AG-16, and all unreviewed epics)

1. Read "Product rules every epic follows" in the Agent overview (17 rules).
2. Open your epic and start at **"Decisions that change this epic"** near the top. It lists each decision, what it changed and where.
3. Build from the **build cards**. Each epic has the 14-field cards defined in the standard; requirements not yet carded are bullets in the requirements section.
4. Read the **"Developer decides"** list at the end of section 13 (AG-01 and AG-16). Each item has a suggested default.
5. **Do not build struck-through or WITHDRAWN text.** AG-16 has a warning at the top of section 4.
6. AG-01 specific: where AG-01 consent and countersign text says "the representative", read it as the retainer's representative, not the case's lead representative (AG07-D20(c)).

### New-format AG-07 (X-1)

1. **Part A, Start here** (about 4,000 words): purpose, key terms (A2), main flow (A3), the Client E family example (A4), build order (A5).
2. **Only your chapter in Part B.** A chapter is 4,000 to 10,000 words. Each card has 14 fields: Outcome, Why, Where, Engine, Rules, States, Data, Access, Events, Safety, Tests, Edge cases, Non-goals, Mode. Field 7 writes code names as `plain name (codeName: type)`.
3. **Part C:** C1 business rules (BR-1 to BR-31), C2 states, C3 data model, C4 permissions, C5 non-functional rules, C6 what is built today, C7 acceptance tests across cards.
4. **Part D is history. It is never a build instruction.** D7 "Where did it go?" maps v2.13 IDs to v3.0. D9 holds the questions. A card that says "Open — see D9 Qn" is not guessed.
5. Do not confuse **D9** (a section of the AG-07 file) with **AG07-D9** (a decision in the log about "Take it" on an unassigned case).

### The decision log

`FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md` is the reference when texts disagree. Main sections:
- SA reviews, 10–12 Oct, including the Rule 9 passes.
- "AG-01 review — decisions (the product owner, 13 Oct)": AG01-1 to AG01-23, later AG01-24 to AG01-30.
- "Product-wide rules from 18 Oct (X-series)": X-1, X-2 (X-3 and the gap-check answers are listed after the AG07 decisions).
- "Product decisions AG16-1 – AG16-104": has an index table with type (product-wide rule, cross-epic, one epic) and the epics affected. AG16-105 and AG16-106 are at the end of the file.
- "AG-07 review — decisions": AG07-D1 to AG07-D27.

## 5. Rules that override anything you read

These come from the Agent `00-Overview` section "Product rules every epic follows" and from the standing product rules.

| Rule | What it means for the code |
|---|---|
| **Newest decision wins.** | If two texts disagree, the later decision applies. Part D and struck text are history. **When unsure, the decision log is the reference.** |
| **Built stays.** | If code exists, the spec follows the code. Cite `path:line`. Do not rebuild what exists. |
| **Warn, never block (rule 7).** | A CRITICAL warning is passed by a holder of `agent/case:waive-deficiency` (AG07-D24). Product text names no regulator or statute. Fixed exceptions: ExpatReady's own emails, security emails, unsubscribe and STOP, the e-sign certificate. |
| **Single home (AG16-11).** | A pointer card means build it where it points. Example: AG-7-16 points to AG-9-63. |
| **People decide, ExpatReady suggests (AG16-31, AG16-76).** | Nothing is committed without a click. New client-facing automation needs the product owner's approval. |
| **Quiet by default (AG16-42).** | Show rather than push. Notify only when someone is handed work. |
| **Zero setup, defaults first (rule 9).** | Every setting has a default and a placement. Small firms, up to 15–20 staff. Do not add settings or permissions without a decision. |
| **Release 1 is full-featured.** | Never defer a day-to-day feature to Release 2 to save time. Ask the product owner. |
| **Email-first (AG16-92).** | Anything the client must do reaches them by email and works without a login. |
| **English first (AG16-88).** | All UI strings go through the i18n layer from day one. |
| **Raise contradictions.** | If the spec and the code, or two documents, disagree, raise it with the product owner. Do not resolve it yourself. |

## 6. Code tasks

Source: `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md`. Paths are in `ERv2-sanitized` unless marked `frontend`. Every role-grant change needs its row in `09-role-matrix-seed.sql`, and `check:seed-parity` must pass.

| Section | Rows | Content |
|---|---|---|
| A ExpatReady staff roles | A1–A15 | Role key changes in `role-template.platform.ts`. A11 and A12 are "no change". |
| B Data governance | B1–B10 | Erasure grace and kill switch, consent send check, `WHATSAPP_OPT_IN`, export fixes, legal holds. B7, B9, B10 are "no change". |
| C Plans, billing, firm security | C1–C14 | Firm payment account, tax step, trial plan switch, MFA default off (C6), only-Owner guard (C7), Owner-role bug (C8, see H14), step-up (C9). C12 is done (built). |
| D Not code | list | Designs not to build, so nobody builds the old version. |
| E AG-16 (14 Oct) | E1–E8 | Remove old settings tabs, support-ticket keys, Developer API screen, Recently deleted (E7). E8 is withdrawn. |
| F 17 Oct decisions | F1–F9 | Vendor items and card-owner epics. F1 is withdrawn. |
| G 17 Oct second pass | G1–G4, G5a–g | Google setup (G1), real payment-notice samples (G2), design-partner questions (G3), AI plan pricing (G4), card pointers. |
| H 18 Oct decisions | H1–H15 | AG-07 and X-2 code changes (below). |

### Section H: tasks AG-07 and AG-16 depend on

Where the task says "backend lead decides", do not choose the placement yourself.

| Task | One line | Epic |
|---|---|---|
| **H14** | **Priority.** Only an Owner gives or removes the Owner role. Nobody changes their own roles. A non-Owner must hold every permission of the role. Removing the Owner role is refused if no active Owner would remain. Code: `apps/api/src/authz/role-assignment.service.ts:92-100, 122-125, 132-136, 198-201, 208-210`; `role-assignment.controller.ts:74-91`. Done when the four tests in H14 pass. | AG-01 |
| H1 | Rules pin per filing and per person (new `SnapshotPurpose`). | AG-07 Ch 3 |
| H2 | "Use newer rules" moves every applicant's pin on a filing and copies "Request a document" items. | AG-07 Ch 3 |
| H3 | Case permission catalogue (`agent/case:*`): mint when the case module is built; seed rows and `check:seed-parity` must pass. No code change today. | AG-07 |
| H4 | Document status values: no task. Keys come with AG-09. | AG-07 Ch 4 |
| H5 | Answer sheet output for every mapped form. | AG-07 Ch 5 |
| H6 | XFA trial spike (backend lead). | AG-07 Ch 5 |
| H7 | Person details on `PartyProfile` plus one client-file row per person. | AG-07 Ch 1 |
| H8 | Family member gets a Party; `AnswerSubject.partyId` stays null only for a person not yet born. | AG-07 Ch 1 |
| H9 | Principal sees family answers on a shared case; both parents see a minor's answers. | AG-07 Ch 1 |
| H10 | `Filing.status` and `clientCode` set at conversion. | AG-07 Ch 1, 3 |
| H11 | Seed `agent/case:waive-deficiency` on Owner, Admin, Case Manager and Case Officer. Goes in with the case keys. | AG-07 Ch 6, 7 |
| H12 | `StageKind` gains `AFTER_DECISION` and `CLOSED`. | AG-07 Ch 3 |
| H13 | New fields: `Filing.applicationNumber`, `CaseMilestone` fields, `CaseReview.filingIds`, `Case.targetFilingDate`, form signing fields. None built. | AG-07 Ch 5, 7, 8, 10 |
| H15 | `agent/settings:edit` key; public phone, email and website fields; one licence per person; Recently deleted filter. | AG-01, AG-16 |

## 7. Open items and placeholders

### AG-07: 28 open questions (Part D, D9, "Questions still open")

| Owner | Count | Questions |
|---|---|---|
| Backend lead | 24 | 54, 55, 66–72, 75, 76, 80, 81, 89–93, 96, 104–107, 113 |
| Backend lead, with AG-10 | 1 | 110 |
| Backend lead; step type by the immigration expert | 1 | 109 |
| Immigration expert | 1 | 82 |
| Immigration expert, with AG-11 | 1 | 117 |

**None is for the product owner.** Nearly all are data-field or storage choices. For a technical question the backend lead decides and records the choice in the card or in Part C3. For a product question, ask the product owner.

### AG-16 and AG-01: "Developer decides"

- **AG-16: 18 items** (section 13, "Developer decides (gap check, 18 Oct)"). Examples: where the Escalation and At-risk values live (default: `FirmSetting`); rename `agent/mfa-policy:manage` to `agent/security-policy:manage`.
- **AG-01: 18 items** (section 13, same heading). Examples: where a person's name is stored; the event name for "staff member deactivated"; the invite link lifetime (default: keep 72 hours).
- Use the suggested default unless the backend lead decides otherwise, and record the choice. If the question is about product behaviour, ask the product owner.

### Placeholders and pending rows

| Item | State |
|---|---|
| **X-3 expiry watch** | Staff reminders 30, 15, 7 and 2 days before a status expires (90 days extra after the case closes); "Stop watching"; client reminders on for open cases, off for closed. Home: AG-11 section 3.4a. **Placeholder only. It is specified in the AG-11 review. Do not build it from AG-07.** AG-07 shows nothing for status dates, restoration or maintained status yet (D9 Q109, Q117). |
| **Employer portal seats** | Release 1 and a separate plan extra the owner switches on (SA3-D20, AG07-D23). SA-03 v2.24 still has one older sentence (line 424 of that file) saying seats are not in Release 1. The decision overrides it. Ask the product owner before building the plan-extras row. |
| **CP-01 refresh** | Pending. Where CP-01 says "behind login", the email-first rule (AG16-92) overrides it. |
| **AG-7-16** | Pointer card. Its home is AG-9-63. |
| **SA-01B v2.0** | Rewrite pending. Input: `FINAL-SuperAdmin-FR/SA-01B-REDESIGN-DECISIONS_2026-10-18.md`, to be shared with the co-product owner and the founder before v2.0 is written. |

## 8. What comes next

Review order (the product owner, 13 Oct): AG-01 (done), AG-16 (done), AG-07 (done), then **AG-02 → AG-03 → AG-04 → AG-05 → AG-06 → AG-08 → AG-09 → AG-10 → AG-11 → AG-12 → AG-13 → AG-15 (with the CP-01 refresh) → AG-14 → AG-18 → AG-17.**

| Next review | What it will deliver |
|---|---|
| AG-02 | The person record and client file record that AG-07 Chapter 1 relies on (X-2). |
| AG-04, AG-05, AG-06 | Booking and video, retainer, billing. AG-07 and AG-16 point to them. |
| AG-08, AG-09 | Answers and `agent/sqr:verify`; document statuses and "Request a document" (AG-9-63). |
| AG-10, AG-11, AG-12 | Letter matcher and mailboxes; Conductor, Needs you, Minder and the X-3 expiry watch; Welcome box and class-2 boxes. |
| AG-13 | Timeline, tasks and reminders. |
| AG-15 with CP-01 | Portal management and the refreshed portal document. |
| AG-14, AG-18, AG-17 | Reporting; import; corporate cases. |

Each next review also rewrites its epic in the X-1 format, as AG-07 was.

**The rule: the dev team does not start an AG epic before its review.**

**How the team will be told:** a hand-over note per batch of finished reviews. It gives the file versions and the decision table. This note will then be updated or replaced.

## 9. Who to ask

| Person | Ask about |
|---|---|
| **The product owner** | Product behaviour, scope, immigration practice. Anything that touches Release 1 or Release 2. Contradictions between documents or between a document and the code. |
| **Immigration expert (the immigration expert)** | Pack content: government steps, form sets and editions, document checklists, deficiency list, submission references, decision outcomes. AG-07 Q82, Q109 (step type), Q117. |
| **Backend lead** | Technical choices: field placement, keys, migrations, events, "Developer decides" items, AG-07 Q54 to Q113 in D9. |

## 10. Other notes

- Older hand-overs stay as the **change history**: `DEV-HANDOVER_2026-10-12.md` (Super Admin) and `HANDOVER-NOTE_2026-10-18.md` (including addenda 6 to 8). **This note is the starting point.**
- `DEV-HANDOVER-AG07-AG16_2026-10-18.md` is replaced by this note.
- Older versions of every epic are in `_archive/`. Do not build from them.
- Writers and agents applying decisions follow `FINAL-SuperAdmin-FR/WRITER-BRIEF_2026-10-17.md`.
