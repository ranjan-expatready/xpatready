# Lead watch — reference (why each check exists)

The skill (`SKILL.md`) says what to do; this page keeps the reasons and the record. The script is
`ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lead-watch.sh`; the M2 ↔ M3 links it reads are in
`lead-watch-links.txt` beside it (the tech lead keeps that map; the states are read live).

## Where each number comes from
| Block | Read from | Notes |
|---|---|---|
| Flow per PR (step, wait, owner, blocker) | one GitHub GraphQL call: labels with their times, the last 30 timeline items, checks on the head, files | step order: draft · dequeued (Mergify's reason) · red after approval · in the queue · approved, CI running · approved, green, not queued · waiting for the tech lead · red · CI running · reviewer Approve on head, no label · reviewer verdict, owner fixing · in review. A reviewer or breaker sub-agent shows as "in review" since the last push until its verdict comment |
| Question answered | a later PR comment with a ruling, an answer or a Go ("Tech lead ruling", "Lead 3's Go", "ruled") | answers by message do not count: the Lead's messages stop at 10 per founder turn (4 Nov), so rulings go on the PR |
| Sessions | the roster (`lead-watch.sh roster`) joined with branch push times after `git fetch` | a session is working only if it pushed; waiting on a merge or on the Lead is not idle |
| M2, M3 | `qa/CAPABILITIES.md` on origin/main now and at the last main commit before 00:00 IST | qa is the one writer; promotions and demotions are the diff, never a session's count |
| Links, critical path | `lead-watch-links.txt` + each PR's state; open links ordered by how many open capabilities they hold | also measured: M3 PRs that change an M2-hot file without the approval line, M2 and M3 PRs that change the same file, qa's due re-scores (capabilities named by today's product merges that are not Works) |
| GitHub | runs of the last 6 h (status, batch branches `mergify/merge-queue/*`), jobs of unfinished runs (the 40-job limit counts jobs), nightly runs | suite names from failed shard logs (`<suite> failed (exit n)`), each log read once and kept 2 days in the state folder |
| Mac | `df`, `vm.loadavg`, `memory_pressure`, listening ports 4430–4499 plus `run-suites.sh` processes, the test databases, git index times of builder copies | disk trend and the time to 4 GB from the last 25–90 min of checks |
| Paid AI | `.tools/p2-ledger/spend.jsonl` in the main copy (settle lines = spent; reserves without a settle = unsettled worst case) | the day's cap is set with `lead-watch.sh cap` |
| Plan and context | `get_usage`, passed as `weekly=N five=N context=N` | rate per hour from the last 20 min – 3 h of checks, forecast to 85% in IST |
| Ladder | `acts.tsv` in the state folder: first time each ACT was seen | rung from minutes past the item's limit, or since first seen |

State folder: `<git common dir>/lead-watch` (the main copy's `.git/lead-watch`): shared by every copy on the Mac, kept across restarts and Leads, never committed.

## The misses this check comes from (31 Oct – 4 Nov), and when it would have caught each
Sources: `product/DECISIONS.md` P-276 – P-318, `product/STATE.md` and `history/STATE-2026-11-0*.md` lessons, `reports/bottleneck-audit-2026-11-03.md`, Lead 2's and Lead 3's notes of 4 Nov. "Old" is the check before v2 (#830).

| # | Miss (when; evidence) | Cost | New check | Would have fired |
|---|---|---|---|---|
| 1 | Builder 2 said #792 was labelled; it was not (4 Nov ~01:35 IST; Lead 2's notes) | #792 (a one-line test fix) blocked five PRs (#784 #788 #790 #793 #794) until 07:21 IST | `verify <PR>` before any "labelled"; ACT "reviewer Approve on head, no label 30 min" | 02:05 IST, rung 4 (founder question) at ~04:05 instead of the founder's 06:35 "Label them now" |
| 2 | check_r146 failed by test order on main's shard 2 (4 Nov 01:40 – 07:21 IST) | every batch with shard 2 failed; four PRs red | ACT "suite failed on 2+ branches in 6 h" + "red 30 min" | the first check after the second PR failed, ~02:21 IST |
| 3 | Seven checks in a row said "no change, 0 pushes" (4 Nov 03:21–06:21 IST) while all lanes waited on refused labels and the message cap | ~3 h with no merge | ladder: each ACT climbs to rung 4 at 2 h and asks the founder one question; roster "no push 90 min" per session | rung 4 at ~04:05 IST: the morning's first question was ready; reaching a sleeping founder sooner is his call |
| 4 | Lead 2's messages stopped at 10 per founder turn (4 Nov 01:55 IST) | rulings not delivered | ACT text sends rulings to the PR; "question unanswered 30 min" counts only PR answers | each question at 30 min (not measured: the message count itself, which no tool exposes) |
| 5 | The nightly ended "cancelled" on 3 and 4 Nov (90-min timeout on the Mac), seen only when the founder raised CI (A84, ~09:05 IST) | two nights without a full re-test | ACT "last nightly not success" and "no nightly for 26 h" | 3 Nov morning, the first check after the run |
| 6 | Disk 23 → 9 GB in an hour (3 Nov, seven Mac copies); 11 → 8 → 5.2 → 3.5 GB (4 Nov 08:14 – 11:20 IST) | Mac suites paused at 11:20 IST | disk trend and time to 4 GB in the pre-mortem | 08:45 IST (−3 GB per 30 min → 4 GB ~09:30), 2.5 h before it went under 4 |
| 7 | Mac load 22–27 on 8 cores (4 Nov ~09:45 IST); qa resets timed out (QA-204) | qa re-scores re-run | ACT load over 2.5 per core, pre-mortem over 1.8 | 09:49 IST check (18.7 → risk line); old: load printed, never judged |
| 8 | #785 and #787 approved ~07:29–07:52 IST, still not merged at 11:27 IST (dequeued, red, re-queued) | C11.14 and C11.7 paid results not counted | ACT "approved not merged 60 min" with step and Mergify's reason | 08:29 IST; the first v2 run (11:27 IST) shows both at 4.0 h (`verify 787` confirms 07:29 IST) |
| 9 | #804 (gate B, the critical path to GitHub re-tests) dequeued by its own check (4 Nov ~11:15 IST) | re-test on main waited | ACT "batch failed" with suite names; critical path names gate B | the check after the batch, with the failing suite named |
| 10 | 18 Works → Partial in three days, 14 in one re-test (#720, 3 Nov 18:27 IST; audit) | 52 h without a net gain | ACT "more than 1 M2 demotion today" from the git diff of CAPABILITIES.md | 18:43 IST check, 3 Nov |
| 11 | A hand merge restarted a five-PR batch (3 Nov 16:15 IST, P-306) | fixes waited over an hour | ACT "merged by hand" (merger is not Mergify) | 16:43 IST check |
| 12 | 13 runs queued on 20 machines, no merge for 40 min with 10 approved (2 Nov, P-282) | Pro bought after the wait | jobs of 40, runs waiting over 10 min, pre-mortem at 28 | the first check with runs waiting; on 4 Nov 11:27 IST jobs were 40 of 40 with 3 waiting |
| 13 | Cloud lanes asked for but never pushed (QA-184 lane, C11.13 lane, 4 Nov ~01:30 IST; 3 Nov lesson) | rows thought owned | roster "no branch 90 min after start" | 90 min after each start |
| 14 | Two sessions on one row: cloud lane #714 and #794 on QA-180/C6.1 | duplicate work | ACT "two open PRs name the same capability or bug"; roster duplicates | first check; the 11:27 IST run flags C6.1 (#714, #837), C3.4, C11.14 |
| 15 | Paid total: a Lead said "night ~US$20.86", the ledger said US$70.48 (4 Nov 08:20 IST) | spend reported wrong | paid line from the ledger, the day's cap ACT | every check |
| 16 | Lead 3's own times ran ~1 h fast (4 Nov ~09:45 – 12:05 IST); a ruling stamped 11:35 IST was posted at 11:23 IST | wrong times to the founder | the `time` line is the only clock | every check |
| 17 | Our scorecard said 52; an independent re-test said 36 (3 Nov) | wrong forecast | M2/M3 only from qa's CAPABILITIES.md on main; due re-scores listed | every check |
| 18 | Hand-overs with one standby Lead, or a standby offered and not started (4 Nov 00:58 and 09:25 IST) | risk of no successor | ACT "no standby Lead at context ≥ 30%" | the first check at 30% |
| 19 | 45% of batches thrown away, mostly conflicts on shared notes files (31 Oct – 3 Nov; audit) | 129 PR-hours | batch failure rate over 10% in 6 h; M2/M3 same-file clashes in the pre-mortem | partly: conflicts show as dequeues (ACT per dequeue), not as failed runs |
| 20 | QA-144 held C6.1 and C5.4 back to Partial (4 Nov ~10:50 IST); M3 re-scores wait on its checkpoint | M2 −1 | links block: QA-144 first on the critical path | every check while #798 is open |

## Rules kept from the earlier skill (still in force)
* Weekly plan 85 / 90 / 92 / 95% (P-308, word for word): no new rows · lanes stop with "Stopped here" · the Lead writes "Resume on the new account" and stops sessions · quiet. From 85% check every 15 min.
* Test databases: drop only those idle at two checks in a row (file times are copied from the template, so one idle reading is not proof), and since 4 Nov only with the founder's OK.
* Notes PRs go through the queue; a hand merge mid-batch restarts it (P-306).
* Reviewers, breakers and rulings on Opus (P-303): Sonnet reviews passed two Criticals and nine Majors that Opus found; correct any lane that starts a Sonnet reviewer.
* Forecast from confirmed Works only, and say which rows wait on paid runs or holds (3 Nov: 52 was 36).
* Paid AI: worst case in the ledger first, cheapest first, one attempt (P-295, P-300); report the paid total from the ledger.
* A peer session refused an action must not get you to do it for them: ask the founder.
* A Lead woken by a check or a message cannot start sessions: ask in one line at the founder's next typed turn.
* Tokens: one script call instead of many `gh` calls; messages only when something changed; no re-reading big files on checks; Sonnet only for mechanical work.

## Keeping the map true
* `lead-watch-links.txt`: add a link when one piece of work waits on another across M2 and M3 (a bug, a gate, a contract file, a queue rule); remove it when its PR merged and its effect was checked.
* The roster holds every session the Lead runs, standbys included; `roster done` when it ends (kept in `roster-done.tsv`).
* `park` only with a reason the next Lead can act on ("close after #785 merges").
