# C6.9 part 2 (eligibility runs): journey test, reviewer, 2 Nov 2026, commit fd26c492
Isolated copy `rev_c69` on :4439 (never :4400); live AI off; US$0. There is no page in this part, so I walked the journeys through the API the page will call, as scripted HTTP plus SQL reads underneath. No browser was used, and there is no axe, width or keyboard check. Scripts are in the scratchpad (`probe.mts`, `where.mts`, `pure.mts`).

## Journeys (persona: the case officer, unless marked)
1. **Main path.** First run for the principal with nothing answered → 201, POSSIBLY_ELIGIBLE, missing facts named. **Held** (C6.9-2…6).
2. **Facts added, with a conviction answered Yes** → re-run with a reason → POSSIBLY_ELIGIBLE. The gate is in `reviewGates`, not in `failedGates` (P-230 (1)). **Held** (C6.9-7; my probe as well).
3. **Answer corrected** → re-run → LIKELY_ELIGIBLE. The earlier run is byte-identical and marked out of date. **Held** (C6.9-8, C6.9-9).
4. **Confirm section** (new answer ids, same values) → the run is still up to date. I checked that the ids changed. **Held.**
5. **Error: running again with no reason, or a reason of spaces only, a line break or 301 characters** → 400 on `reason`, in plain words. **Held.**
6. **Wrong role:** a client gets 403 on POST, on the list and on GET one (real id). An author gets 403. Another firm's staff get 404. No actor gets 401. **Held.**
7. **Wrong person:** the case subject, a child with `applies: false`, or someone not on the case → 400 on `person`. **Held.**
8. **Recovery: a double click on Run** (two POSTs at once) → **broke.** There are 2 MANUAL rows, both without a reason (review M2).
9. **Data, alternate:** a gate on `relationship.start_date`, a fact asked once per case of the case subject, answered → **broke.** The gate reads Not met and the outcome is NOT_ELIGIBLE (pure repro with the real keying; review M1).
10. **Release with no gates** (release 1) → 409 "This application's release has no eligibility rules yet", and no row is written. **Held.**

## Data underneath
- There is one `assessment` row per run, and `result_json` is the envelope.
- An UPDATE is refused by the trigger.
- There is one audit row per run, with no answer value in its text.
- `ai_batch` is unchanged.

## Break-it pass
- Non-English reason → 201.
- Non-string `person` → 400.
- A malformed id on GET one → 404 for staff and 403 for a client.
- DELETE on `assessment` is allowed, by design: a case's deletion still removes its runs.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Run, list and read one all work. C6.9-1…10, 14 and 15 pass. |
| Next step obvious | 1 | Each refusal names what to do ("Give a reason for running again, such as 'Passport renewed'"). |
| Plain words | 1 | The refusals and the audit text are plain. The outcome words appear in the audit. |
| Feedback and state | 1 | The 201 returns the whole run. Out of date is shown with `changed[{fact, about, was, now}]`. |
| Correct data | ½ | M1: a false Not met on a once-per-case fact without the `case.` prefix. |
| Error recovery | ½ | M2: a double click gives a second run with no reason. |
| Accessibility and screen sizes | ½ | No page in this part (part 3). |
| Speed | 1 | The list answers in under 300 ms (5 runs). |
| Visual quality | ½ | No page in this part (part 3). |
| Trust and sources | 1 | Stand-in SI-1, rules as at, the disclaimer and who ran it are all on every run. No AI. |

**8/10, pass (no 0).** Fixing M1 and M2 raises it to 9. The UI criteria wait for part 3.
Not tested: a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
