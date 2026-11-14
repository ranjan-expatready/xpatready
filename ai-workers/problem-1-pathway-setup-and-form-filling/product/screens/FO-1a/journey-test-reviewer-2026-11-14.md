# FO-1a journey test: reviewer, 14 Nov 2026 (commit 5f88dc133)

FO-1a is schema and seed only: no screen and no route. The "user" here is the next builder (FO-2, FO-2b, FO-3), writing through these tables what a firm's staff and visitors will do. I played each journey as SQL in the shapes those rows will write, on a scratch database with every migration, plus an isolated copy on **:4431** (finished story loaded). No browser, axe or screen widths: there is nothing to show.

## Journeys
| # | Persona and goal | Steps (as data) | Expected | Result |
|---|---|---|---|---|
| 1 | A firm owner signs up and the front office is ready | `firm.created` delivered twice at once, then the catch-up | 16 stages, 13 reasons, 1 form (off), services, once | Held (suite and my run on :4431; second run changed nothing) |
| 2 | A visitor sends the web form | receipt PENDING, person, lead (gets `L-00001`), attribution, receipt CREATED | one of each; number set by the database | Held |
| 3 | The same post is retried (slow network) | same intake key again, `ON CONFLICT DO NOTHING` | one receipt, one lead | Held |
| 4 | The same person enquires again while the first lead is open | second lead on the same person | two OPEN leads | Held |
| 5 | Staff close a lead as spam, then reopen it | CLOSED with a LEAD_CLOSE reason; a lost reason refused | refused without a reason or with the wrong list | Held |
| 6 | Staff engage (Individual), move, mark lost, then won | stage of own pipeline; LOST needs a reason; WON needs `won_via` | each rule enforced | Held |
| 7 | Staff engage as Corporate, later make the signatory the primary contact | company, PRIMARY link, prospect; then swap the primary | the swap is possible (AG-2-77 rule 6) | **Failed**: every order is refused (review M1) |
| 8 | Wrong firm: firm A names firm B's person, stage or staff | inserts across firms | refused | Held (composite keys, owner trigger) |
| 9 | Twenty staff create leads at the same moment | 20 parallel transactions | L-00001…L-00020, no repeat | Held |
| 10 | Booking by a person with an open prospect (handed to FO-3) | arrival keyed `booking:<id>`, no lead | receipt completed with no lead | **No outcome fits** (review m5) |

## Break-it pass (15 min)
* Prospect history: a stage move on a CORPORATE prospect naming INDIVIDUAL stages was accepted (Minor, m3).
* Person consistency: a receipt (lead L of person A, with person B) and a note (on lead L, about B) were accepted (Minor, m4).
* Staff deleted: a staff row with no grants could be deleted while it owned a lead, leaving the owner pointing at nothing (Minor, m2).
* Data: on the finished-story copy the seeded services read "Outside Canada" and "With an LMIA – inside Canada", unclear to a visitor (Minor, m6).
* Very long or non-English text: the columns are plain `text` with no limit. Nothing was cut; nothing to break here.

## Score (adapted to a schema row: each criterion judged for the builder who writes through it)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | 9 of 10 journeys store; J7 cannot |
| Next step obvious | 1 | each refusal names its rule and card (e.g. "a lost prospect needs a reason (AG-2-44)") |
| Plain words | ½ | seeded service names (m6) |
| Feedback and state | ½ | the receipt outcome has no state for J10 (m5) |
| Correct data | ½ | numbers, keys and seed exact; m3/m4 accept rows that do not agree |
| Error recovery | 1 | a rolled-back insert gives its number back; seed retries safe; a FAILED receipt can be retried |
| Access (stands in for accessibility and screen sizes) | 1 | every link between front-office rows is firm-keyed; cross-firm refused (J8) |
| Speed | 1 | indexes for Unassigned, timeline and match; suite 15 s; checkpoint 166 s, unchanged |
| Consistency (stands in for visual quality) | 1 | follows PF-3's pattern: area file, triggers at the end of the migration, recorded rollback |
| Trust and sources | 1 | every seeded label traced to AG-02; Sample marked |

**8/10, no criterion at 0: passes the journey bar.** The open Major (M1) still blocks the row on its own. Fixes that raise the low scores, most valuable first: M1 (deferred primary-contact checks); m5 (a no-lead outcome); m3/m4 (tie the pipeline and person keys); m6 (program name in the service label).

Not tested: a real screen reader or a user's own walk (D17/D20 stay with the founder); a copy of the real :4400 demo database.
