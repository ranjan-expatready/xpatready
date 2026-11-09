# B154 journey test: reviewer, 7 Nov 2026

Commit d81e53821 (PR #1272). Copies: rv154 on :4433 with the configured checkpoint, and d81e53821 + #1246 (B140) merged without a commit, in a separate worktree on :4434. Both are stopped and removed. Headless Playwright (chromium) with axe WCAG 2.2 A/AA. Sample data, US$0.

## Journeys
1. **Author, main path.** Goal: "mark Previous travel as background answers". Steps: Shared library › Sections, then "Background answers…" on the row, then type a reason, then "Send to To review". Expected: the row says it waits for a second person. **Held**: the row reads "Waiting for a second person on To review: background answers." (340 ms).
2. **Author, error.** Send with an empty reason. Expected: an inline error in words. **Held**: "Write at least 5 characters: why it changes for every combination." (role=alert, aria-invalid). Focus stays on the dialog, not the field.
3. **Approver, the next screen.** Follow the row's "To review" link as user-B and Approve. Expected: the change page shows Section, Now → Proposed, Reach, the meaning and the reason, and approval is applied. **Held**. The author's row then reads "Approved: background answers from the next release."
4. **Wrong role.** The proposer approves, and an officer, client or approver proposes. Expected: refused. **Held**: 403 in words (suite 41/41, pack S1-2).
5. **Double click and race.** 5 parallel proposals. **Held**: one 201 and four 409 "Already waiting", one row in the database.
6. **Release and case (with B140).** The pack: 3 Schedule 1 parts marked and released; on a new case the officer's answer waits for the client and the client re-confirms it. **Held**: 16/16.
7. **Alternate: unmark plus rename.** **Held**: one draft carries both, and Review shows two separate lines in words.
8. **Break: officer-filled question in a background section.** **Failed (Major).** Propose who fills → the case officer, propose the mark, approve both, release. The client cannot see the question or re-confirm it (403 "The officer enters this fact from a document or record."), while the officer's answer `awaits_client: true`. Who-fills then refuses to set it back ("Always the client").
9. **Recovery: Escape or Cancel.** The dialog closes, but focus goes to `<body>`, not back to the button (Minor).

## Data underneath
- The proposal makes one `library_change` (WAITING) and leaves the section unchanged.
- The approval writes a DRAFT v2 with `client_only=t`, `updated_by` set to the approver.
- The release publishes v2 and the change becomes RELEASED with `releasedIn`.
- Audit lines: proposed and approved, with the reason.
- A raw key line ("Question placement: person.travel_location") shows on Review when who fills and the mark change together (Minor).

## Screens
- **1440 px.** Sections row: "Background answers" pill and "Not background answers…" button. Dialog and change page match walk 01–08.
- **1024, 400 and 720 px.** No sideways page scroll. At 400 px the table scrolls inside its own box, as before B154.
- **axe.** No violations in 4 states.
- **Console.** Only the expected 400 from the empty send.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3 and 6 |
| Next step obvious | 1 | The row links to To review and says "from the next release" |
| Plain words | ½ | Plain everywhere except the raw key line on Review (break 8) |
| Feedback and state | 1 | Waiting / Returned / Approved on the row; inline error |
| Correct data | ½ | Contradictory library state reachable (journey 8) |
| Error recovery | ½ | Returned: withdraw and propose again works; journey 8 cannot be undone through who fills |
| Accessibility and screen sizes | ½ | axe clean, keyboard opens the dialog; focus not returned (journey 9) |
| Speed | 1 | Sections 1.1 s cold incl. app boot; send 340 ms |
| Visual quality | 1 | Team components, consistent with Rename and Retire |
| Trust and sources | 1 | Reason, proposer, "Unconfirmed: expert, no counsel" |

**8/10, pass (no 0).** Fixes that raise it, most valuable first:
1. Refuse, or set back, officer-filled questions when marking (journey 8).
2. Null both fields in the diff (raw key).
3. Return focus to the trigger button.

Not tested: a real screen reader; a true 200 % zoom (approximated by 720 px); an intended user's unaided walk (D17/D20 stay with the founder).
