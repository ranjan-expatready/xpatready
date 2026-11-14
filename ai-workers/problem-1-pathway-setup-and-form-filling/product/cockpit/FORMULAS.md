# Board formulas (P-596; spec `cockpit/spec-a61-a62-2026-11-14.md` draft 3)

Every number the board shows for spec §1-§5 and §7, with its formula, source, provenance class, threshold and owner. `tools/cockpit-data.py` computes them **from the frozen snapshot only** (§6 1a); `tools/test_cockpit_data.py` checks each one against hand-worked numbers on `tools/fixtures/cockpit/snapshot/`. A fresh reviewer audits this sheet against the sources before each version is published, and weekly (P-591).

**Provenance class** (§0.3): *measured* = GitHub or git; *parsed* = a hand-kept record file at the records sha; *reported* = Lead input (shown "Lead-reported"). A number built from measured and parsed inputs is marked *parsed* (the weaker class) with sha `records <sha> + main <sha>`. Every number carries `src`, `sha`, `as_of`, `class`; a null carries `reason` and the page shows **not measured** (schema `cockpit/data.schema.json`).
**Owner** of every number, its formula and its source data: the current Lead (STATE `current_lead:`), unless a row says otherwise. **Times:** "IST day" = the timestamp in UTC+05:30, then its date; "today" = the IST day of the snapshot's `taken_at`. Anything merged after `taken_at` is ignored.

## Snapshot (§6 1a) and what each script reads
`<out folder>/snapshot/`: `meta.json` (`taken_at`, `repo`, `main_sha`, `records_branch`, `records_sha`; plus `extra`: records lag by git, read only by this script) · `github/pulls.json` (every PR, state all; `files_app` = `tools/app-code-prs.sh`'s rule, classified for open PRs, PRs merged in the last 21 days and every PR whose title starts with a row id; other PRs `null`) · `github/main_checks.json` · `github/guard_runs.json` · `github/branches_recent.json` (every branch read; kept when its head commit is under 24 h old; GitHub keeps no push time per branch, so the head commit's committed date stands in) · `files/<repo path>/` (MVP-CHECKLIST.md, BACKLOG.md, STATE.md, cockpit/plan.json, cockpit/history.jsonl, qa/BUGS.md at `records_sha`, by `git show`) · `files_main/qa/CAPABILITIES.md` (at `main_sha`) · `git/capabilities_main.jsonl` + `git/capabilities_main/<sha>.md` (main commits touching it, 30 days) · `git/bug_first_seen.json` · `briefs.json` · `lead-input.json`.
**Extra files** (this script only; not part of the shared layout): `github/main_nightly.json` (newest finished nightly on main), `github/open_prs_detail.json` (each open PR's head commit time, CI rollup, and when `review: approved` went on).

## Shared definitions
* **Row id** (BACKLOG row): a token shaped `[A-Z][A-Za-z0-9]*-[0-9A-Za-z]+(-…)*` (PF-4b, BK-17, B5-filings, DB-SPLIT, PF-L), not a decision (`P-n`) or bug (`QA-n`) id; it never matches inside a longer id ("PF-4" is not in "PF-4b"). "BK-22 to BK-24" expands to three ids.
* **Build rows**: the table rows of MVP-CHECKLIST.md section "## A." under a "### X." group (A to L) whose first cell is a map number; columns found by header name. **Parts** of a row = the row ids in its "BACKLOG rows" cell. **Shaped** = Status does not read "Not shaped". **Unshaped or unnamed part**: the cell says "none yet", or a part sits in a ";"-segment that says "named only".
* **Title match (N2)**: a PR title starts with the id, optionally after a lower-case lane prefix and ": " ("runtime: PF-3 — …"). Records PRs (`lead:`, `qa:`) and merge-queue PRs (`mergify/` branches) never count.
* **Merge date of an id (N2)** = IST day of the earliest `merged_at` among merged **app** PRs (`files_app` true) whose title matches it. "Merged" for scope and built uses this date.
* **Release 1 changes (N2)** = distinct ids cited in the Build rows' cells, plus every BK- row of BACKLOG.md (the Flags tie the case-side BK- rows to map rows 77, 80, 99).

## §1 Plan and pace
| Number | Formula | Source | Class | Threshold |
|---|---|---|---|---|
| Changes doing a day (Y) | changes merged in the window ÷ w; w = min(14, today − 13 Nov) IST days ending today; 2 decimals | pulls.json, checklist | parsed | not measured while today − 13 Nov < 5 (principle 4) |
| Changes needed a day (X) | remaining scope ÷ calendar days from today to the committed date | plan.json H1 (kind committed; `date_to` else `date`) | parsed | not measured until H1 is committed ("No committed date yet (set <M1 date>)") |
| Remaining scope (C1) | unmerged parts of shaped Build rows (distinct) + Σ over Build rows not shaped of max(0, 3 − its merged parts) | checklist, BACKLOG, pulls.json | parsed | label "estimate: N unshaped capabilities × 3 (P-586 (4), settled 19 Nov)" |
| Flags' BK rows unmerged (small print) | BK- ids not cited in any Build row, not merged | BACKLOG, pulls.json | parsed | counted in pace, not in C1's scope (see Open points) |
| Built (B) | Build rows that are shaped, have ≥1 part, no unshaped/unnamed part, every part merged; built date = latest part's merge date | checklist, pulls.json | parsed | — |
| Built before 13 Nov (small print) | Build rows with no part whose Status reads Merged or qa Works (built in the proof of concept; no date) | checklist | parsed | shown apart, never in B |
| Proven (P) | first commit in `git/capabilities_main.jsonl` whose file reads Works for every qa id of the row | checklist qa id column, capabilities history | parsed | not measured until the checklist has a column whose header starts with "qa" (#1748) |
| Changes per built capability (small print) | distinct parts of built rows ÷ built rows | as above | parsed | shown only when ≥ 5 rows are built |
| 50% and 85% dates | Monte Carlo: 10,000 runs, `random.Random(596)`; each run adds one day at a time (day 1 = tomorrow) and subtracts a throughput drawn uniformly from the 14 daily counts until remaining ≤ 0; nearest-rank 50th and 85th percentiles; a run still short at 365 days → "beyond 1 year" | 14 daily counts (IST days ending today), remaining scope | parsed | zero guard: counts sum to 0 → not measured "no merges in 14 days", light red |
| Sample (14 daily counts) | Release 1 changes merged per IST day; while today − 13 Nov < 5: **reference class** = app PRs (not records) merged per IST day, labelled "reference class: all app rows, not only Release 1" | pulls.json | measured | switches automatically on 18 Nov |
| Pace light | grey: no committed date, or no tolerance yet (plan.json H1 `tolerance_days`, the founder's); green: 85% ≤ committed + N; amber: ≤ committed + N + 7; red: later, or the zero guard | above | parsed | the founder's N (decision after 19 Nov) |
| Burn-up | x from 13 Nov to the later of H1 `date_to` and the 85% date; scope = `rows` of each day's history line (today: now); built and proven recomputed per day from their dates; H1 drawn as a band while a forecast | history.jsonl, plan.json | parsed | — |
| Roadmap timeline | plan.json dates on one line, committed filled, forecast hollow, today marked; behind a click | plan.json | parsed | — |

**History (N1)** `cockpit/history.jsonl`: one line per IST day (the day's last refresh replaces earlier lines of that day): `day`, `taken_at`, `rows`, `shaped_maps`, `unshaped`, `scope_changes` (merged changes + remaining that day), `file_shas` (git blob sha of each record file read), and `audit` (`built`, `proven`, `checklist_sha`; read only by the "built never falls" invariant, never displayed). Written by `--history-file` (default this folder); `--no-history-write` for checks.

## §2 Capacity (Theory of Constraints, Kanban flow metrics)
| Number | Formula | Source | Class | Threshold |
|---|---|---|---|---|
| Lanes working (L) | branches with a push (head commit) in the last 90 min, not `main`, `mergify/`, `gh-readonly-queue/`, `dependabot/` (P-326) | branches_recent.json | measured | — |
| Ready rows (Q) | BACKLOG rows `backlog()` calls ready (not merged, not in a PR, "waits on" nothing unmerged; no "waits on" = nothing) **and** with a brief: `design/lead-b-briefs/<ROW>.md` or `<ROW>-…md` on Lead B's branch (`lead-b-front-office`, Lead input `lead_b_branch` overrides), `design/briefs/<ROW>…md` at the records sha, or `briefs/<ROW>` in the row's BACKLOG line. Merged here = any non-records PR whose title starts with the id. | BACKLOG, briefs.json, pulls.json | parsed | — |
| Room | Lead input `max_lanes` − L | Lead input | reported | not measured without `max_lanes` |
| Review queue | open, non-draft, non-records PRs, CI rollup success, no `review: approved`; wait = hours since the head commit (oldest) | pulls.json, open_prs_detail.json | measured | limit 2 h |
| Merge queue | open PRs labelled `review: approved`; wait = hours since the label went on (oldest) | as above | measured | limit 1 h |
| qa queue | built rows not qa Works and not proven; wait = hours since the built date (00:00 IST) | checklist | parsed | limit 24 h; not measured until the qa id column exists |
| Constraint line | qa queue > 0 and qa wait not measured → "Constraint unknown: qa wait not measured." · else Q ≥ 1 and no wait over its limit → Building: "L lanes working · Q rows ready with nobody on them → could add min(Q, room) lanes." · else the stage with the largest wait ÷ limit: "More lanes won't help now: the constraint is <stage> (wait X h)." · no waits and Q = 0 → "no row is ready with a brief" | above | — | — |
| Cycle time | median days, PR opened to merged, app PRs (not records) merged in the last 14 days (the snapshot has no commit list, so "opened" stands in for "first commit") | pulls.json | measured | not measured under 5 merges |
| Items older than usual | open app PRs (not records, drafts included) older than the 85th percentile (nearest rank) of those cycle times; no colour; list on click | pulls.json | measured | — |
| Age warning (Health 7) | an item older than 2 × the 85th percentile, or with no push in 24 h | pulls.json, open_prs_detail.json | measured | amber |
| WIP | open app PRs (not records) | pulls.json | measured | — |
| Baton-held | — | — | — | not measured until BACKLOG rows carry `touches:` |
| Capacity light | green when no age warning and (constraint not Building or Q = 0); else amber | above | — | — |

## §3 Top 3 · §4 Team · §7 Working today
* **Top 3**: Lead input `top3.today|week|month` (`what`, `why`, `rec`, `owner`, optional `needs_you` = a Needs-you id the card links to). Missing, or Lead input older than 2 h → "Lead has not updated this" (amber card). Reported. `example: true` shows "example data".
* **Team**: Founder (product direction) → current Lead (STATE `current_lead:`, "Lead N") and Lead B (Lead input session with role `lead-b`, or role `lead` named "Lead B…") → lanes (Lead input sessions with role `builder` or `qa`, state not `done`, grouped by `reports_to`). Cross-check: a reported lane matches a measured branch (pushed in 24 h; not `lead/`, `lead-`, main or queue; with an open PR or no PR at all, so a merged PR's leftover branch is not a lane) by its `branch`, or its `pr`'s head branch. Found by one source only → "?" and listed in Health item 7. Standbys (role `standby`), strategy desk (role `desk`), reviewers (fresh Opus per PR).
* **Working today**: a Build row is marked when an open PR's title starts with one of its parts (measured, filled dot), else when a running Lead-reported session's `row` text names one of its parts (ring). Line: "Working today on: <groups, A to L>".

## §5 Health (one light; red if any item is red, amber if any is amber or not measured)
| # | Item | Rule | Class | Action and owner when red |
|---|---|---|---|---|
| 1 | main CI | check runs on main's head: any failure/timed out → red, any unfinished → amber; also red when the newest finished nightly on main failed (main's head has no ci.yml run of its own) | measured | fix main first · current Lead |
| 2 | Board data age | **computed by the page**: now − `generated_at`; amber ≥ 45 min, red ≥ 2 h | measured | refresh at the next check · current Lead |
| 3 | Records on main | commits on STATE's `this branch:` not on main (git); red when the oldest is over 24 h | measured | open the records PR to main · current Lead |
| 4 | Guards | newest label-guard.yml run on main, and the push guard step of the newest finished merge-queue ci.yml run that ran it: success → green, failure → red, none → amber | measured | restore and re-run the guard · current Lead |
| 5 | Burn | Lead input `burn_pct_per_h` ≤ 3 (P-440); missing or Lead input over 2 h old → amber | reported | slow the lanes · current Lead |
| 6 | Majors on Works | open Critical/Major in qa/BUGS.md whose named capability (ids before any "(" note) reads Works on main, first seen (first main commit adding "| QA-n |", `git log -S`) over 48 h → red; first-seen unknown → amber | parsed | fix or re-rate · qa lane via the current Lead |
| 7 | Data trust, age, org, freshness | red: numbers disagree or an invariant breaks; amber: not checked, an age warning, an org "?", or a source past its limit (GitHub data 1 h, Lead input 2 h, flow-measure 6 h) | measured | fix the script, record or input named · current Lead |

## §6 Data trust
* **Invariants** (every refresh): Build rows = baseline (plan.json `baseline_rows`, default 101, P-586); Build rows unique (a repeated map number: the first wins, the repeat is listed); every cited row id exists in BACKLOG.md (ids the cell itself calls "named only" are exempt); every qa Works row names a qa capability (or a milestone "M2 60/60") reading Works on main; Works (M2, T, M3, M4) equals progress.sh's own parse + M4 rows; cumulative built never falls, unless the history's previous line shows a different row count or checklist sha (then a "mapping or scope change" line is shown).
* **Reconciliation**: `tools/cockpit-reconcile.py <snapshot>` (a separate process; written independently). Compared exactly: works_on_main, works_total, changes_per_day_window, remaining_scope_changes, built_rows, proven_rows, open_app_prs, lanes_working, ready_rows, the 14 daily counts and remaining scope; the 50% and 85% dates within ±1 day. Banner: "Numbers disagree: <names>" (red) · "Numbers not checked" (amber) when it is absent, fails, or gives no known number.
* **Known fixes**: Works counts M4 (93/98, not 93/97); Needs you leaves out asks whose status says decided, done, answered or ruled.

## Open points for the Lead (spec readings to confirm)
1. N2 "title starts with that id": titles such as "screens: C7.6 — BK-18 (QA-448)" do not match, so BK-15 to BK-19 stay unmerged; the board lists them in the trust notes.
2. Pace counts the Flags' BK rows (N2) but C1's scope names only Build rows' parts, so unmerged BK rows not cited in a row are outside the remaining scope.
3. Reference class: "all app-code row merges" is read as app PRs (not records), P-500's measure; it ran 8 to 66 a day in the M2 weeks, so the reference-class dates are far earlier than plan H1 until the switch on 18 Nov.
