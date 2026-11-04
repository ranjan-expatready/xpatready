# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 02:35 IST by **Lead 9 · 4 Nov 23:18 IST (ending at ~340k tokens)**; **Lead 10 takes over** (hand-over note lead9-handover-2026-11-05.md) · milestone: **M2 — Super Admin configuration** · rules: **`RULES.md`** (as of P-341; DECISIONS P-342 and P-343 are newer) · earlier STATE: git history of this file (Lead 8 at 23:18 IST), `history/STATE-2026-11-04-0925.md` · Lead 9's running log: lead9-2026-11-04.md in Lead 5's side-session notes folder (`local_a8344098-…`)

## Where we are
* **M2: 52/60 confirmed by qa on main; 53 when #1004 (C3.4 records) lands** (in batch #1008). Confirmed since 23:18 IST: C6.1 (after #948), C11.7 (after #881), C3.4 (after #982); C4.8 now 12/12 on the six and 11/11 on the checkpoint, and back in the protected set on the checkpoint (#991 B77, #1002). **M3: 1/17**, no new M3 work (P-332).
* **Left for M2 (8), each with an owner:** C5.1 #868 · C3.6 #998 (labelled) · C9.1 #978 · C4.11 + C7.7 #967 (+ paid B74) · C4.5 #1005 · C4.1 (#973 QA-221 + qa pack PR after #1004 and #1005) · C10.1 (#1009 rows 9/11/12; rows 7 and 10 are new rows, so not tonight). **60 is not reachable by the morning of 5 Nov**; forecast 56–58 by 07:00 IST.
* **Weekly plan 59% at 02:28 IST**, about 2% an hour (P-331: 85% no new rows; 90% clean stop, "Resume on the new account"). Paid AI today US$0.76 of US$30. Disk 9 GB free (21 idle test databases, 0.49 GB, not dropped, P-334 (11)).

## In flight (02:35 IST), critical path first
| PR / session | What | Next |
|---|---|---|
| #1006 Builder 1 `local_8b65d77f…` | QA-193 root cause: engine ties ranked by key (audit-trail bug) | Opus diff + all-suites CI, label, queue; then s4_run_browser row |
| #868 cloud G5 (C5.1) | gate A PASS; red only on the QA-193 flake; failed jobs re-run | label on green (or after #1006 lands: merge main once) |
| #998 builder-yesno-facts (C3.6) | labelled; qa gate A PASS; red only on the QA-193 flake; re-run | queue on green; skipped duplicate `ci` may block Mergify → empty commit |
| #978 Builder 8 `local_bf2f3e98…` (C9.1) | check fixed (IMM 5476 on Express Entry), Opus r4, head 8e2122732, CI running | label on green |
| #973 S2 `local_c58834aa…` (QA-221) | merging main after #993 | chain after #978/#868; then #1009 |
| #1009 S2 (C10.1 rows 9/11/12) | building; R12b waits (no simulated Validate) | qa OK on step relabels; chain |
| #1005 builder-c45 `local_26419e9b…` (C4.5) | concept approved; UI built; Opus round 2 + breaker running | label; qa gate A |
| #967 builder-yesno-facts `local_3b435f0f…` | ready at 75ce87664; last on demo.ts | merge main when next; qa gate A; lane ends |
| paid runner `local_0c6484d1…` | B74 Go after #967 (worst US$2.05) | one PR with the result for qa |
| qa lane `local_7bb326e9…` | #1004; C4.1 pack PR (G4 headings, suppliesBySteps) after #1004 + #1005 | sole writer of CAPABILITIES/BUGS |
**demo.ts chain:** #978 → #868 → #973 → #967 → #1009 (all conflict pairwise; merge main once each).

## Leads, in order (highest = current)
**Lead 10** `local_e336999f-beb6-41ae-a978-a5bdc886991c` (current from ~02:40 IST) · standbys: **Lead 11** `local_55e21a98-68ad-4429-a441-0462a75e910b`, **Lead 12** `local_9ab43f49-877d-45e4-aa0d-a0abc561c2de` · Lead 9 `local_fa5c998c-d3e5-464b-8aa6-951d79ea78c0` ended ~02:40 IST · Leads 1, 2, 3, 5, 7, 8 ended · Lead 4 archived. Founder (~23:25 IST): "the standbys exist so the night never stalls … 60 out of 60 by the time he wakes … ask him only for what you need from the product side, or what you really can't do yourself".

## Next (in order)
1. #1006 → batches stop failing on QA-193; #868, #998 green.
2. demo.ts chain above; #1005; #998; qa re-scores each.
3. New rows: C10.1 row 7 (29 sections without a printed heading, a person names them) and row 10 (Express Entry and Family sponsorship from their forms, QA-144 slices 4–5); the check_ai_launch_paths follow-up from #1006.
4. Records once a day plus each hand-over (P-336); next about 08:00 IST 5 Nov.

## Waiting for the founder
1. Label this records PR (auto mode refuses the Lead's own records PR unless the founder names it).
2. Old copies to remove for disk, on his yes.

## Founder asks of 4–5 Nov after 23:18 IST (P-228 (9))
**A126** (~23:22 IST) "Yes, merge #984" ✓ · **A127** (~23:25 IST) all rights for #984, #926, #929, #948; one question at a time ✓ · **A128** (~00:30 IST) "fell to 49, expected 55; what can we do; is everything OK?": causes and order answered ✓ · **A129** (~01:05 IST) sleep? anything needed? lanes OK? best speed? what's covered: answered; C10.1 and C4.5 given owners ✓ · **A130** (~01:10 IST) "what is 100% by 07:00?": 51 certain; 55 stood behind ✓ · **A131** (~01:20 IST) "all approvals and all the rights … get the job done": C4.5 builder started ✓.

## Lessons of 4–5 Nov night
* Read qa's PR comments before re-ordering a chain: a PASS posted minutes earlier was missed and cost 30 minutes.
* `git merge-tree` between PRs on a shared file shows which may share a batch; most demo.ts PRs conflict pairwise.
* A flake that fails two unrelated PRs the same way can be a product bug (QA-193: ties ranked by database row order); find the cause, never quarantine blind.
* Records PRs stacked on each other conflict after the first merges: watch "-conflict" in Mergify's summary.
* Times only from the clock: two guessed stamps in messages were 2–20 minutes off.
