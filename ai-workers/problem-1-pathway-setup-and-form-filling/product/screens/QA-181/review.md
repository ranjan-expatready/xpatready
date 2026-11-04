# Review: QA-181, PR #727, commit 89ca0ba4 (branch claude/kind-hawking-fc8rds-qa181)

Reviewer: an independent session that did not build this. Change type: tooling only (lane.sh bind, web bundle freshness, CI line).

**Journey test: not applicable: no UI.** **Browser walk: not applicable: no UI.** Screen-review D1–D20 do not apply; the review covers correctness, safety and the ask's done-criteria.

## What I ran (worktree at 89ca0ba4)
- `bash product/tools/check-lane-bind.sh`: **exit 0**, 17 passed, 0 failed, 2.3 s, no network.
- `bash -n` on lane.sh, check-lane-bind.sh, run-suites.sh, cloud-setup.sh, web-fresh.sh: exit 0 each. `zsh -n` on isolated.sh and start.sh: exit 0 each.
- `web-fresh.sh stamp` on the real studio: exit 0, 0.035 s over 182 files.
- GitHub compare main...claude/qa-l10-e3c849: merge base bcd482d3 (30 Oct), 5 ahead, 2147 behind. The builder's claim holds: the branch is related, not merged, and "unrelated" was a shallow-clone artefact.
- My own throwaway-repository script (scratchpad `edge/t.sh`) covered: a fresh lane branch forked 5 days before its tip and never synced, in full, depth-1 and depth-8 clones; a detached HEAD with a local commit; `LANE_STALE_HOURS=abc`. Results are below.

## Done-criteria
- A merged or unrelated lane branch lands on origin/main: met (tests 1–2). The incident branch (related, unmerged, 4 days old) lands on origin/main only because of the new 24 h rule: met (tests 3 and 6).
- A stale web/dist is refused or rebuilt: met. `isolated.sh:31` runs `ensure` before the server starts, and `set -e` plus `exit 1` stop the start on failure (tests 8–17).
- A check covers both: met. It goes in CI part 1 next to the other tool checks: no network, about 2 s.

## Findings

### Major
**M1. The shallow deepen can shorten history, so a fresh, related lane branch can be called "unrelated" and dropped** (`product/tools/lane.sh:61-64`).
- `git fetch --shallow-since=<t-3d>` deepens or shortens a shallow clone (git docs: "Deepen or shorten the history"). It also cannot reach a fork point older than three days before the branch's last commit.
- Depth-8 clone of a lane branch forked 5 days before its last commit, which is from today:
  - before bind the clone had all 13 commits;
  - after bind it had 4 commits and was still shallow;
  - bind printed "claude/qa-long is unrelated to main (no common history)" and left the copy on origin/main.
- Depth-1 clone: same result. Full clone: continued, which is correct.
- So a lane's real, fresh, unmerged work is not continued, and the reason given is wrong. The shortened clone can also fail a later `git merge origin/main` with "unrelated histories", which is the QA-181 symptom itself.
- Fix:
  1. Decide staleness first from the tip time (`%ct`), which needs no history. A stale branch goes to main whatever its ancestry. This also skips the deepen in the incident's case.
  2. For a fresh branch in a shallow repository, deepen only with `--deepen=<n>` (relative, never shortens), in a loop or with `--unshallow` as a last step, before ever concluding "unrelated".
  3. Add the "old fork point, shallow clone" case to check-lane-bind.sh.

### Minor
- **m1** `lane.sh:118-121`, detached HEAD with commits not in main:
  - The message says "this branch qa/from-main-… has commits not in main, so it stays", but that branch is never created and HEAD stays detached (reproduced).
  - Work is not lost, but it has no name.
  - Fix: `git -C "$HERE" switch -c "$cb"` at HEAD in that branch of the `if`, or word the message as "detached HEAD".
- **m2** `lane.sh:65`, a non-numeric `LANE_STALE_HOURS` (for example `abc`) is evaluated as 0, so every lane branch becomes "older than abc h" (reproduced).
  - Fix: `h=${LANE_STALE_HOURS:-24}; case $h in ''|*[!0-9]*) h=24;; esac`.
- **m3** `prototype/studio/tools/web-fresh.sh:31`, stale-lock handling:
  - The stale lock is removed (after 10 min) only once, before the wait, and the wait gives up after 5 min.
  - So a lock left by a killed build always costs one 5-minute wait and a refused isolated start.
  - Fix: check the lock's age inside the loop and use a threshold no longer than the wait, or store the PID in the lock and test `kill -0`.
- **m4** `web-fresh.sh:26`, `>/dev/null 2>&1` hides vite's error:
  - Before this change, `start.sh` showed vite's stderr. Now a failed demo build prints only "web build failed".
  - Fix: write the output to `var/web-build.log` and `tail` it on failure.
- **m5** Needless rebuilds outside the sharded parts:
  - `.github/workflows/ci.yml:198` (the unsharded job), `nightly.yml:34` and `product/tools/scout.sh:98` still run a raw `vite build` with no stamp, so the first isolated start rebuilds once.
  - Fix: use `bash "$S/tools/web-fresh.sh" build` there.
  - The sharded parts do not rebuild: cloud-setup stamps, and nothing between it and the isolated starts writes under web/, contracts/ or engine/.
- **m6** `product/tools/check-lane-bind.sh`: the guarantee "never discard local work" has no test.
  - Missing cases: a session branch with commits not in main stays as it is; a detached HEAD.
  - Add both, together with M1's case.

### Checked, no finding
- **Fingerprint coverage.**
  - Imports from web/src that leave web/: only `contracts/` (99 imports) and `engine/` (3).
  - No `import.meta.env` or `import.meta.glob`.
  - Tailwind `@source "../"` stays inside web/.
  - `public/`, `index.html`, `vite.config.ts` and `tsconfig.json` are under web/.
  - `package-lock.json` stands in for dependency versions.
  - The stamp uses working content (tracked and untracked, ignored files excluded), so a commit does not change it and an edit, a new file or a deleted file does.
- **Stale stamp.**
  - `emptyOutDir: true` means any unstamped vite build removes the old stamp.
  - A vite build that fails before writing leaves the old dist and the old stamp, which no longer match the sources, so `ensure` rebuilds or refuses.
  - The stamp is computed before the build, so an edit made during a build can only cause an extra rebuild, never a stale serve.
- **Concurrency.** Lock plus re-check after the lock is correct: the second caller finds the bundle current.
  - Note: a rebuild empties web/dist under any other isolated server of the same copy. This happens only when the sources changed mid-run, and it was already true for run-suites.
- **Demo.** For `start.sh` and `cloud-setup.sh`, a failed build behaves as before: the demo keeps the old dist and the API starts. Only the wording changes (and see m4).
- **Mac compatibility (by reading; no Mac run).** Everything used works with bash 3.2 and BSD tools:
  - date, paste and find: `date +%s`, `paste -` with `<(...)`, `find -mmin`;
  - hashing and timing: `shasum -a 256` fallback, `sleep 0.5`;
  - git: `git log --date=format:`, `${@:2}`, `git init -b` (git 2.28 or later).
- **Cost of the deepen.** It is about 3 days of main (around 1,500 commits at the current rate) once per fresh clone. That is acceptable, but M1's reordering avoids it for stale branches.

## Question for the tech lead (d): the 24 h stale rule
The ask said "merged/unrelated". The incident branch turned out to be neither: it is related, not merged, and holds 5 qa commits. Without a stale rule, bind would rightly continue it, and the ask's "lands on origin/main" would not hold. So some rule is needed, and 24 h is a reasonable reading.

Its cost: a lane branch with an open PR waiting more than 24 h (for example over a weekend) is no longer resumed by bind. The work stays on origin, and bind prints the branch name, so nothing is lost. `LANE_STALE_HOURS` overrides the threshold.

The PR raises this itself; the tech lead should confirm the threshold. It does not block this review.

## Verdict
**Verdict: Block** (Request changes). Fix list:
1. M1: decide staleness first; deepen only with `--deepen`/`--unshallow`, never `--shallow-since`; add the old-fork shallow case to the check.
2. Recommended in the same PR (small): m1, m2, m6. Optional: m3, m4, m5.

## Round 2 (diff only: 89ca0ba4..8ae9e05e)
Ran in the main checkout at 8ae9e05e (branch claude/kind-hawking-fc8rds-qa181, clean):
- `bash product/tools/check-lane-bind.sh`: **exit 0**, 23 passed, 0 failed.
- My round-1 edge script against this lane.sh: **exit 0**.
  - The fresh branch with a fork point 5 days old is now continued in full, depth-1 and depth-8 clones.
  - The depth-8 clone keeps all 13 commits; at 89ca0ba4 it was cut to 4.
  - A detached HEAD with its own commit now gets the branch the message names (`qa/from-main-…`), with the work kept.
  - `LANE_STALE_HOURS=abc` falls back to 24 h, and the fresh branch is continued.

Round-1 findings: all closed.
- **M1 closed.** Staleness is decided first, from the tip's time, with no fetch. Deepening uses only `--deepen=250` (up to 4 times), which never shortens history.
- **m1, m2, m6 closed.** Each now has a test.
- **m3 closed.** The lock holds the owner's pid, and a dead owner's lock is taken over at once.
- **m4 closed.** Vite's output goes to var/web-build.log, and its last 20 lines are shown on failure.
- **m5 closed.** ci.yml (Mac path), nightly.yml and scout.sh now build through `web-fresh.sh build`.

New notes (not blocking, no change required):
- **n1** `lane.sh:65-68`: the 1,000-commit cap is about 2 days of main at the current rate (about 500 commits a day).
  - A fresh branch last synced with main more than about 2 days ago would still read "unrelated" in a shallow clone.
  - The message now says "in main's last 1000+ commits", so it is honest, and the branch is named.
  - If it ever happens, `git fetch --unshallow` as a last step would settle it.
- **n2** `web-fresh.sh` `lock()`: two waiters that both see the same dead owner can each run `rm -rf`. The second can then remove the first's new lock.
  - This needs a killed build plus two simultaneous waiters, and the cost is at most one duplicate build, never a stale serve, because the stamp is still checked.

**Verdict: Approve** (no open Blocker or Major) for commit 8ae9e05e.
