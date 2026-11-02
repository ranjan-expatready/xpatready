# Developer hand-over — AG-04 v2.0 and the epics it changes (22 Oct 2026)

Product owner: the product owner. This note says what you receive today and how to read it.

**Updated 25 Oct 2026 (version references):** files with a newer version since the 23 Oct version references, and their current versions. Agent (`FINAL-Agent-FR/`): `99-Phasing-and-Glossary_v1.16_2026-10-25.md`, `AG-01-firm-setup-and-onboarding_v1.26_2026-10-25.md`, `AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md`, `AG-05-retainer-and-agreements_v1.14_2026-10-25.md`, `AG-06-billing-and-payments_v1.14_2026-10-25.md`, `AG-07-case-core-and-delivery_v3.8_2026-10-25.md`, `AG-08-smart-questionnaire_v1.13_2026-10-25.md`, `AG-09-document-management_v1.19_2026-10-25.md`, `AG-10-communication-hub_v1.22_2026-10-25.md`, `AG-12-templates_v2.9_2026-10-25.md`, `AG-13-tasks-reminders-notes-and-activity-audit_v1.18_2026-10-25.md`, `AG-15-client-portal-management_v1.13_2026-10-25.md`, `AG-17-corporate-cases-and-lmia_v0.13_2026-10-25.md`, `AG-18-data-import-and-migration_v1.9_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.10_2026-10-25.md`, `SA-03-subscription-plans-and-entitlements_v2.28_2026-10-23.md`, `SA-06-rbac_v3.15_2026-10-25.md`. Still current from 23 Oct: `00-Overview_v1.21_2026-10-23.md`, `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md`, `AG-19-pdf-studio_v1.3_2026-10-23.md`, `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md`. Older versions are in each folder's `_archive/`. Where this note names an older version of one of these files, use the one listed here.

## 1. What you are receiving

| Document | Version | Status |
|---|---|---|
| **AG-04 Consultations and booking** | `FINAL-Agent-FR/AG-04-consultation-and-booking_v2.0_2026-10-21.md` | **New hand-over.** Replaces v1.9 (now in `_archive/`). Start at **Page 1**. |
| **AG-02 Leads, prospects and sales** | `FINAL-Agent-FR/AG-02-prospect-lead-sales-crm_v2.1_2026-10-21.md` | Small update to v2.0. Read the box "Changed in v2.1" on Page 1. |
| **Code changes** | `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md`, **section J**, rows J1–J20 (and section I row 49 for AG-02) | Do the "Safe now" rows first. J19 (currency list) and J20 (delete the exchange-rate code) are new on 22 Oct. |
| **Updated to match AG-04** (each lists the change in "Decisions that change this epic") | Agent: 00-Overview v1.18, 99-Phasing-and-Glossary v1.11, AG-01 v1.25, AG-05 v1.13, AG-06 v1.12, AG-07 v3.3, AG-10 v1.18, AG-11 v1.20, AG-12 v2.7, AG-14 v1.13, AG-16 v1.21. Super Admin: 00-Overview v3.12, 99-Phasing-and-Glossary v2.24, SA-03 v2.26, SA-05 v3.8, SA-06 v3.12, SA-08 v2.12, SA-09 v2.5, SA-11 v2.15 | Old versions are in each folder's `_archive/`. The 22 Oct changes were made in place; each file's change log has a "22 Oct" row. |

Decisions: `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`, section "AG-04 review — decisions" (AG04-D1 to AG04-D22, and S1 to S6), and the product rule **X-6** (currency) at the end of that section. Product rules every epic follows: Agent `00-Overview`, "Product rules every epic follows" (X-6 is rule 20).

## 2. How to read

1. AG-04 Page 1 ("For developers: read this first"), then Part A, then only your chapter.
2. In any other epic, start at its table "Decisions that change this epic".
3. If something is marked "Open", or a piece is missing, ask the product owner. Do not guess.

## 3. The main changes, in one page

- **Nothing is built in the new backend for booking yet.** The event contract and the staff screens (on sample data) exist. The old V1.5 booking code is reference only; five of its bugs must not be copied (AG-04 Page 1).
- **Double booking** is stopped in the database (PostgreSQL), not with `SELECT … FOR UPDATE`. A staff member may knowingly book over a clash after a warning; that booking is recorded.
- **AG-04 makes no lead.** AG-02 does, from the booking events. An unpaid paid booking still becomes a lead when its hold ends (`booking.expired`). A new paid booker gets a person record (no lead) when the booking starts, so the invoice has an owner.
- **Case calls start from the case:** "Book a call" or "Send booking link". No lead.
- **Attendance is asked, never guessed:** "Did Client B attend?" 30 minutes after the end. No automatic No-show.
- **Timings:** booking defaults sit on the Timings screen (reminders 24 h and 1 h, notice 4 h, 60 days ahead, gaps 0/10 min, self-service up to 4 h, paid hold 30 min). Each appointment type may change them.
- **Video:** each person picks their source in My account. Own Zoom is on every plan.
- **Consult record:** every field once; the next step is a button ("Engage and create proposal", "Request documents", "Close lead").
- **Paid consults:** invoice on the person; refund offered when the client cancels in time; any other refund is made outside and recorded with "Record refund".
- **Group sessions:** each new attendee becomes a lead with no "Call now"; a full session takes details through AG-02's lead form. No waitlist.
- **Six booking permission keys** (SA-06 recounted).
- **English first.** No currency conversion. Booking figures appear in the AG-14 dashboard.
- **Hours, as built:** a person keeps one or more named sets of hours, one default; a new person gets "Normal hours" copied from the office hours; each appointment type's host row picks which set it uses (AG04-D17). Each set keeps its built time-zone picker, pre-filled with the office zone (AG04-D21).
- **Each person decides their own hours,** any day, any time. The firm's business hours no longer cap booking slots; closed days still block them (AG04-D22).
- **Time off:** the person's out-of-office dates; an Owner or Admin may enter them for a colleague. Time off never cancels or moves existing bookings (AG04-D19).
- **AG-14 money:** one total per currency, never converted; `reportingCurrency` and exchange-rate snapshots are removed (AG04-D20, R18).
- **Currency (X-6, product rule):** CAD and USD only; firm default CAD (may switch to USD). Each prospect and each case has one currency; a case takes its prospect's; it locks when the first invoice is sent. Anything with no prospect or case (e.g. a paid consult) uses the firm default, changeable before sending. No currency on a person or company. Reports show at most two totals. Applied to AG-01, AG-02, AG-04, AG-05, AG-06, AG-07, AG-14, AG-16, both Overviews and SA-06; code task DEV-TASKS J19. The built exchange-rate code (`apps/api/src/fx/`, `FxRateSnapshot`, `fxSnapshotId` in four event schemas) is deleted: DEV-TASKS J20 (X-6(8)).

## 4. Still open

Nothing for AG-04. On 22 Oct the product owner confirmed the rulings O1–O4 (AG04-D15) and the AG-04 Part D7 defaults (AG04-D16), and closed the last questions (AG04-D17 – D22). The Team list shows no video status (AG04-D18).

## 5. What comes next

AG-03, AG-08, AG-09 and AG-17 wait for SA-01B v2.0. The epic reviews continue: AG-05 → AG-06 → AG-10 → AG-11 → AG-12 → AG-13 → AG-15 → AG-14 → AG-18.
