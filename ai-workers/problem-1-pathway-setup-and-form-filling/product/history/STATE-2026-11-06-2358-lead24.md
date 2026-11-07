# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_ce906423-84b3-46f2-a257-38e947992c20 Lead 24 · 6 Nov ~21:50 IST (took over from Lead 23 at ~360k context, P-314)

updated: 2026-11-06 21:50 IST by **Lead 23** (hand-over to Lead 24) · milestone: **M2 60/60; P-376 scale PRs landing; M3 building on 5 seats** · rules: **`RULES.md`** + DECISIONS P-354 to P-383 · earlier page: `history/STATE-2026-11-06-2015-lead22-handover.md`

## Start here (Lead 24)
**Branch** `lead/2026-11-05-lead14b` (even with main at 20:25 IST plus records). Records PR **#1128** (label needs the founder's name, P-336). GitHub: curl + `gh auth token` with `allowed_domains` (P-363). The Mac token has no `workflow` scope: CI-file changes go through a cloud lane. Times only from `TZ=Asia/Kolkata date`. Working notes, every id and ruling: Lead 23's pending notes in Lead 19's side-session notes folder (`.../side-session-notes/local_8acced9f-…`); CURRENT-LEAD.md there names you.
**Your to-do, in order:**
1. CronCreate the 30-minute check (:13/:43; Lead 23's prompt is in its notes, item 22 and the cron text) and a Monitor (`prwatch.sh` in the notes folder: `1158 1168 1174 1178 1136 1147 1145 1149 1148 1171 1172 1084 1072`, piped through `awk 'NR>12'`).
2. **Merge queue (m2), one fix at a time:** #1158 B120 checking; #1174 push-guard fix queued; **#1178** (quarantine of the hanging suite) labelled 21:46 IST, enters when its CI is green. **Then re-queue #1168** with a `@mergifyio queue` comment (founder's standing OK for re-runs, P-377 (10)), and #1158 too if its batch fails on the same hang. Watch the next batch: the hang may move to the next first suite of a shard (review of #1178).
3. **Then, in order, each on a "Ready for label" naming the current head with an Opus Approve:** #1136 (land-1136 adding F4) → #1147 B119 (approved 16e0d6525) → #1145 B122 (b122-f5 lane) → #1149 B121 → #1148 B117. After #1147: the B119 lane opens F6 (batch wait 5 min). #1167 (M3 plan, records): label only after #1147's records queue is on main.
4. **After #1174 is on main:** type into the A2 lane on claude.ai: "merge origin/main into your session branch and push to #1072's branch normally". Then remove the Lead's worktree `.claude/worktrees/guard-fix` from a Terminal tab (both branches are on GitHub).
5. **Five builder seats** (P-383), each with its next rows typed in: A-1 A1 #1084 → A3 · A-2 A2 #1072 → A7 → A5 · B-1 B2 #1171 → B1 #1073 · B-2 A4 #1172 (concept approved with conditions, comment on #1172) → B5 · C C1 → C2 #1075 → C9. Short lanes end at Ready: land-1136, b122-f5, m3-shared-f2 (F2), B119 (F6 follow-up). Read every lane on claude.ai each check: stuck, failing, or waiting on a permission (P-381).
6. **qa:** `qa-m2-walk` (local, nested under Lead 19) walks `main` after B120 lands; send it the go. Then archive Lead 19 with it.
7. **Account (P-383):** stop new rows at ~45% weekly; in-flight rows finish; before 50% rewrite STATE with a paste-ready resume prompt for the new account. The founder switches in the morning, while awake (4 Nov lesson: check GitHub is connected on the new account first).
8. Hour-12 forecast from measured rows (plan section 5) once B120 is on main (M3's hour 0, fix F2).

## Where we are (21:50 IST)
* **M2 60/60** (qa, 12:20 IST). Nothing new merged since #1139 (17:59 IST): two batches failed on one hanging suite (`check_b78_section_names.ts`, exit 124 after "11 passed"). #1178 quarantines it in batches; the nightly still runs it.
* **Two independent Fable-high reviews** (engineering and the M3 plan): approach sound; seven fixes applied (P-382). M3 forecast 3-4 Works in 48 h, all 17 in 5-7 days.
* **Push guard (#1174):** an existing branch now checks only commits not yet on GitHub, and the guard refuses when it cannot check. Found: in the Mac sandbox it said "clean" with a fake token in the commit.
* Weekly plan **29%** (21:45 IST), Fable 4%. Disk 8.5 GB free. Spend today US$0.56.

## In flight
| Lane | Where | Row |
|---|---|---|
| m3-a1, m3-a2, m3-b2, m3-a4, m3-c1 | cloud | five seats above |
| land-1136, b122-f5, m3-shared-f2, B119, Flow fix | cloud | P-376 PRs and fixes F2/F4/F5/F6 |
| B120, B121, B117 | cloud (old lanes) | kept: their PRs still need work; archive each when its PR merges |
| qa-m2-walk `local_42b61af6-…` | Mac | idle; walk after B120 |
| Lead 25 `local_efdbee17-…` | Mac | standby |

## Leads, in order (highest = current)
**Lead 24** `local_ce906423-…` (from ~21:50 IST) · **Lead 23** `local_eda9476d-…` ended (20:11-21:50 IST) · Lead 22, Lead 21, Lead 20, Lead 19 ended · Leads 1-18 earlier. Standby: Lead 25; top up one more at the founder's next typed turn. Never archive Lead 22: Leads 23 and 24 are nested under it.

## Lessons (6 Nov, Lead 23)
* A suite placed first in a shard can hang after passing (exit 124); shards are fixed by recorded times, so it fails every batch until quarantined. Guard: #1178; cause to B122.
* The push guard re-checked main's commits after a merge of main; lanes then ask for `--no-verify`. Never approve that: fix the guard (#1174).
* A guard that writes fixed `/tmp` files reports "clean" in the sandbox. Guards must fail closed (#1174).
* `git checkout -b` in a Lead worktree half-fails in the sandbox (`.git/config` not writable): HEAD stays, index moves. Check `git status` and finish with a plain `checkout` of the created branch.
* Two cloud sessions pushed to one PR (#1136). Archive the replaced lane at once.
