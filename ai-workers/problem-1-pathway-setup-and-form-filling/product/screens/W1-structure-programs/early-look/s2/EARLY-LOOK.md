# S2 Immigration programs — Lead early look (27 Oct)

Walked like a person by the Lead in the browser, on the screens lane's commit `4e6b409` (branch `screens/2026-10-27-s2-programs`, not pushed yet), on an isolated copy (port 4420, own database, Load sample inputs). Not on :4400. Compared with design D (`../../design/draft-programs-v2.html`, `preview-programs-v2.png`) and `concept.md` §5–§8. Screenshots here at 1440 and 1024: 01 cards, 02 list, 03 search "LMIA", 04 Corporate, 05 Structure panel (Start setup + footer).

## Matches design D
* Menu and title "Immigration programs", the one-line purpose, Structure and New combination buttons top right.
* Retail · Corporate and employers tabs with counts; Corporate shows the callout with Sample examples.
* Search finds names, form numbers and documents ("5257" → 3 combinations with "Matches: IMM 5257"); a match in the other tab says "6 matches in Corporate and employers. Show them"; no match → "Nothing matches" + Clear search.
* Status menu; counts line (21 combinations · 1 Live · 4 In setup · 16 Not started); Cards / List switch.
* Pathway sections collapsible with count and "need you"; each card: muted trail, category bold, sub-category or "No sub-category", status chip, 4-step bar, forms and "Filed:" line, one next-step button.
* List view: full five-part trail on every row, Status sortable, setup bar, next step.
* 1024 px: cards in two columns, nothing cut.
* **S1 fixes done:** Structure › a program's panel › "Used by" now gives **Start setup** for a Not started combination (opens New combination with the trail filled); the panel footer (Remove, Retire, Close, Save) is fully visible at 1440×900 and 1024×768.

## Differences (Lead recommendation in brackets)
1. **Sample shows one Pathway called "Individual" with all 21 combinations** (trail "Retail › Individual › Citizenship"); Corporate has 8, with the Pathway also called "Corporate and employers". Design D groups by Pathway (Temporary residence, Permanent residence, Citizenship; P-112) and Corporate holds one Sample. Cause: the old sample loader. [Rename the sample's Pathways in the S2 fix so every early look until S7 reads right; S7 replaces the sample later.]
2. **Every Not started card says "Add sources"** (the old flow). Design: Not started → "Start setup". [Change the label and make it open the same Start setup page as the Structure link.]
3. **Clicking a Not started combination's name starts it silently**: one click on "Provincial nomination" in the list moved it from Not started to In setup (counts 16 → 15), with no "Start setup" word and no undo. Already so on main; not new in S2. [Same fix as 2: the name opens the Start setup page; nothing changes until the person presses Start.]
4. **In setup cards: "2 forms attached, not added yet" with a button "Add 1 form from the library"** (Visitor visa, Super visa): the two numbers disagree and the words belong to the old intake. [Make the numbers agree in plain words now; the wording goes for good with automatic forms, P-123, in S4/S5.]
5. **Search box is narrow at 1440**; its hint is cut ("Search names, form numbers, documer"). Design D: wide search. [Let the search take the free width.]
6. **"20 need you"** counts every Not started combination, so it says 20 of 21 and stops helping. Design D counts only combinations waiting on a person (review, missing, not ready). [Improvement idea for the founder: count only those; Not started is already in the counts line.]
7. A Not started card shows "Step 1 of 4 · Forms" with the first step outlined. [Minor: show "Not started" until the first form is in.]
8. Pathway cards (All pathways · Individual · Add pathway) sit above the search. Not on the board; added on the founder's 27 Oct ask (same cards as Structure). [Keep.]
9. Not seen in the browser because the sample has none: a "Not ready" card, an AI-running card with Stop, the read-only view. The lane's check claims them (check_w1_programs_s2 62/62); the Lead check verifies them at CHECK.
10. Start setup still opens the old New combination page ("Linked to", "Will be created as"). Expected: S3 replaces it.

## Verdict
Close to design D. Lead recommends **Go with a small fix** (items 1–5 and 7; item 6 if the founder agrees), then CHECK and merge.
