# Journey test, reviewer: M3-B prepare view (C6.12 + C11.6), commit 0d8097f6

1 Nov 2026, reviewer agent. Backend only: the journeys were walked over the API on the isolated copy :4433 (`xr_studio_rev_prep`), as the case officer's "Prepare application" screen would call it. There is no screen yet, so there is no browser walk, axe check or screen-size pass. Release 2 came from pack 4's setup after I broke a display-order tie in my own database (review N1). US$0, no live AI. The persona is the case officer unless stated.

## Journeys
1. **Main: a visitor family of four** (C6.12-1…9). Goal: "what applications, what do we pay?" Expected and held: 4 `files_own` filings and 1 family group that can be split. Visitor visa CAD 400. Biometrics CAD 170 for the three people aged 14–79; the child of 10 is exempt with IRCC's words. Each line has its source.
2. **Alternate: a family of six, then split the 15-year-old out with a reason** (C6.12-10…14). Held: CAD 500 once on the principal's filing. Without a reason the split is a 400 that names the maximum lost. After the split: 500 + 100 and 170 + 85, and every filing id is kept.
3. **Channel per form** (C11.6). Held: each form starts on its line's channel, with what IRCC accepts and the signature that follows. Online on IMM 5476 is a 422 quoting IRCC's line. Paper needs a reason. The change is saved for one person only, and the combination line does not move.
4. **Someone stops, then starts travelling, after a channel was chosen.** Held: the same filing id, the same item ids, and the channel kept (PAPER).
5. **Empty / waiting: a child with no date of birth.** The fee line waits for the date (held, G15). The biometrics step is missing without a word (review m2).
6. **Ages at the edges** (C6.12-15/16): 14 and 79 pay; 13 and 80 do not. Held.
7. **Wrong role.** Client 403, client B 403, author 403, no actor 401, another firm 404 on all three routes, malformed ids 404. Held.
8. **Recovery: an older version.** A stale split and a stale channel change each get 409 "Reload". Held one at a time. **Fails under a race:** two splits from one read both got 200 (review M1).
9. **Across the boundary: to readiness (C7.6) and recording (C8.2).** Stable filing and item ids, `status: NOT_STARTED`, `number: null`, and a readiness slot saying "not built yet". The hand-off holds.

## Data underneath
One row per filing, applicant, item and family group. Parallel first reads did not create duplicates. Rows are cascaded from the case and cleared by demo reset. An audit line for split and channel names the role, the form and the short case id. The reason, however, is in the split summary and in the channel detail (review M2). Roles are enforced in `Runtime.reach` on the server.

## Break it
Two parallel splits of different filings: **both 200**, leaving an empty family group (Major). The same filing split twice: 200 then 409. A 401-character reason, a non-string version and a blank reason: 400 each. Unknown UUID group or item: 404. A document item's channel: 422. A read takes about 59 ms.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4 correct; pack 4 24/24 and 14/14 once release 2 exists |
| Next step obvious | ½ | States and reasons on items; readiness is a stub (C7.6) |
| Plain words | 1 | Refusals name the field and the family maximum lost; IRCC's own lines |
| Feedback and state | 1 | `state`, `reason`, `waiting`, `channel_changed`, `version` |
| Correct data | ½ | Fees and ids right, but the split race leaves an empty family group (M1) |
| Error recovery | ½ | 400/403/404/409/422 Problem Details; a 409 is missed under a race (M1) |
| Accessibility and screen sizes | n/a → 1 | No screen in this item; not held against it |
| Speed | 1 | About 59 ms per read |
| Visual quality | n/a → 1 | No screen |
| Trust and sources | ½ | Every fee and exemption cites IRCC with its date; the audit log keeps the free-text reason (M2) |
| **Total** | **8 / 10** | Passes (8+, no 0) |

Fixes that raise the low scores, most valuable first: re-check inside the split lock (M1); keep the reason out of the audit (M2); a waiting biometrics step (m2).

## Not tested
No real screen reader or browser (no screen). There was no unaided walk by an intended user: D17 and D20 stay with the founder. canada.ca was not re-read.
