# Review: C11.14-live, commit 0e2b64e2c (base dcc8a78d6)

Verdict: Approve. No Blocker, no Major. Two Minors (test depth only). Journey score: 8/10 (reviewer, code-path walk with the free suite; no UI change, no live AI).

## (1) Money outcomes (api/src/rounds.ts StepRunner.launch, 180-215)
- Order unchanged: too-large, provider limit, refused_by_provider, busy, timed_out, then the catch-all. Only `status !== "completed"` became `!FINISHED_RUN.has(status)` in four places (193, 197, 202, 209).
- Unfinished runs (refused, invalid_output, timed_out, provider_error, budget_exceeded, missing status via String(undefined)) behave as before: limit/refused/busy branches fire, timed_out line 206 untouched, catch-all refuses, cost kept (`cost` or `costBesideLimit`).
- A finished run (completed or completed_with_unresolved) skips limit/refused/busy branches: right, an earlier retried attempt that later succeeded must be used and its cost (usage sum, p2/launch.ts) is returned at 217.
- completed_with_unresolved with contract_valid != true, no raw_output string, unparsable or wrong-shape output still refused at 209/214/215, cost kept. p2/launch.ts:121-131 only reaches convert for a valid, parsed answer; status "completed_with_unresolved" arrives only from convert.ts:74.

## (2) Other places demanding "completed" only
- people-ai.ts:273,297 (who_can_be), finder.ts:811 (find_forms): non-field_map kinds, recorded "completed" only (launch.ts:129). Correct as is.
- sources.ts:225,413,545 already use `/^completed/`; ai-run.ts:108,132 too. form-masters.ts uses the shared StepRunner (kinds form/guide, not field_map); no status compare. field-map-check.ts is replay-only through the same engine/rounds.ts FINISHED_RUN (isSameSavedRun line 39). Nothing missed.

## (3) Tests (tests/check_forms_rounds.ts 92-103)
- Ran: 74 passed, 0 failed, no server, US$0. Pass test (unresolved, 0.41 used) fails on old code; fail test covers refused, invalid_output, timed_out with cost 0.12 kept. Claim 73/74 without the fix is consistent (only the pass test depends on the change).
- Minor 1: check_forms_rounds.ts:102 "fail" cases carry contract_valid true and a good answer, so they prove the status gate only. No test that completed_with_unresolved with contract_valid false / null raw_output / wrong shape is refused (rounds.ts:209,214,215). Code is right; the guard is untested for this status.
- Minor 2: no test that a completed_with_unresolved run carrying a busy or refused_by_provider attempt is used (rounds.ts:197,202) nor that a limit-refused unresolved run is still blocked; these are the new money branches.

Not checked: live run (forbidden), UI.

**Verdict: Approve** for 0e2b64e2c.
