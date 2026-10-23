# Journey test — R1a (case, people, answers, Confirm section) · reviewer role, 23 Oct 2026

Commit `3a1eb930`, own copy on port 4434 (`xr_studio_runtime_rev`), after `setup_visitor_visa.ts` (10/10) and `check_runtime_r1a.ts` (59/59). This is a backend slice with no page yet (the renderer is R1c), so the journeys were walked over the API with curl as the simulated people: user-O is the case officer, user-P is Client A, user-Q is Client B, user-A is the author. Data was read from PostgreSQL after each journey. No paid AI.

## Journeys (main path first)
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 | Officer: "open a visitor-visa case for Client A" | POST /cases with an idempotency key | 201, pinned to the latest release | 201 in 137 ms, pinned to v2 with its sha; one case row |
| J2 | Officer: "add the spouse and a child" | POST /people ×2 | 201 each; relationship edges | 201 ×2; a client adding a person gets 403; a missing name gets 400 with a field error (default zod words) |
| J3 | Client A: "answer my own and my family's questions" | GET questionnaire (SQR), then PUT 7 answers including the spouse's | Saved; client fields only; own answers count as confirmed | 200 at about 110 ms each; "Saved. It fills IMM 5257 for … (1 box)"; spouse's answer "waits for the officer's Confirm section" |
| J4 | Officer: "review everything in the agent view" | GET ?mode=agent | All facts with source, why and fills | 200 in 165 ms, 531 KB, 377 questions; each answer has channel, actor and why |
| J5 | Officer: "enter the passport from the document and confirm the section" | PUT passport facts, then POST confirm for travel_document | Unconfirmed until confirm, VERIFIED after | as expected: 3 confirmed and 11 still missing listed; client confirm gets 403 |
| J6 | Officer and client: "change a fact" | Officer edits the date of birth and the client's email; client edits the spouse's status after it was confirmed | New version; history kept; reconfirm needed | History kept (2 rows, 1 current), and the officer's edit needs reconfirming. **But** the officer's next Confirm verified the client's new value unseen (review Must 2) |
| J7 | Wrong role | Client B on A's case; author on a case; client opens the agent view; client types a passport number | 404 / 403 / 403 / 403 | as expected. **But** `GET /api/activity` shows A's case activity to Client B and to a caller with no login (review Must 1) |
| J8 | Bad input | Stale `expectedId`; unknown field; case fact on a person; bad UUID; object into text; 2 MB text | 409 / 404 / 422 / 400; saved and flagged; refused | All as expected except the 2 MB text, which was saved, after which every view was 2.6 MB (Major 6). Free text into a choice with no list was accepted unflagged (Major 5) |
| J9 | Recovery | Same key 5× in parallel; 5 parallel spouse adds; 2 parallel child adds; 3 parallel rows; rerun with reset | One case; no over-limit; rows ordered | One case (4 retries got 409, not the case); 1 spouse; 1 lawful child refused "Already exists"; row orders 0, 0, 1; reset 60/60 |
| J10 | Boundary to R1c and R1d | Read the SQR view as the renderer will | A complete, answerable questionnaire | The principal gets 93 client questions: 34 fill no box, several duplicate a filled fact, and "details" questions are required after "no" (Majors 3 and 4); 293 missing on a new case |

## What held
Release pin frozen (RT-2). Append-only answers with one current per fact, enforced by the database (RT-5). The P-72 rule, including the minor-child edge (RT-10). Every save names the forms and people it fills (RT-11). Cross-client 404 and configuration 403 (RT-12). No answer value or name in the audit trail or the log (RT-17). Times stayed under 350 ms throughout.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 all completed through the product's endpoints |
| Next step obvious | ½ | `missing` and `why` are returned, but 360 missing on the case (inflated by irrelevant and always-required questions) hides the real next step |
| Plain words | ½ | Messages are mostly plain; zod defaults on missing fields; field keys in the audit summaries |
| Feedback and state | 1 | Saved message names forms and people; 409 returns the newer value; confirmation reason on every answer |
| Correct data | ½ | History and currency are correct, but Confirm verifies unseen values, choices accept free text, and the same fact is stored under two keys |
| Error recovery | ½ | Stale save is recoverable; the confirm race has no recovery; a concurrent lawful add gets a misleading "Already exists" |
| Accessibility and screen sizes | n/a | No page until R1c |
| Speed | 1 | 73–165 ms per view and about 110 ms per save with sample data |
| Visual quality | n/a | No page until R1c |
| Trust and sources | 1 | Every fact shows channel, actor, time and why; the replay is labelled scaffolding |
| **Total** | **6 / 8 applicable = 7.5 / 10** | **Below the pass mark of 8.** No criterion at 0. Two criteria cannot be scored until R1c |

## Fixes that raise the score (most valuable first)
1. Correct data and error recovery: Confirm carries the answer ids shown and returns 409 on change (Must 2). Give the 10 choice and country questions answer lists, or flag them (Major 5).
2. Next step obvious: drop or justify the questions no form reads and merge the duplicates (Major 3). Add "details after yes" conditions (Major 4).
3. Plain words: write own messages for missing body fields; keep field keys out of user-facing text.
4. Wrong role: refuse `/api/activity` to clients and to callers with no login (Must 1).

## Not tested
Browser, keyboard, axe, 390/1024/1440 px and 200% zoom (no page). A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Fill and the PDF (R1d).
