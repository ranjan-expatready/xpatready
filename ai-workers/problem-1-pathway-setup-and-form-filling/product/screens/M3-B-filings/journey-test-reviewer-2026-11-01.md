# Journey test, reviewer: M3-B filings and fees (C6.12, Visitor visa), commit 02f5ec14

1 Nov 2026, reviewer agent. Backend-only slice: the journeys were walked over the API on the isolated copy :4436 (`xr_studio_m3b`) as the case officer's screen would call it. There is no browser walk, axe or screen-size pass, because no screen exists yet. Persona for every journey: the case officer, unless stated.

## Journeys
1. **Main: a visitor family of three.** Goal: "how many applications, and what do they pay?" Open a Visitor visa case (principal with a long name, `Ü 李明 <b>x</b> y…`) and add 2 children → `GET …/filings`. Expected 3 filings, 1 group, CAD 300 + CAD 170. **Held:** 3 `files_own` filings and "One submission for 3 people". Visitor visa CAD 300 with why "starts at 5 people". Biometrics capped at CAD 170 with why "instead of 3 × CAD 85 = CAD 255". Total CAD 470. The name came back unchanged as JSON data. **Wrong:** the three filings' own fee lines add up to CAD 555 (review M1).
2. **Alternate: a family of six** (builder's API suite, rerun). CAD 500 visitor cap and CAD 170 biometrics, total CAD 670. Held.
3. **Someone stops travelling.** Mark the spouse not travelling → 5 filings, the spouse under `notFiling` "no filing and no fee", CAD 500 with no cap claimed. Held. `filing-2` now means a different person (review m1).
4. **Empty: nobody applying** (engine suite). No filing, no group, no fee. Held.
5. **Other combination.** An Open work permit family case (`wp.family`, released) → 200 `derived:false`, "not derived yet … Nothing is guessed", no amounts. Held. The words include "C6.12, later slices" (review m4).
6. **Wrong role.** Client of the case → 403 "Only the case officer can do this." Configuration author → 403. Unknown actor or no header → 401. Held.
7. **Error: unknown or malformed case id.** 404 Problem Details. Held.
8. **Recovery: reload.** Two reads → identical bytes, nothing stored, nothing changed. Held.
9. **Cross-boundary: the hand-off to recording (BR-11) and billing.** Not possible yet: no payer or exempt marks per filing, and keys are positional (review M1, M2, m1).

## Data underneath
One case per create. People in `case_participant` as entered. The filings endpoint writes nothing, so no audit line is expected for a read. Roles are enforced in `Runtime.reach` on the server. Released `vv.single` roles: principal 1, spouse 0–1, child 0–4, all in the mode table.

## Break it
150-character name → 400 field error "Keep it to 120 characters." (correct). HTML and non-Latin text are returned as data. Malformed UUID → 404. Twenty reads: p50 15 ms, p95 17 ms. Mutations in /tmp: the cap, `applies`, the case filter, the child mode, the combination fallback and the amounts are each caught; the threshold is untested (review m3). There are no writes on this route, so the two-tab and double-click checks do not apply.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3: filings, group and capped totals are correct for the Visitor visa |
| Next step obvious | ½ | Reasons are given (`why`, `notFiling`), but no next action and no `status` per filing (M2) |
| Plain words | ½ | `why` strings are plain; "C6.12, later slices" leaks (m4) |
| Feedback and state | ½ | `derived:false` and `capApplied` shown; no `version`, no filing status (M2) |
| Correct data | ½ | Group totals are right; the per-filing lines overstate (CAD 555 vs CAD 470, M1); keys shift (m1) |
| Error recovery | 1 | 401, 403 and 404 Problem Details; deterministic reads |
| Accessibility and screen sizes | n/a | No screen in this slice |
| Speed | 1 | 15 ms p50, one query |
| Visual quality | n/a | No screen in this slice |
| Trust and sources | ½ | URL, date and checker on every fee line; the quote is partly paraphrase and biometrics exemptions are not disclosed (m2) |

**6 of 8 applicable = 7.5/10. Below the pass mark of 8** (no criterion at 0).
To raise it, most valuable first: M1 (per-filing payer and exempt lines that add up to the total) raises correct data and trust. M2 (contract names, `status`, `version`) raises next step and feedback. m4 raises plain words. m2 raises trust.

## Not tested
A screen of any kind (no browser, axe, keyboard, 1024 px or 200 % zoom). A real screen reader. The live IRCC fee page (canada.ca was not reachable). An intended user's unaided walk (D17 and D20 stay with the founder).
