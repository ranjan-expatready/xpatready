# C7.5 part 1 — challenge to the concept (builder, 4 Nov IST; for the tech lead's ruling)

**What the concept asks** (`../M3-agent-view/concept-draft.md` BR-19, board frame 13): a **Review page**, a case tab listing findings per filing and person.

**What part 1 builds:** a **Review panel on the case page**, under Prepare application, with the findings **grouped per person** in the case's order (the application's own facts first, on the principal's filing). Each finding carries its filing (`filing` in the API), so a per-filing view needs no data change.

**Why a panel for now (evidence):**
* The case page has no tabs today (`web/src/runtime/cases.tsx`: people, Eligibility card, Prepare application, Agent view, one page). The page frame and case tabs are the team's AG-07 shell (stand-in SI-16, "case page frame: the runtime lane's page adds the chip"), not built yet; a lone Review tab would be the only tab.
* The officer works the findings next to the forms they come from (Prepare application sits right above) and the facts they quote (Agent view right below): a fix in the Agent view refreshes the panel at once (same query key).
* Eligibility has the same shape: a card on the case page and its own page (C6.9).

**Recommendation:** accept the panel for part 1; build the Review page (own route, like Eligibility, per filing then person) in part 2 together with the AI review run card, when the page has enough on it (run card, rounds, agreement) to earn its own place.

**If you rule against:** part 1 moves the same component to `/cases/:id/review` with a "Review (n open)" card on the case page; no API or data change.
