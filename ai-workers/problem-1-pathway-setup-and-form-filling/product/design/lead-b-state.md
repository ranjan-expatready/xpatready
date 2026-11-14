# Lead B — state (P-557: always committed, always resumable)

Lead B = the second tech lead for the full-fledged MVP build (P-550, P-558). Session `local_9bced770…` (local, own worktree), branch on GitHub: `lead-b-front-office`. Release holder and shared records: **Lead 39** (`local_84c512dc-855e-4e49-ad8b-5d861c11713b`) since ~01:xx IST 14 Nov (after Lead 38, `local_fac27a00…`, and Lead 37, `local_c795de7f…`, whose rulings stand) (took over from Lead 37, `local_c795de7f…`, whose rulings stand). Lead B never edits `STATE.md`, `RULES.md`, `DECISIONS.md`, `BACKLOG.md`; it writes rows to `lead-b-rows-2026-11-14.md` and the release holder copies them.

**Owns:** platform (firm sign-up, plans, subscriptions, sign-in and roles, walking skeleton) and front office (enquiry → lead → pipeline → booking → retainer → e-sign → payment), all in new fenced modules.

## What is true (updated 14 Nov 07:10 IST)
* Contracts **draft 4** (`design/platform-and-front-office-contracts-2026-11-14.md`; §7 binding, from the requirements trace).
* Requirements trace register `design/lead-b-requirements-trace-2026-11-14.md` + evidence `design/lead-b-trace-2026-11-14/t1..t8` (AG-01/02/04/05/06/13/16/18, SA-02/03/04/06/07/11, CICC Code SOR/2022-128).
* Rows **rev 3** (`design/lead-b-rows-2026-11-14.md`): PF-1, PF-2, PF-3, PF-4, PF-5, PF-7, FO-1a, FO-1b, FO-2, FO-2b, FO-3, FO-4, FO-4b. Lead 37 holds BACKLOG (last copied from 242e1cb8 = rev 2; rev 3 sent for re-copy).
* FO-4 concept **r2 approved** by Lead B after the fresh challenge (P-223 (4)); `screens/fo-4-sales/` (concept, board r2, challenge with Lead response).
* Rulings from Lead 37: P-559 (App.tsx line OK, PF-7 OK, schema folder rule, P-335/P-357 amended), P-560 (FO follows AG-02; `prospect.won`), representative-of-record mapping (Case Manager + licence, no rename in case code).
* Founder (22:3x, via Lead 37): Corporate pipeline and script embed in month one.
* Lead 37's ruling (14 Nov) folded as rows **rev 3.1**: one audit trail (`audit_event` + `AuditPort`, AUD-1, release holder's); front office owns the lead/prospect/client activity timeline; typed firm settings home in PF-3.
* No builder lanes, no PRs. PF-1, PF-2, PF-7 wait on the founder's click on Lead 37's cards.

## In flight
| What | Session | Branch | PR |
|---|---|---|---|
| (none) | | | |

## Next step
1. Lead 39 asks the founder the five questions in the register §D, one at a time; fold each answer into contracts §7 and rows (FO-6 signer, PF-5 door, PF-4 switch default, FO-5 checklist, FO-7 trust).
2. Shape the next two ahead: FO-5 (retainer), FO-6 (signing) once question 1 is answered; FO-7 after question 5; PF-6 staff screens (concept first).
3. When builders run: review each PF/FO PR's diff for money, schema, permissions (P-423 is Lead 37's label read).

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
