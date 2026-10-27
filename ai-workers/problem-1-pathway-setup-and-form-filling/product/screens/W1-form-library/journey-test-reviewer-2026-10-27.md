# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, round 2, 27 Oct 2026

Commit e58136e (`forms/2026-10-27-s4-form-library`). Isolated copy `rev_s4` on :4461 with the stand-in launcher; a stub probe answered first; no model call, no canada.ca call (recorded copies). Walked in a visible Chrome through Playwright by clicking and typing; screenshots `review-shots/v3-*`. US$0. Round 1 (commit 6a32505, 6.5/10) is in git history.

## Journeys (persona · goal · result)
1. **Main.** Content publisher (user-A): "find a form, see what it is, where it is used and what IRCC accepts". Menu Forms → list (166 ms) → Guides chip (2 rows, 131 ms) → Used by Visitor visa → search "5257" and "imm5257" → no match → Clear filters → drawer for IMM 5257 → Esc. **Held** (v3-j1-*). Focus returns to the number. **Found:** Visitor visa's filter leaves out IMM 5484 and IMM 5881 (checklists it reads); both rows say "Not used" while their drawers list the uses (v3-r-IMM5484-drawer).
2. **Upload one PDF.** "Add IMM 5645." Four rules steps, "Rules read it … No AI call was made", "The very file canada.ca's form page links: no second person is needed. Named by Guide 5256." Row Ready in 1.5 s. **Held** (v3-j2).
3. **Upload many with bad ones.**
   * (a) Text named .pdf + empty file + local copy + duplicate: the page said only "empty.pdf is empty"; no card; the two files after it were never uploaded, and the text file before it ran with no card (database: one failed run at 20:34:33). **Not held** (v3-j3).
   * (b) Same without the empty file: three cards. "Not a PDF … Nothing was read." · held local copy of IMM 5562 with "Record the IRCC page it came from" → its To review item, which asks exactly that · duplicate "Already in the library: nothing was added twice". **Held** (v3-j3b-*). The held IMM 5562 is not in the library list.
4. **Run card, chip and Stop (W1-07).** A live finder run on Visitor visa through the stand-in, hanging in its AI round, launched by API (the finder's button comes with S5). The chip appeared after 5.4 s, followed to Fields and showed at 390 px. Opened by keyboard → card "Step 3 of 6 · Running · first run of this kind · at most US$5.58". Stop → Stopped in 104 ms; launcher process gone; later steps "Not needed"; no pid file; `p2/jobs`, `runs` and `ledger` unchanged. **Held** (v3-j4-*).
5. **Retire and delete.** Retire IMM 5645 (unused): where used first, a reason, then "Retire waiting" on the row, and focus back on ⋯. user-B approves; the row keeps "Retire waiting" with a tooltip that still says "waits for a second person". Delete of IMM 5257 and IMM 5484 is refused ("retire it instead"). **Held, one wording gap. Found:** Retire on Guide 5256 fails: "GUIDE 5256 is not in the library." (v3-g-guide-retire).
6. **C11.18, set what IRCC accepts.** Empty send → error on the form. Then PDF upload · Online with the canada.ca line → drawer shows "Change waiting" at once. user-B: To review "What IRCC accepts for IMM 1295: Not set yet → PDF upload · Online. canada.ca: "…"" → the change page (Form · Now · Proposed · IRCC's words · links) → Approve → row "PDF upload · Online · Set by a person · Sample". **Held** (v3-j6, v3-j7-*).
7. **Wrong role (user-B).** No Upload PDF; ⋯ has only "See where it is used" enabled; the drawer says Read-only. By URL: upload, accepts, retire, delete and check-canada all 403; no actor 401; the author approving their own change 403. **Held** (v3-j7-B-*).
8. **Empty and error.** No match → "No form matches" + Clear filters. HTML named .pdf and a truncated PDF fail at step 1 in plain words. A bad run id → 404; `/runs` without the flag → 400. **Held.** (The empty library was tested in round 1; Load sample has no reset here.)
9. **Break it.** 10 accepts proposals at once → 1 created, 9 × 409. 10 retires at once → 1. Undo vs edit at the same moment, 8 rounds → never both succeed with the edit lost. Two Removes → 200 + 409. A 5,000-character quote → 400. Channel "FAX" → 400 on the field. Hostile and non-English reason stored as text, rendered as text. "../../evil<script>.pdf" stored as `evil_script_.pdf`. **Held.** Guide routes 404 (journey 5).
10. **Across the boundary.** Held card → `/review/held/:id`; To review → change page → back to the library; "Where it is used" links `/c/:id`. **Held.**

## Automated replay and data
* **axe WCAG 2.2 AA: clean on 16 states.** List at 1440, 1024 and 390; no match; drawer; three upload states; the held review page; the review queue; two change pages; card running and stopped; 200 % list and drawer. No page sideways scroll at 1024, 390 or 720 (200 %).
* **1024 px: Used by, Status and ⋯ sit outside the table's visible area.** Table 1065 px in a 735 px area (v3-size-list-1024).
* **Keyboard:** 29 tabs to the first row; Enter opens the drawer with focus inside; Esc returns it. Focus is not visible on the chips or row numbers (v3-k-focus-*).
* **Data.** C11.18 stored exactly the channels and quote, basis PERSON_SAMPLE, the change RELEASED and an audit line. Each upload is one run; the duplicate added nothing; held files are on To review.
* **Builder suites rerun twice on this commit:** `check_forms_s4_runs` 61/61, `check_forms_s4_canada` 49/49. Graph G1–G6 clean for S4.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Every form task completes; a guide cannot be retired or deleted (journey 5) |
| Next step obvious | 1 | Held card → its To review item with the right words; the change page has Approve and Return; refusals say what to do |
| Plain words | ½ | IMM 5881 and IMM 5905 typed "Form", "Not set yet"; "(P-51)" and a hash prefix on the main path |
| Feedback and state | ½ | Live drawer and waiting tags; the guide drawer silently shows no uses or history; "Retire waiting" tooltip wrong after approval |
| Correct data | ½ | Records exact; the list's "Used by" misses checklist uses (IMM 5484 "Not used" vs 2) and the Type is wrong for two files |
| Error recovery | ½ | Stop, races and bad files handled; one empty file sinks a multi-file upload silently (journey 3a) |
| Accessibility and screen sizes | ½ | axe clean, focus return fixed, chip at 390; but 1024 px cut and invisible focus on chips and row numbers |
| Speed | 1 | 118–166 ms first view, 125–131 ms filter |
| Visual quality | 1 | Calm, dense, aligned, team tokens |
| Trust and sources | 1 | "Rules read it: no AI call was made", AI · Sample, IRCC's words, who set what IRCC accepts, cost first |

**7 / 10: not a pass (below 8), no criterion at 0.** Fixes that raise it most, in order:
1. Keep guide codes as they are in the routes (task completed, feedback).
2. Count every source kind in the list's Used by, and type 5881 and 5905 from the intake's kind (correct data, plain words).
3. Wrap Edition and IRCC accepts at 1024 px, and add the focus ring to the chips and row numbers (accessibility).
4. Check every file before starting a multi-file upload (error recovery).
5. Move "(P-51)" and the fingerprint into Details, and correct the approved-retire tooltip.

Not tested: a real screen reader, Firefox or Safari, a paid live run (the cost after Stop), canada.ca live. D17 and D20 need the founder's or an intended user's unaided walk.
