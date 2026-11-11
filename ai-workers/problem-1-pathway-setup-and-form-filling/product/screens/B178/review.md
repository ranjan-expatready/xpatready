# B178 review: gate B reads select-suites' reach list from a file (runtime lane, PR #1567)

Reviewer: a fresh session that did not build this row, 11 Nov 2026. Commit reviewed: **884d7233990422b3216a2aa8d10f1d708ba76fe8**
(branch `claude/runtime-b178-gateb`, one commit on main 7ad01b342; diff: `studio/tools/gate-b.mjs` +20/-7, `studio/tools/check-gate-b.mjs` +18/-1).
Pipeline fix, no screen and no concept: the screen-review skill applies only where it fits, and the Lead's row text is the bar.
Live AI off, US$0. No server, no browser, no ports used (not :4400). `graph.mjs` not run: it rewrites `qa/GRAPH.md`, and this row adds no element or route.

## What I ran (node 22.14.0, scratch files under $TMPDIR only, all removed)
1. `node studio/tools/check-gate-b.mjs` on the branch: **exit 0, 211 passed, 0 failed**, including the new B178 case and "QA-366 (Major 2)".
2. **The real reach list.** I ran check-gate-b again with `GATE_B_SELECT_SUITES` pointed at a logging wrapper around the real
   select-suites (exit 0, 211/0). The QA-366 Major 2 batch (b56cdbe39..0e0ccbb64, #1396's own list) feeds **630 files**. It gets back
   **447 lines, 73,541 bytes**, and `acceptance/C7.5.test.ts` is **line 421**. The first `040-field-map-review.ts (configured checkpoint,
   changed)` chain line ends at **byte 6,910**, and the C7.5 line ends at **byte 68,987**. So any cut between those two bytes yields exactly
   the CI reason: C7.5 missing from the reach, and (4a) naming `040-field-map-review.ts`.
3. **The mechanism, on this machine.** I piped `node -e "process.stdout.write('x'.repeat(1e6)); process.exit(0)"` into a reader that
   waits 1 s: it received **65,536** bytes. The same write with no `process.exit` delivered 1,000,000, and so did the same write to a
   file. 65,536 sits between 6,910 and 68,987. Node's own `net.js` (read with `process.binding('natives')`) makes stdout pipes blocking
   only when `isWindows`, so on Linux runners pipe writes are asynchronous as well. select-suites `--packs` writes with `console.log`
   per line and then calls `process.exit(0)` (`product/tools/select-suites.mjs:476-477`).
4. **Old code compared with new, same harness.** I built a mirror outside the repo. It held main's `gate-b.mjs` with only `export` and
   the `GATE_B_SELECT_SUITES` hook added (`diff` shows exactly those 2 lines), plus the branch's copy. I called `packsReachedBy` in a loop:

   | stand-in selector | main's code: C7.5 by its own pack | branch: C7.5 by its own pack |
   |---|---|---|
   | the PR's 4 MB stub (the new test) | **0/10** | **10/10** |
   | replay of the real 447 lines (console.log per line, then exit), idle | 20/20 | 20/20 |
   | same replay, 2 CPU spinners | **59/60** | 60/60 |
   | same replay, 16 CPU spinners on 8 cores | **26/150** | **150/150** |
   | the real select-suites with the real 630-file input, 16 spinners | 15/15 | 15/15 |

   The new test fails on main and passes on the branch, every time. At real size and with the real write pattern, a loaded machine
   reproduces the loss on main's code and never on the branch. The end-to-end real selector did not lose lines in 15 runs here (it is
   slow, about 12 s a run, so the sample is small). The CI runner did lose them twice.
5. **Other explanations, checked.**
   - The shard job checks out with `fetch-depth: 0` and **no** `blob:none` (`.github/workflows/ci.yml:233`), so a partial clone never
     touches check-gate-b.
   - The reach set does not depend on the order files are visited. An edge is skipped only for reasons that belong to the edge or the
     file itself (`via.has`, `stop`, `appCode`/`how`, a folder edge to a runner), never for a reason that depends on the chain. So the
     `readdirSync` order and the order of the `git ls-files` lines cannot drop C7.5.
   - Untracked files (`git ls-files -c -o`, select-suites.mjs:287) can only add edges, never remove a reached file. A list that could
     not be read exits 2, which is a different error.
   - None of these explains "C7.5 present only through (4a)". A cut tail explains it exactly.
6. No `gate-b-packs-*` or `gate-b-b178-*` folders were left in $TMPDIR after all runs. `git status` was clean before this file was written.

I could not read the two failing job logs: `gh` hit a TLS certificate error through the sandbox proxy. The CI output figures are the
PR's. Points 2 to 4 confirm them independently.

## Row "Done when"
- **Cause found and named with evidence: met.** select-suites ends `--packs` with `process.exit(0)` while asynchronous pipe writes
  are still queued. The tail is lost on a busy runner. The byte layout matches the observed reason exactly.
- **Made deterministic in gate-b.mjs: met.** The child's stdout is a file descriptor (`gate-b.mjs:526-535`), and a file is written
  synchronously.
- **A test fails before the fix: met.** 0/10 on main's code, 10/10 on the branch.
- **The assertion stays strict, which is right.** The (4a) reason is not a second legitimate outcome. It is what is left after data loss.

## The fix itself (`packsReachedBy`)
- **stdio** is `["pipe", fd, "pipe"]`. `input` and `encoding` still work. stderr stays a pipe and is short.
- **Error handling.** `r.status !== 0` also catches a spawn error or a signal (status `null`). The message falls back
  stderr → file → `r.error.message`. Failing still means exit 2, never a silent pass.
- **Clean-up.** `closeSync` runs in an inner `finally`, and `rmSync` of the temp folder runs in an outer `finally`, even when `openSync`
  or the read throws. Each call gets its own `mkdtempSync` folder, so parallel runs cannot collide. The 64 MB `maxBuffer` cap on
  stdout is gone, which is harmless.
- **The `GATE_B_SELECT_SUITES` hook** is documented in the header beside the existing `GATE_B_BATCH_PRS` hook, in the same pattern.
- **The other spawn sites in gate-b.mjs.** `git diff`, `git log`, `git merge-base` and `git show` are git, and git blocks on a full pipe
  rather than dropping output. `change-kind.sh` prints one short word.

## Findings
**Blocker:** none. **Major:** none.

**Minor 1 (follow-up, outside this row): the cause is still inside select-suites, so other readers of `--packs` keep the risk.**
`product/tools/check-select-suites.sh:128` (`psel`, which pipes `--packs` into `cut`) runs in the same shard-1 step, just before
check-gate-b. Its inputs are single files, so the lists are shorter and the risk is low, but the mechanism is the same.
Fix in a later row: end `--packs` (`select-suites.mjs:477`, and `:508` in the same way) by setting `process.exitCode` and letting the
process finish, instead of calling `process.exit(0)`. That protects every caller. The row allowed the fix in gate-b or the test, so
this is not a gap against the row.

**Minor 2 (watch item, no evidence it happens): the pack runner `sh()` (`gate-b.mjs:410`) also reads Node children through pipes.**
If a pack printed more than 64 KB and ended with `process.exit` while the gate was slow to read, its last lines could be lost. Most such
cases end closed, as "no summary line" or "a named step not printed". Nothing to fix now. Note it if a pack ever reports a missing tail.

## Journey test (reviewer role)
The browser journey was skipped as instructed: this row has no screen and nothing a person sees in the app. The one journey is that of a
merge-queue reader of gate B's reason, walked above through check-gate-b and the reproductions. **Score: 8/8 on the applicable criteria
(10/10 scaled).** Accessibility, screen sizes and visual quality are not applicable.
- **Task completed:** C7.5 is named by its own pack, 150/150.
- **Next step obvious:** the reason says `C7.5 (#1396 C7.5.test.ts …`.
- **Plain words:** the comments and the test name say why.
- **Feedback and state:** the exit codes keep their meanings.
- **Correct data:** the whole list arrives, 4 MB tested.
- **Error recovery:** a selector failure is still exit 2, with its message.
- **Speed:** one temp file per call, no measurable cost; the suite ran in about 22 s.
- **Trust and origin:** the chain is printed in the reason.

**Verdict: Approve**. There is no open Blocker or Major. The two Minors are follow-ups for later rows and are not needed for this commit.
