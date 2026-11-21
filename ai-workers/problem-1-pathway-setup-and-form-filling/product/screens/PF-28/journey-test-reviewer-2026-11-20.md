# PF-28 part 1: journey test, reviewer role, 20 Nov (PR #2619, head 56d2d6bc2)

**Scope:** API only. Part 1 adds an input rule, a body limit and a sweep, and builds no screen. The people below are the clients of the doors. I walked them with HTTP calls on the isolated copy `rev2619` (:4591, `PLATFORM_IDENTITY=local`, Owner token from `user-R`), started and stopped in one command each time. Live AI off, US$0.

## Journeys
1. **Firm staff send a request that is too large.** A 1 MB note on `POST /api/platform/offices` answers 413 with "This request is larger than this address takes. Nothing was saved or started." Nothing is stored. **Held.**
2. **A visitor sends a long web form.** 33 KB on `/api/public/forms/:token/submissions` answers FO-2's own 413, "This form is too long…". **Held.**
3. **Staff send a field the door does not know.** On the strict door `POST /api/platform/complaints/:id/handler`, `pf28Unknown` answers 422 with that field named, and nothing is stored. **Held.**
4. **Staff send the wrong type.** Under `parseInput`, `{name: 123}` answers 422 with `name`, but the words are "This is required.". **Wrong words** (review M2).
5. **Staff send a broken body.** Malformed JSON answers 400 `BODY_NOT_JSON` with nothing echoed. No body, empty JSON and 20,000 levels of nesting each answer 422 on the strict door, never 500. **Held.**
6. **The wrong firm uses a link.** Another firm's staff id answers the same 404 as a non-uuid id. **Held.**
7. **A visitor, with no token, uses the public booking door.** Its body and query probes all answer 404, because the sweep invents the firm key and slug. The breaker showed that an unknown query field on a real public type answers 200. **Not proven** (review M1).
8. **A later builder adds a door that fails.** The sweep goes red and names the door. Adding it to the allow-list with a valid part label turns the sweep green again. **Partly held** (review m1).

## Data underneath
I read exact row counts of every table before and after the sweep. The only changes came from the sweep's own sign-in (`audit_event`, `platform_session_revocation`) and the first messages read (`msg_firm`). No probe wrote anything.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The sweep runs 20/20, but 65 probes pass on a 404 without the body being read (M1) |
| Next step obvious | 1 | Every failing door is listed with its fix part and area |
| Plain words | ½ | The 413 and 400 words are plain, but a wrong type is worded "This is required." (M2) |
| Feedback and state | 1 | Problem JSON, `code`, `fields`, and "Nothing was saved" |
| Correct data | 1 | Nothing stored in any table after 424 probes and the breaker inputs |
| Error recovery | 1 | No 500 across 424 probes and the hostile bodies |
| Accessibility and screen sizes | ½ | N/A for the API. The DW8 browser suites are not yet pasted |
| Speed | ½ | Not timed. No probe hung, and the whole sweep finished in one run |
| Visual quality | ½ | N/A (no screen) |
| Trust and sources | 1 | 256 KB labelled Sample, the ruling cited, DW6 honestly NOT TESTED |

**Total: 7.5/10, no 0. Fails the bar of 8.**

The fixes worth most:
1. Real ids in the probes, or 404 counted as NOT TESTED (M1).
2. Correct wrong-type words (M2).
3. Paste the DW8 browser results.

**Not tested:** a real screen reader, an intended user's unaided walk (D17 and D20 stay with the founder), and the browser suites.

## Round 2 (head aeeb5f07, diff only)
| Journey | Before | Now |
|---|---|---|
| 4 (wrong type) | Wrong words | "This must be text." The missing case still says "This is required.". **Held** |
| 7 (public booking) | Not proven | Real `sample-firm` key, and listed `unreached` until the sweep can reach the door. **No longer falsely green** |
| 8 (later builder) | Partly held | The list is capped at 71/220 (`<=`, review r2-m1) |

Task completed goes to 1, and plain words to 1. **Score: 8.5/10, no 0. Passes the bar of 8.**
