Verdict: Block

# GATEB-HELD review: Gate B runs qa's checkpoint-row packs on the checkpoint (P-486, the tech lead's ruling on #1591; PR #1609)

Commit reviewed: **077c7924d** on `claude/forms-gateb-held` (`git diff origin/main...077c7924d`, merge base 348fa8b11). 3 files under `prototype/studio/tools/`: `gate-b.mjs`, `works-set.mjs`, `check-gate-b.mjs`. This is CI tooling, not a screen, so D1-D20 and the BIC scorecard do not apply. I reviewed it as the code that decides which data each acceptance pack runs on. US$0, no model calls, no app copies or servers, port 4400 not used. The journey score is in `journey-test-reviewer-2026-11-12.md`: **8/10**.

## What I ran (all in scratch worktrees at 077c7924d and at 348fa8b11)
* `node tools/check-gate-b.mjs`: **218 passed, 0 failed**, the same as the builder. All 7 P-486 lines PASS.
* `node tools/check-works-set.mjs`: **78/79**. The one FAIL ("a base with no acceptance pack … is could not run (exit 2) … break N1", which got `{"code":0,…}`) **is the same on origin/main 348fa8b11**, so this PR did not cause it. This clone is shallow (`--is-shallow-repository` true), which may be why. I did not dig further.
* `gate-b.mjs --plan --title "runtime: C11.12"` with `GATE_B_DATA_OF=C11.12=six` and `GATE_B_NO_DIFF=1`:
  * `RANGE=HEAD~1..HEAD`: `C11.12-runtime.test.ts on the checkpoint · load checkpoint`, with the line "on the checkpoint, as qa's checkpoint rows (REGRESSION-HELD.md, P-322)". `C11.12.test.ts` stays on the six. Exit 0, about 0.1 s.
  * A base whose hold file lacks the row (a dangling commit-tree object, no ref moved) while the working tree still has it: **C11.12-runtime stays on the six**. So the file is read at the base, and a pull request cannot move its own pack.
  * An unknown base sha: exit 2, "Gate B could not run: cannot read qa/BUGS.md at the base …". It fails closed; BUGS.md is read before the hold file.
  * No RANGE (off CI, as the nightly runs): both packs run on the six, so nothing moves. That matches "on a pull request".
* Parser probes on `checkpointPacks`:
  * A pack line with "checkpoint row … lifted … red until run …": moves nothing.
  * A capability line "- C11.12 checkpoint row red, run …": moves nothing (only pack lines move).
  * "- C7.5-runs.test.ts red on main, run …, **not a checkpoint row**": **moves C7.5-runs** (see m5).
* Mutation test: 10 faults applied one at a time. A FAIL line catches only 3 of them:
  * **Caught:** dropping the "checkpoint row" filter (M1), `--plan` back to `dataFor` (M6), and never reading the hold file (M10).
  * **Not caught (218/218 still):**
    * the hold file read from the working tree instead of the base (M2);
    * `runPack` or `runPackRecorded` back to `dataFor` (M3, M9);
    * `notTested` back to `dataFor` (M4);
    * the `lifted` rule removed from `held()` (M5);
    * the hold file read on every run, nightly included (M7);
    * the merge-queue branch dropped (M8).

## Correctness (the questions asked)
* **Is the data per pack everywhere it matters?** Yes. `runPack` (gate-b.mjs:442), `runPackRecorded` (:613), `notTested` (:389, with the callback in main :725) and `--plan` (:737) all use `dataForPack`. Each pack starts its own isolated copy and does its own Demo load (:446-455), so per-pack data really is per pack.
* Two places stay per capability:
  * the "data:" summary line (:726), which is followed by the "moved" line (:727-728);
  * the by-diff group weight (:706). See m6.
* **Timing.** The hold file is read once (:722), after `runs` is known and before notTested, the plan and any pack. It is read only when a pack is to run and only on a PR range or a batch. Off CI and in the nightly nothing moves. A hold file missing at the base reads as "" (`atBase(HELD, true)`), so nothing moves and the pack fails toward the stricter data. An unreadable base is exit 2. With no runs, the file is not read.
* **Merge queue (QA-366).** This is in scope, not scope creep. A batch re-runs a named row's packs through the same `main()` with no `GATE_B_SKIP_PACKS` (ci.yml:289-297). Without the `opt.queue` branch, #1591's red would come back in the queue whenever QA-366 re-runs C11.12. It reads the batch's base, as `baseScoring` does. Its only gap is a missing test (m3).
* **Parser strictness.** `checkpointPacks` (works-set.mjs:162) keeps only `held()`'s pack holds whose reason matches `\bcheckpoint row\b`. Such a line must also be a valid hold: it says "red", names a run or a QA bug, and is not "lifted". So a plain hold, a lifted line and a capability line each move nothing. A checkpoint row also stays held out of the protected set, which matches the hold file's own text. One gap: a negated mention still matches (m5).

## Blockers
None.

## Majors
**M1. The self-test asserts on qa's live records, on a path where qa's own change never runs it. When qa lifts or rewords the C11.12-runtime row, every later code PR's part 1 goes red.**
* Two P-486 lines read today's file:
  * check-gate-b.mjs:208-209 reads the working tree's `REGRESSION-HELD.md`;
  * :211-216 read it at `HEAD~1`, which is main in CI.
* The hold file's own rule is "Remove the line when the pack is green again". qa may also move the row to `REGRESSION-DATA.md`. Either change is a `.md`-only change, kind **notes** (ci.yml:4). Notes PRs do not run the shard job that runs `check-gate-b.mjs` (ci.yml:211-213, 284). So qa's change merges green.
* After that, every code PR fails check-gate-b. A scratch removal of the line gives `FAIL P-486 pass: qa's own hold file names … — []`. Once that is on main, `HEAD~1` lacks it as well, so the plan line also fails.
* Fix, keeping the ruling's test (C11.12-runtime, with C11.12=six, on the checkpoint): pin both reads to a fixed commit that has the row, for example 348fa8b11. Read `git show <pin>:…/REGRESSION-HELD.md` for :208, and use `RANGE=<pin>..HEAD` for the plan. CI checks out with `fetch-depth: 0`. The pin also allows the base test in m1.

## Minors
* **m1. Nothing tests the base read** (mutation M2 survives). The behaviour is correct (see above), but it is the guard that stops a PR from moving its own pack. Add a pass line and a fail line:
  * a base without the row while the working tree has it → the pack runs on the six;
  * the pinned base from M1 → the pack runs on the checkpoint.
  * Fix: a commit-tree object built from HEAD's tree minus the row, as in my probe, makes the fail side without touching a ref.
* **m2. The "a lifted line moves nothing" assertion proves nothing.** The fixture's lifted line (check-gate-b.mjs:201, `- C3.2 checkpoint row lifted …`) is a capability line with no "red", so three separate rules each reject it. Removing `lifted` from `held()` (M5) leaves 218/218. Fix: make it a pack line, for example `- C11.12-runtime.test.ts checkpoint row lifted 5 Nov, red until run 41866440174`.
* **m3. No line covers the queue branch or the PR-only scoping** (M7 and M8 survive). Fix: add one `--plan` line with `QUEUE=true` in the existing QA-366 batch fixture (check-gate-b.mjs's #1396/#1435 case), and one line with no RANGE in which nothing moves.
* **m4. Not exercised:** `notTested`'s per-pack callback in main (:725) and `runPack`/`runPackRecorded` (M3, M4, M9 survive). `runPack` needs servers, so the `--plan` line is a fair stand-in. `notTested` is pure, though: one call with `(id, f) => dataForPack(id, f, e, cp)` on a pack whose run line differs between the six and the checkpoint would cover it.
* **m5. A negated mention matches.** "…, not a checkpoint row" moves the pack (probe above). Fix: refuse the line when `checkpoint row` is preceded by "not" or "no longer", as `dataRows` already does with its history words (works-set.mjs:177).
* **m6. Wording and weight.** The "data: C11.12 on the six (GATE_B_DATA_OF)" line (:726) is now only partly true, and the next line corrects it. Saying "(its packs, except qa's checkpoint rows below)" would read straight. In `--diff-groups`, a directly changed checkpoint-row pack is weighted as a six pack (:706: 1, not 2). That only affects balancing, not safety.

## What I could not check
* A real CI run of a C11.12 PR or a merge-queue batch on the checkpoint. That needs servers and GitHub.
* That C11.12-runtime is green on the checkpoint on today's main. I relied on the hold file's run 41866440174.
* Why `check-works-set.mjs` N1 fails on main in this shallow clone.

**Verdict: Block.** To fix: M1. The Minors are recommended, m1 and m2 first. The fixture that fixes M1 also gives m1's fail side.
