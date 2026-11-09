# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_f135f805-00be-49fc-ac67-df94b57dbc86 Lead 1 · 9 Nov 17:48 IST (series 2; new account, P-432; took over from Lead 40, series 1)

updated: 2026-11-09 18:10 IST by **Lead 1 (series 2, local_f135f805-…)** (from 17:48 IST, new account, weekly 0% at 17:48 IST, resets 15 Nov 22:30 IST) · milestone: **M2 60/60 holds; M3 17 of 29 Works on main cfaa199f4 (C7.10 via #1427); target 26 (P-434)** · rules: **`RULES.md`** + DECISIONS P-354 to P-434 · earlier page, word for word: `history/STATE-2026-11-09-1748-lead40-final.md` · this branch: `lead/2026-11-07-lead31`

## Lead 1 (series 2), from 17:48 IST: the 26-of-29 push (P-434), read this first
**Founder asks (17:48 IST, P-434, P-433):** [x] get_usage: 0% · [x] four merge-main cloud sessions · [~] Fable study + Opus challenge, aligned, plain words (+ token efficiency, ~18:00) · [~] table of the 12 · [x] qa Mac + four cloud lanes · [x] P-433 numbering, tools fixed · [ ] hourly reports · [ ] standbys Lead 2, Lead 3 · stop at 95%.
**Lanes (cloud unless noted; counted only after a push):** merge-1257 (C6.16), merge-1248 (C7.8, Lead reads the migration diff before the label), merge-1262 (C6.17), merge-1272 (C6.18 QA-318, shards 2 and 6 red on 8b487c70d); qa-c614, qa-c619, qa-c83, qa-c316 (gate A only); **qa Mac** `local_ad92719f-…` (C6.13 retest QA-329, then C6.5 after #1386 + #1409); forms-c102 (Paper IMM 5257 Validate: choice-field stored value); c73-entered-tick (P-401, QA-323); **pain-study-fable** `local_b3ce3963-…` (read-only, report: the pipeline pain-points file in reports/, dated 9 Nov), then an Opus challenger.
**Packs dispatched on main cfaa199f4, ~17:55 IST:** nightly `capabilities=C6.14 C6.19 C8.3 C6.13 C10.2 C7.3` checkpoint; `C3.16` six.
**C7.5 chain:** #1411 CI re-run on 4c4f20648 (Approve there) → label → merge → Lead's checkpoint paid run on the Mac (steps on #1396; expected sheet `123a97599291`) → records to #1396 → qa labels. **C7.3, C10.2:** Adobe Validate re-run by the Lead (Acrobat) after their fixes.
**Queue:** batch #1429 (#1386 + #1409, C6.5). Main copy fixed 17:55 IST: a fast-forward stopped halfway on the sandbox's `.claude/skills` block; skills restored by Edit.

## Lead 40's last block (series 1), word for word in `history/STATE-2026-11-09-1748-lead40-final.md`
Still live from it: C10.2's Adobe finding (forms-c102 has it); qa's old copy `.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e` holds local merge 13bd320d4 and an untracked `tools/isolated-sb.sh` (do not delete); follow-ups #1409's m10 and m11, C7.9's "the client gave it" wording (#1257's note), QA-326 to QA-328; paid US$0.88 of US$50 spent today before the switch; board https://claude.ai/artifact/StTX91z4o9xCHa2UujmCmg.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`). F9-F13 answered 18:25-18:36 IST, all as recommended (P-412; rows in `history/STATE-2026-11-07-1837-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F6 | Hard boundary for CI settings changes | closed by P-423 (~19:15 IST): no approving-review rule, no second account; the Lead reads every `.github/` or `.mergify.yml` diff before its label | nothing | 7 Nov 15:25 | closed |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 15:50 | open (P-408) |
| F14 | FQ-7: which date a recorded group's ages count on (B152 #1279: a submission recorded later than its "Submitted on" date) | the recording day for now (as built); price at "Submitted on" in a follow-up row | nothing (B152 carries on) | 7 Nov 20:30 | open |
| F15 | CI lane's D2 deviation (#1337): a Partial row reached only through a shared file its pack reads is listed, not run, so already-red Partials (e.g. C7.5) don't refuse unrelated PRs. Also: may the Lead delete the throwaway branches `throwaway/d6-rerun-base` and `throwaway/d2-c73-by-diff`? | accept the deviation; yes, delete both | nothing | 8 Nov 17:25 | open |
| F16 | C7.8 (B141) F1-F3: form with no passed trial is a Blank official PDF; blank added form with no completed copy is a CRITICAL warning passed with a reason; F3 as its concept recommends | built as recommended (reversible, P-390) | nothing | 9 Nov 09:20 | open |
| F17 | C7.10 (B143) BR-9: the figure departs from BR-30 so that 100 means Ready (documents done when received, every finding counted, no form approval, no retainer or deficiency library) | as built (reversible, P-390) | nothing | 9 Nov 09:58 | open |
| F18 | C6.14 (B136) when nobody matches: filing's first applicant or principal applicant (SA-1B-151 reads two ways; differs on a couple-once line on Visitor visa) | first applicant, as built (reversible) | nothing | 9 Nov 11:28 | open |
| F19 | Closed, founder's word 17:15 IST: #1386 requeued | | | | closed |
| F20 | Closed, founder's word 17:15 IST: #1409 retargeted to main and labelled, m10 and m11 to a follow-up | | | | closed |
| F21 | Closed, founder's word 17:15 IST: #1411 draft-then-ready done | | | | closed |

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
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 1 (series 2, local_f135f805-00be-49fc-ac67-df94b57dbc86)** (from 17:48 IST 9 Nov, new account). Standbys: Lead 2 and Lead 3 at the start.
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST, as written below (never renamed or renumbered).**
**Lead 40** `local_c34e437a-…` (from 13:34 IST 9 Nov) · Lead 39 `local_7dd9f7cd-…` (11:40-13:34 IST 9 Nov, ended; idle holder of Terminal and Acrobat) · Lead 38 `local_35e6362c-…` (09:54-11:40 IST 9 Nov, ended) · Lead 37 `local_1dcba2a1-…` (08:49-09:54 IST 9 Nov, ended) · Lead 36 `local_0ed74ec4-…` (22:53 IST 8 Nov-08:52 IST 9 Nov, ended) · Lead 35 `local_24059eca-…` (14:55-22:53 IST 8 Nov, ended) · Lead 34 `local_309261d2-…` (09:55-14:55 IST, ended) · Lead 33 `local_b49efef4-…` (23:29 IST 7 Nov-09:55 IST 8 Nov, ended) · Lead 32 `local_e0d03eb0-…` (18:56-23:28 IST, ended) · Lead 31 `local_f02fdadd-…` (15:45-18:55 IST, ended) · Lead 30 `local_f37a22d1-…` (14:48-15:45 IST, ended) · Lead 29 `local_ef20bc85-…` (12:35-14:47 IST, ended) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standby: Lead 41 `local_882a7581-…` (watchdog once Lead 40 tells it); one more at his next typed turn.
