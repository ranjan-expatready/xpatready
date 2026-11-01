# Journey test (reviewer): C3.6 "Add the fact this rule needs", round 4, commit 0425ca6e

Reviewer agent (did not build it). Isolated copy `rev_c36r4` on :4456 (sample inputs loaded, stopped after); :4400 and the builder's ports not touched; no model calls (US$0). Scripts: `/tmp/rev_c36r4/` (outside the repo).

Journeys 1–9 of round 3 are unchanged by this commit. They are covered again by the builder's check (42/42 on my copy, twice) and not re-walked by hand. This round walks the fixed routes.

## Journeys
10. **Rule reading a retired field (MA3), author, keyboard, 1024 px:**
    * Steps: retire `person.biometrics_required`; save a rule reading it (201); Questionnaires › its row › "Add the fact this rule needs" › fill › Propose.
    * Result: 409 in under 0.1 s, shown in the row's alert: "person.biometrics_required is a retired library field: restore it in Library › Fields, and the rule can read it again." No waiting item is written. Held.
    * After a restore, the same add says "already in the library: the rule can use it as it is". Held.
    * Focus falls to `<body>` after the refusal on this row (m8). axe: 0 violations.
11. **Lander, key retired after proposal:** a waiting item for `person.zz_probe`, then a retired field with that key. Accept gives 409 "person.zz_probe is a retired library field: reject this one and restore it in Library › Fields." True and actionable. Held.
12. **Retired name in another group (m6):** "Criminal History" retired as a `person.` field.
    * Same name for the person subject: refused, naming the restore. Held.
    * Same name for the sponsor subject: proposed, and landed as `sponsor.criminal_history`. Held.
13. **One waiting name across both routes (m7):**
    * A first-route ("new fact") item waits, then the per-fact route uses the same name (different case): 409. Held.
    * The reverse order also gives 409. Held.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every route ends in a landing or a true refusal; no dead end left |
| Next step obvious | 1 | Each refusal names the action (restore in Library › Fields, decide on Proposals) |
| Plain words | 1 | The MA3 messages are true now |
| Feedback and state | 1 | Alert in the row; nothing written on a refusal |
| Correct data | 1 | No waiting item that can never land; one waiting item per name across both routes |
| Error recovery | 1 | Retired: restore, then the rule reads it |
| Accessibility and sizes | ½ | Per-fact row refusal drops focus to the page body (m8); axe clean |
| Speed | 1 | Under a second |
| Visual quality | ½ | Long, ungrouped rule select (m3, open by choice) |
| Trust and sources | 1 | Sample, not meaning-checked, "Needed by Rule …", second person |

**9/10, pass (no 0).**

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); 400 px and 200 % zoom (layout unchanged since round 2).
