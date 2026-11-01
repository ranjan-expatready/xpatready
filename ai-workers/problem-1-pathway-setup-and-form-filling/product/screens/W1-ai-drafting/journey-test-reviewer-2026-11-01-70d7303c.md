# Journey test (reviewer): C3.4 part 1, sections and answer lists by the rules, commit 70d7303c

Isolated copy `rev_c34` on :4455, six loaded, headless Chromium (Playwright). Scripts kept outside the repo. US$0, no live AI. Review: `review-c34.md`.

## Journeys
1. **Main.** The author drafts IMM 5257's masters: Library › Forms › IMM 5257 ⋯ › Re-read with AI › "Draft sections and lists · US$0".
   - Expected: the proposals are made, with a count and a link.
   - Held, keyboard only (2 Tabs to the button):
     - The draft took 222 ms and the panel said "30 proposals wait on To review. Open Proposals".
     - The data had 30 rows in `proposal_item`, step `masters_edition`, each with origin rules, band Check, Sample, lands on library.
     - The audit line was written.
2. **Next step.** The author clicks "Open Proposals".
   - Expected: IMM 5257's 30 items.
   - Got: the oldest group, "IMM 5707 E …" with 9 Ready items. IMM 5257 (09-2023) is further down the group list. This is a wrong turn (Minor 1).
3. **Reviewer checks an item.** Opened Country of birth, Gender mel and Buttons header.
   - Each side panel shows the kind, Sample, "Why a person looks", the reading, IRCC's words with file and edition, and the rule passed.
   - Unclear points:
     - "First reading · saved run" appears under the heading "From the rules, no AI reading".
     - The Buttons header quote is the generated name, shown as "found in the file" (M1).
     - "Gender mel" is the list name, while the box says "Sex".
4. **Accept and approve hand-off.** Accepting a section and two lists gave DRAFT rows plus WAITING changes for a second person. Held.
5. **Double click and race.**
   - A second click says "Already drafted for this edition" and nothing new is made.
   - Two clicks at once share one job (builder check, re-read in code: advisory lock).
6. **Duplicate across editions.** Province abbrev and Country of birth (hashed identity) accepted from a second edition were refused, 409, in words.
   - The wording shows `"codes:261:f31d…"` for a long list and the comma-joined codes for a short one, not the list's name (Minor 5).
7. **Error: replay or live.** A 409 says no saved AI run exists and points to the rules pass. A checklist is refused with a 400 in words. Unknown sources get 404 and unknown modes get 400. Held.
8. **Wrong role.**
   - The approver gets 403 from the API.
   - The "Re-read with AI" menu item is disabled for non-authors (`library-forms.tsx:322`).
9. **All six.** All 16 editions drafted (201). Lists over 400 values were named in the job message, not cut short.
   - 21 of 159 sections are hidden or machine parts: Header, Buttons header/footer, Text field1 (barcodes), Page wrapper, #subform (M1).

## Break-it notes
- Same name with different codes: two "Marital status" lists land in the library, with no near-duplicate note.
- The apostrophe-quoted string path in `choices()` is only reached by the unit fixture; real inventories carry arrays.
- No name clash under `normalizeLabel` across the 25 inventories.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1 end to end; 16 editions drafted |
| Next step obvious | ½ | "Open Proposals" opens another form's group (journey 2) |
| Plain words | ½ | "Gender mel", "Buttons header", "Text field1", hash in the 409, "1 answer lists" |
| Feedback and state | 1 | Count, "Already drafted for this edition", `role=status` / `role=alert` |
| Correct data | ½ | Lists exact (marital 8 choices); chrome sections proposed; quote marked found when invented |
| Error recovery | 1 | 409/400/404/403 in words; duplicates refused at approval with a way out |
| Accessibility and screen sizes | 1 | axe 0 (dialog, 3 side panels); 400/640/1024 px no sideways scroll; keyboard path; focus falls to the dialog after the busy button (shared) |
| Speed | 1 | 15–222 ms |
| Visual quality | 1 | Existing dialog and queue components, nothing broken at 400 px |
| Trust and sources | ½ | "Rules" pill right; "saved run" label and invented "found in the file" quote wrong |
| **Total** | **8/10** | Pass (8+, no 0) |

## Fixes that raise the low criteria (most valuable first)
1. Leave out invisible and calculated parts. Quote the printed heading, or set `quoteFound: false`. Raises correct data and trust (M1).
2. Link to the edition's group, `?group=edition:<edition>`. Raises next step.
3. Label a rules reading as "rules, US$0". Name lists by their label in the 409. Fix the "Gender mel" style names. Raises plain words and trust.

## Not tested
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- The combination dialog entry in the browser (same panel and route as journey 1).
