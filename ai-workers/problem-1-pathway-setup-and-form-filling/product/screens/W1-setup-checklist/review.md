# W1 setup checklist, card v4 on Immigration programs (P-180): independent review (CHECK)

Reviewer agent, 30 Oct. Branch `claude/screens-card-aba78e`. The app was started from the worktree at 33c77518/df88ff10 (HEAD e0f98bf8 changes only the lane file). Private copy `rev_card` on :4446, US$0 (no live switch, no priced button clicked; one saved replay through the builder's own check). Agreed design: `concept-draft.md` §6–§7 (card v4), `founder-feedback-2026-10-30.md`, `plan.md`, board `design/draft-board-v4.html`. Journey test: `journey-test-reviewer-2026-10-30.md` (the one score for this check).

## Verdict: **Ship after fixes**. Journey score **8 / 10** (passes; no criterion at 0)
The card itself is right: the five things only, one button per state and per duty, the brand-blue `--color-primary` everywhere, Needs you per person, the four status chips, Pathway › Program sections with "n of m live" and folds remembered per person, the List with its mini bar, and 4/3/2/1 columns. axe is clean at 1440, 1024, 512 (200 % zoom of 1024) and 375 px. Four Majors remain. Three make the card show something untrue or lead somewhere with nothing to do. The fourth is a second "need you" count.

## Checks run (on :4446, as copies writing only to the scratchpad, so the builder's screenshots stayed untouched)
* `check_setup_card_browser.cjs`: **42/42**. `check_w1_programs_s2.cjs`: **87/87**, with one printed NOTE (finding M4). `check_screen01_browser.cjs` on a fresh copy: **112/116**. The two C1.6 Forms-channel fails are outside this item. The two timing fails were 1352 ms against 1 s for the first view, and 203 ms against 200 ms for a view change, with the machine at load average 14–16. Warm `GET /catalogue` answers in 15–36 ms. The first view measured 1050, 1352, 2389 and 2343 ms on four runs. Treated as load; see "Could not check".
* Graph (`tools/graph.mjs --check`): G1 0 · G2 0 · G3 2 · G4–G6 0. The two G3 routes are attachments routes, not this item's. C11.10 is named by 15 checks.
* Server: catalogue with no actor gives 401, with the case officer 403, with a bad filter 400, with a 500-character "é" search 200. A double click on Start setup made one combination. `needsYou` equals `setup.viewer.needsYou` on every row for user-A, user-B and user-C.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Card v4 §7 met item by item. But "n of 5 steps" counts an empty step 4 as done (M1), and Needs you appears for an act that does not exist (M2) |
| D2 Data integrity | 4 | Read-mostly screen. Start setup double click → one row. 401/403/400 on the server |
| D3 Reuse | 4 | One engine (`setupChecklistOf`/`forViewer`) and one colour token. Structure still counts "need you" its own way (M4) |
| D4 Rule integrity | 3 | Step 4 resolves ✓ with 0 documents and 0 questions (M1). People item at expert tier with no confirm act (M2) |
| D5 Stability | 4 | Back returns highlighted with scroll kept. Folds survive reload. Double click leaves once. The person-switch fix is in df88ff10 |
| D6 Freshness | 4 | Not the card's job by design (release numbers moved to the combination page, R-144) |
| D7 AI trust | 4 | No AI on the card. The AI proposals show as "Needs you: Review 84 proposals". The priced finder is not on the card |
| D8 Orientation | 5 | Name, full trail (hover and aria-label), Pathway › Program bands with "n of m live" |
| D9 Flow | 3 | Resume setup lands on Forms, where the item is not, and the header's "Next step" names something else (M3). The expert's Needs you leads nowhere (M2) |
| D10 Language | 4 | Plain words and tooltips on the chips, bar and Needs you. The Progress sort tooltip promises a global order but sorts within each Program (m1) |
| D11 Feedback | 4 | Skeleton, busy spinner, 2 s outline on a new card, Back highlight. The per-card "Setup steps could not be worked out." + Retry is not built (m2) |
| D12 Visual | 4 | Clean, even cards; 2 px edge bar; green only for Live (screenshot `card/01-cards-author-1440.png`) |
| D13 Accessibility | 4 | axe clean at 4 widths and in List. Keyboard: Tab from a name reaches Needs you, then the button. List roving focus works. 38 Tabs from page top to the first list row (m3). A focusable `role="img"` mark (m4) |
| D14 Team look | 4 | Team tokens and Button. `--color-primary` #0862C5 on every card button (check) |
| D15 Speed | 3 | 150 combinations shown in 425–480 ms (server 453 ms). First view over the 1 s budget on every run, under heavy load. Not confirmed either way |
| D16 Testability | 3 | Every rule tested has a pass and a fail, but none catches M1 (the check compares the text with the bar, both wrong) or M2. The s2 check prints M4 as a NOTE instead of failing |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 4 | "Names are Sample until the immigration expert confirms". The Needs you hover says what and how many |
| D19 Closure | 3 | Card only. The Overview strip and the `?focus=` landing wait for forms F2 and slice C, so Resume cannot yet land on its item |
| D20 Pain solved | simulated only | Not walked by an intended user |

## Findings (Must = Blocker or Major; Should = Minor)
**Must · Major M1: step 4 is "done" with nothing in it, so the card overstates progress.** A just-started combination reads "1 of 5 steps" with one bar part filled (Extend stay in Canada right after Start setup). Visitor visa reads "1 of 5" while its Overview says "No questions yet… Documents 0". Concept §4 4a: "every applicant role has at least one document line". Causes: `api/src/programs.ts:215` sets `rolesWithout` to 0 when there are no document lines, and `engine/setup-checklist.ts:123` opens "Draft questions and documents" only when form lines exist. Fix: count every applicant role as without documents when there are no lines, so step 4 stays open. Add a fail test: a started combination with no documents is never ✓ on step 4, and reads "0 of 5".

**Must · Major M2: the expert's Needs you points to an act no screen offers.** The Content reviewer sees **Needs you** "Confirm who can apply" on 7 cards, two of them Live. Open lands on the Overview, which shows the people card with only "Change in Questionnaires", with no Confirm. No confirm endpoint exists: no `participantsConfirmedAs`, and grep finds no confirm route. Sample lists have no `participantsBy`, so `engine/setup-checklist.ts:113` opens `confirm_people` at the hard-coded `tier: "expert"` (`api/src/programs.ts:210–212`), and `forViewer` (l.194) counts it. The expert can never clear these marks. This is the P-33 pattern: the signal shows a capability that is not there. Fix: until the forms lane's confirm endpoint lands (concept §10), leave items with no act (`confirm_people`, `confirm_pages`, `choose_pages`) out of `needsYou`, or the Lead records this as an accepted gap. Add a test: every Needs you item has a reachable act for that person.

**Must · Major M3: Resume setup lands on a tab that does not hold its item, and the page names a different next step.** Visitor visa's Resume goes to `/c/…/forms?focus=people%3Acard` (`web/src/pages/programs.tsx:202`). Nothing in `web/src` reads `focus` (slice C), and the people card is on the Overview and Questionnaires, not Forms. The landing shows the header "Next step: Add 1 form from the library" (old `nextAction`) and a priced "Find forms with AI (about US$0.31 · at most US$5.58)" as the first action (walk screenshot j2). The item it resumes is the expert's (tier expert), so the author has nothing to do there. Fix, within the agreed scope: until slice C's `?focus=` landing and the Overview strip land, Resume goes to the tab that actually holds the next item, or to the Overview. Then the card and the header "Next step" never disagree.

**Must · Major M4: two "need you" counts disagree across screens.** Program structure's Pathway cards count `waitsForPerson` (viewer-free, `api/src/structure.ts:65`): 2,0,0. Programs counts this person's `needsYou`: author 1,0,0 · approver 0,0,0 · expert 5,1,0 (NOTE line in `check_w1_programs_s2.cjs:134`). Concept §8 says the "need you" counts are read from `setup` by every surface and "a second count path fails". Fix: Structure reads `forViewer(setup, actor).needsYou`. Turn the NOTE into a step that fails on a mismatch.

**Should · Minor m1:** the List's Progress sort orders rows within each Program band (and the bands by their first row). The tooltip says "In progress first, then Not started, then Live" (`programs.tsx:570`). Say "within each Program".
**Should · Minor m2:** the §6 error state is not built: there is no per-card "Setup steps could not be worked out." with Retry while Open still works. Only the page-level Notice exists.
**Should · Minor m3:** 38 Tab presses from the top of the page to the first List row. A "Skip to combinations" link, or reaching the grid earlier, would help keyboard users.
**Should · Minor m4:** `NeedsYouMark` is a focusable `role="img"` (`programs.tsx:463`). Make it a button, or text with a tooltip trigger, so screen readers announce it as something they can interact with.
**Should · Minor m5:** the button map sends Start setup to "Overview, step 1", but the build lands on Forms (the agreed S3/P-125 flow, also what concept §4 says). The Lead should align the map line.

## Retrofit mapping
The card reads `CatalogueLeaf.setup` (`CardSetup`) only. The old `statusText`, `nextAction`, `missing` and `progress` stay on the row for the Overview until slice B's strip (plan.md "Not done as briefed" 1). The status filters map Not ready to In progress (`in_progress` filter and count). `CHIP_RANK` replaces `compareStatus`.

## Could not check
The 1 s first-view budget on a quiet machine: rerun `check_screen01_browser.cjs` alone. A real screen reader. An intended user's unaided walk (D17, D20). The Overview, tabs and `?focus=` landing are slices B and C, not built. The confirm endpoint belongs to the forms lane.
