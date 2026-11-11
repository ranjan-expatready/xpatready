# BK-8 journey test (reviewer): biometrics ages per pathway

Reviewer role, 11 Nov 2026. Commit `009d0a6be515d050b484db29dc61bf6b584dd9b2`.

This row is engine and API only. The step item it changes is returned by `GET /api/runtime/cases/:id/prepare` and no screen renders it. The Fees panel, which people do see, is unchanged.

The journeys below were walked against the API of an isolated copy (:4436, database `xr_studio_bk8rev`, stopped and dropped afterwards) and the engine. There was no browser walk, since no screen changed. The builder's walk at 1440 px is in `screenshots/bk8-biometrics-waits-1440.png`.

## Journeys
1. **Case officer, Visitor visa family; one child has no date of birth (main path).** Goal: "what is left for biometrics?"
   - Expected: the child's step says it waits for the date of birth, with IRCC's ages and page.
   - Got: `Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, When to give biometrics: temporary residents).` The state is `cannot_start`. Seen on 6 cases, 68–83 ms per read.
   - Fees panel (screenshot): "Not counted yet", with the same ages. Held.
2. **Visitor visa, people aged 13, 14, 79 and 80 (alternate path).**
   - Expected: the step for 14 and 79, none for 13 and 80.
   - Got exactly that (`check_bk8_biometrics_ages.ts`, `check_vv_prepare.ts`). Held.
3. **Another pathway with its own biometrics line (18/60, Sample, cloned table).**
   - Expected: its own ages and page, with the Visitor visa's unchanged in the same table.
   - Got: 16 and 61 get no step, 18 and 60 get one, and the words name 18/60 and its own page. The Visitor visa stays at 14/79. Held.
4. **A pathway that lists no biometrics line (`fs.spouse`) (empty case).**
   - Expected: nobody gets a step, and nothing is borrowed from the Visitor visa.
   - Got: no step. Held.
5. **Bad data (error case).**
   - Expected: the combination is not derived, never shown with words like "(IRCC, undefined)".
   - Got:
     - A blank step: not derived.
     - An exemption source with no page: not derived.
     - Two lines for the same step in one combination: not derived.
   - Held.
6. **Shipped table across the change (recovery and regression).**
   - Expected: every combination derives exactly as it did on origin/main.
   - Got the same derived set and the same fees. Held.
7. **API suite for the prepare view.** `check_vv_prepare_store_api.ts` on :4436: 35/35.

## Break-it (15 minutes)
- **Mutations:** 9 changes to the rules (listed in `review.md`). The BK-8 suite caught every one.
- **A biometrics line without `step` (or a misspelt step):** it is charged, and the Fees panel says it waits, but nobody gets a "Give biometrics" step and no warning appears. Minor; see review m1.
- **Wrong role or two tabs:** not applicable. This change adds no route and no write.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The step and its words come from the case's own pathway (journeys 1 and 3). |
| Next step obvious | ½ | The words say what the step waits for. The step item itself is not on any screen (outside this row). |
| Plain words | 1 | "(IRCC, When to give biometrics: temporary residents)" replaces the internal rule number "(VV-R15)". |
| Feedback and state | 1 | The state is `cannot_start` with the reason. The Fees panel reads "Not counted yet". |
| Correct data | 1 | 14/79 is unchanged. Other ages follow the pathway's own line. The shipped derivation is identical. |
| Error recovery | ½ | Bad lines are refused, but a line with no step (m1) and an unsound row (breaker M3, already on main) both drop the step with no reason given. |
| Accessibility and screen sizes | ½ | No UI change. I did not walk a browser. The builder covered 1440 px only. |
| Speed | 1 | 68–83 ms per prepare read on the isolated copy. |
| Visual quality | 1 | The Fees panel is unchanged (screenshot). |
| Trust and sources | 1 | The words name IRCC's page. The table line keeps the canada.ca URL, the quote and the page date. The test line is labelled Sample. |

**Total 8.5/10, and no criterion scored 0. Pass.** Raising either ½ score is outside this row (it means rendering the step item on a screen). Fixing m1 would raise error recovery.

## Could not test
- A real screen reader, and widths of 400 and 1024 px. No UI changed.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- The acceptance packs on the checkpoint (left to CI).
