# Journey test — C11.12 on #500 (merge with R2) · reviewer · 2 Nov

**Commit:** c0211908. **Copy:** `rev500` on :4471, a fresh database each run. Visitor visa released by `setup_visitor_visa.ts` (13/13). US$0.
**Script:** `/tmp/claude-0/-home-user-xpatready/8e4dec5e-2543-5f8f-8654-971a92f276b3/scratchpad/br/journey.cjs`. It ran twice, 23/23 both times. Screenshots are in `…/scratchpad/br/shots/` and are not committed.
**Limits:**
* The case's filings and fees have no screen yet (C6.12 UI not built), so J2 reads them from the API: the step across the boundary.
* Release and sign-off are other screens, so J2 drives them through the API.

## Journeys (main path first)

| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 | Configuration author: "the spouse goes on my client's application" | Forms › Visitor visa › Who can be in this application; Edit by keyboard; Filing for Spouse → On the principal's application; Save, pressed with Enter twice | The Guide 5256 warning appears; "What a case gets" changes before Save; the mode is stored once, with an audit line | Held. "3 filings in one submission" became "2 filings in one submission". Warning: "⚠ Check this: Guide 5256 says family members complete their own application forms. You can still save." The database holds `on_principal` with one spouse line. Audit line present |
| J1b | Same author, other sizes | Read view at 400, 1024 and 1440 px; axe on the card | No sideways scroll; WCAG 2.2 A/AA clean | Held. Scroll 0 at all three widths; axe found 0 issues |
| J2 | Case officer, across the boundary: "what do we file and pay?" | Release; open a case; add a spouse and a child; read Prepare | 2 filings: the principal's (principal + spouse) and the child's own. Visa CAD 300. Biometrics waits for the dates of birth | Held. 2 filings, 2 stored and active. Visa 3 × CAD 100. Three biometrics lines say "Waits for … date of birth", never charged or exempt in silence. Basis: "fee table as of 2026-09-21 … Sample" |
| J2r | Recovery: the spouse stops travelling | PATCH person `applies: false`; read again | The spouse is declared only on the same filing; no fee line; visa CAD 200 | Held |
| J3 | Author, empty state: a brand-new combination | Add a category; create its combination; read its row and page | One next step on the row and on every missing line | Held on c0211908: Find forms ×3, including "Filing for Spouse or partner, Filing for Child: not set". It failed before c0211908 ("Set the filing" as a second step) |
| J4 | Wrong role | The approver opens the card; the approver sends PATCH /people; the author reads the case's Prepare | No Edit; 403; 403 | Held |
| J5 | Error: release with a filing not set | Read the new combination's release problems | "Filing for Spouse or partner", "Filing for Child" at level error | Held |

**Data underneath:** checked in each journey. Records exist once, values are as entered, an audit line is written, and the server enforces roles.

**Break pass:** the breaker's report (`break-report-pr500.md`) covers duplicates, races and hostile table edits. My own engine probes:
* A sponsorship line priced via the release's modes onto the sponsored principal, while `fees_why` denies the charge. This is review M1.
* `per_application` with roles, and the covers count with declared-only people: untested (review m2).
* Each `per_application`, per-role and per-group mutation the tests should catch was caught.

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 done end to end |
| Next step obvious | 1 | J3: one step on the row and on every missing line (c0211908) |
| Plain words | 1 | Warning, "What a case gets" and fee reasons are in words; no codes on screen |
| Feedback and state | 1 | The preview changes before Save; fees not worked out are null, never CAD 0 |
| Correct data | 1 | Shipped totals unchanged; stored filings and modes exact (J1, J2) |
| Error recovery | 1 | J2r: travelling switch keeps the filing id; a bad table edit is not derived |
| Accessibility and screen sizes | 1 | axe clean; 400, 1024 and 1440 px with no sideways scroll; keyboard save |
| Speed | 1 | Card ready in 1.6–1.8 s cold; Prepare in 121–138 ms |
| Visual quality | 1 | Card unchanged from the PR 3 approval (`shots/j1-read-1440-*.png`) |
| Trust and sources | ½ | Sample and the table's date are shown. But the M1 path would show a charge its own words deny |

**Score: 9.5/10. Pass** (8 or more, no 0). To raise trust to 1, fix review M1.

**Not tested:**
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
* `per_application` through the API (no shipped line uses it).
