# AG-02 and programme decisions — 2026-10-11

Decided by the product owner in a planning session (Claude Code), walking AG-02 v1.9 feature by feature. These decisions are **not yet applied** to AG-02 v1.9 or to the other specs named under knock-ons. They are the input for the next AG-02 version, the AG-07 walk-through and the SA-01B design.

Code baseline at the time: backend `ERv2-sanitized` dev @ `fc4e4436` (contracts 0.45.0), frontend `ERv2-frontend` dev @ `8511b27e`.

## Governing principle

Release 1 is a full-fledged system for a firm's day-to-day work. Only wish-list items go to Release 2. When in doubt, ask the product owner (recorded in the workspace `CLAUDE.md`).

## Programme decisions

| # | Decision | Affects |
|---|---|---|
| P1 | **Reshape the in-flight AG-07 client branch** (`feat/ag07-p0-client`, `feat/ag-07-p0-clients`) to the shared spine model below before it merges. Permission keys become `agent/client:*` (not `agent/party:*`). | AG-07 branches (owner: the case-core developer) |
| P2 | **Contract-first sequencing.** Phase 0 fixes the shared identity spine and writes the SA-01B consumer contracts. Then three tracks: AG-02 core; AG-07 clients then AG-07 case core on the contracts; SA-01B rebuild behind the same contracts. **AG-07 does not depend on AG-02** — clients can be created manually or by import; AG-02 convert is one entry path. Only the spine (Party / Contact / client) must be shared. | Build order |
| P3 | **Pack pinning is per filing, with governing dates.** Each filing pins the pack version current when it opens; within a filing, forms resolve by intended submission date, fees by payment date, eligibility by assessment/invitation date. One-click adopt, no reason (as AG17-D65). | Supersedes AG17-D65 per-case pin; AG-07, AG-17, SA-01 (SA1-D3, SA-1-58), SA-01B; code `PackWorkPin` (unique key and purpose) |

## AG-02 decisions

| Area (AG-02 v1.9) | Decision |
|---|---|
| §3.0 identity fields | Three-way split. `PartyProfile` = display identity (first/last name, legal/operating name, business number, logo). `Contact` = channels (email, phone + phoneRegion), language, consent, lifecycleStage, tags, owner, clientCode, office. DOB, gender, citizenship, family etc. = `ClientCanonicalAnswer` (ADR C2-D4). |
| §3.0 programme interest | Multi-valued intent (list of programme keys at any tree level) with an optional primary; the single leaf is fixed only when a case opens. Matches SA-1B-77. Replaces §7's single `pathwayNodeId/programId/categoryId/subCategoryId`. |
| §3.0 owners | `Contact.ownerUserId` and `fileOwnerUserId` merge into one "responsible staff member" field — defaults to the first deal's owner, labelled "File owner" at client stage, drives AG7-D5 visibility. Deal owner (`Prospect.ownerUserId`) and case team stay separate. |
| §3.1 capture sources (R1) | Manual + ⌘K; booking (AG-04); referral with optional link to an existing contact/client; web form with UTM/click-ID capture and multiple languages; CSV lead import via the AG-18 engine; **inbound API keys**; **NEW: "Create lead" from an unmatched inbound email** in the AG-10 Unmatched inbox. WhatsApp "Create lead" follows the AG-10 WhatsApp decision. |
| §3.1 web form | Short lead form (lead-flagged pack fields) — the speed-to-lead acknowledgement then sends the **PQR link** (save & resume, pre-filled from the lead form). Answers save as canonical answers and run the assessment. Before pack content exists the form shows firm fields only. |
| §3.1 eligibility result visibility | Staff only in R1; never shown to the inquirer. |
| §3.2 duplicates | At capture a soft note ("This email is already used by X — same person?"): yes → new lead on the existing person; no → new person, choice remembered. Different names default to "different person". **Never merge at capture.** One shared check in the spine, used by AG-02 capture, AG-07 Add client and AG-18 import. |
| §3.2 merge | **No merge tool in R1.** AG-2-15/16 move to R2. ID-based matching (UCI, passport) R2. |
| §3.3 lead screen | Panels and action buttons appear as their module goes live (no "coming soon" buttons). **Staff can fill/correct the immigration profile on the lead**; every value records its source (prospect / staff / import) and the assessment re-runs. |
| §3.4 auto-advance | Real events move a card **forward only**: logged call/email → Contacted; consult booked → Consult; retainer sent → Retainer Sent; signed → WON. Manual drag still allowed. Each auto-move shows its cause on the timeline. |
| §3.5 WON guard | By event, not stage key: WON only from a real signature or a permissioned "signed offline" with reason, from any ACTIVE stage. Closes §13 Q9. |
| §3.5 status model | Spec as written (`OPEN / CONVERTED`; lost/nurture read from stage kind). Rule to be stated in the spec: every "open leads" query excludes LOST and NURTURE stage kinds. |
| §3.4 board features (R1) | Configurable stages (rename/add/remove/reorder; kinds fixed), bulk actions, saved views, WIP limits. |
| §3.6 automation | Minimal AG-11 engine, **templates only**: event trigger → scheduled steps → actions (task, template email, stage), per-recipient consent check at send, quiet ("Not started") skip, language selection, auto-exit on reply/booking/stage. No AI-written messages, so no Needs-you approval queue, autonomy levels or supervision in R1. |
| §3.6 speed-to-lead | Acknowledgement includes the PQR link. |
| §3.6 sequences (R1) | All four: speed-to-lead (on by default), no-show recovery, going-cold, post-consult (off by default). |
| §3.7 ranking | Verdict badge (likely eligible / close — missing X / not eligible) + simple ordering (eligible first, then recent activity, then overdue). No numeric score until the SME sets weights. |
| §3.7 next step | About six fixed readable rules (e.g. eligible & no consult → Book consult; consult done → Send proposal; proposal sent 5 days → Follow up; 7 days silent → Re-engage; not eligible → Nurture/Lost; PQR not completed in 3 days → Resend PQR). No AI. |
| §3.8 tasks | Basic tasks (create, assign, due date in business hours, complete, overdue) + My Day list + going-cold flag at 7 business days. Built with AG-02, shared with AG-07. |
| §3.9 dashboard | Funnel, leads by source/campaign, conversion rate and days-to-convert, time-in-stage, lost by reason, open pipeline per currency (no conversion), per-staff table. R2: weighted forecast, quotas/leaderboard, FX conversion, revenue per campaign (needs AG-06). |
| §3.10 nurture | Lead returns when it replies or updates its questionnaire, or reappears in My Day on a **"Nurture until" date with a reason**. No draw/CRS triggers (no draw data, SA1B-D20). |
| §3.11 becomes client | Automatically on signature (WON) — Contact becomes CLIENT, client code assigned, file owner = current owner — then prompt "Open a case?" (never auto-created). Manual "Convert to client" button for exceptions. |
| §3.11 history | Notes, calls, emails, documents are saved **on the person, tagged with the deal/case**. Nothing is moved at conversion; no profile copy (answers already live on the Party). Corporate convert still copies the deal's contacts and roles to the employer client. |
| §3.12 calls | Call log + `tel:` link: outcome (Connected, No answer, Left voicemail, Busy, Wrong number, Callback requested, Not in service), duration, note; "No answer" offers a callback task; first outbound call stops the speed-to-lead clock and moves the card to Contacted. Telephony provider and recording R2. |
| §3.13 routing | Full spec (fixed, round-robin, by-programme, by-source, chained, out-of-office skip with backup, Unassigned queue). By-programme uses the primary interest; blank falls through to the next rule. |
| §3.14 export | Current list to CSV/Excel, dashboard numbers, per-person privacy (PIPEDA) export. Check reuse of the existing `dsr-export.job.ts` at build planning. |

## Shared foundations AG-02 needs (absent in backend at baseline)

Minimal automation engine (AG-11) · firm email sending and inbound mailbox (AG-10) · firm message templates (AG-12) · tasks (AG-13) · consent check before send (`RailSendGate` not provided). AG-07 needs the same five; they belong in the build order ahead of both modules.

## Knock-ons (specs that must change)

- **AG-02 v1.9:** all rows above; remove `destinationCountry` redundancy review; resolve the internal contradictions listed in the session digest (Phase vs Release wording, §13 Q2/Q3 stale text, call-outcome lists, export formats).
- **AG-07:** client fields placement (P1, §3.0), owner merge, AG-7-73 uses the shared duplicate check, per-filing pin (P3).
- **AG-10 / AG-11:** AI Doers, Needs-you approval, autonomy levels and supervision move to R2.
- **AG-18:** no merge tool in R1 (import "fill empty fields" stays).
- **AG-01:** out-of-office status for routing; "Review your standard messages" in onboarding.
- **AG-03:** single verdict vocabulary and result format (see below); drop draw-cutoff band (SA1B-D20).
- **AG-17:** corporate convert under the new model; per-filing pin.
- **SA-01 / SA-01B:** per-filing pin; demand register below.

## SA-01B demand register (from AG-02)

1. Canonical fields carry a tier flag (lead / prospect / case); the short lead form = lead-tier fields.
2. PQR definition: unfolds by intent, sendable by link, save & resume, pre-filled from the lead form; an owner for running it.
3. One assessment result format: verdict, deciding rule, gap, missing-to-score, rules-as-of, pack version; must run on partial answers.
4. Intent is a multi-valued canonical field.
5. *(Spine, not SA-01B)* Canonical-answer save path with value provenance (prospect / staff / import).

## Open for the Immigration-SME

- Is the speed-to-lead acknowledgement CASL-transactional now that it carries the PQR link?
- No-guarantee wording for the eligibility verdict.
- Which lead-form fields are mandatory for a useful verdict.
- Business-hours and first-response defaults (§13 Q5).
