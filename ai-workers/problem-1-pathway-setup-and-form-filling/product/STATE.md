# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_ab55f159-491a-451b-a4bc-e21d33d4e5e4 Lead 26 · 7 Nov 09:33 IST (took over from Lead 25 at ~375k context, P-314)

updated: 2026-11-07 11:53 IST by **Lead 26** (account switch at 50%, P-397) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: 11 M3 rows merged, 2 of 17 Works (C1.3, C11.5); C8.2 + C6.9 at qa gate A** · rules: **`RULES.md`** + DECISIONS P-354 to P-394 · earlier page: `history/STATE-2026-11-07-1055-lead26.md` · this branch: `lead/2026-11-07-switch`

## Account switch (P-394, P-396, P-397): read first
* **Switch at 50% (~12:20 IST), founder ~11:52 IST.** Restart on the new account, from their PRs: A3 rework **#1198** (head 4b3b343e1, green, owes a re-review Approve), B124 **#1197** (owes Approve), B126 **#1212** (QA-295 fix, CI running), qa's C6.11 re-score (its new records PR). Merged before the switch: #1204, #1201 (13 M3 rows), records #1199, #1208, F6 #1188 (main 28045a075). The Lead's notes: `history/lead-notes-2026-11-07/`. All sessions on the old account are deleted after the founder's yes (P-396).
* **Weekly 48% at 10:49 IST** (~1% per 30 min → 50% ceiling ~11:50 IST). No new rows since 45%; rows in flight finish; then the switch **with the founder** (`RESUME-ON-NEW-ACCOUNT.md`: `get_usage` first, GitHub connected on claude.ai/code first, cloud canary before any lane counts).
* **Paste-ready resume prompt for the new account** (founder types `/lead`, then pastes):
  > Resume as tech lead after the account switch of 7 Nov. Read `product/RESUME-ON-NEW-ACCOUNT.md` "The new Lead, in order", then STATE "Start here". Run `get_usage` and tell me the weekly figure first. Check claude.ai/code shows no "Connect GitHub" and run a cloud canary before restarting any lane. Restart only the rows in STATE "In flight" that are not merged or labelled. Then start two standby Leads and the watchdog (P-389).
* Held as NEW rows until the new account: A5, B5, C2 (#1075, ruled "wait"), the kind-job write-token fix, the b78 hang row.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F1 | C1.3 "Follows" suggestions | after M3 | nothing | 6 Nov 23:52 | **answered "After M3"** (P-391) |
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: show when qa's C6.9 walk screenshots land (#1199) |
| F3 | C6.9 counts unconfirmed facts | keep, outcome names them | B124 | 7 Nov 08:48 | **answered** (P-393, B124 = #1197) |
| F4 | (founder ask, 11:20 IST) At the account switch, once all work is done: delete every Xpatready session on this account (Leads, lanes, qa, standbys) so nothing old can be used when he returns | Switch once every in-flight PR is labelled (Mergify merges without a Claude account); before deleting, copy the notes folder (it is named for Lead 19's session) to a stable folder, check each lane pushed, list exactly what goes, get his yes (permanent) | the switch | 7 Nov 11:20 | **answered: "Yes, that plan" (P-396)**; list + yes at the switch |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: the file lead26-pending in Lead 19's notes folder (`.../side-session-notes/local_8acced9f-…`).
**Permission check (7 Nov):** the auto-mode classifier refuses a Lead label or a workflow dispatch as "External System Writes" until the founder names it in a typed turn ("label 1180 and 1202", "run on main"); later labels of other PRs then went through (1198, 1204). Never route a refused write through a lane.
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 27).
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`) and Monitor `prwatch.sh` on `1198 1197 1201 1204 1188 1199 1075`.
2. **Label on Approve line + green:** B124 #1197 (C6.9 unconfirmed-facts line); A7 #1201 (QA-289). #1188 F6 (Approve 822555b9c, green): label when the product queue is empty. qa records #1199 after qa merges main.
3. **qa gate A** (`local_42b61af6-…`): sent 10:50 IST: C6.9 + C8.2 with nightly **42341735926 on main 4a7e3107d** (packs "on the checkpoint": C6.9 15/15, C8.2 12/12; C6.4 19/30, C6.4-8 group red). C6.9 also needs B124 merged (P-393). C6.11 when A7 #1201 + QA-293 #1204 land.
4. **P-388 measurement:** batch failure rate over the 10 batches after 09:19 IST, `flow-measure.py --since 2026-11-07T03:49:00Z`; so far 0 failed of 4 (0df1f006a5, 3ef0d2164a, b1622253b9 passed; 23113b92e5 running); verdict ~18:30 IST.
5. **Hour-12 forecast** (~11:17 IST) from measured rows (M3 plan #1167 section 5).
6. **Records PR** from this branch (`lead/2026-11-07-lead26`, records only): open it now that #1128 is on main; label after reading the diff.

## Where we are (10:55 IST)
* **M3 rows merged (11):** B120, B2 (night); A2 #1072, B1 #1073, A4 #1172, A1 #1084 (08:41-08:43); B117 #1148, B122 #1145, B121 #1149 (09:18-09:19); C1 #1180, B125 #1202 (10:31). Main 4a7e3107d. Queued: A3 #1198, QA-293 #1204 (Major fix).
* **B125 proven:** gate B's checkpoint mode now runs each pack alone on the checkpoint (branch run 42338326649 and main run 42341735926 agree).
* Records merged 09:50 IST: #1128 (Lead records + tools), #1196 (qa C6.4). Disk 11 GB. Spend today US$0. Lead context ~195k.

## Board at the switch (factory-board.sh, 10:52 IST)
```
#1198  M3  Merge queue     A3 release 2's own lines (C7.6, C11.6, C8.1)
#1204  -   Merge queue     QA-293 representative's tab
#1201  -   CI running      QA-289 firm's office phone (A7)
#1197  M3  Building        B124 C6.9 unconfirmed-facts line
#1188  -   Ready for label F6 batch wait 5 min (label when product queue empty)
#1054  M3  CI running      C3.16 shared field scope (red checks: 1)
#1075  M3  Building        C7.3 / C2 (held, "wait")   no push 47 h
#1074  M3  CI red          C6.12 spouse sponsorship    no push 47 h
#1086, #945, #417, #1140, #671, #669: old, no push for 1-5 days (not M3 critical path)
```

## In flight
| Lane | Where | Row → next |
|---|---|---|
| M3 A1 (cloud) | session_015r4b48kw3JZTxj3QymQ6NR | A3 #1198 queued → (A-seat next held) |
| M3 A2 (cloud) | session_015r4b498e1jCsPDDDvdXgcE | A7 #1201 → QA-293 #1204 queued → (A5 held) |
| M3 A4 / seat B-2 (cloud) | session_015r4b4AB8rM3oGURRbp17g2 | B124 #1197 → (B5 held) |
| M3 C1 (cloud) | session_015r4b4BcPvT6b7ntAX9yhS8 | C1 merged → (C2 held) |
| B122 #1145 (cloud) | session_015r4b4AUe4k9SELZXqMjKHm | B125 merged → (token fix, b78 row held) |
| B119 (cloud) | #1188 F6 | label when queue empty |
| qa (Mac) | `local_42b61af6-fa15-4fbf-9bcb-5c4cb6e17905` | gate A C6.9/C8.2; #1199 |
| Lead 27 (Mac) | `local_a2122a0e-82ba-44eb-913a-0d144a6da601` | standby + watchdog |
| Lead 28 (Mac) | `local_4d35fb20-7e18-4522-9ae7-fc4d926bcee9` | standby |

## Leads, in order (highest = current)
**Lead 26** `local_ab55f159-…` (from 09:33 IST 7 Nov) · Lead 25 `local_efdbee17-…` ended (07:33-09:35 IST) · Lead 24 `local_ce906423-…`, Leads 23-19 ended · Leads 1-18 earlier. Standbys: Lead 27 (watchdog), Lead 28. Never archive Lead 22 (Leads 23-24 nest under it).

## Lessons (7 Nov, Leads 25-26)
* A run said "checkpoint" but gate B used fixtures: read the pack lines ("on the checkpoint" vs "fixture only"), not the input (fixed by B125).
* A test suite run from the sandbox in the main copy damaged it (mktemp failed): suites only in a scratch clone.
* zsh does not split `$var` in `for d in $list`: use `${(f)list}` or xargs.
* Pushing to a queued PR's branch removes its label (label guard): put new records on a new lead branch.
* The permission check refuses a write the founder has not named; ask him to name it in one line, never route it through a lane.
* A label claimed in notes is not a review on the PR: check for the `Reviewer: Approve <sha>` line before labelling (6 Nov).
