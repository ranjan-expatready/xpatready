# M2 bottleneck audit — 31 Oct to 3 Nov 2026

Independent audit, read-only. All figures are measured from git (`origin/main` at `af7cdd915`, 3 Nov 22:35 IST) and the GitHub API (`gh`, this repository). No figure here is taken from STATE.md, PR bodies or records prose. Times are IST (UTC+5:30). Window: 31 Oct 00:00 IST to 3 Nov ~22:40 IST (about 4 days) unless stated.

**Words used**
- **Product PR**: a merged pull request whose diff changes app code — `.ts/.tsx/.cjs/.js/.sql/.prisma/.css/.sh/.yml` under `prototype/studio/` (tests count, `evidence/` does not). Everything else is a **records PR** (notes, decisions, state, qa reports, data files).
- **Works**: a capability row in `product/qa/CAPABILITIES.md` with milestone M2 and status Works. M2 needs 60 (the gate is 59/60 under P-265).
- **Merge queue / batch**: Mergify takes approved PRs, tests them together on a temporary draft PR ("merge queue: …"), and merges them if the test passes.
- **Dequeue**: Mergify throws a PR out of the queue; it has to be fixed and queued again.
- **Median / p90**: the middle value / the value 90% of cases are below.

## Headline

The pipeline that turns a PR into a merge is fast: a product PR goes from opened to merged in a median **1.65 h** (p90 5.3 h), and the team merged **251 product PRs** in four days (22, 72, 85, 72 per day). The milestone is not slowed by building or merging speed. It is slowed by **what happens after the merge**: merged work does not stay "Works". Over the same four days, M2 went from **21 Works to 42 Works** (net **+21**), i.e. about **12 product PRs per net confirmed row**. 39 rows were promoted to Works and **18 were demoted** back, 14 of them in one re-test.

## (a) The top three bottlenecks, ranked

### 1. Rework: merged work that does not stay "Works" (biggest loss: 18 rows demoted, 52 hours of zero gain, ~12 PRs per net row)

| Measure | Value |
|---|---|
| M2 Works at 31 Oct 00:00 IST | 21 of 57 |
| M2 Works now (`origin/main`) | 42 of 60 (18 Partial) |
| Peak | 52 (3 Nov 09:14 IST) |
| Rows promoted to Works, 1–3 Nov | 12 · 12 · 15 = 39 |
| Rows demoted Works → Partial, 1–3 Nov | 3 · 1 · 14 = 18 |
| Rows that became Works twice (flipped back and forth) | C11.10, C5.6, C4.7, C5.5 (C11.10 demoted 3 times since 29 Oct) |
| Product PRs merged 31 Oct – 3 Nov | 251 (121 name an M2 row, 26 name an M3/thin-slice row, 104 name no row) |
| Product PRs per net new Works row | 251 / 21 ≈ **12**; per gross promotion ≈ 6.4 |
| Plateau with no Works gain | 30 Oct 13:54 → 1 Nov 18:22 IST (**52 h**) while **62** product PRs merged |
| One re-test wiped out a day's gains | #720 (qa after-merge, merged 3 Nov 18:27 IST): 14 rows Works → Partial, count 52 → 39 |
| Rows with the most product PRs that are still Partial | C11.14 (13 PRs since 31 Oct: #647…#741), C4.11 (12: #401…#744), C11.7 (7), C4.1 (5), C5.4 (5), C11.13 (5) |
| Product PRs that needed new commits after their first approval | 94 of 249 (38%); 47 were approved more than once |
| Open findings in `qa/BUGS.md` | 79 rows, 3 Critical (QA-180, QA-199, QA-200), about 20 Major |

Why it happens (from the data, not prose): the demotions in #720 cite packs that were green "on the fixture only" (C4.1, C4.8), Majors still open in BUGS.md (C3.2 QA-193, C5.4 QA-197, C11.13 QA-192) and rows "not re-run tonight". In plain words, rows were counted Works on evidence weaker than the bar applied later (P-290, P-304 (2), P-305 (3) tightened the bar on 3 Nov). Part of the drop is therefore a stricter count rather than new breakage — but either way the rows have to be re-earned. Defects are also still being found after merge: 3 Critical findings opened on 3 Nov (QA-180 on main after merge; QA-199 and QA-200 by after-merge re-reviews).

What did *not* cause it: qa speed. Where a row became Works, the gap between the last product PR naming that row and the promotion was a median **2.0 h** (p90 11.3 h, n = 35).

Commands:
```
git log origin/main --first-parent --reverse --since=2026-10-30T18:30Z --format='%H|%cI' -- ai-workers/.../product/qa/CAPABILITIES.md
# for each commit: git show <sha>:<that file>, parse '| C…' rows, column 4 = milestone, column 5 = status;
# count M2 Works and compare row by row with the previous commit (promotions / demotions)
git diff --numstat <first-parent> <merge>   # per merge on main, to classify product vs records
gh pr view 720 --json title,mergedAt,body
```

### 2. Process and leadership churn (about 29 h of product-merge gaps; 3.5 h for the 3 Nov restart alone; a third of all merges are records)

| Measure | Value |
|---|---|
| Decision rows 31 Oct – 3 Nov (P-189 … P-310) | 122: 17 · 19 · 62 · 24 per day |
| Of those, about process / about product (auditor's reading of each headline) | **~75 process** (15 · 14 · 30 · 16) vs ~47 product (2 · 5 · 32 · 8) |
| Tech-lead hand-overs merged (PR titles "hand-over"/"wrap-up") | 1 Nov: 4 (#193, #269, #302, #360) · 2 Nov: 5 (#431, #497, #555, #578, #596) · 3 Nov: 6 (#653 blank-sheet, #678, #704, #754, #774 open, plus the P-289 retirement of Leads 1–6) — **about one hand-over every 5 h** |
| Restarts/wind-downs recorded as decisions | P-257 (stop at 95% for an account switch), P-262 (soft close), P-289 (close every lane and Lead, blank-sheet restart), P-290 (fresh Lead), P-307/P-308/P-310 (wind down on this account) |
| Product-merge gap during the 3 Nov restart | 09:59 → 13:29 IST, **3.5 h with zero product merges** (P-289 ~09:20 IST, P-290 ~11:30 IST) |
| All product-merge gaps of 1.5 h or more | 11 gaps, **29.4 h** in total (largest: 31 Oct 12:19 → 17:19, 5.0 h; 31 Oct 23:38 → 1 Nov 03:58, 4.3 h; 3 Nov restart 3.5 h) |
| Records PRs among merges | 122 of 373 merges (33%); "lead:" alone 6 · 11 · 23 · 24 per day — rising, not falling |
| Share of merges touching the same coordination files | DECISIONS.md 13%, STATE.md 12%, CAPABILITIES.md 12%, tools/decision-impact.sh 12% |

Effect: each hand-over and each process ruling generates a records PR that goes through the same queue as product code (P-306 (3) made that mandatory), adds conflicts on the shared notes files (see 3), and re-reads large context. A workflow freeze was declared on 31 Oct (P-204, "fixes only until 7 Nov"); 75 process decisions were recorded in the four days after it.

Commands:
```
grep -E '^\| P-[0-9]+ \| (31 Oct|1 Nov|2 Nov|3 Nov) ' product/DECISIONS.md     # headline of each row read by hand
git log origin/main --first-parent --since=2026-10-24 --format='%H|%cI|%P|%s' # + numstat per merge -> product/records, gaps
gh pr list --state all --json number,title,createdAt,mergedAt,headRefName       # hand-over titles
```

### 3. Merge-queue churn from conflicts on shared files (about 129 extra PR-hours; 45% of test batches thrown away)

| Measure | Value |
|---|---|
| Dequeues (Mergify "Left the queue" comments) | **89 on 57 PRs** |
| Reasons | conflicts with main **46** · thrown out because a PR ahead was dequeued 16 · PR updated while queued 12 · failing checks 10 · merged by hand 5 |
| Test batches (Mergify draft PRs) 31 Oct – 3 Nov | 249: 137 merged, **112 discarded (45%)**; 1 Nov: 50 of 78 discarded (64%) |
| Approval → merge, product PRs never dequeued | median **1.16 h** (211 PRs) |
| Approval → merge, product PRs dequeued at least once | median **3.53 h** (34 PRs) — **129 PR-hours** above the clean median |
| Product PRs dequeued for a conflict | 22, together 102 h from approval to merge |
| Files named in conflict dequeues | qa/CAPABILITIES.md 4, tools/decision-impact.sh 3, api/src/main.ts 3, web/.../forms.tsx 2, and DECISIONS.md, BACKLOG.md, BUGS.md, schema.prisma (26 of the 46 conflicts name no file) |
| Worst examples | #113 (approved 5 times, queued 7 times, 35.8 h); #154 (queued 3 times, 16.2 h); #131 (24.3 h, failing checks) |
| Hand merge restarting a batch | P-306 (3) records one on 3 Nov 16:15 IST; Mergify logged 5 dequeues caused by a PR merged by hand (on #161, #172, #211, #217, #405) |

The queue itself is not slow (see ruled out). The loss comes from PRs that touch the same files — notes files most of all — invalidating each other's batches, so batches are rebuilt and re-tested.

Commands:
```
gh api "repos/<owner>/<repo>/issues/<n>/timeline?per_page=100" --paginate   # 415 PRs since 31 Oct
# parse: 'labeled'/'unlabeled' (review: approved, queued), 'merged', and mergify[bot] comments with "state": "dequeued" -> **Reason** block
gh pr list --state all --json number,title,state,createdAt,closedAt,headRefName   # headRefName mergify/merge-queue/* = batches
```

## (b) What was checked and ruled out

| Suspect | Finding | Verdict |
|---|---|---|
| Review speed | PR opened → first `review: approved` label: median 0.14 h, p90 1.22 h (242 product PRs) | Not a bottleneck |
| Building before the PR opens | first commit → PR opened: median 0.14 h, p90 2.1 h (commits only show when work was pushed, see limits) | Not measurable as a bottleneck |
| CI duration | Merge-queue batch test, successful runs: median 19 / 25 / 29 min (1 / 2 / 3 Nov), p90 33–45 min. PR-branch CI median 24–26 min | Acceptable; not top three |
| CI failures | Batch failures 19 / 8 / 8 per day (1–3 Nov); dequeues for failing checks only 10 | Minor; flaky checks were quarantined (P-205) |
| Cancelled CI runs | 459 of 1,156 PR-branch CI runs cancelled (superseded by a new push) plus 42 batch runs; ~150 wall-hours of runner time in cancelled runs | Cost, not delay |
| qa latency after merge | last product merge for a row → row marked Works: median 2.0 h (n 35) | Not a bottleneck |
| Approval → queued | median 0.46 h, p90 2.1 h | Small |
| Machine (runner) waits | `gh run list` start time equals created time, so job-level waits cannot be seen; no long waits visible at run level | Not measured; no sign of a problem |
| Paid-AI approvals | open paid-result PRs: #417 (since 2 Nov 09:36 IST, no label), #669, #671, #771 (3 Nov) | Affects C3.4, C11.14 only; small in count, but both rows are among the Partial ones |
| Spread of work beyond M2 | 26 of 251 product PRs named M3 or thin-slice rows (C6.x, C7.x); 104 named no row (fixes, infra, QA-ids) | Some dilution; not top three |
| Closed unmerged PRs | 15 non-queue PRs closed unmerged in the window (e.g. #320, #321, #357, #478, #493) | Small |

## (c) One change per bottleneck, and the number that shows it worked

| # | Change | Number to watch (from the same commands) |
|---|---|---|
| 1 | **Make "Works" mean the same thing before and after merge.** A row's acceptance pack must pass on the demo data (not only the test fixture) on the PR head, and the row may not be labelled while it has an open Major/Critical in BUGS.md. qa's re-run is the gate for the label on the row's *last* PR, not a later sweep. | Works → Partial demotions ≤ 1 per day (was 14 on 3 Nov); product PRs per net new Works row ≤ 4 (was ~12); no row promoted twice. |
| 2 | **Hold the process still and keep one tech lead per day.** No new process decision for 7 days unless the founder makes it; one hand-over per day at most; records written once every few hours in one PR instead of per ruling. | Process decision rows ≤ 2 per day (was ~19); hand-overs ≤ 1 per day (was 4–6); records PRs ≤ 10% of merges (was 33%); no product-merge gap over 2 h in working hours. |
| 3 | **Keep shared notes files out of builder PRs.** Builders write per-capability files (the pattern P-221 already uses for "Built, awaiting qa"); only one records PR per batch window touches DECISIONS, STATE, CAPABILITIES and decision-impact.sh; split route wiring out of `api/src/main.ts` and `studio.ts` so features do not edit the same lines. No hand merges while a batch is checking. | Conflict dequeues ≤ 5 per day (was ~15); discarded batches ≤ 15% (was 45%); median approval → merge for dequeued PRs closer to 1.2 h (was 3.5 h). |

## (d) Limits of the data

- **Product vs records** is decided by file type and folder. A qa PR that adds a test script counts as product; a large form-data JSON change counts as records. Lines of app code changed per day (tests included): 4.7k · 22.1k · 23.6k · 18.7k (31 Oct – 3 Nov).
- **Process vs product decisions** is the auditor's reading of each row's headline; mixed rows (e.g. "tech-lead rulings") were put in product. The exact split could move by ±10 rows; the direction would not.
- **Build time** cannot be measured: builders commit late, and their session time is not in git or GitHub.
- **Capability per PR** comes from row ids in PR titles; 104 product PRs name no row, so "PRs per row" is a rough ratio, not a per-row cost.
- **Works history** is read from `CAPABILITIES.md` on `origin/main` only; edits on unmerged branches (e.g. #776 "M2 43/60", still queued) are not counted. Some of the 3 Nov drop is a stricter counting rule rather than new defects; the file does not separate the two.
- **Bugs before vs after merge**: the "Found" column in BUGS.md is free text; of 72 findings numbered QA-120 or higher, 26 clearly name main (after merge), 17 name a PR head, 29 cannot be told. Several "PR head" findings came from after-merge re-reviews.
- **CI runs**: `gh run list` returned runs from 31 Oct 08:00 IST onwards (two pages of 1,000); earlier runs and job-level runner waits are not covered.
- Merge-queue batch PRs that were superseded by a larger batch are counted as "discarded"; some of that is normal Mergify behaviour, not failure.
- Working files for every figure (raw JSON and scripts) are in the scratchpad folder next to this report: `prs.json`, `allprs.json`, `merges.json`, `classified.json`, `tl/<pr>.json`, `lt.json`, `deq.json`, `allruns.json`, `caps.txt`.
