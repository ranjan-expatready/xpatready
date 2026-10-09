# B-index: Workstream 2 baseline, carve-out B (every Doer other than the Conductor and the four AI Doers)

**Reference index. The source documents remain the only source of truth.**

*Prepared 9 Oct 2026 by the requirements-cartographer for wave W2, step 1. Sources: `sources/drive-snapshot-2026-10-09/` (newest snapshot, 46 files) and the founders' June Doer specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/` (naming spec v1, 13 Jun; product IA Doers model v1, 14 Jun). The archive was not used. Carve-out A (the Conductor, the four AI Doers, approvals and autonomy, AI switch, provider and logging, FD-16/FD-20) is in the `A-*.md` files in this folder.*

## How these files work

- **Release labels (AIW-D21):** everything in the documents is assumed built, so no source "wins" for Workstream 2 design; conflicts are recorded exactly as found and go to the team as information.
- One file per Doer. Each opens with a two-to-three-sentence plain-English summary (what it is for, who uses it, which product it replaces per the founders' spec), then a table: Req ID · short identifying extract (at most 25 words, rule AIW-D22) · source file, version, section and line · release label as written · conflicts or overlaps. Each ends with "Gaps noticed".
- Extracts are word for word (bold, italics and code marks removed; "…" marks a cut). All 680 extracts were checked by a script against the cited source line, twice: once from the working data and once by re-reading the finished Markdown files. Result: 0 mismatches, 0 extracts over 25 words.
- "Release label as written" repeats the source's own words from the same line, or names the list heading and its line (for example "Stays in Release 1 (list heading, TRI L6)"). Where the line gives none it says "None stated". No release was inferred.
- Interpretation is labelled **Inferred**. Legal and immigration values carry "confirm with counsel" or "confirm with RCIC".

## The Doers in this carve-out

| File | Doer | Replaces (founders' spec) | Rows | Release status in one line (all sources disagree somewhere; details in the file) |
|---|---|---|---|---|
| [B-signer.md](B-signer.md) | Signer | DocuSign | 46 | Release 1 everywhere. FD-21 requires a one-time passcode before every signature; AG-05 v1.9 defers passcode identity checks to Release 2. |
| [B-scheduler.md](B-scheduler.md) | Scheduler | Calendly | 42 | Release 1 (AG-04). Paid consults, calendar sync, video connectors, analytics proposed for Release 2; in-house video room proposed for dropping, against FD-13. |
| [B-biller.md](B-biller.md) | Biller | QuickBooks / Stripe | 39 | Core invoicing Release 1. FD-17 puts "trust-aware light" in v1; AG-06 defers trust accounting; scope review proposes moving dunning, FX, trust tag, export. |
| [B-qualifier.md](B-qualifier.md) | Qualifier | none named (Tier 3, "scoring engine") | 41 | Core engine Release 1. Recommendations, override, PNP streams, client share, auto-assess proposed for Release 2. FD-20 review right not in AG-03. |
| [B-filler.md](B-filler.md) | Filler | none named (Tier 3, "form intelligence") | 41 | Most contested: AG-07 Release 1; SA1B-D28 and the Charter park/defer auto-fill; scope review proposes Release 2; FD-5 promises flattened fill in v1. |
| [B-binder.md](B-binder.md) | Binder | none named (Tier 3, "secure intake") | 27 | Release 1 everywhere. Status-model conflict: July = view over AG-09's 10 statuses; October AG-07 = its own 7. |
| [B-reviewer.md](B-reviewer.md) | Reviewer | none named (Tier 3, "error-catching") | 25 | Internal review Release 1. Deficiency Library, auto-detect, readiness score proposed for Release 2; AG-07 recommends keeping the library. July hard gate replaced by "never locks". |
| [B-minder.md](B-minder.md) | Minder | none named (Tier 3, "compliance") | 64 | October: "Minder core" Release 1, always on, every plan. Charter defers it and leaves "a simple deadline and expiry reminder" as an open founder decision. Escalation default unsettled (off vs on from 5 staff). |
| [B-reminder.md](B-reminder.md) | Reminder | sticky notes / manual | 37 | Ordinary reminders Release 1. FD-8 folds it into the Minder; October keeps it separate. WhatsApp reminders Release 1 (AG-11) vs Release 2 (AG-13). |
| [B-tasker.md](B-tasker.md) | Tasker | Asana / Monday | 42 | Tasks Release 1. Charter defers the Tasker as an automation Doer while keeping ordinary tasks. Overdue escalation off by default (AG-13) vs on from 5 staff (AG-11). |
| [B-mailer.md](B-mailer.md) | Mailer | Outlook / Mailchimp | 46 | Outbound email and mailbox connection Release 1; extra sequences Release 2; scope review proposes moving mailbox connection. |
| [B-messenger.md](B-messenger.md) | Messenger | Twilio / WhatsApp | 46 | October: portal chat and WhatsApp Release 1 (switched off until a provider is recorded), SMS Release 2. Charter defers SMS and WhatsApp; SA-08 says "Phase-3"; July Doc 3 says all channels in. |
| [B-dialer.md](B-dialer.md) | Dialer | Aircall | 32 | Manual call log Release 1; live click-to-call waits on a provider; scope review proposes dropping click-to-call. Absent from the October glossary. |
| [B-reporter.md](B-reporter.md) | Reporter | spreadsheets / PowerBI | 32 | Core snapshot Release 1; full dashboards and scheduled reports Release 2 (Phasing); scope review keeps two dashboards. |
| [B-finder.md](B-finder.md) | Finder | not in the founders' roster | 16 | Only in July Doc 1 / ADR / Doc 2 and one SA-06 permission row. No October release label. Doc 1 contradicts itself on foundation scope. |
| [B-clocker.md](B-clocker.md) | Clocker (also "Timer") | spec lists Timer as future, no product named | 26 | No October phasing line. Live timer is a requirement (AG-13-51), an open question (AG-13 Q8) and a drop proposal (TRI) at once. |
| [B-drafter-template.md](B-drafter-template.md) | Drafter, template-merge sense | none named (Tier 3, "doc generation") | 29 | Template drafting of retainers Release 1 (AG-05). The AI Drafter (carve-out A) is switched off and proposed for Release 2. |
| [B-recruiter.md](B-recruiter.md) | Recruiter | not in the founders' roster (Doc 2 / Doc 3 only) | 34 | Recruitment compliance is Release 1 inside the full LMIA (AG17-D51); the recruitment engine is Release 2; FD-7 fixes light-evidence scope. Doc 2 (enterprise, off) vs AG-17-1 (every plan). |
| [B-future-doers.md](B-future-doers.md) | Submitter, Reader (OCR history), Planner | none named | 15 | Submitter ruled out by the "submits nothing to an authority" floor; Reader moved from "OUT" (July) to an AI Doer (October, carve-out A); Planner only in the founders' spec. |
| | **Total** | | **680** | |

## The release picture across all Doers (facts, then one inference)

Five sources give release labels and they disagree: the Program Charter (V1 markdown and V2 slides) defers "the AG-11 automation engine and its Doers (… Minder, Tasker and Messenger …)", "SMS and WhatsApp" and "Government form auto-fill" (Charter V1 L121, L326–L330); the October module files (AG-01…AG-18) and Agent 99-Phasing v1.4 put a minimal Conductor, the Minder core, WhatsApp and most Doers in Release 1; SA-01B v1.2 and Shared 99-Phasing v2.14 park form auto-fill; SCOPE-TRIAGE (5 Oct) is "not a requirements document" (TRI L3) but proposes moving many Doer features to Release 2; July Doc 1–4 use a "full-scope freeze" in which most channels are "IN". Under AIW-D14 all of these belong to Workstream 2 regardless of label; the Charter conflict is reported, not followed. **Inferred:** the founder decisions most needed before W2 step 2 are the Filler release, the Minder in the Charter, FD-21 vs AG-05 and FD-17 vs AG-06 (all appended to `ai-workers/proposals.md`).

## Naming conflicts

| Conflict | What each source says | Where |
|---|---|---|
| **Minder / Reminder / Tasker** | RFP v2.0: Reminder "schedules and fires reminders", Minder "task creation and assignment", Tasker "workflow task automation". Founders' spec: Reminder "follow-ups + nudges", Minder "deadlines, status, audit trail", Tasker "tasks + assignments". FD-8 (ratified 3 Jul): "Reminder folds into Minder (one nudge identity…)"; Doc 2 has no reminder capability; Doc 3 "no separate 'Reminder' Doer". October AG-11, AG-13, Overview and Glossary keep four automation Doers: Reminder (client nudges, "speaks"), Minder (deadlines, "thinks"), Tasker (internal tasks, "does"), Messenger. | RFP L167; SPEC-N L63, L68, L82; FDL L33; Doc 2 L103; Doc 3 L6231; APHG L52; AG-11 L243; AG-13 L227 |
| **Clocker / Timer** | Founders' spec: future Doer "Timer". FD-8: "Clocker (time-tracking; not 'Timer')"; Doc 2 and Doc 3 follow it. October AG-13 v1.12 calls it "Timer" throughout. | SPEC-N L85; FDL L33; Doc 2 L88, L103; Doc 3 L6293; AG-13 L314, L395 |
| **Two Drafters** | Template engine for retainers and generated documents (AG-05 v1.9 §3.1–3.4, AG-09 §3.7, SA-06 `agent/retainer:draft`, Doc 2 `cap.drafter`). AI Doer that writes draft messages (AG11-D4, Agent Glossary "Drafter", Overview). The October glossary defines only the AI sense. | AG-05 L186; AG-09 L297; APHG L55; AG-11 L33; AOVW L177 |
| **"Scheduler" as a timed job** | AG-14 §3.9: "The Scheduler (cron) enqueues the run" for scheduled reports, unrelated to the booking Doer. | AG-14 L294 |
| **Filler: AI or not** | Doc 1, SA1B-D16 and the Agent Glossary: rule-based. AG-07 BR-23 lists "the Filler's auto-fill" among AI Doers. | Doc 1 L1329; SA-01B L40; APHG L52, L69; AG-07 L750 |
| **Missing from October lists** | Dialer, Finder and Recruiter are absent from the Agent Glossary (L52) and the Overview Doer list (L177); Finder's name is "pending adoption in the brand-naming spec" (Doc 2 L99); "Recruiter" is used only in July Doc 2/3/4 and FD-7, while October AG-17 v0.5 calls the same work "Recruitment compliance". | APHG L52; AOVW L177; Doc 2 L31, L91, L99 |

## Cross-cutting facts that matter for AI Workers (all from the rows; details in the files)

- **Human-only steps written into the requirements:** clients sign for themselves, staff never sign for a client (AG-5-39); the consultant approves a retainer for send (AG-5-17) and the firm countersigns (AG-5-27); every government form needs approval by a holder of `agent/case:form-approve` and never runs on timeout (AG-7-59); a date read from a letter reaches the Minder only after a person approves it (AG-09 BR-21, AG-11-108); "Create lead" from an unknown WhatsApp number is always a person's click (AG-10-58); critical deficiencies are passed only with a reason by a permission holder (AG-7-28); no Doer submits anything to a government authority (AG-11-54).
- **Licensed sign-off is not enforced:** countersign, form approval and deficiency waiver are permissions seeded on Owner and Case Manager, grantable to any role, with an Owner fallback (SA6-D2, SA6-D9). This matches review W1 finding B-3.
- **Audit is specified unevenly:** strong for the Signer (AG-5-29), Biller (AG-6-38), Filler approvals (AG-7-66) and Reporter exports (AG-14-29); thin for the Dialer, Reminder, Minder registrations and Finder queries. No Doer's audit requirement says how an action taken by a recipe is told apart from one taken by a person, beyond AG-11 run history.
- **Conductor triggers that call these Doers (Release 1 seeds per AG-11 L367–L372):** speed-to-lead (Mailer, Tasker), document-received acknowledgement + "Review document" task (Mailer, Tasker), missing-document chase (Mailer/Messenger, Reminder), e-sign → onboarding (prospect stage, Mailer); plus five more recipes (biometrics countdown and PR card / status expiry watch on by default; no-show, going-cold, post-consult off by default). Standard deadlines reach the Minder directly with no recipe.

## Deliberately left out, and why

| Left out | Reason |
|---|---|
| The Conductor (engine, triggers, recipes as such, Needs you, autonomy levels, Team safeguards, AI switch, provider, logging, FD-16, FD-20 in full) | Carve-out A by the wave brief. B rows cite these only where they define what a Doer does. |
| The four AI Doers (Reader, Sorter, AI Drafter, Checker) | Carve-out A. B keeps only the Reader's OCR history (B-future-doers) and the Drafter's template sense (B-drafter-template). |
| The Notification "Doer" (AG-11-2 `send_notification`) | Lead's ruling: a delivery primitive of the Conductor, so it belongs to carve-out A. |
| Doc 3 (July) rows for every AG FR that the October file repeats unchanged | Rule "where October and July disagree, record both": July rows were added where they differ (for example the Reviewer hard gate, Binder status model, Signer methods, Clocker live-run rules, Messenger channels). Identical repeats were not duplicated. |
| Code copies (`ERv2-*`, `expat-ready-*`) beyond the two founders' specs | The brief asked for requirements; code status appears only where an FR states it (for example AG-07 §12 on the built Filler engine). |
| `Program Charter_V2.pptx` as a cited row source | Binary file. Its slide and note text was extracted and matches Charter V1 lines used here (slide 1 and 4 "NOT IN RELEASE 1 … Automation engine (AG-11) and its Doers"; notes 1 "Release 1 … does not auto-fill government forms"). Charter V1 markdown lines are cited instead because they can be machine-checked. |

## Open questions for the Lead

1. Answered by the Lead: Recruiter added (B-recruiter.md); Notification stays in carve-out A.
2. Answered by the Lead (AIW-D21): no source wins; conflicts are recorded as information for the team.
3. Four decision proposals and one rule were appended to `ai-workers/proposals.md` (FD-21 vs AG-05, FD-17/FD-11 vs AG-06, one canonical Doer roster, Filler release; release-label quoting rule).
