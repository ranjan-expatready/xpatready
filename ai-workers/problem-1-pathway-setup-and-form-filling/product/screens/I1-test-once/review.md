# Review I1 (test each change once; notes-only PRs; comment guard), PR #663, commit 48b8df2d

Reviewer: not the builder. Not applicable: no UI (no browser walk, no journey score; the journey test needs a screen).
Dimensions scored: correctness, safety of main, tests, honesty of evidence, standards.

**Verdict: Request changes** (one Major, one Major-by-the-same-cause, three Minor). Everything else in the brief holds.

## Findings, ranked

1. **Major, safety of main: a notes-only PR can change a file a suite reads, and no suite then runs, in the PR or the queue.**
   `change-kind.sh:21-22` treats every `*.md` as notes except prompts, `api/src`, fixtures and `official-sources/`.
   `product/STAND-INS.md` is read as data by `studio/tests/check_stand_ins.ts:11` (every "Stand-in" chip needs its row).
   I ran `change-kind.sh --files` on `product/STAND-INS.md`: it prints `notes`. A PR that deletes or renames a row passes
   `ci` in about a minute, merges directly, and the red shows only later (nightly, or in someone else's batch, which is then
   split). Fix: add `^$P/product/STAND-INS.md$` to `risky` (change-kind.sh:22) AND make select-suites.mjs choose
   `check_stand_ins.ts` (or ALL) for it (DOCS currently swallows it, select-suites.mjs:38). Add a case to
   check-select-suites.sh for both.
2. **Major, same cause: the graph check (P-86) is skipped for notes.** `graph.mjs --check` (ci.yml shard step) fails on
   "a capability citing a decision that does not exist"; it reads `DECISIONS.md`, `decisions/*.md` and `qa/CAPABILITIES.md`,
   all `.md`. A notes PR editing them never runs it, so main can go red on a check the next records or code PR trips over
   (a PR that did nothing wrong then fails `ci`). The brief says notes run only two checks, so this is a gap in the brief
   as much as the build: either (a) run `graph.mjs --check` in the notes path when those three paths changed (needs
   `npm ci`, TypeScript, about 1 min, still no suites), or (b) classify those paths as records. Decide and say which in the
   report. Do not leave it silent.
3. **Minor, brief not met by default: a product PR that chooses everything still runs everything.** Report itself says 83% of
   code PRs (70 of 84) still test twice until `PR_SUITES=direct` is set. The code is right and the report is honest; the
   outcome "full suite once" is only reached when the tech lead sets the variable (a conscious tradeoff, with the
   7% batch-failure risk stated). Fix: none to the code; the PR description should state "not yet in effect until
   `gh variable set PR_SUITES --body direct`" in its first lines so no one reads P-291 (3) as done.
4. **Minor, Mac fallback not "full once": ci.yml:204-209** BATCH_RUNNER=mac still runs `--changed`, not `--skip-quarantined`
   (the batch's selection, as before I1; the comment says the 90-minute limit is why). That is "behaves as before", which
   the brief asks for, but batches on the Mac then do not run every suite. Fix: one line in the report and the ci.yml
   header: "on the Mac fallback a batch runs the selection, not everything".
5. **Minor, evidence: the "after" table is one run each.** #663 (28.3 min, no gain) and #665 (62 s) are single samples, and
   the even split is described as helping "less than simulated" (slowest minus fastest part 5.0 vs 7.4 min). The report says
   this itself. "Keep 4 parts" is supported (6 parts saves about 7 min for 2 more machines a run at 13 sessions; the trial
   rule 6 parts, 12 batches, at or below 7% failures is sound). I did not find an overstatement.

## What I checked and found sound (with file:line)

* (a) other leaks into notes: prompts (`p2/prompts`, `p5/reader/prompts`), `api/src/**/*.md` (features guide, read by
  `check_features_registry.ts:50`), fixtures and `official-sources/` are all `risky` (change-kind.sh:22) and chosen as ALL
  by select-suites.mjs:37-38; `ci.yml` itself, `.nvmrc`, package files, `run-suites.sh`, `select-suites.mjs`, `cloud-setup.sh`,
  `lane.sh`, `change-kind.sh` choose ALL (select-suites.mjs:39,79-81), so they are `code`. Non-md files under `prototype/` go to
  select-suites (conservative: any uncovered code file is ALL). Other tools under `product/tools` and other workflows are
  `records` (fast checks run), and no suite calls them (only `run-suites`, `cloud-setup`, `lane`, studio's own `tools/isolated.sh`,
  which is under the studio's "tools/" shared rule). Other `.md` the suites name (plan.md, concept.md, DEMO.md) are not
  read as data by any suite I found (only STAND-INS.md is, finding 1).
* (b) `ci` runs `if: !cancelled()` and its first step needs `kind.result == success` and a non-empty kind (ci.yml, "the change's
  kind was found"); the parts step needs `shard.result == success` (skipped or failed or cancelled is red). `fail-fast: true`
  on the matrix. A cancelled run is superseded by the next push, not green. No path makes `ci` green with a failed `kind` or shard.
* (c) queue branch `mergify/*` sets `queue=true`: parts run `--skip-quarantined --shard i/N`; a PR runs `--changed RANGE`
  (`--direct` only if the variable says so). The range for a batch is base..head of the batch PR, so any code PR inside it
  makes the batch `code`. `--skip-quarantined` is applied in run-suites.sh (quarantine skip now keyed on `$SKIPQ`).
* (d) Mac fallbacks: same conditions as before (`vars.BATCH_RUNNER`/`PR_RUNNER`), the Mac steps keep their old steps, now behind
  `KIND != notes`; notes always runs on `ubuntu-latest`, which is a change but a harmless one (no suites, no secrets).
* (e) merge-guard.sh: regex now `merge|close|review`; still fail-closed (no cwd, no repo, not `lead` copy -> deny). The settings
  entry for `gh pr comment` is removed; merge, close and review entries remain.
* (f) numbers: window, run counts and medians are stated with their source (Actions history via the MCP, 60 sampled runs);
  raw data is not committed (stated). I could not re-derive them (no Actions access here).

## What I ran (exit codes)

* `bash .../tools/check-select-suites.sh` -> exit 0, 25 passed, 0 failed.
* `bash .../tools/check-merge-guard.sh` -> exit 0, 56 passed, 0 failed (comment allowed in a non-Lead copy; merge, close and
  review refused; no session folder fails closed).
* `change-kind.sh --files` on `product/STAND-INS.md` -> `notes`; on `product/DEMO.md` -> `notes` (the latter is harmless:
  no suite reads it as data).
* Read ci.yml in full, `.mergify.yml` (`check-success = ci` is the only gate; the job name `ci` is unchanged), the diff of
  run-suites.sh, select-suites.mjs, merge-guard.sh, settings.json, the report.

## Could not check

* GitHub Actions runs 41595378414 and 41595500608 (no GitHub access here): judged from the workflow file and the report.
* A real merge-queue batch under the new ci.yml (none exists before merge); first batches after merge are the real test.
* That the Mac runner still passes end to end with the new `KIND` guards (read only).
* The nightly full run on main, which is the net under findings 1 and 2.

## To fix before Approve

1. Finding 1 (STAND-INS.md out of notes, plus a test case). 2. Finding 2 (decide graph for decisions/CAPABILITIES notes).
3. Findings 3 and 4 as one-line wording in the PR and report. Then re-review the new commit.

Verdict: Request changes

## Round 2 (diff 48b8df2d..eaeea1b6, 3 files)

* Finding 1 fixed: select-suites.mjs now picks a suite for a changed `.md` that the suite names as a quoted string in its code
  (comments stripped) with the folder name also present; change-kind.sh decides notes after the selector. Ran
  `change-kind.sh --files`: STAND-INS.md -> code; DEMO.md -> notes; reports/x.md -> notes.
* Finding 2 fixed: DECISIONS.md, decisions/, qa/CAPABILITIES.md -> records (graph.mjs --check runs, no suites). Confirmed.
* Findings 3 and 4 accepted as stated (by design, raised to the tech lead).
* Ran: check-select-suites.sh exit 0, 30 passed 0 failed; check-merge-guard.sh exit 0.
* New finding: none. Residual (Minor, not blocking): a suite that builds an .md path from pieces without a quoted full file
  name would not be caught; the nightly full run is the net.

**Verdict: Approve** (commit eaeea1b6)
