# Founder feedback on the Immigration programs cards, 30 Oct (R-144)

Given on a screenshot of Immigration programs on main, after board v3 of the setup checklist. This is the "changes first" the founder asked for before any build (P-177). The founder said not to follow his lines word for word: the Lead and the designer make it beautiful and simple, within these points.

**What is wrong today:** the cards are too heavy. Status, next step, release numbers, AI problems and rule codes are all on the card, so a basic user cannot tell at a glance what to do.

**What the founder wants**
1. **Header = the combination's name** (for example "Spouse or common-law partner"), not its status.
2. **The full trail under it, small and quiet:** Retail › Permanent residence › Family sponsorship › Spouse or common-law partner.
3. **Less on the card.** Gone from the card:
   * the big "Not started" line;
   * "Next: …";
   * "Release 1", "Release 2" and "Live release";
   * "View AI problems";
   * rule codes such as "P-76";
   * system phrases such as "release a problem first before draft".
   All of that belongs on the combination's own page.
4. **Simple progress, if any:** "3 of 5 done" or a percentage. The designer chooses one, or none.
5. **One button per card, the same everywhere:**
   * "Start setup" (not started);
   * "Resume setup" (in progress);
   * "Open" (set up and live).
   The words are the Lead's to refine. "Complete setup" was also mentioned.
6. **One button colour across the app**, chosen once in the design system (the founder suggested a light green; the Lead proposes it within the brand and checks the contrast).
7. **Uniform, plain words** a basic user understands; nothing that "consumes all the data" on the card.

**What the next Lead does**
* Redraw the card on board v4 (`design/draft-setup-checklist.html`) and the concept's card section. Keep the setup checklist's five steps and counts underneath (P-157): they now show only on the combination's page and in the card's progress.
* Show the board to the founder for a Go before screens builds slice A.
* The button colour is one design-system token used by every primary button. Check it against `STANDARDS.md` and `EXPERIENCE.md`, and against the team's brand components.

## At 20, 50, 150 combinations (founder's question, 30 Oct; the Lead's recommendation for board v4)
* **Progress:** show "4 of 5" with a thin five-part bar. With five steps a percentage says the same thing less clearly (80% means 4 of 5), so no percentage.
* **Grouping:** sections by Pathway, then Program, each header with one quiet count ("Family sponsorship · 3 of 8 live") and folding open or closed. This is how 150 cards stay findable.
* **Finding one:** the existing filter bar (Find, status chips Not started · In progress · Live, Needs you) and the Cards / List switch (P-115) stay above the sections. List view becomes one line per combination: name, trail, "4 of 5", button.
* **The one signal kept on the card:** a small "Needs you" mark, only when something waits for the person looking (a review or a confirmation). Without it, a reviewer must open 150 cards to find their work. Everything else stays on the combination's page.
* **Speed:** the concept's 150-combination timing test stays (P-157: counts are derived and cached per combination).
