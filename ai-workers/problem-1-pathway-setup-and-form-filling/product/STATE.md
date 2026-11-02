# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 02:55 UTC (Lead of the 1–2 Nov night, still running; this page is the safety net, not a hand-over) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path · how we work: `WAY-OF-WORKING.md` (lean model, P-224) · row owners: top of `BACKLOG.md` · night report: `reports/night-2026-11-01-02.md`

## Goals
* **Today (2 Nov):** qa scores the 11 built rows; #356, #398, #401 merge; full test run green again; paid replay trials decided (M2 critical path).
* **This week:** Visitor visa configured end to end (target 3 Nov: **at risk**, 177 release problems need AI drafting); Visitor visa case to application ready (5 Nov); M2 for six combinations (6 Nov, **at risk**).
* **M2 gate:** the content publisher walk on the six combinations (qa).

## Progress (`tools/progress.sh` on main 59d2da74, 02:35 UTC)
M2 **34/56 Works** · 8 built, awaiting qa · 14 partial. R1 6/8 (C4.4 built; C7.2 needs the Mac Adobe run). M3 1/16 · 2 built (C6.4, C6.12) · 3 partial · 10 not built. 24 PRs merged overnight; batch failures 9% (0 since #382); approved→merged median 51 min; AI spend US$0; weekly plan 72% (resets 5 Nov 23:00 UTC).

## Running sessions (cloud; they answer in PR comments, they cannot message the Lead: 401)
| Session | Now | Next |
|---|---|---|
| vv-runtime ("runtime: Visitor visa path…") | #356 queued (migration slot) | #358 C7.3 (migration) → #357 C7.7 part 1, both rebased in that order |
| runtime-2 ("runtime: #336…") | #391 C6.9 part 1 approved by the reviewer, waits for the slot | parts 2 and 3 per the 5 conditions on #391 (`FAIL_BEATS_MISSING = false` until the founder's Q3) |
| forms-1 ("forms: #319…") | #401 C4.11 part 4c Minors, approved | next forms row; paid replay trials only with a Lead "Go" in the PR (P-223 (3), cap US$20) |
| screens-1 ("screens: #331…") | #398 C11.16 red-main fix, approved, queued | next screens row (F1/F5 open items) |
| qa-night ("qa: after-merge…") | requested 02:45 | scores every `qa/built` row plus C11.3, C11.7; QA-73, QA-145 retests |

## Migration order (one in flight)
#356 (`20261102030000`, SQL read OK) → #358 → #357 → #391 (C6.9). The Lead reads each SQL before its label.

## Fix first
* **Full run red** (run 41365074483 on b1a662cd): c44 (#395 merged) and c119 (#394 merged) are fixed; c1116 fix #398 is queued. After it merges, run `gh workflow run nightly.yml --ref main` and judge by its conclusion. GitHub skipped the 21:00 UTC schedule on 1 Nov.
* Still quarantined: `check_forms_c36_rule_facts_browser.cjs` (C3.6 focus check; its fix row is open).

## Decisions waiting for the founder (detail in the night report §7)
1. Paid replay trials for the 8 M2 rows that need a recorded live answer (P-223 (3), cap US$20). Recommend yes.
2. C6.9 concept (approved overnight under P-223 (4)): Q1 disclaimer on the release (amends P-77 (2)), Q2 any staff may override or review in M3, Q3 fail vs missing (recommend "Not eligible, also needs …").
3. #357 m3: a derived Yes over a client's No shows as a check to the officer (recommend yes). m4 (step-children): the Lead cites canada.ca.
4. Move the full test run off GitHub's unreliable schedule (to GitHub machines or a Lead dispatch).
5. Permission to remove two stale 31 Oct copies (their PRs #151, #165 merged).

## Follow-up rows to shape (Lead)
QA-145 part 2 → forms (checks that write under `p1/inventory`, `p2/jobs`) · C11.3 AI "did you mean" → forms after X6 · C11.12 filing modes (P-135) → runtime (M3-0, migration, board) · contract migration dropping `filing_item.form_key` (after #356) · the stray `qa/built/C4.11-part4a.md` goes with C4.11's re-score · re-check the VV-R01 quotes on canada.ca (C6.9 gate labels stay Sample).

## Lessons of the night (detail: night report §8)
One owner per table · tooling bugs look like flaky tests (check `isolated.sh` first) · read the night's DECISIONS rows before the first brief · start qa before the founder leaves (no session starts over Remote Control) · builders answer in PR comments.
