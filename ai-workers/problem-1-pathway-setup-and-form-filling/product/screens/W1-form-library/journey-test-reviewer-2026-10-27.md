# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, round 3, 27 Oct 2026

Commit 26a360e (`forms/2026-10-27-s4-form-library`). Isolated copy `rev3_s4` on :4461 with the stand-in launcher. A stub probe reached `fake-launch.log` before each live step. No model or canada.ca call (recorded copies only): **US$0**. Walked in a visible Chrome through Playwright by clicking, typing and the keyboard. Screenshots `review-shots/v4-*`. Round 2 (e58136e, 7/10) is in git history.

## Journeys (persona · goal · result)
1. **Main: content publisher (user-A), "find a form, see what it is, where it is used, what IRCC accepts".** **Held.**
   * Menu Forms → list (243 ms) → Guides chip (2 rows, 69 ms) → Guide 5256 drawer → Esc → focus back on the number.
   * Checklists → IMM 5484 drawer → Used by Visitor visa (5 rows, the checklists included) → search "imm5257" → "zzzz" → No form matches → Clear filters → IMM 5257 drawer.
   * Shots: v4-j1-*.
2. **Guide lifecycle (round 2 M2).** **Held.**
   * Guide 5256 ⋯ → Retire: "Still used: Visitors › Visitor visa", listing the use. Cancel returns focus to ⋯.
   * Guide 5269 Delete: "Its approved official file is kept … retire it instead".
   * The lower-case "guide5269" also resolves (v4-j1-guide-retire).
3. **Upload one PDF ("add IMM 5645").** **Held.**
   * Card in 181 ms, chip shown, done in 1.7 s with four rules steps: "Rules read it: IMM 5645 (01-2021) … No AI call was made", "The very file canada.ca's form page links: no second person is needed. Named by Guide 5256".
   * Row Ready (v4-j2).
4. **Upload six with bad ones: text named .pdf, empty, local copy, duplicate, truncated, non-Latin name.** **Held.**
   * The empty file is named in an alert; the other five each get a card:
     * "This is not a PDF file … Nothing was read";
     * held local IMM 5562 → "Record the IRCC page it came from" → its To review item, which asks exactly that;
     * duplicate: "Already in the library … Nothing duplicated";
     * truncated: "damaged or incomplete";
     * IMM 5646 added.
   * Cards survive a reload (v4-j3-*).
   * **Found:** the held IMM 5562 is not listed under "Needs your OK". IMM 5802, which waits for nothing, is.
5. **Run card, chip and Stop (W1-07).**
   * A live finder run on Visitor visa through the stand-in, hanging in its AI round; launched by API, because its button comes with S5.
   * The chip appeared after 1.1 s. Enter on the chip → `/ai/<id>` → "Step 3 of 6 · Running · first run of this kind … at most US$5.58".
   * Stop → Stopped in 116 ms; launcher process gone; pid file removed; later steps "Not needed"; chip gone.
   * Chip shows at 390 px (v4-j4-*).
   * **Held, with S1:** the card says "US$0.00 spent" while the step says the call "stays counted at its reserved worst case".
6. **C11.18, set what IRCC accepts for IMM 5475.** **Held** (v4-j5-*).
   * Empty send → error on the form. Then PDF upload · Online with a canada.ca line → drawer "Change waiting"; the author sees no approve item.
   * user-B: To review "What IRCC accepts for IMM 5475: Not set yet → PDF upload · Online. canada.ca: "…"" → the change page (Now / Proposed / IRCC's words / links) → Approve → row "PDF upload · Online · Set by a person · Sample".
7. **Wrong role (user-B).** **Held** (v4-j6-B-drawer).
   * UI: no Upload PDF; ⋯ has only "See where it is used" enabled; drawer "Read-only".
   * By URL: user-B, user-C and client user-P get 403 on accepts, retire, delete, check-canada, attach, undo and upload; no actor gets 401.
8. **Retire, then approve.** **Held** (v4-j7).
   * IMM 5646 → Retire: "Nothing uses it" → reason → "Retire waiting", focus back on ⋯.
   * user-B approves → "Retire approved".
9. **Break it (API, 15 min).**
   * 10 accepts proposals at once → 1 created, 9 × 409.
   * 5 parallel uploads of a new form → 1 added, 4 "Already in the library".
   * Bad channel, a 5,000-character quote, an 81-character search, a junk usedBy → 400; unknown form → 404.
   * **Broke (Major):** attach IMM 5645 to Super visa, remove it, retire it (approved), then **Undo the remove → 201**, line back as DRAFT; release → IMM 5645 retired while Super visa's draft lists it. List: "Retired · Used by Visitors › Super visa".
10. **Across the boundary.** **Held.** Held card → `/review/held/:id`; To review → change page → library; "Where it is used" links `/c/:id`; chip → `/ai/:id`.

## Automated replay and data
* **axe WCAG 2.2 AA: clean on 13 states:** list at 1440, 1024 and 400; no match; guide, 5484 and 5257 drawers; upload one; held page; review queue; change page; card running; library after approve. One transient `label-content-name-mismatch` on the chip while five upload runs were active (S4).
* **Sizes:** 1024 px: table 735 px in 737, ⋯ at x=972. 400 px and 720 px (200 %): no page sideways scroll; the table scrolls inside its own labelled region; the drawer fits.
* **Keyboard:** 28 tabs to the first row number; ring visible on chips, numbers and ⋯; Enter opens ⋯. No ring on the chip or the Status, AI · Sample, "n combinations" and Change waiting stops (v4-k-focus-*).
* **Data:**
  * C11.18 stored the exact channels and quote, PERSON_SAMPLE, the change RELEASED.
  * Uploads: one intake row each; the race left one definition and one edition.
  * Stop: the batch is CANCELLED, AI step CANCELLED, cost 0, no process left.
  * `p2/jobs`, `runs` and `ledger` checksums are unchanged.
* Journey 1 ran three times and Stop four times with the same results (no flakiness seen). Builder suites not run (instructed).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every library task completes, guides included (journeys 1–8) |
| Next step obvious | 1 | Held card → its To review item; refusals say what to do; the change page has Approve and Return |
| Plain words | 1 | Types right; no hash or decision number on the main path; Minors only (a Zod message, "PDF link" on a guide) |
| Feedback and state | ½ | "Needs your OK" wrong both ways (journey 4); stopped card "US$0.00 spent" against its own step text (journey 5) |
| Correct data | ½ | Records exact and races hold, but Undo + release leave a retired form on a draft (journey 9) |
| Error recovery | 1 | Bad files named, others still run; Stop ends the call; reload keeps cards |
| Accessibility and screen sizes | ½ | 1024, 400 and 200 % fixed, axe clean; focus invisible on the chip and tooltip stops; transient axe hit |
| Speed | 1 | 243 ms first view, 69 ms filter, 1.7 s upload, 116 ms Stop |
| Visual quality | 1 | Calm, dense, aligned, team tokens (v4-j1-list-1440) |
| Trust and sources | 1 | Rules-first upload says so; AI · Sample; IRCC's words; who set what IRCC accepts; cost stated first |

**8.5 / 10: pass on the journey bar (8+), no criterion at 0.** Not yet a passing check: D4 is 3 (review.md, Major 1). Fixes, most valuable first:
1. Undo refuses to restore a line whose form has an open retire or delete, or is retired; the release re-checks uses before retiring. Add a test (correct data).
2. Fix "Needs your OK": no file is not a waiting file; list held new forms (feedback).
3. Show the reserved cost of a stopped call in the step and the total (feedback, trust).
4. Add the focus ring to the run chip and the tooltip spans; put "+n" into the chip's label (accessibility).

Not tested: a real screen reader, Firefox or Safari, a paid live run, canada.ca live. D17 and D20 need the founder's or an intended user's unaided walk.
