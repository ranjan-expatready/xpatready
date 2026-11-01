# Journey test (reviewer): C2.4 same file again / newer edition held, commit 6c940174

1 Nov 2026 · isolated copy `forms_rv4` on :4457 (fresh database, web built from the commit) · Playwright Chrome headless,
axe WCAG 2.2 AA, widths 400/1024/1440 · official IMM 5476 PDFs (11-2021 previous edition, 11-2025 current) · US$0.
Screenshots were kept outside the repository (this role writes only the review and this report).

## Journeys (persona: configuration author, then the same author on To review)
1. **Main, same file again**: Shared library › Forms › Upload PDF → IMM 5476 11-2021 → "added to the library as a new
   form"; upload the same file again → card "Already in the library: IMM 5476 (11-2021). Nothing duplicated." and
   "Already in the library: nothing was added twice." Library table: one row, edition 11-2021. Held.
2. **Main, newer edition**: Upload PDF → IMM 5476 11-2025 → step 4 "New edition: impact review needed. IMM 5476 (11-2025)
   is newer than the library's IMM 5476 (11-2021). It is held: not added…, not attached and not used…". Library unchanged.
   Held.
3. **Next step from the card** (step across the screen boundary): the card's callout says "Held: record the IRCC page it
   came from on To review; then a second person compares and approves it", link "Record the IRCC page it came from" →
   `/review/held/<id>` "Not on the approved source list … Paste the canada.ca page". **Wrong turn**: the file is approved
   and the right step is the impact review. Source: `api/src/upload-run.ts:162`, `api/src/runs.ts:87`.
4. **Next step from To review**: "New edition (1)" → row IMM 5476 (11-2025), "A newer edition of a form in the library…",
   "Review impact" (Enter from the keyboard) → `/review/edition/<id>`: 11-2021 → 11-2025, 30 unchanged, 7 reworded, 16 new,
   6 removed form fields, "without AI … US$0". Held.
5. **Alternate, older edition** (sample loaded, library holds 11-2025): upload 11-2021 → `older_edition_held`; To review
   lists it under the filter "New edition (1)" with badge "New edition" and text "An older edition than the one in the
   library…", next step "See the older edition". Words contradict (`api/src/review-queue.ts:206`).
6. **Combination path** (after reset: pathway → program → category → combination via the product's API, then intake on
   it): 11-2021 added and attached; 11-2025 `new_edition_held`, no attachment row. Held (not covered by the builder's test).
7. **Recovery**: the held 11-2025 sent again → "Already waiting for a person…", still one held item (API). Held.

## Data underneath
One `form_edition` per edition actually added; held items one per checksum; `source_attachment` only the 2021 row on the
combination; `drafting_job` count unchanged throughout (no AI). Builder's test 11/11 three times.

## Break it (short)
Same file twice in a row, held file re-sent, older after newer, newer on a combination: no duplicates. Mutation M4
(attach a held newer edition) is not caught by the builder's test (see review-c24.md, Major 1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 6: same file not duplicated; newer edition held, not added, not attached |
| Next step obvious | ½ | To review right ("Review impact"); the upload card sends the person to source verification (J3) |
| Plain words | ½ | "Not on the approved source list" is false for an approved file (J3); older editions labelled "New edition" (J5) |
| Feedback and state | 1 | Run card steps, "Waiting for you", To review counts and status |
| Correct data | 1 | Counts above; one held item per file |
| Error recovery | ½ | Re-upload safe (J7); the wrong link leads to a page whose action ("Record the page") does not apply |
| Accessibility and screen sizes | ½ | axe 0 on Forms, To review, edition review; 0 px sideways at 400/1024/1440; keyboard walked only for "Review impact"; 200 % zoom not checked |
| Speed | 1 | Uploads finished in ~120 ms after the file chooser; pages under 1 s |
| Visual quality | 1 | Team look, tones match (warn for new edition, neutral for older) |
| Trust and sources | ½ | Origin and US$0 shown; but the false "not approved" claim undermines trust in the source check |

**7.5 / 10, no criterion at 0: below the pass mark (8).**

## Fixes that raise the score, most valuable first
1. Upload card for `new_edition_held`: "New edition: impact review needed", link "Review impact" → `/review/edition/<id>`;
   for `older_edition_held`: "Older edition: not used", "See the older edition" (next step, plain words, trust, recovery).
2. Older editions not under "New edition" on To review (plain words).
3. Keyboard-only and 200 % zoom pass over the upload card (accessibility).

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); a live canada.ca fetch.
