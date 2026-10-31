---
name: screen-concept
description: Lead's skill for designing one Pathway Configurator screen before it is built — job, masters and links, business rules, layout on the team's brand, states, copy, contract, tests and at most three founder questions — challenged by a fresh agent before the founder sees it. Use at stage DESIGN or when asked to design or rethink a screen.
---

# Screen concept

**Draft helper:** the Lead may launch the `screen-designer` agent to draft `concept-draft.md` and the board from this skill; the Lead edits, decides and owns the result (the designer, the challenger and the builder are three different contexts).

**Board first (P-42):** draw or update the screen in the journey canvas (page "Journey v2"; save its source to `product/design/` and `screens/NN/design/`) before writing concept text; the founder agrees by clicking through it. Use the brand kit and team patterns as a reference for a coherent look (layouts follow the capability) (`ai-workers/problem-1-pathway-setup-and-form-filling/product/design/TEAM-PATTERNS.md`). concept.md stays one page and ends with the Definition of Ready checklist (`WORKFLOW.md`).

Read: `ai-workers/problem-1-pathway-setup-and-form-filling/product/PRODUCT.md`, `EXPERIENCE.md`, `STANDARDS.md` §2–§6, `domain/` files the screen touches, the `SCREENS.md` row, the SA-01B sections and solution-page activities named there, the current app screen and the team's matching screen (`code/ERv2-frontend@<newest>/src/features/admin/spine-authoring/`).

1. **Job and journey** — one sentence; persona; activity IDs; SA-01B IDs.
2. **Ten layers** (`STANDARDS.md` §2): what exists in the app, in the team's code, what is new.
3. **Business rules** BR-1… each with its source.
4. **Layout** — one pattern from `EXPERIENCE.md` §3; scoped menu; team tokens; every state; realistic Sample data; real IRCC codes only when certain. Draw it on the design canvas and save each board's source to `screens/NN/design/` (the builder cannot see the canvas).
5. **Copy** — tooltips, empty states, errors.
6. **Contract and tests** — endpoints and shapes; one pass + one fail per BR; scale and keyboard checks.
6b. **Capability or scaffolding** (P-33) — list each element under one of the two; demo steps use the capability's own path.
7. **Questions** — at most three, recommendation first.
8. Write `screens/NN-slug/concept.md` (under 100 lines) with sections for each step above.
9. **Before showing the founder:** run a fresh agent with skill screen-challenge on the concept; fix every Blocker/Major or record why not.
10. On agreement: record answers in concept.md and decisions in `DECISIONS.md`; put the screen's row at the top of its area in `BACKLOG.md` and start that area's builder with `/next <area> <row>`.
