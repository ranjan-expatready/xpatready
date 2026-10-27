# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, round 4, 27 Oct 2026

Commit e7cb63c (`forms/2026-10-27-s4-form-library`). Isolated copy `rev4_s4` on :4461 with the stand-in launcher; a stub probe reached `fake-launch.log` before any live step. No model or canada.ca call (recorded copies only): **US$0**. Walked in a visible Chromium through Playwright by clicking, typing and the keyboard. Screenshots `review-shots/v5-*`. Round 3 (26a360e, 8.5/10) is in git history.

## Journeys (persona · goal · result)
1. **Main: content publisher (user-A), "find a form, see what it is, where it is used, what IRCC accepts".** **Held.**
   * Menu Forms → list in 203 ms. Guides chip → 2 rows. Checklists → 4.
   * Search "5257" → IMM 5257 and SCH1. "zzzz" → "No form matches" → Clear filters.
   * IMM 5257 drawer: edition, page, "checked Oct 27", PDF upload · AI · Sample with IRCC's words, Where used. Esc → focus back on the number.
   * Used by Visitor visa → 5 rows. Shots: v5-j1-*.
2. **Upload one official PDF (IMM 5645).** **Held.** Four rules steps: "Rules read it … No AI call was made", "The very file canada.ca's form page links: no second person is needed. Named by Guide 5256" → "Added to the library" (v5-j2).
3. **Upload seven: not a PDF, empty, IMM 5562, duplicate, truncated, IMM 5646, a non-Latin name.** **Held.**
   * Empty file named in a refusal line; the others each get a card. Not a PDF → failed at step 1; duplicate → "Nothing duplicated"; 5562 and 5646 added.
   * Cards survive a reload (v5-j3-*).
   * **Found:** the truncated file is held with "Record the IRCC page it came from". But the file can never be approved: user-B sees "This copy cannot be approved" (v5-j9-*). The non-Latin name is stored as underscores.
4. **Run card, chip and Stop (W1-07).** **Held, with S1.**
   * A live finder run through the stand-in hangs in its AI round. Its button comes with S5, so it was launched by API.
   * The chip shows "Finding forms · step 3 of 6". Focus the chip, Enter → card "Step 3 of 6 · Running · … at most US$3.39".
   * Stop → Stopped in 112 ms; later steps "Not needed"; no launcher process left; chip gone.
   * The card still says "US$0.00 spent" beside "stays counted at its reserved worst case" (v5-j4-*).
5. **Finder replay on Visitor visa (R3-2).** **Broke (Major 2).**
   * Replay found the committed real answers: PARTIAL, US$0, 5 attached, 1 to decide, IMM 5782 "not for this application".
   * **IMM 5257, the application itself, was dropped twice by the quote rule.** The card does not name it, and its header says "rules only, no AI" (v5-j5-*).
6. **Retire, then approve.** **Held.**
   * IMM 5646 ⋯ → Retire: "Nothing uses it". "Ask to retire" stays disabled until there is a reason.
   * The row shows "Retire waiting". user-B: To review → "Approve or return" → change page → Approve → row "Retire approved" (v5-j7-*).
7. **Wrong role (user-B).** **Held.**
   * UI: no Upload PDF; ⋯ offers only "See where it is used"; drawer read-only, no "Correct what IRCC accepts" (v5-j6-B-menu).
   * By URL: users B, C and P get 403 on undo, attach, "+ Add", retire, accepts and finder launch; no actor or an unknown one gets 401.
8. **Recovery: a retired form must get no new use (round 3 Major, R3-1).** **Partly held.**
   * Retire IMM 5645 (approved). Undo of its Remove → 409 "Being retired"; "+ Add" → 409; upload for a row → "Not attached".
   * **Broke (Major 1):** the combination's "Sources and forms" upload attaches it ("Attached to Study permit"; in the browser "Attached to Super visa", v5-j8). The release then retires IMM 5645, and the list says "Retired · Used by Study permits › Study permit".
9. **Break it (15 min, API).** Covered by 8, plus the roles in 7, the seven-file upload in 3, and Stop in 4. No 500s seen.
10. **Across the boundary.** **Held.** Held card → `/review/held/:id`; To review → change page → library; chip → `/ai/:id`; Where used → `/c/:id`.

## Automated replay and data
* **axe WCAG 2.2 AA clean on 12 states:**
  * list at 1440, 1024 and 400 px;
  * drawers for IMM 5257 and Guide 5256;
  * upload one; upload many;
  * card running; replay card; stopped card;
  * change page; held page.
* **Sizes:**
  * 1024 px: the table fits, ⋯ at x 936–972.
  * 400 px and 200 % zoom: no page sideways scroll; the table scrolls in its own labelled region.
  * At 200 % zoom the drawer is 560 px wide in a 720 px window.
* **Keyboard:** 28 Tab presses to the first form number; Enter opens the drawer; a visible 3 px ring on the number, the Status pill, ⋯ and the chip (v5-k-focus-after-tabs).
* **Data:**
  * one intake row per file;
  * the duplicate added nothing;
  * the retire change RELEASED;
  * the stopped batch CANCELLED with no process left.
* **Spend:** `p2/jobs`, `runs` and `ledger` checksums are the same before and after.
* **Not done:** the main journey was walked once per size. The builder's suites were not run (instructed).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Library tasks complete (journeys 1–3, 6); the finder leaves Visitor visa without IMM 5257 (journey 5) |
| Next step obvious | 1 | Refusals say what to do; held card → its To review item; change page has Approve and Return. One dead end for unreadable files (Should) |
| Plain words | 1 | Plain; Minors only (repeated role in History, "PDF link" on a guide) |
| Feedback and state | ½ | "Needs your OK" still wrong (IMM 5802); stopped card "US$0.00 spent"; replay labelled "rules only, no AI" |
| Correct data | ½ | Records exact and dedup holds, but a retired form is used by a combination after the release (journey 8) |
| Error recovery | 1 | Bad files named, others still run; Stop ends the call; reload keeps the cards; Undo refuses in words |
| Accessibility and screen sizes | 1 | axe clean; 1024, 400 and 200 % fine; rings on every stop |
| Speed | 1 | First view 203 ms, filters under 200 ms, Stop 112 ms |
| Visual quality | 1 | Calm, dense, aligned (v5-j1-list-1440); Minor: button jump on a refusal |
| Trust and sources | ½ | Rules-first upload and IRCC's words shown, but real AI evidence for IMM 5257 is discarded without trace on the card, and the replay is not marked as AI |

**8 / 10: pass on the journey bar (8+, no criterion at 0).** Not a passing check: six D-dimensions are at 3 (review.md).

Fixes, most valuable first:
1. Guard `sources.attach` and re-check the release with `formUses` (correct data).
2. Accept a quote from the block under a heading that prints the number, and add a golden test on the two real answers (task, trust).
3. Mark replays as saved AI answers, and show the reserved cost of a stopped call (trust, feedback).
4. Fix "Needs your OK", and give unreadable uploads the right next step (feedback).

Not tested: a real screen reader, Firefox or Safari, a paid live run, canada.ca live. D17 and D20 need the founder's or an intended user's unaided walk.
