# Merge flow trial, 1–3 Nov 2026 (P-210, P-211, P-213)

Owner: the tech lead. Judged on 3 Nov with the founder.

## The problem, measured
60 checks to 1 Nov 02:57 UTC on the one Mac runner (an 8 GB M1 that also runs builders, the demo and the database):

| Runner time went to | Hours | Share |
|---|---|---|
| Batches cancelled because a batch ahead failed | 7.3 | 43% |
| Failed batches | 3.2 | 19% |
| Batches that merged | 4.4 | 26% |
| Other checks | 2.0 | 12% |

A full batch check took 36–45 minutes, on the Mac and on GitHub's 2-core machine alike (31 Oct), because the suites run one after another. Merges ran at about 3.6 an hour.

## What changed
1. **P-210 (free):** Mergify checks one batch at a time, batches of up to 6, and a PR joins only once its own check is green.
2. **P-211 (free):** the explicit-any check compares with the PR's base commit, so PRs that pass alone also pass together.
3. **P-213 (paid trial, cap US$30):** a batch runs on four GitHub Linux machines at once (`run-suites.sh --shard i/4`). Dry run, 1 Nov: 101 units split 26 / 25 / 27 / 24; every suite once, the same set as one machine.

## Targets (judged 3 Nov)
* Batch check: 15 minutes or less (longest shard).
* Merges an hour: 8 or more when PRs wait; an approved PR merges within 30 minutes.
* Wasted runner time: under 20%.
* Spend: inside US$30 for the trial; forecast for a month stated with the verdict.

## Risks, and how each is watched
| # | Risk | Watch (20-minute check) | Mitigation |
|---|---|---|---|
| 1 | Suites behave differently on Linux than on the Mac (paths, timing), so the first batches fail for setup reasons | first two batches read line by line | fix in `cloud-setup.sh` or the suite; `BATCH_RUNNER=mac` if not fixable the same hour |
| 2 | The budget runs out and GitHub refuses jobs: the queue stalls without a red test | jobs that never start; spend from each run's minutes | report spend daily; at US$25 decide with the founder; fallback switch |
| 3 | Uneven shards: the slowest sets the batch time | each shard's minutes | balance by measured suite times (order the list by duration) |
| 4 | Four machines give an unreliable suite four chances to fail | failures that pass on re-run | P-205 quarantine after two random failures, fix the same day |
| 5 | Setup (node, packages, Python, PostgreSQL, Chromium) repeats on every shard and bills each time | setup minutes per shard | cache `.tools` and the packages if setup passes 5 minutes |
| 6 | Builders' PRs still queue on the Mac for their fast checks | waits over 15 minutes | move the fast checks to GitHub too (about 2 minutes each) |
| 7 | A Linux-only pass hides a Mac-only fault | the nightly full run on the Mac | a red nightly is fixed first, as now |

## Not changed
Builders' own PRs (fast checks, Mac), the nightly full run (Mac), review and labels (P-189), live AI off (US$0 model spend).
