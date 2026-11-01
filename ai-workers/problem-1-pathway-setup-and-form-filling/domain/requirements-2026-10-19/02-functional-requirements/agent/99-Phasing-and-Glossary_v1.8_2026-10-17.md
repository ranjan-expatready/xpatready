> **Document control** · Version **1.8** · **2026-10-17** · Status: **Updated — AG16-54 to AG16-82 standing rules applied (17 Oct)**\
> Part of: *Agent (RCIC/Lawyer) Console — Functional Requirements* · Split from `FINAL-Agent-FR.md` lines 10803–10849 on 2026-09-16 · Previous version: `_archive/99-Phasing-and-Glossary_v1.7_2026-10-17.md`\
>
> | Version | Date | Change | Decisions |
> |---|---|---|---|
> | 1.8 (18 Oct, D26 / X-3) | 2026-10-18 | *18 Oct (later): AG07-D26 and X-3 applied to the key terms.* **Changed:** target-date becomes **target-filing-date** (`targetFilingDate`; the term id changes with it; no pre-fill from processing times), early-warning, application-number (per filing, `Filing.applicationNumber`), internal-review (per filing), critical-warning (an unapproved or unsigned form), answer-sheet ("Signed by client" tick), submission, government-step, deadline, on-hold (wording). **Added:** changed-since-review, step-done, expiry-watch. | AG07-D26, X-3 |
> | 1.8 (18 Oct, key terms aligned) | 2026-10-18 | *18 Oct (later): key terms aligned with the AG-07 v3.0 plan.* Key terms section reordered to the plan's order (section 4). **Added:** client, client-type, related-contact, file-owner, licensed-user, needs-a-lead-representative, delivery-stage, stage-kind, board-placement, on-hold, binder, form-edition, override, verified-value, self-approved, severity, critical-warning, checker, government-date, business-hours, provincial-file-number, letter-library, tell-the-client, withdraw, close-outcome, change-stream, government-fees, bill-to, shareable-document, not-started, person-time-zone, timeline, audit-log, notification, starter-roles. **Changed:** the Client E examples now show three filings (Client B's work permit, Client A's open work permit, Client D's study permit) on one dated timeline; cast note adds Client Q and Client G; stage (any board position), delivery stage and government step (a recorded event only) separated; client number is shown as "Client code"; target date and early warning use one example (120 days: amber Tue 9 Feb 2027, target Fri 5 Mar 2027); document request and hiding checklist items (`agent/case:configure-pack`) kept apart; rules version is one pin per person on a filing. No requirement or phasing change. *18 Oct (later): AG07-D27(7) applied — the terms "Target filing date" and "Early warning" say the window counts calendar days (Client E example: amber from Tue 17 Nov 2026, reminders Wed 18 Nov and Fri 20 Nov). "Business hours and closed days" does not list target dates, so it is unchanged.* *18 Oct (final): AG07-D23 applied — the AG17-D51 Release 2 list no longer holds employer portal extra seats (Release 1, AG07-D22 Q49, AG07-D23). No key term mentions a minor's answers or "Keep private from the principal", so none changed.* | X-1, X-2, AG07-D1 – D21, AG07-D23, AG07-D27 |
> | 1.8 (18 Oct, key terms) | 2026-10-18 | *18 Oct: key terms for cases and delivery added (X-1 rule 4).* New section "Key terms — cases and delivery" (44 entries in a fixed format that a script copies into the epics). Four glossary rows corrected to match decisions: **Case** (a case holds filings, each with its own program — AG07-D8(a), (c)), **Country pack** (delivery stages are not pack content — AG17-D64), **Filler** (answer sheet at launch — AG07-D17) and **Client** (email first, portal optional — AG16-92). | X-1, AG07-D8, AG07-D17, AG16-92, AG17-D64 |
> | 1.8 (18 Oct, later) | 2026-10-18 | *18 Oct (later): consistency fixes after expert review — AG07-D12, SA6-D5, X-2 (5).* Persona "Case Officer / Paralegal" renamed "Case Officer"; the Client time zone glossary line now points at the person's time zone on `PartyProfile` instead of `Contact.timezone`. | AG07-D12, SA6-D5, X-2 |
> | 1.8 | 2026-10-17 | *Same-day fixes (17 Oct): AG16-83 – AG16-88 — closed-days and "possible new enquiries" glossary lines updated (item 1); new term English first (AG16-88).* Second pass (the product owner, 17 Oct). **Glossary:** three standing rules added: *a duplicate beats a miss* (scoped to what staff can see), *design checks* and *help people, don't replace them; do, don't overdo*. **Writer** entry: Translate and Summarise in the staff member's own language, saved with the email; AI drafting of letter-library entries is not a Writer job (AG16-81). No Release 1 phasing change. *Same-day fixes (18 Oct): AG16-89 — glossary line "Show me possible new enquiries" withdrawn; new term "Assign to… / Take it"; "Personal mailbox" and "Waiting on us" lines aligned with the simplified mailbox model (AG-10).* *Same-day fixes (18 Oct): AG16-90 — withdrawn "biometrics countdown" recipe removed from the Release 1 row (five more recipes become four; AG16-83 #26); glossary entries "Not brought in", "Waiting on us" and "Client quiet hours" rewritten from AG16-67, AG16-57/AG16-78 and AG16-56; the open two-list WhatsApp note closed; AI switch lines changed to Owner only on and off (AG16-80).* | AG16-60, AG16-63, AG16-74, AG16-76, AG16-81, AG16-89, AG16-90 |
> | 1.7 | 2026-10-17 | AG-16 review, second round (the product owner, 15–17 Oct). **Glossary:** new terms Home screen, Not brought in, Waiting on us, No reply needed, Payments to record, Letter library, New letter patterns, Firm mailbox, Personal mailbox, Main mailbox, Show me possible new enquiries, Not on this case, WhatsApp coexistence, Client quiet hours, Client time zone, Office time zone, Changed from default, Journey stage, My meeting link, Drafter and the four standing rules (ExpatReady suggests, the firm decides · AI reads, rules check, a person confirms · Quiet by default · Never quietly judge). Changed: Doer, Reader, Sorter, Writer, Needs you, Done for you, My Tasks, Unmatched inbox (now **Unmatched**). **Phasing:** every new capability of AG16-24 – AG16-53 is Release 1 (Must) except as noted; the in-house video room is not in Release 1 (AG16-53); F5 monthly counts were skipped (not a Release 2 item); the Release 1 row's home screen, closed-days and quiet-hours wording updated. | AG16-24 – AG16-53 |
> | 1.6 | 2026-10-14 | AG-16 review (the product owner, 14 Oct). **Doer family:** one family of 14 everyday (non-AI) Doers (the 12 listed plus the built Qualifier and Finder) plus 4 AI Doers with an AI badge; the AI writer is renamed **Writer** (was Drafter; "Drafter" now means only the non-AI document generator); glossary adds **Qualifier** and **Finder** (built) and notes Reminder and Messenger have no separate code entry yet. **Withdrawn from Release 1:** Team safeguards (switch, four parts, backup approver), Four-eyes on government forms (the "Self-approved" record stays), Supervised client messages, licence-aware approval of AI-written client text. **AI Doers stay Release 1**, off until the provider is recorded; Owner turns on, Owner or Admin turns off. **One Escalation switch** (Advanced, `agent/firm-capability:manage`) replaces the three escalation rules; at-risk marks are a separate switch. "Review your automatic messages" becomes the **Automatic messages page** (AG-12 is the only spec home); the separate recipe on/off and the Advanced autonomy table are withdrawn. Working days use the **firm's own closed-days list**, not a pack holiday list. Glossary: Doer, Writer (was Drafter), Autonomy level, Needs you, Team safeguards, Four-eyes, Self-approved, Licensed user and the former "Standard messages review" / "Automatic messages review" term updated. *Same-day audit corrections (14 Oct): Doer count corrected to 14 everyday + 4 AI and the open point closed; AI-edited-template per-send floor removed from "Autonomy level" (AG12-D25); Release 2 row no longer lists AG-16 own integrations, data export or security settings (Release 1: AG16-1 section 7, AG16-15, AG16-18).* | SR-Q1c, R5, SA-Q3, AG16-3, AG16-4, AG16-6, AG16-8, AG16-9, AG16-11, AG16-12, AG16-19, AG16-20, AG16-22 |
> | 1.5 | 2026-10-12 | SA05-R9a (the product owner, 12 Oct) - automatic messages run from day one: the Release 1 AG-11/AG-16 phasing text, the glossary terms Autonomy level and Template message, and the former "Standard messages review" term (now "Automatic messages review", an optional on/off page) no longer describe a one-time confirm screen or a hold. Autonomy levels and AI floors unchanged. See "Applied from other modules" below. | SA05-R9a, AG12-D23 |
> | 1.4 | 2026-10-04 | Agent-native operation (the product owner, 4 Oct). Phasing: Release 1 now includes a **minimal Conductor with a seeded recipe set** (AG11-D3), autonomy levels and the Needs you inbox (AG11-D1, D2, D7), the AI Doers Reader/Sorter/Drafter/Checker (AG11-D4), new triggers (AG11-D5), WhatsApp inbound (AG11-D6) and the new module **AG-18 Data Import & Migration** (AG18-D3: clients, cases, key dates, documents, notes and history; AG-2 lead CSV un-parked via AG-18). Release 2 keeps the visual builder, firm-authored recipes, firm-designed Minder cascades, custom cron and further recipes (AG11-D3); proactive outbound WhatsApp and SMS (AG11-D6); invoices/payment history, opening balances and source-system adapters (AG18-D3, AG18-D5). Dry-run and the unmatched inbox move from Release 2 to Release 1 (engine dry-run AG11-D3; Sorter low-confidence routing AG11-D4). SMS/WhatsApp removed from the "Later" row. Glossary: added Reader, Sorter, Drafter, Checker, Autonomy level, Needs you, Done for you, Import batch, Dry-run preview. Same day (simplify): Phasing — **Team safeguards is Release 1** (AG11-D9); Release 1 wording revised (template messages send automatically, "defaulting to approval" replaced; escalation and at-risk marks are Team safeguards parts, on from 5 staff, no longer "off by default"; AG-16 switches line). Glossary: added Team safeguards, Template message, Four-eyes; updated Needs you, Autonomy level, Doer (Minder entry). Same day (review fixes): Release 1 row carries the AG18-D9 / D10 wording (quiet imports, "Not started", preview by recipe and action type, 14-day undo, past key dates, "Verify imported values", per-document Reader review, attestation, imported correspondence never sent), the four-part Team safeguards and the "Review your standard messages" step (AG11-D11, D12); new **Release gate** — AI Doers and WhatsApp inbound ship built but switched off until SA-08 / SA-11 record a provider (AG11-D13). Glossary: **Four-eyes** fixed (AG11-D9 revised), **Autonomy level** (inline approval, product floors, labels), **Doer** (what it is; AI vs non-AI), **Team safeguards** (four parts), **Needs you**, **Template message** and **Import batch** updated; added **Not started (quiet)**, **Self-approved**, **Unmatched inbox**, **Filler**, **Reviewer**, **Licensed user**, **Standard messages review**. Same day (final alignment): Glossary — **Drafter** is an AI Doer (AG11-D4); **Needs you** names the Owner form exception (AG-7-68); **Team safeguards** adds the backup approver and its scope. Release 1 row: Supervised client messages appear on the main settings screen only while the firm has an active unlicensed messaging user. Same day (5 Oct): AG1-D19 — no licence monitoring; licensed user = linked by the firm. 5 Oct (open questions closed): AG11-D14 to D17 and AG18-D11 applied. Phasing: Release 1 AG-10 now includes the **Gmail and Microsoft 365 mailbox connection** (OAuth) so inbound email reaches the Sorter, and Release 2 "AG-10 full two-way IMAP" becomes **"IMAP for other providers"** (AG11-D16); Release 1 AG-11 adds the **waiting times the firm can change** (chase 5 days / every 7 / at most 4; Needs you overdue after 2 working days; government-deadline approvals 2 working days ahead — AG11-D17); AG-18 adds assisted migration **free for every firm at launch** and "a running import cannot be stopped" (AG18-D11(a), (f)). **Release gate** now says AI and OCR processing happens only in Canada (AG11-D15) and that every outside provider is approved by Super Admin (AG11-D14). Glossary: added **Verified sender**, **Client paused**; updated **Needs you**, **Import batch**. **5 Oct (Release 1 scope review):** moved into Release 1 — proactive outbound WhatsApp with provider-approved templates (preferred channel per client, email fallback), a person-clicked "Create lead" for unknown WhatsApp numbers, IMAP mailbox connection (AG11-D16 revised), five more ready-made recipes (no-show recovery, going-cold, post-consult, biometrics countdown, PR card / status expiry watch), the Reader's extra document types (IRCC/government letters, language test results, ECA reports) (AG11-D18) and the Officio and CaseEasy import adapters (AG18-D12). Release 2 now keeps SMS, the visual builder, firm-authored recipes, firm-designed reminder chains, custom cron, manual enrolment into a sequence, invoices/payment history and opening balances, and Clio and other adapters; the AG17-D51 corporate list is unchanged. Release 1 and Release 2 rows, Release gate, and the Reader glossary entry updated. 5 Oct (final check fixes): glossary — Unmatched inbox entry notes the "Create lead" action for an unknown WhatsApp number (AG11-D18(b)). | AG11-D1–D7, AG18-D1–D8 · AG11-D9 · AG11-D11, D12, D13 · AG18-D9, D10 · AG1-D19 · AG11-D14 to D17 · AG18-D11 · AG11-D18 · AG18-D12 |
> | 1.3 | 2026-10-03 | Consistency review fixes (3 Oct): the phasing table is rewritten in **Release 1 / Release 2** terms — Release 1 = ExpatReady go-live, including AG-17 (full LMIA) and the Minder core (standard reminders; escalation and at-risk marks opt-in, off by default); Release 2 per AG17-D51 (exempt offers and endorsements, full employer qualifier, employer portal logging and extra seats, corporate dashboard, full post-approval compliance, recruitment engine) plus the earlier breadth items; the superseded "Phase 1 = one individual client" wording and the Minder-in-Phase-2 placement are removed; AG-17 added to the table. Glossary: Deficiency now "shown as a warning; CRITICAL ones are fixed or passed with a reason"; Minder entry in plain words (the "compliance moat" phrase removed). Module-level Release mapping beyond AG17-D51 follows the earlier Phase 1 / Phase 2 split and is still to be confirmed. | AG17-D51, AG17-D55, AG17-D60, AG17-D70 |
> | 1.2 | 2026-10-02 | Phasing: release-vocabulary note added (phase assignments unchanged). Glossary: added View (Individual / Corporate), Corporate case, Position, Linked worker case, Critical warning; "My Day" renamed "My Tasks"; Minder entry notes core reminders in Release 1. | AG17-D4, AG17-D55, AG17-D60, AG17-D61 |
> | 1.1 | 2026-08-28 | Baseline — complete document v1.1 | — |

## Phasing

> **Release vocabulary replaces Phases (AG17-D60).** ExpatReady plans in **Release 1** (go-live) and **Release 2** (AG17-D51). Release 1 includes AG-17 Corporate Cases & LMIA (a full LMIA end to end) and the Minder core (AG17-D55). The old "Phase 1 = single individual client demo" plan is superseded. Where a module's split between Release 1 and Release 2 is not stated below, it follows the earlier Phase 1 / Phase 2 split and is to be confirmed.

**Release 1 is the ExpatReady go-live:** one complete, sellable end-to-end journey on the **Canada country pack** for individual clients *and* corporate (LMIA) clients, firm-branded and auditable. **Release 2** adds the corporate services and depth listed below, plus breadth across roles, automation and reporting. Later releases add advanced depth and additional country packs at the **platform** level (a firm remains single-country — FD-68).

| Release | Theme | Scope (this document's modules) | Rationale |
|---|---|---|---|
| **Release 1 — go-live** | Individual journey and full LMIA, one country | **Individual journey (the "Client A" spine):** **AG-9** (upload, request-from-client, accept/reject, versioning, generate + e-sign); **AG-10** (outbound email, **Gmail, Microsoft 365 and IMAP mailbox connection for inbound email** (AG11-D16, AG11-D18(c)), per-entity timeline, in-app client messaging, templated sends, core notifications); **AG-12** (clone/edit/merge-fields/preview for retainer + core lifecycle templates); **AG-13** (tasks, reminders, notes, activity timeline, immutable audit); **AG-15** (invitations, per-client access scope, two-sides-one-wire upload/form/pay/sign, plain-language status); **AG-16** (branding, invoice config, personal notification settings, the firm and personal mailbox and personal calendar connections, on every plan (AG16-15, AG16-18, AG16-24), the two-step sign-in switch, "export all firm data" and Recently deleted in Security & your data (AG16-1, AG16-21) *(added same day — audit)*, the AI switch — only the Owner turns AI on and off *(changed 18 Oct — AG16-90; AG16-80)* — and the **Automatic messages page** (AG-12 is its only spec home); under Advanced, one **Escalation** switch and an at-risk-marks switch (Owner or Admin) and a Developer API screen) *(changed v1.6 - AG16-11, AG16-22, AG16-8, AG16-10, AG16-20; Team safeguards, Supervised client messages, "Who may approve AI-written client text" and the Advanced per-recipe autonomy table withdrawn v1.6 - SR-Q1c, R5, AG16-11)*; a core **AG-14** sales/case/financial snapshot. **AG-11:** a **minimal Conductor** (triggers, conditions, Doer dispatch, idempotency, retry/dead-letter, guardrails including the CASL gate and rate caps, run history, dry-run) with a **seeded recipe set enabled at firm provisioning** — speed-to-lead, document-received acknowledgement + verify task, missing-document chase, e-sign → onboarding (AG11-D3), **plus ~~five~~ four more ready-made recipes** *(changed 18 Oct — AG16-90)* in the library and as rows on the Automatic messages page (AG-12; each row: Send automatically / Ask me first / Off — no separate on/off per recipe) *(changed v1.6 - AG16-11)* — ~~**biometrics countdown** and~~ **PR card / status expiry watch** (a service reminder, on by default; ~~biometrics countdown~~ withdrawn — AG16-83 #26) and **no-show recovery**, **going-cold follow-up** and **post-consult follow-up** (off until the firm ticks them on; the consent gate applies) — with timings the firm can edit and immigration lead times and wording from the Country Pack via the Immigration-SME (AG11-D18(d)), with **waiting times the firm can change** — chase first after 5 days, then every 7 days, at most 4 reminders, set on the Missing-document chase row of the Automatic messages page (AG16-12); an approval in Needs you overdue after 2 working days; anything linked to a government deadline approved at least 2 working days before it, otherwise due immediately and urgent (AG11-D17) — those two timings sit under Advanced → Waiting times (AG16-12). Working days count the **firm's own closed-days list** (empty until the firm adds days; the firm may add suggested provincial and federal holidays with one button, and nothing is saved until it clicks Add), and use the case's office time zone once a second office exists *(changed v1.7 - AG16-45, AG16-46)*; government dates are calendar dates and never move (AG16-6, AG16-7); **autonomy levels** on every automated action (shown as "Send automatically / Ask me first / Off"), template messages defaulting to AUTO and running from day one, nothing held for a review — and AI-written client text, AI-edited templates, government forms and unlooked-at profile values held at approval (AG11-D1; AG12-D23) *(changed v1.5 - SA05-R9a)*; ~~**licence-aware approval**, **supervised client messages** and **Team safeguards** (four-eyes, routing to supervisors, backup approver, on at 5 staff)~~ — *Withdrawn v1.6 — SR-Q1c, R5, AG16-9*; approving AI-written client text uses the sending permission (SR-Q10); the **home screen** — Needs you, My Tasks, Waiting on us, Payments to record, Unmatched, Done for you, empty sections hidden (AG11-D2, AG11-D7; *changed v1.7 - AG16-40*); the four AI Doers, which stay in Release 1 (AG16-3) — **Reader** (identity documents, IRCC/government letters, language test results, ECA reports, and document-type classification; a deadline read from a letter is proposed, approved, then registered with the Minder; final list confirmed by the Immigration-SME — AG11-D18(e)), **Sorter**, **Writer** (was Drafter — AG16-4) and **Checker** (AG11-D4) — built, but **off for every firm until the processing terms are recorded** (release gate below; AG11-D13); new triggers (AG11-D5); Messenger/Reminder for consult reminder, retainer chase, document nudge + run log, **and the Minder core** — standard deadlines registered directly by any module, always on, no firm set-up, reminding the file owner; one **Escalation** switch (on by default, Advanced, Owner or Admin) alerts everyone who can reassign cases about government deadlines (2 days before and on the day) and Needs you items overdue; the person who is responsible is not alerted twice; overdue tasks are not pushed to others; at-risk marks are a separate switch (AG17-D55, AG16-22, AG16-8) *(changed v1.6 - AG16-22; Team safeguards parts withdrawn)*. **AG-10 (agent-native):** Sorter filing of inbound email/portal/WhatsApp messages, unmatched inbox, inbound email through the firm's own Gmail, Microsoft 365 or IMAP mailbox (AG11-D16, AG11-D18(c)), WhatsApp inbound with in-window replies, **proactive outbound WhatsApp** using provider-approved templates (consent per recipient at send time, quiet state, rate caps as for email; automatic non-urgent messages reach clients only between 08:00 and 20:00 in the client's own time zone, fixed *(changed v1.7 - AG16-49, AG16-51)*; a **preferred channel** per client, email or WhatsApp; WhatsApp goes only through the firm's own connected WhatsApp Business account — with no connection, no approved template, or a Paused or Rejected template, the message goes by email; there is no shared ExpatReady number) *(changed v1.6 - AG16-19)*, and a person-clicked **"Create lead"** for an unknown WhatsApp number in the Unmatched inbox — never automatic (AG11-D4, AG11-D6, AG11-D18(a), (b)). SMS stays Release 2. **AG-17 (full LMIA):** corporate clients, LMIA files from set-up to compliance, recruitment compliance, quality check, worker hand-off to individual cases. **AG-18 (data import & migration):** one import engine; clients (people and employers), cases (open, and closed as summary records), case key dates registered with the Minder, documents (bulk upload/zip, filed by the Reader), notes and correspondence history; dry-run preview, mapping, duplicate detection, undo of a whole batch (14-day window); the AG-2 lead CSV import runs on it (AG18-D2, AG18-D3); **Officio and CaseEasy source-system adapters**, each built only after a real export sample from a firm is obtained and checked (AG18-D12). **Imports are quiet** — records stay "Not started" (no client-facing automation) until the firm switches them on per client or batch, after a preview by recipe and action type (AG18-D9, D10); past key dates are recorded without reminders unless the case is open and the date is expired or due soon, and an import never triggers escalation or at-risk marks; imported values stay unverified until "Verify imported values"; Reader results from imported documents are reviewed one document at a time; the Owner attests the data transfer on every batch with personal data; imported correspondence and notes are historical and never sent; assisted migration by Expat Ready staff is included free for every firm at launch, and a running import cannot be stopped — it finishes and is undone in one click (AG18-D11(a), (f)). | Proves the full lead → assessment → consult → retainer/e-sign → payment → case delivery → portal journey, and an LMIA file from set-up to hand-off, fully firm-branded and auditable. This is what sells the product. |
| **Release 2 — Breadth and corporate depth** | More corporate services, many roles, automation depth, reporting | **Corporate (AG17-D51), in order:** other corporate services (exempt offers, endorsements) · full employer qualifier · employer portal logging *(extra seats removed from this list — they are Release 1, AG07-D22 Q49, AG07-D23; changed 18 Oct — AG07-D23)* · corporate dashboard · full post-approval compliance · recruitment engine. **Other modules:** **AG-11** visual builder, firm-authored recipes, firm-designed reminder chains (Minder cascades), custom cron and manually enrolling a lead into a sequence (AG11-D3, AG11-D18(d)); **SMS** (AG11-D6, AG11-D18(a)); **AG-18** invoices/payment history, opening balances, and Clio and other source-system adapters (built only after a real export sample from a firm is obtained and checked — AG18-D3, AG18-D5, AG18-D12; Officio and CaseEasy are Release 1); **AG-12** bilingual parity tooling + source re-sync/diff; **AG-13** structured notes + rich audit export; **AG-14** full sales/case/financial/productivity dashboards + drill-through + scheduled reports; **AG-15** engagement-monitoring dashboard + granular per-stage visibility; **AG-9** bulk export + retention policy. | Turns the go-live product into a complete operating system a firm runs daily; automation and reporting become differentiators. |
| **Later — Advanced / additional country packs** | Depth and scale | Advanced automation branching; obligation packs authored at breadth for further destination countries (each account still consuming exactly one — FD-68); advanced/custom report builder in AG-14; deeper portal personalization. | Scales the **platform** across multiple destination countries and high-volume firms once the core is proven and adopted. |

**Release 1 additions, AG16-24 to AG16-53 (17 Oct).** All are Release 1 (Must) unless a line says otherwise. Each rule has one spec home (in brackets); this table only lists scope.

| Capability | Decision | Home |
|---|---|---|
| Own mailbox and own calendar on every plan; "Own WhatsApp account" stays a plan extra | AG16-24 | AG-10, AG-04, AG-16 |
| "Connect your email" with roles set by context: firm mailbox, personal mailbox, several firm mailboxes with one main address | AG16-25, AG16-28 | AG-10, AG-16 |
| Email filing order (thread, reference number, address on exactly one open case, else Unmatched); Move and Un-file | AG16-26, AG16-44 | AG-10 |
| Government mail: recognised by domain, matched by application number, UCI or provincial file number, identified by the letter library, sorted FYI / Action / Noise, deadline by rule; works without AI | AG16-27 | AG-10 (content: SA-01) |
| PDF upload and home-screen drop run the letter library; bulk drop | AG16-41 | AG-09 |
| "Tell the client" from a letter task; "Last update" date in the client portal | AG16-42 | AG-10, AG-12, AG-15 |
| Unrecognised letters: staff pick the type; de-identified pattern to ExpatReady | AG16-43 | AG-10, SA-01 |
| "Waiting on us", "No reply needed", automatic owner of a firm-mailbox thread | AG16-29 | AG-10 |
| "Payments to record" from payment-notice emails | AG16-30 | AG-06 |
| Leads from website-form notification emails (Owner or Admin says Yes once per sender); possible-duplicate prompt | AG16-32, AG16-44 | AG-02 |
| "Not on this case" label; "Make task" and "Remind me if no reply"; attachment fulfils a document request | AG16-35, AG16-36, AG16-38 | AG-10, AG-13, AG-09 |
| Mailbox go-live: deactivation warning, Microsoft admin approval in setup, three ways to connect Gmail | AG16-37 | AG-10, AG-16 |
| Translate and Summarise thread (plans that include AI) | AG16-39 | AG-10 |
| AI Doers are included in higher plans, not sold as an add-on | AG16-34 | SA-03, AG-16 |
| Home screen with six sections | AG16-40 | AG-11 |
| Quiet by default; "Not brought in" list per mailbox | AG16-42, AG16-44 | AG-10 |
| Office time zone (only once a second office exists); escalation by office is dropped | AG16-45, AG16-51 | AG-01, AG-16 |
| Closed days: suggested holidays, one "Add these every year" tick (no December nudge, no per-day "Same date every year" tick) (fix 17 Oct — AG16-83 item 1, AG16-79) | AG16-46, AG16-79 | AG-16 |
| Automatic messages page: groups by journey stage, search, "Changed from default" filter, link from history | AG16-47 | AG-12 |
| WhatsApp coexistence (keep the current number and app), history import choice, "Sent from phone" | AG16-48, AG16-51 | AG-16 (connect screen), AG-10 (filing, import) |
| Client quiet hours: 08:00–20:00 in the client's time zone, fixed; client time zone field *(changed 18 Oct — AG16-90: the window now applies only to "other" automatic messages; day-based and booked-time messages follow AG16-56)* | AG16-49, AG16-51, AG16-56 | AG-10, AG-07 |
| Government-deadline reminder with no one assigned goes to the Owner (Escalation off) | AG16-50 | AG-11 |
| Own mailbox and calendar need no permission to connect | AG16-52 | AG-16 |
| Video links per person: Meet or Teams from the connected calendar, "Connect Zoom", "My meeting link", paste a link | AG16-53 | AG-04, AG-16 |

**Not in Release 1, and not moved to Release 2.** The **in-house video room** is not in Release 1 (AG16-53; the product owner accepted this on 17 Oct under the Release 1 rule; nothing is built; it can be revisited). **F5 monthly counts** were skipped (AG16-35 queue note, the product owner 17 Oct: not day-to-day work; no Release 2 placeholder; can be added later from existing logs). **Go-live items** that gate these capabilities (SA-08): Google verification and the yearly security assessment (CASA), Microsoft publisher verification, a WhatsApp provider that supports coexistence, and Zoom Marketplace approval (AG16-37, AG16-48, AG16-53).

> **Release gate (AG11-D13).** The AI Doers (Reader, Sorter, Writer, Checker) and WhatsApp (inbound and proactive outbound) ship in Release 1 **built but switched off** for every firm until Super Admin (SA-08 / SA-11) has recorded the provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement; the Owner then switches AI on once with an audited acknowledgement (only the Owner turns it on ~~; the Owner or Admin may turn it off~~ and off *(changed 18 Oct — AG16-90; AG16-80)* — AG16-20). A change of AI provider is emailed to the Owner before it takes effect (AG16-20). **AI and OCR processing of client data happens only in Canada (AG11-D15).** Outside providers are limited to AI/OCR, WhatsApp and mailbox connections (Gmail, Microsoft 365 and IMAP, all Release 1), each approved by Super Admin in SA-08 before any firm uses it (AG11-D14). Every AI path keeps its manual fallback, so the rest of Release 1 does not depend on the gate.

**Cross-cutting note.** AG-9, AG-10, AG-13 (and the AG-11 executors) are the **extensibility-first cross-cutting layer** — they must ship in Release 1 built on the polymorphic `(entityType, entityId)` pattern so every later module gets documents, communications, tasks, notes, audit, and automation "for free" by configuration.

---

## Glossary

| Term | Definition |
|---|---|
| **Agent / Firm console** | The tenant-facing application used by immigration-firm staff (this document's scope). Operates on the LOCAL plane. |
| **Assign to… / Take it** | One owner per conversation (email thread). **Assign to…** gives a conversation the person can see to a colleague who can open it (2 clicks); **Take it** assigns an unassigned conversation to yourself (1 click); **Unassign** clears it. The inbox has **Mine** and **Unassigned** filters. "Waiting on us" follows the assignee. AG16-89. Home: AG-10. *(new 18 Oct — AG16-89)* |
| **LOCAL plane** | Firm-owned, tenant-isolated data and configuration, scoped by `firm_id` and enforced by database Row-Level Security. |
| **GLOBAL plane** | Platform-wide data/configuration owned by Super Admin (country packs, global templates, plans). Firms consume but cannot edit it. |
| **Tenant / firm** | One immigration firm (an isolated customer account). `firm_id` is the isolation key on every record. |
| **RCIC** | Regulated Canadian Immigration Consultant — a licensed practitioner; in the platform a key firm sub-role. The regulator/credential is defined by the firm's country pack (Canada: CICC), not hardcoded. |
| **Owner / Principal RCIC** | The firm's top-level role with full access to the tenant's configuration and staff. |
| **Case Officer** *(fixed 18 Oct — AG07-D12, SA6-D5)* | Firm staff handling day-to-day case execution: document collection, questionnaires, checklists. |
| **Intake / Sales Rep** | Firm staff handling prospects, pipeline, lead qualification, and consult booking. |
| **Accounts / Billing** | Firm staff handling invoices, payments, retainers. |
| **Manager** | Firm staff with oversight/reporting across the firm. |
| **Prospect** | A potential client in the sales pipeline, before conversion to a paying client/case. |
| **Client** | The firm's end-customer (individual applicant or corporate/employer). Reaches the firm by email, a no-login link or the white-labeled portal; the portal is optional *(changed 18 Oct — AG16-92)*. |
| **Case** | An engagement to deliver an immigration outcome for a client, tagged with a **destination country**. It holds one or more **filings**; each filing has its own program/stream from that country's pack and its own people *(changed 18 Oct — AG07-D8(a), (c))*. |
| **SQR** | Smart Questionnaire / structured intake that gathers case data and feeds eligibility, forms, and checklists. |
| **Deficiency** | A gap or issue (missing/invalid document, unmet criterion) identified on a case, shown as a warning; CRITICAL ones are fixed or passed with a reason. |
| **Retainer** | The engagement/representation agreement (and often the fee arrangement) between firm and client, typically generated from a template and e-signed. |
| **English first** | Release 1 screens are English only, built translation-ready (all screen text kept in one place) so French can be switched on later without code changes. Missing French text falls back to English. Language-neutral features (template language field, Translate and Summarise) stay. Legal French (e.g. consent text) is flagged for the product owner, not changed. AG16-88 (fix 17 Oct). |
| **Country pack** | The Super-Admin-configured, versioned bundle of a destination country's immigration knowledge — programs, eligibility rules, scoring, forms + mappings, document checklists, government steps (the firm's delivery stages are platform-standard, not pack content — AG17-D64), obligations/key dates, templates, supported languages. The source of all country-specific behavior. |
| **Destination country** | The country a case is for. **A firm account serves exactly one** — set by Super-Admin at provisioning and immutable thereafter (FD-68); a practice working two destination countries holds two accounts. Every case is stamped with that country, which selects the country pack the case runs on. |
| **Conductor** | A firm-configurable automation rule (triggers + conditions + ordered actions). The engine/orchestrator — **not** a Doer. "Conductor connects." |
| **Doer** | A named in-house worker inside ExpatReady that does one kind of job for the firm, branded with the `-er` family mark (er = ER = Expat Ready). **One family, two kinds** (AG16-4). **Everyday (non-AI) Doers** follow fixed rules, need no AI, are always on and need no firm set-up: the four automation Doers — **Reminder** (client nudges — "speaks"), **Minder** (deadlines and dates — "thinks": remembers the dates that matter and reminds the file owner; standard reminders in Release 1 (AG17-D55); one Escalation switch and a separate at-risk-marks switch, Advanced, Owner or Admin (AG16-22, AG16-8)), **Tasker** (internal tasks — "does"), **Messenger** (omni-channel comms) — plus **Signer** (e-sign), **Mailer** (email), **Scheduler** (booking), **Binder** (documents), **Biller** (invoicing/trust), **Reporter** (analytics), **Filler** and **Reviewer**; the built **Qualifier** and **Finder** are also non-AI Doers (see their entries). **AI Doers** — **Reader**, **Sorter**, **Writer**, **Checker** — carry an **AI** badge, produce proposals with provenance that a person approves, and run only when the firm has switched AI on, which waits until the provider terms are recorded (AG11-D13). The AI provider is not a Doer; ExpatReady records it and the firm never sees it. In code, **Reminder** and **Messenger** have no separate entry yet (Messenger exists only as the SMS and WhatsApp sub-parts, `capability.ts:221-229`) *(changed v1.6 - AG16-4)*. The AI Doers are a plan feature included in higher plans, not sold as an add-on; on other plans the rules still do the work (AG16-33, AG16-34) *(changed v1.7)*. |
| **Qualifier** | Non-AI Doer that scores leads (built: `capability.ts:202`) *(added v1.6 - AG16-4)*. |
| **Finder** | Non-AI Doer for firm-wide search (built: `capability.ts:307`) *(added v1.6 - AG16-4)*. |
| **Reader** | AI Doer that extracts data from an uploaded document into proposed profile values with provenance and confidence, and classifies the document type. Release 1: identity documents (including the passport machine-readable zone), IRCC/government letters (deadlines such as biometrics), language test results (IELTS, CELPIP, TEF and others), ECA reports, and document-type classification; the Immigration-SME confirms the final list as pack content (AG11-D4, AG11-D18(e)). Never fabricates: unreadable or missing is flagged. Also finds an application number inside a PDF letter and reads scanned or unseen letter types; its output is a suggestion with its source (AG16-26, AG16-27, AG16-33) *(changed v1.7)*. |
| **Sorter** | AI Doer that classifies inbound email, portal and WhatsApp messages, matches them to the right file beyond header/reply-token matching, and files attachments to the client's documents with a document type. Low confidence goes to Unmatched and Needs you (AG11-D4). Also ranks the suggestions in Unmatched by content; an AI-only match is never filed on its own (AG16-26, AG16-33) *(changed v1.7)*. |
| **Writer** | AI Doer that writes a draft message or document for a person to review; the AI-assist writer of AG-10, callable by any recipe. *Renamed v1.6 (AG16-4); formerly "Drafter".* **Drafter** now means only the built non-AI document generator (`capability.ts:264-269`, "document generation"). Never promises an outcome; AI-written client text is always approved by a person (AG11-D1, AG11-D4). Also does "Translate" and "Summarise thread" in the mailbox, for staff only, on plans that include AI (AG16-39; home AG-10), in the staff member's own interface language (no setting), saved with the email the first time per language so a colleague sees it at once, and hidden when the email is already in that language (AG16-74) *(changed v1.8)*. Does not draft letter-library entries (AG16-81). |
| **Drafter** | The built **non-AI** document generator (`capability.ts:264-269`, "document generation"). It is not the AI Doer; the AI writer is the **Writer** (AG16-4). |
| **Checker** | AI Doer that cross-checks names, dates of birth, document numbers and dates across documents, profile and forms; findings appear as warnings in the Deficiency Library — never a lock (AG11-D4). |
| **Autonomy level** | The setting on every automated client or lead message, shown as one choice per row on the **Automatic messages page** (AG-12 is the only spec home): `AUTO` ("Send automatically"), `APPROVE` ("Ask me first" — the engine prepares a draft that waits in Needs you, or is approved inline when the approver is the person acting; behaviour in AG-11) or `OFF` ("Off"). ExpatReady pre-sets each row; template messages run from day one (AG12-D23). one-off AI-written client text, any government form and any value written into the verified profile without a human having looked at its source cannot go below `APPROVE` (the product floors — AG11-D1); locked rows show the floor. A template whose body AI edited is approved once, when published (AG12-D25), not per send. The separate Advanced autonomy table is withdrawn *(changed v1.6 - AG16-11; AI-edited-template floor removed 14 Oct)*. |
| **Needs you** | The per-user queue of drafts and proposals awaiting approve, edit-then-approve or reject. It holds only work a Doer prepared with no human present, and the "Ask me first" items; when the approver is the person acting, approval is inline and creates no item. Professional approvals show to every holder of the approval permission; a deactivated file owner's items become unassigned and visible to users with `agent/case:assign` (AG16-9). Nothing in it executes on timeout. An item is overdue after 2 working days (counted on the firm's own closed-days list, AG16-6); anything linked to a government deadline must be approved at least 2 working days before it, otherwise it is due immediately and marked urgent; the firm can change both under Advanced → Waiting times. Overdue and unassigned items escalate under the one Escalation switch (AG16-22) (AG11-D2, D17). Section 1 of the **Home screen** (AG16-40). *Withdrawn v1.6: routing by licence, supervised client messages, Owner fallback when no licensed user is active, backup approver (R5, SR-Q1c, AG16-9).* |
| **Team safeguards** | *Withdrawn v1.6 — SR-Q1c, AG16-8, AG16-9.* The former single firm switch (four-eyes, Minder escalation, at-risk marks, routing to supervisors; on automatically at 5 staff; Owner-only off with a reason; backup approver) no longer exists. Escalation and at-risk marks are now two separate switches under Advanced (Owner or Admin, `agent/firm-capability:manage`, no reason required, changes in the activity log); see AG16-22. |
| **Template message** | A message sent from a firm-scope **published** template (AG-12) with only its merge fields filled. Defaults to `AUTO`: the firm approved the template once. The seeded recipes' client messages run from day one with ExpatReady's neutral wording; a message missing a firm detail is not sent and the firm sees a note (AG-12-109) (AG11-D1; AG12-D23) *(changed v1.5 - SA05-R9a)*. |
| **Four-eyes** | *Withdrawn v1.6 — SR-Q1b.* The rule that the preparer of a government form could not approve it no longer exists. The "Self-approved" record stays. |
| **Done for you** | Section 6 of the **Home screen** (AG16-40): what the Doers did in the last 24 hours, per user and firm-wide for managers (AG11-D7). Filing is silent, so filed mail, letters and payments show here and never as an alert (AG16-42). |
| **Import batch** | One run of the AG-18 import engine; every record it creates is tagged to the batch so the whole batch can be undone within 14 days (records since worked on are excluded — a record that was started and later paused still counts as worked on; a running import cannot be stopped, it is undone afterwards; AG18-D4, D10, D11). |
| **Verified sender** | A sender tied to a known contact by a reply token, the email header chain, or a known email address or WhatsApp number. A message from any other sender never triggers a client-facing automatic action: it waits in Needs you for approval (AG18-D11(g); AG11-D13). |
| **Client paused** | The label on a draft or item waiting in Needs you for a client whose automations the firm has paused. It stays, but cannot be sent until the client is started again or the item is deleted (AG18-D11(e); AG-11-101). |
| **Not started (quiet)** | The state of an imported client, lead or case until the firm switches its client automations on: internal work runs, but no client-facing recipe, chase, acknowledgement, portal invitation or questionnaire link goes out. Shown as "Not started" ("client automations not started") to avoid a clash with "quiet hours" (AG18-D9, D10). |
| **Self-approved** | The record kept whenever a form's approver is also its preparer, shown on the form and in the audit. It is never blocked (AG11-D9; four-eyes withdrawn v1.6). |
| **Unmatched** (was "Unmatched inbox") | Where inbound mail, a government letter or a WhatsApp message goes when no rule finds exactly one case for it, or when AI alone suggested the match. A person files it by hand, with suggested cases one click away; for an unknown sender or number a person can click "Create lead" (never automatic). Section 5 of the **Home screen**, shown only to people who may file unmatched items (AG11-D4, D13, AG11-D18(b); AG16-26, AG16-40). Home: AG-10 *(changed v1.7)*. |
| **Filler** | The Doer that prepares government forms from the client's verified profile (correct edition, no re-keying). At launch its output is an **answer sheet** for every mapped form; direct PDF filling comes only for a form that has passed the technical trial *(changed 18 Oct — AG07-D17)*. A form it prepares on its own has no preparer; a human approves every form (AG-07). |
| **Reviewer** | The Doer that continuously computes what is missing on a case and puts every CRITICAL warning in front of the RCIC before submission. It follows fixed rules and is not an AI Doer; the Checker is the AI cross-check (AG-07, AG-11). |
| **Licensed user** | An active user whom the firm has linked to a regulator credential it entered (AG-01 §3.5; AG1-D19). ExpatReady never checks, tracks or acts on licence validity or expiry, and never verifies a licence against any register (AG1-D19). It no longer routes approvals or supervises messages (R5), and the "preferred" licensed mark is withdrawn (SA-Q3). ExpatReady does not report licence status to anyone (AG11-D11). |
| **Automatic messages page** | Settings → Client messages & AI → **Automatic messages**: one row per automatic client or lead message showing when it sends, a preview, and one choice — Send automatically · Ask me first · Off. Spec home: AG-12 (engine behaviour of "Ask me first": AG-11). Replaces the optional "Review your automatic messages" page, the earlier "Automatic messages review" and the one-time "Standard messages review" *(changed v1.6 - AG16-11)*. |
| **Home screen** | The page staff land on, and the one place to start. Six sections in this order: Needs you, My Tasks, Waiting on us, Payments to record, Unmatched, Done for you. Empty sections are hidden; sections for permissions you lack are not shown; government-deadline items sit at the top. Replaces "My work" (AG17-D61). AG16-40. Home: AG-11. |
| **Not brought in** | A list on each firm mailbox *(changed 18 Oct — AG16-89: personal mailboxes have none)* of senders ExpatReady left out as machine mail (no-reply senders, mailing lists, e-sign, booking and ad tools, bounces), with a count for the last 30 days and a **Bring these in** button per sender. Machine mail only: it has no "Create lead" (that lives only in Unmatched). ~~Also holds unknown numbers from a WhatsApp history import, with "Create lead".~~ *(changed 18 Oct — AG16-90: unknown WhatsApp numbers go to Unmatched; past chats are brought in only for clients and leads already in ExpatReady)* AG16-42, AG16-44, AG16-57, AG16-78. Home: AG-10. |
| **Waiting on us** | A tag, "Waiting on us · N days", on any filed conversation with a client or lead — firm mailbox, personal mailbox or WhatsApp *(changed 18 Oct — AG16-90; AG16-67)* — whose last message is from the client or lead. It clears when anyone replies, including a reply sent outside ExpatReady (for example from Gmail), which is synced. After 2 working days it shows on the owner's home screen; the owner is the person the conversation is assigned to *(changed 18 Oct — AG16-89)*. AG16-29, AG16-89. Home: AG-10. |
| **No reply needed** | The button that clears "Waiting on us" (for example after a "Thanks!" email). AG16-29. Home: AG-10. |
| **Payments to record** | Section 4 of the home screen, for people who may record payments: a suggested match for a bank or Interac payment email, recorded only when a person clicks. AG16-30. Home: AG-06. |
| **Letter library** | ExpatReady's list of known government letter types. Each entry gives the phrases that identify the letter, the standard action, the deadline rule and a suggested note to the client. It runs on mail and on any uploaded PDF; unknown letters show as "Letter — type not recognised". AG16-27, AG16-41. Content home: SA-01; mail: AG-10; uploads: AG-09. |
| **New letter patterns** | How the letter library grows: when staff pick the type of an unrecognised letter, only a de-identified pattern (no names, numbers or letter text) goes to ExpatReady for review. AG16-43. Firm side: AG-10; review queue: SA-01. |
| **Firm mailbox** | A shared address (such as info@) the Owner or Admin connects. Everything arriving there is brought in; unknown senders go to Unmatched. A firm may connect several. AG16-15, AG16-25, AG16-28. Home: AG-10. |
| **Personal mailbox** | A person's own address, connected in My account. Only emails with known clients and leads, plus government mail, are brought in; other unknown senders stay in the person's own Gmail or Outlook and are never stored *(changed 18 Oct — AG16-89)*. AG16-15, AG16-25, AG16-89. Home: AG-10. |
| **Main mailbox** | The one firm mailbox that automatic messages send from; the first one connected, changeable in one click. AG16-28. Home: AG-10. |
| ~~**Show me possible new enquiries**~~ | ~~A personal-mailbox switch, off by default. When on, unknown-sender emails from that mailbox appear in Unmatched, marked "Only you", visible only to that person; there is no separate list. Nothing is filed or stored until they click Create lead or File to client.~~ Withdrawn 18 Oct — AG16-89: there is no switch and no "Only you" item; unknown senders in a personal mailbox are not brought in. AG16-25, AG16-57 (fix 17 Oct — AG16-83 item 1). Home: AG-10. |
| **Not on this case** | A small warning label on an email or draft whose sender or recipient is not linked to the case. "Add to case" links them as a related contact. It never blocks. AG16-35. Home: AG-10 (related contact: AG-07). |
| **WhatsApp coexistence** | The default way to connect WhatsApp: **"Keep my current WhatsApp Business number and app"**, so the firm keeps using the phone app while ExpatReady also sends and files messages. The other choice is "Use a new number". AG16-48. Home: AG-16 (connect screen); filing and history import: AG-10. |
| **Client quiet hours** | *(changed 18 Oct — AG16-90; AG16-56)* When an automatic message sends depends on what its timer counts, in the client's own time zone; there is no setting. **Day-based messages** (chases, follow-ups, invoice and signing reminders, the deadline reminder) send at 09:00 on the due day. **Messages tied to a time the client booked or a payment hold** (booking reminders, "Complete your payment", "Payment expired") send at the exact time, any hour. **Any other automatic message** goes only between 08:00 and 20:00. Direct responses (class 1) and messages a staff member writes go at once. ~~Automatic non-urgent messages reach a client only between 08:00 and 20:00.~~ AG16-49, AG16-51, AG16-56. Home: AG-10. |
| **Client time zone** | The time zone of a client or lead (the person's time zone, `PartyProfile.timezone`; field AG-02, fill rule AG-07 AG-7-98 *(fixed 18 Oct — X-2 (5))*), filled in from the address or phone country and editable on the record. AG16-49. Home: AG-07. |
| **Office time zone** | A time zone for each office (`Office.timezone`), used for that office's hours, closed days and clocks. Appears only once a firm has a second office. AG16-45. Home: AG-01 (field), AG-16 (screen). |
| **Changed from default** | A filter on the Automatic messages page showing rows whose choice or timing differs from ExpatReady's default, or whose wording is the firm's. Each shows the default and a Reset. AG16-47. Home: AG-12. |
| **Journey stage** | The plain-word group an automatic message sits in on the Automatic messages page: Enquiries, Bookings, Retainer and signing, Invoices, Case updates, Documents and questionnaire, Portal, Employer (LMIA). AG16-47. Home: AG-12; tag per message: SA-05. |
| **My meeting link** | One saved video link (such as a Zoom personal room) in My account, used for every video booking of that person when no automatic Meet or Teams link applies. AG16-53. Home: AG-04. |
| **Standing rule: ExpatReady suggests, the firm decides** | ExpatReady may file (undoably) and suggest. A person confirms anything that records money, sets a government deadline or takes a legal step. The source is always shown, and screens say "Suggested" until confirmed. AG16-31. |
| **Standing rule: AI reads, rules check, a person confirms** | Rules are the floor on every plan. Where AI is on, the Reader and Sorter widen coverage, but AI output is always a suggestion with its source and never files, records or decides on its own. The core works with AI off. AG16-33. |
| **Standing rule: quiet by default** | An alert or home-screen item must be real work for that person that they would otherwise miss. Filing is silent, machine mail is not brought in, and no one is alerted twice. AG16-42. |
| **Standing rule: never quietly judge** | Wherever ExpatReady treats two things as the same or decides something is unimportant, it shows that and the firm can reverse it. Only identical technical copies of one email are stored once without asking. AG16-44. |
| **Standing rule: a duplicate beats a miss** | Where something could be missed that affects a client, a deadline, money or a broken connection, ExpatReady accepts a duplicate or a second notice rather than risk the miss. This applies to what staff can see (lists, tasks, staff reminders, records). It never justifies extra automatic messages to clients. Any de-duplication leaves a visible alternative. AG16-60, clarified by AG16-76(4). |
| **Standing rule: design checks** | Every requirement and build card passes seven checks: (1) not over-engineered or over-monitored: it shows rather than alerts, says whether it is must-have or good-to-have, and has no setting where a fixed default works; (2) holistic and stress-tested for knock-ons (other epics, permissions, a person leaving, counts and badges, build size), fixing the cause not the symptom; (3) a duplicate beats a miss (AG16-60); (4) the clicks it adds or removes for the person are stated, and routine added clicks need a reason; (5) it names the pattern used by established SaaS products; (6) ExpatReady suggests, the firm decides, and it warns, never blocks; (7) help people, don't replace them (AG16-76). AG16-63. |
| **Standing rule: help people, don't replace them; do, don't overdo** | ExpatReady prepares, shows and reminds staff; people decide and act, especially toward clients. No automated follow-up chains to clients beyond the firm's own Automatic messages rows (AG-12: Send automatically · Ask me first · Off). New client-facing automation needs the product owner's approval. Prefer a tool the person chooses (such as "Remind me if no reply") over a flow that runs by itself. Every requirement states what the person still decides. AG16-76. |
| **Dry-run preview** | A rendering of what an automation or import would do (create, merge, skip, error, with reasons), shown before anything is executed or sent (AG11-D3; mandatory for imports, AG18-D4). |
| **Playbook** | A pre-built, validated automation blueprint supplied by the country pack/platform that a firm enables and lightly customizes (library-first), instead of building from a blank canvas. |
| **My Tasks** | The user's tasks due today or overdue, including tasks made from government letters. Section 2 of the **Home screen** (AG16-40); the full list stays in AG-13 *(changed v1.7)*. |
| **View (Individual / Corporate)** | A switch that changes menus and default list filters (AG-17); it is not the "workspace", which is the firm's account. |
| **Corporate case** | A case whose client type is Corporate; for LMIA, one occupation at one work location with several positions (AG17-D4). |
| **Position** | One requested worker slot on an LMIA file. |
| **Linked worker case** | The worker's own individual work-permit case, linked to an LMIA position. |
| **Critical warning** | A CRITICAL-severity item; never a lock — passed with a reason by a holder of the waive permission. |
| **entityType / entityId** | The generic polymorphic key pair that lets cross-cutting modules (documents, communications, tasks, reminders, notes, audit, automation) attach to ANY entity by configuration, not new code. |
| **Activity timeline** | The user-friendly, per-entity history of significant actions. |
| **Audit log** | The append-only, tamper-evident, firm-scoped compliance record (who/what/when, before/after) backing regulatory accountability (e.g., PIPEDA). Distinct from the activity timeline. |
| **Two-sides-one-wire** | The principle that every client-facing request (document/form/payment/signature) is linked to an internal item; completing one auto-updates the other so staff and client never drift. |
| **White-label** | The client always sees the firm's brand and plain language — never Expat Ready, internal codes, or the machinery. |
| **RLS (Row-Level Security)** | Database-enforced tenant isolation ensuring queries return only the calling firm's rows. |
| **Merge field** | A token in a template that resolves to entity data at render time (e.g., client name, fee amount). |

## Key terms — cases and delivery

> **For writers and scripts (X-1 rule 4).** Each entry sits between an HTML comment that starts with "term:" and its id, and a closing comment "/term". A script copies these entries word for word into the "Start here" part of each epic. Never retype them. To change a term, change it here and run the script again. Where a term also has a row in the Glossary table above, that row is the long form and this entry is the short form; they must agree. Examples use the Client E family: Client B (principal), Client A (spouse), Client D (child, 8) and Client Q (Client B's brother, a related contact). Firm staff in the examples: Client F (licensed user, lead representative), Client C (case officer), Client I (case reviewer), Client G (a second licensed user) and Client H (a colleague who leaves). The dated examples follow one timeline: Client C creates case C-2026-00012 on Thu 5 Nov 2026, the filings are submitted on Fri 20 Nov 2026, and the decisions come on Wed 3 Mar 2027.
>
> **Order of the entries.** The entries follow the order in which a reader meets them in the Client E walk-through of the AG-07 v3.0 plan (section 4), not the order of the Glossary table. The entry "Delivery stage" is placed after "Stage" because the two are read together. Two terms are never used alone: write "delivery stage" or "government step", never "step" by itself.

<!-- term:case -->
**Case** (`Case`) — A case is the firm's work for one client in one destination country. It holds one or more filings and the people on them. *Example:* Case C-2026-00012 is the Client E family's move to Canada. It holds three filings. They are Client B's employer-specific work permit, Client A's open work permit and Client D's study permit. *Not the same as:* a filing, which is one application inside a case.
<!-- /term -->

<!-- term:client -->
**Client** (client file record and `Party`) — A client is the person or employer the firm works for. It is a person record, or an employer record, with a client file record added. *Example:* Client B became client CL-00001 when his lead was converted. *Not the same as:* an applicant, who is any person named on a filing.
<!-- /term -->

<!-- term:client-file-record -->
**Client file record** (no code name) — The client file record holds the firm's own details for one person who is a lead or client. It is created only when the person becomes a lead or client. *Example:* Client B becomes a client. His record shows client number CL-00001, file owner Client C and his office. *Not the same as:* the person record, which holds name, email, phone and language.
<!-- /term -->

<!-- term:person-record -->
**Person record** (`Party`) — Every real person on a case has one person record, kept once and reused on all their cases. Their details, answers and consent are stored with it. *Example:* Client D, age 8, gets her own person record when she is added to the case. Her record gives her no portal login and no emails. *Not the same as:* the client file record, which holds the firm's own fields.
<!-- /term -->

<!-- term:contact-screen -->
**Contact** (no code name) — Contact is only the name of a screen where staff see a person. It is not a record type and not a second table. *Example:* Staff open Client B on the Contact screen. What they see comes from his person record and his client file record. *Not the same as:* a Contact table. None exists, so older text about a Contact table means the person record.
<!-- /term -->

<!-- term:client-type -->
**Client type** (`clientType`) — The client type is Individual or Corporate. It comes from the program's pathway. Both types use the same case design, not two separate ones. *Example:* The Client E case is Individual. An employer's LMIA file is Corporate. LMIA means labour market impact assessment. *Not the same as:* a separate corporate case type. None exists; it is a case with client type Corporate.
<!-- /term -->

<!-- term:filing -->
**Filing** (`Filing`) — A filing is one application to one government authority. It has its own program, forms, fees, deadlines, rules version, people and decision. *Example:* Client B's employer-specific work permit is one filing. Client A's open work permit and Client D's study permit are two more, in the same case. *Not the same as:* a case, which can hold several filings.
<!-- /term -->

<!-- term:applicant -->
**Applicant** (`CaseApplicant`) — An applicant is a person named on a filing, with a role: principal, spouse, child or other. The role belongs to the filing, so one person can be principal on one filing and spouse on another. *Example:* Client B is the principal applicant on his work permit filing. Client A is the principal applicant on her own filing, and Client D on hers. Spouse or child is used when a family member is included in someone else's filing. *Not the same as:* the client, who is the person or employer that hired the firm.
<!-- /term -->

<!-- term:related-contact -->
**Related contact** (`PartyRelationship`) — A related contact is a person linked to one case who is not an applicant. Examples are a brother, an HR contact or an agent. Staff who can edit cases add one, with a relationship. It uses the person record, so there is no separate table. *Example:* Client C adds Client Q, Client B's brother, with the relationship "brother". His email address now counts as linked to the case when mail is filed. *Not the same as:* an applicant, who is named on a filing.
<!-- /term -->

<!-- term:file-owner -->
**File owner** (`fileOwnerUserId`) — The file owner is the staff member who owns a client. It is set on the client file record, not on a case. None means the client is unassigned. *Example:* Client C is file owner of client CL-00001. *Not the same as:* the case officer, who does the day-to-day work on one case.
<!-- /term -->

<!-- term:case-number -->
**Case number** (`caseCode`) — The case number is the firm's reference for a case, such as C-2026-00001. It is the letter C, the year and a 5-digit counter that restarts each year. *Example:* The Client E case is C-2026-00012, the 12th case the firm opened in 2026. The server sets it; it is never edited or reused. *Not the same as:* the client number or the government's application number.
<!-- /term -->

<!-- term:client-number -->
**Client number** (`clientCode`) — The client number is the firm's reference for a client, such as CL-00001. It is CL and a 5-digit counter for the firm, with no year. The screens show it as "Client code". *Example:* Client B is client CL-00001, and all his cases show that number. It is never edited or reused. *Not the same as:* the case number, which includes a year.
<!-- /term -->

<!-- term:lead-representative -->
**Lead representative** (`LEAD_REPRESENTATIVE`) — The lead representative is the licensed person whose licence backs the case. It is filled in from the signed retainer or the firm's default, and a case may have none. *Example:* Client F is lead representative on the Client E case because she signed the retainer. If Client G were to sign instead, a warning shows: "Client F is this case's lead representative. Client G will sign this retainer." It never blocks. *Not the same as:* the case officer, who does the day-to-day work.
<!-- /term -->

<!-- term:licensed-user -->
**Licensed user** (no code name) — A licensed user is an active user whom the firm has linked to a professional credential. ExpatReady does not check the licence. Only licensed users are offered as lead representative. *Example:* Client F is a licensed user. Client C is not, so he is never offered as lead representative. *Not the same as:* a role such as Owner or Admin, which says what a user may do.
<!-- /term -->

<!-- term:case-officer -->
**Case officer** (`OFFICER`) — The case officer does the day-to-day work on a case: documents, forms and getting it ready. A paralegal does this job too, so there is no separate paralegal role. *Example:* Client C is case officer on the Client E case and collects the family's documents. *Not the same as:* the lead representative, who is accountable for the file.
<!-- /term -->

<!-- term:case-reviewer -->
**Case reviewer** (`REVIEWER`) — The case reviewer is the team member who checks a case before it is submitted. A case may have none, and a missing reviewer does not make it Unassigned. *Example:* Client I is the case reviewer on the Client E case and approves it before Client F records the submission. *Not the same as:* the Reviewer Doer, which works out what is missing on a case by fixed rules.
<!-- /term -->

<!-- term:unassigned -->
**Unassigned** (no code name) — A case is Unassigned when it has no case officer. A missing reviewer or lead representative does not make it Unassigned. *Example:* The Client E case has no case officer yet, so it appears in the Unassigned list. *Not the same as:* "Needs a lead representative", a separate filter for cases with no lead representative.
<!-- /term -->

<!-- term:take-it -->
**Take it** (`agent/case:edit`) — Take it is one click that makes you the case officer of an unassigned case. Anyone who can edit cases may use it, for themselves only. *Example:* Client C clicks Take it on the Client E case and becomes its case officer. Adding a colleague instead needs the permission to assign cases. *Not the same as:* Take it on a mailbox conversation, which makes you the owner of an email thread.
<!-- /term -->

<!-- term:needs-a-lead-representative -->
**Needs a lead representative** (no code name) — Needs a lead representative is a filter for cases that have no lead representative. It is separate from Unassigned. A missing lead representative warns at submission and never blocks. *Example:* A walk-in case has no retainer and the firm has no default, so it shows under Needs a lead representative. *Not the same as:* Unassigned, which means no case officer.
<!-- /term -->

<!-- term:welcome-message -->
**Welcome message** (no code name) — The Welcome is an email offered in a ticked box when a case is created. It goes to the principal applicant and carries no-login links for the first to-dos. *Example:* Client C creates the Client E case, and "Send Welcome — your case has started" to Client B is ticked. Client A and Client D get none. *Not the same as:* a portal invitation, because the Welcome needs no login.
<!-- /term -->

<!-- term:class-2-message-box -->
**Class-2 message box** (no code name) — A class-2 message box is a ticked "Send …" box offered when staff record an event. The message goes only on the person's click, and unticked sends nothing. *Example:* Client F records the submission, and the box "Send 'Application submitted' to Client B" is ticked. She clicks Save, and the email goes. The firm may set a box to start unticked. *Not the same as:* an automatic message, which sends with no person's click.
<!-- /term -->

<!-- term:country-pack -->
**Country pack** (`CountryPack`) — The pack is the set of programs, forms, document lists and government steps that ExpatReady keeps for one country. Firms use it but cannot change it. They can only add document requests to a case. *Example:* The Client E case runs on the Canada pack, so its forms and government steps come from there. *Not the same as:* a Playbook, which is a ready-made automation.
<!-- /term -->

<!-- term:rules-version -->
**Rules version** (`PackWorkPin`) — The rules version is the version of the country pack that a filing follows. Each person on a filing has their own rules pin. All the pins on one filing are on the filing's one version. *Example:* Client B's filing started on rules version 3. It stays on version 3 while in progress, even after version 4 is published. *Not the same as:* a form edition, which is the version of one government form.
<!-- /term -->

<!-- term:use-newer-rules -->
**Use newer rules** (`agent/pack:adopt`) — Use newer rules moves a filing to the current rules version with one click. It needs a reason, pre-filled as "Adopting the current rules". It moves every person's pin on that filing together. *Example:* Client F clicks Use newer rules on Client B's filing. His pin moves to version 4, and his added document requests move too. *Not the same as:* adding a filing later in the same case, which starts on the case's current rules version. If filings differ, it uses the principal's filing version.
<!-- /term -->

<!-- term:stage -->
**Stage** (`CaseStageDef`) — A stage is one position on the case board. There are nine kinds of stage, from PRE_WORK to CLOSED. ExpatReady works out a case's stage, and before submission staff may move it forward by hand. *Example:* The Client E family has started uploading documents but no forms, so the case is at Uploads. After submission, the stage follows the latest recorded event. *Not the same as:* a government step, which is an event recorded for one person, not a board position.
<!-- /term -->

<!-- term:delivery-stage -->
**Delivery stage** (`kind` PRE_WORK to REVIEW) — A delivery stage is a stage before submission, such as Questionnaire, Uploads or File preparation. It is the firm's own delivery work. The platform sets these stages, and the country pack does not. *Example:* Client C starts Client B's first form, so the Client E case moves on from Uploads to File preparation. *Not the same as:* a government step, which comes from the authority, not from the firm's own work.
<!-- /term -->

<!-- term:stage-kind -->
**Stage kind** (`kind`) — The kind of a stage tells ExpatReady how the stage behaves, whatever its label says. The nine kinds are PRE_WORK, COLLECTION, PREPARATION, REVIEW, SUBMITTED, POST_SUBMISSION, DECISION, AFTER_DECISION and CLOSED. A stage of kind SUBMITTED or later is reached only by recording an event. *Example:* Client C cannot drag the Client E card into a post-submission stage. He records "Biometrics requested", and the card moves. *Not the same as:* a stage label, which the wording of a pack may change.
<!-- /term -->

<!-- term:board-placement -->
**Board and manual placement** (`agent/case:edit`) — The board shows one card per case, at the stage ExpatReady works out. Before submission only, staff may move a card forward, never back. The card then reads "Placed manually by <name>, <date>", with "Back to automatic". *Example:* Client C moves the Client E card forward to File preparation. The placement clears itself when the work catches up. *Not the same as:* dragging after submission, which is not allowed. A case with several filings is still one card, with one chip per filing.
<!-- /term -->

<!-- term:on-hold -->
**On hold** (no code name) — On hold is a label on an open case. It pauses the target filing date clock until the label is removed. It is not a board column, so the card stays in its stage. *Example:* While the Client E case is On hold, its target filing date clock stands still. *Not the same as:* Closed, because an On hold case is still open.
<!-- /term -->

<!-- term:checklist -->
**Checklist** (`CaseDocument`) — A checklist is the list of documents a filing needs, one line per document and person. It comes from the pack plus any document requests staff add, and each line shows its document status. *Example:* Client A's line "Passport copy" shows Needed until a file arrives. *Not the same as:* the review checklist, which the reviewer ticks before submission.
<!-- /term -->

<!-- term:document-request -->
**Document request** (`agent/pack:extend`) — A document request adds one more document to a filing's checklist for one person. Staff pick a type from the pack or Other, then choose the person; the default is the principal. *Example:* Client C picks Other, types "School letter", chooses Client D and leaves "Ask the client now" ticked. He can delete it until it is sent or a file arrives. After that it can only be set to Not needed. *Not the same as:* hiding a standard checklist item on a new case, which is `agent/case:configure-pack`.
<!-- /term -->

<!-- term:document-status -->
**Document status** (no code name) — Every checklist document has one of five statuses: Needed, Received, Accepted, Needs replacing or Not needed. The words match the client emails "Document received" and "Document needs replacing". *Example:* Client B's passport goes from Needed to Received, and Client C sets Accepted. Client A's marriage certificate is set to Needs replacing with the reason "photo is blurred", and the client is asked again. *Not the same as:* "Superseded" and "Quarantined", which are states of the file, not statuses.
<!-- /term -->

<!-- term:binder -->
**Binder** (Doer) — The Binder is the Doer that builds a filing's checklist from the pack. A Doer is one of ExpatReady's helpers that does a fixed job. The Binder shows each document's status but stores none. *Example:* The Binder lists "Passport copy" for each of the three Client E family members. *Not the same as:* the document module, which stores the files and their statuses.
<!-- /term -->

<!-- term:filler -->
**Filler** (no code name) — The Filler prepares government forms from the person's verified details. At launch it makes an answer sheet for each mapped form; direct PDF filling needs a passed trial. The Filler is on every plan. *Example:* Client C runs the Filler on Client B's form and sees each value with its source. Client F must still approve the form. *Not the same as:* the Drafter, a separate non-AI document generator.
<!-- /term -->

<!-- term:answer-sheet -->
**Answer sheet** (no code name) — An answer sheet lists every value of a government form, in the form's own order. Each value has a copy button, so staff paste it into the PDF or portal form themselves. *Example:* Client C opens the answer sheet for Client B's form and copies each value into the government site. He stays responsible for the final form. When he attaches the final form, he ticks "Signed by client". *Not the same as:* a filled PDF, because direct filling is a separate trial.
<!-- /term -->

<!-- term:form-approval -->
**Form approval** (`agent/case:form-approve`) — Form approval is a person with the form-approve permission accepting a prepared government form. Every form needs it, and a person may approve a form they prepared; it is recorded as self-approved. *Example:* Client C prepares Client B's form and Client F approves it, from the case screen or from Needs you. *Not the same as:* internal review, which checks the whole case.
<!-- /term -->

<!-- term:form-edition -->
**Form edition** (`FormEdition`) — A form edition is the version of one government form, with an effective date from the pack. A newer edition makes the form show "form out of date" and offers a re-bind. A retired edition is a CRITICAL warning, never a stop. *Example:* A newer edition appears. Client B's form shows "form out of date", and a re-bind carries his values forward. *Not the same as:* a rules version, which is the version of the whole country pack.
<!-- /term -->

<!-- term:override -->
**Override** (no code name) — An override is a staff correction to one auto-filled value on one form. The person's own answers do not change. Pushing the correction back to the person's answers is a separate, explicit action. *Example:* Client C corrects Client B's employer name on the form only. Client B's answers still show the old name. *Not the same as:* verifying a value, which makes it usable by the Filler.
<!-- /term -->

<!-- term:verified-value -->
**Verified value** (`agent/sqr:verify`) — A value from the Reader or an import is unverified until a person checks it. Only verified values fill forms. An unverified value shows beside the field as "unverified — verify to use". *Example:* An imported passport number shows "unverified — verify to use". Client C verifies it, and the Filler can then use it. *Not the same as:* accepting a document, which is a different act.
<!-- /term -->

<!-- term:self-approved -->
**Self-approved** (`selfApproved`) — Self-approved is recorded when the person who approves a form also prepared it. It is never blocked. The approver's name, time and the self-approved flag show in the form's history. *Example:* Client F prepares and approves Client D's form, so it shows "self-approved". *Not the same as:* a rule that needs a second approver. No such rule exists.
<!-- /term -->

<!-- term:needs-you -->
**Needs you** (no code name) — Needs you is each person's list of drafts and proposals waiting for their approval. Nothing in it runs by itself, and a draft is approved inline when the approver is already acting. *Example:* A Filler draft for Client B's form waits in Client F's Needs you until she approves it. *Not the same as:* the whole Home screen, because Needs you is only section 1 of it.
<!-- /term -->

<!-- term:deficiency -->
**Deficiency** (`Deficiency`) — A deficiency is a gap found on a case, such as a missing document or an unsigned retainer. Each has a severity: critical, major, minor or info. Only critical ones must be fixed or passed with a reason. *Example:* Client D's school letter is not accepted yet, so a critical warning shows on her filing. At review approval Client I passes it with a reason, and nothing is blocked. *Not the same as:* an overdue invoice, which shows on the case header instead.
<!-- /term -->

<!-- term:deficiency-library -->
**Deficiency library** (`DeficiencyLibraryItem`) — The deficiency library is ExpatReady's list of checks for each country and program. Firms cannot edit it, but staff can add a one-off deficiency to a case by hand. The checks are on every plan. *Example:* The library raises "Passport copy missing" for Client A. Client C adds a one-off item, "Translate Client D's school letter". *Not the same as:* the Checker, which compares values across documents and forms.
<!-- /term -->

<!-- term:readiness -->
**Readiness** (`NOT_READY`, `ATTENTION`, `READY`) — Readiness shows how close a filing is to submission: Not ready, Attention or Ready, plus a percentage score. Not ready means a critical deficiency is open and not passed. Attention means an open major one; otherwise Ready. The case shows the lowest. *Example:* Client B's filing is Ready, Client A's is Attention and Client D's is Not ready, so the Client E case shows Not ready. A gap passed with a reason counts as finished in the score. *Not the same as:* a lock, because readiness never blocks any action.
<!-- /term -->

<!-- term:severity -->
**Severity** (`Deficiency` severity) — Every deficiency has a severity: CRITICAL, MAJOR, MINOR or INFO. The pack sets the severity of each check. Only an open CRITICAL deficiency needs to be fixed or passed. *Example:* The Checker finds a name mismatch on Client A's certificate. It is MAJOR, so it is shown and nothing more is needed. *Not the same as:* readiness, which is worked out from the severities.
<!-- /term -->

<!-- term:critical-warning -->
**CRITICAL warning** (`agent/case:waive-deficiency`) — A CRITICAL warning is an open deficiency of severity CRITICAL. It is listed when the case goes into review and at submission. An unapproved or unsigned form is one. It is fixed or passed with a reason, and it never locks the case. *Example:* Client I passes Client D's warning with the reason "Original sent by courier". The pass holds until the underlying fact changes. *Not the same as:* a block. ExpatReady warns and never blocks.
<!-- /term -->

<!-- term:checker -->
**Checker** (Doer) — The Checker is an AI Doer. It compares names, dates and numbers across documents, answers and forms. Each mismatch becomes a warning on the case, with the values compared. A Checker warning never locks the case. *Example:* "Client E" on the passport and "Client U" on the certificate give a warning. *Not the same as:* the deficiency library, which holds fixed checks written by ExpatReady.
<!-- /term -->

<!-- term:internal-review -->
**Internal review** (`CaseReview`) — Internal review is a colleague's check of one or more filings before they are submitted. Each filing has its own review status. One review may cover several filings. Anyone who can edit cases may send filings for review. The reviewer approves them or sends them back with reasons. *Example:* On Wed 18 Nov 2026 Client C sends the three Client E filings for review in one request. Client I approves it after confirming one unticked checklist item. *Not the same as:* form approval, which covers one form only.
<!-- /term -->

<!-- term:changed-since-review -->
**Changed since review** (no code name) — Changed since review is a note on a filing that changed after its review was approved. It is worked out when the case is read, and no field stores it. It does not undo the approval. At submission it asks for one confirmation. *Example:* After Client I's approval, Client C replaces Client D's school letter on Thu 19 Nov 2026. Her filing shows "Changed since review: school letter replaced, Client C, 19 Nov". *Not the same as:* a review sent back, because the approval stands.
<!-- /term -->

<!-- term:submission -->
**Submission** (`Submission`) — A submission is the record that a filing was sent to the government authority. It keeps the date, the authority, the application number of each filing and each person's UCI as sent. *Example:* On Fri 20 Nov 2026 Client F records the submission of all three Client E filings. No critical warning is open, because Client I passed Client D's at review approval. *Not the same as:* a government step, because steps are recorded after the submission.
<!-- /term -->

<!-- term:government-step -->
**Government step** (`CaseMilestone`) — A government step is an event from the authority, such as acknowledgement of receipt or biometrics. Staff record each one with its date, for one person and one filing, and most come after submission. *Example:* On Wed 2 Dec 2026 Client C records "Biometrics requested" for Client A, due Fri 1 Jan 2027. That is one government step. *Not the same as:* a stage, which is a position on the board.
<!-- /term -->

<!-- term:step-done -->
**Step done** (`CaseMilestone.doneAt`) — Step done marks a government step as finished, with a date. Anyone who can edit cases may use it. It stops the reminders of that step. *Example:* On Mon 14 Dec 2026 Client A gives her biometrics, so Client C clicks Step done on "Biometrics requested". Its reminders stop. *Not the same as:* "Mark done" on a letter task, which closes only the task.
<!-- /term -->

<!-- term:deadline -->
**Deadline** (`dueDate`, `dueStatus`) — A government deadline is a calendar date by which something must be done. It sits on the government step. It is Suggested until a person confirms it, and reminders start only once it is Confirmed. *Example:* Client A's biometrics letter of Wed 2 Dec 2026 says "within 30 days". ExpatReady suggests Fri 1 Jan 2027. Client C confirms it, so the reminders start. *Not the same as:* the target filing date, which is the firm's own goal.
<!-- /term -->

<!-- term:government-date -->
**Government date** (no code name) — A government date is a calendar date that never moves for the firm's closed days. A reminder counted back from it lands on the last open day on or before the computed day. The case shows the date with its weekday. *Example:* The firm has closed 1 Jan. Client A's deadline stays Fri 1 Jan 2027. The "2 working days before" reminder lands on Wed 30 Dec 2026. *Not the same as:* the target date, which follows the firm's closed days.
<!-- /term -->

<!-- term:business-hours -->
**Business hours and closed days** (no code name) — Business hours are the days and hours the firm is open. The default is Monday to Friday, 9:00 to 17:00. The closed days are the firm's own list, empty at first, so every weekday counts as open. *Example:* The firm adds 1 Jan as a closed day. ExpatReady offers suggested holidays but saves nothing until the firm clicks Add. *Not the same as:* a government date, which closed days never move.
<!-- /term -->

<!-- term:application-number -->
**Application number** (`Filing.applicationNumber`) — An application number is the number a government authority gives to a filing. Each filing keeps its own. Mail that quotes one is matched to that filing. *Example:* A letter quotes application number W345678901, so ExpatReady files it to Client D's filing in the Client E case. *Not the same as:* the case number, which is the firm's own number.
<!-- /term -->

<!-- term:uci -->
**UCI** (`ClientCanonicalAnswer`) — The UCI is the 10-digit number Canada's immigration authority gives to one person. Every family member has their own, kept as an answer on that person's record. *Example:* Client B, Client A and Client D each have a different UCI. The submission keeps a copy of each as sent. *Not the same as:* the application number, which belongs to a filing.
<!-- /term -->

<!-- term:provincial-file-number -->
**Provincial file number** (`Case.provincialFileNumbers`) — A provincial file number is a number that a province gives to a filing. A case keeps a free-text list of them. Mail that quotes one is matched to the case. *Example:* Client C types the number a province gave a filing into the case's list. Later mail that quotes it is filed to that case. *Not the same as:* the application number, which the filing's authority gives.
<!-- /term -->

<!-- term:letter-library -->
**Letter library** (no code name) — The letter library is ExpatReady's list of known government letter types. Each entry gives the phrases that identify the letter, the standard action and the deadline rule. It also gives a suggested note to the client. It runs on mail and on uploaded PDFs. *Example:* Client A's biometrics letter is recognised from its phrases, and the library suggests a 30-day deadline. *Not the same as:* the deficiency library, which lists checks, not letters.
<!-- /term -->

<!-- term:tell-the-client -->
**Tell the client** (no code name) — Tell the client is the button on a letter task that sends the letter note to the client. It goes only on the person's click. It completes the letter task. *Example:* Client C confirms Client A's biometrics step and clicks Tell the client. Client B gets the letter note with the letter attached. *Not the same as:* a class-2 message box, which staff get when they record an event. A step recorded from a letter has no such box.
<!-- /term -->

<!-- term:decision -->
**Decision** (`Decision`) — A decision is the authority's answer on a filing, recorded with its outcome and date. Outcomes are Approved, Refused or others the pack defines; withdrawn is not a decision outcome. *Example:* On Wed 3 Mar 2027 Client F records Approved for Client B's and Client A's filings and Refused for Client D's. *Not the same as:* Withdraw, which staff record on the case before any decision and which closes it.
<!-- /term -->

<!-- term:after-decision -->
**After decision** (`AFTER_DECISION`) — After decision is the period after the decisions when the case stays open for follow-up work. The case enters it when every filing has a decision. It closes itself when that work is done, or staff close it with a reason. *Example:* After the decisions of 3 Mar 2027, the Client E case stays open until its follow-up items are done. Client B's permit-expiry reminder keeps working. *Not the same as:* Closed, which has no more work; reminders on recorded dates still run after it.
<!-- /term -->

<!-- term:reopen -->
**Reopen** (`agent/case:reopen`) — Reopening puts a closed case back at the stage it was closed from, on the same case. It needs the reopen permission and a reason, and keeps all history. *Example:* Client C reopens the closed Client E case with the reason "Late document". *Not the same as:* a linked case, which is a new case for a follow-on matter.
<!-- /term -->

<!-- term:linked-case -->
**Linked case** (`CaseLink`) — A linked case is a new case joined to an earlier one, for a follow-on matter. The link has a kind: worker permit, re-application of or stream changed. *Example:* After Client D's refusal, her re-application is a new case, linked to C-2026-00012. *Not the same as:* reopening, which continues the same case.
<!-- /term -->

<!-- term:withdraw -->
**Withdraw** (`agent/case:record-decision`) — Withdraw ends a filing before its decision. Staff record a date and a reason. Withdrawing the last open filing closes the case as Withdrawn. It is not offered after a decision. *Example:* Suppose the family drops Client D's study permit before submission. Client F withdraws that filing alone, and the other two continue. *Not the same as:* a decision outcome, because withdrawn is not an outcome of a decision.
<!-- /term -->

<!-- term:close-outcome -->
**Close outcome** (`closeOutcome`) — A closed case keeps how it closed: Withdrawn, Stream changed, Completed or Closed by staff. *Example:* The Client E case closes itself when its follow-up items are done, with the outcome Completed. *Not the same as:* a decision outcome such as Approved or Refused, which belongs to a filing.
<!-- /term -->

<!-- term:change-stream -->
**Change stream** (`agent/case:create`) — Change stream is a button that opens a new linked case for a different program. It closes the old case with the outcome Stream changed. It needs only the create-case permission. *Example:* Suppose a one-filing case was opened under the wrong program. Client C clicks Change stream, and the new case is linked to the old one. *Not the same as:* reopening, which keeps the same case.
<!-- /term -->

<!-- term:target-filing-date -->
**Target filing date** (`targetFilingDate`) — The target filing date is the day the firm aims to submit its filings. It is optional and empty at first. Anyone who can edit cases sets it, and ExpatReady never fills it from processing times. A case has one date. It counts calendar days, not the firm's business hours. Reminders and colours stop when every filing that is not withdrawn is submitted or later. *Example:* Client C creates the Client E case on Thu 5 Nov 2026 and sets "Target filing date: Fri 20 Nov 2026". *Not the same as:* a government deadline, which comes from the authority and never moves.
<!-- /term -->

<!-- term:early-warning -->
**Early warning** (no code name) — The early warning turns a case amber in the last 20 % of its time. That time runs from creation to the target filing date and counts calendar days. The 20 % is fixed, and there is no setting for it. The case officer is reminded 2 days before the date and on the day. After the date the case is red, and Needs you shows "Past target filing date". There is no escalation. *Example:* The Client E window, 5 Nov to 20 Nov 2026, is 15 days. The last 20 % is 3 days, so the case turns amber on Tue 17 Nov. Client C is reminded on Wed 18 Nov and Fri 20 Nov. He files on the day, so nothing turns red, and the case then shows "Submitted 20 Nov · N days waiting". *Not the same as:* an alert. The colour sends nothing; only the two reminders and the Needs you line do.
<!-- /term -->

<!-- term:expiry-watch -->
**Expiry watch** (no code name) — Expiry watch reminds staff before a person's status expires, such as a work permit, study permit, visitor record or PR card. Staff get reminders 30, 15, 7 and 2 days before. For a closed case, one more comes 90 days before. The watch keeps running after the case closes. It stops by itself when a new expiry is recorded for the same status, or when a renewal or extension is submitted. Staff may also click "Stop watching" and give a reason. Clients get reminders 30 and 7 days before: on by default for an open case, off for a closed one, with an unsubscribe link in every email. *Example:* Client B's work permit expiry is recorded, so Client F gets reminders before it, even after the Client E case closes. *Not the same as:* a government deadline, which sits on a government step. The full list of status dates is specified in the AG-11 review.
<!-- /term -->

<!-- term:government-fees -->
**Government fees** (no code name) — Each case has a Government fees section. It lists every government fee of its filings with the amount, the payer, the status and the receipt. The payer is the client, or the firm on the client's behalf. When the firm paid, one action adds the fee to the invoice as a non-taxable line. *Example:* The firm pays the fee for Client D's study permit. One action adds it to the invoice, so it is recorded once. *Not the same as:* the firm's own professional fees.
<!-- /term -->

<!-- term:bill-to -->
**Bill to** (no code name) — Bill to is the client who receives the case's invoices. It is optional and defaults to the case's own client. Staff may pick another client of the firm. *Example:* Bill to defaults to Client B on the Client E case. *Not the same as:* the case's client, because Bill to can be a different client.
<!-- /term -->

<!-- term:shareable-document -->
**Shareable document** (no code name) — A shareable document is a document type that the pack marks as shareable. Only these cross a case link, and only as copies. A new version is offered with one click and never pushed. Financial and business documents never cross. *Example:* Suppose the pack marks "Passport copy" as shareable. It is then copied into a linked case. *Not the same as:* a live link, because the linked case keeps its own copy.
<!-- /term -->

<!-- term:handover -->
**Handover** (`agent/case:assign`) — When someone leaves, "Hand all open work to" moves their open cases to one colleague. ExpatReady pre-selects the colleague who shares most of their cases, otherwise the Owner. *Example:* Client H leaves, and the screen suggests Client C, "already on 6 of Client H's 8 cases". Skipped cases land in Unassigned tagged "From Client H", and closed cases stay with her. *Not the same as:* Take it, which claims one unassigned case for yourself.
<!-- /term -->

<!-- term:not-started -->
**Not started** (`automationState` QUIET) — Not started means the client's automatic messages have not been started. An imported client, lead or case begins as Not started. Internal work runs, but no client message goes out until the firm starts it. *Example:* The firm imports an old case. It shows "Not started", and its imported values stay unverified until a person verifies them. *Not the same as:* client quiet hours, which are the 08:00 to 20:00 sending window.
<!-- /term -->

<!-- term:office -->
**Office** (`Office`) — An office is a branch of the firm with its own time zone. It stays hidden until the firm adds a second office. *Example:* The firm adds a Calgary office, and the Client E case belongs to it because a case takes its client's office. Changing a case's office recalculates unsent reminders; government dates never move. *Not the same as:* the person time zone, which is the person's own time zone.
<!-- /term -->

<!-- term:office-time -->
**Office time** (`Office.timezone`) — A time tied to an office is shown in that office's time zone. It is labelled, such as "10:00 (Calgary)", when it differs from yours; nothing is converted. *Example:* Client C in Toronto sees the Client E booking as "10:00 (Calgary)". *Not the same as:* the person time zone, which decides when messages reach the client.
<!-- /term -->

<!-- term:person-time-zone -->
**Person time zone** (`PartyProfile.timezone`) — The person time zone is the person's own IANA time zone, held on their details. ExpatReady fills it from the address, else a phone code that covers one zone, else the case's office. It shows "(auto)", and staff can edit it. *Example:* Client B's address is in Dubai, so his details show "Time zone: Dubai (auto)". *Not the same as:* office time, which is shown in the office's time zone.
<!-- /term -->

<!-- term:timeline -->
**Timeline** (no code name) — The timeline is a case's history in one paged list. It shows stage changes, documents, forms, deficiencies, submissions, government steps, decisions, notes, tasks, messages and reminders. It is built from the other modules and is not a log of its own. *Example:* Client C opens the Client E timeline and sees "Biometrics requested" for Client A on 2 Dec 2026. *Not the same as:* the audit log, which is the compliance record.
<!-- /term -->

<!-- term:audit-log -->
**Audit log** (`AuditLog`) — The audit log is the record of sensitive actions, and it cannot be changed. Each entry shows who did what, to what, and the values before and after. *Example:* Client I passes Client D's warning. The audit log records Client I, the reason and the time. *Not the same as:* the timeline, which is a readable history for staff.
<!-- /term -->

<!-- term:notification -->
**Notification** (`Notification`) — A notification alerts a staff member only when someone hands them work. AG-07 sends four: assigned to me, review requested from me, my review sent back and approval waiting. Everything else shows on the case, the timeline and the queue, with no alert. *Example:* Client I is notified "review requested from me" when Client C sends the Client E case for review. A document arriving sends no alert. *Not the same as:* a class-2 message box, which writes to the client.
<!-- /term -->

<!-- term:starter-roles -->
**Starter roles** (`firm-owner` to `firm-read-only`) — A firm starts with six roles: Owner, Admin, Case Manager, Case Officer, Billing / Finance and Read-only. They say what a user may do. *Example:* Client C holds the Case Officer role, so he can edit cases. On the Client E case he is also its case officer. *Not the same as:* the case officer team slot, which is one person on one case.
<!-- /term -->

**Sources.** Decisions used: AG07-D26 and X-3 (18 Oct, later); X-1 (rule 4); X-2 (1) to (5); AG07-D1, D2, D3, D4, D6, D7, D8(a), D8(c), D8(d), D9, D11, D12; AG07-D15 (adopting AG7-D11, D12, D14, D15, D18, D19); AG07-D16 (question 36); AG07-D17; AG07-D18; AG07-D19; AG07-D8(b), D10; AG07-D20 (d), (e), (f), (g), (i), (k), (s), (t), (v); AG01-5, AG01-6, AG01-8, AG01-10, AG01-21, AG01-24; AG1-D19; SA6-D5; AG16-6, AG16-7, AG16-31, AG16-44, AG16-46, AG16-49, AG16-73, AG16-89, AG16-92; SA5-D48, SA5-X25; SA1-D15; AG17-D17, D30, D62, D63, D64, D65, D77. Where no decision overrides it, the structure (stage names, review flow, severities) follows AG-07 v2.13 §3.3, §3.4, §3.6 to §3.8 and §6.


---

## Applied from other modules

| Decision | Applied |
|---|---|
| AG16-2 to AG16-23 (Template map, 14 Oct) | applied v1.6 as listed in the change log row 1.6; no section 0.2 table exists in this document. |
| AG16-24 to AG16-53 (Template map, 15–17 Oct) | applied v1.7 as listed in the change log row 1.7 (glossary terms and the Release 1 additions table). |
| AG16-54 to AG16-82 (second pass, 17 Oct) | standing rules and the Writer entry only, v1.8; module-level changes are in each epic's own change log. |
| SA5-X46 (SA-05) - SA05-R9a automatic messages run from day one | applied v1.5 (this document has no section 0.2 table; this is its only applied-from table). SA5-X46 is not yet listed in SA-05 v3.3 section 0.2 (next free row); no text invented beyond the decision. |


---

## Open points (not decided) - SA05-R9a

- **Not decided:** which firm details each automatic message needs before it can send (Guard 1, AG-12-109 in `AG-12-templates_v2.2_2026-10-12.md`). Owned by AG-12.
- *Closed v1.6 (AG16-11):* who may change the Automatic messages page — permission `agent/template:configure` (SA05-R9b). Spec home AG-12.
- ~~**Not decided (v1.6):** AG16-4 says "12 everyday Doers" and the glossary lists 12 without Qualifier and Finder, which are also built non-AI Doers; the family total (12 or 14) needs the product owner's ruling.~~ **Closed 14 Oct:** the decision map was corrected — 14 everyday (non-AI) Doers (the 12 listed plus Qualifier and Finder) and 4 AI Doers. Owned by this document.
- SA5-X46 (SA-05) is not yet listed in SA-05 v3.3 section 0.2 (next free row); the text above follows the decision SA05-R9a only.
- **Not decided (v1.7):** AG16-48 says a WhatsApp provider must support Meta's current Embedded Signup version and cites "v2 retires 15 Oct 2026", a date already past on 17 Oct. Which version is current, and which provider, is open (SA8-D31). Owned by SA-08.
- ~~**Not decided (v1.7):** the glossary term **Unmatched** now covers email, government letters and WhatsApp; AG16-48 sends unknown numbers from a WhatsApp history import to **Not brought in**, while a new unknown number goes to Unmatched (AG16-48 (5)). Confirm that two lists for unknown WhatsApp numbers is intended. Owned by AG-10.~~ **Closed 18 Oct — AG16-90:** AG16-57 makes Unmatched the one list for unknown people ("Not brought in" is machine mail only, with no "Create lead"), and AG16-78 brings in past WhatsApp chats only for clients and leads already in ExpatReady.
