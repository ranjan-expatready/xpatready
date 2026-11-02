# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 03:25 UTC (morning close-out; the Lead keeps leading, hand-over later today, founder) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path · how we work: `WAY-OF-WORKING.md` (lean model P-224, amended by P-228) · row owners: top of `BACKLOG.md` · reports: `reports/night-2026-11-01-02.md` (v2), `reports/plan-24h-2026-11-02.md`

## Goals
* **Demo first (BACKLOG "Demo first"):** D1 Reset to the six (P-226) · D2 Live or Saved (P-227) · D3 Visitor visa Saved results, closes QA-144 · six-combination fixes (canada.ca check, about 70% coverage *estimate*).
* **Today (2 Nov):** qa scores the built rows (#405 merging); full run green (running since 03:12); #391 and #358 merge (two migrations, P-228); paid runs under P-225 with the Lead's Go; the 4 + 1 Majors get fixes (QA-144, QA-75, QA-76, QA-82, QA-149).
* **This week (*estimates*, night report v2 §C):** Visitor visa configured 4 Nov (plan 3 Nov) · case to application ready 6–7 Nov (plan 5 Nov) · M2 six combinations 8–9 Nov (plan 6 Nov) · M3 15 Nov or later.

## Progress (`tools/progress.sh` on main 54019473, 03:20 UTC)
M2 **34/56 Works** · 8 built, awaiting qa · 14 partial. R1 6/8 (C4.4 built; C7.2 evidence on the Mac). M3 1/16 · 3 built (C6.4, C6.12, C11.6) · 2 partial · 10 not built. qa's #405 (queued) moves 7 rows to Works. **27 PRs merged 1 Nov 19:20 → 2 Nov 03:20** (latest: #356 C6.12/C11.6 `/prepare` with the reworked migration, #398 c1116 red fix, #401 C4.11 minors). Batch failures 9% (0 since #382); approved→merged median 51 min. **AI spend: US$0** (P-225 allows US$20 a day; R-146 US$45 approved). **Weekly plan 73%** (resets 5 Nov 23:00 UTC). Lead context 49%.

## Sessions (builders answer in PR comments; they can't message the Lead, 401)
| Session | Now → next |
|---|---|
| runtime-3 (new) | #358 C7.3 bring-up → #357 → D1 Reset to the six → QA-149 → C6.4 storage → C8.2 |
| forms-1 | D3 paid runs (spend plan in its PR first; reuse p2, expected/, E1 at US$0) → D2 Live or Saved |
| forms-2 (new) | QA-75 → C3.6 → C11.14 → C11.13 Draft fields |
| screens-1 | QA-82 → six-combination sample fixes (Sponsor role, PNP Express Entry online, IMM 1283, IMM 5645 or 5707) → C11.12 after the board |
| evidence (Mac, new) | C7.2: the app's fill of IMM 5257 vs E1's 23 Oct Adobe proof |
| qa-night | M2 built rows (#405 open) |
| qa-m3 (new) | Visitor visa M3 rows as they merge |
| vv-runtime, runtime-2 | **stopped near 90% context**; Handovers on #358 and #391 → **two fresh runtime builders needed** (C6.9 parts 2–3, QA-76, T1; D4, C8.1); they start when the founder types in the desktop app |

## Migrations (P-228: two in flight when additive on different tables)
#391 C6.9 part 1 (SQL OK; main merged at 99eaea68, reviewer Approve; label when CI is green) ∥ #358 C7.3 (`20261102040000`, runtime-3; SQL read at "ready for label"). Next: C6.4 storage, C8.2, C8.1, C11.12.

## Fix first
* Full run started 03:12 UTC (all three red checks fixed: #394, #395, #398); judge by its conclusion.
* Still quarantined: `check_forms_c36_rule_facts_browser.cjs` (its fix row is open). #404's checks: watch `check_screen01_api.ts` "source-trust race" (failed once).

## Founder asks (P-228 (9): kept until answered or done)
| # | Ask (2 Nov) | Status | Owner |
|---|---|---|---|
| A1 | Honest end-to-end progress report | done (v2) | Lead |
| A2 | 24-hour plan, M3 prerequisites, parallel sessions | done; running | Lead |
| A3 | Reset to the six; saved AI results survive resets (P-226) | queued (D1) | runtime-3 |
| A4 | Live or Saved at every AI step (P-227) | after D3 | forms-1 |
| A5 | Visitor visa configured end to end with AI, saved for demos (D3, QA-144) | spend plan awaited | forms-1, Lead verifies |
| A6 | Six combinations checked against canada.ca and fixed | checked; fixes routed | screens-1 |
| A7 | Reuse earlier POCs before building | routed; C7.2 reuses E1 | all |
| A8 | Root causes of drift, with mitigations | answered; lead skill "Not drifting" | Lead |
| A9 | Fresh Lead session for the next 24 hours | later today | Lead |
| A10 | Morning report of spend and progress | today: US$0, 27 merges, 34/56 | Lead |

## Waiting for the founder
1. **Type in the desktop app** so the Lead can start two fresh runtime builders.
2. **C11.12 filing-modes board** (P-135, M3-0): the Lead drafts it for your early look.
3. **The immigration expert:** confirm Sample values (fees, the police certificate rule, spouse forms incl. IMM 5533 and IMM 5589, the Express Entry document list).
4. **Clean-up:** two stale 31 Oct copies (PRs #151, #165 merged); the safety check refused removing them.

## Follow-up rows to shape (Lead)
QA-145 part 2 → forms · C11.3 AI "did you mean" → forms after X6 · contract migration dropping `filing_item.form_key` · the stray C4.11 part 4a built file (removed by qa in #405) · re-check the VV-R01 quotes on canada.ca · TAXONOMY and the immigration-structure skill disagree with P-112 on spouse and PNP sub-categories (evidence favours P-112): update the skill.

## Lessons (night report v2 §8, lead skill "Not drifting")
Read the newest decisions word for word · every founder ask goes in the table above · one owner per table · tooling bugs look like flaky tests · start qa before the founder leaves · builders answer in PR comments.
