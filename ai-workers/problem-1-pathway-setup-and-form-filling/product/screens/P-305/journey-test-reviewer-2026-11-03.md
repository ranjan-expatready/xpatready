# Journey test: P-305 on To review (reviewer role), 64632ce8b, 3 Nov 2026

Isolated copy rv305 :4458 (fresh start after 12:01 UTC). Playwright headless Chrome. Script and screenshots are in the reviewer's scratchpad, not committed. US$0, no AI call.
Setup: sample load. seed_proposals.ts on IMM 1111 (02-2026), twice: the default (2 Ready reuse matches, Check, Decide, a rules item) and "lists" (2 Ready new answer lists).

## Journeys
| # | Persona and goal | Result |
|---|---|---|
| J1 | Content reviewer: "accept the safe ones together" | Pass. The Ready band shows 5 rows and only the 2 reuse matches have a checkbox. "2 can be accepted together", "Choose all 2", then Accept 2 items. DB: both accepted in one batch, decided_key = the reused library keys, 0 library changes, one audit line. |
| J1b | Same: "why can't I tick this list?" | Pass on hover: the tip reads "It adds a new item to the shared library, so it is decided on its own … open it and accept it alone." Hover only (see J3). |
| J2 | Same: accept a new list on its own | Pass. Open, side panel, Accept. DB: accepted, 1 WAITING ADD. axe clean on the panel. |
| J3 | Keyboard-only user reads the reason | **Fail.** The tab order skips the dash on Eye colour, Way of arrival and Hair colour (the Tip is not focusable, proposals.tsx:118). My script's assertion was too weak and printed PASS, but the tab log shows the gap. |
| J5 | Second person approves the list | Pass. Row "Hair colour · New answer list · Needs you", but its link reads "Approve or return the new field" (review-queue.ts:270). The change page has Approve, and the change is APPROVED. axe clean. |
| J6 | Wrong role: the decider approves their own change | Pass: 403, still WAITING. |
| J7 | Break: list + rules item together; two tabs accept the same list | Pass: 409 with nothing changed; parallel single accepts give 201 and 409 with exactly one ADD. |
| J8 | Break: two Ready AI conditions together (probe through the one door) | **Fail against P-305:** 201, one batch, 2 WAITING placement_condition library changes; To review shows "2 new library items from one review decision". |
| Sizes | 400, 1024 and 1440 px; 1024 at 200 % (512 CSS px) | No sideways scroll. axe WCAG 2.2 A/AA clean on the queue, the panel and the change page. No page or console errors. |
| Speed | Queue first view, 3 runs | 142, 118 and 127 ms (budget < 1 s). |

## Score
Task completed 1 · next step obvious ½ · plain words ½ · feedback and state 1 · correct data ½ (J8) · error recovery 1 · accessibility and screen sizes ½ (J3) · speed 1 · visual quality 1 · trust and sources 1 = **8 / 10**, with no criterion at 0.
Raise it by: M1 (refuse conditions in bulk, or get a ruling and correct the records), a focusable reason tip, and words that name the kind on the change row.

## Not tested
A real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); Ready conditions made by the product's own Saved run (that needs the STUDIO_AI_LIVE fake launcher, which is not allowed in this check).
