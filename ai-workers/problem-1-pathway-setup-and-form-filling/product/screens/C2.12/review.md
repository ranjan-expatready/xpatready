# Review: C2.12 step 6 waits for carried undecided form fields (PR #349, commit 1d33d639)

Reviewer: independent, did not build. Basis: diff against origin/main, tests on one isolated copy (port 4571, stopped after), no live AI. No concept.md exists for C2.12 (a slice of the guided path, plan F3 D2/BR-10); judged against the acceptance file's stated IRCC-F08 and F3a-1.

## Verdict: Approve (no open Blocker or Major)

## Checks run (fresh copy, US$0)
- acceptance/C2.12.test.ts: 16/16 (AT-5 and AT-6 and AT-8 now pass; they failed on main per the file header).
- check_forms_c212_complete: 6/6. check_forms_c212_progress: 54/54.
- check_forms_c212_queue_forms: 45/45 on a fresh copy. In a run chained after the other suites on the same copy it died with "fetch failed" after 2 passes; it passed alone on a fresh copy, so this is suite-order state on a reused copy, not the change (Minor 2).

## Code
- engine/form-progress.ts: `carried` is optional (absent = 0), so old callers are unchanged. The carried step comes after the `before && !open.length` guard, so an open error still wins its own words. Step 6 returns `needs_you`, count = carried, next = Forms tab, who = null (author acts), and `current` stays on step 6. Correct.
- api/src/form-progress.ts: `carried` counts rows from `effective(..., "draft")` that are unresolved and not DRAFT, so a published row already decided in a newer draft is not counted. This matches studio.ts `undecidedFormFields` (the same "later version" rule), so the path and the Forms list agree.
- api/src/studio.ts problems(): `forms` added to every problem, one pass over field_maps (no per-problem queries). A Forms problem lists its own form; other problems list forms whose map reads that fact; none gives `[]`. Server-side only, read path, no migration, no write, no new authorisation surface.
- contracts: `forms?` optional, backward compatible.
- Tests fail if the rule is removed: the pure test has a fail case (16 carried gives needs_you) and the pass case; AT-6 ties the path to the Forms list.

## Findings
- Minor 1: for non-Forms problems `forms` is the item matched against `e.fact`. An item that is a rule id or document type matches nothing and gets `[]`, which is the stated behaviour ("none otherwise"), but it is untested for a non-Forms problem that does map (only the Forms case and "every problem has an array" are asserted). Add one positive assertion when convenient.
- Minor 2: check_forms_c212_queue_forms is not independent of earlier suites on a shared copy; keep it in its own batch shard.
- Minor 3: the changed `evidence/screen01/api-checks.json` is regenerated output, not reviewed line by line; it is outside the item.
- Words: "N form fields not decided yet (from an earlier release). Decide them when this edition is drafted again." is plain, says how many and what to do. The button "Decide the form fields" points at the Forms tab, but the message says to decide when the edition is drafted again, so the link leads to a list that offers nothing to decide until then. Minor 4, wording not a defect in data.

## Journey test (reviewer role)
Scope limit: no visible browser walk this time (Mac memory tight, one copy only); the change has no new UI (it feeds the existing path and Forms list), so journeys were driven through the API the screen reads. D17/D20 and screen-reader checks not done.
Journeys: (1) author sees LMIA IMM 1295 with 16 carried undecided fields: step 6 open, count 16 (held). (2) Same form after all decided: step 6 done, list agrees (held). (3) Approver reads the same path, steps not theirs say who acts (held). (4) Wrong role: case officer and client 403, anonymous 401 (held). (5) Reload/resume: current step the same twice (held). (6) Boundary: every next.href opens a built route (AT-11 held).

| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | step 6 no longer false "complete" |
| next step obvious | 0.5 | link leads to Forms list, see Minor 4 |
| plain words | 1 | message above |
| feedback and state | 1 | count and what's left |
| correct data | 1 | path equals Forms list (AT-6) |
| error recovery | 0.5 | not exercised in a browser |
| accessibility, sizes | 0.5 | no UI change; not walked |
| speed | 1 | single pass, no extra queries |
| visual quality | 0.5 | not viewed |
| trust and sources | 1 | carried wording names the earlier release |

Journey score: 8/10 (pass, no 0), API-level only.

## Not checked
Visible browser look, keyboard and 200 % zoom (no UI delta), graph.mjs tool, real screen reader.
