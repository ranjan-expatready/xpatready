# Review C3.13 "library lists: words and filters" (forms lane), commit 46b31ac7, reviewer (did not build it)

**Verdict: Block.** One Major in the new `?section=` filter and one Major in the built note. Pack, both new checks and the contract fit are otherwise sound. Fix the two Majors and re-review; the Minors can follow.

## Ran (own copies, ports 4801-4803, rv_ names; all stopped; no live AI)
* `acceptance/C3.13.test.ts` (unchanged in the diff): **23/23**. `check_c313_words_filters.ts`: **28/28**. `check_c313_search_browser.cjs`: **12/12** (axe clean).
* Additive-only (`api/src/studio.ts`): the `fields()` refactor keeps every output field and meaning. `formUsage` yields the same `forms` (first-seen order) and `boxes` as the old inline code; `placements` is untouched; the default list still hides retired and `retired=all|only` still work. Added keys only: `origin_words`, `usedBy`, `aliases`, `status_words`. `sections()` and `documentTypes()` only gain keys (`combinations` raw column kept). No existing key was removed or changed.
* Contract fit with Screen 04 §6: `usedBy {forms, combinations, sections}`, `origin_words`, `status_words`, `q` (name, meaning, key, alias, form code), `section`, `status`, `origin` all present on `GET /library/fields`. Not in scope and declared: `status`/`origin`/`q`/`section` on sections and document-types, `cursor`. No collision with UX-A #554 (that PR touches `studio.ts`, `counts.ts`, combination pages; `usedBy` here is a separate key and `combinations` on sections is unchanged). Both PRs edit `studio.ts`, so expect a textual merge, not a semantic one.

## Findings

**Major 1. `?section=` misses a re-placed field (wrong list for BR-3).** `studio.ts:472` filters on `placement.section`. `placement` comes from `placements = new Map(questions.map(...))` at `studio.ts:453`; the rows are sorted version-desc, so the Map keeps the OLDEST version. `usedBy.sections` (line 456-457) uses the current version. They disagree once a published field is re-placed (`placeField`, `studio.ts:584`, writes a new draft version in another section). Scenario, run on a loaded copy: `POST /library/fields/case.application_date/placement {sectionKey:"personal_details",...}` returns 201. Then `GET /library/fields` shows `placement.section = application_details` but `usedBy.sections = 1` (now `personal_details`). `GET ?section=personal_details` does NOT list it; `?section=application_details` does. The pack and the new check only use fixtures with one version, so none catches it. Fix: filter on the current section (`sectionsOf`, already computed) and add a re-placed case to `check_c313_words_filters.ts`. The builder's "placements keeps today's ordering" is fine for the `placement` field itself; the new filter should not depend on it.

**Major 2. The built note claims what a person cannot see.** `product/qa/built/C3.13.md` says on Shared library "every row says where it is used as counts ..., its status in words and its origin in words". `web/src` never reads `usedBy`, `status_words` or `origin_words` (grep: no hit in `library.tsx`). On the page (walked at 1024 and 400 px) the only visible change is the search box finding aliases and form codes; the rows are unchanged ("Forms | Asked in | Status" columns). The page also never calls `?q=`, `?status=`, `?origin=` or `?section=`; it filters client-side. This is API-only. Fix: reword the note to "the API answers ... the page shows only the wider search", or show the words. Do not claim the screen. (Screen part of BR-2 stays open; flag for the board, not new scope here.)

**Minor 1. Performance: `GET /library/fields` +30% and now near the 200 ms bound.** `studio.ts:449` calls `usedInIds` while `usedIn` (`library-sources.ts:88`) already runs the same `itemCombinations` (7 queries, `mappedBoxes` included) inside `usedInLabels`, so the where-used read is done twice; `combination.findMany` also runs twice. Measured on the same database, 200 fields, 15 calls each, main vs this commit: `/library/fields` median 122 ms (99-143) vs 160 ms (129-221); `/library/sections` 39 vs 44 ms; `/library/document-types` 7 vs 9 ms. Max 221 ms exceeds the concept's "filter and search under 200 ms with Sample data". Fix: build the labels from the ids once (as `usedInLabels` does) and drop the second read.

**Minor 2. Form-code match is a bare substring of the spaceless code** (`library-items.ts:226-232`). `q=5` or `q=m` matches every field of any form with that character in its code ("IMM 5707" compacts to "imm5707"), on top of the text matches. Pack cases ("IMM 5707" only) pass. Suggest matching the code only when the query has 3+ characters or starts at a code boundary; not a blocker.

**Minor 3. Tautological assertions.** `check_c313_words_filters.ts` BR-2 "forms count" compares `usedBy.forms` with `new Set(r.forms).size` (same data, passes for any list) and "combinations" compares with `used_in.length` (the `combos.has(id)` filter at `studio.ts:468` is never exercised). The sections check (SQL oracle) and the returned-change check are real. Other checks do fail without the change (fields missing). The browser check fails without `findsByAliasOrForm` (the server is not asked).

**Minor 4. Status words edge.** A released field with a draft edit reads "Released", and a released field with a waiting retire reads "Waiting for a second person", so `status=released` leaves it out. Matches the concept text; say so in the Screen 04 notes so the status filter is not read as "has no open change". No fix required.

## Test honesty
* Without the change: the pack drops back to 8/23 (qa's count); both new checks fail on missing keys; the browser check fails on the placeholder and the alias/code searches. Real.
* Not covered by any test: a re-placed field and `?section=` (Major 1); the 400 on a bad `status`/`origin` is covered; a deleted combination in where-used ids is not.

## Journey test (reviewer role, score 8/10; pass 8+, no zero; walked headless, not by an intended user)
Journeys: (1) search "imm5476", with and without the space, finds 24 of 164 fields; (2) search an alias in lower case finds its field only; (3) search with no match shows no rows; (4) keyboard-only: tab to the search box, type, rows update with "24 of 164"; (5) 400 px and 1024 px (and 2x): no sideways scroll, placeholder fits; (6) API break: `status=PUBLISHED` returns 400 in words; (7) re-place then `?section=` (fails: Major 1).
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1/2 | Search by alias and form code works; counts, status and origin words are not on any screen |
| Next step obvious | 1 | Placeholder names what can be typed |
| Plain words | 1 | 400 messages name the choices |
| Feedback and state | 1 | "24 of 164", empty list stays quiet |
| Correct data | 1/2 | Section filter wrong after a re-placement |
| Error recovery | 1 | Bad status/origin 400 in words; no-match is 200 empty |
| Accessibility, sizes | 1 | axe clean; 400, 1024, 2x no sideways scroll |
| Speed | 1/2 | median 160 ms, max 221 ms for the list |
| Visual quality | 1 | Unchanged team look |
| Trust and sources | 1/2 | Origin words exist in the API; the page still shows no AI or Person mark from them |
Total 8.0. Raise: fix Major 1, show the words on the rows (next row, not this one), one where-used read.

## Could not check
No real screen reader or intended-user walk (D17, D20 stay with the founder). Only the Visitor visa fixture and the sample set were loaded (no multi-combination retire/restore flows). No cold-start timing.
