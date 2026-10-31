# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-10-31 · milestone: **M2 — Super Admin configuration**, with the thin runtime slice R1 · way of working: `WAY-OF-WORKING.md` · work list: `BACKLOG.md` · why each choice was made: `design/why-we-chose-2026-10-31.md`

## Resume here (a fresh `/lead` chat)
1. Open PRs: `gh pr list`. A PR merges by itself on green CI plus the label `review: approved` (the `automerge` workflow checks every approved open PR on each run). The demo updates itself after merges.
2. Builders run as cloud sessions (forms, runtime, screens). They cannot message the Lead: their PRs are their reports, and their questions sit under "Questions" in each PR. Collect them; decide the technical ones; bring the founder only product, money and preference questions, one at a time, with a recommendation.
3. Then `BACKLOG.md` row **X0**: regroup the backlog into features (P-191), and walk the founder through `design/why-we-chose-2026-10-31.md`.

## Progress (counted from `qa/CAPABILITIES.md` by `tools/progress.sh`; moves only after qa tests)
* M2 Super Admin setup: 21 of 57 work (36%) · 16 partial · 1 not tested · 19 not built
* R1 thin runtime slice: 6 of 8 work (75%)
* M3 case, agent and client: 0 of 15 work · 3 partial (design agreed; build at the M2 gate)

## In flight (31 Oct, 08:00 UTC)
**Blocker: CI was refused for every PR** from about 06:15 UTC, because GitHub's machines spent the US$10 monthly budget in one morning (about 2,500 minutes). The founder chose P-195: PR checks and auto-merge move back to the Mac runner `xr-mac` (free). When that PR is green on the Mac, the waiting PRs re-run and merge by themselves (BACKLOG N0).

| PR | Area | What | Where it stands |
|---|---|---|---|
| #113 | runtime (Mac, local_3b02c2d2) | queue transaction fix, C10.1 checkpoint, C3.11, P-184 speed helper, S7 Reset + Load sample | the tech lead decided its four "Found while building" points (two new rows X1a, X9a; the other two need no change); the builder is syncing main and getting a fresh Approve |
| #116 | runtime (cloud) | DV-bb-9, DV-bb-8, DV-d1-3, P-193 | approved on aef35efa; labels after #113 merges |
| #131 | forms (cloud) | a Continue covers retries of the run it started (P-194) | approved; waits for CI |
| #133, #139 | screens (cloud) | grey disabled button; N5 C1 "Before forms" | approved; wait for CI |
| #138 | forms (cloud) | X5 slice a: the form library from IRCC's forms list | the tech lead answered its two questions (whole index; remember deletions in slice c); reviewer checking |
| #141 | tech lead | lead skill habits; P-194 rescued; the old qa session's unmerged work rescued | this PR |

## Takeover (31 Oct)
A new Lead chat took over (the founder confirmed the previous one is closed). Checked every Mac copy for unsaved work: nothing uncommitted. Rescued into #141: P-194 (its PR #132 merged before the commit), and the qa session's five commits on `claude/qa-l10-e3c849` that never had a PR (QA-99 live retest and closure, the slice 1 channels journey check). Cloud builders cannot be messaged; their PRs are their reports.

## Founder decisions waiting
* None (31 Oct: P-195 answered N0).

## Close-out still to do
* After #111 and #113 merge: archive the four old Mac builder sessions (forms-fix8 local_c49f56b8, screens-card3 local_ba1559ab, runtime local_3b02c2d2, qa local_b27bf6a4) and remove their copies (about 12 GB). Then remove the frozen `lanes/` folder, and start a cloud qa session for `/qa after-merge` on main.
* The first nightly full run on the Mac is tonight at 21:00 UTC (workflow `nightly`). A red nightly run is fixed first.

## Watch
* **Auto-merge:** the first day had three faults, all fixed: the Mac queue, a lost trigger, and an approval going stale after a refresh. Watch that approved PRs merge without help.
* **Demo update:** 31 Oct: the Mac runner ended the demo when the update job finished ("Terminate orphan process"); the tech lead restarted it by hand, and the workflow now starts it with an empty `RUNNER_TRACKING_ID` so it survives. Also: it fails if the demo has rewritten tracked files (stub runs); then move it by hand (`git -C .claude/worktrees/demo-main checkout -- . && … checkout --detach origin/main`, then `start.sh`). An automatic reset step was refused by the permission system.
* **Week-one numbers, on demand:**
  * median time from start to merge (target under a day);
  * the tech lead's share of commits (target under 15%);
  * bugs found after merge (must not rise);
  * red checks that pass on a re-run;
  * AI spend (US$0 unless approved).
* **The Mac:** stays on (the founder keeps it on). It holds about 22 GB free; restart it every week or two to clear macOS temp files.

## Log (newest first; earlier lines are in git history)
- 2026-10-31 · tech lead (new chat): took over; rescued P-194 and the qa session's unmerged QA-99 retest; found CI refused by GitHub billing; decided #113's four points and #138's two questions.
- 2026-10-31 · tech lead: the switch-over is done.
  - Merged today: #112, #114, #115, #117–#119, #121–#127, #129, #130. PR checks moved to GitHub's machines, affected tests only (#124); full set nightly on the Mac (#123); auto-merge fixed (#125, #126).
  - Founder decisions: P-189 to P-193.
  - Disk: 6.6 → 22 GB free. Removed idle test databases, stale temp files, updater caches, Chrome's leftover copies and the Codex cache. Three browser tests that loaded Playwright from that cache now load the project's own copy.
