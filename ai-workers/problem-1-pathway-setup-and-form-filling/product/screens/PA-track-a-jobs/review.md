# Review: PA Track A jobs (C4.7 PQR picks, C4.11 step 5; Visitor visa)

- **First review:** commit 80a9df79 on `claude/nice-gates-gn2vfq`, against origin/main. **Re-review:** 4b3ff7d6 (section at the end).
- **How:** fresh contexts that did not build it. Code, the isolated copy `forms_rv` on :4457 (stopped after each), guarded `--stub` launches only, a browser walk on the first pass.
- **Spend:** none. No model call, no `*_LIVE=approved`, no `launch.ts --live`. US$0.

## First review, 80a9df79 (summary; full text in git history)
- **Ran:** `check_forms_pa_track_a_jobs.ts` 25/25 in 20 s, tree clean and stub passes and `canary-digest.json` byte-identical after; `check_contracts.ts` 23/23; `check_ai_drafting.ts` 48/48; `tsc` clean in the touched files (13 old errors elsewhere); `graph.mjs --check` G1 0, G2 0.
- **(1) A Mac run is replayed: yes, both steps.** The launcher's run name (`${jobId}-live-<time>-<hex6>.json`) matches `replayPattern` and `LIVE_RUN`. `isSameSavedRun` holds: caller live, completed, `contract_valid` (all four stub records fail `/kind` against main's schema), the same template sha, `official_files` = `job.inputs` (guide-5256, `c6bc45…`), combination `vv.single` = the `contextKey` of `pqr-drafts.ts draft` and `draft-qd.ts conditions()`. C4.7 Replay walked in the browser: 124 ms, US$0. C4.11 step 5 proved through the same `StepRunner.round` call (not walked: the run stops before step 5 after Reset to the six).
- **(2) Costs correct.** Worst = 2 × ((request bytes + 2000) × 4 + output limit × 20) / 1e6 (`runner.ts:60`): US$0.627, 0.623, 0.708, 0.700, total **US$2.658**; request bytes equal the stub launches' `request_bytes`. Each fits its US$1 budget and the US$5 run cap. Usual ~US$0.11 each, labelled an estimate.
- **(3) Contract change safe:** additive enum values; `reconvert.ts` skips non-`field_map` kinds; no other reader of `drafting-run.v0`.
- **(4) Fail cases:** J, K, R had one; S and W did not (Minor 4). Cleanup in `finally`.
- **(5) Money waste on the Mac: none found.** Prompt, input or path-code changes make the stub pass stale; the guard refuses a changed inventory sha; the ledger reserves each attempt's worst case against the run, experiment and Wave 1 caps.
- **Minors then:** 1 the R steps break once real runs land; 2 "usual" doubles output without saying so; 3 cap wording ("experiment … since 26 Oct") and plan mode finding job files by prefix; 4 S and W had no fail case. Note 5: the PR covers 2 of PA's job sets.
- **Verdict then:** Approve, 8.5/10.

## D1–D20 (out of 5; N/A: no screen changed). Scores as of 4b3ff7d6
| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | Both steps ready to run with stated costs; the PR body now names the rest of the PA queue (note 5 closed) |
| D2 Data integrity | 5 | Jobs byte-identical to `roundJob`; contract change additive; a wrong-key run is never replayed |
| D3 Reuse | 5 | `roundJob` extracted and used by `round`; costs from the launcher's `buildRequest` and the ledger's formula |
| D5 Stability and recovery | 4 | Real runs now outrank the check's; leftovers swept, gitignored, cleaned on SIGINT/SIGTERM. Residuals R2, R4, R5 |
| D6 Freshness and governance | 4 | Stub-pass gate tied to path code and screening sources; inputs are not in the gate (break m5, open) |
| D7 AI trust | 4 | Same prompt, inputs and key required; contract now requires `output_sha256`, but Replay does not verify it (break M3, open) |
| D13 Accessibility | N/A | Spot-check on 80a9df79: axe 0, 1024 px no sideways scroll |
| D15 Speed | 5 | Replay 124 ms; check 20 s |
| D16 Testability | 4 | Every step now has a fail case. R fail stops testing the key once real runs land (R3); the hash rule has no fail test (R6) |
| D17, D20 | — | Simulated only |
| D18 Provenance | 5 | Run files named in the result, with `launch_evidence` |
| D4, D8–D12, D14, D19 | N/A | No rule, screen or end-to-end change; D19 waits on the Mac run |

## Re-review 4b3ff7d6
Scope: `git diff 80a9df79 4b3ff7d6`, PR files only (.gitignore, the contract, the PA check, `track-a-jobs.ts`, both stub lists). Main's merged files untouched by this PR.

**Ran:** PA check **27/27** (20.7 s), shared ledger unchanged (76 lines), five tracked files byte-identical (md5), no simulated run left, scratch ledger removed. `check_forms_schema_lint.ts` 24/24, `qa/check_qa_ai_paths.ts` 27/27 (both new kinds listed), `check_contracts.ts` 23/23, `tsc` clean in the touched files, `track-a-jobs.ts` plan: US$2.66 worst, ~US$0.43 usual, corrected cap line.

**Review Minors 1–4 (03494424): closed.** Usual ×2 is stated (`track-a-jobs.ts:7-8, 71`). The cap line says the experiment cap counts every run. Plan mode prices only the job whose id equals `jobIdFor(...)` for vv.single. S pass compares the stub pass's `run_id` with this run. New fail cases: S (stale screening sources refused by `hasStubPass`) and W (64k output → US$3.03, flagged).

**Breaker fixes, tested:**
- **M1, closed for the case it describes.** I planted four contract-valid "real" runs stamped `20261103t090000000z` next to the check: 27/27. Replay used the planted runs and the R pass expected them.
- **M2, closed apart from kill -9.** SIGINT mid-R and SIGTERM mid-R both removed every simulated run and restored the five files: tree clean. After `kill -9`, the four leftovers show only as ignored (`!!`); the next start removed them, 27/27. The 2000 stamp means a leftover can never outrank a real run.
- **m4, closed:** `P2_LEDGER_DIR` is a scratch folder per process, and the check asserts the shared ledger is unchanged.
- **m7, closed:** both stub lists name `pqr_picks` and `qd_conditions`.
- **M3, contract part only.** A completed `pqr_picks` or `qd_conditions` record without `output_sha256` is now refused (ajv probe on both kinds); `launch.ts:141` writes it. `isSameSavedRun` (`engine/rounds.ts:35-37`) still does not compare sha256(`raw_output`) with it.

**M3 deferral: acceptable, on one condition.** The gap is in the shared engine and affects every replayed kind. It predates this PR. Exploiting it needs a hand-edited run file committed past the P-227 check. Now that the contract requires the hash for both new kinds, the follow-up is a small, separate engine change (`check_forms_rounds.ts` owns its tests). **But no follow-up row exists at 4b3ff7d6:** BACKLOG has none, and the PR body still says "Breaker: still running". WAY-OF-WORKING step 4 requires the unfixed findings to be listed. **Condition:** before the label, the PR body lists break M3 as a follow-up (owner, and the rule: compare sha256(`raw_output`) with `drafting_run.output_sha256`, and refuse `caller: live` with `stub_calls > 0`), plus the open Minors m1, m2, m3, m5, m6 and R1–R6 below. A PR-body edit needs no new commit.

**New or remaining findings (all Minor):**
- **R1 (Should, before the first result PR): a failed real run turns the check red.**
  - **Where:** `check_forms_pa_track_a_jobs.ts:139`. `expect` takes the newest `<job>-live-*` file without the app's usability filter.
  - **Why it matters:** `launch.ts:92, 156` names a run `-live-` whatever its outcome.
  - **Repro:** one planted C4.7 draft run with `status: failed`, `contract_valid: false` → 26/27. Replay correctly fell back to the check's run, but "R pass: C4.7" failed.
  - **Fix:** filter `expect` with `isSameSavedRun` plus `shapeOk`, as `api/src/rounds.ts:118` does.
- **R2: kill -9 still leaves files behind.**
  - Four tracked files in `stub-pass/*477759eb.json` and `canary-digest.json` stay modified, so `git add -A` would commit them.
  - When no real run exists, a leftover vv.single run is replayed by every copy that reads this tree until the next check start. The 5–10 s window during a normal run is also still there.
  - Accept; say so in the check header.
- **R3: R fail stops testing the key once real runs land.** The wrong-key runs are stamped 2000, so a real run is used first. With the planted runs, R fail passed while returning the real files. The label "even the newest" is then untrue. The key guard is still unit-tested in `check_forms_rounds.ts`. Fix: reword the label, or stamp only the wrong-key runs newer (they can never replay for vv.single).
- **R4: the start-up sweep deletes another check's runs.** Line 48 removes every `pacheck` file, including those of a second check running in the same tree (read from the code, not run).
- **R5:** the SIGTERM handler exits 130, not 143 (cosmetic).
- **R6: no fail test pins the new hash rule.** Fix: add a K fail: the stub record without `output_sha256` is refused.

**Journey score on 4b3ff7d6: 9/10, pass, no criterion at 0.**
- Walked again: the cross-boundary journey (the Mac's runs land, then Replay and the check) with planted real runs, plus recovery after SIGINT, SIGTERM and kill -9.
- Scores now 1: next step obvious (exact job ids; the PR names the rest of the queue) and correct data (cap and usual wording).
- Score now ½: trust and sources (M3 open).
- Accessibility stays ½ (dialog not re-walked; unchanged).

**Could not check:** a real paid run; two checks at once in one tree (R4); C4.11 step 5 in the browser.

**Verdict on 4b3ff7d6: Approve, 9/10.** No open Blocker or Major in this PR's change. Breaker M1 and M2 are closed apart from R1–R2, m4 and m7 are closed, and M3 is a pre-existing engine Major, deferred with reason. The condition above (list M3 and the open Minors in the PR body) applies before the `review: approved` label. R1 should be fixed before the Mac's result PR.
