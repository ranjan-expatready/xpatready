---
name: lead-watch
description: The tech lead's 30-minute check for the Pathway Configurator - the whole pipeline measured, never taken from a session's words - every open item's owner, step, wait and blocker; M2 and M3 as separate blocks with their links and the critical path; GitHub machines, the merge queue, the Mac, paid AI, plan and context; a pre-mortem; an escalation ladder; the hand-over checklist. Use on every scheduled check, when the founder asks "all ok?", "are resources fine?", how close a milestone is, or before a hand-over.
---

# Lead watch: catch every problem before the founder does

Outcome first: **quality** (P-303), **complete** (Works only on an independent re-test, P-290), **on time**, then **tokens**. Every fact comes from a tool or an exit code: "labelled", "pushed", "green" and "merged" are true only when GitHub says so (a builder's "labelled" on #792 was false; a Lead's paid total was off by US$50, both 4 Nov). Times only from the script's `time` line, never your own estimate (a Lead's notes ran an hour fast on 4 Nov).

## Each check: two calls, then act
1. `get_usage`, then `bash product/tools/lead-watch.sh 30 weekly=N five=N context=N` (its numbers). Exit code = ACT lines.
2. Act on every ACT line at its rung (below), oldest first. Do not re-read STATE, BACKLOG or DECISIONS on a check.
3. Before you say labelled, pushed, green or merged: `lead-watch.sh verify <PR>`.
4. Keep the script's state true when it changes, not on every check: `roster add|set|done` when a session starts, gets a row or ends; `park <PR> "<why>"` for a PR knowingly left; `ask "<q>"`/`answered <n>` for the founder's questions; `cap <US$>` when the founder sets the day's paid cap; `cron "<prompt>"` when you create the check; `lesson "<line>"` once a day.

## The escalation ladder (the rung is printed on each ACT, from minutes past its limit)
| Rung | Age | Do |
|---|---|---|
| 1 | under 30 min | fix it yourself (rule, merge main, re-label, park) |
| 2 | 30–60 min | message the owner with the exact next step; rulings on the PR, not by message (10 messages per founder turn) |
| 3 | 1–2 h | replace the session (a cloud session silent after a message is gone) |
| 4 | over 2 h | ask the founder one question, recommendation first (`ask`), at his next typed turn |

Limits behind the ACT lines: approved not merged 60 min · red 30 min · question for the tech lead 30 min · reviewer Approve without a label 30 min · no push 90 min · any failed batch · any dequeue · two sessions or PRs on one row · disk under 4 GB (pause suites) or under 10 GB with idle databases (ask before dropping) · load over 2.5 per core · copies over 3 · weekly plan 85/90/92/95% (P-308) · context 40% (hand over, P-314 (3)) · paid spend over the day's cap · nightly not green · a suite failing on two branches.

## Tell the founder (his standing rule, 4 Nov), in IST, only what changed
Separate blocks, in the script's order: **M2** · **M3** · **M2 workflow, sessions and sub-agents** · **M3 workflow, sessions and sub-agents** · **links between them and the critical path** · **pre-mortem** (the next likely failure and what you did about it). Then anything he must answer, as one question. Numbers from the script only.

## Hand-over (at 40% context, or sooner if you lose track)
`bash product/tools/lead-watch.sh handover 30 …` prints the check plus the checklist: open questions and rulings, pending labels, each session and its next step, founder asks, parked PRs, the cron prompt, the day's lessons. It goes into STATE.md and the notes file before "take over now"; the next Lead re-creates the same cron.

Why each check exists and the miss it comes from: `reference.md` beside this file.
