# Journey test (reviewer, round 2): C11.3 QA-150 at da70b996

Reviewer agent, 2 Nov 2026. Isolated copies :4443 (sample "six") and :4444 (fake launcher), never :4400. Headless Chromium (`/opt/pw-browsers/chromium`). US$0. Screenshots are in the reviewer's scratchpad (not committed): `list-{1440,1024,400}.png`, `filter-*-1024.png`, `long-{1440,1024}.png`.

## Journeys (configuration author, user-A)
1. **Main: see where a form is used.** Shared library › Forms. Read Used by for each form. Expected: the name first, then the trail from the Pathway type, at most 2 lines. **Held** at 1440, 1024, 400 and 200 % (max 2 lines; the full trail is in the tip and in "See where it is used").
2. **Alternate: filter by one combination.** Choose Visitor visa, then Super visa, then With an LMIA. Expected: the closed filter tells them apart and the rows follow. **Held.** It shows "Visitor visa · Retail › Tempora…" and similar, with 5, 4 and 9 rows. With the keyboard, ArrowDown on the focused filter moves to the next combination.
3. **Edge: very long and non-English names.** A category of 119 × "S" and a German compound as the program name. Expected: they wrap inside the cell. **Held.** Nothing paints over Status, the table scroller is unchanged, and axe finds 0 violations.
4. **Edge: a "|" in a name, then Find forms (rules).** Expected: the run card and AI work show the whole trail. **Held:** "Retail › Temporary residence › Visitors › Super visa | parents and grandparents".
5. **Boundary: the hand-off to the form finder.** The plan shows five parts, the same as the card. The AI gets the same names as before. **Held.** `ai_trail` is unchanged, the job ids have no type and no placeholder, and the finder suite passes 145/145.
6. **Wrong role and recovery.** No change in this round. The round-1 and breaker results stand (403 for the case officer, 401 for an unknown caller, 409 for a stale plan). Not re-walked.

## Data underneath
* `/library/forms/list` gives combination labels as trails in words, with no placeholder.
* The plan `trail` has 5 parts.
* `/runs/:id` scope is the full trail. The AI work scopes match it.
* A mutation (the AI given the five-part `trail`) fails the finder suite. The source file was restored afterwards.

## Break-it (short)
* Long, unbroken and German names held (journey 3).
* A "|" in a name held (journey 4).
* A label containing " › " or a sub-category named "No sub-category" still reads ambiguously (break N2). This was out of scope and left as a note.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–5 done on the product's own screens |
| Next step obvious | 1 | The filter and "See where it is used" are unchanged and clear |
| Plain words | 1 | One rule: no "No sub-category" in any list in words |
| Feedback and state | 1 | The rows follow the filter, and the closed filter names its choice |
| Correct data | 1 | Plan = card; `ai_trail` unchanged; the run scope is whole |
| Error recovery | ½ | No write path in this row; not re-exercised this round |
| Accessibility and screen sizes | ½ | axe 0 and no page-level sideways scroll at every width. A clamped single-trail cell shows its full trail only on mouse hover (`title`); keyboard users get it in the drawer's Where used |
| Speed | 1 | Warm first view 672–705 ms |
| Visual quality | 1 | Rows are dense again (2 lines), name first |
| Trust and sources | 1 | The AI's names are unchanged and traceable in the stored plan |

**9/10, pass** (8 or more, no criterion at 0). To raise it: make the cell's full trail reachable by keyboard (focusable tip), and re-walk wrong-role and stale-plan recovery on this commit.

Could not test: a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); live AI.
