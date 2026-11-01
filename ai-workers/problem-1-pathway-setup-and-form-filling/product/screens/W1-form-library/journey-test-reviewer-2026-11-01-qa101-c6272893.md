# Journey test: reviewer, QA-101 to QA-103 (PR #274, head 1b99e233), 1 Nov 2026

## Re-run at c6272893

I ran journeys 1, 2, 4, 5 and 6 again.

* Journey 2: the line's only next step is now its own chip, "Step 2 of 6 · Field map · Your step". Tab and Enter open "Draft with AI or add from the library", so it is no longer a dead end.
* Journey 4: after a Rules-only find the line still reads "IMM 1294 (06-2026) · File in the library".
* Screens: axe 0 and no sideways scroll at 1440, 1024 and 400 px. The tab loads in 600 ms.

**Score: 9.5/10. Pass.**
* Next step obvious, Feedback and state and Correct data each rise to 1.
* Error recovery stays at ½: the failed-download path was not exercised.

The first run at 1b99e233 follows.

---

Copy `rv_qa101` on :4473 (stand-in launcher, US$0). Persona: content publisher (`user-A`). Browser: Chrome headless (Playwright). No visible pane was available here.

## Journeys
1. **Main path.** Study permit after a find that names IMM 5483 (checklist), IMM 1294 (new) and IMM 5707 (already attached).
   * Expected: the checklist is not a line, IMM 5707 is not offered twice, and IMM 1294 says where its file is and what to do next.
   * Result: holds on first view. The finder strip reads "AI found 2 forms"; the IMM 5483 row reads "Checklist · in the library, read for documents, not filed" with "Open the Form library"; IMM 5707 has no "Add to this combination"; IMM 1294 shows "IMM 1294 (06-2026) · File in the library · Next: read its form fields in Shared library › Forms".
2. **Step across the boundary.** Follow the IMM 1294 next step into Shared library › Forms.
   * Result: **dead end.** The library row's "Re-read with AI (fields and boxes)" is greyed out, and its tooltip says "map it from its Forms tab". The working step is the line's own chip, "Step 2 of 6 · Field map · Your step" (review M1).
3. **Follow the checklist link.** Result: `/library/forms` opens; the IMM 5483 row reads "Checklist · 08-2025 · No field map · Not filed". It holds, but the link opens the whole list rather than the row.
4. **Alternate: Find again › Rules only (US$0).**
   * Result: the IMM 1294 line flips to "No edition read yet · No file yet: upload it or find it in Shared library › Forms". At the same time its setup panel says the 06-2026 edition is in the library (review M1).
5. **Keyboard only.** Both new links can be reached with Tab, show a 2 px focus outline, and open with Enter.
6. **Screen sizes.** No sideways scroll at 1440, 1024, 400 or 512 px (200 %). axe AA reports 0 at each width.
7. **Break it.** Tried a stand-in find naming the employer form IMM 5802 (library type Form, kind `document`) on three work-permit combinations. It could not run: no recorded page prints the number. From the code, the finder would refuse it as a checklist (review M2).

## Data underneath
* After the live find: IMM 5483 is a `gov_form_def` with kind checklist and 1 edition, and no `combination_form`.
* IMM 1294 has a DRAFT line. IMM 5707 has one line.
* The run step says "1 kept in the library as a checklist (read, never filed)".

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The checklist is kept out of the lines; no double add for IMM 5707 |
| Next step obvious | ½ | Two different next steps on the IMM 1294 line; the library one is a dead end |
| Plain words | 1 | The new copy is plain; no codes |
| Feedback and state | ½ | The line's state flips after a Rules-only find |
| Correct data | ½ | "No file yet" is shown while the library holds 06-2026 |
| Error recovery | ½ | The failed-download path did not change and was not exercised |
| Accessibility and screen sizes | 1 | axe 0 at 3 widths and at 200 %; keyboard works; focus visible |
| Speed | 1 | The tab loads in 479 ms |
| Visual quality | 1 | The finder row and line read cleanly at 400 px |
| Trust and sources | 1 | IRCC's words quoted; "Picked by AI · Sample" kept |
| **Total** | **8/10** | Pass (8 and no 0). The review still blocks on M1 and M2 |

## What would raise the low scores
1. Take the line's edition and next step from the line's library record, and point the next step at the step chip.
2. Re-check after a Rules-only find.

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A live canada.ca find.
