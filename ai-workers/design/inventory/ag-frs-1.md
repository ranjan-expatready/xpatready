# Inventory slice "ag-frs-1": Firm console detailed FRs, part 1

**Reader:** requirements-cartographer (W1, 9 Oct 2026). **Source:** `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/` only. Format per `SCHEMA.md`.
**Files in this slice:** 00-Overview v1.11 (2026-10-07) · 99-Phasing-and-Glossary v1.4 (2026-10-05) · AG-01 v1.16 · AG-02 v1.9 · AG-03 v1.4 · AG-04 v1.5 · AG-05 v1.9 · AG-06 v1.7 · AG-07 v2.7 · AG-08 v1.7 · AG-09 v1.8. Coverage: `coverage-ag-frs-1.md`.
**Citation shorthand:** "Ovw v1.11" = `00-Overview_v1.11_2026-10-07.md`; "Phs v1.4" = `99-Phasing-and-Glossary_v1.4_2026-10-05.md`; "AG-0n vX" = the module file with that version. Quotes are word for word from the source (short extracts). Anything not quoted that is interpretation is marked **Inferred**.
**Notes are grouped by source file inside each Part** (written progressively, file by file).

**Quote check:** every quoted string was machine-checked against the source files (markdown bold/backticks ignored; "..." marks an elision). Single quotes inside a quote stand for double quotes in the source.

## Slice summary (reader's view; details and citations in Parts 1–5)

- **Components:** 11 module-level rows plus about 90 sub-component rows across Ovw/Phs, AG-01 to AG-09.
- **Most AI-relevant facts:**
  1. The Firm FRs already put four AI Doers (Reader, Sorter, Drafter, Checker) in Release 1, "built but switched off" until Super Admin records provider, Canada-only region and no-training terms (Phs v1.4 Release gate). The workstream README says the Charter lists AI as "NOT IN RELEASE 1": a conflict to resolve (Part 5).
  2. The approval machinery an AI Worker would sit inside is specified: autonomy levels AUTO / APPROVE / OFF, product floors (AI-written client text, AI-edited templates, government forms, unlooked-at verified-profile values never below APPROVE), the Needs you queue, "Nothing in it executes on timeout", and "ExpatReady never submits anything to a government authority on its own" (Ovw v1.11; AG-7-59).
  3. Licensed sign-off is split in two: professional approvals (form approve, waive, review sign-off, countersign) go to every holder of the permission with licensed holders "preferred" and an Owner fallback (AG-7-68, AG-5-27); AI-written client text needs a licensed user by default (AG11-D11(a)). Lead representative must be a licensed user (AG-7-35). No licence is ever checked by the product (AG1-D19).
  4. Reader is the deepest AI feature in this slice: classify on upload (AUTO at high confidence, AG-9-11), extract from identity documents, IRCC letters (deadlines to the Minder only after approval), language results, ECA reports; "approval IS the verification" and needs `agent/sqr:verify` (AG-9-45, AG-8-44). Checker cross-checks typed vs document values, warnings only (AG-7-61, AG-8-42).
  5. Large rule-based "intelligence" already specified and AI-free: Qualifier (deterministic eligibility, AG-03), lead next-best-action and work-queue (AG-02 §3.7), Reviewer readiness and deficiency library (AG-07 §3.6), dunning (AG-06 §3.2). These are natural tools for an AI Worker to operate.
- **Blocking gaps:** release scope of Filler, Deficiency Library, four-eyes, filings and board undecided (AG-07 §13 item 22); Case table and most of the case spine not built (AG-07 §12); "Drafter" means both a template-merge generator (AG-05) and an AI writer (Ovw/Phs); no requirement covers a non-human user (seats, sessions, roles, audit actor) — AG-01; AG-03, AG-04, AG-06 not updated for agent-native operation; SME-owned pack values (checklists, form mappings, deficiency severities, retention, Reader field lists) missing.

## Part 1: Components

### From 00-Overview v1.11 and 99-Phasing v1.4 (whole-console level)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG (console) | Firm console (Agent/Firm plane) | Firm (AG) | The day-to-day app firm staff use to run the practice end to end: leads, assessment, booking, retainer, payment, case delivery, portal. | Owner/Principal RCIC, RCIC, Case Officer/Paralegal, Intake/Sales, Accounts/Billing, Manager | Per persona (Ovw "Agent Console Sub-Roles"): Owner "final sign-off on regulated work"; RCIC "Author and finalize assessments; own cases; review documents; prepare and verify government forms"; Case Officer "Collect documents; manage questionnaires; execute checklists; draft forms; log correspondence"; Intake "Capture and qualify leads; manage the pipeline; run preliminary assessments; book consultations; follow up"; Billing "Generate invoices; configure payment plans; record and reconcile payments" | All Doers; Conductor is "an engine, not a Doer" | Country Pack drives "Programs/streams, eligibility rules, calculators, government forms and their field mappings, document checklists, case stages and workflow templates" | "The professional approvals (override a critical warning, approve a government form, sign off a file, countersign a retainer) default to Owner and Case Manager; the system never checks licence (SA6-D9)" | R1 (Phs v1.4 Release 1 row) | Ovw v1.11, Document Summary; Agent Console Sub-Roles; Permission model |
| AG-1..AG-18 scope index | Detailed Scope Index | Firm (AG) | One-line scope and release for every module. | All | n/a | see rows per module | n/a | n/a | Every AG module listed "Release 1"; partial R2: AG-12 "parity tooling Release 2", AG-14 "Release 1 snapshot · full dashboards and corporate dashboard Release 2", AG-15/AG-16 "Release 2 breadth", AG-17 "other corporate services Release 2", AG-18 adapters beyond Officio/CaseEasy R2 | Ovw v1.11, Detailed Scope Index |
| Agent-native operation | Principles for Doers doing the work | Cross-cutting | States how every module lets Doers do work and people approve. | All staff | "A person approves what matters: AI-written client text, government forms and values nobody has checked" | Doers incl. AI Doers; Conductor | Autonomy levels AUTO/APPROVE/OFF; product floors | "a human approves AI-written text before it reaches a client; nothing is fabricated; nothing is submitted to an authority by ExpatReady" | R1 (AG11-D1..D18) | Ovw v1.11, "Agent-native operation (2026-10-04)" |
| Needs you / Done for you | Staff home screen: approval queue and feed of Doer work | Cross-cutting | Queue of drafts waiting for a person, then a feed of what Doers did (last 24 h). | All staff; managers firm-wide | Approves, edits-then-approves or rejects drafts | All Doers feed it | Overdue after 2 working days; gov-deadline items 2 working days before | "Nothing in it executes on timeout." | R1 (AG11-D2, D7) | Ovw v1.11 Agent-native; Phs v1.4 Glossary "Needs you", "Done for you" |
| Team safeguards | One switch, four team controls | Cross-cutting | "four-eyes on government forms, Minder escalation, at-risk marks, and routing of unlicensed staff's items to licensed users" | Owner switches off/adjusts | Owner decides off/adjust "with a recorded reason" | Minder; Needs you routing | Auto-on "at 5 or more active staff" | "only the Owner may switch it off or adjust a part, with a recorded reason" | R1 (AG11-D9) | Ovw v1.11 "Easy for solo, safe for teams"; Phs v1.4 Glossary |
| Supervised client messages | Licensed review of unlicensed staff's client messages | Cross-cutting | Separate setting, on as soon as an active unlicensed user can message clients. | Licensed users; Owner fallback | Licensed user reviews messages from unlicensed staff | Needs you | — | "when no licensed user is active, the Owner may approve, and the approval is recorded (AG11-D11)" | R1 | Ovw v1.11 "Easy for solo, safe for teams" |
| Country-awareness | One firm, one country; pack drives behaviour | Foundation | Firm provisioned for exactly one country (FD-68); every record stamped with pack version. | Super Admin sets; firm reads | None by firm (no country switcher). "Re-running an assessment against a newer pack version is an explicit, logged action" | — | Country Pack, version stamps | "ExpatReady never checks, tracks or warns about a licence's validity or expiry (AG1-D19)" | R1 | Ovw v1.11, "How Country-Awareness Works" items 1–7 |
| In-House Doers doctrine | Core built in-house; three approved outside providers | Cross-cutting | Every product tool is an in-house Doer; outside providers only for AI/OCR, WhatsApp, mailbox connection, each approved by Super Admin (SA-08). | Super Admin approves providers | Super Admin approval of providers | Signer, Scheduler, Mailer, Messenger, Biller, Tasker, Reminder, Minder, Qualifier, Filler, Binder, Reviewer, Reader, Sorter, Drafter, Checker; Conductor | — | "each approved by Super Admin (SA-08) before any firm uses it (AG11-D14)" | R1 | Ovw v1.11, "In-House by Design" |
| Release gate (AI) | AI Doers and WhatsApp built but off until terms recorded | Cross-cutting | AI Doers and WhatsApp "ship in Release 1 built but switched off" until Super Admin records provider, region, no-training agreement. | Super Admin; Owner | Owner "switches AI on once with an audited acknowledgement" | Reader, Sorter, Drafter, Checker | Canada-only processing (AG11-D15) | "Every AI path keeps its manual fallback, so the rest of Release 1 does not depend on the gate." | R1 (gated) | Phs v1.4, "Release gate (AG11-D13)" |
| Release plan | Release 1 / Release 2 / Later split | Cross-cutting | Release 1 = "one complete, sellable end-to-end journey on the Canada country pack for individual clients and corporate (LMIA) clients"; Release 2 = breadth + corporate depth; Later = advanced + more country packs. | — | — | — | — | — | "Where a module's split between Release 1 and Release 2 is not stated below, it follows the earlier Phase 1 / Phase 2 split and is to be confirmed." | Phs v1.4, Phasing |

### From AG-01 v1.16 (Firm Setup & Onboarding)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-01 | Firm setup and onboarding | Firm (AG) | Turns a freshly provisioned firm account into one "ready to take its first client": profile, staff, roles, licence, payment account, branding. | Owner (main), Admin/Office Manager; others are "subjects" of its permissions | Owner/Admin types profile, invites staff, sets roles, enters licence, connects payment account, uploads branding | Mailer (invites, nudges); "Notification/Reminder Doers" for stalled-setup nudges; Biller (payment rail) | Country Pack resolves regulator, programs, locale; plan entitlement bounds permissions | Owner-only: "Exactly five actions SHALL be Owner-only" (AG-1-65) | R1 (Ovw v1.11 index "Release 1"; AG1-D13 "Nothing is deferred — everything ships in the MVP") | AG-01 v1.16 §1 "the first room a firm walks into" |
| AG-01 §3.1 | Firm profile and branding | Firm (AG) | Firm's factual record (name, locale, timezone, currency) and white-label look on console, PDFs, emails, portal. | Owner/Admin | Types profile fields; uploads logo; picks colours and portal subdomain; checks live preview | — | Defaults "seed from the firm's one provisioning-set country" (AG-1-5) | No | R1; custom domain "Release 2 or later" (§13) | AG-01 v1.16 §3.1; AG-1-4..9 |
| AG-01 §3.2 | Staff management and leaving | Firm (AG) | Invite, edit, suspend, deactivate, delete staff; seat-cap; handover of a leaver's work. | Admin with `agent/staff:manage` | Invites; enters reason for roles; on deactivation "picks one new owner per type" or "Skip"; reassigns Unassigned work later; tells clients personally ("The firm tells clients itself", AG1-D10) | Mailer (invite); automations never assign to deactivated user (AG-1-47); creates task "Update representative with <authority>" (AG-1-52) | Seat cap = active + pending invites (AG1-D3) | Lead-RCIC handover only to "licensed users" (AG-1-49) | R1 (AG1-D13) | AG-01 v1.16 §3.2; AG-1-10..16, 47..54 |
| AG-01 §3.3 | Firm roles and permissions | Firm (AG) | Six fixed starter roles; custom roles by copying; several roles per person; default-deny. | Owner, Admin | Creates/edits roles; gives roles; must type "a written reason" for every role change (AG-1-66) | — | Plan entitlement bounds grantable permissions (AG-1-20) | "the four professional-approval keys `agent/case:waive-deficiency`, `agent/case:form-approve`, `agent/case:review-approve` and `agent/retainer:countersign` are seeded on the Owner and Case Manager" (SA6-D2) | R1 | AG-01 v1.16 §3.3; AG-1-17..24, 59..66 |
| AG-01 §3.4 | Firm country (read-only) | Foundation | The account's one country, set by Super Admin, resolves the Country Pack; `WAITING_ON_PLATFORM` if no pack published. | — (read-only) | None ("no country picker anywhere") | — | Country Pack version "greatest `effectiveAt ≤ now`" | No | R1 | AG-01 v1.16 §3.4; AG-1-26, 28, 28a |
| AG-01 §3.5 | Regulator licence credentials | Firm (AG) | Records designated person, regulator, licence number, signature; stamped onto retainers and forms; defines "licensed user". | Each licensed person (own); Owner/Admin (anyone's) | Licensed person types own licence number and uploads signature | Feeds document generation in AG-5/AG-7 | Regulator and licence format from pack; format check is "an input typo check, not a validity check" (AG-1-34) | "it never checks, tracks, reminds about or acts on licence validity or expiry" (§3.5); generation blocked with "No active licensed consultant — add one" (AG-1-51) | R1 | AG-01 v1.16 §3.5; AG-1-30..34, 51, 58, 64 |
| AG-01 §3.6 | Guided onboarding checklist | Firm (AG) | Ordered task list, % complete, "single most valuable next step"; READY when required tasks done. | Owner | Completes each task; ticks "I work solo" | Mailer + in-app nudges "via the Notification/Reminder Doers" (§3.6) | Required: profile, credentials, payment rail (§13 Q2 "Proposed locked") | Hard gates only: "no taking money without a payment rail; no generating a regulated document without a licence on file" (AG-1-38) | R1 | AG-01 v1.16 §3.6; AG-1-35..39 |
| AG-01 §3.7 | Sign-in security (MFA, sessions) | Firm (AG) | MFA policy; one session per staff member; no idle logout; password change ends other sessions. | All staff; Owner/Admin set MFA policy | Admin sets MFA policy; revokes sessions on off-boarding | — | Platform rules (AG1-D20) | No | R1 (AG1-D16 "re-confirmed for Release 1"); WebAuthn/passkey and step-up re-auth "fast-follow" (§13) | AG-01 v1.16 §3.7; AG-1-40..42, 55..57, 67 |

### From AG-02 v1.9 (Prospect / Lead / Sales CRM)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-02 | Leads and sales pipeline (CRM) | Firm (AG) | Top of the revenue funnel: capture, dedupe, route, qualify, follow up and convert leads to clients; individual and corporate pipelines. | Intake/Sales rep ("heaviest user"), RCIC, Manager, Owner | Reps call, log calls, write notes, send emails, move cards, mark lost with reason, convert | Conductor; Qualifier; Scheduler; Dialer; Mailer; Messenger; Drafter + Signer; Biller; Tasker; Reminder; Sorter | Country Pack programs for eligibility; CASL consent gate; timezone/business hours | Case creation "stays an explicit, deliberate action (conversion is a decision, not a side-effect of a drag)" (§3.5) | R1 (Ovw index); some parts parked/R2 (see rows) | AG-02 v1.9 §1 |
| AG-02 §3.1 | Lead capture (7 sources) | Firm (AG) | Manual, web form (per language), inbound API, CSV import, referral, WhatsApp/social, booking page; all normalised, deduped, routed. | Reps; Owner configures forms/API keys | Rep types new lead in modal; Owner builds web form; person clicks "Create lead" for unknown WhatsApp number | Conductor speed-to-lead; Sorter (WhatsApp); AG-18 import engine | Consent text per locale (CASL, Law 25); phone normalisation | "A person clicks it — it is never automatic" (WhatsApp "Create lead", §3.1 source 6) | R1 incl. CSV import via AG-18 (AG-2-7) and WhatsApp (AG-2-62); other live channels/SMS R2 (AG-2-9) | AG-02 v1.9 §3.1; AG-2-4..12, 62 |
| AG-02 §3.2 | Duplicate check and merge | Firm (AG) | Matches email/phone within the firm; offers link, merge or new; merge reconciles field by field. Same check serves AG-07 Add client. | Reps; Manager reviews suspected duplicates | Person chooses link/merge/new; picks surviving values per field | — | Normalised email + E.164 phone | "never silently create a duplicate or silently merge" (AG-2-15) | R1; background duplicate suggestions "Release 2 or later" (AG-2-17) | AG-02 v1.9 §3.2; AG-2-14..17 |
| AG-02 §3.3 | Lead detail "command center" | Firm (AG) | One screen: profile, timeline, composer, next-best-action, Doer action bar (Qualifier, Scheduler, Dialer, Mailer/Messenger, Drafter+Signer, Biller; Check for employers). | Reps, RCIC | Reads history; launches actions; writes notes | Doer action bar as listed | Profile is "the single source that feeds the Qualifier" | No | R1 | AG-02 v1.9 §3.3 |
| AG-02 §3.4–3.5 | Pipeline board and stage rules | Firm (AG) | Kanban of nine default stages with kinds (Active/Won/Lost/Nurture); e-signature drives Won. | Reps, Manager | Drags cards; enters loss reason; enters "signed offline" reason for manual Won | Signer `envelope.signed` → Conductor → Won | Transition guards (BR-5) | Manual Won "requires an explicit 'signed offline' reason" (§3.5) | R1; two pipelines (Individual, Corporate) R1, more pipelines R2 (AG-2-25) | AG-02 v1.9 §3.4, §3.5; AG-2-18..29a, 52, 53 |
| AG-02 §3.6 | Follow-ups and sequences | Firm (AG) | Manual activities plus automated multi-step cadences in the lead's language, consent re-checked at each send. | Reps; Owner turns sequences on | Rep logs calls, notes, tasks, reminders by hand | Conductor; Mailer, Messenger, Tasker, Reminder, Scheduler | CASL per-recipient check "at the moment of each send" (BR-9) | Speed-to-lead acknowledgement is AUTO as a template message; waits for approval only if AI-written/edited or supervised (AG-2-56) | R1: speed-to-lead on; no-show, going-cold, post-consult "off by default" (AG-2-57); manual enrolment, step editing "stay Release 2" | AG-02 v1.9 §3.6; AG-2-30..35, 56..58 |
| AG-02 §3.7 | Lead score and next-best-action | Firm (AG) | Score driven by eligibility (Qualifier) plus engagement; proposes the "single most valuable next move"; ranked work-queue; going-cold flag after 7 days. | Reps | Rep decides whom to call; acts on suggestion | Qualifier | Pack eligibility; no-guarantee disclaimer (BR-10) | "Scores and recommendations never become promises" (§3.7) | R1 (AG-2-36..39); blended engagement score "fast-follow" (§13 Q4) | AG-02 v1.9 §3.7 |
| AG-02 §3.8 | Lead tasks and work-queue | Firm (AG) | Tasks/reminders on leads, auto-created by sequences and stage changes; overdue flagged. | Reps | Completes tasks | Tasker, Reminder | Firm timezone | No | R1 | AG-02 v1.9 §3.8; AG-2-40 |
| AG-02 §3.9 | Sales dashboard, forecast, multi-currency | Firm (AG) | Funnel, conversion, source/campaign ROI, weighted forecast, all in one reporting currency. | Manager, Owner | Reviews numbers; sets win-probabilities, quotas | Reporter (Inferred) | FX snapshots; never sum raw currencies (BR-16) | No | **Unclear:** §4 has SHALL rows (AG-2-41..43b) but §13 "Parked": "Sales dashboard, forecasting, and multi-currency FX (§3.9)" is "owned by AG-14. Out of shipped scope" | AG-02 v1.9 §3.9; §13 Parked |
| AG-02 §3.10 | Lost, nurture, reopen | Firm (AG) | Lost needs a reason; nurture re-engages and recycles; reopen creates a new opportunity. | Reps | Chooses loss reason; reopens | Conductor (recycle trigger) | Loss-reason picklist | No | R1 | AG-02 v1.9 §3.10; AG-2-44..46 |
| AG-02 §3.11 | Convert lead to client | Firm (AG) | Creates or links the client, moves full history, carries profile forward; corporate convert copies contacts and hands off to "New LMIA file". | Rep, RCIC | Clicks convert; chooses create-new or link-existing; opens case or LMIA file deliberately | Conductor (onboarding playbook) | Carry-forward must not fabricate (AG-2-47a) | "SHALL not auto-create a case" (AG-2-47) | R1 | AG-02 v1.9 §3.11; AG-2-47..47b, 54, 61 |
| AG-02 §3.12 | Call logging (Dialer) | Firm (AG) | Logs calls with outcome and duration; first outbound call satisfies speed-to-lead. | Reps | Rep makes the call and fills the outcome modal | Dialer (new in-house Doer) | Recording "off by default", consent-gated | No | Manual log R1; "Live telephony integration is Phase-2" (AG-2-37a); click-to-call "a disabled affordance pending a provider" (§13) | AG-02 v1.9 §3.12; AG-2-37a |
| AG-02 §3.13 | Lead routing and assignment | Firm (AG) | Assigns new leads by program then round-robin; skips out-of-office; Unassigned queue. | Manager configures; reps receive | Manager triages Unassigned queue; reassigns | — | AssignmentRule; persisted round-robin cursor | No | R1 | AG-02 v1.9 §3.13; AG-2-13a..d |
| AG-02 §3.14 | Data export and personal-data package | Firm (AG) | CSV/XLSX export of filtered leads; per-contact package for access requests (PIPEDA). | Staff with export permission | Runs export; answers access requests | — | Visibility never widened by export | "every export is audited" (§3.14) | R1 (Inferred from SHALL AG-2-49a; no deferral stated) | AG-02 v1.9 §3.14; AG-2-49a |

### From AG-03 v1.4 (Pathway Assessment — Qualifier)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-03 | Eligibility assessment (Qualifier) | Firm (AG) | Scores an applicant's profile against every program in the Country Pack: likely / below cutoff / possibly (missing data) / not eligible, with reasons and improvements. | Intake rep (triggers), RCIC (decides), Manager, Owner; Client sees shared summary | Today (per §1): answer "lives in a senior consultant's head or in a fragile spreadsheet"; in product: rep clicks Assess, fills gaps; RCIC reviews, overrides, shares | Qualifier | Country Pack: programs, gates, grids, levers, cutoff signals, disclaimer | "an RCIC's professional judgement, not an algorithm, is ultimately accountable" (§1) | R1 (Ovw index); several items deferred (see §13 row) | AG-03 v1.4 §1 |
| AG-03 §3.1 | Single profile as input | Firm (AG) | Uses the one client profile; flags missing fields as gaps; derives age, language level. | Rep | Fills missing fields inline ("Tell me exactly what to ask") | — | Pack declares which fields its programs read (AG-3-3) | No | R1 | AG-03 v1.4 §3.1; AG-3-2..4 |
| AG-03 §3.2 | Country Pack (consumer side) | Foundation | Versioned bundle of programs, gates, grids, levers, disclaimer; firms read, never edit. | Super Admin authors; firm reads | None for firm | — | Pack version immutable once published (AG-3-7); conformance tests before publish (BR-18) | Pack values "routed to the Immigration-SME (Ishaan); the founder is the final authority" (§1) | R1 Canada pack; other countries "Phase-2/3"; visual authoring UI "Phase-2" (§13) | AG-03 v1.4 §3.2; AG-3-5..9 |
| AG-03 §3.3–3.4 | Eligibility engine and score calculators | Firm (AG) | Gates first, then score; ranks programs; recommended pathway; CRS, FSW-67, OINP, AAIP, SINP, BCPNP, MPNP as pack rule-sets. | — (engine) | — | Qualifier | "deterministic pure function over (resolved inputs, pack version)" (AG-3-39) | No (engine); human decides use | R1 | AG-03 v1.4 §3.3, §3.4; AG-3-10..20 |
| AG-03 §3.5–3.6 | Breakdown and what-if improvements | Firm (AG) | Per-factor points; quantified levers ("CLB 8→9 = +X") flagged decisive if they change the outcome. | RCIC | RCIC turns levers into talking points and proposal scope | Qualifier | Pack recommendation levers | "framed as indicative levers (never promises)" (AG-3-24) | R1 (may be plan-gated, §11) | AG-03 v1.4 §3.5, §3.6; AG-3-21..24 |
| AG-03 §3.7–3.8 | Version stamping, re-run, staleness | Firm (AG) | Every result stamped with pack version; re-run creates new snapshot; stale flag; firm-wide stale view; diff. | RCIC, Manager | Decides to re-run or keep; enters reason; Manager prompts re-runs | Qualifier | Pack version | "Re-running an assessment SHALL be explicit ... SHALL record the reason" (AG-3-28) | R1; "Proactive auto-re-run on every pack publish (Phase-2)" (§13) | AG-03 v1.4 §3.7, §3.8; AG-3-25..31 |
| AG-03 §3.9 | Disclaimer, consultant override and review | Firm (AG) | Non-dismissible no-guarantee disclaimer; consultant may override an outcome with reason; review/sign-off before sharing. | RCIC (override, review) | Writes override reason; reviews and signs off | — | Disclaimer per locale from pack | "a quality gate so a junior rep's auto-assessment isn't sent out as advice without RCIC sign-off" (§3.9); mandatory or not is open (§13 Q9) | R1 | AG-03 v1.4 §3.9; AG-3-32..35 |
| AG-03 §3.10–3.11 | Result flow-out and client-facing summary | Firm (AG) → Client portal | Feeds lead score, consult prep, proposal, case; plain-language shareable summary in client's language. | RCIC; Client reads | RCIC chooses locale, includes/excludes recommendations, shares | — | Disclaimer + provenance travel with it | "sharing SHALL be audited" (AG-3-38); share blocked if review required (US-9) | R1; client self-serve what-if "Phase-2/3" (§13) | AG-03 v1.4 §3.10, §3.11; AG-3-36..38 |

### From AG-04 v1.5 (Consultation & Booking — Scheduler)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-04 | Consultation booking (Scheduler) | Firm (AG) + public booking page | Turns "I'd like to talk to someone" into a booked, reminded, held consultation, then a consult record that seeds the retainer. | Public booker, Intake rep, RCIC host, Case Manager, Owner, Billing | Today (per §1): booking by email/phone tag; in product: staff book manually for hot leads, mark attended/no-show, write consult notes | Scheduler; Mailer; Messenger; Biller; Drafter; Signer; Conductor | Firm timezone, business hours, holiday calendar from pack; pre-consult agreement wording from pack | No licensed sign-off stated; recommendation "carries the indicative-not-guaranteed disclaimer" (BR-17) | R1 (Ovw index) | AG-04 v1.5 §1 |
| AG-04 §3.1–3.2 | Availability and appointment types | Firm (AG) | Weekly windows, buffers, notice, caps, holidays; types free/paid/follow-up/case review with modes, price, host pool, intake questions. | Owner/Admin configure | Owner sets availability grid, buffers, prices; "preview as a booker" | Scheduler | Holidays "seeded from the firm's one country pack" (AG-4-7) | No | R1; separate slot interval "a Phase-2 nicety" (§3.1) | AG-04 v1.5 §3.1, §3.2; AG-4-1..15 |
| AG-04 §3.3–3.5 | Public booking page and slot safety | Client-facing (public) | Branded, per-language, embeddable page; slots in visitor timezone; no double booking (row lock). | Public booker | Booker picks slot, answers intake, accepts consent and pre-consult agreement | Scheduler | Consent per locale (CASL, Law 25) | No | R1 | AG-04 v1.5 §3.3, §3.5; AG-4-16..27 |
| AG-04 §3.4 | Booker becomes a lead | Firm (AG) | New booker creates a lead `source=BOOKING`, deduped and routed by AG-2. | — (automatic) | None | Conductor speed-to-lead | AG-2 AssignmentRule | No | R1 | AG-04 v1.5 §3.4; AG-4-22..24 |
| AG-04 §3.6 | Video links | Firm (AG) | In-house room by default, firm's own Zoom/Meet/Teams if connected, manual paste fallback. | Host | Host may paste a link | Scheduler | — | No | R1; "Full in-house WebRTC video (Phase-2/3)" (§13) | AG-04 v1.5 §3.6; AG-4-28..30 |
| AG-04 §3.7 | Confirmations and reminders | Firm (AG) → client | ICS invite, reminders 24h/1h, follow-up, cancellation, in booker's language. | Owner configures | Owner edits reminder templates | Mailer, Messenger | Templates per locale | No | R1 email + ICS; "Live SMS / WhatsApp reminders (Phase-2)" (§13) | AG-04 v1.5 §3.7; AG-4-31..35 |
| AG-04 §3.8 | Reschedule, cancel, no-show | Firm (AG) + public | Token links for self-service; staff mark completed/no-show; auto no-show after grace triggers AG-2 recovery. | Booker; staff | Staff marks Completed or No-show; may override notice (audited) | Conductor (`appointment.no_show` → recovery) | Notice windows | No | R1 | AG-04 v1.5 §3.8; AG-4-36..39 |
| AG-04 §3.9 | Sync with firm's own calendar | Firm (AG) | Optional Google/Outlook free/busy and event push. | Host, Owner/Admin | Connects account via OAuth | Scheduler | — | No | R1 (first provider open, §13 Q6) | AG-04 v1.5 §3.9; AG-4-40..43 |
| AG-04 §3.10 | Paid consultations | Firm (AG) | Holds slot as pending payment; pays via Biller; expiry; refund per policy. | Booker; Billing | Billing handles refunds per policy | Biller | Refund policy (open, §13 Q7) | No | R1 | AG-04 v1.5 §3.10; AG-4-44..46 |
| AG-04 §3.11 | Booking events | Cross-cutting | Emits scheduled, rescheduled, cancelled, no-show, completed to the Conductor. | — | — | Conductor | Idempotent consumers | No | R1 | AG-04 v1.5 §3.11; AG-4-47, 48 |
| AG-04 §3.12 | Consult record → proposal | Firm (AG) | After the consult, host records attendance, notes, recommended pathway/services, quoted fee, next step; one click to Drafter. | RCIC host | Host writes consult notes, recommendation, fee | Drafter → Signer | Assessment pre-fill from AG-3 | Recommendation shows disclaimer and provenance (§3.12) | R1 | AG-04 v1.5 §3.12; AG-4-49, 50 |
| AG-04 §3.13 | Host assignment and staff leaving | Firm (AG) | Round-robin / any-available host; deactivated host removed everywhere. | Admin | Admin moves or cancels a leaver's consults in the handover | Scheduler | Capacity caps | No | R1 | AG-04 v1.5 §3.13; AG-4-51, 53..55 |
| AG-04 §3.14 | Booking analytics | Firm (AG) | Show-rate, no-show rate, volume, paid revenue, by type and source. | Case Manager, Owner | Reviews numbers | Reporter (Inferred) | AG-6 FX | No | R1 (Inferred; no deferral stated except materialised tables "Phase-2") | AG-04 v1.5 §3.14; AG-4-52 |

### From AG-05 v1.9 (Retainer & Agreements — Drafter + Signer)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-05 | Retainer agreement and e-signature | Firm (AG) + client signing page | Generates the retainer from a template with required clauses and bound fee/scope, gets client signature and firm countersignature, seals it, stores it, and signals Won and billing. | RCIC ("protagonist"), Sales rep, Case Manager, Owner, Billing; Client signs | Today (per §1): "a consultant copy-pasting last client's Word retainer, hand-editing the name, the fee, the scope"; "chasing wet-ink signatures" | Drafter; Signer; Conductor; Biller | Pack required clause set, legal recital, retention horizon | Countersign by holder of `agent/retainer:countersign` (Owner, Case Manager default) (AG-5-27) | R1 (Ovw index); several deferrals (see rows) | AG-05 v1.9 §1 |
| AG-05 §3.1–3.3 | Draft the retainer (template, clauses, merge fields, language) | Firm (AG) | Picks template by matter and language; locks pack-required clauses; fills names, licence number, fee, scope from the live record; renders in client's language. | RCIC, Sales | RCIC picks template and optional clauses; fixes missing source data (e.g. licence number) | Drafter | Required clause set "Canada: scope of services, fees & billing, refund policy, dispute resolution, confidentiality, termination" (AG-5-5) | Blocks send on missing required clause or empty required field (AG-5-6, AG-5-9) | R1; other countries' clause sets "Release 2 or later" (§13) | AG-05 v1.9 §3.1–3.3; AG-5-4..14 |
| AG-05 §3.4 | Consultant review before send | Firm (AG) | Draft review: edit permitted text, toggle optional clauses, re-render, approve for send. | RCIC | Reads full PDF; edits scope text; approves | Drafter | Locked clauses non-editable | "the act of approving is the consultant taking professional responsibility for the agreement's content" (§3.4) | R1 | AG-05 v1.9 §3.4; AG-5-15..17 |
| AG-05 §3.5–3.7 | Send, sign, countersign | Firm (AG) + client | Recipients with single-use links, consent recital, field placement; client signs first, firm countersigns; request shown to all countersign holders. | Client; countersign holders | Client signs; firm holder countersigns ("one-click countersign") | Signer | Consent recital per country/locale from pack | "Staff SHALL never sign on a client's behalf" (AG-5-39) | R1; witness/multi-party beyond client+firm "Release 2 or later" (§13) | AG-05 v1.9 §3.5–3.7; AG-5-18..27, 50, 53 |
| AG-05 §3.8–3.9 | Tamper-evidence and certificate | Firm (AG) | SHA-256 hashes of original and executed PDF; append-only audit; certificate of completion emailed to signers. | — | — | Signer; Mailer | Legal recital per pack/locale | No | R1 | AG-05 v1.9 §3.8, §3.9; AG-5-28..31 |
| AG-05 §3.10 | Expiry, reminders, void, re-issue | Firm (AG) | 14-day expiry, reminders to outstanding signers, void with reason, re-issue as new envelope; stuck-retainer flag. | Sales, RCIC, Case Manager | Sends reminders; voids with reason; re-issues | Signer; Reminder (Inferred) | Firm timezone, business hours | Void needs "mandatory reason" (AG-5-34) | R1 | AG-05 v1.9 §3.10; AG-5-32..36 |
| AG-05 §3.11 | Signature drives Won and billing | Cross-cutting | `envelope.signed` moves prospect to Won and tells Biller to invoice; offline wet-ink path. | Staff (offline path) | Uploads paper signature, marks "signed offline" with reason | Conductor; Biller | Idempotent consumers | Offline path "permission-gated, reason-required" (AG-5-39) | R1 | AG-05 v1.9 §3.11; AG-5-37..39 |
| AG-05 §3.12 | Storage and retention | Firm (AG) | Executed files in firm's own storage, presigned access, retention horizon from pack. | Owner | Handles access requests | — | Retention period "a pack/Immigration-SME value" | Deletion before horizon blocked (AG-5-43) | R1; PDF/A archival "fast-follow" (§13) | AG-05 v1.9 §3.12; AG-5-41..44 |
| AG-05 §3.13 + AG-5-51 | Hand-offs and unsigned-retainer warning | Firm (AG) | From consult (fee, scope) to Biller on execution; unsigned retainer is a CRITICAL warning on the case, not a block. | RCIC; holder of waive permission | Passes the warning at submission with a reason | Biller | — | "passed at submission by a user holding `agent/case:waive-deficiency` who gives a reason" (AG-5-51) | R1 | AG-05 v1.9 §3.13; AG-5-40, 51, 52 |

### From AG-06 v1.7 (Billing & Payments — Biller)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-06 | Client billing and payments (Biller) | Firm (AG) + client portal | Issues invoices, schedules instalments, collects online and offline payments, reconciles, chases overdue, reports billed/collected/outstanding. | Billing/Finance ("heaviest user"), RCIC/Case Officer, Case Manager, Owner, Client | Today (per §1): work "done but never invoiced", invoices "never chased", payments "never reconciled to the right client"; in product: record cheques/e-transfers, build invoices, send manual reminders | Biller; Mailer; Messenger; Conductor | Tax profiles per region from Country Pack; FX snapshots | Separation of duties: "Issuing an invoice, recording a payment, and refunding are distinct permissions" (BR-11) | R1 (Ovw index); refunds, trust accounting, SMS/WhatsApp dunning deferred (§13) | AG-06 v1.7 §1 |
| AG-06 §3.1 | Invoices (lines, tax, numbering, statuses) | Firm (AG) | Typed lines (service fee, disbursement, government fee, milestone draw, time-based, discount); tax per region frozen at issue; per-office numbering assigned at issue. | Billing; RCIC (bill from case) | Assembles invoice; pulls milestone/time/expense; issues and sends | Biller; Mailer (invoice + pay link) | TaxProfile per region "resolved from its Country Pack" | Issued invoice immutable; corrections via credit/refund (BR-2) | R1 | AG-06 v1.7 §3.1; AG-6-1..8 |
| AG-06 §3.2 | Payment plans, overdue, dunning | Firm (AG) | Instalments (draw or single-invoice mode); Conductor sweep marks overdue; dunning sequence in client's language; collections queue. | Billing | Works the collections queue; sends one-click manual reminders | Conductor sweep; Mailer/Messenger | Dunning is "transactional" (no marketing consent needed) | No | R1; "Live SMS / WhatsApp dunning (Phase-2)"; default mode open (§13 Q3) | AG-06 v1.7 §3.2; AG-6-9..13 |
| AG-06 §3.3 | Online payments on the firm's own processor | Firm (AG) + client portal | PaymentIntent on firm's own Stripe Connect account in invoice currency; signed, idempotent webhooks mark paid. | Client pays; Owner connects payout account | Owner connects payout account (Owner-only) | Biller | — | "The platform never holds client money" (§3.3) | R1 (processor choice open, §13 Q1) | AG-06 v1.7 §3.3; AG-6-14..18 |
| AG-06 §3.4 | Offline payments, receipts, refunds | Firm (AG) | Staff record bank transfer, cheque, cash, e-transfer; partial payments; numbered receipts; refunds as reversing facts. | Billing | Types payment amount, method, reference, date; records "on the client's behalf" | Biller | No overpayment (BR-7) | Refund needs "a separate higher permission" and "mandatory reason" (AG-6-23) | R1; refunds "Phase-2" (AG-6-23) | AG-06 v1.7 §3.4; AG-6-19..23, 43 |
| AG-06 §3.5 | Trust-adjacent records | Firm (AG) | Records and tags funds nature; exports for the firm's trust accountant; explicitly not a trust ledger. | Billing, Owner | Firm's bookkeeper does trust accounting outside the product | — | — | "SHALL NOT present itself as a regulator-compliant trust-accounting ledger" (AG-6-24) | R1 tag/export; trust accounting "Phase-2/3" | AG-06 v1.7 §3.5; AG-6-24 |
| AG-06 §3.6–3.7 | Multi-currency and financial reports | Firm (AG) | Invoice currency, firm reporting currency, FX snapshots; per-client money tab and firm-wide financials, aged receivables. | Billing, Case Manager, Owner | Reviews reports; exports for bookkeeper | Reporter (Inferred) | "never sums or compares raw amounts across differing currencies" (BR-8) | No | R1; external FX provider "Phase-2"; advanced analytics "Phase-3" | AG-06 v1.7 §3.6, §3.7; AG-6-25..31 |
| AG-06 §3.8 | Hand-offs (signature → invoice; case government fees; Bill to) | Cross-cutting | `envelope.signed` cuts deposit invoice or activates plan; government fee line from case; invoice to case's Bill to party; no invoice on unsigned retainer. | Billing, RCIC | RCIC records government fee as paid, clicks to invoice it | Conductor; Biller | — | "AG-06 SHALL refuse to raise an invoice against a case whose retainer is neither executed nor signed offline" (AG-6-42) | R1 | AG-06 v1.7 §3.8; AG-6-32..35, 40..42 |

### From AG-07 v2.7 (Case Core & Delivery)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-07 | Case core and delivery | Firm (AG) | Where a retained client becomes a delivered application: case set-up from the pack, documents, forms, readiness, submission record, government steps, decision, after-decision work. Shared by individual and corporate cases. | Case Officer ("heaviest user"), RCIC/lead, Case Manager, Reviewer, Owner, Billing; Client via portal | Per §1, failures today: "a missing translation, an expired police certificate, a form filled with last year's edition, a biometrics deadline that slipped" | Binder; Filler; Reviewer; Checker; Minder; Reader; Mailer/Messenger; Signer; Conductor | Country Pack: checklist, form editions + field maps, government steps, deficiency library, decision vocabulary, fee table | "the licensed professional whose licence backs the file (owns correctness, the review sign-off, and the submission)" (§3.8) | R1 (Ovw index); release of Filler, Deficiency Library, four-eyes, filings, board "open" (§13 item 22) | AG-07 v2.7 §1 |
| AG-07 §3.1 | Clients (list, Add client, client screen) | Firm (AG) | One client record per person or employer; list, add (with duplicate check), one screen with panels by client type. | Intake, Case Officer | Types new client; resolves duplicate prompts; edits details | — (reads AG-02, AG-06, AG-15, AG-09, AG-13) | Duplicate check from AG-02 | "creating a second record SHALL need an explicit 'create anyway', which is audited" (AG-7-73) | R1 (Inferred; AG7-D1 no deferral) | AG-07 v2.7 §3.1; AG-7-69..90 |
| AG-07 §3.2 | Case creation | Firm (AG) | Deliberate creation from convert, direct, or import; pack version pinned; checklist, forms, questionnaire and steps assembled; prospect documents reused. | Case Officer, RCIC | Picks program path; confirms what will be assembled | Conductor `case.created` (onboarding playbook); AG-18 import | Pack version pinned per case (AG-7-56) | "Case creation SHALL not be an automatic side-effect of conversion" (AG-7-2) | R1 | AG-07 v2.7 §3.2; AG-7-1..8, 56, 63 |
| AG-07 §3.3 | Lifecycle, steps and board | Firm (AG) | Platform delivery steps before submission, pack government steps after; Decision → After decision → Closed; board position computed. | Case Officer, Case Manager | Stamps government-step dates (AOR, biometrics, ADR); forward manual placement; withdraws, closes with reason | Minder (step deadlines); Conductor `case.stage_changed` | Government steps "pack data" | Submitted and later steps "reached only by recording the event" (AG-7-12) | R1; manual placement, filings, board possibly R2 (§13 item 22, author's recommendation) | AG-07 v2.7 §3.3; AG-7-9..14, 45..50 |
| AG-07 §3.4 | Documents checklist (Binder) | Firm (AG) + portal | Pack checklist per program; request from client; client upload lands on the item; review approve/reject/not applicable; translation/notarisation; reuse across cases. | Case Officer | Requests documents; reviews each upload; approves or rejects with reason; marks not applicable with reason | Binder; Minder (chase); Conductor (document-request playbook); Reader (Inferred via AG-09) | Translation/notarisation needs "a pack value (SME-owned)" | Reject and not-applicable need a reason (AG-7-17, AG-7-16) | R1 | AG-07 v2.7 §3.4; AG-7-15..20 |
| AG-07 §3.5 | Government form preparation (Filler) | Firm (AG) | Loads current edition, auto-fills from verified profile/questionnaire, flags unmapped fields, consultant reviews/overrides/approves, generates fillable then flattened form. | Case Officer (prepares), approver with `form-approve` | Reviews every mapped field; overrides; approves; re-binds out-of-date editions | Filler; Needs you | Form library editions and field maps from pack (SME content) | "A government form SHALL carry the autonomy level APPROVE as a hard floor" (AG-7-59); four-eyes when Team safeguards on (AG-7-65) | R1 engine + key forms; "Full Filler field-mapping coverage ... Release 2" (§13 deferrals); release still open (§13 item 22) | AG-07 v2.7 §3.5; AG-7-21..24, 59, 60, 65..68 |
| AG-07 §3.6 | Deficiencies and readiness (Reviewer, Deficiency Library, Checker) | Firm (AG) | Continuously computes what is missing; severities; readiness state and score; CRITICAL warnings passed with reason; internal review rounds; Checker cross-checks names, dates, numbers. | Case Officer, Reviewer, RCIC | Raises/resolves deficiencies; reviewer approves/rejects review rounds; passes CRITICAL warnings with reason | Reviewer; Checker (AI); Conductor `deficiency.detected` | Deficiency Library per pack; severities pack-set | "passing one takes a recorded reason" (§3.6); review sign-off `agent/case:review-approve` | R1 (release open, §13 item 22); Checker gated by AI switch | AG-07 v2.7 §3.6; AG-7-25..30, 61, 62; BR-30 |
| AG-07 §3.7 | Submission and decision tracking | Firm (AG) | RCIC records the submission (the product never submits); government milestones; decision; after-decision items; withdraw; correct a decision. | RCIC (submit), Case Officer (milestones) | Submits to the authority outside the product, then records submission, file number, UCI; records AOR etc.; records decision | Minder; Conductor (post-decision playbooks); portal notify | Milestone and decision vocabulary from pack | "Recording a submission ... SHALL require `agent/case:submit` (NEW, distinct authority)" (AG-7-31); "ExpatReady never submits a form to an authority itself" (§3.5) | R1 | AG-07 v2.7 §3.7; AG-7-31..34, 49, 50, 58 |
| AG-07 §3.8 | Case team and assignment | Firm (AG) | Lead representative (licensed only), case officer, reviewer; manual assignment; Unassigned queue; SLA. | Case Manager | Assigns and reassigns cases; handover on staff leaving | Notification | SLA lead time pack value (SME) | Lead representative: "a licensed user only" (AG-7-35) | R1 manual; rule-based routing "Release 2" (AG-7-92) | AG-07 v2.7 §3.8; AG-7-35, 36, 42..44, 91, 92 |
| AG-07 §3.9 | Case screen, timeline and hand-offs | Firm (AG) | Command centre for one file; typed timeline; continuous portal hand-off; Doers on case events. | Case Officer | Writes notes, tasks, requests, messages | Filler, Binder, Reviewer, Minder, Mailer/Messenger, Signer, Conductor | — | No | R1 | AG-07 v2.7 §3.9; AG-7-37..41 |
| AG-07 §3.10 | Government fees, Bill to, linked cases | Firm (AG) | Fee section from pack table; one-click invoice line; Bill to party; links between cases; shareable document copies; "Create work permit case". | Case Officer, Billing | Records fee as paid; accepts offered document versions | Biller (AG-06) | Pack fee table; shareable flag in SA-01B | New versions "never pushed automatically" (AG-7-54) | R1 | AG-07 v2.7 §3.10; AG-7-51..55, 57 |

### From AG-08 v1.7 (Smart Questionnaire — SQR)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-08 | Client intake questionnaire | Firm (AG) + client portal | Asks the applicant the right questions in their language, maps each answer into one profile that feeds eligibility and government forms, and tracks which facts are verified. | Client (fills), Case Officer ("heaviest firm user"), RCIC, Owner/Admin (builder), intake staff | Today (per §1): facts "typed into a CRM, then re-typed into a case intake sheet, then re-typed ... into IRCC/government PDF forms"; staff "emailing clients 'please also send…'" | Conductor; Mailer; Messenger; Reader; Checker | Pack default questionnaires per pathway; profile bindings | Verification by a person with `agent/sqr:verify` (AG-8-26) | R1 (Ovw index); §13 Q1–Q5 "Proposed: locked" for R1 | AG-08 v1.7 §1 |
| AG-08 §3.1–3.3 | Questionnaire builder, branching, pack templates | Firm (AG) | Config-driven sections/questions/validation/bindings; show/require rules; inherit pack default or clone and customise; upstream-change notice. | Owner/Admin | Admin clones pack default, adds questions, reorders, translates, publishes | — | Pack default questionnaires; rule engine (client + server) | No | R1; "Visual/advanced conditional-logic builder (Release 2 or later)"; pack-merge tooling R2 (§13) | AG-08 v1.7 §3.1–3.3; AG-8-1..11 |
| AG-08 §3.4 | Assign questionnaire to client | Firm (AG) | Pins version, locale, due date, document items; secure expiring link; invitation by email or WhatsApp; linked assignments for spouse/dependants. | Intake staff, Case Officer | One-click assign; re-send, extend, regenerate link | Conductor; Mailer; Messenger (WhatsApp) | Consent per recipient, quiet state, rate caps (AG-8-47) | No | R1 (WhatsApp R1; SMS R2 — AG-8-47) | AG-08 v1.7 §3.4; AG-8-12..14, 47 |
| AG-08 §3.5 | Client fill wizard | Client portal | Step-by-step, autosave, progress, live branching, inline uploads, review, submit; bilingual, WCAG 2.1 AA. | Client | Client types answers and uploads | — | Server-side validation of every answer (AG-8-17) | No | R1 | AG-08 v1.7 §3.5; AG-8-15..17 |
| AG-08 §3.6 | Inline document requests | Client portal + Firm | Upload next to the question it evidences; status, reject with reason, reuse; Reader proposes values from identity documents. | Client; Case Officer | Officer rejects blurry scans with reason; adds custom requests | Reader (AI) | Document types per pack | Reader values reach the profile "only when a person approves in the Reader's review view" (§3.6) | R1 | AG-08 v1.7 §3.6; AG-8-18..20, 41 |
| AG-08 §3.7 | Single-source mapping | Firm (AG) | Writes each visible, bound answer into the person's or organisation's profile; flags conflicts with verified values; organisation answers confirmed on next file. | Case Officer (conflicts) | Resolves conflicts between typed and verified values | Mapping engine; emits `sqr.profile_updated` | Typed catalogue of profile paths | "Verified beats unverified by default; staff decide" (§3.7) | R1 ("Proposed: locked", §13 Q1) | AG-08 v1.7 §3.7; AG-8-21..24, 38, 39 |
| AG-08 §3.8 | Provenance and verification | Firm (AG) | Each fact tagged self-declared / staff / staff on behalf / verified / Reader-approved / imported; verify against a document; must-verify facts raise CRITICAL warning at filing; Checker flags mismatches. | Case Officer, RCIC | Works the "needs-evidence" worklist; verifies facts against documents; verifies imported values | Checker (AI); Reader (AI) | Must-verify flags set in pack | "The Reader and Checker never verify on their own; a person always does" (§3.8) | R1 | AG-08 v1.7 §3.8; AG-8-25..27, 42..46 |
| AG-08 §3.9 | Family / multi-applicant | Firm (AG) + portal | Family declared once; linked child assignments; contradictions flagged. | Client; Case Officer | Officer resolves contradictions | — | Dependant-eligibility rules (SME) | No | R1 | AG-08 v1.7 §3.9; AG-8-28..30 |
| AG-08 §3.10–3.12 | Versioning, review/lock/re-open, completeness | Firm (AG) | Immutable versions pinned per case; submit locks; targeted request-changes; completeness over live branching; `sqr.submitted` advances case. | Case Officer | Reviews submitted answers; requests targeted changes with a note | Conductor (`sqr.submitted` → re-score, advance case, notify; reminders) | — | No | R1 | AG-08 v1.7 §3.10–3.12; AG-8-31..33 |

### From AG-09 v1.8 (Document Management)

| ID | Plain name | Plane | What it does | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines | Human judgement or licensed sign-off required? (quote) | Release | Citation |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-09 | Document management (shared subsystem) | Cross-cutting (Firm + portal) | One secure home for every file on a prospect, client or case: request, upload, scan, verify, version, reuse, sign, retain, dispose; Reader reads key documents. | Case Officer ("protagonist"), Intake, RCIC, Case Manager, Owner, Billing; Client via portal | Today (per §1): "chasing clients for documents over email", "handling the wrong or stale version", passports "sitting in inboxes and shared drives" | Reader (AI); Drafter; Signer; Mailer; Messenger; Reminder; Minder; Conductor | Pack document types, translation/notarisation defaults, retention windows | Document "Verified" status "stays the officer's own act" (§3.9) | R1 (Ovw index); bulk export and retention policy "Release 2" (Phs v1.4 R2 row) | AG-09 v1.8 §1 |
| AG-09 §3.1 | Upload (drag-drop, bulk, mobile camera) | Firm + portal | Direct-to-storage signed upload; type/size checked; every upload a new version; bulk mapper suggests checklist item. | Case Officer; Client | Officer drops files, confirms bulk mapping and type | Reader (type suggestion) | Allowed types/sizes | No | R1 | AG-09 v1.8 §3.1; AG-9-1..5 |
| AG-09 §3.2 | Request documents from client | Firm + portal | Sets items Requested with due date; portal list; localized email/WhatsApp request; reminders; bulk request; re-request on reject. | Case Officer | Selects items, sets due dates, sends request; re-requests | Mailer; Messenger; Reminder; Conductor | Reminders respect consent, quiet hours, quiet state (AG-9-8) | No | R1 (WhatsApp reminders R1; SMS R2, §13) | AG-09 v1.8 §3.2; AG-9-6..10 |
| AG-09 §3.3–3.4 | Document types, tags, versions | Firm (AG) | Pack-driven types with expiry, translation, notarisation defaults, bilingual names; new version supersedes and resets to Received. | Case Officer | Picks or confirms type; tags | Reader (classification) | Pack taxonomy | Re-verification required on new version (AG-9-15) | R1 | AG-09 v1.8 §3.3, §3.4; AG-9-11..15 |
| AG-09 §3.5–3.6 | Secure storage, virus scan, quarantine | Foundation | Signed short-lived URLs, firm-prefixed keys, encryption at rest; async scan; infected files never served. | — | None (automatic) | — (queue jobs) | — | No | R1 | AG-09 v1.8 §3.5, §3.6; AG-9-16..21 |
| AG-09 §3.7 | Generate from template and send for signature | Firm (AG) | Drafter merges data into templates and files the result; Signer signs; signed copy filed separately. | RCIC, Case Officer | Picks template; sends for signature | Drafter; Signer | Templates (AG-12) | No | R1 | AG-09 v1.8 §3.7; AG-9-22, 23 |
| AG-09 §3.8–3.9 | Preview, annotate, status, translation/notarisation | Firm (AG) | In-app preview (access-audited); annotations as a layer; one status per document; reject/waive/N-A need reasons; translation and notarisation flags; expiry. | Case Officer | Previews; verifies; rejects with reason; waives/N-A with reason; annotates "please re-take" | — | Type metadata | Verify "allowed only from Received (i.e. scanned clean)" (BR-6) | R1; "Advanced annotation (page-region drawing, redaction) (Phase-2)" | AG-09 v1.8 §3.8, §3.9; AG-9-24..29 |
| AG-09 §3.10 | Reuse across cases | Firm (AG) | Same-client link (one record, many cases); shareable copy across a case link; offer valid employer documents from earlier file. | Case Officer, case owner | Links documents; accepts offered new versions; confirms earlier-file offers | — | Shareable flag per type (SA-01B) | New versions "never push" (AG-9-37) | R1 | AG-09 v1.8 §3.10; AG-9-30, 36, 37, 39 |
| AG-09 §3.11 | Content hash and access audit | Cross-cutting | SHA-256 per version (dedup, tamper flag); every read logged. | Owner, Case Manager | Reviews access history | — | — | No | R1 | AG-09 v1.8 §3.11; AG-9-31, 32 |
| AG-09 §3.12 | Retention and disposal | Firm (AG) | Retention clock per pack/firm; disposal queue; legal hold; disposal record; candidate data only with the whole file. | Owner (dispose) | Owner reviews disposal queue; places legal holds | — (scheduled job) | Retention windows per pack (SME + legal) | `agent/document:dispose` "Held by the Owner by default" (§10) | **Unclear:** AG-9-33/34 SHALL, but Phs v1.4 R2 lists "AG-9 bulk export + retention policy" | AG-09 v1.8 §3.12; AG-9-33, 34, 38 |
| AG-09 §3.13 | Checklist interface | Cross-cutting | AG-7 declares required items; AG-9 reports status and provides current verified file. | — | — | Conductor `DOCUMENT_CHECKLIST` trigger | — | No | R1 | AG-09 v1.8 §3.13; AG-9-35 |
| AG-09 §3.14 | Reader: classify and extract | Firm (AG) | Proposes document type; extracts values from identity documents (MRZ), IRCC letters (deadlines), language results, ECA reports; deadline dates registered with Minder only after approval. | Case Officer / verifier | Approves, edits or rejects each proposal in the review view; approves letter deadlines | Reader (AI); Minder; Conductor `document.extracted` | Document types and fields per pack (SME) | "approval IS the verification ... the approver therefore SHALL also hold `agent/sqr:verify`" (AG-9-45) | R1, built but off until AI terms recorded (AG11-D13) | AG-09 v1.8 §3.14; AG-9-42..52 |


## Part 2: Doers and engines seen in this slice

### From 00-Overview v1.11 and 99-Phasing v1.4 (Glossary)

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Conductor | "A firm-configurable automation rule (triggers + conditions + ordered actions). The engine/orchestrator — not a Doer." R1 = "minimal Conductor (triggers, conditions, Doer dispatch, idempotency, retry/dead-letter, guardrails including the CASL gate and rate caps, run history, dry-run)" | Trigger events → dispatched Doer actions | Deterministic (rules) | Phs v1.4 Glossary "Conductor"; Phasing R1 row |
| Reminder | "client nudges — 'speaks'" | — | Non-AI, "follow fixed rules" | Phs v1.4 Glossary "Doer" |
| Minder | "deadlines and dates — 'thinks': remembers the dates that matter and reminds the file owner"; R1 core "standard deadlines registered directly by any module, always on, no firm set-up" | Key dates → reminders, escalation, at-risk marks | Non-AI | Phs v1.4 Glossary "Doer"; Phasing R1 row |
| Tasker | "internal tasks — 'does'" | — | Non-AI | Phs v1.4 Glossary "Doer" |
| Messenger | "omni-channel comms"; "SMS/chat, replaces Twilio/WhatsApp" | — | Non-AI | Phs v1.4 Glossary; Ovw v1.11 In-House |
| Signer | "e-sign, replaces DocuSign" | — | Non-AI | Ovw v1.11 In-House |
| Mailer | "email, replaces Outlook/Mailchimp" | — | Non-AI | Ovw v1.11 In-House |
| Scheduler | "booking, replaces Calendly" | — | Non-AI | Ovw v1.11 In-House |
| Biller | "invoicing, replaces QuickBooks"; "invoicing/trust" | — | Non-AI | Ovw v1.11; Phs v1.4 Glossary |
| Binder | "documents" | — | Non-AI | Phs v1.4 Glossary "Doer" |
| Reporter | "analytics" | — | Non-AI | Phs v1.4 Glossary "Doer" |
| Qualifier | Listed among "the immigration-only Doers (Qualifier, Filler, Binder, Reviewer)" | — | Non-AI (Inferred from "Non-AI Doers" list omission; Qualifier is not in the glossary's two lists) | Ovw v1.11 In-House |
| Filler | "fills government forms from the client's verified profile (correct edition, no re-keying). A form it prepares on its own has no preparer; a human approves every form" | Verified profile → draft government form | Non-AI | Phs v1.4 Glossary "Filler" |
| Reviewer | "continuously computes what is missing on a case and puts every CRITICAL warning in front of the RCIC before submission. It follows fixed rules and is not an AI Doer" | Case data → deficiency list / warnings | Deterministic | Phs v1.4 Glossary "Reviewer" |
| Reader (AI) | "extracts data from an uploaded document into proposed profile values with provenance and confidence, and classifies the document type" | Document → proposed values + doc type | AI, proposal only | Phs v1.4 Glossary "Reader" |
| Sorter (AI) | "classifies inbound email, portal and WhatsApp messages, matches them to the right file ... Low confidence goes to the Unmatched inbox and Needs you" | Inbound message → filed to record / unmatched | AI, proposal | Phs v1.4 Glossary "Sorter" |
| Drafter (AI) | "writes a draft message or document for a person to review; the AI-assist drafter of AG-10, callable by any recipe. Never promises an outcome" | Context → draft text | AI, needs approval | Phs v1.4 Glossary "Drafter" |
| Checker (AI) | "cross-checks names, dates of birth, document numbers and dates across documents, profile and forms; findings appear as warnings in the Deficiency Library — never a lock" | Docs/profile/forms → warnings | AI | Phs v1.4 Glossary "Checker" |

### From AG-01 v1.16

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Mailer | Sends "single-use, expiring set-password invite via Mailer" and onboarding nudges | Invite → email | Deterministic | AG-01 v1.16 AG-1-10, AG-1-39 |
| Notification/Reminder Doers | "Incomplete-onboarding Notifications/reminders (Mailer + in-app, via the Notification/Reminder Doers) re-engage a firm that stalled mid-setup" | Stalled onboarding state → nudge | Deterministic | AG-01 v1.16 §3.6 |
| Automations (AG-11) | "automations SHALL never assign work to, or notify, a deactivated user — a task an automation would have given them SHALL be created unassigned" | Deactivated user → unassigned task | Deterministic | AG-01 v1.16 AG-1-47 |
| Onboarding "next step" engine | "The checklist computes the single most valuable next step and highlights it" | Task states → highlighted next task | Deterministic (Inferred: ordered list, no AI mentioned) | AG-01 v1.16 §3.6 |

### From AG-02 v1.9

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Conductor | Runs speed-to-lead on `prospect.created`; consumes `envelope.signed` to move lead to Won; executes sequence steps; events "at-least-once" with "idempotent" consumers | Events → Doer actions | Deterministic | AG-02 v1.9 §3.5, §3.6; AG-2-28b, 32, 56 |
| Qualifier | Scores a lead "across the destination country's programs ... returning eligible/borderline/ineligible with a ranked recommendation"; drives lead score | Profile → program scores + provenance | Deterministic rules from pack (Inferred) | AG-02 v1.9 §3.7 |
| Dialer | "a new in-house Doer that makes calls a first-class, logged activity"; "abstracts the provider" | Call → `Call` record, SLA credit | Deterministic; outcome typed by a person | AG-02 v1.9 §3.12 |
| Sorter (AI) | Files inbound WhatsApp from a known number on the lead timeline; AI-only matches go to Unmatched inbox | Message → filed / unmatched | AI with deterministic-signal rule | AG-02 v1.9 AG-2-60 |
| Mailer / Messenger / Tasker / Reminder / Scheduler | Sequence step executors: "Mailer for email, Messenger for SMS/WhatsApp, Tasker for the rep's call tasks, Reminder for nudges, Scheduler for booking links" | Step → message/task | Deterministic | AG-02 v1.9 §3.6 |
| Drafter + Signer | "proposal/retainer" from lead detail | Lead data → retainer draft / envelope | Drafter AI; Signer deterministic | AG-02 v1.9 §3.3 |
| Biller | "invoice" action from lead detail | — | Deterministic | AG-02 v1.9 §3.3 |
| AssignmentRule engine | Routes leads "explicit / round-robin / by-program / by-source" | New lead → owner | Deterministic | AG-02 v1.9 BR-11 |
| Next-Best-Action | "derived from the lead's stage + assessment + activity + sequence state" | Lead state → suggested next move | Rule-derived (no AI named) | AG-02 v1.9 §3.7; AG-2-37 |

### From AG-03 v1.4

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Qualifier | "the in-house Qualifier that, given an applicant's profile, evaluates them against every immigration program and stream in the firm's one destination country" | Profile + active pack version → four-state outcome per program, score, breakdown, recommendations, provenance | Deterministic: "Same inputs + same pack version = same outputs, always" (§3.3) | AG-03 v1.4 §1, §3.3, AG-3-39 |
| Pack conformance tests | "a published pack must reproduce known reference profiles' scores, so a data-entry error in a grid is caught before publish" | Pack draft + fixtures → pass/fail | Deterministic | AG-03 v1.4 §3.4, BR-18 |

### From AG-04 v1.5

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Scheduler | "the firm's in-house consultation scheduler — the Doer that turns 'I'd like to talk to someone' into a booked, confirmed, reminded, and ultimately held consultation" | Type + availability + request → booking, slots, ICS, events | Deterministic | AG-04 v1.5 §1 |
| Mailer / Messenger | Send confirmations/reminders: "Sends go through the Mailer (email) and Messenger (SMS/WhatsApp) Doers" | Reminder rule + template → message | Deterministic | AG-04 v1.5 §3.7 |
| Biller | Paid consult checkout and refund: "The booker is routed to the Biller (AG-6) to pay" | Booking → payment / refund | Deterministic | AG-04 v1.5 §3.10 |
| Drafter → Signer | One click ("Create proposal from consult") "launches the Drafter pre-filled with the recommended services + fee, which the Signer sends for e-signature" | Consult record → proposal draft → envelope | Drafter: unclear if AI here (AG-04 does not say); Signer deterministic | AG-04 v1.5 §3.12 |
| Conductor | Consumes `appointment.*` events; drives AG-2 stage, no-show recovery, AG-6 reconciliation | Events → downstream actions | Deterministic | AG-04 v1.5 §3.11 |
| Auto-no-show timer | "an auto-no-show fires after a configurable grace period past start if not marked Completed" | Time → NO_SHOW | Deterministic | AG-04 v1.5 §3.8 |

### From AG-05 v1.9

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Drafter (as specified in AG-05) | "produces a complete, clause-correct, merge-bound, bilingual agreement in seconds from a template" | Template + pack clauses + live record → DRAFT PDF | Deterministic template merge in AG-05 (no AI mentioned); consultant reviews | AG-05 v1.9 §1, §3.1–3.4 |
| Signer | "collects a legally-recognized electronic signature with full identity/consent capture, sequential client-then-firm signing, tamper-evident hashing, and a certificate of completion — entirely in-house" | Approved draft + recipients → executed PDF, hashes, certificate, `envelope.signed` | Deterministic | AG-05 v1.9 §1 |
| Conductor | Consumes `envelope.signed` → prospect Won, Biller invoice, notifications | Event → downstream actions | Deterministic, idempotent | AG-05 v1.9 AG-5-38 |
| Biller | Raises/settles invoice from the fee snapshot on execution | Fee snapshot → invoice | Deterministic | AG-05 v1.9 §3.13 |

### From AG-06 v1.7

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Biller | "the in-house Biller Doer that issues invoices, schedules installments, collects payments (online and offline), records every cent received against the right client, and reports" | Signed fee schedule / case lines / payments → invoices, payment facts, receipts, reports | Deterministic | AG-06 v1.7 §1 |
| Conductor (overdue sweep, dunning) | "A scheduled Conductor job sweeps installments/invoices whose due date has passed"; dunning "through the Conductor + Doers" | Due dates + balances → OVERDUE + reminders | Deterministic | AG-06 v1.7 §3.2 |
| Mailer / Messenger | Send invoices, pay links, dunning, receipts | Event → message | Deterministic | AG-06 v1.7 §3.1, §3.2 |
| Payment rail (not a Doer) | "The rail is a rail, not a Doer" (Stripe Connect) | PaymentIntent → webhook | Deterministic | AG-06 v1.7 §3.3 |
| Missed-webhook reconciliation | "a reconciliation job polls the processor for intents that succeeded but whose webhook was missed" | Processor state → Payment fact | Deterministic | AG-06 v1.7 §9 |

### From AG-07 v2.7

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Binder | Pack-driven document checklist; requests, tracks, verifies documents; reuse across cases | Pack checklist + uploads → per-document status, completeness | Deterministic; person verifies | AG-07 v2.7 §3.4 |
| Filler | "Loads the correct form edition", "Auto-fills from the single-source profile/SQR", "Generates output"; backend has "a pure, deterministic" Filler render engine (bold in source) | Verified profile + field map → draft form → (after approval) flattened PDF | Deterministic; human approval mandatory | AG-07 v2.7 §3.5; §12 Backend check v2.5 |
| Reviewer | "continuously computes, for a case, what is missing or does not meet a requirement — the deficiencies — and an overall readiness score" | Case state + Deficiency Library rules → deficiencies, readiness | Deterministic | AG-07 v2.7 §3.6 |
| Checker (AI) | "cross-checks name, date of birth, document numbers and dates across the case's documents, its profile and its forms, and raises each mismatch as a warning" | Docs/profile/forms → Deficiency (source CHECKER, evidence, confidence) | AI, proposal; "never a lock" | AG-07 v2.7 §3.6; AG-7-61 |
| Minder | Turns "every milestone date (AOR, biometrics, medical, ADR, decision) into a reminder"; imported key dates registered | Dates → reminders | Deterministic | AG-07 v2.7 §1, §3.3, AG-7-63 |
| Reader (AI) | Proposes values from documents; "unverified until a person approves them in the review view — that approval is the verification" | Document → proposed values | AI, proposal | AG-07 v2.7 §3.5; AG-7-60 |
| Conductor | Reacts to `case.created`, `case.stage_changed`, `document.received`, `document.extracted`, `deficiency.detected`, `deficiency.cleared`, `case.submitted`, `case.decided` | Events → Doer actions | Deterministic | AG-07 v2.7 §3.9 |
| Signer | "where a case-stage document needs signing"; form `SIGNED` set on `envelope.signed` when pack flag `requiresClientSignature` | Envelope → signed state | Deterministic | AG-07 v2.7 §3.9; AG-7-21 |

### From AG-08 v1.7

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Mapping engine | "reads each (visible, mapped) answer and writes it into that profile — the single source of truth"; conflict detection | Answers + bindings → profile facts with provenance | Deterministic | AG-08 v1.7 §3.7 |
| Rule engine | "evaluated by a shared rule engine used by both the client wizard (live) and the server (save/submit)" | Answers + pathway → visibility/requiredness | Deterministic | AG-08 v1.7 §3.2 |
| Reader (AI) | Proposes values from identity documents "with provenance and confidence in a review view that shows the document region beside the value" | Document → proposed values | AI, proposal; approval = verification | AG-08 v1.7 AG-8-41, AG-8-44 |
| Checker (AI) | "compare answers (typed by the client, entered by staff, or imported) against the values read from the client's identity documents and SHALL raise a warning for each mismatch" | Answers vs document values → warnings | AI | AG-08 v1.7 AG-8-42 |
| Conductor / Mailer / Messenger | Invitation and reminders; `sqr.submitted` → re-score, advance case, notify; reminders "can auto-fire (Conductor) until complete" | Events → messages, case advance | Deterministic | AG-08 v1.7 §3.4, §3.12 |
| Qualifier (consumer) | Re-scores off the profile after intake | Profile → assessment | Deterministic | AG-08 v1.7 §3.7 |

### From AG-09 v1.8

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic or judgement? | Citation |
|---|---|---|---|---|
| Reader (AI) | "Classify. It proposes the document's DocumentType ... with a confidence"; "Extract (four groups of documents in Release 1)" into "proposed profile values"; deadline dates "registered with the Minder" after approval | Scan-clean file → type suggestion + `DocumentExtraction` proposals (PROPOSED/APPROVED/EDITED/REJECTED/UNREADABLE) + `document.extracted` | AI, proposal only | AG-09 v1.8 §3.14; AG-9-42..52 |
| Drafter | "merges client/case data into a template and files the result as a Document" | Template + data → document version | Not stated as AI here (Inferred: template merge) | AG-09 v1.8 §3.7 |
| Signer | Signs; on completion "files the signed PDF back as a new, distinct [Signed] Document" | Document → signed copy | Deterministic | AG-09 v1.8 §3.7 |
| Minder | Registers approved letter deadlines; expiry renewal reminders | Approved date → reminder | Deterministic | AG-09 v1.8 AG-9-51 |
| Reminder | Per-item request reminders respecting consent, quiet hours, quiet state | Due date → reminder | Deterministic | AG-09 v1.8 AG-9-8 |
| Virus scan job | "Every uploaded file is scanned asynchronously" | Upload → clean/infected/pending | Deterministic | AG-09 v1.8 §3.6 |
| Retention/disposal job | Computes disposal-eligible date; proposes or executes disposal | Policy + clock → disposal | Deterministic | AG-09 v1.8 §3.12 |
| Binder | Not named in AG-09 (Phs glossary: Binder = "documents"; AG-07 §3.4 calls the case checklist "the Binder") | — | — | Phs v1.4 Glossary; AG-07 v2.7 §3.4 |


## Part 3: AI and automation already written into the requirements

### From 00-Overview v1.11 and 99-Phasing v1.4

- **Four AI Doers in Release 1, gated.** "AI Doers Reader, Sorter, Drafter, Checker (AG11-D4)" are in Release 1 (Ovw v1.11 index, AG-11 row) but "built, but off for every firm until the processing terms are recorded" (Phs v1.4, Phasing Release 1 row).
- **Reader scope R1.** "identity documents (including the passport machine-readable zone), IRCC/government letters (deadlines such as biometrics), language test results (IELTS, CELPIP, TEF and others), ECA reports, and document-type classification" (Phs v1.4 Glossary "Reader"). "a deadline read from a letter is proposed, approved, then registered with the Minder" (Phs v1.4 Phasing R1).
- **Proposals with provenance and confidence.** "Every Doer output is a proposal with provenance and confidence. Unreadable or missing is flagged, never guessed (AG-07 BR-7 applies to all Doers)." (Ovw v1.11, Agent-native "Never fabricate").
- **Approve = verify for Reader values.** "approving a Reader-proposed value is the verification — one act, not two. It needs `agent/sqr:verify`" (Ovw v1.11, Agent-native, AG11-D10).
- **Seeded recipes R1:** "speed-to-lead, document-received acknowledgement + verify task, missing-document chase, e-sign → onboarding (AG11-D3), plus five more ready-made recipes ... biometrics countdown and PR card / status expiry watch ... no-show recovery, going-cold follow-up and post-consult follow-up" (Phs v1.4 Phasing R1).
- **Waiting times (AG11-D17):** "The missing-document chase goes first after 5 days, then every 7 days, at most 4 reminders" (Ovw v1.11 Agent-native).
- **Deferred to Release 2:** "visual builder, firm-authored recipes, firm-designed reminder chains (Minder cascades), custom cron and manually enrolling a lead into a sequence"; "SMS" (Phs v1.4 Phasing R2 row). Later: "Advanced automation branching" (Phs v1.4 Later row).
- **Playbook concept:** "A pre-built, validated automation blueprint supplied by the country pack/platform that a firm enables and lightly customizes (library-first)" (Phs v1.4 Glossary "Playbook").
- **Every model call logged; no training.** "Every AI path has a manual fallback; every model call is logged; client data is never used to train models." (Ovw v1.11 Agent-native).

### From AG-01 v1.16

- No AI, OCR or machine learning is mentioned in AG-01.
- **Next-step suggestion (rule-based):** "the AG-2 'next-best-action' principle, applied to setup" (§3.6). An AI Worker could drive this checklist; the document describes it as a computed highlight, not AI.
- **Not doing, recorded so it is not reopened (AG1-D14):** "smart owner suggestions (least busy, same office)"; "automatic client emails"; "temporary-absence or holiday cover"; "a screen listing or replacing the person in every automation." Reason given: product-owner decision of 1 Oct 2026.
- **Licence-aware AI defaults depend on AG-01:** a licensed user is used "only for the firm's own safe defaults — who approves AI-written client text (AG-11)" (§3.5).

### From AG-02 v1.9

- **Next-best-action and ranked work-queue** (already specified, not called AI): "The right rail proposes the single most valuable next move ('Book consult — assessment shows strong CRS,' 'Send retainer — consult done, fee quoted,' 'Re-engage — 9 days no contact')" (§3.7). Described as "the 'what to do next' intelligence the founder asked for".
- **Eligibility-driven lead score**: "eligibility is the first-class prioritisation input and the lead score is driven by it" (§3.7); blended engagement score "a fast-follow" (§13 Q4).
- **Sorter on WhatsApp**: "A message the Sorter cannot match with confidence, or matches only by AI with no deterministic signal, SHALL go to the Unmatched inbox and Needs you" (AG-2-60).
- **AI-written lead messages need approval**: speed-to-lead message is APPROVE "only where the floor applies (AG11-D1: AI-written text, or a template whose body was edited by AI ...)" (AG-2-56).
- **Drafter** offered from lead detail for "proposal/retainer" (§3.3); US-2: "one click launches Drafter/Signer pre-filled".
- **Deferred:** "Proactive duplicate-suggestion background pass (Release 2 or later)" (§13 deferrals); "smart" outcome-driven next steps for calls: "'No answer' → suggest a callback task tomorrow" (§3.12, rule-based).
- **Explicitly excluded:** an unknown WhatsApp number never creates a lead automatically: "The action SHALL NEVER run automatically — no lead exists until a person clicks" (AG-2-62).

### From AG-03 v1.4

- **No AI is used in the Qualifier.** It is a "deterministic pure function" (AG-3-39); "A grep of the engine should find zero literal point values" (§3.2). Recommendations are rule-based from pack "recommendation levers".
- **Automation already designed:** "Ranking & recommendation across programs ... surfaces a recommended pathway ... and the near-misses worth pursuing" (§3.3); "Stale-assessment detection (NEW)" (§3.8); "Diff the runs" (§3.8).
- **Open: auto-run.** "Should an assessment auto-run on profile-complete ... or only on explicit 'Assess'?" (§13 Q10). `runType` already allows `AUTO`.
- **Deferred:** "Proactive auto-re-run on every pack publish (Phase-2)"; "Live draw-results feed (Phase-2)"; "Client portal interactive what-if calculator (Phase-2/3)"; "A visual pack-authoring UI for non-engineers (Phase-2)" (§13).
- **AI Worker hook (Inferred):** triage (run Assess, list missing inputs, ask the client) is deterministic and permission-separated: "a junior rep may run but not override or share" (§10).

### From AG-04 v1.5

- No AI, OCR or machine learning is mentioned in AG-04.
- **Automation already designed:** auto lead creation from bookings (§3.4); auto-no-show and no-show recovery (§3.8); consult record pre-filled "from the lead's Qualifier assessment where present" (§3.12); one-click "Create proposal from consult" into the Drafter (AG-4-50); round-robin host assignment (§3.13).
- **Deferred:** "Live SMS / WhatsApp reminders (Phase-2)"; "Full in-house WebRTC video (Phase-2/3)"; "Group/seminar registration & waitlists (Phase-2/3)"; "Per-office booking pages ... (Phase-3)" (§13).
- **AI Worker hook (Inferred):** the consult record (notes, recommendation, fee, next step) is typed by the RCIC host; it is the seam where a Drafter-style summary could be proposed, but AG-04 itself specifies no AI for it.

### From AG-05 v1.9

- No AI, OCR or machine learning is mentioned in AG-05. The "Drafter" here is a template-merge generator with locked clauses and an empty-field guardrail.
- **Automation already designed:** one-click "Create proposal from consult" into the Drafter (from AG-4); automatic Won on signature; automatic invoice on execution; reminders and stuck-retainer flag (§3.10).
- **Deferred:** "Knowledge-based / strong identity verification (KBA, gov-ID, OTP-to-phone) before signing (Release 2 or later)"; "Advanced visual template designer (Release 2 or later)"; "Witness / multi-party beyond client+firm (Release 2 or later)" (§13).
- **Explicitly excluded:** "Staff SHALL never sign on a client's behalf — no electronic signature, typed name or drawn mark is ever entered for a client by a staff member" (AG-5-39). **Inferred:** this applies equally to any AI Worker.

### From AG-06 v1.7

- No AI, OCR or machine learning is mentioned in AG-06.
- **Automation already designed:** deposit invoice or plan activated automatically on `envelope.signed` (AG-6-32); overdue sweep and dunning with auto-exit on payment (AG-6-11, AG-6-12); online payment reconciliation by webhook (AG-6-16, 17); Reconciliation view "(unmatched offline payments → invoices)" (§3.4 key screens).
- **AI Worker hook (Inferred):** matching an offline bank/e-transfer to the right invoice is done by a person today (Reconciliation view "(unmatched offline payments → invoices)", §3.4). No automatic matching is specified.
- **Deferred:** refund execution, credit notes, SMS/WhatsApp dunning, external FX provider, QuickBooks/Xero sync ("Phase-2/3"); "Advanced revenue analytics (cohorts, deferred-revenue recognition) (Phase-3)" (§13).
- **Explicit guard on fabrication:** "Retainer signed but no fee schedule → no auto-invoice; Billing / Finance is prompted to bill manually (never fabricate an amount)" (§9).

### From AG-07 v2.7

- **AI Doers on a case (rule BR-23):** "Every AI Doer working on a case — the Filler's auto-fill, the Reader, the Sorter, the Drafter, the Checker — produces a proposal with provenance and confidence ... and cannot write into the verified profile, send a client message or produce a government form without a human approval" (BR-23). Note: BR-23 lists "the Filler's auto-fill" among AI Doers, while Phs v1.4 says the Filler is non-AI.
- **Checker (AI) in R1:** cross-document consistency findings as warnings; "Every Checker model call SHALL be logged with model and prompt version" (AG-7-61). Scope and thresholds open: "Which fields and document types the Checker cross-checks, default severities, and its confidence threshold" (§13 item 12, SME).
- **Reader values gate the Filler:** "The Filler SHALL pre-populate a field only from a verified value" (AG-7-60).
- **Automation already designed (rule-based):** auto-detected deficiencies "auto-raise/auto-clear" (AG-7-30); readiness score (BR-30); auto-close after decision (AG-7-49); onboarding playbook on `case.created`; post-decision playbooks (§3.7); Minder reminders on government steps.
- **Learning loop hint:** "A rejected or edited draft SHALL be recorded so the automation can be tuned." (AG-7-59).
- **Deferred:** rule-based case assignment "Release 2" (AG-7-92); "Full Filler field-mapping coverage across all government forms — Release 2"; "Multi-applicant family cases at full depth" (Release 2) (§13 deferrals).
- **Never automated:** "ExpatReady SHALL NOT submit a form to an authority on its own — only the RCIC records a submission" (AG-7-59); "A pending draft SHALL NOT be approved, flattened or acted on automatically on timeout" (AG-7-59).

### From AG-08 v1.7

- **Reader in intake (R1, gated):** "values the Reader proposes from an identity document ... SHALL be offered to the consultant as proposals with provenance and confidence" (AG-8-41). Client uploads wait in Needs you; staff uploads approved inline.
- **Approve = verify:** "Approving a Reader-proposed value in its review view IS the verification" (AG-8-44); needs `agent/sqr:verify`.
- **Checker mismatch warnings:** AG-8-42; "A mismatch SHALL NOT lock the questionnaire, the profile or filing."
- **Prompt-injection guard:** "The Reader receives the document content as delimited data, never as instructions, and has no tool access (AG11-D13)" (AG-8-41).
- **Manual fallback required:** "Every Reader and Checker path SHALL have a manual equivalent" (AG-8-45).
- **Rule-based automation:** reminders until complete; consistency checks across family members (§3.9); conflict detection (§3.7); "upstream-changed" notification (AG-8-11).
- **Open tuning:** "The confidence thresholds (when a proposal or mismatch is flagged vs offered), which document types are read ... and the AI/OCR provider and hosting region ... are not decided" (§13 Q11).
- **Deferred:** SMS invitations; "Visual/advanced conditional-logic builder"; "Pack-merge tooling" (Release 2 or later, §13).
- **AI Worker hook (Inferred):** the "needs-evidence" worklist, conflict review and "Verify imported values" are manual human checks today; the Reader/Checker propose, a person with `agent/sqr:verify` decides.

### From AG-09 v1.8

- **Reader in R1 (gated):** four document groups: "(a) identity documents, including the passport machine-readable zone (MRZ) ...; (b) IRCC / government letters, picking up the deadlines and dates ...; (c) language test results ...; and (d) ECA reports" (§3.14).
- **Classification runs on AUTO by default:** "classification is an internal filing action, so by default (AUTO, AG11-D1) a high-confidence type is applied and labelled 'set by Reader' with its confidence ... a low-confidence type goes to Needs you instead" (AG-9-11). This is the one place in the slice where an AI output is applied without per-item approval.
- **Deadline extraction:** "A proposed date SHALL be registered with the Minder ... only after a person approves it" (AG-9-51).
- **Bulk import filing:** imported documents "SHALL be classified and filed to their record by the Reader; files it cannot match to a record or type SHALL go to a review list, never to a guessed owner" (AG-9-47).
- **Tuning loop:** "Reject (reason optional) is recorded so recipes and thresholds can be tuned." (AG-9-45).
- **Logging:** "Every Reader model call SHALL be logged with model and prompt version; the log SHALL carry no file content or extracted values" (AG-9-48).
- **Task auto-completion:** approving Reader values "SHALL complete that document's 'Review document' task" (AG-9-50).
- **Rule-based automation:** request reminders, re-request on reject (AG-9-10), "please re-take" annotation can trigger re-request (§3.8), dedup by hash, earlier-file document offers.
- **Deferred:** "Automated certified-translation ordering (Phase-3)"; "Advanced annotation (page-region drawing, redaction) (Phase-2)"; "Live SMS request reminders (Release 2)" (§13).
- **Open:** "Reader confidence thresholds ... Not decided" (§13 Q10); final document/field list (Q11, SME); provider and region (Q12, Super Admin).


## Part 4: Guardrails already in the requirements

### From 00-Overview v1.11 and 99-Phasing v1.4

| Guardrail | Exact words | Citation |
|---|---|---|
| Product floors (never below "Ask me first") | "AI-written text sent to a client, a template whose body was edited by AI, any government form, any value written into the verified profile without a human having looked at its source." | Ovw v1.11 Agent-native "Autonomy levels and product floors" |
| No submission by ExpatReady | "ExpatReady never submits anything to a government authority on its own." | Ovw v1.11 Agent-native |
| Licence-aware approval default | "by default a licensed user approves AI-written client text, and the Owner may allow other roles — AG11-D11" | Ovw v1.11 Agent-native "Doers do the work" |
| Licence not checked | "ExpatReady never checks, tracks or acts on licence validity or expiry, and never verifies a licence against any register (AG1-D19)" | Phs v1.4 Glossary "Licensed user" |
| Works for the firm, not regulator | "It never reports to a regulator, never declares a firm non-compliant, and never blocks the firm's own licensed judgement." | Ovw v1.11 Agent-native |
| AI processing terms + Canada only | "locked off for every firm until Super Admin has recorded the provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement" | Ovw v1.11 Agent-native "AI is optional per firm" |
| Four-eyes on government forms | "the user who prepared a form draft ... cannot approve it; the approver must be a different holder. With exactly one holder, that person may approve a draft they prepared, recorded as self-approved" | Phs v1.4 Glossary "Four-eyes" |
| Unverified senders | "A message from any other sender never triggers a client-facing automatic action: it waits in Needs you for approval" | Phs v1.4 Glossary "Verified sender" |
| Quiet imports | "internal work runs, but no client-facing recipe, chase, acknowledgement, portal invitation or questionnaire link goes out" | Phs v1.4 Glossary "Not started (quiet)" |
| Nothing on timeout | "Nothing in it executes on timeout." | Phs v1.4 Glossary "Needs you" |
| Sensitive data in messages | "passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications" | Ovw v1.11 Cross-Cutting Mandates, Security |
| Tenant isolation | "A firm can never see, query, or mutate another firm's data." | Ovw v1.11 Design doctrine |
| Pack-version stamping | "Every assessment, generated government form, and checklist instantiation records the Country Pack version" | Ovw v1.11 Country-Awareness item 4 |
| Owner-only actions | "Five actions are Owner-only and can never sit on a custom role (allow Expat Ready support to make changes, cancel the subscription, edit the firm's legal profile, export all firm data, connect the client-payments payout account)" | Ovw v1.11 Permission model |
| Audit log | "The append-only, tamper-evident, firm-scoped compliance record (who/what/when, before/after)" | Phs v1.4 Glossary "Audit log" |
| CASL gate and rate caps | Minimal Conductor includes "guardrails including the CASL gate and rate caps" | Phs v1.4 Phasing R1 |

### From AG-01 v1.16

| Guardrail | Exact words | Citation |
|---|---|---|
| Professional approvals default holders | "seed `agent/case:waive-deficiency`, `agent/case:form-approve`, `agent/case:review-approve` and `agent/retainer:countersign` on the Owner and Case Manager starter roles" | AG-01 v1.16 AG-1-63 |
| No licence check on permissions | "The system SHALL NOT require a licensed-representative role or check a licence when evaluating these permissions, and SHALL audit every use." | AG-01 v1.16 AG-1-63 |
| Reason on role changes | "The system SHALL require a written reason (non-empty after trimming) for every firm role create, edit and delete and every role assignment or removal" | AG-01 v1.16 AG-1-66 |
| Nobody changes own roles | "The system SHALL reject a user changing their own role assignments." | AG-01 v1.16 AG-1-60 |
| Departed licence never used | "A regulator credential linked to a deactivated or deleted staff member SHALL NOT be stamped on any new retainer or form." | AG-01 v1.16 AG-1-51 |
| One session per staff member | "stops several people sharing one paid seat and keeps every action traceable to one person" | AG-01 v1.16 AG1-D16 |
| Default-deny | "an action is allowed only if at least one of the user's roles holds the matching `agent/*` permission" | AG-01 v1.16 AG-1-19 |
| Audit of sensitive actions | Sensitive actions (role change, credential view/edit, user deactivate, user delete, payment-rail connect, MFA-policy change) "SHALL be audited with actor, target, and before/after" | AG-01 v1.16 AG-1-46 |
| Record retention | Deleted staff history stays "in line with the CICC 6-year record rule (SA2-D13 in SA-02)" | AG-01 v1.16 AG-1-54 |
| Clients not auto-emailed on staff change | "Clients SHALL NOT be emailed automatically" | AG-01 v1.16 AG-1-48 |

### From AG-02 v1.9

| Guardrail | Exact words | Citation |
|---|---|---|
| CASL consent per recipient at send time | "Marketing/nurture sends require each recipient's recorded express consent, evaluated at the moment of each send" | AG-02 v1.9 BR-9 |
| No-guarantee rule | "the product never renders an eligibility result as a promise" | AG-02 v1.9 BR-10 |
| Never send on timeout | "Pending drafts SHALL never send on timeout." | AG-02 v1.9 AG-2-56 |
| Quiet imported leads | "importing 500 prospects sends nothing to any of them, now or later, without the firm's say-so" | AG-02 v1.9 BR-19 |
| Imported consent not trusted | "An imported consent column SHALL NOT be written to the lead's or contact's consent flags or to any consent record until legal decides" | AG-02 v1.9 AG-2-59 |
| Unverified sender | "a classification of a message from an unverified sender SHALL NOT trigger any client-facing AUTO action; such an action SHALL drop to APPROVE" | AG-02 v1.9 AG-2-60 |
| No fabricated values on convert | "it SHALL NOT fabricate or default missing values (notably: it SHALL NOT hardcode gender = 'MALE'" | AG-02 v1.9 AG-2-47a |
| Owner approval fallback recorded | "recorded 'approved by Owner without a licensed user'" | AG-02 v1.9 AG-2-56 |
| Export never widens visibility | "`agent/prospect:export` does not widen visibility" | AG-02 v1.9 AG-2-49a |
| Audit of sensitive actions | Sensitive actions (merge, convert, bulk action, assignment, configuration change, export) "SHALL be audited with actor, target, and before/after" | AG-02 v1.9 AG-2-51 |
| Approve needs send right | "Approving a client-facing draft from a lead recipe needs the same permission as sending that message by hand (AG11-D2)" | AG-02 v1.9 §10 Import permissions |

### From AG-03 v1.4

| Guardrail | Exact words | Citation |
|---|---|---|
| Disclaimer always | "No result is ever rendered — on screen, export, portal, or case — without the regulator-safe disclaimer" | AG-03 v1.4 BR-11 |
| Missing data never "not eligible" | "the engine never marks NOT_ELIGIBLE on missing data" | AG-03 v1.4 BR-7 |
| Override additive | "A consultant override is stored alongside, never instead of, the engine result, with a mandatory reason" | AG-03 v1.4 BR-12 |
| Review gate before client share (configurable) | "an unreviewed auto-assessment is not silently published as advice" | AG-03 v1.4 BR-16 |
| Separate permissions | "`override`/`review`/`share`/`pin-version` are each separately permissioned" | AG-03 v1.4 §10 Enforcement |
| No silent overwrite | "Never a silent overwrite." | AG-03 v1.4 §3.8 |
| No fabricated cutoff | "the competitiveness band shows 'cutoff signal unavailable' rather than inventing one" | AG-03 v1.4 §9 |
| Overrides not carried to new runs | "no silent carry of human judgement onto new machine numbers" | AG-03 v1.4 §9 |
| Advice egress audited | "Client-share/export ... and override/review are audited" | AG-03 v1.4 §11 |

### From AG-04 v1.5

| Guardrail | Exact words | Citation |
|---|---|---|
| No guarantee in consult outputs | "the product never renders eligibility as a promise" | AG-04 v1.5 BR-17 |
| Locale and consent | "transactional comms are allowed regardless of marketing consent" | AG-04 v1.5 BR-8 |
| Staff override audited | "staff may override on the staff console (audited)" | AG-04 v1.5 §9 |
| Separate permission to launch proposal | `agent/booking-consult:create-proposal` "Launch Drafter from a consult (AG-5 hand-off)" | AG-04 v1.5 §10 |
| No automatic client emails on staff change | "no other automatic client email is sent (AG1-D10)" | AG-04 v1.5 AG-4-54 |
| Pre-consult agreement accepted with timestamp | "Pre-consult agreement requirement (acceptance captured w/ timestamp), wording resolved from the firm's Country Pack" | AG-04 v1.5 AG-4-15 |
| Audit | "type config changes, manual/staff reschedule-override, mark-attendance, consult write, calendar connect/disconnect, export ... and refunds write immutable audit entries" | AG-04 v1.5 §11 |

### From AG-05 v1.9

| Guardrail | Exact words | Citation |
|---|---|---|
| No signing for the client | "Staff SHALL never sign on a client's behalf" | AG-05 v1.9 AG-5-39 |
| Required clauses structural | "an agreement missing a required clause for its country cannot be sent. The firm cannot unlock the required set." | AG-05 v1.9 BR-3 |
| No empty required field | "A required merge token resolving to blank blocks send" | AG-05 v1.9 BR-4 |
| Consultant approval recorded | "approval-for-send SHALL record the approver + timestamp" | AG-05 v1.9 AG-5-17 |
| Countersign is a distinct authority | "a sales rep who can send a retainer should not necessarily be able to countersign it" | AG-05 v1.9 §10 Honesty note |
| Countersign routing | "shown at once in the Needs you / notifications of every active, non-suspended holder of `agent/retainer:countersign`; active licensed holders SHALL be marked 'preferred'" | AG-05 v1.9 AG-5-27 |
| Owner fallback recorded | "recorded as 'countersigned by Owner — no active holder of the countersign permission'" | AG-05 v1.9 AG-5-27 |
| Consent hard gate | "No signature image or field value is persisted without affirmative, versioned, locale-correct consent" | AG-05 v1.9 BR-8 |
| No billing before signature | "no invoice against an unsigned agreement" | AG-05 v1.9 BR-14 |
| Firm-owned storage | "no third-party e-sign vendor ever holds the document" | AG-05 v1.9 BR-11 |
| Audit non-bypassable | "Every meaningful action writes an immutable, tenant-scoped audit event in the action path" | AG-05 v1.9 BR-18 |

### From AG-06 v1.7

| Guardrail | Exact words | Citation |
|---|---|---|
| Separation of duties | "a firm can grant 'take money' without 'give money back' and 'do work' without 'issue invoices.'" | AG-06 v1.7 BR-11 |
| Immutable money facts | "Facts are never edited or deleted; corrections are reversing facts." | AG-06 v1.7 BR-1 |
| No invoice on unsigned retainer | "AG-06 raises no invoice against a case whose retainer is unsigned" | AG-06 v1.7 BR-17 |
| Webhook is the source of truth | "the invoice is marked paid by the webhook fact, not the redirect" | AG-06 v1.7 BR-10 |
| Platform never holds client money | "Online funds settle to the firm's own processor account" | AG-06 v1.7 BR-13 |
| Payments on behalf recorded | "the Payment fact SHALL record that staff entered it on the client's behalf (who, when)" | AG-06 v1.7 AG-6-43 |
| No fabricated amounts | "never fabricate an amount" | AG-06 v1.7 §9 |
| Audit of money actions | Sensitive money actions (issue, void/cancel, record payment, refund, numbering/tax config change, accounting export) "SHALL be audited" | AG-06 v1.7 AG-6-38 |
| Not a trust ledger | "we explicitly do not claim it" | AG-06 v1.7 §12 |

### From AG-07 v2.7

| Guardrail | Exact words | Citation |
|---|---|---|
| Government form hard floor | "no firm setting SHALL lower it to AUTO" | AG-07 v2.7 AG-7-59 |
| No submission by product | "ExpatReady never submits a form to an authority itself (§3.7 — the RCIC records the submission)" | AG-07 v2.7 §3.5 |
| Only verified values in forms | "an unverified value is shown beside the field as 'unverified — verify to use' ... never silently filled, and never invented" | AG-07 v2.7 §3.5 |
| Never fabricate (all Doers) | "BR-7 is the rule all AI Doers follow ... unreadable or missing is flagged, never guessed" | AG-07 v2.7 BR-7 |
| Four-eyes | "the user who prepared a government form draft SHALL NOT be able to approve it" (when Team safeguards on and 2+ holders) | AG-07 v2.7 AG-7-65 |
| Self-approval recorded | "'Self-approved' is recorded whenever the approver is the preparer, unconditionally" | AG-07 v2.7 AG-7-65 |
| Approval shown to all holders; Owner fallback | "recorded as 'approved by Owner — no active holder of the approval permission'. Nothing SHALL be blocked." | AG-07 v2.7 AG-7-68 |
| Distinct authorities | "`submit`, `record-decision`, `waive-deficiency` and `form-approve` are checked against their own keys, never `:edit`" | AG-07 v2.7 §10 Enforcement |
| Warnings not locks | "ExpatReady assists firms; it never regulates or blocks them." | AG-07 v2.7 BR-19 |
| Waive with reason | "Waiving a deficiency requires `agent/case:waive-deficiency` ... a mandatory reason, and an audit entry" | AG-07 v2.7 BR-9 |
| Lead representative licensed | "at most one active LEAD_RCIC per case, a licensed user only" | AG-07 v2.7 §7 CaseTeamMember |
| Model calls logged | "every model call is logged with model and prompt version; client data is never used to train models" | AG-07 v2.7 BR-23 |
| Quiet imported cases | "neither SHALL any later trigger or scheduled scan send the client anything automatically" | AG-07 v2.7 AG-7-63 |
| Attached records follow parent visibility | "One shared-core visibility check SHALL be used by every list, search, count, export and detail view" | AG-07 v2.7 AG-7-90 |

### From AG-08 v1.7

| Guardrail | Exact words | Citation |
|---|---|---|
| Only a human verifies | "Only a human marks a fact verified; the Reader never does." | AG-08 v1.7 AG-8-44 |
| Verified never clobbered | "Mapping SHALL not silently overwrite a document-verified value with a differing self-declared value" | AG-08 v1.7 AG-8-23 |
| Imported values unverified | "Imported answers SHALL be stamped with their source ... and SHALL be unverified until a person with `agent/sqr:verify` verifies them" | AG-08 v1.7 AG-8-43 |
| Staff-on-behalf provenance | "SHALL carry the provenance 'entered by staff on the client's behalf' with who and when" | AG-08 v1.7 AG-8-25 |
| Must-verify facts at filing | "raise a warning at the AG-7 filing step at the severity the pack sets (CRITICAL for a must-verify fact)" | AG-08 v1.7 AG-8-27 |
| Server validates everything | "The public fill endpoint SHALL schema-validate every answer server-side" | AG-08 v1.7 AG-8-17 |
| Consent and channel rails | "consent per recipient at send time, the quiet state (AG-8-43), supervision, autonomy, rate caps and quiet hours" | AG-08 v1.7 AG-8-47 |
| No promises | "the product never renders an eligibility result as a promise" | AG-08 v1.7 BR-15 |
| Audit | "authoring/assignment/verification/lock/unlock/version-publish/export actions SHALL be audited" | AG-08 v1.7 AG-8-35 |

### From AG-09 v1.8

| Guardrail | Exact words | Citation |
|---|---|---|
| Reader never writes verified profile | "The Reader SHALL NOT write to the verified profile; only a person's approve (or edit then approve) writes a value" | AG-09 v1.8 AG-9-45 |
| Never guess | "A field the Reader cannot read with enough confidence SHALL be recorded as unreadable / flagged and SHALL NOT be filled with a best guess." | AG-09 v1.8 AG-9-46 |
| No timeout approval | "A proposal SHALL NOT auto-approve on timeout." | AG-09 v1.8 AG-9-45 |
| Prompt-injection guard | "passing the content as delimited data and never as instructions, and giving the model no tool access" | AG-09 v1.8 AG-9-42 |
| Scan before AI | "The Reader SHALL NOT run on a file that is SCANNING, SCAN_PENDING or QUARANTINED." | AG-09 v1.8 AG-9-42 |
| Same permission as manual | "Approving a Reader proposal needs the same permission as doing the action by hand" | AG-09 v1.8 §10 note |
| Download separately permissioned | "handling a document's status is not the same right as opening a passport" | AG-09 v1.8 §10 Enforcement |
| Read-level audit | "Every read (preview/download/signed-URL issue) writes a DocumentAccessLog" | AG-09 v1.8 BR-9 |
| Visibility follows parent | "A document attached to a client or case SHALL be visible only to users who can see that client or case" | AG-09 v1.8 AG-9-53 |
| Legal hold wins | "hold always wins; disposal skips held items" | AG-09 v1.8 §9 |
| No cross-client link | "Never link across clients or tenants." | AG-09 v1.8 BR-10 |
| No training on client data | "Client documents SHALL NOT be used to train models." | AG-09 v1.8 AG-9-48 |


## Part 5: Conflicts, gaps and surprises

### From 00-Overview v1.11 and 99-Phasing v1.4

1. **AI Doers are already Release 1 in the Firm FRs.** Phs v1.4 puts the AI Doers "Reader", "Sorter", "Drafter" and "Checker" in the Release 1 row (built, gated off). The workstream README §5 says the Program Charter on Drive lists AI and Doers as "NOT IN RELEASE 1". **Inferred:** the FRs and the Charter disagree; the Charter was not in this slice, so this needs checking against the Charter reader's notes.
2. **Release mapping incomplete.** "Where a module's split between Release 1 and Release 2 is not stated below, it follows the earlier Phase 1 / Phase 2 split and is to be confirmed." (Phs v1.4 Phasing note); also Ovw v1.11: "module mapping beyond AG17-D51 to be confirmed".
3. **Qualifier is named but not in the glossary's Non-AI or AI lists.** Ovw v1.11 In-House lists Qualifier among "immigration-only Doers"; Phs v1.4 Glossary "Doer" lists Non-AI Doers without Qualifier. Gap.
4. **Two home screens named.** Ovw v1.11 says "Needs you" and "Done for you" are "the staff home screen" and "Module dashboards (AG-14) sit behind it (pending knock-on to AG-14)"; Phs v1.4 Glossary still defines "My Tasks" as "The per-user command center". **Inferred:** possible overlap to resolve.
5. **Founders' June Doer roster (E4) vs FRs.** E4 lists Dialer and future Submitter, Reader, Planner, Timer; the FRs (Ovw v1.11) list Reader as an AI Doer and add Sorter, Drafter (AI), Checker; Dialer, Submitter, Planner, Timer do not appear in these two files. E4 calls the AI copilot "an intelligence layer across everything", not a Doer; the FRs make four AI Doers. **Inferred:** naming has moved since June.
6. **Header date mismatch (minor).** Phs file name dated 2026-10-05 while its v1.4 change-log row reads "2026-10-04".

### From AG-01 v1.16

1. **AI Worker identity is not covered.** AG-01 defines staff users, seats ("Active users and pending invitations SHALL count toward the plan's seat limit", AG-1-13) and "one device at a time" for every firm user (AG-1-55). It says nothing about a non-human user. **Inferred:** if an AI Worker is "a new kind of user", seat counting, one-session rule, roles and the "nobody changes their own role" rule all need a decision.
2. **Default-holder vs licence.** Professional approvals default to Owner and Case Manager with no licence check (AG-1-63), while AI-written client text approval defaults to "licensed user" (§3.5 pointing to AG-11). Two different "who may approve" bases. **Inferred:** an AI Worker's sign-off routing must handle both.
3. **Documented numbering hazard:** "`AG-1-27` is WITHDRAWN in the FR and the AG-1 slice, and in `05-Doc-3-Agent-Console.md` it is a LIVE Restricted-PII encryption requirement" (§4 warning box). Doc 3 readers must not cross-match IDs.
4. **Open founder questions (§13):** Q2 required tasks "Confirm"; Q3 hard gates "Confirm"; Q4 MFA launch default; Q6 reporting currency and FX source; Q7 payment-rail provider; Q8 custom domain; Q9 step-up scope.
5. **Immigration-SME items:** regulator labels, licence formats, role flags and compliance wording are "routed to the Immigration-SME (Ishaan); founder is final authority" (§13).

### From AG-02 v1.9

1. **Sales dashboard release status contradicts itself.** §4 has SHALL rows AG-2-41..43b, but §13 "Parked, by founder ruling 2026-08-28" says "Sales dashboard, forecasting, and multi-currency FX (§3.9)" is "owned by AG-14. Out of shipped scope". Ovw/Phs give AG-14 "Release 1 snapshot". Unclear what R1 includes.
2. **Stale "email-only" wording.** §12 still says "Email-only for the demo" while AG-2-31a (changed 5 Oct) allows WhatsApp steps in R1.
3. **Dialer is a Doer here** ("a new in-house Doer", §3.12) but is not in the Ovw v1.11 In-House Doer list or the Phs glossary Doer list. It matches the founders' June roster (E4 Tier 2 "Dialer"). Gap in the Doer roster.
4. **Profile capture blocked.** "nothing can record an answer yet (blocked — §13), so the profile panel ships read-only" (§7 `ContactProfile`). Carry-forward "is itself blocked on AG-3's answer-capture write path landing" (§3.11).
5. **Party existence in code unreconciled:** "This must be reconciled against same-day origin/dev of both repositories ... before build" (§12).
6. **Open founder questions:** Q5 business-hours default and first-response SLA hours; Q6 reporting currency and FX source; Q7 telephony provider; Q8 plan tiers; Q9 `isWonEntry` flag.
7. **AI-relevant (Inferred):** the next-best-action, work-queue ranking and going-cold detection are the CRM's "intelligence layer", all specified as rule-based. Any AI Worker acting on leads must still pass the CASL gate, quiet state and autonomy floors listed above.

### From AG-03 v1.4

1. **Not yet reviewed.** Status line: "Baseline — not yet reviewed" (header v1.4). Its content predates the agent-native decisions (no mention of Needs you, autonomy levels or AI Doers).
2. **Profile source conflict.** AG-03 says inputs are "the single-source ContactProfile" (AG-3-2) while AG-02 v1.9 §7 says "`ContactProfile` — RETIRED as a store" and facts live in `ClientCanonicalAnswer` against the Party. AG-03 was not updated.
3. **Phase vocabulary not converted.** Deferrals still say "Phase-2/3" (§13), not Release 1/2, despite AG17-D60.
4. **Open founder questions:** Q8 firm-level pack override; Q9 mandatory review before client-share; Q10 auto-assess trigger; Q11 draw-cutoff source; Q12 plan tiers. SME items Q1–Q7 (program set, gates, grids, levers, disclaimer wording, mandatory fields, proxies).
5. **Today's code is Canada-hardcoded** (seven calculators in TypeScript), boolean eligibility, no provenance, no override (§12). Everything in the four-state, versioned model is NEW.
6. **AI-relevant (Inferred):** whether a client-facing assessment counts as "advice" needing a licensed sign-off is not settled (Q9). An AI Worker that shares assessments would need that answered; label: confirm with counsel / RCIC.

### From AG-04 v1.5

1. **Not updated for agent-native operation.** AG-04 has no mention of autonomy levels, Needs you, the AI Doers or the five ready-made recipes (Ovw/Phs list no-show recovery and post-consult follow-up as R1 recipes).
2. **Channel conflict.** §13 Q3 "Locked: email-only confirmations/reminders for the demo (with ICS); SMS/WhatsApp via Messenger designed but deferred" and "Live SMS / WhatsApp reminders (Phase-2)", whereas Phs v1.4 puts proactive outbound WhatsApp in Release 1 (AG11-D18(a)). Unclear whether booking reminders may go by WhatsApp in R1.
3. **Phase vocabulary** ("Phase-1/2/3", "demo") not converted to Release terms.
4. **Today's reminders are not delivered:** "Reminders are not actually delivered today" (the processor logs emails, skips SMS) (§12). Two parallel booking systems in code to consolidate (§12).
5. **Open founder questions (§13):** Q5 video room depth; Q6 first calendar/video providers; Q7 paid-consult hold window and refund policy, pre-consult agreement per country; Q8 auto-no-show grace; Q9 slot interval; Q10 FX; Q11 group bookings. SME: pre-consult agreement wording, FR-CA copy, mandatory intake questions.

### From AG-05 v1.9

1. **"Drafter" means two different things.** In AG-05 the Drafter is a template-merge generator for retainers (§3.1–3.4, no AI). In Ovw v1.11 and Phs v1.4 the Drafter is one of "the four AI Doers" that "writes a draft message or document for a person to review". **Inferred:** the name now covers both a deterministic retainer generator and an AI writer; the product floor (AI-written client text must be approved) would apply only if AI writes retainer text. Needs a naming decision.
2. **AG-5-27 refers to "Needs you"** (countersign requests shown in "the Needs you / notifications"), so AG-05 is partly aligned to agent-native operation, but the rest of the module (reminders, stuck retainers) does not mention autonomy levels.
3. **Code reality:** "no retainer code at all in the ERv2 rebuild" (§12, AG17-D62 check of 2026-10-02); the e-sign engine described as existing is legacy V1. Event name `esign.envelope.completed` vs `envelope.signed` unresolved (§13 Q6).
4. **Open founder questions (§13):** Q1 countersign default "Confirm"; Q2 signing channel "Confirm"; Q3 expiry and stuck SLA; Q4 bilingual posture; Q5 firm storage rail (shared vs bring-your-own bucket); Q6 event rename; Q8 plan tiers. SME: required clause set and wording, retention period, e-signature recital, mandatory merge fields.

### From AG-06 v1.7

1. **Not updated for agent-native operation.** No mention of autonomy levels or Needs you for dunning messages; dunning is described as running automatically through the Conductor. **Inferred:** dunning would count as template messages (AUTO) under Ovw v1.11, but AG-06 does not say so.
2. **Channel conflict:** dunning "email-only for the demo" (AG-6-12) and "Live SMS / WhatsApp dunning (Phase-2)" vs Phs v1.4 proactive outbound WhatsApp in R1.
3. **Portal reference mismatch:** AG-06 says the client pays "via the portal (AG-12)" (AG-6-15; §2 "Client (portal, AG-12)"), but AG-12 is Templates; the portal is AG-15 / CP-01. Stale reference.
4. **Code reality:** `src/payment` "hardcodes currency: 'cad'", "PaymentController is empty"; online rail is effectively NEW; `recordReceipt` not atomic (§12). Code checks "not re-run for v1.3".
5. **Open founder questions (§13):** Q1 Stripe Connect model and application fee; Q2 reporting currency and FX source; Q3 plan default mode; Q4 refund in demo; Q5 trust-accounting posture; Q6 tax values (SME); Q7 dunning cadence and wording; Q8 plan tiers.

### From AG-07 v2.7

1. **Release scope of core delivery pieces is undecided.** "Release scope of the Filler, Deficiency Library, four-eyes / Team safeguards, several filings and the board — founder. The spec keeps them in Release 1; SCOPE-TRIAGE (5 Oct) proposes Release 2 for each, undecided." (§13 item 22). Author recommends keeping Filler and Deficiency Library in R1.
2. **AG-17 release conflict:** "BUILD-ORDER (15 Sep) parks AG-17 / LMIA in Release 2, while Phasing v1.4 (5 Oct) puts it in Release 1 — one of the two documents needs correcting." (§13 item 22).
3. **Filler: AI or not?** BR-23 names "the Filler's auto-fill" among AI Doers; Phs v1.4 glossary lists Filler as non-AI ("Non-AI Doers follow fixed rules"); §12 says the backend Filler is "a pure, deterministic" Filler render engine (bold in source). **Inferred:** Filler is deterministic; BR-23 wording is loose.
4. **Most of the case spine is not built.** "Does not exist (no table and no module directory found): Case, Filing, CaseApplicant, CaseStageDef, CaseTeamMember, Deficiency, ... Submission, Decision" (§12 Backend check v2.5, local checkout `4d9999e2`, not fetched). Exists: Filler render engine, form editions, field maps, answer store, pack pins, import engine.
5. **Pending knock-ons not applied** to AG-01, AG-05, AG-14, AG-15, AG-11 (`client.created`/`client.updated` triggers), AG-18, SA-01/SA-01B, backend (§0.3 table "Pending").
6. **Approval routing differs from AI text approval.** Professional approvals go to "every active holder" with licensed holders "preferred" (AG-7-68, F4); AI-written client text needs "a licensed approver by default" (AG11-D11(a), unchanged). **Inferred:** two routing rules an AI Worker must respect.
7. **Many "proposed default" decisions** (AG7-D11 to D24) "stand until Sanjay changes them" (v2.5 change log) — not founder-ratified.
8. **SME-owned values missing:** government steps per program, form sets/editions/mappings, checklists, deficiency taxonomy and severities, milestone set, submission references, default lead time (§13 items 12, 16, 23 and SME note).

### From AG-08 v1.7

1. **Profile store conflict.** AG-08 makes `ContactProfile` "the single source of truth" (§3.0, §7) while AG-02 v1.9 §7 says "`ContactProfile` — RETIRED as a store (ADR C2-D4)" with facts in `ClientCanonicalAnswer` against the Party. AG-08 also states a code fact: `client-spine.prisma` has `AnswerSubject`. **Inferred:** names to reconcile before Phase B.
2. **Wrong module reference:** "Super Admin (platform, AG-15 — referenced, not owned here)" and "The Country Pack (owned by AG-15/Super Admin)" (§2, §3.3). AG-15 is Client Portal Management; packs are Super Admin SA-01.
3. **Today's code gap is large:** "There is NO single-source mapping today", no builder, no versioning, no validation ("accepts `responses: Record<string, any>`"), PII logged by `console.log(JSON.stringify(caseData))`, firm-side endpoints "NOT permission-gated" (§12).
4. **Open founder questions (§13):** Q1–Q5 "Proposed: locked" (confirm); Q7 PQR scope pre-retainer; Q8 spouse privacy; Q9 partial submit default; Q11 Reader/Checker thresholds and provider.
5. **Pending knock-ons:** "SA-08 (AI model and OCR provider), SA-11 (AI processing and no-training rule ...), SA-12 (platform kill switch for AI Doers)" (Applied-from note).

### From AG-09 v1.8

1. **AI classification on AUTO.** AG-9-11 lets the Reader set a document type automatically at high confidence (default AUTO). Other AI outputs in the slice need approval. Not a contradiction of the product floors (type is not a verified-profile value), but **Inferred:** worth flagging for the AI Worker guardrail model.
2. **Retention release conflict.** AG-9-33/34 are SHALL requirements with no deferral note, but Phs v1.4 Release 2 row lists "AG-9 bulk export + retention policy".
3. **Stale references:** client portal called "AG-12" (§1, §3.1, §3.2, §2) — AG-12 is Templates; portal is AG-15/CP-01. "Phase-2/3" deferral vocabulary not converted.
4. **Binder naming:** AG-09 never uses "Binder"; AG-07 uses it for the case checklist; Phs glossary Binder = "documents". **Inferred:** Binder spans AG-07 checklist + AG-09 documents.
5. **Code reality:** no virus scan, no content hash, no read audit, no versions, no SSE-KMS, bucket credentials in the database, keys not firm-prefixed (§12). Signer completion listener exists.
6. **Open founder questions (§13):** Q1–Q4 "Proposed: lock" (confirm); Q5 scanner engine; Q6 storage vendor/region; Q7 KMS key scoping; Q8 retention values and disposal mode (SME + legal — confirm with counsel); Q9 plan tiers; Q10–Q12 Reader thresholds, document list, provider.
7. **Pending knock-ons:** "SA-08 (AI model and OCR provider, Canadian data residency for AI processing), SA-11 ..., SA-12 (platform kill switch for AI Doers), SA-03 (plan-gating of AI Doers and volumes)" (Applied-from note).


