# Journey test: QA-312 (C6.9 pack, the client re-confirms before -18), reviewer, 8 Nov

Commit 4dfbde1003daeb2ff105f2bc8dc8c298800f29e3. The diff changes the acceptance pack only (6 added lines in `acceptance/C6.9.test.ts`). No page, route or engine changed, so this is the journey the pack walks, driven through the product's own routes on its own copies on :4436. All values Sample. US$0, no model call.
* Gate B `GATE_B_DATA=checkpoint`, name `revc69`.
* A reviewer probe on copy `revc69p` (start, Load the configured checkpoint, probe, stop in one command). The probe is in the scratchpad and is not committed.

## Journeys (persona · goal · expected)
1. **Main path.** The case officer records the client's three deciding answers by phone (passport number, expiry, convictions = No), confirms each section, and the client re-confirms the background answer. Goal: "the case check stops saying it rests on unconfirmed answers". Expected: Qualifies, resting on nothing.
2. **Alternate (the state before the client acts).** After Confirm section only. Expected: Qualifies still rests on `person.criminal_history` (P-244).
3. **Wrong role.** The officer tries to re-confirm on the client's behalf. Expected: refused, and the line stays.
4. **Error.** The client tries to re-confirm a non-background officer answer (passport number), then re-confirms the same answer twice. Expected: both refused.
5. **Recovery / across the boundary.** The officer changes the background answer after the client's re-confirm. Expected: it waits for the client again (the pack's step does not switch P-244 off).

## What held
* J1: gate B is 21/21, exit 0 (117 s: copy 4, checkpoint 111, run 2). Probe-e: re-confirm gives 201, "Re-confirmed: it is your own answer now." Probe-h: Qualifies, `restingOn` is `[]`.
* J2: probe-b: after `confirmAll`, exactly one answer has `awaits_client`: `person.criminal_history`, channel `agent_view`, `confirmed:false`. Probe-c is the mutation with the new loop removed: -18's condition fails with `["person.criminal_history"]`, the same failure qa and the builder saw on main.
* J3: probe-d: the officer gets 403, and the answer still rests (d2).
* J4: probe-a: the passport number gets 409. Probe-f: a second re-confirm of the superseded answer gets 409.
* J5: probe-i: the officer's new answer has `awaits_client:true` again, with the words "Recorded by the case officer: it fills the forms now and waits for the client to re-confirm it before signing".
* Data underneath (probe-g): one new version whose value is unchanged (`false`), `status DECLARED`, channel `client_reconfirm`, by `user-P`. It still names the officer's answer: `answered: agent_view by user-O`, and `officer` is kept. `confirmed:true`, `awaits_client:false`.

## Findings
* No Blocker or Major.
* Minor (the pack, not the product): the loop does not check the status of each re-confirm call (`acceptance/C6.9.test.ts:96`, as `lib/m3.ts:161` does not either). A refused call would show up only as -18 red naming the field. That is honest but one step removed from the cause.

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Gate B 21/21; probe-h rests on nothing |
| Next step obvious | ½ | The API's words name the next step ("waits for the client to re-confirm it before signing"); the client's screen was not walked (no UI change) |
| Plain words | 1 | The refusal and success messages read plainly (probe-d, -e, -f) |
| Feedback and state | 1 | 201 with a message; `awaits_client` goes from true to false; the officer mark is kept |
| Correct data | 1 | Value unchanged; one new version; the earlier one superseded; the officer's answer is still named (probe-g) |
| Error recovery | 1 | 403 for the officer; 409 for a second re-confirm and for a non-background answer; an officer re-entry waits again (probe-i) |
| Accessibility and screen sizes | ½ | Not checked: no page changed in this diff |
| Speed | 1 | Pack run 2 s; the whole re-confirm sequence took under 0.5 s on the copy |
| Visual quality | ½ | Not checked: no page changed |
| Trust and sources | 1 | The officer origin stays visible after the client's re-confirm (`answered`, `officer`) |

**8.5 / 10: pass (8 or more, no 0).** To raise it: walk the client's re-confirm on the questionnaire at 400, 1024 and 1440 px with axe, which belongs to C6.18's own check, not this pack fix.

Not tested: a visible-browser walk (no UI in the diff), a real screen reader, 200 % zoom, and an intended user's unaided walk (D17 and D20 stay with the founder).
