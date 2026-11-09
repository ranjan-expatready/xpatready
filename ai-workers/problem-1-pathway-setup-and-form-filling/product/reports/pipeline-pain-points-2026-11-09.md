# Delivery pipeline: where the time goes (study, 9 Nov 2026)

Read-only study for the tech lead, written for an independent challenger to re-run. Data was pulled 17:52 to 18:05 IST on 9 Nov from the GitHub REST API and `origin/main` (at `cfaa199f4`, 17:52 IST). All history means 24 Oct to 9 Nov 2026: 1,429 pull requests, 4,346 `ci.yml` runs and 256 `nightly.yml` runs. Times are in IST unless marked UTC.

**Short answer.** M3 is not held up by building. On `main` it stands at 17 Works, 6 Partial and 6 Not built (n=29). Of the 12 rows that are not Works, 8 already have merged code. The time goes to three things:
1. **The Partial loop.** Every row that reached Works needed a median of about 12 merged PRs and about 6 calendar days in Partial. qa finds a gap after the merge, a builder opens a new PR, and that PR goes round the whole cycle again.
2. **A slower cycle.** Each trip round that cycle got slower: the median time from opening a PR to merging it went from 1.6 h (1 to 4 Nov) to 4.6 h (9 Nov).
3. **Four PRs that have sat about 2 days.** Three Not built rows (C7.8, C6.16, C6.17) have had a PR open for 49 to 50 h, and one of the four (#1272, C6.18) has been open 47 h.

## Top 5

| # | Pain point | Measured time lost | Sample and period | How measured | The one change that would cut it | Could it lower quality? |
|---|---|---|---|---|---|---|
| 1 | **Partial loop: gaps are found after the merge, one PR at a time.** qa walks `main`, finds gaps, a new PR is opened and goes round the full cycle again. | Per row that reached Works: median **~12 merged PRs** and **~6 days in Partial** (range 0.3 to 14 days). Each extra round costs one PR cycle (median **4.6 h** on 9 Nov) plus a qa walk. | n=12 M3 rows that reached Works (merged PR count) and n=11 rows with a Partial→Works date; 25 Oct to 9 Nov | Status history of each M3 row from the git history of `qa/CAPABILITIES.md` on `main`, plus merged builder PRs whose title names the row (E1) | qa (or the builder's acceptance pack under qa's rules) walks the capability on the **PR branch before the label**, so the full list of gaps comes back in one round. The after-merge walk on `main` and the fresh Opus reader stay as they are. | No, as long as the walk on `main` and the reader's verdict still decide Works. It adds a walk; it removes no gate. |
| 2 | **PRs left open with no decision.** #1248 (C7.8), #1257 (C6.16), #1262 (C6.17) and #1272 (C6.18) were opened 7 Nov and are still open. The board at 17:23 IST shows them as "Merge queue" or "Question to". | **47 to 50 h each** so far. These are 3 of the 6 Not built rows; C6.19 has no PR at all. | n=4 PRs; opened 7 Nov, age measured 9 Nov 18:00 IST | `created_at` of open PRs whose title names an M3 row (E2) | A time limit on questions and queue holds: any open M3 PR with no push and no answer for 4 h goes to the tech lead's next check as a decision, either answered or closed. | No. It is a decision deadline, not a skipped check. |
| 3 | **The cycle per PR is getting longer.** Opened → merged, and the merge queue's batch run. | Opened → merged median **1.6 h** (1 to 4 Nov, n=372) → **2.6 h** (6 to 7 Nov, n=77) → **3.5 h** (8 Nov, n=37) → **4.6 h** (9 Nov, n=27). Batch CI run median **18 min** (1 Nov, n=55) → **53 min** (9 Nov, n=23). | 614 merged builder PRs, 24 Oct to 9 Nov; 519 finished batch runs | `created_at`/`merged_at` per PR by IST merge day; `run_started_at`→`updated_at` of `ci.yml` runs on `mergify/merge-queue/*` heads (E3) | Run only the suites a PR changes in the PR's own run (the batch run keeps the full suite), and look at why the batch run tripled (suite growth versus slow shards: `tools/suite-times.tsv`). | Not if the batch keeps the full suite. Cutting the batch run itself would lower quality. |
| 4 | **Conflicts with `main`: dequeues and merges of `main` that had to be redone.** | **139 dequeues** on **82 of 614** merged PRs. A dequeued PR took **3.1 h** from its first label to merge, against **0.9 h** without a dequeue: **~2.2 h extra each, ~180 h in all**. **509 merges of `main`** into builder branches; 243 PRs needed one or more, **117 needed two or more**. Each one triggers a new full run (~41 min) and often a new review round (example: #1392, round 5 only for the merge of `main`). | Dequeues 31 Oct to 9 Nov; merges of `main` 24 Oct to 9 Nov; n=614 merged | Mergify payload comments (`dequeue_reason.code`) and commit messages starting with "Merge origin/main…" in each PR's timeline (E4) | Keep shared records files (STATE, BACKLOG, CAPABILITIES, BUGS, DECISIONS) out of builder PRs, so builders and the lead stop touching the same lines. Let the queue update the branch itself where Mergify allows it. Dequeue reasons: conflict 47, checks failed 31, PR updated while queued 31, dequeued by hand 23. | No, as long as the reviewer still reads any merge of `main` that needed a hand-fixed conflict. |
| 5 | **Two full CI runs per PR.** The PR's own full run, then the batch run. | Own full run median **40.6 min** (n=175 runs over 10 min, 7 to 9 Nov; 130 machine-hours), and it sits on the critical path before the label. Batch run median **53 min** (9 Nov, n=23). Each merged PR also triggers a median of **4** `ci.yml` runs on its branch (p75 9; 4,606 in all, 440 failed). | `ci.yml` runs 24 Oct to 9 Nov | Durations per run (E5). P-432's "own ~45, batch 56" is roughly confirmed: 40.6 and 53.3. | Same lever as #3: the PR's own run takes the changed suites plus the type check; the full suite runs once, in the batch. | No: the full suite still runs before anything reaches `main`. A breaking PR would be caught one step later, in the batch, at the cost of a dequeue. |

**Token candidate for the top 5 (founder's addition, 9 Nov ~18:00 IST):** **T1 below.** Long sessions re-send a context of 300k or more on every call. That accounts for about three quarters of all measured Mac spend. It is the biggest token cost, while #1 to #5 are the biggest time costs.

## Token efficiency (founder's addition)

**What was measured.** Every Mac session transcript for this project was read: `~/.claude/projects/-Users-<user>-Desktop-Xpatready*/**.jsonl`, 692 sessions and subagents, 13 Oct to 9 Nov 18:08 IST, about 60,800 model calls. Calls are de-duplicated by message id and request id.

**Cloud sessions are not on disk.** Since 1 Nov most builders have been cloud lanes, so builder cost after 1 Nov is under-counted. Every "per PR" figure below is a Mac-only floor.

**The weighting.** Weighted cost uses the usual price ratios against a normal input token: cache read 0.1×, cache write 1.25×, output 5×. The ratios are an assumption; the token counts are measured. "M" means million input-equivalent tokens.

**Totals by role** (13 Oct to 9 Nov; role taken from the session's first command or folder):

| Role | Sessions | Calls | Cache read (M raw) | Cache write (M raw) | Output (M raw) | Weighted (M) | Share | Average context per call |
|---|---|---|---|---|---|---|---|---|
| Lead | 47 | 11,642 | 3,789 | 27.3 | 7.6 | 463 | 22% | 325k |
| Builder (Mac) | 51 | 11,919 | 3,513 | 31.1 | 8.8 | 456 | 21% | 295k |
| qa | 19 | 8,248 | 2,558 | 19.3 | 5.3 | 318 | 15% | 310k |
| Other main sessions (side studies, one-offs) | 61 | 7,764 | 2,209 | 27.4 | 7.3 | 291 | 14% | 284k |
| Reviewer (subagent) | 259 | 7,987 | 857 | 51.6 | 7.2 | 186 | 9% | 107k |
| Standby builders (warm, waiting) | 8 | 3,662 | 1,378 | 8.4 | 2.7 | 162 | 8% | 376k |
| Subagents, other (searches, studies) | 129 | 3,629 | 466 | 21.6 | 2.5 | 85 | 4% | 128k |
| Standby Leads / watchdog ("watcher") | 14 | 2,502 | 609 | 6.9 | 1.5 | 77 | 4% | 244k |
| Breaker | 46 | 2,403 | 285 | 8.5 | 2.7 | 53 | 2% | 119k |
| Challenger | 15 | 622 | 103 | 3.3 | 0.7 | 18 | 1% | 166k |
| Fresh reader | 43 | 401 | 57 | 5.2 | 0.3 | 14 | 1% | 142k |
| **All** | **692** | **~60,800** | **15,823** | **211** | **46** | **~2,120** | 100% | |

**Where the cost sits:**
* **Re-reading context:** cache reads are about **1,580 M of ~2,120 M weighted (~75%)**.
* **Writing output:** output is **~230 M (~11%)**.
* **Cold starts and cache misses:** about 1,700 large cache writes (>50k), 73 M raw, ~4%.

So the cost is not the work written. It is re-sending big contexts.

**Context size per call** (calls / share of cache-read tokens):

| Role | Calls with context >200k | Their share of cache reads | Calls with context >400k | Their share of cache reads |
|---|---|---|---|---|
| Lead | 74% | 87% | 29% | 47% |
| Builder | 65% | 83% | 22% | 42% |
| qa | 66% | 83% | 23% | 44% |
| Standby builders | 81% | 92% | 39% | 59% |

The heaviest single sessions ran to 662k to 966k of context. Examples: qa 4 to 5 Nov, 1,401 calls, 711 M cache read; qa 7 to 9 Nov, 1,482 calls, 406 M; Lead 4 to 5 Nov, 966k peak.

**Per unit of output** (Mac only, so a floor):
* **About 3.5 M weighted per merged builder PR:** ~2,120 M / 614 merged builder PRs, 24 Oct to 9 Nov.
* **About 27 M per capability at Works:** 77 Works rows, M2 60 plus M3 17.
* **Per merged PR by role:** Lead 0.75 M · qa 0.52 M · reviewer 0.30 M · standby builders and standby Leads 0.39 M · breaker 0.09 M · fresh reader 0.02 M.
* **The Lead plus the standbys cost more per PR than the reviewers and breakers together.**

**Spend by day** (weighted, Mac):

| Day | Weighted (M) | Main roles |
|---|---|---|
| 4 Nov | 417 | qa 113, standby builders 109, Lead 107 |
| 5 Nov | 289 | |
| 8 Nov | 46 | Standby Leads / watchdog 27, which is **58%** |
| 9 Nov | 48 | Standby Leads / watchdog 26, which is **54%** |

**Model mix:** 58,385 of ~60,800 calls (96%) ran on Opus. Sonnet ran 1,150 calls, Fable 568, others (Kimi, Haiku, GLM) about 680.

STATE pages record the weekly plan burning at **4 to 5% an hour** "with 7 lanes, qa and a 350k Lead", so the week's plan lasts about a day (history/STATE-*.md).

### Token top 4 (biggest waste first)

| # | Waste | Measured | The change | Tokens saved | Could it lower quality? | Can the tech lead do it today without lowering quality? |
|---|---|---|---|---|---|---|
| T1 | **Long sessions re-send 300k+ of context on every call.** Lead, qa, builders and standbys run to 400k to 966k before a handover; P-314 hands over at ~400k. | Cache reads at **~75% of spend**. Average context per call is 295k to 376k for these roles. Calls over 200k carry 83 to 92% of their cache reads. | Hand over (or start a fresh session per row or per capability walk) at **~150k to 200k instead of ~400k**. Keep state in files, read by line range. This was also item 1 and item 3 of the 2 Nov saving plan. | If the average context falls from ~300k to ~120k: **about 60% of these roles' cache reads**, roughly 700 M of the ~2,120 M measured (**~33% of Mac spend**), about **1.1 M per merged PR**. | **Yes, a little, if a handover drops detail.** A fresh session can miss an earlier finding. Mitigation: the handover note is a file and qa's findings live in BUGS and CAPABILITIES. | **Yes for qa and builders:** one capability walk or one row per session, which matches the existing rule. The Lead's own threshold is a founder rule (P-314), so it needs his word. |
| T2 | **Idle warm sessions:** standby builders and standby Leads / watchdog, on Opus, re-reading 244k to 376k contexts while they wait. | **~240 M weighted (~11%)** in all history. **54 to 58% of all Mac spend on 8 to 9 Nov.** | Retire the Opus standbys. The watchdog becomes a shell check (`tools/lead-watch.sh` / `factory-board.sh` already exist) that wakes the Lead only on a state change. A standby is started only at the handover itself. | On 8 to 9 Nov **~25 M a day, about half of the Mac daily spend**. | No: a standby does no product work. The risk is a slower takeover if the Lead dies, about one cold start (~100k cache write). | **Yes.** |
| T3 | **Review cold starts and re-reviews after each push or merge of `main`.** | 259 reviewer runs, **51.6 M of cache writes** (≈ 200k per run, the largest cold-start cost of any role). ~186 M weighted (~9%). Example: #1392 needed 5 rounds, the last only for a merge of `main`. 117 PRs merged `main` in twice or more (E4). | Re-review **only the diff since the last approved commit**. For a merge of `main` with no conflict, a script checks that the diff outside `main` is unchanged, so no reviewer is needed. Fewer merges of `main` (top-5 #4) also removes rounds. | About **0.1 to 0.15 M per PR** (one fewer cold start in about half the PRs). | No for the diff-only and no-conflict-merge cases. **Yes if** a re-review is skipped after a *conflicted* merge: keep the reviewer there. | **Yes** (the diff-only rule already exists in places, P-318; enforce it in the skill). |
| T4 | **Opus for read-only side work.** | Other subagents (searches, studies): 129 runs, ~85 M weighted, 81% on Opus. Other main sessions: ~291 M. | Sonnet or Haiku for searches, inventories and measurements like this study. Opus stays for the builder, the reviewer, the breaker and the **fresh reader** (P-432 moved verdicts back to Opus because Sonnet verdicts were weak). | Roughly **40 to 60 M** in all history (~2 to 3%). | **Yes, if it were applied to the reviewer or the fresh reader: don't.** No for read-only searches. | **Yes**, for read-only subagents only. |

**Checked and not a big cost:** cache misses after wakes. Large cache writes total ~4% of spend, and the Lead's own large writes total only 9 M raw (46 events), so the Lead's cost is size per call, not misses.

The token cost of failed CI runs could not be measured on the Mac: those reworks happen in cloud lanes. The CI side is in E5: 440 failed runs on builder branches.

**Re-run:** `tok.py` and `tok2.py` in `/private/tmp/claude-501/-Users-<user>-Desktop-Xpatready/8cf36380-4a93-4c1d-9bb3-80f15055b8a1/scratchpad/pp/`. They read each assistant line's `message.usage` (`input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens`) and de-duplicate by (`message.id`, `requestId`). Role rules:
* **Lead:** `/lead` or "resume as the tech lead" in the first user messages.
* **qa:** `/qa`, or a `qa-*` worktree.
* **Builder or standby builder:** `/next`, or a builder/forms/screens/runtime/evidence worktree; `standby` in the name means standby.
* **Standby Lead / watchdog ("watcher"):** "watch" in the first message (on checking, these are second-standby Lead sessions).
* **Subagents:** `subagents/*.meta.json` `agentType` and description.

The classification is heuristic; "Other" holds side sessions and one-offs.

**Smaller than expected (not in the top 5):**
* **Approve → label:** median **0.32 h** (n=88 PRs with a "Reviewer: Approve" comment). Last push before the label → label: median **0.13 h** (n=567).
* **Label walk-backs:** 122 removals of `review: approved` on 94 PRs; median **0.07 h** to put it back; **72 h in all** (n=114).
* **Waiting for a CI runner:** median **0 min** for every kind of run.
* **Batch failure rate:** 75 of 519 finished batch runs failed (**86% pass**; 47 more were cancelled). P-432's "18 of 20 passed" fits this.

## Evidence (re-runnable)

Set-up. The `gh` GraphQL client fails here; use curl with the REST API. Python's urllib was cut off by the proxy at about 1 MB, so write curl's output to files. Background processes got HTTP 403 from the proxy: run in the foreground.

```bash
T=$(gh auth token); R=https://api.github.com/repos/<owner>/xpatready
curl -sS -D h.txt -o page.json -H "Authorization: Bearer $T" "$R/pulls?state=all&per_page=50&page=1"   # 29 pages, 1,429 PRs
curl -sS -H "Authorization: Bearer $T" "$R/issues/<n>/timeline?per_page=100"                         # per PR: committed, labeled, unlabeled, commented, merged
curl -sS -H "Authorization: Bearer $T" "$R/actions/workflows/ci.yml/runs?per_page=100&page=<k>"      # 4,346 runs
```
The scripts used are in the scratchpad: `fetch.py`, `an.py`, `an2.py` (`/private/tmp/claude-501/-Users-<user>-Desktop-Xpatready/8cf36380-4a93-4c1d-9bb3-80f15055b8a1/scratchpad/pp/`). Definitions:
* **Builder PR:** head branch `claude/*` or `devin/*`. That gives 648 PRs: 614 merged, 21 closed without merge, the rest open.
* **Batch:** head branch `mergify/merge-queue/*`. That gives 566 PRs. Mergify closes each batch PR; the merge lands on the original PRs.

**E1: the Partial loop.** Status history per M3 row from `main`:
```bash
git log origin/main --format='@@%h %cI' -p --unified=0 -- ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/CAPABILITIES.md \
 | python3 -c "import sys,re;cur=None;h={}
for l in sys.stdin:
  if l.startswith('@@') and not l.startswith('@@ '): cur=l[2:].split()[1]; continue
  m=re.match(r'^\+\| (C\d+\.\d+) \|[^|]*\|[^|]*\| (M3)[^|]*\| ([^|]+)\|',l)
  if m: h.setdefault(m.group(1),[]).append((cur,m.group(3).strip()))
for k,v in sorted(h.items()): print(k,sorted(v))"
```
Partial → Works in calendar days (commit times):

| Row | Partial → Works |
|---|---|
| C11.5 | 27 Oct → 6 Nov (10 d) |
| C11.6 | 29 Oct → 8 Nov (10 d) |
| C6.12 | 2 → 8 Nov (6 d) |
| C6.4 | 2 → 8 Nov (6 d) |
| C6.9 | 2 → 7 Nov (5 d) |
| C7.6 | 25 Oct → 8 Nov (14 d) |
| C7.7 | 2 → 9 Nov (7 d) |
| C8.1 | 3 → 8 Nov (5 d) |
| C8.2 | 2 → 7 Nov (5 d) |
| C9.2 | 5 → 8 Nov (3 d) |
| C3.16 | 8 → 8 Nov (0.3 d) |

Median ~6 d (n=11).

Merged builder PRs whose title names the row: C1.3 2, C11.5 3, C11.6 11, C6.11 10, C6.12 16, C6.4 15, C6.9 19, C7.6 18, C7.7 31, C8.1 13, C8.2 8, C9.2 10. Median ~12 (n=12). Title matching misses PRs that do not name the row, so these counts are a floor.

Status went backwards **10 times on 9 rows** (Works or Partial → lower): C11.6, C3.16, C6.11, C6.12, C6.13, C6.4, C6.9, C7.10, and C9.2 twice. Most fell on 9 Nov, when earlier Sonnet verdicts were re-read on Opus (P-432). Each walk-back is one more trip round the cycle.

On `main` now (n=29): 17 Works, 6 Partial, 6 Not built.

| Row | Status | Last builder merge (UTC) | Open PRs |
|---|---|---|---|
| C10.2 | Partial | 9 Nov 09:36 | none; real Adobe finding |
| C3.16 | Partial | 9 Nov 11:21 | none |
| C6.13 | Partial | 9 Nov 11:52 | none |
| C6.14 | Not built | #1392, 9 Nov 11:21 | none |
| C6.5 | Partial | 9 Nov 11:48 | #1386, #1409 |
| C7.3 | Partial | 9 Nov 11:21 | none |
| C7.5 | Partial | 8 Nov 19:04 | #1396, #1411 |
| C8.3 | Not built | 9 Nov 11:48 | none |
| C6.16 | Not built | none | #1257 |
| C6.17 | Not built | none | #1262 |
| C7.8 | Not built | none | #1248 |
| C6.19 | Not built | none | none |

So 8 of the 12 have merged code waiting for qa's walk and the reader's verdict.

**E2: PRs left open.** Ages from `created_at` at 18:00 IST, 9 Nov:

| PR | Row | Age |
|---|---|---|
| #1248 | C7.8 | 50.0 h |
| #1257 | C6.16 | 49.7 h |
| #1262 | C6.17 | 49.3 h |
| #1272 | C6.18 | 47.0 h |
| #1386 | C6.5 | 9.7 h |
| #1396 | C7.5 | 6.8 h |
| #1409 | C6.5 | 4.5 h |
| #1411 | C7.5 (checkpoint) | 4.5 h |
| #1074 | C6.12 | 102.9 h |

```bash
curl -sS -H "Authorization: Bearer $T" "$R/pulls?state=open&per_page=100" | python3 -c "import json,sys;[print(p['number'],p['created_at'],p['title'][:60]) for p in json.load(sys.stdin)]"
```

**E3: cycle time trend.** Opened → merged, median hours by IST merge day (`an.py`, block "open->merge by merge day"):

| Merge day | n | Median h |
|---|---|---|
| 1 Nov | 80 | 1.65 |
| 2 Nov | 97 | 1.58 |
| 3 Nov | 97 | 1.64 |
| 4 Nov | 98 | 1.65 |
| 5 Nov | 54 | 1.34 |
| 6 Nov | 29 | 2.76 |
| 7 Nov | 48 | 2.58 |
| 8 Nov | 37 | 3.48 |
| 9 Nov | 27 | 4.57 |

Over all history (n=614): opened → first label median 0.40 h (p90 6.7), last label → merged median 0.86 h (p90 2.8).

P-432 said the median was 5.7 h on 9 Nov against 3.6 to 4.2 h on 4 to 8 Nov. I measure 4.6 h and 1.3 to 3.5 h. The trend is the same; the level is lower, probably because P-432 counted open PRs or a different set. Batch run median by day: 18.4 min (1 Nov) → 22.9 → 28.7 → 26.8 → 26.1 → 30.2 → 34.8 → 36.8 → 53.3 min (9 Nov) (`an2.py`).

**E4: dequeues and merges of `main`.** Parse each timeline comment from `mergify[bot]` that contains `Mergify Payload`. JSON `state` = `dequeued` gives `dequeue_reason.code`, `queued_at` and `left_at`.
* Dequeues by IST day: 31 Oct 3, 1 Nov 35, 2 Nov 22, 3 Nov 10, 4 Nov 35, 5 Nov 7, 6 Nov 5, 7 Nov 7, 8 Nov 5, 9 Nov 10.
* Time in the queue before being dequeued: median 0.4 h, 91 h in all (n=139). Beyond that comes the re-work and the second wait (the 2.2 h gap above).
* Mergify also posted "Merge queue reset: the base branch head moved outside the merge queue" **55 times**. That is the lead's records merges restarting batches, as already noted in memory.
* Merges of `main`: count timeline `committed` events whose message matches `^Merge (origin/main|branch 'main'|remote-tracking branch 'origin/main'|main)`.

**E5: two CI runs.** `ci.yml` runs on builder branches since 7 Nov: 593 succeeded, 62 failed, 65 cancelled (all `pull_request`). Only 175 of them ran over 10 min (the full suite). The rest are short runs that the suite selection skipped, so the median of all builder runs (0.55 min on 9 Nov) is misleading; the full-run median is 40.6 min.
* All history, by kind of branch: builder 1,939 finished runs, 518 machine-hours; batch 519 runs, 247 h; lead/other 611 runs, 89 h.
* 675 builder runs were cancelled, by concurrency when a new push arrived.
* Re-runs (`run_attempt` > 1): 74.

**PR size versus time** (diff of each merge commit against its first parent on `main`, n=612):

| Lines changed | n | Median opened → merged |
|---|---|---|
| under 200 | 269 | 1.14 h |
| 200–500 | 154 | 2.14 h |
| 500–1,000 | 101 | 2.76 h |
| over 1,000 | 88 | 3.96 h |

The last 40 merged builder PRs had a median of 360 lines, 7 of them over 1,000. P-432 measured 523 lines and 11 over 1,000; the difference is probably in how lines are counted (P-432's method is not recorded). Size matters, but less than the loop and the conflicts.

**Rework rounds.** 81 of 614 merged PRs mention review "round 3" or higher, and 14 mention "round 5" or higher. This is a regex on the first 300 characters of PR comments; reviewer comments do not follow one format, so treat it as a floor.

## What I could not measure

* **How long qa takes to walk a row, and when the Opus reader gives its verdict.** There is no machine timestamp for "walk started" or "reader done". I only have the commit that changes the row in `CAPABILITIES.md`, and that commit then waits for its own merge. Merge → verdict per row is therefore an upper bound, not measured.
* **Waits for paid runs** (C7.5's US$0.86 review, Adobe Validate on C10.2): the founder's go and the approval times live in chat, not on GitHub.
* **Idle lanes.** Gaps between pushes add up to 892 h across 309 PRs with gaps over 1 h, but that includes nights, account switches and the 4 Nov cloud outage. Without session logs, true idle time cannot be separated from work done off-branch.
* **Reviewer Major → fix → re-review with exact counts:** verdicts are free text (see the rework floor above).
* **`nightly.yml`** (256 runs) was fetched but not analysed: it is off the critical path for a PR.
* **Commit times** on rebased or merged branches can differ from push times; GitHub's REST API does not give push times for every PR.
* **M3 rows whose milestone column changed** (for example M2 → M3) are traced only from the moment they carried M3.
* **Cloud-session tokens** (most builders since 1 Nov, the cloud qa lanes) are not on the Mac. Token figures per PR and per capability are Mac-only floors, and the builder share after 1 Nov is under-counted.
* **Weighted token cost** uses assumed price ratios (cache read 0.1×, cache write 1.25×, output 5×). The raw counts are measured. The weekly plan % per role cannot be derived from transcripts.
