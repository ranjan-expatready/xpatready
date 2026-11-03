# I1 — test each change once: what was measured, what changed (3 Nov)

Founder decisions P-291 (3) and (8), P-292 (2), P-293 (2). Built by an I1 cloud session; numbers come from GitHub's
Actions history (GitHub MCP: `list_workflow_runs`, `list_workflow_jobs`, job logs) and from replaying
`tools/select-suites.mjs` over the pull requests merged on main. Raw data stayed in the session (not committed).

## Before (ci.yml as of main 877acf66)

**Window:** 599 runs of `ci.yml`, 2 Nov 00:07 to 3 Nov 06:53 UTC. Jobs and steps were sampled from 60 runs: 30 merge-queue
batches, 22 product PRs and 8 records PRs, about 300 jobs.

| Measure | Merge-queue batch | Product PR | Records PR |
|---|---|---|---|
| Runs (completed) | 106: 82 green, 6 red, 18 cancelled | 381: 158 green, 31 red, 192 cancelled | 110: 43 green, 1 red, 66 cancelled |
| Run wall time, median / p90 (green or red) | 27.4 / 37.6 min | 25.8 / 42.1 min | 3.1 / 29.4 min |
| Suites step per part, median / p90 | 22.5 / 26.6 min | 22.5 / 26.4 min | 0.3 / 24.1 min |
| Start-up per part (job start → suites step), median / p90 / max | 1.5 / 1.8 / 6.0 min | 1.5 / 1.9 / 9.0 min | 1.4 / 1.9 / 4.6 min |
| Machine wait (job created → started), median / p90 / max | 0.0 / 0.1 / 2.5 min | 0.1 / 1.3 / 2.4 min | 0.0 / 0.9 / 1.2 min |
| Machine minutes per run, median | 97 | 99 | 7 |
| Slowest minus fastest part, median / max | 7.4 / 12.5 min | 4.6 / 12.7 min | — |

* **Every product change ran the full suite twice, confirmed.** A product PR's suites step (22.5 min a part) matches a
  batch's. Replaying the selector over the 65 product PRs merged since 1 Nov: 54 (83%) chose **everything** (shared
  files: contracts/, acceptance/, prototype/p2/, engine/, api/src/features/ and others). The other 11 still chose
  about 210 of 263 suites, mostly through endpoints that almost every suite calls (for example `api/src/core.ts`).
  Most product changes really can reach most suites: the app is tightly coupled.
* **The parts were unbalanced.** `suite-times.tsv` knew 103 of the 263 suites and counted the rest as 30 s each.
  In batch 41575784426 the four parts ran 1254, 872, 1109 and 1090 s of suites; in batch 41567889839, 962, 1284, 1122
  and 1456 s. The slowest part sets the wall time.
* **Flaky failures (same commit, different result): 0 found, but the measure is weak.** No commit ran twice to a
  decision in the window (no reruns). The known random failures are the 3 suites in run-suites.sh's QUARANTINE list.
  Batch failures: 6 of 88 decided runs (7%).
* **Missed dependencies (found while testing the selector):** the AI prompt files are `.md`
  (`prototype/p2/prompts/*.md`, `prototype/p5/reader/prompts/`), so the selector and the old "does this PR change
  code?" step treated a prompt change as docs and ran no suite. The same went for `official-sources/`, whose
  manifests and PDFs the app reads at start (`api/src/core.ts`, `canada.ts`, `demo.ts`, `filing.ts`, `engine/import.ts`).

## What I1 changed

* `ci.yml`: a new job `kind` (`tools/change-kind.sh`, about 25 s) sorts each PR or batch:
  * **notes**: only `*.md` records and `product/reports/`, nothing under sources/, code/, archive/ and no data
    `.md`. Runs `check-docs.sh` and `decision-impact.sh`, plus the push guard (about 1 s), on one machine. No suites
    and no app build.
  * **records** (boards, guards, settings, other workflows): the fast checks on one machine, no suites. Before I1,
    these ran the 6-suite smoke set on four machines.
  * **code** (the selector chooses everything, or a suite for a reason other than the smoke set): a builder's PR runs
    `run-suites.sh --changed` (the suites its change can affect); a batch runs **every suite but the quarantined ones**
    (`--skip-quarantined`), the one full run per change.
* `select-suites.mjs`: the missed dependencies above now choose everything. `product/tools/` and `.github/` files that
  do not run the suites (guards, nightly, demo) now choose nothing; before, they chose everything. A new `--direct`
  mode never chooses everything (see "Open choice").
* `suite-times.tsv`: medians measured for 262 suites (three batch runs, 3 Nov), so the four parts come out even.
* `merge-guard.sh`: builders may `gh pr comment`; merge, close and review stay with the Lead (P-293 (2)). The comment
  hook was dropped from `.claude/settings.json`.
* Tests on part 1 of every records and code check: `check-select-suites.sh` (25 cases; 7 fail on the old selector)
  and `check-merge-guard.sh` (56 cases; 13 fail on the old guard).
* Switches: repository variables `SHARDS` (parallel parts, default 4) and `PR_SUITES=direct`. The Mac fallbacks
  `BATCH_RUNNER`/`PR_RUNNER` are unchanged.

## Parallel parts: kept at 4

Simulated with the measured times (82 min of suites per full run):

| Parts | Slowest part, old times → measured times | Wall time of a full run (+1.5 min start-up, +0.4 min `kind`) | Machine minutes |
|---|---|---|---|
| 4 | 22.6 → 20.6 min | about 22.5 min (was 27.4 median) | about 88 |
| 6 | 16.6 → 13.7 min | about 15.6 min | about 91 |
| 8 | 11.7 → 10.3 min | about 12.2 min | about 94 |

The founder's three conditions for more parts:
* Start-up per part is small: **met**. 1.5 min, about 6% of a part.
* Machines stay free: **met today, not at tonight's load**. Machine wait p90 is at most 1.3 min. Tonight has about 13
  sessions, and up to 3 batches plus several PRs run at once on the 40-machine plan. At 6 parts that is 18 machines for
  batches plus 6 per product PR, so 4 product PRs at once would hit the limit and start queueing.
* No new flaky failures: **cannot be shown before a trial**. A new part count changes which suites share a machine and
  in what order, and one-at-a-time ordering issues have bitten before (QA-145, the C3.13 port reuse).

**Decision: stay at 4 and rebalance first.** The even split recovers about 4–5 min a run on the same machines with no
new risk. Six parts would save about 7 more minutes a batch for 2 more machines a run. Trial it in daytime with
`gh variable set SHARDS --body 6`, and keep it only if batch failures stay at or below 7% over a dozen batches.
Undo with `gh variable delete SHARDS`.

## Open choice for the tech lead: PR_SUITES=direct

The fixed selector was replayed over the 129 PRs merged on main since 1 Nov: 84 code, 21 records, 24 notes. Of the 84
code PRs, 70 (83%) still choose everything, as instructed ("the suites its change can affect"), so they still test
twice. `PR_SUITES=direct` never chooses everything: it runs the suites that import or name a PR's files, plus the
endpoint- and page-matched suites and the smoke set. The queue's one full run stays (P-291 (3)).
* Over the same 84 PRs it chooses a median of 110 of 263 suites (42%), p90 225, max 240. That is a PR check of about
  12 min instead of about 26 at the median. The widest changes barely move.
* **For:** about half the PR test time at the median.
* **Against:** a break outside the chosen set shows up in the batch, not the PR. Mergify then splits the batch, which
  costs about 25 min for the other PRs in it. P-293 says a rise in failed batches undoes the change (7% before I1).

## After

(Filled from this PR's own runs: see the PR body.)
