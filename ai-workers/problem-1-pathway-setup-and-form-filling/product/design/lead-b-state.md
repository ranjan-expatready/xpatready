# Lead B — state (P-557: always committed, always resumable)

Lead B = the second tech lead for the full-fledged MVP build (P-550, P-558). Session `local_9bced770…` (local, own worktree), branch on GitHub: `lead-b-front-office`. Release holder and shared records: **Lead 37** (`local_c795de7f-f5fd-4aa2-99d7-04f1e78d3eb4`). Lead B never edits `STATE.md`, `RULES.md`, `DECISIONS.md`, `BACKLOG.md`; it writes rows to `lead-b-rows-2026-11-14.md` and Lead 37 copies them.

**Owns:** platform (firm sign-up, plans, subscriptions, sign-in and roles, walking skeleton) and front office (enquiry → lead → pipeline → booking → retainer → e-sign → payment), all in new fenced modules.

## What is true (updated 13 Nov 22:37 IST)
* Module contracts, draft 1: `design/platform-and-front-office-contracts-2026-11-14.md` (pushed).
* Rows: 10 ready rows (PF-1, PF-2, PF-3, PF-4, PF-5, PF-7, FO-1, FO-2, FO-3, FO-4) in `design/lead-b-rows-2026-11-14.md` (pushed); start now: PF-1, PF-2, PF-7 (with Lead 37's OKs); the rest wait on DB-SPLIT or each other.
* All 10 rows in BACKLOG (Lead 37, section "Full MVP: platform (PF) and front office (FO)"); rulings P-559: PF-1 App.tsx line OK, PF-7 OK (workflow diff read before label), schema folder rule, P-335/P-357 amended for PF/FO, engagement.ready accepted with one firm identity + canonical answer keys (contracts draft 2, PF-3 amended). No builder lanes, no PRs yet.

## In flight
| What | Session | Branch | PR |
|---|---|---|---|
| Requirements trace (Lead 37 ask, AGENTS rule 2): 7 read-only Sonnet tracers (AG-01+SA-02 firms; SA-03+SA-04 plans/billing; SA-06+SA-07+AG-01 staff/roles; AG-04 booking; AG-05 retainer/e-sign; AG-06 payments; AG-13+AG-16+AG-18+SA-11 activity/settings/import) + 1 regulator-texts researcher (CICC retainer contents, client account rules); outputs in Lead B's scratchpad `trace/t1..t8`, folded into a repo file `design/lead-b-requirements-trace-2026-11-14.md` | Lead B subagents | `lead-b-front-office` | none |
| FO-4 concept: fresh challenge (independent agent, in-process subagent of Lead B) → writes `screens/fo-4-sales/challenge.md` | Lead B subagent | `lead-b-front-office` | none |

## Next step
0. Fold the eight traces into the contracts (draft 4), rows (rev 3) and a trace file; PF-3/FO-1 and later rows held from builders until then (Lead 37, 13 Nov); PF-1, PF-2, PF-7 unaffected. Then send Lead 37 the row changes.
1. FO-4: also cite AG-04; read `screens/fo-4-sales/challenge.md`, fix Blockers and Majors in `concept.md`, write the Lead response, approve (P-223 (4)), push, tell Lead 37. Concept draft 1 + board pushed (c8712aef).
2. PF-1, PF-2, PF-7 builders start when the founder clicks Lead 37's cards; D-1 to D-6 go to him one at a time later (Lead 37).

## Log
* 13 Nov 22:25 IST: rows sent to Lead 37 (one line each, with four asks); delivered, not yet answered.
* 13 Nov 22:26 IST: at Lead 37's ask, read RULES (as of P-557) and AGENTS rules 9-10 from `lead/2026-11-07-lead31`; rows and contracts unchanged; RULES amendment ask (P-335/P-357) still open.
* 13 Nov 22:27 IST: P-559 folded into contracts (draft 2) and PF-3; Lead 37 told.
* 13 Nov 22:31 IST: contracts draft 3 + rows revision 2: front office follows the team requirement AG-02 (neutral lead; Engage makes a prospect; WON by signature, Signed offline or Convert; a person opens the case; payment not a WON condition); FO-1, FO-2, FO-3, FO-4 rewritten; `engagement.ready` replaced by `prospect.won` + `client.created`/`case.opened`. Lead 37 to re-copy.
* 13 Nov 22:34 IST: Lead 37 recorded P-560 (FO follows AG-02; amends P-559 (4)); FO-1..FO-4 re-copied from 242e1cb8; RULES as of P-560 (PF/FO exempt from the no-multi-tenant line); Lead 37 shapes the case-side row consuming `prospect.won` beside FO-8.
