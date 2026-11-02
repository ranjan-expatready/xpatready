# Developer hand-over note — 18 Oct 2026

> **Sections 1–10 are history. Current document versions and what to build: `DEV-HANDOVER-AG05-MONEY_2026-10-25.md` and section 11.**

Product owner: the product owner. This note says what you are receiving today, what changed since the last hand-over (12–13 Oct), and what comes next.

**Updated 25 Oct 2026 (version references):** files with a newer version since the 23 Oct version references, and their current versions. Agent (`FINAL-Agent-FR/`): `99-Phasing-and-Glossary_v1.16_2026-10-25.md`, `AG-01-firm-setup-and-onboarding_v1.26_2026-10-25.md`, `AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md`, `AG-05-retainer-and-agreements_v1.14_2026-10-25.md`, `AG-06-billing-and-payments_v1.14_2026-10-25.md`, `AG-07-case-core-and-delivery_v3.8_2026-10-25.md`, `AG-08-smart-questionnaire_v1.13_2026-10-25.md`, `AG-09-document-management_v1.19_2026-10-25.md`, `AG-10-communication-hub_v1.22_2026-10-25.md`, `AG-12-templates_v2.9_2026-10-25.md`, `AG-13-tasks-reminders-notes-and-activity-audit_v1.18_2026-10-25.md`, `AG-15-client-portal-management_v1.13_2026-10-25.md`, `AG-17-corporate-cases-and-lmia_v0.13_2026-10-25.md`, `AG-18-data-import-and-migration_v1.9_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.10_2026-10-25.md`, `SA-03-subscription-plans-and-entitlements_v2.28_2026-10-23.md`, `SA-06-rbac_v3.15_2026-10-25.md`. Still current from 23 Oct: `00-Overview_v1.21_2026-10-23.md`, `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md`, `AG-19-pdf-studio_v1.3_2026-10-23.md`, `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md`. Older versions are in each folder's `_archive/`. Where this note names an older version of one of these files, use the one listed here.

## 1. What you are receiving

| Document | Version | Status |
|---|---|---|
| **AG-16 Firm settings and integrations** | `FINAL-Agent-FR/AG-16-firm-settings-and-integrations_v1.18_2026-10-17.md` | **New hand-over.** Reviewed; no open questions. |
| **AG-01 Firm setup and onboarding** | `FINAL-Agent-FR/AG-01-firm-setup-and-onboarding_v1.22_2026-10-17.md` | **Update** to the 13 Oct hand-over (v1.19 → v1.22); no open questions. |
| **Super Admin SA-01 – SA-12** | Latest versions in `FINAL-SuperAdmin-FR/` (SA-01 v2.6, SA-03 v2.23, SA-04 v2.22, SA-05 v3.6, SA-06 v3.9, SA-07 v2.17, SA-08 v2.10, SA-10 v2.8, SA-11 v2.12, SA-12 v2.9; SA-01B, SA-02, SA-09 unchanged) | **Update** to the 12 Oct hand-over. |
| Shared for everyone | `FINAL-Agent-FR/00-Overview_v1.16_2026-10-17.md` (section "Product rules every epic follows"), `FINAL-SuperAdmin-FR/BUILD-CARD-STANDARD_2026-10-17.md`, `FINAL-SuperAdmin-FR/DEV-HANDOVER_2026-10-12.md`, `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md` | Current. |

**Not ready yet — do not start:** AG-02 to AG-15, AG-17, AG-18 (each has its own review first) and the client portal CP-01 (v0.2 is out of date; refresh pending).

## 2. How to read your document

1. Read **"Product rules every epic follows"** in the Agent overview (14 rules, one page). Every requirement relies on them.
2. Open your document and start at **"Decisions that change this epic"** near the top. It lists every product decision since 14 Oct that changed your document, what it changed and where (requirement or build card).
3. Build from the **build cards** (14 fields each: rules, worked examples, data, permissions, tests, AI-off behaviour, clicks, what the person decides).
4. Decision IDs `AG16-1` – `AG16-104` began in the AG-16 review but apply across the product; the prefix is historical. Full text and an index (type and epics affected): `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`, section "Product decisions AG16-1 – AG16-104".

## 3. Main changes since the last hand-over (short)

**Product-wide rules added** (Agent overview): help people, don't replace them (AG16-76); quiet by default — show, don't push (AG16-42); a duplicate beats a miss for what staff see (AG16-60); let the firm manage its own work (AG16-89); **email-first — the portal is optional** (AG16-92); English first, translation-ready screens (AG16-88).

**AG-16 and AG-01**
- **AI switch:** Owner only (sixth Owner-only action, `agent/ai:switch`); while ExpatReady has not recorded its AI provider the switch is locked with "AI helpers aren't available yet…" (AG16-80, AG16-95).
- **Broken connection:** one email to whoever can fix it (payment account: Owner only) plus one home-screen item until fixed; "Degraded" shows on the card only (AG16-82, AG16-90).
- **Closed days:** one "Add these every year" tick; offices hidden until a second office; each office has its own time zone; times shown in the item's own office time, labelled "10:00 (Calgary)" (AG16-79, AG16-45, AG01-24).
- **Mailboxes:** Google required at launch; the firm connects its own mailbox (free on every plan); replies go to the firm's own address until a mailbox is connected (AG16-70, AG16-93). Personal mailboxes bring in known clients, leads and government mail only — the "Only you" items are withdrawn (AG16-89).
- **Video:** per person (calendar Meet/Teams, own Zoom, or "My meeting link"); "Connect Zoom" hidden until Zoom approves the app (AG16-53, AG16-99).
- **Recently deleted:** restore uses the same permission as delete (AG16-104).
- **AG-01:** deactivate screen words and "connected by"; office add/edit uses `agent/settings:edit`; Team list shows "Email: disconnected" and "(Inactive) Name", visible to `agent/staff:manage` (AG01-24 – AG01-28).

**Super Admin**
- **SA-03:** which plans include AI and the Developer API are pricing choices in the plan builder (AG16-80, AG16-101); portal nudging is on every plan, not an extra (AG16-86).
- **SA-05:** client deadline reminders use a fixed formula, not editable points (AG16-77); send timing by what the timer counts (AG16-56); case Welcome carries no-login links; staff portal messages are emailed in full (AG16-92).
- **SA-06:** `agent/ai:switch` added; `agent/automation:configure-ai` withdrawn; `manage-inbox` covers assign / take / unassign; four system keys added as pointer rows (AG16-80, AG16-83, AG16-89, AG16-90).
- **SA-08:** Gmail send-only route dropped; Google verification and CASA start now, submitted at least 10 weeks before launch (AG16-70).
- Every SA document: "Decisions that change this epic" table lists the rest.

## 4. Known dependencies and open items

- **AG-16 places screens whose rules live in other epics** — mailboxes (AG-10), home screen (AG-11), booking and video (AG-04). Those epics are not yet reviewed, so their rules may still change. Build the AG-16 settings structure, closed days, offices and time zones, AI switch, broken-connection handling and Recently deleted now; follow AG-10's current rules for the connection screens and expect adjustments.
- **Super Admin open questions** remain as listed in each document's §13 (e.g. SA-01 Q12, Q16; SA-05 N18; SA-06 Q27 main-address part, Q29; SA-08 Q7–Q10). None is new since 12 Oct.

## 5. What comes next

1. **AG-07 review (in progress):** decisions numbered AG07-D1…; first decision made — one document status list owned by AG-09 (Needed, Received, Accepted, Needs replacing, Not needed). Next: how a case links to its forms in the built code, the retainer signer vs the case's lead representative, permission keys, and applicants without a Party record.
2. Then, in order: AG-02 → AG-03 → AG-04 → AG-05 → AG-06 → AG-08 → AG-09 → AG-10 → AG-11 → AG-12 → AG-13 → AG-15 (+ CP-01 refresh) → AG-14 → AG-18 → AG-17.
3. Each epic is handed over when its review is complete; you will get its version and its decision table.

## 6. Addendum — later on 18 Oct: AG-07 review complete

**New hand-over: AG-07 Case core and delivery v3.0** — `FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.0_2026-10-18.md`. It is the only build source. v2.13 is frozen in `FINAL-Agent-FR/_archive/` marked "Replaced by v3.0 — do not build from this".

How to read v3.0 (new format, X-1): read **Part A — Start here** (purpose, key terms, flow, the Client E family example, build order), then only your chapter in **Part B** (107 build cards, 14 fields each). **Part C** holds the business rules, state tables, data model, permissions and cross-card tests. **Part D** is history and is never a build instruction; its "Where did it go?" table maps every v2.13 ID to its new place. Requirement IDs are unchanged.

Checks run before release: every v2.13 requirement ID, rule, story and decision ID is present; a meaning review of every card; two AI build tests (a coding agent built three cards from the document alone; its findings were fixed or turned into open questions).

**Open questions in AG-07 v3.0 (Part D, D9): 47** — 43 for the backend lead (data fields, events, storage choices), 3 for the immigration expert, 1 editorial. None blocks starting Chapters 1–3; each card that depends on one says "Open — see D9 Qn".

**Decisions AG07-D1 – AG07-D25** (decision log, section "AG-07 review — decisions"). The later ones that change other epics:
- **AG07-D17** answer sheet at launch plus an XFA trial (government forms are XFA; the filler refuses XFA). **AG07-D18** one rules-version record per person on each filing.
- **AG07-D22** (30 product answers): one application number per filing; the case's principal is the case's client; `Filing.status` = `OPEN | SUBMITTED | DECIDED | WITHDRAWN`; client number (`clientCode`) assigned at conversion to client; employer portal roster and seats are Release 1; several filings submitted in one action; one review per case.
- **AG07-D23** a minor's answers are shown to both parents on the case; employer seats are Release 1 and a plan extra.
- **AG07-D24 / D25** a person without the pass permission cannot record a submission while a CRITICAL warning is open (nothing held as pending; they record again with the real send date after the pass); `agent/case:waive-deficiency` is seeded on Owner, Admin, Case Manager and Case Officer; form-approve, review-approve and retainer countersign stay Owner and Case Manager.

**Updated documents (edited in place, 18 Oct):** AG-01 v1.23, AG-02 v1.14, AG-05 v1.11, AG-08 v1.10, AG-09 v1.13, AG-10 v1.16, AG-11 v1.17, AG-13 v1.16, AG-15 v1.11, AG-16 v1.19, AG-17 v0.10, AG-18 v1.7, 99-Glossary v1.8; SA-01 v2.7, SA-01B v1.5, SA-03 v2.24, SA-05 v3.6, SA-06 v3.10, SA-11 v2.13. Each lists the AG07 decisions in its "Decisions that change this epic" table.

**DEV-TASKS section H (H1 – H11)** lists the code changes these decisions need, including H10 (`Filing.status`, `clientCode` at conversion; not built) and H11 (seed `agent/case:waive-deficiency` on the four starter roles; the case keys are not built yet, so it goes in with them).

**AG-01 reading:** where AG-01 consent and countersign text says "the representative", read it as **the retainer's representative**, not the case's lead representative (AG07-D20(c)).

**Next:** AG-02 review, then the order in §5.

## 7. Addendum — AG07-D26 and X-3 (18 Oct, last)

AG-07 v3.0 is updated in the same file (`FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.0_2026-10-18.md`); the history line is in Part D. Replaces the matching lines of section 6:
- **Application numbers sit on each filing** (`Filing.applicationNumber`); `Case.applicationNumbers` is removed; provincial file numbers stay on the case. The letter matcher returns the filing (AG-10).
- **Review is per filing** (`CaseReview.filingIds`), replacing "one review per case". A change after approval shows "Changed since review" and asks one confirmation at submission.
- **An unapproved or unsigned form is an ordinary CRITICAL warning** (passed with `agent/case:waive-deficiency`); "Signed by client" tick for answer-sheet forms.
- **Target filing date** (`targetFilingDate`, replaces `targetClosureDate`): optional, no pre-fill; reminders 2 days before and on the day (AG-11-126); SA-1B-101 "usual processing time" withdrawn.
- **"Step done"** and one-click **"Record step"** on government steps; **Make principal** / **Remove filing**; **Start next stage**.
- **X-3 Expiry watch** (new product rule, 00-Overview rule 17; mechanism AG-11 §3.4a): status-expiry reminders 30/15/7/2 days (90 days extra after the case closes), auto-stop and "Stop watching"; client reminders on for open cases, off for closed. Placeholder, to be specified in the AG-11 review.
- **SA-01B:** new form fields (SA-1B-102), "Country-specific requirements" (SA-1B-103), document expiry placeholder (SA-1B-104), recency warning (SA-1B-105). **AG-09:** document language at upload adds the translation line (AG-9-64).
- **DEV-TASKS H12** (`StageKind` after-decision and closed kinds) and **H13** (the new fields; none built).

**Open questions in AG-07 v3.0 D9:** 35 at this point; **28 after AG07-D27** (below), none for the product owner.

**AG07-D27 (same day, last):** Q118–Q124 answered (AG-07 v3.0 D9.0). Target filing date reminders go to the lead representative when there is no case officer; filings submitted on different days show their own dates; "Step done" can be undone; a reopened withdrawn filing is `OPEN`; readiness counts a form when approved and, if it needs one, signed — the pack's `signedBy` / `signatureMethod` (SA-1B-102; replaces `requiresClientSignature`) with a per-case override and reason; a filing's principal is swapped, never removed directly; **the target filing date counts calendar days** — AG16-6 amended: the firm's business hours apply only to Needs you overdue, lead response time, the approval lead time and booking slots. AG-07 v3.0 open questions: 28.

## 8. Addendum — AG-01 and AG-16 gap check (18 Oct, last)

A silent-gap check of AG-01 and AG-16 (read as the developer who builds them), with an independent verification against code and decisions, led to **AG01-29** and **AG16-105** (decision log). Applied to AG-01, AG-02, AG-04, AG-05, AG-06, AG-07 v3.0 (republished), AG-10, AG-11, AG-12, AG-13, AG-15, AG-16, SA-06, DEV-TASKS.
- **Priority code fix — DEV-TASKS H14:** an Admin can remove the Owner role, including from the last active Owner, and a role-assign holder can change their own roles. AG-01's requirements already forbid it.
- **Sessions:** staff and client sessions end after 28 days unused (built; platform setting). No firm session setting.
- **Handover:** moves all of the leaver's clients' file ownership; appointments move only if AG-04's availability check says the new person is free; "Update representative with the authority" whenever a submitted case's lead representative changes.
- **Suspended staff** get no new work. **A removed licence** warns and moves nothing. **One licence per person.**
- **Firm details:** legal and trading name via support; address, tax number and billing email Owner only; public phone, email, website and branding Owner and Admin (`agent/settings:edit`, DEV-TASKS H15).
- **AG-16:** Recently deleted shows what each person could restore; the 8 notification groups are fixed (§3.3, AG-16-10); four new build cards (AG-16-59, -60, -65, -66); the built Owner-only firm export is the one export; connection states shared with AG-04 and AG-10.
- Each epic lists technical choices under **"Developer decides (gap check, 18 Oct)"** with a suggested default.
- An independent check of these edits is running; results follow.

**Developer hand-over for AG-07 and AG-16:** `DEV-HANDOVER-AG07-AG16_2026-10-18.md` (18 Oct, last) — the note to give developers; it supersedes sections 6–8 of this note for those two epics.

## 9. Addendum — 21 Oct 2026: AG-02 review complete

**New hand-over: AG-02 Leads, prospects and sales v2.0** — `FINAL-Agent-FR/AG-02-prospect-lead-sales-crm_v2.0_2026-10-20.md`. It is the only build source; v1.14 is frozen in `FINAL-Agent-FR/_archive/`. Start at its Page 1.

**Developer hand-over for AG-02:** `DEV-HANDOVER-AG02_2026-10-21.md` — the note to give developers. It lists the 25 epics updated on 21 Oct to match AG-02 (each records the change in "Decisions that change this epic"), the main changes, and what is still open.

**Code changes:** `DEV-TASKS_2026-10-12.md`, section I (role seeds first: a Case Officer cannot open a lead today).

**Decisions:** AG02-D0 to AG02-D19 and product rules X-4, X-5 (decision log, section "AG-02 review — decisions").

**Next:** AG-03 review, then the order in section 5.

## 10. Addendum — 22 Oct 2026: AG-04 review complete

**New hand-over: AG-04 Consultations and booking v2.0** — `FINAL-Agent-FR/AG-04-consultation-and-booking_v2.0_2026-10-21.md`. It is the only build source; v1.9 is frozen in `FINAL-Agent-FR/_archive/`. Start at its Page 1. AG-02 moves to v2.1 (small update; see its box "Changed in v2.1").

**Developer hand-over for AG-04:** `DEV-HANDOVER-AG04_2026-10-22.md` — the note to give developers. It lists the 17 documents updated to match AG-04, the main changes and what is still open.

**Code changes:** `DEV-TASKS_2026-10-12.md`, section J.

**Decisions:** AG04-D1 to AG04-D22 and S1 to S6 (decision log, section "AG-04 review — decisions"). D15–D20 (22 Oct) closed every AG-04 open item: rulings O1–O4 and the Part D7 defaults confirmed; named sets of hours kept as built, each with its own time zone; each person decides their own hours and business hours no longer cap booking slots (closed days still block); no video status on the Team list; Owner and Admin may enter a colleague's time off; AG-14 money shown per currency, never converted (R18). **New product rule X-6 (22 Oct):** CAD and USD only, one currency per prospect or case, locked after the first sent invoice; no currency on a person or company (home: Agent 00-Overview rule 20).

**Order change (the product owner, 21 Oct):** AG-03, AG-08, AG-09 and AG-17 wait for SA-01B v2.0. Next: AG-05.


## 11. Addendum — 25 Oct 2026: AG-05 review and money slice complete

**New hand-overs: AG-05 Retainer, agreements and signing v2.0** — `FINAL-Agent-FR/AG-05-retainer-and-agreements_v2.0_2026-10-25.md` — **and AG-06 Billing and payments v2.0** — `FINAL-Agent-FR/AG-06-billing-and-payments_v2.0_2026-10-25.md`. They are the only build sources; the v1.14 files are frozen in `FINAL-Agent-FR/_archive/`. Start at each Page 1.

**Developer hand-over:** `DEV-HANDOVER-AG05-MONEY_2026-10-25.md` — the note to give developers. It lists the 24 other documents updated on 25 Oct to match (each records the change in "Decisions that change this epic"), the main changes, what is still open and what comes next.

**Code changes:** `DEV-TASKS_2026-10-12.md`, section K (rows K1–K32). Row K1 is the same work as J20 and comes first: no signing or billing event may be emitted before the exchange-rate code is deleted.

**Decisions:** AG05-D1 to AG05-D4 and MS-D1 to MS-D24 (decision log, sections "AG-05 review — decisions" and "Money slice review — decisions"). MS-D20(3) moves the currency lock from the first sent invoice to the first money document sent (X-6 rule 4, as written in section 10 above, is amended).

**Still open:** three questions for the immigration expert (MS-D9, MS-D15, MS-D19(4)); one for SA-08 (can the trust processor account bill fees, refunds and disputes to the operating account); the accountant's tax timing; French consent text for Quebec.

**V1.5 reference code:** the `Expat V1.5` folder is no longer in the workspace. References to V1.5 code in older notes and epics are reference only; do not look for or copy it.

**Next:** AG-10 → AG-11 → AG-12 → AG-13 → AG-15 → AG-14 → AG-18. AG-03, AG-08, AG-09 and AG-17 still wait for SA-01B v2.0.
