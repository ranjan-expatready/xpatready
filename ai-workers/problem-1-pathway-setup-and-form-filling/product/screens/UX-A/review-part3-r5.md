# UX-A part 3, re-review r5 (diff only, 0452905b to a6861871; Devin finding on #622)

Reviewer: Sonnet (P-278). Engine check `tests/check_setup_checklist.ts`: 56/56 pass. Browser runs are the builder's (all exit 0), not re-run. No server, not :4400.

## What I checked

* **Code-to-step map.** `NOT_STARTABLE_AT` covers 6 of the 7 `MissingItem` codes. `not_started` is missing, but it is only set on the leaf row with no combination (`api/src/programs.ts` line 187: `release: null`, status In setup). The new block needs `s.release`, so that code can never reach it. The `?? forms:problems` fallback is only a safety net. OK.
* **Double counting.** None. `missing` is built from `relProblems`, the same list as `release.problems`. Three of the causes (`filing_problem`, `filing_not_set`, `rule_problem`) are made from validator errors, so whenever one exists `relErrors` is non-empty and the new block is skipped (`!relErrors.length`). On the new path only `no_forms`, `form_without_edition` and `role_without_questions` can appear. Each is one item with count 1, even when it names several forms or roles; that is consistent, not a double count.
* **Needs you and To review.** Both read the same `fix_problems` + `fromRelease` items. `needsYouItems` includes `fix_problems`, and `mayAct` sends it to the author. `releasedProblems` sums the counts into "N problems in the released version". A cause counts once in each place. Consistent.
* **Text.** The `Next step:` tail is stripped whether the line is plain, has a waiting setup step, or is a shared-step line (cause only). The result is "<cause>: firms cannot open cases until it is fixed". The test pins it. The pass case (startable, with a `why`) gives no release item. Good.
* **Focus landings.** `forms:problems` (`FormsProblems`) and `questionnaires:problems` (`PartProblems`, `data-focus-also questions_documents:problems`) are drawn and found by `useFocusItem`. `people:problems` has no landing element anywhere in web, but it is not new (release problems on People already used it) and it is unreachable on the new path (`filing_not_set` always comes with a validator error).

## Findings

* **Minor (follow-up, not blocking).** The two landings for the new items use the existing released-problem notice. It reads "The released version has N problem(s) ... This draft no longer has it. Send the draft for review and release it to put it right." For `no_forms`, `form_without_edition` and `role_without_questions` the draft usually still has the gap (the startable check is not a validator error, so `draft.problems` is empty). So "no longer has it" is untrue and "release it" is wrong advice. The right step is to add forms, map fields or add questions. The item text itself is correct, so the user is not misled before clicking. Suggest the notice shows the item's own text when the cause is a startable one. No browser check covers this landing.
* No Blocker. No Major.

Verdict: Approve
