# 01 · The next 8 hours: the Bake's counted list, checked on GitHub

Master analysis, part 1 of 8 (founder ask A19; read-only, P-455 (5)). Written 11 Nov 2026, 12:27-13:00 IST.
**Checked on GitHub, not from prose:** `origin/main` fbfb263c7 (11 Nov 06:01 UTC = 11:31 IST), the open PR list, the PR branches' diffs against main, the CI runs of `ci.yml`. Bake rows from `design/bake-plan-2026-11-10.md` on `lead/2026-11-07-lead31`.
Window: **12:30-20:30 IST, 11 Nov.**

## 1. Where the Bake stands (27 rows, 40 sessions inside the caps)

Status words: **merged** (on main, PR number) · **PR open** (pushed, draft or ready) · **lane running** (started in claude.ai, nothing pushed yet, so it does not count yet, P-326) · **not started**.

### Track 1: lean Bake (24 sessions)

| # | Row | Sessions | Status on GitHub, 12:27 IST | Evidence |
|---|---|---|---|---|
| 1 | BK-1 sort the journey (baseline) | 1 | **merged** | #1509, 10 Nov 20:53 UTC: 14 Majors, 10 on the journey, 5 person changes, 2 dead ends, 9 fold-outs without an arrow |
| 2 | BK-2 fold-out arrows | 1 | **merged** | #1506, 10 Nov 21:13 UTC |
| 3 | BK-3 one frame (4 PRs) | 4 | **PR 1 merged; PR 2 open; PRs 3-4 not started** | #1519 merged 11 Nov 06:01 UTC; #1525 draft (release↔case links, 11 files, +175), CI run 42975481658 cancelled by its own newer push 06:52 UTC; PRs 3-4 (client page, case↔client links) wait for a concept (P-457) |
| 4 | BK-4 sign in by role, hand-off buttons | 3 | not started | needs BK-3 |
| 5 | BK-5 start page | 2 | not started | needs BK-4 |
| 6 | QA-237 + QA-239 conditions across pathways | 3 | **lane running** | task_bb25d617 (STATE 12:3x); no branch pushed |
| 7 | QA-276 release goes through | 1 | **lane running** | task_4552f2b3; no branch pushed |
| 8 | QA-234 Yes/No form box as its own question | 1 | not started | BK-1 (#1509) says "QA-234 probably fixed"; still open in `qa/BUGS.md:72` |
| 9 | QA-275 each fill keeps its own file | 1 | **lane running** | task_0d3548ab; no branch pushed |
| 10 | QA-165 + QA-318 mandatory boxes | 2 | not started | B170 (#1527) maps its XFA verdicts to QA-165. QA-318's fix commits (to 84e54dd4d, 9 Nov) are on main, and BK-1 says "not reproduced": retest first |
| 11 | QA-315 filing by upload end to end | 1 | not started | needs row 10 |
| 12 | QA-355 adding a form keeps shared facts | 2 | not started | Recorded cause is in `engine/runtime/` (no baton). C7.8 commits naming QA-355 are on main (82e986c8f, 0e7357078): retest first |
| 13 | QA-162 retest | 0 | not started | inside walk 1 |
| 14 | BK-6 walk 1 | 1 | not started | needs rows 1-13 |
| 15 | BK-7 fixes from the walk | 1 | not started | reserve |
| | **Track 1** | **24** | **3 sessions merged (BK-1, BK-2, BK-3 PR 1); 1 PR open; 5 sessions in running lanes** | |

### Track 2: generic engine core (16 sessions)

| # | Row | Sessions | Status on GitHub, 12:27 IST | Evidence |
|---|---|---|---|---|
| 16 | B164 guard: no pathway names in code | 1 | **merged** | #1501, 10 Nov 19:06 UTC |
| 17 | M3-S1 linked application with its own fees | 2 | **merged** | #1505, 10 Nov 20:37 UTC |
| 18 | M3-S2 conditional extra filing | 2 | **merged** | #1513, 11 Nov 05:38 UTC |
| 19 | M3-S3 waivable checklist line | 1 | **PR open** (holds the schema) | #1524 draft, 12 files, +201/−26, touches `prisma/schema.prisma` and one migration, **not `case-prepare.ts`**; reviewer + breaker re-run (STATE 12:3x) |
| 20 | M3-S4 never-waivable blocking line | 1 | not started | needs M3-S3; removes B164's `case-stages.ts` entry |
| 21 | M3-S5 answer sheet for online-only forms | 2 | **merged** | #1507, 10 Nov 20:53 UTC |
| 22 | BK-8 biometrics ages per pathway | 1 | not started | B164 allow-list entry `api/src/case-prepare.ts` "vv.single", row BK-8 |
| 23 | BK-9 shared-filing changes on any pathway | 2 | not started, **not shaped** | BACKLOG line 235: "shaped when the founder approves it"; no entry for it on B164's allow-list (see Question 3) |
| 24 | BK-10 form rules into data | 1 | **merged** | #1518, 11 Nov 05:24 UTC |
| 25 | BK-11 fill-trial status in the release | 1 | not started, **not shaped**; its only dependency (BK-10) is merged | BACKLOG line 235 |
| 26 | BK-12 sample case as a setting | 1 | **lane running** | task_268d0c10; 7 fixture entries on B164's allow-list |
| 27 | BK-13 Study permit by data (exit b) | 1 | not started | needs rows 6, 16-26 |
| | **Track 2** | **16** | **8 sessions merged (B164, M3-S1, M3-S2, M3-S5, BK-10); 1 PR open; 1 lane running** | |

**Bake total: 11 of 40 sessions merged (7 of 27 rows complete, plus BK-3 at 1 of 4).** 2 PRs are open and 4 lanes are running without a push yet (rows 6, 7, 9, 26: 6 sessions).
Exit counters today: E3's journey Majors: 10 at BK-1 (#1509). None of the rows that close them has merged yet.

### Outside the caps (rows 28-36), and lanes outside the Bake

| Row | Status | Evidence |
|---|---|---|
| 28 8 CI shards + suite selection (4a) | **merged, but 8 shards are not in force** | #1502 and #1504 merged 10 Nov. The repository variable `SHARDS` is still 6 and overrides the default of 8 (`ci.yml:27-28, 131`). The queue run for #1519 (42963881948) ran **6 shards, the longest 49.5 min**; the PR planned ~32-35 min on 8. See Question 1. |
| 29 tests on Playwright's own browser | not started | |
| 30 B165 split the five busiest files | not started | runs last, after the engine rows |
| 31 QA-332 | not started | `qa/BUGS.md:167` (Ambiguity · Minor) |
| 32 QA-201, QA-181 tooling Majors | not started | `qa/BUGS.md:88-89` |
| 33 QA-278 many cases opened at once | not started | `qa/BUGS.md:39`: 48 opens at once, 25 × 500 errors. Also Scalable's first measured fact (P-460). |
| 34 QA-383 IMM 5710 "Canada" | not started | `qa/BUGS.md:16` |
| 35 B166, B167 | not started | |
| 36 BK-14 AI review on any pathway | not started | placement owed to the founder |
| B168 app starts on any Mac | **PR open** | #1526 draft, 1 file, +180 (`new-machine.sh`), CI green 06:42 UTC |
| B169 spousal sponsorship's IRCC account | **PR open** | #1523 draft, 3 files, +81, data only, CI green. It reuses branch `claude/amazing-davinci-wvk1b3`, which already merged BK-10 as #1518 (see Question 4) |
| B170 XFA engine reuse (planner) | **PR open** | #1527 records only, label `records`, CI green |
| qa re-score #1518, #1513, #1519 + "Out of date" | lane running | task_852ae73c; no push |
| Master analysis (this file) | PR open after this push | |

## 2. Batons, and what can run in parallel right now

**The batons are two files, held separately.** The Bake plan treats `prisma/schema.prisma` and `api/src/case-prepare.ts` as one baton held by one builder (P-438 (2)). P-438 (2) says one builder at a time **on each** file. Measured on #1524's diff: M3-S3 changes the schema and **does not touch `case-prepare.ts`**. So **`case-prepare.ts` is free now.** Releasing it lets one row start immediately instead of waiting ~3-5 h for M3-S3 to merge. See Question 2.

| Baton | Holder now | Waiting, in proposed order |
|---|---|---|
| `prisma/schema.prisma` (and migrations) | M3-S3 #1524 | M3-S4 (if it needs a column); BK-11 if the release record needs a column; B165's schema split last |
| `api/src/case-prepare.ts` | **free** (proposed) | **BK-8 first** (one line, `case-prepare.ts:29`, plus its data and tests; ~1 session); then QA-165/318 if their fix lands there. **QA-355 does not need it:** its recorded cause is `engine/runtime/added-forms.ts` (`withAdditions`) and `engine/runtime/case.ts` (`shapeOf`), `qa/BUGS.md:174` |

**Rows that could start now** (no baton, no file overlap with a running lane, dependencies met):

| Row | Lane | Files | Why now |
|---|---|---|---|
| **BK-8** | runtime | `api/src/case-prepare.ts:29`, fee data, tests | case-prepare is free (above); removes a B164 entry; on the path to BK-13 |
| **BK-11** | forms | `api/src/fill-trials.ts`, release data | BK-10 merged; on the path to BK-13. Shape it first. If it needs a schema column, it queues behind M3-S3. |
| **BK-3 client page concept** (for PRs 3-4) | screens (concept, no code) | `screens/<item>/concept` | P-457 holds PRs 3-4 for a concept. Writing it now keeps the screens chain (BK-3 → BK-4 → BK-5) from stalling after PR 2. |
| **Retest QA-234, QA-318, QA-355 first (one qa lane, ~1 h)** | qa | none | All three are open Majors on the journey, yet main already has fix commits for two of them, and BK-1 found the third probably fixed. **QA-318:** fix commits through 84e54dd4d (9 Nov, "SCH1's Questions 5 and 6 read the library fields IMM 5257 already asks") are on main, and BK-1's baseline (#1509) says "QA-318 not reproduced". **QA-355:** commits 82e986c8f and 0e7357078 (10 Nov, "C7.8 — QA-355: …", merged with #1450) are on main, while the row still cites main 8d00b2a65 (9 Nov) and its own check `tests/qa/check_qa355_added_form_spoils_release_facts.ts` ("1/2 today"). **QA-234:** BK-1 says "probably fixed". Each one closed saves 1-2 Bake sessions and moves exit E3 at once. |
| **QA-355** (if the retest still fails) | runtime/screens | `engine/runtime/added-forms.ts`, `engine/runtime/case.ts` | No baton (above) |
| **BK-9 shaping** | Lead / analyst (read-only) | none | Unshaped; its guard may already be gone (Question 3). |
| **QA-383** (outside the caps) | forms | IMM 5710 field map / list data | Independent of every running lane |
| **QA-201 + QA-181** (outside the caps) | pipeline | `product/tools/typecheck.mjs`, `lane.sh` | Tooling, no product files; it removes two Majors that hurt every lane |
| **Row 29 Playwright browser** (outside the caps) | pipeline | test runner set-up | Independent; frees Mac disk |

**Must wait:** M3-S4 (needs M3-S3); BK-4 then BK-5 (BK-3 chain); QA-315 (needs QA-165/318); QA-165/318 (case-prepare, after BK-8, if its fix lands there); BK-13, BK-6, BK-7, QA-162 (end of the Bake).

**Overlap watch among running lanes:** QA-237/239 and QA-276 both touch the release path (`api/src/lifecycle.ts`, `proposals.ts`, `studio.ts`). They will merge cleanly only if each stays small. If both change the release gate, merge the smaller one first and the other merges main once (P-270).

## 3. CI and merge-queue throughput (measured 11 Nov)

| Measure | Value | Source |
|---|---|---|
| Draft PR push | ~0.5 min (push guard only) | runs 42974267455, 42968685780 |
| Ready PR, full suites | 20-55 min wall (memory reuse skips suites already green) | runs 42960097697 (21 min), 42955956524 (50 min) |
| Queue batch, 1 PR | **45-51 min wall** | #1518: 04:38→05:23; #1513: 04:52→05:38; #1519: 05:09→06:00 UTC |
| Runner minutes per queue batch | **~324** (6 shards 37-50 min + 5 regression groups 10-15 min + small jobs) | run 42963881948, jobs summed |
| Queue settings | batches of up to 6, 5 min fill wait, 3 batches checked at once | `.mergify.yml` |
| Observed batch size, 11 Nov morning | **1** (three single-PR batches checked in parallel) | runs 4595-4597 |
| Approve → merged | ~100 min (ready CI + queue) | Bake plan, measured 10 Nov; consistent with the above |

**What limits throughput:**
1. **The queue is not the limit.** 3 parallel checks × up to 6 PRs per ~50 min gives a ceiling of ~20 PRs/hour. The day's real rate is 5-10 PRs.
2. **GitHub's limit on jobs running at once probably is.** One full run uses up to 12 jobs at once (6 shards + 5 regression groups + types). GitHub's hosted runners allow 20 jobs at once on the Free plan and 40 on Pro (from GitHub's documented limits; the account's plan is not checked here). Three queue batches need ~36 jobs. Add ~10 lanes pushing ready PRs (12 jobs each when nothing is remembered green) and jobs queue behind each other. Wall time then grows by tens of minutes, and that shows up as "CI is slow", not as a failure. **Measure before acting:** compare each job's `created_at` with its `started_at` on the next three queue runs. A gap of more than 2 min means runner concurrency is the limit.
3. **Shard length.** 6 shards → 49.5 min for the longest. With `SHARDS=8` the PR measured ~32-35 min, which saves ~15 min per ready run and per batch (Question 1). It costs about the same runner minutes, and +2 jobs at once.
4. **Larger batches would help only if PRs arrive together.** With ~10 lanes, labels will cluster near the end of the window. The 5 min wait already lets them share a batch. No change.

**Batch math for the window:** ~10 PRs expected (section 4) ≈ 5-8 queue batches × ~324 runner-min ≈ 1,600-2,600 runner-min. On top of that, ~25-40 ready/fix runs at 0-324 each. A public repository costs no money. The cost is wall time, through concurrency.

## 4. Honest forecast, 12:30-20:30 IST, ~10 cloud lanes

Basis: a builder row takes 2-4 h of session (build → reviewer → breaker where needed) and then ~100 min from Approve to merged. Lanes started at 12:1x-12:3x. Review rounds: one usually, sometimes two (P-293 (3)). The weekly plan does not limit pace today (P-461).

| Likelihood | Lands on main by 20:30 IST | Why |
|---|---|---|
| **Very likely (≥80%)** | B169 #1523 (data only, CI green) · B170 #1527 (records) · BK-3 PR 2 #1525 (in review, web only) · B168 #1526 (one script) · qa re-score records | Already pushed, small |
| **Likely (60-75%)** | M3-S3 #1524 (reviewer + breaker re-run; schema = Lead reads the diff before labelling, P-423) · QA-276 · QA-275 · BK-12 | One-session rows started 12:3x: ~4-5 h each → 17:00-19:30 IST |
| **Possible (30-50%)** | QA-237/239 first PR (3 sessions in total; the first PR may land, the row will not finish) · BK-8, **if started by 13:30** on the free case-prepare baton | |
| **Not in the window** | M3-S4 (starts only after M3-S3 merges, ~18:00) · QA-355, QA-165/318, QA-315 (serial on case-prepare) · BK-4, BK-5 (serial after BK-3) · BK-9, BK-11 (unshaped) · BK-13 · walks | Serial chains |

**Expected at 20:30 IST:** Bake **16-18 of 40 sessions merged** (from 11), 11-13 of 27 rows complete. Open journey Majors: 10 → **8** if QA-276 and QA-275 merge, and **5-7** if the retests close QA-234, QA-318 and QA-355. **Exit (b) and exit (a) are not reachable today.**

**The critical path after today is serial, not lanes:**
* Runtime chain: M3-S3 → M3-S4 (schema) in parallel with BK-8 → QA-165/318 → QA-315 (case-prepare), then BK-13 = ~6-7 sessions on the longer branch, ~1.5 days. Running QA-355 beside them (no baton) and retesting QA-318/QA-355/QA-234 can take a further 2-5 sessions off.
* Screens chain: BK-3 PR 2 → PRs 3-4 (concept first) → BK-4 (3) → BK-5 (2) → BK-6 walk = ~8 sessions, ~2 days.
* With both chains running continuously: **Bake rows done ~13-14 Nov IST**, walk 1 on ~14 Nov, the co-founder's walk within 24 h (P-455 (4)). That is a week earlier than the 21-24 Nov in the Bake plan, because P-461/P-462 removed the budget limit the plan was paced on. A chain that idles overnight adds ~half a day.

**What "more lanes" cannot buy:** the two chains above. Lanes beyond ~6 builders add outside-the-caps rows and fixes, not an earlier Bake exit. They also add CI load (section 3, point 2).

## 5. For the founder in this window (through the Lead)

* **Approve or decide:** set the repository variable `SHARDS` to 8 (Question 1); BK-14's placement (Bake or M4); A7's booking of the immigration expert (nothing Sample releases outside the demo, P-240).
* **He will see:** the frame with the release↔case links (BK-3 PR 2), spousal sponsorship on the PR Portal (B169), the co-founder's one-command start (B168), the XFA reuse analysis (B170), and the master analysis files 02-08 as they are pushed.

## Questions for the tech lead (posted as separate PR comments)

1. **Set `SHARDS` to 8 now.** #1502 merged 8 shards, but the repository variable still says 6 and overrides it (`ci.yml:27-28, 131`). The #1519 queue run took 49.5 min on its longest shard; the PR measured ~32-35 min on 8. P-454 (5) recorded that the founder runs it from his terminal. *Recommend:* ask him for the one command `gh variable set SHARDS --body 8` at his next typed turn, then compare job start gaps on the next three queue runs (runner concurrency).
2. **Release `case-prepare.ts` from the M3-S3 baton.** #1524's diff touches `schema.prisma` and a migration only. *Recommend:* name two holders in STATE (schema: M3-S3; case-prepare: BK-8) and start BK-8 now as a cloud lane. That takes ~4 h off the critical path.
3. **BK-9 may already be done or smaller than 2 sessions.** P-448 named "the shared-filing refusals in filing-changes.ts". On main fbfb263c7, B164's allow-list (`tests/check_b164_no_engine_keys.ts:31-44`) has no entry for `filing-changes.ts`, and I found no pathway-specific refusal there. *Recommend:* shape BK-9 by first checking whether M3-S1/M3-S2 lifted it. If they did, close it with that evidence and return its 2 sessions to the reserve.
4. **B169 #1523 reuses the merged branch `claude/amazing-davinci-wvk1b3`** (BK-10, #1518), against "fresh branch from origin/main, one session per branch" (RULES, P-278, P-436 (2)). Its 3-file diff against main is clean. *Recommend:* allow it this once (no harm in the diff), and add one line to the lane brief template: "new row = new branch name".
5. **Retest three open Majors that main may already fix, before any builder takes them:** QA-318 (fix commits to 84e54dd4d on main; BK-1: "not reproduced"), QA-355 (C7.8 commits 82e986c8f and 0e7357078 on main; the row cites 8d00b2a65 from before them), QA-234 (BK-1: "probably fixed"). *Recommend:* one qa lane now, ~1 h, on main fbfb263c7 with each row's own check. It can save 2-5 Bake sessions and move E3 today. If QA-355 still fails, it needs no baton: its cause is in `engine/runtime/`.
