# Journey test: G2 answer-key release gate (C5.5, P-240), reviewer, 2 Nov, PR #568 at 260e9660

Copies: isolated :4442 (demo workspace) and :4443 (`STUDIO_WORKSPACE_KEY=firm`), own DBs, `vite build`. Headless Chromium with Playwright and axe WCAG 2.2 A/AA (the built-in visible browser pane was not available in this cloud session). Screenshots in the reviewer's scratchpad (1440 px Review and release, Tests tab, Release page). US$0, live AI off.

## Journeys (persona, goal, expected)
1. **Main (author, expert, approver).** "Can this combination go out?" Review and release lists the answer-key lines, the Answer-key tests block says why; Fix on Tests opens the item; the expert signs; the line goes; the approver releases.
2. **Alternate: Demo release.** The Visitor visa (Sample) releases with an unsigned passing key and with no key on a map.
3. **Empty.** A combination with nothing tested: "Nothing here is tested by an answer key" / W7.
4. **Error.** A failing key; an unsigned key on a real release; no key on a new map (E7); a rule set with gates and no key.
5. **Wrong role.** The approver and the author reaching Fix on Tests; the author trying to sign (G4: 403).
6. **Recovery.** Reload Review; repeated Approve after a refusal; key changed after Submit.
7. **Across the boundary.** Fix on Tests lands on the Tests tab with that item focused; back to Review.

## What held
- J1: Review lists "Answer-key tests · IMM 5707 field map: no answer-key test ..." as an error with **Fix on Tests**; Submit greyed "Fix the problems first"; Tab reaches the link; Enter opens `/tests#tests-field_map-IMM-5707` with focus on that item (axe: no violation on Review, the Tests tab, or the signed-key state). Builder's browser suite 15/15 on a fresh copy, and the expert's Sign on Tests removed the line and the block read "Passed, signed by Content reviewer".
- J2: Visitor visa setup release 13/13; second Demo release with an unsigned key passes; a failing key refuses it (Q3). The block reads "Demo release: tests not signed ... are allowed; failing tests are not."
- J4: firm copy: Submit 400 names both maps; unsigned passing key still refused ("is not signed. The immigration expert signs it on Tests"); signed and passing releases and the summary names both keys. Rule set: refused with no key, with a failing key ("expected \"not_met\", got \"met\""), with an unsigned key; accepted when signed and passing.
- J6: reads write no runs. Key edited after Submit: Approve 409 naming the value; the Release page holds the row with the reason.
- Data underneath: one run row per key per pass, ran-by the person acting, one audit line per pass, `summary.answer_keys` freezes key id, version, state, signer, run id.
- Speed: GET combination 150–230 ms, review 150 ms, Submit with six maps 240 ms, Review page loads in about 1.0 s.
- Sizes: no sideways scroll for the block at 1440, 1024, 400 px (it scrolls its own table). The page as a whole scrolls sideways at 1024 and 400 px on With an LMIA, from the changes table and the tab row (build-notes 4; present before G2).

## Findings (also in review.md)
- m2: every refused Approve stores runs and an audit line (19 to 28 runs after three 409s).
- m3: Release page held reason prints `eligibility:` and a gate key.
- m4: "(G2)" on the Tests tab's empty-item line.
- With an LMIA with many errors: the G2 error is among 10 errors, 8 are shown until "Show all 31"; the block below it still shows "No test" and the link. Not a finding against the bar (list cap pre-exists).
- Break-it: repeated Approve (above); a key for an item no longer in the draft is ignored (no line), by design (BR-1).

## Score (0, 1/2 or 1; pass 8+, none at 0)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J4 end to end; real release of a map needs hand-typed expected values (auto-fill Not built) |
| Next step obvious | 1/2 | Fix on Tests beside each line; the error can sit under 8 other errors until "Show all" |
| Plain words | 1/2 | "(G2)", `eligibility`, raw gate key |
| Feedback and state | 1 | greyed Submit with reason; chips Passed, Failed n of m, No test, Sample: not signed; Release page held row |
| Correct data | 1 | runs, audit, summary frozen, rule set path hand-checked |
| Error recovery | 1 | refusals name each item in `errors[]`; fix path opens the item; stale key is a 409 |
| Accessibility and screen sizes | 1/2 | axe clean in three states, keyboard path works; page-level sideways scroll at 1024 and 400 (not from G2) |
| Speed | 1 | all reads under 300 ms here; 100-program scale not run |
| Visual quality | 1 | team table and chips, readable at 1440 |
| Trust and sources | 1 | signer and time, family, last run, "changed since" marker |
| **Total** | **8.5 / 10** | **Pass** |

Fixes that would raise the low ones: drop "(G2)" and the raw keys (plain words); show Tests errors first in the list or add a count link to the block (next step); fix the changes table overflow (screens row, not G2).

## Could not test
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); true browser 200 % zoom (checked at 512 and 720 px widths); the 100-program scale; a two-tab race on the release transaction.
