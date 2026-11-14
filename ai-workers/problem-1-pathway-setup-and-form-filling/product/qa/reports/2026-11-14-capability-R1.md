# qa capability R1, 14 Nov 2026: Release 1 rows on qa's list (P-592)

Run: `/qa capability R1` on **main 549b9cfbb** (#1741 FO-1b, the newest merge), cloud qa lane, 10:0x to 11:3x IST 14 Nov.
Fake launcher, live AI off, no priced button, **US$0** (P-175). Own runs on this copy only (one isolated copy, :4470, stopped);
:4400 is not served in this cloud copy, so there was no read-only walk on the shared demo. Evidence: `2026-11-14-capability-R1/`.

## Verdict

`qa/CAPABILITIES.md` now has an **R1 section: 77 rows**, one per Build row of `MVP-CHECKLIST.md` §A (lead branch) in the
Platform, Front office, Client money and Audit modules, each with the row's words, its status on main 549b9cfbb and a
**Done when (what qa tests)** line for the builders of later PF/FO/AUD rows.

| Status on main 549b9cfbb | Rows |
|---|---|
| **Works** | 1: R1.2 Database (PF-3) |
| **Partial** | 2: R1.12 Screen framework, one UI kit (PF-1 seam Works; the kit half has no pack, QA-450) · R1.16 Automated testing (QA-449 Major) |
| **Not tested** | 1: R1.11 Server framework (PF-7: its pack never runs on main) |
| **Not built** | 73 (4 of them have a merged part: R1.1 PF-7's container, R1.19 PF-3's firm tables, R1.37 and R1.41 FO-1b's booking tables, Works as tables) |

The 24 other Build rows are case side (they keep their C rows, P-526, listed under the table) or have no module yet
(64 to 70, 79, 85, 86: Question 3). Bugs: **0 Blocker · 0 Critical · 1 Major · 2 Minor new** (QA-449 Major, QA-450, QA-451).

## 1. How each merged row was judged (P-290, P-303, P-322, P-339, P-405)

* **Counted run on GitHub's runners:** ci run **43577543660**, the merge-queue batch "merged #1741". Its head acae0842 has
  tree ea055af1, **the same tree as main 549b9cfbb** (`git rev-parse acae0842^{tree} 549b9cfbb^{tree}`), so it ran main's
  exact code: every non-quarantined suite, 484 units over 8 parts, 0 retries. The lines counted, copied from the job logs:
  `check_fo1b_booking_schema.ts` PASS 80/80 (job 132395570724) · `check_pf1_module_routes.ts` PASS 28/28 (job 132395570702) ·
  `check_pf3_platform_schema.ts` PASS 75/75 (job 132395570725). File: `ci-run-43577543660.txt`.
* **qa's own re-run (P-290)** on main 549b9cfbb in this copy: PF-3 75/75 exit 0, FO-1b 80/80 exit 0 (no server: both are
  database packs, their Done when is about PostgreSQL itself), PF-1 28/28 exit 0 on isolated copy :4470 (browser against
  vite builds). Logs `*-mine.txt`. PF-1's suite rewrites a committed screenshot (`screens/PF-1/screenshots/pf1-existing-home-1440.png`);
  I put it back (Suggestion 2).
* **PF-7 (R1.11, R1.16)**: its pack is `skeleton.yml` + `tools/skeleton-smoke.sh`. It has **never run on main's code**:
  the batch's skeleton run 43577543636 concluded "skipped" (the workflow skips mergify/* batches and has no push trigger);
  dispatching it on main from this lane answered **403 "Resource not accessible by integration"** (P-439); this cloud copy
  has the docker client but no daemon, so my own attempt never reached the app (`pf7-skeleton-attempt-mine.txt`).
* **Verdicts by a fresh Opus reader that ran nothing (P-303):** `2026-11-14-capability-R1/verdicts.md`. It read the
  BACKLOG Done-when lines (lead branch), the packs, the workflows, the copied CI lines and my logs. I took its verdicts as given.

## 2. Verdicts

| Row | Verdict | Counted | The reason, and the gaps |
|---|---|---|---|
| **R1.2** Database (PF-3 #1728) | **Works** | run 43577543660 job 132395570725, 75/75; mine 75/75 | Every Done-when line has a pass and a fail case on real PostgreSQL (fixed country, one licence per person, one open invitation, insert-only events, settings with default and audit line in one transaction, firm id first in indexes, walls by `firmScope`, seed twice). Minors, not filed: `migrate diff` is checked only for PF-3's lines, not empty as a whole; the "demo-data copy" is demo-shaped (3 cases, 1 audit line), not a copy of the demo |
| **R1.12** Screen framework, one UI kit (PF-1) | **Partial** | job 132395570702, 28/28; mine 28/28 | PF-1's seam Works: a module's pages by its own `routes.tsx` only, existing pages unchanged, clashes refused naming both sides, APP_ROUTES kept equal to App.tsx. **QA-450** (Minor): no pack checks the "one UI kit" half of the map row. **QA-451** (Minor): the BACKLOG row says a clash stops `vite build`; the app stops at load instead (accepted on PF-1's PR, row not amended) |
| **R1.11** Server framework (PF-7 #1713) | **Not tested** | none on main | The pack matches the Done-when, but has no run on main's code (above). Supporting only: skeleton run 43580319853 on PR #1742 (main plus FO-1a's unmerged code) was green on every step, seeded fails included. Watch: main's smoke still signs in with `{"email"}`, which PF-4 answers 400; PF-4 must bring its smoke change |
| **R1.16** Automated testing (PF-7 + CI) | **Partial** | run 43577543660, all 8 parts green | The CI part holds on main's tree. **QA-449** (Major): the container proof runs on single PRs only, never on what reaches main; two PRs green alone can break the image on main with nothing red. Minor: the merge queue skips the quarantined suites (listed with owners) |
| FO-1b part of R1.37 and R1.41 (#1741) | **Works (tables only)** | job 132395570724, 80/80; mine 80/80 | Overlap refused with two real connections (SCHEDULED and RESCHEDULED; free once CANCELLED; two hosts fine); 10-minute gap; slugs unique per firm; cross-firm staff refused (23503); deleting staff with a booking refused. Minor: "firm id first in every index" skips primary keys. **The rows stay Not built**: no booking API (FO-3), no booking page, no hours or time-off screen; nobody can book yet |

Gate A (walk by screens to the next capability's first step) does not apply yet: none of these rows has a screen a person
uses (PF-1's only module page is the `_example` fixture). Journey scores: none (nothing to walk). Coverage (c8): not run
in this round (no API code of these rows has a route yet besides PF-1's fixture); the floor is unchanged.

## 3. What the checklist can now say

Per P-592, a checklist row reaches "qa Works" only from these verdicts: **map row 2 → qa Works** (run 43577543660).
Rows 11, 12 and 16 stay **Merged** (Not tested, Partial, Partial). Rows 37 and 41 keep their status; their FO-1b part is
Works as tables. Every other R1 row has a Done-when line in `qa/CAPABILITIES.md` that names what qa will run for it.

## 4. Could not test

* PF-7's container on main's code: no run on GitHub (skipped on batches; 403 on dispatch) and no docker daemon here.
* The shared demo :4400 (not served in this cloud copy).
* Rows 5, 6, 27, 29 (PF-4 #1744, FO-1a #1742): still in PR, not on main; tested when they merge.

## Questions for the tech lead (also a PR comment headed "Question for the tech lead")

1. **`tools/progress.sh` does not count R1 yet** and should, separately from M2, M3 and T (it reads only `^| C\d` rows,
   and Status is in a different column in the R1 table). Proposed change (tooling, the tech lead's file; I did not edit it):
   also read `^| R1\.` rows with Status in cell 4, print a fourth line `R1 · Release 1 (MVP checklist): W of 77 work …`.
   Also rename T's label, today "R1 · thin runtime slice", to "T · thin runtime slice": two different "R1"s will confuse
   every reader of the progress line. Same question for `factory-board.sh` and `lead-watch.sh`, which read the same file.
2. **The protected set (`works-set.mjs`) reads only C ids**, so R1.2 Works is not re-run as a "Works row" and cannot be
   held in `REGRESSION-HELD.md`. Today the merge queue runs every suite anyway, so `check_pf3_platform_schema.ts` is covered
   in practice; do you want R1 rows in the protected set (a pack column, or an ID rule for `R1.n`), or is the full queue run enough?
3. **Map rows 64 to 70, 79, 85, 86 have no module in the checklist**, so they are not in the R1 section. BACKLOG rev 15
   gives 85 and 86 to Platform (PF-21b, PF-21c). Should they (and the document rows 64 to 70) join R1 now?
4. **Please dispatch `skeleton.yml` on main** (it has `workflow_dispatch`; cloud lanes get 403, P-439) and post the run id
   on this PR: qa then scores R1.11 from it. QA-449 asks for the lasting fix: run the skeleton on the merge batch (or a push to
   main) and make it required.
5. `qa/CAPABILITIES.md` is now 213 lines (the skill's limit is 100; it was 127 before). Keep R1 here as P-592 says, or move
   it to `qa/CAPABILITIES-R1.md` with the tools reading both?

## Suggestions

1. *Needed for the proof (Release 1) · Scaffolding:* the Done-when lines of the R1 rows could be copied into each PF/FO
   BACKLOG row's "qa will test" note when the row is shaped, so builders see them where they work.
2. *Later · Scaffolding:* `check_pf1_module_routes.ts` should write its screenshots to `var/`, not over the committed ones
   in `screens/PF-1/screenshots/` (every run leaves a modified tracked file).

Record note: this PR's first commit carries another session's id in its Claude-Session line (my slip; history is not
rewritten, P-82); later commits carry this session's.
