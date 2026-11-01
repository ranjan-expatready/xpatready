# Journey test (reviewer): one way to say each person · commit 6eab6bc7 · 1 Nov 2026

Isolated copy `rvwnames` on :4446, with a fresh database and the sample loaded through the product's own Load sample route (done by the builder's check). Chromium headless at 1440 px unless stated otherwise. My scripts are in /tmp/rvwn-scripts and my screenshots in /tmp/rvwn-shots (not committed). US$0.

## Journeys (persona: content publisher, user-A)
1. **Main.** "I want to check who can be in Visitor visa, single, wherever I look." I opened vv.single on Overview, Forms, Questionnaires and Preview and read the header, the card and the note. Expected: one wording per person everywhere.
2. **Alternate, typed labels.** Super visa ("Parent or grandparent", "Spouse or partner (also visiting)") and LMIA high wage ("Employer (applicant)"). The label's own brackets and commas must still read as one person each.
3. **Alternate, library names.** wp.family has no typed labels, and the Representative is optional.
4. **Boundary.** From the Questionnaires note, "Change on Forms" goes to the card, by keyboard only.
5. **Recovery.** Reloading every tab (each step is a fresh navigation) gives the same words.
6. **Sizes.** The header people line at 400 px, at 1024 px, and at 1024 px with 200 % zoom (512 CSS px).

## What held
- J1–J3: the header (every tab), the folded Who can be card and the Questionnaires note are identical per person on all six combinations. Examples: `Applicant (always); Spouse or partner (travelling) (optional); Child (travelling), 0–4 (optional)`; `Employer (applicant) (always); Representative (optional)`. The "; " keeps "Child (travelling), 0–4" as one unit, next to the header's " · " fact separators.
- J4: Tab reaches "Change on Forms", Enter opens Forms with focus on the card's focus wrapper.
- J5: the words were unchanged across about 30 navigations, and there were no page errors.
- J6: no sideways scroll at 400 px, at 1024 px or at 200 %, and the line wraps cleanly.
- axe WCAG 2.2 A/AA on Forms, Questionnaires and Overview (wp.family): 0 violations.
- Speed: each full navigation took about 0.9–1.1 s to a settled page with data (local copy).
- Data: display only, so no write and no audit line is expected. The stored participants are the source of every surface.

## Findings
- **Major.** On the same Overview page, the header says `Child (travelling), 0–4 (optional)` but the "Who can be in this application" chips say `Child (travelling) · 0 to 4 · applicant`, and the principal shows as `Applicant · 1 · applicant` against `Applicant (always)` (`web/src/pages/workspace/overview.tsx:50`). A content publisher sees the same people said two ways under one heading. That is QA-77's own wording ("header and Overview").
- **Minor (pre-existing).** The studio preview (`?view=studio`) labels its count controls "Children travelling" / "Spouses or partners travelling" by role (`web/src/pages/preview.tsx:15`), not with the person's name. I read this in the code only.

## Break it (short; display-only change)
- A label with brackets ("Employer (applicant)") and a role with a range ("Child, 0–4") on the same line still split cleanly on "; ".
- Most = 0 is left out (shared filter).
- An empty list gives "nobody yet" on the note (code read; the sample has no empty combination).
- Very long labels: the line wraps with no sideways scroll at 400 px. No Blocker found.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Three surfaces agree; Overview does not |
| Next step obvious | 1 | "Change on Forms" on the note and on Overview both lead to the card |
| Plain words | 1 | The card's agreed words (P-161 (2)) now also in the header and the note |
| Feedback and state | 1 | Nothing changes state; the card's version line is unchanged |
| Correct data | 1 | Every surface reads the stored participants; names agree on all six combinations |
| Error recovery | ½ | No error path in this change; the "nobody yet" fallback was not exercised live |
| Accessibility and screen sizes | 1 | axe 0; keyboard path works; 400 / 1024 / 200 % with no sideways scroll |
| Speed | 1 | About 1 s per settled navigation |
| Visual quality | 1 | One muted line that wraps cleanly; the double brackets come from the typed labels (P-209) |
| Trust and sources | 1 | "Sample" kept in the header; typed labels keep their library role under them on the card |

**8.5 / 10. This passes on the score (8 or more, no 0), but the Major above is open.**
To raise the score: put Overview's chips in the card's words (task completed → 1).

## Not tested
A real screen reader. An intended user's unaided walk (D17/D20 stay with the founder). The approver's view (same components). The studio-preview count labels live.
