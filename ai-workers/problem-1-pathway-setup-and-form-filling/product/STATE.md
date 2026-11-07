# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_efdbee17-934f-4f7e-9b28-dff5e035313c Lead 25 · 7 Nov ~07:35 IST (took over from Lead 24 at ~385k context, P-314)

updated: 2026-11-07 07:35 IST by **Lead 24** (hand-over to Lead 25) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: 2 M3 rows merged, 2 of 17 Works; 8 more PRs labelled 07:29-07:31 and in the queue** · rules: **`RULES.md`** + DECISIONS P-354 to P-386 · earlier page: `history/STATE-2026-11-06-2358-lead24.md`

## Morning 7 Nov (Lead 24, 07:35 IST): read first
* **Lead 24 stalled ~00:04-07:28 IST** on one Terminal-tab call that waited on an approval prompt; no check fired; nothing merged after 00:00. Never make a call that can prompt while the founder is away (memory rule).
* Labelled 07:29-07:31 (all labels held): #1072 A2, #1084 A1, #1148 B117, #1149 B121, #1073 B1, #1180 C1 (its question ruled: keep "uses a representative" No), #1172 A4, #1145 B122. Batch running: #1072 + #1073 + #1172 + #1084 + #1180 + #1148 on main 0f9cb40.
* **Waiting on the founder (asked 07:31):** #1128 carries `.claude/settings.json` changes from earlier Leads (allow `Bash(*)`, terminal tools, sandbox `allowLocalBinding`); Lead 24 recommended stripping them, keeping only records. Do not label #1128 until he answers.
* Next: qa gate-A goes as rows merge (C6.9 needs A1 + A4; C8.2 needs A1; C6.11 needs A2 + B117 + A7; C6.4 needs B1); #1084's question (A3: wait for the merge, then stack); #1075 C2 is dirty and has a question; new PR #1188 (F6, B119 lane). Weekly 40% at 07:32: the 45% soft stop and the morning account switch are next (P-383).

## Start here (next Lead)
**Branch** `lead/2026-11-05-lead14b`, records PR **#1128** (the Lead labels records PRs itself, P-385). **Once #1128 merges: a fresh `lead/<today>` branch from `origin/main` every day; never merge `main` into an old lead branch (P-388).** **Stall guard (P-388):** while the founder is away, no call that can wait on a prompt; `lead-watch.sh` prints an ACT line when the previous check ran over 45 min ago: tell the founder at once. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Working notes, every id and ruling: the file lead24-pending in Lead 19's side-session notes folder (`.../side-session-notes/local_8acced9f-…`); CURRENT-LEAD.md there names the current Lead.
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline (rows, rulings, reviews, labels, CI, paid runs inside the US$30 cap). Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard, #1136), records PRs too.
**To-do, in order:**
1. CronCreate the 30-minute check (:13/:43) and a Monitor (`prwatch.sh` in the notes folder on the open PRs below).
2. Label each M3 row on its Approve line + green CI: A1 #1084 (red: `check_b83_undo_withdraw.ts`, lane told), A2 #1072 (Works claim dropped: QA-289 = A7, QA-283 = B117), B1 #1073 (red on 6 release suites, lane told), C1 #1180, A4 #1172 (C6.9 screen; allow-list line 18 removal approved in-PR), B122 #1145, B117 #1148 and B121 #1149 (the "Land #1148 then #1149" cloud lane).
3. As each M3 row merges, send qa (`local_42b61af6-…`) the gate-A go; qa re-scores (ETAs in #1167 §5: C6.11, C8.2, C6.9, C3.16, C6.12, C11.6).
4. Follow-up row to shape: B2's concept change (a), the PDF-upload line's In progress from `readBackOf`, after #1072 (stream C, `tests/check_vv_prepare_api.ts`).
5. Account (P-383): stop new rows at ~45% weekly (32% at 23:48 IST, ~1.3%/h → ~09:30 IST); morning switch with the founder; GitHub connection first.
6. Morning cleanup: restore the four `.claude` files in qa's worktree (Terminal tab); stray database `xr_studio_qa270`; archive finished cloud lanes (B120, Flow fix, Land #1136, B119 after F6) after checking for unpushed work.
7. Founder product question (one, morning): C1.3 says "'Follows' is only a suggestion"; nothing suggests a next application on main. qa counts it as a limit; ask whether a real suggestion is wanted (a new row if yes).

## Where we are (23:57 IST)
* **Merged tonight:** #1174 push guard (22:05), #1178 hang quarantine + #1168 flow fix + #1136 guardrails (22:54), **B120 #1158 (23:17, M3 hour 0)**, **B2 #1171 (23:23, first M3 row: C7.6 Ready to file by screens)**, qa records #1184 (23:52), **B119 #1147 records queue (23:55)**; #1167 M3 plan labelled.
* **qa (23:52 IST):** M2 60/60 holds after B120 and #1171 (all 40 Works packs green in both batches; demo loads by screens; C10.1 28/28). **C1.3 and C11.5 Works** (first M3 Works).
* **Rulings tonight:** A3 option 1 (release 2 keeps IMM 5257 Online; C11.6-8a/-8b/-9 named in A3's PR, move in C4); B2's four questions; A4 allow-list line removed in its own PR.
* M3 hour 12 ≈ 11:15 IST 7 Nov; hour 48 ≈ 23:15 IST 8 Nov. Plan forecast at hour 12: 3-4 rows merged, 2-3 Works; tonight is ahead (2 rows, 2 Works by hour 1).
* Weekly 32% (23:48 IST). Disk 8.9 GB. Spend today US$0.56. Keep-awake held by Lead 24.

## In flight
| Seat / lane | PR | Next |
|---|---|---|
| A-1 (cloud) | A1 #1084 | fix b83 red → A3 |
| A-2 (cloud) | A2 #1072 | Ready → A7 (QA-289) → A5 |
| B-1 (cloud) | B1 #1073 | fix release suites → next stream B row |
| B-2 (cloud) | A4 #1172 | Ready → B5 |
| C (cloud) | C1 #1180 | Ready → C2 #1075 → C9 |
| Land #1148/#1149 (cloud) | #1148, #1149 | Approve lines, then ends |
| B122 F5 (cloud) | #1145 | Approve line |
| B119 (cloud) | F6 follow-up | batch wait 2→5 min PR |
| qa (Mac) `local_42b61af6-…` | — | gate A as rows merge |
| Standbys (Mac) | — | Lead 25 `local_efdbee17-…`, Lead 26 `local_ab55f159-…` |

## Leads, in order (highest = current)
**Lead 24** `local_ce906423-…` (from ~21:50 IST) · **Lead 23** `local_eda9476d-…` ended (20:11-21:50 IST) · Lead 22, Lead 21, Lead 20, Lead 19 ended · Leads 1-18 earlier. Standbys: Lead 25, Lead 26. Never archive Lead 22: Leads 23 and 24 are nested under it.

## Lessons (6 Nov night, Lead 24)
* The new label guard removed a label at once on a head with no recorded Approve (#1147): a review claimed in notes is not a review on the PR. Check for the `Reviewer: Approve <sha>` line before labelling.
* A PR's own test fixture named "notes" (Markdown) broke the test selector's self-check in a batch (#1158). Batch failures can be the PR's own code, not a hang: read the shard log before re-queuing.
* Gate B refuses a Works claim while a Major on that capability is open (#1072): drop the claim, keep the row.
* A skill line older than `RULES.md` made the Lead tell the founder that paid runs, cancels and hand merges were his (P-384). Check `RULES.md` before saying anything needs the founder.
* Times guessed in messages were wrong by ~30 minutes: only `TZ=Asia/Kolkata date`.
