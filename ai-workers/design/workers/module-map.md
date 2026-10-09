# Module map: which AI Worker touches which module (W2 step 3, revised after review W2)

**Author:** ai-worker-designer, 9 Oct 2026; revised the same day (review W2 m-10: Doer plane added; B-1: exports, trust entries and attachment typing aligned with `../ws2-improvements.md`). **Status:** Proposal. Companion to `catalogue.md` (worker IDs W-01 to W-28, shapes T task / J journey / R role twin / X expert). Module list is the W1 product map: Super Admin SA-1 to SA-12 (`../inventory/sa-frs.md`, `doc2-admin.md`), Firm AG-1 to AG-18 (`ag-frs-1.md`, `ag-frs-2.md`, `doc3-firm.md`), Client portal CP-1 to CP-9 (`doc4-portal.md`), Foundation (`foundation.md`), and the Doer plane (README D2; `foundation.md` Part 2a; `../ws2-baseline/B-index.md`). Rules: AIW-D11 (firms only; the portal is touched only through firm-side review), AIW-D22 (no restating; module facts cited by file and section), AIW-D26 (approval by a named person under the firm's role settings), G16 hard limits (no worker exports, moves money, deletes, signs or changes settings: IMP-23, IMP-27).

"Touches" means the worker reads from, writes proposals into, or is approved through that module. "Owner" is the worker for which the module is the home.

## 1. Firm plane (AG)

| Module | Workers that touch it (owner in bold) | What they do there | Or: no worker, and why |
|---|---|---|---|
| AG-01 Firm setup and onboarding (v1.16) | W-17 (handover list on staff leaving, §3.2); W-23 (stalled-setup outreach, §3.6); W-25 to W-28 (role subsets drawn from §3.3 roles; licensed-user link in §3.5 feeds approval defaults) | Read roles and the licensed-user link; propose handover lists | No worker owns it: setup is a one-time, Owner-only, consequential task; AG1-D14 records "not doing" automatic owner suggestions and automatic client emails |
| AG-02 Leads and sales (v1.9) | **W-10**; W-26; W-07 (WhatsApp filing, §3.1); W-09 (lead profile gaps, §3.3); W-14 (reopen, §3.10 to §3.11); W-15 (lead import, §3.14 adapter); W-16 (prepares the personal-data package draft; the export in §3.14 is run by its permission holder); W-17 (ranked queue, §3.7) | Draft consented follow-ups, propose next move, propose answers; never convert (AG-2-47), create a lead from an unknown number (AG-2-62) or export (G16) | — |
| AG-03 Eligibility (v1.4) | **W-24** (reads breakdown and provenance); W-09 (gap list, §3.1); W-10 and W-26 (run only, never override, review or share, §10); W-20 (conformance, BR-18) | Explain results; ask for missing inputs | The engine itself gets no AI by rule (AG-3-39): rules decide |
| AG-04 Booking (v1.5) | **W-11**; W-10 and W-26 (book, recover no-shows, §3.8); W-14 (follow-up booking) | Book, remind, draft the consult record and proposal | — |
| AG-05 Retainer and e-sign (v1.9) | W-11 (proposal scope into the template, §3.1 to §3.4); W-01 (starts on `envelope.signed`, §3.11) | Draft scope text only; locked clauses untouched (BR-3); never sign or countersign (G16) | No worker owns it: the retainer is a deterministic template merge with consultant approval (§3.4) and a legal type |
| AG-06 Billing (v1.7) | **W-12**; W-27; W-18 (money narrative) | Propose matches, unbilled work, dunning wording and an internal list of trust-tagged items; never issue, record, refund, write a trust entry or export (BR-11; G16, IMP-23) | — |
| AG-07 Case core (v2.7) | **W-01**; W-03 (milestones and decisions, §3.7); W-04 (checklist, §3.4); W-05 (forms, §3.5); W-06 (letters from case data); W-13 (corporate cases share the core); W-14 (after-decision items, §3.7, §3.10); W-17 (assignment and unassigned queue, §3.8); W-24 (deficiencies and readiness, §3.6); W-25 | Build, check, prepare and explain the file; stop at review-approve, form-approve, submit and record-decision keys (§10); never move a stage (AG-11-16; G16) | — |
| AG-08 Questionnaire (v1.7) | **W-09**; W-01 (verification worklist, §3.8); W-04 (Reader and Checker in intake, §3.6, §3.8); W-15 (imported values, AG-8-43); W-25, W-26 | Propose values and answers; a person verifies (AG-8-44) | — |
| AG-09 Documents (v1.8) | **W-04**; W-01; W-03 (letters, §3.14 group b); W-07 (hands attachments to the Reader for typing: IMP-12); W-13 (advertising proof, CVs); W-15 (bulk filing, AG-18-33); W-16 (legal hold check, §3.12); W-02 (expiry, §3.3) | Classify (Reader; AUTO typing pending IMP-13), extract, propose verdicts and reasons; never verify (§3.9), dispose or export | — |
| AG-10 Communication hub (v1.9) | **W-07**; **W-08**; W-03 (letters by email); W-09 (message-to-answer); W-10, W-12, W-14 (sends through it); W-25, W-26, W-27 | File, classify, draft; all sends pass the consent gate (§3.6), the AI-text setting (AG-10-44) and the status-content template rule (IMP-28, G17) | — |
| AG-11 Conductor, Doers, Needs you (v1.11) | Every firm-side worker: Needs you (§3.13) is the single hand-off; recipes (§3.5) are the building blocks of W-01, W-02, W-10, W-14; run history (§3.9) and `AiRunLog` feed W-24; each worker is itself a recipe from the closed action menu (IMP-10) | — | No worker authors automations: the builder is Release 2 (AG11-D3); workers use the seeded recipes and switches |
| AG-12 Templates (v1.2) | W-08 (French for non-legal bodies, §3.2, §3.6); W-06 (letter templates); W-04 (reason library as templates); the firm's "status content" mark on templates (IMP-28(c)) governs every worker send | Draft non-legal text; legal and consent text never touched (AG-12-24) | — |
| AG-13 Tasks, notes, timeline, audit (v1.12) | **W-17**; W-02 (tasks from deadlines, AG-13-65); W-24 (timeline and audit as sources); every worker's delegation shows on its audit rows (IMP-1, IMP-2) | Summarise; create tasks; internal notes only (BR-4) | — |
| AG-14 Reporting (v1.10) | **W-18**; W-24 (metrics under viewer scope, BR-2); W-02 (deadline adherence, §3.5); W-12 (receivables, §3.3); AI performance metrics for every worker (IMP-29) | Narrate computed numbers only (BR-12); never export (G16) | — |
| AG-15 Portal management (v1.6) | W-04 and W-01 (work items, uploads, §3.4); W-08 (nudge wording, §3.6); W-16 (seat and access requests only as a queue, §3.1) | Propose accept or reject; nudges stop when the client acts | No worker configures visibility: what the client sees is a firm judgement (§3.3) |
| AG-16 Settings and integrations (v1.12) | All workers read: AI switch (§3.9), autonomy per recipe, Team safeguards (§3.10), supervised messages (§3.11), timings (§3.13), who approves AI text (the AIW-D26 setting) | Read only | No worker changes settings: Owner-only and consequential (§1; G16) |
| AG-17 Corporate and LMIA (v0.5) | **W-13**; W-02 (dated items, AG-17-73); W-03 (officer contacts, §3.6); W-24 (reference tables with source and date, §3.1) | Propose entries, comparisons, reports and the inspection-pack list; never screen candidates (FD-7) | — |
| AG-18 Import and migration (v1.2) | **W-15**; W-07 (Reader filing on import, §3.5); W-02 (imported key dates, §3.4) | Propose mappings; nothing written before dry-run and confirm (BR-1) | — |

## 2. Client portal (CP)

Per AIW-D11 no worker faces the client. Each row names the firm-side worker whose output the client eventually sees after a named person approves it.

| Module | Firm-side workers whose output reaches it | Or: no worker, and why |
|---|---|---|
| CP-1 Secure access | — | No worker: access, isolation and branding are firm actions through AG-15; nothing to prepare |
| CP-2 Progress and next action | W-03 (milestones and client notices, after approval); W-02 (due dates behind the to-do list) | Stage labels and decision disclosure stay firm judgement (CP-2 §3.5; FDL D-4) |
| CP-3 Questionnaire | W-09 (targeted questions and proposed answers); W-01 (request-changes notes via W-08) | The fill wizard itself is rule-based (CP-3 §3.2) |
| CP-4 Documents | W-04 (accept or reject reasons in the client's language); W-02 (expiry warnings via Minder, §3.6); W-01 (requests and chases) | — |
| CP-5 Payments | W-12 and W-27 (dunning wording; invoice drafts a person issues) | The client's only money action is to pay (CP-5 §1); nothing for a worker to prepare on the client side |
| CP-6 Signing | W-11 (proposal scope inside the agreement, after approval) | Signing is never done on behalf (AG-5-39); legal text never machine-translated (CP-6-22) |
| CP-7 Messaging | W-08 (reply drafts); W-07 (filing of client messages); W-09 (answers from messages) | Replies are the firm's judgement; the AI-text setting governs every send |
| CP-8 Profile, consent, privacy | W-16 (requests on legal clocks; drafts only, the export and deletion are run by a person); every sending worker reads the consent register (§3.5) | Consent and purpose lists are set with counsel |
| CP-9 Employer view | W-13 (recruitment summary counts; inspection-pack list, firm side) | The employee wall (BR-3) is a firm decision per case; no worker widens it |

## 3. Admin plane (SA)

| Module | Workers that touch it (owner in bold) | Or: no worker, and why |
|---|---|---|
| SA-1 Country packs (v2.2) | **W-19**; **W-20**; **W-21**; W-28; W-24 reads published versions (BR-3) | Publishing stays two-person (§3.12) |
| SA-1B Content Pack Configurator (v1.2) | **W-19** (SA-1B-33, SA-1B-34); W-20 (rules and scoring tests); W-21 (reference-table sources, §3.6); W-28 | The resolver and the fill path get no AI by rule (SA1B-D16) |
| SA-2 Firm management (v2.19) | **W-23** (health lists, §3.6); W-15 (assisted migration under the support-session rules, §3.7) | Lifecycle, locks and deletion stay operator actions with reasons |
| SA-3 Plans and entitlements (v2.14) | W-23 (over-limit list, §3.7); all workers are gated by the product map and limits (§3.3, §3.6; product-map item and usage metric per IMP-8, IMP-9); per-file metering proposal (§11; IMP-18) | No worker edits plans: live-plan changes need an Owner other than the requester (§3.9) |
| SA-4 SaaS billing (v2.14) | W-23 (overdue list, §3.5 to §3.6) | No worker touches money state: refunds, discounts and holds are human with reasons |
| SA-5 Global templates (v2.2) | W-08 and W-28 (non-legal translation suggestions, SA-5-15) | Legal types need Platform-Owner review (SA-5-23); never machine-translated |
| SA-6 Roles and permissions (v3.1) | W-25 to W-28 (permission subsets are drawn from, never added to, the catalogue; approval routing §3.3; delegation per IMP-22) | No worker edits roles: a security decision, not auto-generated (Doc 1 §4.4) |
| SA-7 Platform users (v2.10) | W-28 (needs a delegating Content author; no non-human account route, SA-7-39) | No worker manages staff |
| SA-8 Rails (v2.2) | None directly; D1 (AI provider rail, IMP-6) is the gap every worker waits on | No worker: credentials and rails are Platform Engineer work, write-only secrets (§3.1) |
| SA-9 Analytics (v2.2) | W-23 (firm health signals); adoption of workers measured through `FeatureUsageEvent` (§3.4; IMP-29) | No worker: aggregate business metrics for the founder; anomaly alerts are thresholds |
| SA-10 Support (v2.5) | **W-22** | Internal notes never reach the firm (BR-4); Immigration Content routes to the Content Manager |
| SA-11 Audit, compliance, governance (v2.7) | W-16 (DSR register, §3.8; drafts only); every worker's delegation on `actorType` (IMP-1, IMP-2; SA-11-2 has no AI value today); W-20 and W-21 (pack provenance, §3.9); Canada-only AI processing row (IMP-7) | Breach assessment and notification stay with the DPO and counsel (§3.7) |
| SA-12 Flags and configuration (v2.7) | All workers launch behind flags and the kill switch (§3.4; IMP-8); workers holding queued work need a pause hook (SA-12-29) | No worker changes flags |

## 4. Foundation

| Area | Workers that depend on it | Note |
|---|---|---|
| Identity and permissions (Doc 1 §3, §4; FD-16) | all; W-25 to W-28 most | No AI principal; delegated session and permission subset are Proposed (IMP-1, IMP-22) |
| Capability registry and kill switch (Doc 1 §1.12) | all | Each worker is a switchable capability; an OFF capability no-ops with an audited reason |
| Audit spine (Doc 1 §7.5; AG-13 §3.5) | all | "AI prepared, person approved" needs the IMP-2 join (inventory X7); tamper-evidence may move to Release 2 (IMP-39) |
| Consent register, DSR, retention (Doc 1 §7.4, §7.6) | W-10, W-14, W-16, every sender | Consent at point of use; legal hold beats deletion |
| Country Pack and Practice Pack resolvers (FD-22; Doc 1 §5.13) | W-01, W-02, W-03, W-05, W-13, W-19 to W-21, W-24 | Rules decide; AI proposes (G10, IMP-37 wording) |
| Import engine (Doc 1 §8.9) | W-15 | — |
| Finder / search (Doc 1 §8.8) | W-24 | Permission-filtered retrieval is the expert's backbone (D9; IMP-20) |
| Rails as ports (Doc 1 §6.3) | all AI workers | An AI model rail does not exist yet (D1; IMP-6) |

## 5. Doer plane (README D2 lists Doers as a plane; names per the October files and `../ws2-baseline/B-index.md`; naming conflicts are IMP-24)

| Doer (status per the inventory) | Workers that call it | What the worker asks of it | Doers no worker calls, and why |
|---|---|---|---|
| Reader (AI; Specified, built but off) | W-01, W-03, W-04, W-07 (attachment typing, IMP-12), W-09 (pattern), W-13 (screenshots, CVs: Proposed use), W-15, W-25 | classify and extract, proposals only | — |
| Sorter (AI; Specified, built but off) | W-07, W-03, W-09, W-25, W-26 | match a message to a file and classify it; never types attachments (IMP-12) | — |
| AI message writer ("Drafter" AI; Specified; name open under IMP-24) | W-03, W-06, W-08, W-09, W-10, W-11, W-12, W-14, W-17, W-18, W-22, W-23, all twins | draft text a person approves; never sends | — |
| Checker (AI; Specified, built but off) | W-01, W-04, W-05 | cross-check warnings, never a lock | — |
| Template engine ("Drafter" in AG-05/AG-09; Specified) | W-06, W-11, W-13 (report), W-05 (none: forms use the Filler) | merge data into a template | — |
| Minder (Specified, **not built**: AG-11-47) | W-02, W-03, W-13, W-14, W-15, W-24 (reads) | register and watch dates; cascades | — |
| Reminder (Specified; folded into Minder by FD-8, kept separate in October: IMP-24) | W-02, W-16 | nudges on dates | — |
| Tasker (Specified) | W-01, W-02, W-03, W-17 | create tasks for people | — |
| Mailer, Messenger (Specified; WhatsApp provider open) | every sending worker through AG-10 | send approved or template messages under the consent gate | — |
| Scheduler (Specified) | W-10, W-26 | book and remind | — |
| Qualifier (Built in part; Canada-hardcoded today per AG-03 §12) | W-09, W-10, W-24 (reads), W-26 | run an assessment; never override, review or share | — |
| Filler (Built engine; refuses XFA; release parked) | W-05 only | fill from verified values; AI stays out (SA1B-D16) | — |
| Reviewer (Specified; release open) | W-01, W-24 (reads) | deficiencies and readiness | — |
| Binder (Specified) | W-01, W-04 | checklist and requests | — |
| Biller (Specified; rail "effectively NEW") | W-12, W-27 (drafts only); W-10 (paid consult link) | invoice drafts; never issue, record or refund (G16) | — |
| Signer (Specified) | — | — | **No worker calls it:** signing and countersigning are blocked for every worker (G16; AG-5-39) |
| Dialer (Specified in AG-02; dropped by SCOPE-TRIAGE) | W-11 (recording, consent-gated) | consult audio only | Live calling is not a worker action |
| Reporter (AG-14 module, not a dispatchable Doer in AG-11) | W-18, W-24 (reads) | computed numbers only | — |
| Finder (Doc 1 §8.8; release Unknown) | W-24 | permission-filtered retrieval | — |
| Recruiter (AG-17 / CP-9; light-evidence scope FD-7) | W-13 (evidence only) | candidate log from staff entries; never screening | — |
| Clocker / Timer (AG-13 §3.6) | W-12, W-27 (read unbilled time) | read only | — |
| Conductor (engine, not a Doer; ~55–60% built per AG-11 §12) | every worker is a recipe it runs (IMP-10) | dispatch from the closed action menu; idempotency, dead-letter (IMP-35, IMP-36) | — |

## 6. Modules with no owning worker, in one list

AG-01, AG-05, AG-16, CP-1, CP-5, CP-6, SA-3, SA-4, SA-6, SA-7, SA-8, SA-9, SA-12, and the Signer on the Doer plane. Reason in each case: a one-time or consequential human configuration (setup, settings, roles, rails, plans, flags), a legal act that must not be done on behalf (signing), or money state that only a person may change (G16). Workers read these modules; none prepares work inside them.
