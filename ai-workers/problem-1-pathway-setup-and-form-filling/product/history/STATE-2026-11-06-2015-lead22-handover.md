# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_eda9476d-202b-41f8-9ef4-8f7b85de15a6 Lead 23 · 6 Nov ~20:15 IST (took over from Lead 22 at ~400k context, P-314)

updated: 2026-11-06 20:15 IST by **Lead 22** (hand-over to Lead 23) · milestone: **M2 60/60; P-376 scale PRs landing; M3 sprint building (plan #1167)** · rules: **`RULES.md`** + DECISIONS P-354 to P-381 · earlier page: `history/STATE-2026-11-06-2010-lead22-start.md`

## Start here (Lead 23)
**Branch** `lead/2026-11-05-lead14b` (far behind main; a merge from the sandbox fails on `.claude/skills`, so merge `origin/main` from a Terminal tab, after the founder OKs `git clean -fd` of 94 untracked files a failed sandbox merge left in the main copy: all are exact copies of files on main, checked 20:08 IST). Records PR **#1128** (label needs the founder's name, P-336). GitHub: curl + `gh auth token` with `allowed_domains` (P-363). The Mac token has **no `workflow` scope**: CI-file changes go through a cloud lane (founder, 6 Nov). Times only from `TZ=Asia/Kolkata date`. Working notes, every id and ruling: Lead 22's pending notes in Lead 19's side-session notes folder (`.../side-session-notes/local_8acced9f-…`); CURRENT-LEAD.md there names you.
**Your to-do, in order:**
1. CronCreate the 30-minute check (:13/:43) and a Monitor: `prwatch.sh` in the notes folder, e.g. `1158 1136 1147 1168 1145 1149 1148 1084 1072 1167`, piped through `awk 'NR>12'` to skip the first snapshot.
2. **P-376 merges, one at a time:** **#1158 B120** labelled, in the queue (20:07 IST) → then **#1168** CI fix (opened by the cloud flow-fix lane from the Mac forms lane's patch c9003a9d5, Opus approved twice; label on its "Ready for label", P-214) → **#1136** (cloud lane `land-1136` merging main; re-label on its Ready) → **#1147 B119** (merged main at 16e0d6525; label on its Ready after diff-only review) → **#1145 B122**, **#1149 B121**, **#1148 B117** (all conflict: each merges main once after B120; their old cloud lanes are idle: type into them on claude.ai or start a fresh lane in a founder-typed turn).
3. **M3 sprint (plan PR #1167, labelled `records`; streams A, B, C; rulings R1-R11 in its section 7):** cloud lanes requested 20:15 IST: `m3-a1` (#1084 after B120), `m3-a2` (#1072), `m3-c1` (lib/m3 `expectedLines`). **B2's builder (R8) not started:** start it at the founder's next typed turn (brief = plan row B2). Label each M3 PR on Ready + green; M3's 48-hour clock starts when the P-376 PRs are on main.
4. Hour-12 forecast at ~10:00 IST 7 Nov from measured rows (plan section 5); ETA board each check (P-338).
5. Records: DECISIONS P-377 to P-381 written 20:15 IST; next write at hand-over or ~08:00 IST.

## Where we are (20:15 IST)
* **M2 60/60** (qa, 12:20 IST). Merged since: #1161, #1157, #1162 (qa records), **#1139 flow fix (17:59 IST)**.
* Spend today US$0.56 (morning). Weekly plan 23% all models, Fable 3% (20:07 IST). Disk ~6-7 GB after removing the CI patch copy (watch it: #1136's pre-flight wants 7 GB).

## In flight
| Lane | Where | Row |
|---|---|---|
| m3-plan `local_89a763be-…` (Fable, high) | Mac | plan done (#1167); finishing section 7 push, then ends |
| fix-1052 `local_b81d9314-…` | Mac | finished (CI patch handed over); archive it, then Lead 19 (its parent) |
| qa-m2-walk `local_42b61af6-…` | Mac | idle; next: walk after B120, confirm 60 stays 60 |
| Flow fix (cloud) | claude.ai | #1168 |
| land-1136, m3-a1, m3-a2, m3-c1 | cloud | requested 20:15 IST |
| B119, B120, B121, B122, B117 | cloud (old lanes) | see to-do 2 |
| Lead 24 `local_ce906423-…` | Mac | standby |

## Leads, in order (highest = current)
**Lead 23** `local_eda9476d-…` (from ~20:15 IST) · **Lead 22** `local_b795aa55-…` ended (12:21-20:15 IST) · Lead 21, Lead 20, Lead 19 ended · Leads 1-18 earlier. Standby: Lead 24; top up one more at the founder's next typed turn.

## Lessons (6 Nov, Lead 22)
* A failed `git worktree add` (the sandbox cannot write `.claude/agents` in a new copy) followed by `cd $W && git …` ran the git command in the MAIN copy twice (set -e is not honoured here). Rule: worktree work from a Terminal tab, and always `git -C <worktree>`, never `cd` then git.
* The classifier refuses a Lead doing what a lane was refused (laundering): bring it to the founder as one question.
* The Mac token cannot push `.github/workflows`; route CI-file changes through a cloud lane.
* A merge-queue batch can fail on a suite that prints "0 failed" and never exits (check_b78_section_names.ts, 1200 s): not the PR; Mergify bisects. B122 (retries) covers it.
* claude.ai's session list drops old cloud sessions; if a lane is gone, start a fresh one in a founder-typed turn.
