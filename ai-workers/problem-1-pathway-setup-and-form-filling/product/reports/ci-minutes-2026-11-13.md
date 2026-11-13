# CI minutes by workflow, trigger and job: B190 step 1 (13 Nov)

Row B190 (P-539, P-528, P-502). Root cause first: where this repository's GitHub Actions minutes go, measured from
GitHub's API before anything changes. Records only. The cuts come later in small PRs, one lever each, each with its
measured effect.

## Summary

1. **The pace is higher than the estimate.** This is a full count, not a sample: **295,019 billable Linux minutes from 14,495 runs** between
   24 Oct 12:06 and 13 Nov 10:13 UTC, which is **19.9 days**. The repository was created on 23 Oct, so no 30-day window exists yet.
   **The last 7 days alone used 166,153 minutes, about 712k per 30 days.** The earlier figure (≈281k per 30 days, a
   378-run sample, ±30%) is about 2.5 times too low for today's pace.
2. **93% of today's minutes are two things:** pull-request checks of code (50.0%) and merge-queue batches of code
   (42.7%). Everything else together (labels, guards, drafts, records, nightly) is 7.3%.
3. **Most of those minutes are tests, not set-up.** In the parts (job `shard`), the suites step is 89-93% of the job's
   time. Set-up (`cloud-setup.sh`) is 3-5% of a part, 14-19% of a pack job and about 40% of the type check.
4. **Each code change is tested about four times, mostly with most of the suites.** A code PR's check chose every suite
   in 75 of 171 merged code PRs (44%) and 380 or more of about 400 suites in 31 more (mean 304 of 400). Each code PR had
   **2.27 PR check runs** (402 runs, 177 PRs). Each was then named in **1.9 batch runs** on average, some of them as a PR
   stacked ahead in another batch's check; 42 batches (19%) went red and were split. Each batch also re-runs **every
   Works pack** (a median of 73.5 machine-minutes a batch, 18,760 a week). That is **about 800 machine-minutes per
   code PR** (469 in PR checks per code PR, 327 in batches per PR they named). The full suite set alone costs about 213
   machine-minutes (`tools/suite-times.tsv`).
5. **No GitHub-hosted macOS job ran.** Every job not labelled `ubuntu-latest` runs on the founder's own self-hosted Mac
   (`self-hosted, macOS`: `demo-update` and the old Mac path, 364 minutes in 7 days). They are left out of the totals.
   Whether GitHub charges for self-hosted minutes on a private repository could not be checked from this session
   (docs.github.com is outside its network), so it stays a question for the Lead (below).
6. **About 10k per 30 days (≈2,300 a week) cannot be reached with the standard levers alone.** At today's merge rate
   (≈170-220 PRs a week through the product queue) and today's batch cost (≈230-320 machine-minutes), even one batch of
   6 PRs per full set would cost about 8-12k a week. Reaching ~10k needs the levers below **and** a much cheaper suite
   set (the 50 slowest suites take 50% of its time; the 125 browser and screen suites take 40%). Details in "The gap to ~10k".

## Method (P-502)

* **Runs:** `GET /repos/{repo}/actions/runs?created=<from>..<to>`, in 12-hour windows so no query reaches GitHub's
  1,000-result cap: 14,495 runs, all workflows, all events.
* **Jobs:** `GET /actions/runs/{id}/jobs?filter=all` (every attempt) for every run that did not end `skipped`: 10,766
  runs, plus a random 60 of the 3,729 skipped runs (all 60 had no started job, so 0 minutes). Each job carries its
  start, end, runner labels and steps. Every call returned data; some returned 502 at first and succeeded on retry.
* **Minutes as GitHub bills them** (GitHub's Actions billing page, as known to the Lead's estimate; docs.github.com
  could not be read from this session): each GitHub-hosted job rounded **up** to the whole minute; Linux counts ×1,
  macOS ×10. Only `ubuntu-latest` jobs are counted. Self-hosted jobs are shown apart, and skipped jobs count nothing.
  1,115 jobs that never reached a runner (no runner name, no step: cancelled while waiting) count nothing either
  (3,731 minutes of waiting).
* **What a private repository would bill:** these are the minutes the same runs took on public-repository runners. GitHub
  gives public repositories a larger standard Linux runner than private ones (to be confirmed by the Lead on GitHub's
  runner page). If so, the same tests would take longer, and bill more, once private. That is one more reason to
  re-measure after the switch.
* **Classes** for `ci.yml`: a batch is a PR on a `mergify/merge-queue/*` branch. A draft push ran only the job
  `guard`. *Code* means a part ran Playwright's Chromium step; *records* means one part ran without it; *notes or already
  green* means no part ran. Runs of the design before 1 Nov (jobs `checks`, `suites`, `changes`, `merge`) are grouped
  apart. A PR run is matched to its PR by the run's PR link, else by head branch **and** the PR's open time, because
  lanes reuse branches. `nightly.yml` is split into the schedule and runs by hand or by PR comment (`comment-run.yml` starts those).
* **Two windows:** the whole history (19.9 days) and **the last 7 days** (6 Nov 10:13 to 13 Nov 10:13 UTC). The
  design changed often before 6 Nov (Mac path off 4 Nov, P-371 flow fix 6 Nov, 8 parts 10 Nov), so the 7 days are
  today's pace.
* **Suite choice** is a replay, not a log read. For each code PR merged in the 7 days (171 with a merge commit in the
  clone), `git diff` of the merge's two parents was piped into `product/tools/select-suites.mjs`, which is what a PR
  check runs (`run-suites.sh --changed`). "Every suite" counts as 400 (the full set of the 10 Nov batches). The same was
  done with `--direct` for 146 of them; the replay stopped at its time limit.
* **Time to merge:** from a PR's first full check (job `kind` started) to `merged_at`, for every PR merged in the window
  without the `records` label.
* Scripts and raw data were kept out of git (records only; P-371 (4)). The next PR adds the measuring script as
  `product/tools/ci-minutes.py`, so each cut is measured the same way.

## Minutes by workflow, trigger and class

| Workflow · trigger · class | 7 days: runs | 7 days: minutes | share | min/run | red / cancelled runs | whole window: minutes |
|---|---:|---:|---:|---:|---:|---:|
| ci · pull request · code | 402 | 83,014 | 50.0% | 206.5 | 117 / 8 | 156,086 |
| ci · merge-queue batch · code | 222 | 70,989 | 42.7% | 319.8 | 42 / 6 | 115,121 |
| ci · pull request · records | 318 | 3,235 | 1.9% | 10.2 | 149 / 1 | 4,992 |
| nightly · schedule (full) | 7 | 1,991 | 1.2% | 284.4 | 1 / 4 | 2,286 |
| label-guard · workflow_run | 1,616 | 1,526 | 0.9% | 0.9 | 2 / 94 | 1,526 |
| records-label · pull_request_target | 3,150 | 1,393 | 0.8% | 0.4 | 1 / 285 | 1,393 |
| guards · pull_request | 362 | 1,013 | 0.6% | 2.8 | 10 / 107 | 1,022 |
| label-guard · pull_request_target | 2,514 | 1,011 | 0.6% | 0.4 | 2 / 26 | 1,011 |
| ci · draft push (guard only) | 902 | 916 | 0.6% | 1.0 | 0 / 35 | 923 |
| nightly · run by hand or by comment | 46 | 593 | 0.4% | 12.9 | 11 / 0 | 3,116 |
| ci · merge-queue batch · records | 39 | 344 | 0.2% | 8.8 | 1 / 0 | 611 |
| ci · pull request · notes or already green | 34 | 68 | 0.0% | 2.0 | 4 / 0 | 342 |
| label-guard · schedule | 22 | 22 | 0.0% | 1.0 | 0 / 0 | 22 |
| xfa-engine · pull_request | 5 | 19 | 0.0% | 3.8 | 1 / 0 | 19 |
| ci · merge-queue batch · notes or already green | 5 | 10 | 0.0% | 2.0 | 0 / 0 | 18 |
| xfa-engine · schedule | 2 | 9 | 0.0% | 4.5 | 0 / 0 | 9 |
| ci · old design (before 1 Nov) or no job ran | 122 | 0 | 0.0% | 0.0 | 2 / 117 | 6,483 |
| automerge · pull_request_target | 0 | 0 | 0.0% | 0.0 | 0 / 0 | 20 |
| automerge · workflow_run | 0 | 0 | 0.0% | 0.0 | 0 / 0 | 18 |
| records-merge · pull_request | 0 | 0 | 0.0% | 0.0 | 0 / 0 | 1 |
| ci · pull request · nothing ran | 15 | 0 | 0.0% | 0.0 | 1 / 14 | 0 |
| demo-update · push | 255 | 0 | 0.0% | 0.0 | 0 / 74 | 0 |
| comment-run · issue_comment | 71 | 0 | 0.0% | 0.0 | 0 / 0 | 0 |
| **Total** | **10,109** | **166,153** | 100% | | | **295,019** |

Red and cancelled counts are runs. "Whole window" is 24 Oct to 13 Nov. Before 1 Nov the Mac ran the suites and GitHub
ran only the fast checks (the "old design" row, 6,640 minutes).

## Minutes by job and step (last 7 days)

| Class | Job | Minutes | Share of class | Where a job's time goes (steps) |
|---|---|---:|---:|---|
| PR · code (83,014) | shard (6-8 parts) | 71,414 | 86.0% | suites 89%, set-up 5%, runner and checkout 3% |
| | packs (by diff, D2) | 8,651 | 10.4% | packs 76%, set-up 14%, runner and checkout 7% |
| | types | 1,288 | 1.6% | set-up 43%, runner and checkout 26%, tsc 25% |
| | kind, ci, retry-comment | 1,661 | 2.0% | runner, checkout, memory download |
| Batch · code (70,989) | shard (6 or 8 parts) | 50,566 | 71.2% | suites 93%, set-up 3% |
| | regression (every Works pack, P-320 (b)) | 18,760 | 26.4% | packs 44%, set-up 19%, runner and checkout 14%, other 15% |
| | types, kind, regression-plan, ci, retry-comment | 1,663 | 2.3% | |
| PR · records (3,235) | shard (1 part, fast checks) | 1,469 | 45.4% | set-up 55%, fast checks 21% |
| | types | 1,026 | 31.7% | set-up 45% |
| Nightly · schedule (1,991) | suites (6 parts) | 1,628 | 81.8% | suites 95% |
| | works | 349 | 17.5% | packs 86% |
| label-guard, records-label, guards, draft guard (5,881) | one small job each | 5,881 | — | 10-20 seconds of work billed as 1 minute; runner and checkout ≥50% |

Per run (7 days): a PR's code check is a median of **188 minutes** (p10 26, p90 352). PR parts take a median of 28
minutes (p90 41) and batch parts 34 (p90 43). A batch runs 6 parts (150 batches) or 8 (72), plus a median of 73.5
regression minutes.

## Why: each code change is tested about four times, mostly with most of the suites

| Step a code PR goes through (7 days) | Measured |
|---|---|
| Code PRs with a PR check of code | 177 (171 merged in the window and were replayed below) |
| PR check runs per code PR | **2.27** (402 runs); 117 of 402 red (29%). Memory (P-371 (3)) skips suites already green on an unchanged base, so a re-run is not always the full choice |
| Suites a PR check chooses (`select-suites.mjs`, replay of 171 merged code PRs) | **every suite in 75 (44%)**, 380+ in 31, 151-379 in 39, 21-150 in 6, ≤20 in 20; mean 304 of 400 |
| Of these PRs' PR-check minutes (81,323) | 48,116 went to "every suite" PRs and 19,610 to 380+; only 2,763 to PRs choosing ≤150 |
| Why "every suite" (first reason, 75 PRs) | a file "no suite calls its endpoint(s) or imports it" (17), a checkpoint step folder "the app loads by listing it" (15), "shared" `ci.yml` (11), migrations (7), `main.ts` (5), lockfile (1), `main.ts` constants used outside controllers (MAX_VALIDATED_MB 10, 2 others), `run-suites.sh`/`select-suites.mjs` "decides how the suites run" (6), other (1) |
| With `--direct` (`PR_SUITES=direct`, the existing switch; the same 146 PRs) | mean 242 suites against today's 303 (**−20%**), median 235.5; 34 PRs ≤20 |
| Batch runs | 222. Their titles name 399 PR places (a title's "+N more" not counted) and 217 distinct PRs, 170 of them code PRs. A code PR is named in **1.9** batch runs on average. 120 titles name one PR only |
| Red batches | **42 (19%)**: parts' suites in 36, Works packs in 6; 13,671 minutes in red batches, then their PRs are checked again in split batches |
| Every batch re-runs every Works pack | a median of 73.5 minutes a batch (18,760 a week, 11.3% of all) |
| Minutes per code PR | 83,014 / 177 = 469 in PR checks, plus 70,989 / 217 = 327 in batches: **about 800** |

## The baselines no cut may worsen (P-528: no quality loss; the brief's P-542, product rows first and no product lane waits, not yet in `DECISIONS.md` on main)

| Measure (7 days to 13 Nov) | Value | The week before |
|---|---|---|
| First full check → merged, PRs without the `records` label | median **2.6 h**, p90 11.2 h (n = 222) | median 1.4 h, p90 8.3 h (n = 225) |
| PR code checks red | 117 of 402 (29%) | |
| Batches red (bugs caught at the queue, flaky or real) | 42 of 222 (19%): 36 suites, 6 Works packs | |
| Nightly (schedule) | 7 runs: 2 green, 1 red, 4 cancelled (1,249 minutes in the cancelled ones) | |
| PR records checks red | 149 of 318 (47%), 3,235 minutes | |

**Caught-bug rate** for each cut means: per 100 code PRs, red PR checks and red batches whose log shows a code cause,
measured the same way before and after. No log was read for this report. The next PR reads the failed parts' logs of
the 42 red batches and splits them into code cause and no code cause. **That split is the gate for every lever PR:** a
lever lands only if, over its measuring week, time to merge holds and code-cause reds are still caught where they
were (before merge).

## Levers, ranked by minutes they can save (estimates from this data; each is measured in its own PR)

| # | Lever (standard name) | Minutes a week today | Possible saving | Quality guard | Who decides |
|---|---|---:|---:|---|---|
| 1 | **Fewer re-runs in the queue:** find why 19% of batches go red. Split each into code cause or flaky; quarantine flaky suites (P-205), fix real ones. Then a PR is checked in about one batch run, not 1.9 | 70,989 | 15-30k | A red cause is still caught; only re-checks of the same code go | Builder (measure) → Lead |
| 2 | **Affected suites only, done precisely:** narrow the ALL reasons above (shared `ci.yml` → only the CI tools' own suites; a migration → its tables' suites; `main.ts` constants; step folders by name), or turn on `PR_SUITES=direct` (−20% of suites, replayed) | 71,414 (PR parts) | 10-25k | The batch still runs every suite before merge; watch that red batches do not rise (lever 1) | Builder; the switch is the Lead's |
| 3 | **Works packs in each batch only where the batch touches them** (as job `packs` does on a PR); all of them nightly, already scheduled | 18,760 | up to ~15k | Changes P-320 (b) (every Works pack per batch): **the founder's call, through the Lead** | Founder |
| 4 | **Fewer PR re-runs:** 2.27 runs per PR, 29% red. Memory (P-371 (3)) skips only unchanged green suites. Lever 1's split shows how many re-runs had no code cause | 83,014 | 5-15k | A red head is always tested again (unchanged) | Builder → Lead |
| 5 | **Small workflows billed a whole minute each:** about 8,600 runs a week of label-guard, records-label, guards and draft guard (10-20 s of work each). Put one event's jobs in one run, and run the sweep after `ci` only where a PR carries `queued` | 5,881 | 2-4k | The label guard and sweep keep every check (B134, F4) | Lead reads `.github/` (P-423) |
| 6 | **Caches for set-up:** PostgreSQL binaries, apt packages, Playwright's Chromium, the built web app; the type check without the database | ≈10,000 in set-up | 3-5k | Same set-up, read from cache; a cache miss runs today's path | Builder; Lead reads `.github/` |
| 7 | **Fewer parts where waits allow:** each part adds about 2-3 minutes of set-up and rounding; 8 → 6 parts lengthens a full run by about 9 minutes | 624 code runs | 2-3k | Longer wall time slows merges: **only if time to merge holds** (P-542) | Lead |
| 8 | `concurrency` cancel-in-progress on superseded PR heads | 3,053 in cancelled PR code runs | <1k | Already in place for drafts; a ready head is never cancelled (P-371 (2)), never `main` or the queue | No change proposed |
| 9 | No macOS unless a test needs it | 0 billed (self-hosted) | 0 | — | Nothing to cut |
| 10 | `timeout-minutes` | every job has one | — | — | Nothing to add |
| 11 | Path filters | `guards.yml` and `xfa-engine.yml` already have them; `ci.yml` already decides notes, records or code in job `kind` | <1k | A workflow-level filter on `ci.yml` would leave no `ci` check, which Mergify needs (`check-success = ci`); the label workflows must see every PR | No change proposed beyond lever 2 |

Levers 1-4 overlap (fewer red batches also mean fewer PR re-runs), so the savings do not add up. A careful
combined estimate **saves 40-60%**, which leaves about 65-100k a week, or 285-430k per 30 days.

## The gap to ~10k per 30 days

~10k per 30 days is about 2,300 minutes a week. Today the full suite set costs about 213 machine-minutes on GitHub's
public-repository machines (`tools/suite-times.tsv`, 411 suites: 50 suites take 50% of it, 100 take 71%, 125 browser
and screen suites take 40%). Each part adds about 2 minutes of set-up, and a batch adds the Works packs (median 73.5).
Even with every lever above, one full set per batch of 6 PRs, at today's ≈170-220 PRs a week through the product queue,
costs about 8-12k a week before any PR check. Today 120 of 222 batch titles name a single PR.
So ~10k per 30 days needs one of these:
* **cheaper suites** (the standard lever after selection): the slowest 50 suites halved, shared servers and databases
  between suites instead of one each, browser suites only where the screen changed. That is a separate row of work
  on the suites themselves; or
* **fewer full sets**: the full set only nightly and per batch only the affected suites. That changes P-291 (3)
  (the queue runs every suite) and is the founder's call; or
* a lower merge rate.

**Recommendation to the Lead:** land levers 1, 2, 5 and 6 as builder PRs, each measured. Take lever 3 and "fewer
full sets" to the founder as one question, with this report's numbers. Price the private switch on the pace measured
7 days after the last cut, not on the 281k estimate. Before pricing, confirm on GitHub's pages two facts this session
could not read: the private runner size, and any charge for self-hosted minutes on a private repository.

## Daily minutes since 1 Nov (UTC; 13 Nov is to 10:13)

| Day (UTC) | runs | minutes | PR checks | merge-queue batches |
|---|---:|---:|---:|---:|
| 2026-11-01 | 481 | 7421 | 3179 | 4242 |
| 2026-11-02 | 699 | 25651 | 18396 | 7255 |
| 2026-11-03 | 414 | 20569 | 14891 | 5678 |
| 2026-11-04 | 872 | 41129 | 22460 | 17504 |
| 2026-11-05 | 605 | 24237 | 14005 | 8734 |
| 2026-11-06 | 179 | 10218 | 5485 | 4495 |
| 2026-11-07 | 1465 | 30090 | 12703 | 16322 |
| 2026-11-08 | 1198 | 17903 | 8842 | 7720 |
| 2026-11-09 | 2007 | 30434 | 18585 | 10667 |
| 2026-11-10 | 652 | 11558 | 4988 | 5794 |
| 2026-11-11 | 2287 | 32541 | 20325 | 10427 |
| 2026-11-12 | 1839 | 31056 | 15541 | 13890 |
| 2026-11-13 | 536 | 5691 | 2020 | 3022 |

## Next PRs (one lever each, under ~800 lines, measured before and after with the same script)

1. `product/tools/ci-minutes.py` (this report's measurement as a tool) and the red-batch split (lever 1's evidence).
2. Lever 2: precise selection for the ALL reasons above, each with a pass and a fail test in `check-select-suites.sh`.
3. Lever 6: set-up caches.
4. Lever 5: small workflows (`.github/`, read line by line by the Lead first, P-423).
