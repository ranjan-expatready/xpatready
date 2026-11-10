# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_8c1fbca5-d3cf-4bf4-8620-9bdb3c9564ca Lead 6 · 10 Nov 07:45 IST (series 2; took over from Lead 5 (series 2, local_6e87a775) at ~315k context, P-440)

updated: 2026-11-10 07:45 IST by **Lead 5 (series 2, local_6e87a775-…)** at hand-over to Lead 6 (series 2, local_8c1fbca5-…) · weekly ~30% · milestone: **M2 60/60; M3 22 of 29 Works on main** (C6.19, C7.3 tonight); target 26, then 29 (P-434, P-439) · rules: **`RULES.md`** (as of P-442; DECISIONS to P-444) · this branch: `lead/2026-11-07-lead31`

## Hand-over: Lead 5 (series 2) → Lead 6 (series 2), 07:45 IST 10 Nov — read this first (Lead 4's and Lead 5's blocks word for word: `history/STATE-2026-11-10-0745-lead5s2-final.md`)
**Founder (awake, typed 07:20 IST):** wants everything done in 2-3 hours to report; told it is not possible: ~25-26 in 3 h, all 29 in ~6-8 h. He approved (AskUserQuestion, 07:28): start the three lanes and two standbys; **toggle #1450** (done). Hourly report in IST. Paid runs to US$30/day (RULES Money), ledger first.
| Row | Where it stands (07:45 IST) | Next step | ETA IST |
|---|---|---|---|
| C6.16 | qa #1452 says Works (nightly 42707165919 green); shard 1 red only on G2 (P-412 not on main) | **#1474 merges** → re-run #1452's failed part → read + Approve + label (P-385) | ~09:00 |
| C8.3 | #1459 merged; row Partial until P-339 | nightly C8.3 dispatched 07:2x: run id to qa (no qa lane now: Lead posts it in a records PR or a new qa lane) | ~09:30 |
| C7.8 | #1450 toggled 07:29, ci running | on green Mergify queues it; then qa gate A + nightly (new qa lane) | ~10:30 |
| C10.2 | #1460 merged; nightly 42702480732 green; QA-361 fix merged | **Adobe re-Validate on the Mac with the founder**: `request_access` "Acrobat" (founder-typed turn), steps in #1460's "Question for the tech lead"; then qa-c73-c102 re-scores | ~09:30 |
| C6.17 | #1472 gate A PASS, Partial; QA-375 Major (P-444) | cloud **forms-c617-qa375** (started 07:28) builds the fix; nightly C6.17 dispatched 03:57 | ~12:00 |
| C6.5 | #1444 merged | cloud **qa-c65** (started 07:28) runs the round; asks for nightly C6.5 | ~10:30 |
| C7.5 | #1463 gate A FAIL: QA-364 (new paid run), QA-366 (CI gap) | cloud **c75-fix** (07:28): lands #1463, fixes QA-366, posts the paid re-run kit; **the Lead runs the paid call** from a Terminal tab (founder awake) | ~13:00 |
**Records PR #1474** (DECISIONS P-412 to P-444, RULES, tools and skills): independent Opus reviewer Approve (rounds 1-3, last on merge 301645758; `side-session-notes/local_a07b26f2-…/review-1474-tools-skills.md`); the Lead's records-only Approve on the hand-over head. **Label on green CI** (GitHub runs no CI while a PR conflicts: check `mergeable_state` first).
**Clean-up done 07:25:** 20 cloud and 7 Mac sessions archived; founder killed 4 orphan test servers. Left for the founder (auto mode refused): `git worktree remove /private/tmp/claude-501/paid-c75` and `.claude/worktrees/visual-handover-7a9ead` (both clean). Test DBs: 10 (176 MB), left.
**Sessions:** cloud lanes qa-c616 (#1452), qa-c617 (#1472, awaiting input), qa-c73-c102 (C10.2), C7.8 fix lane (#1450), forms-c617-qa375, qa-c65, c75-fix. Standby: **Lead 7** `local_6426aab1-…`; one more at the founder's next typed turn (P-286).
**Lessons tonight:** ci runs that create no jobs (re-run them; Mergify times out batches); a Lead commit after an Approve voids it (re-Approve records-only); scratch clones cannot write `.git/config` in the sandbox; claude.ai session menu "More options → Archive" archives without a dialog.

## Lead 40's last block (series 1): `history/STATE-2026-11-09-1748-lead40-final.md` (live items listed there; this page's 02:55 copy keeps the line).

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`). F9-F13 answered 18:25-18:36 IST, all as recommended (P-412; rows in `history/STATE-2026-11-07-1837-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open (walk screenshots: #1199) |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 15:50 | open (P-408) |
| F14 | FQ-7: which date a recorded group's ages count on (B152 #1279: a submission recorded later than its "Submitted on" date) | the recording day for now (as built); price at "Submitted on" in a follow-up row | nothing (B152 carries on) | 7 Nov 20:30 | open |
| F15 | CI lane's D2 deviation (#1337): a Partial row reached only through a shared file its pack reads is listed, not run. Also: may the Lead delete `throwaway/d6-rerun-base` and `throwaway/d2-c73-by-diff`? | accept the deviation; yes, delete both | nothing | 8 Nov 17:25 | open |
| F16 | C7.8 (B141) F1-F3: form with no passed trial is a Blank official PDF; blank added form with no completed copy is a CRITICAL warning passed with a reason; F3 as its concept recommends | built as recommended (reversible, P-390) | nothing | 9 Nov 09:20 | open |
| F17 | C7.10 (B143) BR-9: the figure departs from BR-30 so that 100 means Ready (documents done when received, every finding counted, no form approval, no retainer or deficiency library) | as built (reversible, P-390) | nothing | 9 Nov 09:58 | open |
| F18 | C6.14 (B136) when nobody matches: filing's first applicant or principal applicant (SA-1B-151 reads two ways; differs on a couple-once line on Visitor visa) | first applicant, as built (reversible) | nothing | 9 Nov 11:28 | open |
| F19 | QA-369 (C6.16): may Client A take back a link the firm sent to a new address, before the adult accepts? | yes, as built (P-443): nothing is disclosed and only the firm can send again | nothing | 10 Nov 03:30 | open |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Founder, 18:41 IST (P-413): no new lane until one ends; warm rows first; Works before new rows (C4's pack port is the critical path); concept lanes write no new concepts until builds catch up.** **Founder, ~15:50 IST (P-410):** the Lead labels all approved green PRs, its own records too; no token cap, quality guards stay; the 50%-by-22:00 trip-wire is lifted. **Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 34 once Lead 33 tells it).
**Hand-over (P-409):** no hand-over with an in-process subagent running; its result goes to a file named in the hand-over block; briefs say report to the current Lead. Skill edit at the founder's next typed turn.
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`).
2. **Lanes, counted only after a push:** the live list in the Lead 32 block (P-414). Read each lane's newest PR comment for "tech lead" every check, and reply in its claude.ai session.
3. **qa:** re-scores after each merged batch; C6.9 and C8.2 Works on qa's #1238.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** on `lead/2026-11-07-lead31` from the scratch worktree `$TMPDIR/lead31-merge`; records PR not opened yet (once a day, P-336).

## Leads, in order
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 5 (series 2, local_6e87a775-b6a8-4a50-8fa7-ad3b03548af6)** (from 00:48 IST 10 Nov) · Lead 4 (series 2, local_48335a53-6041-4416-9442-c8814319aa84) (23:44 IST 9 Nov-00:48 IST 10 Nov, ended at ~240k, P-440) · Lead 3 (series 2, local_81ca34d8-6a97-4c29-9fd1-471e42cf7f6f) (22:35-23:45 IST 9 Nov, ended at ~255k, P-440) · Lead 2 (series 2, local_a07b26f2-302e-4c73-bd1c-ca20dd9e8a79) (20:30-22:35 IST 9 Nov, ended at ~370k, P-440) · Lead 1 (series 2, local_f135f805-00be-49fc-ac67-df94b57dbc86) (17:48-20:32 IST 9 Nov, ended at ~400k). Standby: none; start two at the founder's next typed turn (P-286).
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST**, never renamed or renumbered: the full list, word for word, is in `history/STATE-2026-11-09-2130-lead2s2.md` ("Leads, in order").
