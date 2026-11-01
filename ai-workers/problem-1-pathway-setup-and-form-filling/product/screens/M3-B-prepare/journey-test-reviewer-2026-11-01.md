# Journey test, reviewer: M3-B prepare view (C6.12 + C11.6), commit c0e8dae2 (round 2)

1 Nov 2026, reviewer agent. Backend only: the journeys were walked over the API on a **fresh** isolated copy on :4433 (`xr_studio_rev_prep`), as the case officer's "Prepare application" screen would call it. Release 2 came from pack 4's own setup this time, with no data changes. No screen yet, so there is no browser walk, axe check or screen-size pass. US$0, no live AI. Round 1 (0d8097f6) scored 8/10; git history keeps it. The persona is the case officer unless stated.

## Journeys
1. **Main: a visitor family of four** (C6.12-1…9). Held: 4 `files_own` filings and 1 family group that can be split. Visitor visa CAD 400. Biometrics CAD 170 for the three people aged 14–79; the child of 10 is exempt with IRCC's words. Each line has its source.
2. **Alternate: a family of six, split one out with a reason** (C6.12-10…14). Held: CAD 500 once on the principal's filing. With no reason, a 400 names the maximums lost (from the one fee rule). After the split: 500 + 100 and 170 + 85, and every filing id is kept.
3. **Channel per form** (C11.6). Held: the line's channel, what IRCC accepts and the signature that follows. Online on IMM 5476 is a 422 with IRCC's line. Paper needs a reason. The change is for one person only; the same channel again changes nothing.
4. **Someone stops, then starts travelling, after a channel was chosen.** Held: the same filing and item ids, and PAPER kept.
5. **Waiting: a child with no date of birth.** Held: the fee line waits for the date (G15), and the biometrics step is kept as `cannot_start` with "Waits for the date of birth".
6. **Ages at the edges** (C6.12-15/16): 14 and 79 pay; 13 and 80 do not. Held.
7. **Wrong role.** Client 403, client B 403, author 403, no actor 401, another firm 404 on all three routes. Held. Another firm's `/activity` does not show these lines.
8. **Recovery: older version and double click.** A stale split or channel change gets 409. Held, also under races: 2 at once 200 + 409; 5 at once 200 + 4 × 409; a split and a channel change at once 200 + 409.
9. **Across the boundary: to readiness (C7.6) and recording (C8.2).** Stable filing and item ids, `status: NOT_STARTED`, `number: null`, and a readiness slot that says "not built yet". The hand-off holds.

## Data underneath
One row per filing, applicant, item and family group, with no duplicates under parallel reads. Rows are cascaded from the case. Audit lines name the actor, the role, the form and the short case id, with "(reason given)". I searched every audit row for the sample client values: 0 found. The reasons are kept on their rows. Roles are enforced on the server (`Runtime.reach`).

## Break it
- A reason with control, zero-width or direction characters: 400. A reason over 400 characters: 400. A non-string version: 400. A channel sent as a list: 400.
- Unknown UUIDs: 404. A document item's channel: 422.
- A read takes about 52 ms.
- One Minor: a newline in a reason is also refused (review n1).

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5; pack 4 24/24 and 14/14 on a fresh copy |
| Next step obvious | ½ | States and reasons on items; readiness is a stub (C7.6) |
| Plain words | 1 | Refusals name the field, the maximums lost and IRCC's lines |
| Feedback and state | 1 | `state`, `reason`, `waiting`, `changed`, `version` |
| Correct data | 1 | Fees, ids and groups right, also under races |
| Error recovery | 1 | 400/401/403/404/409/422 Problem Details; races give one winner |
| Accessibility and screen sizes | n/a → 1 | No screen in this item |
| Speed | 1 | About 52 ms per read |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | ½ | Every fee and exemption cites IRCC with its date; contract departures not yet stated (review m3) |
| **Total** | **9 / 10** | Passes (8+, no 0) |

Fixes that would raise the score: state the contract departures in the PR (m3); readiness from C7.6 for "next step".

## Not tested
No real screen reader or browser (no screen). There was no unaided walk by an intended user: D17 and D20 stay with the founder. canada.ca was not re-read.
