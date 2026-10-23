# One-pager draft 4.3: maker correction of R-M1 and R-m2

19 October 2026 · Claude Code, Lead (D204). Answers the validator's [final audit of draft 4.2](../illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/final-audit-4.2.md) (PASS WITH FIXES). A small, bounded edit made in place: same approach, structure and stable IDs; no other activity changed. Not founder acceptance; not republished.

## Revision

| | Draft 4.2 (audited) | Draft 4.3 (this correction) |
|---|---|---|
| HTML SHA-256 | `8afb68a30dd79c7130443cb5666fccec68bc039744c50bbcc00f99d8d24f02d0` | **`124df0a2b6ddafe23310f53db713d1705bc3ab33ed08d386d226400937728445`** |
| Preserved at | Validator's frozen copies: `inputs-4.2/` + [manifest-4.2.json](../illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/manifest-4.2.json). All 18 entries matched the live files before editing; no second copy made | `problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`, rebuilt twice to the same hash by `python3 tools/s3/build_one_pager.py` |

Changed authoring inputs (SHA-256): `s3_data.py` `e9e85a27…6466`, `build_one_pager.py` `6a6f2af4…32ce`. Unchanged: `s3_panels.py`, `s3_views.py`, `s3_terms.py`. Checks: `check_desktop_pass.cjs` `4055bdd3…27d9` (one regex accepts "the mapping hold"), new `check_draft_4_3.cjs` `f8c5b36e…6572`, new `correction_4_3_ledger.py` `4b134f41…d5a6`.

## R-M1 (Material): a disproved mapping fault never clears a known wrong fact

**Corrected in activity 10.4**, reusing the existing fact-correction rules (8.1, 9.3, D181); no new founder policy.

- **Acceptance** split in two. Mapping right and facts correct: hold released with evidence; an earlier approval stands, subject to every normal submission check (9.5). Mapping right but the partner's verified date of birth wrong: only the mapping hold is released; every unsubmitted form that reads the date stays held at approval and submission until the agent corrects and verifies it in 8.1; those forms are prepared and checked again, lose their earlier approvals, and are approved (and signed where required) again; Client A's other forms keep their approvals.
- **Rule:** the Proposed rule keeping an earlier approval during investigation now applies only "if the mapping stands and the facts it reads are correct". A new rule (founder decision tag, from D181) states that releasing the mapping hold does not release forms that read a wrong fact.
- **Done-when, return route, exception example:** all now say "only the mapping hold is released" and keep the forms that read the fact held.
- **Related rules made consistent:** 4.3 (bracketed addition), 9.3 approval guard, 9.5 submission guard, stage 10 rule.

## R-m2 (Minor): continuation arrows start from their real source

- **Wide (≥1100px):** the 6 → 7 wrap now rises above stage 6's own column (`build_one_pager.py`, source column = last card of the row). Measured: riser x = stage 6 centre at 1280/1440/1920, both themes.
- **900–1099px reflow:** each downward continuation shows its stages: (stage 2 → stage 3), (4 → 5), (6 → 7), (8 → 9), (11 → 12). The handoff label text is unchanged; the cue is hidden at other widths, so phone and wide layouts are unchanged.

## Checks actually run (against the 4.3 HTML, in an isolated copy so 4.2 evidence files were not overwritten)

| Suite | Result |
|---|---|
| `check_one_pager.cjs` (interaction/layout) | 150/150 |
| `check_panels.cjs` | 35/35 |
| `check_cohesion.cjs` | 41/41 |
| `check_desktop_pass.cjs` (C-M1–C-M3, D1–D7, 960–1920 both themes) | 86/86 |
| `check_diagram_geometry.cjs` | 0 collisions, 8 diagrams |
| New `check_draft_4_3.cjs` (R-M1 semantic probes on every panel; R-m2 measured at 960/1280/1440/1920 both themes and 375) | 37/37 |
| Build structural checks; panel preservation | passed; 2,125 verbatim, 125 merged or clarified |
| [Content ledger 4.2 → 4.3](one-pager-draft-4-3-content-ledger-2026-10-19.md) | 12 changed strings dispositioned (5 corrected, 6 clarified, 1 display), 0 removed |

Visual inspection: [7 screenshots](one-pager-draft-4-3-evidence/screens/) (960 light/dark setup and case bands; 1280/1440/1920 case band). Logs and JSON: [results](one-pager-draft-4-3-evidence/results/).

**Not run or not claimed:** no product workflow, BPMN engine, AI, PDF, portal or signing behaviour was executed; checks show only that the explanatory model agrees with itself. No reader trial. Scores are not re-assessed by the maker: the validator's seven judgments on draft 4.2 stand as its record. Founder acceptance is not recorded. The hosted copy still serves draft 4.2.
