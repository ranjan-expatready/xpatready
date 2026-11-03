# QA-179 review (diff def11289..527d8d5a, diff-only, Sonnet P-278)

Ran check_qa179_needs_words_browser on an isolated port (24460): 60/60, exit 0. Stopped after. US$0, no live AI.

## Verdict: Approve (no Blocker, no Major)

## Findings
- **Minor 1 - the line says "Immigration programs counts these N combinations" across both Pathway types, but the Programs page shows one type at a time.** `mineNeeds` (programs.tsx:243) counts only the rows of the selected type (Retail or Corporate). The check sums INDIVIDUAL and CORPORATE (`programsTotal`), so it cannot catch a split. If someone's N combinations are 3 Retail and 2 Corporate, the line says 5 and the chip says 3. It was true on the demo sample and the six for user-A/B/C. Fix: say "(Immigration programs counts these, per Pathway type)" or add the per-type split, and make the check compare each type's chip with the line's per-type count.
- **Minor 2 - the line's combinations come from To review's items' `combination`, not from the Programs rule.** Programs counts `forViewer(...).needsYou` (needsYouItems, including kinds listed elsewhere). To review adds `combination` also on proposals, AI-job and release rows. The sets match in the walked data (the check asserts it), but an item with a combination and a different rule (for example a proposal row for a combination Programs does not mark) would make the numbers differ. The check's equality assertion is the guard, which is real, but it covers only the seeded data.
- **Nit 1** - the line is long and uses "Immigration programs counts these 5 combinations" inside parentheses; fine for an expert, a little heavy. Items with no combination that are not held files are all labelled "shared library items" (form_fields, new_edition, merge, library_change). That fits the kinds present on Needs you today.
- **Nit 2** - the line is hidden under search/kind/form filters, so the tab count and a filtered list can differ without it. Acceptable (the tab still says items).

## Checked and fine
- Words 0/1/many: "1 combination needs you", "0 combinations need you", "1 item needs you", "N items need you", "1 held file ... checks it / them" all correct. The line is hidden when there are no items.
- Accessible names: the chip's text is "N combination(s) need(s) you" (number, then sr-only rest, so it reads whole). The menu badge's aria-label and title say items. axe (WCAG A/AA) clean on both screens; no sideways scroll at 1440, 1024, 400.
- The check's fail cases are real: they compare the DOM with the server's catalogue and review-queue counts, assert the parts add up to the items, and `^Held: ` on every held row.
- Held rows now begin "Held:"; four older checks were updated to the words; nothing else in the diff changes behaviour.
