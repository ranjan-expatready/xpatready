# G1 (C5.4) PR 2b: review of the screens at **b9743d5a**

Reviewer (did not build it), 2 Nov 2026. Branch `claude/funny-curie-mbttn2`, diff `e1f9c2d0..b9743d5a` only (#587's approved head is the base).
Measured against: concept v2 §4–§6, boards 1 and 2, build-notes "PR 2b", STANDARDS and EXPERIENCE [M], QUALITY D1–D20. US$0, live AI off.
I used an isolated copy on :4473 (never :4400), stopped it and dropped its database afterwards. Nothing was committed. The journey test is in this file, because I was asked to write only this file.

## Verdict: **Block**. Two Majors, six Minors. Journey score **7.5/10** (below the pass mark of 8; no criterion at 0).

## What I ran
* `vite build`, then web `tsc` (0 errors). `check_g1_source_register_browser.cjs 4473`: **41/41**. `graph.mjs --check`: exit 0 (G1 0).
* Four of my own Playwright walks, as the author, the approver (user-B) and the expert (user-C):
  * Live with no draft change.
  * A changed number, a twin pair, a double click, and a number moved while the panel was open.
  * The last number sourced with no reload.
  * Widths 400, 1024 and 1440 px, plus 512 px at 2× (200 % zoom of 1024).
  * Long and non-English reasons, and axe on the panel at each width.
  * The data was then read back through the API.

## What held
* **Concept fit (board 1):**
  * Block: "Numbers without a source (n)", grouped by item, in §5's refusal words, with Add source, or Check source when the number changed. Six items show, then "Show all n items". The validation list counts only "other" errors.
  * Submit stays greyed with "Fix the problems first" (concept §4). It is offered **without a reload** once the last number is answered: the invalidation works (walk H).
  * A Live row with no draft change is listed in neutral colours. One source saved there makes it a draft change and the block turns blocking ("1 draft change; 16 problems"). That is BR-9 working.
* **Panel (board 2):**
  * A missing number opens on Official source with today's date and the item's quote. The hint makes the author check that the quote states the number.
  * Field errors are in §5's words, on their own fields. A 501-character reason gets "Keep the reason to 500 characters."
  * The None published guidance stays in view. "Still correct for 19" is refused on words that state 18 and opens the editor.
  * The twin box ("Use the same source for the other 19 in this item (Age years: less than 19)") wrote both entries, each at v2.
  * Conflict (409): "Keep mine" saves at the version the server reported.
  * A double click sends **one** PUT.
* **Correctness:**
  * The server is never bypassed: the author gate and the words rule are judged by PUT.
  * One request for the block and two for the panel; nothing per row.
  * Axe found 0 violations on every state I opened.
  * No sideways scroll at 400, 512@2× and 1024. The panel is full width at 400 px. No page errors.
* **The four listed differences: acceptable.**
  1. The address list is fed from the URLs this combination already cites. No endpoint lists the approved pages yet, and the hint says what the list is.
  2. "Still correct" refused on the words follows BR-3.
  3. Keeping the None published guidance in view is better than the board.
  4. Showing a check's first sentence, with the whole text on hover, fits EXPERIENCE 14.
* **PR 2c split: acceptable.** The block alone reaches every held number, so a release can be unblocked on the product's own screen (P-33). The RuleDialog section, the Checks "Sources" action and "From age" are concept §6b "Needed". So 2c must follow: the tech lead should add it as a BACKLOG row (today it is only in build-notes).

## Majors (fix each with a failing check first)
**MJ-1 The screen credits the author's own words to the sample load (D18, trust).**
* What happens: after the author rewrites a sample-load entry, the card still shows the chip "From the sample load" and reads "written by the sample load" above the author's text.
  * Walk G: R-01's two entries were saved by `user-A` and returned `from_sample_load: true`, quote "Test data: aged 19 years or older…".
  * The block's context line ("n more have a source 'From the sample load'") counts these entries too.
* Cause: `from_sample_load` is `createdBy === SAMPLE_CREATOR` (`api/src/source-register.ts:47`). The screens read it as "written by" at `web/src/components/source-panel.tsx:105` and `:183` and at `web/src/components/unsourced-numbers.tsx:28`.
* Why it matters: on a source register, the immigration expert signs these lines. Wrong authorship is a correctness gap, not a polish item.
* **Fix:** in the API, set `from_sample_load` only while `updatedBy === SAMPLE_CREATOR`, and update the contract comment. Or, in the UI, use `updated_by`.
* **Check:** after "new words that state 19 save" in the browser check, assert that the card has no "From the sample load" and reads "by Configuration author".

**MJ-2 Focus is lost when the panel closes (EXPERIENCE 12 [M]; WCAG 2.4.3).**
* What happens: after Escape, the Close button or ×, focus lands on `<body>`. This happens even when the Add source button that opened the panel is still there (walk A). It happens again after a save (walk B).
* Cause: `Panel` has no `Dialog.Trigger`, so Radix has nowhere to return focus (`ui/controls.tsx:108-111`, opened from `unsourced-numbers.tsx:49`).
* Why it matters: the job is a loop of about 18 numbers. A keyboard user needs **32 Tabs** from the top of the page to reach the first Add source, again after every number.
* The app already returns focus elsewhere, and tests check it: C11.9 in `check_c119_library_items_browser.cjs:46`, C6.9, C11.8.
* The builder's check ("keyboard: Escape closes the panel") counts only that the dialog closed.
* **Fix:** remember the line that opened the panel. On close, focus its button. If that number has left the list, focus the next line's button, or the block heading with `tabIndex={-1}`.
  * For example: an optional `onCloseAutoFocus`/`returnFocus` on `Panel`.
* **Check:** assert `document.activeElement` after Escape (button still present) and after save then close (button gone).

## Minors (fix or list in the PR)
1. **Read-only words in the block (board 1, state 2).**
   * Problem: the approver and the expert see **Add source** and **Check source**, an action they cannot take.
   * Also: a missing card in the read-only panel shows only its chip; board 2 has "No source yet. The author adds it on Review and release."
   * Fix: when `!canAuthor`, label the button "View" and add the head line "Read-only for you: only the configuration author adds sources". In `Answer`, give the read-only missing state the board's sentence.
2. **A 409 because the number moved is worded as someone else's save.**
   * Problem: it shows "Saved by someone else" and **Reload theirs** (`source-panel.tsx:166-168`). The body text itself is right ("the number is now 20, not 19…"). Screenshot `w2-value-moved.png`, in my scratch walk.
   * Fix: when the problem carries no `version`, use the title "The number changed" and a button "Reload".
3. **A changed line in the block drops the number's words.**
   * Problem: it reads "The source was written for 18; the number is now 19…" (`unsourced-numbers.tsx:14`). Board 1 starts it with "Passport days until expiry: at most 60.", and an item can hold two numbers.
   * Fix: prefix `${n.words}.`.
4. **The fee count line has no tooltip.** Concept §4 asks for one showing each line's `quote_kind`; Visitor visa shows none.
   * Fix: add the tooltip, or list it as a fifth difference in build-notes with the reason (`quote_kind` is not in the view).
5. **"more" is wrong in the all-set line.**
   * Problem: "Every published number has its source (27). 10 more have a source 'From the sample load'." Nothing else is listed, so "more" has nothing to add to.
   * Fix: "10 of them from the sample load". After MJ-1, count only entries the loader still owns.
6. **Test gaps (STANDARDS §7: a test fails when its feature is removed).**
   * (a) "with the item's own quote filled in" asserts the date and the radio, not the quote: it passes with `item_quote` removed.
   * (b) The twin save has no check.
   * (c) A 409 because the number moved has no check.
   * (d) Focus return, as in MJ-2.
   * Fix: add an assertion for each.

## D1–D20 (1–5)
D1 4 (concept §4/§5 met except Minors 1, 3, 4) · D2 4 (409, double click, words rule on the server; MJ-1 labelling) · D3 5 (one panel, reused by 2c) · D4 n/a (no rule change) · D5 4 (double click one PUT; Reload and Keep mine; 2nd save invalidates) · D6 3 (checked date and who shown, but who is wrong after a rewrite, MJ-1) · D7 n/a (no AI) · D8 5 (inside the tab and path; panel names item and place) · D9 4 (Add/Check source, Submit offered at once; non-author sees Add) · D10 4 (§5 words; Minors 2, 3, 5) · D11 5 (chips, toast, count drops, errors on fields) · D12 4 (team Panel, Pill, tokens; dense and calm at 400–1440) · D13 3 (axe 0, 400 px and 200 % fine; MJ-2 focus) · D14 4 (team components) · D15 4 (no per-row requests; not timed against §9) · D16 3 (41/41 and 51/51, but gaps in Minor 6) · D17 simulated only · D18 3 (MJ-1, Minor 4) · D19 4 (release reachable on the product's own screen; 2c entry points to follow) · D20 simulated only.

## Journey test (reviewer, 2 Nov)
Journeys:
1. Main: as the author, cite the letter's 5 and answer each number.
2. Alternate: None published with a reason.
3. A changed number: Still correct, then new words.
4. Bad input: http address, a 1989 date, a short or long reason.
5. Wrong role: the approver and the expert.
6. Two tabs: 409, then Keep mine.
7. The number moves while the panel is open.
8. Double click.
9. Live, then a draft change.
10. The boundary: all sourced, then Submit offered.

All completed. Findings are above.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All 27 answered on the screen; Submit offered without a reload (walk H) |
| Next step obvious | ½ | Add source and Check source are clear; non-authors are offered Add source (Minor 1) |
| Plain words | ½ | §5 words held; "Saved by someone else" when no one saved; "10 more"; changed line without words (Minors 2, 3, 5) |
| Feedback and state | 1 | Chips, toast, count drops, field errors, conflict notice |
| Correct data | ½ | Entries and versions right (twin v2/v2, Keep mine v2); authorship wrong (MJ-1) |
| Error recovery | 1 | 409 Keep mine, moved number then Reload, Still correct then editor, one PUT on double click |
| Accessibility and screen sizes | ½ | Axe 0; 400, 512@2× and 1024 fit; focus lost on close (MJ-2) |
| Speed | 1 | 1 request for the block, 2 for the panel; no per-row requests |
| Visual quality | 1 | Calm, aligned, matches board 2 (`w2-panel-missing-1440.png`, `w3-panel-400.png`) |
| Trust and sources | ½ | Origin shown on each card, but credited to the loader after a rewrite; fee tooltip missing |

**7.5/10, not a pass.** Most valuable fixes, in order:
1. MJ-1 (raises correct data and trust).
2. MJ-2 (raises accessibility).
3. Minors 1 and 2 (raise next step and plain words).

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Timing against STANDARDS §9.
* The RuleDialog, Checks and "From age" entry points (PR 2c).
* The CI run of this exact commit (it is not pushed).
