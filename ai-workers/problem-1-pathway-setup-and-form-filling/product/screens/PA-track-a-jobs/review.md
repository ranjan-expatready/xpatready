# Review: PA Track A jobs (C4.7 PQR picks, C4.11 step 5; Visitor visa)

- **Commit:** 80a9df79 on `claude/nice-gates-gn2vfq`, reviewed against origin/main (`git diff origin/main...80a9df79`).
- **How it was reviewed:** a fresh context that did not build it, using the code, the isolated copy `forms_rv` on :4457 (stopped afterwards), a guarded `--stub` launch of each job, and a browser walk.
- **Spend:** none. No model call, no `*_LIVE=approved`, no `launch.ts --live`. Spend US$0.
- **Overall:** Ship. No Blocker and no Major; four Minors and one note.
- **Journey score:** 8.5/10, pass. Report: `journey-test-reviewer-2026-11-02.md`.

## What I ran
- `check_forms_pa_track_a_jobs.ts 4457 xr_studio_forms_rv`: **25/25 in 20 s.** After the run, `git status` was clean and the stub passes and `canary-digest.json` were byte-identical to before (md5).
- `prototype/tests/check_contracts.ts`: 23/23. `studio/tests/check_ai_drafting.ts`: 48/48.
- `tsc -p studio/api/tsconfig.json`: no errors in `rounds.ts`, `track-a-jobs.ts` or the new check. The 13 existing errors are in other tests.
- `graph.mjs --check`: G1 0, G2 0 (graph.json restored afterwards).
- `tools/track-a-jobs.ts` in plan mode printed worst US$2.66 and usual about US$0.43.

## The five points asked

**(1) A run recorded on the Mac is replayed by the app: yes, for both steps.**
- **Job id and Replay pattern.** The job ids are `studio-pqr-picks[-check]-temporary-residence-visitors-visitor-vis-477759eb` and `studio-qd-conditions[-check]-…`. The launcher names a run `${jobId}-live-<yyyymmddthhmmssmmmz>-<hex6>.json` (launch.ts runId). That name matches `replayPattern` for the draft round (`(?!check-)`) and for the checker round, and it matches `LIVE_RUN`.
- **What `isSameSavedRun` compares.**
  - `caller` is live and `status` is completed: for a non-field_map kind with a valid output, launch.ts sets completed.
  - `contract_valid` is now true. I confirmed that against origin/main's schema all four stub records fail at `/kind`.
  - `launch_evidence.template_sha256` equals the sha of the same prompt file the app reads (`PROMPTS/<template>`).
  - `official_files` equals `job.inputs`, which is the app's `[g.input]` from `PqrDrafts.guide`, with the same key order: `{file, sha256}` for guide-5256, `c6bc45…`.
  - The run's `combination` is `vv.single`, which equals the `contextKey` that both `pqr-drafts.ts draft` and `draft-qd.ts conditions()` pass.
- **Answer shape.** The output schemas only use type, enum, required and additionalProperties false, so a schema-valid answer always passes `pqrShapeOk` and `conditionsShapeOk`.
- **End to end.** In the browser walk, C4.7 Saved on Visitor visa replayed both readings in 124 ms at US$0.
- **C4.11 step 5.** The check proves Replay through the same `StepRunner.round(CONDITIONS_AI, …)` call with the same context. The full run stops before step 5 on Visitor visa after Reset to the six, so that step was not walked end to end in the browser.

**(2) The cost figures are correct.**
- **Worst cost.** I recomputed from `runner.ts:60` and policy prices (US$4 per million input tokens, US$20 per million output tokens). Each run's worst cost is 2 × ((request bytes + 2000) × 4 + output limit × 20) / 1e6:

  | Job | Worst cost |
  |---|---|
  | C4.7 draft | US$0.627 |
  | C4.7 checker | US$0.623 |
  | C4.11 step 5 draft | US$0.708 |
  | C4.11 step 5 checker | US$0.700 |
  | **Total** | **US$2.658** |

- **Request bytes.** The bytes the tool prices are exactly the `request_bytes` the real stub launch recorded (56387, 55826, 56535, 55458).
- **Budgets.** Each budget is US$1 (`sizedBudgetUsd` floor). Both attempts fit it, and the US$5 run cap.
- **Usual cost.** Rate measured on 30 Oct: 33958 tokens over 113017 bytes. Usual is about US$0.11 each. It is labelled as an estimate (see Minor 2).

**(3) The contract change is safe for other consumers.**
- The change only adds two values to the `kind` enum, so no record that was valid before becomes invalid.
- `who_can_be` was added the same way before.
- `reconvert.ts` skips every kind except `field_map` (line 23).
- The contract and ai-drafting checks pass.
- No other reader of `drafting-run.v0` was found: only launch.ts, reconvert.ts and the three tests use it.

**(4) Failing cases and cleanup.**
- J, K and R each have a failing case: another combination's job, a made-up kind, and a wrong-key run.
- S (stub pass) and W (worst fits budget) have none (Minor 4).
- The check cleans up after itself. The files it writes and its restores are in `finally`; I verified this as described above.

**(5) Money waste on the Mac: none found in this change.** Everything fails closed at US$0:
- A prompt, input or path-code change makes the stub pass stale, so `launch.ts` refuses before any spend.
- The guard refuses a changed inventory sha.
- The ledger reserves each attempt's worst case against the run, experiment and Wave 1 caps.
- The four committed stub passes are current now (`hasStubPass` ok for all four).

## Findings

1. **Minor (Should, before the first result PR)** at `studio/tests/check_forms_pa_track_a_jobs.ts:89, 111, 118`.
   - **Problem:** the R steps assume no real run of these jobs exists. They simulate runs stamped `20261102t120000000z`, and R fail C4.7 expects "No saved AI answer". Once the Mac commits real runs, both break:
     - R fail will find the real runs, so the note changes.
     - Any real run stamped after 2 Nov 12:00 is newer than the simulated ones, so R pass gets the real files. Replay takes the newest (`newestFirst`).
   - **Seen:** a run named `…-live-20261103t090000000z-bk0001.json` appeared in the shared checkout during my session (not mine).
   - **Fix:** stamp the simulated runs with a far-future time. In R fail, assert that `run_files` does not contain the wrong-key files, instead of matching "none saved".
2. **Minor** at `studio/tools/track-a-jobs.ts:7` and `:70`. The comment says usual is "one attempt at … the output measured", but the code doubles the measured output (`MEASURED.outputTokens * 2`). Fix: say it is a ×2 margin, or drop the factor.
3. **Minor** at `studio/tools/track-a-jobs.ts:111` and `:104`.
   - **Wrong cap wording (line 111):** the cap line says the experiment cap is "counted since 2026-10-26". The ledger counts the experiment cap over all time (`ledger.ts:206`, `committed()`); only the Wave 1 cap starts on that date. Fix: say so.
   - **Job lookup by prefix (line 104):** plan mode finds each job file by prefix only, so another `studio-pqr-picks-*` or `studio-qd-conditions-*` file in `p2/jobs` could be priced instead. Fix: look up the derived ids, the `477759eb` ones.
4. **Minor** at `check_forms_pa_track_a_jobs.ts:73` and `:128`.
   - **S has no failing case.** Its `existsSync(stub-pass/…)` part is always true, because the committed file already exists. Fix: compare the file's `run_id` with this run, and add one refused stub, for example a job whose `known` trail breaks `knownOk`.
   - **W has no failing case.** Fix: show that `costsOf` reports `fits_budget: false` for a copy of a job with `budget_usd` 0.5.
5. **Note (not a finding; P-26).** `BACKLOG.md` row PA lists every remaining job file (C3.4, C9.1, R-146 …). This PR covers C4.7 and C4.11 step 5 only, and the reason ("the runs that have a consumer in the app today") is only in a code comment (`track-a-jobs.ts:31`). Say it in the PR body so the row is not read as done.

## D1–D20 (out of 5; N/A: no screen changed)

| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Both steps are ready to run with stated costs. Covers a part of PA (note 5) |
| D2 Data integrity | 5 | Jobs are byte-identical to `roundJob` output. The contract change is additive. A wrong-key run is never replayed |
| D3 Reuse and normalisation | 5 | `roundJob` is extracted and `round` uses it (same `job_id` and template). The tool prices with the launcher's own `buildRequest` and the ledger's formula |
| D4 Rule integrity | N/A | |
| D5 Stability and recovery | 4 | `--write` is idempotent and the check cleans up. The R steps will break once real runs land (Minor 1) |
| D6 Freshness and governance | 4 | The stub-pass gate is tied to path code and screening sources. A result is Saved only after the lead and qa check it (P-227), later |
| D7 AI trust | 5 | Only contract-valid live runs with the same prompt, inputs and key are replayed. Picks are marked Sample |
| D8–D12 | N/A | |
| D13 Accessibility and responsive | N/A | Spot-check: axe 0 violations; 1024 px with no sideways scroll |
| D14 Looks like the team's product | N/A | |
| D15 Speed | 5 | Replay 124 ms; check 20 s |
| D16 Testability | 4 | 25/25 re-run by the reviewer. Failing cases for J, K and R but not for S and W (Minor 4) |
| D17 First-use intuitiveness | — | Simulated only |
| D18 Information provenance | 5 | Run files are named in the result, with `launch_evidence` |
| D19 End-to-end capability closure | N/A | Waits on the Mac run |
| D20 User pain solved | — | Simulated only |

## Could not check
- A real paid run (forbidden).
- Whether the model's `asks` words will match Visitor visa's question labels once its field maps are accepted. Right after Reset to the six it has 0 questions, so every pick is left out with a reason.
- The C4.11 step 5 browser path. Whether the Mac ledger has room under the Wave 1 cap.

**Score: 8.5/10 (journey test).**

**Verdict: Approve.** No open Blocker or Major. Minors 1–4 are recommended, and Minor 1 should be fixed before the first result PR.
