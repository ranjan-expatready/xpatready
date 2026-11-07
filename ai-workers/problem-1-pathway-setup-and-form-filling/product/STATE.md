# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_f37a22d1-8132-4984-bf1a-8433da2ad65e Lead 30 · 7 Nov 14:47 IST (took over from Lead 29 at ~409k context, P-314)

updated: 2026-11-07 14:47 IST by **Lead 29, at the hand-over to Lead 30** · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: 13 M3 rows merged, 2 of 17 Works (C1.3, C11.5); 13 Partial; 2 Not built (C3.16 = A5 #1054, C10.2)** · rules: **`RULES.md`** + DECISIONS P-354 to P-403 · **this block's plan: `design/next-12-hours-2026-11-07.md`** · earlier page: `history/STATE-2026-11-07-1525-lead30.md` · this branch: `lead/2026-11-07-lead30` (from lead29, whose records PR #1229 is queued)

## Hand-over to Lead 30 (14:47 IST): do first
1-3. **Done** (#1221, #1225 answered; baseline counts in the plan; C8.2/C6.9 re-test 42360278263): word for word in `history/STATE-2026-11-07-1525-lead30.md`.
4. **#1226 (qa records):** read, Approve line posted, **labelled 15:24 IST with no refusal: the auto-mode rule works for labels (P-405).** qa is on C6.9/C8.2 gate A and QA-228 on 9fd299219.
8. **C6.9 and C8.2 Works (qa, #1238, head 6221a4f54, stacked on #1226):** run 42360278263 C6.9 20/20, C8.2 17/17 on the checkpoint; gate A PASS; QA-295 and QA-228 closed. Lead 30 posted the Approve line; **label when green.** M3 Works now 4 of 17 (C1.3, C11.5, C6.9, C8.2), on qa's merge. qa_c81w on :4470 stopped (Terminal tab c1).
7. **Check 15:24 IST, answered on the PRs:** #1233 B5 concept approved, HELD lines for -22/-23 approved (self-releasing, P-284 guard), new row B133; #1225 C4: Paper for the barcode form (P-380 Q3), the Paper sign gap is row B132 for the B3 lane after B129, C7.6-4 may use a required date if P-47 holds; #1232: next row B134 (label guard on a schedule), the hard `.github/**` boundary goes to the founder (F6); label #1232 when green on 61841540f. C2 (#1075) waits for #1223 and #1225.
5. **Watchdog:** Lead 30's watchdog deleted; Lead 32 messaged "start the watchdog" 14:50 IST. Lead 30's check: cron c0793609 (:13/:43). Lead 31 stays a spare. At the founder's next typed turn, start one more standby.
6. **Report hourly** against `design/next-12-hours-2026-11-07.md` section 7. Trip-wires (P-399, P-403): 3 of the next 10 batches fail, or weekly over 50% by 22:00 IST → back to 7 builders. Weekly 5% at 14:46 IST.

## Account switch (P-394 to P-398): done 12:35-13:11 IST
Details moved word for word to `history/STATE-2026-11-07-1525-lead30.md`. Weekly 0% at 12:35 IST on the new account (Ultra; resets 13 Nov 04:29 IST); curl with `gh auth token` for GitHub (P-363).

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F1 | C1.3 "Follows" suggestions | after M3 | nothing | 6 Nov 23:52 | **answered "After M3"** (P-391) |
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F3 | C6.9 counts unconfirmed facts | keep, outcome names them | B124 | 7 Nov 08:48 | **answered** (P-393, B124 = #1197) |
| F4 | Delete every session on the old account at the switch | as planned | the switch | 7 Nov 11:20 | **done per the founder's resume note** (P-396) |
| F5 | Release the rows held at 45% | release them, critical path first | M3 pace | 7 Nov 13:11 | **answered "Yes, release them"** (P-403) |
| F6 | A hard boundary for `.github/**` changes: a Mergify condition (a GitHub approving review or a founder-only label) or a CODEOWNERS ruleset (#1232's breaker Blocker 1) | after B134 lands, a Mergify condition | nothing now (B134 is the interim) | 7 Nov 15:25 | open |
| F7 | Coverage of preparation and filing (audit 7 Nov 15:30 IST, `reports/coverage-prep-filing-2026-11-07.md`; 94 requirement rows: 32 in M3's 17, 30 elsewhere, 22 out of scope by decision, **7 gaps**, 3 ambiguous; 8 rows labelled M3 not scheduled: B3, B6, B8, B9, B10, L-SA6, L-SA8, L-SA10) | add the 7 gaps as rows (3 need his call: withdrawing a filing, readiness score, representative's stored signature); schedule or rule out the 8; run S8's card-by-card trace | M3's true size | 7 Nov 15:32 | open |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 30).
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`, cron 2be371d8).
2. **Lanes, counted only after a push:** B124 #1197, B126 #1212 (the Lead labels these two; their briefs say so), C9, C3, B3, A6, B127 (these label themselves after Approve, P-277). Read their PR comments each check. Label on an Approve line for the exact head + green CI.
3. **qa:** #1220 (head 8f1d6193e, main ecbd68301): C6.11 and C8.1 Partial, P-339 met; QA-296 confirmed, new QA-299, QA-300. Label after reading the diff and CI, once the founder gives the OK. **B107 needs a lane at his next typed turn (P-400).** Then: dispatch C8.2 C6.9 on the checkpoint after B126 and B124 land.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** #1229 labelled 14:32 IST (records queue). **Do not push to `lead/2026-11-07-lead29` while #1229 is queued** (a push drops the label); later commits go on a new lead branch after it merges.

## Where we are (13:11 IST)
* **M3 rows merged (13):** B120, B2 (night); A2 #1072, B1 #1073, A4 #1172, A1 #1084 (08:41-08:43); B117 #1148, B122 #1145, B121 #1149 (09:18-09:19); C1 #1180, B125 #1202 (10:31); QA-293 #1204 (11:34), A7 #1201 (11:42). Also merged: F6 #1188, records #1199, #1208 (11:51). A3 #1198 landed 13:49 IST (main 9dc77d1ac).
* **qa (#1216, main 7bf128b33):** C6.11 Partial, ready for Works except P-339 (Mac C6.11 25/25, C8.1 14/14). Closed QA-152, QA-245, QA-283, QA-293. QA-289 narrowed to Minor. New: QA-296 Major (representative's names fill IMM 5475, holds C7.7), QA-297, QA-298 Minor.
* **C8.2** waits for B126 (QA-295); **C6.9** waits for B124 (P-393). Spend today US$0.

## In flight
**qa's lane:** `local_0868d426-…`; #1226 (head c237fef9f, QA-235 closed, QA-153 rewritten) gets the P-401 wording, then the Lead reads and labels. QA-228's retest goes with C8.2 and C6.9. C6.9 and C8.2 go to it when they land.
| Lane | Where | Row → next |
|---|---|---|
| B124 #1197 | Labelled 14:16 IST on Approve e3a7d5522, C6.9 20/20 | queue; lane done |
| B126 #1212 | Labelled 14:16 IST on Approve 708eae6ba, C8.2 17/17 | queue; lane done |
| C9 QA-246 (cloud) | #1223 | C7.7 forms waiting on an answer |
| C3 (cloud) | #1225 labelled 14:29 IST | lane ends at the label |
| C4 (cloud) | task_3a2d7beb, requested 15:04 IST (P-404) | C7.6 → C9.2 → C11.6 → C7.7, the Lead approves pack lines before each label |
| B3 → B129 | #1221 (Lead pushed 642d02d61) | after its label, B129 as warm row (P-341) |
| B131 (cloud) | task_32589e77, requested ~15:16 IST (P-405) | gate B NOT TESTED; may merge ahead (P-214) |
| Lead 33 (Mac) | `local_b49efef4-ce4b-4e6d-b821-507aac4b653b` | standby |
| B3 (cloud) | #1221 | sign and scan by screens, QA-251 |
| A6 B102 (cloud) | #1222; concept approved 14:17 IST | calculated age, C6.4, QA-226 |
| B127 QA-296 (cloud) | #1224 |
| B107 (cloud) | task_fb1531a2, started ~14:28 IST | QA-296, QA-299, QA-300: C6.11's path |
| Lead 32 (Mac) | `local_e0d03eb0-39dc-4371-abd7-d2a23216aaf3` | standby + watchdog (after Lead 30 messages it) | representative's names on IMM 5475 |
| Canary (cloud) | task_acca4ca2 | pushed; ends by itself |
| qa (Mac) | `local_0868d426-cf53-4883-b60b-59389b349a35`, started 13:13 IST | re-score C6.11, C8.1 on nightly 42352179701 |
| Lead 30 (Mac) | `local_f37a22d1-8132-4984-bf1a-8433da2ad65e` | **current Lead** |
| Lead 31 (Mac) | `local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e` | standby |

**Released 14:34 IST (P-403), cloud lanes:** A5 #1054 (task_91f8e1f6), C2 #1075 (task_142d777f, after #1223 and #1225), B5 (task_909c403b), CI fixes kind token then b78 (task_11a034e6). Old, not on the critical path: #1074 C6.12, #1086, #945, #417, #1140, #671, #669.

## Leads, in order (highest = current)
**Lead 30** `local_f37a22d1-…` (from 14:48 IST 7 Nov) · Lead 29 `local_ef20bc85-…` (12:35-14:47 IST, ended) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standbys: Lead 32 (watchdog), Lead 31.

## Lessons (7 Nov, Leads 25-29)
* A run said "checkpoint" but gate B used fixtures: read the pack lines ("on the checkpoint" vs "fixture only"), not the input (fixed by B125).
* A test suite run from the sandbox in the main copy damaged it (mktemp failed): suites only in a scratch clone.
* zsh does not split `$var` in `for d in $list`: use `${(f)list}` or xargs.
* Pushing to a queued PR's branch removes its label (label guard): put new records on a new lead branch.
* The permission check refuses a write the founder has not named; ask him to name it in one line, never route it through a lane.
* A label claimed in notes is not a review on the PR: check for the `Reviewer: Approve <sha>` line before labelling (6 Nov). The reverse also holds: read the PR before starting a lane; A3's Approve was already there (7 Nov).
* In this copy `git checkout -b <new> origin/main` can die on tracking after moving the files, leaving HEAD on the old branch with main's files staged: use `--no-track` and read the branch name after (7 Nov).
* `lane-preflight.sh` prints "load unreadable" from the sandbox (`sysctl` is refused); `uptime` reads the load. The start hook passed for the standbys, so this is the Bash sandbox only (7 Nov).
* **Burn 7 Nov:** weekly 2% at 13:45 IST, 4% at 14:15 IST: about 4%/h with 7 lanes, qa and a 350k Lead; the Lead's size matters, so hand over near 400k rather than at it.
