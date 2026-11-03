# C11.7 saved parts: independent review

Commit `eacb7da94` on `claude/compassionate-davinci-lafidu` (diff `origin/main..eacb7da94`). Fresh context; reviewer did not build it. 3 Nov 2026.
US$0: live switch never set; copies `forms_rv` :4473, `forms_rv2` :4474, `forms_rv3` :4475, `forms_rv4` :4476 (all stopped afterwards). The shared ledger was unchanged in every run.

## What I ran
| Check | Result |
|---|---|
| `check_forms_saved_parts.ts 4473 xr_studio_forms_rv` (stand-in launcher) | 12/12 pass |
| `check_s7_load.ts 4475` | 23/23 pass |
| `check_c10_1_configured.ts 4476` | 27/27 pass |
| `check_queue_tx.ts 4474 forms_rv2` (loads the six; not touched by this PR) | **2 FAIL** of 8 |
| Equivalence: IMM 5645 drafted Live-in-parts (stand-in launcher, live off, all 4 parts saved: plan `draft`, US$0, 4 stub passes, no live call), then Saved on the same form | 9 proposals each, payload, source, confidence and reason **identical**; both 119 of 139 form fields mapped |
| Browser at 1440 px: IMM 5645's own "Draft with AI" dialog on Sources, Visitor visa (form READ, 4 parts saved) | Saved radio **disabled**: "No saved AI answer for this form yet." |

## Findings
**Major 1: `tests/check_queue_tx.ts` goes red.** The load now replays 16 forms. `SAVED` (line 37) still lists 15, so the "every saved answer replays (the fifteen forms)" check (l.48) and the "fourteen siblings" check fail. They see `imm5645e.pdf` as an extra COMPLETED step. Fix: add `imm5645e.pdf` to `SAVED` and update the words "fifteen/fourteen". The nightly run (or `--changed`, since `sources.ts` is shared) will catch it.

**Major 2: the form's own Saved door still says there is none.** `web/src/pages/sources.tsx:136-145,185-186` takes Saved from `draftOptions().saved_runs` (`api/src/sources.ts:238-245`). That function only knows the whole-form job, so for IMM 5645 Saved is disabled, "No saved AI answer for this form yet". Draft setup's plan for the same form says "Saved AI answers for each of its 4 parts … US$0". The person is sent to Live. The ask was that Saved replays saved parts. Also, the test "P-227 pass: Saved on the form itself" proves `/ai/plan` only, not this dialog. Fix: report a parts-complete Saved in `draftOptions` (for example `saved_parts: {count, of}`). The dialog should then enable Saved with no run file, because launchSource already accepts `runFile` undefined.

**Minor 3: the test hook can change what a live plan does.** `hiddenRun` (`sources.ts:37`) is gated only on the isolated folder, but `savedRuns` also feeds three things:
- the LIVE "reuse saved answer" choice (`ai.ts:168`)
- `repeatsFailedRun` (the guard that refuses repeating a failed paid call)
- each part's `saved_run` worst case

On an isolated copy started with `STUDIO_AI_LIVE=approved` (isolated.sh passes any KEY=VALUE), hiding runs turns US$0 steps into paid ones and removes that guard. So the comment "it never spends" is not true. It can never act on the demo: VAR_ROOT does not match. Fix: also require `usesFakeLauncher() && !aiLive()`.

**Minor 4: the "launcher was never asked" checks cannot fail.** The test never writes `var/isolated-<name>/fake-launch.json`. `fake-launch.mjs:14` reads that file before it logs at l.15, so any launch would crash unlogged and `launcherCalls()` stays 0. The step-status checks catch such a regression indirectly. Fix: write `{}` to the scenario file at setup. Optionally add a positive control, such as one stub start that is logged.

**Minor 5: the step's words lose the parts.** A Saved parts step ends with "Saved AI answer (no model call, US$0). 119 of 139 …" (`sources.ts:689`). The same answer drafted live says "… in 4 parts, 4 near-duplicate names flagged". Use the parts wording for REPLAY when `rec.merged` is set.

**Minor 6: an unread form with all parts saved waits, with wrong words.** `!read_first` (`ai.ts:157`) skips the parts lookup, so the plan says "No saved AI answer to use (the form has not been read yet)". The whole-form Saved reads first instead. This is safe but untrue. Also, zero parts (every field reused) says "run it live", but that run is a US$0 reuse.

**Note (merge order):** the four part runs are only in #746. On this PR alone, `check_forms_saved_parts` stops with exit 2 (run-suites counts that as FAIL, so it is not a vacuous pass), and s7 and C10.1 expect 16. Merge #746 first.

## Correctness verified (code and runs)
- **Plan and launch:** the parts target's fingerprint hashes `[part file, saved_run]`. It is stable between plan and launch, and launchSource→launch matched. A new or removed part run changes `plan_sha256`, which returns 409.
- **Library changed before run:** the part fails in words and nothing is applied (tested).
- **No model call:** the REPLAY branch never reaches `launchOnce` (`sources.ts:411-416`). `callsModel(REPLAY)` is false at launch and at retry.
- **Retry of a failed parts step:** `runFile` is null, so retry re-runs saved parts (read, not run). An edge case: if the step fails after the merged file is written, retry replays that `var/…/merged-runs` file through `useSaved`.
- **`reuse_saved_output` without `run_file`:** launch writes `runFile`/`runId` null. `demo.ts:295` counts by action only. No web or API consumer requires `t.run_file` for that action (grep). Approved-in-product forms go through the same `draftSplit`.
- **Missing part:** the form waits, is named, and is never half-filled (tested at plan time and at run time).

## Scores (server-side item; D8, D12–D14 unchanged, D17/D20 simulated only)
D1 ½ (Sources dialog gap) · D2 1 · D5 1 · D7 1 · D9 ½ (dialog points to Live) · D10 ½ (Minor 5, 6) · D11 1 · D15 1 (replay 7.3 s for 16 forms) · D16 ½ (Minor 4; queue_tx red) · D18 1 · D19 ½.

## Journey score (reviewer, the one score for this check): 7.5 / 10, not a pass
Journeys walked:
1. The author loads the six, and IMM 5645 drafts from its parts: held.
2. The author opens IMM 5645's own "Draft with AI" to use Saved: **failed** (Major 2).
3. A part is missing at plan time: held.
4. A part goes missing between queue and run: held.
5. Draft setup's Saved plan names 4 parts: held (API).

| Criterion | Score |
|---|---|
| task completed | ½ |
| next step obvious | ½ |
| plain words | ½ |
| feedback and state | 1 |
| correct data | 1 |
| error recovery | ½ (retry not exercised) |
| accessibility and sizes | ½ (1440 px only, headless) |
| speed | 1 |
| visual quality | 1 |
| trust and sources | 1 |

No separate journey report file: the caller limited writes to this file.

**Not checked:** a retry run, keyboard use, and 1024 px / 200 % zoom.

**Verdict: Request changes.** Blockers: none. Majors: 1 (check_queue_tx), 2 (the form's own Saved dialog). Minors: 3, 4, 5, 6.

## Opus round 2 (diff only: `eacb7da94..2c09cb6e2`, HEAD 2c09cb6e2)
All runs were on my own copy `forms_rv` :4473 (stopped afterwards), with the stand-in launcher. The live switch was never set. US$0.

| Check | Result |
|---|---|
| `check_forms_saved_parts.ts 4473 xr_studio_forms_rv` | 14/14 pass. `fake-launch.json` is now written, so any launch would be logged; no log line was written. |
| `check_queue_tx.ts 4473 forms_rv` | 8/8 pass (sixteen forms; the IMM 5645 message parses as "9 fields") |
| Browser, 1024 px, keyboard only: IMM 5645 (READ, 4/4 parts saved) → Draft with AI → Enter | Dialog opens on Saved, `data-saved-parts=4/4`, button "Use Saved (US$0)", no sideways scroll. Enter → REPLAY COMPLETED, US$0: "Saved AI answers of its 4 parts, 4 near-duplicate names flagged (no model call, US$0). 119 of 139 …". Launcher never asked. |
| Builder screenshots 4/4 and 3/4 at 1440 px | 3/4 parts: Saved is disabled with "3 of its 4 parts only … never half-filled". The live-off notice no longer points to Saved. |

How each finding was closed:
- **Major 1: closed.** `SAVED` now lists `imm5645e.pdf` (b7b5ba43e).
- **Major 2: closed.** `draftOptions` adds `saved_parts`, worked out only when there is no usable whole-form run. The dialog derives `replayOpen` and launches with no `runFile`; the server then takes the parts path. `runs.ts savedInstead` now also counts a complete set of saved parts.
- **m3: closed.** The hook now requires an isolated folder, `usesFakeLauncher()` and `!aiLive()`.
- **m4: closed.** The scenario file is written before the first count, so a launch would be logged.
- **m5: closed.** The REPLAY step message names its parts and the near-duplicates.
- **m6: closed.** The plan no longer skips the parts for an unread form. `runDraftStep` reads the form first, and `draftSplit` then works from the inventory it just read. I checked this in the code only.

Still open (Minor, not blocking):
- **Breaker m2: Retry is still offered for a Saved-parts step whose part file is gone.** It fails the same way up to the attempt limit, at US$0.
- **Cost of opening the dialog.** `draftOptions` now runs `draftSplit` each time it opens (one query and up to N saved-run reads per part). This is fine at sample scale.

New issues: none found in this diff.

Journey score, round 2: **8.5 / 10, a pass.**

| Criterion | Score |
|---|---|
| task completed | 1 |
| next step obvious | 1 |
| plain words | 1 |
| feedback and state | 1 |
| correct data | 1 |
| error recovery | ½ (Retry repeats a certain failure) |
| accessibility and sizes | ½ (keyboard and 1024 px checked; no axe run, no 200 % zoom) |
| speed | 1 |
| visual quality | 1 |
| trust and sources | ½ |

The trust point is a judgement call: the dialog says "an earlier real answer" (singular) above the parts line. That is fine as worded.

**Verdict: Approve** (commit 2c09cb6e2). Blockers: none. Majors: none. Minors: breaker m2 (Retry on a part that cannot be recovered).

Merge note: #746, which holds the four run files, must merge first. Without them this PR's checks stop with exit 2, which counts as FAIL.
