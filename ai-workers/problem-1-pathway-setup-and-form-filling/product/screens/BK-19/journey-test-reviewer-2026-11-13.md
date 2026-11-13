# BK-19 journey test: reviewer, 13 Nov 2026

Commit 4bd54291b0331123a6dba588b99ce29ad4426b43 (PR #1679). Isolated copies: :4457 (visitor visa fixture, `setup_visitor_visa` + `setup_vv_m3`) and :4458 (configured checkpoint), both stopped afterwards. Headless Chromium through Playwright, driven like a person: buttons, the keyboard and the file chooser. Live AI off, US$0. Validated files are SYNTHETIC (`tools/simulate_validate.py`); BK-20 has the real Adobe files.

## Journeys (persona: the case officer, unless noted)
1. **Main path: "I validated IMM 5257 in Adobe; let the product take it."** Set the form to Paper (dialog, with a reason), Generate a copy, then Read back the validated copy with a good file. Expected "Validated copy read back" and Ready to file opens. **Held** (browser check 13/13, and my own walk by keyboard at 1024 px).
2. **QA-315 error: "I saved it without pressing Validate."** The file has the flag but no barcode. Expected: not validated, with why and what to do. **Held:** a danger toast "read back, not validated. 0 of the 5 barcodes are in this file … press Validate, save it and send the saved file" (polite live region, 845 ms), a warn pill, and Ready to file still names the missing validated copy. Lock gives 409 in words. Download gives the product's copy, not the uploaded file.
3. **Error: "I changed an answer in Adobe after Validate."** Stale barcodes. **Held:** "do not agree with the form's answers (1 position) … press Validate again".
4. **Recovery: "I sent the wrong file by mistake, so I send the right one again."** Good file, then the flag-only file, then the good file. **Failed:** 409 "already read back and kept … nothing was added". The copy still says not validated and lock is refused. Dead end (review #1).
5. **Double click: the same file sent twice at once.** Good file: one 201 and one 409, one row (held). Flag-only file: 2 rows from the race, 4 after four sends (**failed**, review #2).
6. **Wrong role:** the client (user-P) gets 403 "Only the case officer can do this."; the config author gets 403. **Held.**
7. **Screen sizes, keyboard and zoom in the not-validated state.** Keyboard: Tab focus reaches "Read back the validated copy", and Enter opens the file chooser (held). Axe at 1440 and 1024: 0 violations. **Sideways scroll:** the page is 1220 px wide at 1024 px, sideways at 720 px (about 200 % zoom), and 1212 px wide at 400 px. The recovery button is off screen at 1024 (review #3).
8. **Old record: a copy read back before BK-19.** The view says "Read back before its barcodes were checked: send the file you validated in Adobe again", and lock gives 409 with the same words (held by hand). No test covers it (review #4).
9. **Across the boundary: after the good file, Ready to file (C7.6) opens and the Paper steps move to "Printed".** **Held** (shots 03 and 04).

## Data underneath
Each kept upload leaves one `validated_copy` row with `read_back.barcodes` (`checked`, `expected`, `decoded`, `matched`, `slots`, `agree`, `problems`) and one audit line, for example "56/56 values equal; barcodes 0 of 5 read, not matching: not validated". Only a row that counts stamps an approval (code at `fill-case.ts:545`; not tested). The duplicate rows in journey 5 are the one data defect.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1 and 9; C7.2 P-46 and never-ready lines pass |
| Next step obvious | ½ | Clear at 1440 (shot 01); the recovery button is off screen at 1024 (`rv-1024-not-validated.png`) |
| Plain words | 1 | Toast and pill words are plain and name the fix; no field paths on screen |
| Feedback and state | 1 | Danger toast in a polite live region, warn pill, audit line |
| Correct data | ½ | Rows and audit are right; the same non-counting file is kept 4 times (journey 5) |
| Error recovery | ½ | Journeys 2, 3 and 8 recover; journey 4 is a dead end |
| Accessibility and screen sizes | ½ | Keyboard and axe pass; sideways scroll at 1024, 720 and 400 px |
| Speed | 1 | Upload answered in 845 ms; C7.2 API part under 2 s |
| Visual quality | ½ | The pill runs past its card's edge at 1024 |
| Trust and sources | 1 | Barcode counts in tooltip and audit; SYNTHETIC and "unproven until BK-20" are said in the code |

**7.5 / 10, below the pass bar of 8 (no criterion at 0).** The fixes that raise it most, in order: (1) the 1024 px layout of the not-validated pill (raises screen sizes, next step and visual quality); (2) the re-send dead end (error recovery); (3) keep the same file once (correct data).

## Could not test
A real Adobe-saved file (BK-20). A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). I took screenshots in the scratchpad; the committed ones are restored.
