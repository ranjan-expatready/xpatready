# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, round 5, 27 Oct 2026

**Setup.** Commit 06556ab. Isolated copy `rev5_s4` on :4461 with the stand-in launcher.
* A stub probe reached `fake-launch.log` before any live step. The one live finder run went to the stand-in.
* **Spend: US$0.** Recorded canada.ca copies only.
* Walked in a visible Chromium through Playwright, by clicks, typing and the keyboard.
* Screenshots `review-shots/v6-*`. Round 4 (e7cb63c, 8/10) is in git history.

## Journeys (persona · goal · result)
1. **Main: content publisher (user-A), "find a form, see what it is, where it is used, what IRCC accepts".** **Held.**
   * Menu Forms → list in 192 ms. Guides chip → 2 rows. Search "5257" → IMM 5257 and SCH1. "zzzz" → "No form matches" → Clear filters → 14.
   * IMM 5257 drawer: edition, "canada.ca last updated 2023-09", page "checked Oct 27", PDF upload · AI · Sample with IRCC's words, Where it is used, History.
   * Esc → focus back on the number (v6-j1-*).
2. **Upload one official PDF (IMM 5646).** **Held, with a provenance error.**
   * Four rules steps, "No AI call was made", "The very file canada.ca's form page links", "Added to the library", 2.2 s (v6-j2-*).
   * The drawer later calls the file "Official copy loaded with the sample" and "No canada.ca page recorded yet".
3. **Upload seven: empty, not a PDF, IMM 5562, a duplicate, truncated, IMM 5710, a non-Latin name.** **Partly held.**
   * Held: the empty file is named in a refusal line; not a PDF fails at step 1; the duplicate says "Nothing duplicated"; 5562 and 5710 are added; the truncated file is held.
   * **Found:** only 5 cards show. The 6th file (IMM 1294, added to the library) has no card and nothing mentions it (v6-j3-upload-many).
   * The truncated file's card links "it cannot be approved", but its box, To review and user-A's held page still say "record the IRCC page … a second person approves it" (v6-j9-*).
4. **Run card, chip and Stop (W1-07).** **Held, with S1.**
   * A live finder run hangs in the stand-in. Its button comes with S5, so it was launched by API; the cost was stated first (worst US$5.58).
   * Chip "Finding forms · step 3 of 6". Focus, then Enter → card "Step 3 of 6 · Running · first run of this kind … at most US$5.58".
   * Stop → "Stopping" at 0.1 s → Stopped about 1 s later; later steps "Not needed"; no launcher left; chip gone.
   * Still "US$0.00" beside "stays counted at its reserved worst case" (v6-j4-*).
5. **Finder replay on Visitor visa (round 4 Major 2).** **Held.**
   * PARTIAL, US$0, 7 attached. IMM 5257 is kept; IMM 5484 is "to decide"; IMM 5782 is "not for this application"; nothing dropped.
   * AI steps are marked; the cost line says "saved AI answers".
6. **Retire, approve, release.** **Held for an unused form.**
   * IMM 5646 ⋯ → Retire: "Nothing uses it". "Ask to retire" is disabled until a reason is given.
   * Row "Retire waiting"; focus goes back to ⋯.
   * user-B: To review → change page → Approve → "Retire approved" → release → Retired, with its own filter count (v6-j6-*).
7. **Retire a form that a combination reads as a source (IMM 5881).** **Broke (Major).**
   * "Remove it there first" links to Visitor visa, whose Sources tab has no Remove.
   * The API remove answers 404 "not part of this combination".
   * The same holds for IMM 5257, Guide 5256 and IMM 5484 (v6-j8-retire-5881-refused, v6-j8-sources-tab).
8. **Recovery: a retired or retiring form gets no new use (round 4 Major 1).** **Held.**
   * While approved: the Super visa Sources tab upload gives "Not attached … a request to retire IMM 5646 is open" (v6-j8-sources-upload-5646-approved).
   * After the release, all five routes refuse: the Sources tab upload, `/intake` forCombination, the library upload forCombination, "+ Add" (409) and hand attach (409). The picker hides the form.
   * A planted source on approved IMM 5710 → the release hands it back as RETURNED, with a system History line.
9. **Wrong role (user-B, C, P, unknown).** **Held.**
   * UI: no Upload PDF; ⋯ items other than "See where it is used" disabled; no "Correct what IRCC accepts" (v6-j7-B-menu).
   * API: B, C and P get 403 on retire, attach, accepts and finder launch; an unknown actor gets 401.
10. **Break it.** **Held, Minors only.**
    * Two retire requests at once → one change, the other 409 (developer-ish words).
    * A 301-character reason → 400 in words.
    * Empty non-Latin files are named in UTF-8.
    * "+ Add" then Undo is exact.
    * No 500s seen.

**Across the boundary:** Where used → `/c/:id`; chip → `/ai/:id`; held → `/review/held/:id`; To review → change page → library.

## Automated replay and data
* **axe WCAG 2.2 AA:** 0 violations on 9 states:
  * list at 1440, 1024 and 400 px;
  * the IMM 5257 drawer;
  * upload one; upload many;
  * card running; card stopped.
* **Sizes:**
  * 1024: no page scroll, ⋯ at x 972.
  * 400: no page scroll; the table scrolls in its own region.
  * 640 px (1280 at 200 %): no page scroll; the drawer is 560 px.
* **Keyboard:**
  * 29 Tab presses to the first form number; Enter opens the drawer; Esc returns focus.
  * **Tab 27 scrolls the table under the sticky 56 px top bar.** Tab 28 ("IRCC accepts") is fully hidden, and the first number shows 2 px. This fails WCAG 2.4.11 (v6-k-focus-first-number).
* **Data:**
  * one change per retire;
  * no IMM 5646 source attachments or lines after the five attempts;
  * IMM 5646 `retired_at` set, IMM 5710 not;
  * audit lines present.
* **Not done:** the main path was walked once per size, not twice. The builder's suites were not run (instructed).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Find, upload, retire-unused and the finder all complete; retire is impossible for 4 of 14 sample forms (journey 7) |
| Next step obvious | ½ | "Remove it there first" leads nowhere; the unread held file is told both "record the page" and "cannot be approved" |
| Plain words | 1 | Plain; Minors only (repeated role in History, "database refused a duplicate") |
| Feedback and state | ½ | No card after the 5th file; stopped "US$0.00"; "Needs your OK" for a form with no file |
| Correct data | 1 | No new use for a retired or retiring form by any route; release re-check; dedup; one change under a race |
| Error recovery | 1 | Bad files named and the others run; Stop ends the call; refusals in words; Undo exact |
| Accessibility and screen sizes | ½ | axe clean; 1024, 400 and 640 px fine; focus hidden under the top bar (2.4.11) |
| Speed | 1 | List 192 ms, filters under 300 ms, Stop answers at once |
| Visual quality | 1 | Calm, dense, aligned (v6-j1-list-1440, v6-j3-upload-many-1440) |
| Trust and sources | ½ | AI marked and IRCC's words shown, but hand uploads are called "loaded with the sample", and the stopped cost hides the reserved charge |

**7.5 / 10: below the journey bar (8+).** No criterion is at 0.

Fixes, most valuable first:
1. Make retire possible for source-read forms. Either a source use blocks Delete only, with an AI guard in `plan()`, or Remove also detaches the source. Name an action that exists. (Task, next step.)
2. Add `scroll-padding-top` for the sticky bar (accessibility).
3. Keep one card per uploaded file, or a "n more" line (feedback).
4. Record `UPLOADED` origin and the matched canada.ca page on uploads (trust).
5. Give one message for unread held files, show the reserved cost of a stopped call, and fix "Needs your OK" (feedback, next step).

**Not tested:** a real screen reader, Firefox or Safari, a paid live run, canada.ca live, browser zoom itself. D17 and D20 need the founder's or an intended user's unaided walk.
