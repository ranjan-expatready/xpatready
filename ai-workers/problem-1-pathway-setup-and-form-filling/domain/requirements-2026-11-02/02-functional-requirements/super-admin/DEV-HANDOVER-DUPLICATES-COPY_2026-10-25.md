# Developer hand-over — duplicate checks, "copy on emails" and W-17 (25 Oct 2026)

Product owner: the product owner. This note lists what you receive today and how to read it.

**Updated 27 Oct 2026 — CC-8 (the product owner, 26 Oct): only emails a person writes are copied.** System emails go to their usual recipient with no Cc: the Welcome, every link, reminders, invoices and all money emails, signing, and the portal invitation. On an individual case that recipient is the principal applicant. On an LMIA file it is the employer's primary contact. On a worker's own case it is the worker. The current files are listed in the table below. Older versions are in `_archive/`. **SA-01B v2.1 caveat:** its knock-ons to other epics (`SA-01B-v2.0-KNOCK-ONS_2026-10-26.md`) are not applied yet. Until they are, SA-01B wins wherever an epic differs from it on pack content. The full 22–27 Oct summary is `DEV-QA-CHANGE-SUMMARY_2026-10-22-to-27.md`.

## 1. What you are receiving

| Document | Version (file) | What changed |
|---|---|---|
| **AG-07 Case core and delivery** | `FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.11_2026-10-27.md` | Duplicate-case and filing checks (AG-7-1 rules 9–12). Family-member matching (AG-7-107). The copy list `CaseCopy` and the "People on this case" panel (AG-7-97, C3.8a). Welcome To the client only, never copied (AG-7-103, CC-8). "Copied on" on the client screen (AG-7-78 rule 4). Must-verify deficiency source (AG-7-26). Four case notifications (AG-7-39). |
| **AG-02 Leads, prospects and sales** | `FINAL-Agent-FR/AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md` | AG-2-14 rule 12 "Family add" (name + date of birth from `personal.dateOfBirth`, offer only). AG-2-72 aligned to it. Merge re-points `CaseCopy.partyId` and sets `removedVia = MERGE` (AG-2-16). Company-match exception for import (AG-2-79 rule 7). |
| **AG-10 Communication hub** | `FINAL-Agent-FR/AG-10-communication-hub_v1.26_2026-10-27.md` | "Copy on emails at send" (AG-10-89, BR-35). Only emails staff write on a case are copied, as one email with the case list in Cc; this includes a typed message to a WhatsApp client, which the list gets by email. Every system email is never copied (CC-8). Footer and "Stop copying someone" page, on copied emails only (AG-10-85 rule 7). A reply keeps outside Cc. A bounced Cc is skipped. "Copied on" in the Who is this panel (AG-10-86). |
| **AG-17 Corporate cases and LMIA** | `FINAL-Agent-FR/AG-17-corporate-cases-and-lmia_v0.14_2026-10-27.md` | LMIA file check (AG-17-95). Duplicate work locations and business number added later (AG-17-3). Candidate log de-duplication (AG-17-26, AG-17-80 as an AG-18 adapter). Copy rules for LMIA files and worker cases, employer question and carry-over (AG-17-96). Firm-added questions struck (W-17). |
| **AG-08 Smart questionnaire** | `FINAL-Agent-FR/AG-08-smart-questionnaire_v1.15_2026-10-27.md` | **W-17:** firms no longer build or publish questionnaires; definitions are read from the pinned pack version. Copy question (AG-8-51). Family matching (AG-8-28). Must-verify flag (AG-8-27). English fallback for pack content. Raises no staff notifications of its own. |
| **AG-18 Import and migration** | `FINAL-Agent-FR/AG-18-data-import-and-migration_v1.9_2026-10-25.md` | Every duplicate check in the dry run: cases, filings and LMIA files (AG-18-96); employers (AG-18-97); people and family (AG-18-94); same file twice (AG-18-98). Optional LMIA columns. |
| **AG-06 Billing** | `FINAL-Agent-FR/AG-06-billing-and-payments_v2.1_2026-10-27.md` | Invoice, pay-link, reminder, receipt, deposit-request and trust-request emails go To Bill to with no Cc, because they are system emails (AG-6-41, CC-8). Sent through AG-10. |
| **Send path made explicit** | `AG-05` v2.1 (AG-5-60), `AG-15` v1.15, `AG-12` v2.11 (AG-12-126, Appendix A), `AG-09` v1.27 (BR-25), `AG-13` v1.19 (BR-22), `AG-01` v1.26 (AG-1-70) | Every client email goes through AG-10's single send path (BR-1), and each says whether it is copied. AG-15 also settles the Nudge (one email per case, never copied), the invitation (never copied; a refused invitation stays "not invited") and `agent/portal:invite` for the Welcome's portal line. |
| **Glossary** | `FINAL-Agent-FR/99-Phasing-and-Glossary_v1.21_2026-10-27.md` | New terms: Copy on emails, People on this case, Stop copying someone, Must verify before filing, Immigration-significant, Family add match. Welcome message reworded. AG-07 and AG-02 key-term blocks match it. |
| **SA-01B Content pack configurator** | `FINAL-SuperAdmin-FR/SA-01B-content-pack-configurator_v2.1_2026-10-27.md` (the v2.0 redesign carries this work) | Copy-on-emails field groups and section (SA-1B-107 to 109). `mustVerifyBeforeFiling` flag (SA-1B-1, SA1B-D42). Publish checks SA-1B-110 to 112. |
| **SA-06 RBAC** | `FINAL-SuperAdmin-FR/SA-06-rbac_v3.15_2026-10-25.md` | `agent/sqr:build`, `agent/sqr:publish` and `template-customise` withdrawn (W-17). 236 keys, 29 capabilities. Pack keys cover questionnaires. |

Every previous version is in its folder's `_archive/`. The discarded first draft of this work is in `FINAL-Agent-FR/_drafts/_superseded-sonnet-run_2026-10-24/`, with every file prefixed `DISCARDED-SONNET-RUN__`. Do not build from it.

## 2. How to read

- Each epic's header changelog row for 24–25 Oct lists every change, and its decision table names the decision behind it: DUP-n and CC-n (24 Oct), F1–F13 and G1–G18 (fix pass), and W-17.
- Start with **AG-10-89**, which holds the copy rules, and **AG-7-97**, the copy list. Then read **AG-2-14 rule 12** and **AG-7-1 rules 9–12** for the duplicate checks.
- Changed lines are marked "(changed 24/25 Oct — …)". Superseded text is struck through and kept visible.

## 3. The main changes, in one page

1. **Duplicates warn, never block.** Every check offers "open the existing one" or "create anyway", audited, and raises no task or notification. The checks cover cases (same client and program path), filings (same person and program), LMIA files (employer + occupation + location), work locations, candidates, and family members (email or phone, then name + date of birth).
2. **Copy on emails is case level only.** Each person on the list is a person record found through AG-2-14. People are added by staff (with an optional "how did the client ask?"), by the client's own questionnaire answer, or automatically when the client Cc'd them.
   - **Copied:** only emails staff write on the case. The composer pre-fills the list as Cc chips, and staff can remove one for that email. A typed message to a WhatsApp client goes to the list by email.
   - **Never copied:** every system email. That covers the Welcome, questionnaire and upload links, reminders, invoices and money emails, signing, the portal invitation, login emails, marketing, and emails with no case.
   - **Recipients of system emails:** the principal applicant; on an LMIA file, the employer's primary contact; on a worker's own case, the worker (CC-8).
3. **Workers and employers.** A worker is never copied on an employer's LMIA file. An employer contact goes on a worker's own case only when added deliberately, and the panel shows a cue to confirm the worker asked.
4. **W-17.** Questionnaires are ExpatReady pack content. Firms see only the final questionnaire.
5. ~~**Accepted risk:** copied people receive no-login links, including the questionnaire link.~~ **Withdrawn 26 Oct (CC-8).** The links travel only in system emails, and system emails are never copied.

## 4. Build changes recorded in the epics (code)

- **Mail adapters send to one address only.** Cc is new worker work: `ERv2-sanitized/apps/worker/src/jobs/mailer/ses-mailer.adapter.ts:34`, `smtp-mailer.adapter.ts:33` (AG-10 §12).
- **Signing emails and the portal invitation must use AG-10's path when they are built.** *(corrected 27 Oct)* The new backend (`dev`, 26 Oct) has neither feature yet. The earlier citations pointed to old V1.5 code, which called the mailer directly and set `PENDING_ACTIVATION` before sending. That code is no longer in the workspace and is not to be ported. The invitation status is set only after the send succeeds (DEV-TASKS L11).
- **Merge route not built.** It still needs the SECURITY-DEFINER redesign (AG02-P12). Until then, duplicates made with "create anyway" cannot be merged.

## 5. Still open (not code)

- **Compliance:** a regulated consultant or counsel should confirm the product owner's SME rulings on CICC s.28 (client authorisation, scope) and CASL (copied non-clients) before go-live.
- **Content:** the Immigration-SME decides which library fields get "must verify before filing" (SA-01B), and adds the copy-on-emails section to every individual row with the bulk tool (SA-1B-108, SA-1B-110).
- **Unchanged open item:** AG02-P101 ("Retainer signed" notification), in AG-16 §13.
