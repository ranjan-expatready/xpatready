# F1 forms channels, slice 1 · journey test (reviewer role) · 23 Oct

Backend slice, no page: the journeys were walked through the API on :4451 (`xr_studio_forms_review`) as each person would act, one request per step, with the actor set by `x-actor`. Data was read back after each step with SQL. Screenshots, axe and screen sizes do not apply. AI spend US$0 (the IMM 5257 PDF twin is the saved real draft of 21 Oct, replayed). Scripts were kept outside the repository (reviewer scratch); the evidence is quoted below and in `review.md`.

## Journeys (persona · goal · result)
1. **Main path.** Author: "record the online visitor visa screens"; reviewer: "approve them"; author: "file IMM 5257 online".
   Capture (201) → 3 blank screens added, 13 questions (0.7–2.6 s) → finish: HELD with fingerprint, twin and review PDF (**62 s**) → user-C approves: online version, re-check by 2027-04-21 (0.2 s) → draft screen map: 9/13 from the PDF twin, 0 AI calls (0.2–0.5 s) → accept: 9 mapped, 4 open, 7 aliases learned → portal set, IMM 5257 Online: "Online + PDF uploads", signature "The client signs the declaration in the portal" → validator error "4 online inputs are neither mapped…".
   **Stops here: an author cannot resolve the 4 open inputs** (accept and redraft both answer 409), so submit is refused for good.
2. **Fill with option map (alternate).** Answer list `marital_status` (Sample) linked → option maps drafted for the PDF (`married→01`…) and online (`married→MARRIED`…), 0 unmatched → fill IMM 5257: marital status written `01`. Without `married` in the map: "by hand: "married" has no code in this form field's option map", and the validator names it. Held.
3. **Answer list on a form whose codes are only in its transform text (alternate).** The same list makes IMM 5707 unmappable: the draft gives `[]`, a PATCH with the form's real codes is refused, and there is no unlink. **Dead end** (review Must 1).
4. **Template (alternate).** The spreadsheet template gives 2 screens and 6 questions. A template with an answer column is refused. An extra `client_value` column is ignored and not stored. An invalid date part at finish gives 422 "screen 1, input 1/part: must be equal to one of the allowed values". Held, but that last message is not plain words.
5. **Empty.** Finish with no screens: "Add at least one screen before finishing the capture." An empty file: "The file is empty." A bad id: 404. Held.
6. **Error (hostile files).** Ticked radio, ticked checkbox, filled text area, dated value and chosen option are all refused, with the label named and nothing kept. 11 MB and 31 files are refused, but the words are wrong ("25 MB", "20 files"). A heading with a client's name and UCI is **kept** as the screen title. A "Please select…" placeholder marked selected refuses a blank screen.
7. **Wrong role.** The capturer approving gets 403 with a plain reason. The reviewer starting a capture gets 403. The proposer approving a merge gets 403. A missing or unknown `x-actor` acts as the author (pre-existing `core.ts`).
8. **Recovery.** Double approve: one edition plus 409. Double accept: 409. Double merge: 409. **Return loop fails**: the corrected screen is appended next to the bad one, and the re-finished capture has 20 questions with duplicate ids, so accept is impossible (generic 409 "Refresh to see the current state"). An identical re-capture after the re-check date ends IN_LIBRARY, the **date is not renewed** and release stays blocked.
9. **Two tabs.** Two adds at once both answer "added", but 1 screen is stored. An add during finish answers "added" and the held record omits that screen. Two channel edits at once both return 200 and the last one wins.
10. **Across the boundary (library and merges).** Alias "City or town" → the redraft matches by alias. Merge town_of_birth into place_of_birth_city: the published row gets a draft version and the release sha is unchanged. Chain and fork merges leave an id redirecting to a retired field or to two fields. A learned generic alias "Country or territory" proposes `person.country_of_birth` for a residence question. A spouse screen gets the applicant's fields.

## Data underneath (checked after each journey)
One capture row per capture, holding structure only: no values in `record`, `files` holds checksums only, and `capture-reading/` is empty after reading. An edition row with `channel ONLINE`, portal, `captured_on`, `recheck_by` and the fingerprint; the partial unique index allows one per identity. Map rows have origin `CODE_MATCH` and the PDF evidence quote. Channel edits are versioned as `combination_form` drafts. An audit line exists for start, add, refuse (checksum only), finish, approve, return, draft, accept, channel, portal, list, link, option map, merge, plus per-combination merge lines. Roles are enforced on the server.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1–2 and 10 complete; an Online line cannot be released through the product (J1); dead ends in J3 and J8 |
| Next step obvious | ½ | Each capture state names its next step ("Next: draft its screen map (no AI)"); RETURNED and IN_LIBRARY point to actions that do not exist |
| Plain words | ½ | Refusals and validator mostly plain; wrong limits; "box" in new Screen 02 text; repeated captions; raw contract text at 422 |
| Feedback and state | ½ | Clear statuses and difference lists; "added" reported for screens that were lost (J9); generic 409 for duplicate ids |
| Correct data | ½ | Core path correct, releases untouched, migration preserves every row; lost updates, merge fork and chain, wrong-person and wrong-alias proposals |
| Error recovery | ½ | Hostile files and doubles handled well; no recovery from a return, a re-check date or an answer-list link |
| Accessibility and screen sizes | n/a | No page in this slice |
| Speed | ½ | Most calls 0.2–0.7 s; finish 62–114 s inside the request (load 9–25; print alone 10 s) |
| Visual quality | n/a | No page; the review PDF is clean and readable (`screenshots/slice1/review-page-1.png`) |
| Trust and sources | 1 | Sample banner on the review PDF, PDF-twin evidence quote per proposal, `CODE_MATCH` origin, capturer and approver named, US$0 stated |

**4.5 of 8 applicable criteria = 5.5/10. Fail (pass is 8 or more).**

## Fixes that raise the score most (in order)
1. Let a person map or mark "not a fact" one online input after acceptance (task completed, recovery).
2. Read PDF codes from `code_list:` for option maps and allow unlinking a list (task completed, correct data).
3. Claim the capture row on add and finish, refuse duplicate ids at finish, and allow removing a screen of an open or returned capture (correct data, feedback, recovery).
4. Confirm or renew the re-check date on an identical re-capture (next step, recovery).
5. Move review-PDF printing to the worker and show "printing" (speed).
6. Re-check fields at merge approval; apply one-label-one-field and the group to learned aliases; carry the screen's person (correct data).

## Not tested
A visible browser (no page), axe, keyboard and widths (no page); a real IRCC portal screen; an intended user's unaided walk (D17 and D20 stay with the founder).
