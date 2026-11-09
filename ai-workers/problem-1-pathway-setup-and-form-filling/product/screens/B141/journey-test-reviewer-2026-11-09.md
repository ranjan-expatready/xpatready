# B141 · C7.8 journey test, reviewer role, 9 Nov 2026

Commit **dcc7feb8c** (PR #1248). Isolated copy `rev_b141` on :4443, configured checkpoint. Playwright with Chrome, case officer user-O unless named. Sample case SAMPLE-VV-FAMILY-1 has four filings: Client A, Partner, Child (minor), Child 18 or over. US$0.

## Journeys (written from concept §1, §3, §4 before walking)
1. **Main, case officer:** "The client also needs IMM 5645." Open the case, click "Add a form to Client A's filing", search "5645", Enter, Add. Expected: a row tagged "Added by the case officer" with the download and the upload, and a CRITICAL Ready-to-file line until the completed copy is uploaded.
2. **Alternate, fills:** add IMM 0008 (proven filling) for the Partner. Expected: coverage shown before adding, the tagged row, filling from confirmed facts, and **no new client questions** (Q1).
3. **Empty:** search "IMM 99". Expected: the concept's empty words.
4. **Error:** a release form, a blank barcode form, the same form twice, Online, a guide, a person not on the filing. Expected: refused in words, nothing stored.
5. **Wrong role:** client, author, approver, reviewer, another firm, no actor. Expected: 403, 403, 403, 403, 404, 401.
6. **Recovery:** double or parallel Add, Escape or Close, reload. Expected: one row; focus back on the trigger.
7. **Keyboard only:** from the trigger: Enter → type → Enter → Tab → Add.
8. **Remove:** with a reason, by keyboard. Expected: the row leaves, the record is kept, the audit line is written.
9. **Screen boundary, Ready to file:** upload the completed copy. Expected: the CRITICAL line clears and the item turns Ready.
10. **After recording:** with one filing recorded, Add and Remove are read-only.

## What held
* J1 held: list in 42 ms, picked form in ~90 ms, add→row 0.8 s. Row text and the CRITICAL line read as concept §5. The download was `IMM5645-blank.pdf`. After the upload the pill read "Completed copy uploaded 9 Nov 2026", the line cleared and the item was `ready`. DB: one row (blank, PDF_UPLOAD, HAND_SCANNED); audit lines "added" and "uploaded the completed copy".
* J2 held in part: coverage "57 of 249" and "Not on file (173)", the tag, Who signs, Sign and scan steps; the readiness lines are the usual ones with the signature already set. **But** the client questionnaire grew from 498 to 500 questions, one about the minor Child (Major, review M1).
* J3, J4, J5 held: every refusal in words with the right status; 6 parallel identical adds gave one 201 and five 409s.
* J6 held: Escape and Close return focus to "Add a form to Partner (Sample)'s filing".
* J7 held: the keyboard path completes; the tab order after a pick is channel → signature → reason → Add → Close.
* J8 held: Remove focuses the reason input; Tab → Remove → the row leaves, `removed_reason` is stored.
* J10: the recorded filing's button is disabled with "Recorded as submitted: read-only." The other filings still offer Add, Remove and Upload, and Add ends in a 409 naming "This application" (review m5).
* axe WCAG 2.2 A/AA: 0 violations on the panel and the picked state at 1440, 1024, 720 (200 % zoom) and 400 px; no sideways scroll; panel 560 px (400 px on a phone); no page or console errors.

## Findings (details and file:line in `review.md`)
* **Major M1:** an added form adds client questions, including one about another person (Q1 broken).
* **Major M2:** the person's name and the free-text reason are written into audit lines (STANDARDS §5).
* **Major M3:** "Added by user-O" and "already added … by user-O on 2026-11-09": a raw id and an ISO date on the main path.
* Minor: a race lets the same form be stored with two channels; signature off on Paper is ignored; no accommodation reason for Paper on an IRCC account; focus falls to `<body>` after Add and after Remove; "Remove" alone; read-only per filing only; "Q2" in user copy; no "A newer edition exists"; test gaps.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J8, J9 completed in the UI |
| Next step obvious | 1 | the row says what to do; the CRITICAL line names the upload |
| Plain words | ½ | raw "user-O", "Remove" alone, "already … (it does not apply)" |
| Feedback and state | ½ | toasts and pills are good; read-only per filing only; focus lost |
| Correct data | ½ | one row under race for one person, but two questions leak to the client (M1); race on channel; Paper/NONE reads PEN |
| Error recovery | 1 | refusals in words, input kept, double Add safe |
| Accessibility and screen sizes | ½ | axe 0 at 4 widths, keyboard complete; focus to body; tooltip on hover only |
| Speed | 1 | 42–135 ms reads, 0.8 s add→row |
| Visual quality | 1 | team controls, side panel, wraps long titles (w1-1024-picked) |
| Trust and sources | 1 | kind with its reason, coverage, frozen edition, sha256-checked download |
| **Total** | **8 / 10** | pass (8+, no 0) |

Fixes that raise the low criteria, most valuable first: M1 (correct data); M3 and "Remove from <name>'s filing" (plain words); focus the new row after Add and the trigger after Remove (accessibility); case-wide read-only (feedback).

## Could not test
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); recording through C8.2's own path; a release move onto a release that holds an added form. Screenshots are in the reviewer's scratchpad, not committed.
