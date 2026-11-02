# Journey test: C6.9 part 1, eligibility gates on the release (reviewer, 2 Nov 2026, head 5120b6f2)

Isolated copy `c69rev` on :4437 (never :4400); live AI off; US$0. Part 1 has no screen: the gate-authoring screen is "Not built" (P-26). So the journeys were walked through the routes the setup and the Review tab use, as the simulated people, and the data was read in the database. No browser walk was possible: nothing in part 1 is visible, and the worktree has no web build.

## Journeys (main path first)
1. **Content publisher (author), main.** "Put Visitor visa's hard rules on the draft." S7 body: 2 gates with no `subjectKind`, 4 judgement lines, no disclaimer → 200, version 1. Stored with `subjectKind: PERSON`. Held.
2. **Content reviewer and approver, across the boundary into release.** S8: submit, then the SME signs off the 4 "Eligibility" lines, then a second person approves. Release 2's snapshot has `eligibility {gates, judgement, disclaimer = Sample default}`. Release 1 has none and re-hashes to its stored sha. Held.
3. **Author, alternate.** Relabel a gate with the current version → 200, version 2; one audit row with `before`/`after`; a "changed" Eligibility line that blocks approval until signed. Held.
4. **Author, error: bad input.** Empty body, `gates:"x"`, a 161-character label, a whitespace disclaimer, `version:"2"`, `judgement:[5]`, `subjectKind:"CASE"`. Each → 400 Problem Details on its field, in plain words. Held.
5. **Author, error: stale.** A save with no version or an old one → 409 "Configuration author saved these eligibility gates at 01:29 UTC. Reload their version, then make your change again." It carries `current`. Held.
6. **Wrong role.** Case officer → 403 on GET and PUT. Client → 403. Content reviewer PUT → 403 (author duty). No actor or an unknown actor → 401. Malformed or unknown id → 404. Held.
7. **Recovery: double click / two tabs.** 6 identical PUTs at once at the same version → one 200 and five 409s. The stored version moved by exactly 1, with one audit row. Held.
8. **Author, release check.** A gate on a library fact nobody is asked → the draft lists "This gate reads "…biometric…", which no case of this application is asked" and submit is refused. Held.
9. **Author, release check on a derived fact.** A gate on `person.nomination_days_until_expiry`, whose input is placed nowhere → saved 200, and **the draft lists no problem**. **Failed** (Major, `engine/eligibility-gates.ts:83`; see `review.md` issue 1).

## Data underneath
- `combination.eligibility` matched the body exactly, including non-English text.
- Each successful save wrote exactly one `audit_event` row (`entity='eligibility'`, 2 rows after 2 saves); the 409s wrote none.
- Another combination's draft sha was unchanged.
- The trigger refuses an UPDATE on `assessment`; the rollback ran clean and re-deploy restored it.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | S7 and S8 PASS; release 2 carries the gates |
| Next step obvious | ½ | Refusals name the fix ("Reload their version…", "Ask it in this application's questionnaire…"); no screen yet to show a next action |
| Plain words | 1 | Field messages in plain words; the release check names the fact by its meaning |
| Feedback and state | 1 | Version, `savedBy` and `savedAt` on every answer; a 409 carries `current` |
| Correct data | ½ | Race-safe and exact, but an unanswerable derived gate passes the release check (journey 9) |
| Error recovery | 1 | 400 on the field for each bad input; 409 with the current version to reload |
| Accessibility and screen sizes | ½ | Not applicable in part 1 (no UI); untested, so not scored as met |
| Speed | 1 | GET about 12 ms; PUT about 12 ms; draft with problems about 0.2 s |
| Visual quality | ½ | Not applicable in part 1 (no UI) |
| Trust and sources | 1 | Labels and disclaimer marked Sample; ASSUMPTIONS C8/C9; "Unconfirmed: no counsel" kept |

**Score: 8/10. Pass (8 or more, no criterion at 0).**

Most valuable fixes:
1. Correct data: refuse a gate on a derived or otherwise unasked fact at release, with a fail test.
2. The UI criteria are scored in part 3.

## Could not test
- A browser walk, keyboard, 1024 px, 200 % zoom and axe: no UI until part 3.
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- The canada.ca quotes (not reachable).
