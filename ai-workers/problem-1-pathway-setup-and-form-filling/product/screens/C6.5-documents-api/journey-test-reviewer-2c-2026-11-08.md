# Journey test (reviewer): C6.5 part 2c, correction counts (PR #1375, `c774e63b6`)

Role: reviewer. I did not build it. Scope is 2c's own change (`git diff origin/claude/runtime-c65-drawer...c774e63b6`). It is API only, with no screen, so the browser walk, axe, widths and keyboard steps do not apply. Each journey was walked through the product's own routes as the case officer would drive them from the drawer, on my copy `rv_c65c`, :4434, fixture `setup_visitor_visa.ts` + `setup_vv_m3.ts`. Live AI was off, cost US$0. Probe scripts stayed in the scratchpad and were not committed.

## Journeys (persona · goal · steps · expected → result)
1. **Main path, officer, then the team reading the rate.** "Read the passport, use it, finish the section." Upload a Sample passport, Fill this from documents, Confirm & use. Then answer the two values the drawer leaves "for you to answer by hand" (citizenship, country of issue: "The coded line gives only the country code "IND": choose the country by hand"), choosing India. Expected: no correction, because the reader made no error. **Result: expanded 2 corrected of 5, rate 0.4. Both are `staff_answer` corrections of `person.citizenship` and `person.passport_country_of_issue`.** FAIL (Major, see review M1).
2. **Correction before Confirm & use (the drawer's "Correct it").** The officer saves another given name, then confirms. Expected: one expanded correction. Result: expanded 1/5 (pack C6.5-22; repeated in my probe C). Held.
3. **Later staff change to a collapsed value.** Change the passport number after Confirm & use. Expected: one collapsed correction. Result: collapsed 1/3, rate 0.333 (pack C6.5-22). Held.
4. **Equal answer.** Re-type the expiry exactly as read. Expected: not counted. Result: not counted (C6.5-22 fail step). Held.
5. **One value corrected three ways.** Staff answer, then the check resolved keeping the answer, then a second staff answer. Expected: counted once. Result: expanded 1/5, `staff_answer` (probe C). Held.
6. **A replaced file's check closed by a newer file.** Staff typed "CLIENT AB" before the read; file 1 is confirmed (check opens); file 2 is uploaded and confirmed (file 1's check closes, "Its file was replaced by a newer Passport…"). Expected: not counted. Result: 0 corrections (probe R). Held.
7. **Renewed passport, product path.** File 2 with a new number and expiry is confirmed, and its two checks are resolved keeping the document. Expected: 0. Result: 0 corrections, collapsed read 6 (probe A2). Held.
8. **Renewed passport typed by hand.** File 2 is read but not confirmed; the officer types its new number. Expected: no correction (neither reader erred). **Result: collapsed 1/6, a `staff_answer` correction against file 1's read** (probe A). Minor, see review m1.
9. **Wrong role and bad ids.** Client 403 "Only the case officer can do this."; another client 403; author (configuration) 403; the solo firm's staff 404; no actor 401; id `x` 404; unknown UUID 404. Held.
10. **Read only.** Row counts of `audit_event`, `read_value`, `answer_check` and `client_canonical_answer` were the same before and after the GETs (527/88/7/78 both times). Held.

## Data underneath
* The counts come from `read_value`, resolved `answer_check` rows and the full answer history (superseded rows included). Each read value counts at most once. Its first correction wins; the rate is ≤ 1.
* Staff typing is always the channel `agent_view` (`runtime.ts:438`). `confirm_section`, `document_read`, `checked_against_document` and `client_reconfirm` copy or reuse values and never count. That is right.

## Break it
* Inflation: one value can never count twice (probe C). Reverting a correction still leaves one count; that is fair, because a correction happened.
* Deflation: none found. A staff answer before the read surfaces as a check; keeping the answer is counted.
* False counts: journey 1 on every passport (Major); journey 8 on a renewal typed by hand (Minor).
* Speed: about 20 ms per GET on a case with 16 read values; 3 queries, none per row.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The counts are readable per mode by staff (C6.5-21/-22), but the figure is wrong on the main path (journey 1) |
| Next step obvious | ½ | API only. `rule` states the rule in words; nothing says how the team reads the rate (rows.md asks only "can be read") |
| Plain words | 1 | `rule` text and refusal messages are plain; `how` is `staff_answer` / `kept_answer` |
| Feedback and state | 1 | Each correction names fact, mode, document, how, who and when |
| Correct data | **0** | Main path reports expanded 0.4 with no reader error (journey 1). This is P-243's one number for the team |
| Error recovery | 1 | 401 / 403 / 404 with the server's own words; bad and unknown ids give 404 |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | About 20 ms; no per-row request |
| Visual quality | N/A | No screen |
| Trust and sources | 1 | Every correction names its document and actor; the rule is returned with the counts |

**Score: 6 of 8 applicable = 7.5/10, with one 0 → Fail** (pass needs 8+ and no 0).
Fixes that raise it, most valuable first: (1) do not count a staff answer to a value Confirm & use left for a person, i.e. a read value `notWritable` refuses, such as a country code (raises Correct data and Task completed); (2) stop comparing a replaced file's read with staff answers saved after it was replaced.

## Not tested
A real screen reader and an intended user's unaided walk do not apply (no screen); D17/D20 stay with the founder. Only the fixture data set was used: I did not run the configured checkpoint ("the six"). The tech lead's answer to Q1 is pending.
