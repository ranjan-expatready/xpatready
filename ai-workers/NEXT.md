# Workstream 2: handoff for the next session

*Replace, don't append. Plan, gates and status: `PROGRESS.md`. Decisions: `decisions.md`. Story, ratings, audits: `REPORT-CARD.md`.*

## State, 13 Oct 2026 (Step R consolidated)
- **Standing direction (AIW-D106):**
  - full agreed scope in this release;
  - simplest complete design;
  - design against a Workstream 1 that is complete and tested (a labelled assumption, AIW-D98);
  - proportionate safeguards;
  - no counsel and no consultant conversations (AIW-D94).
- **Decisions:** AIW-D1 to D117 (latest: D117 amends D98 to separate expected missing inputs from unreliable evidence). **No founder question is open.**
- **The single entry point:** `blueprint/blueprint.md`.
  - **Traceability:** `blueprint/traceability.csv` has 84 journey steps, each traced to team IDs, our IDs, team changes (register IDs), acceptance criteria, user stories, tests, evidence level and simulation result.
  - **Run next:** `blueprint/run-next.md`.
  - **Simulation runs:** `blueprint/simulation-run-2026-10-13.*`, run 2, all 27 tests pass in simulation. This is simulation only; the catalogue status stays "Not run".
- **Evidence:**
  - specified 42;
  - simulated 40;
  - partly implemented 2 (the assessment engine without a run type; clean-only document serving with a fake scanner);
  - executed 0.

  The 10 Oct code has no AI layer.
- **Specification:** AW-01 v0.8, AW-02 v1.0, change notes (wording swept 13 Oct: "AI teammate", no counsel gates), 500 tests (492 Not run, 8 Withdrawn).
- **Team change register:** `team-change-register-2026-10-13.md` and `.csv`.
  - 147 rows: A 80 required by founder decisions, B 67 additional; 18 conflicts.
  - All rows "Not yet sent".
  - Checked in R11, fixes applied.
- **Checks:** R10-b and R11 passed with fixes applied. The 13 Oct wording sweep (464 scripted edits) has been spot-checked by the Lead only.

## Next
1. **Founder:** decide how to hand the team change register to the team, and whether to drop any part-B row.
2. **Bucket (c), 20 driving-test cases:** these can run once a Canada provider passes its test (AIW-D69) and a licensed reviewer is named (AIW-D83). Both are founder actions.
3. **Archive superseded design files with pointers** (blueprint §8). Keep `design/behaviours/` because AW-01 and AW-02 cite it.
4. **Workstream 1 items:** `commercial/plan.md` and `model.xlsx` for workflow pricing (Step 5); the per-firm or per-seat decision, FD-18, due 30 Oct.

## Founder actions still standing (no question pending)
- Paste the Charter edits (`charter-edits.md`).
- Place the FD amendments on Drive (FD-4, FD-7, FD-8, and FD-16 narrowed by D92).
- Tell the co-founder about AIW-D66.
- Give the provider test script to the tech lead (AIW-D69).
- Name one licensed reviewer (AIW-D83).
- Ask the team to upload CP-01.
- Send the team change register.

## Standing
- Sources: `../sources/drive-snapshot-2026-10-11/` (CURRENT). Check Drive at the start of the next step.
- Interview the founder one question at a time, with a recommendation and a one-line why.
- Lessons:
  - stay inside AI;
  - decisions.md is append-only;
  - targeted edits;
  - makers without an Edit tool get no large-file edits;
  - one Lead writes shared files;
  - Lead rulings must not go beyond the founder's words (the R10-b lesson that led to D117).
