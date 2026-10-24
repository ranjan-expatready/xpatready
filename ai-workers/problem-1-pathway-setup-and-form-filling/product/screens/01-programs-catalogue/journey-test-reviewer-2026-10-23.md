# Screen 01 — journey test (reviewer role, 23 Oct 2026)

**Commit:** `c0e8ff98`. **Copy:** isolated copies on :4440 behind the page proxy on :4441 (QA-4), with the sample inputs loaded and model calls refused (no paid AI). Every copy ran on a fresh database and was dropped afterwards.
**How:** I wrote the journeys from the concept, the decisions and PRODUCT.md §1 before using the app. I walked them in Chrome (Playwright, headless; I looked at a screenshot at each decision point), using only what a person sees. I then checked the data through the API and SQL.
**Replay:** the builder's browser suite, my copy, run twice on fresh copies: **115/115 both times**, with axe on every state, 1024 px and 1440 px, console errors and timings. Neither run was flaky. My own journey scripts are in my scratchpad (`jt/*.cjs`).
**Screenshots:** temporary, in my scratchpad `jt/shots/`.

## Journeys (persona · goal · result)
| # | Persona and goal | Result |
|---|---|---|
| J1 Main | Content publisher: "Find Visitor visa, see what's missing, take the next step" | **Held.** Needs work · 20 shows the row. Clicking it opens the page with the path, In setup and "Next step: Add 1 form from the library". The missing list gives two causes and says the step once. Clicking the step adds IMM 5707 (toast) and the next step becomes "Draft setup", marked as AI |
| J2 Alternate | Content publisher, keyboard only at 1024 px: "Create Visitors › Visa d'été — 日本語" | **Held.** 17 Tabs reach New combination. The type-ahead offers Create "…". The hints read "new · no duplicate found" and "not applicable: the category is the combination", and the preview says "Will be created as …". Enter creates it in 39 ms and lands on Sources. No sideways scroll, axe 0. The status and next step appear about a second after landing (the list refetches) |
| J3 Error | Content publisher: a 121-character name, then "!!!", then an existing path | **Held.** The field shows its message in red with `aria-invalid`, and Create is off for both. For the existing path, "This combination already exists" → "Open the existing combination" opens `/c/<id>` (QA-11) |
| J4 Governance | Author, then approver, then SME, then approver: release one Live row | **Held.** The approver first sees both rows "Held back: Not submitted…" and a disabled "Nothing ready to release". An API bypass gets 409 and the author gets 403. The author submits ("Submitted by Configuration author"). The release is held: "2 changes need the content reviewer's SME sign-off". The SME clicks "Select all I can sign", then "Sign 2", and the row reads "Will be released". The approver releases Release 3. The DB records submitter user-A and approver user-B |
| J5 Wrong role | Approver tries to create; an unknown caller tries to create | The approver gets 403. **An unknown or missing `x-actor` is treated as the author (201).** This was labelled "Not built" earlier; see review.md |
| J6 Recovery | Author removes IMM 5409 from a Live row, then adds it back | **Partly held.** The removal is saved as a draft and the re-add works (QA-13). **But the re-added line lost "Once per couple, conditional"**: it came back as each applicant, always. Also, the Overview still lists the form, the "+ Add form" panel says "Added", and the header says "Add 1 form from the library" (J6-5, J6-6) |
| J7 Empty and reset | Author: reset the demo, see the empty state, make one combination by hand | **Held.** The empty state teaches the first action ("Create the first one with New combination…"). The Demo menu says "Load sample inputs", then after the hand-made combination "Load sample inputs (programs exist: reset first)", disabled (QA-12) |
| J8 Back and boundary | Author: open a row from the list, then go back to the list | **Held via the in-page "Programs" link**, which restores the row, the focus and the scroll (scrollY 307). **Browser Back** restores the filter but not the highlighted row. Crossing the screen boundary into the Configuration, Sources and Review tabs works |
| J9 Race | Two tabs and parallel requests | Five parallel adds → one line. Three parallel releases → one release, two 409s, one audit trail |

## Data underneath
Each record exists once. The times are stored correctly even though the database runs in Asia/Kolkata (QA-5). Each refused release is audited. `review_submission` is closed as APPROVED by user-B. The P-63 sweep of 19 pages found no "box" anywhere.

## Findings
1. **Major:** undoing a removal resets who files the form and when (`form-lines.ts:33-36`). Review Must 2.
2. **Major (process):** the QA-9 test updates are not in the commit. Review Must 1.
3. **Minor:** the removed-form signals contradict each other (Overview, "+ Add form" panel, header). Review Should 1.
4. **Minor:** browser Back does not highlight the opened row. Review Should 5.
5. **Minor:** the Review tab shows a fingerprint hash and internal keys (Screen 03 scope); the approve error says "hash".

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4 and J7 completed through the product's own screens |
| Next step obvious | ½ | One step per row, said once; but after a removal it suggests re-adding, and the panel says "Added" (J6) |
| Plain words | ½ | P-63 complete; the Review tab used in J4 shows a fingerprint, item keys and "hash" |
| Feedback and state | 1 | Draft bar counts, held reasons with what to do, field errors, toasts |
| Correct data | ½ | Races are safe and the release records are right; the re-add rewrites who and when on a Live row |
| Error recovery | 1 | Field messages, 409 with a reason, refused releases explained, nothing lost on reload |
| Accessibility and screen sizes | 1 | axe 0 on 19 pages and every suite state; 1024 px and 200 % zoom with no overflow; keyboard path; visible focus |
| Speed | 1 | Warm first view 207–215 ms; filter 120–141 ms; catalogue API 12 ms (one cold load at 1.7 s on a loaded machine) |
| Visual quality | 1 | Team look, aligned table, quiet chrome |
| Trust and sources | 1 | AI steps marked with tooltips, origin pills, sources tab, release by and when |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no criterion at 0) |

**To raise it, most valuable first:**
1. Restore the released line on undo (correct data).
2. Make the removed-form state agree in all three places (next step obvious).
3. Plain words on the Review tab, which belongs to Screen 03.

## Could not test
* A real screen reader.
* A visible (headed) walk; I used headless Chrome and screenshots.
* AI drafting (QA-8; no paid AI).
* The Online channel.
* An intended user's unaided walk: D17 and D20 stay with the founder.
