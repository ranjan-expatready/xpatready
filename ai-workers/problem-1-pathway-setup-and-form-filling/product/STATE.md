# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_ef20bc85-3aec-48f2-8cb7-46a6f1a34023 Lead 29 · 7 Nov 12:35 IST (new account after the switch, P-398)

updated: 2026-11-07 13:11 IST by **Lead 29** · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: 13 M3 rows merged, 2 of 17 Works (C1.3, C11.5); 13 Partial; 2 Not built (C3.16 = A5 #1054, C10.2)** · rules: **`RULES.md`** + DECISIONS P-354 to P-398 · earlier page: `history/STATE-2026-11-07-1153-lead26.md` · this branch: `lead/2026-11-07-lead29`

## Account switch (P-394, P-396, P-397, P-398): done 12:35-13:11 IST
* **Weekly 0% at 12:35 IST** on the new account (Ultra; resets 13 Nov 04:29 IST; extra usage off). Context 12%.
* **Connections:** gh fails TLS in the sandbox as before, curl with `gh auth token` returns 200 (P-363). Mergify merged #1215 and #1216 today, so it sees the repo. Cloud canary pushed `claude/canary-new-account-2026-11-07` 4656407d8 (one empty commit): cloud lanes can clone and push.
* **Not yet checked:** claude.ai/code as text. The built-in browser is signed out of claude.ai (the app's sign-in is separate); the founder signs in there.
* **Records #1215, #1216:** merged by Mergify 12:23 and 12:20 IST. Main ecbd68301.
* **A3 #1198 needed no lane:** its `Reviewer: Approve 4b3b343e1` line (11:51 IST) came after Lead 26's last read; CI green; labelled 13:09 IST on the founder's named OK.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F1 | C1.3 "Follows" suggestions | after M3 | nothing | 6 Nov 23:52 | **answered "After M3"** (P-391) |
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F3 | C6.9 counts unconfirmed facts | keep, outcome names them | B124 | 7 Nov 08:48 | **answered** (P-393, B124 = #1197) |
| F4 | Delete every session on the old account at the switch | as planned | the switch | 7 Nov 11:20 | **done per the founder's resume note** (P-396) |
| F5 | Release the rows held at 45% (A5, B5, C2, the kind-job write-token fix, the b78 hang row) now the plan is at 0% | release them, critical path first | M3 pace | 7 Nov 13:11 | open |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Permission check (7 Nov):** the auto-mode classifier refuses a Lead label or a workflow dispatch until the founder names it in a typed turn or a question's answer. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 30).
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`, cron 2be371d8).
2. **Lanes, counted only after a push:** B124 #1197 and B126 #1212. Read their PR comments each check. Label on an Approve line for the exact head + green CI.
3. **qa:** nightly 42352179701 on main ecbd68301 (C6.11 C8.1, data=checkpoint). Read the pack lines ("on the checkpoint", not fixture), then a fresh qa re-scores C6.11 and C8.1 (P-339).
4. **P-388 measurement:** batch failure rate over the 10 batches after 09:19 IST, `flow-measure.py --since 2026-11-07T03:49:00Z`; 1 failed of 5 at 11:02 IST (C1 interaction); verdict ~18:30 IST.
5. **Hour-12 forecast** was due ~11:17 IST and not found in the records: write it from measured rows (M3 plan #1167 section 5).
6. **Records PR** from this branch, once a day (P-336): label after reading the diff, founder names it if the classifier refuses.

## Where we are (13:11 IST)
* **M3 rows merged (13):** B120, B2 (night); A2 #1072, B1 #1073, A4 #1172, A1 #1084 (08:41-08:43); B117 #1148, B122 #1145, B121 #1149 (09:18-09:19); C1 #1180, B125 #1202 (10:31); QA-293 #1204 (11:34), A7 #1201 (11:42). Also merged: F6 #1188, records #1199, #1208 (11:51). Queued: A3 #1198.
* **qa (#1216, main 7bf128b33):** C6.11 Partial, ready for Works except P-339 (Mac C6.11 25/25, C8.1 14/14). Closed QA-152, QA-245, QA-283, QA-293. QA-289 narrowed to Minor. New: QA-296 Major (representative's names fill IMM 5475, holds C7.7), QA-297, QA-298 Minor.
* **C8.2** waits for B126 (QA-295); **C6.9** waits for B124 (P-393). Spend today US$0.

## In flight
| Lane | Where | Row → next |
|---|---|---|
| A3 #1198 | Mergify, label on 4b3b343e1 | merges by itself; no lane |
| B124 #1197 (cloud) | task_88bb8ba2, requested 13:09 IST | leave draft, full CI, Approve line |
| B126 #1212 (cloud) | task_03fa773f, requested 13:09 IST | confirm 5/5 + C8.2 pack, Approve line |
| Canary (cloud) | task_acca4ca2 | pushed; ends by itself |
| qa (Mac) | fresh, after the nightly | re-score C6.11, C8.1 |
| Lead 30 (Mac) | `local_f37a22d1-8132-4984-bf1a-8433da2ad65e` | standby + watchdog |
| Lead 31 (Mac) | `local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e` | standby |

**Held, wait for the founder's OK (P-394, founder's resume note 7 Nov):** A5 (#1054), B5, C2 (#1075), the kind-job write-token fix, the b78 hang row. Old, not on the critical path: #1074 C6.12, #1086, #945, #417, #1140, #671, #669.

## Leads, in order (highest = current)
**Lead 29** `local_ef20bc85-…` (from 12:35 IST 7 Nov) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standbys: Lead 30 (watchdog), Lead 31.

## Lessons (7 Nov, Leads 25-29)
* A run said "checkpoint" but gate B used fixtures: read the pack lines ("on the checkpoint" vs "fixture only"), not the input (fixed by B125).
* A test suite run from the sandbox in the main copy damaged it (mktemp failed): suites only in a scratch clone.
* zsh does not split `$var` in `for d in $list`: use `${(f)list}` or xargs.
* Pushing to a queued PR's branch removes its label (label guard): put new records on a new lead branch.
* The permission check refuses a write the founder has not named; ask him to name it in one line, never route it through a lane.
* A label claimed in notes is not a review on the PR: check for the `Reviewer: Approve <sha>` line before labelling (6 Nov). The reverse also holds: read the PR before starting a lane; A3's Approve was already there (7 Nov).
* In this copy `git checkout -b <new> origin/main` can die on tracking after moving the files, leaving HEAD on the old branch with main's files staged: use `--no-track` and read the branch name after (7 Nov).
* `lane-preflight.sh` prints "load unreadable" from the sandbox (`sysctl` is refused); `uptime` reads the load. The start hook passed for the standbys, so this is the Bash sandbox only (7 Nov).
