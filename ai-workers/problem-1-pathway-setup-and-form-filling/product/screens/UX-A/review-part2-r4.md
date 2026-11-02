# UX-A part 2 — re-review r4 (diff-only, replay onto main), head caaccd6d

Scope: the two conflict resolutions in api/src/programs.ts versus the approved 2e662e41 (code approved by reviewer and breaker).

1. Imports (programs.ts:31-32): `emptyProblem` from studio.ts beside G1's `draftSourceProblems` from source-register.ts. Both exist and are exported (studio.ts:104, source-register.ts:28). Fine.
2. `baseProblems` (programs.ts:196) is main's G1 rename, now validated with `accepts` (part 2's break fix, `acceptsOf` at :150). `draftProblems` = baseProblems + G1 source gate (only when `changes > 0 || !rel`) + G2 key gate (same condition, :208). `relProblems` (:205) still validates the release without `accepts`, as before. Fine.
3. `blockers` (:271-273) = `errors` (error-level draftProblems, so it now includes G1 "no-source" and G2 answer-key errors) + `emptyProblem(snapshot)`. This matches the Review and release tab list (studio.problems, studio.ts:428: structure, filing, emptyProblem, validate with accepts, sources, carried, tests): the only items the tab has that blockers lacks are `carried` (level warning) and warnings from the key gate, which are not release blockers; the source and key gates use the same conditions on both sides (a Live row with no draft changes lists none on either). So To review's "N problems to fix" equals the tab's error count. `firstError` (held-row text) is untouched beside it and unaffected by `blockers`.
4. Other readers: `setupStates()` (:287) and review-queue.ts (:61, :273-281) use only `blockers {n, first, empty}`, `setup`, `live`, `path`; nothing there was renamed by main. `draftProblems` is still the name used for `problems:` in the leaf (:~246).

Run: check_uxa2_to_review_browser on my own copy (rev_616, :4447, db xr_studio_rev_616; scratch copy with psql path /usr/local/bin/psql, deleted after): 47 passed, 0 failed, exit 0. Copy stopped; no screenshots changed in git status; nothing committed; US$0, :4400 not used.

Not checked / minor (no action): no test drives a G1 no-source or G2 key error into the To review count (the check uses a filing-mode error); the code path is the same `errors` array, so I accept it by reading.

**Verdict: Approve** (no open Blocker or Major) for caaccd6d.
