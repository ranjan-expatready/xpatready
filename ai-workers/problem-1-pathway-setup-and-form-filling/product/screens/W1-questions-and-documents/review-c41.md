# Review: F6 / C4.1, a combination's section order (Move up / Move down, released with it) — commit d39f10ea

**Verdict: Changes needed (Block).** One Major must be fixed before the `review: approved` label goes on: after one move, the keyboard focus is pulled back to that Move button on every later re-render. The API side, the Review line and the release path are sound, and both checks prove their rules.

Reviewer: an independent session that did not build this. Branch `claude/wizardly-bell-gr02rj` at d39f10ea, based on the current origin/main. Concept: `c41-concept-draft.md` on `origin/claude/runtime-c41-concept`, rules R1–R5 (P-216 answer 1; rename and "Ask it in…" are out of scope per answers 2 and 3). No AI was used (US$0). Never touched :4400. 1 Nov.

**Copies used.** I started on :4441, but another process (`/tmp/b3/run.sh`, the builder's own run) restarted and reset it while I was testing. My first browser run failed at "the sample inputs load" for that reason. I moved to my own copy `runtime_c41r` on :4439 (runtime range, same commit, the web build at 12:42 contains `data-move-buttons`).

## What I re-ran
* `check_c41_section_order.ts 4439 xr_studio_runtime_c41r`: **30/30** (twice: once on :4441 before the clash, once on :4439).
* `check_c41_section_order_browser.cjs 4439 xr_studio_runtime_c41r`: **24/24**. Axe is clean on the start, moved and stale-refused states, there is no sideways scroll at 1024 px, and there were no page errors. The run rewrote its tracked screenshots; the tree is clean at d39f10ea after the run.
* **Fail proof (STANDARDS §6 [M]).** I ran a copy of d39f10ea from `/tmp` (`git archive`, never the working tree) with three rules removed: `need(actor,"author")` in `moveSection`, the `seen` check, and the `diff()` "Section order" block. The API check went to **19/30**, with R1 (403), R2 (409), the Review line, R5 submit and release all red. So each rule's test fails when the rule is removed.

## Concept fit (R1–R5)
| Rule | Met? | Evidence |
|---|---|---|
| R1 only an author moves; it is a draft | Met | Approver and content reviewer get 403 in words; the Approver sees no buttons; one draft line, matches_release false |
| R2 checked against the order read | Met | A stale `seen` gives 409 "reordered since"; two parallel moves with the same `seen` give 201 and 409; a double click gives 201 and 409, with 18 rows and 18 distinct places |
| R3 first cannot go up, last cannot go down; greyed with why | Met, except in one state | 409 in words; greyed with `title` and in the aria-label. The exception (Minor 1): after a section is removed and added back, the greyed "last" sits on the wrong section |
| R4 nothing else changes | Met | The other combination's order and the library titles are unchanged; every person sees the same order |
| R5 out only in the one release | Met | The released order is unchanged until approve; the order approve route is 404; submit carries "Section order"; release publishes it |

## Journey (reviewer score, journey-test skill)
* **Persona:** the content publisher (author) on "With an LMIA" (wp.family).
* **Goal:** "ask Languages straight after Application details for everyone, and have it go out with the next release."

I walked it in headless Chrome with my own Playwright scripts (`/tmp/c41rev/`, not committed):
1. **Move up, then Review.** Tab to "Move up: Languages" and press Enter. The move takes 173 ms. The toast reads `"Languages" moved up: now 2 of 18 sections, for every person` with Undo, and focus stays on the button. Review shows `Section order · Sections reordered: "Languages" now 2nd, "Personal details" now 3rd · changed`, and axe is clean there.
2. **Undo.** Undo restores the order and the draft line goes.
3. **Stale tab.** It is refused in words and the order refreshes.
4. **Approver.** The Approver sees no buttons.
5. **Small screens.** At 512 px (1024 px at 200 % zoom) there is no sideways scroll, and the buttons become icon-only with aria-labels.
6. **Release.** Release is proven by the API check (R5).

**Break-it pass:**
* A hostile key (`x';--`) gives 409 in words.
* An unknown combination gives 404.
* A retired combination gives 409.
* One audit line per move, naming the section by title.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Move, Review line, release with the new order (API check R5) |
| Next step obvious | 1 | Toast with the new place; the draft change shows on Review |
| Plain words | ½ | The refusal box is titled "1 row not changed" for a section, and says "Reload" after the tab already reloaded (Minor 2) |
| Feedback and state | 1 | Toast, the focus kept on the button, the draft line |
| Correct data | 1 | Rows renumbered 0..n-1 in one transaction, no duplicate places under a race, one audit line |
| Error recovery | 1 | Undo; a stale or double move is refused without harm |
| Accessibility and screen sizes | ½ | Axe clean, 1024 and 512 px fine, but the focus is stolen after a move (Major 1) |
| Speed | 1 | Move 173 ms; tab first load 1.08 s |
| Visual quality | 1 | Team look; the buttons sit quietly on the header (screenshot 01-moved) |
| Trust and sources | 1 | No AI; the order is a draft until release, and the released order is unchanged before approve |

**Score: 8.5/10. Pass** (8 or more, no 0). The Major still blocks under the review rule.

## Blockers
None.

## Majors
1. **Keyboard focus is stolen after a move (EXPERIENCE §2 #12 keyboard path and #3 "the page keeps its scroll"; WCAG 2.4.3).**
   * **Cause:** `questionnaires.tsx:296-302`. The `useEffect` has no dependency list, and `moved` (line 275) is never cleared. So after one move, *every* later render focuses that section's Move button.
   * **Seen (1440 px, author, after moving Languages):**
     * Clicking "Open all sections" left focus on "Move up | languages".
     * Ticking a row checkbox left focus on "Move up: Languages".
     * Clicking the Spouse or partner person chip moved focus to "Move up".
     * A keyboard user who pressed Enter on the "Travel history" header saw the page jump from scrollY 1976 to 1072, with focus on "Languages | down".
   * **Fix:** focus once, then `setMoved(null)` inside the effect (or give it deps `[moved, secOrder.data]` and clear it).
   * **Test to add:** after a move, open another section header with Enter; focus stays on that header and scrollY does not jump. The current check only asserts the focus straight after the move, so it cannot catch this.

## Minors
1. **The order shown and the order moved can disagree after a section is removed and added back.**
   * `selectSection` gives a new section `count()` as its place (`studio.ts:488`). After a removal that leaves a gap, this duplicates the last place (18 rows, 17 distinct).
   * `sectionOrder()` breaks the tie by key, but `snapshot.ts:74` orders by `sectionOrder` only.
   * **Seen:** the tab showed "Application details" last, with its Move down enabled, and "Submitted documents" above it greyed "already the last section" (R3 words on the wrong row).
   * One move renumbers everything and heals it.
   * **Fix:** use `max+1` in `selectSection`, and add `sectionKey` as a second sort key in `snapshot.ts:74`.
   * The tie is older than this change; this change makes it visible.
2. **Words in the refusal box.** The box is titled "1 row not changed" (`questionnaires.tsx:391`) for a section move. The message says "Reload to see the order now", but the tab has already refreshed the order. Fix: title it "Section not moved", and say "The order has been refreshed; move it again."
3. **Duplicated logic (STANDARDS §5 [M] "no duplicated logic").** The ordinal function is copied in `engine/validate.ts:192` and `api/src/studio.ts:887`. Fix: export it once from the engine.
4. **Contract first (STANDARDS §4 [M]).** The two new routes have no zod schema in `contracts/`. The web types them inline (`questionnaires.tsx:374,389`), and the body is checked by hand. Fix: add the `section-order` and `move` schemas to the shared contracts.
5. **Icon-only buttons at 200 % zoom have no tooltip (EXPERIENCE §2 #10).** Below 640 px the label becomes `sr-only`, and `title` is only on the greyed wrapper. Fix: add a `title` to the enabled button too.
6. **Port range.** The isolated copy runs on 4441, which is in the screens range (`WAY-OF-WORKING.md:18`, runtime is 4430–4439), and the check's usage lines default to it.

## What I could not check
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
* A visible (headed) browser: the walk was headless scripts.
* `tools/graph.mjs`, because it rewrites `qa/GRAPH.md` and this review may write only this file.
* Neighbour suites beyond the reworded `check_w115_slice2_browser` expectation, which I read but did not run.
* D1–D20 per-dimension scores: this is a one-capability slice, so I scored the journey and the concept rules instead.
