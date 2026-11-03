# Review QA-162 deciders (C4.11 step 5), head 4ebfbb105 (on origin/main 4e61c5e90)

Reviewer: independent (did not build). Engine-only change: no screen, schema, money, permission or AI call. Ran on port 4457 only.

**Verdict: Approve** (no Blocker, no Major; 3 Minors).

## Evidence
- `check_forms_qa162_saved_matching.ts` on 4457 at this head: 27/27 pass. C4.7 picks 13/23; C4.11 step 5 conditions 8/22 (was 4/22 on main), US$0.
- Both other-name questions decided by `person.used_other_name = yes`; national ID number by `person.has_national_id`; green card number by `person.us_lawful_permanent_resident`. All 8 landed are readings of queue items; "named in other words is never Ready" passes.

## Points asked
(a) No wrong-decider guess. The pool only gains candidates and `findFact` is unchanged, so W1 exact and W2 all-words rules apply as before. A new candidate can only turn a unique hit into "several" (left out, with reason), or add the one question that really matches. The tight-key tie-break (`fact-words.ts` last lines) still needs exactly one. The target lookup still uses the form-read pool (`qd-conditions.ts:77`), so no new question becomes conditional. "Other names used" as the asked question stays dropped (2 questions); "Lived elsewhere", "Residence same as mailing" stay dropped, as the test checks.
(b) Role expansion is right: `once_per_case` or `case.*` gives role "case" (same rule as `api/src/runtime.ts:281`); otherwise each participant with max>0, not `applies:false`, not representative. The `have` set stops duplicates and never replaces a form-read entry. Placements carry no per-role restriction in the snapshot (`snapshot.ts:198`), so "each applying role" is the faithful reading. A role with no person in the preview can only be a decider for a target of that same role, which must exist in the form-read pool, so it is harmless.
(c) Nothing new becomes Ready that should not. Landed items go through the same `askedInOrder` C5 check, the same "Hiding a value" warn (kept Check/Decide), and the `loose` gate. Ready still needs both readings agreeing, with no warn and no loose naming. The target is still form-read, so the hiding warn applies as before.

## Issues
- **Minor m1** `qd-conditions.ts:81`: the asked test for the decider is now `placed` only, for the whole pool. This also admits form-read facts that have no `forms` but a saved choice (the "tick on a fact no form needs" rows). It is placed, so it is asked; fine, but the comment (lines 78-79) says only "need not fill a form box". No code change needed.
- **Minor m2** `tests/check_forms_qa162_saved_matching.ts` (new checks, ~lines 97-103): nothing covers the role expansion (a `case.*` or once_per_case decider, or a spouse/child-role decider), and nothing asserts the newly landed items are not Ready. The test is not shown to fail if `askedOnly` expanded to the wrong roles. Add one assertion that the 4 new items have confidence other than "ready" when they carry a hiding warn.
- **Minor m3** `qd-conditions.ts:58` `askedOnly` is `export`ed but used only here; the `as unknown as FactSourceView` cast (line 69) fills `source`/`document` with undefined. Safe now (decider uses only `fact`, `label`, `role`, `placed`); if a later change reads `.source` on a decider it will break quietly. Fine to leave; note it.

## Journey (reviewer role, journey-test)
Score 8/10. The walk was the replay of saved run #531 through `conditionsFromRounds` to the queue items (the user-visible result is the To review list), not a browser walk. Each left-out condition still names its reason; each landed one is a check-before-use item. I did not open the Review screen. The touched browser suites (`check_forms_c411_draft_qd_browser`, `check_uxa1_counts_browser`) were left to the builder's run, and I did not run them.

## Could not check
The other touched suites (`c411_contract`, `draft_qd(+_browser)`, `pa_track_a_jobs`, `qa163_listed_form_saved`, `uxa1_counts_browser`); the builder is re-running them on the new main. Approval is for this commit only, on the condition that they are green.
