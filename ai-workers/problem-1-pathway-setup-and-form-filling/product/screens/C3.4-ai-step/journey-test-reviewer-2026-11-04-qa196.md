# Journey test, reviewer role: QA-196 check landers (2026-11-04, commit 8c1cd1dab, PR #802)

Isolated copy b7_rv on :4614 (`xr_studio_b7_rv`, since stopped and dropped). US$0: no `STUDIO_*_LIVE`, saved/stub runs only. Committed code only. Journeys 3–8 ran with PR #771's saved runs merged into a temporary local branch (since deleted, never pushed), as the C3.4 demo needs them. Field-map rows were inserted by SQL as setup, the same way the PR's tests do it (C3.2's journey is out of scope). Browser: Playwright Chromium, headless, with axe-core.

| # | Journey (persona: content publisher, author duty, unless named) | Result |
|---|---|---|
| 1 | Main: open IMM 5257 on To review, open "When military service is declared…", read it, Accept while its fields are unmapped | The panel shows "What it reads": each printed question → "Not mapped to a shared field yet", plus "Map these on the form's field page before you accept it." Accept answers 409 in plain words naming both printed questions. Nothing is written. Screenshot `r2` (scratch) matches the PR's `01-…png` |
| 2 | Main: once mapped, choose "Serious warning", Accept | Reached by keyboard in 5 Tabs. "What it reads" shows "Military service person.military_service" (screen-reader text: "reads the shared field"). Accept edits and lands it: `check_def` gets one DRAFT row, `severity=block`, AI_PROPOSAL. Toast: "Decided. It landed as AC-8702f71823." Undo bar shown for 10 s |
| 3 | Across the boundary: Library › Checks after a reload | One row, "Visitor visa: Serious warning", Draft, AI-proposed. Its heading is the raw key `person.military_service` (the builder lists this as a follow-up) |
| 4 | **Across the boundary: what the landed check does on a case (Draft Preview, `GET /combinations/:id/preview?answers=…`)** | **Inverted.** The military check says "No military service" and it **fires** a serious warning. The guide check fires "An applicant under 18 has the form signed…" for a 30-year-old, and stays **silent** for an unsigned 12-year-old. Declared service (`true`) with no details also fires, but only because the condition is always true (see review B1, M1) |
| 5 | Alternate: a check over two answers, edited to a serious warning (API) | 400, "severity: Invalid input: expected "warn"". Accepted as it is, it lands as `cross_record|warn` |
| 6 | Two combinations file IMM 5257 (Outside Canada added through the product's own `POST /combinations/:id/forms`) | One key on both combinations. Library › Checks shows one row, used in "Outside Canada, Visitor visa". Undo removes both rows and the item waits again |
| 7 | Line removed from Outside Canada (`DELETE …/forms/IMM 5257` → v1 RETIRED) | Lands on Visitor visa only. With no line left anywhere, the code answers 409 "No combination files…" (read in the code, proven by the PR's test) |
| 8 | Recovery: double click (two Accepts at once) | 201 and 409 "already decided". Exactly one set of rows |
| 9 | Recovery: Undo after one combination's copy changed (`updated_at` bumped) | 409, and both rows stay. The words name the check by its raw identity key `"IMM 5257 (09-2023)\|form1[0].Page3[0]…"` (review m1) |
| 10 | Wrong role | Content reviewer (no author duty): 403. Approver: 403. Nothing is written |

**Data underneath:** each accept writes one `check_def` row per filing combination: version 1, DRAFT, AI_PROPOSAL, the guide's quote, `illustrative=false`. The proposal goes waiting → accepted/edited, and Undo sets it back to waiting. A reject writes no check and keeps the reason. The audit has one batch line ("accepted 1 proposal"). Money spent: 0, by the drafting_job sum.

**Sizes and accessibility:** no sideways scroll at 1440, 1024, 400 and 512 px (200 % zoom of 1024). axe WCAG 2.2 A/AA: 0 violations on the open panel and 0 on Library › Checks. The only console error is the expected 409 resource line.

**Speed (load average 8–16):** group open is 60–570 ms by API with 17 form checks and 1.1 s in the browser. Accept takes under 2 s.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Accept, edit, reject and undo all work and the check is visible after a reload (J2, J3, J6). But what lands does the opposite of its sentence (J4) |
| Next step obvious | ½ | The refusal says to map the fields first, but there is no link to the field page. The item still sits under "Ready to accept" (whose tip says "accept these together") when Accept is certain to be refused |
| Plain words | ½ | The panel and the 409 use printed questions. The Undo and bulk refusals print the raw identity key (J9), and the toast says "landed as AC-…" |
| Feedback and state | 1 | Toast, Undo bar with a countdown, refusal toast, panel closes |
| Correct data | **0** | Every landed AI check is stored with the opposite meaning (J4), and a form check keeps the form's printed values ("Yes", "* Yes", "Married") against shared fields (review M1) |
| Error recovery | 1 | A 409 writes nothing, double click is safe, Undo works across combinations and refuses after a change |
| Accessibility and screen sizes | 1 | axe 0, four widths clean, keyboard reaches the select, screen-reader text on the arrow |
| Speed | 1 | Within budget on sample data |
| Visual quality | 1 | Team components; the section matches the panel's other headings |
| Trust and sources | 1 | AI-proposed, Sample, IRCC quote with file and edition, both readings |

**7.5 / 10, with a 0 on Correct data: fail.** Fixes, most valuable first: (1) land the condition as when the check fires (`not` of the AI's pass tree), with a test that fires on Draft Preview; (2) translate compared values through the field map, or refuse with a 409 naming them; (3) give check names in plain words in Undo and bulk refusals; (4) link "Map these" to the form's field page.

Not tested: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); a two-tab race between two *different* proposals with the same sentence (no unique constraint; same as `saveCheck`).
