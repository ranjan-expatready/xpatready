---
name: screen-build
description: Builder's skill for implementing one agreed Pathway Configurator screen end to end in the local reference app — data, rules, engine, contract, UI, AI assist and governance — to the written standards, with tests per business rule, screenshots and build notes. Use at stage BUILD.
---

# Screen build

**Precondition:** the lane file says BUILD or FINISH and `concept.md` shows the Definition of Ready ticked; the board in `product/design/` (and `screens/NN/design/`) is the layout to match exactly.
**Team patterns (P-48):** read `ai-workers/problem-1-pathway-setup-and-form-filling/product/design/TEAM-PATTERNS.md` and the newest local `code/ERv2-frontend@*/docs/style-guide/`; use the brand kit, tokens, type scale and the team's components where they fit; the layout follows the capability and the board, not the team's existing screens; note any deviation and why.
**Board = intent (P-44):** match its flow, structure, words and behaviours; improve visual and interaction details with the team's real components; before coding, write "Top 5 production improvements over the board" in build-notes; list every deviation with its reason in the EARLY-LOOK block; propose (never apply) changes to flow, scope or wording.
**Slice 1 (BUILD):** only what the screen needs to show its main path on real data, looking like the board; screenshots; stop for EARLY-LOOK. No polish, no extra states, no refactors before the Go.
**Bar:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/STANDARDS.md` and `EXPERIENCE.md` — every [M] line applies; an [S] line skipped needs a reason in build-notes.
**Read:** `concept.md` (the spec), `design/*.dc.html` (exact layout, spacing, copy — reference markup, not production code), `PRODUCT.md` §3–§5, the `domain/` files it touches; team references (read-only): `code/ERv2-frontend@<newest>/docs/style-guide/`, `src/styles/tokens.css`, `code/ERv2-sanitized@<newest>/apps/api/prisma/models/country-pack-*.prisma`. App: `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`.

**Order:** data (mirroring team names; migration keeps records) → rules and engine (pure) → contract (zod, Problem Details, server authorisation, version and idempotency checks) → UI (pattern, every state, tooltips, keyboard) → AI assist / governance where the concept says → Sample data as import files.

**Mid-build discovery** that the agreed design cannot work: stop that part, write it under "Build discoveries" in challenge.md with evidence and a fix, put it in the stage's Paste to Lead (Needs line), continue with unaffected parts.

**Done when (checklist):** every BR has a passing and a failing test · existing suites still pass · axe-core clean · performance budgets measured · screenshots of every state at 1440 and 1024 in `screens/NN/screenshots/` · you walked every scenario yourself · `build-notes.md` (under 100 lines) lists files changed, team-name mapping, mock vs real, checks run per standards section, honest self-score D1–D20, known gaps, AI cost. Then set CHECK. Commit and push on your lane branch; the push guard gates the content (P-82).
