# BK-12 journey test, reviewer role, 11 Nov 2026

**Commit:** b465cf485 (head 82283089b changes only `ASSUMPTIONS.md`). **Copy:** `rev_bk12` on :4436; :4400 never used.
**Method:** this is a runtime/API row with no new screen. The journeys were walked through the API, as the brief allows, with the data read underneath with SQL. The screen side rests on the builder's 1440 px screenshots (`screenshots/01`, `02`), compared with the API state.

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Author, demo · "show the Study permit with its own sample client" | Load configured → POST sample-case `sp.outside` | SAMPLE-SP-STUDENT-1 opens on the Study permit's release with its own person and answers, and its forms are copied | Held. 1 person (Student A (Sample)); 26/26 answers, 0 refused; 6 sections confirmed; IMM 1294 + 4 forms GENERATED; 3.7 s |
| 2 | Author · "the Visitor visa story still works" | Same load → rows 11/12 → POST sample-case `vv.single` | Same family case as before, 4 people, IMM 5257 × 4 | Held. Rows 11/12 unchanged (c10_1 48/48); the POST returns the same case id |
| 3 | Author · pathway with no sample case (LMIA) | POST sample-case for `wp.lmia_inside` | Refused in words, nothing made | Held. 409 "No Sample case is set for With an LMIA – inside Canada: samples/sample-cases.json names none…"; 0 cases |
| 4 | Author · combination not yet released | Load the six → POST `sp.outside` | Refused in words, nothing made | Held. 409 "…has no released version yet: a case opens only on a released configuration"; 0 cases |
| 5 | Wrong role | POST as the client, as the officer, and with no actor | Refused on the server | Held. 403, 403, 401 |
| 6 | Bad input | Empty body, not-a-UUID, an unknown UUID | 400, 400, 404 in words | Held |
| 7 | Recovery: double click and re-open | Two concurrent POSTs, then a third later | One case, nothing duplicated | Data held: 1 case, 1 copy per form, each answer declared once and verified once. Reply counters misleading (finding 2) |
| 8 | Across the boundary: case officer on Cases | Cases list → open SAMPLE-SP-STUDENT-1 (GET runtime/cases/:id as user-O; screenshots 01, 02) | Both sample cases listed; the student case shows its own people and documents | Held. Combination "Outside Canada", principal Student A (Sample), Study permit stage current |

## Break-it pass
* Concurrent double request: result above.
* Bad data entries: the reader refuses all 9 shapes, naming the entry.
* Code that names a pathway: three mutations (a double-quoted key, a single-quoted key, a form number) are each caught by B164, which runs in CI.
* Missing answers file, found by reading the code: it would give a 500 after the case opens (finding 3).

## Findings
1. **Minor:** `check_bk12_sample_case.ts` is not discovered by `run-suites.sh` (only `check_case_engine` and the R1 trio under `tests/runtime/`), so the Study permit journey is not re-run in CI.
2. **Minor:** under a race or on a re-open, the reply reports `answerRefused` 15–17 or `notTaken` 89, although nothing went wrong.
3. **Minor:** the reader does not check that `answers` and `validated` files exist. A typo gives a 500 at `sample-case.ts:74`, after `createCase`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 |
| Next step obvious | ½ | The API only (no Demo button, out of scope); the refusals say what to add and where |
| Plain words | 1 | J3, J4, J6 refusals are plain sentences |
| Feedback and state | ½ | Finding 2 |
| Correct data | 1 | SQL: 26 answers equal the file, 1 case, 1 copy per form |
| Error recovery | 1 | J4 and J7 recover; the re-open is idempotent (finding 3 is recoverable by re-running) |
| Accessibility and screen sizes | ½ | No new UI; not walked by keyboard or with axe |
| Speed | 1 | 3.7 s open, 1.5 s re-open; family re-open 14 s (demo-only loader) |
| Visual quality | 1 | Screenshots 01/02: existing screens, team look, Sample names |
| Trust and sources | 1 | Every name "(Sample)"; the file says made up, Unconfirmed: expert, no counsel; no AI |

**8.5/10, pass (8 or more, no 0).** To raise it, most valuable first:
1. Run the BK-12 suite in CI.
2. Make the replies say "already open, nothing changed".
3. Validate that the data files exist when the data is read.

Not tested: a real screen reader, an intended user's unaided walk (D17/D20 stay with the founder), and the real CI run.
