# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_ab55f159-491a-451b-a4bc-e21d33d4e5e4 Lead 26 · 7 Nov ~09:35 IST (took over from Lead 25 at ~375k context, P-314)

updated: 2026-11-07 09:35 IST by **Lead 25** (hand-over to Lead 26) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: 9 M3 rows merged, 2 of 17 Works (C1.3, C11.5)** · rules: **`RULES.md`** + DECISIONS P-354 to P-394 · earlier page: `history/STATE-2026-11-07-0935-lead25.md` · this branch: `lead/2026-11-07-lead26` (from #1128's head; #1128 was queued, so its branch is left alone)

## Hand-over Lead 25 → Lead 26 (09:35 IST): read first
* **Account (P-394, founder ~09:33 IST: "Finish rows, then switch"):** weekly 44% at 09:26 IST. No NEW rows from ~45%; rows in flight finish (ceiling 50%, P-383); then the account switch with the founder (`RESUME-ON-NEW-ACCOUNT.md`, GitHub connection first). Held as new rows: A5, B5, C2, the kind-job write-token fix, the b78 hang row.
* **Watchdog (P-389):** Lead 26 ran it (cron ccc2c686): delete it on take-over, then message Lead 27 (`local_a2122a0e-82ba-44eb-913a-0d144a6da601`) "start the watchdog" (its brief has the steps).
* **Records:** #1128 (Lead records + tools, reviewed: Opus APPROVE + re-review APPROVE) is labelled and queued. After it merges, open the records PR from this branch (its diff is then this hand-over only), and from tomorrow a fresh `lead/<date>` from `origin/main` (P-388).
* **Never run guard/test suites in the main copy** (7 Nov 09:18 IST incident: a sandboxed `mktemp -d` failed and a test's git script ran in the real repo; recovered, fixed in 6e3a1a0f9). Use a scratch clone and delete it after (2.5 GB).

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F1 | C1.3: "Follows" is only a suggestion and nothing on main suggests a next application. Build a real suggestion? | Not in M3: keep as a recorded limit; a backlog row after M3, with follow rules cited from IRCC | nothing now (C1.3 Works) | 6 Nov 23:52 IST | **answered 7 Nov ~08:26 IST: "After M3"** (P-391; BACKLOG L-follow) |
| F2 | C6.9's new screen (A4, rules per combination): look at it when it lands, with screenshots and the best-in-class study (`reports/best-in-class-C6.9-A4-2026-11-07.md`, running) | changes you want become follow-up rows | nothing (look as it lands, P-392) | 7 Nov 08:35 IST | #1172 merged 08:43 IST; study done (22 products, 38 sources): A4 leads on draft/sign-off/release and "can't tell"; gaps: try rules on sample families (M3-size), "who must meet this gate" by role (after M3), official source per gate (M3-size); screenshots from qa's C6.9 walk |
| F3 | C6.9 is "case check from **confirmed** facts", but A4 counts an unconfirmed answer as answered (concept BR-9) and only marks it on the case page | Keep counting it, but the outcome says "rests on N unconfirmed facts" (small wording change, fits M3); a stricter per-gate setting after M3 | C6.9 follow-up row | 7 Nov 08:48 IST | **answered ~08:55 IST: "whatever is best ... based on the fact" → line added (P-393, row A8 = B124)** |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); they use the `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes, ids, rulings: the file lead25-pending in Lead 19's notes folder (`.../side-session-notes/local_8acced9f-…`), items 1-26.
**Stall guard (P-388, P-389):** while the founder is away no call that can wait on a prompt; `lead-watch.sh` prints an ACT when the previous check ran over 40 min ago: tell the founder at once. Founder questions go in "For the founder" and are asked at his next typed turn, oldest first (P-390). New screens go there as they land, with the best-in-class check before labelling (P-392).
**To-do, in order:**
1. CronCreate the check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`), Monitor `prwatch.sh` on `1180 1075 1188 1128 1196 1199` plus new PRs (B124, QA-293, A7, A3, B125). Delete your watchdog cron; message Lead 27 "start the watchdog".
2. **Label on Approve line + green:** C1 #1180 (reworked f130354b6 on A1 + A2; wait for its Approve line); B124 (C6.9 unconfirmed-facts line, M3 A4 lane, branch `claude/screens-b124-unconfirmed`); QA-293 fix (Major, representative tab 404; M3 A2 lane, `claude/qa293-representative-answers`); A7 (QA-289, A2 lane); A3 (A1 lane); B125 (gate B checkpoint mode, B122 #1145 lane; P-214 merge-flow fix). #1188 F6 (Mergify batch wait 5 min, Approve 822555b9c, green): label when the product queue is empty. qa records: #1196 labelled; #1199 after qa merges main into it.
3. **qa gate-A goes** (`local_42b61af6-…`): C6.11 when A7 + QA-293 land; C6.9 + C8.2 need a real checkpoint run: after B125 merges, dispatch nightly `capabilities="C6.9 C8.2 C6.4"`, `data=checkpoint` (founder OK'd the dispatch, 7 Nov) and send qa the run; C6.9 also gets B124's gate A.
4. **P-388 measurement:** batch failure rate over the 10 batches after 09:19 IST (B121 + B122 on main), `flow-measure.py --since 2026-11-07T03:49:00Z`; report at each check against 10%; verdict ~18:30 IST.
5. **Hour-12 forecast** at ~11:17 IST from measured rows (M3 plan #1167 section 5).
6. **F2:** show the founder C6.9's new screen (qa screenshots in `qa/reports/2026-11-07-c69-c82/` on #1199) with `reports/best-in-class-C6.9-A4-2026-11-07.md`.

## Where we are (09:35 IST)
* **M3 rows merged:** B120, B2 (night); A2 #1072, B1 #1073 (08:41), A4 #1172, A1 #1084 (08:43), B117 #1148 (09:18), B122 #1145, B121 #1149 (09:19). Main 4f42b9797.
* **qa (09:20):** C6.4 Partial 19/30 on the checkpoint; C6.9, C8.2 Partial "ready except P-339" (Mac packs 15/15, 12/12; nightly 42335507309 ran fixture only, gate B `whereOf`); M2 60/60 holds. New bugs: QA-292, QA-294 (Minor), **QA-293 Major**.
* Batches today: 5aca150d89 failed (C1 vs A1/A2), 7fce998fe2 failed (same); the rest merged. Disk 10 GB (216 idle test databases dropped, founder OK). Spend today US$0. Weekly 44%, Lead context ~375k.

## In flight
| Lane | Where | Row → next |
|---|---|---|
| M3 A1 (cloud) | session_015r4b48kw3JZTxj3QymQ6NR | A3 |
| M3 A2 (cloud) | session_015r4b498e1jCsPDDDvdXgcE | A7 PR → QA-293 fix → (A5 held at 45%) |
| M3 A4 / seat B-2 (cloud) | session_015r4b4AB8rM3oGURRbp17g2 | B124 → (B5 held) |
| M3 C1 (cloud) | session_015r4b4BcPvT6b7ntAX9yhS8 | C1 rework #1180 → (C2 held) |
| B122 #1145 (cloud) | session_015r4b4AUe4k9SELZXqMjKHm | B125 → (token fix, b78 row held) |
| B119 (cloud) | #1188 F6 | label when queue empty |
| qa (Mac) | `local_42b61af6-fa15-4fbf-9bcb-5c4cb6e17905` | #1199; gate A as rows land |
| Lead 27 (Mac) | `local_a2122a0e-82ba-44eb-913a-0d144a6da601` | standby + watchdog |

## Leads, in order (highest = current)
**Lead 26** `local_ab55f159-…` (from ~09:35 IST 7 Nov) · **Lead 25** `local_efdbee17-…` ended (07:33-09:35 IST) · Lead 24 `local_ce906423-…`, Lead 23, Lead 22, Lead 21, Lead 20, Lead 19 ended · Leads 1-18 earlier. Standby: Lead 27; top up one more at the founder's next typed turn. Never archive Lead 22 (Leads 23-24 nest under it).

## Lessons (7 Nov morning, Lead 25)
* A run said "checkpoint" but gate B used fixtures (setup steps in the run line): read the pack lines ("on the checkpoint" vs "fixture only"), not the input, before telling the founder anything counts.
* A test suite run from the sandbox in the main copy damaged it (mktemp failed): suites only in a scratch clone.
* zsh does not split `$var` in `for d in $list`: use `${(f)list}` or xargs.
* Pushing to a queued PR's branch removes its label (label guard): put new records on a new lead branch.

## Lessons (6 Nov night, Lead 24)
* The new label guard removed a label at once on a head with no recorded Approve (#1147): a review claimed in notes is not a review on the PR. Check for the `Reviewer: Approve <sha>` line before labelling.
* A PR's own test fixture named "notes" (Markdown) broke the test selector's self-check in a batch (#1158). Batch failures can be the PR's own code, not a hang: read the shard log before re-queuing.
* Gate B refuses a Works claim while a Major on that capability is open (#1072): drop the claim, keep the row.
* A skill line older than `RULES.md` made the Lead tell the founder that paid runs, cancels and hand merges were his (P-384). Check `RULES.md` before saying anything needs the founder.
* Times guessed in messages were wrong by ~30 minutes: only `TZ=Asia/Kolkata date`.
