# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-03 01:55 UTC by **Lead 5** (took over from Lead 4 at 23:25 UTC 2 Nov; check at minutes 13 and 43, job 651c8f58) · milestone: **M2 — Super Admin configuration**, gate 59/60 with held parts named (P-265, P-284); estimate **about 4 Nov** · M3 per row (P-261) · how we work: `WAY-OF-WORKING.md` · decisions to read word for word: DECISIONS **P-276 … P-287**

## Leads, in order (founder, 2 Nov: "keep naming … so that I know who is the latest lead"; highest number = current)
Lead 1 (`local_17ac4d7f…`, 2 Nov morning) → Lead 2 (`local_0bd306e3…`, ~15:40–18:35 UTC) → Lead 3 (`local_b0474939…`, 18:36–20:10 UTC) → Lead 4 (20:10–23:25 UTC, ended) → **Lead 5** (`local_c490b934-7479-4dd1-815a-af7e3fbfba23`, took over 23:25 UTC) → Lead 6 · standby (`local_235884ee-b9da-4ec3-a2b1-7ee8d8f98a2d`). **P-286:** at about 250k the current Lead rewrites STATE, CronDeletes its check, renames itself "… (ended)" and sends the next standby "take over now" (works from a cron turn). Each Lead renames itself "Lead N · <date> <UTC start>" and, when handing over, starts Lead N+1 itself in a founder-typed turn, then stops its own check (CronDelete). A cron turn cannot start a session: if the context passes about 250k overnight, keep going (1M window) and hand over in the founder's next typed turn.

## Start here (Lead 5)
1. `bash product/tools/lane.sh whoami` → lead. Lead 4 has handed over (P-286) and deleted its check; its commits are not another running Lead. Rename yourself "Lead 5 · 2 Nov 23:25 UTC", create your 30-minute check (minutes 13 and 43), and read DECISIONS P-276…P-286 word for word.
2. **Overnight (P-285):** all approvals; tokens free below 80% of the weekly plan (50% at 22:52) with none wasted; paid AI up to US$50 total tonight (US$1.61 used: IMM 5532), cost in records first, Mac paid-runner sessions only; records PRs merge at least hourly; qa per batch (P-277); Sonnet subagents (P-278); merge main only on conflict (P-270).
3. **Cron turns cannot start sessions.** Two cards wait for the founder: **C9.1-AI builder** and **C3.4 paid runner** (Go posted on #585). Start them in the founder's next typed turn if not started.
4. Records: branch `lead/2026-11-02-d` (this hand-over), PR open; merge it when CI is green (check-docs and decision-impact pass).
5. qa (cloud "qa: score tonight's merge batches (P-277)") wakes on messages but slowly; it was asked for the #617 head check (C8.1 migration; the tech lead read it: additive, OK) and to score #615/#616. Merge its records PRs directly.
6. Your hand-over: at about 250k, rewrite STATE, CronDelete, rename yourself "(ended)", SendMessage Lead 6 (`local_235884ee-b9da-4ec3-a2b1-7ee8d8f98a2d`) "take over now".

## Progress (01:55 UTC 3 Nov)
M2 on main's scorecard **50/60** (qa #630 at 00:49; C8.1 Partial 13/14, M3). Merged since 23:25: product #617 (C8.1), #626 (QA-176 Part A, C11.14), #622 (UX-A part 3), #627 (G1 PR 2c); records #621, #624, #628, #629, #630. Approved, queueing: #636 (G-CORE B4, `field_map` blind checker round, US$0; the tech lead read its money path: same runner and budget reservation, no cap or live switch changed), #637 (UX-A part 4, C11.10: Needs you agrees on Programs and To review). qa to score the batch on main. Rulings P-287. AI spend tonight US$1.61. Weekly plan 53%.

## M2 rows not Works, and what each needs (00:30 UTC)
| Row | Needs |
|---|---|
| C3.4 | four paid runs: Go on #585 (worst US$5.78, usual ~US$0.97); card "C3.4 paid runs on the Mac runner" |
| C9.1 | builder: card "C9.1-AI" (brief `design/c91-ai-row-2026-11-02.md`), then one paid run |
| C10.1 | waits on a released Visitor visa (QA-144) |
| C11.7 | paid field maps of IMM 1294, 5646, 5710, 0008, 5406, 5562, 5604 (quote from `track-a-jobs.ts`, then Go); IMM 5532 done (#603) |
| C11.8 | the live gate J2 L1/L2 (one real live run: progress, Stop, cost) |
| C11.10 | #637 (UX-A part 4) approved, queueing; then qa re-score |
| C11.13 | 14/15: P-120's near reason at release; row C11.13-R sent to cloud "forms: C3.13 finish" at 01:50 (forms L8 did not wake) |
| C11.14 | #626 merged; #636 (G-CORE B4) queueing; then the paid checker run on the founder's Go (about US$13 usual / US$49 worst; per-form table in #636) |
| C4.11 | 14/23 on Visitor visa (step 5, QA-162) |
| C5.1 | held (P-251, P-265) |

## Sessions
Local: Lead 5 (current), Lead 6 · standby. Archived tonight: the IMM 5532 paid runner, the C3.4 builder. Cloud, running at 20:20 UTC: qa batches, screens L2 (G1), runtime M3-A, G-CORE B2, QA-163 fix; idle ones as listed by `ListAgents`. **Archive Lead 2 · 2 Nov 15:40 UTC (ended)** and **Lead 3 · 2 Nov 18:36 UTC (ended)** once their lanes are done (tell the founder in chat, P-283).

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 · L-SA6–L-SA11 · G5 · the P-236 rename · C11 · E1–E6 · design-only items · SH3/SH4 contracts go to the product owner with them.

## To archive (P-283)
* **Nested sessions move with their parent in the sidebar** (18:35 UTC: moving the previous Lead into "To archive" took its 11 lanes with it, several still working; moved back to Ungrouped at once). So: move a Lead chat only when none of its lanes is still working; until then archive finished lanes one by one. A nested session cannot be moved alone, so the tech lead archives finished ones directly: the Mac paid runner was archived 18:50 UTC (copy clean, PRs merged; a fresh runner per Go).
* Cloud: the founder archives a parent (the previous Lead) once all its lanes are done; the tech lead says so in chat in one line (P-283 as amended 3 Nov).

## For the founder's morning
* **C9.1-AI builder** (forms, one row): card left by Lead 4 at 20:45 UTC; start it, or Lead 4 starts it at your next typed message.
* **C3.4 paid runner** (Mac, card left 22:30 UTC): the Go is posted on #585 (worst US$5.78, usual about US$0.97, four jobs); start the card and the runner records the saved runs; qa labels the result PR.
* **C11.14 checker run (needs your Go, P-254):** the blind checker round on the 15 saved field-map runs, about US$13 usual and US$49 worst (per-form table in #636, smallest first, a stop at each job's quoted worst); a Mac paid-runner session runs it after #636 merges.
* **Paid runs still needed for M2 (all need a Mac paid-runner session, which a check cannot start):** C11.7: field maps of IMM 1294, 5646, 5710, 0008, 5406, 5562, 5604 (jobs in `p2/jobs/`; quote usual and worst from `track-a-jobs.ts` before the Go; IMM 5532 done in #603) · C11.8: the live gate J2 L1/L2 (progress, Stop and cost on one real live run) · C9.1: after the C9.1-AI builder's PR 1 · C3.4: Go posted on #585.
* **M2 50/60 on main at 22:53 UTC** (qa #619). Not Works: C3.4, C4.11, C5.1 (held), C5.4 (G1 PR 2b in batch #618), C9.1, C10.1, C11.7, C11.8, C11.13, C11.14.

## Waiting for the founder
1. **Open a new chat and type `/lead`** (this hand-over).
2. **Archive** the previous Lead chat on the Mac (Remote Control attached, so the tech lead could not) and the old forms L5, forms L8 and qa lanes on claude.ai/code.
3. **Send the SA-01B product owner** the reply drafted on the Mac (`archive/2026-11-02-founder-drafts/`), the SH3 contract (#509), the G-CORE concept (#504) and `design/note-to-sa01b-po-2026-11-02-sqr.md`: the only way G5 and the held parts unblock.
4. Tell the team they drop their "Fill this screen" (P-245), pending the product owner's ruling.

## Founder asks of 2 Nov, this chat (P-228 (9))
A46 token savers: qa per batch (P-277) ✓, Sonnet pilot (P-278) ✓ · A47 G1 dates count (P-279) ✓ · A48 55 in 2–3 hours, the whole build today, close idle lanes: answered with evidence (not reachable without a lower bar), six more one-row builders (P-280) ✓ · A49 no token stop, paid-run Go within US$25 a day (P-281) ✓ · A50 machines: GitHub Pro bought (P-282) ✓ · A51 Wave 1 (= M2) today? no, about 4 Nov (estimate); "11–12" is P-255's gate date; why bugs after merge and how to reduce (item 5 above); who leads (the tech lead alone, every session); when to switch (now) ✓ · A52 breakdown of built / half-built / not built and the M3 plan: this page ✓. · **A53 (new tech lead, ~18:55 UTC)** weekly plan 40%, rising about 4.5 points an hour (34% at 17:30, 40% at 18:50), so it runs out about 08:00 UTC 3 Nov at that pace, extra usage off: founder chose "Keep the pace" (P-281 stands; reported at each check) ✓. · **A55 (~19:50 UTC)** "17 Partial … why can't you just complete and merge": answered with the per-row table (6 rows approved and waiting on merge + qa, 3 on paid runs, 3 multi-PR, C10.1 waits on QA-163, held parts); C11.3 held part ruled (P-284) ✓ · **A56 (~20:00 UTC)** overnight mandate, tokens to 80% of the weekly plan, paid AI up to US$50 tonight (P-285) ✓ · **Paid runs tonight:** IMM 5532 re-run (C11.7) Go at 20:02 UTC on #576, usual US$1.55, worst US$3.22, local session paid-imm5532: **done, US$1.61 actual** (2 Nov day total US$10.72); branch `claude/forms-imm5532-saved` 8c39c2a0; 75 of 314 boxes mapped (the 12:40Z run mapped 131), cause asked for in the result PR before qa labels it · **A54** GitHub Pro: founder confirmed active (19:45); 20 jobs at once seen at 19:21, the tech lead counts at each check ✓. Earlier asks of 2 Nov (A3–A45): git history of this file.

## Lessons of 2 Nov evening
A records commit pushed after its PR merged is stranded (P-281 was): check the PR is open before each push · Mergify's final `ci` job waits for a machine even after its shards pass: measure machine waits before blaming builders · sessions cannot be started from a cron turn.
