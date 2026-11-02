# Journey test (reviewer), round 2: C3.6, a document type named while adding a requirement

Commit 97d8f71a (clean export; the shared tree had uncommitted edits, not tested). Copies on :4458 and :4459, Demo › Reset to the six. Combination "With an LMIA – inside Canada". Date: 2 Nov.
Headless Playwright (Chromium) with axe, data read with psql and the API. Screenshots are kept outside the repository. US$0.

## Journeys
1. Main (author, user-A): Documents › Add a document › new name + source quote › Save (keyboard: Tab, Enter).
2. Hand-off (approver, user-B): opens the combination's group › accepts.
3. Back to the author: the open dialog chooses the type, Save.
4. Alternate: the approver edits the name while accepting; the approver rejects.
5. Error: the same name again, in other letters; empty name; 121 characters; a number as a name.
6. Wrong role: user-B and user-C name a type.
7. Recovery: Undo of the accept after the line exists; reject then name again.
8. Break: six parallel saves in case and punctuation variants from two combinations; Cyrillic, long and accented names.
9. Screen sizes: 400, 640 (200 % zoom of 1280), 1024 px.

## What held
- J1: dialog stays open; notice "waits for a second person", link to the group, details kept. Save to notice 292 ms. axe 0 on the page with the waiting dialog. Keyboard Enter on Save proposes. Empty name: "Choose a document type, or name a new one."
- J2/J3: user-B accepts; within 5.4 s the author's dialog chooses the type ("accepted" notice, name field disabled); Save writes the line (201), dialog closes. Row on the queue reads "Rules, New library item", author's source quote carried.
- J5: 121 characters refused in words (400). Hostile name text is stored and shown as text.
- J6: user-B and user-C: 403.
- J7: after a reject, naming it again proposes again.
- J8: six parallel saves: one 202, five 409, one proposal. Case, spacing and punctuation twins refused in words.
- J9: no sideways scroll at 400, 640, 1024; dialog fits.
- Data: no type, no line and no ADD written by the add; namer stays proposer (user-A) and accepter is `applied_by` (user-B); both get 403 on the ADD.

## Findings
- **Major (correct data).** "Брак 2024" after "Паспорт 2024" is added as a line of type "Паспорт 2024" (201, no proposal). Same for two long names sharing 60 characters. "Café receipt" and "CAFE receipt" both wait and land as `cafe_receipt`, `cafe_receipt_2`. See review-round2.md Major 1.
- **Major (correct data).** Undo of the accept within 10 s, after the line was added, deletes the type and leaves the line. Review Major 2.
- **Minor (feedback).** Notice stays "waits" after the approver renames the type or rejects it; the renamed type is in the select but not chosen.
- **Minor (next step).** The link leaves the page and closes the dialog; the details are lost in a one-browser demo.
- **Minor (words).** A number or object in `proves` or `sourceQuote` gives a 500; a number as a name is proposed as "123".
- **Minor (visual).** Toast covers Save at 1280 px; the queue row wraps the reason into a very tall column and clips "Open".

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 to J3 in two browsers: propose, accept, line |
| Next step obvious | ½ | Notice, link and auto-choice help; the link closes the dialog |
| Plain words | 1 | Toast, notice and 409s plain on every tested path |
| Feedback and state | ½ | Right on the main path; stale after rename or reject |
| Correct data | ½ | Main path exact; wrong-type reuse and a dangling line on Undo |
| Error recovery | 1 | 409s keep the dialog and details; re-propose after reject works |
| Accessibility and screen sizes | 1 | axe 0; 400, 640, 1024 px; keyboard path |
| Speed | 1 | 292 ms to save; type chosen within 5.4 s |
| Visual quality | ½ | Toast over Save; tall queue row |
| Trust and sources | 1 | Marked Rules and Sample, source quote carried, type made by a person |
| **Total** | **8/10** | Pass on score; verdict stays Block on the two Majors |

## Fixes that would raise the score
1. Name-only reuse and waiting check; Undo refuses while a line uses the type (Correct data).
2. Notice reads the proposal's outcome (accepted under another name, rejected) (Feedback).
3. Open the review link in a new tab or keep the dialog's details (Next step).

## Not tested
A real screen reader, a headed browser, an intended user's unaided walk (D17 and D20 stay with the founder), the uncommitted fixes in the shared tree.
