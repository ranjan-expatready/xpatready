# Review: B190 step 1, CI minutes report (PR #1693, commit d0fa9c5a93d6bb60a66a757bfcf9cf8b5c87eb8c)

I am the independent reviewer and did not write this report. The PR adds one file:
`product/reports/ci-minutes-2026-11-13.md` (+197 lines, records only). It is not a screen, so on instruction no app was
walked and no journey test was run (no journey score applies). I checked it against the B190 row word for word, against
P-539, P-528, P-502, P-504, P-320 (b), P-291 (3), P-371, P-423 and P-205, and against the builder's raw data
(`runs.json`, `jobs.jsonl`, `prs.json`, `replay.tsv`, `direct.tsv`). I re-derived the figures with my own short scripts
(r1-r13.py, kept outside git in the session scratchpad). US$0; live AI off.

**Summary: the minute totals, class split, per-job split and suite-times figures hold up. The main root-cause line does
not: "about 2.4 batch runs per PR", and so "tested in full about five times" and "≈920 per code PR", divide one group of
PRs by another. Those numbers are meant to go to the founder, so this needs changes before merge.**

## What reproduces (my own code, same raw data)

| Figure in the report | Mine | Note |
|---|---|---|
| Runs, window | 14,495 runs, 24 Oct 12:06 to 13 Nov 10:13 UTC, 19.92 days | exact |
| Whole window 298,750 | 298,750 with the report's rule; **295,041** if jobs that never reached a runner are left out (Minor 1) | |
| 7 days 166,595; 10,109 runs | 166,595 / 10,109; **166,158** without never-started jobs | |
| PR · code 83,014 (402 runs, 117 red, 8 cancelled) | 83,014 / 402 / 117 / 8 | exact; unaffected by Minor 1 |
| Batch · code 70,989 (222 runs, 42 red, 6 cancelled) | 70,989 / 222 / 42 / 6 | exact; unaffected by Minor 1 |
| Whole window: 157,632 and 115,295 | 157,684 and 115,243 | 52 minutes move between the two (one `mergify/trial-shards-1` run and edge cases); total identical |
| Per-job split (shard 71,414 / packs 8,651 / types 1,288; batch shard 50,566 / regression 18,760) | identical | step shares 88-93% suites, 3-5% set-up: match |
| PR run median 188 (p10 26, p90 352); parts 28/41 and 34/43; 150 batches of 6 parts, 72 of 8; regression median 73.5 | identical | |
| 42 red batches: 36 suites, 6 Works packs; 13,671 minutes | identical | |
| Nightly 2 green, 1 red, 4 cancelled, 1,249 cancelled minutes | identical | |
| Self-hosted Mac 364 minutes in 7 days | 364 | |
| "Every suite" in 70 of 161; 380+ in 30; 151-379 in 37; 21-150 in 6; ≤20 in 18 | 71 / 29 / 38 / 6 / 18 of 162 | ±1 PR; the reasons match in kind and count |
| Minutes of those PRs 81,323: 46,959 "every suite", 20,904 380+, 2,718 ≤150 | 81,712 / 47,348 / 19,839 / 2,718 | same story |
| `--direct`: median 239, mean 247, 29 PRs ≤20 | median 236, mean 246, 30 PRs ≤20 (137 PRs) | |
| Suite-times: 213 machine-minutes, 50 suites 50%, 100 suites 71%, ≈125 browser/screen 40% | 213.5, 50%, 71%, 124 suites 40% | |
| Daily rows (4, 11, 12 Nov) | identical | |
| Time to merge: median 2.6 h / 1.4 h | 2.5 h / 1.4-1.5 h | n differs (Minor 6) |

**Runner labels, read from every job:** GitHub-hosted jobs carry only `ubuntu-latest`. Every other job carries
`self-hosted, macOS` (runners `xr-mac`, `xr-mac-light`, `xr-mac-2`). No GitHub-hosted macOS or Windows job ran. The rule
the report states (each hosted job rounded up to the whole minute; Linux ×1, Windows ×2, macOS ×10; self-hosted not
billed) is GitHub's documented rule, and the report applies it, with the one exception in Minor 1.

## Issues

### Major 1: "about 2.4 batch runs per PR" divides one group by another, and the headline and lever 1 rest on it
* **Where:** Summary point 4; "Why" table rows "Batch runs" and "Minutes per code PR"; lever 1 ("Then a PR is checked
  in about one batch, not 2.4"); the PR body.
* **Evidence:** 399 PR places / 167 PRs = 2.39. But the 167 are the PRs with a PR *code* check, and the places in the
  222 code batches belong to a bigger group. Records PRs and others are batched alongside code PRs: **216 distinct PRs**
  are checked as their own batch's PR, and 45 of them have no PR code check. Counting per code PR (`display_title` and
  the Mergify draft PR titles in `prs.json` agree), each code PR is **checked in 1.41 batches** as the batch's own PR. That
  rises to **1.84** if you also count batches where it is named as stacked ahead (plus 34 places "stacked on N pull
  requests ahead" that are not named). It is not 2.4.
* **The 399 / 1.8 does not reproduce either:** with stacked PRs counted I get 428 places (1.93 a batch: 119 batches of 1,
  50 of 2, 52 of 3-8). With only each batch's own PRs I get 303 (1.36: 168 of 1, 38 of 2, 16 of 3-6). The script that
  produced 399 is not in the scratch folder, so I cannot tell how it was counted.
* **The PR side is a little high too:** `ttm.py`-style mapping (head branch → PR) merges 49 runs on 11 lane branches
  that were reused for several PRs. If each run is matched to the PR open at that time, I get **176 code PRs at 2.27
  runs each** (not 167 at 2.4; 84 had 1 run, 33 had 2, 28 had 3, 32 had 4+).
* **And "in full" overclaims:** a PR run is not a full set. 43% of PRs choose every suite; the mean is about 304 of
  ≈400 with "every suite" counted as 400; P-371 (3) memory skips suites already green on re-runs (ci.yml l. 45-46).
  Measured instead of counted, PR code minutes per code PR are 83,014 / 176 ≈ 472, about 2.1 shard-sets of a batch
  (≈228 shard-minutes). Batch minutes per batched PR are 70,989 / 216 ≈ 329. **About 800 machine-minutes per code PR,
  and "tested about four times" (≈2.1 PR + 1.4-1.9 batch), not five and not 920.**
* **Why it matters:** these are the root-cause numbers that the report says go to the founder (P-502: measured, not
  assumed). Lever 1's "20-35k" is sized by moving from 2.4 batches per PR to 1. Moving from 1.4-1.9 to 1 leaves less to
  save; the red batches themselves cost 13,671. The top of that range needs its own working, or it should come down.
* **Fix:** define "places" (own PR only, or stacked too) and give the script. Divide by the PRs that occupy the places.
  Match runs to PRs by the time each PR was open. Restate Summary 4, the "Why" table, lever 1's rationale and range, and
  the PR body.

### Minor 1: about 1,285 jobs that never reached a runner are billed (+3,709 over the window, +437 in the 7 days)
* `analyse.py`'s `hosted()` treats `runner_name == ""` as hosted. These jobs have no steps and an empty runner and
  runner group. They were cancelled while queued (shards 511 jobs / 2,423 min, sweep, ci, label) or failed before
  starting. GitHub bills a job's time on a runner, so they cost nothing. Corrected totals: **295,041** (whole window)
  and **166,158** (7 days). The big code classes do not change. The small-workflow rows drop by about 7% (records-label
  1,566 → 1,393; label-guard workflow_run 1,668 → 1,526); "ci · pull request · nothing ran" drops from 45 to 0.
* **Fix:** count only jobs with a runner name and at least one step, or keep today's figure and say it is an upper bound.
  Carry the rule into `ci-minutes.py`.

### Minor 2: "mean 337" and "−27% measured" for `--direct` do not reproduce
* Across the 162 replayed PRs, the mean count today is **304** with "every suite" taken as 400 (309 with 411). On the
  137 PRs that have both replays, today's mean is 303 and `--direct`'s is 246: **−19%**, not −27%. 337 is close to the
  mean *excluding* the ≤20 PRs (341). Lever 2 calls the figure "measured".
* **Fix:** compare the same PRs with one stated value for "every suite", and restate the percentage.

### Minor 3: "these are the minutes a private repository would bill" assumes the machine stays the same
* GitHub's runner reference table lists the standard Linux runner as 4 vCPU in public repositories and 2 vCPU in
  private ones. This repository is public. The report (and the `suite-times.tsv` header, written while things may have
  been set up differently) says "GitHub's 2-core machines". If the public jobs ran on 4 vCPU, the same suites could take
  longer on a private repository, and the private bill would be higher than measured.
* **Fix:** confirm the core count from one part's log (for example `nproc`). Then say either that the durations are on
  the machine a private repository would get, or that private minutes may run higher. Remove the "2-core" claim if it
  is not shown.

### Minor 4: the self-hosted billing claim is undated
* "GitHub bills no minutes for self-hosted runners, public or private" is the current rule as I know it. GitHub
  announced in Dec 2025 a per-minute platform charge for self-hosted runners in private repositories, then postponed it.
  The price of the private switch rests on this rule (P-539 (3)).
* **Fix:** quote the billing page with the date it was read (P-502: named source). The 364 Mac minutes a week make the
  amount small either way.

### Minor 5: P-542 is cited, but no P-542 exists
* The baselines heading ("P-542: no product lane waits") and lever 7's guard cite P-542. There is no P-542 in
  `DECISIONS.md` at this head or on `origin/main` (ff0c2ef90), and no open PR adds one. The guard is sensible, but the
  record cannot be checked.
* **Fix:** land P-542 first, or cite what is recorded (P-528's "zero loss of quality or speed").

### Minor 6: smaller accuracy and wording points
* **Gap arithmetic:** Summary 6 says "about 12-13k a week" and "The gap to ~10k" says "9-13k". By my count, 160-240
  PRs in batches of 6 is 27-40 full sets at about 300 minutes each (213 suites + set-up + 73.5 packs), which is 8-12k.
  Use one range. The conclusion (the standard levers alone cannot reach ~2,300 a week under P-291 (3)) holds either way.
* **Combined estimate:** "−40 to −60%: about 70-100k a week, or 300-430k per 30 days" does not say whether these are
  savings or what remains (the numbers happen to be close either way). Say "leaving about …".
* **Batch size:** 168 of 222 code batches check a single PR, yet the gap math assumes batches of 6. The lever table
  never says what the batch size is today or who sets it. One sentence stating the measured size is enough; this asks
  for no new lever.
* **B190's own lever list:** "path filters" is not addressed by name. Say where it applies or why it does not (for
  example, required checks that a path filter would skip).
* **Time-to-merge n:** the n = 222 / 225 is the PRs *without the `records` label* (`ttm.py`), not "PRs with a full
  check". All PRs with a `kind` job give n = 245-259 and the same medians (2.5 h / 1.4 h). Fix the label.
* **Old-design row:** labelled "before 4 Nov" but the note says "Before 1 Nov". In the 7 days its 122 runs are
  "no job ran" runs, not old design. Small workflows sum to 6,256 (6,278 with label-guard · schedule), about 8,566 runs
  a week, not "about 9,000". "No API call failed": `jerr.log` shows 502s that succeeded on retry. Say so.
* **Caught-bug rate:** the rate has no baseline yet (the report says so honestly). Under P-528, no lever PR should
  merge before the red-batch split gives that baseline. The "Next PRs" order already puts it first; state it as a gate.

## Reasoning and decisions (no finding beyond the above)
* **Root cause:** the class and job split supports the conclusion. The minutes are suite execution in PR checks and
  batches (92% together), not set-up or small workflows. "Every suite" selection is a measured, specific cause (the
  replay reasons are concrete).
* **Lever ranking:** the order by minutes at stake is right. Only lever 1's size is in question (Major 1).
* **Who decides:** consistent. Lever 3 changes P-320 (b) and goes to the founder through the Lead. "Fewer full sets"
  changes P-291 (3) and goes to the founder. `.github/` changes are read by the Lead (P-423). Quarantine follows P-205.
  P-371 (2)/(3) follow ci.yml's own numbering of the flow fix (ci.yml l. 42-46), which differs from the item numbers
  in the DECISIONS line. That is not this PR's doing.
* **Recommendation:** pricing the private switch on the pace measured 7 days after the last cut matches B190's
  "Done when" and P-539 (3).

## Rules
* No personal names (roles only: "the founder", "the Lead"). No secrets. Nothing about a partner team's product, its
  CI or the private comparison (P-504, P-539 (1)). Only our own CI figures.
* `check-docs.sh`: docs OK. `push-guard.sh origin/main..HEAD`: clean. `git diff --stat origin/main...HEAD`: 1 file, +197.

## To fix before Approve
1. Major 1: restate batch places, batch runs per PR, PR runs per PR, "tested in full about five times" and "≈920 per
   code PR" from one stated population, with the counting script. Re-size lever 1.
2. Minors 1-6: correct them in the same commit where cheap. Minor 2 (the "measured" −27%) and Minor 5 (the uncited
   P-542) should not merge as they are.

Verdict: Changes needed

## Round 2: commit 2b52aea997cc7153c4b40891399b7054f07f1ece

I re-reviewed only the report's diff since d0fa9c5a9 (`git diff d0fa9c5a9..2b52aea99 -- …/reports/ci-minutes-2026-11-13.md`).
I re-checked each change with my own scripts (r4, r10-r14), not the builder's. `check-docs.sh`: docs OK.
`push-guard.sh origin/main..HEAD`: clean. The added lines contain no names, secrets or partner-team content.

| Round 1 finding | Now | My re-derivation | Status |
|---|---|---|---|
| Major 1, per-PR figures | 177 code PRs, 2.27 runs each; titles name 399 places, 217 distinct PRs, 170 code PRs; a code PR named in 1.9 batch runs; 469 + 327 ≈ 800 per code PR; "about four times, mostly with most of the suites" (mean 304 of 400); lever 1 at 15-30k | 176-177 PRs at 2.27 (runs matched by the PR open at the time); 394 named places with stacked PRs, 216 distinct, 323 / 170 ≈ 1.9; 83,014 / 177 = 469 and 70,989 / 217 = 327. The 399 against 394 gap is title-parsing detail and changes nothing. Lever 1's range now sits under the 1.9 → 1 ceiling (≈34k) | Closed |
| Minor 1, unrun jobs billed | jobs with no runner name or no step count nothing: 295,019 / 166,153; 1,115 jobs, 3,731 minutes | 295,019 / 166,153 exact; 1,115 jobs / 3,731 minutes exact; class rows (1,526, 1,393, 1,013, 1,011; small workflows 5,881), shares (50.0%, 42.7%, 7.3%), 712k pace and the daily rows (2, 4, 11 Nov) all match | Closed |
| Minor 2, `--direct` | same 146 PRs, 303 → 242, −20% | 147 PRs, 302 → 240, −20%, median 235 | Closed |
| Minor 3, runner size | marked unverified; private minutes may run higher; the Lead confirms before pricing | wording now matches the evidence | Closed |
| Minor 4, self-hosted billing | marked unverified; the Lead confirms before pricing | as above | Closed |
| Minor 5, P-542 | cited as the brief's P-542, not yet in `DECISIONS.md` on main | honest; the guard itself is P-528's | Closed |
| Minor 6 | gap 8-12k in both places; "saves 40-60%, leaves 65-100k"; 120 single-PR titles; path-filters row 11; time-to-merge n relabelled; "before 1 Nov"; 8,600 runs / 5,881 minutes; 502 retries stated; caught-bug split gates every lever | 166,153 × 0.4-0.6 leaves 66-100k ✓; `paths:` filters exist in `guards.yml` and `xfa-engine.yml`, and `.mergify.yml` needs `check-success = ci`, so row 11's reason is right ✓ | Closed |

### New, Minor (not blocking): two figures were not regenerated
* **Old-design note:** the note under the class table still says "the 'old design' row, **6,640** minutes". The row now
  says **6,483**.
* **Replay minutes:** "Of these PRs' PR-check minutes (**81,323**)" is round 1's total, kept while its parts (48,116,
  19,610, 2,763) were recomputed for 171 PRs. By my count the 172 replayed code PRs, matched by open time, have
  **80,869** PR-check minutes: 48,505 "every suite", 18,545 380+, 2,763 ≤150. Recompute the total with the parts.
* **Fix:** correct both, in this PR if another commit lands anyway, or in the `ci-minutes.py` PR. Neither changes a
  conclusion, a lever or a decision.

No Blocker or Major is open.

Verdict: Approve 2b52aea997cc7153c4b40891399b7054f07f1ece
