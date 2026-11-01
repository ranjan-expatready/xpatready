# Release 1 scope triage — for review together

**What this is.** A review file, **not** a requirements document. Nothing here has changed any spec. Every feature is still in Release 1 until we go through this together and you decide.

**How to read it.** Each module has two lists:
- **Stays in Release 1** — needed to run one real client end to end (lead → consult → retainer → pay → case → submission → decision, through the portal, plus one LMIA file), or a legal / security necessity. No action needed.
- **Proposed to move to Release 2** — the journey works without it. Each line says why. These move **only if you agree**.

**Marks.** **[F]** = decided earlier by the founder (would be revisiting that decision) · **[today]** = you decided it today · **(drop)** = proposed to remove, not just move.

Source: 12 read-only reviews of the current module files, 5 Oct 2026. Judgment calls, not facts — challenge anything.

---

## AG-01 Firm setup
**Stays:** firm record and data isolation · profile, timezone, currency · the firm's country · regulator credential on retainers/forms · staff invite · roles (default-deny) · last-admin guard · deactivate with instant lock-out · seat cap · "no money without payment rail / no documents without licence" · two-factor login · simple onboarding checklist · session list + revoke · branding (logo, colour, portal address)

**Proposed to move:**
- Staff-leaving extras — handover prompt, Unassigned badge, representative-update task, hard delete, departed staff in reports **[F]** — a new firm has no leavers; deactivate + bulk reassign stay
- Role-editor polish (clone, preview, impact screen); ship 3–4 fixed role templates, not 6
- ~~One session per device ("signed in elsewhere") **[F]**~~ — **Decided 8 Oct (the product owner): stays in Release 1** (AG1-D20, AG-01 v1.16)
- Office assignment screen (table stays), stalled-setup nudges, "waiting on platform" state
- Licence-number format hint · ~~firm-optional session policy~~ — **decided 8 Oct (the product owner): withdrawn, not deferred** — sessions are a platform rule, no firm setting (AG1-D20; AG-16-23 withdrawn in AG-16 v1.12)

## AG-02 Leads & CRM
**Stays:** person / employer / lead model with contact roles · manual lead + duplicate check · pipeline board and list, stages, loss reason, reopen · e-sign moves lead to Won · convert to client · corporate pipeline + convert to LMIA · isolation, audit, own-vs-all · consent check before sending · web form (one language) · notes, tasks, manual call log · speed-to-lead call task + simple acknowledgement email · fixed owner + Unassigned queue · leads from bookings, referral field · personal-data export (PIPEDA)

**Proposed to move:**
- Lead scoring and "what to do next" ranking
- Routing rules (round-robin, by program/source) **[F]** — small firms assign by hand
- Three extra recipes: no-show, going-cold, post-consult **[F]** — off by default anyway
- Business-hours SLA clock **[F]** — a plain "no contact in 2 hours" flag is enough
- Sales dashboard, forecast, leaderboard, source ROI
- Multi-currency / FX
- Lead CSV import (AG-18)
- API keys, UTM attribution, WhatsApp "Create lead" **[F]**
- Bulk actions, saved views, WIP limits, configurable stages
- Lead list export
- (drop) Click-to-call dialer · country routing / country badges (leftover from one-country rule) · sequence enrolment (already Release 2)

## AG-03 Pathway assessment
**Stays:** no-guarantee disclaimer · saved result with rules version · single applicant profile, carried into the case · isolation and permissions · core engine (eligible / possibly / not, with reasons and missing inputs) · Canada CRS + FSW as seeded data · per-factor breakdown · "reviewed by" stamp · manual re-run · result shown on the lead card

**Proposed to move:**
- What-if recommendations ("CLB 8→9 = +X points")
- Draw-cutoff competitiveness band
- Five PNP streams (OINP, AAIP, SINP, BCPNP, MPNP)
- Consultant override of outcomes (a note does the job)
- Stale queue, run-to-run diff, pinned version
- Client-shareable assessment (portal / PDF)
- Pack authoring and publish screens
- Entitlement tiers, bulk re-run, auto-assess
- (drop) Firm-level pack override

## AG-04 Consultation & booking
**Stays:** appointment types and availability · public booking page (hardened) · double-booking protection · booker becomes a lead · consent + pre-consult agreement · confirmation email · staff mark completed / no-show / cancel · booking events · consult record · departed host removed · "create proposal from consult" · calendar invite + reminders (through AG-11 — one reminder system, not two) · client self-service cancel/reschedule · small safeties (buffers, intake questions, manual video link, staff booking)

**Proposed to move:**
- Paid consults (hold, expiry, refund)
- Round-robin and group bookings
- Two-way calendar sync (Google / Outlook)
- Video connectors (Zoom / Meet / Teams) — pasted link works
- Booking analytics
- Booking-page builder, embed, bilingual page
- Business-hours / holiday maths, per-host caps, auto no-show
- (drop) In-house video room

## AG-05 Retainer & e-sign
**Stays:** template with locked required clauses · merge fields · draft review and approve · recipients, consent, signing evidence · default signature fields · client-then-firm order + countersign · seal, hash, audit · signature moves lead to Won and starts invoicing · unsigned warning, employer signatory, return to portal · secure access · void / re-issue · English / French version (a Must if any launch firm serves Quebec) · executed copy + certificate · signed-on-paper upload · remind + expiry · template edit

**Proposed to move:**
- Parallel signing, drag-and-drop field editor, "no countersign" toggle, stuck-agreement SLA, pack-driven certificate wording, PIPEDA export, disposal after retention
- Background PDF queue, PDF/A
- (drop) Firm's own storage bucket · dual-language stacked PDF · witness signer

## AG-06 Billing & payments
**Stays:** invoices (draft, issue, lines, status) · numbering at issue · Canadian tax · offline payment + receipt · retainer signature → deposit invoice · no invoice on unsigned retainer · money integrity, separate permissions, events · one currency per invoice · online card payment *(your call — see questions)* · milestone invoice from retainer schedule · overdue flag + manual reminder · per-client money summary · government fee line, Bill to

**Proposed to move:**
- Payment plans and automatic dunning
- FX / reporting currency
- Trust-funds tag
- Accounting export
- Firm financial dashboard (Release 2 in phasing already)
- Paid-consult invoice (only if AG-04 paid consults move)
- Missed-webhook poll and other hardening
- (already deferred) Refunds, credit notes, QuickBooks / Xero

## AG-07 Cases & clients
**Stays:** create case, rules version pinned · applicants (principal + family) · computed steps · document checklist (Binder) · forms per case, uploaded or staff-prepared, with approval record · submission with warnings · milestones, decision, closure · lead RCIC + case officer · timeline, audit, isolation · portal hand-off · **clients:** record, Add client, edit, visibility **[today]** · client list + screen with Cases and Portal panels **[today]** · LMIA government steps + corporate panels · duplicate check, "Save and invite", "+ New client" **[today]** · contacts and roles, notes and tasks on client · internal review · reuse prospect documents · government fees list · withdraw, after-decision, reopen · staff handover · My Cases queue · case link + "Create work permit case"

**Proposed to move:**
- **Form auto-fill engine (the Filler)** — biggest build cost; staff fill IMM forms and upload them
- Deficiency library, auto-detect rules, readiness score, Checker
- Four-eyes and licence-aware form approval **[F]** — only matters once auto-fill exists
- Several filings per case, the case board
- Evidence bundle, decision correction, shareable copies, Bill to, rule-based routing, SLA clocks, multi-currency
- Client screen extras: Family, Billing, Documents panels, worker links, client export **[today]**
- Imported-case rules (follow AG-18's decision)
- (drop) Manual board placement · client count tiles · "share new version?" prompt

## AG-08 Questionnaire
**Stays:** client wizard (autosave, resume, submit) · public endpoint hardening · answers mapped to profile with source · pack-provided questionnaires · version pinning · conditional questions (written in the pack) · lock + targeted re-open · manual verify against a document · English / French + accessibility · document items inside the questionnaire · employer questionnaire saved to employer profile · completeness + email reminder · imported values marked unverified · Reader approval (ships switched off) · family section on the principal's questionnaire

**Proposed to move:**
- Firm questionnaire builder (pack content is enough)
- "Upstream changed" tracking for firm copies
- Separate questionnaire per family member + cross-checks
- WhatsApp invitations
- Checker mismatch warnings
- (drop) Spouse-private answers, partial submit, entitlement tiers (open questions only)

## AG-09 Documents
**Stays:** upload, versions · request from client, reject with reason · status and checklist · virus scan · private storage, permissions · preview + audit · retainer and signed copy filed · prospect documents carried to case · document type picker · who-opened log + file hash · translation / notarisation / expiry flags · bulk request, auto re-request, multi-file drop · shareable copy to worker case

**Proposed to move:**
- Retention / disposal engine and legal hold (no file hits retention for years)
- Reader AI — classify and extract **[F]** (ships switched off anyway)
- Reader letter deadlines and imported-document review **[F]**
- Annotations ("reject with reason" covers it)
- Same-client links, "new version" and "earlier file" offers
- Bulk mapper, multi-page camera assembly, storage-vendor abstraction, cache
- (drop) Language-test / ECA extraction · per-firm encryption keys

## AG-10 Communication
**Stays:** outbound email through the firm's mail · timeline per record · portal chat (one conversation per client) · templates by language · email consent check (CASL) · secure webhooks · in-app notifications · one send path with "Not started" and "never send imported" guards · bounce handling · email notifications on/off · quiet hours, scheduled send · attachments · simple case tag on messages

**Proposed to move:**
- Mailbox connection (Gmail / M365 / IMAP) + Unmatched inbox **[F]**
- Sorter AI **[F]**
- Drafter AI and AI-text approval **[F]**
- Supervision of unlicensed staff's messages **[F]**
- WhatsApp inbound **[F]**
- WhatsApp outbound, preferred channel, "Create lead" **[F]**
- Agent inbox polish (folders, snooze, labels), open/click tracking, analytics, export
- (drop) Multi-country consent rules · template A/B tests

## AG-11 Automation
**Stays:** deadline reminders (the Minder) · automation engine · no double-sends, retry · send-time safety (consent, no blank placeholders) · correct timezone · imported clients stay quiet · 4 starter recipes: e-sign → onboarding, missing-document chase, speed-to-lead, document-received + review task · deadline escalation (opt-in) · send limits, loop guard · failed-run list · run history · chase timing setting · French message versions · "how many messages will go" count before starting imported clients

**Proposed to move (almost all [F], decided 4–5 Oct):**
- Full dry-run / simulation engine
- 5 extra recipes (biometrics countdown, PR-card expiry, no-show, going-cold, post-consult) — the Minder already reminds staff
- "Needs you" inbox + "Done for you" home screen
- Autonomy levels on every action (Auto / Ask me / Off) — on/off per recipe is enough
- Team safeguards (four parts, auto-on at 5 staff)
- Licence-aware approval, supervised messages
- "Review your standard messages" screen — instead, client messages stay off until the firm switches each recipe on
- The 4 AI Doers and their release gate (ship switched off anyway)
- AI-only triggers
- WhatsApp
- Editable approval waiting times, versioning/diff, health dashboards, at-risk marks
- (already Release 2) Visual builder, firm-written recipes, SMS

## AG-12 Templates
**Stays:** firm template overrides pack default · simple adopt (copy, edit, publish) · safe renderer · variable list + "unknown variable" check · draft / publish · preview with sample data · English / French bodies · publish guards · separate publish permission · email templates · firm-timezone dates

**Proposed to move:**
- Version history / rollback screen
- Archive, "used by" tracking
- Side-by-side bilingual editor, variable picker
- 3-way diff / re-sync with pack (Release 2 in phasing already)
- "Pack updated" badge, fast-forward, bulk adopt
- Preview with a real record, cache
- (drop) SMS / WhatsApp templates here, A/B, drag-and-drop builder, auto-translation

*Note: AG-12 is still the 28 Aug version and needs updating before build.*

## AG-13 Tasks, notes, audit
**Stays:** tasks · My Tasks · data isolation (and the note-edit security fix) · internal vs client-visible notes · plain notes · audit (append-only, viewer) · deadline → task · Unassigned list · reminder engine · handover, bulk reassign · reminders staff set themselves · audit kept forever (fixed floor) · one simple timeline per record (shared with AG-10)

**Proposed to move:**
- Timeline extras (registry, filter chips, portal timeline)
- Tamper-evident hash chain + verifier
- Overdue escalation to managers *(conflicts with AG-11 — needs a decision)*
- Rich text, @mentions, snooze
- Subtasks, task templates, timer
- (drop) Note pin · live start/stop timer

## AG-14 Reporting
**Stays:** secure data scoping · leads by stage + conversion · open cases by stage · collected vs billed + overdue invoices · upcoming and missed deadlines · two dashboards (Owner, Staff) · per-currency totals · CSV export (audited) · tile opens the matching list · invoice aging · database-side queries

**Already moved [today]:** scheduled reports by email

**Proposed to move:**
- Rollup engine, cache, nightly reconcile
- FX conversion
- Four extra dashboards (Manager, Officer, Accounts, Compliance)
- Source ROI, leaderboard
- Stage durations, SLA, productivity metrics
- Saved views, segmenter, plan gating
- (drop) Forecast vs quota · audit-volume tile

## AG-15 Portal management (firm side)
**Stays:** invite, activate, access state · revoke, force logout · visibility switches + portal on/off · internal step → client label · work items (documents, questionnaire, invoice, agreement) · done on behalf · employer primary contact · basic branding · messaging · audit, several devices · suspend / restore · English / French · per-client "last seen" + manual nudge

**Proposed to move:**
- Stall dashboard, auto-nudges, rollups (Release 2 in phasing already)
- Live "what client sees" preview, per-step visibility
- Access-log viewer, anomaly alerts, client MFA, portal policy screen
- (already Release 2) Custom domain, extra employer seats

*Note: the 5-minute activation link needs fixing — too short for an emailed invite.*

## AG-16 Firm settings
**Stays:** firm profile · invoice settings · firm's own Stripe · language, timezone, branding, audited settings · firm mail (SMTP, Gmail / M365) with platform fallback · staff two-factor, audit viewer, PIPEDA data package · notification defaults · supervised messages + standard-messages confirm (only if AG-11 keeps them) · Individual / Corporate switch, four-eyes rule

**Proposed to move:**
- Notification matrix, quiet hours, escalation settings
- Bulk data export (Release 2 in phasing already)
- Calendar connection, IMAP, connection health history
- AI settings **[F]**, Team safeguards screen **[F]**, WhatsApp setup **[F]**
- ~~Session policy~~ (withdrawn 8 Oct — AG1-D20) · IP allowlist, plan view, FX, timing settings, favicon / banner
- (drop) Self-service upgrade · scheduled exports

## AG-17 LMIA
**Stays:** employer client · LMIA file + positions · wage check, stream · Canada pack, rules pinned · steps and "what's next" · candidate log · advertising channels, clock, warnings · readiness, waive with reason · submission, decision, withdraw, re-apply · validity clock via Minder · worker hand-off ("Create work permit case") · retainer check · audit, timeline · staff do employer items on their behalf · pre-filing and onboarding questionnaires · wage/hours/location consistency check · sign-off record · recruitment report generator · government fee · refusal-area / low-wage cap checks · job offer from template · copy from previous LMIA **[F]** · LMIA list with filters · permit expiry reminders, plan limit

**Proposed to move (most [F]):**
- After-approval tab and change requests — biggest item in the module
- Inspection pack
- Quick LMIA check on prospects
- CSV candidate import, filing summary
- Board mechanics (drag forward, "placed manually")
- Automatic "change stream"
- Corporate view toggle, full corporate panel set
- Employer portal items, position counts **[today]**
- Request outstanding items, ad cost as expense, decision correction, worker drop-out
- (drop) Separate consistency entity · duplicate-worker warning

*Bigger risk than any feature: the SA-01B row-and-line model AG-17 needs has no date and no owner.*

## AG-18 Import
**Stays:** import engine (CSV / Excel, mapping, validation, scan) · mandatory dry-run · clients (people, employers) + merge · open cases + program mapping · key dates → deadline reminders · imported clients "Not started" + Start · imported values marked unverified · owner attestation · documents (files / zip / manifest) + manual review list · "Verify imported values" · notes import · lead import · saved mappings + Officio adapter (only with a real export sample) · simple undo

**Proposed to move (most [F]):**
- Full switch-on controls (preview by recipe, pause, licensed approval, 7/30-day reminders)
- Reader AI filing of documents **[F]**
- Closed cases as summary records
- Correspondence history import **[F]**
- CaseEasy adapter **[F]**
- Assisted migration by Expat Ready staff **[F]**
- Past-dates dialog, near-match suggestions
- (drop) Imported consent kept as evidence

## CP-01 Client portal (what the client sees)
**Stays:** login, activate, reset, security · several devices · home + case view · to-dos · document upload · questionnaire · signing hand-off · pay, receipts, offline instructions · messages · employer view · branding, accessibility, audit · language picker · family read-only · change password · employer position counts **[today]**

**Proposed to move:**
- Profile self-edit (phone, address, language) **[today]** — a message to the officer does the job
- "My devices" screen
- Language switch inside the questionnaire
- Client two-factor login
- (drop) Client statement · "What's new"

---

## Questions only you can answer (one line each)
1. Does any launch firm serve **Quebec** clients? If yes, English / French is a Must everywhere.
2. **Online card payment** in Release 1, or offline payment only (cheque / e-transfer, staff mark paid)?
3. **Two-factor login** default — required for everyone, admins only, or optional?
4. How many **role templates** at launch — 3–4 or 6?
5. **Overdue escalation**: AG-13 says off by default; AG-11 says on from 5 staff. Which?

## Biggest savings if all proposals were accepted
1. AG-11 approval / governance layer + AI Doers + WhatsApp (across AG-09, 10, 11, 16)
2. AG-07 form auto-fill engine + deficiency library
3. AG-17 after-approval tab + inspection pack
4. AG-14 rollup engine + extra dashboards
5. AG-02 dashboard / forecast / routing / scoring
