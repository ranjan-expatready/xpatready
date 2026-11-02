# Break report: PA Track A jobs (C4.7 PQR picks, C4.11 step 5; Visitor visa), commit 80a9df79

- **Breaker:** a separate session that did not build this. It made no model call, never ran `--live`, set no `*_LIVE` variable and spent US$0. It ran its own copies on :4458 and :4459 (`forms_bk`, `forms_bk2`), each after Reset to the six. Stub launches used scratch ledgers (`P2_LEDGER_DIR`).
- **Claim tested:** running `launch.ts --job <id> --stub` and then `--live` on the Mac spends at most US$2.66. The saved runs are exactly what the app replays for vv.single, and never for another combination.
- **Note:** the working tree is shared with the builder. While I tested, HEAD moved to 03494424 ("review Minors 1-4"). Every repro below ran the 80a9df79 check, which stamps its fake runs 20261102t120000000z. Where 03494424 changes a finding, the finding says so.
- **Result:** no Blocker, 3 Major, 7 Minor. The cost bound holds for one launch of each job. The replay guard holds for combination, guide and prompt.

## Major

**M1. The check goes red as soon as the real runs it prepares are committed.**
- **Where:** `studio/tests/check_forms_pa_track_a_jobs.ts:89, 111, 118`.
- **Cause:** the fake "live" runs are stamped 2026-11-02 12:00 UTC. Line 111 expects no saved vv.single answer at all ("No saved AI answer"). Line 118 expects the fakes to be the newest.
- **Repro:** put two launcher-shaped vv.single live runs stamped `20261103t090000000z` into `p2/runs`, standing in for the Mac's results. Run the check on :4458. Result: 23/25. "R fail: C4.7 Replay never uses…" FAILS ("0 picks for To review, 2 left out"). "R pass: C4.7 … exactly the recorded runs" FAILS (it replays the 20261103 run). `engine/rounds.ts newestFirst` sorts any run made after 12:00 on 2 Nov ahead of the fake.
- **Also:** a second copy of this check running at the same time in the same tree breaks it the same way.
- **In 03494424:** the stamp moved to 2999 and R fail was relaxed. That fixes this, but makes M2 worse.

**M2. A check that is killed part-way leaves fake Visitor visa answers that every copy replays as real AI answers.**
- **Where:** cleanup exists only in `.finally` (line 129). There is no signal handler. Fake runs match `*-live-*.json`, which is not gitignored.
- **Repro:**
  1. Run the check on :4458. Once the four vv.single fake runs exist, `kill -9` the check process.
  2. Left behind: 4 untracked `…-live-20261102t120000000z-pa*.json` files, all "contract-valid live completed". Also left modified: 4 tracked `p2/runs/stub-pass/*477759eb.json` files and `p2/screening/canary-digest.json`.
  3. Then `POST /api/combinations/<vv>/pqr-picks/plan` and `/draft` with `{"mode":"replay"}`. The draft answers `from: "replay"`, US$0, `run_files` = the two fake files, and builds proposals from the made-up "passport" pick.
- **How it happens in practice:** `run-suites.sh` kills a suite at 1200 s, or someone presses Ctrl-C. `git add -A` would then commit the fakes.
- **Even without a kill:** during every normal run there is a 5-10 s window when every app copy reading this `p2/runs` (in the cloud, all lanes share one tree) serves the fake answer for Visitor visa.
- **With 03494424's 2999 stamp:** a leftover fake would outrank the Mac's real runs indefinitely.
- **Cleaned up:** I removed the four files and ran `git checkout` on the five tracked files.

**M3. Replay does not check that a saved run is the one the launcher recorded, and the new contract kinds do not require the output hash.**
- **Where:** `engine/rounds.ts:35-37` (`isSameSavedRun`) and `contracts/drafting-run.v0.schema.json:43` (the `allOf` that requires `output_sha256`).
- **Repro:** an in-process probe built a vv.single record from a launcher stub record, then changed one thing at a time. These were all still replayed:
  - `raw_output` edited, so that sha256(raw_output) no longer equals `drafting_run.output_sha256`;
  - a stub-path record with only `caller` flipped to `"live"` (`stub_calls: 1`, 0 tokens);
  - `kind: "qd_conditions"` under a pqr file name.
- **Contract:** a completed `pqr_picks` run with no `output_sha256` is valid, while the same run as `sections` is refused. The contract describes `output_sha256` as "a later step reuses it only if it matches (AIW-D263)".
- **Why this is Major for this change:** the check's R pass proves replay with exactly such a forged record (stub record, caller flipped, answer replaced, hash left stale). So it cannot tell a real Mac run from a hand-edited one. The weakness itself is in the engine and predates this change; this change relies on it.

## Minor

**m1. Nothing stops the same job being launched again one after another.**
- Two `launch.ts --job studio-qd-conditions-…477759eb --stub` started in the same millisecond both exited 0, giving two run records and 4 ledger lines.
- For `--live`, a launch that overlaps a running one is refused, because the ledger lock is held across the call (`p2/ledger.ts:360`; I checked this in the code only).
- A second launch after the first finishes is admitted, and so is a re-run after `invalid_output`. Each is a new run id with its own US$1 cap, as the contract says ("store lookup … planned"). So the US$2.66 is per single launch of each job, not a ceiling on the work.

**m2. Replay ignores schema, settings and model.** In the M3 probe, changing `schema_sha256`, `model` or `max_output_tokens` still replays. A run saved before an output-schema change keeps being used as long as `shapeOk` passes.

**m3. The contract allows a `pqr_picks` run to carry `entries: []`, which are field-map entries** (probe: valid).

**m4. Run by hand from its usage line, the check writes to the real shared ledger.**
- `launch.ts` runs without `P2_LEDGER_DIR` (check line 68), so 4 reserve and 4 settle lines (US$0) plus used-ticket markers go to `.tools/p2-ledger`. Scratch repro: 8 lines.
- `run-suites.sh:58` sets the variable, so CI and suite runs do not.
- At its end, the check also writes back the stub-pass and canary bytes it saved at the start. That can overwrite a parallel launch's writes.

**m5. The stub gate is already satisfied by the committed files.**
- `hasStubPass` is `ok: true` today for all four committed stub passes. So on the Mac, `--live` passes the gate without running `--stub` there.
- The check never verifies that the committed stub passes are current: it re-stubs, then restores the committed bytes.
- `p2/pathcode.ts:20` leaves inputs out of the gate. A job whose guide is edited after its stub pass keeps the gate open. Replay then refuses that run because the inputs differ, so the paid run can never be used.

**m6. The C4.11 step 5 replay is proved with a context built from the job itself** (check line 101: trail, key and inputs taken from `qd`), not through `/draft-qd`. It holds only because `draft-qd.ts:104` uses the same `pqr.guide()`.

**m7. The stub kind lists do not name the new kinds.** `tests/check_forms_schema_lint.ts:114` and `tests/qa/check_qa_ai_paths.ts:62` leave out `pqr_picks` and `qd_conditions`, so deleting either stub file is caught only by this check's S step.

## What held

- **Worst case equals the runner's reservation:** same `buildRequest` and `inputTokenBound` (`p2/runner.ts:60`), times 2 attempts. Plan mode on :4458: draft and checker for C4.7 US$0.63 / 0.62, for C4.11 US$0.71 / 0.70; total US$2.66. Each fits its US$1 budget, so attempt 2 fits under the per-run cap (`runner.ts:65`).
- **The replay guard on the three facts that matter:** another combination's key, a trail used as a key, a different guide sha, a different prompt sha, or `contract_valid: false` is never replayed (probe and check R fail).
- **Stale guide:** a job with a wrong guide sha (temporary `bk-stale-guide`) is refused before any prompt: "hash of …guide-5256… differs". Nothing was written.
- **Unknown kind:** the contract refuses `made_up_step`. Each `shapeOk` accepts no more than its output schema. Both schemas pass the schema lint.
- **The check itself:** 25/25 on a clean run (21 s). Two checks run at once on :4458 and :4459 each passed 25/25 and left the tree clean. The job files are byte for byte what `roundJob` makes.

## Clean-up

- Both copies are stopped.
- Removed: my temporary job, my stub runs, the fake live runs and the planted 20261103 runs.
- Restored the five tracked files the killed run left modified.
- At hand-off, `git status` showed only this file. Files that appeared during testing and were not mine (another session's planted live run at 10:32, the builder's edits) were left untouched.
