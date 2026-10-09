# Challenge review of everything decided so far (Lead as coach, 9 Oct 2026)

**Ranjan's answers (same day, AIW-D21–D27):** launch needs all of it and everything in the documents is assumed built, so the launch split is **rejected** and timelines are out of scope; licensed-only approval is **replaced** by human approval per the firm's own role settings (AIW-D26); expert co-pilot answers only (**accepted**); role twins as delegation (**accepted**); every other recommendation **accepted**. Plan §3 stands, minus the launch split and with the pilot kept only as a measurement step, not a timeline.

Ranjan asked: "don't blindly follow anything; challenge all of these; review all the decisions, visions, objectives, innovations and AI capabilities; then come up with the final plan." This is that review. Each line says what we decided, what is weak about it, and what I recommend instead. Recommendations are proposals until Ranjan says yes.

## 1. Decisions, challenged

| Decision | What is weak | Recommendation |
|---|---|---|
| **AIW-D1 / D14: all AI is in scope and launch needs it** | The team builds to the Charter, which says the opposite. "Launch needs it" plus March 2027 is not achievable for a full AI layer: nobody has specified the AI Worker layer yet, the case spine is not built (AG-07 §12), and the AI Doers are "built but switched off" pending a provider. | Split "launch needs it" into two: **at launch**, the Deadline Guardian on, the four AI Doers on (provider recorded), and the Needs you inbox; **within 90 days of launch**, the File Builder in a paid pilot with three firms. Say this to the team, and fix the Charter. |
| **AIW-D5 / A1: treat the product as ready** | Fine for concept work; dangerous for promises. Workstream 2 depends on Workstream 1 delivering specific things (Needs you, recipes, AI Doers, Reader fields, pack content). If those slip, every AI Worker slips. | Keep the assumption, but add a **dependency list** to the plan and get Ayush and AK to confirm dates for each item. Investor material shows "built / specified / proposed" on every claim. |
| **AIW-D11: firms only** | Right call under CICC rules. VisaFlo's OpenVisa shows rivals going direct to applicants, which may pull volume away from firms over time. | Keep firms only. Record "applicant self-serve under a firm's licence" as a possible later product, needing counsel, not a current goal. |
| **AIW-D13: keep FD-16, AI acts on behalf of a named person** | A true "role twin" with its own permissions contradicts "no AI identity". Also, "on behalf of" needs a product mechanism that does not exist (Doc 1 amendment A4-1 pending). | Define a role twin as **delegation**: it uses a subset of one named person's permissions, never more, and that person's name is on every action. This is a Workstream 2 requirement for Phase B. |
| **AIW-D17: licensed-only approval for AI output** | Strong trust story, but in a one-RCIC firm the licensee becomes the bottleneck and the product looks slower than VisaFlo's "human release" by any user. Licences are never verified today, so "licensed" is a label. | Keep it, but tier it: licensed-only for advice, forms and filings; a named staff member for internal filing actions (already the product's floors). Add batch approval so a licensee can clear a file in minutes. Verify licences against the public register later (counsel). |
| **AIW-D18: find every use case** | Catalogue sprawl is the classic way to raise money and ship nothing. | Catalogue everything, rank it, **ship one**. The second worker starts only when the first has pilot numbers. |
| **AIW-D19: four shapes, incl. the expert co-pilot** | The expert co-pilot is the riskiest piece: it is where hallucination, privacy leaks (case files in a prompt) and cost blow up. "Role twin" invites the regulator's question "are you replacing licensed judgement?" | Expert co-pilot: **answers only, no actions**, only from published pack versions and the firm's own records, every answer cites its source, refuses when it has none, Canada-only processing. Call role twins "assistants to the role", never replacements, in all external wording. |
| **Wedge: File Builder per prepared file** | Per-file pricing needs metering the product does not have (SA-04: no add-on prices in Release 1). Firms may fear variable bills. | Pilot price: a flat monthly fee for up to N files, then per file. Metering is a Workstream 2 requirement. Validate the price with the 5–10 consultants before fixing it. |
| **"Not done by anyone", "$1 million", "best in class"** | None is provable today. VisaFlo markets the same story. Investors punish unprovable superlatives. | Use only claims we can show: specified guardrails, deterministic packs, traced values, licensed approval, Canada-only processing. Replace "$1M" with a model in W3 with 2–3 raise options and the pilot numbers that would justify each. |
| **Raising on the AI story (AIW-D9)** | Raising before the pilot means selling a promise against a competitor that already ships. | Sequence: pilot numbers first (even three firms, eight weeks), then the raise. If the raise must come earlier, the story is "the governed AI layer on a shipping product", with the pilot as the use of funds. |
| **Email/code finding (E6)** | The founders' earlier code sends client text to the AI provider's standard service with no Canada-only setting. | Provider and region decision is a Workstream 2 requirement before any AI Doer is switched on. Do not assume a Canada-resident option exists; check with the provider. |
| **Charter conflict** | Unresolved, it means the team and Workstream 2 plan to different launches. | Ranjan updates the Charter (only he can) or tells the team in writing which scope stands. |

## 2. The vision, challenged

The vision ("whatever a human does, an AI version does the same governed way") is right and your own documents already lean that way (FD-16, AG-11, the autopilot spec). Two corrections:

1. **Governed is the product, not AI.** Every rival has AI. The sellable difference is that ours cannot act outside the rules, cannot invent a value, cannot send without approval, and leaves a record. Lead with that in every sentence.
2. **One worker that works beats four shapes on a slide.** The four shapes are the map; the File Builder is the territory. The investor story shows the map; the pilot proves one road.

## 3. Final plan (replaces nothing; sharpens what is running)

| Step | What | Done when | Owner |
|---|---|---|---|
| W2a Carve-out | Every AI, Doer and Conductor requirement in one place, word for word | Both indexes complete | 2 agents, running |
| W2b Use cases | 12–25 cases across the four shapes, ranked, module map | Ranking table + module map | designer, running |
| W2c Improvements | Gaps and proposals: on-behalf delegation, one audit record, provider and region, licensed-only tiers, metering, expert co-pilot limits, Reader auto-classify | File reviewed | designer |
| W2d Dependencies | What Workstream 2 needs from Workstream 1, with dates to confirm with Ayush/AK | List Ranjan can send | Lead |
| W2e Review + page | Hostile review; updated visual with workers on the map | 0 blocking | reviewer, Lead |
| W3a Validation | Demo file + price test with 5–10 consultants from Ranjan's peer group | Written reactions | Ranjan + Lead |
| W3b Commercial | Proposition, pricing, business case into the existing plan and model; investor story with 2–3 raise options | Added to `commercial/` | strategist |
| B Requirements | File Builder and Deadline Guardian in the project's developer format, with examples and tests | Checks pass | Lead + agents |
| Pilot | Three firms, eight weeks, measured time per file | Numbers | Ranjan + team |

**Reporting rule (new, AIW-D20):** at the end of every step the Lead presents the result to Ranjan without being asked: a short chat message with what changed, what it means, what is needed from him, and the link; the detail goes on the visual page and in `PROGRESS.md`.
