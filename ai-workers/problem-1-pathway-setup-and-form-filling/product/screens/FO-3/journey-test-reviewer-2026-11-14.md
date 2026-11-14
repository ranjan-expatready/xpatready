# FO-3 journey test: reviewer, 14 Nov 2026 (commit cdb70253)

FO-3 is API only: no screen. The "user" is the person booking a free consultation from the firm's link. Their page does not exist yet, so I walked the public door over HTTP the way that page will call it. Staff routes are services until PF-4, so the staff journeys come from the suite only. I used the full app copy on http://127.0.0.1:4431 (database `xr_studio_runtime_fo3`, firm `sample-firm`, type `free-consultation`), never :4400. The suite ran in the integration copy (main + PF-0p #1752 + PF-L #1751 + FO-1a #1742 + this branch + the BOOKING_* names in events.ts): **80 passed, 0 failed**. With no screen, accessibility, screen sizes and visual quality are N/A.

## Journeys (main path first)
1. **Book a free consultation** (the person; goal: "book a free call with this firm"). Read the page (`GET …/book/free-consultation/slots`), wait, then post first name, last name, email, mode, time, zone, consent and the stamp.
   * Expected: 201, the time shown in my zone, a link to manage it.
   * Result: **held.** The page answer was 200 in 0.06 s (152 times over 14 days, labels in America/Toronto, the firm's consent sentence, no host named). The booking was 201 in 0.04 s, labelled "Tuesday, November 17, 2026 at 11:00 p.m. (Asia/Kolkata)" for a visitor in Kolkata with accented names.
   * **But** the answer also carries `staffId`, `personId`, `prospectId` and `typeId` (review M1).
2. **Someone else takes the time first** (alternate). A second booking for the same slot got 409 "That time was just taken" with fresh times. **Held.** The 20-at-once race in the suite gave one booking and 19 × 409.
3. **Double click** (recovery). The second post gets "Someone else booked that time a moment ago", although it was me (review m9).
4. **Bad input** (error):
   * missing name, no consent tick, phone mode without a phone, a mode not offered, a filled honeypot, a forged stamp, a 1 s fill: all 400/409 in the suite. **Held.**
   * A first name with a line break: **500 "Something went wrong on the server"** (review m1).
5. **Wrong door** (wrong role / guessing): an unknown firm, an unknown slug, a malformed link and a well-formed but unknown link each gave 404 with a byte-identical body. **Held.** After 5 reads from one IP the suite's route check gives 429. **Held.**
6. **Reschedule by link**, then **reschedule again to the same time** (recovery: the person is unsure and confirms the same slot).
   * The first move: 200, sequence 1. **Held.**
   * The second: 200, still sequence 1. Two `booking.rescheduled` outbox rows now share the key `<id>:1`, two audit lines were written, and the previous link still opens the booking (2 of 3 tokens live in `fo_booking_token`). Read with `ports/jobs.ts:13-14,61`, its reminders and attendance question are cancelled and cannot be queued again (review M2).
7. **Cancel by link, then use the link again.** The cancel was 200 (CANCELLED, sequence 1). The reuse got the identical 404. **Held.** The cancel answer again carries `staffId`, `personId` and `prospectId` (M1).
8. **Inside 4 h, after the end** (suite, fake clock): canChange false with "reply to your confirmation email or call the firm"; a cancel or move gets 409 SELF_SERVICE_CLOSED; after the end the link gets the identical 404. **Held.**
9. **Across the boundary** (to staff and the pipeline; suite only):
   * Attendance is answered only by a person, and nothing marks a no-show by itself. **Held.**
   * A staff-made booking never moves the person's open prospect to Consult, and its `prospectId` is not checked (review M4).

## Data underneath
* `fo_booking`: `block_range` and `sequence` are the database's, and the app never writes them. `module_event` payloads carry ids only; `audit_event.detail` carries ids only (no email; checked on the live rows).
* Wrong: a second outbox row and audit line for a move that changed nothing, and a live old token (journey 6).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 5, 7, 8; suite 80/80 |
| Next step obvious | 1 | Every answer says what to do next (fresh times on 409, "reload the page", "reply or call") |
| Plain words | ½ | Plain throughout, but a double click is told "someone else booked" (m9) |
| Feedback and state | ½ | A move to the same time answers 200 "moved" while nothing moved and its reminders are gone (M2) |
| Correct data | ½ | Duplicate event key, old link live (M2); staff `prospectId` unchecked (M4) |
| Error recovery | ½ | A newline in a name gives 500, not a field error (m1) |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | Slots 0.06 s, book 0.04 s, link view 0.005 s |
| Visual quality | N/A | No screen |
| Trust and sources | ½ | Sample wording labelled and rules cited to AG-04, but the public answers leak the host and prospect ids (M1) |

**Score: 5.5 of 8 applicable = 6.9 / 10 (no criterion at 0). Below the 8 pass.** Fixes that raise it, most valuable first:
1. M1: return a public view without internal ids (trust).
2. M2: a move to the booking's own time writes nothing (feedback, data).
3. m1: refuse control characters at the form (recovery).
4. M4: check the staff `prospectId` (data).
5. m9: name the double click (words).

**Not tested:** a real screen reader or browser (no page yet); an intended user's unaided walk (D17/D20 stay with the founder); the staff routes over HTTP (PF-4 is not on main); a restart of the copy (the fake arrival and jobs are in memory by design until FO-2 and PF-14).

## Round 2 (4843bc16, :4431 restarted on it)
I re-walked journeys 1, 3, 4, 6 and 7 live, and ran the suite: 101/101.
* **Book:** 201 with no ids.
* **Double click:** "That time is not available any more".
* **Line break in a name:** 400 with the field named.
* **Same-time reschedule:** nothing written, same link.
* **Zone-only change:** the label is in the new zone, with one audit line and no event.
* **Move:** sequence 1, and the old link gives 404.
* **Cancel:** no ids; every link is voided.

| Criterion | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| Plain words | ½ | 1 | Neutral 409 text |
| Feedback and state | ½ | 1 | A same-time move answers the unchanged booking |
| Correct data | ½ | 1 | One event per change (`:0`, `:1`, `:2`), one audit line each, links voided |
| Error recovery | ½ | ½ | 400 for bad names now, but a failed confirmation email is still not retried (m3) |
| Trust and sources | ½ | 1 | Public answers carry no ids |

The other criteria are unchanged (task 1, next step 1, speed 1; three N/A). **Round 2: 7.5 of 8 applicable = 9.4 / 10. Pass.**
