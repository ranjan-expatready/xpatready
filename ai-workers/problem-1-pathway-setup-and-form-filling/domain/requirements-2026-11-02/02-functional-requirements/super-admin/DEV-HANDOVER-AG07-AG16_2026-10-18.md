**Updated 25 Oct 2026 (version references):** files with a newer version since the 23 Oct version references, and their current versions. Agent (`FINAL-Agent-FR/`): `99-Phasing-and-Glossary_v1.16_2026-10-25.md`, `AG-01-firm-setup-and-onboarding_v1.26_2026-10-25.md`, `AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md`, `AG-05-retainer-and-agreements_v1.14_2026-10-25.md`, `AG-06-billing-and-payments_v1.14_2026-10-25.md`, `AG-07-case-core-and-delivery_v3.8_2026-10-25.md`, `AG-08-smart-questionnaire_v1.13_2026-10-25.md`, `AG-09-document-management_v1.19_2026-10-25.md`, `AG-10-communication-hub_v1.22_2026-10-25.md`, `AG-12-templates_v2.9_2026-10-25.md`, `AG-13-tasks-reminders-notes-and-activity-audit_v1.18_2026-10-25.md`, `AG-15-client-portal-management_v1.13_2026-10-25.md`, `AG-17-corporate-cases-and-lmia_v0.13_2026-10-25.md`, `AG-18-data-import-and-migration_v1.9_2026-10-25.md`. Super Admin (`FINAL-SuperAdmin-FR/`): `SA-01B-content-pack-configurator_v1.10_2026-10-25.md`, `SA-03-subscription-plans-and-entitlements_v2.28_2026-10-23.md`, `SA-06-rbac_v3.15_2026-10-25.md`. Still current from 23 Oct: `00-Overview_v1.21_2026-10-23.md`, `AG-16-firm-settings-and-integrations_v1.23_2026-10-23.md`, `AG-19-pdf-studio_v1.3_2026-10-23.md`, `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.5_2026-10-23.md`. Older versions are in each folder's `_archive/`. Where this note names an older version of one of these files, use the one listed here.

**Updated 21 Oct 2026:** AG-02 v2.0 is now handed over and 25 epics have new versions. Current versions and how to start: `DEV-HANDOVER-AG02_2026-10-21.md`. Where this note names an older version, use the one listed there.

# Developer hand-over: AG-07 Case Core & Delivery and AG-16 Firm Settings & Integrations (18 Oct 2026)

Product owner: the product owner. Read `DEV-HANDOVER_2026-10-12.md` first if you are new. This note covers only AG-07 and AG-16.
All paths below are inside `team-workspace/`. "Card" means a build card (`BUILD-CARD-STANDARD_2026-10-17.md`).

## 1. What you are getting

| | AG-07 Case Core & Delivery | AG-16 Firm Settings & Integrations |
|---|---|---|
| File | `FINAL-Agent-FR/AG-07-case-core-and-delivery_v3.0_2026-10-18.md` | `FINAL-Agent-FR/AG-16-firm-settings-and-integrations_v1.19_2026-10-18.md` |
| Version | 3.0 (18 Oct) | 1.19 (18 Oct), updated in place |
| Format | New format (X-1): Part A to Part D | Old format: numbered sections, plus 13 full cards |
| Build source | **Only v3.0.** v2.13 is frozen in `FINAL-Agent-FR/_archive/`. Do not build from it. | The v1.19 file. Older versions are in `_archive/`. |
| Size | 12 chapters, 107 cards (Part B) | 13 sections; 13 full cards (`### AG-16-x`); other requirements are bullets in §4 |

**Status of AG-16.** The 18 Oct changes were checked twice. A developer-eye gap check found the gaps. An independent check then verified the findings. Only confirmed findings were applied (change log row 1.19).
**Status of AG-07.** Rewritten as one version (AG07-D21). Requirement IDs, decision IDs and permission keys are the same as in v2.13. Part D, "Questions answered on 18 Oct", records the answers.
**Release 1 is full-featured.** Both epics are Release 1.

## 2. How to read each

### AG-07

1. **Part A, Start here** (about 4,000 words): purpose, key terms (A2), the main flow (A3), the Client E family example (A4), build order (A5).
2. **A5 build order.** Each chapter lists what to build first, which other epics it needs, and what is still pending.
3. **Only your chapter in Part B.** Each card has 14 fields: Outcome, Why, Where, Engine, Rules, States, Data, Access, Events, Safety, Tests, Edge cases, Non-goals, Mode. Field 7 gives code names as `plain name (codeName: type)`.
4. **Part C:** C1 business rules (BR-1 to BR-31), C2 states, C3 data model, C4 permissions, C5 non-functional rules, C6 what is built today, C7 acceptance tests across cards.
5. **Part D is history. It is never a build instruction.** Use it only to look up a reason.
   - **D7 "Where did it go?"** maps every v2.13 ID to its place in v3.0. Use it when an old ID is cited.
   - **D9** holds the open questions (section 6).

### AG-16

1. **Table "Decisions that change this epic (14–18 Oct)"** near the top. It lists each decision, what it changes, and where.
2. **§3.0 settings map:** nine sections, "Set up your tools" links, Advanced, My account.
3. **§3.20 "Settings — defaults and placement":** every setting with its default and where it sits (main screen or collapsed Advanced). Build to this table.
4. **§3.1 to §3.19** explain the screens. **§4** has the requirements (`AG-16-x`). **§7** entities, **§10** permissions, **§12** what exists in code today versus new.
5. **Cards:** AG-16-12, -16, -35, -38, -59, -60, -65, -66, -71, -72, -73, -74, -75. AG-16-10 (the eight notification groups) is a bullet in §4 with one test per group.
6. **Do not build struck-through or WITHDRAWN text.** Warning at the top of §4. It covers §3.10 to §3.12 and US-12 to US-14 as well.
7. **§13:** read "Developer decides (gap check, 18 Oct)" (section 6 below).

## 3. Do first

### Priority security fix: DEV-TASKS H14

File: `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md`, section H, row H14. Code is in `ERv2-sanitized/apps/api`.

| Bug | Where |
|---|---|
| An Admin can remove the Owner role, including from the last active Owner. | `src/authz/role-assignment.service.ts:92-100, 208-210` (bare `deleteMany`, no check) |
| An Admin can give the Owner role, including to themselves. | same file `:122-125, 132-136, 198-201` |
| A holder of `agent/role:assign` can change their own roles. | `src/authz/role-assignment.controller.ts:74-91` |

Fix: only an Owner gives or removes the Owner role. Nobody changes their own roles. A non-Owner must hold every permission of the role. Removing the Owner role is refused if no active Owner would remain. Done when the four tests in H14 pass.

### Other H tasks these epics depend on

All are in DEV-TASKS section H. Where the task says "backend lead decides", you do not fix the placement yourself.

| Task | One line | Epic |
|---|---|---|
| H1 | Rules pin per filing and per person (new `SnapshotPurpose`; key by filing and person). | AG-07 Ch 3 |
| H2 | "Use newer rules" moves every applicant's pin on a filing and copies "Request a document" items. | AG-07 Ch 3 |
| H3 | Case permission catalogue (`agent/case:*`): mint when the case module is built; seed rows and `check:seed-parity` must pass. No code change today. | AG-07 |
| H4 | Document status values: no task. Keys come with AG-09. | AG-07 Ch 4 |
| H5 | Answer sheet output for every mapped form. | AG-07 Ch 5 |
| H6 | XFA trial spike (backend lead). | AG-07 Ch 5 |
| H7 | Person details on `PartyProfile` plus one client-file row per person. | AG-07 Ch 1 |
| H8 | Family member gets a Party; `AnswerSubject.partyId` stays null only for a person not yet born. | AG-07 Ch 1 |
| H9 | Principal sees family answers on a shared case; both parents see a minor's answers. | AG-07 Ch 1 |
| H10 | `Filing.status` (`OPEN`, `SUBMITTED`, `DECIDED`, `WITHDRAWN`) and `clientCode` set at conversion. | AG-07 Ch 1, 3 |
| H11 | Seed `agent/case:waive-deficiency` on Owner, Admin, Case Manager and Case Officer. | AG-07 Ch 6, 7 |
| H12 | `StageKind` gains `AFTER_DECISION` and `CLOSED`. | AG-07 Ch 3 |
| H13 | New fields: `Filing.applicationNumber`, `CaseMilestone.filingId/doneAt/doneByUserId`, `CaseReview.filingIds`, `Case.targetFilingDate`, form signing fields. None are built. | AG-07 Ch 5, 7, 8, 10 |
| H15 | `agent/settings:edit` key, public phone, email and website fields, one licence per person, Recently deleted filter. | AG-16 |

AG-16 also has code tasks in sections C, E, F and G of the same file. Example: E7 (soft delete with 30-day restore, needed for Recently deleted).

## 4. Rules that override anything you read

These come from `FINAL-Agent-FR/00-Overview_v1.17_2026-10-21.md` → "Product rules every epic follows", and from `.claude/skills/expatready-requirements/SKILL.md`.

| Rule | What it means for the code |
|---|---|
| **Newest decision wins.** | If two texts disagree, the later decision (higher date, then higher number) applies. Part D and struck text are history. When unsure, the decision log (`TEMPLATE-MAP-working_2026-10-10.md`) is the reference. |
| **Built stays.** | If code exists, the spec follows the code. Cite `path:line`. Do not rebuild what exists. |
| **Warn, never block (Rule 7).** | A CRITICAL warning is passed, never blocking, by a holder of `agent/case:waive-deficiency` (AG07-D26(2)). Product text names no regulator or statute. |
| **Single home (AG16-11).** | A pointer card means build it where it points. Example: AG-7-16 points to AG-9-63. |
| **People decide, ExpatReady suggests (AG16-31, AG16-76).** | Nothing is committed without a click. New client-facing automation needs the product owner's approval. |
| **Quiet by default (AG16-42).** | Show rather than push. Notify only when someone is handed work. |
| **Zero setup, defaults first (Rule 9).** | Every setting has a default and a placement. Small firms, up to 15–20 staff. |
| **Release 1 is full-featured.** | Never defer a day-to-day feature to Release 2 to save time. Ask the product owner. |

## 5. What changed on 18 Oct that affects your build

Full text: `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`.

| ID | What it means for the code | Where |
|---|---|---|
| AG07-D22 | One application number per filing. Principal is the case's client. `Filing.status` has four values. `clientCode` set at conversion. Several filings can be submitted in one action (one `Submission` each). Employer seats are Release 1. | AG-7-45, -31; H10 |
| AG07-D23 | A minor's answers show to both parents on the case. No "Keep private" tick for a minor. | AG-7-79, -107; H9 |
| AG07-D24 | A person without the pass permission cannot click Record submission while a CRITICAL warning is open. The screen names who can pass it. Nothing is held as pending. | AG-7-28, -31 |
| AG07-D25 | Admin also holds `agent/case:waive-deficiency` by default. | H11 |
| AG07-D26 | Application numbers on each filing. Unapproved or unsigned form is a CRITICAL warning (with "Signed by client" tick). Review is per filing, with "Changed since review". Target filing date replaces the target closure date. "Step done", "Record step", "Make principal", "Remove filing", "Start next stage". | Ch 3, 5, 7, 8, 10; H12, H13 |
| AG07-D27 | Target-date reminders go to the lead representative if there is no case officer. "Step done" can be undone. A reopened withdrawn filing is `OPEN`. A form counts when approved and, if needed, signed (`signedBy`, `signatureMethod` in SA-1B-102). **Case target dates count calendar days.** Working-time clocks count open hours. | AG-7-91, -101, -13, -24, -27; AG-16-59, -60 |
| X-3 | Expiry watch (staff reminders 30/15/7/2 days before, stoppable; client reminders on for open cases, off for closed). Home: AG-11 §3.4a. **Placeholder only: specified in the AG-11 review. Do not build from AG-07.** | D9 Q109, Q117; 00-Overview rule 17 |
| AG01-29 | Task "Update representative with the authority" when a submitted case's lead representative changes. Handover moves all the leaver's clients. Suspended staff get no new work. Removed licence moves nothing. Firm details: who edits what (`agent/settings:edit`). One licence per person. H14 bug. | AG-7-35, -43, -44; AG-16-1, -2; H14, H15 |
| AG01-30 | Deadline for a suspended person's case is treated as "nobody watching". Dunning escalation is in the Payments notification group, in-app only. | AG-11-47; AG-16-10 test 7 |
| AG16-104 | Restore from Recently deleted uses the same key as deleting. No new key. | AG-16-65 |
| AG16-105 | (1) Recently deleted shows each person what their delete keys allow. (2) The eight notification groups are a fixed list, with email defaults and one test each. | AG-16-65, AG-16-10, §3.3 |
| AG16-106 | `agent/billing-config:currency` is withdrawn. Default currency uses `agent/settings:edit`. | AG-16 §10 |

AG-16 row 1.19 also records the AG07-D6 change: a case notifies staff only for four events: assigned to me, review requested from me, my review sent back, approval waiting (§3.3).

## 6. Open items and how to handle them

### AG-07: 28 open questions (Part D, D9, "Questions still open")

| Owner | Count | Questions |
|---|---|---|
| Backend lead | 24 | 54, 55, 66–72, 75, 76, 80, 81, 89–93, 96, 104–107, 113 |
| Backend lead, with AG-10 | 1 | 110 |
| Backend lead; step type by the immigration expert | 1 | 109 |
| Immigration expert (with AG-11 for 117) | 2 | 82, 117 |

No open question is assigned to the product owner. Nearly all are data-field or storage choices.

- **A card that says "Open — see D9 Qn" is not guessed.** Do not pick a field name or a place yourself.
- **Technical question:** the backend lead decides and records the choice in the card or in Part C3.
- **Product question:** ask the product owner.
- Each open question gives both options neutrally.
- **Known placeholders:**
  - **X-3 expiry watch** (Q109, Q117): AG-07 shows nothing yet for status dates, restoration or maintained status. It is specified in the AG-11 review.
  - **AG-7-16** is a pointer card. Its home is AG-9-63 (AG07-D20(d)).

### AG-16

- **§13 "Genuinely open": none.** All 13 items (4, 9, 16, 18, 20–28) are struck through and closed on 17–18 Oct.
- **"Developer decides (gap check, 18 Oct)": 18 items.** Each gives a question and a **suggested default** (for example: Escalation and At-risk values live in `FirmSetting`; the key `agent/mfa-policy:manage` is renamed to `agent/security-policy:manage`).
- Use the default unless the backend lead decides otherwise. Record the choice.
- If the question is about product behaviour, ask the product owner. Do not decide it.

## 7. Dependencies on other epics

| Epic | AG-07 | AG-16 |
|---|---|---|
| AG-01 | Offices (AG01-10), default lead representative (AG01-5), deactivation screen (AG01-8), stored signature (AG01-20). | Single home for profile, branding and Team. `Office.timezone` (AG-1-74). |
| AG-02 | Person record, client file record, duplicate check (Ch 1). | "Set up your tools" link to Leads. Deletion rules for Recently deleted. |
| AG-04 | Not named in AG-07 A5. | Meeting entities `MeetingAccountConnection`, `myMeetingLink` (AG-04 §7); bookable slots read closed days; business hours no longer cap them (AG04-D22, 22 Oct). |
| AG-06 | Billing summary (AG-6-28), government fees (AG-6-42), overdue invoice on the header. | Getting paid: screen placed here, rules owned by AG-06. Payments group shown to `agent/invoice:list` holders. |
| AG-08 | Answers; `agent/sqr:verify`. | Only cites the key `agent/sqr:verify`. |
| AG-09 | Statuses (AG-9-26), "Request a document" (AG-9-63), document language (AG-9-64). | Deletion and restore follow AG-09 (Recently deleted). |
| AG-10 | Letter matcher (AG-10-73, -78), bounce warning (AG-10-60), no-login link (AG-10-85), 08:00–20:00 client window. | `MailboxConnection` is the one mailbox entity; "Always create leads" rules (AG-16-72). |
| AG-11 | Conductor (`case.stage_changed`), Needs you, Checker, Minder reminders (AG-11-125, -126). | Escalation: who is alerted is a pointer to AG-11. Reconnect clears the home-screen item (AG-11-118). |
| AG-13 | Timeline (AG-13-30), tasks (AG-7-44). | Deletion and restore rules; reminders. |
| AG-15 | Invite and portal panel (AG-15-1, -9), employer seats. | "Client portal" link; client consent screen. |
| SA-01B | Pack form lines `signedBy`, `signatureMethod` (SA-1B-102); government steps (SA-1B-45, -64 to -69). | Not cited. |
| SA-06 | Client keys, role seeding (H3, H11), `agent/case:*` keys. | Permission catalogue; `agent/settings:edit`; Owner-only actions. |

Other dependencies are listed in AG-07 A5 and AG-16 §3.0.

## 8. Who to ask

| Person | Ask about |
|---|---|
| **The product owner** | Product behaviour, scope, immigration practice. Anything that touches Release 1 or Release 2. |
| **Immigration expert (the immigration expert)** | Pack content: government steps, form sets and editions, document checklists, deficiency list, submission references, decision outcomes (AG-07 A5 list). Q82, Q109 (step type), Q117. |
| **Backend lead** | Technical choices: field placement, keys, migrations, events, "Developer decides" items. Q54–Q113 in D9. |
