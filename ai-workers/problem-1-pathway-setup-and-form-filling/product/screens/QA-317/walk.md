# QA-317 walk at 1440 px (runtime lane, 9 Nov 2026, IST)

A gate A walk (P-348 (3)), by screens only, as the case officer, on a fresh copy built from the branch with the
configured checkpoint loaded. The case is Visitor visa on release 2, with Sample Client A and Sample Spouse A; each adult
files IMM 5257 Online. The walk is `tests/check_qa317_sheet_browser.ts`, keyboard first: 34/34, exit 0 at 13929449801.

| Step | What the officer sees |
|---|---|
| 1. Case › Prepare application, IMM 5257 · filed Online (later wave) | "…types it into the IRCC account from its answer sheet; a PDF copy, not for filing, is listed with the forms above." It has one link per person, in the line's order, each with its state: "Open answer sheet: IMM 5257 for Sample Client A · To do", then the spouse's. `screenshots/01-online-line-opens-the-sheet-1440.png` |
| 2. Tab to the link, Enter | The sheet's own page, `/cases/<case>/sheet/<item>`: "IMM 5257 answer sheet · Sample Client A", the IRCC account, To do with the server's reason, "0 of 9 sections complete", the order note. |
| 3. Before the answers | Personal details shows the date of birth the officer typed, marked "To confirm" with why. Every unanswered fact is listed under "Still to answer or confirm (n)", never as a value. `screenshots/02-sheet-before-the-answers-1440.png` |
| 4. Copy | The date goes to the clipboard as YYYY-MM-DD and the button says "Copied". |
| 5. Once every fact is answered and confirmed | No section waits. A choice (marital status) shows and copies its label. An address copies part by part or whole. `screenshots/03-sheet-every-answer-confirmed-1440.png` |
| 6. No clipboard | A part's Copy selects that part alone, and the page says "press Ctrl+C (⌘C on a Mac)". |
| 7. Refusals | A client: "This page is for the case officer", and the server says 403. A PDF-upload form: "This form has no answer sheet", with the server's words, the way to change how it is filed and a link back. An unknown item: "No such answer sheet". Another case's item, or an unreadable case: "This answer sheet is not among this case's forms". |
| 8. A form moved to PDF upload | Its link leaves the Online line; the other person's stays. |

Axe (WCAG 2.2 A/AA) found nothing at 1440 and 390 px. There is no sideways page scroll at 1024 or 390 px; at 390 px each answer is a stacked block. No page or console errors. The 390 px screenshots sit beside each 1440 one.

The per-section "Entered in the portal" tick is row B4, next on this branch.
