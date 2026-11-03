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
