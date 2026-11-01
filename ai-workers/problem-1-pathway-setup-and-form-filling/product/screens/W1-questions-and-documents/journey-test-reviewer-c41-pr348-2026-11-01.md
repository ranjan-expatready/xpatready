# Journey test: C4.1 questionnaire per person role (PR #348 at 83aa42b9), reviewer, 1 Nov

Copy: `rev348m` = origin/main 3f22f26f + PR #348, :4437, Reset + Load sample, combination With an LMIA (`wp.family`). Live AI off, US$0. Walk script and screenshots kept outside the repo (reviewer scratch, Chrome headless). Rule: `QUALITY.md` "Journey score".

## Journeys (persona · goal · expected)
1. **Main.** Content publisher (author): "see that each person gets their own questions, then put Personal details first". Tab shows one questionnaire per role with counts. Move up/down changes the order, it is saved, and it shows on Review.
2. **Keyboard only.** Same goal, no mouse. Tab reaches Move down, Enter moves the section, and focus stays on the button.
3. **Alternate.** Preview by person: the passport facts are not asked of the principal.
4. **Error.** The first section's Move up and the last section's Move down are greyed, with the reason in words.
5. **Wrong role.** The approver sees no move buttons, and a direct call returns 403.
6. **Recovery.** Reload keeps the order. A double click moves once. Undo puts the section back.
7. **Concurrency.** Two tabs: the second, stale tab is refused in words and its order refreshes.
8. **Across the boundary.** Review and release lists "Sections reordered: … now 2nd …".
9. **Screen sizes.** 1440, 1024, 400 and 512 px (1024 at 200 %).

## What held
* J1: role chips "Principal applicant · 144 / Spouse or partner · 111 / Child · 12 / Representative · 15". "✓ Every fact has one source". The move was saved, the toast read "moved down: now 2 of 18 sections, for every person", and the order stayed after reload.
* J2: Move down reached after 49 Tabs. Its aria-label is "Move down: Application details". The focus ring is visible (light blue outline). Enter moved the section in 90–108 ms.
* J3: Preview per person: principal 144 / spouse 111 / child 12 / child 4 / representative 15. Suite check: no passport fact is asked (6/6).
* J4, J5: greyed with "… is already the first section." Approver: 0 move buttons; API returns 403 (acceptance 16/16).
* J6: a double click gave one move and no refusal. Reload kept the order.
* J7: tab 2: ""Contact details" was not moved: The sections were reordered since you opened this tab. The order shown now is the current one; move it again if you still want to."
* J8: the Review tab has the line. axe found 0 violations on tab, preview, review and approver.
* J9: no sideways scroll at 1440/1024/400/512.

## Findings
* **Major**: after a move, the top draft bar still says "No unreleased changes. Firms use Release 1.", and the header says "draft matches the release". Checked at 0–6 s; the bar is right only after a reload. Cause: `web/src/pages/workspace/questionnaires.tsx:300` (main :305) does not invalidate `["draft"]` or `["combination-summary", id]`. Details in `review-c41-pr348.md`.
* Minor: Move down on the first section takes 49 Tabs from the page top. Every section header button comes first. Within the bar, so note only.

## Data underneath
`sqr_section_selection` order matches the tab after each step. One audit line per move ("moved the section … now 2nd of 18"). The released snapshot keeps the old order until the next release (acceptance). The draft has exactly one "Section order" line.

## Break-it (15 min)
Double click: one move. Stale tab: 409 in words, with a refresh. Approver by URL: no buttons, 403. Direction "sideways": 400 in words. Stale `seen` sent by API: 409, nothing moves. Removing the server's `seen` check makes the acceptance test fail (11/16). No Blocker found.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J8 |
| Next step obvious | 1 | Move on the header; Review line |
| Plain words | 1 | Reasons and refusals in words |
| Feedback and state | ½ | Toast correct; draft bar and header stale until reload (Major) |
| Correct data | 1 | DB order, audit, one change line |
| Error recovery | 1 | Undo, stale refusal with refresh, double click |
| Accessibility and screen sizes | 1 | axe 0; keyboard path; 400/1024/200 % no sideways scroll |
| Speed | ½ | First view ~1.05 s (budget 1 s); move < 0.11 s |
| Visual quality | 1 | Team look; screenshots at 1440/1024/512 |
| Trust and sources | 1 | "Sample until the immigration expert confirms"; fact sources per role |
| **Total** | **9/10** | Pass (8+, no 0) |

Raise: fix the draft bar refresh (feedback +½). Trim the Questionnaires tab's first load below 1 s (speed +½).

Not tested: real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); Visitor visa (needs C4.11); headed visible browser.
