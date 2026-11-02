# Break report: C11.3 full five-part trail (QA-150), commit c8840db6

The breaker ran isolated copies only: :4445 for the change and :4446 for the finder suite with the fake launcher (US$0). For comparison, :4446 then ran an `origin/main` (12647032) worktree loaded with the same data. Live AI stayed off. Nothing was fixed, committed or pushed. The finder suite rewrote five tracked F1-setup screenshots; they were restored with `git checkout --`.

The checks were limited to what the row claims:
* Shared library › Forms: Used by, its filter, and See where it is used.
* The finder plan and its run's scope label.
* `plan.combination.ai_trail`.

**Verdict: no Blocker and no Major.** Four Minor findings: two are new in this commit (1, 2) and two make the run's scope label inconsistent (3, 4). Two notes.

## Findings

**1. Minor (new): the Used by filter no longer shows which combination is chosen.**
* Repro: Demo › Load sample (six). Shared library › Forms at 1024 px. In the Used by filter, choose Visitor visa.
* Expected: the closed control tells the combination apart, as main did ("Visitors › Visitor visa").
* Actual: it reads "Retail › Temporary residence ▾". Every option starts with the same type and Pathway, so Visitor visa, Study permit and the LMIA permit all look the same once chosen.
* Cause: the option text is now the full trail with the type first, in a fixed `w-56` (224 px) select (`web/src/pages/library-forms.tsx:200`). The cell (`TrailText`) puts the name first for exactly this reason; the filter does not.
* Evidence: screenshots `filter-visitor-4445.png` (new) and `filter-visitor-4446.png` (main) in the breaker's scratchpad. The text length the select must show grew from 199 to 248 characters.

**2. Minor (new): a long unbroken word in a name spills out of the Used by cell over Status.**
* Repro: on Structure, rename the category "Study permit" to 119 × "S". Rename the program "Family sponsorship" to "Familienzusammenführungsangehörigenpatenschaftsprogrammverwaltungsrichtlinien". A real German compound such as "Staatsangehörigkeitsnachweis" (about 200 px) also exceeds the 168 px cell at 1024. Open Shared library › Forms at 1024 px.
* Expected: the trail wraps inside its cell.
* Actual: the text paints across the Status column (behind "Ready"). The cell's `scrollWidth` is 1069 against a `clientWidth` of 168. The table's sideways scroller grows from 857 to 1438 px at 1024 (1284 to 1769 at 1440) into blank space, although the table itself is 857 px in both builds.
* Main clipped this with `line-clamp-2`. The new `TrailText` (`library-forms.tsx:241`, `block xl:min-w-56`) has no `break-words` / `overflow-wrap:anywhere`.
* Evidence: `table-4445.png` (new) and `table-4446.png` (main). axe found 0 violations in both builds; this is a visual defect, not an axe one.

**3. Minor (scope label): a "|" in any name cuts the run card's scope.**
* Repro: rename "Super visa" to "Super visa | parents and grandparents", then Find forms (rules).
* Expected: the run card shows the full trail.
* Actual: `GET /runs/:id` `scope` = "Retail › Temporary residence › Visitors and tourists › Super visa " (rest of the trail lost, including "No sub-category"). AI work (`ai.ts:63`, which uses `indexOf`) shows the full trail.
* Cause: `api/src/runs.ts:74` uses `scopeLabel.split("|")[1]` on the label written at `finder.ts:259`. The code is older than this commit, but this commit puts every level of the trail into that label. Names may contain "|" (`labelProblem` only needs one letter or digit).

**4. Minor (scope label): run labels are frozen at start and never backfilled, so one list shows two names for one combination.**
* Repro:
  1. Find forms on Visitor visa.
  2. Rename the program Visitors to "Visitors and tourists".
* Expected (P-104, "every list"): one trail per combination.
* Actual:
  * Used by and the plan show "… › Visitors and tourists › …".
  * AI work and the run card keep "… › Visitors › …".
  * Runs stored before this commit keep the 3-part label ("Temporary residence › Visitors › Visitor visa"; a simulated old row was read through `/ai/batches`, `/ai/batches/:id`, `/runs/:id` and `…/forms/find/latest`, all 200). So AI work mixes 3-part and 5-part names.
* Probably acceptable as history; it is listed because the row claims the run's scope label.

## Notes (not ranked: data the service cannot make, or wording)
* **N1. Odd chains get no check and an invented type.**
  * Setup: four odd chains written straight into the database (the service refuses them): a program with no Pathway, a category directly under a Pathway, a sub-category directly under a program, and a Pathway with `client_type` "FAMILY".
  * `fullTrail` (`engine/structure.ts:87`) gives 4 parts for the first three. It labels the "FAMILY" Pathway "Retail" (it falls back to Retail).
  * The catalogue builds its own trail (`api/src/programs.ts:147`, `pw?.label ?? ""`), so for these chains the plan and the card would differ. Two copies of one rule (STANDARDS §7).
  * The test's `FIVE()` check covers only the six's shapes.
* **N2. Separators and the placeholder are ambiguous.**
  * A name containing " › " ("Work › Study") is accepted. Because Used by and the filter send one joined string, it reads as a 7-part trail ("Retail › Sep pathway › Work › Study › Open › Closed › Inside").
  * A real sub-category named "No sub-category" is hidden by `TrailText` (`library-forms.tsx:239`), and the combination is shown as its category "Spouse".
  * "No sub-category" is hidden in the cell but spoken in the filter, the tip, "See where it is used", "Picked by AI on …" and the 409 "Still used: … › No sub-category; …".

## What held
* **The row's own check:** `tests/check_c113_full_trail.ts`, 8/8. **The finder suite with the fake launcher:** `check_forms_s4_finder.ts`, 144/144.
* **Corporate:** a Corporate sub-category path and a Corporate category-only path give "Corporate and employers › … › Inside Canada" and "… › No sub-category". The plan's trail equals the Immigration programs card for Corporate, Retail and non-English (Arabic, Chinese, Cyrillic, accented) names.
* **AI names unchanged:** `ai_trail` holds the same names the AI was given before. Load sample "six" replays gave the same results as main: Visitor visa PARTIAL with 7 forms; the other four "No saved AI answer for these exact pages" on main too.
* **Pre-change plans:** they fall back to `trail` (`finder.ts:314`). Old runs never re-execute (`onModuleInit` fails them), and all of their views answer 200.
* **Renames:** a rename shows at once in Used by, the filter, where-used and the plan (computed live). A launch with a plan fetched before the rename is refused with "Look at the plan again" (409).
* **A category that later gains a sub-category:** refused by the service ("Category already set up", 409) and by the database trigger `program_node_not_under_combination`. So "No sub-category" can never sit above a sub-category.
* **Wrong role:** the case officer (user-O) gets 403 on the plan and on `/uses`; an unknown actor gets 401. An unknown or invalid id on the plan gets 404. Each name is limited to 120 characters (400 with a message per level).
* **Scale:** 100 programs / 411 combinations. `/library/forms/list` takes 250–300 ms; with the sample it is 110–180 ms, the same as main. `/uses` takes 16 ms and the plan 8 ms. The number of queries is unchanged (`combinationTrails` reads `clientType` in the same query).
* **Layout:** no page-level sideways scroll at 1440, 1024, 400 px or 1024 at 200 % zoom (512 CSS px). axe (WCAG 2.1 AA) found 0 violations at all four.
* **Keyboard and screen reader:** Tab reaches "N combinations". Its tooltip (via `aria-describedby`) opens on focus and lists each full trail. The single-trail cell is plain text, read name first and then the trail.
* **Not applicable to this row:** uploads, planted-instruction PDFs, rules that hide fields, reload or back mid-action, and concurrent creates. The row adds no write path.
