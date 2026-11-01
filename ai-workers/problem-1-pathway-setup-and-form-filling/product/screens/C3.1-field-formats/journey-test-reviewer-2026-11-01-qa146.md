# Journey test (reviewer): C3.1 QA-146 follow-up, commit baf42aa2

1 Nov 2026. Isolated copy :4458, headless Chromium (Playwright) with axe-core. There is no visible browser pane in this container, so the walk used only what a person sees: role and text locators, clicks and Tab/Enter. US$0.

## Journeys
1. **Main.** The configuration author, goal "see what each form field of IMM 5257 allows before I decide":
   * Steps: Immigration programs → Resume setup (Visitor visa) → IMM 5257 → Draft with AI → Use saved AI answer → Review AI proposals → read the cards.
   * **Held.** The review link appeared 4.4 s after the start, and the job page loaded at once. 161/161 form fields carry a format. Examples:
     * family name: "Text, at most 100 characters (from the form)"
     * country: "The form's own choices (242): …, and 238 more"
     * dates: "Date, written YYYY-MM-DD (from the form)"
2. **Keyboard only, same path at 1024 px.** Held (38, 13, 5 and 41 Tabs to each step).
3. **Screen sizes.** axe 0 violations at 390, 1024 and 1440 px. The format lines wrap and never overflow.
   * The page scrolls sideways at 390 px and at 200 % zoom (732 px). This comes from older "Create … unless …" buttons, not this item.
4. **Load sample and the configured checkpoint (QA-146).** Held: the editions link their inventory (IMM 5257, IMM 1344), and 0 editions point to the wrong inventory.
5. **Wrong role.** Held: client 403, no person 401 on `/jobs/:id`.
6. **Runtime answer to the client (AT-10).** Held: family name limit 100. Over-limit answers are refused exactly as before. The 8 runtime suites pass.
7. **Checkpoint state, draft IMM 5257.** Not held, but not caused by this item: "Draft with AI" is offered and then refused with a 400 ("already in this combination's configuration").

## Findings
* **m1:** the date-part boxes (MM, DD, YYYY) read "Text, at most 2 characters" under a date proposal.
* **m2:** the format line has the quote's style and no label, so it reads as the end of the quote.
* **m3:** no browser or axe check covers `[data-box-format]`.
* **m4:** `updateMany` is not limited to PDF editions (optional hardening).

Details and fixes: `review-qa146.md`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | the job page shows the form's own format on every form field shown |
| next step obvious | 1 | the "Review AI proposals" link appears in the row 4.4 s after the start |
| plain words | ½ | "Text" for a month box (m1); otherwise plain words, no "box" |
| feedback and state | 1 | toast, then the job status; the format sits beside each form field |
| correct data | 1 | matches the inventory (max_chars, options_resolved, date picture); editions linked on sample and checkpoint |
| error recovery | ½ | a missing inventory shows no line (fine); the checkpoint's Draft with AI dead end (older code) |
| accessibility and screen sizes | ½ | axe clean at 3 widths and the keyboard path works; sideways scroll at 200 % zoom (older code) |
| speed | 1 | `/jobs/:id` 12–27 ms with formats |
| visual quality | ½ | the line is indistinguishable from the quote (m2) |
| trust and sources | 1 | "(from the form)"; read from the PDF inventory, never from the AI |

**8 / 10, pass (no criterion at 0).** To raise the score: m1 and m2 (plain words, visual), then the older-code 200 % zoom overflow (accessibility).

Not tested: a real screen reader, an intended user's unaided walk (D17 and D20 stay with the founder), a visible headed browser.
