# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 20:45 UTC by **Lead 4** (took over from Lead 3 at 20:10 UTC; check at minutes 13 and 43, job a02fd171) · milestone: **M2 — Super Admin configuration**, gate 59/60 with held parts named (P-265, P-284); estimate **about 4 Nov** · M3 per row (P-261) · how we work: `WAY-OF-WORKING.md` · decisions to read word for word: DECISIONS **P-275 … P-285**

## Leads, in order (founder, 2 Nov: "keep naming … so that I know who is the latest lead"; highest number = current)
Lead 1 (`local_17ac4d7f…`, 2 Nov morning) → Lead 2 (`local_0bd306e3…`, ~15:40–18:35 UTC) → Lead 3 (`local_b0474939…`, 18:36–20:10 UTC) → **Lead 4** (started by Lead 3, 20:10 UTC, local, shares the main copy) → Lead 5 · standby (`local_c490b934-7479-4dd1-815a-af7e3fbfba23`) → Lead 6 · standby (`local_235884ee-b9da-4ec3-a2b1-7ee8d8f98a2d`). **P-286:** at about 250k the current Lead rewrites STATE, CronDeletes its check, renames itself "… (ended)" and sends the next standby "take over now" (works from a cron turn). Each Lead renames itself "Lead N · <date> <UTC start>" and, when handing over, starts Lead N+1 itself in a founder-typed turn, then stops its own check (CronDelete). A cron turn cannot start a session: if the context passes about 250k overnight, keep going (1M window) and hand over in the founder's next typed turn.

## Start here (Lead 4)
1. `bash product/tools/lane.sh whoami` → lead. **Lead 3 has handed over and cancelled its check**: its commits on `lead/2026-11-02-b` are not another running Lead; do not ask the founder (asleep). Read DECISIONS P-275…P-285 word for word, then this page and the lead skill.
2. **Overnight (P-285, founder asleep ~20:00–02:00 UTC):** act with all approvals; 30-minute checks (minutes 13 and 43); tokens free below 80% of the weekly plan (44% at 19:53) but none wasted (founder: "please don't waste tokens"); at 80% nothing new starts, builders push and stop, STATE rewritten. Paid AI: the tech lead approves up to **US$50 total tonight**, usual + worst cost in records first (Go comment on the PR), runs only on a Mac paid-runner session. Records PRs merge at least hourly even during a batch. qa per batch (P-277); Sonnet subagents (P-278); merge main only on conflict (P-270).
3. **Restarting work:** local Mac sessions wake on SendMessage; idle cloud ones often don't. Cron turns can't start sessions: leave an own_initiative card and list it under "For the founder's morning".
4. `flow-watch.sh` now also flags labelled PRs with red CI or a conflict (4b) and unfinished M2 rows nobody has pushed to in 90 min (4c; HELD and WAITS lists in the script). Act on every RED each check. A lane counts as working only if it pushed in 90 min.
5. Records: **#578** (this branch) merges once `decision-impact.sh` passes (needs qa's C5.4 → P-279 and C11.3 → P-284 cites). qa was asked at 20:00 UTC to fold its records PRs #567, #582, #581 into one; merge it directly, then #578.

## Progress (20:45 UTC)
M2 on main's scorecard **48/60** (qa's records #581 merged 20:07 UTC; was 41); qa has scored about **46** (in its unmerged records PRs); plus C3.6 (#573 merged), C11.3 (P-284) to score. 2 Nov: 117 PRs merged (87 product, 30 records); M2 34 → ~46. AI spend today **US$9.12** + tonight's Gos. Weekly plan 44%. **Target by ~02:00 UTC: 50+ on main's scorecard.**

## M2 rows not Works, and who has them (20:05 UTC)
| Row | In flight | Then |
|---|---|---|
| C2.6 | #574 conflict → cloud `c26-conflict` | re-label, queue |
| C11.7, C4.11 | #563 QA-163 (cloud `qa163-ci-fix`, conflict resolved 19:55, needs re-approve + label); IMM 5532 paid re-run (local `paid-imm5532`, Go 20:02 on #576, worst US$3.22) | qa labels the result PR (P-275) |
| C3.4 | #585 conflict → local C3.4 session messaged 19:58 | then its paid runs on the tech lead's Go (about US$1–1.5 each, quote first) |
| C11.8 | #570 in batch #591 | qa head check (money path) |
| C3.6, C3.13 | merged (#573, #584) | qa score |
| C11.3 | P-284: "Works, held part excluded" | qa score |
| C5.4 | G1: #587 PR 2a approved; G1 lane (cloud "screens L2") | more PRs |
| C5.5 | G2 #568 queued | build PRs |
| C11.13, C11.14 | G-CORE B2 (cloud `gcore-b2`, started 20:00) | B3 |
| C9.1 | row C9.1-AI **Ready** (Lead 4, 20:40 UTC; brief `design/c91-ai-row-2026-11-02.md`); no builder yet: a card is left for the founder (this turn could not start a session) | PR 1 US$0, then one paid run on the tech lead's Go |
| C10.1 | waits on #563 (needs a released Visitor visa, QA-144) | — |
| C5.1 | held (P-251, P-265) | — |
Also approved/queued, no M2 row change: #554 UX-A part 1 (batch #591).

## Sessions
This night's (one row each): `qa163-ci-fix`, `c36-ci-fix` (done), `c118-finish` (done), `gcore-b2`, `c26-conflict` (cloud); `paid-imm5532` and the C3.4 AI step (local). qa: "qa: score tonight's merge batches (P-277)" (cloud, running). Earlier lanes from Leads 1–2: see `ListAgents`; screens L2 (G1) and runtime M3-A still running.

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 · L-SA6–L-SA11 · G5 · the P-236 rename · C11 · E1–E6 · design-only items · SH3/SH4 contracts go to the product owner with them.

## To archive (P-283)
* **Nested sessions move with their parent in the sidebar** (18:35 UTC: moving the previous Lead into "To archive" took its 11 lanes with it, several still working; moved back to Ungrouped at once). So: move a Lead chat only when none of its lanes is still working; until then archive finished lanes one by one. A nested session cannot be moved alone, so the tech lead archives finished ones directly: the Mac paid runner was archived 18:50 UTC (copy clean, PRs merged; a fresh runner per Go).
* Cloud: the founder archives a parent (the previous Lead) once all its lanes are done; the tech lead says so in chat in one line (P-283 as amended 3 Nov).

## For the founder's morning
* **C9.1-AI builder** (forms, one row): card left by Lead 4 at 20:45 UTC; start it, or Lead 4 starts it at your next typed message.

## Waiting for the founder
1. **Open a new chat and type `/lead`** (this hand-over).
2. **Archive** the previous Lead chat on the Mac (Remote Control attached, so the tech lead could not) and the old forms L5, forms L8 and qa lanes on claude.ai/code.
3. **Send the SA-01B product owner** the reply drafted on the Mac (`archive/2026-11-02-founder-drafts/`), the SH3 contract (#509), the G-CORE concept (#504) and `design/note-to-sa01b-po-2026-11-02-sqr.md`: the only way G5 and the held parts unblock.
4. Tell the team they drop their "Fill this screen" (P-245), pending the product owner's ruling.

## Founder asks of 2 Nov, this chat (P-228 (9))
A46 token savers: qa per batch (P-277) ✓, Sonnet pilot (P-278) ✓ · A47 G1 dates count (P-279) ✓ · A48 55 in 2–3 hours, the whole build today, close idle lanes: answered with evidence (not reachable without a lower bar), six more one-row builders (P-280) ✓ · A49 no token stop, paid-run Go within US$25 a day (P-281) ✓ · A50 machines: GitHub Pro bought (P-282) ✓ · A51 Wave 1 (= M2) today? no, about 4 Nov (estimate); "11–12" is P-255's gate date; why bugs after merge and how to reduce (item 5 above); who leads (the tech lead alone, every session); when to switch (now) ✓ · A52 breakdown of built / half-built / not built and the M3 plan: this page ✓. · **A53 (new tech lead, ~18:55 UTC)** weekly plan 40%, rising about 4.5 points an hour (34% at 17:30, 40% at 18:50), so it runs out about 08:00 UTC 3 Nov at that pace, extra usage off: founder chose "Keep the pace" (P-281 stands; reported at each check) ✓. · **A55 (~19:50 UTC)** "17 Partial … why can't you just complete and merge": answered with the per-row table (6 rows approved and waiting on merge + qa, 3 on paid runs, 3 multi-PR, C10.1 waits on QA-163, held parts); C11.3 held part ruled (P-284) ✓ · **A56 (~20:00 UTC)** overnight mandate, tokens to 80% of the weekly plan, paid AI up to US$50 tonight (P-285) ✓ · **Paid runs tonight:** IMM 5532 re-run (C11.7) Go at 20:02 UTC on #576, usual US$1.55, worst US$3.22, local session paid-imm5532 · **A54** GitHub Pro: founder confirmed active (19:45); 20 jobs at once seen at 19:21, the tech lead counts at each check ✓. Earlier asks of 2 Nov (A3–A45): git history of this file.

## Lessons of 2 Nov evening
A records commit pushed after its PR merged is stranded (P-281 was): check the PR is open before each push · Mergify's final `ci` job waits for a machine even after its shards pass: measure machine waits before blaming builders · sessions cannot be started from a cron turn.
