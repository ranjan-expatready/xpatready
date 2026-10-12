# Workstream 2: handoff

*Replace at every checkpoint (README §0 rule 13). About 600 words. References, not copies.*

## Next outcome (the only work for the next session)
**Archive the superseded design files listed in `blueprint/blueprint.md` §8.**
- Move each one to `archive/` with a one-line pointer file left in its place.
- Keep `design/behaviours/`, because AW-01 and AW-02 cite it.
- Re-check that every link in `blueprint/blueprint.md` and `blueprint/traceability.csv` still resolves.
- Done when: the archive move is committed locally and a link check reports zero broken links.

## Completed in the last sessions (12–13 Oct)
- **Decisions AIW-D92 to D117** (`decisions.md`). No founder question is open.
- **Step R consolidated:**
  - `blueprint/blueprint.md` (single entry point);
  - `blueprint/traceability.csv` (84 journey steps);
  - `blueprint/run-next.md`;
  - `blueprint/simulation-run-2026-10-13.md` / `.csv`.
- **Specification:**
  - `requirements/AW-01-firm-ai-assistants_v0.1.md` (v0.8) and `requirements/AW-02-platform-ai-assistants_v0.1.md` (v1.0);
  - `requirements/change-notes/` (wording swept 13 Oct);
  - `requirements/tests/AW-test-cases.csv`: 500 tests (492 Not run, 8 Withdrawn).
- **Team change register:** `team-change-register-2026-10-13.md` / `.csv`.
  - 147 rows: A 80 required by founder decisions, B 67 additional; 18 conflicts.
  - Every row is "Not yet sent".
- **Supporting files:**
  - `design/rules-and-ai-framework-2026-10-12.md` (v2);
  - `design/ai-autonomy-model-2026-10-12.md` (rev 5);
  - `commercial/workflow-pricing-2026-10-12.md`;
  - `handbook/ai-team-profiles.md` (32 skills);
  - `prototype/index.html`.
- **Checkpoint workflow (13 Oct):**
  - README §0 rule 13;
  - `tools/session-start.sh` (minimal load);
  - `tools/stop-check.sh` (local commit only, new end line);
  - new `tools/exchange-count.sh` (reminder at five founder messages, registered in `../.claude/settings.json`);
  - `../AGENTS.md` (local history clarified);
  - `../CLAUDE.md`.

## Evidence, kept apart
- **Specified:** 42 journey steps.
- **Simulated:** 40 steps. Prototype run 2 passed all 27 tests in simulation only (prototype a146be4).
- **Partly implemented:** 2. The 10 Oct code has the assessment engine without a run type, and clean-only document serving with a fake scanner.
- **Executed on the product:** 0. The code copy has no AI layer.

## Checks actually run
- Reviews R10-b and R11 passed with fixes applied (`checks/review-R10-b-2026-10-13.md`, `checks/review-R11-2026-10-13.md`).
- Prototype simulation runs 1 and 2.
- The 13 Oct change-note wording sweep (464 scripted edits) was spot-checked by the Lead only; it has had no full review.
- The hooks were run by hand on 13 Oct, and their output was checked.

## Unresolved findings
- Lead rulings the founder may overrule: `proposals.md` rows dated 12–13 Oct.
- The traceability.csv "Simulation result" column carries run 1 wording for two of the four tests fixed in run 2; `run-next.md` holds the run 2 result.
- Partial simulation coverage: 15 of the 27 passes miss some steps (named in the simulation CSV).

## Pending approvals and blockers (founder actions, no question pending)
- Decide how the team change register goes to the team; drop any part-B rows.
- Give the provider test script to the tech lead (AIW-D69).
- Name a licensed reviewer (AIW-D83). Until both are done, the 20 driving-test cases (run-next bucket c) cannot run.
- Paste `charter-edits.md`; place the FD-4, FD-7, FD-8 and FD-16 amendments on Drive; ask the team to upload CP-01; tell the co-founder about AIW-D66.
- Workstream 1: FD-18 per-firm or per-seat, due 30 Oct; update `../commercial/plan.md` and `model.xlsx` for workflow pricing in Step 5.

## Standing
- Sources: `../sources/drive-snapshot-2026-10-11/`. Check Drive at the start.
- Interview one question at a time, with a recommendation and a one-line why.
- Lead rulings must never go beyond the founder's words.
