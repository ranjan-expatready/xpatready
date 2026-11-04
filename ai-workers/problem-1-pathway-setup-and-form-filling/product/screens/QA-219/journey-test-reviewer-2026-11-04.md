# Journey test, reviewer role: QA-219 (C3.5), 4 Nov 2026

Commit 5f50a5731. **Simulated walk.** As briefed, I started no copy or browser (the Mac has 8 GB and little disk). I judged the steps from the screenshots `screenshots/01`–`07` (1440 and 1024 px), the code, and the scripted replay `tests/check_qa219_merge_alias_browser.cjs`. That replay ran green twice on GitHub (runs 41822757967 and 41822773915, exit 0) and once locally (33/34; the one failure was the load-wait bug, fixed in this commit). D17 and D20 stay with the founder.

## Journeys (persona · goal · result)
1. **Main, author:** "Two forms ask the same phone number; make them one." Fields › Alt phone number › Merge into… › choose "Alternate telephone number" › reason › Send for approval. **Held.** The toast says the field "stays as it is until a second person approves". The page shows "Waits for a second person" with a link (shot 04). The DB has one PROPOSED row and its change set is `waiting`.
2. **Main, approver:** the link opens To review › the merge › Approve the merge. **Held.** The row is APPLIED by user-B (shot 05).
3. **Across the screen boundary:** back on the field that stays, "Merged in: Alt phone number · approved by Approver · reason" and its other names. The field that went away links to the one that stays. **Held** (shots 06, 07). On the merged page the Retired notice contradicts the merge (review Minor 2).
4. **Alternate, author:** "Let 'Second phone number' find this field." Add another name. **Held:** it applies at once, shows as a pill and is logged in the activity.
5. **Error, duplicate name:** "Phone number" is refused on the control in the other field's name, with what to do instead ("merge them instead"), and nothing is saved (shot 02). The same text also appears as a toast, which repeats the message but is harmless.
6. **Error, short reason:** "Same" gets "At least 10 characters" on the field and Send stays off. **Held.**
7. **Wrong role:** the proposer approving its own merge gets 403 on the server. **Held** (by API in the check; the UI path was not walked).
8. **Recovery:** typing again clears the refusal. A stale preview shows "look again" and refetches. Opening the page while a merge waits can briefly offer "Merge into…" before the merges list loads; the server still refuses (review Minor 1).
9. **Empty:** "None. Another name lets a form's wording … find this field" teaches the feature (shot 01). **Held.**

## Break it (from the code)
* Two proposals at the same moment: the unique pending index gives 201 and 409 (`check_forms_channels.ts`). The race message still names the key (review Minor 3).
* An alias equal to another field's confirmed name is refused, but no test proves it (review Major 1).
* An alias on a merged field: hidden on the page; the server answers 409 "merged into "<name>": add the name there".
* Very long text: the inputs cap at 200 (name) and 1000 (reason), matching the server. Non-English text was not tried.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All four tasks were done on the product's own screens; CI exit 0 twice |
| Next step obvious | 1 | The waiting notice links to To review; the merge hint says what happens (shot 01, 04) |
| Plain words | ½ | Refusals use field names; the race and stale-field refusals still show keys; the merged page says "Restore it" (shot 07) |
| Feedback and state | ½ | Waiting, merged-in and merged-away are all drawn; the merges list has no loading or failed state |
| Correct data | 1 | DB checks: alias stored once, one merge row, `waiting` then APPLIED by user-B, old key kept as a redirecting name |
| Error recovery | 1 | Refusals sit on the field and clear when typing; Send stays off until the check passes; a stale preview refetches |
| Accessibility and screen sizes | ½ | axe A/AA and 1024 px with no sideways scroll on 7 states; keyboard-only, 200 % zoom and 400 px not checked |
| Speed | ½ | Not measured against STANDARDS §9; the whole journey ran in 56 s on CI |
| Visual quality | 1 | Team cards, notices and pills; calm layout at both widths |
| Trust and sources | 1 | Proposer, approver and reason are shown; the preview says "Made by a person"; AI-proposed pills unchanged |

**Score: 8/10. Pass** (8 or more and no 0). To raise it, most valuable first: hide the merge row until the merges list loads and show its failure (feedback); drop the Restore notice and Retired pill on a merged field, and use names in the remaining refusals (words); add a keyboard-only and 400 px pass to the check (accessibility); add timings to the check (speed).
