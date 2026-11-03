# Review (round 1): QA-154, commit 38ec4c1f3 (test-only change)

I ran the check through its usage line on an isolated copy (port 4471, STUDIO_FAKE_LAUNCHER only): **22 passed, 0 failed**. The copy is stopped. The shared ledger is unchanged (AT-13).

## Checks
1. **Safety: sound.**
   - The fake launcher is honoured only in an isolated var folder and only when the path resolves to the fixture (`sources.ts` `launcherFor`). Otherwise the guarded launcher runs.
   - After the Phase C restart the check reads `GET /session` → `ai {live:true, launcher:"stand-in"}`. If that fails it restarts with the switch off and calls `setupMissing` before any start.
   - So the guard comes before the first live start (AT-9c, 2c). Phase D starts with the switch off.
   - `P2_LEDGER_DIR` goes in the same restart line, with `STUDIO_HOLD_QUEUE=1`. `policy.ts` reads it into LEDGER_DIR.
   - The guard does not check that the scratch ledger is the one in use. That is the one residual gap; see Minor 1.
2. **No vacuous pass.**
   - AT-2d needs `ended` true, status FAILED, the text "switched off", cost null or 0, no live call in the fake log, no real reserve, and `aiOff.live === false`.
   - If the job does not end, `ended` is false and the test fails. If J4 is missing, `j4` is empty and it fails.
   - `over_attempts !== true` on `after.targets[0]` passes when the field is undefined. It is the one weak clause, but the other clauses carry the test.
   - The builder's mutation (launchOnce guard disabled) turned AT-2d and AT-13 red, which shows the test can fail.
3. **Dropping the seed lines is sound.**
   - The ledger is the check's own scratch file. The server is idle (queue held) and reads it at each plan. The filter only drops `seed-acc*` reserves.
   - It also makes `reservedNone()` meaningful in AT-2d, which needs a clean ledger.
4. **QA-154 reproduction.** Phase A still covers the steps (AT-1, 2, 9b): plan live.on false with a reason, start 409, nothing queued. The door code is on this branch (`ai.ts:182, 309, 521`).
5. **Other live paths.**
   - Every launcher use goes through `Sources.launchOnce`: `sources.ts` 408 and 531, `rounds.ts` 168, `people-ai.ts` 290. It refuses live when `!aiLive()` (`sources.ts:473`).
   - Other routes check `aiLive()` themselves: finder, form-redo, draft-contract, form-masters, draft-qd, pqr-drafts, runtime.
   - `field-drafts-routes` uses a NO_LAUNCH stub.
   - The only `spawn` is in `launchProcess`, behind `launchOnce`. No bypass found.

## Issues
- **Minor 1.** Add a ledger guard: check that the Phase C copy really uses the scratch ledger, for example by reading the scratch file after the first seed.
- **Minor 2.** The header says "Expected: 24 pass" but the run gives 22. Fix the number.
- **Minor 3.** Make the AT-2d over-attempts clause strict: require `=== false` or a defined value.

No Blocker. No Major.

**Verdict: Approve** (Blockers: none · Majors: none · Minors: 3, above)

## Round 2 (8cdfd2ee0, diff 38ec4c1f3..8cdfd2ee0)
Re-ran the check on port 4471 through its usage line, then stopped the copy: 22 passed, 0 failed.
- m1 fixed: the Phase C guard also requires the LIVE plan's cost_check ok===false and can_continue===true, so the scratch ledger seed must be read. If not, it restarts with the switch off and stops before any start.
- m2 fixed: the header says 22.
- m3 fixed: AT-2d counts paid attempts by SQL as `rounds.ts` `paidRunsOf` does (=== 0). It requires the plan target for this attachment to have action "draft" and no `over_attempts` key.
No new issues.

**Verdict: Approve**

## Opus review (P-303), commit 1c5331db3 (diff origin/main...1c5331db3; test-only)
Fresh context; the view below was formed from the code and a run before reading the notes above.

**Run.** The usage line, isolated copy `forms_c118o` on :4472 (STUDIO_FAKE_LAUNCHER only): **22 passed, 0 failed**, 26 s, exit 0. The copy is stopped. The fake-launch log has 15 stub calls and 0 live calls. `.tools/p2-ledger` has the same sha256 before and after. No QUEUED step is left, and the copy ended as `ai {live:false, launcher:"stand-in"}`.

**QA-154 re-run by hand** (same copy, switch off, before the stop):
- `POST /ai/plan` LIVE gives `live {on:false, why:"AI now is switched off…", blocked:true}`.
- `POST /ai/batches` LIVE gives 409 with the same words. Counts stay 4/16 (ai_batch/drafting_job) and the launcher is not called.
- The "not checked" half is AT-2d: J4 was queued with the switch on, then resumed on restart with the switch off. Its stub passes ran, then it ended FAILED at US$0 ("5 of 5 parts… AI now is switched off"), with no live call. **Fixed.**

**Both directions.**
- Fail case: AT-2, AT-3b, AT-9b.
- Pass case: AT-2c (201 and QUEUED/LIVE, so the door opens with the switch) and AT-3b pass.
- Runner door: `sources.ts:473` is the only `aiLive()` check on the runner path (none in `ai.ts` `step` or `runDraftStep`/`runParts`). Removing it sends the live call to the stand-in, which exits 1 with "asked for a live call". AT-2d's `/switched off/` and `liveCalls()` clauses then fail, and so does AT-13.
- Phase D's stub scenario is set to succeed, so the step reaches the live door and is not stopped at the stub pass first (no vacuous pass).

**Safety / P-192.**
- The switch is set only in the Phase C restart, in the same line as the fake launcher, `STUDIO_HOLD_QUEUE=1` and the scratch ledger.
- The guard checks `launcher:"stand-in"` and that the plan reads the seeded scratch ledger before any start.
- The startup hooks (`ai`, `finder`, `people-ai`, `draft-qd`) only re-queue (held) or cancel.
- No bypass: the only `spawn` is behind `launchOnce`.
- In run-suites, exit 2 counts as FAIL and the copy is stopped afterwards.

**Issues**
- **Minor 1.** On a crash, or SIGINT after the Phase C restart, the `.catch` and signal handlers delete the scratch folder but leave the copy running: live on, stand-in, held, J4 QUEUED/LIVE, and `P2_LEDGER_DIR` pointing at the deleted folder. This is US$0, since the stand-in launcher is in use and the runner door still applies. Even so, restart the copy as it was started in those handlers, as `check_cost_override.ts:325` stops its copy.
- **Minor 2.** `restart` blanks only STUDIO_AI_LIVE. A `STUDIO_HOLD_QUEUE` or `P2_LEDGER_DIR` exported in the caller's shell leaks into Phase A/D and the final restart. Blank them as `check_cost_override.ts:27` does.
- **Note.** AT-2d covers the split path (`runParts`). The single-file `launch()` path shares the same `launchOnce` door. The QA-154 row is still Open in BUGS.md; qa closes it on retest.

**Verdict: Approve** (Blockers: none · Majors: none · Minors: 2)

## Opus round 2, commit 1d8aa4a01 (diff 1c5331db3..1d8aa4a01)
**Run.** The usage line on `forms_c118o` :4472 gave **22 passed, 0 failed**, exit 0. The fake-launch log has 0 live calls. The copy ended as `ai {live:false, launcher:"stand-in"}`, the shared ledger is unchanged, and the copy is stopped.

**m1 is fixed.**
- `restoreCopy()` runs on `setupMissing`, on the `.catch` and on SIGINT/SIGTERM.
- While `switchedOn` (from just before the Phase C restart until after the Phase D one), it restarts the copy with the switch off and the stand-in launcher, then removes the scratch ledger.
- If Phase D's restart does not come back, `restart` calls `setupMissing` while `switchedOn` is still true, so the copy is restored.
- The P-192 guard now relies on `restoreCopy`, the same restart as before.

**m2 is done as asked, but part of my m2 was wrong (Minor 3, my error).**
- `BLANK` also blanks `P2_LEDGER_DIR`. `check_cost_override.ts:27` blanks only STUDIO_AI_LIVE and STUDIO_FAKE_LAUNCHER, so I cited it wrongly.
- run-suites exports `P2_LEDGER_DIR` as a per-run scratch ledger (`run-suites.sh:69`, "test runs never write the real ledger"). Now, under run-suites, the final restart and the `restoreCopy` restart point the copy at the machine's ledger (an empty value is read as unset: `policy.ts` `ledgerDirFrom`).
- Meanwhile AT-13 hashes the test process's `LEDGER_DIR`, which is the run-suites scratch.
- No write path exists after those restarts, because the runner door refuses before any reserve. So this is US$0, but it removes one safety layer.
- Fix: drop `P2_LEDGER_DIR` from `BLANK`. An inherited value can only point away from the real ledger.

**Verdict: Approve** (Blockers: none · Majors: none · Minors: 1, Minor 3 above)
