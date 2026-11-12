# QA-395 journey test (reviewer role, the one score for this check), PR #1566 head c6a0c7636

11 Nov 2026. Isolated copy `forms_rv5` on :4457, configured checkpoint (release 2), headless Chromium through `acceptance/lib/browser.ts`. The scripts were in the reviewer's scratchpad and are not committed. Sample data only, live AI off, US$0.

Persona: the case officer preparing Sample Client A's visitor visa. Goal, in the officer's words: "Make the IMM 5257 copy, and make sure Question 8 A says what the client's history really means."

## Journeys
| # | Journey | Steps | Expected | Result |
|---|---|---|---|---|
| J1 | Main: the person's own country | Client answers India, 2015-01-01 to 2015-01-01; officer confirms; opens `/cases/:id` at 1440 px; focuses "Generate a new copy", presses Enter | Q8 A = N | PDF read back: **N**. The row updated by itself, about 4.6 s to "read back and checked". No Q8 A line on the by-hand or mandatory lists. |
| J2 | Alternate: a qualifying stay | Kenya, 3 years ago to 1 year ago | Y | **Y**. Table Row 2: Country 132, dates written. |
| J3 | Empty part: no end date | Kenya, from 3 years ago, no end date; at 1024 px | Left to a person, with a reason | PCRIndicator empty. Header pill "1 mandatory form field left empty". "Marked mandatory … (1): Question 8 A … filled by hand: … an entry lacks its country or dates … a person checks the entries and decides Yes or No". The copy: "To write by hand in Adobe: A country or territory where the person previously resided ("Question 8 A …")". |
| J4 | Error: dates typed backwards | Kenya, from 2025-11-11 to 2023-11-11 | Refused, or left to a person | **Accepted, PDF Q8 A = N, no line anywhere** (review M1). |
| J5 | Error: own country spelled differently | "Indian Republic", 2 years | N, or a person decides | **Y**. The table's Country goes by hand ("not in the box's option list"), so the officer sees the row (review m4). |
| J6 | Recovery: the answer changes after a copy | J3 after J2 | The old copy is marked out of date | The banner reads "Out of date … Facts changed since this copy was made … End date of the status in a previous country of residence, Entries in "Personal details"". |
| J7 | Across the boundary: the Online sheet | — | — | Not walked: #1563 is not merged. The C7.3 pack is 17/17 on this head. |

## Data underneath
Each copy's PDF was read back with the E5 reader (`p1/e5_roundtrip.py`). PCRIndicator held N, Y, (empty), N and Y as listed. The stored copy carries `counted` and the reason (`fill-case.ts:322`). The fill report records `why` for written counted boxes. No other value in the table changed between J1 and J2 apart from the country and dates.

## What held
The words come from the form itself. The screen updated without a reload. A null answer shows in both places the officer looks: the readiness pill and list, and the copy's by-hand line. Keyboard Enter on "Generate a new copy" works. No sideways scroll at 1440 or 1024 px. No page errors (`errors: []`).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1-J3: N, Y and by hand as the form's words say |
| Next step obvious | 1 | J3: "a person checks the entries and decides Yes or No", on the readiness list and on the copy |
| Plain words | ½ | J3: the copy labels the line with the detail's question, not Q8 A, and the reason does not name the entry or what is missing (m6) |
| Feedback and state | 1 | J3 pill and list. J6 out-of-date banner. The copy line updates by itself. |
| Correct data | ½ | J4 gives N on dates typed backwards (M1). Month-end rollover (m2). |
| Error recovery | ½ | J3 recovers by adding the date. J4's bad input is not caught at all (M1). |
| Accessibility and screen sizes | ½ | Keyboard Enter works. 1440 and 1024 px have no sideways scroll. axe, 400 px and 200 % zoom not run. |
| Speed | 1 | First view 1.3-1.6 s to network idle (this includes Playwright's 500 ms quiet window). Copy in about 4.5 s, asynchronous with a toast. Page unchanged by this PR. |
| Visual quality | 1 | Screenshot at 1024 px: team pills, folds and type; nothing overflows |
| Trust and sources | 1 | The reason quotes the form's own question. The partial-overlap reading is marked "Unconfirmed: immigration expert" in the data. |
| **Total** | **8/10** | Pass (8 or more, no 0) |

To raise the score: fix M1 (correct data, error recovery), then m6 (plain words), then run axe at 400 px and 200 % zoom.

Not tested: a real screen reader, an intended user's unaided walk (D17 and D20 stay with the founder), the Online answer sheet (#1563), and Adobe Validate on an N with filled PreviousCOR rows (the Mac).
