# Lead B — state and hand-over (P-557: always committed, always resumable)

**Current Lead B: Lead B (2), session `f68b2550…`, worktree `lead-b-2-front-office-1e7bc9`, from 14 Nov 07:56 IST.** Hand-over written 14 Nov 07:53 IST by Lead B (1) (session `local_9bced770…`) at ~52% context, per P-565. A fresh Lead B starts here, on branch `lead-b-front-office` (GitHub), in its own worktree. Do not run `/lead` (the release holder's skill).

## Who is who
* **Lead B** owns the new platform (firm sign-up, plans, subscriptions, staff sign-in and roles, walking skeleton) and front-office (enquiry → lead → prospect → booking → retainer → e-signature → payment) modules, all fenced (P-550, P-558). Writes rows and briefs on this branch; never edits `STATE.md`, `RULES.md`, `DECISIONS.md`, `BACKLOG.md`.
* **Release holder:** the current Lead (`tools/current-lead.sh`; Lead 39 `local_84c512dc…` until ~08:00 IST 14 Nov, then Lead 40). Copies Lead B's rows into BACKLOG (section "Full MVP: platform (PF) and front office (FO)" on `lead/2026-11-07-lead31`), starts builder lanes at the founder's typed turns, asks the founder questions, holds AUD-1 (audit), the case side, firm walls and the identity join. Earlier holders: Lead 37, Lead 38 (their rulings stand).

## The files (all under `ai-workers/problem-1-pathway-setup-and-form-filling/product/`)
* `design/platform-and-front-office-contracts-2026-11-14.md` — contracts, draft 4; **§7 is binding** and overrides earlier lines; §0.8 sizing (P-562).
* `design/lead-b-rows-2026-11-14.md` — the rows; **current: rev 5.1 + P-564 (e330ac8b)**, all copied into BACKLOG by the release holder.
* `design/lead-b-requirements-trace-2026-11-14.md` — register: §A followed by requirement, §B by the CICC Code, §C Lead B decisions, §D founder questions. Evidence: `design/lead-b-trace-2026-11-14/t1..t8`.
* `design/lead-b-briefs/PF-3.md`, `FO-1a.md`, `FO-1b.md` — builder briefs (paste-ready).
* `design/tech-gate-boldsign-residency-2026-11-14.md` (BoldSign Canada: documents/audit/signers in Toronto; its email, AI, ID check in the US → our own emails, no vendor AI/ID, no integrations); `design/tech-gate-atomic-crm-2026-11-14.md` (design reference only, no code copied — Lead 39 ruling). PF-2's own tool gate is on `main`: `design/tech-gate-platform-front-office-2026-11-14.md`.
* Concepts, both **approved by Lead B after a fresh challenge (P-223 (4))**: `screens/fo-4-sales/` (concept r2, board r2, challenge with Lead response) and `screens/pf-6-staff/` (concept r2, board r1, challenge with Lead response). The founder's half-hour look at both is still due (changes become follow-up rows).

## Rows and where each stands (rev 5.1)
| Row | What | State | Next |
|---|---|---|---|
| PF-1 | web module seam | **merged** (#1711) | — |
| PF-2 | tool gate | **merged** (#1712) | PF-2b residency done by Lead B (file above) |
| PF-7 | container + CI smoke | started by Lead 37's card (check its PR with the release holder) | — |
| PF-3 | platform tables + settings home + seed | **in flight: PR #1728** (holds the schema baton) | watch review; then start FO-1a + FO-1b |
| FO-1a / FO-1b | sales tables / booking tables | briefs written | start **side by side** after PF-3 merges (P-559 (3), Lead 38); FO-1a also fixes DEVELOPING.md's stale one-migration line |
| PF-4 | sign-in, roles, permission keys | **brief written** (`lead-b-briefs/PF-4.md`) | start when PF-3 merges (schema-free, so it may run beside FO-1a/1b) |
| PF-4b | staff reads, session, accept invitation, step-up, provider emails via MailPort | **brief written** (`lead-b-briefs/PF-4b.md`) | start when PF-4 merges; builder verifies 4 Cognito facts first (step 0) |
| PF-5 | sign-up + subscription (SA-04) | shaped; door per question 2 | brief after PF-4 |
| FO-2 / FO-2b | leads + Individual prospects API / Corporate | shaped | briefs after FO-1a |
| FO-3 | booking API (AG-04) | shaped | after FO-1b and FO-2 |
| FO-4 / FO-4b | sales screens / script embed | shaped (concept approved) | after FO-2 and PF-1 |
| FO-5 | retainers (AG-05 rules, FilesPort, docxtemplater) | shaped | after FO-1a, PF-4 |
| FO-5b | Code s. 24(3) checklist | waits on **question 4** | closes unbuilt if "no" |
| FO-6 | signing, vendor-neutral (+ P-564 email code) | shaped | after FO-5, PF-4 |
| FO-6v | BoldSign adapter, 4 conditions checked first | released by P-563 | after FO-6; needs the founder's BoldSign sandbox key for Lead B's one Mac check |
| PF-6 | staff screens (concept approved) | shaped | after PF-4b, PF-1; Security screen per **question 3** |
| Shaped next (no rows yet) | FO-3b paid consults (after FO-7) · FO-3c consultation agreement at booking (Code s. 23; after FO-6) · FO-5s retainer/signing screens (concept first) · FO-7 invoices/receipts/payments (AG-06; trust per **question 5**) · FO-8 `prospect.won` with the case side · PF-8 cloud deploy (founder's Canadian cloud account) · PF-9 firm set-up checklist and settings screen · PF-10 import with a dry run (AG-18) | | shape two ahead |

## Rulings received (all stand)
P-559 (App.tsx line; schema folder rule; P-335/P-357 amended for PF/FO) · P-560 (FO follows AG-02; `prospect.won`; a person opens the case) · Lead 37: one audit trail (`audit_event` + `AuditPort.record(tx,…)`, AUD-1, release holder's; no audit table in our modules); front office owns the lead/prospect/client activity timeline (read view); firm settings are platform's typed settings home; representative of record = Case Manager with a licence, no rename in case code (`user-R`) · Lead 38: FO-1a/1b side by side · Lead 39: Atomic CRM design reference only · founder 22:3x 13 Nov: Corporate pipeline and script embed in month one · **P-561** BoldSign on 4 conditions → **P-563** confirmed after stream 4's comparison · **P-562** size for ~100 Canadian firms (50 to start where it saves effort) · **P-564** email one-time code before signing, firm setting on by default · **P-565** sessions past ~half context hand over.

## Founder questions still open (release holder asks one at a time; detail and costs in the register §D)
2. **Sign-up:** private single-use link (SA-4-4, recommended now) vs open public page.
3. **Two-step (re-shaped):** Cognito sets it per user pool and has no recovery codes → (a) required for every firm (recommended, ~0 changes, deviation from AG-1-40) vs (b) AG-1-40 as written (~4-6 changes).
4. **Retainer:** non-blocking checklist from Code s. 24(3) (recommended) vs nothing (AG-05).
5. **Client money:** (b) per-client trust ledger, receipts, offline trust deposits; card only for invoiced fees; card into trust after counsel (recommended) vs (a) full AG-06 trust card account now.
Fold each answer into contracts §7 and the affected rows (PF-5; PF-4b/PF-6; FO-5b; FO-7), push, and tell the release holder.

## Next step for the fresh Lead B
1. Read this file, then contracts §7, then the rows file's latest sections.
2. Watch PR #1728 (PF-3) with the release holder; when it merges, ask for FO-1a and FO-1b to start from their briefs, and write the **PF-4** brief (then PF-4b, PF-5) two ahead.
3. Shape **FO-7** after question 5 and **FO-5s** (retainer/signing screens: concept first, skill screen-concept).
4. Commit and push this file at every change (P-557); times only from `TZ=Asia/Kolkata date`.

## In flight
| What | Session | Branch | PR |
|---|---|---|---|
| PF-3 platform tables | cloud builder (started by the release holder) | its own | #1728 |

## Log
* 13 Nov 22:25 IST: rows sent to Lead 37 (one line each, with four asks); delivered, not yet answered.
* 13 Nov 22:26 IST: at Lead 37's ask, read RULES (as of P-557) and AGENTS rules 9-10 from `lead/2026-11-07-lead31`; rows and contracts unchanged; RULES amendment ask (P-335/P-357) still open.
* 13 Nov 22:27 IST: P-559 folded into contracts (draft 2) and PF-3; Lead 37 told.
* 13 Nov 22:31 IST: contracts draft 3 + rows revision 2: front office follows the team requirement AG-02 (neutral lead; Engage makes a prospect; WON by signature, Signed offline or Convert; a person opens the case; payment not a WON condition); FO-1, FO-2, FO-3, FO-4 rewritten; `engagement.ready` replaced by `prospect.won` + `client.created`/`case.opened`. Lead 37 to re-copy.
* 13 Nov 22:34 IST: Lead 37 recorded P-560 (FO follows AG-02; amends P-559 (4)); FO-1..FO-4 re-copied from 242e1cb8; RULES as of P-560 (PF/FO exempt from the no-multi-tenant line); Lead 37 shapes the case-side row consuming `prospect.won` beside FO-8.
* 13 Nov 22:38 IST: founder (typed 22:3x, via Lead 37): "Let's build both and try to fit in" — Corporate pipeline and the script embed with campaign tracking both in month one. Lead B sized both (not very hard: embed ~3-4 changes <1 day off the critical path; Corporate ~8-12 changes ~1 day with a parallel lane, no AG-17 dependency); folding into FO-1a/1b, FO-2/2b, FO-4/4b with the trace.
* 13 Nov 22:47 IST: all 8 traces folded: register + contracts draft 4 + rows rev 3; FO-4 concept r2 approved after the challenge (2 Blockers, 7 Majors fixed). Founder questions (5) and row changes sent to Lead 37.
* 13 Nov 22:48 IST: Lead 37 ruling (audit one trail on `audit_event`/AUD-1; timeline front office; settings platform) folded → rows rev 3.1, contracts §7; Lead 37 handed over to Lead 38; package sent to Lead 38.
* 13 Nov 22:50 IST: Lead 38 copied rev 3.1 into BACKLOG; asking the founder question 1 (signing). Added to PF-2 and contracts §7: BoldSign only with Canadian data residency confirmed at source (team RFP l.243).
* 13 Nov 22:52 IST: PF-2b done by Lead B from the Mac: BoldSign CA region keeps documents, audit, signer data in Toronto; its emails, AI and ID verification run in the US → usable only with our own emails (MailPort/SES CA), no vendor AI or ID check (`design/tech-gate-boldsign-residency-2026-11-14.md`).
* 14 Nov 01:22 IST: DB-SPLIT #1709 and PF-1 #1711 merged (~01:1x). PF-3 brief written: `design/lead-b-briefs/PF-3.md` (schema folder `prisma/schema/platform.prisma`; no audit table; demo reset must pass). Lead 38 starts its cloud lane at the founder's next typed turn; PF-3 holds the schema baton.
* 14 Nov 01:22 IST: FO-1a and FO-1b briefs written (`design/lead-b-briefs/`), ready for after PF-3 merges; parallel vs serial waits on Lead 38 (DEVELOPING one-migration rule vs P-559 (2)).
* 14 Nov 01:23 IST: Lead 38 ruling: FO-1a and FO-1b side by side after PF-3 (P-559 (3), P-228); FO-1a also fixes DEVELOPING.md line ~29. Briefs and FO-1a touch list updated.
* 14 Nov 05:21 IST: release holder is now Lead 39 (`local_84c512dc…`). Open with it: founder question 1 (signing) and 2-5; PF-3 lane to start at the founder's typed turn (brief `lead-b-briefs/PF-3.md`); FO-1a/1b after PF-3, side by side; FO-1a touch list re-copy.
* 14 Nov 05:23 IST: Lead 39 confirms: FO-1a touch list already in BACKLOG; question 1 (signing) with the founder, away overnight; Lead 39 forwards his answer word for word, then asks 2-5; PF-3 lane at his next typed turn. Lead B idle until then (no work waiting; rows ready ahead: PF-3, FO-1a, FO-1b briefed; PF-4, PF-5, FO-2, FO-2b, FO-3, FO-4, FO-4b shaped).
* 14 Nov 07:08 IST: P-561 (founder: BoldSign on 4 conditions). Rows rev 4: FO-5 (retainers, FilesPort, docxtemplater), FO-5b (Code s.24 checklist, waits on Q4), FO-6 (SigningPort + BoldSign, conditions checked first; Mac sandbox check by Lead B), PF-6 (staff screens, concept next). Contracts §7 updated (P-561; D-6 dropped per AG-5-61).
* 14 Nov 07:10 IST: PF-6 concept r1 + board pushed (0687eefd); fresh challenger running. Rows rev 4 sent to Lead 39.
* 14 Nov 07:10 IST: Lead 39: founder wants the vendor re-checked (FO-5r: platform vs per-firm accounts, the team's own signer, paid product). Rows rev 4.1: FO-6 vendor-neutral (fake adapter only); vendor adapter held as FO-6v.
* 14 Nov 07:11 IST: Lead 39: rev 4 copied; FO-6 waits on FO-5r; the email one-time code is an open founder point (P-561 (3) vs AG-5-61 r13), kept in contracts §7 and FO-6 (built behind a setting).
* 14 Nov 07:12 IST: Lead 39 copied FO-6 (rev 4.1) and FO-6v from d81baea2; the per-account question is inside FO-5r.
* 14 Nov 07:19 IST: PF-6 challenge (2 Blockers, 9 Majors) answered; concept r2 approved (P-223 (4)); rows rev 5: PF-4b (staff reads, session, accept invitation, step-up, provider email via MailPort) and PF-6 rewritten; founder Q3 reframed with Cognito's per-pool limit: (a) required for all (recommended) vs (b) AG-1-40 as written.
* 14 Nov 07:20 IST: Lead 39 copied rev 5 (PF-4b, PF-6). Founder questions queued after FO-5r, in order: P-561 confirm/amend, email code, Q2, Q3 (a/b), Q4, Q5. Team legacy e-signer: no tests, image-only, no seal (AG-05: do not copy).
* 14 Nov 07:26 IST: P-562 (size for ~100 firms; 50 to start where it saves effort) added to contracts §0.8; no PF/FO row assumed more (checked). P-561 waits on stream 4's open-source vs own-build comparison (~09:45 IST); FO-6v held; FO-6 unaffected.
* 14 Nov 07:48 IST: P-563 (BoldSign confirmed) → FO-6v released (waits on FO-6 and the sandbox key). Atomic CRM weighed (`tech-gate-atomic-crm-2026-11-14.md`): lift presentational pieces only into FO-4 (~5-8 changes saved, not 20-25; no ra-core/Supabase); FO-2 unchanged; licence-notice rule asked of Lead 39. Rows rev 5.1.
* 14 Nov 07:49 IST: Lead 39 ruling: Atomic CRM is a design reference only (no code copied, no licence file); FO-4 row and tech-gate note aligned.
* 14 Nov 07:50 IST: P-564 (email one-time code before signing, firm setting on by default) folded into contracts §7 and FO-6. Q2 (sign-up link) goes to the founder next.
* 14 Nov 07:53 IST: hand-over written (P-565); Lead B stops.
* 14 Nov 07:56 IST: Lead B (2) (session `f68b2550…`, worktree `lead-b-2-front-office-1e7bc9`) took over from 851ebfd6 at Lead 40's go; read this file + RULES (as of P-565). PF-3 #1728 approved at c5ba30f8, waits on the release holder's P-423 diff read and label. Next: PF-4 brief.
* 14 Nov 07:57 IST: PF-4 brief written (`lead-b-briefs/PF-4.md`): API only, no schema, so it can start beside FO-1a/1b once PF-3 merges; two-step switch built with a `PLATFORM_POOL_MFA_REQUIRED` flag so question 3 changes config, not code. Rows file: brief rules now point to the current Lead and this file, not a session id.
* 14 Nov 07:58 IST: PF-4b brief written (`lead-b-briefs/PF-4b.md`); step 0 checks the four Cognito facts at AWS's docs before code. Next: FO-5s concept (skill screen-concept).
* 14 Nov 07:59 IST: FO-5s concept drafting started (in-process Opus drafter → `screens/fo-5s-retainer-signing/concept-draft.md` + `design/board.html`); then a fresh challenger, then Lead B approval (P-223 (4)). If this session ends first, a fresh Lead B re-runs the draft from the skill screen-concept.
