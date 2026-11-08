# QA-309 walk at 1440 px (runtime lane, 8 Nov 2026, IST)

Copy `rt_q309w` on :4436 built from the branch, Demo › Reset, then Load the configured checkpoint (201). A Visitor visa case
for Sample Client A on release 2, `fillEverything`, then the officer (user-O) reads the case page.

The answer sheet and an item's state have no screen yet (C7.3's sheet is read and ticked through
GET/POST `/runtime/items/:id/answer-sheet` and `…/screens/:key/entered`, as C7.3's pack does). The case page's
"IMM 5257 · filed Online (later wave)" row is where the officer is sent to the sheet. So the walk reads the item through
the API and shows the case page around it, before and after the ticks.

| Step | Result |
|---|---|
| Before the ticks | `to_do`: "Every answer is ready to enter in the portal; 9 of 9 sections still to tick "Entered in the portal": Personal details, National identity document, US PR card, Contact information, Details of visit to Canada, Education, Employment, Background information, Signature." |
| Tick each of the 9 sections | 201 × 9 |
| After the ticks | `done`: "Every section is entered in the portal, with every answer confirmed and current." |
| Case page at 1440 px | renders; no page or console errors; `screenshots/1-case-before-ticks-1440.png`, `screenshots/2-case-after-ticks-1440.png` |

On main bc8e33d53, the same probe (qa's `c102_sheet.mts`) leaves the item `to_do` with "Every fact it reads is confirmed." after the 9 ticks.
