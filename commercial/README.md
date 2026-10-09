# Commercial — Expat Ready business plan and money model

**Current (v1.1, 8 October 2026). Draft for discussion; nothing approved.**

| Use | File |
|---|---|
| Business plan for the founders, staff and investors (Word) | [plan.docx](plan.docx) |
| The plan's canonical source (Markdown) | [plan.md](plan.md) |
| Money model: change the *Inputs* sheet, read the *Summary* sheet | [model.xlsx](model.xlsx) |
| Handoff for Codex's review | [ready-for-review.md](ready-for-review.md) |

**Kept as references:**
- Evidence and decisions: [00-evidence-baseline.md](00-evidence-baseline.md).
- Research of 7 Oct 2026: [research/](research/).

**How to update:**

- **Numbers:** edit `model.xlsx` in Excel or LibreOffice. No scripts are needed. Changing an input recalculates the whole forecast.
- **Words:** `plan.md` is the canonical source.
    - Edit it, then regenerate the Word file with `python3 tools/make_plan_docx.py`. This needs pandoc and keeps table rows whole.
    - If someone edits the Word file directly, copy those edits back into `plan.md` before the next regeneration, or they will be lost.
- **Figures in the plan:** they are a dated snapshot of the model's defaults. After inputs change, update the offer table in plan §3 and the cash table in plan §5, or mark them as out of date.

**Author tools** (not needed for everyday edits):
- `tools/build_model.py` recreates `model.xlsx` with its default inputs. Running it **overwrites** the file.
- `tools/test_model.py` runs the scenario tests.
- `tools/make_plan_docx.py` and `tools/plan-reference.docx` build the Word plan from `plan.md`.

## Superseded, kept for history (7 Oct 2026, v0.2)

These files are kept so that existing links keep working. **Do not use their funding figures.** Codex's recheck of 7 Oct found calculation defects in them.

- 00-decision-summary.md
- 01-market-revenue-strategy.md
- 02-sales-affiliate-cs-playbook.md
- 03-funding-investor-plan.md
- 04-execution-team-financial-workbook.md and 04-execution-team-financial-workbook.xlsx
- coverage-map.md, discovery.md, review-dispositions.md and workflow-review.md
- tests/ and the v0.2 tools in tools/ (build_workbook.py, refresh_reports.py and the others)
- The previous index: README-v0.2-2026-10-07.md
- The previous handoff: ready-for-review-v0.2-2026-10-07.md
