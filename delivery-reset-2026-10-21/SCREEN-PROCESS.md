# Per-screen process — concept first, then build

Adopted 21 Oct 2026 (founder). Applies to every screen of every milestone.

## The loop

1. **Concept pack (Lead with the design partner session)** — on the shared design canvas, one set of boards per screen:
   - *Job of the screen* in one sentence, and who uses it.
   - *How the masters link* (diagram) and what is stored where (`MASTERS.md`).
   - *Business rules* numbered BR-n, each with its SA-01B ID or founder decision.
   - *Layout* at 1440 px with realistic sample data, every state that matters (empty, in progress, needs work, ready, error), and the flows that start here (dialogs, panels).
   - *Help text* for every status, icon and empty state.
   - *Open questions* — at most three, each with a recommendation.
2. **Agree** — the founder comments on the canvas or in chat; the concept is revised until agreed. Nothing is built before this.
3. **Build (Claude Code, local reference)** — production-grade UI on the team's tokens and components, and the backend for the capability being proven, mirroring the team's model and contract names (`MASTERS.md`). Every BR-n becomes a passing and a failing test.
4. **Score (RCIC reviewer)** — walk the scenarios as each persona, score the 16 dimensions in `QUALITY-DIMENSIONS.md`. Handover gate: nothing below 3, each family averages 4+.
5. **Hand over** — a short pack for the team: screens, business rules, data shapes, API contract, tests, and what is mock vs real.

## Screen order — Milestone 2 (Product Studio · Pathway Configurator)

| # | Screen | Concept status |
|---|---|---|
| 1 | Combination catalogue (Pathway workspace, combinations, inline forms, status) + new-combination dialog + selected panel | **On canvas, for agreement** |
| 2 | AI setup run and proposal review (reuse / new / ambiguous, source beside proposal) | Next |
| 3 | Combination workspace: forms, documents, sections, steps as lines; preview by person | — |
| 4 | Shared library: fields, sections, document types (where used, AI vs person provenance, duplicate guard) | — |
| 5 | Rules: dependent questions and document rules (rule map) | — |
| 6 | Review and release | — |

Then the case officer screens and the client family link.
