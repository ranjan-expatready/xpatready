> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](../plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Model tools (v0.2)

The workbook `../04-execution-team-financial-workbook.xlsx` is the single numeric source.
- **Edit:** only the tabs **Inputs** (shared defaults), **Scenarios** (per-case overrides), **Actuals** and **Experiments**.
- **Edits are never overwritten:** every script below preserves them.

| Script | What it does | When |
|---|---|---|
| `refresh_reports.py` | Recalculates the workbook (LibreOffice), runs the sensitivity variants on BASE, rewrites the generated blocks in the Markdown artifacts, and stamps the refresh fingerprint on the Reports tab | After you change assumptions or actuals and want the documents updated |
| `check_reports.py` | Compares each generated block's fingerprint with the workbook's current inputs, actuals and model logic; exits 1 if any block is stale | Before sharing any document |
| `build_workbook.py` | Rebuilds the model's formulas and layout. **Reads and keeps** Inputs, Scenarios, Actuals, Experiments and tracker tabs from the existing workbook; spec defaults in `model_spec.py` are used only for new assumption IDs | Only when the model logic changes; then run `refresh_reports.py` |
| `acceptance_tests.py` | Runs the 12 acceptance-test groups from the Codex brief on disposable copies; writes `../tests/acceptance-report-*.md` | After any logic change |
| `independent_model.py` | Plain-Python re-implementation (explicit cohort loops) used by test 11 | Called by the tests |
| `lo_recalc.py` | LibreOffice headless recalculation and formula-error scan | Called by the others |
| `wbtools.py`, `model_spec.py` | Shared helpers; the assumption catalogue (IDs, units, ranges, initial defaults) and the six cases | — |

**What needs what:**
- **Excel:** formulas, Dashboard, Compare, Checks, Cohorts and Cash13w update on edit.
- **The refresh step:** the Sensitivity tab and the Markdown generated blocks.
- **Requirements:** Python 3 with openpyxl, and LibreOffice (`soffice`).
