# UX-A part 3, r7: diff-only re-review of 0f9a2201 (after approved 893bde72)

Scope: Devin's second finding and r5 Minor (startable-check release items landing on "This draft no longer has it"; empty Forms tab never rendering the panel).

- **Real validator release problems keep their old notice.** `startable: true` is set only on the startable items, which the engine adds only when `!relErrors.length`. PartProblems and FormsProblems split `releasedAll` into `released` (not startable) and `startable`, so the "no longer has it" notice still shows for validator problems and never for startable ones. The two cannot coexist, so nothing is hidden.
- **Landing attributes.** PartProblems keeps `data-focus`, `data-focus-also` and `data-from-release` on the startable branch. FormsProblems counts startable items in `counted`, so `data-focus="forms:problems"` is present. The empty Forms branch now renders FormsProblems, so `?focus=forms:problems` lands there.
- **Words.** "Firms cannot open cases on the released version: 1 thing is / N things are missing", each cause, "Fix it / them in this draft, then send the draft for review and release it", plus a Review and release link. Singular and plural are right, and the words fit PRODUCT.md.
- **Accessibility.** Notice with a `ul` of causes, and a link with text. The axe steps in the walk pass. Nothing renders when there are no startable items (`if (!items.length) return null`).
- **Run.** I re-ran check_uxa3_status_words_browser on :4447 against db xr_studio_rev_622b, using a scratch copy with the psql path changed (since deleted). It passed 25/25. This includes the Devin fail case on a real Super visa release failing only the startable check: the next step reads "No questions yet for …: firms cannot open cases until it is fixed", and the landing says the cause and what to do, with no "no longer has". The copy is stopped, screenshots are stashed, and nothing is committed. US$0.

Minor (not blocking):
1. The title says "missing" for every startable cause. For `filing_problem` ("cannot be filed as set") and `rule_problem` ("rule does not resolve") the cause is not strictly missing. Consider "Firms cannot open cases on the released version: N thing(s) to fix".
2. `filing_not_set` items point at `people:problems`, and nothing under `web/src` renders that place. The focus was already `people:problems` before this commit, so this is not a regression, but that cause still has no landing.
3. In PartProblems, when the draft also has its own problems (`mine.length`), the startable notice is not shown beside them. That is acceptable, since those are the fixes.

Verdict: Approve
