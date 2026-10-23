# Slice 1 brief — Program tree with rows and readiness (S1)

**Goal:** a content publisher can build and navigate Canada's program tree (Pathway › Program › Category › Sub-category), see which leaves are rows, and see at a glance which rows are not startable and why.

**Why first:** the tree is the spine every other screen hangs off; the team already has `ProgramDef` and a tree page, so this slice is mostly correcting and extending, which proves the new loop in days, not weeks. It also fixes grounding-audit finding 1 (identity drifted to family composition).

**Requirements:** SA-1B-50, 51, 55, 56; SA-1-12, 13, 14, 15; SA-1B-90, 91 (readiness shown; checks partly stubbed until slice 2).

**Starts after:** the founder agrees the Screen 1 concept on the design canvas (boards S1, S1b, S1c and the business rules BR-1 to BR-14).

**Where:** the local reference build, mirroring the team's names and shapes so the team can retrofit it. **Mirror:** `apps/api/prisma/models/country-pack-questionnaire.prisma` (`ProgramDef`, `ProgramNodeKind`); frontend `src/features/admin/spine-authoring/program-hierarchy-page.tsx`, `components/program-tree-view.tsx`, `program-pane-view.tsx`, `program-node-detail-panel.tsx`, `program-type-switcher.tsx` (today a mock — replace with the Pathway level).

**Screens:** the agreed Screen 1 concept: Pathway workspace switch (Individual / Corporate), combinations grouped by program with Category and Sub-category columns ("Not applicable" when none), inline form attach/upload, calculated setup status with one next action, freshness column; new-combination dialog with master pickers and duplicate catch; selected-combination panel.

**In scope**
1. Display labels Pathway / Program / Category / Sub-category over the existing enum (adapter; backend lead confirms — `MASTERS.md` §2).
2. Level-order validation: Program under Pathway, Category under Program, Sub-category under Category; one parent, same country.
3. Leaf detection = row; row settings fields: allowed locations, filing method, portal (D13, D16b) — stored on the leaf.
4. Add child inline, rename, disable (not delete), reorder siblings as a set, search, filter "not startable".
5. Readiness column per row with placeholder checks that slice 2 fills (has forms / documents / sections per role / current form edition).
6. Synthetic sample tree via the pack import path: 2 pathways, 5 programs, ≥ 8 rows, clearly labelled "Sample".

**Out of scope:** lines on a row (slice 2), preview (slice 3), AI, case side.

**Scenarios (each becomes a test)**
* Given an empty draft, when I add Individual › Work permits › Employer-specific work permit, then it shows as a row with status "Not startable" and the reason list.
* Given a Category with a Sub-category, then the Category is not a row and cannot hold row settings.
* Given a Pathway selected, when I try to add a Category directly under it, then I am told a Program comes first. *(adverse)*
* Given a node with children, when I try to disable it, then descendants become unavailable for new cases and the node shows "Disabled". When I try to delete it, the option is not offered. *(adverse)*
* Given 5 sibling programs, when I drag one to the top and reload, then the new order holds.
* Given 100 synthetic rows, then the tree first renders in under 1 s and search narrows in under 200 ms.

**Done when:** scenarios pass as tests; screenshots at 1440/1024; reviewer verdict Ship; PR ready.
