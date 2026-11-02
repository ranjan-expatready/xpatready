# Journey test (reviewer, round 3 merge re-check): C11.3 QA-150 at dbffdf94

Reviewer agent, 2 Nov 2026. Isolated copies on :4443 and :4444, never :4400. Headless Chromium (`/opt/pw-browsers/chromium_headless_shell-1243`). US$0.

The walk scripts and screenshots are in the reviewer's scratchpad and are not committed: `walk.cjs`, `walk2.cjs`, `forms-where-used-1440.png`, `field-where-used-1440.png`, `field-retire-where-used-1024.png` and `forms-filter-1024.png`.

The scope is what the merge touched: the three lists served by `combinationTrails`, which now lives in `api/src/where-used.ts`.

## Journeys (configuration author, user-A)
1. **Main: see which combinations use a form.**
   * Steps: Shared library › Forms, then read Used by.
   * Expected: the name first, then the trail from the Pathway type.
   * **Held at 1440, 1024 and 400.** All 9 single-use cells have a five-part title starting "Retail ›" or "Corporate and employers ›", with no "No sub-category".
2. **Alternate: filter by one combination, by keyboard only.**
   * Steps: Tab to Used by, then ArrowDown.
   * **Held.** The filter shows "Applicant outside Canada · Retail › Permanent residence › Family sponsorship › Spouse or partner", and the table goes from 25 rows to 5.
3. **Where a form is used.**
   * Steps: open a form used by 2 combinations; read "Where it is used".
   * **Held.** It lists "Retail › Temporary residence › Visitors › Visitor visa" and "Retail › Temporary residence › Visitors › Super visa". This goes through form-uses.ts to where-used.ts.
4. **Boundary: the shared library's lifecycle guard (main's SH2 caller).**
   * Steps: Fields, then UCI Retire, opened with the keyboard (Enter).
   * **Held.** Where used shows:
     * "Stops it (2)": Super visa and With an LMIA, each by its five-part trail.
     * "Kept (3)": the release line, also by its full trail.
   * This goes through library-items.ts to where-used.ts. The API gives the same for a section and for a document type.
5. **Wrong role.** `GET /library/fields/person.uci/uses` with no known person is refused with 401.

## Data underneath
* `/library/{fields,sections,document-types}/:key/uses` labels are five-part trails in words.
* The c113 suite checks the Forms list and the filter, and that the plan is the same as the card.
* A mutation (main's old trail body in `where-used.ts`) fails 3 of the c113 checks. It was restored with `git checkout --`.

## Break-it (short)
Not repeated. The merge changes no input, no write path and no words. Round 2's break results (long, unbroken, German and "|" names) stand.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–4 done on the product's own screens |
| Next step obvious | 1 | "See where it is used", the filter and the Where used panel are unchanged |
| Plain words | 1 | One trail rule in words: no placeholder, the Pathway type first |
| Feedback and state | 1 | The filter's rows follow the choice; the closed filter names its choice |
| Correct data | 1 | The same five parts through both callers of the shared service; the mutation is caught |
| Error recovery | ½ | No write path in this change; only 401 was re-checked |
| Accessibility and screen sizes | ½ | axe WCAG 2.2 AA finds 0 on the list (1440, 1024, 400) and on the Where used panel (1024), with no sideways scroll. The clamped cell's full trail is still a mouse-only `title` (as in round 2) |
| Speed | 1 | Forms list first view 485–742 ms |
| Visual quality | 1 | As in round 2 |
| Trust and sources | 1 | The AI's names are unchanged (qa99 3/3, c113 `ai_trail` check) |

**9/10, pass** (8 or more, no criterion at 0). To raise it:
* make a clamped cell's full trail reachable by keyboard;
* re-walk the stale-plan recovery when a write path changes.

## Could not test
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Live AI.
