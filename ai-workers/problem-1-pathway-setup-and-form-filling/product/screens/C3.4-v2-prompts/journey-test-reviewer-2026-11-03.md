# Journey test (reviewer role): C3.4 v2 prompts, commit 0df15a0f1, 3 Nov

Reviewer agent, did not build it. US$0. Copies :4454 (xr_studio_forms_c34ai) and :4452 (xr_studio_forms_c34live, live switch paired with the fake launcher), never :4400. This row has no screen (the Live or Saved entry is a later row), so the journeys go through the API the screen will call, plus the paid runner's step. No browser walk, no axe, no screen widths. Each suite ran twice: 58/58 both times; live 8/8.

## Journeys (persona · goal · steps · expected → result)
| # | Journey | Result |
|---|---|---|
| 1 | Main. Author: "draft IMM 5257's checks from the saved run". Plan Saved, then draft Saved | Plan names both rounds of one run at US$0; 201, 28 proposals (13 sections, 13 lists by rules; a check Ready with its printed words found; a document type), Sample, US$0 job and ledger |
| 2 | Alternate. Author on Visitor visa's guide 5256 | 201, 1 check on the combination resting on the guide's sentence, US$0 |
| 3 | Empty. Saved before anything is recorded | 409 in plain words ("No saved AI answer … recorded once in an approved Live run"), no job |
| 4 | Error. A run recorded with a v1 prompt (as #669's four) | Plan `available:false`, draft 409, no job, US$0 |
| 5 | Error. Live with the switch off | Refused before anything is read, no job written |
| 6 | Money. Live plan with the switch on (fake launcher) | Worst US$7.27 shown before anything runs (runner reserves 5.03); a missing or another plan's checksum is refused |
| 7 | Wrong role. A viewer drafts or reads the plan | 403 both |
| 8 | Recovery. The write fails after two paid rounds | Job FAILED, cost US$0.60 and both run files kept, "counted", Saved offered |
| 9 | Across the boundary. The paid runner's rerun on the Mac | Committed stub passes do not match the v2 path code: the launcher refuses Live until `--stub` runs (US$0, safe); worst per round 2.53/2.50/0.75/0.72, all under the US$5 cap |
| 10 | AI quality, simulated: what the rules make of v2-style answers on IMM 5257 | Both rounds `"* Yes"`: Ready. One round follows the worked example (`"Yes"`) or the code (`"Y"`): Check, "the two readings differ". The worked entry copied verbatim: dropped twice |

## What held
Saved and refused paths, roles, cost first, v1 never replayed, the cost kept after a failure, US$0 throughout. The rules guard the shape and the quote. A copied example never becomes an item.

## Findings (detail and fixes in `review.md`)
- Major M1: the choice-value rule points at `options_resolved`, which IMM 5257's 21 Yes/No boxes do not have (their pairs are under `options`), and the worked tree writes `"Yes"` right after the rule says `"* Yes"`. Journey 10 shows what follows: Check, not Ready.
- Major M2: the guide's "made-up" example ("purpose Other → details", "married → spouse name and date") is a check guide 5256 states. Both #669 rounds proposed it with the same field names. Both blind rounds get it in the prompt, so their agreement on it is primed.
- Minor: the guide prompt contradicts itself on comparisons (`:13,15` vs `:39,62`); the checker's usual cost is low (C3.4 usual about US$1.57, not 1.49); no rule checks a choice value against the box's choices (P-153).

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | US$0 wiring, jobs and tests complete; the prompts the paid rerun will read carry M1 and M2 |
| Next step obvious | ½ | Plan and refusals say what to do; no screen entry yet (API only) |
| Plain words | 1 | Refusals and notes in plain words (journeys 3, 4, 8) |
| Feedback and state | 1 | Job status, cost, run files and "counted" always given |
| Correct data | 1 | 28 proposals once; second click returns the one draft; US$0 in jobs and the ledger |
| Error recovery | 1 | Failure after paid rounds keeps cost and offers Saved; a cut answer is not retried |
| Accessibility and screen sizes | ½ | No UI in this row (not testable) |
| Speed | 1 | Suite 40 s for 58 checks; plan and draft answer at once |
| Visual quality | ½ | No UI in this row |
| Trust and sources | ½ | AI marked, Sample, quote found, file and SHA; Ready agreement primed by the example (M2) |

**7.5 / 10, no criterion at 0: below the pass mark (8).** What would raise it, most valuable first: fix M1 and M2 (task completed and trust and sources each to 1, giving 8.5); later, the Live or Saved entry on the screen (next step, accessibility, visual).

## Not tested
A real model on v2 (no paid call); a browser, keyboard, axe or screen widths (no screen); a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder).
