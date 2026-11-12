# Journey test, reviewer role, 12 Nov: GATEB-HELD (PR #1609, commit 077c7924d)

This is tooling with no screen. The "people" are the builder and qa, and what they read is the gate's output: the job log, the step summary and the `--plan` lines. I walked each journey through `gate-b.mjs --plan` and `check-gate-b.mjs` in a scratch worktree at 077c7924d. There was no browser, no app copy and no server, and I did not use :4400. US$0.

## Journeys
1. **Main path. The builder opens a runtime PR that names C11.12; C11.12 scores on the six.**
   * Steps: RANGE=HEAD~1..HEAD, GATE_B_DATA_OF=C11.12=six, `--plan`.
   * Expected: C11.12-runtime on the checkpoint, C11.12.test.ts on the six, and the reason given.
   * Result: held. The output says "on the checkpoint, as qa's checkpoint rows (REGRESSION-HELD.md, P-322): C11.12-runtime.test.ts". Exit 0, about 0.1 s.
2. **Alternate. A PR adds its own "checkpoint row" line to qa's hold file.**
   * Expected: nothing moves on that PR.
   * Result: held. With a base that lacks the row and a working tree that has it, C11.12-runtime stays on the six.
3. **Empty. A PR's named capability has no pack to run.**
   * Result: held. The hold file is not read, and the PR gets the usual NOT TESTED line.
4. **Error. The base cannot be read.**
   * Result: held. Exit 2, "Gate B could not run: cannot read … at the base …". Never a silent pass.
5. **Wrong place. The nightly, or a builder off CI with no RANGE.**
   * Result: held. Nothing moves, and both packs run on the data asked for.
6. **Plain hold or lifted line.**
   * Result: held. A plain pack hold, a lifted pack line and a capability-level "checkpoint row" line each move nothing.
   * Gap: a line saying "not a checkpoint row" does move its pack (review m5).
7. **Across the boundary: the merge-queue batch (QA-366) re-runs C11.12.**
   * Reading the code, the same rule applies, read at the batch's base. No self-test line covers it (review m3).
8. **Recovery and next step: qa later lifts or rewords the C11.12-runtime row in a notes-only PR.**
   * Result: **did not hold**. The notes PR merges without running check-gate-b. The next code PR's part 1 then fails with `FAIL P-486 pass: qa's own hold file names C11.12-runtime.test.ts a checkpoint row — []`.
   * The line does not say what to do, and the failure lands on a builder who changed nothing related (review M1).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: the pack runs on the checkpoint and the other pack stays on the six. |
| Next step obvious | ½ | Journey 8: the failure names the file but not the fix, and lands on the wrong person. |
| Plain words | 1 | The "on the checkpoint, as qa's checkpoint rows (REGRESSION-HELD.md, P-322)" line. |
| Feedback and state | ½ | "data: C11.12 on the six (GATE_B_DATA_OF)" is only partly true; the next line corrects it (review m6). |
| Correct data | 1 | Journey 2: read at the base. Journeys 4-6 hold. |
| Error recovery | ½ | Journey 4 fails closed (good). Journey 8 is a trap (M1). |
| Accessibility and screen sizes | n/a | CLI and log text only; no screen. |
| Speed | 1 | `--plan` takes about 0.1 s, and the hold file is read once per run. |
| Visual quality | n/a | No screen. |
| Trust and sources | 1 | Each move names qa's file and P-322, and the hold line names its run (41866440174). |

The total is 6.5 of the 8 criteria that apply, which scales to **8/10**. No criterion scored 0, so this is a **pass by the scoring rule**. The review's verdict is still Block, on M1 (journey 8).

**Fixes, most valuable first:**
1. Pin the self-test's hold-file reads to a fixed commit (M1). This raises next step and error recovery.
2. Reword the "data:" line (m6). This raises feedback.

## Could not test
* A real CI or merge-queue run with servers.
* An intended user's unaided walk.
