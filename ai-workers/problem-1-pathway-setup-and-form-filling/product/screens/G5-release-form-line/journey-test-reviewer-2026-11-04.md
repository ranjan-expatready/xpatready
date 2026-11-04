# Journey test (reviewer): G5 "Release needs a form line" (C5.1, P-248), PR #868 at b2d33367, 4 Nov

Setup:
- An isolated copy on :4447 (`rv`), with the suites' fixture loaded (Demo › Load sample). The checkpoint was also walked through the pack.
- Live AI off, US$0.
- Headless Chrome through Playwright (`channel: chrome`), as a person would click: links, buttons, Tab and Enter.
- The documents-only state was reached through the pack's own product routes: a document line added, its new type accepted by a second person, and IMM 5257 removed on Forms.

## Journeys
1. **Configuration author (main).** Goal: "Why can't I send Visitor visa for review, and what do I add?"
   - Steps: open Review and release, read the warning, follow Add a form, add a form, go back.
   - Expected: a warning in plain words, Submit greyed, and the warning gone once a form is on.
2. **Author, keyboard only.** Same goal, without a mouse.
3. **Author at 1024 px, 400 px and 200 % zoom.** The warning and its link are readable with no sideways scroll.
4. **Approver (wrong role for submitting) on the Release page.** Goal: "What is held back and why?"
   - Expected: the row held in the same words, and nothing released.
5. **Approver on the combination.** Approve and release is greyed. The server refuses with 409 (pack).
6. **Recovery.** Reload keeps the state. Add back on Forms clears the warning.
7. **Break it.**
   - Submit, approve and pack release by API, with the author, the content reviewer and the approver.
   - A form switched to Online, then Paper, then Not needed, then removed (pack, live).

## What happened
- **J1:**
  - The Review tab loaded in 1.4 s on the first cold load.
  - The warning reads "No form line yet: this combination cannot be released", then the plain reason, then "Add at least one form it files … a PDF form, a portal-screen edition filed Online, or an online-only form … Submit and release are refused until then.", with an **Add a form** link.
  - Submit for review is disabled with the tooltip "Fix the problems first".
  - The error is not repeated in the validation list.
  - Wrong turn: the validation box below says **"0 errors (block submission)"** while the tab says "1 to fix" (review m1).
- **J1 recovery:**
  - Add a form opens Forms. On Forms, "Add back" (IMM 5257) restored the line in 1.0 s.
  - Back on Review and release, the warning was gone. Submit stayed greyed for the fixture's 2 other errors, which is correct.
  - DB: one `combination_form` row, IMM 5257 v1 DRAFT. Nothing else changed.
- **J2:** "Add a form" is reached after 31 Tabs (it comes after the step cards and the notice). Enter opens `/c/<id>/forms`.
- **J3:** At 1024, 400 and 1440@200 %, the box and the link are visible, with 0 px sideways scroll. At 400 px the button sits beside the title (screenshot `j2-review-400.png`).
- **J4:**
  - The Release page loaded in 0.86 s.
  - The row reads "Visitor visa … 24 Held back: No form line yet: …".
  - Release page Release returns 409 "Nothing can be released yet. Visitor visa: No form line yet…" on the fixture. On the checkpoint it returns 201, releasing only the separately approved document type, with the row listed held.
  - `config_release` for the combination: 0.
- **J5:** The approver sees the same warning. "Approve and release" is disabled. Approve by API returns 409 "Release refused: 1 problem (No form line yet: …)".
- **J6:** After a reload the warning is still there. No page or console errors in any journey.
- **J7:**
  - Content reviewer or approver submitting: 403.
  - Author approving: 403.
  - Submit: 400 and Approve: 409, both naming what to add.
  - Online and Paper keep the form line.
  - Not needed is refused by the product ("no record says the account asks it itself"), so the live Not-needed case could not be reached (review m3).
  - Removing the form brings the error back.
  - Mutation: with the rule taken out of `problems()`, Submit returned 201. The pack goes red.
- **axe WCAG 2.2 A/AA:** 0 violations on the Review tab (warning state) and on the Release page.
- **Pack timing:** fixture run 35/35 twice. Checkpoint 27/27 + 1 WAIT (exit 2, QA-144).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The author learns why, adds a form from the link, and the warning clears (J1 recovery). |
| Next step obvious | 1 | One "Add a form" link on the warning (J1, J2). |
| Plain words | 1 | It says what is missing and the three kinds that count. No codes on screen. |
| Feedback and state | ½ | Warning, greyed Submit and held row agree, but "0 errors (block submission)" contradicts them (m1). |
| Correct data | 1 | Nothing released (`config_release` 0). One line restored, nothing else changed. |
| Error recovery | 1 | Reload keeps it. Add back clears it. The server refuses every path. |
| Accessibility and screen sizes | 1 | axe clean. 1024/400/200 % with no sideways scroll. Keyboard path works. |
| Speed | 1 | Review tab 1.4 s on the first cold load (later loads settle faster), Release page 0.86 s. No per-row request added. |
| Visual quality | 1 | Team warn Notice, aligned with the other release notices (`C5.1-*-1440.png`). |
| Trust and sources | ½ | No AI. The rule is a product decision. The online-only kind cannot be shown on a screen today (rule-only). |

**Score: 9/10. Pass** (8 or more, no 0).

Fixes that would raise the low criteria, most valuable first:
1. Say "other errors", or count the form-line error, in the validation box (`review.tsx:83`).
2. Make the live Not-needed step reachable, or mark it WAIT.

Not tested: a real screen reader, and an intended user's unaided walk (D17/D20 stay with the founder). An online-only form made through a screen cannot be made yet: online capture is parked.
