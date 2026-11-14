# Bake squeeze: can walk 1 land on 13-14 Nov without lowering the bar?

Written 11 Nov 2026, 20:00-21:00 IST, by a Fable planner (P-455 (5): planning and challenges only; read-only on code) for Lead 18 (series 2, `local_0e19ea76`), answering the founder's ask A22 (typed ~19:5x IST). A plan, not a decision: the Lead rules what is pipeline (P-384) and asks the founder the three questions in §6. US$0, live AI off.

**Read for it:** `RULES.md` (as of P-480) and DECISIONS P-447 to P-456, P-462, P-463, P-468, P-472, P-473, P-477 to P-480 (Lead's branch `lead/2026-11-07-lead31` f6b9186bd); `design/bake-plan-2026-11-10.md`; STATE top and "Lead 18 live" (same branch); `qa/bake-baseline-2026-11-11.md` (BK-1); `qa/BUGS.md` on main 68a7b59d1; BACKLOG's Bake section. **Measured from GitHub** (REST API, read 20:0x-20:2x IST): every pull request opened since 28 Oct (~1,500), the commits of the 521 product PRs opened since 2 Nov, and the label events of 307 builder PRs merged since 2 Nov. Scripts and raw numbers were in a scratch folder only; every figure below can be re-measured the same way.

**Words used here.** *Chain*: work that must happen one piece after another, because each piece needs the last one merged. *Critical path*: the longest chain; it sets the finish date, whatever else runs beside it. *Baton*: a file only one builder may change at a time (`prisma/schema.prisma`, the database layout, and `api/src/case-prepare.ts`, the code that prepares a case's forms; P-438 (2)). *Cycle*: the time from a lane starting a row to its PR merged on `main`. *Label*: the `review: approved` label that sends a PR to the merge queue after the reviewer's Approve and green checks. *Walk 0*: an early, uncounted walk of the journey on today's `main` (proposed here); *walk 1* is the counted one (BK-6, P-472).

## 0. The answer in short

1. **As the lanes run today, walk 1 starts about 14 Nov morning and passes about 14 Nov night to 15 Nov; the co-founder walks 15-16 Nov.** The founder's sense that 13-14 Nov is far-fetched is right for that order.
2. **It is not yet the best plan.** Two pieces of work wait in line without needing to: BK-4 (sign in by role) and BK-5 (start page) wait for all of BK-3 (one frame), though they need only BK-3's first PR, which merged at 11:31 today; and five rows queue on one baton file in an order that puts the walk's rows behind an engine row the walk does not need.
3. **With ten squeezes that keep every gate (§2), walk 1 starts about 13 Nov 06:00 IST and passes about 13 Nov night (likely); the co-founder walks 14 Nov.** Best case a day earlier; worst case 15-16 Nov. It hinges on new-screen approvals overnight, the baton order, and how many Majors the walks find (§3).
4. **Speed per PR is in line.** A Bake PR goes from first push to merged in 3.3 h (median), faster than M3's 5.2 h, slower than M2's small fixes (2.3 h); builder PRs merged per day equal M3's (22). The Bake *reads* slower because nothing counts until one end-to-end walk passes, its remaining work sits on two chains, new screens carry three extra steps, and all lanes sat idle ~16:30-19:30 IST today (§4).
5. **A gauge like capabilities:** "Bake rows done of 27, journey Majors open, exit (a), exit (b)". Today: **16 of 27 rows done (3 wait for qa's retest), 11 journey Majors open (5 fixed and waiting for a retest), exit (a) not started, exit (b) not started** (§5).

## 1. Critical path

### 1.1 What one step takes (measured, Bake so far: 21 builder PRs merged 10 Nov 21:00-11 Nov 20:00 IST)

| Step | Median | 75th percentile | How measured |
|---|---|---|---|
| Review: PR opened or marked ready → `review: approved` label | 1.5 h | 2.3 h | label events |
| CI and merge queue: label → merged on `main` | 1.6 h | 2.0 h | label events, merge time |
| First push → merged | 3.3 h | 3.8 h | PR opened (lanes push all commits at once: the median gap between first commit and PR is 0.0 h) |
| PRs needing a second Approve (a second review round) | 19% (4 of 21) | | label removed and added again |
| Build before the first push | not visible in git | | estimate **2-3 h** for a normal row: M3-S3 merged 14:12 and M3-S4 was pushed built at 19:54 with the 16:30-19:30 idle gap between (~2.5 h of work) |
| Extra for a **new screen**: concept, a fresh challenger, the Lead's approval (P-223 (4)), a breaker (P-278) | +2.5-3.5 h | | BK-3 PR 3: lane restarted ~19:30, concept and board drafted and the challenge running by ~20:00 |

So a **normal row cycle is about 5.5 h** (2.5 build + 1.5 review + 1.6 CI and queue), **a new screen about 8.5 h**, and a row that is already built and only needs review and the queue about 3.3 h. Every forecast below uses these numbers, not guesses.

### 1.2 What is left (verified on `main` 68a7b59d1 and open PRs, 20:2x IST)

Merged and confirmed (brief's list checked against PR numbers): BK-1 #1509, BK-2 #1506, BK-3 PR 1 #1519, BK-3 PR 2 #1525, BK-8 #1535, BK-10 #1518, BK-11 #1537, BK-12 #1533, M3-S1 #1505, M3-S2 #1513, M3-S3 #1524, M3-S5 #1507, QA-275 #1528, QA-276 #1531, B164 #1501, QA-237 + QA-239 #1534. **Not in the brief:** qa's retests closed **QA-234, QA-318 and QA-355** at 12:49-12:56 IST (fresh copies of fbfb263c7), so plan row 8 (QA-234) needs no builder and B163 shrinks to **QA-165 alone**.

| Item | Size (PRs) | Depends on | Files or baton | State 20:2x IST | Earliest start |
|---|---|---|---|---|---|
| BK-3 PR 3: small client page, links both ways | 1 (new screen) | BK-3 PR 2 (merged) | `web/src` only (planned) | #1570 draft: concept and board done, challenge running | running |
| BK-3 PR 4 | 0-1 | PR 3 | `web/src` | scope not written anywhere; PR 3's own plan already covers both links (client page lists the cases; case header links the client) | after PR 3, or dropped |
| BK-4: sign in by role, hand-off buttons (+ the two hand-offs BK-1 found missing: reviewer signs → approver; client done → firm) | 3 (role picker is a new screen) | BK-3 **PR 1** (the frame and its "current person", merged 11:31); not PRs 3-4 | `web/src`: sign-in page and header (`App.tsx`), Studio review and release pages, case pages | not started, no concept | **now** (concept) |
| BK-5: start page (three starting points, reset) | 2 (new screen) | sign-in from BK-4 for its last join only | `web/src`: a new page, the Demo menu (`App.tsx:231`) | not started, no concept | **now** (concept) |
| M3-S4: never-waivable line blocks Ready to file | 1 | M3-S3 (merged) | **both batons**: schema, a migration, `case-prepare.ts` | #1571 draft, built (37 files) | running |
| QA-392b: answer sheet carries each Yes/No box's own answer (journey Major) | 1 | QA-392 (#1553, merged) | **`case-prepare.ts`** (baton) | #1563 open, built | running; **second holder of the baton beside #1571** |
| QA-395: IMM 5257 Q8 A (journey Major) | 1 | #1563 | form maps | #1566 draft | after #1563 |
| QA-391: "Out of date … generate a new copy" on forms that no longer apply (journey Major since Lead 16's ruling on #1529) | 1 | none | "Out of date" lives in `case-prepare.ts` (lines 386-449): **baton, likely** | **no lane** | **now** |
| QA-315: IMM 5257 filing check runs to the end | 1 | the plan says after B163 (row 11 on row 10); the lane runs it first | filing check | lane running, nothing pushed yet | running |
| B163 = QA-165 only: IMM 5257 mandatory boxes asked and filled | 1 | none | field maps, questions; `case-prepare.ts` unknown | not started | **now**, if it misses QA-315's files |
| BK-9: shared-filing changes on any pathway | 2 | M3-S1 (merged) | `case-prepare.ts` ("Visitor visa only in this slice", line 5-6): **baton, likely** | not started | when the baton is free |
| BK-13: Study permit by data (exit (b)) | 1 | all Track 2 rows (P-449 hard order) for the **counted** run only | data and release files only (that is the test) | not started | **data entry and a dry run now**; the counted run after M3-S4 and BK-9 |
| BK-14: AI review on any pathway's forms | 1-2 | none | `api/src/review-runs.ts:68` (not a baton) | placement open (founder, §6 Q3) | now, if placed in the Bake |
| QA-162 retest; retests of QA-275, QA-276, QA-237, QA-239 | 0 builders | merged fixes | none | the qa re-score lane holds C4.11 | now |
| BK-6 walk 1 (qa's fresh reader) | 1 qa session, ~5 h (BK-1's walk took 65 min; set-up, write-up and the reader's verdict the rest) | every journey row merged | none | not started | last journey merge |
| BK-7 fixes from walk 1 | 1 reserved; one row per Major | walk 1 | any | not started | walk 1's report |
| The co-founder's cold walk | 1 walk | walk 1 passed; within 24 h (P-455 (4)) | none | his copy parked (P-480; not needed for the demo) | walk 1 pass |

### 1.3 The serial chains as the lanes run them today

**Chain A, screens (the critical path today):** BK-3 PR 3 → PR 4 → BK-4 PR 1 → PR 2 → PR 3 → BK-5 PR 1 → PR 2 → walk 1 → fixes → co-founder.

| Step | Cycle used | Merged by (median, no idle) |
|---|---|---|
| BK-3 PR 3 (new screen, concept done) | approval ~21:30, then 2.5 + 2.0 (with breaker) + 1.6 h | 12 Nov ~03:30 |
| BK-3 PR 4 | 5.5 h | 12 Nov ~09:00 |
| BK-4 PR 1 (new screen) | 8.5 h | 12 Nov ~17:30 |
| BK-4 PR 2, PR 3 | 5.5 h each | 13 Nov ~04:30 |
| BK-5 PR 1 (new screen), PR 2 | 8.5 + 5.5 h | 13 Nov ~18:30 |
| Walk 1 | ~5 h | 13 Nov ~23:30 |
| One fix row and qa's retest | 5.5 + 2 h | 14 Nov ~07:00 |

**Length: ~59 h from now at medians with no idle time.** At the 75th percentile (+1.2 h a PR), with 19% second review rounds (~+4 h) and one idle gap like today's (+3 h), it is **~74 h: walk 1 starts ~14 Nov 09:00, passes ~14 Nov 22:00 to 15 Nov; co-founder 15-16 Nov.** That matches P-472's forecast ("Bake rows land ~13-14 Nov, walk 1 within a day after").

**Chain B, the `case-prepare.ts` baton:** M3-S4 → QA-392b → BK-9 PR 1 → BK-9 PR 2 → QA-391 → (B163 if it edits the baton). Built rows first, then 5.5 h each: **ends ~13 Nov 01:30 at medians**, ~13 Nov 10:00 at the 75th percentile. Shorter than chain A today, but it holds three journey Majors (QA-392b, QA-391, perhaps QA-165) behind BK-9, which the walk does not need. **Note for the Lead now:** #1563 (QA-392b) and #1571 (M3-S4) both change `case-prepare.ts`; P-438 (2) allows one holder.

**Chain C, forms (parallel):** QA-315 → B163 → (QA-395). ~11-16 h; not critical unless B163 joins the baton.

**Exit (b):** BK-13 after BK-9: data entry with citations (~5-6 h) only starts after ~12 Nov 14:30 today, so the counted run lands ~13 Nov 00:00-06:00. It does not gate walk 1 (the walk needs Track 1 rows, bake plan row 14).

## 2. Squeeze options

Each keeps P-303 (Opus reviews, fresh readers), P-309 (quality first), the two review rounds then the Lead (P-293 (3)), gates A and B (P-348 (3), P-317), and one session per branch (P-278).

| # | Option | Time saved on the finish | Risk to quality | How the gate stays intact | Verdict |
|---|---|---|---|---|---|
| S1 | **Concepts for BK-4 and BK-5 now**, in one concept lane (one author keeps the sign-in and the start page consistent), files under `product/screens/` only; BK-4's concept adds the two hand-offs BK-1 found missing and names the one "current person" state 4a owns | ~5 h (two concept steps leave the chain) | low: the concept reads the frame as merged (PR 1-2) | concept, a fresh challenger, the Lead's approval (P-223 (4)), best-in-class section (P-392), walk by screens before review (P-352) | **Keep** |
| S2 | **Split BK-4 into three PRs built side by side** after the concept: 4a role picker (sign-in page, header); 4b Studio hand-off buttons (author → content reviewer → approver → "open a case on this release"); 4c case hand-off buttons (client done → firm; send for representative review). 4c starts when BK-3 PR 3 merges, because both touch the case page header | ~11 h (two serial steps of 5.5 h) | medium: three PRs share the "current person" idea; conflicts in `App.tsx` | 4a defines it in the concept; 4b and 4c call the frame's existing switch; merge `main` only on a conflict (P-270); every PR its own reviewer, and a breaker on 4a (permissions: who may act) | **Keep** |
| S3 | **BK-5 PR 1 (the start page, its three starting points and reset) beside BK-4**, reached from today's Demo menu; **BK-5 PR 2** (a small join: sign-in leads to the start page) when 4a merges | ~8 h | medium: `App.tsx` again | the Lead lets 4a land first; PR 2 is reviewed on its own; gate A walks sign-in → start page → first step | **Keep** |
| S4 | **BK-3 PR 4: write its scope now.** PR 3's plan already covers both links; if nothing is left, the reviewer checks BK-3's whole "done when" on PR 3 and BK-3 closes; if something is left, it runs beside BK-4 | ~5.5 h | none | BK-3's "done when" (bake plan row 3) checked by the reviewer, not skipped | **Keep** |
| S5 | **Walk 0 now by qa** (cloud, fresh reader, US$0) on `main` 68a7b59d1: the case half (open a case → Client A → representative review → forms filled) and set-up → release with a condition (QA-237/239's fix); **plus the retests** of QA-275, QA-276, QA-237, QA-239, QA-162 | Majors in the case half surface ~1.5 days earlier and are fixed in parallel; each Major left for walk 1 adds ~7.5 h of fix and retest to the end of the chain | none | walk 1 still runs in full on the final `main` from a fresh database (P-472, P-456); walk 0 counts for nothing | **Keep** (evidence: BK-1's walk logged 4 new Minors; the 10 Nov gate walks logged QA-383, QA-385, QA-386) |
| S6 | **BK-13 in two steps:** (1) now, enter Study permit's rows as data (fees checked against the seeded `sp.outside` rows, documents, form rules, field maps; each value cited with page, quote and date, labelled Sample; P-170, P-240) and run a **dry run** on today's `main` that lists every place Study permit would need code; (2) the **counted run** on the tag after M3-S4 and BK-9, with E4's `git diff --stat` | 6-12 h of late discovery: a gap found on the last day becomes a new engine row on the baton | low: data may need a small re-entry if M3-S4 or BK-9 change a data shape | exit (b) is judged only on step (2) (P-449, P-452); the dry run's gaps become general rows, never a Study permit branch (B164's guard) | **Keep** |
| S7 | **Baton order and hand-over** (a) order by what the walk needs: M3-S4 or QA-392b, whichever is green first, then QA-391, then B163 (if it edits the baton), then BK-9 PR 1-2; (b) the Lead names the next holder when the current baton PR is **labelled** (its code is final), not when it merges; the next holder merges `main` once if a batch fails; (c) before BK-9, B163 and QA-391 start, the lane checks in ~15 min whether each really edits a baton file; any that does not leaves the chain | (a) journey Majors done ~12 Nov 10:00-16:00 instead of ~13 Nov 01:30; (b) ~1.6 h per hand-over, ~6 h over four; (c) ~5.5 h for each row that leaves | low: (b) a failed batch means one merge of `main` (P-270); watch: conflicts on `case-prepare.ts`, at most 1 | one unlabelled baton PR at a time; reviews unchanged. (b) reads P-438 (2) "one builder at a time" as "one unlabelled baton PR at a time": a Lead ruling (P-294) with that number checked after two days, kept or undone | **Keep**, Lead to rule (b) |
| S8 | **QA-391 gets a lane now** (no lane today; on E3's list since Lead 16's ruling); it starts on its non-baton parts until its baton turn | avoids walk 1 meeting it as a blocker (~7.5 h) | none | normal row gates | **Keep** |
| S9 | **No idle lanes:** every running lane's brief names its next row (warm rows, P-341), so a lane that finishes starts the next without waiting for a check; each 30-minute check reads every lane's last message (founder rule, 13:5x) | today's gap cost ~3 h on both chains; at 5-8 lanes that is the largest single loss measured today | none | gates unchanged | **Keep** |
| S10 | **B163 (QA-165) beside QA-315**, if they share no file; otherwise B163 first, as the plan's order says | ~5.5 h | low | normal row gates | **Keep, conditional** |

**Rejected, and why:**

| Option | Why not |
|---|---|
| One review for two PRs, or skipping a second round when it is needed | P-303, P-293 (3). Second rounds (19% of PRs) are where the reviewer's Majors get fixed; review is only 1.5 h of a 5.5 h cycle. |
| No breaker on BK-4's role picker or BK-5's new page | P-278: a new screen and permissions need one; ~0.5-1 h each. |
| Counting a partial walk as walk 1, or starting walk 1 before the last journey row merges | P-472 ("the full walk"). The early look is walk 0 (S5), uncounted. |
| Walk 1 by a builder, the Lead, or a reader that ran the checks | P-303, P-432: a fresh Opus reader decides. |
| Faster checks: a subset of tests, gate B off for Bake PRs, merging product code by hand | P-317, P-214: only fixes to the checks or the merge flow may go ahead of the queue; product code only through it. |
| Splitting `case-prepare.ts` now (B165) to break the baton | the biggest refactor of the most-used file in the walk's week, with every capability pack under it; the plan places it after the Bake for that reason (P-438 (3)). |
| Two lanes editing a baton file at the same time and merging later | brings back the conflicts the baton prevents (P-438 (2)); S7 (b) is the safe form. |
| The co-founder walking before walk 1 passes, or in parallel | P-447 (1): qa's fresh reader first, then the co-founder cold; a cold walk can be spent only once. |
| Two builders on one PR | P-278, P-436 (2): one session per branch. |

**Not studied here, worth a look by the pipeline lane:** CI and queue per PR rose to 1.6 h in the Bake from 0.8-1.1 h in M2 and M3 (§4). More web PRs side by side (S2, S3) will share batches; one failed batch is allowed for in the forecast below.

## 3. Recommended plan

Hybrid: two short chains instead of one long one, everything else side by side. New lanes start only in a turn the founder typed (P-348 (5)), cloud first; the founder's reply to this plan is that turn.

| Lane | Rows, in order | Kind |
|---|---|---|
| Screens 1 (running, BK-3 lane) | BK-3 PR 3 → PR 4 if any (S4) → BK-4c | sequence |
| Screens 2 (**new, now**) | BK-4 + BK-5 concepts (S1) → BK-4a role picker | sequence, beside screens 1 |
| Screens 3 (new, at concept approval) | BK-4b Studio hand-offs | parallel |
| Screens 4 (new, at concept approval) | BK-5 PR 1 → PR 2 after 4a | parallel, then joins |
| Runtime baton (running, M3-S4 lane) | M3-S4 → BK-9 PR 1 → PR 2, in the baton order of S7 | sequence on the baton |
| Forms 1 (running, QA-392b lane) | QA-392b (#1563) → QA-395 (#1566) | baton turn for #1563 |
| Forms 2 (running, QA-315 lane) | QA-315 → B163 (QA-165) (S10) | sequence or parallel |
| Forms 3 (**new, now**) | QA-391 (S8): non-baton parts now, baton turn after QA-392b | baton turn |
| Exit (b) (**new, now**) | BK-13 data entry and dry run (S6) → counted run after BK-9 | hybrid |
| qa (running re-score lane + **new walk-0 lane**) | retests (S5) · walk 0 (S5) · then BK-6 walk 1 on the last journey merge | sequence |
| BK-14 (if the founder places it in the Bake, §6 Q3) | BK-14 | parallel, gates no walk |

**Dates (IST), from 11 Nov 21:00.** Best = medians with nothing going wrong; likely = 75th percentiles, 19% second rounds, one failed batch, walk 0 finding 1-2 Majors fixed in parallel; worst = walk 1 finds 4 or more Majors, or a baton row regresses a capability and is undone.

| Item | Best | Likely | Worst |
|---|---|---|---|
| BK-4/BK-5 concepts approved | 12 Nov 00:30 | 12 Nov 02:00 | 12 Nov 06:00 |
| BK-3 done (PR 3, PR 4 if any) | 12 Nov 03:30 | 12 Nov 06:00 | 12 Nov 12:00 |
| BK-4 done (4a, 4b, 4c) | 12 Nov 10:00 | 12 Nov 16:00 | 13 Nov 00:00 |
| BK-5 done | 12 Nov 13:00 | 12 Nov 20:00 | 13 Nov 06:00 |
| Journey Majors on the baton (QA-392b, QA-391, QA-165) merged | 12 Nov 10:00 | 12 Nov 16:00 | 13 Nov 00:00 |
| M3-S4, BK-9 merged | 12 Nov 14:00 | 12 Nov 22:00 | 13 Nov 10:00 |
| **Exit (b): BK-13 counted run** | 12 Nov 20:00 | 13 Nov 06:00 | 14 Nov 00:00 |
| **Walk 1 starts** (last journey merge) | 12 Nov 20:00 | 13 Nov 06:00 | 13 Nov 14:00 |
| Walk 1 report | 13 Nov 01:00 | 13 Nov 11:00 | 13 Nov 19:00 |
| BK-7 fixes merged, qa's retest: **walk 1 passes** | 13 Nov 10:00 | 13 Nov 22:00 | 15 Nov 12:00 |
| **The co-founder's cold walk** (within 24 h of the pass, P-455 (4)) | 13 Nov evening | 14 Nov | 16 Nov |
| Bake done: both exits, 0 journey Majors after both walks | 14 Nov | 15 Nov | 17 Nov |

**Forecast range: walk 1 passes 13 Nov (best and likely) to 15 Nov (worst); the co-founder walks 14 Nov (likely).** Against today's order (walk 1 passes ~14 Nov night to 15 Nov, co-founder 15-16 Nov) that is **about one day earlier**, with no gate changed. **It hinges on:** (1) the Lead approving three new-screen concepts and labelling PRs through the night (each check every 30 minutes; an approval waiting for a check adds up to 30 minutes on the chain); (2) the baton order of S7 and the 15-minute file check; (3) how many Majors walk 0 and walk 1 find (each one left to walk 1 costs ~7.5 h); (4) no idle lane (S9); (5) the co-founder's date (§6 Q2). Plan usage is not a limit: weekly 7%, reset 13 Nov 04:30 IST (STATE).

## 4. Speed: M2, M3 and the Bake, measured

| | M2's last stretch: 2 Nov 00:00 → 60/60 at 6 Nov 12:21 IST (4.5 days; P-260 finish program) | M3: plan 6 Nov ~20:00 (P-380) → 29/29 at 10 Nov 20:59 IST (4.0 days) | Bake so far: 10 Nov 21:00 → 11 Nov 20:00 IST (23 h) |
|---|---|---|---|
| Builder PRs merged (screens, forms, runtime, evidence, pipeline) | 198 (44 a day) | 88 (22 a day) | 21 (22 a day) |
| qa PRs merged | 86 | 51 | 3 |
| First push → merged, median (75th percentile) | 2.3 h (3.9 h) | 5.2 h (11.8 h) | **3.3 h (3.8 h)** |
| Review: opened → Approve label, median (75th) | 0.5 h (1.6 h) | 2.9 h (8.0 h) | 1.5 h (2.3 h) |
| CI and queue: label → merged, median (75th) | 1.1 h (1.7 h) | 0.8 h (1.6 h) | 1.6 h (2.0 h) |
| PRs needing a second Approve | 19% | 19% | 19% |
| Counted outcome | 50 → 60 of 60 (the last 10 in 3.3 days) | 29 of 29 in 4 days; 16 → 29 in the last 27 h (P-434, commit log) | 16 of 27 rows in 23 h (3 wait for a retest) |

Merges on `main` per IST day (first-parent merges in git, records included): 9 Nov 42, 10 Nov 24, 11 Nov 31 (to 19:19). Product PRs only (GitHub): 45, 20, 27. The brief's 33, 36, 29 did not reproduce with either method; the method behind them is not written down. **M1** ran before the 31 Oct switch to one row per PR (29-30 Oct: 1-2 product merges a day), so its numbers do not compare.

**How the speed is decided.** By the longest chain of steps that must happen one after another, times the time per step (build ~2.5 h + review 1.5 h + CI and queue 1.6 h ≈ 5.5 h; a new screen ~8.5 h). More runners, cloud machines and tokens shorten only work that can run side by side; they do not shorten a chain. M2's last stretch was fast because its work was many small, independent fixes. M3's PRs were slower (5.2 h; long reviews) but its 29 capabilities each counted on their own as they landed.

**Why the Bake reads slower, though each PR is not:** (1) its exit is one end-to-end walk, so nothing shows as "done" until the last chained piece lands, where M2 and M3 counted capabilities one by one; (2) its remaining work sits on two chains (frame → sign-in → start page; the `case-prepare.ts` baton); (3) the remaining screens are new screens with concept, challenge, approval and breaker (+2.5-3.5 h each); (4) all lanes sat idle ~16:30-19:30 IST today, ~3 h lost on both chains; (5) CI and queue per PR is 1.6 h, up from 0.8-1.1 h (not studied here).

## 5. Progress gauge for the founder

One counted list, printed first in every check and every hourly report, like "Works n of 29" was for M3:

```
Bake: 16 of 27 rows done (3 wait for qa's retest) · 3 in progress · 8 not started
Journey Majors open: 11 (5 fixed, waiting for qa's retest · 2 fix PRs open · 4 not fixed)
Walk measures (P-456, BK-1 baseline → now): person changes with no button 4 → 4 · dead ends 2 (3 at 400 px) → ? · fold-outs with no arrow 9 → 0 (BK-2)
Exit (a): walk 1 not started (forecast 13 Nov 06:00 IST) · co-founder not booked
Exit (b): Study permit data not entered · dry run gaps – · counted run not started
Chains: screens next merge BK-3 PR 3 ~12 Nov 03:30 · baton holder M3-S4 (#1571), next QA-392b
```

**Today's counts, by row.** Done (16): BK-1, BK-2, QA-237 + QA-239\*, QA-276\*, QA-234, QA-275\*, QA-355, B164, M3-S1, M3-S2, M3-S3, M3-S5, BK-8, BK-10, BK-11, BK-12 (\* merged, waiting for qa's retest to close the bug). In progress (3): BK-3 (2 of its PRs merged), QA-315, M3-S4. Not started (8): BK-4, BK-5, B163 (QA-318 closed, QA-165 open), QA-162 (retest only), BK-6, BK-7, BK-9, BK-13. Journey Majors (11): on `main`'s `qa/BUGS.md` QA-391, QA-275\*, QA-276\*, QA-237\*, QA-239\*, QA-165, QA-162, QA-315; in qa PRs not yet merged QA-392\* (fixed by #1553), QA-392b (fix #1563), QA-395 (fix #1566). Off the journey (not counted): QA-383, QA-278, QA-201, QA-181. New journey Majors join both counts as rows, so the founder sees scope grow, not only shrink.

**Where it lives and the one change to make (proposed, not built):** a read-only script `product/tools/bake-gauge.sh` that prints the block above from three sources, and the `lead-watch` report prints it first under "Works": (1) BACKLOG's Bake section holding all 27 rows with a Status column (today it lists only BK-8, BK-10, BK-12, BK-14; the Lead adds the rest, since the founder approved the plan); (2) `qa/BUGS.md` rows carrying the word "journey" in the capability column (qa adds it; BK-1 already sorted them); (3) two exit lines in STATE ("Exit (a): …", "Exit (b): …") the Lead keeps. One script, one BACKLOG column, one word in BUGS; no new file.

## 6. Questions for the founder (one at a time, AskUserQuestion)

1. **Build BK-4 (sign in by role) and BK-5 (start page) side by side with the end of BK-3, in small PRs, instead of strictly one after another?** More PRs in flight means more merge conflicts for the Lead to sort, with every review, breaker and walk unchanged. *Recommend yes:* about a day earlier for walk 1 (§3); the rule-backed order (P-472) only needs BK-3's frame, which merged at 11:31 today.
2. **Which day can the co-founder take his cold walk?** *Recommend pencilling 14 Nov IST, with 15 Nov as the fallback;* the Lead confirms the morning walk 1 passes (P-455 (4): within 24 h).
3. **BK-14 (AI review on any pathway's forms, lifting stand-in SI-6): inside the Bake or M4's first row?** *Recommend inside the Bake, in its own lane now:* it gates neither walk, touches no baton file, and removes the last pathway exception in B164's list, so "no code change" (P-452) reads clean everywhere; it runs with live AI off like every lane.

**Ruled by the Lead, not asked (P-384, P-294):** walk 0 and the retests (S5), the baton order and "holder named at label" (S7), lanes for QA-391 and BK-13's dry run (S6, S8), no idle lanes (S9).

## 7. What this does not change

The Bake's scope, its two exits (P-449), the caps (P-447, P-448), every review and gate, live AI off and US$0 in every lane, and the hard order "Track 2 before BK-13's counted run". It adds no row; it reorders and splits rows already agreed, and adds one uncounted qa walk.
