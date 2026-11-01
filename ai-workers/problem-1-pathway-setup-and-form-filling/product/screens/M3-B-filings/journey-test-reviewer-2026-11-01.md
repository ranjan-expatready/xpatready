# Journey test, reviewer: M3-B filings and fees (C6.12, Visitor visa), commit e7da8e2f (round 2)

1 Nov 2026, reviewer agent. Backend-only slice: the journeys were walked over the API on the isolated copy :4436 (`xr_studio_m3b`, serving e7da8e2f) as the case officer's screen would call it. There is no browser walk, axe or screen-size pass, because no screen exists yet. Round 1 (02f5ec14) scored 7.5/10 (git history keeps it). Persona for every journey: the case officer, unless stated.

## Journeys
1. **Main: a visitor family of three.** Goal: "how many applications, and what do they pay?" New Visitor visa case and 2 children → `GET …/filings`. **Held:** 3 `files_own` filings with person-keyed ids and one `group-family`. Visitor visa 3 × CAD 100. Biometrics CAD 170 on the principal's filing ("Family maximum CAD 170 for the 3 people applying together, paid on this filing"), the children exempt at CAD 0 ("Covered by the family maximum on Sample Applicant B's filing"). Lines CAD 470 = group CAD 470. `version` is present.
2. **Alternate: a family of six** (API suite). CAD 500 + CAD 170 = CAD 670. The fee lines add up to CAD 670. Held.
3. **Someone stops travelling** (API suite). The spouse appears in `not_filing` with no fee lines; CAD 500 with no cap claimed. The other filings keep their ids (engine test). Held.
4. **Empty: nobody applying** (engine suite). No filing, group or fee; `why` "Nobody on this case is applying". Held.
5. **Other combination** (engine suite; live in round 1). `derived:false`, in plain words, no amounts. Held.
6. **Wrong role.** Client 403, configuration author 403 (live). Held.
7. **Error: a release that no longer names the case's combination** (API suite). 409 Problem Details, then 200 once restored. Unknown case 404. Held.
8. **Recovery: reload.** Deterministic, and `version` is stable for the same people (engine test). Held.
9. **Cross-boundary: hand-off to recording (BR-11) and billing.** Stable filing ids, `number: null` and `status: NOT_STARTED`, plus payer and exempt per line, give the next slices what they need. Recording itself is not built.

## Data underneath
The route writes nothing, so no audit line is expected for a read. Roles are enforced in `Runtime.reach` on the server. CAPABILITIES.md matches main (P-221); the record is `qa/built/C6.12.md`.

## Break it
Built-in names as roles or combination keys (`constructor`, `__proto__`) are not derived (engine tests). Mutations in /tmp: cap, exempt, payer, ids, `applies`, `splittable`, `version` and the threshold are each caught. Reads take about 15 ms.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 correct for the Visitor visa |
| Next step obvious | ½ | `status` and reasons are present; no next action is offered (that is M3-E's) |
| Plain words | 1 | Every `why` is plain; no capability codes |
| Feedback and state | 1 | `derived`, `cap_applied`, `exempt`, `status`, `version` |
| Correct data | 1 | Lines = total live (CAD 470) and in the property test |
| Error recovery | 1 | 401, 403, 404 and 409 Problem Details; restore → 200 |
| Accessibility and screen sizes | n/a | No screen |
| Speed | 1 | About 15 ms, 2 queries |
| Visual quality | n/a | No screen |
| Trust and sources | 1 | URL, words versus summary marked, date, checker; exemptions disclosed |

**7.5 of 8 applicable = 9.4/10, rounded to 9.5. Pass** (no criterion at 0). To raise it: a next action per filing, which belongs to the screen in a later slice.

## Not tested
A screen of any kind, a real screen reader, the live IRCC fee page (canada.ca not reachable), and an intended user's unaided walk (D17 and D20 stay with the founder).
