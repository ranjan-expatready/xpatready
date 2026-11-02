# C11.12 PR 3 (the screen): journey test, reviewer role, 2 Nov

Commit `636237ba`, isolated copy `xr_studio_rvpr3` on :4442, headless Chromium (Playwright), sample loaded through `/demo/load`. Live AI off. The scripts are in the reviewer's scratchpad and are not part of the PR. The builder's `check_c1112_filing_browser.cjs` replay passed 15/15 on :4445.

## Journeys (main path first)
1. **Author, main path (Visitor visa).** Goal: "the child goes on the principal's application."
   - Steps: Show and edit → Edit (keyboard) → Filing for Child → Declared only → read the warning and the preview → Save → reload.
   - **Held.** The warning appeared before Save with "You can still save". The preview went from 3 filings to 2 ("Principal applicant's application (2 people, 1 declared only)"). The database stores `declared_only`, and the other lines are unchanged. Undo restored the mode.
2. **Author, alternate (sponsorship, `fs.outside`).** Goal: read what a case gets.
   - **Held.** "2 filings sent together … · cannot be split". The Sponsor reads "Files the sponsorship … never alone". Fees read "not worked out yet". CAD 0 never appears.
3. **Author, error: a co-filing count that is not 1 to 1.** Representative set to Files the sponsorship at 0 to 1, then Save.
   - **Held as an error state.** A field error appears under How many, and axe is clean.
   - **Finding (Major M2).** At 1 to 1 the same choice saves. A Visitor visa then gets "Representative: the sponsorship". P-233 says the Representative "Files nothing".
4. **Author, needs work.** Child set to "Choose how it is filed", then Save.
   - The line reads "⚠ Filing not set", and Review shows "1 error (block submission) · People · Filing for Child".
   - **Finding (Major M1).** The setup strip says "Step 2, Done: Who can be in this application", the next step points to Official pages, and the header's Missing list does not name it (`programs.ts:163` leaves out `filingProblems`).
5. **Two authors, conflict.** Second tab saves after the first.
   - **Held.** "Changed by someone else … Reload their version".
6. **Wrong role (content reviewer).**
   - **Held.** "Show" only: no select and no Edit. A PATCH as the reviewer returns 403 in words.
7. **Phone and zoom.**
   - **Held:** the read view fits at 375 and 400 px, and both read and editing fit at 512 px (200 % of 1024) and at 1024 px.
   - **Finding (Major M3).** In editing at 375 and 400 px, the Add-person row overflows by 56 and 31 px, and Save is cut to "S".
8. **Across the boundary (release).**
   - **Held:** the release check blocks a role with no mode, worded as n2 asked.
   - Hand-off to the case: covered by PR 2's suites, not re-walked here.

## Data underneath
- The `combination.participants` JSON was read after each save. Values are exactly as chosen, and nothing else changed.
- An audit row exists for each save ("Last changed by Configuration author", and Undo works).
- The server enforced the author duty (403 for the reviewer).

## Break it (short)
- Two tabs: 409 handled.
- Remove and re-add a person in one edit: the mode is kept (builder check).
- Representative co-filing: accepted (M2).
- Reload in the middle of an edit: the draft edit is lost, nothing is saved. That is as designed.
- Console: no errors.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Modes set, saved, reloaded and undone on three combinations |
| Next step obvious | ½ | The setup strip says People Done while the release is blocked (M1) |
| Plain words | ½ | "Spouse or partner (travelling)'s application"; "Fees … for With an LMIA" (m3) |
| Feedback and state | 1 | The warning and the preview follow each edit before Save; field error; conflict |
| Correct data | ½ | A Representative "sponsorship" filing can be saved (M2) |
| Error recovery | 1 | Field error in place; Reload their version; Undo |
| Accessibility and screen sizes | ½ | axe clean and selects named; editing at 375/400 px cuts off Save (M3) |
| Speed | 1 | Preview updates in about 18 ms; save under 1.5 s |
| Visual quality | 1 | Matches board frame 1 at 1440 and 1024 |
| Trust and sources | 1 | Sample marked; "not worked out yet, nothing is guessed"; Guide 5256 cited |

**Journey score: 8 / 10. Pass** (8 or more, no criterion at 0).

To raise it, most valuable first:
1. Feed `filingProblems` to the setup strip and the Missing list (next step).
2. Make the co-filing choice available only on the Sponsor line (correct data).
3. Wrap the editing footer on phones (screen sizes).
4. Fix the possessive and the combination name in the fees words (plain words).

## Not tested
A real screen reader. Real browser zoom (emulated with the viewport). An intended user's unaided walk (D17, D20 stay with the founder).
