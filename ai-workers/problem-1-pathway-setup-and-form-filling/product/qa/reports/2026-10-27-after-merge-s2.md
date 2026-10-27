# `/qa after-merge` — S2 Immigration programs on main f289ec7 (PR #53), 27 Oct 2026

Tester: the qa lane, Mac, worktree `claude/qa-after-merge-s1-21bfdf`, Lead note of 27 Oct ("walk it like a content publisher: Pathway cards, Cards/List, Status, search incl. the other tab, need-you counts, Start setup never creates anything, Corporate callout, 1440/1024/390 px, keyboard, read-only role"; Form library and combination workspace out of scope). Tested: **main f289ec7** (worktree HEAD 1b95930 carries it), isolated copy `qa_s2` on :4472 / `xr_studio_qa_s2`; never :4400. AI cost: US$0 (the check replays one saved AI run). Evidence: `reports/2026-10-27-after-merge-s2/` (390 px cards/list, need-you chip, 200 % zoom). Check: `tests/qa/check_qa_am_s2_1027.cjs` — **40/46**; every fail below is a finding or is named. One repair to the check itself: `demo/load` needed a longer request timeout (the sample load runs past the 30 s default on a loaded Mac; the API finishes it fine — a retry answers 409 "already has names" in 170 ms).

## Verdict
**Ready, with two new Minors.** The page works as a publisher's front door: cards, list, search, statuses, need-you counts, roles and sizes all hold. Nothing on the page can create or start anything it should not. The misses are ordering (QA-49) and a history quirk (QA-50) — annoying, not blocking. **QA-48 stays open and gained a facet on this page:** after a release retires a combination, it leaves the cards and there is no Retired option or note on Immigration programs either — a retired combination is findable only through the API.

## Walked (all PASS unless named)
* **Empty after Reset:** Corporate and employers says it is empty in its own words and offers "Open Structure", which lands on the Structure's Corporate tab.
* **Sizes:** 1440 px → 3 card columns; 1024 → 2; 390 → 1; no sideways scroll anywhere, search/Status/Cards/List/New combination all on screen at every width; the List view keeps each row's next step on screen at 390 px; 200 % zoom clean; axe clean on 390 px cards, 390 px list and the approver's cards.
* **Keyboard only:** ⌘K reaches search; Tab runs Clear search → Status → Cards/List → each card's next step; a visible focus ring; Enter on a Pathway card opens it and focus stays put.
* **Search:** a form number in lower case finds its combinations and says why; a sub-category word in any case finds it; a Pathway name works; a non-English no-match says so with Clear search and no error; 300 characters are cut, not refused; spaces-only shows everything. **Cross-tab:** a Corporate-only name searched from Retail is offered as "1 match in Corporate and employers", never mixed in, and Show it switches tab with the search kept (BR-8).
* **Status counts (BR-13):** every option's count equals the cards then shown (All / Needs work / Not started / In setup / Live).
* **Structure ⇄ page agreement:** a category added on the Structure is a Not started card at once, counted on its Pathway card; a rename shows at once on the same key; a remove waits for approval, the card stays until then and drops with the counts after; "+ Add pathway" opens the Structure (names enter only there).
* **Need-you counts:** one waiting combination shows "1 needs you" on its Pathway card, on All pathways and in its section; Needs work lists it; the chip survives 390 px.
* **Start setup:** opens New combination and creates nothing — also on a double click (combination count unchanged). **QA-50 (Minor):** after that double click the page is in history twice, so one Back does not return to Immigration programs.
* **Read-only role:** "+ Add pathway" tells the approver why it is disabled; clicking a Not started name gives the reason, stays on the page, creates nothing; the server refuses with 403 in plain words (nobody: 401).
* **Retire path (QA-48 context):** retire → approve → release works through the API; the combination leaves the cards. **QA-48 re-seen:** the Status menu has no Retired option and nothing says one is hidden, so a retired combination cannot be found on the page to restore it.
* **Ordering — QA-49 (Minor, 3 steps):** the cards and the List draw alphabetical-by-trail order, not the Structure's order — the sample already differs (Structure: Visitors · Work permits · Study permits; page: Study permits · Visitors · Work permits); a reorder on the Structure (201) changes the tree but not the page; the List's "Back to Structure order" tip promises the order it does not give.
* **Timings (STANDARDS §9):** first view 1567 ms and search 458 ms against the <1 s / <400 ms bar — **run on the Mac under load**; consistent with the load note already raised, not logged as a finding. A cold run would settle it.
* No script error on any page or state.

## Findings
* New: **QA-49** (screens, Minor — page order ignores the Structure's order), **QA-50** (screens, Minor — Back needs two presses after a Start-setup double click).
* Re-seen on f289ec7: **QA-48** (Major, screens — still no screen for combination Retire; now also unfindable on this page), QA-44, QA-45, QA-46 (screens FIX), QA-47 (runtime S5), QA-38, QA-40 (runtime), QA-39 (Screen 04).
* Closed this run: none.
* Open after this run: 0 Blocker · 0 Critical · 3 Major (QA-38 runtime; QA-45, QA-48 screens) · 7 Minor (QA-39, QA-40, QA-44, QA-46, QA-47, QA-49, QA-50).

## Notes for the Lead
1. QA-48's home question from the last report is sharper now: S2 has no Retired status or note either, so *no* page finds a retired combination. Wherever the screens lane puts Retire/Restore, this page's Status menu is the natural "find it again" surface.
2. The §9 timing step and `demo/load` crossing 30 s both smell like the same thing — the shared demo cluster serving every lane's copy while the Mac is loaded. A dedicated check cluster, or the suite running cold once per merge, would separate real regressions from load noise.
3. Coverage was not re-run this merge (graph regenerated from 1b95930: 18 Works, 13 Partial, 54 Not built; G5 now lists C11.1 — the parked-extension capability has no test naming it, expected while W1-02 is parked).
