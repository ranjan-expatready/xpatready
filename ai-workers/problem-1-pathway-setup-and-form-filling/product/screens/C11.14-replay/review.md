# Review: C11.14 replay of "completed_with_unresolved" (commit e2fe9f91d, base f2d4118c5)

Verdict: Approve

(1) Safety. p2 records these statuses: runner.ts completed, provider_error, budget_exceeded, refused, timed_out; launch.ts adds invalid_output and (field_map kind only, via convert.ts:74) completed_with_unresolved. launch.ts:129 forces "completed" for every non-field_map job (finder, people, form masters), so those callers can never see the new status. Only a fully converted field-map answer (contract_valid true, template, inputs, context all matching, raw_output a string, shapeOk) can carry it; refused/invalid/timed-out/partial runs stay excluded. StepRunner replay (api/src/rounds.ts:141) is the only caller of isSameSavedRun besides a test. Safe.
(2) Tests. check_forms_rounds.ts:35 pass, :36 fail. Fail list (cancelled, partial, completed_with_errors, "") uses invented statuses, not the real ones. Minor. B4 now plants the real status. Re-run by me: check_forms_rounds 72/72; B4 21/21 on isolated rv3 :4457.
(3) Other "completed" gates:
- engine/field-map-rounds.ts, api/src/field-map-check.ts: no status check. Not blocking.
- api/src/sources.ts:225, 413, 545 use /^completed/, already accepts it.
- api/src/rounds.ts:209 (live StepRunner path) rejects status != "completed". Not reachable for the checker (checkerRound is replay-only, field-map-check.ts:~55); latent only if a live field_map step were ever run through StepRunner. Minor.
- people-ai.ts:273,297 and finder.ts:811 demand "completed", correct (those jobs never get the new status).

Blockers: none. Majors: none.
Minors: engine/rounds.ts:36 doc comment is inserted between isSameSavedRun's own doc comment and the function (two stacked docs; the first now sits above FINISHED_RUN). tests/check_forms_rounds.ts:36 fail cases should use real statuses (timed_out, refused, invalid_output, provider_error). api/src/rounds.ts:209 latent as above.
Journey score: not applicable (not a screen); engine change, replay verified through B4 at US$0 (no live call).
