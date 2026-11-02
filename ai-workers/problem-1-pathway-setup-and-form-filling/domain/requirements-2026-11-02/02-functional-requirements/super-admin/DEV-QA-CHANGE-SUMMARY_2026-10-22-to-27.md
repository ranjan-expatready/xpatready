# What changed in the requirements, 22–27 Oct 2026 (for Dev and QA)

Product owner: the product owner. This is a one-page summary of the changes made between 22 and 27 October. The epics themselves are the build source. Each epic's change log and its table "Decisions that change this epic" give the detail. Older versions are in each folder's `_archive/`. Never build or test from an archived file.

## 1. Current files (use only these)

**Agent console (`FINAL-Agent-FR/`)**

| Group | Files |
|---|---|
| Overview and glossary | 00-Overview v1.28, 99-Phasing-and-Glossary v1.21 |
| AG-01 to AG-06 | AG-01 v1.26, AG-02 v2.5, AG-03 v1.5, AG-04 v2.1, AG-05 v2.1, AG-06 v2.1 |
| AG-07 to AG-12 | AG-07 v3.11, AG-08 v1.15, AG-09 v1.27, AG-10 v1.26, AG-11 v1.21, AG-12 v2.11 |
| AG-13 to AG-19 | AG-13 v1.19, AG-14 v1.14, AG-15 v1.15, AG-16 v1.24, AG-17 v0.14, AG-18 v1.9, AG-19 v1.10 (new) |

**Client portal (`FINAL-ClientPortal-FR/`):** CP-01 v0.12.

**Super Admin (`FINAL-SuperAdmin-FR/`)**

| Group | Files |
|---|---|
| Overview and glossary | 00-Overview v3.13, 99-Phasing-and-Glossary v2.25 |
| SA epics | SA-01B v2.1, SA-03 v2.29, SA-05 v3.9, SA-06 v3.15, SA-08 v2.13, SA-11 v2.16 |

The other SA epics have not changed since 22 Oct.

**Code tasks:** `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md`:
- Section J: bookings and currency.
- Section K: money.
- Section L: duplicates and copy on emails.

## 2. What changed

### 2.1 New module: PDF Studio (AG-19)
- ExpatReady's own PDF tool. It has a main-menu item, and every record that holds documents has an "Open in PDF Studio" button.
- Tools: combine, split, reorder, rotate, crop, compress, images or Word to PDF, phone scan, unlock, page numbers and true redaction.
- It runs on the staff device, or on ExpatReady's own server. It never uses an outside PDF service. It is on every plan.
- Interactive government forms are never altered. They are filled on the case's Forms tab.
- One document can hold several files. A client upload always adds a file and never replaces one.
- When a client uploads a locked PDF inside ExpatReady, they are asked for its password.
- Also changed: AG-09, AG-07, AG-10, AG-15, AG-16, CP-01 and SA-03.
- **QA focus:**
  - Combine and redact produce one clean file. Redacted text cannot be recovered.
  - A government form is refused, with the message pointing to the Forms tab.
  - The source files are kept after a save.

### 2.2 Money: signing, retainers, trust and invoices (AG-05 v2.1, AG-06 v2.1; hand-over `DEV-HANDOVER-AG05-MONEY_2026-10-25.md`)
- **Signing:**
  - One signing tool works for any document and allows several client signers.
  - The client signs from an email link, or from the portal.
  - There is no proposal and no Quote tab.
  - A sent retainer can be edited until a client signs. After that, staff prepare an amendment.
- **Fees panel on the retainer:** services, schedule rows and estimates. It replaces payment plans. There is one Services list, under Settings → Services.
- **Trust ledger** (Release 1), per case:
  - trust request and trust receipt;
  - "Pay from trust";
  - a To move list and a monthly check.
- **Billing:**
  - A signed retainer prepares a deposit request, not an invoice.
  - Nothing is billed automatically. Staff click "Bill this".
  - Refunds, credit notes, write-offs and reverse entries are included.
  - Payments are never edited or deleted.
- **New screens:** case close-out, firm-service cases and a Getting paid settings page.
- **Code:** DEV-TASKS section K. Delete the exchange-rate code first (K1 = J20).
- **QA focus:**
  - The trust balance never goes below zero.
  - An overpayment goes to trust or credit.
  - Invoicing an unsigned retainer warns but does not block.
  - Editing a sent retainer stops the old link.

### 2.3 Currency and bookings (X-6, AG-04 final)
- **Currency:**
  - CAD and USD only.
  - Each prospect or case has one currency, locked at the first money document sent.
  - There is no conversion anywhere.
- **Bookings:**
  - Each person sets their own booking hours. Office hours no longer limit booking slots.
  - "Did Client B attend?" is asked after the meeting. There is no automatic no-show.
- **Code:** DEV-TASKS section J (J19, J20).

### 2.4 Duplicate checks (24–25 Oct)
- **They warn and never block.** "Create anyway" is recorded, and no task or notification is raised.
- **What is checked:**
  - Cases: same client and same program, case open.
  - Filings: same person and same program.
  - LMIA files: employer, occupation and location.
  - Work locations.
  - Candidates.
  - Family members: email or phone first, then name + date of birth.
  - Import: a dry run shows every match before anything is saved.
- **Specs:** AG-7-1 rules 9–12, AG-2-14 rule 12, AG-7-107, AG-17-95, AG-17-3, AG-17-26, AG-18-94/96/97/98.
- **Code:** DEV-TASKS L6–L10.
- **QA focus:**
  - Every check offers "Open the existing one" and "Create anyway".
  - A double click creates one case.
  - The client never sees a family match.

### 2.5 Copy on emails (24–27 Oct; final rule CC-8)
- **The list:** each case has a "Copy on emails" list (`CaseCopy`). Staff add people on the case's People on this case panel. The client can also name people in the questionnaire.
- **Copied:** only emails staff write on the case, including a template picked in the composer.
  - The list appears as Cc chips, and staff can remove one for that email.
  - A typed message to a WhatsApp client goes to the list by email.
  - A link staff paste into their own email goes with the copy.
- **Never copied: every system email.** That includes:
  - the Welcome, questionnaire and upload links, and reminders;
  - invoices and every money email, including refunds, credit notes and statements;
  - signing emails, the portal invitation, login emails and marketing.
- **Who gets a system email** (with no Cc):
  - Individual case: the principal applicant.
  - LMIA file: the employer's primary contact (HR or admin).
  - Worker's own work-permit case: the worker.
  - A worker is never copied on the employer's LMIA file.
- **Footer:** every copied email has a "Stop copying someone" link.
- **Specs:** AG-10-89 (home of the rule), AG-7-97, AG-7-103, AG-17-96, AG-6-41.
- **Code:** DEV-TASKS L1–L5. First step: add Cc to the mail adapters (L1).
- **QA focus:**
  - Staff email: copied.
  - Welcome, questionnaire link, invoice and reminder: never copied.
  - A Cc chip removed for one email is not copied on that email.
  - "Stop copying" removes the person from that case only.

### 2.6 Questionnaires and Content Packs (W-17, SA-01B v2.1)
- Firms no longer build questionnaires. ExpatReady ships them in the country pack. The keys `agent/sqr:build` and `agent/sqr:publish` are withdrawn (never mint them).
- SA-01B is fully rewritten (v2.0, now v2.1): 185 build cards on a "one fact, used everywhere" model.
- Library fields gain a new "must verify before filing" flag. An unverified flagged field raises a critical deficiency at filing.

## 3. Known gaps (read before building)

1. **The SA-01B v2.0 knock-ons are not applied yet.** `SA-01B-v2.0-KNOCK-ONS_2026-10-26.md` holds 298 change notes for other epics, among them AG-03, AG-07, AG-08, AG-09 and AG-17. **Until they are applied, where an epic differs from SA-01B v2.1 on pack content, SA-01B wins.** Ask the product owner when unsure.
2. **PDF Studio (AG-19) has no DEV-TASKS section and no hand-over note yet.** Build from AG-19 Part A ("Build order").
3. **Waiting for people outside the team** (none of these blocks the build):
   - Expert questions on trust and consult fees (AG-06 §4).
   - The payment-processor question in SA-08.
   - A compliance check of the Copy on emails rules by a regulated professional.

## 4. How to read an epic

1. Start at Page 1 / Part A ("Start here").
2. Then read the table "Decisions that change this epic".
3. Then read only your chapter.

If something is marked "Open", or a piece is missing, ask the product owner. Do not guess.

Where a DEV-TASKS row and an epic card differ, the card wins.
