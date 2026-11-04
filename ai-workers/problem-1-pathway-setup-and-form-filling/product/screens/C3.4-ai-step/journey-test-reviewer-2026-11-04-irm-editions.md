# Journey test (reviewer): IRM printed editions, PR #820 at bff5fa380, 4 Nov 2026

Role: the reviewer. This is the one journey score for this check. Limits: no isolated copy was allowed (Lead 3's copy cap) and nothing changes on screen, so I walked the journeys through the product's own code paths with pure calls (tsx). I opened no browser, used no API shortcuts into a running app, made no model call, and spent US$0. The screen-level criteria are scored ½ where I could not walk them.

## Journeys (persona · goal · steps · expected → result)
1. **Main path. Paid runner / tech lead:** "Draft IRM 0002 (Guide 5256's conditional form) like any IMM form." The launcher's known fact is "IRM 0002 (03-2021)", the saved map is checked against `field-map-entry.v0`, and it is released under `released-configuration.v0`. Expected: all three admit it. **Held**: `check_irm_editions` 9/9. On main the same check gives 1/9.
2. **Alternate. Author with an IMM form:** "Nothing changes for IMM 5257 / SCH1 / 0008 DEP." Expected: same verdicts and same saved-answer key. **Held**: 1,232-string equivalence check, 0 mismatches. IMM groups and `editionContextKey` are identical.
3. **Error. Bad or look-alike prefix:** XYZ, IMR, IRMM, irm, IRM0002, a leading space, a trailing LF, a 1-digit month. Expected: refused everywhere. **Held** in all four places I checked. The breaker also tried homoglyphs and NBSP; all were refused.
4. **Error. Held file / money guard:** "An approval for an IRM form is admitted, a wrong prefix is refused." **Not walked by me** (the p80 server suite is pending in CI). The breaker's pure `admitInput` admitted IRM and refused the other broken rules. Finding: the new test pairs an IMM 1344 code with an IRM edition (review Minor 1).
5. **Recovery. Stale path code after the change:** "A live run must not use an old stub pass." Expected: the live gate refuses until a fresh stub pass exists, and saved runs still replay. **Held**: 0 of 40 committed stub passes match the new path code (5 matched on main). The gate is at `launch.ts:82` and `draft.ts:55`, and replay keys ignore the path code.
6. **Saved answer for IRM.** The impact step files an IRM answer under `edition:IRM 0002:03-2021`, not the fallback. **Held** (check step 7).
7. **Screen boundary. Draft dialog / Load sample with IRM 0002:** **not walked** (no copy). No IRM inventory or job is committed, so Load sample and QA-145 are unchanged today.
8. **Wrong role:** not applicable. Roles live on routes this PR does not touch.

## Break-it (copy-free, 15 min)
Equivalence over 1,232 strings, LF and anchors, alternation scope, lazy capture, and stub-pass currency on main against the branch. No Blocker or Major. Minors are in the review: test realism (1), drift-check scope (2), no pure guard test (3), latent readers (4), `String()` coercion (5). The breaker's own report is `break-report-irm-editions.md`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | IRM 0002 passes the launcher, both contracts and the studio rule; 9/9 against 1/9 on main |
| Next step obvious | ½ | The fresh stub pass needed before the next live run is stated only in the PR body. No surface tells the paid runner. |
| Plain words | 1 | Refusal texts unchanged and plain ("the approval is not for a form with a printed edition") |
| Feedback and state | ½ | Not walked in the app: no copy, nothing visible |
| Correct data | 1 | IMM keys unchanged (0 differences). IRM key is `edition:IRM 0002:03-2021`. Contract derivation identical for form_edition |
| Error recovery | 1 | Stale stub passes are refused by the live gate, and replays keep working |
| Accessibility and screen sizes | ½ | No UI change, not walked |
| Speed | 1 | Regexes have no backtracking risk (breaker: 1 M-char code in 12 ms). Pure checks run in seconds |
| Visual quality | ½ | No UI change, not walked |
| Trust and sources | 1 | The edition is from the official manifest (canada.ca irm0002e.pdf, "IRM 0002 (03-2021)", Sample applicability) |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0) |

To raise it: walk journey 7 on a builder copy once the copy cap allows, and run the p80 server suite (journey 4). These are what move the ½ scores. Not tested: a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
